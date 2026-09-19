import ToastManager from '@/utils/toast';
import { Address, addressService, SaveAddressParams } from '@/services/address.service';
import { Stack } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Divider, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

/** 表单初始值 */
const EMPTY_FORM = { receiverName: '', phone: '', region: '', detail: '' };

export default function AddressScreen() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchAddresses = useCallback(async () => {
    setIsLoading(true);
    const [error, result] = await addressService.getAddressList();
    if (!error) {
      setAddresses(result || []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  /** 打开新增弹窗 */
  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  /** 打开编辑弹窗 */
  const openEdit = (item: Address) => {
    setEditingId(item.id);
    setForm({
      receiverName: item.receiverName,
      phone: item.phone,
      region: item.region,
      detail: item.detail,
    });
    setModalVisible(true);
  };

  /** 保存地址 */
  const handleSave = async () => {
    if (!form.receiverName.trim() || !form.region.trim() || !form.detail.trim()) {
      ToastManager.show('请完整填写收件人、省市区和详细地址', { position: 'top' });
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(form.phone)) {
      ToastManager.show('手机号格式不正确', { position: 'top' });
      return;
    }

    const data: SaveAddressParams = {
      receiverName: form.receiverName.trim(),
      phone: form.phone.trim(),
      region: form.region.trim(),
      detail: form.detail.trim(),
      isDefault: false,
    };
    const [error] = editingId
      ? await addressService.updateAddress(editingId, data)
      : await addressService.createAddress(data);

    if (error) {
      ToastManager.show('保存失败，请重试', { position: 'top' });
      return;
    }
    setModalVisible(false);
    ToastManager.show(editingId ? '地址已更新' : '地址已添加', {
      position: 'top',
      containerStyle: { backgroundColor: '#4CAF50' },
    });
    fetchAddresses();
  };

  /** 删除地址 */
  const handleDelete = (item: Address) => {
    Alert.alert('删除地址', `确定删除「${item.receiverName}」的地址吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          const [error] = await addressService.deleteAddress(item.id);
          if (error) {
            ToastManager.show('删除失败，请重试', { position: 'top' });
            return;
          }
          ToastManager.show('地址已删除', {
            position: 'top',
            containerStyle: { backgroundColor: '#4CAF50' },
          });
          fetchAddresses();
        },
      },
    ]);
  };

  /** 设为默认地址 */
  const handleSetDefault = async (item: Address) => {
    if (item.isDefault) return;
    const [error] = await addressService.setDefaultAddress(item.id);
    if (error) {
      ToastManager.show('设置失败，请重试', { position: 'top' });
      return;
    }
    fetchAddresses();
  };

  const renderAddress = ({ item }: { item: Address }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() => openEdit(item)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.receiver}>{item.receiverName}</Text>
        <Text style={styles.phone}>{item.phone}</Text>
        {item.isDefault && <View style={styles.defaultTag}><Text style={styles.defaultTagText}>默认</Text></View>}
      </View>
      <Text style={styles.addressText} numberOfLines={2}>
        {item.region}
        {item.detail}
      </Text>
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.actionButton, item.isDefault && styles.actionButtonDisabled]}
          disabled={item.isDefault}
          onPress={() => handleSetDefault(item)}
        >
          <Text style={[styles.actionText, item.isDefault && styles.actionTextDisabled]}>设为默认</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => openEdit(item)}>
          <Text style={styles.actionText}>编辑</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item)}
        >
          <Text style={[styles.actionText, styles.deleteText]}>删除</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen options={{ title: '地址管理' }} />

      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        renderItem={renderAddress}
        refreshing={isLoading}
        onRefresh={fetchAddresses}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>还没有收货地址，点击下方按钮添加</Text>
            </View>
          ) : null
        }
        contentContainerStyle={addresses.length === 0 ? styles.emptyContainer : styles.listContainer}
      />

      {/* 新增地址按钮 */}
      <TouchableOpacity style={styles.addButton} activeOpacity={0.8} onPress={openCreate}>
        <IconButton icon="plus" size={22} iconColor="#fff" />
        <Text style={styles.addButtonText}>新增地址</Text>
      </TouchableOpacity>

      {/* 新增/编辑弹窗 */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalMask}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editingId ? '编辑地址' : '新增地址'}</Text>

            <Text style={styles.fieldLabel}>收件人</Text>
            <TextInput
              style={styles.input}
              value={form.receiverName}
              onChangeText={(text) => setForm({ ...form, receiverName: text })}
              placeholder="请输入收件人姓名"
              maxLength={20}
            />

            <Text style={styles.fieldLabel}>手机号</Text>
            <TextInput
              style={styles.input}
              value={form.phone}
              onChangeText={(text) => setForm({ ...form, phone: text })}
              placeholder="请输入联系电话"
              keyboardType="phone-pad"
              maxLength={11}
            />

            <Text style={styles.fieldLabel}>省市区</Text>
            <TextInput
              style={styles.input}
              value={form.region}
              onChangeText={(text) => setForm({ ...form, region: text })}
              placeholder="如：广东省深圳市南山区"
              maxLength={100}
            />

            <Text style={styles.fieldLabel}>详细地址</Text>
            <TextInput
              style={[styles.input, styles.detailInput]}
              value={form.detail}
              onChangeText={(text) => setForm({ ...form, detail: text })}
              placeholder="街道、门牌号、楼栋等"
              multiline
              maxLength={200}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.saveButton]} onPress={handleSave}>
                <Text style={styles.saveText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    padding: 12,
    paddingBottom: 100,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  receiver: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  phone: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  defaultTag: {
    marginLeft: 'auto',
    backgroundColor: '#FFF3E0',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  defaultTagText: {
    color: '#FF8C00',
    fontSize: 12,
  },
  addressText: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f5f5f5',
    marginLeft: 8,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionText: {
    fontSize: 13,
    color: '#333',
  },
  actionTextDisabled: {
    color: '#999',
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
  },
  deleteText: {
    color: '#E53935',
  },
  addButton: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 16,
    backgroundColor: 'rgb(255, 140, 50)',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: -6,
  },
  modalMask: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    paddingBottom: 34,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
    marginBottom: 14,
    backgroundColor: '#fafafa',
  },
  detailInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 4,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    marginRight: 10,
  },
  saveButton: {
    backgroundColor: 'rgb(255, 140, 50)',
  },
  cancelText: {
    color: '#666',
    fontSize: 16,
  },
  saveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
