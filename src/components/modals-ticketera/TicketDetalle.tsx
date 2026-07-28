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
    Modal,
    Alert
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
    ArrowsAltOutlined,
} from "@ant-design/icons";
import DOMPurify from "dompurify";
import { notification } from "antd";

import { useLocation, useNavigate, useParams } from "react-router-dom";

import { api } from "../../api/api";
import { useAuth } from "../../components/hooks/useAuth"

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

type LiveSlaStatus = "PENDING" | "OK" | "BREACHED";

type LiveSlaItem = {
    dueAt?: string | null;
    at?: string | null;
    status?: LiveSlaStatus;
};

function getLiveSlaStatus(
    sla: LiveSlaItem | undefined,
    now: number
): LiveSlaStatus | undefined {
    if (!sla) return undefined;

    if (sla.at) {
        return sla.status;
    }

    if (!sla.dueAt) {
        return sla.status;
    }

    const dueTime = new Date(sla.dueAt).getTime();

    if (Number.isNaN(dueTime)) {
        return sla.status;
    }

    return now >= dueTime ? "BREACHED" : "PENDING";
}

function getSlaRemainingText(
    sla: LiveSlaItem | undefined,
    now: number
): string {
    if (!sla) {
        return "Sin información";
    }

    if (sla.at) {
        return sla.status === "OK"
            ? "Finalizado dentro del plazo"
            : "Finalizado fuera del plazo";
    }

    if (!sla.dueAt) {
        return "Sin vencimiento";
    }

    const dueTime = new Date(sla.dueAt).getTime();

    if (Number.isNaN(dueTime)) {
        return "Fecha inválida";
    }

    const difference = dueTime - now;
    const absoluteMinutes = Math.floor(
        Math.abs(difference) / 60_000
    );

    const days = Math.floor(absoluteMinutes / 1440);
    const hours = Math.floor(
        (absoluteMinutes % 1440) / 60
    );
    const minutes = absoluteMinutes % 60;

    const parts: string[] = [];

    if (days > 0) {
        parts.push(`${days} d`);
    }

    if (hours > 0) {
        parts.push(`${hours} h`);
    }

    parts.push(`${minutes} min`);

    return difference >= 0
        ? `Quedan ${parts.join(" ")}`
        : `Vencido hace ${parts.join(" ")}`;
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

    const inlineMap = new Map<string, number>();
    attachments
        .filter((a) => a.isInline && a.contentId)
        .forEach((a) => {
            inlineMap.set(a.contentId!, a.id);
        });

    return html.replace(
        /<img[^>]+src=["']cid:([^"']+)["'][^>]*>/gi,
        (_match, cid) => {
            const cleanCid = cid.replace(/^</, "").replace(/>$/, "");
            const attachmentId = inlineMap.get(cleanCid);
            if (!attachmentId) return "";
            const att = attachments.find((a) => a.id === attachmentId);
            if (!att) return "";
            return `<img src="${att.url.startsWith("http")
                ? att.url
                : `${API_URL.replace("/api", "")}${att.url}`
                }" loading="lazy" style="max-width:100%;height:auto;display:block;border-radius:8px;" />`;
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

const MAX_REPLY_FILE_SIZE_MB = 50;
const MAX_REPLY_FILE_SIZE_BYTES = MAX_REPLY_FILE_SIZE_MB * 1024 * 1024;
const MAX_REPLY_FILES = 10;

function getApiErrorMessage(error: any) {
    const data = error?.response?.data;

    if (data?.detail) return data.detail;
    if (data?.message) return data.message;
    if (data?.error) return data.error;

    if (!error?.response) {
        return "No se pudo conectar con el servidor. Si estás adjuntando archivos, revisa que no superen el límite permitido o intenta nuevamente.";
    }

    return error?.message || "Error inesperado al procesar la solicitud.";
}

// Componente para mostrar el detalle de un ticket, con su historial de mensajes, información del ticket, y panel de respuesta. Incluye manejo de carga, actualización, y envío de respuestas internas o al cliente, con soporte para archivos adjuntos y visualización de correos enriquecidos.
export default function TicketDetailPage() {
    const { isCliente } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();

    const location = useLocation();

    const [ticketDetalle, setTicketDetalle] = useState<TicketDetail | null>(null);
    const [loadingDetalle, setLoadingDetalle] = useState(true);

    const [now, setNow] = useState(() => Date.now());

    const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);

    const [replyText, setReplyText] = useState("");
    const [internalNoteText, setInternalNoteText] = useState("");
    const [sendingReply, setSendingReply] = useState(false);
    const [replyError, setReplyError] = useState<string | null>(null);

    const [toEmails, setToEmails] = useState<string[]>([]);
    const [ccEmails, setCcEmails] = useState<string[]>([]);

    const [contactos, setContactos] = useState<any[]>([]);
    const [loadingContactos, setLoadingContactos] = useState(false);

    const [replyFiles, setReplyFiles] = useState<File[]>([]);

    const replyFileInputRef = useRef<HTMLInputElement>(null);

    const [showReplyPanel, setShowReplyPanel] = useState(false);

    const [permissionModal, setPermissionModal] = useState<{
        open: boolean;
        message: string;
    }>({
        open: false,
        message: "",
    });

    const debounce = (fn: any, delay: number) => {
        let timer: any;
        return (...args: any[]) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    };

    const handleAddReplyFiles = (fileList: FileList | null) => {
        setReplyError(null);

        if (!fileList || fileList.length === 0) {
            notification.warning({
                message: "No se seleccionaron archivos",
                description: "Intenta seleccionar el archivo nuevamente.",
                placement: "topRight",
                duration: 4,
            });
            return;
        }

        const incomingFiles = Array.from(fileList);

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "application/vnd.ms-excel.sheet.macroEnabled.12",
            "text/plain",
        ];

        const invalidFile = incomingFiles.find(
            (file) => !allowedTypes.includes(file.type)
        );

        if (invalidFile) {
            const msg = `El archivo "${invalidFile.name}" no tiene un formato permitido.`;

            setReplyError(msg);

            notification.error({
                message: "Tipo de archivo no permitido",
                description: msg,
                placement: "topRight",
                duration: 6,
            });

            return;
        }

        const tooLargeFile = incomingFiles.find(
            (file) => file.size > MAX_REPLY_FILE_SIZE_BYTES
        );

        if (tooLargeFile) {
            const sizeMb = (tooLargeFile.size / 1024 / 1024).toFixed(2);

            const msg = `El archivo "${tooLargeFile.name}" pesa ${sizeMb} MB y supera el máximo permitido de ${MAX_REPLY_FILE_SIZE_MB} MB.`;

            setReplyError(msg);

            notification.error({
                message: "Archivo demasiado grande",
                description: msg,
                placement: "topRight",
                duration: 6,
            });

            return;
        }

        const totalFiles = replyFiles.length + incomingFiles.length;

        if (totalFiles > MAX_REPLY_FILES) {
            const msg = `Solo puedes adjuntar hasta ${MAX_REPLY_FILES} archivos por respuesta.`;

            setReplyError(msg);

            notification.warning({
                message: "Demasiados adjuntos",
                description: msg,
                placement: "topRight",
                duration: 6,
            });

            return;
        }

        setReplyFiles((prev) => [...prev, ...incomingFiles]);

        message.success(
            incomingFiles.length === 1
                ? "Archivo adjuntado correctamente"
                : `${incomingFiles.length} archivos adjuntados correctamente`
        );
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

    // Determinar si el formulario de respuesta es válido para enviar, basado en que haya texto o archivos adjuntos, y que haya al menos un destinatario
    const loadTecnicos = async () => {
        const { data } = await api.get("/tecnicos");
        setTecnicos(Array.isArray(data) ? data : []);
    };

    // Función para cargar el detalle del ticket, incluyendo su información y mensajes, y preparar el formulario de respuesta con destinatarios y texto predefinido. Maneja estados de carga y errores.
    const loadTicket = async (
        options: {
            silent?: boolean;
            initializeReply?: boolean;
        } = {}
    ) => {
        if (!id) return;

        if (!options.silent) {
            setLoadingDetalle(true);
        }

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

            if (options.initializeReply) {
                setToEmails(
                    uniqueEmails(
                        ticket.replyRecipients?.to?.length
                            ? ticket.replyRecipients.to
                            : [
                                ticket.requester?.email,
                                ticket.fromEmail,
                            ]
                    )
                );

                const nextCc = uniqueEmails(
                    ticket.replyRecipients?.cc?.length
                        ? ticket.replyRecipients.cc
                        : []
                );

                setCcEmails(nextCc);

                setReplyText(
                    `Estimado(a) ${ticket.requester?.nombre ?? ""},

Gracias por contactarnos.

Quedamos atentos a su respuesta.

Saludos cordiales,
Soporte Técnico`
                );
            }

        } catch {
            if (!options.silent) {
                message.error("Error al cargar detalle");
            }
        } finally {
            if (!options.silent) {
                setLoadingDetalle(false);
            }
        }
    };

    const loadTicketRef = useRef(loadTicket);

    useEffect(() => {
        loadTicketRef.current = loadTicket;
    });

    // Función para descargar un archivo adjunto, haciendo una llamada a la API para obtener el archivo y luego creando un enlace de descarga para el usuario.
    const descargarAdjunto = async (att: {
        id: number;
        filename: string;
        mimeType?: string;
    }) => {
        try {
            const res = await api.get(
                `/helpdesk/tickets/attachments/${att.id}/download`,
                {
                    responseType: "blob",
                }
            );

            const blob = new Blob([res.data], {
                type: res.headers["content-type"] || att.mimeType || "application/octet-stream",
            });

            const url = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = att.filename || "adjunto";
            document.body.appendChild(link);
            link.click();

            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error: any) {
            console.error("Error descargando adjunto:", {
                status: error?.response?.status,
                data: error?.response?.data,
                message: error?.message,
            });

            message.error("No se pudo descargar el adjunto");
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
            console.error("❌ Error actualizando ticket:", {
                status: error?.response?.status,
                data: error?.response?.data,
                message: error?.message,
                payload,
            });

            const backendMessage =
                error?.response?.data?.message ||
                error?.message ||
                "No se pudo actualizar el ticket";

            if (error?.response?.status === 403) {
                console.log("🟡 Mostrando modal permiso denegado");

                setPermissionModal({
                    open: true,
                    message: backendMessage,
                });

                return;
            }

            message.error(backendMessage);
            await loadTicket();
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

        setReplyError(null);

        const tooLargeFile = replyFiles.find(
            (file) => file.size > MAX_REPLY_FILE_SIZE_BYTES
        );

        if (tooLargeFile) {
            notification.error({
                message: "Archivo demasiado grande",
                description: `El archivo "${tooLargeFile.name}" supera el máximo permitido de ${MAX_REPLY_FILE_SIZE_MB} MB.`,
                placement: "topRight",
                duration: 6,
            });

            return;
        }

        if (replyFiles.length > MAX_REPLY_FILES) {
            notification.warning({
                message: "Demasiados adjuntos",
                description: `Solo puedes adjuntar hasta ${MAX_REPLY_FILES} archivos por respuesta.`,
                placement: "topRight",
                duration: 6,
            });

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

            await api.post(`/helpdesk/tickets/${ticketDetalle.id}/reply`, formData);

            if (isInternal) {
                setInternalNoteText("");
                setReplyFiles([]);

                message.success("Nota interna guardada");

                await loadTicket();
                return;
            }

            setReplyText("");
            setReplyFiles([]);

            message.success("Respuesta enviada");

            navigate(`/helpdesk${location.search}`, {
                replace: true,
            });

        } catch (error: any) {
            console.error("❌ Error respondiendo ticket:", {
                status: error?.response?.status,
                data: error?.response?.data,
                message: error?.message,
                code: error?.code,
            });

            const errorMessage = getApiErrorMessage(error);

            setReplyError(errorMessage);

            notification.error({
                message: "No se pudo responder el ticket",
                description: errorMessage,
                placement: "topRight",
                duration: 8,
            });

            message.error(errorMessage);
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

    const mensajesOrdenados = useMemo(() => {
        return [...(ticketDetalle?.messages ?? [])].sort(
            (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
        );
    }, [ticketDetalle?.messages]);

    useEffect(() => {
        if (isCliente) return;

        void loadTecnicos();
    }, [isCliente]);

    useEffect(() => {
        setReplyText("");
        setInternalNoteText("");
        setReplyFiles([]);

        void loadTicket({
            initializeReply: true,
        });
    }, [id]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            setNow(Date.now());
        }, 30_000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, []);

    useEffect(() => {
        if (!id) {
            return;
        }

        const intervalId = window.setInterval(() => {
            void loadTicketRef.current({
                silent: true,
                initializeReply: false,
            });
        }, 2 * 60_000);

        return () => {
            window.clearInterval(intervalId);
        };
    }, [id]);

    const lastMessage =
        mensajesOrdenados[0] ?? null;

    const firstResponseSlaStatus = getLiveSlaStatus(
        ticketDetalle?.sla?.firstResponse,
        now
    );

    const resolutionSlaStatus = getLiveSlaStatus(
        ticketDetalle?.sla?.resolution,
        now
    );

    const firstResponseRemainingText = getSlaRemainingText(
        ticketDetalle?.sla?.firstResponse,
        now
    );

    const resolutionRemainingText = getSlaRemainingText(
        ticketDetalle?.sla?.resolution,
        now
    );

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
            <Modal
                open={permissionModal.open}
                title="Permiso denegado"
                okText="Entendido"
                cancelButtonProps={{ style: { display: "none" } }}
                centered
                zIndex={9999}
                onOk={async () => {
                    setPermissionModal({
                        open: false,
                        message: "",
                    });

                    await loadTicket();
                }}
                onCancel={() => {
                    setPermissionModal({
                        open: false,
                        message: "",
                    });
                }}
            >
                <p>{permissionModal.message}</p>
            </Modal>
            <div className="w-full px-4 xl:px-6 py-4 h-[calc(110vh-0px)] flex flex-col">
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

                                {mensajesOrdenados
                                    .filter((mensaje) => {
                                        if (isCliente && mensaje.isInternal) {
                                            return false;
                                        }

                                        return true;
                                    })
                                    .map((m) => {
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
                                                                            <button
                                                                                key={att.id}
                                                                                type="button"
                                                                                onClick={() => descargarAdjunto(att)}
                                                                                className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-700 no-underline border border-gray-200"
                                                                            >
                                                                                <PaperClipOutlined />
                                                                                {att.filename}
                                                                            </button>
                                                                        ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>

                        <div className="shrink-0 bg-gray-50 border-t border-gray-200">
                            {!isCliente && (
                                <>
                                    <div className="flex items-center justify-between px-6 py-3">
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
                                        <div className="px-6 pb-4 h-[min(720px,65vh)] min-h-[420px] overflow-hidden">
                                            <Tabs
                                                className="h-full"
                                                items={[
                                                    {
                                                        key: "reply",
                                                        label: (
                                                            <span className="flex items-center gap-1">
                                                                <SendOutlined /> Responder al cliente
                                                            </span>
                                                        ),
                                                        children: (
                                                            <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
                                                                {replyError && (
                                                                    <Alert
                                                                        type="error"
                                                                        showIcon
                                                                        closable
                                                                        message="No se pudo enviar la respuesta"
                                                                        description={replyError}
                                                                        onClose={() => setReplyError(null)}
                                                                    />
                                                                )}
                                                                <div className="shrink-0">
                                                                    <div className="mb-1">
                                                                        <span className="text-xs text-gray-500">
                                                                            Para:
                                                                        </span>
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

                                                                    <div className="mt-3">
                                                                        <div className="mb-1">
                                                                            <span className="text-xs text-gray-500">
                                                                                CC:
                                                                            </span>
                                                                        </div>

                                                                        <Select
                                                                            mode="tags"
                                                                            showSearch
                                                                            placeholder="Agregar destinatarios en copia"
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
                                                                    <div className="relative">
                                                                        <Input.TextArea
                                                                            value={replyText}
                                                                            onChange={(e) => setReplyText(e.target.value)}
                                                                            placeholder="Escribe tu respuesta al cliente..."
                                                                            autoSize={false}
                                                                            spellCheck={true}
                                                                            lang="es-CL"
                                                                            className="ticket-resizable-textarea"
                                                                            style={{
                                                                                minHeight: "150px",
                                                                                maxHeight: "420px",
                                                                                resize: "vertical",
                                                                                paddingBottom: "32px",
                                                                            }}
                                                                        />

                                                                        <div className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-600 shadow-sm">
                                                                            <ArrowsAltOutlined className="text-xm" />
                                                                        </div>
                                                                    </div>

                                                                    <div className="mt-1 text-[11px] text-gray-400">
                                                                        Puedes arrastrar la esquina inferior derecha para ampliar o reducir el área de respuesta.
                                                                    </div>
                                                                </div>

                                                                <div className="shrink-0 border-t border-gray-200 bg-gray-50 pt-3 flex items-center gap-2 flex-wrap">
                                                                    <input
                                                                        ref={replyFileInputRef}
                                                                        type="file"
                                                                        multiple
                                                                        hidden
                                                                        onChange={(e) => {
                                                                            handleAddReplyFiles(e.target.files);
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

                                                                    {ticketDetalle.status !== "CLOSED" && (
                                                                        <Button onClick={() => updateTicket({ status: "CLOSED" })}>
                                                                            Cerrar ticket
                                                                        </Button>
                                                                    )}

                                                                    <Button
                                                                        type="primary"
                                                                        loading={sendingReply}
                                                                        onClick={() => responderTicket(false)}
                                                                        icon={<SendOutlined />}
                                                                        className="ml-auto"
                                                                    >
                                                                        Enviar respuesta
                                                                    </Button>
                                                                </div>
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
                                                            <div className="flex h-full min-h-0 flex-col gap-3">
                                                                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                                                                    <Input.TextArea
                                                                        value={internalNoteText}
                                                                        onChange={(e) => setInternalNoteText(e.target.value)}
                                                                        placeholder="Escribe una nota interna (no visible para el cliente)..."
                                                                        autoSize={false}
                                                                        spellCheck={true}
                                                                        lang="es-CL"
                                                                        style={{
                                                                            height: "clamp(150px, 40vh, 400px)",
                                                                            minHeight: "150px",
                                                                            resize: "vertical",
                                                                            background: "#fffbeb", // fondo amarillo suave para distinguirla
                                                                        }}
                                                                    />
                                                                </div>

                                                                <div className="shrink-0 border-t border-gray-200 bg-gray-50 pt-3 flex items-center gap-2 flex-wrap">
                                                                    <input
                                                                        ref={replyFileInputRef}
                                                                        type="file"
                                                                        multiple
                                                                        hidden
                                                                        accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx,.xlsm,.txt"
                                                                        onChange={(e) => {
                                                                            handleAddReplyFiles(e.target.files);
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
                                                                        className="ml-auto"
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
                                </>
                            )}
                        </div>
                    </div>

                    <aside className="min-h-0 overflow-y-auto bg-gray-50/80">
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

                                    {/* Estado — selector para internos, texto para CLIENTE */}
                                    <div>
                                        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                                            Estado
                                        </div>
                                        {isCliente ? (
                                            <Tag color={statusColor(ticketDetalle.status)}>
                                                {TICKET_STATUS_LABEL[ticketDetalle.status] ?? ticketDetalle.status}
                                            </Tag>
                                        ) : (
                                            <Select
                                                value={ticketDetalle.status}
                                                onChange={(v) => {
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
                                        )}
                                    </div>

                                    {/* Prioridad — selector para internos, texto para CLIENTE */}
                                    <div>
                                        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                                            Prioridad
                                        </div>
                                        {isCliente ? (
                                            <Tag color={priorityColor(ticketDetalle.priority)}>
                                                {TICKET_PRIORITY_LABEL[ticketDetalle.priority] ?? ticketDetalle.priority}
                                            </Tag>
                                        ) : (
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
                                        )}
                                    </div>

                                    {/* Asignado — selector para internos, texto para CLIENTE */}
                                    <div>
                                        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                                            Asignado a
                                        </div>
                                        {isCliente ? (
                                            <div className="font-medium text-gray-700">
                                                {ticketDetalle.assignee?.nombre ?? (
                                                    <span className="italic text-gray-400 text-xs">Sin asignar</span>
                                                )}
                                            </div>
                                        ) : (
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
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* SLA — solo para internos */}
                            {!isCliente && ticketDetalle.sla && (
                                <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
                                    <div className="font-semibold text-sm text-gray-800 mb-3">SLA</div>
                                    <div className="flex h-full min-h-0 flex-col gap-3">
                                        <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                                            <div>
                                                <div className="text-xs text-gray-400 mb-0.5">
                                                    SLA 1ª respuesta
                                                </div>

                                                <div className="text-xs text-gray-600">
                                                    Vence:{" "}
                                                    {ticketDetalle.sla.firstResponse?.dueAt
                                                        ? formatDateTime(
                                                            ticketDetalle.sla.firstResponse.dueAt
                                                        )
                                                        : "-"}
                                                </div>

                                                <div
                                                    className={`mt-1 text-xs font-medium ${firstResponseSlaStatus === "BREACHED"
                                                        ? "text-red-600"
                                                        : firstResponseSlaStatus === "OK"
                                                            ? "text-green-600"
                                                            : "text-amber-600"
                                                        }`}
                                                >
                                                    {firstResponseRemainingText}
                                                </div>
                                            </div>

                                            <Tag
                                                color={slaColor(firstResponseSlaStatus)}
                                                className="m-0"
                                            >
                                                {slaLabel(firstResponseSlaStatus)}
                                            </Tag>
                                        </div>

                                        <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                                            <div>
                                                <div className="text-xs text-gray-400 mb-0.5">
                                                    SLA cierre
                                                </div>

                                                <div className="text-xs text-gray-600">
                                                    Vence:{" "}
                                                    {ticketDetalle.sla.resolution?.dueAt
                                                        ? formatDateTime(
                                                            ticketDetalle.sla.resolution.dueAt
                                                        )
                                                        : "-"}
                                                </div>

                                                <div
                                                    className={`mt-1 text-xs font-medium ${resolutionSlaStatus === "BREACHED"
                                                        ? "text-red-600"
                                                        : resolutionSlaStatus === "OK"
                                                            ? "text-green-600"
                                                            : "text-amber-600"
                                                        }`}
                                                >
                                                    {resolutionRemainingText}
                                                </div>
                                            </div>

                                            <Tag
                                                color={slaColor(resolutionSlaStatus)}
                                                className="m-0"
                                            >
                                                {slaLabel(resolutionSlaStatus)}
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