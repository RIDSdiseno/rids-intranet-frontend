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
        <div style={{ marginBottom: 12 }}>
            {/* Fila superior de etiqueta y valor */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    fontSize: 11,
                    marginBottom: 5,
                }}
            >
                <span
                    style={{
                        fontWeight: 700,
                        color: "#475569",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {label}
                </span>

                <span
                    style={{
                        fontWeight: 800,
                        color: "#1e293b",
                    }}
                >
                    {formatNumber(value)}
                </span>
            </div>

            {/* Barra visual usando solo colores HEX para evitar error oklch en html2canvas */}
            <div
                style={{
                    height: 10,
                    width: "100%",
                    overflow: "hidden",
                    borderRadius: 999,
                    backgroundColor: "#e2e8f0",
                }}
            >
                <div
                    style={{
                        width: `${width}%`,
                        height: "100%",
                        borderRadius: 999,
                        backgroundColor: "#0891b2",
                    }}
                />
            </div>
        </div>
    );
}

function KpiCard({
    label,
    value,
}: {
    label: string;
    value: string | number;
}) {
    return (
        <div
            style={{
                border: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
                borderRadius: 18,
                padding: 16,
            }}
        >
            <p
                style={{
                    margin: 0,
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    color: "#64748b",
                    letterSpacing: 0.3,
                }}
            >
                {label}
            </p>

            <p
                style={{
                    margin: "8px 0 0",
                    fontSize: 30,
                    lineHeight: "34px",
                    fontWeight: 900,
                    color: "#0f172a",
                }}
            >
                {value}
            </p>
        </div>
    );
}

