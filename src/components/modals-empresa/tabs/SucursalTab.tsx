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
} from "antd";
import { PlusOutlined } from "@ant-design/icons";

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
    const [editingSucursalId, setEditingSucursalId] =
        useState<number | null>(null);

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
            setData(Array.isArray(json) ? json : []);
        } catch {
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
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
            const sucursalId =
                editingSucursalId ?? savedSucursal.id_sucursal;

            /* ===== 2️⃣ GUARDAR WIFI (solo si tiene datos) ===== */
            const hasWifiData =
                redSucursal &&
                Object.values(redSucursal).some(
                    v => v && String(v).trim() !== ""
                );

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
        <>
            {/* ======= HEADER ======= */}
            <div className="flex justify-end mb-4">
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                        setEditingSucursalId(null);
                        setModalOpen(true);
                    }}
                >
                    Nueva sucursal
                </Button>
            </div>

            {/* ======= LISTADO ======= */}
            <List
                loading={loading}
                dataSource={data}
                locale={{
                    emptyText: "Esta empresa no tiene sucursales registradas",
                }}
                renderItem={(sucursal) => (
                    <Card
                        key={sucursal.id_sucursal}
                        className="mb-4"
                        title={`📍 ${sucursal.nombre}`}
                        extra={
                            <Button
                                onClick={() => {
                                    setEditingSucursalId(sucursal.id_sucursal);
                                    setModalOpen(true);
                                }}
                            >
                                Ver sucursal
                            </Button>
                        }
                    >
                        <p>
                            <b>Dirección:</b> {sucursal.direccion || "—"}
                        </p>
                        <p>
                            <b>Teléfono:</b> {sucursal.telefono || "—"}
                        </p>

                        {sucursal.redSucursal ? (
                            <div className="mt-2">
                                <p>
                                    <b>WiFi:</b>{" "}
                                    {sucursal.redSucursal.wifiNombre || "—"}
                                </p>
                                <p>
                                    <b>Clave:</b>{" "}
                                    {sucursal.redSucursal.claveWifi || "—"}
                                </p>
                            </div>
                        ) : (
                            <p className="text-slate-400 mt-2">
                                WiFi no registrado
                            </p>
                        )}

                        <p className="mt-2">
                            <b>Responsables:</b>
                        </p>

                        <Space wrap>
                            {Array.isArray(sucursal.responsableSucursals) &&
                                sucursal.responsableSucursals.length > 0 ? (
                                sucursal.responsableSucursals.map((r: any) => (
                                    <Tag key={r.id}>{r.nombre}</Tag>
                                ))
                            ) : (
                                <span>—</span>
                            )}
                        </Space>
                    </Card>
                )}
            />

            {/* ======= MODAL ======= */}
            <Modal
                open={modalOpen}
                title={
                    editingSucursalId
                        ? "Editar sucursal"
                        : "Nueva sucursal"
                }
                onCancel={() => {
                    setModalOpen(false);
                    setEditingSucursalId(null);
                }}
                onOk={onSave}
                destroyOnClose
            >
                <Form layout="vertical" form={form}>
                    <Form.Item
                        name="nombre"
                        label="Nombre"
                        rules={[
                            { required: true, message: "Ingrese el nombre" },
                        ]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item name="direccion" label="Dirección">
                        <Input />
                    </Form.Item>

                    <Form.Item name="telefono" label="Teléfono">
                        <Input />
                    </Form.Item>

                    <Divider>WiFi de la sucursal</Divider>

                    <Form.Item
                        label="Nombre de la red WiFi"
                        name={["redSucursal", "wifiNombre"]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Contraseña WiFi"
                        name={["redSucursal", "claveWifi"]}
                    >
                        <Input.Password />
                    </Form.Item>

                    <Form.Item
                        label="IP de red"
                        name={["redSucursal", "ipRed"]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Observaciones"
                        name={["redSucursal", "observaciones"]}
                    >
                        <Input.TextArea rows={2} />
                    </Form.Item>

                    <Divider>Responsables de la sucursal</Divider>

                    <Form.List name="responsableSucursals">
                        {(fields, { add, remove }) => (
                            <>
                                {fields.map(({ key, name }) => (
                                    <Space
                                        key={key}
                                        align="baseline"
                                        style={{ display: "flex" }}
                                    >
                                        <Form.Item
                                            name={[name, "nombre"]}
                                            rules={[
                                                {
                                                    required: true,
                                                    message: "Nombre requerido",
                                                },
                                            ]}
                                        >
                                            <Input placeholder="Nombre" />
                                        </Form.Item>

                                        <Form.Item name={[name, "cargo"]}>
                                            <Input placeholder="Cargo" />
                                        </Form.Item>

                                        <Form.Item name={[name, "email"]}>
                                            <Input placeholder="Email" />
                                        </Form.Item>

                                        <Form.Item name={[name, "telefono"]}>
                                            <Input placeholder="Teléfono" />
                                        </Form.Item>

                                        <Button danger onClick={() => remove(name)}>
                                            Eliminar
                                        </Button>
                                    </Space>
                                ))}

                                <Button
                                    type="dashed"
                                    onClick={() => add()}
                                    block
                                >
                                    + Agregar responsable
                                </Button>
                            </>
                        )}
                    </Form.List>
                </Form>
            </Modal>
        </>
    );
};

export default SucursalesTab;
