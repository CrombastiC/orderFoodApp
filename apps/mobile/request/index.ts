import { API_CONFIG } from '@/config/api.config';
import { useAuthStore } from '@/stores/auth-store';
import ToastManager from '@/utils/toast';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  CreateAxiosDefaults,
  InternalAxiosRequestConfig,
} from 'axios';
import type { ApiResponse, TokenPair } from '@orderfood/common';

const refreshTokenUrl = '/api/user/refresh-token';

export interface RequestError {
  code: number;
  message: string;
  data: null;
}

export type Response<T> = Promise<
  | [false, T, AxiosResponse<unknown>]
  | [true, RequestError, AxiosResponse<unknown> | undefined]
>;

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

class Request {
  private axiosInstance: AxiosInstance;

  private refreshTokenPromise: Promise<string | null> | null = null;
  private redirectingToLogin = false;
  private requestQueue: {
    resolve: any;
    config: any;
    type: 'request' | 'response';
  }[] = [];
  private limit = 100;

  private requestingCount = 0;

  constructor(config?: CreateAxiosDefaults) {
    console.log('🔧 Request Instance Config:', {
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
    });

    this.axiosInstance = axios.create({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      ...config,
    });

    this.axiosInstance.interceptors.request.use(
      (axiosConfig: InternalAxiosRequestConfig) =>
        this.requestInterceptor(axiosConfig)
    );
    this.axiosInstance.interceptors.response.use(
      (response: AxiosResponse<unknown, unknown>) =>
        this.responseSuccessInterceptor(response),
      (error: any) => this.responseErrorInterceptor(error)
    );
  }

  setLimit(limit: number) {
    this.limit = limit;
  }

  private async requestInterceptor(
    axiosConfig: InternalAxiosRequestConfig
  ): Promise<any> {
    if (this.requestingCount >= this.limit) {
      return new Promise((resolve) => {
        this.requestQueue.push({
          resolve,
          config: axiosConfig,
          type: 'request',
        });
      });
    }

    this.requestingCount += 1;

    const token = await AsyncStorage.getItem('token');

    if (token) {
      axiosConfig.headers.Authorization = `Bearer ${token}`;
    }

    if (__DEV__) {
      console.log('📤 Request:', {
        url: axiosConfig.url,
        method: axiosConfig.method,
        data: axiosConfig.data,
      });
    }

    return Promise.resolve(axiosConfig);
  }

  private requestByQueue() {
    if (!this.requestQueue.length) return;

    console.log(
      this.requestingCount,
      this.limit - this.requestingCount,
      'count'
    );

    const batchSize = this.limit - this.requestingCount;
    for (let i = 0; i < batchSize; i++) {
      const record = this.requestQueue.shift();
      if (!record) {
        return;
      }

      const { config, resolve, type } = record;
      if (type === 'response') {
        this.request(config).then(resolve);
      } else if (type === 'request') {
        this.requestingCount += 1;
        AsyncStorage.getItem('token').then((token) => {
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          resolve(config);
        });
      }
    }
  }

  private async responseSuccessInterceptor(
    response: AxiosResponse<any, any>
  ): Promise<any> {
    this.requestingCount = Math.max(0, this.requestingCount - 1);
    if (this.requestQueue.length) {
      this.requestByQueue();
    }

    if (__DEV__) {
      console.log('📥 Response:', {
        url: response.config.url,
        status: response.status,
        data: response.data,
      });
    }

    // 后端统一返回 { code, message, data }，这里解包取出真正的数据
    const body = response.data;
    const unwrapped = body && body.data !== undefined ? body.data : body;
    return Promise.resolve([false, unwrapped, response]);
  }

  private async responseErrorInterceptor(error: any): Promise<any> {
    const { config, status } = error?.response || {};

    console.error('❌ 网络请求错误详情:', {
      完整URL: error.config?.baseURL + error.config?.url,
      请求URL: error.config?.url,
      baseURL: error.config?.baseURL,
      错误信息: error.message,
      错误代码: error.code,
      HTTP状态: error.response?.status,
      状态文本: error.response?.statusText,
      响应数据: error.response?.data,
    });

    if (__DEV__) {
      console.error('❌ Response Error:', {
        url: error.config?.url,
        message: error.message,
        status: error.response?.status,
      });
    }

    this.requestingCount = Math.max(0, this.requestingCount - 1);

    if (status === 401) {
      const retryConfig = config as RetryableRequestConfig | undefined;
      if (
        retryConfig &&
        retryConfig.url !== refreshTokenUrl &&
        !retryConfig._retry
      ) {
        retryConfig._retry = true;
        const token = await this.refreshAccessToken();
        if (token) {
          retryConfig.headers.Authorization = `Bearer ${token}`;
          return this.axiosInstance.request(retryConfig);
        }
      }

      await this.toLoginPage();
      return Promise.resolve([true, error?.response?.data, undefined]);
    } else {
      const errorMessage = error.response?.data?.message || error.message || '请求失败';
      console.warn('请求错误:', errorMessage);

      return Promise.resolve([true, error?.response?.data, undefined]);
    }
  }

  private reset() {
    this.requestQueue = [];
    this.refreshTokenPromise = null;
    this.requestingCount = 0;
  }

  /** 使用刷新令牌换取新 Token，并合并并发的 401 刷新请求。 */
  private async refreshAccessToken(): Promise<string | null> {
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    this.refreshTokenPromise = (async () => {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) return null;

      try {
        const response = await axios.post<ApiResponse<TokenPair>>(
          `${API_CONFIG.baseURL}${refreshTokenUrl}`,
          { refreshToken },
          { timeout: API_CONFIG.timeout },
        );
        const tokens = response.data.data;
        await AsyncStorage.multiSet([
          ['token', tokens.token],
          ['refreshToken', tokens.refreshToken],
        ]);
        return tokens.token;
      } catch (refreshError) {
        console.warn('刷新 Token 失败:', refreshError);
        return null;
      } finally {
        this.refreshTokenPromise = null;
      }
    })();

    return this.refreshTokenPromise;
  }

  private async toLoginPage() {
    if (this.redirectingToLogin) return;
    this.redirectingToLogin = true;
    this.reset();

    await useAuthStore.getState().clearSession();
    useAuthStore.getState().requestLogin('expired');

    ToastManager.show('登录已过期，请重新登录');

    setTimeout(() => {
      this.redirectingToLogin = false;
    }, 500);
  }

  request<T, D = any>(config: AxiosRequestConfig<D>): Response<T> {
    return this.axiosInstance(config) as unknown as Response<T>;
  }

  get<T, D = any>(url: string, params?: any, config?: AxiosRequestConfig<D>): Response<T> {
    return this.axiosInstance.get(url, { params, ...config }) as unknown as Response<T>;
  }

  post<T, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Response<T> {
    return this.axiosInstance.post(url, data, config) as unknown as Response<T>;
  }

  put<T, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Response<T> {
    return this.axiosInstance.put(url, data, config) as unknown as Response<T>;
  }

  delete<T, D = any>(url: string, config?: AxiosRequestConfig<D>): Response<T> {
    return this.axiosInstance.delete(url, config) as unknown as Response<T>;
  }

  patch<T, D = any>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig<D>
  ): Response<T> {
    return this.axiosInstance.patch(url, data, config) as unknown as Response<T>;
  }

  upload<T>(
    url: string,
    file: any,
    config?: AxiosRequestConfig
  ): Response<T> {
    const formData = new FormData();
    formData.append('file', file);

    return this.axiosInstance.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      ...config,
    }) as unknown as Response<T>;
  }
}

const request = new Request();

export default request;
