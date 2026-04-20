import type {
    ReporteGeneralData,
    TicketDashboardMonthlyRow,
} from "../modals-reportes/typesReportes";

type Params = {
    data: ReporteGeneralData;
    periodoTexto: string;
    empresaNombre: string;
};

type ReporteExportVisualData = {
  dashboardMonthlySummary: string;
  dashboardMonthlyRows: Array<Record<string, any>>;
  teamViewerMonthlySummaryText: string;
  tvBreakdownRows: Array<Record<string, any>>;
  resumenVisitasTecnicas: string;
  totalSoporteResumen: string;

  ticketsRows: Array<Record<string, any>>;
  visitasRows: Array<Record<string, any>>;
  tvAverageRows: Array<Record<string, any>>;
  topSolicitantesRows: Array<Record<string, any>>;

  chartTicketsMensualUrl?: string | null;
  chartHorasMensualUrl?: string | null;
  chartTeamViewerMensualUrl?: string | null;
  chartTopSolicitantesTicketsUrl?: string | null;
};

const formatMesTexto = (mes: string) => {
    if (!mes) return "el período";

    const [year, month] = mes.split("-");
    const monthIndex = Number(month) - 1;

    const meses = [
        "enero", "febrero", "marzo", "abril", "mayo", "junio",
        "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    ];

    if (monthIndex < 0 || monthIndex > 11 || !year) return mes;
    return `${meses[monthIndex]} de ${year}`;
};

const formatHorasMinutos = (minutos: number) => {
    const total = Number(minutos || 0);
    const horas = Math.floor(total / 60);
    const mins = total % 60;

    if (horas <= 0) return `${mins}m`;
    if (mins === 0) return `${horas}h`;
    return `${horas}h ${mins}m`;
};

const getDuracionMinutos = (inicio?: string | null, fin?: string | null) => {
    if (!inicio || !fin) return 0;

    const i = new Date(inicio);
    const f = new Date(fin);

    if (Number.isNaN(i.getTime()) || Number.isNaN(f.getTime())) return 0;

    const diff = Math.round((f.getTime() - i.getTime()) / 60000);
    return diff > 0 ? diff : 0;
};

const buildTicketMonthlySummary = (row: TicketDashboardMonthlyRow) => {
    const mesTexto = formatMesTexto(row.mes);
    const tickets = Number(row.total_tickets || 0);
    const cerrados = Number(row.tickets_cerrados || 0);
    const horas = Number(row.horas_cap8h || 0);
    const pct8h = Number(row.pct_resueltos_8h || 0);
    const complejos = Number(row.tickets_complejos || 0);
    const mediana = Number(row.mediana_minutos || 0);

    const medianaTexto =
        mediana > 0 ? `${mediana} minutos` : "sin mediana disponible";

    const complejosTexto =
        complejos === 0
            ? "sin casos clasificados como complejos"
            : complejos === 1
                ? "1 caso clasificado como complejo"
                : `${complejos} casos clasificados como complejos`;

    return `En ${mesTexto} se registraron ${tickets} tickets, de los cuales ${cerrados} fueron cerrados durante el período. El tiempo total estimado de atención fue de ${horas.toFixed(1)} horas, y el ${pct8h.toFixed(1)}% se resolvió en 8 horas o menos. La mediana de resolución fue de ${medianaTexto}, con ${complejosTexto}.`;
};

const buildTeamViewerMonthlySummary = (row: {
    mes: string;
    sesiones_mes: number;
    minutos_mes: number;
}) => {
    const mesTexto = formatMesTexto(row.mes);
    const sesiones = Number(row.sesiones_mes || 0);
    const minutos = Number(row.minutos_mes || 0);

    return `En ${mesTexto} se realizaron ${sesiones} sesiones de mantención remota, con un tiempo total invertido de ${minutos} minutos, equivalente a ${formatHorasMinutos(minutos)}.`;
};

const buildTeamViewerGeneralSummary = (
    summary: { totalSesiones: number; totalMinutos: number } | null,
    firstRow?: { mes: string; sesiones_mes: number; minutos_mes: number }
) => {
    if (firstRow) return buildTeamViewerMonthlySummary(firstRow);

    if (!summary) {
        return "No hay resumen disponible para mantenciones remotas en este período.";
    }

    return `Durante el período seleccionado se registraron ${summary.totalSesiones} sesiones de mantención remota, con un total de ${summary.totalMinutos} minutos invertidos, equivalentes a ${formatHorasMinutos(summary.totalMinutos)}.`;
};

export function buildReporteExportData({
    data,
    periodoTexto,
}: Params) {
    const dashboardMonthly = data.ticketDashboardMonthly ?? [];
    const tvBreakdown = data.teamViewerMonthlyBreakdown ?? [];
    const tvSummary = data.teamViewerMonthlySummary ?? null;

    const dashboardMonthlySummary =
        dashboardMonthly.length > 0
            ? buildTicketMonthlySummary(dashboardMonthly[0])
            : "No hay datos de resumen mensual de tickets para este período.";

    const dashboardMonthlyRows = dashboardMonthly.map((r) => ({
        Mes: r.mes,
        Tickets: r.total_tickets,
        Cerrados: r.tickets_cerrados,
        "Horas est.": `${r.horas_cap8h.toFixed(1)}h`,
        "% ≤ 8h": `${r.pct_resueltos_8h.toFixed(1)}%`,
        Mediana: r.mediana_minutos ? `${r.mediana_minutos}m` : "—",
        Complejos: r.tickets_complejos,
    }));

    const teamViewerMonthlySummaryText =
        tvBreakdown.length > 0
            ? buildTeamViewerGeneralSummary(tvSummary, tvBreakdown[0])
            : buildTeamViewerGeneralSummary(tvSummary);

    const tvBreakdownRows = tvBreakdown.map((r) => ({
        Mes: r.mes,
        Sesiones: r.sesiones_mes,
        Minutos: r.minutos_mes,
        Horas: formatHorasMinutos(Number(r.minutos_mes || 0)),
    }));

    const visitasAgrupadas = Array.from(
        new Map(
            (data.visitas ?? []).map((v) => {
                const key = [
                    v.tecnico?.nombre?.trim() || "sin-tecnico",
                    v.inicio || "sin-inicio",
                    v.fin || "sin-fin",
                ].join("|");

                return [key, v];
            })
        ).values()
    );

    const totalMinutosVisitas = visitasAgrupadas.reduce((acc, v) => {
        return acc + getDuracionMinutos(v.inicio, v.fin);
    }, 0);

    const totalJornadasVisitas = visitasAgrupadas.length;

    const resumenVisitasTecnicas = `Durante ${periodoTexto} se realizaron ${totalJornadasVisitas} jornadas únicas de visitas técnicas, con un tiempo total invertido de ${formatHorasMinutos(totalMinutosVisitas)}.`;

    const totalHorasTickets = dashboardMonthly.reduce(
        (acc, r) => acc + Number(r.horas_cap8h || 0),
        0
    );

    const totalMinutosRemotas = tvBreakdown.reduce(
        (acc, r) => acc + Number(r.minutos_mes || 0),
        0
    );

    const totalHorasSoporte =
        totalHorasTickets + totalMinutosRemotas / 60 + totalMinutosVisitas / 60;

    const totalSoporteResumen = `Durante ${periodoTexto} se invirtieron ${totalHorasSoporte.toFixed(1)} horas en soporte, considerando ${totalHorasTickets.toFixed(1)} horas asociadas a tickets, ${formatHorasMinutos(totalMinutosRemotas)} en mantenciones remotas y ${formatHorasMinutos(totalMinutosVisitas)} en jornadas únicas de visitas técnicas.`;

    const tvAverages = data.teamViewerMonthlyAverages ?? [];

    return {
        formatHorasMinutos,
        dashboardMonthlySummary,
        dashboardMonthlyRows,
        teamViewerMonthlySummaryText,
        tvBreakdownRows,
        totalMinutosVisitas,
        totalJornadasVisitas,
        resumenVisitasTecnicas,
        totalHorasTickets,
        totalMinutosRemotas,
        totalHorasSoporte,
        totalSoporteResumen,
        tvBreakdown,
        tvSummary,
        tvAverages,
    };
}