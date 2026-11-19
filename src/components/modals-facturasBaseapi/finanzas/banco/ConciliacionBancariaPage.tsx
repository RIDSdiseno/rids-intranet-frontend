// src/components/modals-facturasBaseapi/finanzas/banco/ConciliacionBancariaPage.tsx
// Fase 4b: «Conciliación bancaria» (equivalente a Duematch) con los pagos recibidos de Itaú.
// Se usa como pestaña de Facturas (embebido, con la empresa de la pantalla) o como página sola.
// Pendientes con su propuesta (perfecto, combinado, ya pagada, sugerido, sin match) → confirmar, editar o descartar.
// Fuente: /baseapi/finanzas/banco/*

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { ConfigProvider, Dropdown, Pagination, Tooltip } from "antd";
import esES from "antd/locale/es_ES";
import { AlertTriangle, Check, CheckCheck, FileSpreadsheet, Info, Landmark, Link2, Pencil, RefreshCw, RotateCcw, Search, Undo2, X, XCircle } from "lucide-react";

import { api } from "../../../../api/api";

import type { EmpresaCxc } from "../cxc.types";
import AsignarMovimientoModal from "./AsignarMovimientoModal";
import CargarCartolaModal from "./CargarCartolaModal";
import {
    MOTIVOS_DESCARTE,
    PREFIJO_POSIBLE_DUPLICADO,
    type EstadoMovimiento,
    type MovimientoBanco,
    type MovimientosResponse,
    type TipoPropuesta,
} from "./banco.types";

/* =========================================================
   HELPERS
========================================================= */

function formatCLP(value: number) {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value);
}

function formatFecha(value: string | null | undefined) {
    const m = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : "—";
}

function formatRut(rut: string | null) {
    const limpio = String(rut ?? "").replace(/[^0-9kK]/g, "").toUpperCase();
    if (limpio.length < 2) return limpio || "Sin RUT";
    return `${limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${limpio.slice(-1)}`;
}

function mensajeError(err: any, porDefecto: string) {
    return String(err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message ?? porDefecto);
}

const PROPUESTA: Record<TipoPropuesta, { label: string; clase: string; ayuda: string }> = {
    PERFECTO: { label: "Match perfecto", clase: "bg-emerald-50 text-emerald-700 ring-emerald-200", ayuda: "Folio en la referencia y monto exacto, o RUT y monto exacto con una sola factura posible." },
    COMBINADO: { label: "Combinado", clase: "bg-cyan-50 text-cyan-700 ring-cyan-200", ayuda: "Varias facturas del mismo cliente suman exacto el monto." },
    YA_PAGADA: { label: "Ya pagada", clase: "bg-violet-50 text-violet-700 ring-violet-200", ayuda: "La factura ya figura pagada en el CRM (Duemint o a mano): solo se vincula, no se crea otro pago." },
    SUGERIDO: { label: "Sugerido", clase: "bg-amber-50 text-amber-700 ring-amber-200", ayuda: "No calza exacto: abono parcial o reparto entre las facturas más antiguas del cliente. Revísalo." },
    SIN_MATCH: { label: "Sin match", clase: "bg-slate-100 text-slate-500 ring-slate-200", ayuda: "No hay facturas que calcen. Asígnalo a mano o descártalo." },
};

function esPosibleDuplicado(m: { observacion: string | null }) {
    return (m.observacion ?? "").startsWith(PREFIJO_POSIBLE_DUPLICADO);
}

const MOTIVO_LABEL = Object.fromEntries(MOTIVOS_DESCARTE.map((m) => [m.id, m.label])) as Record<string, string>;

/* =========================================================
   COMPONENTE
========================================================= */

type Props = {
    /** Dentro de la pantalla Facturas: sin cabecera propia y con la empresa de esa pantalla. */
    embebido?: boolean;
    empresa?: EmpresaCxc;
    onEmpresaChange?: (empresa: EmpresaCxc) => void;
};

