import React, { useEffect, useState } from "react";
import {
    Card,
    Form,
    Input,
    Button,
    Row,
    Col,
    Space,
    Badge,
    message,
} from "antd";
import {
    CloudOutlined,
    PhoneOutlined,
    WifiOutlined,
    SaveOutlined,
    EditOutlined,
} from "@ant-design/icons";

const API_URL =
    (import.meta as ImportMeta).env?.VITE_API_URL ||
    "http://localhost:4000/api";

interface Props {
    empresaId: number;
}

const IspTab: React.FC<Props> = ({ empresaId }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [mode, setMode] = useState<"view" | "edit">("view");
    const [data, setData] = useState<any>(null);

    const ViewField: React.FC<{ value?: string }> = ({ value }) => (
        <div
            style={{
                padding: "6px 11px",
                minHeight: 32,
                border: "1px solid #d9d9d9",
                borderRadius: 6,
                background: "#fafafa",
                color: "rgba(0,0,0,0.88)",
            }}
        >
            {value || "—"}
        </div>
    );

    const load = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/ficha-empresa/${empresaId}/isp`);
            const json = await res.json();
            setData(json);
            form.setFieldsValue(json);
        } catch {
            message.error("No se pudo cargar el ISP");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setMode("view");
        form.resetFields();
        load();
    }, [empresaId]);

    const onSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);

            await fetch(`${API_URL}/ficha-empresa/${empresaId}/isp`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            message.success("ISP actualizado");
            setMode("view");
            load();
        } catch {
            message.error("No se pudo guardar ISP");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card
            loading={loading}
            title={
                <div className="flex items-center">
                    <CloudOutlined className="text-blue-500 mr-2" />
                    <span className="font-semibold">ISP / Conectividad</span>
                    <Badge
                        count={mode === "view" ? "Vista" : "Edición"}
                        style={{
                            backgroundColor: mode === "view" ? "#52c41a" : "#1890ff",
                            marginLeft: 12,
                        }}
                    />
                </div>
            }
            extra={
                <Space>
                    {mode === "view" ? (
                        <Button icon={<EditOutlined />} type="primary" onClick={() => setMode("edit")}>
                            Editar
                        </Button>
                    ) : (
                        <>
                            <Button onClick={() => setMode("view")}>Cancelar</Button>
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                loading={saving}
                                onClick={onSave}
                            >
                                Guardar
                            </Button>
                        </>
                    )}
                </Space>
            }
        >
            <Form layout="vertical" form={form}>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item label="Operador / Proveedor">
                            {mode === "view" ? (
                                <ViewField value={data?.operador} />
                            ) : (
                                <Form.Item name="operador" noStyle>
                                    <Input prefix={<CloudOutlined />} />
                                </Form.Item>
                            )}
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item label="Teléfono ISP">
                            {mode === "view" ? (
                                <ViewField value={data?.telefono} />
                            ) : (
                                <Form.Item name="telefono" noStyle>
                                    <Input prefix={<PhoneOutlined />} />
                                </Form.Item>
                            )}
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item label="Servicio contratado">
                            {mode === "view" ? (
                                <ViewField value={data?.servicio} />
                            ) : (
                                <Form.Item name="servicio" noStyle>
                                    <Input placeholder="Ej: Fibra 600Mbps, enlace dedicado, respaldo" />
                                </Form.Item>
                            )}
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item label="IP pública">
                            {mode === "view" ? (
                                <ViewField value={data?.ipRed} />
                            ) : (
                                <Form.Item name="ipRed" noStyle>
                                    <Input placeholder="200.xxx.xxx.xxx" />
                                </Form.Item>
                            )}
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item label="N° Ticket ISP">
                            {mode === "view" ? (
                                <ViewField value={data?.numeroTicket} />
                            ) : (
                                <Form.Item name="numeroTicket" noStyle>
                                    <Input />
                                </Form.Item>
                            )}
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item label="WiFi principal">
                            {mode === "view" ? (
                                <ViewField value={data?.wifiNombre} />
                            ) : (
                                <Form.Item name="wifiNombre" noStyle>
                                    <Input prefix={<WifiOutlined />} />
                                </Form.Item>
                            )}
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item label="Clave WiFi">
                            {mode === "view" ? (
                                <ViewField value={data?.wifiClaveRef} />
                            ) : (
                                <Form.Item name="wifiClaveRef" noStyle>
                                    <Input />
                                </Form.Item>
                            )}
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Card>
    );
};

export default IspTab;