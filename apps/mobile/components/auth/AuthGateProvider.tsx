import { LoginSheet } from '@/components/auth/LoginSheet';
import { useAuthStore } from '@/stores/auth-store';
import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';

export type AuthGateContextValue = {
  /** 已登录则立即执行 action；未登录则弹出登录面板，登录成功后执行 action */
  requireLogin: (action?: () => void, reason?: 'expired' | 'gated') => void;
};

export const AuthGateContext = createContext<AuthGateContextValue | null>(null);

export function AuthGateProvider({ children }: { children: React.ReactNode }) {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const loginRequest = useAuthStore((state) => state.loginRequest);
  const consumeLoginRequest = useAuthStore((state) => state.consumeLoginRequest);

  const [visible, setVisible] = useState(false);
  const [reason, setReason] = useState<string | undefined>(undefined);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const openSheet = useCallback((nextReason?: string) => {
    setReason(nextReason);
    setVisible(true);
  }, []);

  const requireLogin = useCallback(
    (action?: () => void, nextReason?: 'expired' | 'gated') => {
      if (useAuthStore.getState().isLoggedIn) {
        action?.();
        return;
      }
      pendingActionRef.current = action ?? null;
      openSheet(nextReason);
    },
    [openSheet]
  );

  // 外部（如 401 拦截器）触发的登录请求
  useEffect(() => {
    if (loginRequest) {
      pendingActionRef.current = null;
      openSheet(loginRequest.reason);
      consumeLoginRequest();
    }
  }, [loginRequest, openSheet, consumeLoginRequest]);

  const handleSuccess = useCallback(() => {
    setVisible(false);
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    action?.();
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    pendingActionRef.current = null;
  }, []);

  // 登录态变化时（例如在别处登录）关闭面板
  useEffect(() => {
    if (isLoggedIn && visible) {
      setVisible(false);
    }
  }, [isLoggedIn, visible]);

  return (
    <AuthGateContext.Provider value={{ requireLogin }}>
      {children}
      <LoginSheet
        visible={visible}
        reason={reason}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    </AuthGateContext.Provider>
  );
}
