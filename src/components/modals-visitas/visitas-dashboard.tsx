import React, { useEffect, useRef, useState } from "react";
import { Modal } from "antd";
import Chart from "chart.js/auto";
import { api } from "../../api/api";

type DashboardData = {
    kpis: {
        totalVisitas: number;
        totalJornadas: number;
        completadas: number;
        pendientes: number;
        canceladas: number;
        diasConVisitas: number;
        totalMinutos: number;
        totalHoras: number;
        promedioMinutosPorJornada: number;
        promedioHorasPorDia: number;
        maximaDuracionMinutos: number;
    };
    charts: {
        porMes: { mes: string; label?: string; visitas: number; minutos: number }[];
        porDia: { fecha: string; visitas: number; minutos: number }[];
        porTecnico: {
            tecnico: string;
            visitas: number;
            minutos: number;
            horas: number;
            diasConVisitas: number;
            meses: {
                mes: string;
                jornadas: number;
                minutos: number;
                horas: number;
                diasConVisitas: number;
            }[];
        }[];
        porEmpresa: {
            nombre: string;
            jornadas: number;
            minutos: number;
            horas: number;
            diasConVisitas: number;
            meses: {
                mes: string;
                jornadas: number;
                minutos: number;
                horas: number;
                diasConVisitas: number;
            }[];
        }[];
    };
};

type Props = {
    open: boolean;
    onClose: () => void;
    items: any[];
    loading?: boolean;
    inline?: boolean;
};

function KpiCard({ title, value, sub }: { title: string; value: string | number; sub?: string }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">{title}</div>
            <div className="mt-2 text-3xl font-bold text-slate-800">{value}</div>
            {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
        </div>
    );
}

