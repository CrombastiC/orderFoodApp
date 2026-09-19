# OrderFoodApp

餐厅点餐系统 Monorepo，包含 Expo React Native 移动端、NestJS API 和 React 管理后台。

## 项目结构

```text
OrderFoodApp/
├── apps/
│   ├── mobile/        # Expo Router + React Native 移动端
│   ├── api/           # NestJS + Prisma 后端
│   └── admin/         # React + Ant Design 管理后台
├── packages/
│   └── common/        # 前后端共享 TypeScript 类型
└── pnpm-workspace.yaml
```

## 技术栈

| 应用 | 技术 |
|------|------|
| Mobile | Expo 54、React Native 0.81、Expo Router 6、Zustand、React Native Paper |
| API | NestJS 10、Prisma 5、PostgreSQL、JWT、Swagger |
| Admin | React 18、Vite 5、Ant Design 5、React Router 6 |
| Shared | pnpm workspace、TypeScript 共享契约 |

## 快速开始

```bash
pnpm install

# 分别启动
pnpm dev:api       # http://localhost:5001
pnpm dev:admin     # http://localhost:3000
pnpm dev:mobile    # Expo 开发服务器

# 同时启动 API、Admin、Mobile
pnpm runall
```

API 文档：`http://localhost:5001/api-docs`

管理后台种子账号：`13800000000 / admin123`。仅用于本地开发，部署前请修改密码。

## 环境变量

在 `apps/api/.env` 配置：

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/orderfood?schema=public"
PORT=5001
API_PREFIX=api

JWT_SECRET="replace-me"
JWT_EXPIRES_IN="7d"
JWT_REFRESH_SECRET="replace-me-too"
JWT_REFRESH_EXPIRES_IN="30d"

# 启用支付宝支付时填写
ALIPAY_APP_ID=""
ALIPAY_PRIVATE_KEY=""
ALIPAY_PUBLIC_KEY=""
ALIPAY_GATEWAY="https://openapi.alipay.com/gateway.do"
ALIPAY_NOTIFY_URL="https://your-domain.example"
```

移动端 API 地址位于 `apps/mobile/config/api.config.ts`。生产环境的高德 Key 通过 EAS Secrets 注入。

## 功能

### 移动端

- 手机号注册、登录、JWT 自动注入与 Refresh Token 自动续期
- 堂食/外卖菜单、购物车、余额结算和订单创建
- 用户资料、头像上传、余额充值、充值记录、礼品卡兑换
- 每日签到、积分明细、单抽/十连抽、中奖播报
- 优惠券列表和积分商城
- 门店排队取号：按人数分组、实时前方桌数、预计等待时间和取消排队
- 消息中心在线客服：查看未读消息，发送文字、图片和常用文件，并与管理后台持续会话

### 管理后台

- 经营概览：营收、订单、用户、在售菜品、库存预警、最近订单
- 订单管理：搜索、筛选、详情和安全状态流转
- 用户管理：基本资料、余额、积分、订单和优惠券统计
- 菜单分类与菜品管理、图片上传、上下架
- 充值档位、积分商品和抽奖奖品管理
- 优惠券创建、追加库存、启停和定向发放
- 礼品卡生成、编辑、复制、过期与兑换状态管理
- 在线客服工作台：会话检索、未读提醒、文字/图片/文件回复和结束/重开会话

管理后台详情见 [apps/admin/README.md](apps/admin/README.md)。

## API 响应与共享类型

后端成功响应统一为：

```json
{
  "code": 0,
  "message": "success",
  "data": {}
}
```

移动端请求层会解包 `data`，返回判别元组：

```ts
const [error, data] = await userService.getProfile();
if (error) {
  console.error(data.message);
  return;
}

console.log(data.username);
```

跨端业务类型统一放在 `packages/common/src`。新增或修改接口时，应先更新共享契约，再同步 DTO 和调用方。

## 数据库

```bash
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
pnpm prisma:studio
```

种子数据包含管理员、菜单分类、充值档位、抽奖奖品、积分商品、开发礼品卡和排队门店。

新增功能首次启动前需要执行数据库迁移：

```bash
pnpm prisma:migrate
pnpm prisma:seed
```

排队取号使用 `stores`、`store_queue_counters`、`queue_tickets`；在线客服使用
`support_conversations`、`support_messages`。客服消息当前每 4 秒同步，排队进度每 15 秒刷新。

客服附件最大 10MB。图片支持 JPEG、PNG、GIF、WebP、HEIC/HEIF；文件支持
PDF、Word、Excel、PowerPoint、TXT、CSV 和 ZIP。附件保存在 `UPLOAD_PATH`
配置的目录，默认是 API 进程工作目录下的 `uploads`。

## 校验与构建

```bash
# TypeScript
pnpm --filter mobile exec tsc --noEmit
pnpm --filter api exec tsc --noEmit
pnpm --filter @orderfood/admin exec tsc --noEmit

# 构建
pnpm build:api
pnpm --filter @orderfood/admin build
pnpm --filter mobile web:build

# Prisma
pnpm --filter api exec prisma validate
```

## 重要业务约束

- 订单创建在后端事务中同时完成余额扣减、订单写入和明细写入。
- 订单详情只能由所属用户访问；管理端接口需要管理员角色。
- 签到免费抽奖每天最多一次，积分扣减、奖励返还和大奖库存均在事务中处理。
- 支付接口校验订单归属与金额；支付宝通知必须通过验签才会更新订单。
- 已发放优惠券只能停用，不能直接删除；已兑换礼品卡不能修改或删除。
- 每个用户每天只能保留一个进行中的排队号码；1-4 人进入 A 组，5 人及以上进入 B 组。
- 在线客服消息最长 1000 字，用户发送新消息会自动重新打开已结束的会话。

## 许可证

MIT
