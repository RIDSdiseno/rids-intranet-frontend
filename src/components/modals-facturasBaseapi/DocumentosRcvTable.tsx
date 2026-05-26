// src/components/modals-facturasBaseapi/DocumentosRcvTable.tsx
import React from "react";

import type { TabRCV } from "./types";
import { formatCLP, formatFechaVista, getValue } from "./utils";

import {
    EyeOutlined,
    SearchOutlined,
    FileTextOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloseCircleOutlined,
} from "@ant-design/icons";

type Props = {
    documentosFiltrados: any[];
    documentosLength: number;
    loading: boolean;
    activeTab: TabRCV;
    busqueda: string;
    onBusquedaChange: (value: string) => void;
    onSelectDocumento: (doc: any) => void;
    renderRowActions?: (doc: any) => React.ReactNode;
    // mode: 'rcv' -> mostrar estado tal cual viene del RCV (incluye 'Acusado')
    // mode: 'cobranza' -> mostrar estados normalizados: Pendiente/Vencida/Confirmada
    mode?: "rcv" | "cobranza";
};

function getEstadoRcv(doc: any, mode: "rcv" | "cobranza" = "rcv") {
    // mode === 'rcv' -> mostrar estado reportado por RCV primero
    // mode === 'cobranza' -> priorizar estadoPago (Pendiente/Vencida/Confirmada)
    const estadoRaw = String(
        getValue(doc, ["Estado", "estado", "Estado Documento", "estadoDocumento"], "")
    ).trim();

    const estadoPago = getValue(doc, ["estadoPago", "EstadoPago", "estado_pago"], null);

    if (mode === "rcv") {
        if (estadoRaw) return estadoRaw;
        if (estadoPago) return String(estadoPago);
    } else {
        if (estadoPago) return String(estadoPago);
        if (estadoRaw) return estadoRaw;
    }

    // Si aún no hay estado, derivar desde fecha de vencimiento si está disponible
    const fechaVenc = getValue(doc, ["FchVenc", "FchVencimiento", "fechaVencimiento", "vencimiento", "fecha_vencimiento", "Vencimiento"], null);
    if (fechaVenc) {
        try {
            const s = String(fechaVenc).trim();
            const d = s ? new Date(s.indexOf('T') === -1 && /\d{4}-\d{2}-\d{2}/.test(s) ? s + 'T00:00:00' : s) : null;
            if (d && !isNaN(d.getTime())) {
                const today = new Date();
                today.setHours(0,0,0,0);
                if (d < today) return 'VENCIDA';
                return 'PENDIENTE';
            }
        } catch (e) { /* ignore */ }
    }

    return 'REGISTRADO';
}

function getEstadoStyles(estado: string) {
    const normalizado = estado.toUpperCase();

    if (normalizado.includes("PENDIENTE")) {
        return {
            className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
            icon: <ClockCircleOutlined />,
        };
    }

    // Vencidas deben mostrarse en rojo
    if (normalizado.includes("VENC")) {
        return {
            className: "bg-red-50 text-red-700 ring-1 ring-red-200",
            icon: <CloseCircleOutlined />,
        };
    }

    if (normalizado.includes("RECLAMADO")) {
        return {
            className: "bg-red-50 text-red-700 ring-1 ring-red-200",
            icon: <CloseCircleOutlined />,
        };
    }

    // Tratar estados de confirmación/pago como confirmados (evitar mostrar "Acusado")
    if (normalizado.includes("CONFIRM") || normalizado.includes("PAG") || normalizado.includes("CONFIRMADA") || normalizado.includes("PAGADA") || normalizado.includes("PAGADO")) {
        return {
            className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
            icon: <CheckCircleOutlined />,
        };
    }

    return {
        className: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200",
        icon: <FileTextOutlined />,
    };
}

function EstadoBadge({ estado }: { estado: string }) {
    const styles = getEstadoStyles(estado);

    function normalizeEstadoLabel(s: string) {
        if (!s) return "Pendiente";
        const up = String(s).toUpperCase();
        if (up.includes("PENDIENTE")) return "Pendiente";
        if (up.includes("VENC")) return "Vencida";
        if (up.includes("RECLAMADO")) return "Reclamado";
        if (up.includes("ACUSADO")) return "Confirmado";
        if (up.includes("CONFIRM") || up.includes("PAG") || up.includes("CONFIRMADA") || up.includes("PAGADA") || up.includes("PAGADO")) return "Confirmado";
        // Fallback: capitalizar la primera letra
        const raw = String(s).trim();
        return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    }

    const label = normalizeEstadoLabel(estado);

    return (
        <span
            className={`inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${styles.className}`}
            title={estado}
        >
            {styles.icon}
            <span className="truncate">{label}</span>
        </span>
    );
}

