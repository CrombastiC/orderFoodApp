import { RequireLogin } from "@/components/auth/RequireLogin";
import {
  supportService,
  type SupportMessage,
  type SupportUploadFile,
} from "@/services";
import { resolveImageUrl } from "@/utils/image";
import ToastManager from "@/utils/toast";
import { useHeaderHeight } from "expo-router/react-navigation";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Icon, Menu, TextInput } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function formatFileSize(size: number | null) {
  if (!size) return "";
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function SupportContent() {
  const headerHeight = useHeaderHeight();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [conversationStatus, setConversationStatus] = useState<
    "open" | "closed"
  >("open");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachmentMenuVisible, setAttachmentMenuVisible] = useState(false);
  const listRef = useRef<FlatList<SupportMessage>>(null);

  const scrollToBottom = useCallback((animated = true) => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated }), 80);
  }, []);

  const loadMessages = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    const [error, data] = await supportService.getMessages();
    if (!error) {
      setMessages(data.messages);
      setConversationStatus(data.status);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMessages(true);
    }, [loadMessages]),
  );

  useEffect(() => {
    const timer = setInterval(() => loadMessages(), 4000);
    return () => clearInterval(timer);
  }, [loadMessages]);

  useEffect(() => {
    const eventName =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const subscription = Keyboard.addListener(eventName, () =>
      scrollToBottom(),
    );
    return () => subscription.remove();
  }, [scrollToBottom]);

  const appendMessage = (message: SupportMessage) => {
    setConversationStatus("open");
    setMessages((current) => [...current, message]);
    scrollToBottom();
  };

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || sending || uploading) return;
    setSending(true);
    const [hasError, result] = await supportService.sendMessage(content);
    setSending(false);
    if (hasError) {
      ToastManager.show(result.message || "消息发送失败");
      return;
    }
    setInput("");
    appendMessage(result);
  };

  const uploadAttachment = async (file: SupportUploadFile, size?: number) => {
    if (size && size > MAX_FILE_SIZE) {
      ToastManager.show("文件大小不能超过 10MB");
      return;
    }
    setUploading(true);
    const [hasError, result] = await supportService.uploadAttachment(file);
    setUploading(false);
    if (hasError) {
      ToastManager.show(result.message || "文件发送失败");
      return;
    }
    appendMessage(result);
  };

  const pickImage = async () => {
    setAttachmentMenuVisible(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      ToastManager.show("请允许访问相册后再选择图片");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    await uploadAttachment(
      {
        uri: asset.uri,
        name: asset.fileName || `image-${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
      },
      asset.fileSize,
    );
  };

  const pickFile = async () => {
    setAttachmentMenuVisible(false);
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    await uploadAttachment(
      {
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || "application/octet-stream",
      },
      asset.size,
    );
  };

  const openAttachment = async (url: string | null) => {
    if (!url) return;
    const target = resolveImageUrl(url);
    const supported = await Linking.canOpenURL(target);
    if (supported) await Linking.openURL(target);
    else ToastManager.show("当前设备无法打开该文件");
  };

  const renderMessageContent = (item: SupportMessage, mine: boolean) => {
    if (item.messageType === "image" && item.attachmentUrl) {
      return (
        <TouchableOpacity onPress={() => openAttachment(item.attachmentUrl)}>
          <Image
            source={{ uri: resolveImageUrl(item.attachmentUrl) }}
            style={styles.messageImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      );
    }
    if (item.messageType === "file" && item.attachmentUrl) {
      return (
        <TouchableOpacity
          style={[styles.fileCard, mine && styles.mineFileCard]}
          onPress={() => openAttachment(item.attachmentUrl)}
        >
          <View style={[styles.fileIcon, mine && styles.mineFileIcon]}>
            <Icon
              source="file-document-outline"
              size={26}
              color={mine ? "#FF7214" : "#666"}
            />
          </View>
          <View style={styles.fileInfo}>
            <Text
              style={[styles.fileName, mine && styles.mineFileName]}
              numberOfLines={2}
            >
              {item.attachmentName || item.content}
            </Text>
            <Text style={[styles.fileSize, mine && styles.mineFileSize]}>
              {formatFileSize(item.attachmentSize)} · 点击打开
            </Text>
          </View>
        </TouchableOpacity>
      );
    }
    return (
      <Text style={[styles.messageText, mine && styles.mineText]}>
        {item.content}
      </Text>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? headerHeight : 0}
      >
        <View style={styles.serviceStatus}>
          <View style={styles.onlineDot} />
          <Text style={styles.serviceStatusText}>
            人工客服在线 · 通常几分钟内回复
          </Text>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color="#FF7214" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messages}
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
            onContentSizeChange={() => scrollToBottom(false)}
            ListEmptyComponent={
              <View style={styles.welcomeCard}>
                <View style={styles.welcomeIcon}>
                  <Icon source="headset" size={30} color="#FF7214" />
                </View>
                <Text style={styles.welcomeTitle}>你好，这里是在线客服</Text>
                <Text style={styles.welcomeText}>
                  可以发送文字、图片或 10MB 以内的常用文件。
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const mine = item.senderRole === "user";
              return (
                <View
                  style={[
                    styles.messageRow,
                    mine ? styles.mineRow : styles.adminRow,
                  ]}
                >
                  {!mine && (
                    <View style={styles.avatar}>
                      <Icon source="headset" size={20} color="#fff" />
                    </View>
                  )}
                  <View
                    style={[
                      styles.bubble,
                      mine ? styles.mineBubble : styles.adminBubble,
                    ]}
                  >
                    {renderMessageContent(item, mine)}
                    <Text style={[styles.messageTime, mine && styles.mineTime]}>
                      {new Date(item.createdAt).toLocaleTimeString("zh-CN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        <View style={styles.inputBar}>
          {conversationStatus === "closed" && (
            <Text style={styles.closedHint}>
              该会话已结束，发送新消息会重新发起咨询
            </Text>
          )}
          {uploading && (
            <View style={styles.uploadingRow}>
              <ActivityIndicator size={16} color="#FF7214" />
              <Text style={styles.uploadingText}>正在发送附件…</Text>
            </View>
          )}
          <View style={styles.inputRow}>
            <Menu
              visible={attachmentMenuVisible}
              onDismiss={() => setAttachmentMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  style={styles.attachButton}
                  disabled={uploading || sending}
                  onPress={() => {
                    Keyboard.dismiss();
                    setAttachmentMenuVisible(true);
                  }}
                >
                  <Icon source="plus" size={25} color="#666" />
                </TouchableOpacity>
              }
            >
              <Menu.Item
                leadingIcon="image-outline"
                onPress={pickImage}
                title="发送图片"
              />
              <Menu.Item
                leadingIcon="paperclip"
                onPress={pickFile}
                title="发送文件"
              />
            </Menu>
            <TextInput
              mode="outlined"
              placeholder="请输入消息"
              value={input}
              onChangeText={(value: string) => setInput(value.slice(0, 1000))}
              multiline
              style={styles.input}
              outlineStyle={styles.inputOutline}
              activeOutlineColor="#FF7214"
              onFocus={() => scrollToBottom()}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!input.trim() || sending || uploading) &&
                  styles.sendButtonDisabled,
              ]}
              disabled={!input.trim() || sending || uploading}
              onPress={sendMessage}
            >
              {sending ? (
                <ActivityIndicator size={20} color="#fff" />
              ) : (
                <Icon source="send" size={21} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function SupportChatScreen() {
  return (
    <RequireLogin title="登录后联系客服" description="登录即可与客服在线沟通">
      <SupportContent />
    </RequireLogin>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F5F5F5" },
  keyboardView: { flex: 1 },
  serviceStatus: {
    height: 38,
    backgroundColor: "#FFF5EC",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#36B36A",
    marginRight: 7,
  },
  serviceStatusText: { color: "#8A5A34", fontSize: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  messages: { padding: 16, flexGrow: 1 },
  welcomeCard: {
    alignSelf: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 22,
    marginTop: 42,
    maxWidth: 300,
  },
  welcomeIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FFF1E7",
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeTitle: {
    color: "#333",
    fontWeight: "700",
    fontSize: 16,
    marginTop: 12,
  },
  welcomeText: {
    color: "#888",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginTop: 6,
  },
  messageRow: {
    flexDirection: "row",
    marginBottom: 14,
    alignItems: "flex-end",
  },
  mineRow: { justifyContent: "flex-end" },
  adminRow: { justifyContent: "flex-start" },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FF7214",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  bubble: {
    maxWidth: "78%",
    borderRadius: 15,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  mineBubble: { backgroundColor: "#FF7214", borderBottomRightRadius: 4 },
  adminBubble: { backgroundColor: "#fff", borderBottomLeftRadius: 4 },
  messageText: { color: "#333", lineHeight: 21, paddingHorizontal: 3 },
  mineText: { color: "#fff" },
  messageImage: {
    width: 210,
    height: 160,
    borderRadius: 10,
    backgroundColor: "#eee",
  },
  fileCard: {
    width: 230,
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
  },
  mineFileCard: { backgroundColor: "rgba(255,255,255,.08)", borderRadius: 9 },
  fileIcon: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  mineFileIcon: { backgroundColor: "#fff" },
  fileInfo: { flex: 1, marginLeft: 9 },
  fileName: { color: "#333", fontSize: 13, fontWeight: "600" },
  mineFileName: { color: "#fff" },
  fileSize: { color: "#999", fontSize: 10, marginTop: 5 },
  mineFileSize: { color: "#FFE2CF" },
  messageTime: {
    color: "#aaa",
    fontSize: 9,
    marginTop: 5,
    textAlign: "right",
    paddingHorizontal: 3,
  },
  mineTime: { color: "#FFE2CF" },
  inputBar: {
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: Platform.OS === "android" ? 8 : 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ddd",
  },
  closedHint: {
    color: "#999",
    fontSize: 11,
    textAlign: "center",
    marginBottom: 7,
  },
  uploadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },
  uploadingText: { color: "#888", fontSize: 11, marginLeft: 6 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F2F2F2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  input: { flex: 1, maxHeight: 100, backgroundColor: "#F7F7F7", fontSize: 14 },
  inputOutline: { borderRadius: 20, borderColor: "#E5E5E5" },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FF7214",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
  },
  sendButtonDisabled: { backgroundColor: "#D7D7D7" },
});
