import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { api } from '@/lib/request';
import type { LotteryPrize } from '@/types/admin';

interface PrizeFormValues {
  prizeName: string;
  prizeImage: string;
  prizeIntegral: number;
  prizeValue?: number;
  stock?: number;
  weight?: number;
  sortOrder?: number;
  isActive?: boolean;
}

export default function PrizesPage() {
  const [data, setData] = useState<LotteryPrize[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<LotteryPrize>();
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<PrizeFormValues>();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.get<LotteryPrize[]>('/points/prize/list'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditing(undefined);
    form.resetFields();
    form.setFieldsValue({ prizeIntegral: 0, stock: 0, weight: 1, sortOrder: 0, isActive: true });
    setOpen(true);
  };

  const openEdit = (prize: LotteryPrize) => {
    setEditing(prize);
    form.setFieldsValue({ ...prize, prizeValue: prize.prizeValue || undefined });
    setOpen(true);
  };

  const submit = async () => {
    const values = await form.validateFields();
    if (editing) {
      await api.put(`/points/prize/update/${editing.id}`, values);
      message.success('奖品已更新');
    } else {
      await api.post('/points/prize/create', values);
      message.success('奖品已创建');
    }
    setOpen(false);
    fetchData();
  };

  const remove = async (id: string) => {
    await api.delete(`/points/prize/delete/${id}`);
    message.success('奖品已删除');
    fetchData();
  };

  const toggle = async (id: string) => {
    await api.put(`/points/prize/toggle/${id}`);
    message.success('状态已切换');
    fetchData();
  };

  const columns: ColumnsType<LotteryPrize> = [
    { title: '图片', dataIndex: 'prizeImage', width: 80, render: (url: string) => <Image src={url} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 8 }} /> },
    { title: '奖品名称', dataIndex: 'prizeName', render: (value: string) => <b>{value}</b> },
    {
      title: '奖品类型',
      dataIndex: 'prizeIntegral',
      render: (value: number) => value > 0 ? <Tag color="gold">{value} 积分</Tag> : <Tag color="purple">实物大奖</Tag>,
    },
    { title: '参考价值', dataIndex: 'prizeValue', render: (value: number | null) => value ? `¥${value.toFixed(2)}` : '-' },
    { title: '库存', dataIndex: 'stock', render: (value: number) => <span style={{ color: value <= 5 ? '#cf1322' : undefined }}>{value}</span> },
    { title: '权重', dataIndex: 'weight' },
    { title: '排序', dataIndex: 'sortOrder' },
    { title: '状态', dataIndex: 'isActive', render: (value: boolean, prize) => <Switch size="small" checked={value} onChange={() => toggle(prize.id)} /> },
    {
      title: '操作',
      fixed: 'right',
      width: 130,
      render: (_, prize) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => openEdit(prize)} />
          <Popconfirm title="确定删除该奖品？已有抽奖记录时数据库会拒绝删除。" onConfirm={() => remove(prize.id)}>
            <Button type="link" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Typography.Title level={3} style={{ margin: 0 }}>抽奖奖品</Typography.Title>
          <Typography.Text type="secondary">积分为 0 表示实物大奖，大于 0 表示积分奖励</Typography.Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增奖品</Button>
      </div>
      <Card bordered={false} style={{ marginTop: 16 }}>
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading} scroll={{ x: 950 }} pagination={false} />
      </Card>

      <Modal title={editing ? '编辑奖品' : '新增奖品'} open={open} onOk={submit} onCancel={() => setOpen(false)} okText="保存">
        <Form form={form} layout="vertical">
          <Form.Item name="prizeName" label="奖品名称" rules={[{ required: true, message: '请输入奖品名称' }]}><Input /></Form.Item>
          <Form.Item name="prizeImage" label="奖品图片 URL" rules={[{ required: true, message: '请输入图片地址' }]}><Input /></Form.Item>
          <Space align="start" style={{ display: 'flex' }}>
            <Form.Item name="prizeIntegral" label="奖励积分" rules={[{ required: true }]} style={{ flex: 1 }}><InputNumber min={0} precision={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="prizeValue" label="参考价值" style={{ flex: 1 }}><InputNumber min={0} precision={2} prefix="¥" style={{ width: '100%' }} /></Form.Item>
          </Space>
          <Space align="start" style={{ display: 'flex' }}>
            <Form.Item name="stock" label="库存" style={{ flex: 1 }}><InputNumber min={0} precision={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="weight" label="中奖权重" tooltip="同类型奖品内部的相对中奖概率，默认 1 表示均等" style={{ flex: 1 }}><InputNumber min={1} precision={0} style={{ width: '100%' }} /></Form.Item>
            <Form.Item name="sortOrder" label="排序" style={{ flex: 1 }}><InputNumber min={0} precision={0} style={{ width: '100%' }} /></Form.Item>
          </Space>
          {editing && <Form.Item name="isActive" label="启用状态" valuePropName="checked"><Switch /></Form.Item>}
        </Form>
      </Modal>
    </div>
  );
}
