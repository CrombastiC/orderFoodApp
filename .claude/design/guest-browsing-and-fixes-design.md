# 游客浏览模式 + 地址弹窗/抽奖种子修复 设计文档

对应 3 个需求：

1. 新增地址弹窗右下角"保存"按钮白字透明底，看不见。
2. 幸运抽奖页面需要种子数据支撑"围观大奖"和"中奖播报"。
3. 移动端改为"游客可浏览、关键操作才登录"，交互对标奶茶小程序：底部滑出带插画的登录面板，登录后继续原操作。

---

## 一、任务 1：地址弹窗保存按钮

### 现状

`apps/mobile/app/user/address.tsx` 的保存按钮：

```tsx
<TouchableOpacity style={styles.modalButton} onPress={handleSave}>
  <Text style={styles.saveText}>保存</Text>
</TouchableOpacity>
```

- `styles.modalButton` 只定义了 `flex/paddingVertical/borderRadius/alignItems`，**没有 `backgroundColor`**。
- `styles.saveText` 为 `color: '#fff'`。
- 弹层 `modalContent` 背景是 `#fff`。

白字 + 透明白底落在白色弹层上，按钮不可见。属于初始提交 `d559690` 就存在的问题。

### 方案

新增样式并对按钮做样式合并：

```ts
saveButton: {
  backgroundColor: 'rgb(255, 140, 50)',
},
```

```tsx
<TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSave}>
```

与页面底部"新增地址"按钮（`addButton` 的 `rgb(255, 140, 50)`）保持同一主色。

---

## 二、任务 2：抽奖种子数据

### 现状

- `apps/api/prisma/seed.ts` 只初始化了 `LotteryPrize`（9 个奖品），**从未创建 `LotteryRecord`**，也没有用于展示的中奖用户。
- 后端 `points.service.ts#getWinningRecords(isBigPrize)`：
  - `isBigPrize=true`（围观大奖）：过滤 `prize.prizeIntegral === 0`（实物大奖），`createdAt desc`，`take: 50`。
  - `isBigPrize=false`（中奖播报）：全部记录，`createdAt desc`，`take: 50`。
  - 返回 `{ id, userAvatar, username, prizeName, prizeImage, createdAt }`。
- 所以全新库 seed 后，两个模块都是空。

### 方案

在 `seed.ts` 现有奖品初始化之后，新增两段幂等逻辑：

**2.1 展示用户（upsert，以 phone 唯一键）**

- 6~8 个昵称风格用户名，例如：草莓啵啵、奶茶星人、炸鸡一号、布丁控、深夜食堂、柠檬精、小笼包、芝士青年。
- 手机号 `13900000001` ~ `13900000008`，避免与管理员 `13800000000` 冲突。
- 密码统一 `bcrypt.hash('123456', 10)`（仅为满足非空字段，不用于登录展示）。
- `avatar` 可留空（围观大奖的头像是可选渲染），也可填公开占位图。本次留空，减少外链依赖。

**2.2 中奖记录（仅当 `lotteryRecord.count() === 0`）**

- 先查询已存在的奖品，按 `prizeName` 建立 name → id 映射（不依赖奖品是否本次新建）。
- 造约 12 条记录，混合两类：
  - **大奖**：`iPhone 16 Pro`、`华为 MatePad`（`prizeIntegral === 0`）→ 供"围观大奖"。
  - **积分奖**：`积分 ×50 / ×100 / ×200 / ×500` 等 → 供"中奖播报"。
- `userId` 在展示用户里轮换，`prizeId` 取对应奖品。
- `costIntegral` 统一填 `200`（对齐单抽成本）。
  - **关键**：不能填 `0`。`getLuckyRollData` 用"当天是否存在 `costIntegral: 0` 的记录"判断免费抽是否已用，填 0 会让所有新用户被误判为已用免费抽。
- `createdAt` 铺开在最近 3~7 天内、不同小时，让播报滚动与大奖分页（每页 5 条）有真实感。
- 二次执行 seed 时因 `lotteryRecord.count() > 0` 跳过，不产生重复数据。

### 影响文件

- `apps/api/prisma/seed.ts`（唯一改动）

---

## 三、任务 3：游客浏览 + 底部登录面板

### 目标交互

- 游客可访问：首页、点餐菜单、门店/城市选择、购物车、积分商城奖品、抽奖页壳、消息列表壳、排队门店列表。
- 以下操作/页面需要登录：下单结算、我的（个人中心）、会员/余额充值、优惠券、地址管理、在线客服、取号、订单、积分/抽奖的"参与"动作。
- 游客触发需登录操作时：**当前页底部滑出登录面板**（顶部 `cooker.png` 插画 + 手机号/密码表单 + 立即注册），登录成功后面板关闭并**继续刚才的操作**；若只是进入需登录页面，则关闭面板后该页正常渲染。
- 登录过期的处理从"硬跳登录页"改为"弹面板提示重新登录"。

