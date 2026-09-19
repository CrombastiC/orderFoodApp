/**
 * 登录页面
 */

import { API_CONFIG, CURRENT_ENV } from '@/config/api.config';
import { TextInput } from '@/components/ui/PaperTextInput';
import { useRequest } from '@/hooks/use-request';
import { authService } from '@/services';
import { useAuthStore } from '@/stores/auth-store';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Icon, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  // 获取路由参数
  const params = useLocalSearchParams<{ phone?: string; password?: string }>();
  
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const setSession = useAuthStore((state) => state.setSession);

  // 当从注册页跳转过来时,自动填充用户名和密码
  useEffect(() => {
    if (params.phone) {
      setPhone(params.phone);
    }
    if (params.password) {
      setPassword(params.password);
    }
  }, [params.phone, params.password]);

  // 使用 useRequest hook
  const { loading, runAsync } = useRequest(authService.login, {
    manual: true,
  });

  // 表单验证
  const validateForm = (): boolean => {
    let isValid = true;

    // 验证手机号
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phone) {
      setPhoneError('请输入手机号');
      isValid = false;
    } else if (!phoneRegex.test(phone)) {
      setPhoneError('请输入正确的手机号');
      isValid = false;
    } else {
      setPhoneError('');
    }

    // 验证密码
    if (!password) {
      setPasswordError('请输入密码');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('密码至少6位');
      isValid = false;
    } else {
      setPasswordError('');
    }

    return isValid;
  };

  // 处理登录
  const handleLogin = async () => {
    if (validateForm()) {
      const [error, data] = await runAsync({ phone, password });
      if (error) {
        Alert.alert(
          '登录失败', 
          `${data?.message || '请检查您的手机号和密码'}\n\n当前API: ${API_CONFIG.baseURL}\nAPP_ENV: ${CURRENT_ENV}`
        );
      } else if (data) {
        await setSession(data);
        Alert.alert('登录成功', '欢迎回来！', [
          {
            text: '确定',
            onPress: () => router.replace('/(tabs)'),
          },
        ]);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ImageBackground
        source={require('../../assets/images/cooker.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* 顶部logo区域 */}
            <View style={styles.headerContainer}>
              <View style={styles.logoContainer}>
                <Icon source="silverware-fork-knife" size={64} color="#FF7214" />
              </View>
              <Text style={styles.title}>用户登录</Text>
              <Text style={styles.subtitle}>欢迎使用餐厅服务系统</Text>
            </View>

            {/* 表单区域 */}
            <View style={styles.formContainer}>
              <TextInput
                label="手机号"
                value={phone}
                onChangeText={(text) => {
                  setPhone(text);
                  setPhoneError('');
                }}
                keyboardType="phone-pad"
                maxLength={11}
                error={!!phoneError}
                mode="outlined"
                style={styles.input}
                outlineColor="#E0E0E0"
                activeOutlineColor="#FF7214"
                left={<TextInput.Icon icon="phone" color="#FF7214" />}
              />
              {phoneError ? (
                <Text style={styles.errorText}>{phoneError}</Text>
              ) : null}

              <TextInput
                label="密码"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setPasswordError('');
                }}
                secureTextEntry={!passwordVisible}
                error={!!passwordError}
                mode="outlined"
                style={styles.input}
                outlineColor="#E0E0E0"
                activeOutlineColor="#FF7214"
                left={<TextInput.Icon icon="lock" color="#FF7214" />}
                right={
                  <TextInput.Icon
                    icon={passwordVisible ? 'eye-off' : 'eye'}
                    onPress={() => setPasswordVisible(!passwordVisible)}
                  />
                }
              />
              {passwordError ? (
                <Text style={styles.errorText}>{passwordError}</Text>
              ) : null}

              <Button
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                style={styles.loginButton}
                contentStyle={styles.loginButtonContent}
                buttonColor="#FF7214"
              >
                登录
              </Button>

              {/* 注册链接 */}
              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>还没有账号？</Text>
                <TouchableOpacity onPress={() => router.push('/auth/register' as any)}>
                  <Text style={styles.registerLink}>立即注册</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 其他登录方式 */}
            <View style={styles.otherLoginContainer}>
              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>其他登录方式</Text>
                <View style={styles.divider} />
              </View>

              <View style={styles.socialLoginContainer}>
                <TouchableOpacity style={styles.socialButton}>
                  <Icon source="wechat" size={32} color="#07C160" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialButton}>
                  <Icon source="qqchat" size={32} color="#12B7F5" />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6EAE3',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 12,
    marginBottom: 12,
    marginLeft: 4,
  },
  loginButton: {
    borderRadius: 8,
    marginBottom: 16,
  },
  loginButtonContent: {
    height: 48,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: '#666',
    fontSize: 14,
  },
  registerLink: {
    color: '#FF7214',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  otherLoginContainer: {
    marginTop: 40,
    marginBottom: 20,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 12,
  },
  socialLoginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});
