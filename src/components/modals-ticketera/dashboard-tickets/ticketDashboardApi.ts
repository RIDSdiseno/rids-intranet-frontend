import { api } from "../../../api/api";

export type TicketMonthlyRow = {
    id_empresa: number;
    empresa: string;
    mes: string;
    total_tickets: number;
    tickets_cerrados: number;
    horas_cap8h: number;
    pct_resueltos_8h: number;
    tickets_complejos: number;
    mediana_minutos: number;
};

export type TicketRankingRow = {
    id_empresa: number;
    empresa: string;
    total_tickets: number;
    tickets_cerrados: number;
    horas_cap8h: number;
    pct_resueltos_8h: number;
    tickets_complejos: number;
    mediana_minutos: number;
};

export type TicketRankingSummary = {
    totalEmpresas: number;
    totalTickets: number;
    totalHoras: number;
    totalComplejos: number;
};

export async function getTicketsDashboardMonthly(params: {
    fromDate?: string;
    toDate?: string;
    empresaId?: number;
}) {
    const { data } = await api.get("/helpdesk/tickets/dashboard-empresas/monthly", { params });
    return data as { ok: boolean; items: TicketMonthlyRow[] };
}

export async function getTicketsDashboardRanking(params: {
    fromDate?: string;
    toDate?: string;
}) {
    const { data } = await api.get("/helpdesk/tickets/dashboard-empresas/ranking", { params });
    return data as { ok: boolean; items: TicketRankingRow[]; summary: TicketRankingSummary };
}