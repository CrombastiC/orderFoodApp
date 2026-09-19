# 游客浏览 + 地址弹窗/抽奖种子 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复地址弹窗保存按钮不可见、补齐抽奖"围观大奖/中奖播报"种子数据，并把移动端改造成"游客可浏览、关键操作弹底部登录面板"。

**Architecture:** 新增 `auth-store`（Zustand，单一登录态来源，不依赖任何 service 以避免与 request 循环依赖）、`AuthGateProvider`（动作级 `requireLogin`）、`LoginSheet`（底部插画面板）、`RequireLogin`（页面级占位）。`request` 拦截器 401 从"硬跳登录页"改为"唤起面板"。

**Tech Stack:** Expo SDK 57 / React Native 0.86 / expo-router 57 / react-native-paper / Zustand / NestJS + Prisma 5。

**设计文档：** `.claude/design/guest-browsing-and-fixes-design.md`
**架构图：** `.claude/design/guest-auth-architecture.html`

---

## 文件结构

**新增**
- `apps/mobile/stores/auth-store.ts` — 登录态 + 面板请求信号
- `apps/mobile/components/auth/LoginSheet.tsx` — 底部登录面板
- `apps/mobile/components/auth/AuthGateProvider.tsx` — 动作拦截 Context
- `apps/mobile/components/auth/RequireLogin.tsx` — 页面级占位
- `apps/mobile/hooks/use-auth-gate.ts` — Context 消费 hook

**修改**
- `apps/mobile/request/index.ts` — 401 改唤面板
- `apps/mobile/app/_layout.tsx` — 挂 Provider + hydrate
- `apps/mobile/app/auth/login.tsx` — 成功后 setSession
- `apps/mobile/app/(tabs)/profile.tsx` — 游客态
- `apps/mobile/app/(tabs)/messages.tsx`、`app/queue/index.tsx` — 换 requireLogin
- `apps/mobile/app/(tabs)/cart.tsx`、`app/(tabs)/order.tsx` — 结算入口拦截
- 需登录页面包 `RequireLogin`
- `apps/mobile/app/user/address.tsx` — 任务 1
- `apps/api/prisma/seed.ts` — 任务 2

---

## Task 1: 修复地址弹窗保存按钮

**Files:**
- Modify: `apps/mobile/app/user/address.tsx`

- [ ] **Step 1: 新增 saveButton 样式**

在 `styles` 中 `cancelText` 附近加入：

```ts
  saveButton: {
    backgroundColor: 'rgb(255, 140, 50)',
  },
```

- [ ] **Step 2: 保存按钮应用该样式**

将（约 241 行）：

```tsx
<TouchableOpacity style={styles.modalButton} onPress={handleSave}>
```

改为：

```tsx
<TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSave}>
```

- [ ] **Step 3: 类型检查**

Run（workdir `apps/mobile`）: `npx tsc --noEmit`
Expected: exit 0

---

## Task 2: 抽奖种子数据

**Files:**
- Modify: `apps/api/prisma/seed.ts`

- [ ] **Step 1: 新增展示用户常量**

在 `ADMIN_PASSWORD` 之后加入：

```ts
// 抽奖展示用户（用于围观大奖/中奖播报的种子数据）
const showUserData = [
  { phone: '13900000001', username: '草莓啵啵' },
  { phone: '13900000002', username: '奶茶星人' },
  { phone: '13900000003', username: '炸鸡一号' },
  { phone: '13900000004', username: '布丁控' },
  { phone: '13900000005', username: '深夜食堂' },
  { phone: '13900000006', username: '柠檬精' },
  { phone: '13900000007', username: '小笼包' },
  { phone: '13900000008', username: '芝士青年' },
];
```

- [ ] **Step 2: 新增中奖记录种子逻辑**

在"初始化奖品"代码块之后追加：

