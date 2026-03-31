import { useEffect, useState } from "react";
import {
    Card,
    Tabs,
    Input,
    Switch,
    Button,
    Space,
    message,
    Spin,
    Row,
    Col,
    Empty,
    Typography,
    Divider,
    Select,
    Upload,
} from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import type { UploadProps } from "antd";
import { useNavigate } from "react-router-dom";

import { api } from "../../../api/api";
import TicketTemplateEditor from "../reply-templates/TemplateEditor";

const { Text } = Typography;

type TemplateVariable = {
    token: string;
    label: string;
    description: string;
    group: "cliente" | "ticket" | "mensaje" | "tecnico" | "firma";
};

const VARIABLE_META: TemplateVariable[] = [
    {
        token: "{{nombre}}",
        label: "Nombre del cliente",
        description: "Nombre del solicitante o cliente",
        group: "cliente",
    },
    {
        token: "{{ticketId}}",
        label: "Número de ticket",
        description: "Identificador del ticket",
        group: "ticket",
    },
    {
        token: "{{subject}}",
        label: "Asunto del ticket",
        description: "Título o asunto del ticket",
        group: "ticket",
    },
    {
        token: "{{bodyOriginal}}",
        label: "Mensaje original",
        description: "Contenido original enviado por el cliente",
        group: "mensaje",
    },
    {
        token: "{{messageHtml}}",
        label: "Mensaje en HTML",
        description: "Versión HTML del mensaje",
        group: "mensaje",
    },
    {
        token: "{{firmaHtml}}",
        label: "Firma predeterminada",
        description: "Firma HTML configurada por defecto",
        group: "firma",
    },
    {
        token: "{{nombreTecnico}}",
        label: "Nombre del técnico",
        description: "Nombre del técnico asignado",
        group: "tecnico",
    },
    {
        token: "{{emailTecnico}}",
        label: "Correo del técnico",
        description: "Correo del técnico asignado",
        group: "tecnico",
    },
    {
        token: "{{cargoTecnico}}",
        label: "Cargo del técnico",
        description: "Cargo del técnico asignado",
        group: "tecnico",
    },
    {
        token: "{{areaTecnico}}",
        label: "Área del técnico",
        description: "Área del técnico asignado",
        group: "tecnico",
    },
];

type Template = {
    id: number;
    key: "AUTO_REPLY_INBOUND" | "TICKET_CREATED_WEB" | "AGENT_REPLY";
    name: string;
    subjectTpl: string;
    bodyHtmlTpl: string;
    isEnabled: boolean;
};

type PreviewState = Record<string, { subject: string; bodyHtml: string }>;

type SignatureSettings = {
    id?: number;
    nombre: string;
    cargo: string;
    area: string;
    email: string;
    telefono?: string;
    sitioWeb1?: string;
    sitioWeb2?: string;
    imageUrl?: string;
    isEnabled: boolean;
};

type TecnicoOption = {
    id_tecnico: number;
    nombre: string;
};

type TecnicoSignature = {
    id_tecnico?: number;
    nombre?: string;
    email?: string;
    cargo?: string;
    area?: string;
    firmaTexto?: string;
    firma?: {
        id: number;
        path: string;
        mimeType: string;
        size: number;
    } | null;
};

