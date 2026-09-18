import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) {}

  // 获取当前用户地址列表，默认地址排最前
  async getAddressList(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  // 创建地址：首个地址自动设为默认；显式设默认时清除其他默认
  async createAddress(userId: string, dto: CreateAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      const count = await tx.address.count({ where: { userId } });
      const isDefault = dto.isDefault || count === 0;
      if (isDefault && count > 0) {
        await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
      }
      return tx.address.create({
        data: { userId, receiverName: dto.receiverName, phone: dto.phone, region: dto.region, detail: dto.detail, isDefault },
      });
    });
  }

  // 更新地址（仅本人可改）
  async updateAddress(userId: string, id: string, dto: UpdateAddressDto) {
    const address = await this.prisma.address.findUnique({ where: { id } });
    if (!address) throw new BadRequestException('地址不存在');
    if (address.userId !== userId) throw new ForbiddenException('无权操作该地址');

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
      }
      return tx.address.update({ where: { id }, data: dto });
    });
  }

  // 删除地址（仅本人可删）
  async deleteAddress(userId: string, id: string) {
    const address = await this.prisma.address.findUnique({ where: { id } });
    if (!address) throw new BadRequestException('地址不存在');
    if (address.userId !== userId) throw new ForbiddenException('无权操作该地址');

    await this.prisma.address.delete({ where: { id } });
    // 删除的是默认地址时，把最近更新的地址顶为默认
    if (address.isDefault) {
      const next = await this.prisma.address.findFirst({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      });
      if (next) {
        await this.prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }
    return null;
  }

  // 设为默认地址
  async setDefaultAddress(userId: string, id: string) {
    const address = await this.prisma.address.findUnique({ where: { id } });
    if (!address) throw new BadRequestException('地址不存在');
    if (address.userId !== userId) throw new ForbiddenException('无权操作该地址');

    return this.prisma.$transaction(async (tx) => {
      await tx.address.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });
      return tx.address.update({ where: { id }, data: { isDefault: true } });
    });
  }
}
