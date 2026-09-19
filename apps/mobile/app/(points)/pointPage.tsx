import { userService } from "@/services";
import { PointRecord, pointsService } from "@/services/points.service";
import { useAuthStore } from "@/stores/auth-store";
import { formatDateTime } from "@/utils/dateUtils";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
interface UserInfo {
  id: string;
  username: string;
  phone?: string;
  avatar?: string | null;
  balance?: number;
  integral?: number;
  couponCount?: number;
}
export default function PointPageScreen() {
  const [records, setRecords] = useState<PointRecord[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // 页面加载时获取积分收支记录
    getPointRecords(1);
    loadUserInfo();
  }, []);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const loadUserInfo = async () => {
    if (!useAuthStore.getState().isLoggedIn) {
      setUserInfo(null);
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

        
      }
    } catch (error) {
      console.error('Failed to load user info:', error);
    }
  };

  const getPointRecords = async (pageNum: number) => {
    if (!useAuthStore.getState().isLoggedIn) {
      setRecords([]);
      setHasMore(false);
      return;
    }
    setLoading(true);

    // 调用服务获取积分收支记录
    const [error, result] = await pointsService.getPointsList({
      page: pageNum,
      limit
    });

    setLoading(false);
    setRefreshing(false);

    if (error) {
      console.error('获取积分收支记录失败:', error);
      return;
    }
    const data = result?.data || [];
    
    if (pageNum === 1) {
      setRecords(data);
    } else {
      setRecords(prev => [...prev, ...data]);
    }

    if (data.length < limit) {
      setHasMore(false);
    } else {
      setHasMore(true);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      getPointRecords(nextPage);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    getPointRecords(1);
    loadUserInfo();
  };

  const renderRecord = ({ item }: { item: PointRecord }) => {
    return (
      <View style={styles.recordItem}>
        <View>
          <Text style={styles.recordRemark}>{item.remark}</Text>
          <Text style={styles.recordDate}>{formatDateTime(item.createdAt)}</Text>
        </View>
        <View>
          <Text style={{ color: item.isGet ? 'green' : 'red', paddingHorizontal: 10 }}>{item.isGet ? `+${item.integral}` : `-${item.integral}`}</Text>
        </View>
      </View>
    );
  };
  return (
    <View style={styles.container}>
      <View style={styles.pointContainer}>
        <Text style={styles.pointValue}>{userInfo?.integral || 0}</Text>
        <Text style={styles.pointLabel}>当前积分</Text>
      </View>
      <Text style={{ fontWeight: "bold", marginTop: 20, paddingHorizontal: 10, marginBottom: 10 }}>积分收支记录</Text>
      <FlatList
        style={{ borderRadius: 10, overflow: 'hidden', backgroundColor: '#fff' }}
        data={records}
        renderItem={renderRecord}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListFooterComponent={
          loading && page > 1 ? <Text style={{ textAlign: 'center', padding: 10 }}>加载中...</Text> : <Text style={{ textAlign: 'center', padding: 10 }}>{!hasMore ? '没有更多记录了' : ''}</Text>
        }
        ListEmptyComponent={!loading ? <Text style={{ textAlign: 'center', marginTop: 20, padding: 20, color: '#999' }}>暂无记录</Text> : null}
      >

      </FlatList>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(245, 247, 247)',
    padding: 16,

  },
  pointContainer: {
    marginTop: 20,
    paddingVertical: 32,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 10,
  },
  pointValue: {
    fontSize: 48,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  pointLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
  },
  recordItem: {
    borderBottomColor: '#eee',
    borderBottomWidth: 1,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgb(255, 255, 255)',

  },
  recordRemark: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
    paddingHorizontal: 10,
  },
  recordDate: {
    fontSize: 12,
    color: '#999',
    paddingHorizontal: 10,
  },
})
