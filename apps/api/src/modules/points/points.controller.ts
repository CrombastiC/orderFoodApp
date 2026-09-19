import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PointsService } from './points.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  ExchangeMultiPrizeDto,
  ExchangePrizeDto,
  PointsListQueryDto,
} from './dto/points.dto';

@ApiTags('积分')
@Controller('points')
@ApiBearerAuth('JWT-auth')
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get('getLuckyRollData')
  @ApiOperation({ summary: '获取抽奖数据' })
  async getLuckyRollData(@CurrentUser('id') userId: string) {
    return this.pointsService.getLuckyRollData(userId);
  }

  @Post('exchangePrize')
  @ApiOperation({ summary: '兑换奖品(单抽)' })
  async exchangePrize(
    @CurrentUser('id') userId: string,
    @Body() body: ExchangePrizeDto,
  ) {
    return this.pointsService.exchangePrize(userId, body.costIntegral);
  }

  @Post('exchangeMultiPrize')
  @ApiOperation({ summary: '十连抽' })
  async exchangeMultiPrize(
    @CurrentUser('id') userId: string,
    @Body() body: ExchangeMultiPrizeDto,
  ) {
    return this.pointsService.exchangeMultiPrize(userId, body.costIntegral);
  }

  @Get('getWinningRecords')
  @Public()
  @ApiOperation({ summary: '获取中奖记录' })
  async getWinningRecords(@Query('isBigPrize') isBigPrize?: string) {
    return this.pointsService.getWinningRecords(isBigPrize === 'true');
  }

  @Get('getCommodityList')
  @Public()
  @ApiOperation({ summary: '获取积分商城商品' })
  async getCommodityList() {
    return this.pointsService.getCommodityList();
  }

  @Get('getPointsList')
  @ApiOperation({ summary: '获取积分收支记录' })
  async getPointsList(
    @CurrentUser('id') userId: string,
    @Query() query: PointsListQueryDto,
  ) {
    return this.pointsService.getPointsList(userId, query.page, query.limit);
  }
}
