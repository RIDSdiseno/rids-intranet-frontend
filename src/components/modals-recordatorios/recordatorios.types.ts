// src/components/modals-recordatorios/recordatorios.types.ts

export type EstadoRecordatorio =
    | "PENDIENTE"
    | "COMPLETADO"
    | "CANCELADO";

export type OrigenRecordatorio =
    | "MANUAL"
    | "BITACORA"
    | "TICKET"
    | "COTIZACION"
    | "VISITA"
    | "EQUIPO";

export interface Recordatorio {
    id: number;
    titulo: string;
    mensaje?: string | null;
    fechaProgramada: string;
    estado: EstadoRecordatorio;
    origen: OrigenRecordatorio;

    destinatarioId: number;
    creadoPorId?: number | null;

    bitacoraId?: number | null;
    ticketId?: number | null;
    cotizacionId?: number | null;
    visitaId?: number | null;
    equipoId?: number | null;
    mantencionId?: number | null;
    oportunidadId?: number | null;

    leidoAt?: string | null;
    notificadoAt?: string | null;
    completadoAt?: string | null;
    canceladoAt?: string | null;

    createdAt: string;
    updatedAt: string;

    bitacora?: {
        id: number;
        titulo?: string | null;
        descripcion: string;
    } | null;

    ticket?: {
        id: number;
        publicId?: string | null;
        subject?: string | null;
        status?: string | null;
    } | null;

    cotizacion?: {
        id: number;
        estado: string;
        total: number;
    } | null;

    visita?: {
        id_visita: number;
        inicio: string;
        status: string;
    } | null;

    equipo?: {
        id_equipo: number;
        serial?: string | null;
        marca: string;
        modelo: string;
    } | null;
}

export interface RecordatoriosResponse {
    data: Recordatorio[];
    pendientesNoLeidos: number;
}