const ConciliacionBancariaPage: React.FC<Props> = ({ embebido = false, empresa: empresaProp, onEmpresaChange }) => {
    const [empresaLocal, setEmpresaLocal] = useState<EmpresaCxc>(empresaProp ?? "rids");
    const empresa = empresaProp ?? empresaLocal;
    const setEmpresa = onEmpresaChange ?? setEmpresaLocal;
    const [movimientos, setMovimientos] = useState<MovimientoBanco[]>([]);
    const [resumen, setResumen] = useState<Record<string, number>>({});
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");
    const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

    const [tab, setTab] = useState<EstadoMovimiento>("PENDIENTE");
    const [filtroTipo, setFiltroTipo] = useState<TipoPropuesta | "">("");
    const [busqueda, setBusqueda] = useState("");
    const [pagina, setPagina] = useState(1);
    const [tamanoPagina, setTamanoPagina] = useState(50);

    const [cargar, setCargar] = useState(false);
    const [editar, setEditar] = useState<MovimientoBanco | null>(null);
    const [ocupado, setOcupado] = useState<number | "perfectos" | null>(null);

    const cargarMovimientos = useCallback(
        async (refrescar = false) => {
            setCargando(true);
            setError("");
            try {
                const response = await api.get<MovimientosResponse>("/baseapi/finanzas/banco/movimientos", {
                    params: { empresa, ...(refrescar ? { refrescar: 1 } : {}) },
                });
                setMovimientos(response.data.data.movimientos);
                setResumen(response.data.data.resumen);
            } catch (err: any) {
                setError(mensajeError(err, "No se pudieron cargar los movimientos."));
            } finally {
                setCargando(false);
            }
        },
        [empresa],
    );

    useEffect(() => {
        void cargarMovimientos();
    }, [cargarMovimientos]);

    useEffect(() => setPagina(1), [tab, filtroTipo, busqueda, empresa]);

    /* ---------- Filtros ---------- */

    const filas = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();
        const digitos = texto.replace(/[^0-9k]/g, "");
        return movimientos
            .filter((m) => m.estado === tab)
            .filter((m) => tab !== "PENDIENTE" || !filtroTipo || m.propuesta?.tipo === filtroTipo)
            .filter(
                (m) =>
                    !texto ||
                    (m.nombrePagador ?? "").toLowerCase().includes(texto) ||
                    (m.referencia ?? "").toLowerCase().includes(texto) ||
                    (digitos.length >= 3 && (m.rutPagador ?? "").toLowerCase().includes(digitos)) ||
                    m.asignaciones.some((a) => a.folio === texto || (a.razonSocial ?? "").toLowerCase().includes(texto)) ||
                    (m.propuesta?.asignaciones ?? []).some((a) => a.folio === texto || (a.razonSocial ?? "").toLowerCase().includes(texto)),
            );
    }, [movimientos, tab, filtroTipo, busqueda]);

    // Los posibles duplicados nunca se confirman en lote: se revisan uno a uno.
    const perfectos = movimientos.filter(
        (m) => m.estado === "PENDIENTE" && !esPosibleDuplicado(m) && (m.propuesta?.tipo === "PERFECTO" || m.propuesta?.tipo === "YA_PAGADA"),
    );
    const totalTab = filas.reduce((s, m) => s + m.monto, 0);

    /* ---------- Acciones ---------- */

    const ejecutar = async (id: number | "perfectos", accion: () => Promise<string>) => {
        setOcupado(id);
        setAviso(null);
        try {
            setAviso({ tipo: "ok", texto: await accion() });
            await cargarMovimientos();
        } catch (err: any) {
            setAviso({ tipo: "error", texto: mensajeError(err, "No se pudo completar la acción.") });
        } finally {
            setOcupado(null);
        }
    };

    const confirmarPropuesta = (m: MovimientoBanco) =>
        ejecutar(m.id, async () => {
            await api.post(`/baseapi/finanzas/banco/movimientos/${m.id}/confirmar`, {
                empresa,
                asignaciones: (m.propuesta?.asignaciones ?? []).map((a) => ({ tipoDoc: a.tipoDoc, folio: a.folio, rutContraparte: a.rutContraparte, monto: a.monto })),
            });
            return `Conciliado: ${m.nombrePagador ?? formatRut(m.rutPagador)} ${formatCLP(m.monto)}.`;
        });

    const confirmarPerfectos = () =>
        ejecutar("perfectos", async () => {
            const r = await api.post<{ ok: boolean; data: { confirmados: number; errores: Array<{ id: number; error: string }> } }>(
                "/baseapi/finanzas/banco/movimientos/confirmar-perfectos",
                { empresa, ids: perfectos.map((m) => m.id) },
            );
            const { confirmados, errores } = r.data.data;
            return `${confirmados} pago(s) confirmados${errores.length ? `; ${errores.length} quedaron para revisar (${errores[0]?.error})` : ""}.`;
        });

    const descartar = (m: MovimientoBanco, motivo: string) =>
        ejecutar(m.id, async () => {
            await api.post(`/baseapi/finanzas/banco/movimientos/${m.id}/descartar`, { empresa, motivo });
            return `Descartado: ${m.nombrePagador ?? formatRut(m.rutPagador)} ${formatCLP(m.monto)} (${MOTIVO_LABEL[motivo]}).`;
        });

    const deshacer = (m: MovimientoBanco) =>
        ejecutar(m.id, async () => {
            await api.post(`/baseapi/finanzas/banco/movimientos/${m.id}/deshacer`, { empresa });
            return `Conciliación deshecha: el pago vuelve a pendientes y se quitaron sus abonos.`;
        });

    const restaurar = (m: MovimientoBanco) =>
        ejecutar(m.id, async () => {
            await api.post(`/baseapi/finanzas/banco/movimientos/${m.id}/restaurar`, { empresa });
            return "El pago vuelve a pendientes.";
        });

    /* ---------- Render ---------- */

    const desde = (pagina - 1) * tamanoPagina;

    return (
        <ConfigProvider locale={esES}>
            <div className={embebido ? "" : "min-h-screen bg-slate-50 px-3 py-4 sm:px-5 lg:px-6"}>
                <div className={embebido ? "space-y-4" : "mx-auto w-full max-w-[1800px] space-y-4"}>
                    {/* Header (solo como página) */}
                    {!embebido && (
                        <div className="rounded-3xl border border-cyan-200 bg-cyan-50/30 px-4 py-5 shadow-sm sm:px-6">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-200">Administración Finanzas</span>
                                    <h1 className="mt-3 flex items-center gap-2 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                                        <Landmark size={22} className="text-cyan-600" /> Conciliación bancaria
                                    </h1>
                                    <p className="mt-1 max-w-2xl text-sm text-slate-600">
                                        Pagos recibidos en Itaú cruzados con las facturas: se proponen, tú confirmas.
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <select
                                        value={empresa}
                                        onChange={(e) => setEmpresa(e.target.value as EmpresaCxc)}
                                        className="h-10 rounded-2xl border border-cyan-300 bg-white px-3 text-sm font-bold text-slate-700"
                                    >
                                        <option value="rids">RIDS</option>
                                        <option value="econnet">ECONNET</option>
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setCargar(true)}
                                        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-cyan-300 bg-white px-4 text-sm font-bold text-cyan-700 hover:bg-cyan-50"
                                    >
                                        <FileSpreadsheet size={16} /> Cargar cartola
                                    </button>
                                    <Tooltip title="Recalcula facturas y propuestas sin esperar la caché de 5 minutos.">
                                        <button
                                            type="button"
                                            onClick={() => void cargarMovimientos(true)}
                                            disabled={cargando}
                                            className="inline-flex h-10 items-center gap-2 rounded-2xl bg-cyan-600 px-4 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-60"
                                        >
                                            <RefreshCw size={16} className={cargando ? "animate-spin" : ""} /> {cargando ? "Cargando..." : "Recalcular"}
                                        </button>
                                    </Tooltip>
                                </div>
                            </div>
                        </div>
                    )}

                    {aviso && (
                        <div
                            className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold ${aviso.tipo === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"
                                }`}
                        >
                            {aviso.texto}
                            <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso">
                                <X size={16} />
                            </button>
                        </div>
                    )}
                    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

                    {/* Pestañas y filtros */}
                    <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                        {embebido && (
                            <div className="flex basis-full flex-wrap items-center gap-2">
                                <select
                                    value={empresa}
                                    onChange={(e) => setEmpresa(e.target.value as EmpresaCxc)}
                                    className="h-10 rounded-xl border border-cyan-200 bg-white px-3 text-sm font-bold text-slate-700"
                                >
                                    <option value="rids">RIDS</option>
                                    <option value="econnet">ECONNET</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setCargar(true)}
                                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-cyan-300 bg-white px-3 text-sm font-bold text-cyan-700 hover:bg-cyan-50"
                                >
                                    <FileSpreadsheet size={16} /> Cargar cartola
                                </button>
                                <Tooltip title="Recalcula facturas y propuestas sin esperar la caché de 5 minutos.">
                                    <button
                                        type="button"
                                        onClick={() => void cargarMovimientos(true)}
                                        disabled={cargando}
                                        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                                    >
                                        <RefreshCw size={15} className={cargando ? "animate-spin" : ""} /> {cargando ? "Cargando..." : "Recalcular"}
                                    </button>
                                </Tooltip>
                                <span className="ml-auto text-[11px] text-slate-400">Pagos recibidos en Itaú cruzados con las facturas: se proponen, tú confirmas.</span>
                            </div>
                        )}
                        <div className="flex rounded-xl bg-slate-100 p-1">
                            {(
                                [
                                    { id: "PENDIENTE", label: "Pendientes" },
                                    { id: "CONCILIADO", label: "Conciliados" },
                                    { id: "DESCARTADO", label: "Descartados" },
                                ] as const
                            ).map((t) => (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setTab(t.id)}
                                    className={`rounded-lg px-3 py-1 text-xs font-bold ${tab === t.id ? "bg-white text-cyan-700 shadow-sm" : "text-slate-500"}`}
                                >
                                    {t.label} ({resumen[t.id] ?? 0})
                                </button>
                            ))}
                        </div>

                        <div className="relative w-full sm:w-72">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Pagador, RUT, referencia o folio"
                                className="h-9 w-full rounded-xl border border-slate-200 pl-8 pr-3 text-xs outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                            />
                        </div>

                        <div className="ml-auto text-xs text-slate-500">
                            {filas.length} pago(s) · <strong className="text-slate-900">{formatCLP(totalTab)}</strong>
                        </div>

                        {tab === "PENDIENTE" && (
                            <div className="flex basis-full flex-wrap items-center gap-1">
                                <button
                                    type="button"
                                    onClick={() => setFiltroTipo("")}
                                    className={`rounded-full px-3 py-1 text-xs font-bold ${!filtroTipo ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-600"}`}
                                >
                                    Todas ({resumen.PENDIENTE ?? 0})
                                </button>
                                {(Object.keys(PROPUESTA) as TipoPropuesta[]).map((t) => (
                                    <Tooltip key={t} title={PROPUESTA[t].ayuda}>
                                        <button
                                            type="button"
                                            onClick={() => setFiltroTipo(t)}
                                            className={`rounded-full px-3 py-1 text-xs font-bold ${filtroTipo === t ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-cyan-50"}`}
                                        >
                                            {PROPUESTA[t].label} ({resumen[t] ?? 0})
                                        </button>
                                    </Tooltip>
                                ))}
                                <Tooltip title="Confirma todos los «Match perfecto» y «Ya pagada» pendientes con la propuesta del sistema.">
                                    <button
                                        type="button"
                                        onClick={() => void confirmarPerfectos()}
                                        disabled={perfectos.length === 0 || ocupado !== null}
                                        className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                                    >
                                        <CheckCheck size={14} /> {ocupado === "perfectos" ? "Confirmando..." : `Confirmar perfectos (${perfectos.length})`}
                                    </button>
                                </Tooltip>
                            </div>
                        )}
                    </div>

                    {/* Tabla */}
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1000px] text-xs">
                                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Fecha</th>
                                        <th className="px-4 py-2 text-left">Pagador</th>
                                        <th className="px-4 py-2 text-left">Referencia</th>
                                        <th className="px-4 py-2 text-right">Monto</th>
                                        <th className="px-4 py-2 text-left">
                                            {tab === "PENDIENTE" ? "Propuesta" : tab === "CONCILIADO" ? "Facturas" : "Motivo"}
                                        </th>
                                        <th className="w-56 px-4 py-2 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filas.slice(desde, desde + tamanoPagina).map((m) => (
                                        <tr key={m.id} className="align-top hover:bg-slate-50">
                                            <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                                                {formatFecha(m.fecha)}
                                                <div className="text-[10px] text-slate-400">{m.hora?.slice(0, 5)}</div>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="font-bold text-slate-800">{m.nombrePagador ?? "—"}</div>
                                                <div className="text-[10px] text-slate-400">
                                                    {formatRut(m.rutPagador)}
                                                    {m.producto ? ` · ${m.producto}` : ""}
                                                </div>
                                                {tab === "PENDIENTE" && esPosibleDuplicado(m) && (
                                                    <Tooltip title={`${m.observacion} Si es el mismo pago, descártalo con el motivo «Pago duplicado».`}>
                                                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">
                                                            <AlertTriangle size={11} /> Posible duplicado
                                                        </span>
                                                    </Tooltip>
                                                )}
                                            </td>
                                            <td className="max-w-[260px] px-4 py-2.5 text-slate-600">{m.referencia ?? <span className="text-slate-300">—</span>}</td>
                                            <td className="px-4 py-2.5 text-right font-black text-slate-900">{formatCLP(m.monto)}</td>
                                            <td className="px-4 py-2.5">
                                                {tab === "PENDIENTE" && m.propuesta && <CeldaPropuesta movimiento={m} />}
                                                {tab === "CONCILIADO" && (
                                                    <div className="space-y-0.5">
                                                        {m.asignaciones.map((a) => (
                                                            <div key={a.id} className="flex items-center gap-1">
                                                                {a.tipo === "VINCULO" && (
                                                                    <Tooltip title="Ya estaba pagada: solo se vinculó.">
                                                                        <Link2 size={11} className="text-violet-600" />
                                                                    </Tooltip>
                                                                )}
                                                                <span className="font-bold text-slate-800">
                                                                    {a.tipoDoc}-{a.folio}
                                                                </span>
                                                                <span className="truncate text-slate-500">{a.razonSocial}</span>
                                                                <span className="ml-auto font-semibold text-slate-700">{formatCLP(a.monto)}</span>
                                                            </div>
                                                        ))}
                                                        <div className="text-[10px] text-slate-400">
                                                            {m.responsable ?? ""} {m.conciliadoAt ? `· ${formatFecha(m.conciliadoAt.slice(0, 10))}` : ""}
                                                        </div>
                                                    </div>
                                                )}
                                                {tab === "DESCARTADO" && (
                                                    <div>
                                                        <div className="font-semibold text-slate-700">{MOTIVO_LABEL[m.motivoDescarte ?? ""] ?? m.motivoDescarte}</div>
                                                        {m.observacion && <div className="text-[10px] text-slate-400">{m.observacion}</div>}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-2.5 text-right">
                                                <div className="inline-flex flex-wrap justify-end gap-1">
                                                    {tab === "PENDIENTE" && (
                                                        <>
                                                            {m.propuesta && m.propuesta.asignaciones.length > 0 && (
                                                                <Tooltip title="Confirmar la propuesta tal cual">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => void confirmarPropuesta(m)}
                                                                        disabled={ocupado !== null}
                                                                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                                                                    >
                                                                        <Check size={12} /> Confirmar
                                                                    </button>
                                                                </Tooltip>
                                                            )}
                                                            <Tooltip title="Elegir o cambiar las facturas">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEditar(m)}
                                                                    disabled={ocupado !== null}
                                                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                                                >
                                                                    <Pencil size={12} /> {m.propuesta?.asignaciones.length ? "Editar" : "Asignar"}
                                                                </button>
                                                            </Tooltip>
                                                            <Dropdown
                                                                trigger={["click"]}
                                                                menu={{
                                                                    items: MOTIVOS_DESCARTE.map((x) => ({ key: x.id, label: x.label })),
                                                                    onClick: ({ key }) => void descartar(m, key),
                                                                }}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    disabled={ocupado !== null}
                                                                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                                                                >
                                                                    <XCircle size={12} /> Descartar
                                                                </button>
                                                            </Dropdown>
                                                        </>
                                                    )}
                                                    {tab === "CONCILIADO" && (
                                                        <Tooltip title="Quita los abonos creados y devuelve el pago a pendientes.">
                                                            <button
                                                                type="button"
                                                                onClick={() => void deshacer(m)}
                                                                disabled={ocupado !== null}
                                                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                                            >
                                                                <Undo2 size={12} /> Deshacer
                                                            </button>
                                                        </Tooltip>
                                                    )}
                                                    {tab === "DESCARTADO" && (
                                                        <button
                                                            type="button"
                                                            onClick={() => void restaurar(m)}
                                                            disabled={ocupado !== null}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                                        >
                                                            <RotateCcw size={12} /> Restaurar
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {!cargando && filas.length === 0 && (
                                <div className="px-4 py-12 text-center text-sm text-slate-400">
                                    {movimientos.length === 0 ? "Todavía no hay pagos cargados. Usa «Cargar cartola»." : "No hay pagos para este filtro."}
                                </div>
                            )}
                        </div>

                        {filas.length > 0 && (
                            <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                                <span>
                                    {desde + 1}–{Math.min(desde + tamanoPagina, filas.length)} de {filas.length}
                                </span>
                                <Pagination
                                    size="small"
                                    current={pagina}
                                    pageSize={tamanoPagina}
                                    total={filas.length}
                                    showSizeChanger
                                    pageSizeOptions={[10, 20, 50, 100]}
                                    onChange={(p, ps) => {
                                        if (ps !== tamanoPagina) {
                                            setTamanoPagina(ps);
                                            setPagina(1);
                                        } else {
                                            setPagina(p);
                                        }
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {cargar && (
                    <CargarCartolaModal
                        empresa={empresa}
                        onClose={() => setCargar(false)}
                        onImportado={(r) => {
                            setCargar(false);
                            setTab("PENDIENTE");
                            setAviso({
                                tipo: "ok",
                                texto: `Cartola importada: ${r.nuevos} pago(s) nuevos${r.duplicados ? `, ${r.duplicados} ya estaban cargados` : ""}${r.descartadosAuto ? `, ${r.descartadosAuto} descartados automáticamente` : ""
                                    }.`,
                            });
                            void cargarMovimientos(true);
                        }}
                    />
                )}

                {editar && (
                    <AsignarMovimientoModal
                        empresa={empresa}
                        movimiento={editar}
                        onClose={() => setEditar(null)}
                        onConfirmado={(texto) => {
                            setEditar(null);
                            setAviso({ tipo: "ok", texto });
                            void cargarMovimientos();
                        }}
                    />
                )}
            </div>
        </ConfigProvider>
    );
};

/* =========================================================
   AUXILIARES
========================================================= */

const CeldaPropuesta: React.FC<{ movimiento: MovimientoBanco }> = ({ movimiento }) => {
    const p = movimiento.propuesta!;
    const info = PROPUESTA[p.tipo];

    return (
        <div className="space-y-1">
            <Tooltip title={p.motivo}>
                <span className={`inline-flex cursor-help items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${info.clase}`}>
                    {info.label} <Info size={10} />
                </span>
            </Tooltip>
            {p.asignaciones.map((a) => (
                <div key={`${a.tipoDoc}-${a.folio}-${a.rutContraparte}`} className="flex items-center gap-1">
                    {a.accion === "VINCULO" && <Link2 size={11} className="text-violet-600" />}
                    <span className="font-bold text-slate-800">
                        {a.tipoDoc}-{a.folio}
                    </span>
                    <span className="truncate text-slate-500">{a.razonSocial}</span>
                    <span className="ml-auto whitespace-nowrap font-semibold text-slate-700">
                        {formatCLP(a.monto)}
                        {a.accion === "ABONO" && a.monto < a.saldo && <span className="text-[10px] font-normal text-amber-600"> de {formatCLP(a.saldo)}</span>}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default ConciliacionBancariaPage;