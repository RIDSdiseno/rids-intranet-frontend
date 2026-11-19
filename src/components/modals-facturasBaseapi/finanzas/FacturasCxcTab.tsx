// src/components/modals-facturasBaseapi/finanzas/FacturasCxcTab.tsx
// Fase 2: listado de facturas (todas, cualquier estado) y notas de crédito/débito con la lógica de cuentas por cobrar.
// Fuente: GET /baseapi/finanzas/cxc/documentos. Pagos: endpoints existentes de conciliación.

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { ConfigProvider, DatePicker, Dropdown, Pagination, Tooltip } from "antd";
import esES from "antd/locale/es_ES";
import dayjs, { type Dayjs } from "dayjs";
import "dayjs/locale/es";

import {
    AlertTriangle,
    CheckCircle2,
    Clock3,
    FileText,
    Info,
    MinusCircle,
    MoreVertical,
    RefreshCw,
    Search,
    Send,
    BellRing,
    Undo2,
    Wallet,
    Landmark,
    X,
} from "lucide-react";

import { api } from "../../../api/api";

import DetalleBaseApiModal from "../DetalleBaseApiModal";
import EnviarDocumentoCxcModal from "./EnviarDocumentoCxcModal";
import PagosDocumentoCxcModal from "./PagosDocumentoCxcModal";
import ConciliarFacturaModal from "./banco/ConciliarFacturaModal";
import { generarPdfDocumentoSeleccionado } from "../pdfDocumento";
import type { EmpresaKey } from "../types";

import type { DocumentoCxc, DocumentosCxcResponse, EstadoCxc, NotaCxc, RespuestaDocumentosCxc, TipoEnvioCxc } from "./cxc.types";

// Meses y días del calendario en español.
dayjs.locale("es");

/* =========================================================
   HELPERS
========================================================= */

function formatCLP(value: number) {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value);
}

/** YYYY-MM-DD → DD-MM-YYYY sin pasar por Date. */
function formatFecha(value: string | null | undefined) {
    const m = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : "—";
}

/** 776966681 → 77696668-1 */
function formatRut(rut: string) {
    const limpio = rut.replace(/[^0-9kK]/g, "").toUpperCase();
    return limpio.length > 1 ? `${limpio.slice(0, -1)}-${limpio.slice(-1)}` : limpio;
}

function hoyChile() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function mensajeError(err: any, porDefecto: string) {
    return String(err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message ?? porDefecto);
}

/** Documento con las claves del RCV que esperan DetalleBaseApiModal y el generador de PDF. */
function documentoRcv(doc: DocumentoCxc, empresa: EmpresaKey) {
    return {
        "Tipo Doc": doc.tipoDoc,
        Folio: doc.folio,
        "Rut cliente": formatRut(doc.rutContraparte),
        "Razon Social": doc.razonSocial ?? "",
        "Fecha Docto": doc.fechaEmision ?? "",
        "Monto total": doc.montoOriginal,
        empresaOrigen: empresa,
    };
}

const ESTADOS: Array<{ id: EstadoCxc; label: string; ayuda: string; icon: React.ReactNode; clase: string }> = [
    { id: "VENCIDO", label: "Vencido", ayuda: "Con saldo y la fecha de vencimiento ya pasó.", icon: <AlertTriangle size={14} />, clase: "text-red-600" },
    { id: "PENDIENTE", label: "Por vencer", ayuda: "Con saldo, todavía dentro del plazo.", icon: <Clock3 size={14} />, clase: "text-amber-600" },
    { id: "PAGADO", label: "Pagado", ayuda: "Conciliada en el CRM (pago manual o importado desde Duemint).", icon: <CheckCircle2 size={14} />, clase: "text-emerald-600" },
    { id: "COMPENSADO", label: "Anulado con NC", ayuda: "Notas de crédito por el total: no queda nada que cobrar.", icon: <MinusCircle size={14} />, clase: "text-slate-400" },
];

const ESTADO_INFO = Object.fromEntries(ESTADOS.map((e) => [e.id, e])) as Record<EstadoCxc, (typeof ESTADOS)[number]>;

const METODO_NOTA: Record<NotaCxc["metodo"], { label: string; clase: string }> = {
    XML: { label: "Aplicada (XML)", clase: "bg-emerald-50 text-emerald-700" },
    INFERIDA: { label: "Aplicada por RUT y monto", clase: "bg-cyan-50 text-cyan-700" },
    SIN_APLICAR: { label: "Sin aplicar", clase: "bg-amber-50 text-amber-700" },
    ND_REVERSA: { label: "ND que revierte una NC", clase: "bg-slate-100 text-slate-600" },
    ND_COBRABLE: { label: "ND cobrable", clase: "bg-violet-50 text-violet-700" },
};