function formatMinutes(min: number) {
    if (!min) return "—";
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function DashboardContent() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [vistaGrafico, setVistaGrafico] = useState<"mes" | "dia">("mes");
    const [triggerLoad, setTriggerLoad] = useState(0);

    const [expandedEmpresa, setExpandedEmpresa] = useState<string | null>(null);

    const [expandedTecnico, setExpandedTecnico] = useState<string | null>(null);

    const chartRefMes = useRef<HTMLCanvasElement>(null);
    const chartRefDia = useRef<HTMLCanvasElement>(null);
    const chartInstanceMes = useRef<Chart | null>(null);
    const chartInstanceDia = useRef<Chart | null>(null);

    async function load() {
        if (fromDate && toDate && fromDate > toDate) {
            setError("La fecha 'Desde' no puede ser mayor que 'Hasta'.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const { data: resp } = await api.get("/visitas/dashboard", {
                params: {
                    ...(fromDate ? { fromDate: new Date(fromDate).toISOString() } : {}),
                    ...(toDate ? { toDate: new Date(toDate + "T23:59:59").toISOString() } : {}),
                },
            });
            setData(resp);
        } catch (e) {
            console.error(e);
            setError("No se pudo cargar el dashboard. Intenta nuevamente.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { void load(); }, [triggerLoad]);

    // Gráfico por mes
    useEffect(() => {
        if (!chartRefMes.current || !data || loading) return;
        if (chartInstanceMes.current) chartInstanceMes.current.destroy();

        chartInstanceMes.current = new Chart(chartRefMes.current, {
            type: "bar",
            data: {
                labels: data.charts.porMes.map((r) => r.label ?? r.mes),
                datasets: [
                    {
                        label: "Visitas presenciales",
                        data: data.charts.porMes.map((r) => r.visitas),
                        backgroundColor: "#0891b2",
                        borderRadius: 4,
                        yAxisID: "y",
                    },
                    {
                        label: "Minutos",
                        data: data.charts.porMes.map((r) => r.minutos),
                        type: "line" as any,
                        borderColor: "#f59e0b",
                        tension: 0.3,
                        yAxisID: "y1",
                        pointRadius: 4,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: true, position: "top" } },
                scales: {
                    x: { grid: { display: false }, ticks: { maxRotation: 45 } },
                    y: { position: "left", title: { display: true, text: "Visitas presenciales" } },
                    y1: { position: "right", grid: { drawOnChartArea: false }, title: { display: true, text: "Minutos" } },
                },
            },
        });

        return () => { chartInstanceMes.current?.destroy(); };
    }, [data, loading]);

    // Gráfico por día
    useEffect(() => {
        if (!chartRefDia.current || !data || loading) return;
        if (chartInstanceDia.current) chartInstanceDia.current.destroy();

        chartInstanceDia.current = new Chart(chartRefDia.current, {
            type: "bar",
            data: {
                labels: data.charts.porDia.map((r) => r.fecha),
                datasets: [
                    {
                        label: "Visitas presenciales",
                        data: data.charts.porDia.map((r) => r.visitas),
                        backgroundColor: "#6366f1",
                        borderRadius: 4,
                        yAxisID: "y",
                    },
                    {
                        label: "Minutos",
                        data: data.charts.porDia.map((r) => r.minutos),
                        type: "line" as any,
                        borderColor: "#f59e0b",
                        tension: 0.3,
                        yAxisID: "y1",
                        pointRadius: 3,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: true, position: "top" } },
                scales: {
                    x: { grid: { display: false }, ticks: { maxRotation: 45, font: { size: 10 } } },
                    y: { position: "left", title: { display: true, text: "Visitas presenciales" } },
                    y1: { position: "right", grid: { drawOnChartArea: false }, title: { display: true, text: "Minutos" } },
                },
            },
        });

        return () => { chartInstanceDia.current?.destroy(); };
    }, [data, loading]);

    const maxMinutosTecnico = data
        ? Math.max(...data.charts.porTecnico.map((r) => r.minutos), 1)
        : 1;

    return (
        <>
            {/* Filtros */}
            <div className="flex flex-wrap items-end gap-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500">Desde</label>
                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs text-slate-500">Hasta</label>
                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                    />
                </div>
                <button
                    onClick={() => setTriggerLoad((t) => t + 1)}
                    disabled={loading}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                    {loading ? "Cargando..." : "Aplicar"}
                </button>
                {(fromDate || toDate) && (
                    <button
                        onClick={() => {
                            setFromDate("");
                            setToDate("");
                            setTriggerLoad((t) => t + 1);
                        }}
                        className="text-xs text-slate-400 hover:text-slate-600 underline"
                    >
                        Limpiar
                    </button>
                )}
            </div>

            {/* Error */}
            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
                    {error}
                </div>
            )}

            {loading && (
                <div className="text-slate-500 py-8 text-center">Cargando dashboard...</div>
            )}

            {!loading && data && (
                <div className="space-y-6">

                    {/* KPIs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <KpiCard
                            title="Solicitantes atendidos"
                            value={data.kpis.totalVisitas}
                            sub="registros individuales"
                        />
                        <KpiCard
                            title="Visitas presenciales únicas"
                            value={data.kpis.totalJornadas}
                            sub="técnico + horario"
                        />
                        <KpiCard title="Completadas" value={data.kpis.completadas} />
                        <KpiCard title="Pendientes" value={data.kpis.pendientes} />
                        <KpiCard
                            title="Días con actividad"
                            value={data.kpis.diasConVisitas}
                            sub="días distintos con al menos 1 visita"
                        />
                        <KpiCard
                            title="Horas totales"
                            value={`${data.kpis.totalHoras} h`}
                            sub="sobre visitas presenciales únicas"
                        />
                        <KpiCard
                            title="Promedio por visita presencial"
                            value={formatMinutes(data.kpis.promedioMinutosPorJornada)}
                        />
                        <KpiCard
                            title="Promedio por día"
                            value={`${data.kpis.promedioHorasPorDia} h`}
                        />
                    </div>

                    {/* Gráficos con tabs */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-semibold text-slate-800">
                                {vistaGrafico === "mes"
                                    ? "Visitas presenciales por mes"
                                    : "Visitas presenciales por día"}
                            </span>
                            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                                <button
                                    onClick={() => setVistaGrafico("mes")}
                                    className={`px-3 py-1 text-xs rounded-md transition-all ${vistaGrafico === "mes"
                                        ? "bg-white text-cyan-700 shadow-sm font-medium"
                                        : "text-slate-500 hover:text-slate-700"
                                        }`}
                                >
                                    Por mes
                                </button>
                                <button
                                    onClick={() => setVistaGrafico("dia")}
                                    className={`px-3 py-1 text-xs rounded-md transition-all ${vistaGrafico === "dia"
                                        ? "bg-white text-cyan-700 shadow-sm font-medium"
                                        : "text-slate-500 hover:text-slate-700"
                                        }`}
                                >
                                    Por día
                                </button>
                            </div>
                        </div>

                        {/* Aviso gráfico con muchos días */}
                        {vistaGrafico === "dia" && data.charts.porDia.length > 60 && (
                            <div className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg mb-3 border border-amber-100">
                                Mostrando {data.charts.porDia.length} días. Considera filtrar por un rango más corto para mejor visualización.
                            </div>
                        )}

                        <div style={{ position: "relative", height: 260, display: vistaGrafico === "mes" ? "block" : "none" }}>
                            {data.charts.porMes.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-sm text-slate-400">
                                    Sin datos para el período seleccionado
                                </div>
                            ) : (
                                <canvas ref={chartRefMes} />
                            )}
                        </div>
                        <div style={{ position: "relative", height: 260, display: vistaGrafico === "dia" ? "block" : "none" }}>
                            {data.charts.porDia.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-sm text-slate-400">
                                    Sin datos para el período seleccionado
                                </div>
                            ) : (
                                <canvas ref={chartRefDia} />
                            )}
                        </div>
                    </div>

                    {/* Tabla por técnico */}
                    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                            <span className="text-sm font-semibold text-slate-800">Por técnico</span>
                            <span className="text-xs bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full">
                                {data.charts.porTecnico.length} técnicos
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50 text-slate-500 text-xs">
                                    <tr>
                                        <th className="text-left px-5 py-3">Técnico</th>
                                        <th className="text-right px-5 py-3">Salidas a terreno</th>
                                        <th className="text-right px-5 py-3">Días con visitas</th>
                                        <th className="text-right px-5 py-3">Minutos</th>
                                        <th className="text-right px-5 py-3">Horas</th>
                                        <th className="px-5 py-3 w-36">Distribución</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.charts.porTecnico.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-5 py-6 text-center text-sm text-slate-400">
                                                Sin datos para el período seleccionado
                                            </td>
                                        </tr>
                                    ) : (
                                        data.charts.porTecnico.map((row) => {
                                            const isOpen = expandedTecnico === row.tecnico;
                                            return (
                                                <React.Fragment key={row.tecnico}>
                                                    {/* Fila principal */}
                                                    <tr
                                                        className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                                                        onClick={() => setExpandedTecnico(isOpen ? null : row.tecnico)}
                                                    >
                                                        <td className="px-5 py-3 font-medium text-slate-800">
                                                            <span className="flex items-center gap-2">
                                                                <span className={`text-slate-400 text-xs transition-transform duration-200 inline-block ${isOpen ? "rotate-90" : ""}`}>
                                                                    ▶
                                                                </span>
                                                                {row.tecnico}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3 text-right text-slate-700">{row.visitas}</td>
                                                        <td className="px-5 py-3 text-right text-slate-700">{row.diasConVisitas}</td>
                                                        <td className="px-5 py-3 text-right text-slate-700">{row.minutos}</td>
                                                        <td className="px-5 py-3 text-right text-slate-700 font-medium">{row.horas} h</td>
                                                        <td className="px-5 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-12">
                                                                    <div
                                                                        style={{ width: `${Math.round((row.minutos / maxMinutosTecnico) * 100)}%` }}
                                                                        className="h-full bg-cyan-500 rounded-full"
                                                                    />
                                                                </div>
                                                                <span className="text-xs text-slate-400 w-8 text-right">
                                                                    {Math.round((row.minutos / maxMinutosTecnico) * 100)}%
                                                                </span>
                                                            </div>
                                                        </td>
                                                    </tr>

                                                    {/* Detalle mensual expandible */}
                                                    {isOpen && (
                                                        <tr className="bg-slate-50/60">
                                                            <td colSpan={6} className="px-5 pb-4">
                                                                <div className="mt-2 rounded-xl border border-slate-200 bg-white overflow-hidden">
                                                                    <div className="px-4 py-2 border-b border-slate-100 text-xs font-medium text-slate-500 bg-slate-50">
                                                                        Detalle mensual — {row.tecnico}
                                                                    </div>
                                                                    <table className="min-w-full text-sm">
                                                                        <thead>
                                                                            <tr className="bg-slate-50 text-slate-500 text-xs">
                                                                                <th className="text-left px-4 py-2 font-medium">Mes</th>
                                                                                <th className="text-right px-4 py-2 font-medium">Salidas a terreno</th>
                                                                                <th className="text-right px-4 py-2 font-medium">Días con visitas</th>
                                                                                <th className="text-right px-4 py-2 font-medium">Minutos</th>
                                                                                <th className="text-right px-4 py-2 font-medium">Horas</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {row.meses.map((mes) => (
                                                                                <tr key={mes.mes} className="border-t border-slate-100">
                                                                                    <td className="px-4 py-2 text-slate-700">{mes.mes}</td>
                                                                                    <td className="px-4 py-2 text-right text-slate-700">{mes.jornadas}</td>
                                                                                    <td className="px-4 py-2 text-right text-slate-700">{mes.diasConVisitas}</td>
                                                                                    <td className="px-4 py-2 text-right text-slate-700">{mes.minutos}</td>
                                                                                    <td className="px-4 py-2 text-right text-slate-700 font-medium">{mes.horas} h</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                        <tfoot>
                                                                            <tr className="border-t-2 border-slate-200 bg-slate-50">
                                                                                <td className="px-4 py-2 font-medium text-slate-900">Total</td>
                                                                                <td className="px-4 py-2 text-right font-medium text-slate-900">{row.visitas}</td>
                                                                                <td className="px-4 py-2 text-right font-medium text-slate-900">{row.diasConVisitas}</td>
                                                                                <td className="px-4 py-2 text-right font-medium text-slate-900">{row.minutos}</td>
                                                                                <td className="px-4 py-2 text-right font-medium text-slate-900">{row.horas} h</td>
                                                                            </tr>
                                                                        </tfoot>
                                                                    </table>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })
                                    )}
                                </tbody>
                                {data.charts.porTecnico.length > 0 && (
                                    <tfoot>
                                        <tr className="border-t-2 border-slate-200 bg-slate-50">
                                            <td className="px-5 py-3 font-medium text-slate-900">Total</td>
                                            <td className="px-5 py-3 text-right font-medium text-slate-900">
                                                {data.charts.porTecnico.reduce((a, r) => a + r.visitas, 0)}
                                            </td>
                                            <td className="px-5 py-3 text-right font-medium text-slate-900">
                                                {data.kpis.diasConVisitas}
                                            </td>
                                            <td className="px-5 py-3 text-right font-medium text-slate-900">
                                                {data.charts.porTecnico.reduce((a, r) => a + r.minutos, 0)}
                                            </td>
                                            <td className="px-5 py-3 text-right font-medium text-slate-900">
                                                {(data.charts.porTecnico.reduce((a, r) => a + r.minutos, 0) / 60).toFixed(1)} h
                                            </td>
                                            <td className="px-5 py-3" />
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>

                    {/* Tabla por empresa */}
                    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                            <span className="text-sm font-semibold text-slate-800">Por empresa</span>
                            <span className="text-xs bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full">
                                {data.charts.porEmpresa.length} empresas
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-50 text-slate-500 text-xs">
                                    <tr>
                                        <th className="text-left px-5 py-3">Empresa</th>
                                        <th className="text-right px-5 py-3">Visitas recibidas</th>
                                        <th className="text-right px-5 py-3">Días con visitas</th>
                                        <th className="text-right px-5 py-3">Minutos</th>
                                        <th className="text-right px-5 py-3">Horas</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.charts.porEmpresa.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-5 py-6 text-center text-sm text-slate-400">
                                                Sin datos para el período seleccionado
                                            </td>
                                        </tr>
                                    ) : (
                                        data.charts.porEmpresa.map((row) => {
                                            const isOpen = expandedEmpresa === row.nombre;
                                            return (
                                                <React.Fragment key={row.nombre}>
                                                    {/* Fila principal */}
                                                    <tr
                                                        className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                                                        onClick={() => setExpandedEmpresa(isOpen ? null : row.nombre)}
                                                    >
                                                        <td className="px-5 py-3 font-medium text-slate-800">
                                                            <span className="flex items-center gap-2">
                                                                <span className={`text-slate-400 text-xs transition-transform duration-200 inline-block ${isOpen ? "rotate-90" : ""}`}>
                                                                    ▶
                                                                </span>
                                                                {row.nombre}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3 text-right text-slate-700">{row.jornadas}</td>
                                                        <td className="px-5 py-3 text-right text-slate-700">{row.diasConVisitas}</td>
                                                        <td className="px-5 py-3 text-right text-slate-700">{row.minutos}</td>
                                                        <td className="px-5 py-3 text-right text-slate-700 font-medium">{row.horas} h</td>
                                                    </tr>

                                                    {/* Detalle mensual expandible */}
                                                    {isOpen && (
                                                        <tr className="bg-slate-50/60">
                                                            <td colSpan={5} className="px-5 pb-4">
                                                                <div className="mt-2 rounded-xl border border-slate-200 bg-white overflow-hidden">
                                                                    <div className="px-4 py-2 border-b border-slate-100 text-xs font-medium text-slate-500 bg-slate-50">
                                                                        Detalle mensual — {row.nombre}
                                                                    </div>
                                                                    <table className="min-w-full text-sm">
                                                                        <thead>
                                                                            <tr className="bg-slate-50 text-slate-500 text-xs">
                                                                                <th className="text-left px-4 py-2 font-medium">Mes</th>
                                                                                <th className="text-right px-4 py-2 font-medium">Visitas recibidas</th>
                                                                                <th className="text-right px-4 py-2 font-medium">Días con visitas</th>
                                                                                <th className="text-right px-4 py-2 font-medium">Minutos</th>
                                                                                <th className="text-right px-4 py-2 font-medium">Horas</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {row.meses.map((mes) => (
                                                                                <tr key={mes.mes} className="border-t border-slate-100">
                                                                                    <td className="px-4 py-2 text-slate-700">{mes.mes}</td>
                                                                                    <td className="px-4 py-2 text-right text-slate-700">{mes.jornadas}</td>
                                                                                    <td className="px-4 py-2 text-right text-slate-700">{mes.diasConVisitas}</td>
                                                                                    <td className="px-4 py-2 text-right text-slate-700">{mes.minutos}</td>
                                                                                    <td className="px-4 py-2 text-right text-slate-700 font-medium">{mes.horas} h</td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>
                                                                        <tfoot>
                                                                            <tr className="border-t-2 border-slate-200 bg-slate-50">
                                                                                <td className="px-4 py-2 font-medium text-slate-900">Total</td>
                                                                                <td className="px-4 py-2 text-right font-medium text-slate-900">{row.jornadas}</td>
                                                                                <td className="px-4 py-2 text-right font-medium text-slate-900">{row.diasConVisitas}</td>
                                                                                <td className="px-4 py-2 text-right font-medium text-slate-900">{row.minutos}</td>
                                                                                <td className="px-4 py-2 text-right font-medium text-slate-900">{row.horas} h</td>
                                                                            </tr>
                                                                        </tfoot>
                                                                    </table>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })
                                    )}
                                </tbody>
                                {/* Totales generales */}
                                {data.charts.porEmpresa.length > 0 && (
                                    <tfoot>
                                        <tr className="border-t-2 border-slate-200 bg-slate-50">
                                            <td className="px-5 py-3 font-medium text-slate-900">Total</td>
                                            <td className="px-5 py-3 text-right font-medium text-slate-900">
                                                {data.charts.porEmpresa.reduce((a, r) => a + r.jornadas, 0)}
                                            </td>
                                            <td className="px-5 py-3 text-right font-medium text-slate-900">
                                                {data.kpis.diasConVisitas}
                                            </td>
                                            <td className="px-5 py-3 text-right font-medium text-slate-900">
                                                {data.charts.porEmpresa.reduce((a, r) => a + r.minutos, 0)}
                                            </td>
                                            <td className="px-5 py-3 text-right font-medium text-slate-900">
                                                {data.kpis.totalHoras} h
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>

                </div>
            )}
        </>
    );
}

export function VisitasDashboardInline() {
    return <DashboardContent />;
}

export default function VisitasDashboardModal({ open, onClose, inline = false }: Props) {
    if (inline) return <DashboardContent />;

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width={1100}
            title="Dashboard de visitas"
        >
            <DashboardContent />
        </Modal>
    );
}