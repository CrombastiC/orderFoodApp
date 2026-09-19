/**
 * 我的页面
 */

import MenuList, { MenuListItem } from '@/components/ui/MenuList';
import { useAuthGate } from '@/hooks/use-auth-gate';
import { userService, type UserProfile } from '@/services';
import { useAuthStore } from '@/stores/auth-store';
import ToastManager from '@/utils/toast';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Image, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const [userInfo, setUserInfo] = useState<UserProfile | null>(null);
  const [phone, setPhone] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [signInStatus, setSignInStatus] = useState(false);// 是否已签到
  //连续签到天数
  const [consecutiveSignInDays, setConsecutiveSignInDays] = useState(0);
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const { requireLogin } = useAuthGate();

  // 功能菜单配置
  const menuItems: MenuListItem[] = [
    {
      key: 'orders',
      icon: 'clipboard-text-outline',
      label: '我的订单',
      onPress: () => requireLogin(() => router.push('/orders')),
    },
    {
      key: 'lottery',
      icon: 'slot-machine',
      label: '幸运抽奖',
      onPress: () => router.push('/(points)/luckyRoll' as any),
    },
    {
      key: 'gift-card',
      icon: 'gift-outline',
      label: '礼品卡',
      onPress: () => requireLogin(() => router.push('/(member)/gift-card')),
    },
    {
      key: 'address',
      icon: 'map-marker-outline',
      label: '地址管理',
      onPress: () => requireLogin(() => router.push('/user/address' as any)),
    },
    {
      key: 'customer-service',
      icon: 'headphones',
      label: '联系客服',
      onPress: () => requireLogin(() => router.push('/user/support' as any)),
    },
  ];

  useEffect(() => {
    loadUserInfo();
    getSignInStatus();
  }, []);

  // 页面获得焦点时重新加载用户信息（从充值成功页返回时触发）
  useFocusEffect(
    useCallback(() => {
      loadUserInfo();
      getSignInStatus();
    }, [])
  );

  const loadUserInfo = async () => {
    if (!useAuthStore.getState().isLoggedIn) {
      setUserInfo(null);
      setPhone('');
      return;
    }
    try {
      // 从API获取用户信息
      const [error, result] = await userService.getProfile();
      if (error) {
        console.error('Failed to load user info:', error);
        return;
      }

      // axios 拦截器已解包，result 直接就是用户数据
      if (result) {
        setUserInfo(result);

        // 格式化手机号，隐藏中间4位
        if (result.phone) {
          const formattedPhone = result.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
          setPhone(formattedPhone);
        }
      }
    } catch (error) {
      console.error('Failed to load user info:', error);
    }
  };
  //获取签到状态
  const getSignInStatus = async () => {
    if (!useAuthStore.getState().isLoggedIn) {
      setSignInStatus(false);
      setConsecutiveSignInDays(0);
      return;
    }
    try {
      const [error, result] = await userService.getSignInStatus();
      if (error) {
        console.error('Failed to get sign-in status:', error);
        return;
      }
      console.log(result);
      setSignInStatus(result.isCheckIn);
      setConsecutiveSignInDays(result.streak);
      console.log('签到状态', result.isCheckIn);
    } catch (error) {
      console.error('Failed to get sign-in status:', error);
    }
  }

  const signFunction = async () => {
    try {
      const [error, result] = await userService.signIn();
      if (error) {
        console.error('签到失败:', result.message);
        const errorMsg = result.message || '签到失败';
        ToastManager.show(errorMsg);
        return;
      }
      ToastManager.show('签到成功，可免费抽奖一次');
      // 签到成功后立即更新本地状态，无需等待接口返回
      setSignInStatus(true);
      setConsecutiveSignInDays(prev => prev + 1);
      // 同时异步刷新确保数据一致性
      await getSignInStatus();
    } catch (error) {
      console.error('签到异常:', error);
    }
  };



  // 格式化数字，添加千位分隔符
  const formatNumber = (num: number) => {
    return num.toFixed(1);
  };

  // 下拉刷新
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadUserInfo(), getSignInStatus()]);
    setRefreshing(false);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF7214']} // Android
            tintColor="#FF7214" // iOS
          />
        }
      >


        {/* 用户信息卡片 */}
        <View style={styles.userCard}>
          {/* 头像和基本信息 */}
          <View style={styles.userHeader}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={() => requireLogin(() => router.push('/user/account'))}
            >
              {userInfo?.avatar ? (
                <Image source={{ uri: userInfo.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <MaterialCommunityIcons name="account" size={40} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.userBasicInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
                  {isLoggedIn ? userInfo?.username || '用户' : '点击登录'}
                </Text>
                <View style={styles.memberBadge}>
                  <Text style={styles.memberBadgeText}>普通会员</Text>
                </View>
              </View>
              <Text style={styles.userPhone}>
                {isLoggedIn ? phone || '' : '登录后享受更多权益'}
              </Text>
            </View>
            {/* 签到相关 */}
            <View style={{ alignItems: 'center', gap: 8 }}>
              {/* 签到按钮 */}
              <TouchableOpacity
                style={[styles.signInButton, signInStatus && styles.signInButtonDisabled]}
                onPress={() => requireLogin(() => {
                  if (!signInStatus) {
                    signFunction();
                  }
                })}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={signInStatus ? "check-circle" : "calendar-check"}
                  size={16}
                  color={signInStatus ? "#999" : "#FF7214"}
                />
                <Text style={[styles.signInButtonText, signInStatus && styles.signInButtonTextDisabled]}>
                  {signInStatus ? '已签到' : '签到'}
                </Text>
              </TouchableOpacity>
              <View>
                {consecutiveSignInDays > 0 && (
                  <Text style={{ fontSize: 12, color: '#666' }}>
                    已连续签到 
                    <Text style={{color: '#FF7214'}}>{consecutiveSignInDays}</Text>天
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* 统计信息 */}
          <View style={styles.statsContainer}>
            <TouchableOpacity onPress={() => requireLogin(() => router.push('/(member)/top-up'))} activeOpacity={0.7} style={[styles.statItem, styles.statItemLeft]}>
              <View style={[styles.statContent, styles.statContentLeft]}>
                <View style={styles.statValueContainer}>
                  <Text style={styles.statPrefix}>¥</Text>
                  <Text style={styles.statValue}>{formatNumber(userInfo?.balance || 0)}</Text>
                </View>
                <Text style={styles.statLabel}>余额</Text>
              </View>
            </TouchableOpacity>

            {/* <View style={styles.statDivider} /> */}
            <TouchableOpacity onPress={() => requireLogin(() => router.push('/user/coupon'))} activeOpacity={0.7} style={[styles.statItem, styles.statItemCenter]}>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>{userInfo?.couponCount || 0}</Text>
                <Text style={styles.statLabel}>优惠券</Text>
              </View>
            </TouchableOpacity>

            {/* <View style={styles.statDivider} /> */}
            <TouchableOpacity onPress={() => requireLogin(() => router.push('/(points)/pointPage'))} activeOpacity={0.7} style={[styles.statItem, styles.statItemCenter]}>
              <View style={[styles.statContent, styles.statContentRight]}>
                <Text style={styles.statValue}>{userInfo?.integral || 0}</Text>
                <Text style={styles.statLabel}>积分</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 功能列表 */}
        <MenuList
          items={menuItems}
          containerStyle={styles.functionsContainer}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  menuButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  userCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 60,
    paddingHorizontal: 4,
    paddingVertical: 20,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF7214',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userBasicInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
    maxWidth: 80, // 限制宽度，约4个汉字
  },
  memberBadge: {
    backgroundColor: '#FF7214',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  memberBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
  },
  userPhone: {
    fontSize: 13,
    color: '#999',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
  },
  statItemLeft: {
    alignItems: 'flex-start',
  },
  statItemCenter: {
    alignItems: 'center',
  },
  statItemRight: {
    alignItems: 'flex-end',
  },
  statContent: {
    alignItems: 'center',
  },
  statContentLeft: {
    alignSelf: 'flex-start',
  },
  statContentRight: {
    alignSelf: 'flex-end',
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  statPrefix: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginRight: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '600',
    color: '#333',
  },
  statLabel: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#f0f0f0',
  },
  functionsContainer: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF7214',
    gap: 4,
  },
  signInButtonDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  signInButtonText: {
    fontSize: 13,
    color: '#FF7214',
    fontWeight: '600',
  },
  signInButtonTextDisabled: {
    color: '#999',
  },
});
