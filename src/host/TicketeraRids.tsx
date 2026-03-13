import { useEffect, useState, useRef } from "react";
import {
    Card,
    List,
    Tag,
    Spin,
    Button,
    Empty,
    Drawer,
    Input,
    Select,
    Space,
    message,
    Divider,
    Badge,
    Avatar,
    Row,
    Col,
    Tooltip,
    Typography,
    Dropdown,
    Menu,
    Tabs,
    Timeline,
    Descriptions,
    Pagination,
    Modal,
} from "antd";
import {
    PlusOutlined,
    ReloadOutlined,
    UserOutlined,
    MessageOutlined,
    PaperClipOutlined,
    SearchOutlined,
    FilterOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    TeamOutlined,
    PhoneOutlined,
    MailOutlined,
    MoreOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined,
    SettingOutlined,
    SendOutlined,
    EditOutlined,
    EyeInvisibleOutlined,
    BellOutlined

} from "@ant-design/icons";
import Header from "../components/Header";

import DOMPurify from "dompurify";

import { socket } from "../lib/socket";

import { notification } from "antd";

import { api } from "../api/api";

/* ===================== CONFIG ===================== */
const API_URL =
    (import.meta as any).env?.VITE_API_URL || "http://localhost:4000/api";

/* ===================== TYPES ===================== */
// Tipo para tickets en la lista
type Ticket = {
    id: number;
    publicId?: string;
    subject: string;
    status: string;
    priority: string;
    empresa?: { nombre: string };
    assignee?: { id_tecnico: number; nombre: string; email?: string };
    createdAt?: string;
    updatedAt?: string;
    rolAsignado?: string | null;
    requester?: { nombre: string; email?: string };
    fromEmail?: string;
    lastActivityAt?: string;
    lastMessageDirection?:
    | "INBOUND"
    | "OUTBOUND"
    | "INTERNAL"
    | null;
};

// Tipo para empresas en el formulario de creación
type Empresa = {
    id_empresa: number;
    nombre: string;
};

// Tipo para solicitantes en el formulario de creación
type SolicitanteOption = {
    value: number;
    label: string;
};

// Tipo para técnicos (filtro y asignación)
type Tecnico = {
    id_tecnico: number;
    nombre: string;
    avatar?: string;
    online?: boolean;
};

type AreaFilter = "TODAS" | "SOPORTE" | "INFORMATICA" | "VENTAS";

// Detalle del ticket con mensajes
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
    author?: {
        nombre: string;
        avatar?: string;
    };
    requester?: {
        nombre: string;
        email?: string;
    };
    attachments?: Array<{
        id: number;
        filename: string;
        mimeType: string;
        bytes: number;
        url: string;
        isInline?: boolean;   // ✅ Añadir
        contentId?: string;   // ✅ Añadir
    }>;
};

