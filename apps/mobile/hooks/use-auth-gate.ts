import { AuthGateContext } from '@/components/auth/AuthGateProvider';
import { useContext } from 'react';

export function useAuthGate() {
  const context = useContext(AuthGateContext);
  if (!context) {
    throw new Error('useAuthGate 必须在 AuthGateProvider 内使用');
  }
  return context;
}
