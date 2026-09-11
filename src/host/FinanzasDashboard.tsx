import React, {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    BarChart3,
    CheckCircle2,
    Clock3,
    DollarSign,
    RefreshCw,
    ShoppingCart,
    TriangleAlert,
} from "lucide-react";

import {
    api,
} from "../api/api";

import FinanzasKpiCard from "../components/modals-facturasBaseapi/finanzas/FinanzasKpiCard";
import FinanzasChart from "../components/modals-facturasBaseapi/finanzas/FinanzasChart";

import type {
    EmpresaFinanzas,
    FinanzasChartTab,
    FinanzasDashboardData,
    FinanzasDashboardResponse,
    FinanzasVentaMode,
} from "../components/modals-facturasBaseapi/finanzas/finanzas.types";

/* =========================================================
   HELPERS
========================================================= */

function formatCLP(
    value: number
) {
    return new Intl.NumberFormat(
        "es-CL",
        {
            style:
                "currency",

            currency:
                "CLP",

            maximumFractionDigits:
                0,
        }
    ).format(
        value
    );
}

function formatFechaHora(
    value:
        string |
        null |
        undefined
) {
    if (!value) {
        return "—";
    }

    const date =
        new Date(
            value
        );

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
            timeZone:
                "America/Santiago",

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
        date
    );
}

/* =========================================================
   COMPONENTE
========================================================= */

