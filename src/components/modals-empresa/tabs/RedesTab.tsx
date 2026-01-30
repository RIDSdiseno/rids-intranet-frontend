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
            <Form
                layout="vertical" form={form} disabled={mode === "view"}>
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item name="operador" label="Operador / Proveedor">
                            <Input prefix={<CloudOutlined />} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="telefono" label="Teléfono ISP">
                            <Input prefix={<PhoneOutlined />} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="servicio" label="Servicio contratado">
                            <Input placeholder="Fibra 600Mbps, enlace dedicado, respaldo" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="ipRed" label="IP pública">
                            <Input placeholder="200.xxx.xxx.xxx" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="numeroTicket" label="N° Ticket ISP">
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="wifiNombre" label="WiFi principal">
                            <Input prefix={<WifiOutlined />} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="wifiClaveRef" label="Clave WiFi">
                            <Input />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Card>
    );
};

export default IspTab;