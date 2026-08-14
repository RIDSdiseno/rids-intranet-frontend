// src/components/modals-equipos/adicionales/AdicionalViewModal.tsx

import {
    CloseOutlined,
    DesktopOutlined,
} from "@ant-design/icons";

import type {
    AdicionalRow,
} from "./adicionales.types";

/* =========================================================
   TIPOS
========================================================= */

type Props = {
    open: boolean;
    row: AdicionalRow | null;
    onClose: () => void;
};

/* =========================================================
   HELPERS
========================================================= */

function formatFecha(
    value?: string | null
) {
    if (!value) {
        return "—";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "—";
    }

    return new Intl.DateTimeFormat(
        "es-CL",
        {
            year:
                "numeric",
            month:
                "2-digit",
            day:
                "2-digit",
            hour:
                "2-digit",
            minute:
                "2-digit",
            hour12:
                false,
        }
    ).format(date);
}

function estadoLabel(
    estado?: string | null
) {
    switch (estado) {
        case "ASIGNADO":
            return "Asignado";

        case "EN_STOCK":
            return "En stock";

        case "EN_REPARACION":
            return "En reparación";

        case "DADO_DE_BAJA":
            return "Dado de baja";

        default:
            return estado ||
                "—";
    }
}

function mostrarSerial(
    value?: string | null
) {
    const serial =
        String(
            value ??
            ""
        ).trim();

    if (!serial) {
        return "—";
    }

    /*
     * Seriales históricos falsos detectados
     * en algunos paneles / monitores.
     */
    if (
        serial === "0" ||
        serial === "1" ||
        serial === "16843009"
    ) {
        return "—";
    }

    return serial;
}

/* =========================================================
   COMPONENTE
========================================================= */

