import React from "react";
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    EyeOutlined,
    WarningOutlined,
} from "@ant-design/icons";
import { formatCLP, formatFechaVista } from "./utils";

export type RcvConciliacionRow = {
    id: string;
    empresaKey: "econnet" | "rids";
    tipoRcv: "ventas" | "compras";
    tipoDoc: string;
    folio: string;
    rutContraparte: string;
    razonSocial: string;
    fechaDocto: string | null;
    montoNeto: number;
    montoIva: number;
    montoTotal: number;
    estadoRcv: string | null;
    origenRcv: string | null;
    estadoConciliacion: string;
    formaPago: string | null;
    observacion: string | null;
    responsable: string | null;
    conciliadoAt: string | null;
};

type Props = {
    rows: RcvConciliacionRow[];
    loading: boolean;
    tipoRcv: "ventas" | "compras";
    onConciliar: (row: RcvConciliacionRow) => void;
    onDesconciliar: (row: RcvConciliacionRow) => void;
    onObservar: (row: RcvConciliacionRow) => void;
};

function EstadoConciliacionBadge({ estado }: { estado: string }) {
    const value = String(estado ?? "NO_CONCILIADA").toUpperCase();

    if (value === "CONCILIADA") {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                <CheckCircleOutlined />
                Conciliada
            </span>
        );
    }

    if (value === "OBSERVADA") {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
                <WarningOutlined />
                Observada
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
            <CloseCircleOutlined />
            No conciliada
        </span>
    );
}

function EstadoRcvBadge({ estado }: { estado?: string | null }) {
    const value = String(estado ?? "—").toUpperCase();

    const className = value.includes("PENDIENTE")
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : value.includes("RECLAMADO")
            ? "bg-red-50 text-red-700 ring-red-200"
            : value.includes("ACUSADO")
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : "bg-cyan-50 text-cyan-700 ring-cyan-200";

    return (
        <span
            className={`inline-flex max-w-full rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${className}`}
            title={value}
        >
            <span className="truncate">{value}</span>
        </span>
    );
}

const RcvConciliacionTable: React.FC<Props> = ({
    rows,
    loading,
    tipoRcv,
    onConciliar,
    onDesconciliar,
    onObservar,
}) => {
    return (
        <div className="overflow-hidden rounded-3xl border border-cyan-200 bg-white shadow-sm">
            <div className="border-b border-cyan-100 bg-white p-4 sm:p-5">
                <h2 className="text-base font-black text-slate-900 sm:text-lg">
                    Conciliación RCV
                </h2>
                <p className="text-sm text-slate-500">
                    Mostrando {rows.length} documentos de {tipoRcv === "ventas" ? "ventas" : "compras"}.
                </p>
            </div>

            {/* Mobile */}
            <div className="divide-y divide-slate-100 md:hidden">
                {rows.map((row) => (
                    <div key={row.id} className="p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex flex-wrap gap-2">
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                                        DTE {row.tipoDoc}
                                    </span>
                                    <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] font-bold text-cyan-700 ring-1 ring-cyan-100">
                                        Folio {row.folio}
                                    </span>
                                </div>

                                <p className="mt-2 truncate text-sm font-black text-slate-900">
                                    {row.razonSocial || "—"}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    {row.rutContraparte} · {formatFechaVista(row.fechaDocto)}
                                </p>
                            </div>

                            <p className="shrink-0 text-right text-sm font-black text-slate-900">
                                {formatCLP(row.montoTotal)}
                            </p>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                            <EstadoRcvBadge estado={row.estadoRcv} />
                            <EstadoConciliacionBadge estado={row.estadoConciliacion} />
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => onConciliar(row)}
                                className="rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-2 text-xs font-bold text-emerald-700"
                            >
                                Conciliar
                            </button>

                            <button
                                type="button"
                                onClick={() => onObservar(row)}
                                className="rounded-xl border border-amber-200 bg-amber-50 px-2 py-2 text-xs font-bold text-amber-700"
                            >
                                Observar
                            </button>

                            <button
                                type="button"
                                onClick={() => onDesconciliar(row)}
                                className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-600"
                            >
                                Revertir
                            </button>
                        </div>
                    </div>
                ))}

                {!loading && rows.length === 0 && (
                    <div className="p-8 text-center text-sm text-slate-400">
                        No hay documentos para mostrar.
                    </div>
                )}

                {loading && (
                    <div className="p-8 text-center text-sm text-slate-400">
                        Cargando conciliación...
                    </div>
                )}
            </div>

            {/* Desktop */}
            <div className="hidden overflow-hidden md:block">
                <table className="w-full table-fixed text-left text-xs">
                    <thead className="border-y border-cyan-100 bg-cyan-50/70 text-[10px] uppercase tracking-wide text-slate-500">
                        <tr>
                            <th className="w-[6%] px-3 py-3">Tipo</th>
                            <th className="w-[20%] px-3 py-3">
                                {tipoRcv === "ventas" ? "Cliente" : "Proveedor"}
                            </th>
                            <th className="w-[11%] px-3 py-3">RUT</th>
                            <th className="w-[8%] px-3 py-3">Folio</th>
                            <th className="w-[9%] px-3 py-3">Fecha</th>
                            <th className="w-[13%] px-3 py-3">Estado RCV</th>
                            <th className="w-[13%] px-3 py-3">Conciliación</th>
                            <th className="w-[9%] px-3 py-3 text-right">Total</th>
                            <th className="w-[11%] px-3 py-3 text-center">Acciones</th>
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                        {rows.map((row) => (
                            <tr key={row.id} className="group hover:bg-cyan-50/70">
                                <td className="px-4 py-3">
                                    <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-700 group-hover:bg-white">
                                        {row.tipoDoc}
                                    </span>
                                </td>

                                <td
                                    className="truncate px-4 py-3 font-semibold text-slate-800"
                                    title={row.razonSocial}
                                >
                                    {row.razonSocial || "—"}
                                </td>

                                <td className="truncate px-4 py-3 text-slate-500">
                                    {row.rutContraparte}
                                </td>

                                <td className="truncate px-4 py-3 font-bold text-slate-700">
                                    {row.folio}
                                </td>

                                <td className="truncate px-4 py-3 text-slate-500">
                                    {formatFechaVista(row.fechaDocto)}
                                </td>

                                <td className="truncate px-4 py-3">
                                    <EstadoRcvBadge estado={row.estadoRcv} />
                                </td>

                                <td className="truncate px-4 py-3">
                                    <EstadoConciliacionBadge estado={row.estadoConciliacion} />
                                </td>

                                <td className="truncate px-4 py-3 text-right text-slate-600">
                                    {formatCLP(row.montoTotal)}
                                </td>

                                <td className="px-3 py-3 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => onConciliar(row)}
                                            title="Conciliar"
                                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
                                        >
                                            <CheckCircleOutlined />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => onObservar(row)}
                                            title="Observar"
                                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-700 transition hover:bg-amber-100"
                                        >
                                            <EyeOutlined />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => onDesconciliar(row)}
                                            title="Desconciliar"
                                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-100"
                                        >
                                            <CloseCircleOutlined />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {!loading && rows.length === 0 && (
                            <tr>
                                <td colSpan={9} className="px-3 py-12 text-center text-slate-400">
                                    No hay documentos para mostrar.
                                </td>
                            </tr>
                        )}

                        {loading && (
                            <tr>
                                <td colSpan={9} className="px-3 py-12 text-center text-slate-400">
                                    Cargando conciliación...
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RcvConciliacionTable;