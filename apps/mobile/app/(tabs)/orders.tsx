/**
 * 订单页面
 */

import { RequireLogin } from '@/components/auth/RequireLogin';
import { StyleSheet, View } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

function OrdersContent() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <Appbar.Header mode="small">
        <Appbar.Content title="订单" />
      </Appbar.Header>
      <View style={styles.container}>
        <Text variant="titleLarge">订单页面</Text>
      </View>
    </SafeAreaView>
  );
}

export default function OrdersScreen() {
  return (
    <RequireLogin title="登录后查看订单" description="登录即可查看您的历史订单">
      <OrdersContent />
    </RequireLogin>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
