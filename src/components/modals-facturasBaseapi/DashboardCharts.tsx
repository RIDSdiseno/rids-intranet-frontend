import React, { useEffect, useRef } from "react";

import type { DashboardData, TabRCV } from "./types";
import { formatCLP } from "./utils";
import DashboardKpiCard from "./DashboardKpiCard";

declare const Chart: any;

const CHART_COLORS = {
    blue: "#185FA5",
    teal: "#1D9E75",
    coral: "#D85A30",
    amber: "#BA7517",
    purple: "#534AB7",
    pink: "#D4537E",
};

const TIPO_COLORS = [
    CHART_COLORS.blue,
    CHART_COLORS.teal,
    CHART_COLORS.coral,
    CHART_COLORS.amber,
    CHART_COLORS.purple,
    CHART_COLORS.pink,
];

function loadChartJs(): Promise<void> {
    return new Promise((resolve) => {
        if (typeof Chart !== "undefined") {
            resolve();
            return;
        }

        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
        script.onload = () => resolve();
        document.head.appendChild(script);
    });
}

const DashboardCharts: React.FC<{
    data: DashboardData;
    activeTab: TabRCV;
}> = ({ data, activeTab }) => {
    const diaRef = useRef<HTMLCanvasElement>(null);
    const tipoRef = useRef<HTMLCanvasElement>(null);
    const chartDiaRef = useRef<any>(null);
    const chartTipoRef = useRef<any>(null);

    useEffect(() => {
        loadChartJs().then(() => {
            // Destruir instancias anteriores
            if (chartDiaRef.current) { chartDiaRef.current.destroy(); chartDiaRef.current = null; }
            if (chartTipoRef.current) { chartTipoRef.current.destroy(); chartTipoRef.current = null; }

            // Gráfico 1: monto por día (línea)
            if (diaRef.current && data.porDia.length > 0) {
                const labels = data.porDia.map((d) => d.fecha.slice(5)); // "05-01"
                const valores = data.porDia.map((d) => d.montoTotal);
                const promedio = valores.reduce((a, b) => a + b, 0) / (valores.length || 1);

                chartDiaRef.current = new Chart(diaRef.current, {
                    type: "line",
                    data: {
                        labels,
                        datasets: [
                            {
                                label: "Total diario",
                                data: valores,
                                borderColor: CHART_COLORS.blue,
                                backgroundColor: "rgba(24,95,165,0.08)",
                                fill: true,
                                tension: 0.4,
                                pointRadius: 3,
                                pointHoverRadius: 5,
                                borderWidth: 2,
                            },
                            {
                                label: "Promedio",
                                data: labels.map(() => promedio),
                                borderColor: CHART_COLORS.teal,
                                borderDash: [5, 4],
                                borderWidth: 1.5,
                                pointRadius: 0,
                                fill: false,
                            },
                        ],
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: (ctx: any) => " " + formatCLP(ctx.parsed.y),
                                },
                            },
                        },
                        scales: {
                            x: {
                                ticks: { font: { size: 10 }, autoSkip: true, maxTicksLimit: 12, maxRotation: 0 },
                                grid: { display: false },
                            },
                            y: {
                                ticks: {
                                    font: { size: 10 },
                                    callback: (v: any) => {
                                        const n = Number(v);
                                        if (n >= 1_000_000) return "$" + Math.round(n / 1_000_000) + "M";
                                        if (n >= 1_000) return "$" + Math.round(n / 1_000) + "K";
                                        return formatCLP(n);
                                    },
                                },
                                grid: { color: "rgba(128,128,128,0.1)" },
                            },
                        },
                    },
                });
            }

            // Gráfico 2: por tipo de documento (barras horizontales)
            if (tipoRef.current && data.porTipoDocumento.length > 0) {
                const tipos = data.porTipoDocumento.slice(0, 6);
                chartTipoRef.current = new Chart(tipoRef.current, {
                    type: "bar",
                    data: {
                        labels: tipos.map((t) =>
                            t.tipoDocumento.length > 22 ? t.tipoDocumento.slice(0, 22) + "…" : t.tipoDocumento
                        ),
                        datasets: [
                            {
                                label: "Total",
                                data: tipos.map((t) => t.montoTotal),
                                backgroundColor: tipos.map((_, i) => TIPO_COLORS[i % TIPO_COLORS.length]),
                                borderRadius: 4,
                                borderSkipped: false,
                            },
                        ],
                    },
                    options: {
                        indexAxis: "y" as const,
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: (ctx: any) => " " + formatCLP(ctx.parsed.x),
                                },
                            },
                        },
                        scales: {
                            x: {
                                ticks: {
                                    font: { size: 10 },
                                    callback: (v: any) => {
                                        const n = Number(v);
                                        if (n >= 1_000_000) return "$" + Math.round(n / 1_000_000) + "M";
                                        if (n >= 1_000) return "$" + Math.round(n / 1_000) + "K";
                                        return String(n);
                                    },
                                },
                                grid: { color: "rgba(128,128,128,0.1)" },
                            },
                            y: {
                                ticks: { font: { size: 10 } },
                                grid: { display: false },
                            },
                        },
                    },
                });
            }
        });

        return () => {
            if (chartDiaRef.current) { chartDiaRef.current.destroy(); chartDiaRef.current = null; }
            if (chartTipoRef.current) { chartTipoRef.current.destroy(); chartTipoRef.current = null; }
        };
    }, [data]);

    const contraparte = activeTab === "ventas" ? "clientes" : "proveedores";
    const maxMonto = Math.max(...data.topContrapartesMonto.map((c) => c.montoTotal), 1);
    const maxCant = Math.max(...data.topContrapartesCantidad.map((c) => c.cantidad), 1);

    return (
        <div className="space-y-5">
            {/* Origen de datos */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                <span className="font-semibold text-slate-800">Origen de datos:</span>
                {data.cacheUpdatedAt ? (
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        Cache local
                    </span>
                ) : (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        BaseAPI
                    </span>
                )}
                {data.cacheUpdatedAt && (
                    <span className="text-xs text-slate-400">
                        Actualizado: {new Date(data.cacheUpdatedAt).toLocaleString("es-CL")}
                    </span>
                )}
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
                <DashboardKpiCard title="Documentos" value={data.kpis.totalDocumentos} />
                <DashboardKpiCard title="Neto" value={formatCLP(data.kpis.montoNeto)} />
                <DashboardKpiCard title="IVA" value={formatCLP(data.kpis.montoIva)} />
                <DashboardKpiCard
                    title="Total"
                    value={formatCLP(data.kpis.montoTotal)}
                    delta={data.kpis.deltaPctVsMesAnterior}
                />
                <DashboardKpiCard title="Promedio" value={formatCLP(data.kpis.promedioDocumento)} />
                <DashboardKpiCard
                    title={activeTab === "ventas" ? "Clientes" : "Proveedores"}
                    value={data.kpis.contrapartesUnicas}
                />
            </div>

            {/* Gráficos principales */}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {/* Línea de tiempo diaria */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-1 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-700">Monto total por día</h2>
                    </div>
                    <div className="mb-3 flex gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                            <span className="inline-block h-2 w-4 rounded" style={{ background: CHART_COLORS.blue }} />
                            Total diario
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="inline-block h-px w-4 border-t-2 border-dashed" style={{ borderColor: CHART_COLORS.teal }} />
                            Promedio
                        </span>
                    </div>
                    {data.porDia.length > 0 ? (
                        <div style={{ position: "relative", height: 200 }}>
                            <canvas
                                ref={diaRef}
                                role="img"
                                aria-label="Gráfico de línea con monto total diario"
                            >
                                Monto total por día del período.
                            </canvas>
                        </div>
                    ) : (
                        <p className="py-8 text-center text-sm text-slate-400">Sin datos de fechas disponibles.</p>
                    )}
                </div>

                {/* Distribución por tipo */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-1 text-sm font-semibold text-slate-700">Distribución por tipo de documento</h2>
                    <div className="mb-3 flex flex-wrap gap-3 text-xs text-slate-500">
                        {data.porTipoDocumento.slice(0, 6).map((t, i) => (
                            <span key={t.tipoDocumento} className="flex items-center gap-1">
                                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: TIPO_COLORS[i % TIPO_COLORS.length] }} />
                                {t.tipoDocumento}
                            </span>
                        ))}
                    </div>
                    {data.porTipoDocumento.length > 0 ? (
                        <div style={{ position: "relative", height: Math.max(160, data.porTipoDocumento.slice(0, 6).length * 40 + 40) }}>
                            <canvas
                                ref={tipoRef}
                                role="img"
                                aria-label="Gráfico de barras horizontales por tipo de documento"
                            >
                                Distribución por tipo de documento.
                            </canvas>
                        </div>
                    ) : (
                        <p className="py-8 text-center text-sm text-slate-400">Sin datos de tipos disponibles.</p>
                    )}
                </div>
            </div>

            {/* Tablas de top contrapartes */}
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {/* Top por monto */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-4 text-sm font-semibold text-slate-700">
                        Top {contraparte} por monto
                    </h2>
                    <div className="space-y-3">
                        {data.topContrapartesMonto.map((row, i) => {
                            const pct = Math.round((row.montoTotal / maxMonto) * 100);
                            return (
                                <div key={row.rut} className="flex items-center gap-3">
                                    <span className="w-4 shrink-0 text-xs text-slate-400">{i + 1}</span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate text-xs font-medium text-slate-800" title={row.nombre}>{row.nombre}</span>
                                            <span className="shrink-0 text-xs font-semibold text-slate-900">{formatCLP(row.montoTotal)}</span>
                                        </div>
                                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: CHART_COLORS.blue }} />
                                        </div>
                                        <span className="text-xs text-slate-400">{row.rut} · {row.cantidad} doc{row.cantidad !== 1 ? "s" : ""}</span>
                                    </div>
                                </div>
                            );
                        })}
                        {data.topContrapartesMonto.length === 0 && (
                            <p className="py-4 text-center text-sm text-slate-400">Sin datos.</p>
                        )}
                    </div>
                </div>

                {/* Top por cantidad */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-4 text-sm font-semibold text-slate-700">
                        Top {contraparte} por cantidad
                    </h2>
                    <div className="space-y-3">
                        {data.topContrapartesCantidad.map((row, i) => {
                            const pct = Math.round((row.cantidad / maxCant) * 100);
                            return (
                                <div key={row.rut} className="flex items-center gap-3">
                                    <span className="w-4 shrink-0 text-xs text-slate-400">{i + 1}</span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate text-xs font-medium text-slate-800" title={row.nombre}>{row.nombre}</span>
                                            <span className="shrink-0 text-xs font-semibold text-slate-900">{row.cantidad} docs</span>
                                        </div>
                                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: CHART_COLORS.teal }} />
                                        </div>
                                        <span className="text-xs text-slate-400">{row.rut} · {formatCLP(row.montoTotal)}</span>
                                    </div>
                                </div>
                            );
                        })}
                        {data.topContrapartesCantidad.length === 0 && (
                            <p className="py-4 text-center text-sm text-slate-400">Sin datos.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Tabla distribución por fecha */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-semibold text-slate-700">Distribución por fecha</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                            <tr>
                                <th className="px-3 py-3">Fecha</th>
                                <th className="px-3 py-3 text-right">Documentos</th>
                                <th className="px-3 py-3 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data.porDia.map((row) => (
                                <tr key={row.fecha}>
                                    <td className="px-3 py-2 font-medium text-slate-800">{row.fecha}</td>
                                    <td className="px-3 py-2 text-right text-slate-700">{row.cantidad}</td>
                                    <td className="px-3 py-2 text-right font-semibold text-slate-900">{formatCLP(row.montoTotal)}</td>
                                </tr>
                            ))}
                            {data.porDia.length === 0 && (
                                <tr><td colSpan={3} className="px-3 py-8 text-center text-slate-400">Sin datos.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DashboardCharts;