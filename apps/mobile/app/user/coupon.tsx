import { RequireLogin } from '@/components/auth/RequireLogin';
import TabSwitch from '@/components/ui/TabSwitch';
import { Coupon, userService } from '@/services/user.service';
import { formatDate } from '@/utils/dateUtils';
import { Stack, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Divider, Icon } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

// 定义tabs配置
const couponTabs = [
  { key: 'unused' as const, label: '未使用' },
  { key: 'expired' as const, label: '已过期' },
];

function CouponContent() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<'unused' | 'expired'>('unused'); // 未使用 or 已过期
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 根据 activeTab 更新路由标题
  useEffect(() => {
    navigation.setOptions({
      title: activeTab === 'unused' ? '未使用优惠券' : '已过期优惠券',
    });
  }, [activeTab, navigation]);

  useEffect(() => {
    fetchCoupons(activeTab === 'unused' ? false : true);
  }, [activeTab]);

  const fetchCoupons = async (isExpired: boolean) => {
    setIsLoading(true);
    const [error, result] = await userService.getCoupons(isExpired);
    if (!error) {
      setCoupons(result || []);
    } else {
      setCoupons([]);
    }
    setIsLoading(false);
  };

  // 处理tab切换
  const handleTabChange = (tab: 'unused' | 'expired') => {
    setActiveTab(tab);
  };
  const renderCoupon = ({ item }: { item: Coupon }) => {
    const isExpired = activeTab === 'expired';

    return (
      <View style={[styles.couponCard, isExpired && styles.couponCardUsed]}>
        {/* 左侧金额区域 */}
        <View style={[styles.leftSection, isExpired && styles.leftSectionUsed]}>
          <View style={styles.amountContainer}>
            <Text style={[styles.currency, isExpired && styles.textUsed]}>¥</Text>
            <Text style={[styles.amount, isExpired && styles.textUsed]}>{item.couponAmount}</Text>
          </View>
          <Text style={[styles.condition, isExpired && styles.textUsed]}>满{item.consumeMoney}元可用</Text>
        </View>

        {/* 齿轮分割线 */}
        <View style={styles.divider}>
          <View style={styles.topCircle} />
          <View style={styles.dashedLine} />
          <View style={styles.bottomCircle} />
        </View>

        {/* 右侧信息区域 */}
        <View style={styles.rightSection}>
          <Text style={[styles.title, isExpired && styles.textUsed]}>{item.couponName}</Text>
          <View style={styles.bottomInfo}>
            <Text style={[styles.validText, isExpired && styles.textUsed]}>
              有效期至{formatDate(item.couponUseTime)}
            </Text>
            {isExpired ? (
              <View style={styles.usedBadge}>
                <Text style={styles.usedText}>已过期</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.useButton}>
                <Text style={styles.useButtonText}>立即使用</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: '我的优惠券' }} />
      
      {/* 顶部切换组件 */}
      <TabSwitch
        tabs={couponTabs}
        activeTab={activeTab}
        onChange={handleTabChange}
      />

      <Divider />

      {/* 优惠券列表 */}
      {isLoading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>加载中...</Text>
        </View>
      ) : coupons.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon source="ticket-outline" size={64} color="#CCCCCC" />
          <Text style={styles.emptyText}>
            {activeTab === 'unused' ? '暂无未使用的优惠券' : '暂无已过期的优惠券'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={coupons}
          renderItem={renderCoupon}
          keyExtractor={(item) => item.couponId}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

export default function CouponScreen() {
  return (
    <RequireLogin title="登录后查看优惠券" description="登录即可查看您的优惠券">
      <CouponContent />
    </RequireLogin>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: '#f5f5f5',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  listContent: {
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  couponCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  couponCardUsed: {
    backgroundColor: '#f9f9f9',
  },
  leftSection: {
    width: 120,
    backgroundColor: '#FF7214',
    paddingVertical: 20,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leftSectionUsed: {
    backgroundColor: '#ccc',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  currency: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
  },
  amount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    lineHeight: 52,
  },
  condition: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4,
  },
  divider: {
    width: 1,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  topCircle: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  dashedLine: {
    flex: 1,
    width: 1,
    borderLeftWidth: 1,
    borderLeftColor: '#e5e5e5',
    borderStyle: 'dashed',
  },
  bottomCircle: {
    position: 'absolute',
    bottom: -8,
    left: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  rightSection: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  bottomInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  validText: {
    fontSize: 12,
    color: '#999',
    flex: 1,
  },
  useButton: {
    backgroundColor: '#FF7214',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 16,
    minWidth: 80,
    alignItems: 'center',
  },
  useButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  usedBadge: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  usedText: {
    fontSize: 12,
    color: '#999',
  },
  textUsed: {
    color: '#999',
  },
});
