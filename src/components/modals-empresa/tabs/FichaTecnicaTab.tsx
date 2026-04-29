// ./../modals-empresa/tabs/FichaTecnicaTab.tsx
import React, { useEffect, useState } from "react";
import {
    Card,
    Button,
    Form,
    Input,
    message,
    Space,
    Row,
    Col,
    Badge,
    Tooltip,
} from "antd";
import {
    EditOutlined,
    SaveOutlined,
    UserOutlined,
    CalendarOutlined,
    DesktopOutlined,
    ToolOutlined,
    SafetyOutlined,
    CloudOutlined,
    GlobalOutlined,
    DatabaseOutlined,
    CommentOutlined,
    EyeInvisibleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { http } from "../../../service/http";  // ajusta ruta

dayjs.extend(utc);

interface Props {
    empresaId: number;
    canEdit?: boolean;
}

const hasValue = (value: any): boolean => {
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
};

const toDateInputValue = (date?: string | Date | null) => {
    if (!date) return undefined;
    return dayjs.utc(date).format("YYYY-MM-DD");
};

const FichaTecnicaTab: React.FC<Props> = ({ empresaId, canEdit = true }) => {
    const [form] = Form.useForm();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeView, setActiveView] = useState<'view' | 'edit'>('view');

    const loadFicha = async () => {
        try {
            setLoading(true);
            const { data: json } = await http.get(`/ficha-empresa/${empresaId}/ficha-tecnica`);
            setData(json);
            form.setFieldsValue({
                ...json,
                fechaUltimaVisita: toDateInputValue(json.fechaUltimaVisita),
                proximaVisitaProgramada: toDateInputValue(json.proximaVisitaProgramada),
                ultimaRestauracion: toDateInputValue(json.ultimaRestauracion),
            });
        } catch {
            message.error("No se pudo cargar la ficha técnica");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setActiveView("view");
        setData(null);
        form.resetFields();
        loadFicha();
    }, [empresaId]);

    const onSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);
            await http.put(`/ficha-empresa/${empresaId}/ficha-tecnica`, values);
            message.success("Ficha técnica guardada exitosamente");
            setActiveView('view');
            loadFicha();
        } catch {
            message.error("No se pudo guardar la ficha técnica");
        } finally {
            setSaving(false);
        }
    };

    const renderViewMode = () => {
        if (!data) return null;

        const sections = [
            {
                key: 'visitas', title: "Técnicos y Visitas", icon: <UserOutlined />,
                items: [
                    { label: "Técnico principal", value: data.tecnicoPrincipal, icon: <UserOutlined /> },
                    { label: "Técnicos de respaldo", value: data.tecnicosRespaldo, icon: <UserOutlined /> },
                    { label: "Última visita", value: data.fechaUltimaVisita ? dayjs.utc(data.fechaUltimaVisita).format("DD-MM-YYYY") : null, icon: <CalendarOutlined /> },
                    { label: "Próxima visita", value: data.proximaVisitaProgramada ? dayjs.utc(data.proximaVisitaProgramada).format("DD-MM-YYYY") : null, icon: <CalendarOutlined /> },
                    { label: "Observaciones", value: data.observacionesVisita, icon: <CommentOutlined /> }
                ]
            },
            {
                key: 'hardware', title: "Hardware", icon: <DesktopOutlined />,
                items: [
                    { label: "PCs / Notebooks", value: data.pcsNotebooks, icon: <DesktopOutlined /> },
                    { label: "Servidores", value: data.servidores, icon: <DatabaseOutlined /> },
                    { label: "Impresoras / Periféricos", value: data.impresorasPerifericos, icon: <ToolOutlined /> },
                    { label: "Otros equipos", value: data.otrosEquipos, icon: <ToolOutlined /> }
                ]
            },
            {
                key: 'software', title: "Software", icon: <ToolOutlined />,
                items: [
                    { label: "Sistemas operativos", value: data.sistemasOperativos, icon: <ToolOutlined /> },
                    { label: "Aplicaciones críticas", value: data.aplicacionesCriticas, icon: <ToolOutlined /> },
                    { label: "Licencias vigentes", value: data.licenciasVigentes, icon: <SafetyOutlined /> },
                    { label: "Antivirus / Seguridad", value: data.antivirusSeguridad, icon: <SafetyOutlined /> }
                ]
            },
            {
                key: 'red', title: "Red e Internet", icon: <CloudOutlined />,
                items: [
                    { label: "Proveedor de internet", value: data.proveedorInternet, icon: <CloudOutlined /> },
                    { label: "Velocidad contratada", value: data.velocidadContratada, icon: <CloudOutlined /> },
                    { label: "Routers / Switches", value: data.routersSwitches, icon: <ToolOutlined /> },
                    { label: "Configuración IP", value: data.configuracionIP, icon: <ToolOutlined /> }
                ]
            },
            {
                key: 'web', title: "Web y Comunicaciones", icon: <GlobalOutlined />,
                items: [
                    { label: "Dominio web", value: data.dominioWeb, icon: <GlobalOutlined /> },
                    { label: "Hosting / Proveedor", value: data.hostingProveedor, icon: <CloudOutlined /> },
                    { label: "Certificado SSL", value: data.certificadoSSL, icon: <SafetyOutlined /> },
                    { label: "Correos corporativos", value: data.correosCorporativos, icon: <UserOutlined /> },
                    { label: "Redes sociales", value: data.redesSociales, icon: <GlobalOutlined /> }
                ]
            },
            {
                key: 'backup', title: "Respaldo y Recuperación", icon: <DatabaseOutlined />,
                items: [
                    { label: "Método de respaldo", value: data.metodoRespaldo, icon: <DatabaseOutlined /> },
                    { label: "Frecuencia", value: data.frecuenciaRespaldo, icon: <CalendarOutlined /> },
                    { label: "Responsable", value: data.responsableRespaldo, icon: <UserOutlined /> },
                    { label: "Última restauración", value: data.ultimaRestauracion ? dayjs.utc(data.ultimaRestauracion).format("DD-MM-YYYY") : null, icon: <CalendarOutlined /> }
                ]
            }
        ];

        return (
            <div className="space-y-6">
                {sections.map(section => (
                    <Card key={section.key} size="small" className="shadow-sm border-l-4 border-l-blue-500"
                        title={<div className="flex items-center">{section.icon}<span className="ml-2 font-medium">{section.title}</span></div>}
                    >
                        <Row gutter={[16, 16]}>
                            {section.items.map((item, index) => (
                                hasValue(item.value) && (
                                    <Col xs={24} sm={12} md={12} lg={8} key={index}>
                                        <div className="p-3 bg-gray-50 rounded">
                                            <div className="flex items-center mb-1">
                                                {item.icon}
                                                <span className="ml-2 text-xs text-gray-500 font-medium">{item.label}</span>
                                            </div>
                                            <p className="text-sm font-medium m-0">
                                                {item.value === true ? "Sí" : item.value === false ? "No" : item.value}
                                            </p>
                                        </div>
                                    </Col>
                                )
                            ))}
                        </Row>
                        {section.items.every(item => !hasValue(item.value)) && (
                            <div className="text-center py-4 text-gray-400">
                                <EyeInvisibleOutlined className="text-lg mb-2" />
                                <p className="m-0">No hay información registrada</p>
                            </div>
                        )}
                    </Card>
                ))}
            </div>
        );
    };

    const renderEditMode = () => (
        <Form layout="vertical" form={form} className="space-y-6">
            <Card title={<div className="flex items-center"><UserOutlined className="text-blue-500 mr-2" />Técnicos y Visitas</div>} size="small" className="shadow-sm">
                <Row gutter={16}>
                    <Col span={12}><Form.Item name="tecnicoPrincipal" label="Técnico responsable principal"><Input placeholder="Nombre del técnico principal" /></Form.Item></Col>
                    <Col span={12}><Form.Item name="tecnicosRespaldo" label="Técnicos de respaldo"><Input placeholder="Nombres de técnicos de respaldo" /></Form.Item></Col>
                    <Col span={12}><Form.Item name="fechaUltimaVisita" label="Fecha última visita"><Input type="date" /></Form.Item></Col>
                    <Col span={12}><Form.Item name="proximaVisitaProgramada" label="Próxima visita programada"><Input type="date" /></Form.Item></Col>
                    <Col span={24}><Form.Item name="observacionesVisita" label="Observaciones de visita"><Input.TextArea rows={3} placeholder="Observaciones importantes..." /></Form.Item></Col>
                </Row>
            </Card>

            <Card title={<div className="flex items-center"><DesktopOutlined className="text-blue-500 mr-2" />Equipos y Hardware</div>} size="small" className="shadow-sm">
                <Row gutter={16}>
                    <Col span={12}><Form.Item name="pcsNotebooks" label="PCs / Notebooks"><Input placeholder="Cantidad y especificaciones" /></Form.Item></Col>
                    <Col span={12}><Form.Item name="servidores" label="Servidores"><Input placeholder="Cantidad y especificaciones" /></Form.Item></Col>
                    <Col span={12}><Form.Item name="impresorasPerifericos" label="Impresoras / periféricos"><Input placeholder="Cantidad y tipos" /></Form.Item></Col>
                    <Col span={12}><Form.Item name="otrosEquipos" label="Otros equipos"><Input placeholder="Otros equipos relevantes" /></Form.Item></Col>
                </Row>
            </Card>

            <Card title={<div className="flex items-center"><ToolOutlined className="text-blue-500 mr-2" />Software</div>} size="small" className="shadow-sm">
                <Row gutter={16}>
                    <Col span={12}><Form.Item name="sistemasOperativos" label="Sistemas operativos"><Input placeholder="Windows, Linux, macOS, etc." /></Form.Item></Col>
                    <Col span={12}><Form.Item name="aplicacionesCriticas" label="Aplicaciones críticas"><Input placeholder="Software crítico para el negocio" /></Form.Item></Col>
                    <Col span={12}><Form.Item name="licenciasVigentes" label="Licencias vigentes"><Input placeholder="Información de licencias" /></Form.Item></Col>
                    <Col span={12}><Form.Item name="antivirusSeguridad" label="Antivirus / seguridad"><Input placeholder="Software de seguridad instalado" /></Form.Item></Col>
                </Row>
            </Card>

            <Card title={<div className="flex items-center"><CloudOutlined className="text-blue-500 mr-2" />Red e Internet</div>} size="small" className="shadow-sm">
                <Row gutter={16}>
                    <Col span={12}><Form.Item name="proveedorInternet" label="Proveedor de internet"><Input placeholder="Nombre del proveedor" /></Form.Item></Col>
                    <Col span={12}><Form.Item name="velocidadContratada" label="Velocidad contratada"><Input placeholder="Ej: 100 Mbps" /></Form.Item></Col>
                    <Col span={12}><Form.Item name="routersSwitches" label="Routers / switches"><Input placeholder="Equipos de red" /></Form.Item></Col>
                    <Col span={12}><Form.Item name="configuracionIP" label="Configuración IP"><Input placeholder="Rango IP y configuración" /></Form.Item></Col>
                </Row>
            </Card>

            <Card title={<div className="flex items-center"><GlobalOutlined className="text-blue-500 mr-2" />Web y Comunicaciones</div>} size="small" className="shadow-sm">
                <Row gutter={16}>
                    <Col span={12}><Form.Item name="dominioWeb" label="Dominio web"><Input placeholder="Ej: midominio.com" /></Form.Item></Col>
                    <Col span={12}><Form.Item name="hostingProveedor" label="Hosting / proveedor"><Input placeholder="Proveedor de hosting" /></Form.Item></Col>
                    <Col span={12}><Form.Item name="certificadoSSL" label="Certificado SSL"><Input placeholder="Información del certificado" /></Form.Item></Col>
                    <Col span={12}><Form.Item name="correosCorporativos" label="Correos corporativos"><Input placeholder="Sistema de correo corporativo" /></Form.Item></Col>
                    <Col span={24}><Form.Item name="redesSociales" label="Redes sociales"><Input placeholder="Redes sociales oficiales" /></Form.Item></Col>
                </Row>
            </Card>

            <Card title={<div className="flex items-center"><DatabaseOutlined className="text-blue-500 mr-2" />Respaldo y Recuperación</div>} size="small" className="shadow-sm">
                <Row gutter={16}>
                    <Col span={12}><Form.Item name="metodoRespaldo" label="Método de respaldo"><Input placeholder="Ej: Nube, disco externo, etc." /></Form.Item></Col>
                    <Col span={12}><Form.Item name="frecuenciaRespaldo" label="Frecuencia de respaldo"><Input placeholder="Ej: Diario, semanal, etc." /></Form.Item></Col>
                    <Col span={12}><Form.Item name="responsableRespaldo" label="Responsable del respaldo"><Input placeholder="Persona responsable" /></Form.Item></Col>
                    <Col span={12}><Form.Item name="ultimaRestauracion" label="Última restauración probada"><Input type="date" /></Form.Item></Col>
                </Row>
            </Card>
        </Form>
    );

    return (
        <Card
            loading={loading}
            className="shadow-sm border-0"
            title={
                <div className="flex items-center">
                    <ToolOutlined className="text-blue-500 mr-2" />
                    <span className="font-semibold">Ficha Técnica del Cliente</span>
                    <Badge count={activeView === 'view' ? "Vista" : "Edición"} style={{ backgroundColor: activeView === 'view' ? '#52c41a' : '#1890ff', marginLeft: 12 }} />
                </div>
            }
            extra={
                <Space>
                    {activeView === 'view' ? (
                        <Tooltip title="Editar ficha técnica">
                            {canEdit && (
                                <Button type="primary" icon={<EditOutlined />} onClick={() => setActiveView('edit')}>Editar</Button>
                            )}
                        </Tooltip>
                    ) : (
                        <>
                            <Tooltip title="Cancelar edición">
                                <Button onClick={() => { setActiveView('view'); form.resetFields(); }}>Cancelar</Button>
                            </Tooltip>
                            <Tooltip title="Guardar cambios">
                                {canEdit && (
                                    <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={onSave}>Guardar</Button>
                                )}
                            </Tooltip>
                        </>
                    )}
                </Space>
            }
        >
            {!loading && data && (activeView === "view" ? renderViewMode() : renderEditMode())}
        </Card>
    );
};

export default FichaTecnicaTab;