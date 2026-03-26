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
import { useNavigate, useParams } from "react-router-dom";

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
    ON_HOLD: "En espera",
    RESOLVED: "Resuelto",
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
                }" loading="lazy" />`;
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

export default function TicketDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [ticketDetalle, setTicketDetalle] = useState<TicketDetail | null>(null);
    const [loadingDetalle, setLoadingDetalle] = useState(true);

    const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);

    const [replyText, setReplyText] = useState("");
    const [internalNoteText, setInternalNoteText] = useState("");
    const [sendingReply, setSendingReply] = useState(false);

    const [toEmails, setToEmails] = useState<string[]>([]);
    const [ccEmails, setCcEmails] = useState<string[]>([]);
    const [showCc, setShowCc] = useState(false);

    const [contactos, setContactos] = useState<any[]>([]);
    const [loadingContactos, setLoadingContactos] = useState(false);

    const [replyFiles, setReplyFiles] = useState<File[]>([]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const replyFileInputRef = useRef<HTMLInputElement>(null);

    const debounce = (fn: any, delay: number) => {
        let timer: any;
        return (...args: any[]) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    };

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

    const debouncedSearchContactos = useMemo(
        () => debounce(handleSearchContactos, 400),
        []
    );

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const loadTecnicos = async () => {
        const { data } = await api.get("/tecnicos");
        setTecnicos(Array.isArray(data) ? data : []);
    };

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

            setToEmails(uniqueEmails([ticket.requester?.email, ticket.fromEmail]));

            const lastMsg = ticket.messages?.[0];
            setCcEmails(uniqueEmails(lastMsg?.cc ? lastMsg.cc : []));

            setReplyText(`Estimado(a) ${ticket.requester?.nombre ?? ""},

Gracias por contactarnos.

Quedamos atentos a su respuesta.

Saludos cordiales,
Soporte Técnico`);
        } catch {
            message.error("Error al cargar detalle");
        } finally {
            setLoadingDetalle(false);
        }
    };

    const updateTicket = async (payload: {
        status?: string;
        priority?: string;
        assigneeId?: number | null;
    }) => {
        if (!ticketDetalle) return;

        try {
            await api.patch(`/helpdesk/tickets/${ticketDetalle.id}`, payload);
            await loadTicket();
            message.success("Ticket actualizado");
        } catch (error: any) {
            message.error(error?.response?.data?.message || "No se pudo actualizar el ticket");
        }
    };

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
            } else {
                setReplyText("");
                message.success("Respuesta enviada");
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

    useEffect(() => {
        if (ticketDetalle?.messages) scrollToBottom();
    }, [ticketDetalle]);

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

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-[1600px] mx-auto px-4 py-4 h-[calc(100vh-24px)] flex flex-col">
                <div className="shrink-0 border-b border-gray-200 bg-white rounded-t-2xl px-6 py-5">
                    <div className="flex items-center justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3">
                            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
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

                    <h1 className="text-xl font-semibold text-gray-900">
                        {ticketDetalle.subject}
                    </h1>
                </div>

                <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] bg-white rounded-b-2xl overflow-hidden border border-gray-200 border-t-0 shadow-sm">
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

                        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
                            <div className="relative pl-10">
                                <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200 z-0" />

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
                                            <div className="absolute left-[-36px] top-3 z-10">
                                                <div
                                                    className={`w-8 h-8 rounded-full ${avatarBg} flex items-center justify-center shadow-sm`}
                                                >
                                                    {avatarIcon}
                                                </div>
                                            </div>

                                            <div
                                                className={`rounded-xl shadow-sm border ${bgColor} ${borderColor} border-l-4`}
                                            >
                                                <div className="px-5 py-4 border-b border-gray-100">
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
                                                        <div className="mt-2 text-xs text-gray-400 space-y-0.5">
                                                            {m.fromEmail && (
                                                                <div>
                                                                    <span className="font-medium text-gray-500">De:</span>{" "}
                                                                    {m.fromEmail}
                                                                </div>
                                                            )}

                                                            {(() => {
                                                                const toList =
                                                                    typeof m.toEmail === "string"
                                                                        ? m.toEmail.split(",").map((v) => v.trim()).filter(Boolean)
                                                                        : [];
                                                                if (!toList.length) return null;

                                                                return (
                                                                    <div className="flex flex-wrap gap-1 items-center">
                                                                        <span className="font-medium text-gray-500">Para:</span>
                                                                        {toList.map((e, i) => (
                                                                            <Tag key={i} className="text-xs m-0">
                                                                                {e}
                                                                            </Tag>
                                                                        ))}
                                                                    </div>
                                                                );
                                                            })()}

                                                            {(() => {
                                                                const ccList = Array.isArray(m.cc) ? m.cc : [];
                                                                if (!ccList.length) return null;

                                                                return (
                                                                    <div className="flex flex-wrap gap-1 items-center">
                                                                        <span className="font-medium text-gray-500">CC:</span>
                                                                        {ccList.map((e, i) => (
                                                                            <Tag key={i} className="text-xs m-0">
                                                                                {e}
                                                                            </Tag>
                                                                        ))}
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="px-5 py-4">
                                                    {hasUnresolvedCidImages(m.bodyHtml, m.attachments) && (
                                                        <div className="mb-3 px-3 py-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg">
                                                            ⚠️ Algunas imágenes de la firma no pudieron mostrarse.
                                                        </div>
                                                    )}

                                                    {m.bodyHtml ? (
                                                        <iframe
                                                            srcDoc={DOMPurify.sanitize(
                                                                resolveInlineImages(m.bodyHtml, m.attachments),
                                                                {
                                                                    ADD_ATTR: ["target", "src", "style", "width", "height"],
                                                                    ADD_TAGS: ["img", "table", "tbody", "tr", "td"],
                                                                }
                                                            )}
                                                            sandbox="allow-same-origin allow-popups"
                                                            className="w-full border-0 rounded"
                                                            style={{ minHeight: "80px" }}
                                                            onLoad={(e) => {
                                                                const iframe = e.currentTarget;
                                                                try {
                                                                    const h =
                                                                        iframe.contentDocument?.documentElement?.scrollHeight;
                                                                    if (h) iframe.style.height = `${h}px`;
                                                                } catch { }
                                                            }}
                                                        />
                                                    ) : (
                                                        <div
                                                            className="prose prose-sm max-w-none text-gray-700"
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

                        <div className="shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-4">
                            <Tabs
                                items={[
                                    {
                                        key: "reply",
                                        label: (
                                            <span className="flex items-center gap-1">
                                                <SendOutlined /> Responder al cliente
                                            </span>
                                        ),
                                        children: (
                                            <div className="space-y-3">
                                                <div>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="text-xs text-gray-500">Para:</span>
                                                        {!showCc && (
                                                            <Button size="small" type="link" onClick={() => setShowCc(true)}>
                                                                + CC
                                                            </Button>
                                                        )}
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
                                                </div>

                                                {showCc && (
                                                    <div>
                                                        <span className="text-xs text-gray-500">CC:</span>
                                                        <Select
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
                                                )}

                                                <Input.TextArea
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    placeholder="Escribe tu respuesta al cliente..."
                                                    className="resize-none"
                                                    autoSize={{ minRows: 3, maxRows: 6 }}
                                                />

                                                <div className="flex items-center gap-2 flex-wrap">
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
                                            <div className="space-y-3">
                                                <Input.TextArea
                                                    value={internalNoteText}
                                                    onChange={(e) => setInternalNoteText(e.target.value)}
                                                    placeholder="Nota interna visible solo para agentes..."
                                                    className="resize-none bg-amber-50 border-amber-200"
                                                    autoSize={{ minRows: 3, maxRows: 5 }}
                                                />
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                                        <EyeInvisibleOutlined /> Solo visible para agentes
                                                    </span>
                                                    <Button
                                                        loading={sendingReply}
                                                        onClick={() => responderTicket(true)}
                                                        icon={<EditOutlined />}
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
                    </div>

                    <aside className="min-h-0 overflow-y-auto bg-gray-50/80">
                        <div className="p-6 space-y-6">
                            <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
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
                                                { value: "RESOLVED", label: "Resuelto" },
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

                                    <div className="space-y-3">
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