import { Stack } from 'expo-router';

export default function UserLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="account"
        options={{
          title: '个人资料',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="coupon"
        options={{
          title: '优惠券',
          headerShown: true,
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen
        name="address"
        options={{
          title: '地址管理',
          headerShown: true,
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen
        name="support"
        options={{
          title: '在线客服',
          headerShown: true,
          headerTitleAlign: 'center',
        }}
      />
    </Stack>
  );
}
