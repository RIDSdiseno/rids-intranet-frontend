// src/components/modals-bitacora/bitacora.helpers.ts

import dayjs from "dayjs";

import {
    CHILE_TZ,
} from "./bitacora.constants";

import type {
    BitacoraTecnico,
    EstadoRecordatorioVisual,
    OpcionRelacion,
    TipoRelacionOpcional,
} from "./bitacora.types";

export function todayInputDate() {
    return dayjs()
        .tz(CHILE_TZ)
        .format("YYYY-MM-DD");
}

export function formatFechaChile(
    value?: string | null
) {
    if (!value) {
        return "-";
    }

    const date =
        dayjs(value);

    if (!date.isValid()) {
        return "-";
    }

    return new Intl.DateTimeFormat(
        "es-CL",
        {
            timeZone:
                CHILE_TZ,

            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric",

            hour12:
                false,
        }
    ).format(
        date.toDate()
    );
}

export function formatHoraChile(
    value?: string | null
) {
    if (!value) {
        return "-";
    }

    const date =
        dayjs(value);

    if (!date.isValid()) {
        return "-";
    }

    return new Intl.DateTimeFormat(
        "es-CL",
        {
            timeZone:
                CHILE_TZ,

            hour:
                "2-digit",

            minute:
                "2-digit",

            hour12:
                false,
        }
    ).format(
        date.toDate()
    );
}

export function formatFechaHoraChile(
    value?: string | null
) {
    if (!value) {
        return "-";
    }

    const date =
        dayjs(value);

    if (!date.isValid()) {
        return "-";
    }

    return new Intl.DateTimeFormat(
        "es-CL",
        {
            timeZone:
                CHILE_TZ,

            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit",

            hour12:
                false,
        }
    ).format(
        date.toDate()
    );
}

export function formatRecordatorioChile(
    value?: string | null
) {
    if (!value) {
        return "-";
    }

    const fecha =
        dayjs(value);

    if (!fecha.isValid()) {
        return "-";
    }

    return fecha
        .tz(CHILE_TZ)
        .format(
            "DD/MM/YYYY [a las] HH:mm"
        );
}

export function traducirEstadoTicket(
    status?: string | null
) {
    const estado =
        String(
            status ?? ""
        ).toUpperCase();

    const estados:
        Record<string, string> = {
        NEW:
            "Nuevo",

        OPEN:
            "Abierto",

        PENDING:
            "Pendiente",

        ON_HOLD:
            "En espera",

        RESOLVED:
            "Resuelto",

        CLOSED:
            "Cerrado",
    };

    return (
        estados[estado] ??
        status ??
        "-"
    );
}

export function normalizarBusqueda(
    value?: string | number | null
) {
    return String(
        value ?? ""
    )
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .trim();
}

export function incluyeBusqueda(
    texto: unknown,
    busqueda: unknown
) {
    const textoNormalizado =
        normalizarBusqueda(
            String(
                texto ?? ""
            )
        );

    const busquedaNormalizada =
        normalizarBusqueda(
            String(
                busqueda ?? ""
            )
        );

    if (
        !busquedaNormalizada
    ) {
        return true;
    }

    const palabras =
        busquedaNormalizada
            .split(/\s+/)
            .filter(Boolean);

    return palabras.every(
        (
            palabra
        ) =>
            textoNormalizado.includes(
                palabra
            )
    );
}

export function toNumberOrNull(
    value: string
): number | null {
    const n =
        Number(value);

    return (
        Number.isInteger(n) &&
        n > 0
    )
        ? n
        : null;
}

export function getAxiosErrorMessage(
    error: unknown
) {
    const err =
        error as {
            response?: {
                data?: {
                    error?: string;
                    message?: string;
                };
            };

            message?: string;
        };

    return (
        err?.response?.data
            ?.error ||
        err?.response?.data
            ?.message ||
        err?.message ||
        "Ocurrió un error inesperado"
    );
}

export function esNotaRapida(
    bitacora:
        BitacoraTecnico
) {
    return Boolean(
        bitacora.titulo?.startsWith(
            "Nota rápida"
        )
    );
}

export function formatTituloBitacora(
    titulo?: string | null
) {
    if (!titulo) {
        return "Sin título";
    }

    if (
        titulo ===
        "Nota rápida"
    ) {
        return "Sin título";
    }

    const prefijo =
        "Nota rápida · ";

    if (
        titulo.startsWith(
            prefijo
        )
    ) {
        return titulo.slice(
            prefijo.length
        );
    }

    return titulo;
}

export function obtenerEstadoRecordatorio(
    bitacora:
        BitacoraTecnico
): EstadoRecordatorioVisual {
    if (
        !bitacora.recordatorioAt
    ) {
        return "SIN_RECORDATORIO";
    }

    if (
        bitacora.recordatorioCompletado
    ) {
        return "COMPLETADO";
    }

    if (
        dayjs(
            bitacora.recordatorioAt
        ).isBefore(
            dayjs()
        )
    ) {
        return "VENCIDO";
    }

    return "PENDIENTE";
}

export function getRecordatorioBadgeClass(
    estado:
        EstadoRecordatorioVisual
) {
    switch (estado) {
        case "COMPLETADO":
            return "border-emerald-200 bg-emerald-50 text-emerald-700";

        case "VENCIDO":
            return "border-red-200 bg-red-50 text-red-700";

        case "PENDIENTE":
            return "border-amber-200 bg-amber-50 text-amber-700";

        default:
            return "border-slate-200 bg-slate-50 text-slate-500";
    }
}

