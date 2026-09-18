export type OrderStatus = 'pending' | 'paid' | 'completed' | 'cancelled';

export interface DashboardOrder {
  id: string;
  status: OrderStatus;
  orderType: 'dine-in' | 'takeout';
  payAmount: number;
  createdAt: string;
  user: { username: string; phone: string };
  _count: { orderItems: number };
}

export interface DashboardData {
  userCount: number;
  orderCount: number;
  todayOrderCount: number;
  pendingOrderCount: number;
  foodCount: number;
  couponCount: number;
  giftCardCount: number;
  revenue: number;
  todayRevenue: number;
  lowStockCount: number;
  recentOrders: DashboardOrder[];
}

export interface AdminUser {
  id: string;
  phone: string;
  username: string;
  avatar: string | null;
  gender: number;
  birthday: string | null;
  balance: number;
  integral: number;
  role: 'user' | 'admin';
  createdAt: string;
  _count: { orders: number; userCoupons: number };
}

export interface AdminOrderItem {
  id: string;
  foodId: string;
  foodName: string;
  foodPrice: number;
  quantity: number;
  subtotal: number;
}

export interface AdminOrder {
  id: string;
  orderType: 'dine-in' | 'takeout';
  status: OrderStatus;
  totalAmount: number;
  payAmount: number;
  address: string | null;
  peopleCount: number | null;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; username: string; phone: string };
  orderItems: AdminOrderItem[];
}

export interface AdminCoupon {
  id: string;
  couponName: string;
  couponAmount: number;
  consumeMoney: number;
  couponUseTime: string;
  totalStock: number;
  remainStock: number;
  isActive: boolean;
  createdAt: string;
  _count: { userCoupons: number };
}

export interface AdminGiftCard {
  id: string;
  code: string;
  amount: number;
  status: 'active' | 'redeemed' | 'expired';
  redeemedBy: string | null;
  redeemedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface LotteryPrize {
  id: string;
  prizeName: string;
  prizeImage: string;
  prizeIntegral: number;
  prizeValue: number | null;
  stock: number;
  weight: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface SupportUser {
  id: string;
  username: string;
  phone: string;
  avatar: string | null;
}

export interface SupportConversation {
  id: string;
  userId: string;
  status: 'open' | 'closed';
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  userUnreadCount: number;
  adminUnreadCount: number;
  createdAt: string;
  updatedAt: string;
  user: SupportUser;
}

export interface SupportMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: 'user' | 'admin';
  content: string;
  messageType: 'text' | 'image' | 'file';
  attachmentUrl: string | null;
  attachmentName: string | null;
  attachmentSize: number | null;
  attachmentMime: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface SupportMessagesResult {
  conversation: SupportConversation;
  messages: SupportMessage[];
}
