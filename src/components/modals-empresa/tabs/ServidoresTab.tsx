// ServidoresTab.tsx
import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Switch,
  Modal,
  Form,
  Input,
  message,
  Popconfirm,
  Row,
  Col,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  DesktopOutlined,
  UserOutlined,
  GlobalOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import UsuariosServidorTable from "./UsuariosServidorTab";
import { http } from "../../../service/http";  // 🔥 ajusta la ruta según tu estructura

interface Servidor {
  id: number;
  nombre: string;
  nombreUsuario: string;
  contrasena: string;
  ipExterna: string;
  probado: boolean;
}

interface Props {
  empresaId: number;
}

const ServidoresTab: React.FC<Props> = ({ empresaId }) => {
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Servidor | null>(null);
  const [form] = Form.useForm();

  const fetchServidores = async () => {
    try {
      setLoading(true);
      const { data } = await http.get(`/ficha-empresa/${empresaId}/servidores`);
      if (data.success) setServidores(data.data);
    } catch {
      message.error("Error cargando servidores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServidores();
  }, [empresaId]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      if (editing) {
        await http.put(`/ficha-empresa/servidores/${editing.id}`, values);
        message.success("Servidor actualizado");
      } else {
        await http.post(`/ficha-empresa/servidores`, { ...values, empresaId });
        message.success("Servidor creado");
      }

      setOpen(false);
      setEditing(null);
      form.resetFields();
      fetchServidores();
    } catch {
      message.error("Error guardando servidor");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await http.delete(`/ficha-empresa/servidores/${id}`);
      message.success("Servidor eliminado");
      fetchServidores();
    } catch {
      message.error("Error eliminando servidor");
    }
  };

  const toggleProbado = async (id: number) => {
    try {
      await http.patch(`/ficha-empresa/servidores/${id}/probado`);
      fetchServidores();
    } catch {
      message.error("Error actualizando estado");
    }
  };

  const columns: ColumnsType<Servidor> = [
    { title: "Servidor", dataIndex: "nombre" },
    { title: "Usuario Acceso", dataIndex: "nombreUsuario" },
    { title: "Contraseña", dataIndex: "contrasena" },
    { title: "IP Externa", dataIndex: "ipExterna" },
    {
      title: "Probado",
      render: (_, record) => (
        <Switch checked={record.probado} onChange={() => toggleProbado(record.id)} />
      ),
    },
    {
      title: "Acciones",
      render: (_, record) => (
        <div className="flex gap-2">
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => {
              setEditing(record);
              form.setFieldsValue(record);
              setOpen(true);
            }}
          />
          <Popconfirm title="¿Eliminar servidor?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex justify-between mb-4">
        <h3 className="text-lg font-semibold">Servidores</h3>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(null);
            form.resetFields();
            setOpen(true);
          }}
        >
          Nuevo servidor
        </Button>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={servidores}
        loading={loading}
        pagination={false}
        expandable={{
          expandedRowRender: (record) => <UsuariosServidorTable servidorId={record.id} />,
        }}
      />

      <Modal
        title={
          <span>
            <DesktopOutlined style={{ marginRight: 8 }} />
            {editing ? "Editar Servidor" : "Nuevo Servidor"}
          </span>
        }
        open={open}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        footer={[
          <Button key="cancel" onClick={() => { setOpen(false); setEditing(null); form.resetFields(); }}>
            Cancelar
          </Button>,
          <Button key="submit" type="primary" icon={<CheckCircleOutlined />} onClick={handleSubmit}>
            {editing ? "Actualizar" : "Crear"}
          </Button>,
        ]}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="nombre"
                label="Nombre del Servidor"
                rules={[{ required: true, message: "Campo obligatorio" }]}
              >
                <Input prefix={<DesktopOutlined />} placeholder="Ej: Servidor Principal" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="nombreUsuario"
                label="Nombre Usuario"
                rules={[{ required: true, message: "Campo obligatorio" }]}
              >
                <Input prefix={<UserOutlined />} placeholder="Ej: admin" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="contrasena"
                label="Contraseña"
                rules={[{ required: true, message: "Campo obligatorio" }]}
              >
                <Input placeholder="••••••••" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="ipExterna"
                label="IP Externa"
                rules={[{ required: true, message: "Campo obligatorio" }]}
              >
                <Input prefix={<GlobalOutlined />} placeholder="Ej: 192.168.1.100" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </>
  );
};

export default ServidoresTab;