export function getRecordatorioLabel(
    estado:
        EstadoRecordatorioVisual
) {
    switch (estado) {
        case "COMPLETADO":
            return "Completado";

        case "VENCIDO":
            return "Vencido";

        case "PENDIENTE":
            return "Pendiente";

        default:
            return "Sin recordatorio";
    }
}

export function renderRelacionesResumen(
    bitacora:
        BitacoraTecnico
): string[] {
    const relaciones:
        string[] = [];

    if (
        bitacora.solicitante
    ) {
        relaciones.push(
            `Solicitante: ${bitacora.solicitante.nombre}${bitacora.solicitante.email
                ? ` - ${bitacora.solicitante.email}`
                : ""
            }`
        );
    }

    if (
        bitacora.ticket
    ) {
        relaciones.push(
            `Ticket #${bitacora.ticket.id} - ${traducirEstadoTicket(
                bitacora.ticket.status
            )} - ${bitacora.ticket.subject}`
        );
    }

    if (
        bitacora.trabajo
    ) {
        relaciones.push(
            `Orden: ${bitacora.trabajo.numeroOrden ??
            `#${bitacora.trabajo.id}`
            }`
        );
    }

    if (
        bitacora.visita
    ) {
        relaciones.push(
            `Visita: #${bitacora.visita.id_visita}`
        );
    }

    if (
        bitacora.mantencion
    ) {
        relaciones.push(
            `Mantención: #${bitacora.mantencion.id_mantencion}`
        );
    }

    if (
        bitacora.equipo
    ) {
        relaciones.push(
            `Equipo: ${bitacora.equipo.serial ??
                ""
                } ${bitacora.equipo.marca ??
                ""
                } ${bitacora.equipo.modelo ??
                ""
                }`.trim()
        );
    }

    if (
        bitacora.cotizacion
    ) {
        relaciones.push(
            `Cotización: #${bitacora.cotizacion.id}`
        );
    }

    return relaciones;
}

export function renderRelacionResumen(
    bitacora:
        BitacoraTecnico
) {
    const relaciones =
        renderRelacionesResumen(
            bitacora
        );

    if (
        relaciones.length === 0
    ) {
        return "-";
    }

    return relaciones.join(
        " · "
    );
}

export function mapRelacionOption(
    tipo:
        TipoRelacionOpcional,
    item: any
): OpcionRelacion | null {
    if (!tipo) {
        return null;
    }

    switch (tipo) {
        case "solicitantes":
            return {
                id:
                    item.id_solicitante,

                label:
                    `${item.nombre}${item.email
                        ? ` - ${item.email}`
                        : ""
                    }`,

                raw:
                    item,
            };

        case "tickets":
            return {
                id:
                    item.id,

                label:
                    `Ticket #${item.id} - ${item.subject} - ${traducirEstadoTicket(
                        item.status
                    )}`,

                raw:
                    item,
            };

        case "trabajos":
            return {
                id:
                    item.id,

                label:
                    `${item.numeroOrden ??
                    `Orden #${item.id}`
                    } - ${item.tipoTrabajo ??
                    "Trabajo"
                    } - ${item.area ??
                    ""
                    } - ${item.destinoEquipo ??
                    ""
                    }`,

                raw:
                    item,
            };

        case "visitas":
            return {
                id:
                    item.id_visita,

                label:
                    `Visita #${item.id_visita} - ${new Date(
                        item.inicio
                    ).toLocaleString(
                        "es-CL"
                    )} - ${item.status
                    }`,

                raw:
                    item,
            };

        case "mantenciones":
            return {
                id:
                    item.id_mantencion,

                label:
                    `Mantención #${item.id_mantencion} - ${item.deviceNombre ??
                    item.solicitante ??
                    "Sin dispositivo"
                    } - ${item.status
                    }`,

                raw:
                    item,
            };

        case "equipos":
            return {
                id:
                    item.id_equipo,

                label:
                    `${item.marca ??
                    ""
                    } ${item.modelo ??
                    ""
                    }${item.serial
                        ? ` - ${item.serial}`
                        : ""
                    } - ${item.estado ??
                    ""
                    }`,

                raw:
                    item,
            };

        case "cotizaciones":
            return {
                id:
                    item.id,

                label:
                    `Cotización #${item.id} - ${item.estado} - $${Number(
                        item.total ??
                        0
                    ).toLocaleString(
                        "es-CL"
                    )}`,

                raw:
                    item,
            };

        default:
            return null;
    }
}

export function formatBytes(
    bytes: number
) {
    if (
        !Number.isFinite(
            bytes
        ) ||
        bytes <= 0
    ) {
        return "0 B";
    }

    const unidades = [
        "B",
        "KB",
        "MB",
        "GB",
    ];

    const index =
        Math.min(
            Math.floor(
                Math.log(bytes) /
                Math.log(1024)
            ),
            unidades.length -
            1
        );

    const valor =
        bytes /
        Math.pow(
            1024,
            index
        );

    return `${valor.toFixed(
        index === 0
            ? 0
            : 1
    )} ${unidades[index]}`;
}