const DocumentosRcvTable: React.FC<Props> = ({
    documentosFiltrados,
    documentosLength,
    loading,
    activeTab,
    busqueda,
    onBusquedaChange,
    onSelectDocumento,
    renderRowActions,
    mode = "rcv",
}) => {
    return (
        <div className="overflow-hidden rounded-3xl border border-cyan-200 bg-white shadow-sm">
            <div className="border-b border-cyan-100 bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
                                <FileTextOutlined />
                            </div>

                            <div>
                                <h2 className="text-base font-black text-slate-900 sm:text-lg">
                                    Documentos RCV
                                </h2>

                                <p className="text-xs text-slate-500 sm:text-sm">
                                    Mostrando {documentosFiltrados.length} de {documentosLength} documentos.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="relative w-full lg:w-96">
                        <SearchOutlined className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                        <input
                            value={busqueda}
                            onChange={(e) => onBusquedaChange(e.target.value)}
                            placeholder="Buscar folio, RUT o razón social..."
                            className="h-11 w-full rounded-2xl border border-cyan-200 bg-cyan-50/30 pl-9 pr-3 text-sm outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
                        />
                    </div>
                </div>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-slate-100 md:hidden">
                {documentosFiltrados.map((doc, index) => {
                    const nombre = getValue(doc, [
                        "Razon Social",
                        "Razón Social",
                        "Razon Social Receptor",
                        "Razón Social Receptor",
                        "Razon Social Proveedor",
                        "Razón Social Proveedor",
                        "razonSocial",
                        "razonSocialProveedor",
                        "razonSocialReceptor",
                    ]);

                    const rut = getValue(doc, [
                        "Rut cliente",
                        "RUT Cliente",
                        "RUT Receptor",
                        "Rut Receptor",
                        "RUT Proveedor",
                        "Rut Proveedor",
                        "rutCliente",
                        "rutProveedor",
                        "rutReceptor",
                    ]);

                    const folio = getValue(doc, ["Folio", "folio"]);
                    const tipoDoc = getValue(doc, ["Tipo Doc", "tipoDoc", "tipoDTE"]);
                    const fecha = formatFechaVista(
                        getValue(doc, [
                            "Fecha Docto",
                            "Fecha Recepcion",
                            "fechaDocto",
                            "fechaEmision",
                            "fechaRecepcion",
                        ])
                    );

                    return (
                        <button
                            key={`${folio}-${index}`}
                            type="button"
                            onClick={() => onSelectDocumento(doc)}
                            className="block w-full p-4 text-left transition hover:bg-cyan-50"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                                            DTE {tipoDoc}
                                        </span>

                                        <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] font-bold text-cyan-700 ring-1 ring-cyan-100">
                                            Folio {folio}
                                        </span>

                                        <EstadoBadge estado={getEstadoRcv(doc, mode)} />
                                    </div>

                                    <p className="mt-2 truncate text-sm font-bold text-slate-900">
                                        {nombre}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                        {rut} · {fecha}
                                    </p>
                                </div>

                                <div className="shrink-0 text-right">
                                    <p className="text-[10px] font-bold uppercase text-slate-400">
                                        Total
                                    </p>

                                    <p className="text-[10px] font-bold uppercase text-slate-400">
                                        {formatCLP(getValue(doc, ["Monto total", "Monto Total", "montoTotal"], 0))}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-3 grid grid-cols-3 gap-2">
                                <div className="rounded-xl bg-slate-50 p-2">
                                    <p className="text-[10px] font-bold uppercase text-slate-400">
                                        Neto
                                    </p>
                                    <p className="truncate text-xs font-bold text-slate-700">
                                        {formatCLP(getValue(doc, ["Monto Neto", "montoNeto"], 0))}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-indigo-50 p-2">
                                    <p className="text-[10px] font-bold uppercase text-indigo-500">
                                        IVA
                                    </p>
                                    <p className="truncate text-xs font-bold text-slate-700">
                                        {formatCLP(getValue(doc, [
                                            "Monto IVA",
                                            "Monto Iva",
                                            "Monto IVA Recuperable",
                                            "montoIva",
                                            "montoIVA",
                                        ], 0))}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-slate-900 p-2">
                                    <p className="text-[10px] font-bold uppercase text-slate-300">
                                        Acción
                                    </p>

                                    <p className="flex items-center gap-1 text-xs font-bold text-white">
                                        <EyeOutlined />
                                        Ver detalle
                                    </p>
                                    {renderRowActions && (
                                        <div className="mt-2">
                                            {renderRowActions(doc)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}

                {!loading && documentosFiltrados.length === 0 && (
                    <div className="p-8 text-center text-sm text-slate-400">
                        No hay documentos para mostrar.
                    </div>
                )}

                {loading && (
                    <div className="p-8 text-center text-sm text-slate-400">
                        Cargando documentos...
                    </div>
                )}
            </div>

            {/* Desktop table */}
            {/* Desktop table */}
            <div className="hidden overflow-hidden md:block">
                <table className="w-full table-fixed text-left text-xs">
                    <thead className="border-y border-cyan-100 bg-cyan-50/70 text-[10px] uppercase tracking-wide text-slate-500">
                        <tr>
                            <th className="w-[7%] px-4 py-3">Tipo</th>
                            <th className="w-[24%] px-4 py-3">
                                {activeTab === "ventas" ? "Cliente" : "Proveedor"}
                            </th>
                            <th className="w-[12%] px-4 py-3">RUT</th>
                            <th className="w-[9%] px-4 py-3">Folio</th>
                            <th className="w-[10%] px-4 py-3">Fecha</th>
                            <th className="w-[14%] px-4 py-3">Estado</th>
                            <th className="w-[8%] px-4 py-3 text-right">Neto</th>
                            <th className="w-[8%] px-4 py-3 text-right">IVA</th>
                            <th className="w-[8%] px-4 py-3 text-right">Total</th>
                            {renderRowActions && <th className="w-[10%] px-4 py-3 text-center">Acciones</th>}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                        {documentosFiltrados.map((doc, index) => {
                            const nombre = getValue(doc, [
                                "Razon Social",
                                "Razón Social",
                                "Razon Social Receptor",
                                "Razón Social Receptor",
                                "Razon Social Proveedor",
                                "Razón Social Proveedor",
                                "razonSocial",
                                "razonSocialProveedor",
                                "razonSocialReceptor",
                            ]);

                            const rut = getValue(doc, [
                                "Rut cliente",
                                "RUT Cliente",
                                "RUT Receptor",
                                "Rut Receptor",
                                "RUT Proveedor",
                                "Rut Proveedor",
                                "rutCliente",
                                "rutProveedor",
                                "rutReceptor",
                            ]);

                            const folio = getValue(doc, ["Folio", "folio"]);
                            const tipoDoc = getValue(doc, ["Tipo Doc", "tipoDoc", "tipoDTE"]);
                            const estado = getEstadoRcv(doc, mode);

                            return (
                                <tr
                                    key={`${folio}-${index}`}
                                    onClick={() => onSelectDocumento(doc)}
                                    className="group cursor-pointer transition hover:bg-cyan-50/70"
                                >
                                    <td className="px-4 py-3">
                                        <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-700 group-hover:bg-white">
                                            {tipoDoc}
                                        </span>
                                    </td>

                                    <td
                                        className="truncate px-4 py-3 font-semibold text-slate-800"
                                        title={String(nombre)}
                                    >
                                        {nombre}
                                    </td>

                                    <td className="truncate px-4 py-3 text-slate-500">
                                        {rut}
                                    </td>

                                    <td className="truncate px-4 py-3 font-bold text-slate-700">
                                        {folio}
                                    </td>

                                    <td className="truncate px-4 py-3 text-slate-500">
                                        {formatFechaVista(
                                            getValue(doc, [
                                                "Fecha Docto",
                                                "Fecha Recepcion",
                                                "fechaDocto",
                                                "fechaEmision",
                                                "fechaRecepcion",
                                            ])
                                        )}
                                    </td>

                                    <td className="truncate px-4 py-3">
                                        <EstadoBadge estado={estado} />
                                    </td>

                                    <td className="truncate px-4 py-3 text-right text-slate-600">
                                        {formatCLP(getValue(doc, ["Monto Neto", "montoNeto"], 0))}
                                    </td>

                                    <td className="truncate px-4 py-3 text-right text-slate-600">
                                        {formatCLP(
                                            getValue(
                                                doc,
                                                [
                                                    "Monto IVA",
                                                    "Monto Iva",
                                                    "Monto IVA Recuperable",
                                                    "montoIva",
                                                    "montoIVA",
                                                ],
                                                0
                                            )
                                        )}
                                    </td>

                                    <td className="truncate px-4 py-3 text-right font-bold text-slate-700">
                                        {formatCLP(
                                            getValue(doc, ["Monto total", "Monto Total", "montoTotal"], 0)
                                        )}
                                    </td>
                                    {renderRowActions && (
                                        <td className="px-4 py-3 text-center">{renderRowActions(doc)}</td>
                                    )}
                                </tr>
                            );
                        })}

                        {!loading && documentosFiltrados.length === 0 && (
                            <tr>
                                <td colSpan={9} className="px-3 py-12 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                        <FileTextOutlined className="text-3xl" />
                                        <p className="mt-2 text-sm font-semibold">
                                            No hay documentos para mostrar.
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {loading && (
                            <tr>
                                <td colSpan={9} className="px-3 py-12 text-center text-slate-400">
                                    Cargando documentos...
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DocumentosRcvTable;