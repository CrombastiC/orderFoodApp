import { RequireLogin } from '@/components/auth/RequireLogin';
import TabSwitch from '@/components/ui/TabSwitch';
import { TopUpRecord, userService } from '@/services';
import { router, useFocusEffect, useNavigation } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, SectionList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Button, Dialog, Divider, Icon, Portal, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

// 充值选项数据
// const topUpOptions = [
//   { id: 1, amount: 500, bonus: 50 },
//   { id: 2, amount: 1000, bonus: 100 },
//   { id: 3, amount: 2000, bonus: 300 },
//   { id: 4, amount: 3000, bonus: 400 },
// ];

// 定义tabs配置
const topUpTabs = [
  { key: 'topup' as const, label: '充值' },
  { key: 'history' as const, label: '充值记录' },
];

function TopUpContent() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<'topup' | 'history'>('topup');//充值tab or 记录tab
  const [selectedAmount, setSelectedAmount] = useState<string | null>(null);//选择的金额卡片(改为string类型以匹配moneyId)
  const [customAmount, setCustomAmount] = useState<string>('');//自定义金额
  const [hasAgreed, setHasAgreed] = useState(false);//是否同意充值协议
  const [records, setRecords] = useState<TopUpRecord[]>([]);//充值记录
  const [isLoading, setIsLoading] = useState(false);//充值记录加载状态
  const [balance, setBalance] = useState<number>(0);//用户余额
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);//充值确认弹窗
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [topUpOptions, setTopUpOptions] = useState<{ moneyId: string; money: number; giveMoney: number }[]>([]);//充值选项
  const [showCustomModal, setShowCustomModal] = useState(false);//自定义金额输入模态框
  const [tempCustomAmount, setTempCustomAmount] = useState<string>('');//临时存储自定义金额输入
  // 根据 activeTab 更新路由标题
  useEffect(() => {
    navigation.setOptions({
      title: activeTab === 'topup' ? '余额' : '充值记录',
    });
  }, [activeTab, navigation]);

  // 页面加载时获取余额
  useEffect(() => {
    loadBalance();
    loadTopUpOptions();
  }, []);

  // 页面获得焦点时重新加载余额（从成功页返回时触发）
  useFocusEffect(
    useCallback(() => {
      loadBalance();
    }, [])
  );
  //获取金额卡片
  const loadTopUpOptions = async () => {
    try {
      const [error, result] = await userService.getTopUpOptions();
      if (error) {
        console.error('Failed to load top-up options:', error);
        return;
      }

      // 拦截器已解包，result 直接就是选项数组
      if (Array.isArray(result)) {
        setTopUpOptions(result);
        // 默认选中第一个选项
        if (result.length > 0) {
          setSelectedAmount(result[0].moneyId);
        }
      }
    } catch (error) {
      console.error('Failed to load top-up options:', error);
    }
  };
  // 加载用户余额
  const loadBalance = async () => {
    try {
      const [error, result] = await userService.getProfile();
      if (error) {
        console.error('Failed to load user info:', error);
        return;
      }

      // axios 拦截器已解包，result 直接就是用户数据
      if (result && result.balance !== undefined) {
        setBalance(result.balance);
      }
    } catch (error) {
      console.error('Failed to load balance:', error);
    }
  };
  // 加载充值记录
  const loadRecords = async () => {
    setIsLoading(true);
    const [error, response] = await userService.getTopUpRecords();

    if (!error && response) {
      setRecords(response);
    } else {
      console.error('获取充值记录失败:', error);
      setRecords([]);
    }

    setIsLoading(false);
  };

  // 处理tab切换
  const handleTabChange = (tab: 'topup' | 'history') => {
    setActiveTab(tab);

    // 切换到对应tab时加载数据
    if (tab === 'topup') {
      loadBalance();
    } else if (tab === 'history') {
      loadRecords();
    }
  };

  // 按月份分组充值记录
  const groupedRecords = useMemo(() => {
    if (records.length === 0) return [];

    // 按月份分组
    const groups: { [key: string]: TopUpRecord[] } = {};
    
    records.forEach((record) => {
      const date = new Date(record.createdAt);
      const monthKey = `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月`;
      
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(record);
    });

    // 转换为 SectionList 数据格式
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a)) // 按时间倒序
      .map((monthKey) => ({
        title: monthKey,
        data: groups[monthKey],
      }));
  }, [records]);

  // 处理充值按钮点击 - 显示确认对话框
  const handleTopUpClick = () => {
    if (!hasAgreed) return;

    // 验证是否选择了金额
    if (selectedAmount === null) return;

    // 如果选择了自定义金额，验证输入
    if (selectedAmount === 'custom') {
      const amount = parseFloat(customAmount);
      if (isNaN(amount) || amount <= 0) {
        return;
      }
    } else {
      // 如果选择了预设金额，验证选项存在
      const selectedOption = topUpOptions.find(opt => opt.moneyId === selectedAmount);
      if (!selectedOption) return;
    }

    setShowConfirmDialog(true);
  };

  // 确认充值
  const handleConfirmTopUp = async () => {
    if (!selectedAmount) return;
    const selectedOption = getSelectedOption();
    if (!selectedOption) return;

    setConfirmLoading(true);

    const [error, response] = await userService.rechargeBalance(
      selectedOption.money,
      selectedOption.giveMoney,
      true
    );

    setConfirmLoading(false);
    setShowConfirmDialog(false);

    if (error || !response) {
      console.error('充值失败:', error);
      return;
    }

    // 重新获取最新的用户余额
    await loadBalance();

    // 跳转到成功页面
    router.push({
      pathname: '/(member)/topUpSuccess',
      params: { amount: selectedOption.money.toString() },
    });
  };

  // 取消充值
  const handleCancelTopUp = () => {
    setShowConfirmDialog(false);
  };

  // 获取选中的充值选项
  const getSelectedOption = () => {
    if (selectedAmount === 'custom') {
      // 自定义金额
      const amount = parseFloat(customAmount);
      if (isNaN(amount) || amount <= 0) return null;
      return { moneyId: 'custom', money: amount, giveMoney: 0 };
    }
    return topUpOptions.find(opt => opt.moneyId === selectedAmount);
  };

  // 处理自定义金额选择
  const handleCustomAmountSelect = () => {
    setTempCustomAmount('');
    setShowCustomModal(true);
  };



  // 数字键盘按钮点击
  const handleNumberPress = (num: string) => {
    setTempCustomAmount(prev => prev + num);
  };

  // 删除按钮点击
  const handleDelete = () => {
    setTempCustomAmount(prev => prev.slice(0, -1));
  };

  // 确认自定义金额
  const handleConfirmCustomAmount = async () => {
    const amount = parseFloat(tempCustomAmount);
    if (isNaN(amount) || amount < 1) {
      // 可以在这里显示提示
      return;
    }

    // 直接进行充值,不弹出确认对话框
    setConfirmLoading(true);
    setShowCustomModal(false);

    const [error, response] = await userService.rechargeBalance(
      amount,
      0, // 自定义金额不赠送
      true
    );

    setConfirmLoading(false);

    if (error || !response) {
      console.error('充值失败:', error);
      setTempCustomAmount('');
      return;
    }

    // 重新获取最新的用户余额
    await loadBalance();

    // 清空临时金额
    setTempCustomAmount('');
    setCustomAmount(amount.toString());
    setSelectedAmount('custom');

    // 跳转到成功页面
    router.push({
      pathname: '/(member)/topUpSuccess',
      params: { amount: amount.toString() },
    });
  };

  // 取消自定义金额输入
  const handleCancelCustomAmount = () => {
    setShowCustomModal(false);
    setTempCustomAmount('');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* 顶部切换组件 */}
      <TabSwitch
        tabs={topUpTabs}
        activeTab={activeTab}
        onChange={handleTabChange}
      />

      <Divider />

      {/* 内容区域 */}
      <View style={styles.content}>
        {activeTab === 'topup' ? (
          <>
            {/* 可滚动内容区域 */}
            <ScrollView
              style={styles.scrollContent}
              contentContainerStyle={styles.scrollContentContainer}
              showsVerticalScrollIndicator={false}
            >
              {/* 账户余额卡片 */}
              <View style={styles.balanceCard}>
                <Text style={styles.balanceAmount}>¥{balance.toFixed(1)}</Text>
                <Text style={styles.balanceLabel}>账户余额</Text>
              </View>

              {/* 充值金额标题 */}
              <View style={styles.amountSectionHeader}>
                <Text style={styles.sectionTitle}>请选择充值金额</Text>
              </View>

              {/* 充值选项网格 */}
              <View style={styles.optionsGrid}>
                {topUpOptions.map((option) => (
                  <TouchableOpacity
                    key={option.moneyId}
                    style={[
                      styles.optionCard,
                      selectedAmount === option.moneyId && styles.optionCardSelected,
                    ]}
                    onPress={() => setSelectedAmount(option.moneyId)}
                  >
                    <View style={styles.optionContent}>
                      <View>
                        <Text style={[
                          styles.optionAmount,
                          selectedAmount === option.moneyId && styles.optionAmountSelected,
                        ]}>
                          充值{option.money}元
                        </Text>
                        <Text style={styles.optionBonus}>送{option.giveMoney}元</Text>
                      </View>
                      <View style={[
                        styles.radioCircle,
                        selectedAmount === option.moneyId && styles.radioCircleSelected,
                      ]}>
                        {selectedAmount === option.moneyId && (
                          <View style={styles.radioDot} />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}

                {/* 自定义金额卡片 */}
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    selectedAmount === 'custom' && styles.optionCardSelected,
                  ]}
                  onPress={handleCustomAmountSelect}
                  activeOpacity={0.8}
                >
                  <View style={styles.optionContent}>
                    <View style={{ flex: 1 }}>
                      <Text style={[
                        styles.optionAmount,
                        selectedAmount === 'custom' && styles.optionAmountSelected,
                      ]}>
                        {'输入金额'}
                      </Text>
                      <Text style={styles.optionBonus}>
                        {'最低可充1元'}
                      </Text>
                    </View>
                    <View style={[
                      styles.radioCircle,
                      selectedAmount === 'custom' && styles.radioCircleSelected,
                    ]}>
                      {selectedAmount === 'custom' && (
                        <View style={styles.radioDot} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </View>

              {/* 自定义金额提示 */}
              {selectedAmount === 'custom' && (
                <View style={styles.customAmountNotice}>
                  <Icon source="information-outline" size={16} color="#FF7214" />
                  <Text style={styles.customAmountNoticeText}>
                    自定义金额充值不赠送额外金额
                  </Text>
                </View>
              )}

              {/* 充值须知 */}
              <View style={styles.noticeCard}>
                <View style={styles.noticeHeader}>
                  <Icon source="alert-circle-outline" size={18} color="#FF7214" />
                  <Text style={styles.noticeTitle}>充值须知</Text>
                </View>
                <View style={styles.noticeContent}>
                  <Text style={styles.noticeItem}>1. 您本次充值的预付卡余额有效期为3年，请在有效期内消费。</Text>
                  <Text style={styles.noticeItem}>2. 自定义金额充值不赠送额外金额。</Text>
                  <Text style={styles.noticeItem}>3. 本卡不记名、不挂失、不兑换，仅限本人使用。</Text>
                  <Text style={styles.noticeItem}>4. 充值后概不退款，如有疑问，可联系商家。</Text>

                </View>
              </View>
            </ScrollView>

            {/* 底部固定区域 */}
            <View style={styles.bottomSection}>
              <TouchableOpacity
                style={styles.agreementRow}
                onPress={() => setHasAgreed((prev) => !prev)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.agreementIndicator,
                    hasAgreed && styles.agreementIndicatorActive,
                  ]}
                >
                  {hasAgreed && <View style={styles.agreementIndicatorDot} />}
                </View>
                <Text style={styles.agreementText}>
                  我已阅读并同意
                  <Text style={styles.agreementLink}>充值协议</Text>
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !hasAgreed && styles.confirmButtonDisabled,
                ]}
                activeOpacity={0.8}
                disabled={!hasAgreed}
                onPress={handleTopUpClick}
              >
                <Text style={styles.confirmButtonText}>确认充值</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.historyContainer}>
            {isLoading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>加载中...</Text>
              </View>
            ) : records.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Icon source="receipt-text-outline" size={64} color="#CCCCCC" />
                <Text style={styles.emptyText}>暂无充值记录</Text>
              </View>
            ) : (
              <SectionList
                sections={groupedRecords}
                keyExtractor={(item, index) => `${item.createdAt}-${index}`}
                renderItem={({ item }) => (
                  <View style={styles.recordItem}>
                    <View style={styles.recordLeft}>
                      <Text style={styles.recordTitle}>
                        {item.giveBalance > 0
                          ? `充值${item.balance}元 赠送${item.giveBalance}元`
                          : `充值${item.balance}元`}
                      </Text>
                      <Text style={styles.recordSubtitle}>
                        充值后余额 ¥{item.totalBalance}
                      </Text>
                    </View>
                    <View style={styles.recordRight}>
                      <Text style={styles.recordAmount}>
                        +¥{(item.balance + item.giveBalance).toFixed(2)}
                      </Text>
                      <Text style={styles.recordTime}>
                        {new Date(item.createdAt).toLocaleString('zh-CN', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                )}
                renderSectionHeader={({ section: { title } }) => (
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionHeaderText}>{title}</Text>
                  </View>
                )}
                ItemSeparatorComponent={() => <Divider />}
                stickySectionHeadersEnabled={true}
                contentContainerStyle={styles.listContent}
              />
            )}
          </View>
        )}
      </View>

      {/* 充值确认对话框 */}
      <Portal>
        <Dialog visible={showConfirmDialog} onDismiss={handleCancelTopUp}>
          <Dialog.Title>确认充值</Dialog.Title>
          <Dialog.Content>
            {getSelectedOption() && (
              <View>
                <Text style={styles.dialogText}>
                  充值金额：¥{getSelectedOption()?.money}
                </Text>
                <Text style={styles.dialogText}>
                  赠送金额：¥{getSelectedOption()?.giveMoney}
                </Text>
                {selectedAmount === 'custom' && (
                  <Text style={[styles.dialogText, { color: '#FF7214', fontSize: 13 }]}>
                    * 自定义金额不赠送
                  </Text>
                )}
                <Text style={styles.dialogTotal}>
                  实际到账：¥{(getSelectedOption()?.money || 0) + (getSelectedOption()?.giveMoney || 0)}
                </Text>
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleCancelTopUp} disabled={confirmLoading}>
              取消
            </Button>
            <Button
              onPress={handleConfirmTopUp}
              loading={confirmLoading}
              disabled={confirmLoading}
              mode="contained"
              buttonColor="#FF7214"
            >
              确认
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* 自定义金额输入模态框 */}
      <Modal
        visible={showCustomModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancelCustomAmount}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={handleCancelCustomAmount}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {/* 金额输入显示区 */}
            <View style={styles.amountDisplay}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputPrefix}>充值金额</Text>
                <View style={styles.inputContentWrapper}>
                  <Text style={styles.inputText}>
                    {tempCustomAmount || ''}
                  </Text>
                  {!tempCustomAmount && (
                    <Text style={styles.inputPlaceholder}>最低可充1</Text>
                  )}
                  <Text style={styles.inputSuffix}>元</Text>
                </View>
              </View>
            </View>

            {/* 快捷金额选项 */}
            <View style={styles.quickAmountContainer}>
              {[
                { value: 50, label: '50元' },
                { value: 200, label: '200元' },
                { value: 1000, label: '1000元' },
                { value: 10000, label: '1万元' }
              ].map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={styles.quickAmountBtn}
                  onPress={() => setTempCustomAmount(item.value.toString())}
                >
                  <Text style={styles.quickAmountText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 分割线 */}
            {/* <Divider style={styles.divider} /> */}

            {/* 数字键盘 */}
            <View style={styles.keyboardContainer}>
              {/* 第一行: 1 2 3 删除 */}
              <View style={styles.keyboardRow}>
                {['1', '2', '3'].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={styles.keyboardBtn}
                    onPress={() => handleNumberPress(num)}
                  >
                    <Text style={styles.keyboardBtnText}>{num}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.keyboardBtn, styles.deleteBtn]}
                  onPress={handleDelete}
                >
                  <Icon source="close-circle-outline" size={20} color="#999" />
                </TouchableOpacity>
              </View>

              {/* 第二行到第四行的容器 */}
              <View style={styles.keyboardMainRow}>
                {/* 左侧数字键盘 */}
                <View style={styles.keyboardLeft}>
                  {/* 第二行: 4 5 6 */}
                  <View style={styles.keyboardRow}>
                    {['4', '5', '6'].map((num) => (
                      <TouchableOpacity
                        key={num}
                        style={styles.keyboardBtn}
                        onPress={() => handleNumberPress(num)}
                      >
                        <Text style={styles.keyboardBtnText}>{num}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {/* 第三行: 7 8 9 */}
                  <View style={styles.keyboardRow}>
                    {['7', '8', '9'].map((num) => (
                      <TouchableOpacity
                        key={num}
                        style={styles.keyboardBtn}
                        onPress={() => handleNumberPress(num)}
                      >
                        <Text style={styles.keyboardBtnText}>{num}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {/* 第四行: 0 (占3个按钮宽度) */}
                  <View style={styles.keyboardRow}>
                    <TouchableOpacity
                      style={styles.keyboardBtnWide}
                      onPress={() => handleNumberPress('0')}
                    >
                      <Text style={styles.keyboardBtnText}>0</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* 右侧充值按钮 */}
                <TouchableOpacity
                  style={[
                    styles.keyboardConfirmBtn,
                    ((!tempCustomAmount || parseFloat(tempCustomAmount) < 1) || confirmLoading) && styles.keyboardConfirmBtnDisabled
                  ]}
                  onPress={handleConfirmCustomAmount}
                  disabled={(!tempCustomAmount || parseFloat(tempCustomAmount) < 1) || confirmLoading}
                >
                  <Text style={styles.keyboardConfirmBtnText}>
                    {confirmLoading ? '充值中' : '充值'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 底部协议文本 */}
            <View style={styles.modalFooter}>
              <Text style={styles.agreementTextSmall}>
                已阅读并同意<Text style={styles.agreementLink}>充值协议</Text>和
                <Text style={styles.agreementLink}>充值安全提示</Text>
              </Text>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

export default function TopUpScreen() {
  return (
    <RequireLogin title="登录后充值" description="登录即可为账户充值">
      <TopUpContent />
    </RequireLogin>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    backgroundColor: '#F5F7F7',
  },
  scrollContentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F7F7',
  },
  topContent: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 4,
  },
  contentText: {
    fontSize: 16,
    color: '#999',
  },
  balanceCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 18,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginTop: 16,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '300',
    color: '#333',
    letterSpacing: 1,
    marginBottom: 10,
  },
  balanceLabel: {
    fontSize: 14,
    marginTop: 12,
    marginBottom: 10,
  },
  sectionHeader: {
    backgroundColor: '#F5F7F7',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionHeaderText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  amountSectionHeader: {
    width: '100%',
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  optionsGrid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  optionCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    padding: 10,
    minHeight: 64,
  },
  optionCardSelected: {
    borderColor: '#FF7214',
    backgroundColor: '#FFF8F5',
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF7214',
    marginBottom: 4,
  },
  optionAmountSelected: {
    color: '#FF7214',
  },
  optionBonus: {
    fontSize: 13,
    color: '#999',
  },
  customInput: {
    fontSize: 13,
    color: '#666',
    padding: 0,
    marginTop: 4,
  },
  customAmountNotice: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8F1',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    gap: 6,
  },
  customAmountNoticeText: {
    fontSize: 13,
    color: '#FF7214',
    flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: '#FF7214',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF7214',
  },
  noticeCard: {
    width: '100%',
    backgroundColor: '#FFF8F1',
    borderColor: '#FFD7BD',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    marginBottom: 20,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  noticeTitle: {
    marginLeft: 6,
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  noticeContent: {},
  noticeItem: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 4,
  },
  bottomSection: {
    width: '100%',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  agreementIndicator: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#FDBF94',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  agreementIndicatorActive: {
    borderColor: '#FF7214',
  },
  agreementIndicatorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF7214',
  },
  agreementText: {
    fontSize: 13,
    color: '#666',
  },
  agreementLink: {
    color: '#FF7214',
  },
  confirmButton: {
    backgroundColor: '#FF7214',
    borderRadius: 22,
    paddingVertical: 10,
    alignItems: 'center',
    width: '100%',
  },
  confirmButtonDisabled: {
    backgroundColor: '#FFCDA6',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  historyContainer: {
    flex: 1,
    backgroundColor: '#F5F7F7',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  listContent: {
    paddingVertical: 8,
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  recordLeft: {
    flex: 1,
  },
  recordTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
    marginBottom: 6,
  },
  recordSubtitle: {
    fontSize: 13,
    color: '#FF7214',
  },
  recordRight: {
    alignItems: 'flex-end',
    marginLeft: 16,
  },
  recordAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4ECDC4',
    marginBottom: 6,
  },
  recordTime: {
    fontSize: 12,
    color: '#999',
  },
  dialogText: {
    fontSize: 15,
    color: '#666',
    marginBottom: 8,
  },
  dialogTotal: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF7214',
    marginTop: 8,
  },
  // 自定义金额模态框样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '50%', // 限制最大高度为屏幕的50%
  },
  amountDisplay: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  // 金额输入框样式
  inputContainer: {
    backgroundColor: '#F5F7F7',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputPrefix: {
    fontSize: 14,
    color: '#333',
    marginRight: 8,
  },
  inputContentWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  inputText: {
    fontSize: 24,
    fontWeight: '500',
    color: '#333',
  },
  inputPlaceholder: {
    color: '#999',
    fontSize: 14,
  },
  inputSuffix: {
    fontSize: 14,
    color: '#333',
    marginLeft: 4,
  },
  diamondHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  quickAmountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 6,
  },
  quickAmountBtn: {
    flex: 1,
    backgroundColor: '#F5F7F7',
    borderRadius: 6,
    paddingVertical: 5,
    alignItems: 'center',
  },
  quickAmountText: {
    fontSize: 11,
    color: '#333',
    fontWeight: '500',
  },
  divider: {
    marginHorizontal: 20,
    marginVertical: 8,
  },
  keyboardContainer: {
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  keyboardMainRow: {
    flexDirection: 'row',
    gap: 6,
  },
  keyboardLeft: {
    flex: 3,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 6,
  },
  keyboardBtn: {
    flex: 1,
    backgroundColor: '#F5F7F7',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardBtnWide: {
    flex: 3,
    backgroundColor: '#F5F7F7',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardBtnText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  deleteBtn: {
    backgroundColor: '#F5F7F7',
  },
  clearBtn: {
    backgroundColor: '#FFF8F5',
  },
  keyboardConfirmBtn: {
    flex: 1,
    backgroundColor: '#FF7214',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  keyboardConfirmBtnDisabled: {
    backgroundColor: '#FFCDA6',
  },
  keyboardConfirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 6,
  },
  agreementTextSmall: {
    fontSize: 9,
    color: '#666',
    textAlign: 'center',
  },
  modalConfirmBtn: {
    backgroundColor: '#FF7214',
    borderRadius: 22,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalConfirmBtnDisabled: {
    backgroundColor: '#FFCDA6',
  },
  modalConfirmBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