function HoraCard({
    label,
    value,
    bg,
    border,
    text,
}: {
    label: string;
    value: string;
    bg: string;
    border: string;
    text: string;
}) {
    return (
        <div
            style={{
                border: `1px solid ${border}`,
                backgroundColor: bg,
                borderRadius: 18,
                padding: 18,
            }}
        >
            <p
                style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 800,
                    color: text,
                }}
            >
                {label}
            </p>

            <p
                style={{
                    margin: "8px 0 0",
                    fontSize: 36,
                    lineHeight: "40px",
                    fontWeight: 900,
                    color: text,
                }}
            >
                {value}
            </p>
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

    const totalMinutosVisitas = (data.visitas ?? []).reduce(
        (acc: number, visita: any) => {
            return acc + getDuracionMinutos(visita.inicio, visita.fin);
        },
        0
    );

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
        <div
            style={{
                width: 794,
                minHeight: 1123,
                backgroundColor: "#ffffff",
                padding: "32px 40px",
                boxSizing: "border-box",
                fontFamily: "Arial, sans-serif",
                color: "#1e293b",
            }}
        >
            {/* Encabezado del informe corto */}
            <header
                style={{
                    marginBottom: 24,
                    paddingBottom: 16,
                    borderBottom: "1px solid #e2e8f0",
                }}
            >
                <p
                    style={{
                        margin: 0,
                        fontSize: 11,
                        fontWeight: 900,
                        textTransform: "uppercase",
                        letterSpacing: 0.6,
                        color: "#0e7490",
                    }}
                >
                    Informe ejecutivo resumido
                </p>

                <h1
                    style={{
                        margin: "6px 0 0",
                        fontSize: 26,
                        lineHeight: "32px",
                        fontWeight: 900,
                        color: "#0f172a",
                    }}
                >
                    {empresaNombre}
                </h1>

                <p
                    style={{
                        margin: "6px 0 0",
                        fontSize: 13,
                        color: "#64748b",
                    }}
                >
                    Período: {periodoTexto}
                </p>
            </header>

            {/* KPIs principales */}
            <section
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 12,
                    marginBottom: 24,
                }}
            >
                <KpiCard label="Tickets" value={formatNumber(totalTickets)} />
                <KpiCard label="Visitas" value={formatNumber(totalVisitas)} />
                <KpiCard label="Equipos" value={formatNumber(totalEquipos)} />
                <KpiCard label="Usuarios" value={formatNumber(totalSolicitantes)} />
            </section>

            {/* Resumen de horas */}
            <section
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 14,
                    marginBottom: 24,
                }}
            >
                <HoraCard
                    label="Horas tickets"
                    value={formatHoras(totalHorasTickets)}
                    bg="#ecfeff"
                    border="#a5f3fc"
                    text="#155e75"
                />

                <HoraCard
                    label="Horas remotas"
                    value={formatHoras(totalHorasTeamViewer)}
                    bg="#eef2ff"
                    border="#c7d2fe"
                    text="#3730a3"
                />

                <HoraCard
                    label="Total soporte"
                    value={formatHoras(horasTotalSoporte)}
                    bg="#ecfdf5"
                    border="#a7f3d0"
                    text="#065f46"
                />
            </section>

            {/* Visuales principales */}
            <section
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: 14,
                }}
            >
                <div
                    style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 18,
                        padding: 18,
                    }}
                >
                    <h2
                        style={{
                            margin: "0 0 16px",
                            fontSize: 14,
                            fontWeight: 900,
                            color: "#334155",
                        }}
                    >
                        Estado de tickets
                    </h2>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(2, 1fr)",
                            gap: 12,
                        }}
                    >
                        <div
                            style={{
                                borderRadius: 14,
                                backgroundColor: "#ecfdf5",
                                padding: 16,
                                textAlign: "center",
                            }}
                        >
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: 10,
                                    fontWeight: 900,
                                    textTransform: "uppercase",
                                    color: "#047857",
                                }}
                            >
                                Cerrados
                            </p>

                            <p
                                style={{
                                    margin: "8px 0 0",
                                    fontSize: 30,
                                    fontWeight: 900,
                                    color: "#064e3b",
                                }}
                            >
                                {formatNumber(ticketsCerrados)}
                            </p>
                        </div>

                        <div
                            style={{
                                borderRadius: 14,
                                backgroundColor: "#fffbeb",
                                padding: 16,
                                textAlign: "center",
                            }}
                        >
                            <p
                                style={{
                                    margin: 0,
                                    fontSize: 10,
                                    fontWeight: 900,
                                    textTransform: "uppercase",
                                    color: "#b45309",
                                }}
                            >
                                Abiertos
                            </p>

                            <p
                                style={{
                                    margin: "8px 0 0",
                                    fontSize: 30,
                                    fontWeight: 900,
                                    color: "#78350f",
                                }}
                            >
                                {formatNumber(ticketsAbiertos)}
                            </p>
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 18,
                        padding: 18,
                    }}
                >
                    <h2
                        style={{
                            margin: "0 0 16px",
                            fontSize: 14,
                            fontWeight: 900,
                            color: "#334155",
                        }}
                    >
                        Actividad del período
                    </h2>

                    {actividadRows.map((item) => (
                        <SimpleBar
                            key={item.label}
                            label={item.label}
                            value={item.value}
                            max={maxActividad}
                        />
                    ))}
                </div>

                <div
                    style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 18,
                        padding: 18,
                    }}
                >
                    <h2
                        style={{
                            margin: "0 0 16px",
                            fontSize: 14,
                            fontWeight: 900,
                            color: "#334155",
                        }}
                    >
                        Top solicitantes por tickets
                    </h2>

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
                        <p
                            style={{
                                margin: 0,
                                fontSize: 13,
                                color: "#64748b",
                            }}
                        >
                            Sin datos disponibles.
                        </p>
                    )}
                </div>

                <div
                    style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 18,
                        padding: 18,
                    }}
                >
                    <h2
                        style={{
                            margin: "0 0 16px",
                            fontSize: 14,
                            fontWeight: 900,
                            color: "#334155",
                        }}
                    >
                        Mantenciones remotas
                    </h2>

                    <div
                        style={{
                            borderRadius: 14,
                            backgroundColor: "#f8fafc",
                            padding: 20,
                            textAlign: "center",
                        }}
                    >
                        <p
                            style={{
                                margin: 0,
                                fontSize: 10,
                                fontWeight: 900,
                                textTransform: "uppercase",
                                color: "#64748b",
                            }}
                        >
                            Minutos TeamViewer
                        </p>

                        <p
                            style={{
                                margin: "8px 0 0",
                                fontSize: 36,
                                lineHeight: "40px",
                                fontWeight: 900,
                                color: "#0f172a",
                            }}
                        >
                            {formatNumber(totalMinutosTeamViewer)}
                        </p>

                        <p
                            style={{
                                margin: "4px 0 0",
                                fontSize: 13,
                                color: "#64748b",
                            }}
                        >
                            Equivalente a {formatHoras(totalHorasTeamViewer)}
                        </p>
                    </div>
                </div>
            </section>

            {/* Pie breve */}
            <footer
                style={{
                    marginTop: 24,
                    paddingTop: 14,
                    borderTop: "1px solid #e2e8f0",
                    fontSize: 11,
                    color: "#64748b",
                }}
            >
                Informe resumido generado automáticamente desde el módulo de reportes RIDS.
            </footer>
        </div>
    );
}