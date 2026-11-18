// src/components/modals-facturasBaseapi/finanzas/FinanzasCxcPanel.tsx
// Cuentas por cobrar al estilo Duemint (Fase 1b). Fuente: GET /baseapi/finanzas/cxc/resumen

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AlertCircle, CalendarClock, CheckCircle2, Clock3, RefreshCw, Search, TriangleAlert, Wallet } from "lucide-react";

import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { api } from "../../../api/api";

import FinanzasKpiCard from "./FinanzasKpiCard";

import type { DocumentoCxc, FiltroCxc, ResumenCxc, ResumenCxcResponse, TramoAntiguedad } from "./cxc.types";

/* =========================================================
   HELPERS
========================================================= */

const MESES_CORTOS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatCLP(value: number) {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value);
}

function formatMillones(value: number) {
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toLocaleString("es-CL", { maximumFractionDigits: 1 })}M`;
    if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}K`;
    return String(value);
}

/** YYYY-MM-DD → DD-MM-YYYY sin pasar por Date (evita el desfase horario). */
function formatFecha(value: string | null | undefined) {
    const m = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : "—";
}

/** YYYY-MM → "nov 26" */
function etiquetaPeriodo(periodo: string) {
    if (periodo === "VENCIDO") return "Vencido";
    if (periodo === "SIN_FECHA") return "Sin fecha";
    const [ano, mes] = periodo.split("-");
    return `${MESES_CORTOS[Number(mes) - 1] ?? mes} ${String(ano).slice(2)}`;
}

function formatHora(iso: string) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

const ETIQUETA_FILTRO: Record<FiltroCxc, string> = {
    ABIERTOS: "Todos los documentos por cobrar",
    POR_VENCER: "Por vencer",
    VENCIDO: "Vencidos",
    SIN_VENCIMIENTO: "Sin fecha de vencimiento",
    PAGOS_MES: "Pagos del mes",
    AL_DIA: "Dentro de plazo",
    "1_30": "Vencidos 1–30 días",
    "31_60": "Vencidos 31–60 días",
    "61_90": "Vencidos 61–90 días",
    MAS_90: "Vencidos más de 90 días",
};

const COLOR_TRAMO: Record<TramoAntiguedad, string> = {
    AL_DIA: "bg-emerald-500",
    "1_30": "bg-amber-400",
    "31_60": "bg-orange-500",
    "61_90": "bg-red-500",
    MAS_90: "bg-red-700",
};

function cumpleFiltro(doc: DocumentoCxc, filtro: FiltroCxc) {
    switch (filtro) {
        case "ABIERTOS":
            return doc.estado === "PENDIENTE" || doc.estado === "VENCIDO";
        case "POR_VENCER":
            return doc.estado === "PENDIENTE" && Boolean(doc.fechaVencimiento);
        case "VENCIDO":
            return doc.estado === "VENCIDO";
        case "SIN_VENCIMIENTO":
            return doc.estado === "PENDIENTE" && !doc.fechaVencimiento;
        case "PAGOS_MES":
            return doc.estado === "PAGADO";
        default:
            return doc.tramo === filtro;
    }
}

/* =========================================================
   COMPONENTE
========================================================= */

type Props = {
    empresa: "rids" | "econnet";
    /** Cambia cuando el usuario presiona «Actualizar» en la página: fuerza recálculo. */
    refreshToken: number;
};

