import { RequireLogin } from '@/components/auth/RequireLogin';
import MenuList, { MenuListItem } from '@/components/ui/MenuList';
import { userService, type UserProfile } from "@/services";
import { uploadImage } from "@/services/order.service";
import { useAuthStore } from '@/stores/auth-store';
import { formatDateChinese } from "@/utils/dateUtils";
import { StorageUtils } from "@/utils/storage";
import ToastManager from "@/utils/toast";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { SafeAreaView } from "react-native-safe-area-context";

function AccountContent() {
  const [date, setDate] = useState<Date | null>(null);
  const [show, setShow] = useState(false);
  const [userInfo, setUserInfo] = useState<UserProfile | null>(null);
  const [genderVisible, setGenderVisible] = useState(false);
  const [nicknameVisible, setNicknameVisible] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');

  useEffect(() => {
    loadUserInfo();
  }, []);

  // 页面获得焦点时重新加载用户信息
  useFocusEffect(
    useCallback(() => {
      loadUserInfo();
    }, [])
  );

  const loadUserInfo = async () => {
    try {
      // 从API获取用户信息
      const [error, result] = await userService.getProfile();
      if (error) {
        console.error('Failed to load user info:', error);
        return;
      }
      console.log('User data:', result);

      // axios 拦截器已解包，result 直接就是用户数据
      if (result) {
        setUserInfo(result);

        // 如果有生日数据，设置日期
        if (result.birthday) {
          setDate(new Date(result.birthday));
        } else {
          setDate(null);
        }
      }
    } catch (error) {
      console.error('Failed to load user info:', error);
    }
  };

  const getGenderText = (gender?: number) => {
    switch (gender) {
      case 0:
        return '男';
      case 1:
        return '女';
      case 2:
        return '保密';
      default:
        return '未设置';
    }
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return '未设置';
    // 格式化手机号，隐藏中间4位
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  };

  const handleConfirm = async (selectedDate: Date) => {
    //调用更新用户信息的接口
    console.log(selectedDate);
    setShow(false); // 先关闭日期选择器
    const [error] = await userService.updateProfile({ birthday: selectedDate.toISOString() });
    if (error) {
      Alert.alert('提示', '生日更新失败，请重试');
      return;
    }
    await loadUserInfo(); // 从服务器获取最新数据，包括更新后的生日
    ToastManager.show('修改成功');
  };

  const handleCancel = () => {
    setShow(false);
  };

  const handleGenderSelect = async (gender: number) => {
    // 更新用户信息中的性别
    const [error] = await userService.updateProfile({ gender: gender });
    if (!error) {
      //重新调用获取用户信息接口
      loadUserInfo();
      setGenderVisible(false);
      // 显示Toast提示
      ToastManager.show('修改成功');
    }
  };

  const handleNicknamePress = () => {
    setNicknameInput(userInfo?.username || '');
    setNicknameVisible(true);
  };

  const handleNicknameSubmit = async () => {
    if (!nicknameInput.trim()) {
      Alert.alert('提示', '昵称不能为空');
      return;
    }

    if (nicknameInput.trim() === userInfo?.username) {
      setNicknameVisible(false);
      return;
    }

    // 调用更新接口
    const [error] = await userService.updateProfile({ username: nicknameInput.trim() });

    if (!error) {
      await loadUserInfo();
      setNicknameVisible(false);
      Keyboard.dismiss();
      ToastManager.show('修改成功');
    } else {
      Alert.alert('提示', '昵称修改失败，请重试');
    }
  };

  const handleAvatarPress = async () => {
    // 请求相册权限
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('提示', '需要访问相册权限才能更换头像');
      return;
    }

    // 打开图片选择器
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      await uploadAvatar(imageUri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    try {
      // 创建 FormData
      const formData = new FormData();

      // 从 URI 中获取文件信息
      const filename = uri.split('/').pop() || 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('file', {
        uri,
        name: filename,
        type,
      } as any);

      // 先上传图片到服务器
      const [uploadError, uploadData] = await uploadImage(formData);

      if (uploadError || !uploadData) {
        Alert.alert('提示', '图片上传失败，请重试');
        return;
      }

      const avatarUrl = uploadData.url;
      console.log('头像上传成功:', avatarUrl);

      // 调用更新接口，传入头像 URL
      const [error] = await userService.updateProfile({ avatar: avatarUrl });

      if (!error) {
        // 重新加载用户信息
        await loadUserInfo();
        ToastManager.show('修改成功');
      } else {
        Alert.alert('提示', '头像更新失败，请重试');
      }
    } catch (error) {
      console.error('Upload avatar error:', error);
      Alert.alert('提示', '头像上传失败，请重试');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      '退出登录',
      '确定要退出登录吗?',
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '确定',
          onPress: async () => {
            // 清除本地登录信息
            await useAuthStore.getState().clearSession();
            await StorageUtils.delete('userName');
            await StorageUtils.delete('userAvatar');
            // 跳转到登录页
            router.replace('/auth/login');
          },
        },
      ],
      { cancelable: true }
    );
  };

  // 使用 useMemo 创建菜单配置
  const accountMenuItems: MenuListItem[] = useMemo(() => [
    {
      key: 'avatar',
      label: '头像',
      onPress: handleAvatarPress,
      rightContent: (
        <View style={styles.avatarRight}>
          {userInfo?.avatar ? (
            <Image source={{ uri: userInfo.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialCommunityIcons name="account" size={32} color="#fff" />
            </View>
          )}
        </View>
      ),
    },
    {
      key: 'nickname',
      label: '昵称',
      value: userInfo?.username || 'Daisy',
      onPress: handleNicknamePress,
    },
    {
      key: 'phone',
      label: '手机号',
      value: formatPhone(userInfo?.phone),
      disabled: true,
      showArrow: false,
    },
    {
      key: 'gender',
      label: '性别',
      value: getGenderText(userInfo?.gender),
      onPress: () => setGenderVisible(true),
    },
    {
      key: 'birthday',
      label: '生日',
      value: date ? formatDateChinese(date) : '未设置',
      onPress: () => setShow(true),
    },
  ], [userInfo, date]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        {/* 账户信息列表 */}
        <MenuList items={accountMenuItems}/>

        {/* 日期选择器 */}
        {show && (
          <DateTimePicker
            value={date || new Date()}
            mode="date"
            display="default"
            minimumDate={new Date(1950, 0, 1)}
            maximumDate={new Date(2050, 11, 31)}
            onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
              if (event.type === 'set' && selectedDate) {
                handleConfirm(selectedDate);
              } else {
                handleCancel();
              }
            }}
          />
        )}
      </View>

      <View style={styles.logoutContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>退出登录</Text>
        </TouchableOpacity>
      </View>

      {/* 性别选择器 - 底部弹窗 */}
      <Modal
        visible={genderVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setGenderVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setGenderVisible(false)}
        >
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.genderOption}
              onPress={() => handleGenderSelect(0)}
            >
              <Text style={styles.genderText}>男</Text>
            </TouchableOpacity>

            <View style={styles.genderDivider} />

            <TouchableOpacity
              style={styles.genderOption}
              onPress={() => handleGenderSelect(1)}
            >
              <Text style={styles.genderText}>女</Text>
            </TouchableOpacity>

            <View style={styles.genderDivider} />

            <TouchableOpacity
              style={styles.genderOption}
              onPress={() => handleGenderSelect(2)}
            >
              <Text style={styles.genderText}>保密</Text>
            </TouchableOpacity>

            <View style={styles.genderDivider} />

            <TouchableOpacity
              style={styles.genderOption}
              onPress={() => setGenderVisible(false)}
            >
              <Text style={styles.genderTextCancel}>取消</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 昵称编辑弹窗 */}
      <Modal
        visible={nicknameVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setNicknameVisible(false);
          Keyboard.dismiss();
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.nicknameModalContent}>
                  <View style={styles.nicknameHeader}>
                    <TouchableOpacity onPress={() => {
                      setNicknameVisible(false);
                      Keyboard.dismiss();
                    }}>
                      <Text style={styles.cancelButton}>取消</Text>
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>修改昵称</Text>
                    <TouchableOpacity onPress={handleNicknameSubmit}>
                      <Text style={styles.confirmButton}>确定</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={nicknameInput}
                      onChangeText={setNicknameInput}
                      placeholder="请输入昵称"
                      placeholderTextColor="#999"
                      maxLength={20}
                      autoFocus={true}
                      returnKeyType="done"
                      onSubmitEditing={handleNicknameSubmit}
                    />
                    {nicknameInput.length > 0 && (
                      <TouchableOpacity onPress={() => setNicknameInput('')}>
                        <MaterialCommunityIcons name="close-circle" size={20} color="#ccc" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.inputHint}>{nicknameInput.length}/20</Text>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

export default function AccountScreen() {
  return (
    <RequireLogin title="登录后管理资料" description="登录即可编辑个人资料">
      <AccountContent />
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
    paddingTop: 0,
  },
  avatarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FF7214',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  genderOption: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderText: {
    fontSize: 16,
    color: '#333',
  },
  genderTextCancel: {
    fontSize: 16,
    color: '#999',
  },
  genderDivider: {
    height: 0.5,
    backgroundColor: '#e5e5e5',
  },
  nicknameModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    maxHeight: '50%',
  },
  nicknameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e5e5',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  cancelButton: {
    fontSize: 16,
    color: '#999',
  },
  confirmButton: {
    fontSize: 16,
    color: '#FF7214',
    fontWeight: '500',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    marginTop: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 8,
  },
  inputHint: {
    fontSize: 13,
    color: '#999',
    textAlign: 'right',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  logoutContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  logoutButton: {
    height: 50,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#FF7214',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  logoutText: {
    fontSize: 16,
    color: '#FF7214',
    fontWeight: '500',
  },
});