```ts
  // 5. 初始化抽奖展示用户 + 中奖记录（围观大奖 / 中奖播报）
  const existingRecordCount = await prisma.lotteryRecord.count();
  if (existingRecordCount > 0) {
    console.log(`⚠️  已存在 ${existingRecordCount} 条抽奖记录，跳过初始化`);
  } else {
    // 5.1 展示用户（幂等 upsert）
    const showUsers: { id: string; username: string }[] = [];
    const defaultPassword = await bcrypt.hash('123456', 10);
    for (const item of showUserData) {
      const user = await prisma.user.upsert({
        where: { phone: item.phone },
        update: { username: item.username },
        create: {
          phone: item.phone,
          username: item.username,
          password: defaultPassword,
        },
      });
      showUsers.push({ id: user.id, username: user.username });
    }

    // 5.2 按奖品名建立映射（奖品可能是本次新建或已存在）
    const allPrizes = await prisma.lotteryPrize.findMany();
    const prizeByName = new Map(allPrizes.map((p) => [p.prizeName, p]));

    // 5.3 中奖记录配置：混合实物大奖与积分奖
    const recordPlan: { prizeName: string; userIndex: number; hoursAgo: number }[] = [
      { prizeName: 'iPhone 16 Pro', userIndex: 0, hoursAgo: 6 },
      { prizeName: '华为 MatePad', userIndex: 3, hoursAgo: 20 },
      { prizeName: 'iPhone 16 Pro', userIndex: 5, hoursAgo: 30 },
      { prizeName: '积分 ×500', userIndex: 1, hoursAgo: 2 },
      { prizeName: '积分 ×200', userIndex: 2, hoursAgo: 5 },
      { prizeName: '积分 ×100', userIndex: 4, hoursAgo: 9 },
      { prizeName: '积分 ×50', userIndex: 6, hoursAgo: 13 },
      { prizeName: '积分 ×200', userIndex: 7, hoursAgo: 17 },
      { prizeName: '积分 ×150', userIndex: 0, hoursAgo: 24 },
      { prizeName: '积分 ×80', userIndex: 3, hoursAgo: 34 },
      { prizeName: '积分 ×100', userIndex: 5, hoursAgo: 44 },
      { prizeName: '积分 ×30', userIndex: 2, hoursAgo: 58 },
    ];

    let createdCount = 0;
    for (const plan of recordPlan) {
      const prize = prizeByName.get(plan.prizeName);
      const user = showUsers[plan.userIndex];
      if (!prize || !user) continue;
      await prisma.lotteryRecord.create({
        data: {
          userId: user.id,
          prizeId: prize.id,
          // 固定为单抽成本，不能填 0，否则会污染“今日免费抽是否已用”的判断
          costIntegral: 200,
          createdAt: new Date(Date.now() - plan.hoursAgo * 60 * 60 * 1000),
        },
      });
      createdCount += 1;
    }
    console.log(`\n🎉 成功初始化 ${createdCount} 条抽奖记录（含围观大奖与中奖播报）！`);
  }
```

- [ ] **Step 3: 执行 seed 两次验证幂等**

Run（workdir `apps/api`）: `npx ts-node prisma/seed.ts`
Expected: 输出"成功初始化 12 条抽奖记录"；第二次执行输出"已存在 12 条抽奖记录，跳过初始化"。

- [ ] **Step 4: 验证接口有数据**

Run（workdir `apps/api`，需先 `npx nest start`）：请求
`GET /api/points/getWinningRecords?isBigPrize=true` 与 `?isBigPrize=false`
Expected: 两者均返回非空数组；`true` 只含 `iPhone 16 Pro` / `华为 MatePad`。

---

## Task 3: auth-store

**Files:**
- Create: `apps/mobile/stores/auth-store.ts`

- [ ] **Step 1: 创建 store**

```ts
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
      const [token, userInfoRaw] = await AsyncStorage.multiGet([
        TOKEN_KEY,
        USER_INFO_KEY,
      ]).then((entries) => entries.map(([, value]) => value));
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
```

- [ ] **Step 2: 类型检查**

Run（workdir `apps/mobile`）: `npx tsc --noEmit`
Expected: exit 0

---

## Task 4: use-auth-gate + AuthGateProvider

**Files:**
- Create: `apps/mobile/hooks/use-auth-gate.ts`
- Create: `apps/mobile/components/auth/AuthGateProvider.tsx`

- [ ] **Step 1: 创建 hook**

```ts
import { useContext } from 'react';
import { AuthGateContext } from '@/components/auth/AuthGateProvider';

export function useAuthGate() {
  const context = useContext(AuthGateContext);
  if (!context) {
    throw new Error('useAuthGate 必须在 AuthGateProvider 内使用');
  }
  return context;
}
```

- [ ] **Step 2: 创建 Provider**

```tsx
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
```

- [ ] **Step 3: 类型检查**

Run（workdir `apps/mobile`）: `npx tsc --noEmit`
Expected: 报 LoginSheet 未找到（下一步创建后消除）

