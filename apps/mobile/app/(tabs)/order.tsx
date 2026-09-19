/**
 * 点餐页面
 */

import { useAuthGate } from '@/hooks/use-auth-gate';
import { getProductInfo } from '@/services/order.service';
import { useCartStore } from '@/stores/cart-store';
import { resolveImageUrl } from '@/utils/image';
import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, ViewToken } from 'react-native';
import { Icon } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

// 分类数据类型
interface Category {
  classifyId: string; // 分类ID
  classifyName: string; // 分类名称
  icon: string; // 分类图标
}

// 商品数据类型
interface Product {
  id: string; // 商品ID
  classifyId: string; // 分类ID
  foodName: string; // 商品名称
  foodImage: string; // 商品图片
  foodPrice: number; // 商品价格
  quantity: number; // 商品数量
}

// API返回的分类数据
interface CategoryData {
  classifyId: string; // 分类ID
  classifyName: string; // 分类名称
  foods: {
    id: string; // 商品ID
    classifyId: string; // 分类ID
    foodName: string; // 商品名称
    foodImage: string; // 商品图片
    foodPrice: number; // 商品价格
  }[];
}

// // 渲染用的商品项（带分类标题）
interface ProductItem extends Product {
  isTitle?: boolean;
}

// 图标映射
const categoryIcons: { [key: string]: string } = {
  '人气': 'fire',
  '轻食': 'food-apple',
  '牛排': 'food-steak',
  '三明治': 'hamburger',
  '水果沙拉': 'fruit-cherries',
  '饮品': 'cup',
  '小炒': 'chili-hot',
};

/** 带加载失败回退的菜品图片组件 */
function FoodImage({ uri }: { uri: string }) {
  const [error, setError] = useState(false);
  if (error) {
    return <Icon source="food" size={60} color="#ddd" />;
  }
  return (
    <Image
      source={{ uri }}
      style={styles.foodImageStyle}
      resizeMode="cover"
      onError={() => setError(true)}
    />
  );
}

