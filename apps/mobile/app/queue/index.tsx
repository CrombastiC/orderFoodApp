import {
  queueService,
  type QueueStore,
  type QueueTicket,
} from "@/services";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { useAuthStore } from "@/stores/auth-store";
import { useLocationStore } from "@/stores/location-store";
import ToastManager from "@/utils/toast";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  FlatList,
  Linking,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Dialog,
  Icon,
  Portal,
  Searchbar,
  Text,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

export default function QueueStoresScreen() {
  const city = useLocationStore((state) => state.city);
  const { requireLogin } = useAuthGate();
  const [stores, setStores] = useState<QueueStore[]>([]);
  const [currentTicket, setCurrentTicket] = useState<QueueTicket | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStore, setSelectedStore] = useState<QueueStore | null>(null);
  const [partySize, setPartySize] = useState(2);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      const validCity = city && !city.includes("定位") ? city : undefined;
      const [storeError, storeData] = await queueService.getStores(validCity);
      if (!storeError) {
        if (storeData.length === 0 && validCity) {
          const [fallbackError, fallbackData] = await queueService.getStores();
          if (!fallbackError) setStores(fallbackData);
        } else {
          setStores(storeData);
        }
      }

      if (useAuthStore.getState().isLoggedIn) {
        const [ticketError, ticket] = await queueService.getCurrentTicket();
        if (!ticketError) setCurrentTicket(ticket);
      } else {
        setCurrentTicket(null);
      }
      setLoading(false);
    },
    [city],
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const filteredStores = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return stores;
    return stores.filter((store) =>
      `${store.name}${store.address}`.toLowerCase().includes(keyword),
    );
  }, [search, stores]);

  const openTakeNumber = (store: QueueStore) => {
    if (currentTicket) {
      router.push("/queue/ticket" as any);
      return;
    }
    setPartySize(2);
    setSelectedStore(store);
  };

  const handleTakeNumber = (store: QueueStore) => {
    requireLogin(() => openTakeNumber(store));
  };

  const submitTicket = async () => {
    if (!selectedStore || submitting) return;
    setSubmitting(true);
    const [hasError, result] = await queueService.createTicket(
      selectedStore.id,
      partySize,
    );
    setSubmitting(false);
    if (hasError) {
      ToastManager.show(result.message || "取号失败，请稍后重试");
      return;
    }
    const ticket = result;
    setCurrentTicket(ticket);
    setSelectedStore(null);
    ToastManager.show(`取号成功，你的号码是 ${ticket.ticketCode}`);
    router.push("/queue/ticket" as any);
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadData(false);
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      {currentTicket && (
        <TouchableOpacity
          style={styles.currentTicket}
          onPress={() => router.push("/queue/ticket" as any)}
        >
          <View>
            <Text style={styles.currentLabel}>
              正在排队 · {currentTicket.store.name}
            </Text>
            <Text style={styles.currentCode}>{currentTicket.ticketCode}</Text>
          </View>
          <View style={styles.currentRight}>
            <Text style={styles.currentAhead}>
              前方 {currentTicket.aheadCount} 桌
            </Text>
            <Icon source="chevron-right" size={22} color="#FF7214" />
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.searchRow}>
        <View style={styles.cityBadge}>
          <Icon source="map-marker-outline" size={18} color="#FF7214" />
          <Text style={styles.cityText}>{city}</Text>
        </View>
        <Searchbar
          placeholder="搜索门店"
          value={search}
          onChangeText={setSearch}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#FF7214" />
        </View>
      ) : (
        <FlatList
          data={filteredStores}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor="#FF7214"
            />
          }
          contentContainerStyle={
            filteredStores.length ? styles.list : styles.emptyList
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Icon source="store-search-outline" size={58} color="#ccc" />
              <Text style={styles.emptyTitle}>附近暂无可排队门店</Text>
              <Text style={styles.emptyHint}>可以清空搜索或切换城市后重试</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Card style={styles.storeCard} mode="elevated">
              <Card.Content>
                <View style={styles.storeHeader}>
                  <View style={styles.storeTitleWrap}>
                    <Text style={styles.storeName}>{item.name}</Text>
                    <Text style={styles.storeAddress}>
                      {item.city}
                      {item.address}
                    </Text>
                  </View>
                  <View style={styles.openBadge}>
                    <Text style={styles.openBadgeText}>营业中</Text>
                  </View>
                </View>
                <View style={styles.storeMeta}>
                  <Text style={styles.metaText}>{item.businessHours}</Text>
                  <Text style={styles.metaDivider}>·</Text>
                  <Text style={styles.metaText}>
                    平均每桌 {item.averageWaitMinutes} 分钟
                  </Text>
                </View>
                <View style={styles.storeFooter}>
                  <View>
                    <Text style={styles.waitLabel}>当前等位</Text>
                    <Text style={styles.waitCount}>
                      {item.waitingCount}
                      <Text style={styles.waitUnit}> 桌</Text>
                    </Text>
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.phoneButton}
                      onPress={() => Linking.openURL(`tel:${item.phone}`)}
                    >
                      <Icon source="phone-outline" size={20} color="#FF7214" />
                    </TouchableOpacity>
                    <Button
                      mode="contained"
                      buttonColor="#FF7214"
                      onPress={() => handleTakeNumber(item)}
                    >
                      {currentTicket ? "查看排队" : "立即取号"}
                    </Button>
                  </View>
                </View>
              </Card.Content>
            </Card>
          )}
        />
      )}

      <Portal>
        <Dialog
          visible={!!selectedStore}
          onDismiss={() => setSelectedStore(null)}
        >
          <Dialog.Title>确认就餐人数</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogStore}>{selectedStore?.name}</Text>
            <View style={styles.partyPicker}>
              <TouchableOpacity
                style={[
                  styles.partyButton,
                  partySize <= 1 && styles.partyButtonDisabled,
                ]}
                disabled={partySize <= 1}
                onPress={() => setPartySize((value) => Math.max(1, value - 1))}
              >
                <Icon
                  source="minus"
                  size={24}
                  color={partySize <= 1 ? "#bbb" : "#333"}
                />
              </TouchableOpacity>
              <View style={styles.partyValue}>
                <Text style={styles.partyNumber}>{partySize}</Text>
                <Text style={styles.partyUnit}>位</Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.partyButton,
                  partySize >= 20 && styles.partyButtonDisabled,
                ]}
                disabled={partySize >= 20}
                onPress={() => setPartySize((value) => Math.min(20, value + 1))}
              >
                <Icon
                  source="plus"
                  size={24}
                  color={partySize >= 20 ? "#bbb" : "#333"}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.dialogHint}>
              {partySize <= 4
                ? "将进入 A 组（1-4 人桌）"
                : "将进入 B 组（5 人及以上）"}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSelectedStore(null)}>取消</Button>
            <Button
              loading={submitting}
              disabled={submitting}
              textColor="#FF7214"
              onPress={submitTicket}
            >
              确认取号
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F7F7" },
  currentTicket: {
    margin: 16,
    marginBottom: 0,
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#FFF4EC",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFD8BF",
  },
  currentLabel: { color: "#8A4B22", fontSize: 12, marginBottom: 4 },
  currentCode: { color: "#FF7214", fontWeight: "800", fontSize: 26 },
  currentRight: { flexDirection: "row", alignItems: "center" },
  currentAhead: { color: "#8A4B22", marginRight: 4 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 10,
  },
  cityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    height: 44,
    borderRadius: 12,
  },
  cityText: { marginLeft: 4, color: "#333", maxWidth: 64 },
  searchBar: { flex: 1, height: 44, backgroundColor: "#fff", borderRadius: 12 },
  searchInput: { minHeight: 0, fontSize: 14 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  emptyList: { flexGrow: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyTitle: { fontWeight: "600", color: "#666", marginTop: 12 },
  emptyHint: { color: "#999", fontSize: 12, marginTop: 6 },
  storeCard: { marginBottom: 12, borderRadius: 14, backgroundColor: "#fff" },
  storeHeader: { flexDirection: "row", alignItems: "flex-start" },
  storeTitleWrap: { flex: 1, paddingRight: 8 },
  storeName: { color: "#222", fontSize: 16, fontWeight: "700" },
  storeAddress: { color: "#888", fontSize: 12, marginTop: 6 },
  openBadge: {
    backgroundColor: "#EAF8EF",
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  openBadgeText: { color: "#2E9B59", fontSize: 11 },
  storeMeta: { flexDirection: "row", marginTop: 14, alignItems: "center" },
  metaText: { color: "#777", fontSize: 12 },
  metaDivider: { color: "#bbb", marginHorizontal: 7 },
  storeFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#eee",
  },
  waitLabel: { color: "#999", fontSize: 11 },
  waitCount: {
    color: "#FF7214",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 2,
  },
  waitUnit: { color: "#666", fontSize: 12, fontWeight: "400" },
  actions: { flexDirection: "row", alignItems: "center", gap: 10 },
  phoneButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF4EC",
    alignItems: "center",
    justifyContent: "center",
  },
  dialogStore: { color: "#666", textAlign: "center" },
  partyPicker: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 24,
    gap: 28,
  },
  partyButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F4F4F4",
    alignItems: "center",
    justifyContent: "center",
  },
  partyButtonDisabled: { opacity: 0.5 },
  partyValue: {
    flexDirection: "row",
    alignItems: "baseline",
    minWidth: 72,
    justifyContent: "center",
  },
  partyNumber: { fontSize: 36, fontWeight: "800", color: "#FF7214" },
  partyUnit: { marginLeft: 5, color: "#666" },
  dialogHint: { textAlign: "center", color: "#999", fontSize: 12 },
});
