import { useAuthGate } from '@/hooks/use-auth-gate';
import { supportService, type SupportConversationSummary } from '@/services';
import { useAuthStore } from '@/stores/auth-store';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Badge, Icon, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MessagesScreen() {
  const [conversation, setConversation] = useState<SupportConversationSummary | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { requireLogin } = useAuthGate();

  const loadConversation = useCallback(async () => {
    if (!useAuthStore.getState().isLoggedIn) {
      setConversation(null);
      return;
    }
    const [error, data] = await supportService.getConversation();
    if (!error) setConversation(data);
  }, []);

  useFocusEffect(useCallback(() => {
    loadConversation();
  }, [loadConversation]));

  const openSupport = () => {
    router.push('/user/support' as any);
  };

  const handleSupportPress = () => {
    requireLogin(openSupport);
  };

  const refresh = async () => {
    setRefreshing(true);
    await loadConversation();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>消息</Text>
        <Text style={styles.headerHint}>服务通知与在线咨询</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#FF7214" />}
      >
        <TouchableOpacity style={styles.messageCard} activeOpacity={0.75} onPress={handleSupportPress}>
          <View style={styles.iconWrap}>
            <Icon source="headset" size={30} color="#fff" />
          </View>
          <View style={styles.messageBody}>
            <View style={styles.titleRow}>
              <Text style={styles.messageTitle}>在线客服</Text>
              <Text style={styles.timeText}>
                {conversation?.lastMessageAt
                  ? new Date(conversation.lastMessageAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
                  : '09:00-22:00'}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={styles.previewText}>
                {conversation?.lastMessagePreview || '有任何问题都可以在线咨询我们'}
              </Text>
              {!!conversation?.userUnreadCount && (
                <Badge style={styles.badge}>{Math.min(conversation.userUnreadCount, 99)}</Badge>
              )}
            </View>
          </View>
          <Icon source="chevron-right" size={22} color="#bbb" />
        </TouchableOpacity>

        <View style={styles.noticeBox}>
          <Icon source="shield-check-outline" size={20} color="#8A6A55" />
          <Text style={styles.noticeText}>客服消息保存在你的账号中，可在移动端与管理后台实时查看。</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7F7F7' },
  header: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 16, backgroundColor: '#fff' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#222' },
  headerHint: { color: '#999', fontSize: 12, marginTop: 4 },
  content: { padding: 16 },
  messageCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 15 },
  iconWrap: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#FF7214', alignItems: 'center', justifyContent: 'center' },
  messageBody: { flex: 1, marginLeft: 13, marginRight: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  messageTitle: { color: '#222', fontSize: 16, fontWeight: '700' },
  timeText: { color: '#aaa', fontSize: 11 },
  previewRow: { flexDirection: 'row', alignItems: 'center', marginTop: 7 },
  previewText: { flex: 1, color: '#888', fontSize: 13 },
  badge: { backgroundColor: '#FF4D4F', marginLeft: 8 },
  noticeBox: { flexDirection: 'row', padding: 14, backgroundColor: '#F2ECE8', borderRadius: 12, marginTop: 14 },
  noticeText: { flex: 1, color: '#8A6A55', marginLeft: 8, fontSize: 12, lineHeight: 18 },
});