---

## Task 5: LoginSheet

**Files:**
- Create: `apps/mobile/components/auth/LoginSheet.tsx`

- [ ] **Step 1: 创建底部登录面板**

要点：Paper `Portal` + `Modal`（底部对齐）、`cooker.png` 插画头部、手机号/密码输入复用 `@/components/ui/PaperTextInput`、校验规则与 `app/auth/login.tsx` 一致、橙色 `#FF7214` 登录按钮、`authService.login` 成功调 `useAuthStore.setSession` 再 `onSuccess()`、失败 `Alert`。

```tsx
import { TextInput } from '@/components/ui/PaperTextInput';
import { authService } from '@/services';
import { useAuthStore } from '@/stores/auth-store';
import type { LoginResponse } from '@orderfood/common';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Icon, Modal, Portal, Text } from 'react-native-paper';

import type { RequestError } from '@/request';

const PHONE_REGEX = /^1[3-9]\d{9}$/;

type Props = {
  visible: boolean;
  reason?: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function LoginSheet({ visible, reason, onClose, onSuccess }: Props) {
  const setSession = useAuthStore((state) => state.setSession);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setPassword('');
      setPasswordVisible(false);
      setPhoneError('');
      setPasswordError('');
      setLoading(false);
    }
  }, [visible]);

  const validateForm = (): boolean => {
    let isValid = true;
    if (!phone) {
      setPhoneError('请输入手机号');
      isValid = false;
    } else if (!PHONE_REGEX.test(phone)) {
      setPhoneError('请输入正确的手机号');
      isValid = false;
    } else {
      setPhoneError('');
    }
    if (!password) {
      setPasswordError('请输入密码');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('密码至少6位');
      isValid = false;
    } else {
      setPasswordError('');
    }
    return isValid;
  };

  const handleLogin = async () => {
    if (!validateForm() || loading) return;
    setLoading(true);
    const [error, data] = await authService.login({ phone, password });
    setLoading(false);
    if (error || !data) {
      // error 为 true 时，元组第二项是 RequestError
      const message = (data as RequestError | undefined)?.message;
      Alert.alert('登录失败', message || '请检查您的手机号和密码');
      return;
    }
    await setSession(data as LoginResponse);
    onSuccess();
  };

  const goRegister = () => {
    onClose();
    router.push('/auth/register' as any);
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={styles.modalContainer}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.sheet}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Icon source="close" size={22} color="#999" />
            </TouchableOpacity>

            <Image
              source={require('../../../assets/images/cooker.png')}
              style={styles.illustration}
              resizeMode="cover"
            />

            <Text style={styles.title}>
              {reason === 'expired' ? '登录已过期' : '登录后继续'}
            </Text>
            <Text style={styles.subtitle}>
              {reason === 'expired'
                ? '请重新登录以继续使用'
                : '登录后即可继续当前操作'}
            </Text>

            <TextInput
              label="手机号"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                setPhoneError('');
              }}
              keyboardType="phone-pad"
              maxLength={11}
              error={!!phoneError}
              mode="outlined"
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#FF7214"
              left={<TextInput.Icon icon="phone" color="#FF7214" />}
            />
            {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}

            <TextInput
              label="密码"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setPasswordError('');
              }}
              secureTextEntry={!passwordVisible}
              error={!!passwordError}
              mode="outlined"
              style={styles.input}
              outlineColor="#E0E0E0"
              activeOutlineColor="#FF7214"
              left={<TextInput.Icon icon="lock" color="#FF7214" />}
              right={
                <TextInput.Icon
                  icon={passwordVisible ? 'eye-off' : 'eye'}
                  onPress={() => setPasswordVisible(!passwordVisible)}
                />
              }
            />
            {passwordError ? (
              <Text style={styles.errorText}>{passwordError}</Text>
            ) : null}

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.loginButton}
              contentStyle={styles.loginButtonContent}
              buttonColor="#FF7214"
            >
              登录
            </Button>

            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>还没有账号？</Text>
              <TouchableOpacity onPress={goRegister}>
                <Text style={styles.registerLink}>立即注册</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    margin: 0,
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  illustration: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginTop: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  loginButton: {
    borderRadius: 8,
    marginTop: 8,
  },
  loginButtonContent: {
    height: 48,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  registerText: {
    color: '#666',
    fontSize: 14,
  },
  registerLink: {
    color: '#FF7214',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});
```

