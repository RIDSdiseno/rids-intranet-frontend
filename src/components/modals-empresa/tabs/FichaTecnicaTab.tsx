import React, { useEffect, useState } from "react";
import {
    Card,
    Descriptions,
    Button,
    Form,
    Input,
    Divider,
    message,
    Space,
} from "antd";
import { EditOutlined, SaveOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const API_URL =
    (import.meta as ImportMeta).env?.VITE_API_URL ||
    "http://localhost:4000/api";

interface Props {
    empresaId: number;
}

const FichaTecnicaTab: React.FC<Props> = ({ empresaId }) => {
    const [form] = Form.useForm();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    /* ===================== LOAD ===================== */
    const loadFicha = async () => {
        try {
            setLoading(true);
            const res = await fetch(
                `${API_URL}/ficha-empresa/${empresaId}/ficha-tecnica`
            );
            const json = await res.json();
            setData(json);
            form.setFieldsValue(json ?? {});
        } catch {
            message.error("No se pudo cargar la ficha técnica");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFicha();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [empresaId]);

    /* ===================== SAVE ===================== */
    const onSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);

            const res = await fetch(
                `${API_URL}/ficha-empresa/${empresaId}/ficha-tecnica`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(values),
                }
            );

            if (!res.ok) throw new Error();

            message.success("Ficha técnica guardada");
            setEditing(false);
            loadFicha(); // 🔁 refresca datos
        } catch {
            message.error("No se pudo guardar la ficha técnica");
        } finally {
            setSaving(false);
        }
    };

    /* ===================== UI ===================== */
    return (
        <Card
            title="Ficha técnica del cliente"
            extra={
                <Space>
                    {!editing ? (
                        <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>
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
                    <Descriptions.Item label="Técnico responsable principal">
                        {data?.tecnicoPrincipal || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Técnicos de respaldo">
                        {data?.tecnicosRespaldo || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Fecha última visita">
                        {data?.fechaUltimaVisita
                            ? dayjs(data.fechaUltimaVisita).format("DD-MM-YYYY")
                            : "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Próxima visita programada">
                        {data?.proximaVisitaProgramada
                            ? dayjs(data.proximaVisitaProgramada).format("DD-MM-YYYY")
                            : "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Observaciones de visita">
                        {data?.observacionesVisita || "—"}
                    </Descriptions.Item>

                    <Divider />

                    <Descriptions.Item label="PCs / Notebooks">
                        {data?.pcsNotebooks || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Servidores">
                        {data?.servidores || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Impresoras / periféricos">
                        {data?.impresorasPerifericos || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Otros equipos">
                        {data?.otrosEquipos || "—"}
                    </Descriptions.Item>

                    <Divider />

                    <Descriptions.Item label="Sistemas operativos">
                        {data?.sistemasOperativos || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Aplicaciones críticas">
                        {data?.aplicacionesCriticas || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Licencias vigentes">
                        {data?.licenciasVigentes || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Antivirus / seguridad">
                        {data?.antivirusSeguridad || "—"}
                    </Descriptions.Item>

                    <Divider />

                    <Descriptions.Item label="Proveedor de internet">
                        {data?.proveedorInternet || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Velocidad contratada">
                        {data?.velocidadContratada || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Routers / switches">
                        {data?.routersSwitches || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Configuración IP">
                        {data?.configuracionIP || "—"}
                    </Descriptions.Item>

                    <Divider />

                    <Descriptions.Item label="Dominio web">
                        {data?.dominioWeb || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Hosting / proveedor">
                        {data?.hostingProveedor || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Certificado SSL">
                        {data?.certificadoSSL || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Correos corporativos">
                        {data?.correosCorporativos || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Redes sociales">
                        {data?.redesSociales || "—"}
                    </Descriptions.Item>

                    <Divider />

                    <Descriptions.Item label="Método de respaldo">
                        {data?.metodoRespaldo || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Frecuencia de respaldo">
                        {data?.frecuenciaRespaldo || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Responsable del respaldo">
                        {data?.responsableRespaldo || "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Última restauración probada">
                        {data?.ultimaRestauracion
                            ? dayjs(data.ultimaRestauracion).format("DD-MM-YYYY")
                            : "—"}
                    </Descriptions.Item>
                </Descriptions>
            ) : (
                <Form layout="vertical" form={form}>

                    <Divider>Técnicos / Visitas</Divider>

                    <Form.Item name="tecnicoPrincipal" label="Técnico responsable principal">
                        <Input />
                    </Form.Item>

                    <Form.Item name="tecnicosRespaldo" label="Técnicos de respaldo">
                        <Input />
                    </Form.Item>

                    <Form.Item name="fechaUltimaVisita" label="Fecha última visita">
                        <Input type="date" />
                    </Form.Item>

                    <Form.Item name="proximaVisitaProgramada" label="Próxima visita programada">
                        <Input type="date" />
                    </Form.Item>

                    <Form.Item name="observacionesVisita" label="Observaciones de visita">
                        <Input.TextArea rows={3} />
                    </Form.Item>

                    <Divider>Equipos y hardware</Divider>

                    <Form.Item name="pcsNotebooks" label="PCs / Notebooks">
                        <Input />
                    </Form.Item>

                    <Form.Item name="servidores" label="Servidores">
                        <Input />
                    </Form.Item>

                    <Form.Item name="impresorasPerifericos" label="Impresoras / periféricos">
                        <Input />
                    </Form.Item>

                    <Form.Item name="otrosEquipos" label="Otros equipos">
                        <Input />
                    </Form.Item>

                    <Divider>Software</Divider>

                    <Form.Item name="sistemasOperativos" label="Sistemas operativos">
                        <Input />
                    </Form.Item>

                    <Form.Item name="aplicacionesCriticas" label="Aplicaciones críticas">
                        <Input />
                    </Form.Item>

                    <Form.Item name="licenciasVigentes" label="Licencias vigentes">
                        <Input />
                    </Form.Item>

                    <Form.Item name="antivirusSeguridad" label="Antivirus / seguridad">
                        <Input />
                    </Form.Item>

                    <Divider>Respaldo</Divider>

                    <Form.Item name="metodoRespaldo" label="Método de respaldo">
                        <Input />
                    </Form.Item>

                    <Form.Item name="frecuenciaRespaldo" label="Frecuencia">
                        <Input />
                    </Form.Item>

                    <Form.Item name="responsableRespaldo" label="Responsable">
                        <Input />
                    </Form.Item>

                    <Form.Item name="ultimaRestauracion" label="Última restauración probada">
                        <Input type="date" />
                    </Form.Item>

                </Form>

            )}
        </Card>
    );
};

export default FichaTecnicaTab;
