import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    getTeamViewerMonthlyAverages,
    getTeamViewerMonthlyBreakdown,
    type TeamViewerMonthlyAverageRow,
    type TeamViewerMonthlyBreakdownRow,
} from "../../lib/mantencionesRemotasApi";
import Chart from "chart.js/auto";

type LoadState = "idle" | "loading" | "error";

function formatMinutesToHours(minutes: number) {
    const total = Number(minutes || 0);
    const hours = Math.floor(total / 60);
    const mins = Math.round(total % 60);
    return `${hours}h ${mins}m`;
}

function fmtNum(n: number) {
    return new Intl.NumberFormat("es-CL").format(Math.round(n));
}

type Props = { active: boolean };

export default function MantencionesDashboardTab({ active }: Props) {
    const [state, setState] = useState<LoadState>("idle");
    const [err, setErr] = useState<string | null>(null);
    const [items, setItems] = useState<TeamViewerMonthlyAverageRow[]>([]);
    const [monthlyItems, setMonthlyItems] = useState<TeamViewerMonthlyBreakdownRow[]>([]);
    const [summary, setSummary] = useState({
        empresas: 0,
        totalSesiones: 0,
        totalMinutos: 0,
        totalHoras: 0,
    });
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [selectedEmpresa, setSelectedEmpresa] = useState<string>("TODAS");

    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    async function load() {
        setState("loading");
        setErr(null);
        setSelectedEmpresa("TODAS");
        try {
            const [averagesResp, breakdownResp] = await Promise.all([
                getTeamViewerMonthlyAverages({ fromDate: fromDate || undefined, toDate: toDate || undefined }),
                getTeamViewerMonthlyBreakdown({ fromDate: fromDate || undefined, toDate: toDate || undefined }),
            ]);
            setItems(averagesResp.items ?? []);
            setMonthlyItems(breakdownResp.items ?? []);
            setSummary(averagesResp.summary ?? { empresas: 0, totalSesiones: 0, totalMinutos: 0, totalHoras: 0 });
            setState("idle");
        } catch (e: unknown) {
            setState("error");
            setErr(e instanceof Error ? e.message : "No se pudieron cargar las estadísticas");
        }
    }

    useEffect(() => {
        if (!active) return;
        void load();
    }, [active]);

    const empresasUnicas = useMemo(() => {
        return [...new Set(monthlyItems.map((r) => r.empresa))].sort();
    }, [monthlyItems]);

    const empresaColorMap = useMemo(() => {
        const map = new Map<string, string>();

        const todasLasEmpresas = [
            ...new Set([
                ...items.map((r) => r.empresa),
                ...monthlyItems.map((r) => r.empresa),
            ])
        ].sort();

        const total = todasLasEmpresas.length;

        todasLasEmpresas.forEach((emp, idx) => {
            // Alternar saturación y luminosidad para más variedad visual
            const hue = Math.round((idx * 360) / total);
            const sat = idx % 2 === 0 ? 65 : 55;
            const lum = idx % 3 === 0 ? 42 : idx % 3 === 1 ? 48 : 38;
            map.set(emp, `hsl(${hue}, ${sat}%, ${lum}%)`);
        });

        return map;
    }, [items, monthlyItems]);

    const monthlyFiltrado = useMemo(() => {
        if (selectedEmpresa === "TODAS") return monthlyItems;
        return monthlyItems.filter((r) => r.empresa === selectedEmpresa);
    }, [monthlyItems, selectedEmpresa]);

    useEffect(() => {
        if (!chartRef.current || state !== "idle") return;

        const byMonth: Record<string, number> = {};
        monthlyFiltrado.forEach((row) => {
            const mes = row.mes ?? "?";
            byMonth[mes] = (byMonth[mes] ?? 0) + Number(row.minutos_mes || 0);
        });

        const labels = Object.keys(byMonth);
        const data = labels.map((m) => Math.round(byMonth[m]));

        const barColor = selectedEmpresa === "TODAS"
            ? "#378ADD"
            : (empresaColorMap.get(selectedEmpresa) ?? "#378ADD");

        if (chartInstance.current) chartInstance.current.destroy();

        chartInstance.current = new Chart(chartRef.current, {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Minutos",
                    data,
                    backgroundColor: barColor,
                    borderRadius: 4,
                    borderSkipped: false,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const y = Number(ctx.parsed.y ?? 0);
                                return ` ${fmtNum(y)} min (${formatMinutesToHours(y)})`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 11 }, autoSkip: false, maxRotation: 45 },
                    },
                    y: {
                        grid: { color: "rgba(128,128,128,0.1)" },
                        ticks: { font: { size: 11 }, callback: (v) => fmtNum(Number(v)) },
                    },
                },
            },
        });

        return () => { chartInstance.current?.destroy(); };
    }, [monthlyFiltrado, state, selectedEmpresa, empresaColorMap]);

    const rankingData = useMemo(() => {
        const maxMin = Math.max(...items.map((r) => Number(r.promedio_minutos_mes || 0)), 1);
        const totalMin = items.reduce((acc, r) => acc + Number(r.promedio_minutos_mes || 0), 0);
        const totalSes = items.reduce((acc, r) => acc + Number(r.promedio_sesiones_mes || 0), 0);
        return { maxMin, totalMin, totalSes };
    }, [items]);

    return (
        <div className="space-y-4">

            {/* ── Filtros ── */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">Desde</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-gray-500">Hasta</label>
                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        onClick={() => void load()}
                        disabled={state === "loading"}
                        className="rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        {state === "loading" ? "Cargando..." : "Aplicar"}
                    </button>
                </div>
            </div>

            {/* ── Métricas ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                {[
                    { label: "Empresas", value: fmtNum(summary.empresas) },
                    { label: "Total sesiones", value: fmtNum(summary.totalSesiones) },
                    { label: "Total minutos", value: fmtNum(summary.totalMinutos) },
                    { label: "Total horas", value: fmtNum(summary.totalHoras) },
                    {
                        label: "Prom. min/mes",
                        value: fmtNum(items.reduce((acc, r) => acc + Number(r.promedio_minutos_mes || 0), 0)),
                        sub: "por empresa",
                    },
                ].map((m) => (
                    <div key={m.label} className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                        <div className="text-xs text-gray-500 mb-1">{m.label}</div>
                        <div className="text-2xl font-medium text-gray-900">{m.value}</div>
                        {m.sub && <div className="text-xs text-gray-400 mt-0.5">{m.sub}</div>}
                    </div>
                ))}
            </div>

            {/* ── Error ── */}
            {state === "error" && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {err ?? "No se pudieron cargar las estadísticas."}
                </div>
            )}

            {/* ── Gráfico mensual ── */}
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-800">Minutos por mes</span>
                    <div className="flex items-center gap-2">
                        <select
                            value={selectedEmpresa}
                            onChange={(e) => setSelectedEmpresa(e.target.value)}
                            className="text-xs rounded-lg border border-gray-200 bg-white px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="TODAS">Todas las empresas</option>
                            {empresasUnicas.map((emp) => (
                                <option key={emp} value={emp}>{emp}</option>
                            ))}
                        </select>
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            {[...new Set(monthlyFiltrado.map((r) => r.mes))].length} meses
                        </span>
                    </div>
                </div>

                {/* Leyenda de empresas clickeable */}
                {state === "idle" && selectedEmpresa === "TODAS" && empresasUnicas.length > 0 && (
                    <div className="flex flex-wrap gap-3 px-5 pt-3 pb-1">
                        {empresasUnicas.map((emp) => (
                            <span
                                key={emp}
                                className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer hover:text-gray-800 transition-colors"
                                onClick={() => setSelectedEmpresa(emp)}
                            >
                                <span
                                    style={{ backgroundColor: empresaColorMap.get(emp) }}
                                    className="w-2 h-2 rounded-full shrink-0"
                                />
                                {emp}
                            </span>
                        ))}
                    </div>
                )}

                {/* Indicador empresa seleccionada */}
                {state === "idle" && selectedEmpresa !== "TODAS" && (
                    <div className="flex items-center gap-2 px-5 pt-3 pb-1">
                        <span
                            style={{ backgroundColor: empresaColorMap.get(selectedEmpresa) }}
                            className="w-2 h-2 rounded-full shrink-0"
                        />
                        <span className="text-xs text-gray-600 font-medium">{selectedEmpresa}</span>
                        <button
                            onClick={() => setSelectedEmpresa("TODAS")}
                            className="text-xs text-gray-400 hover:text-gray-700 underline ml-1"
                        >
                            ver todas
                        </button>
                    </div>
                )}

                <div className="p-4">
                    {state === "loading" ? (
                        <div className="h-48 flex items-center justify-center text-sm text-gray-400">
                            Cargando...
                        </div>
                    ) : monthlyItems.length === 0 ? (
                        <div className="h-48 flex items-center justify-center text-sm text-gray-400">
                            Sin datos para el período seleccionado
                        </div>
                    ) : (
                        <div style={{ position: "relative", height: 220 }}>
                            <canvas ref={chartRef} />
                        </div>
                    )}
                </div>
            </div>

            {/* ── Ranking ── */}
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-800">Ranking por empresa</span>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {items.length} empresas
                    </span>
                </div>

                {state === "loading" && (
                    <div className="p-6 text-sm text-gray-400">Cargando...</div>
                )}

                {state === "idle" && items.length === 0 && (
                    <div className="p-6 text-sm text-gray-400">Sin datos para el período seleccionado.</div>
                )}

                {state === "idle" && items.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-xs">
                                    <th className="text-left px-5 py-3 font-medium">Empresa</th>
                                    <th className="text-left px-5 py-3 font-medium">Prom. sesiones/mes</th>
                                    <th className="text-left px-5 py-3 font-medium">Prom. minutos/mes</th>
                                    <th className="text-left px-5 py-3 font-medium w-48">Distribución</th>
                                    <th className="text-left px-5 py-3 font-medium">Equivalente</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((row, idx) => {
                                    const minutos = Number(row.promedio_minutos_mes || 0);
                                    const pct = rankingData.totalMin > 0
                                        ? Math.round((minutos / rankingData.totalMin) * 100)
                                        : 0;
                                    const barWidth = rankingData.maxMin > 0
                                        ? Math.round((minutos / rankingData.maxMin) * 100)
                                        : 0;
                                  const color = empresaColorMap.get(row.empresa) ?? "#888780";

                                    return (
                                        <tr
                                            key={row.id_empresa}
                                            className="border-t border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                                            onClick={() => setSelectedEmpresa(row.empresa)}
                                        >
                                            <td className="px-5 py-3 font-medium text-gray-900">
                                                <span className="flex items-center gap-2">
                                                    <span
                                                        style={{ backgroundColor: color }}
                                                        className="w-2 h-2 rounded-full shrink-0"
                                                    />
                                                    {row.empresa}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3 text-gray-700">
                                                {fmtNum(Number(row.promedio_sesiones_mes))}
                                            </td>
                                            <td className="px-5 py-3 text-gray-700">
                                                {fmtNum(minutos)}
                                            </td>
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-12">
                                                        <div
                                                            style={{ width: `${barWidth}%`, backgroundColor: color }}
                                                            className="h-full rounded-full"
                                                        />
                                                    </div>
                                                    <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-gray-700">
                                                {formatMinutesToHours(minutos)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-gray-200 bg-gray-50">
                                    <td className="px-5 py-3 font-medium text-gray-900">Total</td>
                                    <td className="px-5 py-3 font-medium text-gray-900">
                                        {fmtNum(rankingData.totalSes)}
                                    </td>
                                    <td className="px-5 py-3 font-medium text-gray-900">
                                        {fmtNum(rankingData.totalMin)}
                                    </td>
                                    <td className="px-5 py-3" />
                                    <td className="px-5 py-3 font-medium text-gray-900">
                                        {formatMinutesToHours(rankingData.totalMin)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Detalle mensual ── */}
            {state === "idle" && monthlyItems.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-800">Detalle mensual por empresa</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-xs">
                                    <th className="text-left px-5 py-3 font-medium">Empresa</th>
                                    <th className="text-left px-5 py-3 font-medium">Mes</th>
                                    <th className="text-left px-5 py-3 font-medium">Sesiones</th>
                                    <th className="text-left px-5 py-3 font-medium">Minutos</th>
                                    <th className="text-left px-5 py-3 font-medium">Horas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthlyItems.map((row, idx) => (
                                    <tr
                                        key={`${row.id_empresa}-${row.mes}-${idx}`}
                                        className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                                    >
                                        <td className="px-5 py-3 font-medium text-gray-900">
                                            <span className="flex items-center gap-2">
                                                <span
                                                    style={{ backgroundColor: empresaColorMap.get(row.empresa) ?? "#888" }}
                                                    className="w-2 h-2 rounded-full shrink-0"
                                                />
                                                {row.empresa}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3 text-gray-700">{row.mes}</td>
                                        <td className="px-5 py-3 text-gray-700">
                                            {fmtNum(Number(row.sesiones_mes))}
                                        </td>
                                        <td className="px-5 py-3 text-gray-700">
                                            {fmtNum(Number(row.minutos_mes))}
                                        </td>
                                        <td className="px-5 py-3 text-gray-700">
                                            {formatMinutesToHours(Number(row.minutos_mes))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}