import { TextInput } from '@/components/ui/PaperTextInput';
import type { RequestError } from '@/request';
import { authService } from '@/services';
import { useAuthStore } from '@/stores/auth-store';
import type { LoginResponse } from '@orderfood/common';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Icon, Modal, Portal, Text } from 'react-native-paper';

const PHONE_REGEX = /^1[3-9]\d{9}$/;

type Props = {
  visible: boolean;
  reason?: string;
  onClose: () => void;
  onSuccess: () => void;
};

export function LoginSheet({ visible, reason, onClose, onSuccess }: Props) {
  const setSession = useAuthStore((state) => state.setSession);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) {
      setPassword('');
      setPasswordVisible(false);
      setPhoneError('');
      setPasswordError('');
      setLoading(false);
    }
  }, [visible]);

  const validateForm = (): boolean => {
    let isValid = true;
    if (!phone) {
      setPhoneError('请输入手机号');
      isValid = false;
    } else if (!PHONE_REGEX.test(phone)) {
      setPhoneError('请输入正确的手机号');
      isValid = false;
    } else {
      setPhoneError('');
    }
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

  const handleLogin = async () => {
    if (!validateForm() || loading) return;
    setLoading(true);
    const [error, data] = await authService.login({ phone, password });
    setLoading(false);
    if (error || !data) {
      const message = (data as RequestError | undefined)?.message;
      Alert.alert('登录失败', message || '请检查您的手机号和密码');
      return;
    }
    await setSession(data as LoginResponse);
    onSuccess();
  };

  const goRegister = () => {
    onClose();
    router.push('/auth/register' as any);
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={styles.modalContainer}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.sheet}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Icon source="close" size={22} color="#999" />
            </TouchableOpacity>

            <Image
              source={require('../../assets/images/cooker.png')}
              style={styles.illustration}
              resizeMode="cover"
            />

            <Text style={styles.title}>
              {reason === 'expired' ? '登录已过期' : '登录后继续'}
            </Text>
            <Text style={styles.subtitle}>
              {reason === 'expired'
                ? '请重新登录以继续使用'
                : '登录后即可继续当前操作'}
            </Text>

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
            {phoneError ? <Text style={styles.errorText}>{phoneError}</Text> : null}

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

            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>还没有账号？</Text>
              <TouchableOpacity onPress={goRegister}>
                <Text style={styles.registerLink}>立即注册</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    margin: 0,
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  illustration: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginTop: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  input: {
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 12,
    marginBottom: 8,
    marginLeft: 4,
  },
  loginButton: {
    borderRadius: 8,
    marginTop: 8,
  },
  loginButtonContent: {
    height: 48,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
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
});