const OPCIONES_PAGINA = [10, 20, 50, 100];

/** De dónde salió la fecha de vencimiento (origenVencimiento del backend). */
function origenVencimientoLabel(origen: string) {
    switch (origen) {
        case "PLAZO_EMPRESA":
            return "Plazo de la empresa (ECONNET: día 1 del mes siguiente · RIDS: 30 días)";
        case "RECEPTOR_COBRANZA":
            return "Días de crédito del cliente";
        case "DETALLE_EMPRESA":
            return "Días de crédito de la ficha de la empresa";
        case "DOCUMENTO":
            return "Fecha de vencimiento informada en el RCV";
        case "DTE_CACHE":
            return "Fecha de vencimiento del XML (DTE)";
        case "OVERRIDE_DUEMINT":
            return "Importada desde Duemint";
        case "OVERRIDE_MANUAL":
            return "Fijada a mano en el CRM";
        case "SIN_FECHA":
            return "Sin fecha de vencimiento";
        default:
            return origen.startsWith("OVERRIDE_") ? `Registrada en el CRM (${origen.slice(9)})` : origen;
    }
}

const { RangePicker } = DatePicker;
const FORMATO_FECHA = "DD-MM-YYYY";

/** Rangos rápidos del filtro de emisión (calculados con la fecha de Chile). */
function presetsEmision(): Array<{ label: string; value: [Dayjs, Dayjs] }> {
    const hoy = dayjs(hoyChile());
    const mesAnterior = hoy.subtract(1, "month");
    const anoAnterior = hoy.subtract(1, "year");
    return [
        { label: "Mes actual", value: [hoy.startOf("month"), hoy.endOf("month")] },
        { label: "Mes anterior", value: [mesAnterior.startOf("month"), mesAnterior.endOf("month")] },
        { label: "Últimos 3 meses", value: [hoy.subtract(2, "month").startOf("month"), hoy.endOf("month")] },
        { label: "Últimos 6 meses", value: [hoy.subtract(5, "month").startOf("month"), hoy.endOf("month")] },
        { label: "Año actual", value: [hoy.startOf("year"), hoy.endOf("year")] },
        { label: "Año anterior", value: [anoAnterior.startOf("year"), anoAnterior.endOf("year")] },
    ];
}

/** Título con ícono de ayuda para encabezados y etiquetas. */
const ConAyuda: React.FC<{ ayuda: React.ReactNode; children: React.ReactNode }> = ({ ayuda, children }) => (
    <Tooltip title={ayuda}>
        <span className="inline-flex cursor-help items-center gap-1">
            {children}
            <Info size={11} className="text-slate-400" />
        </span>
    </Tooltip>
);

/* =========================================================
   COMPONENTE
========================================================= */

type Props = {
    empresa: EmpresaKey;
    onEmpresaChange: (empresa: EmpresaKey) => void;
};

