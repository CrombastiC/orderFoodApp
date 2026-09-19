import { RequireLogin } from '@/components/auth/RequireLogin';
import { orderService } from '@/services/order.service';
import { userService } from '@/services';
import { useCartStore } from '@/stores/cart-store';
import { resolveImageUrl } from '@/utils/image';
import { router, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

function SettlementContent() {
  const {
    items,
    orderType,
    peopleCount,
    storeName,
    remark,
    couponDiscount,
    setRemark,
    updateQuantity,
    removeItem,
    getTotalCount,
    getTotalPrice,
    getPayAmount,
    clearCart,
  } = useCartStore();

  const [loading, setLoading] = useState(false);
  const [showItems, setShowItems] = useState(true);
  const [balance, setBalance] = useState(0);

  useEffect(() => {
    loadBalance();
  }, []);

  const loadBalance = async () => {
    const [error, result] = await userService.getProfile();
    if (!error && result) {
      setBalance(result.balance || 0);
    }
  };

  const totalCount = getTotalCount();
  const totalPrice = getTotalPrice();
  const payAmount = getPayAmount();

  // 购物车为空时返回
  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <Stack.Screen options={{ title: '确认订单' }} />
        <View style={styles.emptyContainer}>
          <Icon source="cart-off" size={64} color="#ddd" />
          <Text style={styles.emptyText}>购物车是空的</Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.emptyBtnText}>去点餐</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const insufficientBalance = balance < payAmount;

  const handleSubmit = async () => {
    if (insufficientBalance) {
      Alert.alert('余额不足', `当前余额 ¥${balance.toFixed(2)}，请先充值`, [
        { text: '去充值', onPress: () => router.push('/(member)/top-up') },
        { text: '取消', style: 'cancel' },
      ]);
      return;
    }

    try {
      setLoading(true);

      // 后端在创建订单的事务内完成余额扣款，避免扣款成功但订单创建失败。
      const [error, data] = await orderService.createOrder({
        orderType,
        totalAmount: totalPrice,
        payAmount,
        peopleCount: orderType === 'dine-in' ? peopleCount : undefined,
        remark: remark || undefined,
        items: items.map((item) => ({
          foodId: item.foodId,
          foodName: item.foodName,
          foodPrice: item.foodPrice,
          quantity: item.quantity,
          subtotal: item.foodPrice * item.quantity,
        })),
      });

      if (error || !data) {
        Alert.alert('下单失败', '订单创建失败，请稍后重试');
        return;
      }

      clearCart();
      Alert.alert('下单成功', `订单号: #${data.id.slice(-4)}`, [
        {
          text: '查看订单',
          onPress: () => router.replace('/(tabs)/orders' as any),
        },
        {
          text: '继续点餐',
          onPress: () => router.replace('/(tabs)/order' as any),
        },
      ]);
    } catch {
      Alert.alert('下单失败', '网络异常，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <Stack.Screen options={{ title: '确认订单' }} />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* 门店信息卡片 */}
        <View style={styles.card}>
          <View style={styles.storeRow}>
            <Icon source="store" size={20} color="#FF7214" />
            <Text style={styles.storeName}>{storeName || '中海大厦店'}</Text>
          </View>
          <View style={styles.tagRow}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>
                {orderType === 'dine-in' ? '堂食' : '外卖'}
              </Text>
            </View>
            {orderType === 'dine-in' && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{peopleCount} 人</Text>
              </View>
            )}
          </View>
        </View>

        {/* 商品列表 */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setShowItems(!showItems)}
          >
            <Text style={styles.sectionTitle}>
              已选商品 ({totalCount})
            </Text>
            <Icon
              source={showItems ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#999"
            />
          </TouchableOpacity>

          {showItems && (
            <View style={styles.itemList}>
              {items.map((item) => (
                <View key={item.foodId} style={styles.itemRow}>
                  <View style={styles.itemImage}>
                    {item.foodImage ? (
                      <Image
                        source={{ uri: resolveImageUrl(item.foodImage) }}
                        style={styles.foodImage}
                      />
                    ) : (
                      <Icon source="food" size={32} color="#ddd" />
                    )}
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.foodName}
                    </Text>
                    <Text style={styles.itemPrice}>
                      ¥{item.foodPrice.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.itemControl}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() =>
                        updateQuantity(item.foodId, item.quantity - 1)
                      }
                    >
                      <Icon source="minus-circle" size={22} color="#FF7214" />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() =>
                        updateQuantity(item.foodId, item.quantity + 1)
                      }
                    >
                      <Icon source="plus-circle" size={22} color="#FF7214" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 优惠券 */}
        <TouchableOpacity style={styles.card} activeOpacity={0.8}>
          <View style={styles.rowBetween}>
            <View style={styles.row}>
              <Icon source="ticket-percent" size={20} color="#FF7214" />
              <Text style={styles.cellLabel}>优惠券</Text>
            </View>
            <View style={styles.row}>
              <Text style={couponDiscount > 0 ? styles.couponValue : styles.couponNone}>
                {couponDiscount > 0 ? `-¥${couponDiscount.toFixed(2)}` : '暂无可用'}
              </Text>
              <Icon source="chevron-right" size={18} color="#999" />
            </View>
          </View>
        </TouchableOpacity>

        {/* 备注 */}
        <View style={styles.card}>
          <View style={styles.row}>
            <Icon source="pencil" size={18} color="#666" />
            <Text style={styles.cellLabel}>备注</Text>
          </View>
          <TextInput
            style={styles.remarkInput}
            placeholder="口味偏好、忌口等（选填）"
            placeholderTextColor="#999"
            value={remark}
            onChangeText={setRemark}
            multiline
            maxLength={100}
          />
        </View>

        {/* 金额明细 */}
        <View style={styles.card}>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>商品总额</Text>
            <Text style={styles.billValue}>¥{totalPrice.toFixed(2)}</Text>
          </View>
          {couponDiscount > 0 && (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>优惠券</Text>
              <Text style={styles.billDiscount}>
                -¥{couponDiscount.toFixed(2)}
              </Text>
            </View>
          )}
          <View style={[styles.billRow, styles.billTotal]}>
            <Text style={styles.totalLabel}>应付金额</Text>
            <Text style={styles.totalValue}>¥{payAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* 支付方式 */}
        <View style={styles.card}>
          <View style={styles.row}>
            <Icon source="wallet" size={20} color="#FF7214" />
            <Text style={styles.cellLabel}>支付方式</Text>
          </View>
          <View style={[styles.rowBetween, { marginTop: 12 }]}>
            <View>
              <Text style={styles.payMethodLabel}>账户余额</Text>
              <Text style={[
                styles.payMethodBalance,
                insufficientBalance && { color: '#D32F2F' },
              ]}>
                ¥{balance.toFixed(2)}
              </Text>
            </View>
            {insufficientBalance ? (
              <TouchableOpacity onPress={() => router.push('/(member)/top-up')}>
                <Text style={styles.topUpLink}>去充值</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.payCheckmark}>
                <Icon source="check-circle" size={22} color="#FF7214" />
              </View>
            )}
          </View>
          {insufficientBalance && (
            <View style={styles.insufficientTip}>
              <Icon source="alert-circle-outline" size={14} color="#D32F2F" />
              <Text style={styles.insufficientText}>余额不足，请先充值</Text>
            </View>
          )}
        </View>

        {/* 底部留白 */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 底部结算栏 */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomInfo}>
          <Text style={styles.bottomCount}>共 {totalCount} 件</Text>
          <View style={styles.bottomPriceRow}>
            <Text style={styles.bottomLabel}>应付:</Text>
            <Text style={styles.bottomPrice}>¥{payAmount.toFixed(2)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          disabled={loading}
          onPress={handleSubmit}
        >
          <Text style={styles.submitBtnText}>
            {loading ? '提交中...' : '确认下单'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function SettlementScreen() {
  return (
    <RequireLogin title="登录后下单" description="请先登录再继续结算">
      <SettlementContent />
    </RequireLogin>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6EAE3',
  },
  scroll: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tag: {
    backgroundColor: '#FFF5F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#FF7214',
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  itemList: {
    marginTop: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  foodImage: {
    width: '100%',
    height: '100%',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF7214',
  },
  itemControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyBtn: {
    padding: 4,
  },
  qtyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 10,
    minWidth: 20,
    textAlign: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cellLabel: {
    fontSize: 15,
    color: '#333',
    marginLeft: 8,
  },
  couponValue: {
    fontSize: 14,
    color: '#FF7214',
    fontWeight: '600',
  },
  couponNone: {
    fontSize: 14,
    color: '#999',
  },
  remarkInput: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    fontSize: 14,
    color: '#333',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  billTotal: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
    paddingTop: 12,
  },
  billLabel: {
    fontSize: 14,
    color: '#666',
  },
  billValue: {
    fontSize: 14,
    color: '#333',
  },
  billDiscount: {
    fontSize: 14,
    color: '#FF7214',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF7214',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  bottomInfo: {
    flexDirection: 'column',
  },
  bottomCount: {
    fontSize: 12,
    color: '#999',
  },
  bottomPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 2,
  },
  bottomLabel: {
    fontSize: 13,
    color: '#666',
    marginRight: 4,
  },
  bottomPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF7214',
  },
  submitBtn: {
    backgroundColor: '#FF7214',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 20,
  },
  submitBtnDisabled: {
    backgroundColor: '#ccc',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F6EAE3',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: '#FF7214',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 20,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  payMethodLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  payMethodBalance: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF7214',
  },
  topUpLink: {
    fontSize: 14,
    color: '#FF7214',
    fontWeight: '500',
  },
  payCheckmark: {
    padding: 4,
  },
  insufficientTip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 4,
  },
  insufficientText: {
    fontSize: 13,
    color: '#D32F2F',
  },
});
