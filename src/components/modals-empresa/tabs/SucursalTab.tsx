import React, { useEffect, useState } from "react";
import {
    Card,
    Button,
    List,
    Space,
    Tag,
    Modal,
    Form,
    Input,
    message,
    Divider,
    Row,
    Col,
    Badge,
    Tooltip,
    Empty
} from "antd";
import {
    PlusOutlined,
    EditOutlined,
    EnvironmentOutlined,
    PhoneOutlined,
    WifiOutlined,
    UserOutlined,
    HomeOutlined,
    EyeOutlined,
    DeleteOutlined
} from "@ant-design/icons";

const API_URL =
    (import.meta as ImportMeta).env?.VITE_API_URL ||
    "http://localhost:4000/api";

interface Props {
    empresaId: number;
}

const SucursalesTab: React.FC<Props> = ({ empresaId }) => {
    /* ===================== STATE ===================== */
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingSucursalId, setEditingSucursalId] = useState<number | null>(null);
    const [form] = Form.useForm();

    /* ===================== LOAD LIST ===================== */
    const load = async () => {
        try {
            setLoading(true);

            const res = await fetch(
                `${API_URL}/ficha-empresa/${empresaId}/sucursales`
            );

            if (!res.ok) {
                setData([]);
                return;
            }

            const json = await res.json();

            // 🔥 validación defensiva
            if (Array.isArray(json)) {
                setData(json);
            } else {
                setData([]);
            }

        } catch {
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // 🔥 limpiar estado ANTES de cargar nueva empresa
        setData([]);
        setLoading(true);

        // cerrar modal si estaba abierto
        setModalOpen(false);
        setEditingSucursalId(null);
        form.resetFields();

        load();
    }, [empresaId]);

    /* ===================== LOAD FOR EDIT ===================== */
    useEffect(() => {
        if (!modalOpen) return;

        if (editingSucursalId) {
            // 1️⃣ cargar sucursal
            fetch(`${API_URL}/ficha-empresa/sucursales/${editingSucursalId}`)
                .then(r => r.json())
                .then(data => {
                    form.setFieldsValue({
                        nombre: data.nombre ?? "",
                        direccion: data.direccion ?? "",
                        telefono: data.telefono ?? "",
                        responsableSucursals: data.responsableSucursals ?? [],
                    });
                });

            // 2️⃣ cargar WiFi
            fetch(`${API_URL}/ficha-empresa/sucursales/${editingSucursalId}/red`)
                .then(r => r.json())
                .then(red => {
                    if (red) {
                        form.setFieldsValue({
                            redSucursal: red,
                        });
                    }
                });
        } else {
            // NUEVA SUCURSAL
            form.resetFields();
            form.setFieldsValue({
                responsableSucursals: [],
                redSucursal: {},
            });
        }
    }, [modalOpen, editingSucursalId, form]);

    /* ===================== SAVE ===================== */
    const onSave = async () => {
        try {
            const values = await form.validateFields();
            const { redSucursal, ...sucursalData } = values;

            /* ===== 1️⃣ GUARDAR SUCURSAL ===== */
            const url = editingSucursalId
                ? `${API_URL}/ficha-empresa/sucursales/${editingSucursalId}`
                : `${API_URL}/ficha-empresa/${empresaId}/sucursales`;

            const method = editingSucursalId ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(sucursalData),
            });

            if (!res.ok) throw new Error("Error guardando sucursal");

            const savedSucursal = await res.json();
            const sucursalId = editingSucursalId ?? savedSucursal.id_sucursal;

            /* ===== 2️⃣ GUARDAR WIFI (solo si tiene datos) ===== */
            const hasWifiData = redSucursal &&
                Object.values(redSucursal).some(v => v && String(v).trim() !== "");

            if (hasWifiData) {
                await fetch(
                    `${API_URL}/ficha-empresa/sucursales/${sucursalId}/red`,
                    {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(redSucursal),
                    }
                );
            }

            message.success(
                editingSucursalId
                    ? "Sucursal actualizada correctamente"
                    : "Sucursal creada correctamente"
            );

            setModalOpen(false);
            setEditingSucursalId(null);
            load();
        } catch (e) {
            console.error(e);
            message.error("No se pudo guardar la sucursal");
        }
    };

    /* ===================== UI ===================== */
    return (
        <div className="p-2">
            {/* ======= HEADER ======= */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-semibold mb-1">Sucursales</h3>
                    <p className="text-gray-500 text-sm">
                        {data.length} sucursal{data.length !== 1 ? 'es' : ''} registrada{data.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                        setEditingSucursalId(null);
                        setModalOpen(true);
                    }}
                    className="flex items-center"
                >
                    Nueva sucursal
                </Button>
            </div>

            {/* ======= LISTADO ======= */}
            {data.length === 0 && !loading ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={
                        <span className="text-gray-500">
                            Esta empresa no tiene sucursales registradas
                        </span>
                    }
                    className="py-8"
                />
            ) : (
                <List
                    loading={loading}
                    dataSource={data}
                    grid={{
                        gutter: 16,
                        xs: 1,
                        sm: 1,
                        md: 2,
                        lg: 2,
                        xl: 3,
                        xxl: 3,
                    }}
                    renderItem={(sucursal) => (
                        <List.Item>
                            <Card
                                className="h-full hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
                                title={
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center truncate">
                                            <HomeOutlined className="text-blue-500 mr-2" />
                                            <span className="font-medium truncate">{sucursal.nombre}</span>
                                        </div>
                                        {sucursal.redSucursal && (
                                            <Badge
                                                count={<WifiOutlined className="text-xs" />}
                                                style={{ backgroundColor: '#52c41a' }}
                                                title="WiFi configurado"
                                            />
                                        )}
                                    </div>
                                }
                                extra={
                                    <Tooltip title="Editar sucursal">
                                        <Button
                                            type="text"
                                            size="small"
                                            icon={<EditOutlined />}
                                            onClick={() => {
                                                setEditingSucursalId(sucursal.id_sucursal);
                                                setModalOpen(true);
                                            }}
                                        />
                                    </Tooltip>
                                }
                            >
                                <div className="space-y-3">
                                    {/* Información básica */}
                                    <div className="space-y-2">
                                        {sucursal.direccion && (
                                            <div className="flex items-start">
                                                <EnvironmentOutlined className="text-gray-400 mt-1 mr-2" />
                                                <div className="flex-1">
                                                    <p className="text-xs text-gray-500 mb-0">Dirección</p>
                                                    <p className="mb-0 text-sm">{sucursal.direccion}</p>
                                                </div>
                                            </div>
                                        )}

                                        {sucursal.telefono && (
                                            <div className="flex items-center">
                                                <PhoneOutlined className="text-gray-400 mr-2" />
                                                <div>
                                                    <p className="text-xs text-gray-500 mb-0">Teléfono</p>
                                                    <p className="mb-0 text-sm">{sucursal.telefono}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* WiFi */}
                                    {sucursal.redSucursal ? (
                                        <div className="bg-gray-50 p-3 rounded">
                                            <div className="flex items-center mb-2">
                                                <WifiOutlined className="text-gray-500 mr-2" />
                                                <span className="text-sm font-medium">Red WiFi</span>
                                            </div>
                                            <div className="space-y-1 text-sm">
                                                {sucursal.redSucursal.wifiNombre && (
                                                    <p className="mb-0">
                                                        <span className="text-gray-600">SSID:</span>{' '}
                                                        <span className="font-medium">{sucursal.redSucursal.wifiNombre}</span>
                                                    </p>
                                                )}
                                                {sucursal.redSucursal.claveWifi && (
                                                    <p className="mb-0">
                                                        <span className="text-gray-600">Clave:</span>{' '}
                                                        <code
                                                            className="bg-gray-100 px-1 rounded cursor-pointer"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(sucursal.redSucursal.claveWifi);
                                                                message.success("Clave copiada");
                                                            }}
                                                        >
                                                            {sucursal.redSucursal.claveWifi}
                                                        </code>
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center text-gray-400">
                                            <WifiOutlined className="mr-2" />
                                            <span className="text-sm">WiFi no configurado</span>
                                        </div>
                                    )}

                                    {/* Responsables */}
                                    <div>
                                        <div className="flex items-center mb-2">
                                            <UserOutlined className="text-gray-500 mr-2" />
                                            <span className="text-sm font-medium">Responsables</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {Array.isArray(sucursal.responsableSucursals) &&
                                                sucursal.responsableSucursals.length > 0 ? (
                                                sucursal.responsableSucursals.map((r: any) => (
                                                    <Tag
                                                        key={r.id}
                                                        color="blue"
                                                        className="m-0"
                                                    >
                                                        {r.nombre}
                                                        {r.cargo && ` (${r.cargo})`}
                                                    </Tag>
                                                ))
                                            ) : (
                                                <span className="text-gray-400 text-sm">Sin responsables</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </List.Item>
                    )}
                />
            )}

            {/* ======= MODAL ======= */}
            <Modal
                open={modalOpen}
                title={
                    <div className="flex items-center">
                        <EnvironmentOutlined className="mr-2 text-blue-500" />
                        {editingSucursalId ? "Editar sucursal" : "Nueva sucursal"}
                    </div>
                }
                onCancel={() => {
                    setModalOpen(false);
                    setEditingSucursalId(null);
                    form.resetFields(); // 🔥 clave
                }}
                onOk={onSave}
                destroyOnClose
                width={700}
                okText="Guardar"
                cancelText="Cancelar"
                okButtonProps={{ className: "bg-blue-500" }}
            >
                <Form layout="vertical" form={form} className="pt-4">
                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item
                                name="nombre"
                                label="Nombre"
                                rules={[{ required: true, message: "Ingrese el nombre" }]}
                            >
                                <Input
                                    placeholder="Nombre de la sucursal"
                                    prefix={<EnvironmentOutlined className="text-gray-300" />}
                                />
                            </Form.Item>
                        </Col>

                        <Col span={12}>
                            <Form.Item name="direccion" label="Dirección">
                                <Input
                                    placeholder="Dirección completa"
                                    prefix={<HomeOutlined className="text-gray-300" />}
                                />
                            </Form.Item>
                        </Col>

                        <Col span={12}>
                            <Form.Item name="telefono" label="Teléfono">
                                <Input
                                    placeholder="Teléfono"
                                    prefix={<PhoneOutlined className="text-gray-300" />}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider orientation="left" className="!mt-8 !mb-4">
                        <WifiOutlined className="mr-2" />
                        WiFi de la sucursal
                    </Divider>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label="Nombre de la red"
                                name={["redSucursal", "wifiNombre"]}
                            >
                                <Input placeholder="SSID" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label="Contraseña WiFi"
                                name={["redSucursal", "claveWifi"]}
                            >
                                <Input placeholder="Contraseña" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label="IP de red"
                                name={["redSucursal", "ipRed"]}
                            >
                                <Input placeholder="Ej: 192.168.1.1" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label="Observaciones"
                                name={["redSucursal", "observaciones"]}
                            >
                                <Input.TextArea rows={2} placeholder="Observaciones adicionales" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider orientation="left" className="!mt-8 !mb-4">
                        <UserOutlined className="mr-2" />
                        Responsables de la sucursal
                    </Divider>

                    <Form.List name="responsableSucursals">
                        {(fields, { add, remove }) => (
                            <div className="space-y-3">
                                {fields.map(({ key, name }) => (
                                    <Card
                                        key={key}
                                        size="small"
                                        className="border-l-2 border-l-blue-200"
                                    >
                                        <Row gutter={8} align="middle">
                                            <Col span={5}>
                                                <Form.Item
                                                    name={[name, "nombre"]}
                                                    rules={[{ required: true, message: "Nombre requerido" }]}
                                                    className="mb-0"
                                                >
                                                    <Input placeholder="Nombre" size="small" />
                                                </Form.Item>
                                            </Col>
                                            <Col span={5}>
                                                <Form.Item name={[name, "cargo"]} className="mb-0">
                                                    <Input placeholder="Cargo" size="small" />
                                                </Form.Item>
                                            </Col>
                                            <Col span={6}>
                                                <Form.Item name={[name, "email"]} className="mb-0">
                                                    <Input placeholder="Email" size="small" />
                                                </Form.Item>
                                            </Col>
                                            <Col span={5}>
                                                <Form.Item name={[name, "telefono"]} className="mb-0">
                                                    <Input placeholder="Teléfono" size="small" />
                                                </Form.Item>
                                            </Col>
                                            <Col span={3}>
                                                <Button
                                                    danger
                                                    type="text"
                                                    size="small"
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => remove(name)}
                                                    className="w-full"
                                                />
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
                                    Agregar responsable
                                </Button>
                            </div>
                        )}
                    </Form.List>
                </Form>
            </Modal>
        </div>
    );
};

export default SucursalesTab;