- [ ] **Step 2: 类型检查**

Run（workdir `apps/mobile`）: `npx tsc --noEmit`
Expected: exit 0

---

## Task 6: RequireLogin

**Files:**
- Create: `apps/mobile/components/auth/RequireLogin.tsx`

- [ ] **Step 1: 创建页面级占位组件**

```tsx
import { useAuthGate } from '@/hooks/use-auth-gate';
import { useAuthStore } from '@/stores/auth-store';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Icon, Text } from 'react-native-paper';

type Props = {
  children: React.ReactNode;
  title?: string;
  description?: string;
};

export function RequireLogin({ children, title, description }: Props) {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const { requireLogin } = useAuthGate();

  if (isLoggedIn) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <Icon source="lock-outline" size={56} color="#FF7214" />
      <Text style={styles.title}>{title || '登录后可查看'}</Text>
      <Text style={styles.description}>
        {description || '该功能需要登录后使用'}
      </Text>
      <Button
        mode="contained"
        buttonColor="#FF7214"
        style={styles.button}
        onPress={() => requireLogin()}
      >
        去登录
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  description: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    borderRadius: 8,
    paddingHorizontal: 24,
  },
});
```

- [ ] **Step 2: 类型检查**

Run（workdir `apps/mobile`）: `npx tsc --noEmit`
Expected: exit 0

---

## Task 7: 接入根布局与 request 拦截器

**Files:**
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/request/index.ts`

- [ ] **Step 1: 根布局挂 Provider 并 hydrate**

在 `app/_layout.tsx` 中：

```tsx
import { AuthGateProvider } from '@/components/auth/AuthGateProvider';
import { useAuthStore } from '@/stores/auth-store';
```

在组件内（`loadProfiles` 旁）加入：

```tsx
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate().catch(console.error);
  }, [hydrate]);
```

将 `<Stack>` 用 `AuthGateProvider` 包裹（放在 `ToastProvider` 内层）：

```tsx
        <ToastProvider>
          <AuthGateProvider>
            <Stack>
              {/* ...现有 Stack.Screen 保持不变... */}
            </Stack>
          </AuthGateProvider>
          <StatusBar style="auto" />
        </ToastProvider>
```

- [ ] **Step 2: request 拦截器改为唤起面板**

在 `apps/mobile/request/index.ts` 顶部加入：

```ts
import { useAuthStore } from '@/stores/auth-store';
```

将 `toLoginPage()` 整体替换为：

```ts
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
```

同时删除文件中对 `router` 的引用（若不再使用）：

```ts
import { router } from 'expo-router'; // 删除这一行
```

- [ ] **Step 3: 类型检查**

Run（workdir `apps/mobile`）: `npx tsc --noEmit`
Expected: exit 0

---

## Task 8: 登录页同步 store

**Files:**
- Modify: `apps/mobile/app/auth/login.tsx`

- [ ] **Step 1: 成功后写入 store**

加入 import：

```tsx
import { useAuthStore } from '@/stores/auth-store';
```

在组件内取：

```tsx
  const setSession = useAuthStore((state) => state.setSession);
```

将 `handleLogin` 中的：

```tsx
        await tokenManager.saveLoginInfo(data);
```

替换为：

```tsx
        await setSession(data);
