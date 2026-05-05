// src/components/modals-ticketera/TicketDetalle.tsx
// Componente para mostrar el detalle de un ticket, con su historial de mensajes, información del ticket, y panel de respuesta. Incluye manejo de carga, actualización, y envío de respuestas internas o al cliente, con soporte para archivos adjuntos y visualización de correos enriquecidos.
import { useEffect, useMemo, useRef, useState } from "react";
import {
    Spin,
    Select,
    Tag,
    Tabs,
    Button,
    Input,
    message,
} from "antd";
import {
    UserOutlined,
    TeamOutlined,
    EditOutlined,
    SendOutlined,
    PaperClipOutlined,
    EyeInvisibleOutlined,
    ArrowLeftOutlined,
    CheckCircleOutlined,
    MessageOutlined,
    ClockCircleOutlined,
    ExclamationCircleOutlined,
} from "@ant-design/icons";
import DOMPurify from "dompurify";

import { useLocation, useNavigate, useParams } from "react-router-dom";

import { api } from "../../api/api";

const API_URL =
    (import.meta as any).env?.VITE_API_URL || "http://localhost:4000/api";

type TicketMessage = {
    id: number;
    bodyText: string | null;
    bodyHtml?: string | null;
    isInternal: boolean;
    direction: "INBOUND" | "OUTBOUND";
    createdAt: string;
    fromEmail?: string | null;
    toEmail?: string | null;
    cc?: string[];
    author?: { nombre: string; avatar?: string };
    requester?: { nombre: string; email?: string };
    attachments?: Array<{
        id: number;
        filename: string;
        mimeType: string;
        bytes: number;
        url: string;
        isInline?: boolean;
        contentId?: string;
    }>;
};

type TicketDetail = {
    id: number;
    publicId?: string;
    subject: string;
    status: string;
    priority: string;
    createdAt?: string;
    updatedAt?: string;
    fromEmail?: string;
    empresa?: { nombre: string };
    requester?: { nombre: string; email?: string };
    assignee?: { id_tecnico: number; nombre: string; email?: string };
    messages: TicketMessage[];
    replyRecipients?: {
        to: string[];
        cc: string[];
    };
    sla?: {
        firstResponse?: {
            dueAt?: string;
            at?: string | null;
            status?: "PENDING" | "OK" | "BREACHED";
        };
        resolution?: {
            dueAt?: string;
            at?: string | null;
            status?: "PENDING" | "OK" | "BREACHED";
        };
    };
};

type Tecnico = {
    id_tecnico: number;
    nombre: string;
};

const TICKET_STATUS_LABEL: Record<string, string> = {
    NEW: "Nuevo",
    OPEN: "Abierto",
    PENDING: "Pendiente",
    CLOSED: "Cerrado",
};

const TICKET_PRIORITY_LABEL: Record<string, string> = {
    LOW: "Baja",
    NORMAL: "Media",
    HIGH: "Alta",
    URGENT: "Urgente",
};

function priorityColor(p?: string) {
    switch (p) {
        case "URGENT":
            return "red";
        case "HIGH":
            return "orange";
        case "NORMAL":
            return "blue";
        case "LOW":
            return "green";
        default:
            return "default";
    }
}

function statusColor(s?: string) {
    switch (s) {
        case "NEW":
            return "blue";
        case "OPEN":
            return "gold";
        case "PENDING":
            return "orange";
        case "RESOLVED":
            return "green";
        case "CLOSED":
            return "default";
        default:
            return "default";
    }
}

function slaColor(status?: string) {
    switch (status) {
        case "OK":
            return "green";
        case "BREACHED":
            return "red";
        case "PENDING":
            return "gold";
        default:
            return "default";
    }
}

function slaLabel(status?: string) {
    switch (status) {
        case "OK":
            return "Cumplido";
        case "BREACHED":
            return "Vencido";
        case "PENDING":
            return "Pendiente";
        default:
            return "N/A";
    }
}