export default function OrderScreen() {
  const { requireLogin } = useAuthGate();
  const [orderType, setOrderType] = useState<'dine-in' | 'takeout'>('dine-in');
  const [selectedCategory, setSelectedCategory] = useState('');//选择的分类ID
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartVisible, setCartVisible] = useState(false); // 购物车列表显示状态
  const slideAnim = useRef(new Animated.Value(0)).current; // 购物车滑动动画

  const storeName = '中海大厦店';
  const distance = '1.2km';
  const flatListRef = useRef<FlatList>(null);
  const categoryScrollRef = useRef<ScrollView>(null);
  const categoryPositions = useRef<Record<string, number>>({});
  const isScrollingRef = useRef(false);

  const { setItems, setOrderType: setCartOrderType, setStoreName, setPeopleCount } = useCartStore();

  // 根据订餐类型获取标题
  const title = orderType === 'dine-in' ? '堂食点餐' : '外送点餐';

  // 加载商品数据
  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [])
  );

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const [isError, data] = await getProductInfo();

      if (!isError && data) {
        const categoryData: CategoryData[] = data as CategoryData[];

        if (Array.isArray(categoryData)) {
          // 处理分类数据
          const categoryList: Category[] = categoryData.map(cat => ({
            classifyId: cat.classifyId,
            classifyName: cat.classifyName,
            icon: categoryIcons[cat.classifyName] || 'food',
          }));
          setCategories(categoryList);

          // 处理商品数据：每个分类前插入标题项
          const productList: ProductItem[] = [];
          categoryData.forEach(cat => {
            // 插入分类标题
            productList.push({
              id: `title_${cat.classifyId}`,
              classifyId: cat.classifyId,
              foodName: cat.classifyName,
              foodImage: '',
              foodPrice: 0,
              quantity: 0,
              isTitle: true,
            });
            cat.foods.forEach(food => {
              productList.push({
                ...food,
                quantity: 0,
              });
            });
          });
          setProducts(productList);

          // 设置默认选中第一个分类
          if (categoryList.length > 0) {
            setSelectedCategory(categoryList[0].classifyId);
          }
        } else {
          setError('数据格式错误');
        }
      } else {
        setError('加载商品信息失败');
      }
    } catch (err) {
      setError('加载商品信息失败');
      console.error('加载商品信息失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 计算购物车总数量和总价
  const cartTotal = products.reduce((sum, item) => sum + item.quantity, 0);
  const cartPrice = products.reduce((sum, item) => sum + item.foodPrice * item.quantity, 0);

  // 获取购物车中的商品
  const cartItems = products.filter(item => item.quantity > 0);

  // 切换购物车显示
  const toggleCart = () => {
    if (cartTotal === 0) return; // 购物车为空时不显示

    const toValue = cartVisible ? 0 : 1;
    setCartVisible(!cartVisible);

    Animated.spring(slideAnim, {
      toValue,
      useNativeDriver: true,
      tension: 65,
      friction: 10,
    }).start();
  };

  // 清空购物车
  const clearCart = () => {
    setProducts(products.map(item => ({ ...item, quantity: 0 })));
    setCartVisible(false);
    slideAnim.setValue(0);
  };

  // 增加商品数量
  const increaseQuantity = (productId: string) => {
    setProducts(products.map(item =>
      item.id === productId ? { ...item, quantity: item.quantity + 1 } : item
    ));
  };

  // 减少商品数量
  const decreaseQuantity = (productId: string) => {
    setProducts(products.map(item =>
      item.id === productId && item.quantity > 0 ? { ...item, quantity: item.quantity - 1 } : item
    ));
  };

  // 点击分类滚动到对应商品
  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(categoryId);
    isScrollingRef.current = true;

    // 找到该分类的第一个商品的索引
    const index = products.findIndex(p => p.classifyId === categoryId);
    if (index !== -1 && flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0,
      });

      // 延迟重置滚动标志
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 1000);
    }
  };

  // 监听右侧可见项变化，同步左侧分类高亮
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (isScrollingRef.current || viewableItems.length === 0) return;

    // 找到第一个非标题项的分类ID
    for (const viewToken of viewableItems) {
      const item = viewToken.item as ProductItem;
      if (item.classifyId && !item.isTitle) {
        setSelectedCategory(item.classifyId);
        break;
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  // 左侧分类跟随选中项自动滚动
  useEffect(() => {
    const y = categoryPositions.current[selectedCategory];
    if (y !== undefined && categoryScrollRef.current) {
      categoryScrollRef.current.scrollTo({ y: Math.max(0, y - 80), animated: true });
    }
  }, [selectedCategory]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <Stack.Screen options={{ title }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF7214" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <Stack.Screen options={{ title }} />
        <View style={styles.errorContainer}>
          <Icon source="alert-circle" size={48} color="#ff4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProducts}>
            <Text style={styles.retryButtonText}>重试</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <Stack.Screen options={{ title }} />

      {/* 头部 */}
      <View style={styles.header}>
        {/* 左侧：门店信息 */}
        <TouchableOpacity style={styles.storeInfo}>
          <View style={styles.storeNameRow}>
            <Text style={styles.storeName}>{storeName}</Text>
            <Icon source="chevron-down" size={20} color="#333" />
          </View>
          <View style={styles.storeDetailRow}>
            <Text style={styles.storeDetail}>
              {orderType === 'dine-in' ? '堂食' : '外卖'} {distance}
            </Text>
          </View>
        </TouchableOpacity>

        {/* 右侧：堂食/外卖切换 */}
        <View style={styles.typeButtons}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              orderType === 'dine-in' && styles.typeButtonActive,
            ]}
            onPress={() => setOrderType('dine-in')}
          >
            <Text
              style={[
                styles.typeButtonText,
                orderType === 'dine-in' && styles.typeButtonTextActive,
              ]}
            >
              堂食
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              orderType === 'takeout' && styles.typeButtonActive,
            ]}
            onPress={() => setOrderType('takeout')}
          >
            <Text
              style={[
                styles.typeButtonText,
                orderType === 'takeout' && styles.typeButtonTextActive,
              ]}
            >
              外卖
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 主内容区域：左右布局 */}
      <View style={styles.contentContainer}>
        {/* 左侧：分类菜单 */}
        <View style={styles.categoryContainer}>
          <ScrollView ref={categoryScrollRef} showsVerticalScrollIndicator={false}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.classifyId}
                onLayout={(e) => {
                  categoryPositions.current[category.classifyId] = e.nativeEvent.layout.y;
                }}
                style={[
                  styles.categoryItem,
                  selectedCategory === category.classifyId && styles.categoryItemActive,
                ]}
                onPress={() => handleCategoryPress(category.classifyId)}
              >
                <Icon
                  source={category.icon}
                  size={20}
                  color={selectedCategory === category.classifyId ? '#FF7214' : '#666'}
                />
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === category.classifyId && styles.categoryTextActive,
                  ]}
                >
                  {category.classifyName}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 右侧：商品列表 */}
        <View style={styles.productContainer}>
          <FlatList
            ref={flatListRef}
            data={products}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            onScrollToIndexFailed={(info) => {
              const wait = new Promise(resolve => setTimeout(resolve, 500));
              wait.then(() => {
                flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
              });
            }}
            renderItem={({ item }) => {
              if (item.isTitle) {
                return <Text style={styles.categoryTitle}>{item.foodName}</Text>;
              }

              return (
                <View style={styles.productCard}>
                  {/* 商品图片 */}
                  <View style={styles.productImage}>
                    {item.foodImage ? (
                      <FoodImage uri={resolveImageUrl(item.foodImage)} />
                    ) : (
                      <Icon source="food" size={60} color="#ddd" />
                    )}
                  </View>

                  {/* 商品信息 */}
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>{item.foodName}</Text>
                    <View style={styles.productBottom}>
                      <Text style={styles.price}>¥{item.foodPrice.toFixed(2)}</Text>

                      {/* 数量控制 */}
                      <View style={styles.quantityControl}>
                        {item.quantity > 0 ? (
                          <>
                            <TouchableOpacity
                              style={styles.quantityButton}
                              onPress={() => decreaseQuantity(item.id)}
                            >
                              <Icon source="minus-circle" size={24} color="#FF7214" />
                            </TouchableOpacity>
                            <View style={styles.quantityTextContainer}>
                              <Text style={styles.quantityText}>{item.quantity}</Text>
                            </View>
                          </>
                        ) : null}
                        <TouchableOpacity
                          style={styles.quantityButton}
                          onPress={() => increaseQuantity(item.id)}
                        >
                          <Icon source="plus-circle" size={24} color="#FF7214" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              );
            }}

          />
        </View>
      </View>

      {/* 遮罩层 - 覆盖主内容区域 */}
      {cartVisible && (
        <TouchableOpacity
          style={styles.cartOverlay}
          activeOpacity={1}
          onPress={toggleCart}
        />
      )}

      {/* 底部区域容器 */}
      <View style={styles.bottomContainer} pointerEvents="box-none">
        {/* 购物车列表区域 */}
        {cartVisible && (
          <Animated.View
            style={[
              styles.cartListContainer,
              {
                transform: [{
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0], // 从下方滑入
                  })
                }],
                opacity: slideAnim,
              }
            ]}
          >
            {/* 购物车头部 */}
            <View style={styles.cartListHeader}>
              <Text style={styles.cartListTitle}>已选商品</Text>
              <TouchableOpacity onPress={clearCart} style={styles.clearCartButton}>
                <Icon source="delete-outline" size={18} color="#999" />
                <Text style={styles.clearCartText}>清空</Text>
              </TouchableOpacity>
            </View>

            {/* 购物车商品列表 */}
            <ScrollView style={styles.cartListScroll} showsVerticalScrollIndicator={false}>
              {cartItems.map((item) => (
                <View key={item.id} style={styles.cartListItem}>
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName} numberOfLines={1}>{item.foodName}</Text>
                    <Text style={styles.cartItemPrice}>¥{item.foodPrice.toFixed(2)}</Text>
                  </View>

                  {/* 数量控制 */}
                  <View style={styles.cartItemControl}>
                    <TouchableOpacity
                      style={styles.cartQuantityButton}
                      onPress={() => decreaseQuantity(item.id)}
                    >
                      <Icon source="minus-circle" size={22} color="#FF7214" />
                    </TouchableOpacity>
                    <Text style={styles.cartQuantityText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.cartQuantityButton}
                      onPress={() => increaseQuantity(item.id)}
                    >
                      <Icon source="plus-circle" size={22} color="#FF7214" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* 底部固定按钮 */}
        <TouchableOpacity
          style={styles.bottomBar}
          onPress={toggleCart}
          activeOpacity={0.8}
        >
          <View style={styles.cartInfo}>
            <View style={[
              styles.cartIconContainer,
              cartTotal > 0 && styles.cartIconContainerActive
            ]}>
              <Icon source="cart" size={24} color="#fff" />
              {cartTotal > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartTotal}</Text>
                </View>
              )}
            </View>
            <View style={styles.priceInfo}>
              <Text style={styles.totalPrice}>¥{cartPrice.toFixed(2)}</Text>
              {/* <Text style={styles.deliveryInfo}>另需配送费¥3</Text> */}
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.checkoutButton,
              cartTotal === 0 && styles.checkoutButtonDisabled
            ]}
            disabled={cartTotal === 0}
            onPress={(e) => {
              e.stopPropagation();
              // 同步购物车数据到 store
              const cartItems = products
                .filter((p) => p.quantity > 0)
                .map((p) => ({
                  foodId: p.id,
                  foodName: p.foodName,
                  foodPrice: p.foodPrice,
                  quantity: p.quantity,
                  foodImage: p.foodImage,
                }));
              setItems(cartItems);
              setCartOrderType(orderType);
              setStoreName(storeName);
              setPeopleCount(1);
              // 跳转结算页面（未登录先弹登录面板）
              requireLogin(() => router.push('/(orderfood)/settlement'));
            }}
          >
            <Text style={styles.checkoutButtonText}>去下单</Text>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FF7214',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  storeInfo: {
    flex: 1,
  },
  storeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 4,
  },
  storeDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storeDetail: {
    fontSize: 12,
    color: '#999',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  typeButtonActive: {
    backgroundColor: '#FFF5F0',
    borderColor: '#FF7214',
  },
  typeButtonText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#FF7214',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  // 左侧分类菜单
  categoryContainer: {
    width: 80,
    backgroundColor: '#f8f8f8',
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
  },
  categoryItem: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: '#f8f8f8',
  },
  categoryItemActive: {
    backgroundColor: '#fff',
    borderLeftWidth: 3,
    borderLeftColor: '#FF7214',
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  categoryTextActive: {
    color: '#FF7214',
    fontWeight: '600',
  },
  // 右侧商品列表
  categoryTitle: {
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  productContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  productCard: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  foodImageStyle: {
    width: '100%',
    height: '100%',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF7214',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 90, // 设置最小宽度确保按钮对齐
  },
  quantityButton: {
    padding: 4,
  },
  quantityTextContainer: {
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  // 底部容器
  bottomContainer: {
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  // 购物车列表遮罩
  cartOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#2c2c2c',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  cartInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cartIconContainer: {
    position: 'relative',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#555',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: -20,
  },
  cartIconContainerActive: {
    backgroundColor: '#FF7214',
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: '#2c2c2c',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  priceInfo: {
    flexDirection: 'column',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  deliveryInfo: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  checkoutButton: {
    backgroundColor: '#FF7214',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 20,
  },
  checkoutButtonDisabled: {
    backgroundColor: '#666',
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  // 购物车列表
  cartListContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  cartListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cartListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  clearCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearCartText: {
    fontSize: 13,
    color: '#999',
  },
  cartListScroll: {
    maxHeight: 240,
  },
  cartListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  cartItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  cartItemName: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF7214',
  },
  cartItemControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartQuantityButton: {
    padding: 4,
  },
  cartQuantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginHorizontal: 10,
    minWidth: 20,
    textAlign: 'center',
  },
});
