// utils.tsx
import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    ExclamationCircleOutlined,
    MessageOutlined,
    TeamOutlined,
    UserOutlined,
} from "@ant-design/icons";

import type {
    Ticket,
    TicketActivityMeta,
    TicketActivityText,
    TicketPriority,
    TicketStatus,
    SlaStatus,
} from "./types";

export const STATUS_LABELS: Record<TicketStatus, string> = {
    NEW: "Nuevo",
    OPEN: "Abierto",
    PENDING: "Pendiente",
    ON_HOLD: "En espera",
    RESOLVED: "Resuelto",
    CLOSED: "Cerrado",
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
    LOW: "Baja",
    NORMAL: "Media",
    HIGH: "Alta",
    URGENT: "Urgente",
};

export function priorityColor(priority?: TicketPriority | string) {
    switch (priority) {
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

export function statusColor(status?: TicketStatus | string) {
    switch (status) {
        case "NEW":
            return "blue";
        case "OPEN":
            return "gold";
        case "PENDING":
            return "orange";
        case "ON_HOLD":
            return "purple";
        case "RESOLVED":
            return "green";
        case "CLOSED":
            return "default";
        default:
            return "default";
    }
}

export function slaColor(status?: SlaStatus | string) {
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

export function slaLabel(status?: SlaStatus | string) {
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

export function formatDateTime(date?: string | Date | null) {
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

export function formatRelativeTime(date?: string | Date | null) {
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

export function formatEmailBody(text: string | null) {
    if (!text) return "";

    return text
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>')
        .replace(/\n/g, "<br/>");
}

// Función para determinar el estado de actividad de un ticket, basado en su estado y la fecha de su última actividad, para mostrar un indicador visual en la lista de tickets.
export function getTicketActivityMeta(ticket: Ticket): TicketActivityMeta {
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

export function getTicketActivityText(ticket: Ticket): TicketActivityText | null {
    const activityDate = ticket.lastActivityAt ?? ticket.updatedAt ?? ticket.createdAt;

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