// ./../modals-empresa/tabs/RedesTab.tsx
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
import { http } from "../../../service/http";

interface Props {
    empresaId: number;
    canEdit?: boolean;
}

const IspTab: React.FC<Props> = ({ empresaId, canEdit = true }) => {
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
                http.get(`/ficha-empresa/${empresaId}/isp`),
                http.get(`/ficha-empresa/${empresaId}/sucursales`),
            ]);

            setIsps(ispRes.data);
            setSucursales(sucRes.data);
        } catch {
            message.error("Error cargando redes");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [empresaId]);

    const openCreate = () => {
        if (!canEdit) return;

        setEditing(null);
        form.resetFields();
        setModalOpen(true);
    };

    const openEdit = (isp: any) => {
        if (!canEdit) return;

        setEditing(isp);
        form.setFieldsValue(isp);
        setModalOpen(true);
    };

    const save = async () => {
        if (!canEdit) {
            message.warning("No tienes permisos para editar redes");
            return;
        }

        try {
            const values = await form.validateFields();

            if (editing) {
                await http.put(`/ficha-empresa/isp/${editing.id}`, values);
            } else {
                await http.post(`/ficha-empresa/${empresaId}/isp`, values);
            }

            message.success("Red guardada");
            setModalOpen(false);
            await load();
        } catch {
            message.error("Error guardando red");
        }
    };

    const remove = async (id: number) => {
        if (!canEdit) return;

        try {
            await http.delete(`/ficha-empresa/isp/${id}`);
            message.success("Red eliminada");
            await load();
        } catch {
            message.error("Error eliminando red");
        }
    };

    const setPrincipal = async (isp: any) => {
        if (!canEdit) return;

        try {
            await http.put(`/ficha-empresa/isp/${isp.id}`, {
                ...isp,
                esPrincipal: true,
            });

            await load();
        } catch {
            message.error("Error actualizando red principal");
        }
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
                canEdit ? (
                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                        Nueva Red
                    </Button>
                ) : null
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
                        canEdit ? (
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
                        ) : null
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
                            <b>Sucursal:</b> {isp.sucursal?.nombre || "Empresa (General)"}
                        </Col>
                    </Row>
                </Card>
            ))}

            {canEdit && (
                <Modal
                    open={modalOpen}
                    onCancel={() => setModalOpen(false)}
                    onOk={save}
                    title={editing ? "Editar Red" : "Nueva Red"}
                    destroyOnClose
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

                        <Form.Item name="esPrincipal" label="¿Es principal?">
                            <Select
                                options={[
                                    { label: "Sí (Principal)", value: true },
                                    { label: "No", value: false },
                                ]}
                            />
                        </Form.Item>
                    </Form>
                </Modal>
            )}
        </Card>
    );
};

export default IspTab;