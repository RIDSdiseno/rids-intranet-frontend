// src/components/modals-equipos/adicionales/AdicionalViewModal.tsx

import {
    CloseOutlined,
    DesktopOutlined,
} from "@ant-design/icons";

import type {
    AdicionalRow,
} from "./adicionales.types";

type Props = {
    open: boolean;
    row: AdicionalRow | null;
    onClose: () => void;
};

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

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">

            <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-cyan-200 bg-white shadow-2xl">

                {/* HEADER */}
                <div className="flex items-start justify-between gap-4 border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-indigo-50 px-5 py-4 sm:px-6">

                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-cyan-700">
                            Adicional #
                            {row.id}
                        </div>

                        <h2 className="mt-1 text-xl font-bold text-slate-900">
                            Detalle del adicional
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Información y equipo actualmente asociado.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    >
                        <CloseOutlined />
                    </button>
                </div>

                <div className="max-h-[calc(92vh-80px)] overflow-y-auto p-5 sm:p-6">

                    {/* RESUMEN */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">

                        <div className="rounded-2xl border border-cyan-100 bg-cyan-50/50 p-4">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                                Tipo
                            </div>

                            <div className="mt-1 font-semibold text-slate-900">
                                {row.tipo}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4">
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

                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                            <div className="text-xs uppercase tracking-wide text-slate-500">
                                Estado
                            </div>

                            <div className="mt-1 font-semibold text-slate-900">
                                {
                                    estadoLabel(
                                        row.estado
                                    )
                                }
                            </div>
                        </div>
                    </div>

                    {/* DATOS ADICIONAL */}
                    <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">

                        <h3 className="font-semibold text-slate-900">
                            Información del adicional
                        </h3>

                        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">

                            <div>
                                <dt className="text-xs text-slate-500">
                                    Serial
                                </dt>

                                <dd className="mt-1 font-mono text-sm font-semibold text-slate-800">
                                    {row.serialAdicional &&
                                        row.serialAdicional !==
                                        "0" &&
                                        row.serialAdicional !==
                                        "1"
                                        ? row.serialAdicional
                                        : "—"}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-xs text-slate-500">
                                    Cantidad
                                </dt>

                                <dd className="mt-1 text-sm font-semibold text-slate-800">
                                    {row.cantidad}
                                </dd>
                            </div>

                            <div className="sm:col-span-2">
                                <dt className="text-xs text-slate-500">
                                    Descripción
                                </dt>

                                <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                                    {descripcion}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    {/* EQUIPO */}
                    <section className="mt-5 rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50/60 to-indigo-50/40 p-5">

                        <div className="flex items-center gap-2">
                            <DesktopOutlined className="text-cyan-700" />

                            <h3 className="font-semibold text-slate-900">
                                Equipo asociado
                            </h3>
                        </div>

                        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">

                            <div>
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

                            <div>
                                <dt className="text-xs text-slate-500">
                                    Serial equipo
                                </dt>

                                <dd className="mt-1 font-mono text-sm text-slate-800">
                                    {row.equipo
                                        .serial ||
                                        "—"}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-xs text-slate-500">
                                    Marca / modelo
                                </dt>

                                <dd className="mt-1 text-sm text-slate-800">
                                    {row.equipo
                                        .marca ||
                                        "—"}{" "}
                                    {row.equipo
                                        .modelo ||
                                        ""}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-xs text-slate-500">
                                    Solicitante
                                </dt>

                                <dd className="mt-1 text-sm text-slate-800">
                                    {row.solicitante
                                        ?.nombre ||
                                        "—"}
                                </dd>
                            </div>

                            <div className="sm:col-span-2">
                                <dt className="text-xs text-slate-500">
                                    Empresa
                                </dt>

                                <dd className="mt-1 text-sm font-semibold text-slate-800">
                                    {row.empresa
                                        ?.nombre ||
                                        "—"}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    {/* FECHAS */}
                    <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                            <div>
                                <div className="text-xs text-slate-500">
                                    Creado
                                </div>

                                <div className="mt-1 text-sm text-slate-800">
                                    {
                                        formatFecha(
                                            row.createdAt
                                        )
                                    }
                                </div>
                            </div>

                            <div>
                                <div className="text-xs text-slate-500">
                                    Última actualización
                                </div>

                                <div className="mt-1 text-sm text-slate-800">
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