const FacturasCxcTab: React.FC<Props> = ({ empresa, onEmpresaChange }) => {
    const [data, setData] = useState<RespuestaDocumentosCxc | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

    const [vista, setVista] = useState<"facturas" | "notas">("facturas");
    const [busqueda, setBusqueda] = useState("");
    const [cliente, setCliente] = useState("");
    const [estados, setEstados] = useState<EstadoCxc[]>(["VENCIDO", "PENDIENTE"]);
    const [desde, setDesde] = useState("");
    const [hasta, setHasta] = useState("");
    const [metodoNota, setMetodoNota] = useState<NotaCxc["metodo"] | "">("");
    const [pagina, setPagina] = useState(1);
    const [tamanoPagina, setTamanoPagina] = useState(50);
    const [menuAbierto, setMenuAbierto] = useState<string | null>(null);

    // Detalle / PDF
    const [docDetalle, setDocDetalle] = useState<DocumentoCxc | null>(null);
    const [detalleDte, setDetalleDte] = useState<any | null>(null);
    const [detalleLoading, setDetalleLoading] = useState(false);
    const [detalleError, setDetalleError] = useState("");
    const [pdfPreparando, setPdfPreparando] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfNombre, setPdfNombre] = useState("");

    // Pagos y abonos (Fase 4a)
    const [docPagos, setDocPagos] = useState<DocumentoCxc | null>(null);
    const [cambioPagos, setCambioPagos] = useState<string | null>(null);
    const [docBanco, setDocBanco] = useState<DocumentoCxc | null>(null);
    const [docAnular, setDocAnular] = useState<DocumentoCxc | null>(null);
    const [guardando, setGuardando] = useState(false);

    const [envio, setEnvio] = useState<{ tipo: TipoEnvioCxc; doc: DocumentoCxc } | null>(null);

    /* ---------- Carga ---------- */

    const cargar = useCallback(
        async (refrescar: boolean) => {
            setLoading(true);
            setError("");
            try {
                const response = await api.get<DocumentosCxcResponse>("/baseapi/finanzas/cxc/documentos", {
                    params: { empresa, ...(refrescar ? { refrescar: 1 } : {}) },
                });
                setData(response.data.data);
            } catch (err: any) {
                setError(mensajeError(err, "No se pudieron cargar las facturas."));
            } finally {
                setLoading(false);
            }
        },
        [empresa],
    );

    useEffect(() => {
        setData(null);
        setCliente("");
        setPagina(1);
        void cargar(false);
    }, [cargar]);

    useEffect(() => setPagina(1), [busqueda, cliente, estados, desde, hasta, vista, metodoNota]);

    /* ---------- Filtros ---------- */

    const clientes = useMemo(() => {
        const mapa = new Map<string, string>();
        for (const doc of data?.documentos ?? []) {
            if (!mapa.has(doc.rutContraparte)) mapa.set(doc.rutContraparte, doc.razonSocial ?? formatRut(doc.rutContraparte));
        }
        return Array.from(mapa.entries()).sort((a, b) => a[1].localeCompare(b[1]));
    }, [data]);

    const texto = busqueda.trim().toLowerCase();
    const coincideTexto = (folio: string, tipo: string, razon: string | null, rut: string) =>
        !texto ||
        folio.includes(texto) ||
        `${tipo}-${folio}`.includes(texto) ||
        (razon ?? "").toLowerCase().includes(texto) ||
        (texto.replace(/[^0-9k]/g, "") !== "" && rut.toLowerCase().includes(texto.replace(/[^0-9k]/g, "")));

    const enRangoEmision = (fecha: string | null) => (!desde || (fecha ?? "") >= desde) && (!hasta || (fecha ?? "") <= hasta);

    /** Facturas con cliente, fecha y búsqueda aplicados (sin el filtro de estado): base de los conteos. */
    const facturasBase = useMemo(
        () =>
            (data?.documentos ?? [])
                .filter((d) => !cliente || d.rutContraparte === cliente)
                .filter((d) => enRangoEmision(d.fechaEmision))
                .filter((d) => coincideTexto(d.folio, d.tipoDoc, d.razonSocial, d.rutContraparte)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [data, cliente, desde, hasta, texto],
    );

    /** Notas con cliente, fecha y búsqueda aplicados (sin el filtro de aplicación): base de los conteos. */
    const notasBase = useMemo(
        () =>
            (data?.notas ?? [])
                .filter((n) => !cliente || n.rutContraparte === cliente)
                .filter((n) => enRangoEmision(n.fechaEmision))
                .filter((n) => coincideTexto(n.folio, n.tipoDoc, n.razonSocial, n.rutContraparte) || (n.aplicadaA ?? "").includes(texto)),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [data, cliente, desde, hasta, texto],
    );

    const facturas = useMemo(
        () =>
            facturasBase
                .filter((d) => estados.includes(d.estado))
                .sort((a, b) => String(b.fechaEmision).localeCompare(String(a.fechaEmision)) || Number(b.folio) - Number(a.folio)),
        [facturasBase, estados],
    );

    const notas = useMemo(() => notasBase.filter((n) => !metodoNota || n.metodo === metodoNota), [notasBase, metodoNota]);

    const filas = vista === "facturas" ? facturas : notas;
    const desdeFila = (pagina - 1) * tamanoPagina;
    const presets = useMemo(() => presetsEmision(), []);

    const conteoEstado = useMemo(() => {
        const conteo: Record<EstadoCxc, number> = { VENCIDO: 0, PENDIENTE: 0, PAGADO: 0, COMPENSADO: 0 };
        for (const d of facturasBase) conteo[d.estado]++;
        return conteo;
    }, [facturasBase]);

    const conteoMetodo = useMemo(() => {
        const conteo: Record<NotaCxc["metodo"], number> = { XML: 0, INFERIDA: 0, SIN_APLICAR: 0, ND_REVERSA: 0, ND_COBRABLE: 0 };
        for (const n of notasBase) conteo[n.metodo]++;
        return conteo;
    }, [notasBase]);

    const totalSaldo = facturas.reduce((s, d) => s + (d.estado === "VENCIDO" || d.estado === "PENDIENTE" ? d.saldo : 0), 0);

    /* ---------- Detalle y PDF ---------- */

    const limpiarPdf = () => {
        setPdfUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return null;
        });
        setPdfNombre("");
    };

    const consultarDte = useCallback(
        async (doc: DocumentoCxc, forceRefresh = false) => {
            setDetalleLoading(true);
            setDetalleError("");
            try {
                const response = await api.get(`/baseapi/dte/folio/${doc.folio}`, {
                    params: { periodo: doc.periodo, empresa, tipoDTE: doc.tipoDoc, ...(forceRefresh ? { forceRefresh: true } : {}) },
                });
                setDetalleDte(response.data);
                return response.data;
            } catch (err: any) {
                setDetalleError(mensajeError(err, "No se pudo consultar el DTE."));
                return null;
            } finally {
                setDetalleLoading(false);
            }
        },
        [empresa],
    );

    const abrirDetalle = async (doc: DocumentoCxc) => {
        setMenuAbierto(null);
        setDocDetalle(doc);
        setDetalleDte(null);
        limpiarPdf();

        const detalle = await consultarDte(doc);
        if (!detalle) return;

        setPdfPreparando(true);
        try {
            const [ano = "", mes = ""] = doc.periodo.split("-");
            const pdf = await generarPdfDocumentoSeleccionado({
                documento: documentoRcv(doc, empresa),
                detalleDte: detalle,
                activeTab: "ventas",
                empresa,
                mes,
                ano,
                autoDownload: false,
            });
            setPdfUrl(pdf.url);
            setPdfNombre(pdf.fileName);
        } catch (err) {
            console.error("Error preparando PDF", err);
        } finally {
            setPdfPreparando(false);
        }
    };

    const cerrarDetalle = () => {
        setDocDetalle(null);
        setDetalleDte(null);
        setDetalleError("");
        limpiarPdf();
    };

    /* ---------- Pagos ---------- */

    const abrirPagos = (doc: DocumentoCxc) => {
        setMenuAbierto(null);
        setCambioPagos(null);
        setDocPagos(doc);
    };

    /** Al cerrar el modal de pagos: si hubo cambios, aviso y recálculo. */
    const cerrarPagos = () => {
        setDocPagos(null);
        if (cambioPagos) {
            setAviso({ tipo: "ok", texto: cambioPagos });
            setCambioPagos(null);
            void cargar(true);
        }
    };

    const anularPago = async () => {
        if (!docAnular) return;
        setGuardando(true);
        try {
            await api.post("/baseapi/rcv/conciliacion/desconciliar", {
                empresa,
                tipoRcv: "ventas",
                tipoDoc: docAnular.tipoDoc,
                folio: docAnular.folio,
                rutContraparte: docAnular.rutContraparte,
            });
            setAviso({ tipo: "ok", texto: `Pago anulado: ${docAnular.tipoDoc}-${docAnular.folio} vuelve a quedar por cobrar.` });
            setDocAnular(null);
            await cargar(true);
        } catch (err: any) {
            setAviso({ tipo: "error", texto: mensajeError(err, "No se pudo anular el pago.") });
        } finally {
            setGuardando(false);
        }
    };

    const toggleEstado = (estado: EstadoCxc) =>
        setEstados((actual) => (actual.includes(estado) ? actual.filter((e) => e !== estado) : [...actual, estado]));

    /* ---------- Render ---------- */

    const inputClase =
        "h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100";

    return (
        <ConfigProvider locale={esES}>
            <div className="space-y-4">
                {/* CABECERA */}
                <div className="flex flex-col gap-3 rounded-3xl border border-cyan-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                        <select
                            value={empresa}
                            onChange={(e) => onEmpresaChange(e.target.value as EmpresaKey)}
                            className="h-10 rounded-xl border border-cyan-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-cyan-500"
                        >
                            <option value="econnet">ECONNET</option>
                            <option value="rids">RIDS</option>
                        </select>
                        <div className="flex rounded-xl bg-slate-100 p-1">
                            {(
                                [
                                    { id: "facturas", label: `Facturas${data ? ` (${facturas.length})` : ""}` },
                                    { id: "notas", label: `Notas de crédito y débito${data ? ` (${notas.length})` : ""}` },
                                ] as const
                            ).map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setVista(tab.id)}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${vista === tab.id ? "bg-white text-cyan-700 shadow-sm" : "text-slate-500"
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                        {vista === "facturas" && (
                            <span>
                                {facturas.length} facturas ·{" "}
                                <ConAyuda ayuda="Saldo (monto menos notas de crédito) de las facturas vencidas y por vencer que pasan los filtros actuales.">
                                    por cobrar
                                </ConAyuda>{" "}
                                <strong className="text-slate-900">{formatCLP(totalSaldo)}</strong>
                            </span>
                        )}
                        <Tooltip title="Vuelve a calcular desde el RCV y las conciliaciones, sin esperar los 5 minutos de caché.">
                            <button
                                type="button"
                                onClick={() => void cargar(true)}
                                disabled={loading}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                            >
                                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                                {loading ? "Cargando..." : "Recalcular"}
                            </button>
                        </Tooltip>
                    </div>
                </div>

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

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
                    {/* FILTROS */}
                    <aside className="h-fit space-y-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Folio, cliente o RUT" className={`${inputClase} pl-8`} />
                        </div>

                        <div>
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Cliente</label>
                            <select value={cliente} onChange={(e) => setCliente(e.target.value)} className={inputClase}>
                                <option value="">Todos los clientes</option>
                                {clientes.map(([rut, nombre]) => (
                                    <option key={rut} value={rut}>
                                        {nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {vista === "facturas" ? (
                            <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Estado</label>
                                <div className="space-y-1">
                                    {ESTADOS.map((e) => (
                                        <Tooltip key={e.id} title={e.ayuda} placement="right">
                                            <label className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50">
                                                <span className="flex items-center gap-2">
                                                    <input type="checkbox" checked={estados.includes(e.id)} onChange={() => toggleEstado(e.id)} />
                                                    <span className={e.clase}>{e.icon}</span>
                                                    <span className="font-semibold text-slate-700">{e.label}</span>
                                                </span>
                                                <span className="text-slate-400">{conteoEstado[e.id]}</span>
                                            </label>
                                        </Tooltip>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Aplicación</label>
                                <select value={metodoNota} onChange={(e) => setMetodoNota(e.target.value as NotaCxc["metodo"] | "")} className={inputClase}>
                                    <option value="">Todas ({notasBase.length})</option>
                                    {(Object.keys(METODO_NOTA) as NotaCxc["metodo"][]).map((m) => (
                                        <option key={m} value={m}>
                                            {METODO_NOTA[m].label} ({conteoMetodo[m]})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Fecha de emisión</label>
                            <RangePicker
                                className="w-full"
                                format={FORMATO_FECHA}
                                placeholder={["Desde", "Hasta"]}
                                presets={presets}
                                allowEmpty={[true, true]}
                                value={desde || hasta ? [desde ? dayjs(desde) : null, hasta ? dayjs(hasta) : null] : null}
                                onChange={(valores) => {
                                    setDesde(valores?.[0]?.format("YYYY-MM-DD") ?? "");
                                    setHasta(valores?.[1]?.format("YYYY-MM-DD") ?? "");
                                }}
                            />
                            <div className="mt-2 flex flex-wrap gap-1">
                                {presets.slice(0, 3).map((p) => {
                                    const pDesde = p.value[0].format("YYYY-MM-DD");
                                    const pHasta = p.value[1].format("YYYY-MM-DD");
                                    const activo = desde === pDesde && hasta === pHasta;
                                    return (
                                        <button
                                            key={p.label}
                                            type="button"
                                            onClick={() => {
                                                setDesde(activo ? "" : pDesde);
                                                setHasta(activo ? "" : pHasta);
                                            }}
                                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold transition ${activo ? "bg-cyan-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-cyan-50 hover:text-cyan-700"
                                                }`}
                                        >
                                            {p.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                setBusqueda("");
                                setCliente("");
                                setEstados(["VENCIDO", "PENDIENTE"]);
                                setDesde("");
                                setHasta("");
                                setMetodoNota("");
                            }}
                            className="w-full rounded-xl border border-slate-200 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                        >
                            Limpiar filtros
                        </button>
                    </aside>

                    {/* TABLA */}
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        {!data && loading && <div className="flex h-60 items-center justify-center text-sm text-slate-400">Cargando facturas...</div>}

                        {data && (
                            <div className="overflow-x-auto">
                                {vista === "facturas" ? (
                                    <table className="w-full min-w-[900px] text-xs">
                                        <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                                            <tr>
                                                <th className="w-8 px-3 py-2" />
                                                <th className="px-3 py-2 text-left">Documento</th>
                                                <th className="px-3 py-2 text-left">Cliente</th>
                                                <th className="px-3 py-2 text-left">
                                                    <ConAyuda ayuda="Pasa el cursor sobre la fecha de vencimiento para ver de dónde salió: plazo de la empresa, días de crédito del cliente, XML, Duemint o fijada a mano.">
                                                        Emisión → Vencimiento
                                                    </ConAyuda>
                                                </th>
                                                <th className="px-3 py-2 text-right">
                                                    <ConAyuda ayuda="Solo facturas con saldo: días de atraso, o días que faltan para el vencimiento.">Días</ConAyuda>
                                                </th>
                                                <th className="px-3 py-2 text-right">
                                                    <ConAyuda ayuda="Vencidas y por vencer: saldo después de notas de crédito. Pagadas y anuladas: monto original.">Monto</ConAyuda>
                                                </th>
                                                <th className="w-10 px-3 py-2" />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {facturas.slice(desdeFila, desdeFila + tamanoPagina).map((doc) => {
                                                const info = ESTADO_INFO[doc.estado];
                                                const abierto = doc.estado === "VENCIDO" || doc.estado === "PENDIENTE";
                                                return (
                                                    <tr key={doc.key} className="hover:bg-slate-50">
                                                        <td className={`px-3 py-2 ${info.clase}`}>
                                                            <Tooltip title={info.label}>
                                                                <span className="inline-flex cursor-help">{info.icon}</span>
                                                            </Tooltip>
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <button type="button" onClick={() => void abrirDetalle(doc)} className="font-bold text-cyan-700 hover:underline">
                                                                {doc.tipoDoc}-{doc.folio}
                                                            </button>
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <div className="font-semibold text-slate-800">{doc.razonSocial ?? "—"}</div>
                                                            <div className="text-[10px] text-slate-400">{formatRut(doc.rutContraparte)}</div>
                                                        </td>
                                                        <td className="px-3 py-2 text-slate-600">
                                                            {formatFecha(doc.fechaEmision)} →{" "}
                                                            {abierto ? (
                                                                <Tooltip title={origenVencimientoLabel(doc.origenVencimiento)}>
                                                                    <span className="cursor-help underline decoration-dotted underline-offset-2">{formatFecha(doc.fechaVencimiento)}</span>
                                                                </Tooltip>
                                                            ) : (
                                                                "—"
                                                            )}
                                                            {doc.estado === "PAGADO" && (
                                                                <div className="text-[10px] text-emerald-700">
                                                                    Pagado {formatFecha(doc.pagadoAt)} {doc.formaPago ? `· ${doc.formaPago}` : ""}
                                                                </div>
                                                            )}
                                                            {doc.estado === "COMPENSADO" && <div className="text-[10px] text-slate-400">Anulada por {doc.notasCredito.join(", ")}</div>}
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            {abierto && doc.diasDiferencia !== null ? (
                                                                doc.diasDiferencia > 0 ? (
                                                                    <span className="rounded-full bg-red-50 px-2 py-0.5 font-bold text-red-700">{doc.diasDiferencia} vencido</span>
                                                                ) : (
                                                                    <span className="rounded-full bg-amber-50 px-2 py-0.5 font-bold text-amber-700">
                                                                        {doc.diasDiferencia === 0 ? "vence hoy" : `en ${-doc.diasDiferencia}`}
                                                                    </span>
                                                                )
                                                            ) : (
                                                                "—"
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            <div className="font-bold text-slate-900">{formatCLP(abierto ? doc.saldo : doc.montoOriginal)}</div>
                                                            {abierto && (doc.montoAbonado ?? 0) > 0 && (
                                                                <Tooltip title={`${doc.abonos} abono(s) · monto original ${formatCLP(doc.montoOriginal)}`}>
                                                                    <div className="cursor-help text-[10px] font-semibold text-cyan-700">abonado {formatCLP(doc.montoAbonado ?? 0)}</div>
                                                                </Tooltip>
                                                            )}
                                                            {doc.montoNotasCredito > 0 && doc.estado !== "COMPENSADO" && (
                                                                <Tooltip title={`Notas de crédito aplicadas: ${doc.notasCredito.join(", ")} · monto original ${formatCLP(doc.montoOriginal)}`}>
                                                                    <div className="cursor-help text-[10px] text-slate-400">NC {formatCLP(doc.montoNotasCredito)}</div>
                                                                </Tooltip>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            <Dropdown
                                                                trigger={["click"]}
                                                                placement="bottomRight"
                                                                open={menuAbierto === doc.key}
                                                                onOpenChange={(abrir) => setMenuAbierto(abrir ? doc.key : null)}
                                                                popupRender={() => (
                                                                    <div className="w-56 overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-lg">
                                                                        <MenuItem icon={<FileText size={14} />} onClick={() => void abrirDetalle(doc)}>
                                                                            Ver detalle y PDF
                                                                        </MenuItem>
                                                                        {(abierto || (doc.estado === "PAGADO" && (doc.abonos ?? 0) > 0)) && (
                                                                            <MenuItem icon={<Wallet size={14} />} onClick={() => abrirPagos(doc)}>
                                                                                {abierto ? "Registrar pago o abono" : "Ver pagos"}
                                                                            </MenuItem>
                                                                        )}
                                                                        {doc.estado !== "COMPENSADO" && (
                                                                            <MenuItem
                                                                                icon={<Landmark size={14} />}
                                                                                onClick={() => {
                                                                                    setMenuAbierto(null);
                                                                                    setDocBanco(doc);
                                                                                }}
                                                                            >
                                                                                Conciliar con banco
                                                                            </MenuItem>
                                                                        )}
                                                                        {doc.estado === "PAGADO" && (doc.abonos ?? 0) === 0 && (
                                                                            <MenuItem
                                                                                icon={<Undo2 size={14} />}
                                                                                onClick={() => {
                                                                                    setMenuAbierto(null);
                                                                                    setDocAnular(doc);
                                                                                }}
                                                                            >
                                                                                Anular pago
                                                                            </MenuItem>
                                                                        )}
                                                                        {doc.estado !== "COMPENSADO" && (
                                                                            <MenuItem
                                                                                icon={<Send size={14} />}
                                                                                onClick={() => {
                                                                                    setMenuAbierto(null);
                                                                                    setEnvio({ tipo: "factura", doc });
                                                                                }}
                                                                            >
                                                                                Reenviar factura
                                                                            </MenuItem>
                                                                        )}
                                                                        {abierto && (
                                                                            <MenuItem
                                                                                icon={<BellRing size={14} />}
                                                                                disabled={!doc.fechaVencimiento}
                                                                                hint={doc.fechaVencimiento ? undefined : "Sin fecha de vencimiento"}
                                                                                onClick={() => {
                                                                                    setMenuAbierto(null);
                                                                                    setEnvio({ tipo: "recordatorio", doc });
                                                                                }}
                                                                            >
                                                                                Enviar recordatorio
                                                                            </MenuItem>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            >
                                                                <button
                                                                    type="button"
                                                                    className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                                                                    aria-label="Acciones"
                                                                >
                                                                    <MoreVertical size={16} />
                                                                </button>
                                                            </Dropdown>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                ) : (
                                    <table className="w-full min-w-[820px] text-xs">
                                        <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Nota</th>
                                                <th className="px-3 py-2 text-left">Cliente</th>
                                                <th className="px-3 py-2 text-left">Emisión</th>
                                                <th className="px-3 py-2 text-right">Monto</th>
                                                <th className="px-3 py-2 text-left">
                                                    <ConAyuda ayuda="Factura a la que se descontó la nota (o la NC que revierte, si es una ND).">Aplicada a</ConAyuda>
                                                </th>
                                                <th className="px-3 py-2 text-left">
                                                    <ConAyuda ayuda="XML: la referencia viene en el XML. Por RUT y monto: inferida porque no hay XML. Sin aplicar: no se encontró una factura que calce.">
                                                        Estado
                                                    </ConAyuda>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {notas.slice(desdeFila, desdeFila + tamanoPagina).map((nota) => (
                                                <tr key={`${nota.tipoDoc}-${nota.folio}-${nota.rutContraparte}`} className="hover:bg-slate-50">
                                                    <td className="px-3 py-2 font-bold text-slate-800">
                                                        {nota.tipoDoc}-{nota.folio}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                        <div className="font-semibold text-slate-800">{nota.razonSocial ?? "—"}</div>
                                                        <div className="text-[10px] text-slate-400">{formatRut(nota.rutContraparte)}</div>
                                                    </td>
                                                    <td className="px-3 py-2 text-slate-600">{formatFecha(nota.fechaEmision)}</td>
                                                    <td className="px-3 py-2 text-right font-bold text-slate-900">{formatCLP(nota.monto)}</td>
                                                    <td className="px-3 py-2 font-semibold text-slate-700">{nota.aplicadaA ?? "—"}</td>
                                                    <td className="px-3 py-2">
                                                        <Tooltip title={nota.metodo === "SIN_APLICAR" ? "Sin XML en BaseAPI, anulada por una ND o sin factura abierta del mismo RUT y monto." : undefined}>
                                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${METODO_NOTA[nota.metodo].clase}`}>
                                                                {METODO_NOTA[nota.metodo].label}
                                                            </span>
                                                        </Tooltip>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}

                                {filas.length === 0 && <div className="px-3 py-10 text-center text-sm text-slate-400">No hay documentos para estos filtros.</div>}
                            </div>
                        )}

                        {data && filas.length > 0 && (
                            <div className="flex flex-col gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                                <span>
                                    {desdeFila + 1}–{Math.min(desdeFila + tamanoPagina, filas.length)} de {filas.length}
                                </span>
                                <Pagination
                                    size="small"
                                    current={pagina}
                                    pageSize={tamanoPagina}
                                    total={filas.length}
                                    showSizeChanger
                                    pageSizeOptions={OPCIONES_PAGINA}
                                    onChange={(p, ps) => {
                                        setMenuAbierto(null);
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

                {/* DETALLE Y PDF (modal existente) */}
                {docDetalle && (
                    <DetalleBaseApiModal
                        documento={documentoRcv(docDetalle, empresa)}
                        activeTab="ventas"
                        empresa={empresa}
                        mes={docDetalle.periodo.split("-")[1] ?? ""}
                        ano={docDetalle.periodo.split("-")[0] ?? ""}
                        onClose={cerrarDetalle}
                        onConsultarDte={(_doc, forceRefresh) => consultarDte(docDetalle, forceRefresh)}
                        detalleDte={detalleDte}
                        detalleLoading={detalleLoading}
                        detalleError={detalleError}
                        pdfPreparando={pdfPreparando}
                        pdfPreparadoUrl={pdfUrl}
                        pdfPreparadoNombre={pdfNombre}
                    />
                )}

                {/* CONCILIAR CON BANCO (Fase 4b) */}
                {docBanco && (
                    <ConciliarFacturaModal
                        empresa={empresa}
                        documento={docBanco}
                        onClose={() => setDocBanco(null)}
                        onConciliado={(texto: any) => {
                            setDocBanco(null);
                            setAviso({ tipo: "ok", texto });
                            void cargar(true);
                        }}
                    />
                )}

                {/* PAGOS Y ABONOS (Fase 4a) */}
                {docPagos && (
                    <PagosDocumentoCxcModal empresa={empresa} documento={docPagos} onCambio={setCambioPagos} onClose={cerrarPagos} />
                )}

                {/* REENVIAR FACTURA / RECORDATORIO (Fase 2b) */}
                {envio && (
                    <EnviarDocumentoCxcModal
                        tipo={envio.tipo}
                        empresa={empresa}
                        documento={envio.doc}
                        onClose={() => setEnvio(null)}
                        onEnviado={(r: any) =>
                            setAviso({
                                tipo: r.errores === 0 ? "ok" : "error",
                                texto: `${envio.tipo === "factura" ? "Factura" : "Recordatorio"} ${envio.doc.tipoDoc}-${envio.doc.folio}: ${r.enviados} enviado${r.enviados === 1 ? "" : "s"
                                    }${r.errores ? `, ${r.errores} con error` : ""}${r.modo === "PRUEBA" ? " (modo prueba)" : ""}.`,
                            })
                        }
                    />
                )}

                {/* ANULAR PAGO */}
                {docAnular && (
                    <Modal titulo={`Anular pago · ${docAnular.tipoDoc}-${docAnular.folio}`} onClose={() => setDocAnular(null)}>
                        <div className="space-y-3 text-sm text-slate-600">
                            <p>
                                El pago de <strong>{docAnular.razonSocial}</strong> registrado el <strong>{formatFecha(docAnular.pagadoAt)}</strong>
                                {docAnular.formaPago ? ` (${docAnular.formaPago})` : ""} se quitará y la factura volverá a quedar por cobrar.
                            </p>
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setDocAnular(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void anularPago()}
                                    disabled={guardando}
                                    className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-60"
                                >
                                    {guardando ? "Anulando..." : "Anular pago"}
                                </button>
                            </div>
                        </div>
                    </Modal>
                )}
            </div>
        </ConfigProvider>
    );
};

/* =========================================================
   AUXILIARES
========================================================= */

const MenuItem: React.FC<{ icon: React.ReactNode; onClick?: () => void; disabled?: boolean; hint?: string; children: React.ReactNode }> = ({
    icon,
    onClick,
    disabled = false,
    hint,
    children,
}) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={hint}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"
    >
        {icon}
        <span className="flex-1">{children}</span>
    </button>
);

const Modal: React.FC<{ titulo: string; onClose: () => void; children: React.ReactNode }> = ({ titulo, onClose, children }) => (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
        <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900">{titulo}</h3>
                <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Cerrar">
                    <X size={16} />
                </button>
            </div>
            {children}
        </div>
    </div>
);

export default FacturasCxcTab;