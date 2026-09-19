import { useAuthGate } from '@/hooks/use-auth-gate';
import { useAuthStore } from '@/stores/auth-store';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Icon, Text } from 'react-native-paper';

type Props = {
  children: React.ReactNode;
  title?: string;
  description?: string;
};

export function RequireLogin({ children, title, description }: Props) {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn);
  const { requireLogin } = useAuthGate();

  if (isLoggedIn) {
    return <>{children}</>;
  }

  return (
    <View style={styles.container}>
      <Icon source="lock-outline" size={56} color="#FF7214" />
      <Text style={styles.title}>{title || '登录后可查看'}</Text>
      <Text style={styles.description}>
        {description || '该功能需要登录后使用'}
      </Text>
      <Button
        mode="contained"
        buttonColor="#FF7214"
        style={styles.button}
        onPress={() => requireLogin()}
      >
        去登录
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  description: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    borderRadius: 8,
    paddingHorizontal: 24,
  },
});
