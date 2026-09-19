import { RequireLogin } from "@/components/auth/RequireLogin";
import { tokenManager, userService, type UserProfile } from "@/services";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Card, Icon } from "react-native-paper";
import QRCode from "react-native-qrcode-svg";
function MemberCodeContent() {
  const [accountBalance, setAccountBalance] = useState<number>(0);
  // 生成随机会员码
  const [memberCode, setMemberCode] = useState("");

  useEffect(() => {
    // 生成20位随机数字会员码（分段生成避免数字溢出）
    const part1 = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
    const part2 = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
    const part3 = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
    const part4 = Math.floor(Math.random() * 100000).toString().padStart(5, "0");
    const randomCode = part1 + part2 + part3 + part4;
    setMemberCode(randomCode);
  }, []);

  const loadBalance = async () => {
    // 从 userInfo 中解构取值（来自登录接口的 data.user）
    const userInfo = await tokenManager.getUserInfo();
    if (userInfo) {
      setAccountBalance(userInfo.balance || 0);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadBalance();
      loadUserInfo();
    }, [])
  );
 const [userInfo, setUserInfo] = useState<UserProfile | null>(null);
    const loadUserInfo = async () => {
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


  return <View style={styles.container} >
    <Card style={styles.card} mode="elevated">
      <Card.Content>
        {/* 头部标题 */}
        <View style={styles.cardheader}>
          <Icon source="line-scan" size={24} color="#666" />
          <Text style={styles.headerText}>向商家展示支付会员码</Text>
        </View>

        {/* 条码区域 */}
        <View style={styles.cardContent}>
          {memberCode && (
            <>
              {/* 会员码文字 */}
              <View style={styles.barcodeContainer}>
                <Text style={styles.memberCodeText}>{memberCode}</Text>
              </View>

              {/* 二维码区域 */}
              <View style={styles.qrcodeContainer}>
                <QRCode 
                  value={memberCode}
                  size={150}
                  backgroundColor="white"
                />
              </View>
            </>
          )}
        </View>

        {/* 底部余额显示 */}
        <View style={styles.cardFooter}>
          <Text style={styles.balanceLabel}>账户余额</Text>
          <Text style={styles.balanceAmount}>¥{userInfo?.balance?.toFixed(2)}</Text>
        </View>
      </Card.Content>
    </Card>
  </View>;
}

export default function MemberCodeScreen() {
  return (
    <RequireLogin title="登录后查看会员码" description="登录即可使用会员权益">
      <MemberCodeContent />
    </RequireLogin>
  );
}

const styles =StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 40,
    backgroundColor: "#f5f5f5",
  },
  card: {
    width: 340,
    borderRadius: 16,
    elevation: 4,
    backgroundColor: "white",
  },
  cardheader:{
    flexDirection:"row",
    alignItems: "center",
    justifyContent: "flex-start",
    width: "100%",
    paddingVertical: 16,
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
    gap: 8,
  },
  headerText: {
    fontSize: 14,
    color: "#666",
  },
  cardContent:{
    alignItems: "center",
    paddingVertical: 20,
  },
  barcodeContainer: {
    marginBottom: 20,
    alignItems: "center",
  },
  memberCodeText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    letterSpacing: 2,
  },
  qrcodeContainer: {
    padding: 10,
    backgroundColor: "white",
    borderRadius: 8,
  },
  cardFooter:{
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 10,
    borderTopColor: "#eee",
    borderTopWidth: 1,
  },
  balanceLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: "600",
    color: "#333",
  },
});
