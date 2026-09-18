import request from '@/request';

/**
 * 收货地址
 */
export interface Address {
  id: string;
  receiverName: string;
  phone: string;
  /** 省市区 */
  region: string;
  /** 详细地址 */
  detail: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 新增/编辑地址参数
 */
export interface SaveAddressParams {
  receiverName: string;
  phone: string;
  region: string;
  detail: string;
  isDefault?: boolean;
}

/**
 * 地址服务
 */
export const addressService = {
  /** 获取我的地址列表（默认地址排最前） */
  getAddressList: () => {
    return request.get<Address[]>('/api/address/list');
  },

  /** 新增地址 */
  createAddress: (data: SaveAddressParams) => {
    return request.post<Address>('/api/address/create', data);
  },

  /** 更新地址 */
  updateAddress: (id: string, data: SaveAddressParams) => {
    return request.put<Address>(`/api/address/update/${id}`, data);
  },

  /** 删除地址 */
  deleteAddress: (id: string) => {
    return request.delete<{ message: string }>(`/api/address/delete/${id}`);
  },

  /** 设为默认地址 */
  setDefaultAddress: (id: string) => {
    return request.put<Address>(`/api/address/default/${id}`);
  },
};
