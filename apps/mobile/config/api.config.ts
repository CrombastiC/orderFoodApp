/**
 * API配置文件
 * 用于配置服务端相关信息
 * 
 * 注意: 
 * - 开发环境使用 192.168.1.118:5001 (真机调试，避开 macOS AirPlay 占用的 5000 端口)
 * - Android 模拟器使用 10.0.2.2:5001
 * - iOS 模拟器使用 127.0.0.1:5001
 * - 生产环境使用 ashcloud.xin:5000
 */

import Constants from 'expo-constants';

// 环境配置
export const ENV = {
  // 开发环境
  development: {
    // 真机调试使用局域网 IP
    baseURL: 'http://192.168.1.118:5001',//本地环境 (真机)
    // baseURL: 'http://10.0.2.2:5001',//本地环境 (Android 模拟器)
    // baseURL: 'http://127.0.0.1:5001',//本地环境 (Web/ iOS 模拟器)
    // baseURL: 'http://ashcloud.xin:5000',//远程环境
    timeout: 10000,
  },
  // 生产环境
  production: {
    baseURL: 'http://ashcloud.xin:5000',
    timeout: 15000,
  },
  // 测试环境
  staging: {
    baseURL: 'http://ashcloud.xin:5000',
    timeout: 10000,
  },
};

// 当前环境 (可根据需要切换: 'development' | 'production' | 'staging')
// 打包时会自动根据 eas.json 中的 APP_ENV 环境变量切换
// 从 expo-constants 读取环境变量
export const CURRENT_ENV: keyof typeof ENV = 
  (Constants.expoConfig?.extra?.APP_ENV as keyof typeof ENV) || 'development';

// 打印当前环境信息（帮助调试）
console.log('🌍 Current Environment:', CURRENT_ENV);
console.log('🔗 API Base URL:', ENV[CURRENT_ENV].baseURL);
console.log('⏱️ Timeout:', ENV[CURRENT_ENV].timeout);
console.log('📦 App Config Extra:', Constants.expoConfig?.extra);

// API配置
export const API_CONFIG = {
  // 服务端IP/域名
  baseURL: ENV[CURRENT_ENV].baseURL,
  
  // 请求超时时间(毫秒)
  timeout: ENV[CURRENT_ENV].timeout,
  
  // 请求头配置
  headers: {
    'Content-Type': 'application/json',
  },
  
  // 是否允许携带凭证
  withCredentials: false,
};

// API路径配置
export const API_PATHS = {
  // 用户相关
  user: {
    login: '/user/login',
    register: '/user/register',
    profile: '/user/profile',
    update: '/user/update',
  },
  
  // 订单相关
  order: {
    create: '/order/create',
    list: '/order/list',
    detail: '/order/detail',
    cancel: '/order/cancel',
  },
  
  // 菜品相关
  food: {
    list: '/food/list',
    detail: '/food/detail',
    categories: '/food/categories',
  },
  
  // 会员相关
  member: {
    info: '/member/info',
    topUp: '/member/top-up',
    history: '/member/history',
  },
  
  // 地址相关
  address: {
    list: '/address/list',
    add: '/address/add',
    update: '/address/update',
    delete: '/address/delete',
  },
};

// 状态码配置
export const STATUS_CODE = {
  SUCCESS: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  SERVER_ERROR: 500,
};

// 错误消息配置
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '网络连接失败，请检查您的网络',
  TIMEOUT: '请求超时，请稍后重试',
  UNAUTHORIZED: '未授权，请先登录',
  FORBIDDEN: '没有权限访问',
  NOT_FOUND: '请求的资源不存在',
  SERVER_ERROR: '服务器错误，请稍后重试',
  UNKNOWN: '未知错误，请稍后重试',
};
