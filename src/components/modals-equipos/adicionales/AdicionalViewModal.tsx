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

                            <div className="min-w-0">

                                <dt className="text-xs text-slate-500">
                                    Serial
                                </dt>

                                <dd className="mt-1 break-all font-mono text-sm font-semibold text-slate-800">
                                    {
                                        serialAdicional
                                    }
                                </dd>

                            </div>

                            <div className="min-w-0">

                                <dt className="text-xs text-slate-500">
                                    Cantidad
                                </dt>

                                <dd className="mt-1 text-sm font-semibold text-slate-800">
                                    {
                                        row.cantidad
                                    }
                                </dd>

                            </div>

                            <div className="min-w-0 sm:col-span-2">

                                <dt className="text-xs text-slate-500">
                                    Descripción
                                </dt>

                                <dd className="mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-sm leading-6 text-slate-700">
                                    {
                                        descripcion
                                    }
                                </dd>

                            </div>

                        </dl>

                    </section>

                    {/* =================================================
                        EQUIPO
                    ================================================= */}

                    <section className="mt-5 min-w-0 rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50/60 to-indigo-50/40 p-4 sm:p-5">

                        <div className="flex min-w-0 items-center gap-2">

                            <DesktopOutlined className="shrink-0 text-cyan-700" />

                            <h3 className="break-words font-semibold text-slate-900">
                                Equipo asociado
                            </h3>

                        </div>

                        <dl className="mt-4 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">

                            <div className="min-w-0">

                                <dt className="text-xs text-slate-500">
                                    ID equipo
                                </dt>

                                <dd className="mt-1 text-sm font-semibold text-slate-900">
                                    #
                                    {
                                        row.equipo
                                            .id_equipo
                                    }
                                </dd>

                            </div>

                            <div className="min-w-0">

                                <dt className="text-xs text-slate-500">
                                    Serial equipo
                                </dt>

                                <dd className="mt-1 break-all font-mono text-sm text-slate-800">
                                    {row.equipo
                                        .serial ||
                                        "—"}
                                </dd>

                            </div>

                            <div className="min-w-0">

                                <dt className="text-xs text-slate-500">
                                    Marca / modelo
                                </dt>

                                <dd className="mt-1 break-words [overflow-wrap:anywhere] text-sm text-slate-800">

                                    {row.equipo
                                        .marca ||
                                        "—"}{" "}

                                    {row.equipo
                                        .modelo ||
                                        ""}

                                </dd>

                            </div>

                            <div className="min-w-0">

                                <dt className="text-xs text-slate-500">
                                    Solicitante
                                </dt>

                                <dd className="mt-1 break-words [overflow-wrap:anywhere] text-sm text-slate-800">
                                    {row.solicitante
                                        ?.nombre ||
                                        "—"}
                                </dd>

                            </div>

                            <div className="min-w-0 sm:col-span-2">

                                <dt className="text-xs text-slate-500">
                                    Empresa
                                </dt>

                                <dd className="mt-1 break-words [overflow-wrap:anywhere] text-sm font-semibold text-slate-800">
                                    {row.empresa
                                        ?.nombre ||
                                        "—"}
                                </dd>

                            </div>

                        </dl>

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