import React, { useEffect, useState } from "react";
import {
    Card,
    Descriptions,
    Button,
    Form,
    Input,
    message,
    Space
} from "antd";
import { EditOutlined, SaveOutlined } from "@ant-design/icons";

import type { FichaTabProps } from "../types";

const API_URL =
    (import.meta as ImportMeta).env?.VITE_API_URL ||
    "http://localhost:4000/api";

/* ===================== Componente ===================== */
const FichaTab: React.FC<FichaTabProps> = ({
    empresa,
    ficha,
    detalleEmpresa,
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
        });

    }, [empresa, ficha, detalleEmpresa, form]);

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
                    }),
                }
            );

            if (!res.ok) throw new Error();

            message.success("Ficha actualizada correctamente");
            setEditing(false);
            onUpdated?.(); // 👈 AQUÍ
        } catch {
            message.error("No se pudo guardar la ficha");
        } finally {
            setSaving(false);
        }
    };

    /* ===================== UI ===================== */
    return (
        <Card
            title={`Ficha Empresa · ${empresa.nombre}`}
            extra={
                <Space>
                    {!editing ? (
                        <Button
                            icon={<EditOutlined />}
                            onClick={() => setEditing(true)}
                        >
                            Editar
                        </Button>
                    ) : (
                        <Button
                            type="primary"
                            icon={<SaveOutlined />}
                            loading={saving}
                            onClick={onSave}
                        >
                            Guardar
                        </Button>
                    )}
                </Space>
            }
        >
            {!editing ? (
                <Descriptions column={1} bordered>
                    <Descriptions.Item label="Razón social">
                        {empresa.razonSocial || "—"}
                    </Descriptions.Item>

                    <Descriptions.Item label="RUT">
                        {detalleEmpresa?.rut || "—"}
                    </Descriptions.Item>

                    <Descriptions.Item label="Dirección">
                        {detalleEmpresa?.direccion || "—"}
                    </Descriptions.Item>

                    <Descriptions.Item label="Condiciones comerciales">
                        {ficha.condicionesComerciales || "—"}
                    </Descriptions.Item>

                    <Descriptions.Item label="Fecha creación ficha">
                        {new Date(ficha.creadaEn).toLocaleDateString("es-CL")}
                    </Descriptions.Item>
                </Descriptions>
            ) : (
                <Form layout="vertical" form={form}>
                    <Form.Item label="Razón social" name="razonSocial">
                        <Input />
                    </Form.Item>

                    <Form.Item label="RUT" name="rut">
                        <Input />
                    </Form.Item>

                    <Form.Item label="Dirección" name="direccion">
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Condiciones comerciales"
                        name="condicionesComerciales"
                    >
                        <Input.TextArea rows={4} />
                    </Form.Item>
                </Form>
            )}
        </Card>
    );
};

export default FichaTab;