const FinanzasDashboard:
    React.FC = () => {
        const now =
            new Date();

        const [
            empresa,
            setEmpresa,
        ] =
            useState<
                EmpresaFinanzas
            >(
                "econnet"
            );

        const [
            ano,
            setAno,
        ] =
            useState(
                now
                    .getFullYear()
            );

        const [
            data,
            setData,
        ] =
            useState<
                FinanzasDashboardData |
                null
            >(
                null
            );

        const [
            loading,
            setLoading,
        ] =
            useState(
                false
            );

        const [
            error,
            setError,
        ] =
            useState(
                ""
            );

        const [
            activeTab,
            setActiveTab,
        ] =
            useState<
                FinanzasChartTab
            >(
                "ventas"
            );

        const [
            ventaMode,
            setVentaMode,
        ] =
            useState<
                FinanzasVentaMode
            >(
                "bruta"
            );

        /* =====================================================
           FETCH
        ===================================================== */

        const cargarDashboard =
            useCallback(
                async () => {
                    setLoading(
                        true
                    );

                    setError(
                        ""
                    );

                    try {
                        const response =
                            await api.get<
                                FinanzasDashboardResponse
                            >(
                                "/baseapi/finanzas/dashboard",
                                {
                                    params: {
                                        empresa,
                                        ano,
                                    },
                                }
                            );

                        setData(
                            response
                                .data
                                .data
                        );
                    } catch (
                    err: any
                    ) {
                        console.error(
                            "Error cargando dashboard finanzas:",
                            err
                        );

                        const message =
                            err
                                ?.response
                                ?.data
                                ?.error ??
                            err
                                ?.response
                                ?.data
                                ?.message ??
                            err
                                ?.message ??
                            "No se pudo cargar el dashboard financiero.";

                        setError(
                            String(
                                message
                            )
                        );
                    } finally {
                        setLoading(
                            false
                        );
                    }
                },
                [
                    empresa,
                    ano,
                ]
            );

        useEffect(
            () => {
                void cargarDashboard();
            },
            [
                cargarDashboard,
            ]
        );

        const resumen =
            data
                ?.resumen;

        const mesesDisponibles =
            useMemo(
                () =>
                    data
                        ?.mesesConCache
                        ?.length ??
                    0,
                [
                    data,
                ]
            );

        const mesesComprasDisponibles =
            useMemo(
                () =>
                    data
                        ?.mesesConCompras
                        ?.length ??
                    0,
                [
                    data,
                ]
            );

        /* =====================================================
           RENDER
        ===================================================== */

        return (
            <div className="min-h-screen bg-slate-50 px-3 py-4 sm:px-5 lg:px-6">
                <div className="mx-auto w-full max-w-[1800px] space-y-4">

                    {/* HEADER */}

                    <div className="overflow-hidden rounded-3xl border border-cyan-200 bg-cyan-50/30 shadow-sm">
                        <div className="px-4 py-5 sm:px-6">

                            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

                                <div className="min-w-0">

                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-200">
                                            Administración Finanzas
                                        </span>

                                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                                            Año {ano}
                                        </span>
                                    </div>

                                    <h1 className="mt-3 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                                        Resumen financiero
                                    </h1>

                                    <p className="mt-1 max-w-2xl text-sm text-slate-600">
                                        Visualiza facturación, vencimientos, pagos conciliados y actividad de cobranza.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[180px_130px_auto]">

                                    <div>
                                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                            Empresa
                                        </label>

                                        <select
                                            value={
                                                empresa
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setEmpresa(
                                                    e
                                                        .target
                                                        .value as EmpresaFinanzas
                                                )
                                            }
                                            className="h-11 w-full rounded-xl border border-cyan-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                                        >
                                            <option value="econnet">
                                                ECONNET
                                            </option>

                                            <option value="rids">
                                                RIDS
                                            </option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                            Año
                                        </label>

                                        <input
                                            type="number"
                                            min={2020}
                                            max={2100}
                                            value={
                                                ano
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setAno(
                                                    Number(
                                                        e
                                                            .target
                                                            .value
                                                    )
                                                )
                                            }
                                            className="h-11 w-full rounded-xl border border-cyan-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                                        />
                                    </div>

                                    <div className="flex items-end">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                void cargarDashboard()
                                            }
                                            disabled={
                                                loading
                                            }
                                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 text-sm font-bold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            <RefreshCw
                                                size={
                                                    16
                                                }
                                                className={
                                                    loading
                                                        ? "animate-spin"
                                                        : ""
                                                }
                                            />

                                            {loading
                                                ? "Actualizando..."
                                                : "Actualizar"}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-cyan-100 pt-3 text-xs text-slate-500">

                                <span>
                                    Última actualización:{" "}
                                    <strong className="text-slate-700">
                                        {formatFechaHora(
                                            data
                                                ?.ultimaActualizacion
                                        )}
                                    </strong>
                                </span>

                                <span>
                                    Meses con datos:{" "}
                                    <strong className="text-slate-700">
                                        {mesesDisponibles}
                                    </strong>
                                </span>

                                <span>
                                    Meses con compras:{" "}
                                    <strong className="text-slate-700">
                                        {mesesComprasDisponibles}
                                    </strong>
                                </span>

                                <span>
                                    Recordatorios enviados:{" "}
                                    <strong className="text-slate-700">
                                        {resumen
                                            ?.recordatoriosEnviados ??
                                            0}
                                    </strong>
                                </span>

                            </div>
                        </div>
                    </div>

                    {/* ERROR */}

                    {error && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                            {error}
                        </div>
                    )}

                    {/* KPIs */}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">

                        <FinanzasKpiCard
                            label="Facturado"
                            value={
                                formatCLP(
                                    resumen
                                        ?.montoFacturado ??
                                    0
                                )
                            }
                            helper={`${resumen?.totalDocumentos ?? 0} documentos emitidos`}
                            icon={
                                <DollarSign
                                    size={
                                        20
                                    }
                                />
                            }
                            tone="cyan"
                        />

                        <FinanzasKpiCard
                            label="Compras"
                            value={
                                formatCLP(
                                    resumen
                                        ?.montoCompras ??
                                    0
                                )
                            }
                            helper={`${resumen?.totalDocumentosCompras ?? 0} documentos recibidos`}
                            icon={
                                <ShoppingCart
                                    size={
                                        20
                                    }
                                />
                            }
                            tone="cyan"
                        />

                        <FinanzasKpiCard
                            label="Por vencer"
                            value={
                                formatCLP(
                                    resumen
                                        ?.montoPorVencer ??
                                    0
                                )
                            }
                            helper={`${resumen?.documentosPorVencer ?? 0} documentos pendientes`}
                            icon={
                                <Clock3
                                    size={
                                        20
                                    }
                                />
                            }
                            tone="amber"
                        />

                        <FinanzasKpiCard
                            label="Vencido"
                            value={
                                formatCLP(
                                    resumen
                                        ?.montoVencido ??
                                    0
                                )
                            }
                            helper={`${resumen?.documentosVencidos ?? 0} documentos vencidos`}
                            icon={
                                <TriangleAlert
                                    size={
                                        20
                                    }
                                />
                            }
                            tone="red"
                        />

                        <FinanzasKpiCard
                            label="Pagado"
                            value={
                                formatCLP(
                                    resumen
                                        ?.montoPagado ??
                                    0
                                )
                            }
                            helper={`${resumen?.documentosPagados ?? 0} documentos conciliados`}
                            icon={
                                <CheckCircle2
                                    size={
                                        20
                                    }
                                />
                            }
                            tone="emerald"
                        />

                    </div>

                    {/* PANEL PRINCIPAL */}

                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

                        <div className="border-b border-slate-100 p-4 sm:p-5">

                            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

                                <div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
                                            <BarChart3
                                                size={
                                                    18
                                                }
                                            />
                                        </div>

                                        <div>
                                            <h2 className="text-base font-black text-slate-900">
                                                Evolución financiera
                                            </h2>

                                            <p className="text-xs text-slate-500">
                                                Comparación mensual del año seleccionado.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1">

                                    {(
                                        [
                                            {
                                                id:
                                                    "ventas",

                                                label:
                                                    "Ventas",
                                            },
                                            {
                                                id: "compras",
                                                label: "Compras",
                                            },
                                            {
                                                id:
                                                    "pagos",

                                                label:
                                                    "Pagos",
                                            },
                                            {
                                                id:
                                                    "recordatorios",

                                                label:
                                                    "Recordatorios",
                                            },
                                            {
                                                id:
                                                    "vencimientos",

                                                label:
                                                    "Vencimientos",
                                            },
                                        ] as const
                                    ).map(
                                        (
                                            tab
                                        ) => (
                                            <button
                                                key={
                                                    tab.id
                                                }
                                                type="button"
                                                onClick={() =>
                                                    setActiveTab(
                                                        tab.id
                                                    )
                                                }
                                                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${activeTab ===
                                                    tab.id
                                                    ? "bg-white text-cyan-700 shadow-sm"
                                                    : "text-slate-500 hover:text-slate-800"
                                                    }`}
                                            >
                                                {
                                                    tab.label
                                                }
                                            </button>
                                        )
                                    )}

                                </div>
                            </div>

                            {(
                                activeTab === "ventas" ||
                                activeTab === "compras"
                            ) && (
                                    <div className="mt-4 flex justify-center">
                                        <div className="flex rounded-xl bg-slate-100 p-1">

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setVentaMode(
                                                        "bruta"
                                                    )
                                                }
                                                className={`rounded-lg px-4 py-2 text-xs font-bold transition ${ventaMode ===
                                                    "bruta"
                                                    ? "bg-white text-slate-900 shadow-sm"
                                                    : "text-slate-500"
                                                    }`}
                                            >
                                                {activeTab === "ventas"
                                                    ? "Venta bruta"
                                                    : "Compra bruta"}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setVentaMode(
                                                        "neta"
                                                    )
                                                }
                                                className={`rounded-lg px-4 py-2 text-xs font-bold transition ${ventaMode ===
                                                    "neta"
                                                    ? "bg-white text-slate-900 shadow-sm"
                                                    : "text-slate-500"
                                                    }`}
                                            >
                                                {activeTab === "ventas"
                                                    ? "Venta neta"
                                                    : "Compra neta"}
                                            </button>

                                        </div>
                                    </div>
                                )}
                        </div>

                        <div className="p-4 sm:p-5">

                            {loading &&
                                !data ? (
                                <div className="flex h-[420px] items-center justify-center text-sm text-slate-400">
                                    Cargando dashboard...
                                </div>
                            ) : (
                                <FinanzasChart
                                    data={
                                        data
                                            ?.meses ??
                                        []
                                    }
                                    activeTab={
                                        activeTab
                                    }
                                    ventaMode={
                                        ventaMode
                                    }
                                />
                            )}

                        </div>
                    </div>
                </div>
            </div>
        );
    };

export default FinanzasDashboard;