export default function TicketEmailTemplatesPage() {
    const navigate = useNavigate();

    const [mainTab, setMainTab] = useState<"templates" | "signature">("templates");
    const [signatureTab, setSignatureTab] = useState<"default" | "technician">("default");

    const [items, setItems] = useState<Template[]>([]);
    const [availableVariables, setAvailableVariables] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [savingKey, setSavingKey] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState<string | null>(null);
    const [preview, setPreview] = useState<PreviewState>({});
    const [activeKey, setActiveKey] = useState<string>("");

    const [signature, setSignature] = useState<SignatureSettings>({
        nombre: "",
        cargo: "",
        area: "",
        email: "",
        telefono: "",
        sitioWeb1: "",
        sitioWeb2: "",
        imageUrl: "",
        isEnabled: true,
    });

    const [savingSignature, setSavingSignature] = useState(false);
    const [signaturePreview, setSignaturePreview] = useState("");

    const [tecnicos, setTecnicos] = useState<TecnicoOption[]>([]);
    const [selectedTecnicoId, setSelectedTecnicoId] = useState<number | undefined>();
    const [tecnicoSignature, setTecnicoSignature] = useState<TecnicoSignature>({});
    const [loadingTecnicoSignature, setLoadingTecnicoSignature] = useState(false);
    const [savingTecnicoSignature, setSavingTecnicoSignature] = useState(false);
    const [uploadingTecnicoSignature, setUploadingTecnicoSignature] = useState(false);

    const [bodyInsertToken, setBodyInsertToken] = useState<string | null>(null);

    const defaultLogo =
        "https://res.cloudinary.com/dvqpmttci/image/upload/v1774008233/Logo_Firma_bcm1bs.gif";

    const loadTemplates = async () => {
        try {
            const { data } = await api.get("/helpdesk/tickets/email-templates");

            const templates = Array.isArray(data?.data) ? data.data : [];
            const variables = Array.isArray(data?.availableVariables)
                ? data.availableVariables
                : [];

            setItems(templates);
            setAvailableVariables(variables);

            if (templates.length > 0) {
                setActiveKey((prev) => prev || templates[0].key);
            }
        } catch (error) {
            console.error("Error cargando plantillas:", error);
            message.error("No se pudieron cargar las plantillas");
            setItems([]);
        }
    };

    const loadSignature = async () => {
        try {
            const { data } = await api.get("/helpdesk/tickets/email-signature");

            if (data?.ok && data?.data) {
                setSignature({
                    id: data.data.id,
                    nombre: data.data.nombre ?? "",
                    cargo: data.data.cargo ?? "",
                    area: data.data.area ?? "",
                    email: data.data.email ?? "",
                    telefono: data.data.telefono ?? "",
                    sitioWeb1: data.data.sitioWeb1 ?? "",
                    sitioWeb2: data.data.sitioWeb2 ?? "",
                    imageUrl: data.data.imageUrl ?? "",
                    isEnabled: Boolean(data.data.isEnabled),
                });
            }
        } catch (error) {
            console.error("Error cargando firma:", error);
            message.error("No se pudo cargar la firma por defecto");
        }
    };

    const loadTecnicos = async () => {
        try {
            const { data } = await api.get("/tecnicos");
            const rows = Array.isArray(data) ? data : data?.data || [];
            setTecnicos(rows);
        } catch (error) {
            console.error("Error cargando técnicos:", error);
            message.error("No se pudieron cargar los técnicos");
            setTecnicos([]);
        }
    };

    const loadTecnicoSignature = async (tecnicoId: number) => {
        try {
            setLoadingTecnicoSignature(true);

            const { data } = await api.get(
                `/helpdesk/tickets/tecnicos/${tecnicoId}/signature`
            );

            if (data?.ok && data?.data) {
                setTecnicoSignature(data.data);
            } else {
                setTecnicoSignature({});
            }
        } catch (error) {
            console.error("Error cargando firma del técnico:", error);
            message.error("No se pudo cargar la firma del técnico");
            setTecnicoSignature({});
        } finally {
            setLoadingTecnicoSignature(false);
        }
    };

    const loadAll = async () => {
        try {
            setLoading(true);
            await Promise.all([loadTemplates(), loadSignature(), loadTecnicos()]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAll();
    }, []);

    useEffect(() => {
        const current = items.find((item) => item.key === activeKey);
        if (current && !preview[current.key]) {
            previewTemplate(current);
        }
    }, [activeKey, items]);

    useEffect(() => {
        if (selectedTecnicoId) {
            loadTecnicoSignature(selectedTecnicoId);
        } else {
            setTecnicoSignature({});
        }
    }, [selectedTecnicoId]);

    useEffect(() => {
        if (!signature.isEnabled) {
            setSignaturePreview("<p style='color:#999'>Firma desactivada</p>");
            return;
        }

        const html = `
<table cellpadding="0" cellspacing="0" style="margin-top:16px;">
  <tr>
    <td style="padding-right:16px; vertical-align:middle;">
      <img src="${signature.imageUrl || defaultLogo}" width="120" />
    </td>
    <td style="border-left:2px solid #ddd; padding-left:16px; vertical-align:middle; font-family:Arial, sans-serif; font-size:13px; color:#333; line-height:1.6;">
      <strong style="font-size:14px;">${signature.nombre || "Equipo de Soporte Técnico"}</strong><br/>
      <span style="color:#555;">${signature.cargo || "Soporte Técnico"}</span><br/>
      <span style="color:#555;">${signature.area || "Asesorías RIDS Ltda."}</span><br/>
      <a href="mailto:${signature.email || "soporte@rids.cl"}" style="color:#0ea5e9;">
        ${signature.email || "soporte@rids.cl"}
      </a><br/>
      ${signature.telefono ? `WhatsApp: ${signature.telefono}<br/>` : ""}
      ${signature.sitioWeb1 ? `<a href="http://${signature.sitioWeb1}" style="color:#0ea5e9;">${signature.sitioWeb1}</a>` : ""}
      ${signature.sitioWeb1 && signature.sitioWeb2 ? " · " : ""}
      ${signature.sitioWeb2 ? `<a href="http://${signature.sitioWeb2}" style="color:#0ea5e9;">${signature.sitioWeb2}</a>` : ""}
    </td>
  </tr>
</table>
        `;

        setSignaturePreview(html);
    }, [signature]);

    const updateLocal = (key: string, patch: Partial<Template>) => {
        setItems((prev) =>
            prev.map((item) => (item.key === key ? { ...item, ...patch } : item))
        );
    };

    const availableVariableMeta = VARIABLE_META.filter((item) =>
        availableVariables.includes(item.token)
    );

    const groupedVariables = {
        cliente: availableVariableMeta.filter((v) => v.group === "cliente"),
        ticket: availableVariableMeta.filter((v) => v.group === "ticket"),
        mensaje: availableVariableMeta.filter((v) => v.group === "mensaje"),
        tecnico: availableVariableMeta.filter((v) => v.group === "tecnico"),
        firma: availableVariableMeta.filter((v) => v.group === "firma"),
    };

    const saveTemplate = async (tpl: Template) => {
        try {
            setSavingKey(tpl.key);

            await api.put("/helpdesk/tickets/email-templates", {
                key: tpl.key,
                name: tpl.name,
                subjectTpl: tpl.subjectTpl,
                bodyHtmlTpl: tpl.bodyHtmlTpl,
                isEnabled: tpl.isEnabled,
            });

            message.success("Plantilla guardada correctamente");
            await previewTemplate(tpl);
        } catch (error) {
            console.error("Error guardando plantilla:", error);
            message.error("No se pudo guardar la plantilla");
        } finally {
            setSavingKey(null);
        }
    };

    const previewTemplate = async (tpl: Template) => {
        try {
            setPreviewLoading(tpl.key);

            const { data } = await api.post("/helpdesk/tickets/email-templates/preview", {
                key: tpl.key,
                subjectTpl: tpl.subjectTpl,
                bodyHtmlTpl: tpl.bodyHtmlTpl,
            });

            setPreview((prev) => ({
                ...prev,
                [tpl.key]: data.data,
            }));
        } catch (error) {
            console.error("Error generando preview:", error);
            message.error("No se pudo generar la vista previa");
        } finally {
            setPreviewLoading(null);
        }
    };

    const saveSignature = async () => {
        try {
            setSavingSignature(true);

            const { data } = await api.put("/helpdesk/tickets/email-signature", {
                nombre: signature.nombre,
                cargo: signature.cargo,
                area: signature.area,
                email: signature.email,
                telefono: signature.telefono,
                sitioWeb1: signature.sitioWeb1,
                sitioWeb2: signature.sitioWeb2,
                imageUrl: signature.imageUrl,
                isEnabled: signature.isEnabled,
            });

            if (!data?.ok) {
                throw new Error(data?.message || "No se pudo guardar la firma");
            }

            message.success("Firma por defecto guardada correctamente");
            await loadSignature();
        } catch (error: any) {
            console.error("Error guardando firma:", error);
            message.error(
                error?.response?.data?.message ||
                error?.message ||
                "No se pudo guardar la firma"
            );
        } finally {
            setSavingSignature(false);
        }
    };

    const saveTecnicoSignature = async () => {
        if (!selectedTecnicoId) {
            message.warning("Selecciona un técnico");
            return;
        }

        try {
            setSavingTecnicoSignature(true);

            const { data } = await api.put(
                `/helpdesk/tickets/tecnicos/${selectedTecnicoId}/signature`,
                {
                    cargo: tecnicoSignature.cargo,
                    area: tecnicoSignature.area,
                    firmaTexto: tecnicoSignature.firmaTexto,
                }
            );

            if (!data?.ok) {
                throw new Error(data?.message || "No se pudo guardar la firma del técnico");
            }

            message.success("Firma del técnico guardada correctamente");
            await loadTecnicoSignature(selectedTecnicoId);
        } catch (error: any) {
            console.error("Error guardando firma del técnico:", error);
            message.error(
                error?.response?.data?.message ||
                error?.message ||
                "No se pudo guardar la firma del técnico"
            );
        } finally {
            setSavingTecnicoSignature(false);
        }
    };

    const uploadTecnicoSignatureImage: UploadProps["beforeUpload"] = async (file) => {
        if (!selectedTecnicoId) {
            message.warning("Selecciona un técnico");
            return false;
        }

        try {
            setUploadingTecnicoSignature(true);

            const formData = new FormData();
            formData.append("file", file);

            const { data } = await api.post(
                `/helpdesk/tickets/tecnicos/${selectedTecnicoId}/signature/image`,
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            if (!data?.ok) {
                throw new Error(data?.message || "No se pudo subir la imagen");
            }

            message.success("Imagen de firma subida correctamente");
            await loadTecnicoSignature(selectedTecnicoId);
        } catch (error: any) {
            console.error("Error subiendo firma del técnico:", error);
            message.error(
                error?.response?.data?.message ||
                error?.message ||
                "No se pudo subir la imagen"
            );
        } finally {
            setUploadingTecnicoSignature(false);
        }

        return false;
    };

    const deleteTecnicoSignatureImage = async () => {
        if (!selectedTecnicoId) {
            message.warning("Selecciona un técnico");
            return;
        }

        try {
            const { data } = await api.delete(
                `/helpdesk/tickets/tecnicos/${selectedTecnicoId}/signature/image`
            );

            if (!data?.ok) {
                throw new Error(data?.message || "No se pudo eliminar la imagen");
            }

            message.success("Imagen eliminada correctamente");
            await loadTecnicoSignature(selectedTecnicoId);
        } catch (error: any) {
            console.error("Error eliminando firma del técnico:", error);
            message.error(
                error?.response?.data?.message ||
                error?.message ||
                "No se pudo eliminar la imagen"
            );
        }
    };

    const insertVariableInSubject = (tplKey: string, variable: string) => {
        setItems((prev) =>
            prev.map((item) =>
                item.key === tplKey
                    ? {
                        ...item,
                        subjectTpl: `${item.subjectTpl}${item.subjectTpl ? " " : ""}${variable}`,
                    }
                    : item
            )
        );
    };

    const insertVariableInBody = (_tplKey: string, variable: string) => {
        setBodyInsertToken(variable);
    };

    if (loading) {
        return (
            <div className="min-h-[300px] flex items-center justify-center">
                <Spin size="large" />
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <Card title="Configuración de correos - Tickets">
                <Empty description="No se encontraron plantillas configuradas" />
            </Card>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="mb-4">
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/helpdesk")}>
                    Volver
                </Button>
            </div>

            <Card
                title="Configuración de correos - Tickets"
                className="rounded-2xl shadow-sm"
            >
                <Tabs
                    activeKey={mainTab}
                    onChange={(key) => setMainTab(key as "templates" | "signature")}
                    items={[
                        {
                            key: "templates",
                            label: "Plantillas",
                            children: (
                                <Tabs
                                    activeKey={activeKey}
                                    onChange={setActiveKey}
                                    items={items.map((tpl) => ({
                                        key: tpl.key,
                                        label: tpl.name,
                                        children: (
                                            <Row gutter={[16, 16]}>
                                                <Col xs={24} xl={12}>
                                                    <Card size="small" title="Configuración" className="rounded-xl">
                                                        <Space direction="vertical" style={{ width: "100%" }} size={16}>
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <div className="font-medium">Activada</div>
                                                                    <Text type="secondary">
                                                                        Permite enviar esta plantilla automáticamente
                                                                    </Text>
                                                                </div>

                                                                <Switch
                                                                    checked={tpl.isEnabled}
                                                                    onChange={(checked) =>
                                                                        updateLocal(tpl.key, { isEnabled: checked })
                                                                    }
                                                                />
                                                            </div>

                                                            <div>
                                                                <div className="font-medium mb-2">Asunto</div>
                                                                <Input
                                                                    value={tpl.subjectTpl}
                                                                    onChange={(e) =>
                                                                        updateLocal(tpl.key, {
                                                                            subjectTpl: e.target.value,
                                                                        })
                                                                    }
                                                                    placeholder="Asunto del correo"
                                                                />

                                                                <div className="mt-3">
                                                                    <Text type="secondary">Insertar variables en asunto:</Text>

                                                                    <div className="mt-3 space-y-3">
                                                                        {[
                                                                            { title: "Cliente", items: groupedVariables.cliente },
                                                                            { title: "Ticket", items: groupedVariables.ticket },
                                                                            { title: "Técnico", items: groupedVariables.tecnico },
                                                                        ].map((group) =>
                                                                            group.items.length > 0 ? (
                                                                                <div key={group.title}>
                                                                                    <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                                                                                        {group.title}
                                                                                    </div>

                                                                                    <div className="flex flex-wrap gap-2">
                                                                                        {group.items.map((variable) => (
                                                                                            <Button
                                                                                                key={`subject-${tpl.key}-${variable.token}`}
                                                                                                size="small"
                                                                                                onClick={() => insertVariableInSubject(tpl.key, variable.token)}
                                                                                                title={variable.description}
                                                                                            >
                                                                                                {variable.label}
                                                                                            </Button>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            ) : null
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <Divider style={{ margin: "8px 0" }} />

                                                            <div>
                                                                <div className="font-medium mb-2">
                                                                    Contenido del correo
                                                                </div>
                                                                <Text type="secondary">
                                                                    Puedes editar el mensaje sin escribir HTML.
                                                                </Text>

                                                                <div className="mt-3">
                                                                    <TicketTemplateEditor
                                                                        value={tpl.bodyHtmlTpl}
                                                                        onChange={(value: string) =>
                                                                            updateLocal(tpl.key, {
                                                                                bodyHtmlTpl: value,
                                                                            })
                                                                        }
                                                                        insertToken={activeKey === tpl.key ? bodyInsertToken : null}
                                                                        onTokenInserted={() => setBodyInsertToken(null)}
                                                                    />
                                                                </div>
                                                            </div>

                                                            <div>
                                                                <div className="font-medium mb-2">
                                                                    Insertar variables en el contenido
                                                                </div>

                                                                <div className="space-y-3">
                                                                    {[
                                                                        { title: "Cliente", items: groupedVariables.cliente },
                                                                        { title: "Ticket", items: groupedVariables.ticket },
                                                                        { title: "Mensaje", items: groupedVariables.mensaje },
                                                                        { title: "Técnico", items: groupedVariables.tecnico },
                                                                        { title: "Firma", items: groupedVariables.firma },
                                                                    ].map((group) =>
                                                                        group.items.length > 0 ? (
                                                                            <div key={group.title}>
                                                                                <div className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                                                                                    {group.title}
                                                                                </div>

                                                                                <div className="flex flex-wrap gap-2">
                                                                                    {group.items.map((variable) => (
                                                                                        <Button
                                                                                            key={`body-${tpl.key}-${variable.token}`}
                                                                                            size="small"
                                                                                            onMouseDown={(e) => {
                                                                                                e.preventDefault();
                                                                                                insertVariableInBody(tpl.key, variable.token);
                                                                                            }}
                                                                                            title={variable.description}
                                                                                        >
                                                                                            {variable.label}
                                                                                        </Button>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        ) : null
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <Space>
                                                                <Button
                                                                    loading={previewLoading === tpl.key}
                                                                    onClick={() => previewTemplate(tpl)}
                                                                >
                                                                    Vista previa
                                                                </Button>

                                                                <Button
                                                                    type="primary"
                                                                    loading={savingKey === tpl.key}
                                                                    onClick={() => saveTemplate(tpl)}
                                                                >
                                                                    Guardar
                                                                </Button>
                                                            </Space>
                                                        </Space>
                                                    </Card>
                                                </Col>

                                                <Col xs={24} xl={12}>
                                                    <div className="space-y-4">
                                                        <Card size="small" title="Vista previa" className="rounded-xl">
                                                            <div className="mb-3">
                                                                <Text strong>Asunto:</Text>{" "}
                                                                <Text>{preview[tpl.key]?.subject || "Sin preview"}</Text>
                                                            </div>

                                                            <div
                                                                style={{
                                                                    border: "1px solid #e5e7eb",
                                                                    borderRadius: 12,
                                                                    padding: 16,
                                                                    minHeight: 420,
                                                                    background: "#fff",
                                                                    overflow: "auto",
                                                                }}
                                                                dangerouslySetInnerHTML={{
                                                                    __html:
                                                                        preview[tpl.key]?.bodyHtml ||
                                                                        "<p style='color:#999'>Sin preview</p>",
                                                                }}
                                                            />
                                                        </Card>
                                                    </div>
                                                    <br />
                                                    <Card size="small" title="Guía de variables" className="rounded-xl">
                                                        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 space-y-3">
                                                            {availableVariableMeta.map((variable) => (
                                                                <div key={variable.token}>
                                                                    <div className="text-sl font-medium text-gray-700">
                                                                        {variable.label}
                                                                    </div>
                                                                    <div className="text-sm text-gray-500">
                                                                        {variable.description}
                                                                    </div>
                                                                    <div className="text-[11px] text-gray-400 mt-1">
                                                                        Token real: {variable.token}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </Card>
                                                </Col>
                                            </Row>
                                        ),
                                    }))}
                                />
                            ),
                        },
                        {
                            key: "signature",
                            label: "Firma",
                            children: (
                                <Tabs
                                    activeKey={signatureTab}
                                    onChange={(key) =>
                                        setSignatureTab(key as "default" | "technician")
                                    }
                                    items={[
                                        {
                                            key: "default",
                                            label: "Firma por defecto",
                                            children: (
                                                <Row gutter={[16, 16]}>
                                                    <Col xs={24} xl={12}>
                                                        <Card
                                                            size="small"
                                                            title="Configuración de firma"
                                                            className="rounded-xl"
                                                        >
                                                            <Space
                                                                direction="vertical"
                                                                style={{ width: "100%" }}
                                                                size={16}
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <div>
                                                                        <div className="font-medium">Activada</div>
                                                                        <Text type="secondary">
                                                                            Usar firma por defecto cuando no haya firma de técnico
                                                                        </Text>
                                                                    </div>

                                                                    <Switch
                                                                        checked={signature.isEnabled}
                                                                        onChange={(checked) =>
                                                                            setSignature((prev) => ({
                                                                                ...prev,
                                                                                isEnabled: checked,
                                                                            }))
                                                                        }
                                                                    />
                                                                </div>

                                                                <Input
                                                                    placeholder="Nombre"
                                                                    value={signature.nombre}
                                                                    onChange={(e) =>
                                                                        setSignature((prev) => ({
                                                                            ...prev,
                                                                            nombre: e.target.value,
                                                                        }))
                                                                    }
                                                                />

                                                                <Input
                                                                    placeholder="Cargo"
                                                                    value={signature.cargo}
                                                                    onChange={(e) =>
                                                                        setSignature((prev) => ({
                                                                            ...prev,
                                                                            cargo: e.target.value,
                                                                        }))
                                                                    }
                                                                />

                                                                <Input
                                                                    placeholder="Área"
                                                                    value={signature.area}
                                                                    onChange={(e) =>
                                                                        setSignature((prev) => ({
                                                                            ...prev,
                                                                            area: e.target.value,
                                                                        }))
                                                                    }
                                                                />

                                                                <Input
                                                                    placeholder="Email"
                                                                    value={signature.email}
                                                                    onChange={(e) =>
                                                                        setSignature((prev) => ({
                                                                            ...prev,
                                                                            email: e.target.value,
                                                                        }))
                                                                    }
                                                                />

                                                                <Input
                                                                    placeholder="Teléfono / WhatsApp"
                                                                    value={signature.telefono}
                                                                    onChange={(e) =>
                                                                        setSignature((prev) => ({
                                                                            ...prev,
                                                                            telefono: e.target.value,
                                                                        }))
                                                                    }
                                                                />

                                                                <Input
                                                                    placeholder="Sitio web 1"
                                                                    value={signature.sitioWeb1}
                                                                    onChange={(e) =>
                                                                        setSignature((prev) => ({
                                                                            ...prev,
                                                                            sitioWeb1: e.target.value,
                                                                        }))
                                                                    }
                                                                />

                                                                <Input
                                                                    placeholder="Sitio web 2"
                                                                    value={signature.sitioWeb2}
                                                                    onChange={(e) =>
                                                                        setSignature((prev) => ({
                                                                            ...prev,
                                                                            sitioWeb2: e.target.value,
                                                                        }))
                                                                    }
                                                                />

                                                                <Input
                                                                    placeholder="URL imagen / logo"
                                                                    value={signature.imageUrl}
                                                                    onChange={(e) =>
                                                                        setSignature((prev) => ({
                                                                            ...prev,
                                                                            imageUrl: e.target.value,
                                                                        }))
                                                                    }
                                                                />

                                                                <Button
                                                                    type="primary"
                                                                    loading={savingSignature}
                                                                    onClick={saveSignature}
                                                                >
                                                                    Guardar firma
                                                                </Button>
                                                            </Space>
                                                        </Card>
                                                    </Col>

                                                    <Col xs={24} xl={12}>
                                                        <Card
                                                            size="small"
                                                            title="Vista previa firma"
                                                            className="rounded-xl"
                                                        >
                                                            <div
                                                                style={{
                                                                    border: "1px solid #e5e7eb",
                                                                    borderRadius: 12,
                                                                    padding: 16,
                                                                    minHeight: 280,
                                                                    background: "#fff",
                                                                }}
                                                                dangerouslySetInnerHTML={{
                                                                    __html: signaturePreview,
                                                                }}
                                                            />
                                                        </Card>
                                                    </Col>
                                                </Row>
                                            ),
                                        },
                                        {
                                            key: "technician",
                                            label: "Firma de técnico",
                                            children: (
                                                <Row gutter={[16, 16]}>
                                                    <Col xs={24} xl={12}>
                                                        <Card
                                                            size="small"
                                                            title="Configuración de firma del técnico"
                                                            className="rounded-xl"
                                                        >
                                                            <Space
                                                                direction="vertical"
                                                                style={{ width: "100%" }}
                                                                size={16}
                                                            >
                                                                <Select
                                                                    placeholder="Selecciona un técnico"
                                                                    value={selectedTecnicoId}
                                                                    onChange={setSelectedTecnicoId}
                                                                    options={tecnicos.map((t) => ({
                                                                        value: t.id_tecnico,
                                                                        label: t.nombre,
                                                                    }))}
                                                                />

                                                                <Input
                                                                    placeholder="Cargo"
                                                                    value={tecnicoSignature.cargo || ""}
                                                                    onChange={(e) =>
                                                                        setTecnicoSignature((prev) => ({
                                                                            ...prev,
                                                                            cargo: e.target.value,
                                                                        }))
                                                                    }
                                                                    disabled={!selectedTecnicoId}
                                                                />

                                                                <Input
                                                                    placeholder="Área"
                                                                    value={tecnicoSignature.area || ""}
                                                                    onChange={(e) =>
                                                                        setTecnicoSignature((prev) => ({
                                                                            ...prev,
                                                                            area: e.target.value,
                                                                        }))
                                                                    }
                                                                    disabled={!selectedTecnicoId}
                                                                />

                                                                <Input.TextArea
                                                                    rows={4}
                                                                    placeholder="Texto adicional de firma"
                                                                    value={tecnicoSignature.firmaTexto || ""}
                                                                    onChange={(e) =>
                                                                        setTecnicoSignature((prev) => ({
                                                                            ...prev,
                                                                            firmaTexto: e.target.value,
                                                                        }))
                                                                    }
                                                                    disabled={!selectedTecnicoId}
                                                                />

                                                                <div>
                                                                    <div className="font-medium mb-2">Imagen de firma</div>

                                                                    {tecnicoSignature.firma?.path ? (
                                                                        <div style={{ marginBottom: 12 }}>
                                                                            <img
                                                                                src={tecnicoSignature.firma.path}
                                                                                alt="Firma técnico"
                                                                                style={{
                                                                                    maxWidth: 320,
                                                                                    border: "1px solid #eee",
                                                                                    borderRadius: 8,
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    ) : (
                                                                        <div style={{ marginBottom: 12, color: "#888" }}>
                                                                            No hay imagen de firma
                                                                        </div>
                                                                    )}

                                                                    <Space>
                                                                        <Upload
                                                                            beforeUpload={uploadTecnicoSignatureImage}
                                                                            showUploadList={false}
                                                                            accept="image/*"
                                                                            disabled={!selectedTecnicoId}
                                                                        >
                                                                            <Button
                                                                                loading={uploadingTecnicoSignature}
                                                                                disabled={!selectedTecnicoId}
                                                                            >
                                                                                Subir imagen
                                                                            </Button>
                                                                        </Upload>

                                                                        {tecnicoSignature.firma?.path && (
                                                                            <Button
                                                                                danger
                                                                                onClick={deleteTecnicoSignatureImage}
                                                                                disabled={!selectedTecnicoId}
                                                                            >
                                                                                Eliminar imagen
                                                                            </Button>
                                                                        )}
                                                                    </Space>
                                                                </div>

                                                                <Button
                                                                    type="primary"
                                                                    loading={savingTecnicoSignature}
                                                                    onClick={saveTecnicoSignature}
                                                                    disabled={!selectedTecnicoId}
                                                                >
                                                                    Guardar firma del técnico
                                                                </Button>
                                                            </Space>
                                                        </Card>
                                                    </Col>

                                                    <Col xs={24} xl={12}>
                                                        <Card
                                                            size="small"
                                                            title="Vista previa firma técnico"
                                                            className="rounded-xl"
                                                        >
                                                            {loadingTecnicoSignature ? (
                                                                <Spin />
                                                            ) : !selectedTecnicoId ? (
                                                                <Empty description="Selecciona un técnico" />
                                                            ) : (
                                                                <div
                                                                    style={{
                                                                        border: "1px solid #e5e7eb",
                                                                        borderRadius: 12,
                                                                        padding: 16,
                                                                        minHeight: 280,
                                                                        background: "#fff",
                                                                    }}
                                                                >
                                                                    <table cellPadding={0} cellSpacing={0} style={{ marginTop: 16 }}>
                                                                        <tbody>
                                                                            <tr>
                                                                                <td
                                                                                    style={{
                                                                                        paddingRight: 16,
                                                                                        verticalAlign: "middle",
                                                                                    }}
                                                                                >
                                                                                    <img
                                                                                        src={
                                                                                            tecnicoSignature.firma?.path ||
                                                                                            defaultLogo
                                                                                        }
                                                                                        width="120"
                                                                                    />
                                                                                </td>
                                                                                <td
                                                                                    style={{
                                                                                        borderLeft: "2px solid #ddd",
                                                                                        paddingLeft: 16,
                                                                                        verticalAlign: "middle",
                                                                                        fontFamily: "Arial, sans-serif",
                                                                                        fontSize: 13,
                                                                                        color: "#333",
                                                                                        lineHeight: 1.6,
                                                                                    }}
                                                                                >
                                                                                    <strong style={{ fontSize: 14 }}>
                                                                                        {tecnicoSignature.nombre || "Técnico"}
                                                                                    </strong>
                                                                                    <br />
                                                                                    <span style={{ color: "#555" }}>
                                                                                        {tecnicoSignature.cargo || "Sin cargo"}
                                                                                    </span>
                                                                                    <br />
                                                                                    <span style={{ color: "#555" }}>
                                                                                        {tecnicoSignature.area || "Sin área"}
                                                                                    </span>
                                                                                    <br />
                                                                                    <a
                                                                                        href={`mailto:${tecnicoSignature.email || ""}`}
                                                                                        style={{ color: "#0ea5e9" }}
                                                                                    >
                                                                                        {tecnicoSignature.email || "Sin email"}
                                                                                    </a>
                                                                                    <br />
                                                                                    {tecnicoSignature.firmaTexto || ""}
                                                                                </td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            )}
                                                        </Card>
                                                    </Col>
                                                </Row>
                                            ),
                                        },
                                    ]}
                                />
                            ),
                        },
                    ]}
                />
            </Card>
        </div>
    );
}