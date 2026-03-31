import { useEffect, useMemo, useState } from "react";
import {
    Card,
    Tag,
    Spin,
    Button,
    Input,
    Select,
    Space,
    message,
    notification,
    Badge,
    Row,
    Col,
    Dropdown,
    Pagination,
} from "antd";
import type { MenuProps } from "antd";
import {
    PlusOutlined,
    ReloadOutlined,
    UserOutlined,
    MessageOutlined,
    SearchOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    TeamOutlined,
    MoreOutlined,
    ArrowUpOutlined,
    ArrowDownOutlined,
    BellOutlined,
    SettingOutlined,

} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import { socket } from "../lib/socket";
import { api } from "../api/api";

import { DeleteTicketModal } from "../components/modals-ticketera/DeleteTicket";
import { BulkAssignModal } from "../components/modals-ticketera/BulkAssign";
import { BulkMergeModal } from "../components/modals-ticketera/BulkMerge";
import { CrearTicketDrawer } from "../components/modals-ticketera/CrearTicket";

type TicketSla = {
    targets?: { firstResponseMinutes: number; resolutionMinutes: number };
    firstResponse?: {
        dueAt: string;
        at?: string | null;
        elapsedMinutes?: number | null;
        status: "PENDING" | "OK" | "BREACHED";
        remainingMinutes?: number;
    };
    resolution?: {
        dueAt: string;
        at?: string | null;
        elapsedMinutes?: number | null;
        status: "PENDING" | "OK" | "BREACHED";
        remainingMinutes?: number;
    };
};

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
    requester?: { nombre: string; email?: string };
    fromEmail?: string;
    lastActivityAt?: string;
    lastMessageDirection?: "INBOUND" | "OUTBOUND" | "INTERNAL" | null;
    sla?: TicketSla;
};

type Empresa = { id_empresa: number; nombre: string };
type SolicitanteOption = { value: number; label: string };
type Tecnico = {
    id_tecnico: number;
    nombre: string;
    avatar?: string;
    online?: boolean;
};

const buildMensajeInicial = (tecnico?: {
    nombre?: string;
    cargo?: string;
    email?: string;
    telefono?: string;
}) => {
    const firma = [
        tecnico?.nombre,
        tecnico?.cargo,
        tecnico?.email,
        tecnico?.telefono,
    ]
        .filter(Boolean)
        .join("\n");

    return `Estimado(a),

Gracias por contactarnos.

Quedamos atentos a su respuesta,
Saludos cordiales.

${firma}`.trim();
};

type AreaFilter = "TODAS" | "SOPORTE" | "INFORMATICA" | "VENTAS";

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

const PRIORITY_ICONS = {
    LOW: <ArrowDownOutlined style={{ color: "#52c41a" }} />,
    NORMAL: <ExclamationCircleOutlined style={{ color: "#faad14" }} />,
    HIGH: <ArrowUpOutlined style={{ color: "#ff4d4f" }} />,
    URGENT: <ExclamationCircleOutlined style={{ color: "#f5222d" }} />,
};

const AREA_OPTIONS: Array<{ value: AreaFilter; label: string }> = [
    { value: "TODAS", label: "Todas las áreas" },
    { value: "SOPORTE", label: "Soporte" },
    { value: "INFORMATICA", label: "Informática" },
    { value: "VENTAS", label: "Ventas" },
];

