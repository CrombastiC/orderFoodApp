/**
 * 标签页布局组件
 * 定义应用底部的标签页导航结构：首页、点餐、购物车、消息、我的
 */

import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Icon } from 'react-native-paper';

export default function TabLayout() {
  const colorScheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>

      {/* 首页 */}
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarIcon: ({ color }) => <Icon source="home" size={28} color={color as string} />,
        }}
      />

      {/* 点餐 */}
      <Tabs.Screen
        name="order"
        options={{
          title: '点餐',
          headerShown: true,
          headerTitleAlign: 'center',
          tabBarIcon: ({ color }) => <Icon source="silverware-fork-knife" size={28} color={color as string} />,
        }}
      />

      {/* 购物车 */}
      <Tabs.Screen
        name="cart"
        options={{
          title: '购物车',
          tabBarIcon: ({ color }) => <Icon source="cart" size={28} color={color as string} />,
        }}
      />

      {/* 消息 */}
      <Tabs.Screen
        name="messages"
        options={{
          title: '消息',
          tabBarIcon: ({ color }) => <Icon source="message-text-outline" size={28} color={color as string} />,
        }}
      />

      {/* 我的 */}
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color }) => <Icon source="account" size={28} color={color as string} />,
        }}
      />

      {/* 订单 - 从"我的"页面进入，不在底部显示 */}
      <Tabs.Screen
        name="orders"
        options={{
          href: null,
        }}
      />

      {/* 图标组 - 开发调试用，隐藏 */}
      <Tabs.Screen
        name="icon"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
