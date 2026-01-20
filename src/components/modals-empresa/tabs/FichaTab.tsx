import React, { useEffect, useState } from "react";
import {
    Card,
    Descriptions,
    Button,
    Form,
    Input,
    message,
    Space,
    Row,
    Col,
    Tag,
    Divider,
    Tooltip,
    Typography
} from "antd";
import {
    EditOutlined,
    SaveOutlined,
    UserOutlined,
    EnvironmentOutlined,
    IdcardOutlined,
    FileTextOutlined,
    CalendarOutlined,
    PhoneOutlined,
    MailOutlined,
    DeleteOutlined,
    PlusOutlined,
    StarFilled
} from "@ant-design/icons";
import type { FichaTabProps } from "../types";

const { Text } = Typography;
const API_URL =
    (import.meta as ImportMeta).env?.VITE_API_URL ||
    "http://localhost:4000/api";

/* ===================== Componente ===================== */
const FichaTab: React.FC<FichaTabProps> = ({
    empresa,
    ficha,
    detalleEmpresa,
    contactos,
    onUpdated,
}) => {
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    /* ===================== Sync data ===================== */
    useEffect(() => {
        if (!ficha) return;

        form.setFieldsValue({
            razonSocial: empresa.razonSocial,
            rut: detalleEmpresa?.rut,
            direccion: detalleEmpresa?.direccion,
            condicionesComerciales: ficha?.condicionesComerciales,
            contactos: contactos ?? [],
        });
    }, [empresa, ficha, detalleEmpresa, contactos, form]);

    if (!ficha) {
        return (
            <div className="p-6 text-slate-500 text-sm">
                Cargando ficha de la empresa…
            </div>
        );
    }

    /* ===================== Save ===================== */
    const onSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);

            const res = await fetch(
                `${API_URL}/ficha-empresa/${empresa.id_empresa}/ficha`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        razonSocial: values.razonSocial,
                        rut: values.rut,
                        direccion: values.direccion,
                        condicionesComerciales: values.condicionesComerciales,
                        contactos: values.contactos ?? [],
                    }),
                }
            );

            if (!res.ok) throw new Error();

            message.success("Ficha actualizada correctamente");
            setEditing(false);
            onUpdated?.();
        } catch {
            message.error("No se pudo guardar la ficha");
        } finally {
            setSaving(false);
        }
    };

    /* ===================== UI ===================== */
    return (
        <Card
            className="shadow-sm"
            title={
                <div className="flex items-center">
                    <FileTextOutlined className="text-blue-500 mr-2" />
                    <span className="font-semibold">
                        Ficha Empresa · {empresa.nombre}
                    </span>
                </div>
            }
            extra={
                <Space>
                    {!editing ? (
                        <Tooltip title="Editar ficha de empresa">
                            <Button
                                type="primary"
                                icon={<EditOutlined />}
                                onClick={() => setEditing(true)}
                            >
                                Editar
                            </Button>
                        </Tooltip>
                    ) : (
                        <div className="flex gap-2">
                            <Button
                                onClick={() => {
                                    setEditing(false);
                                    form.resetFields();
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                loading={saving}
                                onClick={onSave}
                                className="bg-blue-500 hover:bg-blue-600"
                            >
                                Guardar
                            </Button>
                        </div>
                    )}
                </Space>
            }
        >
            {!editing ? (
                /* ======= MODO VISUALIZACIÓN ======= */
                <div className="space-y-6">
                    {/* Información básica */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded">
                            <div className="flex items-center mb-2">
                                <IdcardOutlined className="text-gray-400 mr-2" />
                                <span className="text-sm font-medium text-gray-600">Razón social</span>
                            </div>
                            <p className="text-base font-semibold">
                                {empresa.razonSocial || "—"}
                            </p>
                        </div>

                        <div className="p-4 bg-gray-50 rounded">
                            <div className="flex items-center mb-2">
                                <IdcardOutlined className="text-gray-400 mr-2" />
                                <span className="text-sm font-medium text-gray-600">RUT</span>
                            </div>
                            <p className="text-base font-semibold">
                                {detalleEmpresa?.rut || "—"}
                            </p>
                        </div>

                        <div className="p-4 bg-gray-50 rounded md:col-span-2">
                            <div className="flex items-center mb-2">
                                <EnvironmentOutlined className="text-gray-400 mr-2" />
                                <span className="text-sm font-medium text-gray-600">Dirección</span>
                            </div>
                            <p className="text-base font-semibold">
                                {detalleEmpresa?.direccion || "—"}
                            </p>
                        </div>
                    </div>

                    {/* Condiciones comerciales */}
                    {ficha.condicionesComerciales && (
                        <div className="p-4 bg-blue-50 rounded border border-blue-100">
                            <div className="flex items-center mb-2">
                                <FileTextOutlined className="text-blue-400 mr-2" />
                                <span className="text-sm font-medium text-blue-600">Condiciones comerciales</span>
                            </div>
                            <p className="text-gray-700 whitespace-pre-line">
                                {ficha.condicionesComerciales}
                            </p>
                        </div>
                    )}

                    {/* Contactos */}
                    <div>
                        <Divider orientation="left">
                            <UserOutlined className="mr-2" />
                            Contactos / Jefes
                        </Divider>

                        {contactos.length > 0 ? (
                            <Row gutter={[16, 16]}>
                                {contactos.map((c) => (
                                    <Col xs={24} md={12} lg={8} key={c.id}>
                                        <Card
                                            size="small"
                                            className={`h-full border-l-4 ${c.principal
                                                ? 'border-l-yellow-500 bg-yellow-50'
                                                : 'border-l-blue-200'
                                                }`}
                                            title={
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium truncate">{c.nombre}</span>
                                                    {c.principal && (
                                                        <Tooltip title="Contacto principal">
                                                            <StarFilled className="text-yellow-500" />
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            }
                                        >
                                            <div className="space-y-2">
                                                {c.cargo && (
                                                    <div className="flex items-start">
                                                        <UserOutlined className="text-gray-400 mt-1 mr-2" />
                                                        <div>
                                                            <p className="text-xs text-gray-500 mb-0">Cargo</p>
                                                            <p className="text-sm mb-0">{c.cargo}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {c.email && (
                                                    <div className="flex items-center">
                                                        <MailOutlined className="text-gray-400 mr-2" />
                                                        <div>
                                                            <p className="text-xs text-gray-500 mb-0">Email</p>
                                                            <p className="text-sm mb-0">{c.email}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {c.telefono && (
                                                    <div className="flex items-center">
                                                        <PhoneOutlined className="text-gray-400 mr-2" />
                                                        <div>
                                                            <p className="text-xs text-gray-500 mb-0">Teléfono</p>
                                                            <p className="text-sm mb-0">{c.telefono}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        ) : (
                            <div className="text-center py-8 text-gray-400">
                                <UserOutlined className="text-2xl mb-2" />
                                <p>No hay contactos registrados</p>
                            </div>
                        )}
                    </div>

                    {/* Información del sistema */}
                    <Divider orientation="left">
                        <CalendarOutlined className="mr-2" />
                        Información del sistema
                    </Divider>

                    <div className="p-4 bg-gray-50 rounded">
                        <div className="flex items-center">
                            <CalendarOutlined className="text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-gray-600">Fecha creación ficha</span>
                            <span className="ml-auto text-sm">
                                {new Date(ficha.creadaEn).toLocaleString("es-CL", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: false,        // 🔥 CLAVE
                                })}
                            </span>
                        </div>
                    </div>
                </div>
            ) : (
                /* ======= MODO EDICIÓN ======= */
                <Form layout="vertical" form={form} className="space-y-6">
                    <Row gutter={16}>
                        <Col span={24} md={12}>
                            <Form.Item
                                label={
                                    <span className="font-medium">
                                        <IdcardOutlined className="mr-2" />
                                        Razón social
                                    </span>
                                }
                                name="razonSocial"
                            >
                                <Input placeholder="Razón social de la empresa" />
                            </Form.Item>
                        </Col>

                        <Col span={24} md={12}>
                            <Form.Item
                                label={
                                    <span className="font-medium">
                                        <IdcardOutlined className="mr-2" />
                                        RUT
                                    </span>
                                }
                                name="rut"
                            >
                                <Input placeholder="RUT de la empresa" />
                            </Form.Item>
                        </Col>

                        <Col span={24}>
                            <Form.Item
                                label={
                                    <span className="font-medium">
                                        <EnvironmentOutlined className="mr-2" />
                                        Dirección
                                    </span>
                                }
                                name="direccion"
                            >
                                <Input placeholder="Dirección completa" />
                            </Form.Item>
                        </Col>

                        <Col span={24}>
                            <Form.Item
                                label={
                                    <span className="font-medium">
                                        <FileTextOutlined className="mr-2" />
                                        Condiciones comerciales
                                    </span>
                                }
                                name="condicionesComerciales"
                            >
                                <Input.TextArea
                                    rows={4}
                                    placeholder="Describa las condiciones comerciales especiales..."
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider orientation="left">
                        <UserOutlined className="mr-2" />
                        Contactos / Jefes
                    </Divider>

                    <Form.List name="contactos">
                        {(fields, { add, remove }) => (
                            <div className="space-y-4">
                                {fields.map(({ key, name }) => (
                                    <Card
                                        key={key}
                                        size="small"
                                        className="border-l-2 border-l-blue-200"
                                        extra={
                                            <Button
                                                danger
                                                type="link"
                                                size="small"
                                                icon={<DeleteOutlined />}
                                                onClick={() => remove(name)}
                                            >
                                                Eliminar
                                            </Button>
                                        }
                                    >
                                        <Row gutter={12}>
                                            <Col span={12} md={6}>
                                                <Form.Item
                                                    name={[name, "nombre"]}
                                                    label="Nombre"
                                                    rules={[{ required: true, message: "Nombre requerido" }]}
                                                    className="mb-2"
                                                >
                                                    <Input placeholder="Nombre completo" size="small" />
                                                </Form.Item>
                                            </Col>
                                            <Col span={12} md={6}>
                                                <Form.Item
                                                    name={[name, "cargo"]}
                                                    label="Cargo"
                                                    className="mb-2"
                                                >
                                                    <Input placeholder="Cargo/Posición" size="small" />
                                                </Form.Item>
                                            </Col>
                                            <Col span={12} md={6}>
                                                <Form.Item
                                                    name={[name, "email"]}
                                                    label="Email"
                                                    className="mb-2"
                                                >
                                                    <Input placeholder="email@empresa.com" size="small" />
                                                </Form.Item>
                                            </Col>
                                            <Col span={12} md={6}>
                                                <Form.Item
                                                    name={[name, "telefono"]}
                                                    label="Teléfono"
                                                    className="mb-2"
                                                >
                                                    <Input placeholder="Teléfono" size="small" />
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                    </Card>
                                ))}

                                <Button
                                    type="dashed"
                                    onClick={() => add()}
                                    block
                                    icon={<PlusOutlined />}
                                    className="mt-2"
                                >
                                    Agregar contacto
                                </Button>
                            </div>
                        )}
                    </Form.List>
                </Form>
            )}
        </Card>
    );
};

export default FichaTab;