const FinanzasCxcPanel: React.FC<Props> = ({ empresa, refreshToken }) => {
    const [data, setData] = useState<ResumenCxc | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [filtro, setFiltro] = useState<FiltroCxc>("ABIERTOS");
    const [vistaGrafico, setVistaGrafico] = useState<"emision" | "proyeccion">("emision");
    const [busqueda, setBusqueda] = useState("");
    const tablaRef = useRef<HTMLDivElement | null>(null);
    const primerToken = useRef(refreshToken);

    const cargar = useCallback(
        async (refrescar: boolean) => {
            setLoading(true);
            setError("");
            try {
                const response = await api.get<ResumenCxcResponse>("/baseapi/finanzas/cxc/resumen", {
                    params: { empresa, ...(refrescar ? { refrescar: 1 } : {}) },
                });
                setData(response.data.data);
            } catch (err: any) {
                const message = err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message ?? "No se pudo cargar las cuentas por cobrar.";
                setError(String(message));
            } finally {
                setLoading(false);
            }
        },
        [empresa],
    );

    // Cambio de empresa: carga (usa la caché del backend si está vigente).
    useEffect(() => {
        setData(null);
        setFiltro("ABIERTOS");
        setBusqueda("");
        void cargar(false);
    }, [cargar]);

    // «Actualizar» de la página: recalcula.
    useEffect(() => {
        if (refreshToken === primerToken.current) return;
        void cargar(true);
    }, [refreshToken, cargar]);

    const seleccionar = (nuevo: FiltroCxc) => {
        setFiltro((actual) => (actual === nuevo ? "ABIERTOS" : nuevo));
        tablaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const documentosFiltrados = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();
        return (data?.documentos ?? [])
            .filter((doc) => cumpleFiltro(doc, filtro))
            .filter(
                (doc) =>
                    !texto ||
                    `${doc.tipoDoc}-${doc.folio}`.includes(texto) ||
                    doc.folio.includes(texto) ||
                    (doc.razonSocial ?? "").toLowerCase().includes(texto) ||
                    doc.rutContraparte.toLowerCase().includes(texto.replace(/[^0-9k]/g, "") || "~"),
            )
            .sort((a, b) => {
                if (filtro === "PAGOS_MES") return String(b.pagadoAt).localeCompare(String(a.pagadoAt));
                return (b.diasDiferencia ?? -99999) - (a.diasDiferencia ?? -99999);
            });
    }, [data, filtro, busqueda]);

    const totalFiltrado = documentosFiltrados.reduce((suma, doc) => suma + doc.saldo, 0);
    const maxTramo = Math.max(1, ...(data?.antiguedad ?? []).map((t) => t.monto));
    const totalAbierto = data?.tarjetas.total.monto ?? 0;

    const datosEmision = (data?.porMesEmision ?? []).map((m) => ({ ...m, etiqueta: etiquetaPeriodo(m.periodo) }));
    const datosProyeccion = (data?.proyeccion ?? []).map((p) => ({ ...p, etiqueta: etiquetaPeriodo(p.periodo) }));

    return (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            {/* CABECERA */}
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
                        <Wallet size={18} />
                    </div>
                    <div>
                        <h2 className="text-base font-black text-slate-900">Cuentas por cobrar</h2>
                        <p className="text-xs text-slate-500">
                            Cartera abierta al {formatFecha(data?.hoy)} · todos los periodos, con notas de crédito aplicadas.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    {data && (
                        <span>
                            Calculado {formatHora(data.generadoAt)}
                            {data.desdeCache ? " (caché)" : ""}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={() => void cargar(true)}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        {loading ? "Calculando..." : "Recalcular"}
                    </button>
                </div>
            </div>

            <div className="space-y-4 p-4 sm:p-5">
                {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

                {!data && loading && <div className="flex h-40 items-center justify-center text-sm text-slate-400">Calculando cuentas por cobrar...</div>}

                {data && (
                    <>
                        {/* TARJETAS */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <FinanzasKpiCard
                                label="Pagos del mes"
                                value={formatCLP(data.tarjetas.pagosMes.monto)}
                                helper={`${data.tarjetas.pagosMes.documentos} documentos pagados`}
                                icon={<CheckCircle2 size={20} />}
                                tone="emerald"
                                onClick={() => seleccionar("PAGOS_MES")}
                            />
                            <FinanzasKpiCard
                                label="Por vencer"
                                value={formatCLP(data.tarjetas.porVencer.monto)}
                                helper={`${data.tarjetas.porVencer.documentos} documentos`}
                                icon={<Clock3 size={20} />}
                                tone="amber"
                                onClick={() => seleccionar("POR_VENCER")}
                            />
                            <FinanzasKpiCard
                                label="Vencido"
                                value={formatCLP(data.tarjetas.vencido.monto)}
                                helper={`${data.tarjetas.vencido.documentos} documentos`}
                                icon={<TriangleAlert size={20} />}
                                tone="red"
                                onClick={() => seleccionar("VENCIDO")}
                            />
                            <FinanzasKpiCard
                                label="Total por cobrar"
                                value={formatCLP(data.tarjetas.total.monto)}
                                helper={`${data.tarjetas.total.documentos} documentos abiertos`}
                                icon={<Wallet size={20} />}
                                tone="cyan"
                                onClick={() => seleccionar("ABIERTOS")}
                            />
                        </div>

                        {data.tarjetas.sinVencimiento.documentos > 0 && (
                            <button
                                type="button"
                                onClick={() => seleccionar("SIN_VENCIMIENTO")}
                                className="flex w-full items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-left text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
                            >
                                <AlertCircle size={16} className="shrink-0" />
                                {data.tarjetas.sinVencimiento.documentos} documento(s) por {formatCLP(data.tarjetas.sinVencimiento.monto)} sin fecha de
                                vencimiento: no entran en «Por vencer» ni en la antigüedad. Revisa los días de crédito del cliente en Receptores de cobranza.
                            </button>
                        )}

                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                            {/* ANTIGÜEDAD */}
                            <div className="rounded-2xl border border-slate-200 p-4">
                                <h3 className="text-sm font-black text-slate-900">Antigüedad de la deuda</h3>
                                <p className="mb-3 text-xs text-slate-500">Haz clic en un tramo para ver sus documentos.</p>
                                <div className="space-y-1.5">
                                    {data.antiguedad.map((tramo) => (
                                        <button
                                            key={tramo.tramo}
                                            type="button"
                                            onClick={() => seleccionar(tramo.tramo)}
                                            className={`w-full rounded-xl px-3 py-2 text-left transition hover:bg-slate-50 ${filtro === tramo.tramo ? "bg-cyan-50 ring-1 ring-cyan-200" : ""
                                                }`}
                                        >
                                            <div className="flex items-center justify-between gap-3 text-xs">
                                                <span className="font-bold text-slate-700">{tramo.etiqueta}</span>
                                                <span className="text-slate-500">
                                                    {tramo.documentos} doc. ·{" "}
                                                    <strong className="text-slate-900">{formatCLP(tramo.monto)}</strong>
                                                    <span className="ml-1 text-slate-400">
                                                        {totalAbierto > 0 ? `${Math.round((tramo.monto / totalAbierto) * 100)}%` : ""}
                                                    </span>
                                                </span>
                                            </div>
                                            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                                                <div
                                                    className={`h-full rounded-full ${COLOR_TRAMO[tramo.tramo]}`}
                                                    style={{ width: `${(tramo.monto / maxTramo) * 100}%` }}
                                                />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* GRÁFICO */}
                            <div className="rounded-2xl border border-slate-200 p-4">
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                    <div>
                                        <h3 className="text-sm font-black text-slate-900">
                                            {vistaGrafico === "emision" ? "Documentos por mes de emisión" : "Proyección de cobro"}
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            {vistaGrafico === "emision"
                                                ? "Últimos 12 meses: saldo pagado, por vencer y vencido."
                                                : "Saldo abierto según mes de vencimiento."}
                                        </p>
                                    </div>
                                    <div className="flex rounded-xl bg-slate-100 p-1">
                                        {(
                                            [
                                                { id: "emision", label: "Documentos" },
                                                { id: "proyeccion", label: "Proyección" },
                                            ] as const
                                        ).map((tab) => (
                                            <button
                                                key={tab.id}
                                                type="button"
                                                onClick={() => setVistaGrafico(tab.id)}
                                                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${vistaGrafico === tab.id ? "bg-white text-cyan-700 shadow-sm" : "text-slate-500"
                                                    }`}
                                            >
                                                {tab.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        {vistaGrafico === "emision" ? (
                                            <BarChart data={datosEmision} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} />
                                                <YAxis tickFormatter={formatMillones} tick={{ fontSize: 11 }} width={48} />
                                                <Tooltip formatter={(value) => formatCLP(Number(value))} />
                                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                                <Bar dataKey="pagado" name="Pagado" stackId="m" fill="#10b981" />
                                                <Bar dataKey="porVencer" name="Por vencer" stackId="m" fill="#f59e0b" />
                                                <Bar dataKey="vencido" name="Vencido" stackId="m" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        ) : (
                                            <BarChart data={datosProyeccion} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis dataKey="etiqueta" tick={{ fontSize: 11 }} />
                                                <YAxis tickFormatter={formatMillones} tick={{ fontSize: 11 }} width={48} />
                                                <Tooltip
                                                    formatter={(value) => formatCLP(Number(value))}
                                                    labelFormatter={(label) => String(label)}
                                                />
                                                <Bar dataKey="monto" name="Saldo" radius={[4, 4, 0, 0]}>
                                                    {datosProyeccion.map((p) => (
                                                        <Cell
                                                            key={p.periodo}
                                                            fill={p.periodo === "VENCIDO" ? "#ef4444" : p.periodo === "SIN_FECHA" ? "#94a3b8" : "#0891b2"}
                                                        />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        )}
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* DOCUMENTOS */}
                        <div ref={tablaRef} className="rounded-2xl border border-slate-200">
                            <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h3 className="text-sm font-black text-slate-900">{ETIQUETA_FILTRO[filtro]}</h3>
                                    <p className="text-xs text-slate-500">
                                        {documentosFiltrados.length} documentos · {formatCLP(totalFiltrado)}
                                        {filtro !== "ABIERTOS" && (
                                            <button
                                                type="button"
                                                onClick={() => setFiltro("ABIERTOS")}
                                                className="ml-2 font-bold text-cyan-700 hover:underline"
                                            >
                                                Ver todos
                                            </button>
                                        )}
                                    </p>
                                </div>
                                <div className="relative w-full sm:w-72">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        value={busqueda}
                                        onChange={(e) => setBusqueda(e.target.value)}
                                        placeholder="Buscar cliente, RUT o folio"
                                        className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-xs outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                                    />
                                </div>
                            </div>

                            <div className="max-h-[520px] overflow-auto">
                                <table className="w-full min-w-[860px] text-xs">
                                    <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Documento</th>
                                            <th className="px-3 py-2 text-left">Cliente</th>
                                            <th className="px-3 py-2 text-left">Emisión</th>
                                            <th className="px-3 py-2 text-left">{filtro === "PAGOS_MES" ? "Pagado" : "Vencimiento"}</th>
                                            <th className="px-3 py-2 text-right">Días</th>
                                            <th className="px-3 py-2 text-right">Saldo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {documentosFiltrados.map((doc) => (
                                            <tr key={doc.key} className="hover:bg-slate-50">
                                                <td className="px-3 py-2 font-bold text-slate-800">
                                                    {doc.tipoDoc}-{doc.folio}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="font-semibold text-slate-800">{doc.razonSocial ?? "—"}</div>
                                                    <div className="text-[10px] text-slate-400">{doc.rutContraparte}</div>
                                                </td>
                                                <td className="px-3 py-2 text-slate-600">{formatFecha(doc.fechaEmision)}</td>
                                                <td className="px-3 py-2 text-slate-600">
                                                    {doc.estado === "PAGADO" ? (
                                                        <>
                                                            {formatFecha(doc.pagadoAt)}
                                                            {doc.formaPago && <span className="ml-1 text-[10px] text-slate-400">{doc.formaPago}</span>}
                                                        </>
                                                    ) : doc.fechaVencimiento ? (
                                                        formatFecha(doc.fechaVencimiento)
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-amber-700">
                                                            <CalendarClock size={12} /> Sin fecha
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    {doc.diasDiferencia === null ? (
                                                        "—"
                                                    ) : doc.diasDiferencia > 0 ? (
                                                        <span className="rounded-full bg-red-50 px-2 py-0.5 font-bold text-red-700">{doc.diasDiferencia} vencido</span>
                                                    ) : (
                                                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                                                            {doc.diasDiferencia === 0 ? "vence hoy" : `en ${-doc.diasDiferencia}`}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <div className="font-bold text-slate-900">{formatCLP(doc.saldo)}</div>
                                                    {doc.montoNotasCredito > 0 && (
                                                        <div className="text-[10px] text-slate-400" title={doc.notasCredito.join(", ")}>
                                                            NC {formatCLP(doc.montoNotasCredito)}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                        {documentosFiltrados.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-3 py-8 text-center text-slate-400">
                                                    No hay documentos para este filtro.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <p className="text-[11px] text-slate-400">
                            {data.diagnostico.periodosLeidos} meses de RCV ({data.diagnostico.primerPeriodo ?? "—"} a {data.diagnostico.ultimoPeriodo ?? "—"})
                            {data.diagnostico.plazoEmpresa > 0 &&
                                ` · ${data.diagnostico.plazoEmpresa} con plazo por defecto (${data.empresaKey === "econnet" ? "día 1 del mes siguiente" : "30 días"})`}
                            {data.diagnostico.ncInferidas > 0 && ` · ${data.diagnostico.ncInferidas} NC aplicadas por RUT y monto`}
                            {data.diagnostico.ncSinAplicar > 0 && ` · ${data.diagnostico.ncSinAplicar} NC sin factura asociada`}
                            {data.hoy.slice(0, 7) !== data.diagnostico.ultimoPeriodo && " · ⚠ el RCV del mes actual aún no está en caché"}
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default FinanzasCxcPanel;