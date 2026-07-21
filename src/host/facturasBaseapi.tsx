// src/host/facturasBaseapi.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";

import type { DashboardData, EmpresaKey, TabRCV, Toast } from "../components/modals-facturasBaseapi/types";

import {
    FileTextOutlined,
    DollarOutlined,
    PercentageOutlined,
    ReloadOutlined,
    BarChartOutlined,
    DatabaseOutlined,
    CloudSyncOutlined
} from "@ant-design/icons";

import {
    MESES,
    formatCLP,
    getBaseApiPayload,
    getDocumentos,
    getResumenPorTipo,
    getValue,
    safeParseUser,
    toNumberCL,
    formatFechaVista
} from "../components/modals-facturasBaseapi/utils";

import { generarPdfDocumentoSeleccionado } from "../components/modals-facturasBaseapi/pdfDocumento";

import DetalleBaseApiModal from "../components/modals-facturasBaseapi/DetalleBaseApiModal";
import DashboardCharts from "../components/modals-facturasBaseapi/DashboardCharts";
import DocumentosRcvTable from "../components/modals-facturasBaseapi/DocumentosRcvTable";

// ─── Componente principal ────────────────────────────────────────────────────

function esPeriodoActual(mes: string, ano: string) {
    const hoy = new Date();
    const mesActual = String(hoy.getMonth() + 1).padStart(2, "0");
    const anoActual = String(hoy.getFullYear());

    return mes === mesActual && ano === anoActual;
}

