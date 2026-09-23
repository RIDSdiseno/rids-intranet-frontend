import type {
    EstadoBitacoraTecnico,
    RelacionConfig,
    TipoBitacoraTecnico,
} from "./bitacora.types";

export const CHILE_TZ =
    "America/Santiago";

export const TIPOS_ACTIVIDAD:
    TipoBitacoraTecnico[] = [
        "SOPORTE",
        "INSTALACIÓN",
        "TERRENO",
        "REMOTO",
        "TALLER",
        "INTERNO",
        "ADMINISTRATIVO",
        "REUNION",
        "OTRO",
    ];

export const ESTADOS:
    EstadoBitacoraTecnico[] = [
        "REGISTRADA",
        "PENDIENTE_APROBACION",
        "APROBADA",
        "EN_PROCESO",
        "PENDIENTE_CIERRE",
        "CERRADA",
        "RECHAZADA",
        "ANULADA",
    ];

export const RELACIONES_CONFIG:
    RelacionConfig[] = [
        {
            tipo:
                "solicitantes",
            label:
                "Solicitante",
            formKey:
                "solicitanteId",
        },
        {
            tipo:
                "tickets",
            label:
                "Ticket",
            formKey:
                "ticketId",
        },
        {
            tipo:
                "trabajos",
            label:
                "Trabajo / Orden de taller",
            formKey:
                "trabajoId",
        },
        {
            tipo:
                "visitas",
            label:
                "Visita",
            formKey:
                "visitaId",
        },
        {
            tipo:
                "mantenciones",
            label:
                "Mantención remota",
            formKey:
                "mantencionId",
        },
        {
            tipo:
                "equipos",
            label:
                "Equipo",
            formKey:
                "equipoId",
        },
        {
            tipo:
                "cotizaciones",
            label:
                "Cotización",
            formKey:
                "cotizacionId",
        },
    ];

export const OPCIONES_RAPIDAS_RECORDATORIO =
    [
        {
            label:
                "30 min",
            minutos:
                30,
        },
        {
            label:
                "1 hora",
            minutos:
                60,
        },
        {
            label:
                "1 h 30",
            minutos:
                90,
        },
        {
            label:
                "2 horas",
            minutos:
                120,
        },
        {
            label:
                "3 horas",
            minutos:
                180,
        },
    ] as const;

export const LABEL_BASE =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600";