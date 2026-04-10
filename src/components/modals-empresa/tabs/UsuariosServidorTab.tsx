import React, { useEffect, useState } from "react";
import { Table, Button, Modal, Form, Input, message, Popconfirm, Tag, Row, Col, Select } from "antd";
import {
    UserOutlined,
    DesktopOutlined,
    TagOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    EditOutlined,
    DeleteOutlined,
    PlusOutlined,
} from "@ant-design/icons";
import { http } from "../../../service/http";  // ajusta ruta

interface Props {
    servidorId: number;
}

interface UsuarioServidor {
    id: number;
    usuario: string;
    nombreUsuario: string;
    contrasena: string;
    equipo?: string;
    acceso?: string;
    tipo?: string;
    estado?: string;
}

const UsuariosServidorTable: React.FC<Props> = ({ servidorId }) => {
    const [usuarios, setUsuarios] = useState<UsuarioServidor[]>([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<UsuarioServidor | null>(null);
    const [form] = Form.useForm();

    const fetchUsuarios = async () => {
        try {
            const { data } = await http.get(`/ficha-empresa/servidores/${servidorId}/usuarios`);
            if (data.success) setUsuarios(data.data);
        } catch {
            message.error("Error cargando usuarios");
        }
    };

    useEffect(() => { fetchUsuarios(); }, [servidorId]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            if (editing) {
                await http.put(`/ficha-empresa/servidor-usuarios/${editing.id}`, values);
            } else {
                await http.post(`/ficha-empresa/servidores/${servidorId}/usuarios`, values);
            }
            setOpen(false);
            setEditing(null);
            form.resetFields();
            fetchUsuarios();
        } catch {
            message.error("Error guardando usuario");
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await http.delete(`/ficha-empresa/servidor-usuarios/${id}`);
            fetchUsuarios();
        } catch {
            message.error("Error eliminando usuario");
        }
    };

    return (
        <>
            <div className="flex justify-between mb-3">
                <h4 className="font-semibold">Usuarios del servidor</h4>
                <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => { setEditing(null); form.resetFields(); setOpen(true); }}
                >
                    Nuevo usuario
                </Button>
            </div>

            <Table
                size="small"
                rowKey="id"
                pagination={false}
                columns={[
                    { title: "Usuario", dataIndex: "usuario" },
                    { title: "Nombre Usuario", dataIndex: "nombreUsuario" },
                    { title: "Contraseña", dataIndex: "contrasena" },
                    { title: "Acceso", dataIndex: "acceso" },
                    { title: "Tipo", dataIndex: "tipo" },
                    {
                        title: "Estado",
                        render: (_, record) => {
                            if (!record.estado) return null;
                            const isConfirmed = record.estado === "CONFIRMADO";
                            return (
                                <Tag icon={isConfirmed ? <CheckCircleOutlined /> : <CloseCircleOutlined />} color={isConfirmed ? "success" : "error"}>
                                    {isConfirmed ? "Confirmado" : "No confirmado"}
                                </Tag>
                            );
                        },
                    },
                    {
                        title: "Acciones",
                        render: (_, record) => (
                            <div className="flex gap-2">
                                <Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(record); form.setFieldsValue(record); setOpen(true); }} />
                                <Popconfirm title="Eliminar usuario?" onConfirm={() => handleDelete(record.id)}>
                                    <Button size="small" icon={<DeleteOutlined />} danger />
                                </Popconfirm>
                            </div>
                        ),
                    },
                ]}
                dataSource={usuarios}
            />

            <Modal
                title={<span><UserOutlined style={{ marginRight: 8 }} />{editing ? "Editar Usuario" : "Nuevo Usuario"}</span>}
                open={open}
                onCancel={() => { setOpen(false); setEditing(null); form.resetFields(); }}
                width={700}
                footer={[
                    <Button key="cancel" onClick={() => { setOpen(false); setEditing(null); form.resetFields(); }}>Cancelar</Button>,
                    <Button key="submit" type="primary" icon={<CheckCircleOutlined />} onClick={handleSubmit}>{editing ? "Actualizar" : "Crear"}</Button>,
                ]}
            >
                <Form form={form} layout="vertical">
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="usuario" label="Usuario" rules={[{ required: true, message: "Campo obligatorio" }]}>
                                <Input prefix={<UserOutlined />} placeholder="Ej: jperez" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="nombreUsuario" label="Nombre Usuario">
                                <Input prefix={<UserOutlined />} placeholder="Nombre completo" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="contrasena" label="Contraseña" rules={[{ required: true, message: "Campo obligatorio" }]}>
                                <Input placeholder="••••••••" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="acceso" label="Acceso">
                                <Input prefix={<DesktopOutlined />} placeholder="Ej: Escritorio remoto" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="tipo" label="Tipo">
                                <Input prefix={<TagOutlined />} placeholder="Ej: Administrador" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="estado" label="Estado" rules={[{ required: true, message: "Seleccione un estado" }]}>
                                <Select placeholder="Seleccione estado">
                                    <Select.Option value="CONFIRMADO">Confirmado</Select.Option>
                                    <Select.Option value="NO_CONFIRMADO">No confirmado</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </>
    );
};

export default UsuariosServidorTable;