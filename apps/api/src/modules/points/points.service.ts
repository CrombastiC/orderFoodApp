import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { LotteryPrize, Prisma } from '@prisma/client';

@Injectable()
export class PointsService {
  constructor(private prisma: PrismaService) {}

  private getTodayRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }

  private toLuckyRollData(prize: {
    id: string;
    prizeName: string;
    prizeImage: string;
    prizeIntegral: number;
  }) {
    return {
      id: prize.id,
      prizeName: prize.prizeName,
      prizeImage: prize.prizeImage,
      prizeIntegral: prize.prizeIntegral,
    };
  }

  // 获取抽奖数据
  async getLuckyRollData(userId: string) {
    const { start, end } = this.getTodayRange();
    const [prizeList, user, todayCheckIn, usedFreeDraw] = await Promise.all([
      this.prisma.lotteryPrize.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.checkInRecord.findFirst({
        where: { userId, createdAt: { gte: start, lt: end } },
      }),
      this.prisma.lotteryRecord.findFirst({
        where: {
          userId,
          costIntegral: 0,
          createdAt: { gte: start, lt: end },
        },
      }),
    ]);

    return {
      prizeList: prizeList.map((prize) => this.toLuckyRollData(prize)),
      userIntegral: user?.integral || 0,
      luckyDrawCount: todayCheckIn && !usedFreeDraw ? 1 : 0,
    };
  }

  // ==================== 抽奖概率配置 ====================

  // 单抽消耗积分
  private static readonly SINGLE_DRAW_COST = 200;
  // 十连抽消耗积分
  private static readonly MULTI_DRAW_COST = 2000;
  // 大奖基础概率（1%）
  private static readonly BIG_PRIZE_RATE = 0.01;
  // 软保底起始抽数（距上次大奖）
  private static readonly PITY_SOFT_START = 40;
  // 软保底触发概率
  private static readonly PITY_SOFT_RATE = 0.5;
  // 硬保底：距上次大奖达到该抽数后必出大奖（即第 80 抽）
  private static readonly PITY_HARD = 79;

  // 按权重随机挑选（weight 相同则等概率，权重在奖品管理后台配置）
  private weightedPick<T extends { weight: number }>(items: T[]): T {
    const weights = items.map((item) => Math.max(1, item.weight));
    let roll = Math.random() * weights.reduce((sum, w) => sum + w, 0);
    for (let i = 0; i < items.length; i++) {
      roll -= weights[i];
      if (roll < 0) return items[i];
    }
    return items[items.length - 1];
  }

  /**
   * 抽取 count 个奖品（概率与保底全部在服务端完成，客户端只负责展示）
   * - 大奖基础概率 1%，其余为积分奖
   * - 距上次大奖 40 抽起每抽 50% 概率触发软保底，79 抽后必出大奖（硬保底）
   * - 十连抽整批最多 1 个大奖
   * - 同类型奖品内部按 weight 加权随机
   */
  private drawPrizes(
    prizes: LotteryPrize[],
    drawsSinceBigPrize: number,
    count: number,
  ): { picked: LotteryPrize[]; drawsSinceBigPrize: number } {
    const bigPrizes = prizes.filter((p) => p.prizeIntegral === 0 && p.stock > 0);
    const pointPrizes = prizes.filter((p) => p.prizeIntegral > 0);
    if (bigPrizes.length === 0 && pointPrizes.length === 0) {
      throw new BadRequestException('抽奖活动暂无可用奖品');
    }

    let bigQuota = count >= 10 ? 1 : count;
    let since = drawsSinceBigPrize;
    const picked: LotteryPrize[] = [];

    for (let i = 0; i < count; i++) {
      const isGuaranteed =
        since >= PointsService.PITY_HARD ||
        (since >= PointsService.PITY_SOFT_START && Math.random() < PointsService.PITY_SOFT_RATE);
      const wantBig = bigQuota > 0 && (isGuaranteed || Math.random() < PointsService.BIG_PRIZE_RATE);

      let prize: LotteryPrize;
      if (wantBig && bigPrizes.length > 0) {
        prize = this.weightedPick(bigPrizes);
        bigQuota -= 1;
        since = 0;
      } else if (pointPrizes.length > 0) {
        prize = this.weightedPick(pointPrizes);
        since += 1;
      } else {
        // 没有积分奖可发（极端情况），随机给一个有库存的大奖
        prize = this.weightedPick(bigPrizes);
        bigQuota -= 1;
        since = 0;
      }
      picked.push(prize);
    }

    return { picked, drawsSinceBigPrize: since };
  }

  // 扣减实物大奖库存（带库存下限保护，防止并发超发）
  private async settlePrizeStock(
    tx: Prisma.TransactionClient,
    picked: LotteryPrize[],
  ) {
    const bigPrizeCounts = new Map<string, number>();
    for (const prize of picked) {
      if (prize.prizeIntegral === 0) {
        bigPrizeCounts.set(prize.id, (bigPrizeCounts.get(prize.id) || 0) + 1);
      }
    }
    for (const [prizeId, count] of bigPrizeCounts) {
      const result = await tx.lotteryPrize.updateMany({
        where: { id: prizeId, stock: { gte: count } },
        data: { stock: { decrement: count } },
      });
      if (result.count === 0) {
        throw new BadRequestException('奖品库存不足');
      }
    }
  }

  // 单抽（概率由服务端决定）
  async exchangePrize(userId: string, costIntegral: number) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new BadRequestException('用户不存在');
      }

      const isFreeDraw = costIntegral === 0;
      if (isFreeDraw) {
        const { start, end } = this.getTodayRange();
        const [todayCheckIn, usedFreeDraw] = await Promise.all([
          tx.checkInRecord.findFirst({
            where: { userId, createdAt: { gte: start, lt: end } },
          }),
          tx.lotteryRecord.findFirst({
            where: {
              userId,
              costIntegral: 0,
              createdAt: { gte: start, lt: end },
            },
          }),
        ]);
        if (!todayCheckIn || usedFreeDraw) {
          throw new BadRequestException('今日暂无免费抽奖次数');
        }
      } else if (
        costIntegral !== PointsService.SINGLE_DRAW_COST ||
        user.integral < PointsService.SINGLE_DRAW_COST
      ) {
        throw new BadRequestException('积分不足');
      }

      // 服务端抽取奖品
      const prizes = await tx.lotteryPrize.findMany({ where: { isActive: true } });
      const { picked, drawsSinceBigPrize } = this.drawPrizes(
        prizes,
        user.drawsSinceBigPrize,
        1,
      );
      const prize = picked[0];

      // 扣除积分并更新保底计数
      await tx.user.update({
        where: { id: userId },
        data: {
          ...(isFreeDraw ? {} : { integral: { decrement: PointsService.SINGLE_DRAW_COST } }),
          drawsSinceBigPrize,
        },
      });
      if (!isFreeDraw) {
        await tx.pointRecord.create({
          data: { userId, integral: PointsService.SINGLE_DRAW_COST, isGet: false, remark: '积分抽奖' },
        });
      }

      // 创建抽奖记录
      await tx.lotteryRecord.create({
        data: { userId, prizeId: prize.id, costIntegral },
      });

      // 实物大奖扣库存
      await this.settlePrizeStock(tx, picked);

      // 积分奖返还积分
      if (prize.prizeIntegral > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { integral: { increment: prize.prizeIntegral } },
        });
        await tx.pointRecord.create({
          data: {
            userId,
            integral: prize.prizeIntegral,
            isGet: true,
            remark: '抽奖获得积分',
          },
        });
      }

      return this.toLuckyRollData(prize);
    });
  }

  // 十连抽（概率由服务端决定，整批最多 1 个大奖）
  async exchangeMultiPrize(userId: string, costIntegral: number) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new BadRequestException('用户不存在');
      }
      if (costIntegral !== PointsService.MULTI_DRAW_COST) {
        throw new BadRequestException('十连抽消耗积分不正确');
      }
      if (user.integral < PointsService.MULTI_DRAW_COST) {
        throw new BadRequestException('积分不足');
      }

      // 服务端抽取奖品
      const prizes = await tx.lotteryPrize.findMany({ where: { isActive: true } });
      const { picked, drawsSinceBigPrize } = this.drawPrizes(
        prizes,
        user.drawsSinceBigPrize,
        10,
      );

      // 扣除积分并更新保底计数
      await tx.user.update({
        where: { id: userId },
        data: {
          integral: { decrement: PointsService.MULTI_DRAW_COST },
          drawsSinceBigPrize,
        },
      });
      await tx.pointRecord.create({
        data: { userId, integral: PointsService.MULTI_DRAW_COST, isGet: false, remark: '积分十连抽' },
      });

      // 创建抽奖记录
      for (const prize of picked) {
        await tx.lotteryRecord.create({
          data: { userId, prizeId: prize.id, costIntegral: PointsService.SINGLE_DRAW_COST },
        });
      }

      // 实物大奖扣库存
      await this.settlePrizeStock(tx, picked);

      // 积分奖返还积分
      const earnedIntegral = picked.reduce((total, prize) => total + prize.prizeIntegral, 0);
      if (earnedIntegral > 0) {
        await tx.user.update({
          where: { id: userId },
          data: { integral: { increment: earnedIntegral } },
        });
        await tx.pointRecord.create({
          data: {
            userId,
            integral: earnedIntegral,
            isGet: true,
            remark: '十连抽获得积分',
          },
        });
      }

      return picked.map((prize) => this.toLuckyRollData(prize));
    });
  }

  // 获取中奖记录
  async getWinningRecords(isBigPrize?: boolean) {
    const where = isBigPrize ? { prize: { prizeIntegral: 0 } } : {};

    const records = await this.prisma.lotteryRecord.findMany({
      where,
      include: {
        user: { select: { username: true, avatar: true } },
        prize: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return records.map((record) => ({
      id: record.id,
      userAvatar: record.user.avatar || '',
      username: record.user.username,
      prizeName: record.prize.prizeName,
      prizeImage: record.prize.prizeImage,
      createdAt: record.createdAt.toISOString(),
    }));
  }

  // 获取积分商城商品
  async getCommodityList() {
    const commodities = await this.prisma.commodity.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    // 映射为前端期望的字段名
    return commodities.map((item) => ({
      commodityId: item.id,
      commodityName: item.commodityName,
      commodityImage: item.commodityImage,
      commodityIntegral: item.commodityIntegral,
    }));
  }

  // 获取积分收支记录
  async getPointsList(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.pointRecord.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.pointRecord.count({ where: { userId } }),
    ]);

    return { data, total, page, limit };
  }

  // ==================== 奖品管理 ====================

  // 获取所有奖品（含已禁用）
  async getPrizeList() {
    return this.prisma.lotteryPrize.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  // 创建奖品
  async createPrize(data: {
    prizeName: string;
    prizeImage: string;
    prizeIntegral: number;
    prizeValue?: number;
    stock?: number;
    weight?: number;
    sortOrder?: number;
  }) {
    return this.prisma.lotteryPrize.create({ data });
  }

  // 更新奖品
  async updatePrize(id: string, data: {
    prizeName?: string;
    prizeImage?: string;
    prizeIntegral?: number;
    prizeValue?: number;
    stock?: number;
    weight?: number;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    const existing = await this.prisma.lotteryPrize.findUnique({ where: { id } });
    if (!existing) throw new BadRequestException('奖品不存在');
    return this.prisma.lotteryPrize.update({
      where: { id },
      data,
    });
  }

  // 删除奖品
  async deletePrize(id: string) {
    const recordCount = await this.prisma.lotteryRecord.count({ where: { prizeId: id } });
    if (recordCount > 0) {
      throw new BadRequestException('该奖品已有抽奖记录，只能停用，不能删除');
    }
    return this.prisma.lotteryPrize.delete({ where: { id } });
  }

  // 切换启用/禁用状态
  async togglePrize(id: string) {
    const prize = await this.prisma.lotteryPrize.findUnique({ where: { id } });
    if (!prize) throw new BadRequestException('奖品不存在');
    return this.prisma.lotteryPrize.update({
      where: { id },
      data: { isActive: !prize.isActive },
    });
  }

  // ==================== 积分商品管理 ====================

  // 获取所有商品（含已禁用，分页）
  async getCommodityListAll(page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.commodity.findMany({
        orderBy: { sortOrder: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.commodity.count(),
    ]);
    return { data, total, page, limit };
  }

  // 创建商品
  async createCommodity(data: {
    commodityName: string;
    commodityImage: string;
    commodityIntegral: number;
    stock?: number;
    sortOrder?: number;
  }) {
    return this.prisma.commodity.create({ data });
  }

  // 更新商品
  async updateCommodity(id: string, data: {
    commodityName?: string;
    commodityImage?: string;
    commodityIntegral?: number;
    stock?: number;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    const existing = await this.prisma.commodity.findUnique({ where: { id } });
    if (!existing) throw new BadRequestException('积分商品不存在');
    return this.prisma.commodity.update({
      where: { id },
      data,
    });
  }

  // 删除商品
  async deleteCommodity(id: string) {
    const existing = await this.prisma.commodity.findUnique({ where: { id } });
    if (!existing) throw new BadRequestException('积分商品不存在');
    return this.prisma.commodity.delete({ where: { id } });
  }

  // 切换商品启用/禁用状态
  async toggleCommodity(id: string) {
    const commodity = await this.prisma.commodity.findUnique({ where: { id } });
    if (!commodity) throw new BadRequestException('商品不存在');
    return this.prisma.commodity.update({
      where: { id },
      data: { isActive: !commodity.isActive },
    });
  }
}
