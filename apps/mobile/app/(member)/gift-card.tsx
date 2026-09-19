/**
 * 礼品卡兑换页
 */

import { RequireLogin } from '@/components/auth/RequireLogin';
import { userService } from '@/services';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

function GiftCardContent() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadBalance();
    }, [])
  );

  const loadBalance = async () => {
    const [error, result] = await userService.getProfile();
    if (!error && result) {
      setBalance(result.balance || 0);
    }
  };

  const handleRedeem = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      Alert.alert('提示', '请输入兑换码');
      return;
    }

    setLoading(true);
    const [error, result] = await userService.redeemGiftCard(trimmed);
    setLoading(false);

    if (error) {
      const msg = result.message || '兑换失败，请检查兑换码';
      Alert.alert('兑换失败', msg);
      return;
    }

    Alert.alert('兑换成功', `¥${result.amount} 已充入您的账户`);
    setCode('');
    setBalance(result.newBalance);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.container}>
        {/* 余额卡片 */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>当前余额</Text>
          <Text style={styles.balanceValue}>¥{balance.toFixed(2)}</Text>
        </View>

        {/* 兑换区域 */}
        <View style={styles.redeemCard}>
          <View style={styles.redeemHeader}>
            <Icon source="gift-outline" size={24} color="#FF7214" />
            <Text style={styles.redeemTitle}>礼品卡兑换</Text>
          </View>

          <Text style={styles.redeemDesc}>
            输入礼品卡兑换码，余额将充入您的账户
          </Text>

          <TextInput
            style={styles.codeInput}
            placeholder="请输入兑换码"
            placeholderTextColor="#999"
            value={code}
            onChangeText={(text) => setCode(text.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={20}
          />

          <TouchableOpacity
            style={[styles.redeemBtn, (!code.trim() || loading) && styles.redeemBtnDisabled]}
            onPress={handleRedeem}
            disabled={!code.trim() || loading}
            activeOpacity={0.8}
          >
            <Text style={styles.redeemBtnText}>
              {loading ? '兑换中...' : '立即兑换'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 说明 */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>兑换说明</Text>
          <Text style={styles.tipsItem}>1. 每张礼品卡仅可兑换一次</Text>
          <Text style={styles.tipsItem}>2. 兑换后金额将直接充入账户余额</Text>
          <Text style={styles.tipsItem}>3. 请在有效期内完成兑换</Text>
          <Text style={styles.tipsItem}>4. 如有疑问请联系客服</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default function GiftCardScreen() {
  return (
    <RequireLogin title="登录后查看礼品卡" description="登录即可管理礼品卡">
      <GiftCardContent />
    </RequireLogin>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6EAE3',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  balanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF7214',
  },
  redeemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  redeemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  redeemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  redeemDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  codeInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    letterSpacing: 2,
    marginBottom: 16,
  },
  redeemBtn: {
    backgroundColor: '#FF7214',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  redeemBtnDisabled: {
    backgroundColor: '#FFCDA6',
  },
  redeemBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tipsCard: {
    backgroundColor: '#FFF8F1',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFD7BD',
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  tipsItem: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
    marginBottom: 2,
  },
});