const FacturasBaseapi: React.FC = () => {
    const now = new Date();
    const user = useMemo(() => safeParseUser(), []);
    const isCliente = user?.rol === "CLIENTE";

    const [mes, setMes] = useState(String(now.getMonth() + 1).padStart(2, "0"));
    const [ano, setAno] = useState(String(now.getFullYear()));
    const [activeTab, setActiveTab] = useState<TabRCV>("ventas");
    const [empresa, setEmpresa] = useState<EmpresaKey>("econnet");
    const [mainTab, setMainTab] = useState<"documentos" | "dashboard">("documentos");

    const [loading, setLoading] = useState(false);
    const [respuesta, setRespuesta] = useState<any>(null);
    const [toast, setToast] = useState<Toast | null>(null);
    const [busqueda, setBusqueda] = useState("");
    const [documentoSeleccionado, setDocumentoSeleccionado] = useState<any | null>(null);

    const [detalleDte, setDetalleDte] = useState<any | null>(null);
    const [detalleLoading, setDetalleLoading] = useState(false);
    const [detalleError, setDetalleError] = useState("");

    const [pdfPreparando, setPdfPreparando] = useState(false);
    const [pdfPreparadoUrl, setPdfPreparadoUrl] = useState<string | null>(null);
    const [pdfPreparadoNombre, setPdfPreparadoNombre] = useState("");

    // Dashboard desde el backend
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [dashboardLoading, setDashboardLoading] = useState(false);
    const [dashboardError, setDashboardError] = useState("");

    const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:4000/api";

    useEffect(() => {
        if (isCliente && activeTab === "compras") {
            setActiveTab("ventas");
            setBusqueda("");
        }
    }, [isCliente, activeTab]);

    const showError = (msg: string) => {
        setToast({ type: "error", message: msg });
        setTimeout(() => setToast(null), 5000);
    };

    const showSuccess = (msg: string) => {
        setToast({ type: "success", message: msg });
        setTimeout(() => setToast(null), 4000);
    };

    const getAuthHeaders = () => {
        const token = localStorage.getItem("accessToken") ?? "";
        return {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    };

    // ── Fetch documentos (tab Documentos) ────────────────────────────────────
    const fetchDatos = useCallback(async (forceRefresh = false) => {
        setLoading(true);
        setRespuesta(null);
        setDocumentoSeleccionado(null);
        setDetalleDte(null);
        setDetalleError("");

        try {
            if (isCliente && activeTab === "compras") {
                setActiveTab("ventas");
                return;
            }

            const params = new URLSearchParams({ mes, ano });

            if (!isCliente) {
                params.set("empresa", empresa);
            }

            if (forceRefresh) {
                params.set("forceRefresh", "true");
            }

            const endpoint =
                activeTab === "ventas"
                    ? `${BASE_URL}/baseapi/rcv/ventas?${params.toString()}`
                    : `${BASE_URL}/baseapi/rcv/compras?${params.toString()}`;

            const res = await fetch(endpoint, { headers: getAuthHeaders() });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error ?? err?.message ?? `Error ${res.status}`);
            }

            const json = await res.json();

            setRespuesta(json);

            showSuccess(
                forceRefresh
                    ? "Datos actualizados desde BaseAPI"
                    : "Datos cargados desde cache si estaba disponible"
            );
        } catch (err: any) {
            showError(err?.message ?? "Error al consultar BaseAPI");
        } finally {
            setLoading(false);
        }
    }, [mes, ano, activeTab, empresa, isCliente]);

    // ── Fetch dashboard (tab Dashboard) ──────────────────────────────────────
    const fetchDashboard = useCallback(async () => {
        setDashboardLoading(true);
        setDashboardError("");

        try {
            const params = new URLSearchParams({ mes, ano, tipo: activeTab });
            if (!isCliente) params.set("empresa", empresa);

            const res = await fetch(`${BASE_URL}/baseapi/rcv/dashboard?${params}`, {
                headers: getAuthHeaders(),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error ?? err?.message ?? `Error ${res.status}`);
            }

            const json = await res.json();
            setDashboardData(json.data);
        } catch (err: any) {
            setDashboardError(err?.message ?? "Error cargando dashboard");
        } finally {
            setDashboardLoading(false);
        }
    }, [mes, ano, activeTab, empresa, isCliente]);

    // ── Fetch detalle DTE ─────────────────────────────────────────────────────
    const fetchDetalleDte = async (doc: any, forceRefresh = false) => {
        setDetalleLoading(true);
        setDetalleError("");
        setDetalleDte(null);

        try {
            if (activeTab !== "ventas") {
                throw new Error("Este endpoint de DTE/XML corresponde a documentos emitidos.");
            }
            const folio = getValue(doc, ["Folio", "folio"], "");
            const tipoDTE = getValue(doc, ["Tipo Doc", "tipoDoc", "tipoDTE"], "33");
            if (!folio) throw new Error("No se pudo obtener el folio del documento");

            const empresaDocumento = String(
                getValue(doc, ["empresaOrigen", "empresa", "empresaKey"], empresa)
            ).toLowerCase() as EmpresaKey;

            const params = new URLSearchParams({
                periodo: `${ano}-${mes}`,
                empresa: empresaDocumento,
                tipoDTE: String(tipoDTE),
                ...(forceRefresh ? { forceRefresh: "true" } : {}),
            });

            const res = await fetch(`${BASE_URL}/baseapi/dte/folio/${folio}?${params}`, {
                headers: getAuthHeaders(),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error ?? err?.message ?? `Error ${res.status}`);
            }

            const json = await res.json();

            setDetalleDte(json);

            showSuccess(
                json?.cached
                    ? "DTE cargado desde cache"
                    : "DTE consultado y guardado en cache"
            );

            return json;
        } catch (error: any) {
            const message = error?.message ?? "No se pudo consultar el DTE";
            setDetalleError(message);
            showError(message);
            return null;
        } finally {
            setDetalleLoading(false);
        }
    };

    const limpiarPdfPreparado = useCallback(() => {
        setPdfPreparando(false);
        setPdfPreparadoNombre("");

        setPdfPreparadoUrl((prev) => {
            if (prev) {
                URL.revokeObjectURL(prev);
            }

            return null;
        });
    }, []);

    // ── Trigger inicial y ante cambios de filtros ─────────────────────────────
    useEffect(() => {
        void fetchDatos(false);
        void fetchDashboard();
    }, [fetchDatos, fetchDashboard]);

    const documentos = useMemo(() => getDocumentos(respuesta), [respuesta]);
    const resumenPorTipo = useMemo(() => getResumenPorTipo(respuesta), [respuesta]);

    const documentosFiltrados = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        if (!q) return documentos;
        return documentos.filter((doc) => JSON.stringify(doc).toLowerCase().includes(q));
    }, [documentos, busqueda]);

    const totalNeto = documentos.reduce(
        (sum, doc) => sum + toNumberCL(getValue(doc, ["Monto Neto", "montoNeto"], 0)), 0
    );
    const totalIVA = documentos.reduce(
        (sum, doc) => sum + toNumberCL(getValue(doc, ["Monto IVA", "Monto Iva", "Monto IVA Recuperable", "montoIva", "montoIVA"], 0)), 0
    );
    const totalBruto = documentos.reduce(
        (sum, doc) => sum + toNumberCL(getValue(doc, ["Monto total", "Monto Total", "montoTotal"], 0)), 0
    );

    const periodoLabel = `${MESES[Number(mes) - 1] ?? mes} ${ano}`;
    const empresaLabel = isCliente
        ? "Empresa asignada"
        : empresa === "rids"
            ? "RIDS"
            : "ECONNET";

    const tipoLabel = activeTab === "ventas" ? "Ventas" : "Compras";
    const isBusy = loading || dashboardLoading;

    const handleActualizar = async () => {
        const forceRefresh = esPeriodoActual(mes, ano);

        await fetchDatos(forceRefresh);
        await fetchDashboard();
    };

    const handleConsultarSii = async () => {
        await fetchDatos(true);
        await fetchDashboard();
    };

    const handleSeleccionarDocumento = useCallback((doc: any) => {
        setDocumentoSeleccionado(doc);
        setDetalleDte(null);
        setDetalleError("");
        limpiarPdfPreparado();

        if (activeTab !== "ventas") {
            return;
        }

        void (async () => {
            const detalle = await fetchDetalleDte(doc, false);

            if (!detalle) return;

            setPdfPreparando(true);

            try {
                const pdfResult = await generarPdfDocumentoSeleccionado({
                    documento: doc,
                    detalleDte: detalle,
                    activeTab,
                    empresa,
                    mes,
                    ano,
                    autoDownload: false,
                });

                setPdfPreparadoUrl((prev) => {
                    if (prev) {
                        URL.revokeObjectURL(prev);
                    }

                    return pdfResult.url;
                });

                setPdfPreparadoNombre(pdfResult.fileName);
            } catch (error) {
                console.error("Error preparando PDF automático", error);
            } finally {
                setPdfPreparando(false);
            }
        })();
    }, [
        activeTab,
        empresa,
        mes,
        ano,
        fetchDetalleDte,
        limpiarPdfPreparado,
    ]);

    return (
        <div className="min-h-screen bg-slate-50 px-3 py-4 sm:px-5 lg:px-6">
            <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">
                {/* Header RCV */}
                <div className="overflow-hidden rounded-3xl border border-cyan-200 bg-cyan-50/30 shadow-sm">
                    <div className="px-4 py-5 text-slate-900 sm:px-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-200">
                                        Registro de Compras y Ventas
                                    </span>

                                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
                                        {tipoLabel}
                                    </span>
                                </div>

                                <h1 className="mt-3 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                                    Facturas SII
                                </h1>

                                <p className="mt-1 max-w-2xl text-sm text-slate-600">
                                    Registro de Compras y Ventas — datos en tiempo real desde el SII.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                                <div className="rounded-2xl border border-cyan-200 bg-white px-4 py-3 shadow-sm">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-600">
                                        Empresa
                                    </p>
                                    <p className="mt-1 text-sm font-black text-slate-900">{empresaLabel}</p>
                                </div>

                                <div className="rounded-2xl border border-cyan-200 bg-white px-4 py-3 shadow-sm">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-600">
                                        Periodo
                                    </p>
                                    <p className="mt-1 text-sm font-black text-slate-900">{periodoLabel}</p>
                                </div>

                                <div className="col-span-2 grid grid-cols-2 gap-2 sm:col-span-1 sm:flex sm:items-center">
                                    <button
                                        type="button"
                                        onClick={handleActualizar}
                                        disabled={isBusy}
                                        title="Actualizar vista"
                                        aria-label="Actualizar vista"
                                        className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-300 bg-white px-4 text-sm font-bold text-cyan-700 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-11 sm:px-0"
                                    >
                                        <ReloadOutlined className={isBusy ? "animate-spin text-lg" : "text-lg"} />

                                        <span className="sm:hidden">
                                            Actualizar
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handleConsultarSii}
                                        disabled={isBusy}
                                        title="Consultar SII / BaseAPI"
                                        aria-label="Consultar SII / BaseAPI"
                                        className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-300 bg-cyan-600 px-4 text-sm font-bold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                    >
                                        <CloudSyncOutlined className={isBusy ? "animate-pulse text-lg" : "text-lg"} />

                                        <span>
                                            {isBusy ? "Consultando..." : "Consultar SII"}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-cyan-100 bg-white/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <div className="flex rounded-2xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
                            {(["documentos", "dashboard"] as const).map((tab) => (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => setMainTab(tab)}
                                    className={`rounded-xl px-4 py-2 text-sm font-bold transition ${mainTab === tab
                                        ? "bg-cyan-600 text-white shadow-sm"
                                        : "text-slate-600 hover:bg-cyan-50 hover:text-cyan-700"
                                        }`}
                                >
                                    {tab === "documentos" ? "Documentos RCV" : "Dashboard RCV"}
                                </button>
                            ))}
                        </div>

                        <p className="text-xs text-slate-500">
                            {documentos.length > 0
                                ? `${documentos.length} documentos cargados para ${periodoLabel}`
                                : "Selecciona filtros y consulta el periodo"}
                        </p>
                    </div>
                </div>

                {/* Toast */}
                {toast && (
                    <div className={`rounded-xl border p-4 text-sm ${toast.type === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700"}`}>
                        {toast.message}
                    </div>
                )}

                {/* Filtros */}
                <div className="rounded-3xl border border-cyan-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="text-sm font-bold text-slate-900">
                                Filtros de consulta
                            </h2>
                            <p className="text-xs text-slate-500">
                                Define el periodo, empresa y tipo de movimiento tributario.
                            </p>
                        </div>

                        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                            {tipoLabel} · {periodoLabel}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <div>
                            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                Tipo RCV
                            </label>

                            <select
                                value={activeTab}
                                onChange={(e) => setActiveTab(e.target.value as TabRCV)}
                                className="h-10 w-full rounded-xl border border-cyan-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                            >
                                <option value="ventas">Ventas</option>
                                {!isCliente && <option value="compras">Compras</option>}
                            </select>
                        </div>

                        {!isCliente && (
                            <div>
                                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                    Empresa
                                </label>

                                <select
                                    value={empresa}
                                    onChange={(e) => setEmpresa(e.target.value as EmpresaKey)}
                                    className="h-10 w-full rounded-xl border border-cyan-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                                >
                                    <option value="econnet">ECONNET</option>
                                    <option value="rids">RIDS</option>
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                Mes
                            </label>

                            <select
                                value={mes}
                                onChange={(e) => setMes(e.target.value)}
                                className="h-10 w-full rounded-xl border border-cyan-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                            >
                                {MESES.map((nombre, index) => {
                                    const value = String(index + 1).padStart(2, "0");
                                    return (
                                        <option key={value} value={value}>
                                            {nombre}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                Año
                            </label>

                            <input
                                value={ano}
                                onChange={(e) => setAno(e.target.value)}
                                className="h-10 w-full rounded-xl border border-cyan-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                            />
                        </div>

                        <div className="flex items-end gap-2">
                            <button
                                type="button"
                                onClick={handleActualizar}
                                disabled={isBusy}
                                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-cyan-300 bg-white px-4 text-sm font-bold text-cyan-700 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
                                title="Mes actual: consulta BaseAPI. Meses anteriores: usa cache."
                            >
                                <ReloadOutlined className={isBusy ? "animate-spin" : ""} />
                                {isBusy ? "Consultando..." : "Consultar"}
                            </button>

                            <button
                                type="button"
                                onClick={handleConsultarSii}
                                disabled={isBusy}
                                title="Forzar actualización desde SII/BaseAPI"
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300 bg-cyan-600 text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <CloudSyncOutlined className={isBusy ? "animate-pulse" : ""} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tab: Documentos */}
                {mainTab === "documentos" && (
                    <>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {[
                                {
                                    label: "Documentos",
                                    value: documentos.length,
                                    helper: "Registros encontrados",
                                    icon: <FileTextOutlined />,
                                    tone: "bg-slate-50 text-slate-700",
                                },
                                {
                                    label: "Neto",
                                    value: formatCLP(totalNeto),
                                    helper: "Base imponible",
                                    icon: <BarChartOutlined />,
                                    tone: "bg-cyan-50 text-cyan-700",
                                },
                                {
                                    label: "IVA",
                                    value: formatCLP(totalIVA),
                                    helper: "Impuesto asociado",
                                    icon: <PercentageOutlined />,
                                    tone: "bg-indigo-50 text-indigo-700",
                                },
                                {
                                    label: "Total",
                                    value: formatCLP(totalBruto),
                                    helper: "Monto bruto del periodo",
                                    icon: <DollarOutlined />,
                                    tone: "bg-slate-900 text-white",
                                },
                            ].map(({ label, value, helper, icon, tone }) => (
                                <div
                                    key={label}
                                    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                                {label}
                                            </p>

                                            <p className="mt-2 truncate text-2xl font-black text-slate-900">
                                                {value}
                                            </p>

                                            <p className="mt-1 text-xs text-slate-500">
                                                {helper}
                                            </p>
                                        </div>

                                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-black ${tone}`}>
                                            {icon}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <DocumentosRcvTable
                            documentosFiltrados={documentosFiltrados}
                            documentosLength={documentos.length}
                            loading={loading}
                            activeTab={activeTab}
                            busqueda={busqueda}
                            onBusquedaChange={setBusqueda}
                            onSelectDocumento={handleSeleccionarDocumento}
                        />

                        {resumenPorTipo.length > 0 && (
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <h2 className="mb-4 text-lg font-bold text-slate-900">Resumen por tipo</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[900px] text-left text-sm">
                                        <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                                            <tr>
                                                <th className="px-3 py-3">Documento</th>
                                                <th className="px-3 py-3">Código</th>
                                                <th className="px-3 py-3 text-right">Cantidad</th>
                                                <th className="px-3 py-3 text-right">Neto</th>
                                                <th className="px-3 py-3 text-right">IVA</th>
                                                <th className="px-3 py-3 text-right">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {resumenPorTipo.map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-3 py-3 font-medium text-slate-700">{item.tipoDocumento ?? "—"}</td>
                                                    <td className="px-3 py-3 text-slate-500">{item.codigoTipoDoc ?? "—"}</td>
                                                    <td className="px-3 py-3 text-right text-slate-700">{item.totalDocumentos ?? 0}</td>
                                                    <td className="px-3 py-3 text-right text-slate-700">{formatCLP(item.montoNeto)}</td>
                                                    <td className="px-3 py-3 text-right text-slate-700">{formatCLP(item.montoIva)}</td>
                                                    <td className="px-3 py-3 text-right font-bold text-slate-900">{formatCLP(item.montoTotal)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <DetalleBaseApiModal
                            documento={documentoSeleccionado}
                            activeTab={activeTab}
                            empresa={empresa}
                            mes={mes}
                            ano={ano}
                            onClose={() => {
                                setDocumentoSeleccionado(null);
                                setDetalleDte(null);
                                setDetalleError("");
                                limpiarPdfPreparado();
                            }}
                            onConsultarDte={fetchDetalleDte}
                            detalleDte={detalleDte}
                            detalleLoading={detalleLoading}
                            detalleError={detalleError}
                            pdfPreparando={pdfPreparando}
                            pdfPreparadoUrl={pdfPreparadoUrl}
                            pdfPreparadoNombre={pdfPreparadoNombre}
                        />
                    </>
                )}

                {/* Tab: Dashboard */}
                {mainTab === "dashboard" && (
                    <>
                        {dashboardLoading && (
                            <div className="py-12 text-center text-sm text-slate-400">Cargando dashboard...</div>
                        )}
                        {dashboardError && !dashboardLoading && (
                            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                {dashboardError}
                            </div>
                        )}
                        {dashboardData && !dashboardLoading && (
                            <>
                                {!dashboardData.exists && (
                                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                                        No hay datos en cache para este período. Consulta primero desde la pestaña Documentos RCV.
                                    </div>
                                )}
                                {dashboardData.exists && (
                                    <DashboardCharts data={dashboardData} activeTab={activeTab} />
                                )}
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default FacturasBaseapi;