// Fuera de ambos componentes, al inicio del archivo
function formatMinutes(min: number | null | undefined): string {
    if (min === null || min === undefined) return "—";
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function SlaCard({
    title, icon, compliance, breached, pending, total, avgMinutes, color, loading,
}: {
    title: string;
    icon: React.ReactNode;
    compliance: number;
    breached: number;
    pending: number;
    total: number;
    avgMinutes: number | null | undefined;
    color: string;
    loading: boolean;
}) {
    const barColor = compliance >= 90 ? "#52c41a" : compliance >= 70 ? "#faad14" : "#ff4d4f";

    return (
        <Card size="small" className="rounded-2xl shadow-sm" style={{ borderLeft: `4px solid ${color}` }}>
            <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                    <div className="text-gray-500 text-sm mb-1">{title}</div>
                    {loading ? <Spin size="small" /> : (
                        <>
                            <div className="text-3xl font-bold leading-none" style={{ color: barColor }}>
                                {compliance}%
                            </div>

                            {/* Barra de progreso */}
                            <div className="mt-2 mb-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${compliance}%`, backgroundColor: barColor }}
                                />
                            </div>

                            {/* Total evaluados */}
                            <div className="text-xs text-gray-400 mb-1">
                                {total} tickets evaluados
                            </div>

                            {/* Vencidos · Pendientes */}
                            <div className="text-xs">
                                <span className="text-red-400 font-medium">{breached} vencidos</span>
                                {" · "}
                                <span className="text-amber-400 font-medium">{pending} pendientes</span>
                            </div>

                            {/* Tiempo promedio */}
                            {avgMinutes != null && (
                                <div className="text-xs text-gray-400 mt-1">
                                    Promedio: <span className="font-medium text-gray-600">{formatMinutes(avgMinutes)}</span>
                                </div>
                            )}
                        </>
                    )}
                </div>
                <div className="mt-1" style={{ color }}>{icon}</div>
            </div>
        </Card>
    );
}

export default function TicketeraRids() {
    const navigate = useNavigate();

    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [activeTab, setActiveTab] = useState("all");

    const [drawerCrear, setDrawerCrear] = useState(false);

    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [solicitantes, setSolicitantes] = useState<SolicitanteOption[]>([]);
    const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);

    const [statusFilter, setStatusFilter] = useState<string | undefined>();
    const [priorityFilter, setPriorityFilter] = useState<string | undefined>();
    const [assigneeFilter, setAssigneeFilter] = useState<number | undefined>();
    const [areaFilter, setAreaFilter] = useState<AreaFilter>("TODAS");

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(30);
    const [totalTickets, setTotalTickets] = useState(0);

    const [dateRange, setDateRange] = useState<[string, string] | null>(null);
    const [newTicketsCount, setNewTicketsCount] = useState<number>(0);
    const [, forceUpdate] = useState(0);
    const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
    const [activeRange, setActiveRange] = useState<string | null>(null);
    const [selectedTickets, setSelectedTickets] = useState<number[]>([]);

    const [bulkAssignModalOpen, setBulkAssignModalOpen] = useState(false);
    const [bulkMergeModalOpen, setBulkMergeModalOpen] = useState(false);
    const [selectedTechnicianId, setSelectedTechnicianId] = useState<number | null>(
        null
    );
    const [selectedMainTicketId, setSelectedMainTicketId] = useState<number | null>(
        null
    );

    const [creatingTicket, setCreatingTicket] = useState(false);

    const [showResumen, setShowResumen] = useState(() => {
        const saved = localStorage.getItem("helpdesk_show_resumen");
        return saved !== null ? saved === "true" : true;
    });

    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [ticketToDelete, setTicketToDelete] = useState<number | null>(null);
    const [deletingTicket, setDeletingTicket] = useState(false);

    const [slaSummary, setSlaSummary] = useState<any>(null);
    const [loadingSla, setLoadingSla] = useState(false);

    const [form, setForm] = useState({
        empresaId: undefined as number | undefined,
        requesterId: undefined as number | undefined,
        subject: "",
        message: buildMensajeInicial(),
        fromEmail: "",
        priority: "NORMAL",
        assigneeId: undefined as number | undefined,
    });

    function formatRelativeTime(date: string | Date) {
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

    const STATUS_LABELS: Record<string, string> = {
        NEW: "Nuevo",
        OPEN: "Abierto",
        PENDING: "Pendiente",
        CLOSED: "Cerrado",
    };

    const slaColor = (status?: string) => {
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
    };

    const slaLabel = (status?: string) => {
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
    };

    const configMenuItems: MenuProps["items"] = [
        {
            key: "dashboard",
            label: "Dashboard",
            onClick: () => navigate("/helpdesk/dashboard"),
        },
        {
            key: "email-templates",
            label: "Plantillas de correo",
            onClick: () => navigate("/helpdesk/email-templates"),
        },
    ];

    function getTicketActivityMeta(ticket: Ticket) {
        if (ticket.status === "CLOSED") {
            return {
                label: "Cerrado",
                color: "default",
                icon: <CheckCircleOutlined />,
            };
        }

        const activityDate = ticket.lastActivityAt ?? ticket.updatedAt ?? ticket.createdAt;
        if (!activityDate) {
            return {
                label: "Sin actividad",
                color: "default",
                icon: <MessageOutlined />,
            };
        }

        const diffHours =
            (Date.now() - new Date(activityDate).getTime()) / (1000 * 60 * 60);

        if (diffHours < 1) {
            return {
                label: "Actividad reciente",
                color: "blue",
                icon: <ClockCircleOutlined />,
            };
        }

        return {
            label: "Vencido",
            color: "red",
            icon: <ExclamationCircleOutlined />,
        };
    }

    function getTicketActivityText(ticket: Ticket) {
        const activityDate = ticket.lastActivityAt ?? ticket.updatedAt ?? ticket.createdAt;
        if (!activityDate) return null;

        const relative = formatRelativeTime(activityDate);

        if (ticket.status === "CLOSED") {
            return { icon: <CheckCircleOutlined />, text: `Cerrado ${relative}` };
        }
        if (!ticket.lastMessageDirection) {
            return { icon: <UserOutlined />, text: `Creado ${relative}` };
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

        return { icon: <ClockCircleOutlined />, text: `Actividad ${relative}` };
    }

    const filteredTickets = useMemo(() => {
        return tickets.filter((ticket) => {
            if (activeTab === "unassigned") return !ticket.assignee;
            if (activeTab === "my") return ticket.assignee?.id_tecnico === 1;
            return true;
        });
    }, [tickets, activeTab]);

    const getTicketCount = (status: string) => {
        if (status === "all") {
            return Object.values(statusCounts).reduce((acc, val) => acc + val, 0);
        }
        return statusCounts[status] ?? 0;
    };

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
        } catch {
            message.error("Error al cargar tickets");
        } finally {
            setLoading(false);
        }
    };

    const loadEmpresas = async () => {
        const { data } = await api.get("/empresas");
        setEmpresas(data?.data ?? []);
    };

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

    const loadTecnicos = async () => {
        try {
            const { data } = await api.get("/tecnicos");
            setTecnicos(Array.isArray(data) ? data : data?.data ?? []);
        } catch {
            message.error("No se pudieron cargar los técnicos");
            setTecnicos([]);
        }
    };

    const loadSla = async () => {
        try {
            setLoadingSla(true);
            const params = new URLSearchParams();
            if (dateRange) {
                params.append("from", dateRange[0]);
                params.append("to", dateRange[1]);
            }
            const { data } = await api.get(`/helpdesk/tickets/sla?${params.toString()}`);
            if (data?.ok) setSlaSummary(data.sla);
        } catch (error) {
            console.error("Error al cargar SLA", error);
        } finally {
            setLoadingSla(false);
        }
    };

    useEffect(() => {
        localStorage.setItem("helpdesk_show_resumen", String(showResumen));
    }, [showResumen]);

    useEffect(() => {
        loadEmpresas();
        loadTecnicos();
    }, []);

    useEffect(() => {
        loadTickets();
        loadSla();
    }, []);

    useEffect(() => {
        if (activeTab === "CLOSED") setStatusFilter("CLOSED");
        else if (activeTab === "all") setStatusFilter(undefined);
        else if (["OPEN", "PENDING", "RESOLVED"].includes(activeTab)) {
            setStatusFilter(activeTab);
        }
    }, [activeTab]);

    useEffect(() => {
        loadTickets();
    }, [page, pageSize]);

    useEffect(() => {
        socket.connect();
        socket.on("connect", () => console.log("🟢 Socket conectado", socket.id));
        socket.on("disconnect", () => console.log("🔴 Socket desconectado"));
        return () => {
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        const onTicketCreated = (payload: any) => {
            setNewTicketsCount((prev) => prev + 1);

            notification.info({
                message: "Nuevo ticket recibido",
                description: payload?.subject
                    ? `#${payload.id ?? ""} - ${payload.subject}`
                    : "Ha llegado un nuevo ticket",
                placement: "topRight",
                duration: 4,
            });

            loadTickets();
            loadSla();
        };

        const onCustomerReplied = (payload: any) => {
            notification.warning({
                message: "Nueva respuesta del solicitante",
                description: payload?.subject
                    ? `#${payload.ticketId ?? payload.id ?? ""} - ${payload.subject}`
                    : `El ticket #${payload?.ticketId ?? payload?.id ?? ""} recibió una respuesta`,
                placement: "topRight",
                duration: 4,
            });

            loadTickets();
            loadSla();
        };

        const onStatusChanged = (payload: any) => {
            const newStatusLabel =
                STATUS_LABELS[payload?.newStatus] || payload?.newStatus || "Actualizado";

            notification.success({
                message: "Estado actualizado",
                description: payload?.subject
                    ? `#${payload.ticketId ?? payload.id ?? ""} - ${payload.subject} → ${newStatusLabel}`
                    : `El ticket #${payload?.ticketId ?? payload?.id ?? ""} cambió a ${newStatusLabel}`,
                placement: "topRight",
                duration: 4,
            });

            loadTickets();
            loadSla();
        };

        socket.on("ticket.created", onTicketCreated);
        socket.on("ticket.customer_replied", onCustomerReplied);
        socket.on("ticket.status_changed", onStatusChanged);

        return () => {
            socket.off("ticket.created", onTicketCreated);
            socket.off("ticket.customer_replied", onCustomerReplied);
            socket.off("ticket.status_changed", onStatusChanged);
        };
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            forceUpdate((v) => v + 1);
        }, 60_000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        setPage(1);
        loadTickets();
        loadSla();
    }, [statusFilter, priorityFilter, assigneeFilter, areaFilter, dateRange]);

    const setLastDays = (days: number) => {
        const now = new Date();
        const from = new Date();
        from.setDate(now.getDate() - days);
        from.setHours(0, 0, 0, 0);

        setDateRange([from.toISOString(), now.toISOString()]);
        setActiveRange(`last-${days}`);
        setPage(1);
    };

    const setToday = () => {
        const today = new Date();
        const start = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate(),
            0,
            0,
            0
        );
        const end = new Date(
            today.getFullYear(),
            today.getMonth(),
            today.getDate() + 1,
            0,
            0,
            0
        );

        setActiveRange("today");
        setPage(1);
        setDateRange([start.toISOString(), end.toISOString()]);
    };

    const crearTicket = async () => {
        if (!form.subject?.trim()) {
            message.warning("El asunto es obligatorio");
            return;
        }

        try {
            setCreatingTicket(true);

            await api.post("/helpdesk/tickets", form);

            message.success("Ticket creado correctamente");
            setDrawerCrear(false);
            setForm({
                empresaId: undefined,
                requesterId: undefined,
                fromEmail: "",
                subject: "",
                message: buildMensajeInicial(),
                priority: "NORMAL",
                assigneeId: undefined,
            });

            await loadTickets();
            await loadSla();
        } catch (error: any) {
            message.error(error?.response?.data?.message || "Error al crear ticket");
        } finally {
            setCreatingTicket(false);
        }
    };

    const handleDelete = (ticketId: number) => {
        setTicketToDelete(ticketId);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!ticketToDelete) return;

        try {
            setDeletingTicket(true);
            await api.delete(`/helpdesk/tickets/${ticketToDelete}`);
            message.success("Ticket eliminado correctamente");
            setDeleteModalOpen(false);
            // ✅ Eliminar del estado local inmediatamente
            setTickets(prev => prev.filter(t => t.id !== ticketToDelete));
            setTicketToDelete(null);
        } catch {
            message.error("No se pudo eliminar el ticket");
        } finally {
            setDeletingTicket(false);
        }
    };

    const bulkClose = async () => {
        if (!selectedTickets.length) return;
        try {
            await api.patch("/helpdesk/tickets/bulk", {
                ticketIds: selectedTickets,
                status: "CLOSED",
            });
            message.success("Tickets cerrados correctamente");
            // ✅ Remover del estado local inmediatamente
            setTickets(prev => prev.filter(t => !selectedTickets.includes(t.id)));
            setSelectedTickets([]);
        } catch {
            message.error("Error al cerrar tickets");
        }
    };

    const bulkAssign = () => {
        if (!selectedTickets.length) return;
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
        } catch {
            message.error("Error al asignar tickets");
        }
    };

    const bulkMerge = () => {
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
            const { data } = await api.post("/helpdesk/tickets/bulk-merge", {
                mainTicketId: selectedMainTicketId,
                ticketIds: selectedTickets,
            });

            if (!data?.ok) {
                message.error(data?.message || "Error al fusionar tickets");
                return;
            }

            message.success("Tickets fusionados correctamente");
            setSelectedTickets([]);
            setBulkMergeModalOpen(false);
            setSelectedMainTicketId(null);
            await loadTickets();
        } catch (error: any) {
            message.error(
                error?.response?.data?.message || "Error al fusionar tickets"
            );
        }
    };

    const toggleSelectTicket = (ticketId: number, checked: boolean) => {
        setSelectedTickets((prev) =>
            checked ? [...new Set([...prev, ticketId])] : prev.filter((id) => id !== ticketId)
        );
    };

    const toggleSelectAllVisible = (checked: boolean) => {
        if (!checked) {
            setSelectedTickets([]);
            return;
        }
        setSelectedTickets(filteredTickets.map((t) => t.id));
    };

    const getSlaStatus = (value = 0) => {
        if (value >= 90) {
            return { color: "green" };
        }
        if (value >= 70) {
            return { color: "gold" };
        }
        return { color: "red" };
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4">
                <div className="mb-5 space-y-2">
                    <div className="flex justify-between items-center mb-4">

                        <Button onClick={() => setShowResumen(v => !v)}>
                            {showResumen ? "Ocultar resumen" : "Mostrar resumen"}
                        </Button>

                        <Space>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                disabled={creatingTicket}
                                onClick={() => {
                                    setForm({
                                        empresaId: undefined,
                                        requesterId: undefined,
                                        subject: "",
                                        message: buildMensajeInicial(),
                                        fromEmail: "",
                                        priority: "NORMAL",
                                        assigneeId: undefined,
                                    });
                                    setDrawerCrear(true);
                                }}
                                size="large"
                            >
                                Nuevo Ticket
                            </Button>

                            <Button icon={<ReloadOutlined />} onClick={() => { loadTickets(); loadSla(); }} />

                            <Dropdown menu={{ items: configMenuItems }} trigger={["click"]}>
                                <Button
                                    icon={<SettingOutlined />}
                                    title="Configuración"
                                />
                            </Dropdown>
                        </Space>
                    </div>

                    {showResumen ? (
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
                                            <div className="text-2xl font-bold">{getTicketCount("OPEN")}</div>
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
                                            <div className="text-2xl font-bold">{getTicketCount("CLOSED")}</div>
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
                                            <div className="text-2xl font-bold">
                                                {tickets.filter((t) => t.priority === "URGENT" || t.priority === "HIGH").length}
                                            </div>
                                        </div>
                                        <ExclamationCircleOutlined className="text-red-500 text-xl" />
                                    </div>
                                </Card>
                            </Col>

                            <Col span={6}>
                                <SlaCard
                                    title="SLA 1ra respuesta"
                                    icon={<ClockCircleOutlined className="text-xl" />}
                                    compliance={slaSummary?.firstResponse?.compliance ?? 0}
                                    breached={slaSummary?.firstResponse?.breached ?? 0}
                                    pending={slaSummary?.firstResponse?.pending ?? 0}
                                    total={slaSummary?.firstResponse?.total ?? 0}
                                    avgMinutes={slaSummary?.firstResponse?.avgMinutes}
                                    color="#06b6d4"
                                    loading={loadingSla}
                                />
                            </Col>

                            <Col span={6}>
                                <SlaCard
                                    title="SLA cierre"
                                    icon={<CheckCircleOutlined className="text-xl" />}
                                    compliance={slaSummary?.resolution?.compliance ?? 0}
                                    breached={slaSummary?.resolution?.breached ?? 0}
                                    pending={slaSummary?.resolution?.pending ?? 0}
                                    total={slaSummary?.resolution?.total ?? 0}
                                    avgMinutes={slaSummary?.resolution?.avgMinutes}
                                    color="#10b981"
                                    loading={loadingSla}
                                />
                            </Col>
                        </Row>
                    ) : (
                        <div className="mb-4 flex flex-wrap gap-2">
                            <Tag color="blue">Total: {Object.values(statusCounts).reduce((a, b) => a + b, 0)}</Tag>
                            <Tag color="orange">Abiertos: {getTicketCount("OPEN")}</Tag>
                            <Tag color="green">Cerrados: {getTicketCount("CLOSED")}</Tag>
                            <Tag color="red">
                                Urgentes: {tickets.filter((t) => t.priority === "URGENT" || t.priority === "HIGH").length}
                            </Tag>
                            <Tag color={getSlaStatus(slaSummary?.firstResponse?.compliance ?? 0).color}>
                                SLA 1ra resp: {slaSummary?.firstResponse?.compliance ?? 0}%
                            </Tag>
                            <Tag color={getSlaStatus(slaSummary?.resolution?.compliance ?? 0).color}>
                                SLA cierre: {slaSummary?.resolution?.compliance ?? 0}%
                            </Tag>
                        </div>
                    )}
                </div>

                <Card className="mb-4 rounded-3xl border-0 shadow-sm">
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                                <Input
                                    placeholder="Buscar por asunto, empresa, solicitante, email o ID..."
                                    prefix={<SearchOutlined />}
                                    value={searchText}
                                    onChange={(e) => setSearchText(e.target.value)}
                                    onPressEnter={loadTickets}
                                    size="large"
                                    className="rounded-xl"
                                />
                            </div>

                            <Space wrap>
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
                                    options={tecnicos.map((t) => ({
                                        value: t.id_tecnico,
                                        label: t.nombre,
                                    }))}
                                />
                                <Select
                                    style={{ width: 170 }}
                                    value={areaFilter}
                                    onChange={setAreaFilter}
                                    options={AREA_OPTIONS}
                                />
                            </Space>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button type={activeRange === "today" ? "primary" : "default"} onClick={setToday}>
                                Hoy
                            </Button>
                            <Button
                                type={activeRange === "last-7" ? "primary" : "default"}
                                onClick={() => setLastDays(7)}
                            >
                                Últimos 7 días
                            </Button>
                            <Button
                                type={activeRange === "last-30" ? "primary" : "default"}
                                onClick={() => setLastDays(30)}
                            >
                                Este mes
                            </Button>
                            <Button
                                onClick={() => {
                                    setDateRange(null);
                                    setActiveRange(null);
                                    setPage(1);
                                }}
                            >
                                Limpiar rango
                            </Button>
                        </div>
                    </div>
                </Card>

                <div className="mt-5 mb-4 flex flex-wrap items-center gap-5">
                    <Badge count={getTicketCount("all")}>
                        <Button type={activeTab === "all" ? "primary" : "default"} onClick={() => setActiveTab("all")}>
                            Todos
                        </Button>
                    </Badge>

                    <Badge count={getTicketCount("OPEN")}>
                        <Button type={activeTab === "OPEN" ? "primary" : "default"} onClick={() => setActiveTab("OPEN")}>
                            Abiertos
                        </Button>
                    </Badge>

                    <Badge count={getTicketCount("CLOSED")}>
                        <Button type={activeTab === "CLOSED" ? "primary" : "default"} onClick={() => setActiveTab("CLOSED")}>
                            Cerrados
                        </Button>
                    </Badge>

                    {newTicketsCount > 0 && (
                        <Button
                            type="primary"
                            shape="round"
                            icon={<BellOutlined />}
                            onClick={() => {
                                setNewTicketsCount(0);
                                loadTickets();
                                loadSla();
                            }}
                        >
                            {newTicketsCount} nuevo{newTicketsCount > 1 ? "s" : ""} ticket{newTicketsCount > 1 ? "s" : ""}
                        </Button>
                    )}
                </div>

                {selectedTickets.length > 0 && (
                    <Card className="mb-4 rounded-3xl border-0 shadow-sm">
                        <div className="flex justify-between items-center gap-4 flex-wrap">
                            <div className="font-medium">
                                {selectedTickets.length} ticket(s) seleccionados
                            </div>

                            <Space wrap>
                                <Button onClick={bulkAssign}>Asignar</Button>
                                <Button onClick={bulkMerge}>Fusionar</Button>
                                <Button danger onClick={bulkClose}>Cerrar</Button>
                            </Space>
                        </div>
                    </Card>
                )}

                <Card>
                    <div className="mb-4 flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={
                                filteredTickets.length > 0 &&
                                filteredTickets.every((t) => selectedTickets.includes(t.id))
                            }
                            onChange={(e) => toggleSelectAllVisible(e.target.checked)}
                        />
                        <span className="text-sm text-gray-500">Seleccionar visibles</span>
                    </div>

                    {loading ? (
                        <div className="py-16 flex justify-center">
                            <Spin size="large" />
                        </div>
                    ) : filteredTickets.length === 0 ? (
                        <div className="py-16 text-center text-gray-500">
                            No se encontraron tickets
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredTickets.map((ticket) => {
                                const activityMeta = getTicketActivityMeta(ticket);
                                const activityText = getTicketActivityText(ticket);

                                const menuItems: MenuProps["items"] = [
                                    {
                                        key: "delete",
                                        label: <span className="text-red-500">Eliminar</span>,
                                        onClick: ({ domEvent }) => {
                                            domEvent.stopPropagation();
                                            handleDelete(ticket.id);
                                        },
                                    },
                                ];

                                return (
                                    <div
                                        key={ticket.id}
                                        className="rounded-2xl border border-gray-200 bg-white px-5 py-5 hover:shadow-sm transition"
                                    >
                                        <div className="flex items-start gap-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedTickets.includes(ticket.id)}
                                                onChange={(e) =>
                                                    toggleSelectTicket(ticket.id, e.target.checked)
                                                }
                                                onClick={(e) => e.stopPropagation()}
                                            />

                                            <div className="flex-1 min-w-0">
                                                <div
                                                    className="cursor-pointer"
                                                    onClick={() => navigate(`/helpdesk/tickets/${ticket.id}`)}
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                                                <Tag color="blue" className="m-0">
                                                                    {TICKET_STATUS_LABEL[ticket.status] ?? ticket.status}
                                                                </Tag>

                                                                <span className="text-[15px] font-semibold text-slate-900 leading-snug">
                                                                    {PRIORITY_ICONS[
                                                                        ticket.priority as keyof typeof PRIORITY_ICONS
                                                                    ]}{" "}
                                                                    {ticket.subject}
                                                                </span>

                                                                <span className="text-sm text-gray-500">
                                                                    #{ticket.id}
                                                                </span>
                                                            </div>

                                                            <div className="text-sm text-slate-500 flex items-center gap-2 flex-wrap mt-1">
                                                                <span>{ticket.empresa?.nombre ?? "SIN CLASIFICAR"}</span>
                                                                <span>·</span>
                                                                <span>{ticket.requester?.nombre ?? ticket.fromEmail ?? "Sin solicitante"}</span>
                                                            </div>

                                                            <div className="flex items-center gap-2 flex-wrap mt-2">
                                                                <Tag icon={activityMeta.icon} color={activityMeta.color} className="m-0">
                                                                    {activityMeta.label}
                                                                </Tag>

                                                                {activityText && (
                                                                    <span className="text-[13px] text-gray-500 flex items-center gap-1">
                                                                        {activityText.icon}
                                                                        {activityText.text}
                                                                    </span>
                                                                )}

                                                                {ticket.sla?.firstResponse && (
                                                                    <Tag color={slaColor(ticket.sla.firstResponse.status)} className="m-0">
                                                                        1ra resp: {slaLabel(ticket.sla.firstResponse.status)}
                                                                    </Tag>
                                                                )}

                                                                {ticket.sla?.resolution && (
                                                                    <Tag color={slaColor(ticket.sla.resolution.status)} className="m-0">
                                                                        Cierre: {slaLabel(ticket.sla.resolution.status)}
                                                                    </Tag>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <Tag
                                                                className="m-0 rounded-full px-3"
                                                                color={ticket.assignee?.nombre ? "blue" : "default"}
                                                            >
                                                                {ticket.assignee?.nombre ?? "Sin asignar"}
                                                            </Tag>

                                                            <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
                                                                <Button
                                                                    type="text"
                                                                    icon={<MoreOutlined />}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                            </Dropdown>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="mt-4 flex justify-end">
                        <Pagination
                            current={page}
                            pageSize={pageSize}
                            total={totalTickets}
                            showSizeChanger
                            onChange={(newPage, newPageSize) => {
                                setPage(newPage);
                                setPageSize(newPageSize);
                            }}
                        />
                    </div>
                </Card>

                {/* ===== MODALES ===== */}
                <DeleteTicketModal
                    open={deleteModalOpen}
                    loading={deletingTicket}
                    onConfirm={confirmDelete}
                    onCancel={() => { setDeleteModalOpen(false); setTicketToDelete(null); }}
                />

                <BulkAssignModal
                    open={bulkAssignModalOpen}
                    ticketCount={selectedTickets.length}
                    tecnicos={tecnicos}
                    selectedTechnicianId={selectedTechnicianId}
                    onChange={setSelectedTechnicianId}
                    onConfirm={handleBulkAssignConfirm}
                    onCancel={() => { setBulkAssignModalOpen(false); setSelectedTechnicianId(null); }}
                />

                <BulkMergeModal
                    open={bulkMergeModalOpen}
                    selectedTickets={selectedTickets}
                    tickets={tickets}
                    selectedMainTicketId={selectedMainTicketId}
                    onChange={setSelectedMainTicketId}
                    onConfirm={handleBulkMergeConfirm}
                    onCancel={() => { setBulkMergeModalOpen(false); setSelectedMainTicketId(null); }}
                />

                {/* ===== DRAWERS ===== */}
                <CrearTicketDrawer
                    open={drawerCrear}
                    form={form}
                    empresas={empresas}
                    solicitantes={solicitantes}
                    tecnicos={tecnicos}
                    creating={creatingTicket}
                    onClose={() => {
                        if (creatingTicket) return;
                        setDrawerCrear(false);
                    }}
                    onSubmit={crearTicket}
                    onFormChange={setForm}
                    onEmpresaChange={loadSolicitantes}
                />
            </div>
        </div>
    );
}