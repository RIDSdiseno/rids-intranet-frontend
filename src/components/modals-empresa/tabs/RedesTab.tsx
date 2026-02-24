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
import { api } from "../../../api/api"; // 🔥 ajusta ruta

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

    const load = async () => {
        setLoading(true);
        try {
            const [ispRes, sucRes] = await Promise.all([
                api.get(`/ficha-empresa/${empresaId}/isp`),
                api.get(`/ficha-empresa/${empresaId}/sucursales`),
            ]);
            setIsps(ispRes.data);
            setSucursales(sucRes.data);
        } catch {
            message.error("Error cargando redes");
        }
        setLoading(false);
    };

    useEffect(() => { load(); }, [empresaId]);

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
                await api.put(`/ficha-empresa/isp/${editing.id}`, values);
            } else {
                await api.post(`/ficha-empresa/${empresaId}/isp`, values);
            }
            message.success("Red guardada");
            setModalOpen(false);
            load();
        } catch {
            message.error("Error guardando red");
        }
    };

    const remove = async (id: number) => {
        try {
            await api.delete(`/ficha-empresa/isp/${id}`);
            message.success("Red eliminada");
            load();
        } catch {
            message.error("Error eliminando red");
        }
    };

    const setPrincipal = async (isp: any) => {
        try {
            await api.put(`/ficha-empresa/isp/${isp.id}`, { ...isp, esPrincipal: true });
            load();
        } catch {
            message.error("Error actualizando red principal");
        }
    };

    return (
        <Card
            loading={loading}
            title={<div><CloudOutlined /> Redes / ISP</div>}
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
                            {isp.esPrincipal && <Tag color="gold"><StarFilled /> Principal</Tag>}
                            {isp.operador || "Sin operador"}
                        </Space>
                    }
                    extra={
                        <Space>
                            {!isp.esPrincipal && (
                                <Button size="small" onClick={() => setPrincipal(isp)}>Hacer Principal</Button>
                            )}
                            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(isp)} />
                            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => remove(isp.id)} />
                        </Space>
                    }
                >
                    <Row gutter={12}>
                        <Col span={12}><b>Servicio:</b> {isp.servicio || "—"}</Col>
                        <Col span={12}><b>IP:</b> {isp.ipRed || "—"}</Col>
                        <Col span={12}><b>WiFi:</b> {isp.wifiNombre || "—"}</Col>
                        <Col span={12}><b>Sucursal:</b> {isp.sucursal?.nombre || "Empresa (General)"}</Col>
                    </Row>
                </Card>
            ))}

            <Modal open={modalOpen} onCancel={() => setModalOpen(false)} onOk={save} title={editing ? "Editar Red" : "Nueva Red"}>
                <Form layout="vertical" form={form}>
                    <Form.Item name="operador" label="Operador"><Input /></Form.Item>
                    <Form.Item name="servicio" label="Servicio"><Input /></Form.Item>
                    <Form.Item name="ipRed" label="IP Pública"><Input /></Form.Item>
                    <Form.Item name="wifiNombre" label="WiFi"><Input /></Form.Item>
                    <Form.Item name="telefono" label="Teléfono ISP"><Input /></Form.Item>
                    <Form.Item name="sucursalId" label="Sucursal">
                        <Select allowClear placeholder="Seleccionar sucursal">
                            {sucursales.map((s) => (
                                <Select.Option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="esPrincipal" label="¿Es principal?">
                        <Select options={[{ label: "Sí (Principal)", value: true }, { label: "No", value: false }]} />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default IspTab;