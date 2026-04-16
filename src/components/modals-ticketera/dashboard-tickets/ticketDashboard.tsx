import React, { useEffect, useMemo, useRef, useState } from "react";
import { DatePicker } from "antd";
import dayjs from "dayjs";
import Chart from "chart.js/auto";
import {
    getTicketsDashboardMonthly,
    getTicketsDashboardRanking,
    type TicketMonthlyRow,
    type TicketRankingRow,
    type TicketRankingSummary,
} from "./ticketDashboardApi";

import type { TooltipItem } from "chart.js";

const { RangePicker } = DatePicker;

type LoadState = "idle" | "loading" | "error";

function fmtNum(n: number) {
    return new Intl.NumberFormat("es-CL").format(Math.round(n));
}

function formatMinutes(min: number) {
    if (!min) return "—";
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function strHash(s: string) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
}

function empresaColor(nombre: string, total: number, idx: number) {
    const hue = Math.round((idx * 360) / Math.max(total, 1));
    const sat = idx % 2 === 0 ? 65 : 55;
    const lum = idx % 3 === 0 ? 42 : idx % 3 === 1 ? 48 : 38;
    return `hsl(${hue}, ${sat}%, ${lum}%)`;
}

export default function TicketsDashboardPage() {
    const [state, setState] = useState<LoadState>("idle");
    const [err, setErr] = useState<string | null>(null);
    const [monthly, setMonthly] = useState<TicketMonthlyRow[]>([]);
    const [ranking, setRanking] = useState<TicketRankingRow[]>([]);
    const [summary, setSummary] = useState<TicketRankingSummary>({
        totalEmpresas: 0, totalTickets: 0, totalHoras: 0, totalComplejos: 0,
    });
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [selectedEmpresa, setSelectedEmpresa] = useState("TODAS");
    const [expandedEmpresa, setExpandedEmpresa] = useState<string | null>(null);

    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);

    // Mapa de colores por empresa
    const colorMap = useMemo(() => {
        const map = new Map<string, string>();
        const empresas = [...new Set(ranking.map((r) => r.empresa))].sort();
        empresas.forEach((emp, idx) => {
            map.set(emp, empresaColor(emp, empresas.length, idx));
        });
        return map;
    }, [ranking]);

    async function load() {
        setState("loading");
        setErr(null);
        try {
            const [monthlyResp, rankingResp] = await Promise.all([
                getTicketsDashboardMonthly({
                    fromDate: fromDate || undefined,
                    toDate: toDate || undefined,
                }),
                getTicketsDashboardRanking({
                    fromDate: fromDate || undefined,
                    toDate: toDate || undefined,
                }),
            ]);
            setMonthly(monthlyResp.items ?? []);
            setRanking(rankingResp.items ?? []);
            setSummary(rankingResp.summary ?? { totalEmpresas: 0, totalTickets: 0, totalHoras: 0, totalComplejos: 0 });
            setState("idle");
        } catch (e) {
            setState("error");
            setErr(e instanceof Error ? e.message : "Error cargando datos");
        }
    }

    useEffect(() => { void load(); }, []);

    // Datos filtrados para el gráfico
    const monthlyFiltrado = useMemo(() => {
        if (selectedEmpresa === "TODAS") return monthly;
        return monthly.filter((r) => r.empresa === selectedEmpresa);
    }, [monthly, selectedEmpresa]);

    // Agrupar por empresa para detalle expandible
    const monthlyGrouped = useMemo(() => {
        const map = new Map<string, TicketMonthlyRow[]>();
        monthly.forEach((r) => {
            const current = map.get(r.empresa) ?? [];
            current.push(r);
            map.set(r.empresa, current);
        });
        return map;
    }, [monthly]);

    // Empresas únicas para selector
    const empresasUnicas = useMemo(() => {
        return [...new Set(monthly.map((r) => r.empresa))].sort();
    }, [monthly]);

    // ── Gráfico ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!chartRef.current || state !== "idle") return;

        // Agrupar por mes
        const byMonth: Record<string, { tickets: number; horas: number }> = {};
        monthlyFiltrado.forEach((r) => {
            if (!byMonth[r.mes]) byMonth[r.mes] = { tickets: 0, horas: 0 };
            byMonth[r.mes].tickets += r.total_tickets;
            byMonth[r.mes].horas += r.horas_cap8h;
        });

        const labels = Object.keys(byMonth).sort();
        const tickets = labels.map((m) => byMonth[m].tickets);
        const horas = labels.map((m) => byMonth[m].horas);

        const barColor = selectedEmpresa === "TODAS"
            ? "#3B82F6"
            : (colorMap.get(selectedEmpresa) ?? "#3B82F6");

        if (chartInstance.current) chartInstance.current.destroy();

        chartInstance.current = new Chart(chartRef.current, {
            type: "bar",
            data: {
                labels,
                datasets: [
                    {
                        label: "Tickets",
                        data: tickets,
                        backgroundColor: barColor,
                        borderRadius: 4,
                        yAxisID: "y",
                    },
                    {
                        label: "Horas (cap 8h)",
                        data: horas,
                        type: "line" as any,
                        borderColor: "#F59E0B",
                        backgroundColor: "rgba(245,158,11,0.1)",
                        tension: 0.3,
                        yAxisID: "y1",
                        pointRadius: 4,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                plugins: {
                    legend: {
                        display: true,
                        position: "top",
                        labels: { font: { size: 11 } },
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx: TooltipItem<"bar" | "line">) => {
                                const y = ctx.parsed.y ?? 0;

                                if (ctx.dataset.label === "Horas (cap 8h)") {
                                    return ` ${y.toFixed(1)} horas estimadas`;
                                }

                                return ` ${y} tickets`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { font: { size: 11 }, maxRotation: 45 },
                    },
                    y: {
                        position: "left",
                        grid: { color: "rgba(128,128,128,0.1)" },
                        ticks: { font: { size: 11 } },
                        title: { display: true, text: "Tickets", font: { size: 11 } },
                    },
                    y1: {
                        position: "right",
                        grid: { drawOnChartArea: false },
                        ticks: { font: { size: 11 } },
                        title: { display: true, text: "Horas", font: { size: 11 } },
                    },
                },
            }
        });

        return () => { chartInstance.current?.destroy(); };
    }, [monthlyFiltrado, state, selectedEmpresa, colorMap]);

    const maxHoras = Math.max(...ranking.map((r) => r.horas_cap8h), 1);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

                {/* ── Header ── */}
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Dashboard de Tickets
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Métricas de soporte por empresa — Ticketera RIDS
                    </p>
                </div>

                {/* ── Filtros ── */}
                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-gray-500">Período</label>
                            <RangePicker
                                value={[
                                    fromDate ? dayjs(fromDate) : null,
                                    toDate ? dayjs(toDate) : null,
                                ]}
                                onChange={(dates) => {
                                    setFromDate(dates?.[0] ? dates[0].startOf("day").toISOString() : "");
                                    setToDate(dates?.[1] ? dates[1].endOf("day").toISOString() : "");
                                }}
                                format="DD/MM/YYYY"
                                allowClear
                                placeholder={["Desde", "Hasta"]}
                                presets={[
                                    { label: "Este mes", value: [dayjs().startOf("month"), dayjs().endOf("month")] },
                                    { label: "Mes anterior", value: [dayjs().subtract(1, "month").startOf("month"), dayjs().subtract(1, "month").endOf("month")] },
                                    { label: "Últimos 3 meses", value: [dayjs().subtract(3, "month").startOf("month"), dayjs().endOf("month")] },
                                    { label: "Últimos 6 meses", value: [dayjs().subtract(6, "month").startOf("month"), dayjs().endOf("month")] },
                                ]}
                            />
                        </div>
                        <button
                            onClick={() => void load()}
                            disabled={state === "loading"}
                            className="rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            {state === "loading" ? "Cargando..." : "Aplicar"}
                        </button>
                        {(fromDate || toDate) && (
                            <button
                                onClick={() => { setFromDate(""); setToDate(""); setTimeout(() => void load(), 0); }}
                                className="text-xs text-gray-400 hover:text-gray-600 underline"
                            >
                                Limpiar
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Error ── */}
                {state === "error" && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {err ?? "Error cargando datos."}
                    </div>
                )}

                {/* ── KPI Cards ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: "Empresas activas", value: fmtNum(summary.totalEmpresas), sub: "con tickets" },
                        { label: "Total tickets", value: fmtNum(summary.totalTickets), sub: "período seleccionado" },
                        { label: "Horas estimadas", value: `${fmtNum(summary.totalHoras)}h`, sub: "cap 8h por ticket" },
                        { label: "Tickets complejos", value: fmtNum(summary.totalComplejos), sub: "> 8h de resolución" },
                    ].map((m) => (
                        <div key={m.label} className="rounded-xl bg-white border border-gray-200 p-4">
                            <div className="text-xs text-gray-500 mb-1">{m.label}</div>
                            <div className="text-2xl font-semibold text-gray-900">{m.value}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{m.sub}</div>
                        </div>
                    ))}
                </div>

                {/* ── Gráfico ── */}
                <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                        <div>
                            <span className="text-sm font-medium text-gray-800">
                                Tickets y horas por mes
                            </span>
                            <span className="ml-2 text-xs text-gray-400">
                                Barras = tickets · Línea = horas estimadas
                            </span>
                        </div>
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
                            {selectedEmpresa !== "TODAS" && (
                                <button
                                    onClick={() => setSelectedEmpresa("TODAS")}
                                    className="text-xs text-gray-400 hover:text-gray-600 underline"
                                >
                                    ver todas
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Leyenda clickeable */}
                    {state === "idle" && selectedEmpresa === "TODAS" && empresasUnicas.length > 0 && (
                        <div className="flex flex-wrap gap-3 px-5 pt-3 pb-1">
                            {empresasUnicas.map((emp) => (
                                <span
                                    key={emp}
                                    onClick={() => setSelectedEmpresa(emp)}
                                    className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer hover:text-gray-800 transition-colors"
                                >
                                    <span
                                        style={{ backgroundColor: colorMap.get(emp) }}
                                        className="w-2 h-2 rounded-full shrink-0"
                                    />
                                    {emp}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="p-4">
                        {state === "loading" ? (
                            <div className="h-56 flex items-center justify-center text-sm text-gray-400">
                                Cargando...
                            </div>
                        ) : monthly.length === 0 ? (
                            <div className="h-56 flex items-center justify-center text-sm text-gray-400">
                                Sin datos para el período seleccionado
                            </div>
                        ) : (
                            <div style={{ position: "relative", height: 240 }}>
                                <canvas ref={chartRef} />
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Ranking ── */}
                <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-800">
                            Ranking por empresa
                        </span>
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            {ranking.length} empresas
                        </span>
                    </div>

                    {state === "loading" && (
                        <div className="p-6 text-sm text-gray-400">Cargando...</div>
                    )}

                    {state === "idle" && ranking.length === 0 && (
                        <div className="p-6 text-sm text-gray-400">Sin datos para el período.</div>
                    )}

                    {state === "idle" && ranking.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-500 text-xs">
                                        <th className="text-left px-5 py-3 font-medium">Empresa</th>
                                        <th className="text-right px-5 py-3 font-medium">Tickets</th>
                                        <th className="text-right px-5 py-3 font-medium">Cerrados</th>
                                        <th className="text-right px-5 py-3 font-medium">Horas est.</th>
                                        <th className="text-right px-5 py-3 font-medium">% ≤ 8h</th>
                                        <th className="text-right px-5 py-3 font-medium">Mediana</th>
                                        <th className="text-right px-5 py-3 font-medium">Complejos</th>
                                        <th className="px-5 py-3 font-medium w-40">Distribución</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ranking.map((row) => {
                                        const color = colorMap.get(row.empresa) ?? "#888";
                                        const barWidth = Math.round((row.horas_cap8h / maxHoras) * 100);
                                        const isOpen = expandedEmpresa === row.empresa;
                                        const detalle = monthlyGrouped.get(row.empresa) ?? [];

                                        return (
                                            <React.Fragment key={row.id_empresa}>
                                                <tr
                                                    className="border-t border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                                                    onClick={() => setExpandedEmpresa(isOpen ? null : row.empresa)}
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
                                                    <td className="px-5 py-3 text-right text-gray-700">
                                                        {fmtNum(row.total_tickets)}
                                                    </td>
                                                    <td className="px-5 py-3 text-right text-gray-700">
                                                        {fmtNum(row.tickets_cerrados)}
                                                    </td>
                                                    <td className="px-5 py-3 text-right text-gray-700 font-medium">
                                                        {row.horas_cap8h.toFixed(1)}h
                                                    </td>
                                                    <td className="px-5 py-3 text-right">
                                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${row.pct_resueltos_8h >= 85
                                                            ? "bg-green-100 text-green-700"
                                                            : row.pct_resueltos_8h >= 70
                                                                ? "bg-yellow-100 text-yellow-700"
                                                                : "bg-red-100 text-red-700"
                                                            }`}>
                                                            {row.pct_resueltos_8h.toFixed(1)}%
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 text-right text-gray-700">
                                                        {formatMinutes(row.mediana_minutos)}
                                                    </td>
                                                    <td className="px-5 py-3 text-right text-gray-500">
                                                        {fmtNum(row.tickets_complejos)}
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-12">
                                                                <div
                                                                    style={{ width: `${barWidth}%`, backgroundColor: color }}
                                                                    className="h-full rounded-full"
                                                                />
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>

                                                {/* Detalle expandible por mes */}
                                                {isOpen && detalle.length > 0 && (
                                                    <tr className="bg-gray-50/60">
                                                        <td colSpan={8} className="px-5 pb-4">
                                                            <div className="mt-2 rounded-xl border border-gray-200 bg-white overflow-hidden">
                                                                <div className="px-4 py-3 border-b border-gray-100 text-sm font-medium text-gray-700">
                                                                    Detalle mensual — {row.empresa}
                                                                </div>
                                                                <div className="overflow-x-auto">
                                                                    <table className="min-w-full text-sm">
                                                                        <thead>
                                                                            <tr className="bg-gray-50 text-gray-500 text-xs">
                                                                                <th className="text-left px-4 py-2 font-medium">Mes</th>
                                                                                <th className="text-right px-4 py-2 font-medium">Tickets</th>
                                                                                <th className="text-right px-4 py-2 font-medium">Cerrados</th>
                                                                                <th className="text-right px-4 py-2 font-medium">Horas est.</th>
                                                                                <th className="text-right px-4 py-2 font-medium">% ≤ 8h</th>
                                                                                <th className="text-right px-4 py-2 font-medium">Mediana</th>
                                                                                <th className="text-right px-4 py-2 font-medium">Complejos</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {detalle
                                                                                .sort((a, b) => a.mes.localeCompare(b.mes))
                                                                                .map((d, idx) => (
                                                                                    <tr key={`${d.mes}-${idx}`} className="border-t border-gray-100">
                                                                                        <td className="px-4 py-2 text-gray-700">{d.mes}</td>
                                                                                        <td className="px-4 py-2 text-right text-gray-700">{fmtNum(d.total_tickets)}</td>
                                                                                        <td className="px-4 py-2 text-right text-gray-700">{fmtNum(d.tickets_cerrados)}</td>
                                                                                        <td className="px-4 py-2 text-right text-gray-700">{d.horas_cap8h.toFixed(1)}h</td>
                                                                                        <td className="px-4 py-2 text-right">
                                                                                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${d.pct_resueltos_8h >= 85 ? "bg-green-100 text-green-700"
                                                                                                : d.pct_resueltos_8h >= 70 ? "bg-yellow-100 text-yellow-700"
                                                                                                    : "bg-red-100 text-red-700"
                                                                                                }`}>
                                                                                                {d.pct_resueltos_8h.toFixed(1)}%
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="px-4 py-2 text-right text-gray-700">{formatMinutes(d.mediana_minutos)}</td>
                                                                                        <td className="px-4 py-2 text-right text-gray-500">{fmtNum(d.tickets_complejos)}</td>
                                                                                    </tr>
                                                                                ))}
                                                                        </tbody>
                                                                        <tfoot>
                                                                            <tr className="border-t-2 border-gray-200 bg-gray-50">
                                                                                <td className="px-4 py-2 font-medium text-gray-900">Total</td>
                                                                                <td className="px-4 py-2 text-right font-medium text-gray-900">
                                                                                    {fmtNum(detalle.reduce((a, d) => a + d.total_tickets, 0))}
                                                                                </td>
                                                                                <td className="px-4 py-2 text-right font-medium text-gray-900">
                                                                                    {fmtNum(detalle.reduce((a, d) => a + d.tickets_cerrados, 0))}
                                                                                </td>
                                                                                <td className="px-4 py-2 text-right font-medium text-gray-900">
                                                                                    {detalle.reduce((a, d) => a + d.horas_cap8h, 0).toFixed(1)}h
                                                                                </td>
                                                                                <td className="px-4 py-2" />
                                                                                <td className="px-4 py-2" />
                                                                                <td className="px-4 py-2 text-right font-medium text-gray-900">
                                                                                    {fmtNum(detalle.reduce((a, d) => a + d.tickets_complejos, 0))}
                                                                                </td>
                                                                            </tr>
                                                                        </tfoot>
                                                                    </table>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                                        <td className="px-5 py-3 font-medium text-gray-900">Total</td>
                                        <td className="px-5 py-3 text-right font-medium text-gray-900">
                                            {fmtNum(summary.totalTickets)}
                                        </td>
                                        <td className="px-5 py-3 text-right font-medium text-gray-900">
                                            {fmtNum(ranking.reduce((a, r) => a + r.tickets_cerrados, 0))}
                                        </td>
                                        <td className="px-5 py-3 text-right font-medium text-gray-900">
                                            {summary.totalHoras.toFixed(1)}h
                                        </td>
                                        <td className="px-5 py-3" />
                                        <td className="px-5 py-3" />
                                        <td className="px-5 py-3 text-right font-medium text-gray-900">
                                            {fmtNum(summary.totalComplejos)}
                                        </td>
                                        <td className="px-5 py-3" />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>

                {/* Nota metodológica */}
                <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs text-gray-400">
                    Horas estimadas calculadas con cap de 8h por ticket para excluir períodos de espera prolongados.
                    Mediana calculada solo sobre tickets resueltos en menos de 8h.
                    % ≤ 8h: verde ≥ 85%, amarillo ≥ 70%, rojo &lt; 70%.
                </div>

            </div>
        </div>
    );
}