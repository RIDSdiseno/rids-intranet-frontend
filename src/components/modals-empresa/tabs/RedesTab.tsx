import React, { useEffect, useState } from "react";
import {
    Card,
    Button,
    Space,
    Input,
    Select,
    Tag,
    Modal,
    Form,
    Row,
    Col,
    message,
} from "antd";
import {
    CloudOutlined,
    PlusOutlined,
    DeleteOutlined,
    EditOutlined,
    StarFilled,
} from "@ant-design/icons";

const API_URL =
    (import.meta as ImportMeta).env?.VITE_API_URL ||
    "http://localhost:4000/api";

interface Props {
    empresaId: number;
}

const IspTab: React.FC<Props> = ({ empresaId }) => {
    const [isps, setIsps] = useState<any[]>([]);
    const [sucursales, setSucursales] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<any>(null);
    const [form] = Form.useForm();

    /* =========================
       LOAD DATA
    ========================= */
    const load = async () => {
        setLoading(true);

        try {
            const [ispRes, sucRes] = await Promise.all([
                fetch(`${API_URL}/ficha-empresa/${empresaId}/isp`),
                fetch(`${API_URL}/ficha-empresa/${empresaId}/sucursales`),
            ]);

            const ispJson = await ispRes.json();
            const sucJson = await sucRes.json();

            setIsps(ispJson);
            setSucursales(sucJson);
        } catch {
            message.error("Error cargando redes");
        }

        setLoading(false);
    };

    useEffect(() => {
        load();
    }, [empresaId]);

    /* =========================
       CREATE / UPDATE
    ========================= */
    const openCreate = () => {
        setEditing(null);
        form.resetFields();
        setModalOpen(true);
    };

    const openEdit = (isp: any) => {
        setEditing(isp);
        form.setFieldsValue(isp);
        setModalOpen(true);
    };

    const save = async () => {
        const values = await form.validateFields();

        try {
            if (editing) {
                await fetch(`${API_URL}/ficha-empresa/isp/${editing.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(values),
                });
            } else {
                await fetch(`${API_URL}/ficha-empresa/${empresaId}/isp`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(values),
                });
            }

            message.success("Red guardada");
            setModalOpen(false);
            load();
        } catch {
            message.error("Error guardando red");
        }
    };

    /* =========================
       DELETE
    ========================= */
    const remove = async (id: number) => {
        await fetch(`${API_URL}/ficha-empresa/isp/${id}`, {
            method: "DELETE",
        });

        message.success("Red eliminada");
        load();
    };

    /* =========================
       SET PRINCIPAL
    ========================= */
    const setPrincipal = async (isp: any) => {
        await fetch(`${API_URL}/ficha-empresa/isp/${isp.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...isp, esPrincipal: true }),
        });

        load();
    };

    return (
        <Card
            loading={loading}
            title={
                <div>
                    <CloudOutlined /> Redes / ISP
                </div>
            }
            extra={
                <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                    Nueva Red
                </Button>
            }
        >
            {isps.map((isp) => (
                <Card
                    key={isp.id}
                    style={{ marginBottom: 16 }}
                    type="inner"
                    title={
                        <Space>
                            {isp.esPrincipal && (
                                <Tag color="gold">
                                    <StarFilled /> Principal
                                </Tag>
                            )}
                            {isp.operador || "Sin operador"}
                        </Space>
                    }
                    extra={
                        <Space>
                            {!isp.esPrincipal && (
                                <Button size="small" onClick={() => setPrincipal(isp)}>
                                    Hacer Principal
                                </Button>
                            )}
                            <Button
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => openEdit(isp)}
                            />
                            <Button
                                size="small"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => remove(isp.id)}
                            />
                        </Space>
                    }
                >
                    <Row gutter={12}>
                        <Col span={12}>
                            <b>Servicio:</b> {isp.servicio || "—"}
                        </Col>
                        <Col span={12}>
                            <b>IP:</b> {isp.ipRed || "—"}
                        </Col>
                        <Col span={12}>
                            <b>WiFi:</b> {isp.wifiNombre || "—"}
                        </Col>
                        <Col span={12}>
                            <b>Sucursal:</b>{" "}
                            {isp.sucursal?.nombre || "Empresa (General)"}
                        </Col>
                    </Row>
                </Card>
            ))}

            {/* ========================= MODAL ========================= */}
            <Modal
                open={modalOpen}
                onCancel={() => setModalOpen(false)}
                onOk={save}
                title={editing ? "Editar Red" : "Nueva Red"}
            >
                <Form layout="vertical" form={form}>
                    <Form.Item name="operador" label="Operador">
                        <Input />
                    </Form.Item>

                    <Form.Item name="servicio" label="Servicio">
                        <Input />
                    </Form.Item>

                    <Form.Item name="ipRed" label="IP Pública">
                        <Input />
                    </Form.Item>

                    <Form.Item name="wifiNombre" label="WiFi">
                        <Input />
                    </Form.Item>

                    <Form.Item name="telefono" label="Teléfono ISP">
                        <Input />
                    </Form.Item>

                    <Form.Item name="sucursalId" label="Sucursal">
                        <Select allowClear placeholder="Seleccionar sucursal">
                            {sucursales.map((s) => (
                                <Select.Option key={s.id_sucursal} value={s.id_sucursal}>
                                    {s.nombre}
                                </Select.Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name="esPrincipal" valuePropName="checked">
                        <Select
                            options={[
                                { label: "Sí (Principal)", value: true },
                                { label: "No", value: false },
                            ]}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default IspTab;
