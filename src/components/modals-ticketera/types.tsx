// types.tsx
import type { ReactNode } from "react";

export type TicketStatus =
    | "NEW"
    | "OPEN"
    | "PENDING"
    | "ON_HOLD"
    | "RESOLVED"
    | "CLOSED";

export type TicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type TicketMessageDirection = "INBOUND" | "OUTBOUND" | "INTERNAL";

export type SlaStatus = "PENDING" | "OK" | "BREACHED";

export type AreaFilter =
    | "TODAS"
    | "SOPORTE"
    | "COMERCIAL"
    | "ADMINISTRACION"
    | "IMPLEMENTACION";

export type ActiveTab = "all" | "unassigned" | "my";

export type TicketMessage = {
    id?: number;
    bodyText?: string | null;
    bodyHtml?: string | null;
    createdAt: string;
    direction?: "INBOUND" | "OUTBOUND";
    isInternal?: boolean;
    fromEmail?: string | null;
    toEmail?: string | null;
    cc?: string | null;
    attachments?: TicketAttachment[];
};

export type TicketAttachment = {
    id: number;
    filename: string;
    url?: string;
    mimeType?: string;
    bytes?: number;
};

export type TicketEvent = {
    id?: number;
    type?: string;
    actorType?: string;
    description?: string | null;
    createdAt: string;
};

export type TicketSla = {
    firstResponse?: {
        dueAt?: string;
        at?: string | null;
        status?: SlaStatus;
    };
    resolution?: {
        dueAt?: string;
        at?: string | null;
        status?: SlaStatus;
    };
};

export type Tecnico = {
    id_tecnico: number;
    nombre: string;
    email?: string;
    cargo?: string;
    area?: string;
    telefono?: string;
    firmaTexto?: string;
};

export type EmpresaOption = {
    id_empresa: number;
    nombre: string;
};

export type SolicitanteOption = {
    value: number;
    label: string;
};

export type Ticket = {
    id: number;
    subject: string;
    status: TicketStatus;
    priority: TicketPriority;
    fromEmail?: string;
    createdAt: string;
    updatedAt: string;
    lastActivityAt?: string;
    empresa?: {
        nombre: string;
    };
    requester?: {
        nombre: string;
        email?: string;
    };
    assignee?: {
        id_tecnico: number;
        nombre: string;
        email?: string;
    };
    messages: TicketMessage[];
    lastMessageDirection?: TicketMessageDirection | null;
    sla?: TicketSla;
};

export type TicketDetail = Ticket & {
    empresa?: {
        id_empresa?: number;
        nombre: string;
    };
    requester?: {
        id_solicitante?: number;
        nombre: string;
        email?: string;
    };
    assignee?: Tecnico;
    events?: TicketEvent[];
};

export type StatusCounts = Record<string, number>;

export type TicketFormState = {
    empresaId: number | undefined;
    requesterId: number | undefined;
    subject: string;
    message: string;
    fromEmail: string;
    priority: TicketPriority;
    assigneeId: number | undefined;
};

export type TicketActivityMeta = {
    label: string;
    color: string;
    icon: ReactNode;
};

export type TicketActivityText = {
    icon: ReactNode;
    text: string;
};

export type SlaSummary = {
    firstResponse?: {
        ok: number;
        breached: number;
        pending: number;
        avgMinutes?: number;
    };
    resolution?: {
        ok: number;
        breached: number;
        pending: number;
        avgMinutes?: number;
    };
};