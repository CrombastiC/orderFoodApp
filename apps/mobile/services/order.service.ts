import request from '@/request';
import type {
  Category,
  CreateOrderRequest,
  Order,
  OrderStatus,
} from '@orderfood/common';

export type { CreateOrderRequest, Order, OrderItem } from '@orderfood/common';

export interface UploadResult {
  url: string;
}

/**
 * 获取商品信息
 * @param id 商品ID 不传就是获取全部商品
 */
export const getProductInfo = (id?: string) => {
  const url = id ? `/api/menu/getMenuList/${id}` : '/api/menu/getMenuList';
  return request.get<Category[]>(url);
};

/**
 * 上传图片
 */
export const uploadImage = (data: FormData) => {
  return request.post<UploadResult>('/api/upload/uploadImg', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

/**
 * 订单服务
 */
export const orderService = {
  /**
   * 创建订单
   */
  createOrder: (data: CreateOrderRequest) => {
    return request.post<Order>('/api/order/create', data);
  },

  /**
   * 获取订单列表
   * @param status 可选状态筛选
   */
  getOrders: (status?: OrderStatus) => {
    return request.get<Order[]>('/api/order/list', status ? { status } : undefined);
  },

  /**
   * 获取订单详情
   * @param id 订单ID
   */
  getOrderDetail: (id: string) => {
    return request.get<Order>(`/api/order/detail/${id}`);
  },
};
