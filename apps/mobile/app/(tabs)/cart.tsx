/**
 * 购物车页面
 */

import { useAuthGate } from '@/hooks/use-auth-gate';
import { useCartStore } from '@/stores/cart-store';
import { resolveImageUrl } from '@/utils/image';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

/** 带加载失败回退的菜品图片组件 */
function FoodImage({ uri }: { uri: string }) {
  const [error, setError] = useState(false);
  if (error) {
    return <Icon source="food" size={40} color="#ddd" />;
  }
  return (
    <Image
      source={{ uri }}
      style={styles.foodImage}
      resizeMode="cover"
      onError={() => setError(true)}
    />
  );
}

export default function CartScreen() {
  const { requireLogin } = useAuthGate();
  const { items, updateQuantity, removeItem, clearCart } = useCartStore();
  const totalCount = useCartStore((s) => s.getTotalCount());
  const totalPrice = useCartStore((s) => s.getTotalPrice());

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <Icon source="cart-outline" size={80} color="#ddd" />
          <Text style={styles.emptyText}>购物车是空的</Text>
          <TouchableOpacity
            style={styles.goOrderButton}
            onPress={() => router.push('/order')}
          >
            <Text style={styles.goOrderButtonText}>去点餐</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 头部 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>购物车</Text>
        <TouchableOpacity onPress={clearCart} style={styles.clearButton}>
          <Icon source="delete-outline" size={18} color="#999" />
          <Text style={styles.clearText}>清空</Text>
        </TouchableOpacity>
      </View>

      {/* 商品列表 */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.foodId}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.cartItem}>
            <View style={styles.itemImage}>
              {item.foodImage ? (
                <FoodImage uri={resolveImageUrl(item.foodImage)} />
              ) : (
                <Icon source="food" size={40} color="#ddd" />
              )}
            </View>

            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={1}>{item.foodName}</Text>
              <Text style={styles.itemPrice}>¥{item.foodPrice.toFixed(2)}</Text>
            </View>

            <View style={styles.quantityControl}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => updateQuantity(item.foodId, item.quantity - 1)}
              >
                <Icon source="minus-circle" size={24} color="#FF7214" />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{item.quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => updateQuantity(item.foodId, item.quantity + 1)}
              >
                <Icon source="plus-circle" size={24} color="#FF7214" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* 底部结算栏 */}
      <View style={styles.bottomBar}>
        <View style={styles.totalInfo}>
          <Text style={styles.totalLabel}>合计</Text>
          <Text style={styles.totalPrice}>¥{totalPrice.toFixed(2)}</Text>
          <Text style={styles.totalCount}>{totalCount}件</Text>
        </View>
        <TouchableOpacity
          style={[styles.checkoutButton, totalCount === 0 && styles.checkoutButtonDisabled]}
          disabled={totalCount === 0}
          onPress={() => requireLogin(() => router.push('/(orderfood)/settlement'))}
        >
          <Text style={styles.checkoutButtonText}>去结算</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearText: {
    fontSize: 13,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  goOrderButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#FF7214',
    borderRadius: 20,
  },
  goOrderButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  listContent: {
    paddingVertical: 8,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    marginRight: 12,
  },
  foodImage: {
    width: '100%',
    height: '100%',
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF7214',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    padding: 4,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 12,
    minWidth: 24,
    textAlign: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  totalInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF7214',
  },
  totalCount: {
    fontSize: 13,
    color: '#999',
  },
  checkoutButton: {
    backgroundColor: '#FF7214',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  checkoutButtonDisabled: {
    backgroundColor: '#ccc',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