### 现状关键问题

1. **无路由/页面守卫**，唯一门槛是 `apps/mobile/request/index.ts` 的 401 拦截器：任何鉴权接口 401 都会清 token 并 `router.replace('/auth/login')`。
2. **登录后不回跳**：所有跳登录都不带 `redirect`，`login.tsx` 成功后固定 `router.replace('/(tabs)')`。
3. **大量页面挂载即调鉴权接口**（profile、settlement、top-up、memberCode、gift-card、pointPage、coupon、address、support、luckyRoll、queue/ticket），游客一进就被 401 踢走。
4. 登录态只存在 AsyncStorage，无响应式 store；`app/_layout.tsx` 只声明 Provider/Stack。

### 架构

#### 3.1 `stores/auth-store.ts`（新增，Zustand）

单一登录态来源，**只依赖 AsyncStorage 和类型，不 import 任何 service**（避免与 `request/index.ts` 形成循环依赖）。

```ts
type AuthState = {
  isLoggedIn: boolean;
  userInfo: User | null;
  hydrated: boolean;          // 是否已完成启动水合
  loginRequest: { id: number; reason?: string } | null; // 请求弹登录面板的信号
  hydrate: () => Promise<void>;            // 启动时读取 token/userInfo
  setSession: (data: LoginResponse) => Promise<void>; // 写 storage + 更新 state
  clearSession: () => Promise<void>;       // 清 storage + 更新 state
  requestLogin: (reason?: string) => void; // 供拦截器等非 React 环境触发面板
  consumeLoginRequest: () => void;
};
```

- 存储键沿用现有约定：`token`、`refreshToken`、`userId`、`userInfo`。
- `userInfo` 存储格式与 `tokenManager` 保持一致，保证其它读取方兼容。
- `LoginResponse` 类型直接 `import type { LoginResponse } from '@orderfood/common'`（类型导入会被编译期擦除，不引入运行时循环依赖）。

#### 3.2 `components/auth/LoginSheet.tsx`（新增）

底部滑出登录面板。

- 技术：`react-native-paper` 的 `Portal` + `Modal`（`contentContainerStyle` 底部对齐），或 RN `Modal transparent + animationType="slide"`；顶部插画用 `assets/images/cooker.png`。
- 内容：插画头部 + 标题"登录后继续" + 手机号/密码输入（复用 `@/components/ui/PaperTextInput`）+ 校验（复用登录页同规则）+ 橙色（`#FF7214`）登录按钮 + "立即注册"跳 `/auth/register`。
- 逻辑：`authService.login` → 成功后 `useAuthStore.getState().setSession(data)` → 调 `onSuccess()`。
- Props：`visible: boolean`、`reason?: string`、`onClose: () => void`、`onSuccess: () => void`。
- 失败提示沿用登录页 `Alert` 文案风格。

#### 3.3 `components/auth/AuthGateProvider.tsx` + `hooks/use-auth-gate.ts`（新增）

动作级拦截。

- Context 暴露 `requireLogin(action?: () => void, reason?: string)`：
  - 已登录 → 立即执行 `action?.()`。
  - 未登录 → 暂存 `pendingAction`，打开 LoginSheet。
- 登录成功后：关闭面板 → 执行 `pendingAction` → 清空。
- 监听 `auth-store.loginRequest.id` 变化：如果是登录过期等外部触发，打开面板并展示对应文案。
- Context 实例通过 `useAuthGate()` 消费。
- 在 `app/_layout.tsx` 中包裹 `Stack`（放在 `PaperProvider`/`ToastProvider` 内层，确保 Portal 可用）。

#### 3.4 `components/auth/RequireLogin.tsx`（新增）

页面级包装组件：

- 已登录 → 渲染 `children`。
- 未登录 → 渲染统一占位（图标 + "登录后可查看" + "去登录"按钮），按钮调用 `requireLogin()`；**不渲染 children，因此不会触发子页面挂载时的鉴权接口**。
- 目的：一次性解决 10+ 个页面"挂载即 401"的问题，避免逐页改 `useEffect`。

#### 3.5 `request/index.ts` 调整

- 401 且刷新失败时：
  - 仍清空 token（存储）。
  - 改为调用 `useAuthStore.getState().clearSession()` 和 `useAuthStore.getState().requestLogin('expired')`。
  - Toast 文案保留"登录已过期，请重新登录"。
  - **删除** `router.replace('/auth/login')` 硬跳与 `setTimeout`。
- 因为 store 不 import service，`request → store` 无循环依赖。

#### 3.6 `app/_layout.tsx`

- 启动时 `useAuthStore.getState().hydrate()`（替代/补充现有 `loadProfiles`）。
- 用 `<AuthGateProvider>` 包裹 `<Stack>`。

#### 3.7 现有登录页 `app/auth/login.tsx`

- 登录成功后改调 `authStore.setSession(data)`（内部写 storage），保持独立登录页可用（用于退出登录后跳转、直接入口等）。
- 其余逻辑不变。

