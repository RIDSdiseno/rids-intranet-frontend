import React from "react";
import type { ReporteGeneralData } from "./typesReportes";

type Props = {
    data: ReporteGeneralData;
    empresaNombre: string;
    periodoTexto: string;
};

const formatNumber = (value: number) => {
    return Number(value || 0).toLocaleString("es-CL");
};

const formatHoras = (value: number) => {
    return `${Number(value || 0).toFixed(1)}h`;
};

function getDuracionMinutos(inicio?: string | null, fin?: string | null) {
    if (!inicio || !fin) return 0;

    const start = new Date(inicio);
    const end = new Date(fin);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

    const diff = Math.round((end.getTime() - start.getTime()) / 60000);

    return diff > 0 ? diff : 0;
}

function SimpleBar({
    label,
    value,
    max,
}: {
    label: string;
    value: number;
    max: number;
}) {
    const width = max > 0 ? Math.max(8, Math.round((value / max) * 100)) : 0;

    return (
        <div>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-semibold text-slate-600">{label}</span>
                <span className="font-bold text-slate-800">{formatNumber(value)}</span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                    className="h-full rounded-full bg-cyan-600"
                    style={{ width: `${width}%` }}
                />
            </div>
        </div>
    );
}

export default function InformeResumenVisual({
    data,
    empresaNombre,
    periodoTexto,
}: Props) {
    const totalTickets = data.tickets?.length ?? 0;
    const totalEquipos = data.equipos?.length ?? 0;
    const totalVisitas = data.visitas?.length ?? 0;
    const totalSolicitantes = data.solicitantes?.length ?? 0;

    const dashboardMonthly = data.ticketDashboardMonthly ?? [];
    const tvBreakdown = data.teamViewerMonthlyBreakdown ?? [];

    const totalHorasTickets = dashboardMonthly.reduce(
        (acc, row: any) => acc + Number(row.horas_cap8h || 0),
        0
    );

    const totalMinutosTeamViewer = tvBreakdown.reduce(
        (acc, row: any) => acc + Number(row.minutos_mes || 0),
        0
    );

    const totalHorasTeamViewer = totalMinutosTeamViewer / 60;

    const totalMinutosVisitas = (data.visitas ?? []).reduce((acc: number, visita: any) => {
        return acc + getDuracionMinutos(visita.inicio, visita.fin);
    }, 0);

    const totalHorasVisitas = totalMinutosVisitas / 60;

    const horasTotalSoporte =
        totalHorasTickets + totalHorasTeamViewer + totalHorasVisitas;

    const ticketsCerrados = (data.tickets ?? []).filter((ticket: any) => {
        const status = String(ticket.status ?? "").toUpperCase();

        return (
            status === "CLOSED" ||
            status === "CERRADO" ||
            Boolean(ticket.closedAt) ||
            Boolean(ticket.resolvedAt)
        );
    }).length;

    const ticketsAbiertos = Math.max(0, totalTickets - ticketsCerrados);

    const topSolicitantesMap = new Map<string, number>();

    for (const ticket of data.tickets ?? []) {
        const nombre =
            (ticket as any).solicitante_email ||
            (ticket as any).requester?.email ||
            (ticket as any).assigneeNombre ||
            "Sin identificar";

        topSolicitantesMap.set(nombre, (topSolicitantesMap.get(nombre) || 0) + 1);
    }

    const topSolicitantes = Array.from(topSolicitantesMap.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    const maxTopSolicitantes = Math.max(
        1,
        ...topSolicitantes.map((item) => item.value)
    );

    const actividadRows = [
        { label: "Tickets", value: totalTickets },
        { label: "Visitas", value: totalVisitas },
        { label: "Mant. remotas", value: data.mantencionesRemotas?.length ?? 0 },
    ];

    const maxActividad = Math.max(1, ...actividadRows.map((item) => item.value));

    return (
        <div className="w-[794px] bg-white px-10 py-8 text-slate-800">
            {/* Encabezado del informe corto */}
            <header className="mb-6 border-b border-slate-200 pb-4">
                <p className="text-xs font-bold uppercase tracking-wide text-cyan-700">
                    Informe ejecutivo resumido
                </p>

                <h1 className="mt-1 text-2xl font-black text-slate-900">
                    {empresaNombre}
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                    Período: {periodoTexto}
                </p>
            </header>

            {/* KPIs principales */}
            <section className="mb-6 grid grid-cols-4 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">
                        Tickets
                    </p>
                    <p className="mt-2 text-3xl font-black text-slate-900">
                        {formatNumber(totalTickets)}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">
                        Visitas
                    </p>
                    <p className="mt-2 text-3xl font-black text-slate-900">
                        {formatNumber(totalVisitas)}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">
                        Equipos
                    </p>
                    <p className="mt-2 text-3xl font-black text-slate-900">
                        {formatNumber(totalEquipos)}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase text-slate-500">
                        Usuarios
                    </p>
                    <p className="mt-2 text-3xl font-black text-slate-900">
                        {formatNumber(totalSolicitantes)}
                    </p>
                </div>
            </section>

            {/* Resumen de horas */}
            <section className="mb-6 grid grid-cols-3 gap-4">
                <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5">
                    <p className="text-sm font-bold text-cyan-800">
                        Horas tickets
                    </p>
                    <p className="mt-2 text-4xl font-black text-cyan-900">
                        {formatHoras(totalHorasTickets)}
                    </p>
                </div>

                <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
                    <p className="text-sm font-bold text-indigo-800">
                        Horas remotas
                    </p>
                    <p className="mt-2 text-4xl font-black text-indigo-900">
                        {formatHoras(totalHorasTeamViewer)}
                    </p>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                    <p className="text-sm font-bold text-emerald-800">
                        Total soporte
                    </p>
                    <p className="mt-2 text-4xl font-black text-emerald-900">
                        {formatHoras(horasTotalSoporte)}
                    </p>
                </div>
            </section>

            {/* Visuales principales */}
            <section className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 p-5">
                    <h2 className="mb-4 text-sm font-bold text-slate-700">
                        Estado de tickets
                    </h2>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-emerald-50 p-4 text-center">
                            <p className="text-xs font-semibold uppercase text-emerald-700">
                                Cerrados
                            </p>
                            <p className="mt-2 text-3xl font-black text-emerald-900">
                                {formatNumber(ticketsCerrados)}
                            </p>
                        </div>

                        <div className="rounded-xl bg-amber-50 p-4 text-center">
                            <p className="text-xs font-semibold uppercase text-amber-700">
                                Abiertos
                            </p>
                            <p className="mt-2 text-3xl font-black text-amber-900">
                                {formatNumber(ticketsAbiertos)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-5">
                    <h2 className="mb-4 text-sm font-bold text-slate-700">
                        Actividad del período
                    </h2>

                    <div className="space-y-3">
                        {actividadRows.map((item) => (
                            <SimpleBar
                                key={item.label}
                                label={item.label}
                                value={item.value}
                                max={maxActividad}
                            />
                        ))}
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-5">
                    <h2 className="mb-4 text-sm font-bold text-slate-700">
                        Top solicitantes por tickets
                    </h2>

                    <div className="space-y-3">
                        {topSolicitantes.length > 0 ? (
                            topSolicitantes.map((item) => (
                                <SimpleBar
                                    key={item.label}
                                    label={item.label}
                                    value={item.value}
                                    max={maxTopSolicitantes}
                                />
                            ))
                        ) : (
                            <p className="text-sm text-slate-500">
                                Sin datos disponibles.
                            </p>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-5">
                    <h2 className="mb-4 text-sm font-bold text-slate-700">
                        Mantenciones remotas
                    </h2>

                    <div className="rounded-xl bg-slate-50 p-5 text-center">
                        <p className="text-xs font-semibold uppercase text-slate-500">
                            Minutos TeamViewer
                        </p>

                        <p className="mt-2 text-4xl font-black text-slate-900">
                            {formatNumber(totalMinutosTeamViewer)}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                            Equivalente a {formatHoras(totalHorasTeamViewer)}
                        </p>
                    </div>
                </div>
            </section>

            {/* Pie breve */}
            <footer className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500">
                Informe resumido generado automáticamente desde el módulo de reportes RIDS.
            </footer>
        </div>
    );
}