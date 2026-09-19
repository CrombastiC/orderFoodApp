import { RequireLogin } from "@/components/auth/RequireLogin";
import { queueService, type QueueTicket } from "@/services";
import ToastManager from "@/utils/toast";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Dialog,
  Divider,
  Icon,
  Portal,
  Text,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

function QueueTicketContent() {
  const [ticket, setTicket] = useState<QueueTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelVisible, setCancelVisible] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const loadTicket = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    const [error, data] = await queueService.getCurrentTicket();
    if (!error) setTicket(data);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTicket(true);
    }, [loadTicket]),
  );

  useEffect(() => {
    const timer = setInterval(() => loadTicket(), 15000);
    return () => clearInterval(timer);
  }, [loadTicket]);

  const refresh = async () => {
    setRefreshing(true);
    await loadTicket();
    setRefreshing(false);
  };

  const cancelTicket = async () => {
    if (!ticket) return;
    setCancelling(true);
    const [hasError, result] = await queueService.cancelTicket(ticket.id);
    setCancelling(false);
    if (hasError) {
      ToastManager.show(result.message || "取消失败");
      return;
    }
    setCancelVisible(false);
    setTicket(null);
    ToastManager.show("已取消排队");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={["bottom"]}>
        <ActivityIndicator color="#FF7214" />
      </SafeAreaView>
    );
  }

  if (!ticket) {
    return (
      <SafeAreaView style={styles.center} edges={["bottom"]}>
        <Icon source="ticket-outline" size={76} color="#ccc" />
        <Text style={styles.emptyTitle}>当前没有排队号码</Text>
        <Text style={styles.emptyHint}>选择门店并取号后，可在这里查看进度</Text>
        <Button
          mode="contained"
          buttonColor="#FF7214"
          style={styles.emptyButton}
          onPress={() => router.replace("/queue" as any)}
        >
          去取号
        </Button>
      </SafeAreaView>
    );
  }

  const called = ticket.status === "called";
  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#FF7214"
          />
        }
      >
        <Card
          style={[styles.ticketCard, called && styles.calledCard]}
          mode="elevated"
        >
          <Card.Content style={styles.ticketContent}>
            <View style={[styles.statusBadge, called && styles.calledBadge]}>
              <Text style={[styles.statusText, called && styles.calledText]}>
                {called ? "请到店就餐" : "排队中"}
              </Text>
            </View>
            <Text style={styles.codeLabel}>你的号码</Text>
            <Text style={styles.ticketCode}>{ticket.ticketCode}</Text>
            <Text style={styles.partyText}>
              {ticket.partySize} 位 ·{" "}
              {ticket.queueType === "small" ? "A 组小桌" : "B 组大桌"}
            </Text>
            <Divider style={styles.divider} />
            {called ? (
              <View style={styles.calledNotice}>
                <Icon source="bell-ring" size={28} color="#2E9B59" />
                <Text style={styles.calledNoticeText}>
                  已经叫到你的号码，请尽快联系门店工作人员
                </Text>
              </View>
            ) : (
              <View style={styles.progressRow}>
                <View style={styles.progressItem}>
                  <Text style={styles.progressValue}>{ticket.aheadCount}</Text>
                  <Text style={styles.progressLabel}>前方桌数</Text>
                </View>
                <View style={styles.progressDivider} />
                <View style={styles.progressItem}>
                  <Text style={styles.progressValue}>
                    {ticket.estimatedWaitMinutes}
                  </Text>
                  <Text style={styles.progressLabel}>预计等待（分钟）</Text>
                </View>
              </View>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.storeCard} mode="contained">
          <Card.Content>
            <Text style={styles.storeName}>{ticket.store.name}</Text>
            <View style={styles.infoRow}>
              <Icon source="map-marker-outline" size={18} color="#888" />
              <Text style={styles.infoText}>
                {ticket.store.city}
                {ticket.store.address}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Icon source="clock-outline" size={18} color="#888" />
              <Text style={styles.infoText}>{ticket.store.businessHours}</Text>
            </View>
            <View style={styles.infoRow}>
              <Icon source="phone-outline" size={18} color="#888" />
              <Text style={styles.infoText}>{ticket.store.phone}</Text>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.tipBox}>
          <Icon source="information-outline" size={20} color="#A36A33" />
          <Text style={styles.tipText}>
            排队进度每 15 秒自动更新。过号后请及时联系门店，等位时间仅供参考。
          </Text>
        </View>

        <Button
          mode="outlined"
          textColor="#777"
          style={styles.cancelButton}
          onPress={() => setCancelVisible(true)}
        >
          取消排队
        </Button>
      </ScrollView>

      <Portal>
        <Dialog
          visible={cancelVisible}
          onDismiss={() => setCancelVisible(false)}
        >
          <Dialog.Title>确认取消排队？</Dialog.Title>
          <Dialog.Content>
            <Text>取消后当前号码将失效，如需排队需要重新取号。</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCancelVisible(false)}>暂不取消</Button>
            <Button
              loading={cancelling}
              disabled={cancelling}
              textColor="#D64545"
              onPress={cancelTicket}
            >
              确认取消
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

export default function QueueTicketScreen() {
  return (
    <RequireLogin title="登录后查看排队" description="登录即可查看您的排队号码">
      <QueueTicketContent />
    </RequireLogin>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7F7F7" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F7F7",
    padding: 24,
  },
  content: { padding: 18, paddingBottom: 36 },
  ticketCard: {
    borderRadius: 20,
    backgroundColor: "#FFF8F3",
    borderWidth: 1,
    borderColor: "#FFDCC5",
  },
  calledCard: { backgroundColor: "#F1FBF5", borderColor: "#BEE8CE" },
  ticketContent: { alignItems: "center", paddingVertical: 24 },
  statusBadge: {
    backgroundColor: "#FFE5D3",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
  },
  calledBadge: { backgroundColor: "#D6F2E0" },
  statusText: { color: "#D75C0A", fontSize: 12, fontWeight: "700" },
  calledText: { color: "#24824B" },
  codeLabel: { color: "#999", fontSize: 12, marginTop: 20 },
  ticketCode: {
    color: "#FF7214",
    fontSize: 52,
    lineHeight: 64,
    fontWeight: "900",
    letterSpacing: 3,
  },
  partyText: { color: "#666" },
  divider: { width: "100%", marginVertical: 22 },
  progressRow: { flexDirection: "row", width: "100%", alignItems: "center" },
  progressItem: { flex: 1, alignItems: "center" },
  progressValue: { fontSize: 28, color: "#333", fontWeight: "800" },
  progressLabel: { fontSize: 12, color: "#888", marginTop: 5 },
  progressDivider: { width: 1, height: 42, backgroundColor: "#E6D8CE" },
  calledNotice: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  calledNoticeText: {
    flex: 1,
    marginLeft: 10,
    color: "#287646",
    lineHeight: 21,
  },
  storeCard: { marginTop: 14, borderRadius: 16, backgroundColor: "#fff" },
  storeName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#222",
    marginBottom: 12,
  },
  infoRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  infoText: { color: "#777", fontSize: 13, marginLeft: 8, flex: 1 },
  tipBox: {
    flexDirection: "row",
    backgroundColor: "#FFF4E3",
    borderRadius: 12,
    padding: 13,
    marginTop: 14,
  },
  tipText: {
    color: "#8C6239",
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 8,
    flex: 1,
  },
  cancelButton: { marginTop: 22, borderColor: "#ccc" },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#555", marginTop: 16 },
  emptyHint: { color: "#999", marginTop: 8, textAlign: "center" },
  emptyButton: { marginTop: 24 },
});