export default function AdicionalViewModal({
    open,
    row,
    onClose,
}: Props) {

    if (
        !open ||
        !row
    ) {
        return null;
    }

    const descripcion =
        String(
            row.descripcion ??
            ""
        )
            .replace(
                /^\[AGENTE\]\s*/i,
                ""
            )
            .trim() ||
        "—";

    const serialAdicional =
        mostrarSerial(
            row.serialAdicional
        );

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-hidden bg-slate-950/40 p-2 backdrop-blur-sm sm:p-4">

            <div className="flex max-h-[calc(100dvh-1rem)] w-full min-w-0 max-w-3xl flex-col overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-2xl sm:max-h-[92dvh] sm:rounded-3xl">

                {/* =================================================
                    HEADER
                ================================================= */}

                <div className="flex min-w-0 shrink-0 items-start justify-between gap-3 border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-indigo-50 px-4 py-4 sm:px-6">

                    <div className="min-w-0">

                        <div className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
                            Adicional #
                            {
                                row.id
                            }
                        </div>

                        <h2 className="mt-1 break-words text-lg font-bold text-slate-900 sm:text-xl">
                            Detalle del adicional
                        </h2>

                        <p className="mt-1 break-words text-xs text-slate-500 sm:text-sm">
                            Información y equipo actualmente asociado.
                        </p>

                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
                        aria-label="Cerrar"
                    >
                        <CloseOutlined />
                    </button>

                </div>

                {/* =================================================
                    BODY
                ================================================= */}

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">

                    {/* =================================================
                        RESUMEN
                    ================================================= */}

                    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">

                        <div className="min-w-0 rounded-2xl border border-cyan-100 bg-cyan-50/50 p-4">

                            <div className="text-xs uppercase tracking-wide text-slate-500">
                                Tipo
                            </div>

                            <div className="mt-1 break-words font-semibold text-slate-900">
                                {
                                    row.tipo
                                }
                            </div>

                        </div>

                        <div className="min-w-0 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">

                            <div className="text-xs uppercase tracking-wide text-slate-500">
                                Origen
                            </div>

                            <div className="mt-1 font-semibold text-slate-900">
                                {row.origen ===
                                    "AGENTE"
                                    ? "Agente"
                                    : "Manual"}
                            </div>

                        </div>

                        <div className="min-w-0 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">

                            <div className="text-xs uppercase tracking-wide text-slate-500">
                                Estado
                            </div>

                            <div className="mt-1 break-words font-semibold text-slate-900">
                                {
                                    estadoLabel(
                                        row.estado
                                    )
                                }
                            </div>

                        </div>

                    </div>

                    {/* =================================================
                        DATOS ADICIONAL
                    ================================================= */}

                    <section className="mt-5 min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">

                        <h3 className="font-semibold text-slate-900">
                            Información del adicional
                        </h3>

                        <dl className="mt-4 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">

                            <div>
                                <dt className="text-xs text-slate-500">
                                    Nombre
                                </dt>

                                <dd className="mt-1 break-words text-sm font-semibold text-slate-800">
                                    {
                                        row.nombre ||
                                        "—"
                                    }
                                </dd>
                            </div>

                            <div>
                                <dt className="text-xs text-slate-500">
                                    Marca / modelo
                                </dt>

                                <dd className="mt-1 break-words text-sm text-slate-800">
                                    {
                                        [
                                            row.marca,
                                            row.modelo,
                                        ]
                                            .filter(Boolean)
                                            .join(" ") ||
                                        "—"
                                    }
                                </dd>
                            </div>

                            <div>
                                <dt className="text-xs text-slate-500">
                                    Serial
                                </dt>

                                <dd className="mt-1 break-all font-mono text-sm font-semibold text-slate-800">
                                    {
                                        serialAdicional
                                    }
                                </dd>
                            </div>

                            <div>
                                <dt className="text-xs text-slate-500">
                                    Cantidad
                                </dt>

                                <dd className="mt-1 text-sm font-semibold text-slate-800">
                                    {
                                        row.cantidad
                                    }
                                </dd>
                            </div>

                            <div>
                                <dt className="text-xs text-slate-500">
                                    MAC
                                </dt>

                                <dd className="mt-1 break-all font-mono text-sm text-slate-800">
                                    {
                                        row.macAddress ||
                                        "—"
                                    }
                                </dd>
                            </div>

                            <div>
                                <dt className="text-xs text-slate-500">
                                    IP
                                </dt>

                                <dd className="mt-1 break-all font-mono text-sm text-slate-800">
                                    {
                                        row.ipAddress ||
                                        "—"
                                    }
                                </dd>
                            </div>

                            <div>
                                <dt className="text-xs text-slate-500">
                                    Hostname
                                </dt>

                                <dd className="mt-1 break-words text-sm text-slate-800">
                                    {
                                        row.hostname ||
                                        "—"
                                    }
                                </dd>
                            </div>

                            <div>
                                <dt className="text-xs text-slate-500">
                                    Ubicación
                                </dt>

                                <dd className="mt-1 break-words text-sm text-slate-800">
                                    {
                                        row.ubicacion ||
                                        "—"
                                    }
                                </dd>
                            </div>

                            <div className="sm:col-span-2">
                                <dt className="text-xs text-slate-500">
                                    Descripción
                                </dt>

                                <dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                                    {
                                        descripcion
                                    }
                                </dd>
                            </div>

                        </dl>

                    </section>

                    {/* =================================================
    EQUIPOS ASOCIADOS
================================================= */}

                    <section className="mt-5 min-w-0 rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50/60 to-indigo-50/40 p-4 sm:p-5">

                        <div className="flex min-w-0 items-center justify-between gap-3">

                            <div className="flex min-w-0 items-center gap-2">

                                <DesktopOutlined className="shrink-0 text-cyan-700" />

                                <h3 className="break-words font-semibold text-slate-900">
                                    Equipos asociados
                                </h3>

                            </div>

                            <span className="rounded-full border border-cyan-200 bg-white px-2.5 py-1 text-xs font-semibold text-cyan-800">
                                {
                                    row.totalEquipos ??
                                    row.equipos.length
                                }
                            </span>

                        </div>

                        {row.equipos.length ===
                            0 ? (

                            <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white/60 p-4 text-center text-sm text-slate-500">
                                Este adicional no tiene equipos asociados.
                            </div>

                        ) : (

                            <div className="mt-4 space-y-3">

                                {row.equipos.map(
                                    (
                                        relacion
                                    ) => {

                                        const equipo =
                                            relacion.equipo;

                                        const empresa =
                                            equipo.empresa ??
                                            equipo.solicitante
                                                ?.empresa ??
                                            null;

                                        return (
                                            <div
                                                key={
                                                    relacion.id
                                                }
                                                className="rounded-xl border border-slate-200 bg-white p-4"
                                            >

                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">

                                                    <div className="min-w-0">

                                                        <div className="font-semibold text-slate-900">
                                                            Equipo #
                                                            {
                                                                equipo.id_equipo
                                                            }
                                                        </div>

                                                        <div className="mt-1 break-all font-mono text-xs text-slate-500">
                                                            {
                                                                equipo.serial ||
                                                                "Sin serial"
                                                            }
                                                        </div>

                                                    </div>

                                                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600">
                                                        {
                                                            relacion.origen ===
                                                                "AGENTE"
                                                                ? "Agente"
                                                                : "Manual"
                                                        }
                                                    </span>

                                                </div>

                                                <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">

                                                    <div>
                                                        <div className="text-xs text-slate-500">
                                                            Marca / modelo
                                                        </div>

                                                        <div className="mt-1 break-words text-slate-800">
                                                            {
                                                                [
                                                                    equipo.marca,
                                                                    equipo.modelo,
                                                                ]
                                                                    .filter(Boolean)
                                                                    .join(" ") ||
                                                                "—"
                                                            }
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <div className="text-xs text-slate-500">
                                                            Solicitante
                                                        </div>

                                                        <div className="mt-1 break-words text-slate-800">
                                                            {
                                                                equipo.solicitante
                                                                    ?.nombre ||
                                                                "—"
                                                            }
                                                        </div>
                                                    </div>

                                                    <div className="sm:col-span-2">
                                                        <div className="text-xs text-slate-500">
                                                            Empresa
                                                        </div>

                                                        <div className="mt-1 break-words font-semibold text-slate-800">
                                                            {
                                                                empresa
                                                                    ?.nombre ||
                                                                "—"
                                                            }
                                                        </div>
                                                    </div>

                                                </div>

                                            </div>
                                        );
                                    }
                                )}

                            </div>
                        )}

                    </section>

                    {/* =================================================
                        FECHAS
                    ================================================= */}

                    <section className="mt-5 min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">

                        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">

                            <div className="min-w-0">

                                <div className="text-xs text-slate-500">
                                    Creado
                                </div>

                                <div className="mt-1 break-words text-sm text-slate-800">
                                    {
                                        formatFecha(
                                            row.createdAt
                                        )
                                    }
                                </div>

                            </div>

                            <div className="min-w-0">

                                <div className="text-xs text-slate-500">
                                    Última actualización
                                </div>

                                <div className="mt-1 break-words text-sm text-slate-800">
                                    {
                                        formatFecha(
                                            row.updatedAt
                                        )
                                    }
                                </div>

                            </div>

                        </div>

                    </section>

                </div>

            </div>

        </div>
    );
}