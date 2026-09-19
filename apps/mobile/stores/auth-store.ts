/**
 * 登录态 Store
 * 单一登录态来源。只依赖 AsyncStorage 与类型，不 import 任何 service，
 * 避免与 request/index.ts 形成循环依赖。
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LoginResponse, User } from '@orderfood/common';
import { create } from 'zustand';

const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_ID_KEY = 'userId';
const USER_INFO_KEY = 'userInfo';

type LoginRequestSignal = {
  id: number;
  reason?: 'expired' | 'gated';
};

type AuthState = {
  isLoggedIn: boolean;
  userInfo: User | null;
  hydrated: boolean;
  loginRequest: LoginRequestSignal | null;
  hydrate: () => Promise<void>;
  setSession: (data: LoginResponse) => Promise<void>;
  clearSession: () => Promise<void>;
  requestLogin: (reason?: LoginRequestSignal['reason']) => void;
  consumeLoginRequest: () => void;
};

let signalSeq = 0;

export const useAuthStore = create<AuthState>((set, get) => ({
  isLoggedIn: false,
  userInfo: null,
  hydrated: false,
  loginRequest: null,

  hydrate: async () => {
    try {
      const entries = await AsyncStorage.multiGet([TOKEN_KEY, USER_INFO_KEY]);
      const token = entries[0][1];
      const userInfoRaw = entries[1][1];
      let userInfo: User | null = null;
      if (userInfoRaw) {
        try {
          userInfo = JSON.parse(userInfoRaw) as User;
        } catch {
          userInfo = null;
        }
      }
      set({ isLoggedIn: !!token, userInfo, hydrated: true });
    } catch (error) {
      console.error('恢复登录态失败:', error);
      set({ isLoggedIn: false, userInfo: null, hydrated: true });
    }
  },

  setSession: async (data) => {
    try {
      await AsyncStorage.multiSet([
        [TOKEN_KEY, data.token],
        [REFRESH_TOKEN_KEY, data.refreshToken],
        [USER_ID_KEY, data.user.id],
        [USER_INFO_KEY, JSON.stringify(data.user)],
      ]);
      set({ isLoggedIn: true, userInfo: data.user });
    } catch (error) {
      console.error('保存登录态失败:', error);
    }
  },

  clearSession: async () => {
    try {
      await AsyncStorage.multiRemove([
        TOKEN_KEY,
        REFRESH_TOKEN_KEY,
        USER_ID_KEY,
        USER_INFO_KEY,
      ]);
    } catch (error) {
      console.error('清除登录态失败:', error);
    }
    set({ isLoggedIn: false, userInfo: null });
  },

  requestLogin: (reason) => {
    signalSeq += 1;
    set({ loginRequest: { id: signalSeq, reason } });
  },

  consumeLoginRequest: () => {
    if (get().loginRequest) {
      set({ loginRequest: null });
    }
  },
}));