/* ===================== COMPONENT ===================== */
export default function TicketeraRids() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [activeTab, setActiveTab] = useState("all");

    const [drawerCrear, setDrawerCrear] = useState(false);
    const [drawerDetalle, setDrawerDetalle] = useState(false);

    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [solicitantes, setSolicitantes] = useState<SolicitanteOption[]>([]);
    const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);

    const [ticketDetalle, setTicketDetalle] = useState<any>(null);
    const [loadingDetalle, setLoadingDetalle] = useState(false);

    const [replyText, setReplyText] = useState("");
    const [sendingReply, setSendingReply] = useState(false);

    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [priorityFilter, setPriorityFilter] = useState<string | undefined>();
    const [assigneeFilter, setAssigneeFilter] = useState<number | undefined>();
    const [areaFilter, setAreaFilter] = useState<AreaFilter>("TODAS");

    const [internalNoteText, setInternalNoteText] = useState("");

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(30);
    const [totalTickets, setTotalTickets] = useState(0);

    const [dateRange, setDateRange] = useState<[string, string] | null>(null);

    const [newTicketsCount, setNewTicketsCount] = useState<number>(0);

    const [, forceUpdate] = useState(0);

    const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

    const [activeRange, setActiveRange] = useState<string | null>(null);

    const [selectedTickets, setSelectedTickets] = useState<number[]>([]);

    // Estados para modales de bulk actions
    const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false);
    const [bulkMergeModalOpen, setBulkMergeModalOpen] = useState(false);
    const [selectedTechnicianId, setSelectedTechnicianId] = useState<number | null>(null);
    const [selectedMainTicketId, setSelectedMainTicketId] = useState<number | null>(null);

    const [replyFiles, setReplyFiles] = useState<File[]>([]);

    const replyFileInputRef = useRef<HTMLInputElement>(null);

    // Referencia para scroll automático
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Etiquetas legibles para estados
    const TICKET_STATUS_LABEL: Record<string, string> = {
        NEW: "Nuevo",
        OPEN: "Abierto",
        PENDING: "Pendiente",
        ON_HOLD: "En espera",
        RESOLVED: "Resuelto",
        CLOSED: "Cerrado",
    };

    // Etiquetas legibles para prioridades
    const TICKET_PRIORITY_LABEL: Record<string, string> = {
        LOW: "Baja",
        NORMAL: "Media",
        HIGH: "Alta",
        URGENT: "Urgente",
    };

    // ICONOS DE PRIORIDAD: flechas y colores para cada nivel de prioridad
    const PRIORITY_ICONS = {
        LOW: <ArrowDownOutlined style={{ color: "#52c41a" }} />,
        NORMAL: <ExclamationCircleOutlined style={{ color: "#faad14" }} />,
        HIGH: <ArrowUpOutlined style={{ color: "#ff4d4f" }} />,
        URGENT: <ExclamationCircleOutlined style={{ color: "#f5222d" }} />,
    };

    // ICONOS DE ESTADO: colores y símbolos para cada estado del ticket
    const STATUS_ICONS = {
        NEW: <ClockCircleOutlined style={{ color: "#1890ff" }} />,
        OPEN: <ClockCircleOutlined style={{ color: "#fa8c16" }} />,
        PENDING: <ClockCircleOutlined style={{ color: "#faad14" }} />,
        RESOLVED: <CheckCircleOutlined style={{ color: "#52c41a" }} />,
        CLOSED: <CheckCircleOutlined style={{ color: "#8c8c8c" }} />,
    };

    const AREA_OPTIONS: Array<{ value: AreaFilter; label: string }> = [
        { value: "TODAS", label: "Todas las \u00e1reas" },
        { value: "SOPORTE", label: "Soporte" },
        { value: "INFORMATICA", label: "Inform\u00e1tica" },
        { value: "VENTAS", label: "Ventas" },
    ];

    // Formulario para crear ticket
    const [form, setForm] = useState({
        empresaId: undefined as number | undefined,
        requesterId: undefined as number | undefined,
        subject: "",
        message: "",
        priority: "NORMAL",
        assigneeId: undefined as number | undefined,
    });

    // Última actividad del ticket (solo para detalle)
    const lastMessage =
        ticketDetalle?.messages?.length > 0
            ? ticketDetalle.messages[ticketDetalle.messages.length - 1]
            : null;

    const lastActivityBy =
        lastMessage?.isInternal
            ? "internal"
            : lastMessage?.direction === "INBOUND"
                ? "client"
                : lastMessage
                    ? "agent"
                    : null;


    // Función para formatear fecha y hora
    function formatDateTime(date: string | Date) {
        return new Date(date).toLocaleString("es-CL", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    }

    // Función para obtener autor del mensaje
    function getMessageAuthor(m: TicketMessage, ticketDetalle: any) {
        if (m.isInternal) {
            return {
                name: m.author?.nombre ?? ticketDetalle.assignee?.nombre ?? "Agente",
                role: "Nota interna",
            };
        }

        if (m.direction === "INBOUND") {
            return {
                name:
                    ticketDetalle.requester?.nombre ??
                    m.requester?.nombre ??
                    m.fromEmail ??
                    "Cliente",
                role: "Cliente",
            };
        }

        return {
            name: m.author?.nombre ?? ticketDetalle.assignee?.nombre ?? "Agente",
            role: "Agente",
        };
    }

    // Función para resolver imágenes inline con cid
    function resolveInlineImages(
        html: string,
        attachments?: TicketMessage["attachments"]
    ) {
        if (!html) return html;

        // 🔥 CASO CLAVE: HTML con cid PERO sin adjuntos → eliminar imgs
        if (!attachments || attachments.length === 0) {
            return html.replace(
                /<img[^>]+src=["']cid:[^"']+["'][^>]*>/gi,
                ''
            );
        }

        const inlineMap = new Map<string, number>();

        attachments
            .filter(a => a.isInline && a.contentId)
            .forEach(a => {
                inlineMap.set(a.contentId!, a.id);
            });

        return html.replace(
            /<img[^>]+src=["']cid:([^"']+)["'][^>]*>/gi,
            (_match, cid) => {
                const cleanCid = cid.replace(/^</, '').replace(/>$/, '');
                const attachmentId = inlineMap.get(cleanCid);

                if (!attachmentId) {
                    // ⚠️ No hay match → eliminar imagen
                    return '';
                }

                const att = attachments.find(a => a.id === attachmentId);

                if (!att) return '';

                return `<img src="${att.url.startsWith("http")
                    ? att.url
                    : `${API_URL.replace('/api', '')}${att.url}`
                    }" loading="lazy" />`;
            }
        );
    }

    // Función para detectar si hay imágenes CID sin resolver
    function hasUnresolvedCidImages(
        html?: string | null,
        attachments?: TicketMessage["attachments"]
    ) {
        if (!html) return false;

        // ¿El HTML original tenía imágenes CID?
        const hasCidImages = /<img[^>]+src=["']cid:/i.test(html);
        if (!hasCidImages) return false;

        // ¿Hay adjuntos inline disponibles?
        const inlineCount = attachments?.filter(a => a.isInline).length ?? 0;

        // Si había CID pero no hay inline suficientes → aviso
        return inlineCount === 0;
    }

    // Función para tiempo relativo
    function formatRelativeTime(date: string | Date) {
        const now = new Date();
        const diffMs = now.getTime() - new Date(date).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) {
            return "Ahora";
        } else if (diffMins < 60) {
            return `Hace ${diffMins} min`;
        } else if (diffHours < 24) {
            return `Hace ${diffHours} h`;
        } else if (diffDays < 7) {
            return `Hace ${diffDays} d`;
        } else {
            return new Date(date).toLocaleDateString("es-CL");
        }
    }

    // Función para formatear cuerpo de email
    function formatEmailBody(text: string | null) {
        if (!text) return "";

        let formattedText = text;

        // Convertir URLs en enlaces
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        formattedText = formattedText.replace(urlRegex, '<a href="$1" target="_blank" class="text-blue-500 hover:text-blue-700 underline">$1</a>');

        // Mantener saltos de línea
        formattedText = formattedText.replace(/\n/g, '<br/>');

        // Negritas (texto entre ** **)
        formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

        return formattedText;
    }

    // Función para formatear hora del mensaje
    function formatMessageTime(date: string | Date) {
        return new Date(date).toLocaleTimeString("es-CL", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        });
    }

    /* ===================== LOAD DATA ===================== */
    const loadTickets = async () => {
        try {
            setLoading(true);

            const params = new URLSearchParams();

            params.append("page", page.toString());
            params.append("pageSize", pageSize.toString());

            if (statusFilter) params.append("status", statusFilter);
            if (priorityFilter) params.append("priority", priorityFilter);
            if (assigneeFilter) params.append("assigneeId", assigneeFilter.toString());
            const selectedArea = areaFilter === "TODAS" ? undefined : areaFilter;
            if (selectedArea) params.append("area", selectedArea);
            if (searchText) params.append("search", searchText);

            if (dateRange) {
                params.append("from", dateRange[0]);
                params.append("to", dateRange[1]);
            }

            const { data } = await api.get(`/helpdesk/tickets?${params.toString()}`);

            setTickets(data?.tickets ?? []);
            setTotalTickets(data?.total ?? 0);
            setStatusCounts(data?.counts ?? {});
        } catch (error) {
            message.error("Error al cargar tickets");
        } finally {
            setLoading(false);
        }
    };

    // Cargar empresas para el formulario de creación
    const loadEmpresas = async () => {
        const { data } = await api.get("/empresas");
        setEmpresas(data?.data ?? []);
    };

    // Cargar solicitantes al seleccionar empresa en el formulario de creación
    const loadSolicitantes = async (empresaId: number) => {
        const { data } = await api.get(
            `/solicitantes/by-empresa?empresaId=${empresaId}`
        );
        setSolicitantes(
            (data?.items ?? []).map((s: any) => ({
                value: s.id,
                label: s.nombre,
            }))
        );
    };

    // Cargar técnicos para filtro y asignación
    const loadTecnicos = async () => {
        const { data } = await api.get("/tecnicos");
        setTecnicos(Array.isArray(data) ? data : []);
    };

    // Scroll automático al final de los mensajes
    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    // Cargar datos iniciales
    useEffect(() => {
        loadEmpresas();
        loadTecnicos();
    }, []);

    // Recargar tickets al cambiar filtros o búsqueda
    useEffect(() => {
        loadTickets();
    }, [statusFilter, priorityFilter, assigneeFilter, areaFilter, dateRange]);

    // Actualizar filtro de estado al cambiar de tab
    useEffect(() => {
        if (activeTab === "CLOSED") {
            setStatusFilter("CLOSED");
        } else if (activeTab === "all") {
            setStatusFilter(undefined);
        } else if (["OPEN", "PENDING", "RESOLVED"].includes(activeTab)) {
            setStatusFilter(activeTab);
        }
    }, [activeTab]);

    // Recargar tickets al cambiar página o tamaño de página
    useEffect(() => {
        loadTickets();
    }, [page, pageSize]);

    // Scroll automático cuando se carga el detalle
    useEffect(() => {
        if (ticketDetalle?.messages) {
            scrollToBottom();
        }
    }, [ticketDetalle]);

    // DEBUG adjuntos e inline images
    useEffect(() => {
        if (ticketDetalle?.messages) {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🔍 DEBUG ADJUNTOS / INLINE IMAGES');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

            ticketDetalle.messages.forEach((m: TicketMessage, idx: number) => {
                console.log(`Mensaje ${idx}`, {
                    id: m.id,
                    direction: m.direction,
                    attachments: m.attachments?.map(a => ({
                        id: a.id,
                        filename: a.filename,
                        isInline: a.isInline,
                        contentId: a.contentId,
                        mimeType: a.mimeType,
                    })) ?? [],
                });
            });

            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        }
    }, [ticketDetalle]);

    // Conexión a Socket.IO para recibir notificaciones en tiempo real
    useEffect(() => {
        socket.connect();

        socket.on("connect", () => {
            console.log("🟢 Socket conectado", socket.id);
        });

        socket.on("disconnect", () => {
            console.log("🔴 Socket desconectado");
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    // Escuchar eventos de nuevo ticket
    useEffect(() => {
        const onTicketCreated = (payload: any) => {
            setNewTicketsCount((prev) => prev + 1);

            // opcional: sonido
            // new Audio("/sounds/new-ticket.mp3").play();
        };

        socket.on("ticket.created", onTicketCreated);

        return () => {
            socket.off("ticket.created", onTicketCreated);
        };
    }, []);

    // Refrescar cada minuto para actualizar tiempos relativos y estado de tickets
    useEffect(() => {
        const interval = setInterval(() => {
            forceUpdate(v => v + 1);
        }, 60_000); // ⏱️ cada 1 minuto

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const onTicketUpdated = async (payload: any) => {
            // Si está abierto el detalle → refrescar solo ese ticket
            if (payload.ticketId === ticketDetalle?.id) {
                const { data } = await api.get(`/helpdesk/tickets/${payload.ticketId}`);

                if (data?.ok) {
                    setTicketDetalle(data.ticket);
                }
            }

            // Actualizar solo ese ticket en la lista (sin reload completo)
            setTickets(prev =>
                prev.map(t =>
                    t.id === payload.ticketId
                        ? { ...t, lastActivityAt: new Date().toISOString() }
                        : t
                )
            );
        };

        socket.on("ticket.updated", onTicketUpdated);

        return () => {
            socket.off("ticket.updated", onTicketUpdated);
        };
    }, [ticketDetalle]);

    // Función para establecer rango de fechas según días atrás (hoy, últimos 7 días, este mes)
    const setLastDays = (days: number) => {
        const to = new Date();
        const from = new Date();
        from.setDate(to.getDate() - days);

        setDateRange([
            from.toISOString().split("T")[0],
            to.toISOString().split("T")[0],
        ]);

        setActiveRange(`last-${days}`);

        setPage(1);
    };

    const setToday = () => {
        const today = new Date();

        const start = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            0, 0, 0
        );

        const end = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate() + 1,
            0, 0, 0
        );

        setActiveRange("today");
        setPage(1);

        setDateRange([
            start.toISOString(),
            end.toISOString(),
        ]);
    };

    // Función para responder a un ticket (respuesta al cliente o nota interna)
    const responderTicket = async (isInternal: boolean) => {
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

            replyFiles.forEach(file => {
                formData.append("attachments", file);
            });

            await api.post(
                `/helpdesk/tickets/${ticketDetalle.id}/reply`,
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );

            if (isInternal) {
                setInternalNoteText("");
                message.success("Nota interna guardada");
            } else {
                setReplyText("");
                message.success("Respuesta enviada");
            }

            setReplyFiles([]); // limpiar adjuntos

            await abrirDetalle(ticketDetalle);

        } catch {
            message.error("Error al enviar mensaje");
        } finally {
            setSendingReply(false);
        }
    };

    /* ===================== CREATE TICKET ===================== */
   const crearTicket = async () => {
    if (!form.empresaId || !form.requesterId || !form.subject) {
        message.warning("Empresa, contacto y asunto son obligatorios");
        return;
    }

    try {
        const payload = { ...form, description: form.message };
        const res = await api.post("/helpdesk/tickets", payload);
        const ticketData = res.data?.data;

        if (ticketData?.resumen_ia) {
            notification.success({
                message: `Ticket creado - Área: ${ticketData.area_asignada || 'General'}`,
                description: `Resumen IA: ${ticketData.resumen_ia}`,
                duration: 8,
            });
        } else {
            message.success("Ticket creado correctamente");
        }

        setDrawerCrear(false);
        setForm({
            empresaId: undefined, requesterId: undefined, subject: "", 
            message: "", priority: "NORMAL", assigneeId: undefined
        });
        loadTickets();
    } catch {
        message.error("Error al crear ticket");
    }
};

    /* ===================== DETALLE ===================== */
    const abrirDetalle = async (ticket: Ticket) => {
        setDrawerDetalle(true);
        setLoadingDetalle(true);

        setReplyFiles([]);
        setReplyText("");
        setInternalNoteText("");

        try {
            const { data } = await api.get(`/helpdesk/tickets/${ticket.id}`);
            if (!data?.ok) throw new Error();
            setTicketDetalle({
                ...data.ticket,
                messages: (data.ticket.messages ?? []).map((m: any) => ({
                    ...m,
                    cc: m.cc ? m.cc.split(",") : [],
                })),
            });
        } catch {
            message.error("Error al cargar detalle");
        } finally {
            setLoadingDetalle(false);
        }
    };

    // Función para actualizar ticket (estado, prioridad, asignación)
    const updateTicket = async (payload: {
        status?: string;
        priority?: string;
        assigneeId?: number | null;
    }) => {
        if (!ticketDetalle) return;

        try {
            await api.patch(`/helpdesk/tickets/${ticketDetalle.id}`, payload);

            await abrirDetalle({ id: ticketDetalle.id } as Ticket);
            await loadTickets();
            message.success("Ticket actualizado");

        } catch {
            message.error("No se pudo actualizar el ticket");

        }
    };

    /* ===================== UI HELPERS ===================== */
    // Función para asignar colores a prioridades
    const priorityColor = (p: string) => {
        switch (p) {
            case "URGENT": return "red";
            case "HIGH": return "orange";
            case "NORMAL": return "blue";
            case "LOW": return "green";
            default: return "default";
        }
    };

    // Función para asignar colores a estados
    const statusColor = (s: string) => {
        switch (s) {
            case "NEW": return "blue";
            case "OPEN": return "gold";
            case "PENDING": return "orange";
            case "RESOLVED": return "green";
            case "CLOSED": return "default";
            default: return "default";
        }
    };

    // Función para determinar estado de actividad del ticket (vencido, con actividad reciente, sin actividad)
    function getTicketActivityMeta(ticket: Ticket) {
        if (ticket.status === "CLOSED") {
            return {
                label: "Cerrado",
                color: "default",
                icon: <CheckCircleOutlined />,
            };
        }

        const activityDate =
            ticket.lastActivityAt ??
            ticket.updatedAt ??
            ticket.createdAt;

        if (!activityDate) {
            return {
                label: "Sin actividad",
                color: "default",
                icon: <MessageOutlined />,
            };
        }

        const diffMs = Date.now() - new Date(activityDate).getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        // 🟢 Menos de 1 hora
        if (diffHours < 1) {
            return {
                label: "Actividad reciente",
                color: "blue",
                icon: <ClockCircleOutlined />,
            };
        }

        // 🔴 Más de 1 hora
        return {
            label: "Vencido",
            color: "red",
            icon: <ExclamationCircleOutlined />,
        };
    }

    // Función para generar texto de última actividad (creado, actividad reciente, cerrado hace X)
    function getTicketActivityText(ticket: Ticket) {
        const activityDate =
            ticket.lastActivityAt ??
            ticket.updatedAt ??
            ticket.createdAt;

        if (!activityDate) return null;

        const relative = formatRelativeTime(activityDate);

        if (ticket.status === "CLOSED") {
            return {
                icon: <CheckCircleOutlined />,
                text: `Cerrado ${relative}`,
            };
        }

        if (!ticket.lastMessageDirection) {
            return {
                icon: <UserOutlined />,
                text: `Creado ${relative}`,
            };
        }

        if (ticket.lastMessageDirection === "INBOUND") {
            return {
                icon: <MessageOutlined />,
                text: `Respondido por solicitante ${relative}`,
            };
        }

        if (ticket.lastMessageDirection === "OUTBOUND") {
            return {
                icon: <TeamOutlined />,
                text: `Respondido por soporte ${relative}`,
            };
        }

        return {
            icon: <ClockCircleOutlined />,
            text: `Actividad ${relative}`,
        };
    }

    // Filtrar tickets según tab activo (todos, sin asignar, mis tickets)
    const filteredTickets = tickets.filter(ticket => {
        if (activeTab === "unassigned") return !ticket.assignee;
        if (activeTab === "my") return ticket.assignee?.id_tecnico === 1;
        return true;
    });

    // Función para contar tickets por estado (para badges en tabs)
    const getTicketCount = (status: string) => {
        if (status === "all") {
            return Object.values(statusCounts).reduce((acc, val) => acc + val, 0);
        }
        return statusCounts[status] ?? 0;
    };

    /* ===================== BULK ACTIONS ===================== */

    const bulkClose = async () => {
        if (selectedTickets.length === 0) return;

        try {
            await api.patch("/helpdesk/tickets/bulk", {
                ticketIds: selectedTickets,
                status: "CLOSED",
            });

            message.success("Tickets cerrados correctamente");
            setSelectedTickets([]);
            loadTickets();
        } catch {
            message.error("Error al cerrar tickets");
        }
    };

    const bulkAssign = () => {
        console.log("🎯 bulkAssign EJECUTADA");
        if (selectedTickets.length === 0) return;

        setSelectedTechnicianId(null);
        setBulkAssignModalOpen(true);
    };

    const handleBulkAssignConfirm = async () => {
        if (!selectedTechnicianId) {
            message.warning("Selecciona un técnico");
            return;
        }

        try {
            await api.patch("/helpdesk/tickets/bulk", {
                ticketIds: selectedTickets,
                assigneeId: selectedTechnicianId,
            });

            message.success("Tickets asignados correctamente");
            setSelectedTickets([]);
            setBulkAssignModalOpen(false);
            setSelectedTechnicianId(null);
            await loadTickets();

        } catch (error) {
            console.error("Error en bulkAssign:", error);
            message.error("Error al asignar tickets");
        }
    };

    const bulkMerge = () => {
        console.log("🎯 bulkMerge EJECUTADA");

        if (selectedTickets.length < 2) {
            message.warning("Selecciona al menos 2 tickets para fusionar");
            return;
        }

        setSelectedMainTicketId(null);
        setBulkMergeModalOpen(true);
    };

    const handleBulkMergeConfirm = async () => {
        if (!selectedMainTicketId) {
            message.warning("Debes seleccionar un ticket principal");
            return;
        }

        try {
            const res = await fetch(`${API_URL}/helpdesk/tickets/bulk-merge`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    mainTicketId: selectedMainTicketId,
                    ticketIds: selectedTickets,
                }),
            });

            const json = await res.json();

            if (!res.ok || !json.ok) {
                message.error("Error al fusionar tickets");
                return;
            }

            message.success("Tickets fusionados correctamente");
            setSelectedTickets([]);
            setBulkMergeModalOpen(false);
            setSelectedMainTicketId(null);
            await loadTickets();

        } catch (error) {
            console.error("Error en bulkMerge:", error);
            message.error("Error al fusionar tickets");
        }
    };

    /* ===================== RENDER ===================== */
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Header con estadísticas */}
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">Centro de Soporte</h1>
                            <p className="text-gray-500">Gestión de tickets de ayuda y soporte</p>
                        </div>
                        <Space>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={() => setDrawerCrear(true)}
                                size="large"
                            >
                                Nuevo Ticket
                            </Button>
                            <Button icon={<ReloadOutlined />} onClick={loadTickets} />
                            <Button icon={<SettingOutlined />} />
                        </Space>
                    </div>

                    <Row gutter={[16, 16]} className="mb-6">
                        <Col span={6}>
                            <Card size="small" className="border-l-4 border-l-blue-500">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="text-gray-500">Total</div>
                                        <div className="text-2xl font-bold">
                                            {Object.values(statusCounts).reduce((a, b) => a + b, 0)}
                                        </div>
                                    </div>
                                    <MessageOutlined className="text-blue-500 text-xl" />
                                </div>
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card size="small" className="border-l-4 border-l-orange-500">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="text-gray-500">Abiertos</div>
                                        <div className="text-2xl font-bold">
                                            {getTicketCount("OPEN")}
                                        </div>
                                    </div>
                                    <ClockCircleOutlined className="text-orange-500 text-xl" />
                                </div>
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card size="small" className="border-l-4 border-l-green-500">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="text-gray-500">Cerrados</div>
                                        <div className="text-2xl font-bold">
                                            {getTicketCount("CLOSED")}
                                        </div>
                                    </div>
                                    <CheckCircleOutlined className="text-green-500 text-xl" />
                                </div>
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card size="small" className="border-l-4 border-l-red-500">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="text-gray-500">Urgentes</div>
                                        <div className="text-2xl font-bold">{(statusCounts["URGENT"] ?? 0) + (statusCounts["HIGH"] ?? 0)}</div>
                                    </div>
                                    <ExclamationCircleOutlined className="text-red-500 text-xl" />
                                </div>
                            </Card>
                        </Col>
                    </Row>
                </div>

                {/* Barra de filtros y búsqueda */}
                <Card className="mb-4">
                    <div className="flex flex-col gap-3">
                        {/* 🔝 Fila superior: búsqueda + filtros */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                                <Input
                                    placeholder="Buscar tickets por asunto, empresa o ID..."
                                    prefix={<SearchOutlined />}
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    onPressEnter={loadTickets}
                                    size="large"
                                />
                            </div>

                            <Space>
                                <Select
                                    placeholder="Estado"
                                    allowClear
                                    style={{ width: 140 }}
                                    value={statusFilter}
                                    onChange={setStatusFilter}
                                    options={[
                                        { value: "NEW", label: "Nuevo" },
                                        { value: "OPEN", label: "Abierto" },
                                        { value: "PENDING", label: "Pendiente" },
                                        { value: "RESOLVED", label: "Resuelto" },
                                        { value: "CLOSED", label: "Cerrado" },
                                    ]}
                                />

                                <Select
                                    placeholder="Prioridad"
                                    allowClear
                                    style={{ width: 140 }}
                                    value={priorityFilter}
                                    onChange={setPriorityFilter}
                                    options={[
                                        { value: "LOW", label: "Baja" },
                                        { value: "NORMAL", label: "Media" },
                                        { value: "HIGH", label: "Alta" },
                                        { value: "URGENT", label: "Urgente" },
                                    ]}
                                />

                                <Select
                                    placeholder="Asignado a"
                                    allowClear
                                    style={{ width: 180 }}
                                    value={assigneeFilter}
                                    onChange={setAssigneeFilter}
                                    options={tecnicos.map(t => ({
                                        value: t.id_tecnico,
                                        label: t.nombre,
                                    }))}
                                />

                                <Select
                                    placeholder="\u00c1rea"
                                    style={{ width: 170 }}
                                    value={areaFilter}
                                    onChange={setAreaFilter}
                                    options={AREA_OPTIONS}
                                />

                                <Button icon={<FilterOutlined />} onClick={loadTickets}>
                                    Filtrar
                                </Button>
                            </Space>
                        </div>

                        {/* 🔽 Fila inferior: rango de fechas */}
                        <Space size="small">
                            <Button
                                size="small"
                                type={activeRange === "today" ? "primary" : "default"}
                                onClick={setToday}
                            >
                                Hoy
                            </Button>

                            <Button
                                size="small"
                                type={activeRange === "last-7" ? "primary" : "default"}
                                onClick={() => setLastDays(7)}
                            >
                                Últimos 7 días
                            </Button>

                            <Button
                                size="small"
                                type={activeRange === "last-30" ? "primary" : "default"}
                                onClick={() => setLastDays(30)}
                            >
                                Este mes
                            </Button>
                            <Button
                                size="small"
                                onClick={() => {
                                    setDateRange(null);
                                    setActiveRange(null); // 👈 FALTA ESTO
                                    setPage(1);
                                }}
                            >
                                Limpiar rango
                            </Button>
                        </Space>
                    </div>
                </Card>

                {/* Tabs de navegación */}
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={[
                        {
                            key: "all",
                            label: (
                                <span>
                                    Todos <Badge count={getTicketCount("all")} offset={[10, -2]} />
                                </span>
                            ),
                        },
                        {
                            key: "OPEN",
                            label: (
                                <span>
                                    Abiertos <Badge count={getTicketCount("OPEN")} offset={[10, -2]} />
                                </span>
                            ),
                        },
                        {
                            key: "PENDING",
                            label: (
                                <span>
                                    Pendientes <Badge count={getTicketCount("PENDING")} offset={[10, -2]} />
                                </span>
                            ),
                        },
                        {
                            key: "RESOLVED",
                            label: (
                                <span>
                                    Resueltos <Badge count={getTicketCount("RESOLVED")} offset={[10, -2]} />
                                </span>
                            ),
                        },
                        {
                            key: "CLOSED",
                            label: (
                                <span>
                                    Cerrados <Badge count={getTicketCount("CLOSED")} offset={[10, -2]} />
                                </span>
                            ),
                        },
                    ]}
                />

                {/* ===================== ACCIONES MASIVAS ===================== */}
                {selectedTickets.length > 0 && (
                    <Card className="mb-3 border bg-gray-50">
                        <div className="flex justify-between items-center">
                            <span className="font-medium">
                                {selectedTickets.length} seleccionado(s)
                            </span>

                            <Space>
                                <Button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        console.log("🔥 BULK ASSIGN CLICKED");
                                        bulkAssign();
                                    }}
                                >
                                    Asignar
                                </Button>

                                <Button
                                    danger
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        console.log("🔥 BULK CLOSE CLICKED");
                                        bulkClose();
                                    }}
                                >
                                    Cerrar
                                </Button>

                                <Button
                                    type="primary"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        console.log("🔥 BULK MERGE CLICKED");
                                        bulkMerge();
                                    }}
                                >
                                    Fusionar
                                </Button>
                            </Space>
                        </div>
                    </Card>
                )}

                {/* Notificación de nuevos tickets en tiempo real */}
                {newTicketsCount > 0 && (
                    <div className="flex justify-center mb-3">
                        <Button
                            type="primary"
                            shape="round"
                            icon={<BellOutlined />}
                            className="shadow-md"
                            onClick={() => {
                                setNewTicketsCount(0);
                                loadTickets();
                            }}
                        >
                            {newTicketsCount} nuevo{newTicketsCount > 1 ? "s" : ""} ticket{newTicketsCount > 1 ? "s" : ""}
                        </Button>
                    </div>
                )}

                {/* Lista de tickets */}
                <Card className="mt-4">
                    {loading ? (
                        <div className="text-center py-10">
                            <Spin size="large" />
                        </div>
                    ) : filteredTickets.length === 0 ? (
                        <Empty
                            description="No hay tickets que coincidan con los filtros"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                    ) : (
                        // Cada ticket es un card con información clave: prioridad, estado, asunto, empresa, solicitante, última actividad, asignado a...
                        <div className="space-y-2">
                            {filteredTickets.map((ticket) => (
                                <div
                                    key={ticket.id}
                                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:shadow-sm transition-all cursor-pointer"
                                    onClick={() => abrirDetalle(ticket)}
                                >
                                    {/* ✅ CHECKBOX */}
                                    <input
                                        type="checkbox"
                                        checked={selectedTickets.includes(ticket.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedTickets(prev => [...prev, ticket.id]);
                                            } else {
                                                setSelectedTickets(prev => prev.filter(id => id !== ticket.id));
                                            }
                                        }}
                                    />
                                    {/* ✅ CONTENIDO ORIGINAL DEL TICKET */}
                                    <div
                                        className="flex-1 cursor-pointer"
                                        onClick={() => abrirDetalle(ticket)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="flex items-center gap-2 min-w-[100px]">
                                                    <Tooltip title={TICKET_PRIORITY_LABEL[ticket.priority]}>
                                                        {PRIORITY_ICONS[ticket.priority as keyof typeof PRIORITY_ICONS]}
                                                    </Tooltip>
                                                    <Tag
                                                        color={
                                                            ticket.status === "OPEN"
                                                                ? "blue"
                                                                : ticket.status === "PENDING"
                                                                    ? "orange"
                                                                    : ticket.status === "RESOLVED"
                                                                        ? "green"
                                                                        : ticket.status === "CLOSED"
                                                                            ? "default"
                                                                            : "cyan"
                                                        }
                                                        className="m-0"
                                                    >
                                                        {TICKET_STATUS_LABEL[ticket.status] ?? ticket.status}
                                                    </Tag>
                                                </div>
                                                {/* Información principal del ticket: asunto, empresa, solicitante, última actividad */}
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-gray-800">{ticket.subject}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                                        <span className="flex items-center gap-1">
                                                            <TeamOutlined />
                                                            {ticket.empresa?.nombre}
                                                        </span>
                                                        <span className="italic text-gray-400">
                                                            {(() => {
                                                                const nombre = ticket.requester?.nombre;
                                                                const email = ticket.requester?.email;
                                                                const rawEmail = ticket.fromEmail;

                                                                if (nombre) {
                                                                    return <span>{nombre}</span>;
                                                                }

                                                                if (email) {
                                                                    return (
                                                                        <span className="italic text-gray-500">
                                                                            {email}
                                                                        </span>
                                                                    );
                                                                }

                                                                if (rawEmail) {
                                                                    return (
                                                                        <span className="italic text-gray-400">
                                                                            {rawEmail}
                                                                        </span>
                                                                    );
                                                                }

                                                                return (
                                                                    <span className="italic text-gray-300">
                                                                        Sin solicitante
                                                                    </span>
                                                                );
                                                            })()}
                                                        </span>
                                                        {/* Indicador de última actividad: si el ticket tiene actividad reciente, mostrar un tag con el tiempo relativo (ej: "Respondido por cliente hace 5 minutos", "Cerrado hace 2 horas", "Sin actividad") */}
                                                        {(ticket.lastActivityAt || ticket.createdAt) && (
                                                            <div className="flex items-center gap-2 text-xs">
                                                                {(() => {
                                                                    const meta = getTicketActivityMeta(ticket);

                                                                    return (
                                                                        <>
                                                                            <Tag
                                                                                icon={meta.icon}
                                                                                color={meta.color}
                                                                                className="m-0"
                                                                            >
                                                                                {meta.label}
                                                                            </Tag>

                                                                            {(() => {
                                                                                const activity = getTicketActivityText(ticket);
                                                                                if (!activity) return null;

                                                                                return (
                                                                                    <Tag
                                                                                        icon={activity.icon}
                                                                                        className="m-0"
                                                                                    >
                                                                                        {activity.text}
                                                                                    </Tag>
                                                                                );
                                                                            })()}
                                                                        </>
                                                                    );
                                                                })()}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Información secundaria: asignado a (si tiene), botón de acciones rápidas (responder, asignar, cambiar estado) */}
                                            <div className="flex items-center gap-4">
                                                <div className="text-right min-w-[120px]">
                                                    <div className="text-sm font-medium">
                                                        {ticket.rolAsignado ? (
                                                            <Tag color="cyan">{ticket.rolAsignado}</Tag>
                                                        ) : ticket.assignee ? (
                                                        <div className="flex items-center gap-2">{ticket.assignee.nombre}</div>
                                                    ) : (
                                                    <Tag color="default">Sin asignar</Tag>
                                                    )}
                                                    </div>
                                                </div>
                                                <Button type="text" icon={<MoreOutlined />} onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Menú contextual aquí
                                                }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Paginación */}
                <div className="flex justify-center mt-4 mb-2">
                    <Pagination
                        current={page}
                        pageSize={pageSize}
                        total={totalTickets}
                        showSizeChanger
                        pageSizeOptions={["10", "20", "30", "50"]}
                        onChange={(p, ps) => {
                            setPage(p);
                            setPageSize(ps);
                        }}
                    />
                </div>
            </div>

            {/* ===================== MODAL ASIGNAR MASIVO ===================== */}
            <Modal
                title="Asignar tickets seleccionados"
                open={bulkAssignModalOpen}
                onOk={handleBulkAssignConfirm}
                onCancel={() => {
                    setBulkAssignModalOpen(false);
                    setSelectedTechnicianId(null);
                }}
                okText="Asignar"
                cancelText="Cancelar"
            >
                <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-3">
                        Se asignarán {selectedTickets.length} ticket(s) al técnico seleccionado.
                    </p>
                    <Select
                        style={{ width: "100%" }}
                        placeholder="Seleccionar técnico"
                        value={selectedTechnicianId}
                        onChange={setSelectedTechnicianId}
                        options={tecnicos.map(t => ({
                            value: t.id_tecnico,
                            label: t.nombre,
                        }))}
                    />
                </div>
            </Modal>

            {/* ===================== MODAL FUSIONAR MASIVO ===================== */}
            <Modal
                title="Fusionar tickets"
                open={bulkMergeModalOpen}
                onOk={handleBulkMergeConfirm}
                onCancel={() => {
                    setBulkMergeModalOpen(false);
                    setSelectedMainTicketId(null);
                }}
                okText="Fusionar"
                cancelText="Cancelar"
            >
                <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-3">
                        Los mensajes de todos los tickets se moverán al ticket principal.
                    </p>
                    <Select
                        style={{ width: "100%" }}
                        placeholder="Seleccionar ticket principal"
                        value={selectedMainTicketId}
                        onChange={setSelectedMainTicketId}
                        options={selectedTickets.map(id => {
                            const ticket = tickets.find(t => t.id === id);
                            return {
                                value: id,
                                label: `#${id} - ${ticket?.subject || 'Sin asunto'}`,
                            };
                        })}
                    />
                </div>
            </Modal>

            {/* ===================== DRAWER CREAR ===================== */}
            <Drawer
                title="Crear Nuevo Ticket"
                open={drawerCrear}
                onClose={() => setDrawerCrear(false)}
                width={700}
                footer={
                    <div className="flex justify-end gap-2">
                        <Button onClick={() => setDrawerCrear(false)}>Cancelar</Button>
                        <Button type="primary" onClick={crearTicket}>
                            Crear Ticket
                        </Button>
                    </div>
                }
            >
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Empresa *</label>
                        <Select
                            placeholder="Seleccionar empresa"
                            className="w-full"
                            size="large"
                            options={empresas.map((e) => ({
                                value: e.id_empresa,
                                label: e.nombre,
                            }))}
                            onChange={(v) => {
                                setForm({ ...form, empresaId: v, requesterId: undefined });
                                loadSolicitantes(v);
                            }}
                        />
                    </div>

                    {/* El campo de contacto se habilita solo después de seleccionar empresa, ya que depende de esta selección */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Contacto *</label>
                        <Select
                            placeholder="Seleccionar contacto"
                            className="w-full"
                            size="large"
                            disabled={!form.empresaId}
                            options={solicitantes}
                            value={form.requesterId}
                            onChange={(v) => setForm({ ...form, requesterId: v })}
                        />
                    </div>

                    {/* Campo de asunto obligatorio */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Asunto *</label>
                        <Input
                            placeholder="Breve descripción del problema"
                            size="large"
                            value={form.subject}
                            onChange={(e) =>
                                setForm({ ...form, subject: e.target.value })
                            }
                        />
                    </div>

                    {/* Fila con campos de prioridad y asignación */}
                    <Row gutter={16}>
                        <Col span={12}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Prioridad</label>
                            <Select
                                className="w-full"
                                value={form.priority}
                                options={[
                                    { value: "LOW", label: "Baja" },
                                    { value: "NORMAL", label: "Media" },
                                    { value: "HIGH", label: "Alta" },
                                    { value: "URGENT", label: "Urgente" },
                                ]}
                                onChange={(v) => setForm({ ...form, priority: v })}
                            />
                        </Col>
                        <Col span={12}>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Asignar a</label>
                            <Select
                                placeholder="Auto-asignar"
                                className="w-full"
                                options={tecnicos.map((t) => ({
                                    value: t.id_tecnico,
                                    label: t.nombre,
                                }))}
                                onChange={(v) => setForm({ ...form, assigneeId: v })}
                            />
                        </Col>
                    </Row>

                    {/* Campo de descripción con contador y opción de adjuntar archivos (sin funcionalidad real)*/}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                        <Input.TextArea
                            rows={6}
                            placeholder="Describe el problema en detalle..."
                            value={form.message}
                            onChange={(e) =>
                                setForm({ ...form, message: e.target.value })
                            }
                            className="resize-none"
                        />
                        <div className="flex justify-between items-center mt-2">
                            <label>
                                <Button icon={<PaperClipOutlined />} size="small">
                                    Adjuntar archivo
                                </Button>
                            </label>
                            <span className="text-sm text-gray-500">
                                {form.message.length}/5000 caracteres
                            </span>
                        </div>
                    </div>
                </div>
            </Drawer>

            {/* ===================== DRAWER DETALLE ===================== */}
            <Drawer
                title={
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-mono text-gray-500">
                            TCK-{ticketDetalle?.publicId?.slice(0, 6).toUpperCase()}
                        </span>
                        <Tag color={priorityColor(ticketDetalle?.priority)} className="m-0">
                            {ticketDetalle && TICKET_PRIORITY_LABEL[ticketDetalle.priority]}
                        </Tag>
                        <Tag color={statusColor(ticketDetalle?.status)} className="m-0">
                            {ticketDetalle && TICKET_STATUS_LABEL[ticketDetalle.status]}
                        </Tag>
                    </div>
                }
                open={drawerDetalle}
                onClose={() => setDrawerDetalle(false)}
                width={800}
                bodyStyle={{ padding: 0 }}
            >
                {loadingDetalle || !ticketDetalle ? (
                    <div className="flex justify-center py-10">
                        <Spin />
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                        {/* Información del ticket (sticky en top) */}
                        <div className="sticky top-0 z-10 bg-white border-b p-4 shadow-sm">
                            <Descriptions column={2} size="small">
                                <Descriptions.Item label="Empresa">
                                    <div className="font-medium">{ticketDetalle.empresa?.nombre}</div>
                                </Descriptions.Item>
                                <Descriptions.Item label="Solicitante">
                                    <div className="flex items-center gap-2">
                                        <Avatar size="small" icon={<UserOutlined />} />
                                        <div>
                                            {ticketDetalle.requester ? (
                                                <>
                                                    <div className="font-medium">{ticketDetalle.requester.nombre}</div>
                                                    <div className="text-sm text-gray-500">
                                                        <MailOutlined /> {ticketDetalle.requester.email}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="italic text-gray-400">
                                                    Solicitante no registrado
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Descriptions.Item>
                                <Descriptions.Item label="Estado">
                                    <Select
                                        value={ticketDetalle.status}
                                        onChange={(v) => updateTicket({ status: v })}
                                        options={[
                                            { value: "NEW", label: "Nuevo" },
                                            { value: "OPEN", label: "Abierto" },
                                            { value: "PENDING", label: "Pendiente" },
                                            { value: "RESOLVED", label: "Resuelto" },
                                            { value: "CLOSED", label: "Cerrado" },
                                        ]}
                                        className="w-full"
                                        size="small"
                                    />
                                </Descriptions.Item>
                                <Descriptions.Item label="Prioridad">
                                    <Select
                                        value={ticketDetalle.priority}
                                        onChange={(v) => updateTicket({ priority: v })}
                                        options={[
                                            { value: "LOW", label: "Baja" },
                                            { value: "NORMAL", label: "Media" },
                                            { value: "HIGH", label: "Alta" },
                                            { value: "URGENT", label: "Urgente" },
                                        ]}
                                        className="w-full"
                                        size="small"
                                    />
                                </Descriptions.Item>
                                <Descriptions.Item label="Asignado a">
                                    <Select
                                        allowClear
                                        value={ticketDetalle.assignee?.id_tecnico}
                                        onChange={(v) =>
                                            updateTicket({ assigneeId: v ?? null })
                                        }
                                        placeholder="Sin asignar"
                                        options={tecnicos.map((t) => ({
                                            value: t.id_tecnico,
                                            label: t.nombre,
                                        }))}
                                        className="w-full"
                                        size="small"
                                    />
                                </Descriptions.Item>
                                <Descriptions.Item label="Creado">
                                    {ticketDetalle.createdAt && formatDateTime(ticketDetalle.createdAt)}
                                </Descriptions.Item>
                            </Descriptions>
                        </div>

                        {/* Asunto */}
                        <div className="p-4 border-b bg-gray-50">
                            <h3 className="font-semibold text-lg mb-1">{ticketDetalle.subject}</h3>
                            <p className="text-gray-700 whitespace-pre-wrap">{ticketDetalle.description}</p>
                        </div>

                        {/* Indicador de última actividad */}
                        {lastActivityBy && (
                            <div className="px-4 pt-3">
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

                        {/* Área de conversación con scroll */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {/* Timeline de conversación */}
                            <div className="relative max-h-full overflow-y-auto pl-10">
                                {/* Línea vertical del timeline */}
                                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-300 z-0"></div>

                                {ticketDetalle.messages.map((m: TicketMessage) => {
                                    const isOutbound = m.direction === "OUTBOUND";
                                    const isInternal = m.isInternal;

                                    const author = getMessageAuthor(m, ticketDetalle);

                                    // Determinar estilos según tipo de mensaje
                                    let bgColor = "bg-white";
                                    let borderColor = "border-l-blue-500";
                                    let avatarBg = "bg-blue-500";
                                    let avatarIcon = <UserOutlined className="text-white text-xs" />;

                                    if (isInternal) {
                                        bgColor = "bg-yellow-50";
                                        borderColor = "border-l-yellow-500";
                                        avatarBg = "bg-yellow-500";
                                        avatarIcon = <EditOutlined className="text-white text-xs" />;
                                    } else if (isOutbound) {
                                        bgColor = "bg-blue-50";
                                        borderColor = "border-l-green-500";
                                        avatarBg = "bg-green-500";
                                        avatarIcon = <TeamOutlined className="text-white text-xs" />;
                                    } else {
                                        bgColor = "bg-white";
                                        borderColor = "border-l-blue-500";
                                        avatarBg = "bg-blue-500";
                                        avatarIcon = <UserOutlined className="text-white text-xs" />;
                                    }

                                    return (
                                        <div key={m.id} className="relative mb-6">
                                            {/* Punto del timeline con ícono */}
                                            <div className="absolute left-[-36px] top-2 z-10">
                                                <div className={`w-8 h-8 rounded-full ${avatarBg} flex items-center justify-center`}>
                                                    {avatarIcon}
                                                </div>
                                            </div>

                                            {/* Tarjeta de mensaje */}
                                            <div className={`rounded-lg p-4 shadow-sm border ${bgColor} ${borderColor} border-l-4 hover:shadow-md transition-shadow`}>
                                                {/* Encabezado del mensaje */}
                                                <div className="flex justify-between items-center mb-3 pb-2 border-b border-gray-200">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-sm">
                                                            {author.name}
                                                        </span>
                                                        <span className="text-xs text-gray-500 ml-2">
                                                            ({author.role})
                                                        </span>
                                                        <Tag
                                                            color={isInternal ? "gold" : isOutbound ? "blue" : "default"}
                                                            className="text-xs"
                                                        >
                                                            {isInternal ? "Interno" : isOutbound ? "Enviado" : "Recibido"}
                                                        </Tag>
                                                        {isOutbound && m.author?.nombre && (
                                                            <span className="text-xs text-gray-500">
                                                                por {m.author.nombre}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-xs text-gray-500">
                                                            {formatDateTime(m.createdAt)}
                                                        </span>
                                                        <span className="text-xs text-gray-400">
                                                            {formatMessageTime(m.createdAt)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Aviso si hay imágenes CID no renderizables */}
                                                {hasUnresolvedCidImages(m.bodyHtml, m.attachments) && (
                                                    <div className="mb-2 px-3 py-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded">
                                                        ⚠️ Algunas imágenes de la firma del correo no pudieron mostrarse.
                                                    </div>
                                                )}

                                                {/* Cuerpo del mensaje */}
                                                <div className="mb-3">
                                                    <div
                                                        className="prose prose-sm max-w-none text-gray-800"
                                                        dangerouslySetInnerHTML={{
                                                            __html: DOMPurify.sanitize(
                                                                resolveInlineImages(
                                                                    m.bodyHtml ?? formatEmailBody(m.bodyText),
                                                                    m.attachments
                                                                ),
                                                                {
                                                                    ADD_ATTR: ["target", "src"],
                                                                    ADD_TAGS: ["img"],
                                                                }
                                                            ),
                                                        }}
                                                    />
                                                </div>

                                                {/* Adjuntos */}
                                                {/* Adjuntos - Solo mostrar los que NO son inline */}
                                                {(m.attachments?.filter(a => !a.isInline).length ?? 0) > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                                            <PaperClipOutlined />
                                                            <span>Archivos adjuntos ({m.attachments?.filter(a => !a.isInline).length}):</span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(m.attachments ?? [])
                                                                .filter(a => !a.isInline) // ✅ Filtrar inline
                                                                .map(att => (
                                                                    <a
                                                                        key={att.id}
                                                                        href={`${API_URL}/helpdesk/tickets/attachments/${att.id}/download`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm text-gray-700 no-underline border border-gray-300"
                                                                    >
                                                                        <PaperClipOutlined className="text-xs" />
                                                                        {att.filename}
                                                                    </a>
                                                                ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Información adicional para mensajes del agente */}
                                                {isOutbound && !isInternal && (
                                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                            <MailOutlined className="text-xs" />
                                                            <span>Enviado a: {ticketDetalle.requester?.email}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Indicador de hora relativa */}
                                            <div className="text-xs text-gray-400 mt-1 ml-1">
                                                {formatRelativeTime(m.createdAt)}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Elemento para scroll automático */}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>

                        {/* Área de respuesta (sticky en bottom) */}
                        <div className="sticky bottom-0 bg-white border-t p-4 shadow-md">
                            <Tabs
                                items={[
                                    {
                                        key: "reply",
                                        label: (
                                            <span className="flex items-center gap-1">
                                                <SendOutlined />
                                                Responder al cliente
                                            </span>
                                        ),
                                        children: (
                                            <div className="space-y-4">
                                                <Input.TextArea
                                                    rows={4}
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    placeholder="Escribe tu respuesta al cliente..."
                                                    className="resize-none"
                                                    autoSize={{ minRows: 3, maxRows: 6 }}
                                                />
                                                <div className="flex justify-between items-center">
                                                    <Space>
                                                        <Button icon={<PhoneOutlined />} size="small">
                                                            Registrar llamada
                                                        </Button>
                                                    </Space>
                                                    <Space>
                                                        {/* INPUT OCULTO */}
                                                        <input
                                                            ref={replyFileInputRef}
                                                            type="file"
                                                            multiple
                                                            hidden
                                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                                const files = e.target.files;

                                                                if (!files || files.length === 0) return;

                                                                setReplyFiles(prev => [
                                                                    ...prev,
                                                                    ...Array.from(files)
                                                                ]);
                                                                e.target.value = "";
                                                            }}
                                                        />
                                                        {/* BOTÓN REAL */}
                                                        <Button
                                                            icon={<PaperClipOutlined />}
                                                            size="small"
                                                            onClick={() => replyFileInputRef.current?.click()}
                                                        >
                                                            Adjuntar archivo
                                                        </Button>
                                                        {replyFiles.length > 0 && (
                                                            <div className="mt-2 flex flex-wrap gap-2">
                                                                {replyFiles.map((file, index) => (
                                                                    <Tag
                                                                        key={index}
                                                                        closable
                                                                        onClose={() =>
                                                                            setReplyFiles(prev =>
                                                                                prev.filter((_, i) => i !== index)
                                                                            )
                                                                        }
                                                                    >
                                                                        {file.name}
                                                                    </Tag>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <Button
                                                            type="primary"
                                                            loading={sendingReply}
                                                            onClick={() => responderTicket(false)}
                                                            icon={<SendOutlined />}
                                                        >
                                                            Enviar respuesta
                                                        </Button>
                                                    </Space>
                                                </div>
                                            </div>
                                        ),
                                    },
                                    {
                                        key: "internal",
                                        label: (
                                            <span className="flex items-center gap-1">
                                                <EditOutlined />
                                                Nota interna
                                            </span>
                                        ),
                                        children: (
                                            <div className="space-y-4">
                                                <Input.TextArea
                                                    rows={3}
                                                    value={internalNoteText}
                                                    onChange={(e) => setInternalNoteText(e.target.value)}
                                                    placeholder="Agregar nota interna visible solo para agentes..."
                                                    className="resize-none bg-yellow-50 border-yellow-200"
                                                    autoSize={{ minRows: 2, maxRows: 4 }}
                                                />
                                                <div className="flex justify-between items-center">
                                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                                        <EyeInvisibleOutlined />
                                                        Solo visible para agentes
                                                    </div>
                                                    <Button
                                                        type="default"
                                                        loading={sendingReply}
                                                        onClick={() => responderTicket(true)}
                                                        icon={<EditOutlined />}
                                                    >
                                                        Agregar nota interna
                                                    </Button>
                                                </div>
                                            </div>
                                        ),
                                    },
                                ]}
                            />
                        </div>
                    </div>
                )}
            </Drawer>
        </div>
    );
}