```

（`tokenManager` 若不再被本文件使用，删除其 import；`authService` 保留。）

- [ ] **Step 2: 类型检查**

Run（workdir `apps/mobile`）: `npx tsc --noEmit`
Expected: exit 0

---

## Task 9: "我的"页面游客态

**Files:**
- Modify: `apps/mobile/app/(tabs)/profile.tsx`

- [ ] **Step 1: 未登录不请求接口**

加入 import：

```tsx
import { useAuthGate } from '@/hooks/use-auth-gate';
import { useAuthStore } from '@/stores/auth-store';
```

在组件内取：

```tsx
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const { requireLogin } = useAuthGate();
```

将 `loadUserInfo`、`getSignInStatus` 开头加守卫：

```tsx
  const loadUserInfo = async () => {
    if (!useAuthStore.getState().isLoggedIn) {
      setUserInfo(null);
      setPhone('');
      return;
    }
    try {
```

```tsx
  const getSignInStatus = async () => {
    if (!useAuthStore.getState().isLoggedIn) {
      setSignInStatus(false);
      setConsecutiveSignInDays(0);
      return;
    }
    try {
```

- [ ] **Step 2: 头像与签到走 requireLogin**

头像 `onPress`：

```tsx
              onPress={() => requireLogin(() => router.push('/user/account'))}
```

签到按钮 `onPress` 改为：

```tsx
                onPress={() => requireLogin(() => {
                  if (!signInStatus) signFunction();
                })}
```

并去掉按钮的 `disabled={signInStatus}`（未登录时需可点击以触发登录）。

- [ ] **Step 3: 统计卡片与菜单走 requireLogin**

余额/优惠券/积分三个 `onPress` 分别包一层：

```tsx
              onPress={() => requireLogin(() => router.push('/(member)/top-up'))}
```
```tsx
              onPress={() => requireLogin(() => router.push('/user/coupon'))}
```
```tsx
              onPress={() => requireLogin(() => router.push('/(points)/pointPage'))}
```

将 `menuItems` 改为函数内构造（以便访问 `requireLogin`），或保持常量但把 `onPress` 改为通过 `requireLogin` 调用。采用后者时需把 `menuItems` 移入组件内：

```tsx
  const menuItems: MenuListItem[] = [
    { key: 'orders', icon: 'clipboard-text-outline', label: '我的订单',
      onPress: () => requireLogin(() => router.push('/orders')) },
    { key: 'lottery', icon: 'slot-machine', label: '幸运抽奖',
      onPress: () => router.push('/(points)/luckyRoll' as any) },
    { key: 'gift-card', icon: 'gift-outline', label: '礼品卡',
      onPress: () => requireLogin(() => router.push('/(member)/gift-card')) },
    { key: 'address', icon: 'map-marker-outline', label: '地址管理',
      onPress: () => requireLogin(() => router.push('/user/address' as any)) },
    { key: 'customer-service', icon: 'headphones', label: '联系客服',
      onPress: () => requireLogin(() => router.push('/user/support' as any)) },
  ];
```

（"幸运抽奖"页面壳游客可看，故不加拦截。）

- [ ] **Step 4: 游客头部展示**

用户名/手机号在未登录时显示"点击登录"：

```tsx
                <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
                  {isLoggedIn ? userInfo?.username || '用户' : '点击登录'}
                </Text>
```
```tsx
              <Text style={styles.userPhone}>
                {isLoggedIn ? phone || '' : '登录后享受更多权益'}
              </Text>
```

- [ ] **Step 5: 类型检查**

Run（workdir `apps/mobile`）: `npx tsc --noEmit`
Expected: exit 0

---

## Task 10: 消息页与排队页改用 requireLogin

**Files:**
- Modify: `apps/mobile/app/(tabs)/messages.tsx`
- Modify: `apps/mobile/app/queue/index.tsx`

- [ ] **Step 1: messages.tsx**

当前 `openSupport` 自身就是"检查登录 + 跳转"的入口，直接改成 `requireLogin` 会递归。需拆成"纯动作"与"受保护入口"两个函数：

将（26-33 行）：

```tsx
  const openSupport = async () => {
    if (!(await tokenManager.isLoggedIn())) {
      ToastManager.show('请先登录后联系客服');
      router.push('/auth/login');
      return;
    }
    router.push('/user/support' as any);
  };
```

替换为：

```tsx
  const openSupport = () => {
    router.push('/user/support' as any);
  };

  const handleSupportPress = () => {
    requireLogin(openSupport);
  };
```

并将 JSX 中（51 行）的 `onPress={openSupport}` 改为 `onPress={handleSupportPress}`。

同时 `loadConversation`（13-20 行）改用 store 判断，保持登录态来源统一：

```tsx
  const loadConversation = useCallback(async () => {
    if (!useAuthStore.getState().isLoggedIn) {
      setConversation(null);
      return;
    }
    const [error, data] = await supportService.getConversation();
    if (!error) setConversation(data);
  }, []);
```

引入：

```tsx
import { useAuthGate } from '@/hooks/use-auth-gate';
import { useAuthStore } from '@/stores/auth-store';
```

组件内取 `const { requireLogin } = useAuthGate();`。

替换后 `ToastManager`、`tokenManager`、`router` 若不再使用，删除对应 import（`router` 仍被 `openSupport` 使用，保留）。

- [ ] **Step 2: queue/index.tsx**

同样拆分（81-93 行）。将：

```tsx
  const openTakeNumber = async (store: QueueStore) => {
    if (!(await tokenManager.isLoggedIn())) {
      ToastManager.show("请先登录后取号");
      router.push("/auth/login");
      return;
    }
    if (currentTicket) {
      router.push("/queue/ticket" as any);
      return;
    }
    setPartySize(2);
    setSelectedStore(store);
  };
```

替换为：

```tsx
  const openTakeNumber = (store: QueueStore) => {
    if (currentTicket) {
      router.push("/queue/ticket" as any);
      return;
    }
    setPartySize(2);
    setSelectedStore(store);
  };

  const handleTakeNumber = (store: QueueStore) => {
    requireLogin(() => openTakeNumber(store));
  };
```

将列表中"立即取号"按钮的 `onPress`（搜索 `openTakeNumber(` 的调用点）改为 `handleTakeNumber(store)`。

`loadData` 中（56 行）的 `await tokenManager.isLoggedIn()` 改为：

```tsx
      if (useAuthStore.getState().isLoggedIn) {
```

引入：

```tsx
import { useAuthGate } from '@/hooks/use-auth-gate';
import { useAuthStore } from '@/stores/auth-store';
```

组件内取 `const { requireLogin } = useAuthGate();`。`ToastManager`、`tokenManager` 若不再使用则删除 import。

- [ ] **Step 3: 类型检查**

Run（workdir `apps/mobile`）: `npx tsc --noEmit`
Expected: exit 0

---

## Task 11: 结算入口与需登录页面

**Files:**
- Modify: `apps/mobile/app/(tabs)/cart.tsx`、`apps/mobile/app/(tabs)/order.tsx`
- Modify: `apps/mobile/app/(orderfood)/settlement.tsx`
- Modify: `apps/mobile/app/(tabs)/orders.tsx`
- Modify: `apps/mobile/app/queue/ticket.tsx`
- Modify: `apps/mobile/app/user/account.tsx`、`address.tsx`、`coupon.tsx`、`support.tsx`
- Modify: `apps/mobile/app/(member)/top-up.tsx`、`memberCode.tsx`、`gift-card.tsx`

- [ ] **Step 1: 结算入口拦截**

`cart.tsx`（约 111 行）与 `order.tsx`（约 553 行）的 `router.push('/(orderfood)/settlement')` 改为：

```tsx
onPress={() => requireLogin(() => router.push('/(orderfood)/settlement'))}
```

（两文件引入 `useAuthGate` 并在组件内取 `requireLogin`。）

- [ ] **Step 2: 页面级包裹（拆分为"守卫外壳 + 内容组件"）**

> **关键**：不能只把 JSX 包进 `RequireLogin`。页面的 `useEffect` 在页面组件自身执行，早于渲染，因此未登录时仍会发起鉴权请求。必须把现有页面组件**改名为内容组件**，再由新的默认导出在外层做守卫——这样内容组件在未登录时根本不会挂载。

对以下每个文件执行同样的两步改造：

- `app/(orderfood)/settlement.tsx`
- `app/(tabs)/orders.tsx`
- `app/queue/ticket.tsx`
- `app/user/account.tsx`
- `app/user/address.tsx`
- `app/user/coupon.tsx`
- `app/user/support.tsx`
- `app/(member)/top-up.tsx`
- `app/(member)/memberCode.tsx`
- `app/(member)/gift-card.tsx`

以 `settlement.tsx` 为例：

**改动 1**：把现有 `export default function SettlementScreen() { ... }` 改为非导出的内容组件，函数体完全不动：

```tsx
function SettlementContent() {
  // ...原有全部逻辑与 hooks 保持不变...
  return (
    // ...原有 JSX...
  );
}
```

**改动 2**：在文件末尾（`styles` 定义之前或之后均可）新增默认导出：

```tsx
export default function SettlementScreen() {
  return (
    <RequireLogin title="登录后下单" description="请先登录再继续结算">
      <SettlementContent />
    </RequireLogin>
  );
}
```

**改动 3**：文件顶部引入：

```tsx
import { RequireLogin } from '@/components/auth/RequireLogin';
```

各页面的 `title` / `description` 建议值：

| 文件 | title | description |
|---|---|---|
| settlement.tsx | 登录后下单 | 请先登录再继续结算 |
| orders.tsx | 登录后查看订单 | 登录即可查看您的历史订单 |
| queue/ticket.tsx | 登录后查看排队 | 登录即可查看您的排队号码 |
| user/account.tsx | 登录后管理资料 | 登录即可编辑个人资料 |
| user/address.tsx | 登录后管理地址 | 登录即可维护收货地址 |
| user/coupon.tsx | 登录后查看优惠券 | 登录即可查看您的优惠券 |
| user/support.tsx | 登录后联系客服 | 登录即可与客服在线沟通 |
| top-up.tsx | 登录后充值 | 登录即可为账户充值 |
| memberCode.tsx | 登录后查看会员码 | 登录即可使用会员权益 |
| gift-card.tsx | 登录后查看礼品卡 | 登录即可管理礼品卡 |

内容组件命名对应：`SettlementContent`、`OrdersContent`、`QueueTicketContent`、`AccountContent`、`AddressContent`、`CouponContent`、`SupportContent`、`TopUpContent`、`MemberCodeContent`、`GiftCardContent`。

**注意**：若某文件同时有其他具名导出，保持不动；只调整默认导出的那个组件。

- [ ] **Step 3: 退出登录改用 store**

`app/user/account.tsx` 的 `handleLogout` 中，把清除登录信息调用改为：

```tsx
        await useAuthStore.getState().clearSession();
```

（引入 `useAuthStore`；若 `tokenManager.clearLoginInfo` 不再使用则删除相关 import。）

- [ ] **Step 4: 类型检查**

Run（workdir `apps/mobile`）: `npx tsc --noEmit`
Expected: exit 0

---

## Task 12: 抽奖页游客态

**Files:**
- Modify: `apps/mobile/app/(points)/luckyRoll.tsx`
- Modify: `apps/mobile/app/(points)/pointPage.tsx`

- [ ] **Step 1: luckyRoll 公开数据照常、鉴权数据跳过**

- `fetchBigPrizeData` / `fetchBroadcastData` 保持无条件调用（接口公开）。
- `getLuckyRollData()` 需要鉴权：未登录时跳过，并给 `currentPoints`/`freeDrawCount` 默认 0：

```tsx
  const getLuckyRollData = async () => {
    if (!useAuthStore.getState().isLoggedIn) {
      setCurrentPoints(0);
      setFreeDrawCount(0);
      return;
    }
    const [error, result] = await pointsService.getLuckyRollData();
    // ...其余不变
  };
```

- 抽奖按钮 `startLottery` 开头加：

```tsx
    if (!useAuthStore.getState().isLoggedIn) {
      requireLogin(() => startLottery());
      return;
    }
```

（`requireLogin` 存下的是"未登录时点击抽奖"这一意图；登录成功后重新调用 `startLottery`，此时已登录，守卫通过并正常抽奖，不会递归。）

（引入 `useAuthStore`、`useAuthGate`。）

- [ ] **Step 2: pointPage 未登录跳过**

`loadUserInfo` 与 `getPointRecords` 开头加未登录守卫，未登录时清空数据并直接 return（页面壳仍可打开）：

```tsx
    if (!useAuthStore.getState().isLoggedIn) {
      setUserInfo(null);
      return;
    }
```

- [ ] **Step 3: 类型检查**

Run（workdir `apps/mobile`）: `npx tsc --noEmit`
Expected: exit 0

---

## Task 13: 端到端验证

- [ ] **Step 1: 类型检查**

Run（workdir `apps/mobile`）: `npx tsc --noEmit`
Expected: exit 0

- [ ] **Step 2: expo-doctor**

Run（workdir `apps/mobile`）: `npx expo-doctor@latest`
Expected: 全部通过（无新增问题）

- [ ] **Step 3: 打包验证**

Run（workdir `apps/mobile`）:
`npx expo export --platform android --output-dir $env:TEMP\orderfood-verify`
Expected: exit 0，产出 `.hbc` bundle

- [ ] **Step 4: 真机走查（人工）**

- 游客可浏览：首页、点餐、购物车、门店、积分商城、抽奖页壳（能看到围观大奖/中奖播报）
- 游客点"去结算" → 底部弹出登录面板（cooker.png 插画）→ 登录成功后自动进入结算页
- 游客进"我的" → 显示"点击登录"，点菜单/头像/签到弹面板
- 退出登录 → 回游客态，不再硬跳登录页
- 令牌过期（改错 token）→ 弹面板而非硬跳
- 地址弹窗"保存"按钮为橙色白字、可见