function formatDateTime(date?: string | Date | null) {
    if (!date) return "—";
    return new Date(date).toLocaleString("es-CL", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

function formatRelativeTime(date?: string | Date | null) {
    if (!date) return "—";
    const diffMs = Date.now() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return "Ahora";
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays < 7) return `Hace ${diffDays} d`;
    return new Date(date).toLocaleDateString("es-CL");
}

type TicketAttachment = NonNullable<TicketMessage["attachments"]>[number];

function formatEmailBody(text: string | null) {
    if (!text) return "";
    return text
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>')
        .replace(/\n/g, "<br/>")
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
}

function resolveInlineImages(
    html: string,
    attachments?: TicketMessage["attachments"]
) {
    if (!html) return html;

    if (!attachments || attachments.length === 0) {
        return html.replace(/<img[^>]+src=["']cid:[^"']+["'][^>]*>/gi, "");
    }

    const inlineAttachments = attachments.filter(
        (a) => a.isInline && a.contentId
    );

    if (!inlineAttachments.length) {
        return html.replace(/<img[^>]+src=["']cid:[^"']+["'][^>]*>/gi, "");
    }

    const normalizeCid = (value: string) =>
        String(value)
            .replace(/^cid:/i, "")
            .replace(/^</, "")
            .replace(/>$/, "")
            .trim();

    const inlineMap = new Map<string, TicketAttachment>();

    inlineAttachments.forEach((att) => {
        const cleanCid = normalizeCid(att.contentId || "");
        if (!cleanCid) return;

        inlineMap.set(cleanCid, att);
        inlineMap.set(cleanCid.toLowerCase(), att);
    });

    return html.replace(
        /<img[^>]+src=["']cid:([^"']+)["'][^>]*>/gi,
        (match, cid) => {
            const cleanCid = normalizeCid(cid);

            const att =
                inlineMap.get(cleanCid) ||
                inlineMap.get(cleanCid.toLowerCase());

            if (!att?.url) return "";

            /*
             * Caso esperado ahora:
             * imágenes inline guardadas en Cloudinary.
             */
            const imageUrl = att.url.startsWith("http")
                ? att.url
                : `${API_URL}/helpdesk/tickets/attachments/${att.id}/inline`;

            const alt = att.filename || "imagen";

            return `<img src="${imageUrl}" alt="${alt}" loading="lazy" style="max-width:100%;height:auto;display:block;border-radius:8px;" />`;
        }
    );
}

function hasUnresolvedCidImages(
    html?: string | null,
    attachments?: TicketMessage["attachments"]
) {
    if (!html) return false;
    if (!/<img[^>]+src=["']cid:/i.test(html)) return false;
    return (attachments?.filter((a) => a.isInline).length ?? 0) === 0;
}

function getMessageAuthor(m: TicketMessage, ticketDetalle: TicketDetail | null) {
    if (m.isInternal) {
        return {
            name: m.author?.nombre ?? ticketDetalle?.assignee?.nombre ?? "Agente",
            role: "Nota interna",
        };
    }

    if (m.direction === "INBOUND") {
        return {
            name:
                ticketDetalle?.requester?.nombre ??
                m.requester?.nombre ??
                m.fromEmail ??
                "Cliente",
            role: "Cliente",
        };
    }

    return {
        name: m.author?.nombre ?? ticketDetalle?.assignee?.nombre ?? "Agente",
        role: "Agente",
    };
}

// Funciones auxiliares para formatear fechas, resolver imágenes en correos, y determinar autores de mensajes, para mostrar el detalle del ticket de forma enriquecida y amigable para el usuario.
function buildEmailHtml(html: string) {
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body {
        margin: 0; padding: 0;
        background: #fff;
        font-family: Arial, sans-serif;
        color: #374151;
        overflow-x: hidden;
        overflow-y: visible;
      }
      body { padding: 12px; }
      img { max-width: 100% !important; height: auto !important; display: block; }
      table { max-width: 100% !important; border-collapse: collapse; }
      td, th { max-width: 100%; word-break: break-word; }
      * { box-sizing: border-box; }
      a { color: #2563eb; text-decoration: none; }
    </style>
  </head>
  <body>
    ${html}
    <script>
      function sendHeight() {
        const h = document.documentElement.scrollHeight;
        window.parent.postMessage({ type: 'iframe-resize', height: h }, '*');
      }
      // Enviar altura inicial y cuando cambien imágenes
      document.addEventListener('DOMContentLoaded', sendHeight);
      window.addEventListener('load', sendHeight);
      const observer = new ResizeObserver(sendHeight);
      observer.observe(document.body);
    <\/script>
  </body>
</html>`;
}

function AutoResizeIframe({ srcDoc }: { srcDoc: string }) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [height, setHeight] = useState(120);

    useEffect(() => {
        const handler = (event: MessageEvent) => {
            if (event.data?.type === "iframe-resize" && typeof event.data.height === "number") {
                // Verificar que el mensaje viene de este iframe específico
                if (iframeRef.current?.contentWindow === event.source) {
                    setHeight(event.data.height + 8);
                }
            }
        };
        window.addEventListener("message", handler);
        return () => window.removeEventListener("message", handler);
    }, []);

    return (
        <iframe
            ref={iframeRef}
            srcDoc={srcDoc}
            sandbox="allow-same-origin allow-popups allow-scripts"
            className="w-full border-0 rounded"
            style={{ height: `${height}px`, minHeight: "80px" }}
        />
    );
}

// Componente para mostrar el detalle de un ticket, con su historial de mensajes, información del ticket, y panel de respuesta. Incluye manejo de carga, actualización, y envío de respuestas internas o al cliente, con soporte para archivos adjuntos y visualización de correos enriquecidos.
export default function TicketDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const location = useLocation();

    const [ticketDetalle, setTicketDetalle] = useState<TicketDetail | null>(null);
    const [loadingDetalle, setLoadingDetalle] = useState(true);

    const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);

    const [replyText, setReplyText] = useState("");
    const [internalNoteText, setInternalNoteText] = useState("");
    const [sendingReply, setSendingReply] = useState(false);

    const [toEmails, setToEmails] = useState<string[]>([]);
    const [ccEmails, setCcEmails] = useState<string[]>([]);

    const [contactos, setContactos] = useState<any[]>([]);
    const [loadingContactos, setLoadingContactos] = useState(false);

    const [replyFiles, setReplyFiles] = useState<File[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const replyFileInputRef = useRef<HTMLInputElement>(null);

    const [showReplyPanel, setShowReplyPanel] = useState(false);


    const debounce = (fn: any, delay: number) => {
        let timer: any;
        return (...args: any[]) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    };

    // Función para buscar contactos por email, con debounce para evitar llamadas excesivas a la API
    const handleSearchContactos = async (value: string) => {
        if (!value) {
            setContactos([]);
            return;
        }

        try {
            setLoadingContactos(true);
            const resp = await api.get(`/helpdesk/tickets/contactos?search=${value}`);
            if (resp.data?.ok) setContactos(resp.data.contactos);
        } catch (error) {
            console.error("Error buscando contactos", error);
        } finally {
            setLoadingContactos(false);
        }
    };

    // Crear función debounce para la búsqueda de contactos, para evitar llamadas excesivas a la API mientras el usuario escribe
    const debouncedSearchContactos = useMemo(
        () => debounce(handleSearchContactos, 400),
        []
    );

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    // Determinar si el formulario de respuesta es válido para enviar, basado en que haya texto o archivos adjuntos, y que haya al menos un destinatario
    const loadTecnicos = async () => {
        const { data } = await api.get("/tecnicos");
        setTecnicos(Array.isArray(data) ? data : []);
    };

    // Función para cargar el detalle del ticket, incluyendo su información y mensajes, y preparar el formulario de respuesta con destinatarios y texto predefinido. Maneja estados de carga y errores.
    const loadTicket = async () => {
        if (!id) return;

        setLoadingDetalle(true);
        setReplyFiles([]);
        setReplyText("");
        setInternalNoteText("");

        try {
            const { data } = await api.get(`/helpdesk/tickets/${id}`);
            if (!data?.ok) throw new Error();

            const ticket: TicketDetail = {
                ...data.ticket,
                messages: (data.ticket.messages ?? []).map((m: any) => ({
                    ...m,
                    cc: m.cc ? m.cc.split(",") : [],
                })),
            };

            setTicketDetalle(ticket);

            const normalizeEmail = (email?: string | null) =>
                email?.trim().toLowerCase() || null;

            const uniqueEmails = (emails: Array<string | null | undefined>) =>
                [...new Set(emails.map(normalizeEmail).filter(Boolean) as string[])];

            setToEmails(
                uniqueEmails(
                    ticket.replyRecipients?.to?.length
                        ? ticket.replyRecipients.to
                        : [ticket.requester?.email, ticket.fromEmail]
                )
            );

            const nextCc = uniqueEmails(
                ticket.replyRecipients?.cc?.length
                    ? ticket.replyRecipients.cc
                    : []
            );

            setCcEmails(nextCc);

            setCcEmails(
                uniqueEmails(
                    ticket.replyRecipients?.cc?.length
                        ? ticket.replyRecipients.cc
                        : []
                )
            );

            setReplyText(`Estimado(a) ${ticket.requester?.nombre ?? ""},
                \n\nGracias por contactarnos.\n\nQuedamos atentos a su respuesta.
                \n\nSaludos cordiales,\nSoporte Técnico`);

        } catch {
            message.error("Error al cargar detalle");
        } finally {
            setLoadingDetalle(false);
        }
    };

    // Función para actualizar campos del ticket, como estado, prioridad o asignado, con llamada a API y recarga del detalle después de la actualización. Maneja errores y muestra mensajes de éxito o error.
    const updateTicket = async (payload: {
        status?: string;
        priority?: string;
        assigneeId?: number | null;
    }) => {
        if (!ticketDetalle) return;

        try {
            await api.patch(`/helpdesk/tickets/${ticketDetalle.id}`, payload);
            message.success("Ticket actualizado");

            if (payload.status === "CLOSED") {
                navigate(`/helpdesk${location.search}`, { replace: true });
                return;
            }

            await loadTicket();
        } catch (error: any) {
            message.error(error?.response?.data?.message || "No se pudo actualizar el ticket");
        }
    };

    // Función para responder al ticket, ya sea con una respuesta al cliente o una nota interna, incluyendo validación de texto, construcción de payload con destinatarios y archivos adjuntos, llamada a API para enviar la respuesta, y recarga del detalle después de enviar. Maneja estados de envío y muestra mensajes de éxito o error.
    const responderTicket = async (isInternal: boolean) => {
        if (!ticketDetalle) return;

        const text = isInternal ? internalNoteText : replyText;
        if (!text.trim()) {
            message.warning("Escribe un mensaje");
            return;
        }

        try {
            setSendingReply(true);

            const formData = new FormData();
            formData.append("message", text);
            formData.append("isInternal", String(isInternal));
            formData.append("to", JSON.stringify(toEmails));
            formData.append("cc", JSON.stringify(ccEmails));
            replyFiles.forEach((file) => formData.append("attachments", file));

            await api.post(`/helpdesk/tickets/${ticketDetalle.id}/reply`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            if (isInternal) {
                setInternalNoteText("");
                message.success("Nota interna guardada");
                setReplyFiles([]);
                await loadTicket();
                scrollToBottom();
            } else {
                setReplyText("");
                setReplyFiles([]);
                message.success("Respuesta enviada");
                navigate(`/helpdesk${location.search}`, { replace: true });
                return;
            }

            setReplyFiles([]);
            await loadTicket();
        } catch {
            message.error("Error al enviar mensaje");
        } finally {
            setSendingReply(false);
        }
    };

    const puedeCerrarTicket = () => {
        if (!ticketDetalle?.messages) return false;
        return ticketDetalle.messages.some(
            (m) => (m.direction === "OUTBOUND" && !m.isInternal) || m.isInternal
        );
    };

    useEffect(() => {
        loadTecnicos();
    }, []);

    useEffect(() => {
        loadTicket();
    }, [id]);

    const lastMessage =
        ticketDetalle?.messages && ticketDetalle.messages.length > 0
            ? ticketDetalle.messages[ticketDetalle.messages.length - 1]
            : null;

    const lastActivityBy = lastMessage?.isInternal
        ? "internal"
        : lastMessage?.direction === "INBOUND"
            ? "client"
            : lastMessage
                ? "agent"
                : null;

    if (loadingDetalle || !ticketDetalle) {
        return (
            <div className="min-h-[calc(100vh-80px)] flex justify-center items-center">
                <Spin size="large" />
            </div>
        );
    }

    // Funciones auxiliares para formatear fechas, resolver imágenes en correos, y determinar autores de mensajes, para mostrar el detalle del ticket de forma enriquecida y amigable para el usuario.
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="w-full px-4 xl:px-6 py-4 h-[calc(100vh-24px)] flex flex-col">
                <div className="shrink-0 border-b border-gray-200 bg-white rounded-t-2xl px-7 py-4">
                    <div className="flex items-center justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3">
                            <Button
                                icon={<ArrowLeftOutlined />}
                                onClick={() => navigate(`/helpdesk${location.search}`, { replace: true })}
                            >
                                Volver
                            </Button>

                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-mono text-gray-400">
                                    #{ticketDetalle.id}
                                </span>
                                <Tag color={priorityColor(ticketDetalle.priority)} className="m-0">
                                    {TICKET_PRIORITY_LABEL[ticketDetalle.priority]}
                                </Tag>
                                <Tag color={statusColor(ticketDetalle.status)} className="m-0">
                                    {TICKET_STATUS_LABEL[ticketDetalle.status]}
                                </Tag>
                            </div>
                        </div>
                    </div>

                    <h1 className="text-lg xl:text-[20px] font-semibold text-gray-900 leading-tight">
                        {ticketDetalle.subject}
                    </h1>
                </div>

                <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_280px] bg-white rounded-b-2xl overflow-hidden border border-gray-200 border-t-0 shadow-sm">
                    <div className="min-h-0 flex flex-col border-r border-gray-200">
                        {lastActivityBy && (
                            <div className="shrink-0 px-6 pt-3 pb-1">
                                {lastActivityBy === "client" && (
                                    <Tag icon={<UserOutlined />} color="blue">
                                        Cliente respondió
                                    </Tag>
                                )}
                                {lastActivityBy === "agent" && (
                                    <Tag icon={<TeamOutlined />} color="green">
                                        Respondido por soporte
                                    </Tag>
                                )}
                                {lastActivityBy === "internal" && (
                                    <Tag icon={<EditOutlined />} color="gold">
                                        Nota interna
                                    </Tag>
                                )}
                            </div>
                        )}

                        <div className="flex-1 min-h-0 overflow-y-auto px-7 py-5">
                            <div className="relative">

                                {ticketDetalle.messages.map((m) => {
                                    const isOutbound = m.direction === "OUTBOUND";
                                    const isInternal = m.isInternal;
                                    const author = getMessageAuthor(m, ticketDetalle);

                                    let bgColor = "bg-white";
                                    let borderColor = "border-l-blue-400";
                                    let avatarBg = "bg-blue-500";
                                    let avatarIcon = <UserOutlined className="text-white text-xs" />;

                                    if (isInternal) {
                                        bgColor = "bg-amber-50";
                                        borderColor = "border-l-amber-400";
                                        avatarBg = "bg-amber-400";
                                        avatarIcon = <EditOutlined className="text-white text-xs" />;
                                    } else if (isOutbound) {
                                        bgColor = "bg-blue-50";
                                        borderColor = "border-l-emerald-400";
                                        avatarBg = "bg-emerald-500";
                                        avatarIcon = <TeamOutlined className="text-white text-xs" />;
                                    }

                                    return (
                                        <div key={m.id} className="relative mb-8">

                                            <div
                                                className={`rounded-xl border ${bgColor} ${borderColor} border-l-4`}
                                            >
                                                <div className="px-4 py-3 border-b border-gray-100">
                                                    <div className="flex justify-between items-center gap-4">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-semibold text-sm text-gray-800">
                                                                {author.name}
                                                            </span>
                                                            <span className="text-xs text-gray-400">
                                                                ({author.role})
                                                            </span>
                                                            <Tag
                                                                color={
                                                                    isInternal ? "gold" : isOutbound ? "blue" : "default"
                                                                }
                                                                className="text-xs m-0"
                                                            >
                                                                {isInternal
                                                                    ? "Interno"
                                                                    : isOutbound
                                                                        ? "Enviado"
                                                                        : "Recibido"}
                                                            </Tag>
                                                        </div>

                                                        <div className="text-right">
                                                            <div className="text-xs text-gray-500">
                                                                {formatDateTime(m.createdAt)}
                                                            </div>
                                                            <div className="text-xs text-gray-400">
                                                                {formatRelativeTime(m.createdAt)}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {!m.isInternal && (
                                                        <div className="mt-2 space-y-1">
                                                            {m.fromEmail && (
                                                                <div className="flex items-center text-m">
                                                                    <span className="font-semibold text-gray-500 w-8 shrink-0">De:</span>
                                                                    <span className="py-0.5 rounded-md font-medium">
                                                                        {m.fromEmail}
                                                                    </span>
                                                                </div>
                                                            )}

                                                            {(() => {
                                                                const toList = typeof m.toEmail === "string"
                                                                    ? m.toEmail.split(",").map((v) => v.trim()).filter(Boolean)
                                                                    : [];
                                                                if (!toList.length) return null;
                                                                return (
                                                                    <div className="flex items-center gap-2 text-m">
                                                                        <span className="font-semibold text-gray-500 w-8 shrink-0">Para:</span>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {toList.map((e, i) => (
                                                                                <span key={i} className="py-0.5 rounded-md font-medium">
                                                                                    {e}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}

                                                            {(() => {
                                                                const ccList = Array.isArray(m.cc) ? m.cc : [];
                                                                if (!ccList.length) return null;
                                                                return (
                                                                    <div className="flex items-center text-m">
                                                                        <span className="font-semibold text-gray-500 w-8 shrink-0">CC:</span>
                                                                        <div className="flex flex-wrap gap-1">
                                                                            {ccList.map((e, i) => (
                                                                                <span key={i} className="bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-md">
                                                                                    {e}
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="px-4 py-3">
                                                    {hasUnresolvedCidImages(m.bodyHtml, m.attachments) && (
                                                        <div className="mb-3 px-3 py-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg">
                                                            ⚠️ Algunas imágenes de la firma no pudieron mostrarse.
                                                        </div>
                                                    )}

                                                    {m.bodyHtml ? (
                                                        <AutoResizeIframe
                                                            srcDoc={buildEmailHtml(
                                                                DOMPurify.sanitize(
                                                                    resolveInlineImages(m.bodyHtml, m.attachments),
                                                                    {
                                                                        ADD_ATTR: ["target", "src", "style", "width", "height"],
                                                                        ADD_TAGS: ["img", "table", "tbody", "tr", "td"],
                                                                        FORCE_BODY: true,
                                                                    }
                                                                )
                                                            )}
                                                        />
                                                    ) : (
                                                        <div
                                                            className="prose prose-sm max-w-none text-[13px] leading-6 text-gray-700"
                                                            dangerouslySetInnerHTML={{
                                                                __html: DOMPurify.sanitize(formatEmailBody(m.bodyText)),
                                                            }}
                                                        />
                                                    )}

                                                    {(m.attachments?.filter((a) => !a.isInline).length ?? 0) > 0 && (
                                                        <div className="mt-4 pt-3 border-t border-gray-100">
                                                            <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                                                                <PaperClipOutlined />
                                                                {m.attachments?.filter((a) => !a.isInline).length} archivo(s)
                                                                adjunto(s)
                                                            </div>

                                                            <div className="flex flex-wrap gap-2">
                                                                {(m.attachments ?? [])
                                                                    .filter((a) => !a.isInline)
                                                                    .map((att) => (
                                                                        <a
                                                                            key={att.id}
                                                                            href={`${API_URL}/helpdesk/tickets/attachments/${att.id}/download`}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-700 no-underline border border-gray-200"
                                                                        >
                                                                            <PaperClipOutlined />
                                                                            {att.filename}
                                                                        </a>
                                                                    ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        <div className="shrink-0 bg-gray-50 border-t border-gray-200 max-h-[calc(100dvh-190px)] overflow-hidden flex flex-col">
                            <div className="shrink-0 flex items-center justify-between px-6 py-3">
                                <div className="text-sm font-medium text-gray-700">
                                    Acciones del ticket
                                </div>

                                <Button
                                    size="small"
                                    onClick={() => setShowReplyPanel((prev) => !prev)}
                                >
                                    {showReplyPanel ? "Ocultar" : "Mostrar"}
                                </Button>
                            </div>

                            {showReplyPanel && (
                                <div
                                    className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6 pb-3"
                                    style={{
                                        height: "clamp(280px, calc(100dvh - 250px), 640px)",
                                    }}
                                >
                                    <Tabs
                                        className="min-h-full ticket-reply-tabs"
                                        items={[
                                            {
                                                key: "reply",
                                                label: (
                                                    <span className="flex items-center gap-1">
                                                        <SendOutlined /> Responder al cliente
                                                    </span>
                                                ),
                                                children: (
                                                    <div className="flex min-h-full flex-col gap-2">
                                                        <div className="shrink-0">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-xs text-gray-500">Para:</span>
                                                            </div>

                                                            <Select
                                                                mode="tags"
                                                                showSearch
                                                                placeholder="Agregar destinatarios"
                                                                value={toEmails}
                                                                onChange={setToEmails}
                                                                onSearch={debouncedSearchContactos}
                                                                loading={loadingContactos}
                                                                options={contactos.map((c) => ({
                                                                    label: `${c.nombre} (${c.email})`,
                                                                    value: c.email,
                                                                }))}
                                                                style={{ width: "100%" }}
                                                            />

                                                            <div className="mt-1">
                                                                <span className="text-[11px] text-gray-500">CC:</span>
                                                                <Select
                                                                    size="small"
                                                                    mode="tags"
                                                                    showSearch
                                                                    placeholder="Agregar CC"
                                                                    value={ccEmails}
                                                                    onChange={setCcEmails}
                                                                    onSearch={debouncedSearchContactos}
                                                                    loading={loadingContactos}
                                                                    options={contactos.map((c) => ({
                                                                        label: `${c.nombre} (${c.email})`,
                                                                        value: c.email,
                                                                    }))}
                                                                    style={{ width: "100%" }}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                                                            <Input.TextArea
                                                                value={replyText}
                                                                onChange={(e) => setReplyText(e.target.value)}
                                                                placeholder="Escribe tu respuesta al cliente..."
                                                                autoSize={false}
                                                                style={{
                                                                    height: "clamp(120px, 26dvh, 340px)",
                                                                    minHeight: "100px",
                                                                    maxHeight: "55dvh",
                                                                    resize: "vertical",
                                                                    overflowY: "auto",
                                                                }}
                                                            />
                                                            <div className="text-[11px] text-gray-400">
                                                                Puedes arrastrar la esquina inferior derecha para ajustar el tamaño del área de respuesta.
                                                            </div>
                                                        </div>

                                                        <div className="shrink-0 border-t border-gray-200 bg-gray-50 pt-2 pb-2 flex items-center gap-2 flex-wrap">
                                                            <input
                                                                ref={replyFileInputRef}
                                                                type="file"
                                                                multiple
                                                                hidden
                                                                onChange={(e) => {
                                                                    const files = e.target.files;
                                                                    if (!files?.length) return;
                                                                    setReplyFiles([...replyFiles, ...Array.from(files)]);
                                                                    e.target.value = "";
                                                                }}
                                                            />

                                                            <Button
                                                                icon={<PaperClipOutlined />}
                                                                size="small"
                                                                onClick={() => replyFileInputRef.current?.click()}
                                                            >
                                                                Adjuntar
                                                            </Button>

                                                            {replyFiles.map((file, i) => (
                                                                <Tag
                                                                    key={i}
                                                                    closable
                                                                    onClose={() =>
                                                                        setReplyFiles(replyFiles.filter((_, idx) => idx !== i))
                                                                    }
                                                                >
                                                                    {file.name}
                                                                </Tag>
                                                            ))}

                                                            {puedeCerrarTicket() && (
                                                                <Button onClick={() => updateTicket({ status: "CLOSED" })}>
                                                                    Cerrar ticket
                                                                </Button>
                                                            )}

                                                            <Button
                                                                type="primary"
                                                                loading={sendingReply}
                                                                onClick={() => responderTicket(false)}
                                                                icon={<SendOutlined />}
                                                                className="ml-auto shrink-0"
                                                            >
                                                                Enviar respuesta
                                                            </Button>
                                                        </div>
                                                        <br />
                                                    </div>
                                                ),
                                            },
                                            {
                                                key: "internal",
                                                label: (
                                                    <span className="flex items-center gap-1">
                                                        <EditOutlined /> Nota interna
                                                    </span>
                                                ),
                                                children: (
                                                    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
                                                        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                                                            <Input.TextArea
                                                                value={internalNoteText}
                                                                onChange={(e) => setInternalNoteText(e.target.value)}
                                                                placeholder="Escribe una nota interna (no visible para el cliente)..."
                                                                autoSize={false}
                                                                className="min-h-[120px] lg:min-h-[180px] xl:min-h-[260px] 2xl:min-h-[360px]"
                                                                style={{
                                                                    height: "clamp(120px, 34dvh, 360px)",
                                                                    maxHeight: "42dvh",
                                                                    resize: "vertical",
                                                                    overflowY: "auto",
                                                                    background: "#fffbeb",
                                                                }}
                                                            />
                                                        </div>

                                                        <div className="sticky bottom-0 z-20 shrink-0 border-t border-gray-200 bg-gray-50 pt-3 pb-1 flex items-center gap-2 flex-wrap">
                                                            <input
                                                                ref={replyFileInputRef}
                                                                type="file"
                                                                multiple
                                                                hidden
                                                                onChange={(e) => {
                                                                    const files = e.target.files;
                                                                    if (!files?.length) return;
                                                                    setReplyFiles([...replyFiles, ...Array.from(files)]);
                                                                    e.target.value = "";
                                                                }}
                                                            />

                                                            <Button
                                                                icon={<PaperClipOutlined />}
                                                                size="small"
                                                                onClick={() => replyFileInputRef.current?.click()}
                                                            >
                                                                Adjuntar
                                                            </Button>

                                                            {replyFiles.map((file, i) => (
                                                                <Tag
                                                                    key={i}
                                                                    closable
                                                                    onClose={() =>
                                                                        setReplyFiles(replyFiles.filter((_, idx) => idx !== i))
                                                                    }
                                                                >
                                                                    {file.name}
                                                                </Tag>
                                                            ))}

                                                            <Button
                                                                type="primary"
                                                                loading={sendingReply}
                                                                onClick={() => responderTicket(true)}  // ← true = interna
                                                                icon={<EyeInvisibleOutlined />}
                                                                className="ml-auto shrink-0"
                                                                style={{ background: "#d97706" }} // color ámbar para distinguirla
                                                            >
                                                                Guardar nota
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ),
                                            },
                                        ]}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <aside className="hidden xl:block min-h-0 overflow-y-auto bg-gray-50/80">
                        <div className="p-5 space-y-5">
                            <div className="rounded-2xl bg-white border border-gray-200 p-4">
                                <div className="grid grid-cols-1 gap-y-4 text-sm">
                                    <div>
                                        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                                            Empresa
                                        </div>
                                        <div className="font-medium text-gray-800">
                                            {ticketDetalle.empresa?.nombre}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                                            Solicitante
                                        </div>
                                        {ticketDetalle.requester ? (
                                            <div>
                                                <div className="font-medium text-gray-800">
                                                    {ticketDetalle.requester.nombre}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {ticketDetalle.requester.email}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="italic text-gray-400 text-xs">
                                                {ticketDetalle.fromEmail ?? "No registrado"}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                                            Creado
                                        </div>
                                        <div className="text-gray-600">
                                            {formatDateTime(ticketDetalle.createdAt)}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                                            Estado
                                        </div>
                                        <Select
                                            value={ticketDetalle.status}
                                            onChange={(v) => {
                                                if (v === "CLOSED" && !puedeCerrarTicket()) {
                                                    message.warning("Debes responder o agregar una nota antes de cerrar");
                                                    return;
                                                }
                                                updateTicket({ status: v });
                                            }}
                                            options={[
                                                { value: "NEW", label: "Nuevo" },
                                                { value: "OPEN", label: "Abierto" },
                                                { value: "PENDING", label: "Pendiente" },
                                                { value: "CLOSED", label: "Cerrado" },
                                            ]}
                                            style={{ width: "100%" }}
                                            size="small"
                                        />
                                    </div>

                                    <div>
                                        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                                            Prioridad
                                        </div>
                                        <Select
                                            value={ticketDetalle.priority}
                                            onChange={(v) => updateTicket({ priority: v })}
                                            options={[
                                                { value: "LOW", label: "Baja" },
                                                { value: "NORMAL", label: "Media" },
                                                { value: "HIGH", label: "Alta" },
                                                { value: "URGENT", label: "Urgente" },
                                            ]}
                                            style={{ width: "100%" }}
                                            size="small"
                                        />
                                    </div>

                                    <div>
                                        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                                            Asignado a
                                        </div>
                                        <Select
                                            allowClear
                                            value={ticketDetalle.assignee?.id_tecnico}
                                            onChange={(v) => updateTicket({ assigneeId: v ?? null })}
                                            placeholder="Sin asignar"
                                            options={tecnicos.map((t) => ({
                                                value: t.id_tecnico,
                                                label: t.nombre,
                                            }))}
                                            style={{ width: "100%" }}
                                            size="small"
                                        />
                                    </div>
                                </div>
                            </div>

                            {ticketDetalle.sla && (
                                <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
                                    <div className="font-semibold text-sm text-gray-800 mb-3">SLA</div>

                                    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
                                        <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                                            <div>
                                                <div className="text-xs text-gray-400 mb-0.5">SLA 1ª respuesta</div>
                                                <div className="text-xs text-gray-600">
                                                    Vence:{" "}
                                                    {ticketDetalle.sla.firstResponse?.dueAt
                                                        ? formatDateTime(ticketDetalle.sla.firstResponse.dueAt)
                                                        : "-"}
                                                </div>
                                            </div>
                                            <Tag
                                                color={slaColor(ticketDetalle.sla.firstResponse?.status)}
                                                className="m-0"
                                            >
                                                {slaLabel(ticketDetalle.sla.firstResponse?.status)}
                                            </Tag>
                                        </div>

                                        <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                                            <div>
                                                <div className="text-xs text-gray-400 mb-0.5">SLA cierre</div>
                                                <div className="text-xs text-gray-600">
                                                    Vence:{" "}
                                                    {ticketDetalle.sla.resolution?.dueAt
                                                        ? formatDateTime(ticketDetalle.sla.resolution.dueAt)
                                                        : "-"}
                                                </div>
                                            </div>
                                            <Tag
                                                color={slaColor(ticketDetalle.sla.resolution?.status)}
                                                className="m-0"
                                            >
                                                {slaLabel(ticketDetalle.sla.resolution?.status)}
                                            </Tag>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
                                <div className="font-semibold text-sm text-gray-800 mb-3">
                                    Resumen de actividad
                                </div>

                                <div className="space-y-2 text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <ClockCircleOutlined />
                                        <span>Última actividad: {formatRelativeTime(lastMessage?.createdAt)}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {lastActivityBy === "client" ? (
                                            <MessageOutlined />
                                        ) : lastActivityBy === "agent" ? (
                                            <TeamOutlined />
                                        ) : lastActivityBy === "internal" ? (
                                            <EditOutlined />
                                        ) : (
                                            <ExclamationCircleOutlined />
                                        )}
                                        <span>
                                            {lastActivityBy === "client"
                                                ? "Última acción del cliente"
                                                : lastActivityBy === "agent"
                                                    ? "Última acción de soporte"
                                                    : lastActivityBy === "internal"
                                                        ? "Última acción interna"
                                                        : "Sin actividad"}
                                        </span>
                                    </div>

                                    {ticketDetalle.updatedAt && (
                                        <div className="flex items-center gap-2">
                                            <CheckCircleOutlined />
                                            <span>Actualizado: {formatDateTime(ticketDetalle.updatedAt)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}