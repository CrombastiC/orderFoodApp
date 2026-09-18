/**
 * 积分商城商品
 */
export interface Commodity {
  commodityId: string;
  commodityName: string;
  commodityImage: string;
  commodityIntegral: number;
  commodityDescription?: string;
}

/**
 * 积分记录
 */
export interface PointRecord {
  integral: number;
  isGet: boolean; // true: 收入, false: 支出
  remark: string;
  createdAt: string;
}

/**
 * 抽奖奖品
 */
export interface LuckyRollData {
  id: string;
  prizeName: string;
  prizeImage: string;
  prizeIntegral: number;
}

/**
 * 抽奖数据响应
 */
export interface LuckyRollDataResponse {
  luckyDrawCount: number;
  userIntegral: number;
  prizeList: LuckyRollData[];
}

/**
 * 中奖信息
 */
export interface WinningInfo {
  id: string;
  userAvatar: string;
  username: string;
  prizeName: string;
  prizeImage: string;
  createdAt: string;
}

/**
 * 抽奖请求（单抽）
 * 中奖结果由服务端概率决定，客户端只传消耗积分（签到免费抽为 0，普通单抽为 200）
 */
export interface ExchangePrizeRequest {
  costIntegral: number;
}

/**
 * 抽奖请求（十连抽）
 * 中奖结果由服务端概率决定，固定消耗 2000 积分
 */
export interface ExchangeMultiPrizeRequest {
  costIntegral: number;
}

/**
 * 获取积分列表请求
 */
export interface GetPointsListRequest {
  page: number;
  limit: number;
}