#### 3.8 页面与动作接入点

| 位置 | 改动 |
|---|---|
| `app/(tabs)/profile.tsx` | 未登录渲染游客头部（头像占位 + "点击登录" → `requireLogin`）；菜单项/签到/资金卡片点击走 `requireLogin`；挂载时未登录**不调用** `getProfile`/`getSignInStatus` |
| `app/(tabs)/messages.tsx` | 现有 `Toast + push('/auth/login')` 换成 `requireLogin(打开会话)` |
| `app/queue/index.tsx` | 现有取号前的 `Toast + push` 换成 `requireLogin(取号)` |
| 结算入口（购物车/点餐页的"去结算"） | `requireLogin(() => router.push(结算页))` |
| `app/(orderfood)/settlement.tsx` | 内容用 `RequireLogin` 包裹 |
| `app/user/account.tsx`、`address.tsx`、`coupon.tsx`、`support.tsx` | 内容用 `RequireLogin` 包裹 |
| `app/(member)/top-up.tsx`、`memberCode.tsx`、`gift-card.tsx` | 内容用 `RequireLogin` 包裹 |
| `app/(points)/pointPage.tsx`、`luckyRoll.tsx` | **页面壳游客可见**（不做 `RequireLogin`）：公开数据照常加载；"抽奖""兑换"等动作按钮走 `requireLogin`；抽奖相关的鉴权数据（如当前积分、免费次数）在未登录时不调用，按游客态展示 |
| `app/(tabs)/orders.tsx`、`app/queue/ticket.tsx` | 内容用 `RequireLogin` 包裹 |
| `app/user/account.tsx` 退出登录 | 改调 `authStore.clearSession()` |

> 说明：`luckyRoll.tsx` 同时要展示"围观大奖/中奖播报"（公开数据）和"抽奖"（需登录）。页面壳不做 `RequireLogin`，只在抽奖按钮动作上 `requireLogin`，数据加载区分公开/鉴权接口。

### 数据流（游客点击"去结算"）

1. 用户点击 → `requireLogin(() => router.push('/...(orderfood)/settlement'))`。
2. 未登录：`pendingAction` 暂存，LoginSheet 滑出。
3. 输入手机号/密码 → `authService.login` → `tokenManager.saveLoginInfo` → `setSession`。
4. `onSuccess`：关闭面板 → 执行 `pendingAction` → 进入结算页。
5. 结算页挂载，此时已登录，`getProfile()` 正常返回。

### 错误处理

- 登录失败：面板内 `Alert`（沿用登录页文案，含当前 API 地址便于排查）。
- 会话过期：Toast + 面板（`reason='expired'`），文案"登录已过期，请重新登录"。
- 面板取消：清空 `pendingAction`，页面保持游客态。
- 注册跳转：关闭面板后 `router.push('/auth/register')`；注册成功现有逻辑回登录页。

### 影响文件清单

**新增**
- `apps/mobile/stores/auth-store.ts`
- `apps/mobile/components/auth/LoginSheet.tsx`
- `apps/mobile/components/auth/AuthGateProvider.tsx`
- `apps/mobile/components/auth/RequireLogin.tsx`
- `apps/mobile/hooks/use-auth-gate.ts`

**修改**
- `apps/mobile/request/index.ts`
- `apps/mobile/app/_layout.tsx`
- `apps/mobile/app/auth/login.tsx`
- `apps/mobile/app/(tabs)/profile.tsx`
- `apps/mobile/app/(tabs)/messages.tsx`
- `apps/mobile/app/queue/index.tsx`
- `apps/mobile/app/queue/ticket.tsx`
- `apps/mobile/app/(tabs)/orders.tsx`
- `apps/mobile/app/(orderfood)/settlement.tsx`
- `apps/mobile/app/user/account.tsx`、`address.tsx`、`coupon.tsx`、`support.tsx`
- `apps/mobile/app/(member)/top-up.tsx`、`memberCode.tsx`、`gift-card.tsx`
- `apps/mobile/app/(points)/pointPage.tsx`、`luckyRoll.tsx`
- 结算入口页面（购物车/点餐，按实际按钮位置接入）

**不改**：后端接口、注册页逻辑、公开的菜单/门店/奖品接口。

### 验证方式

- 任务 1：`apps/mobile` 跑 `npx tsc --noEmit`；真机确认按钮为橙色、白字可见。
- 任务 2：`apps/api` 跑 `npx ts-node prisma/seed.ts` 两次，确认幂等；调 `GET /api/points/getWinningRecords?isBigPrize=true|false` 均有数据。
- 任务 3：`npx tsc --noEmit` + `npx expo export --platform android` 通过；真机走查：游客可浏览菜单/首页/购物车 → 点去结算弹面板 → 登录后进入结算；我的页游客态 → 点菜单弹面板；令牌过期弹面板而非硬跳。
