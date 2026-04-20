// hooks/useReportesData.ts
import { useState, useEffect } from "react";
import type {
  Empresa,
  SolicitanteRow,
  EquipoRow,
  VisitaRow,
  TicketRow,
  MantencionRemotaRow,
  TicketLike,
  ReporteGeneralData,
  TicketDashboardMonthlyRow,
  TeamViewerMonthlyAverageRow,
  TeamViewerMonthlySummary,
  TeamViewerMonthlyBreakdownRow
} from "./typesReportes";

import { http } from "../../service/http"


export const getCreatedAt = (t: TicketLike): string | null =>
  t.created_at ?? t.createdAt ?? t.fecha ?? null;

const isSameYearMonth = (
  iso: string | null | undefined,
  y: number,
  m01: number
) => {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.getFullYear() === y && d.getMonth() + 1 === m01;
};

// ─── Individual fetchers ───────────────────────────────────────────────────

const fetchSolicitantes = async (
  empresaId: string
): Promise<SolicitanteRow[]> => {

  const all: SolicitanteRow[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const { data } = await http.get("/solicitantes", {
      params: {
        page,
        pageSize: 100,
        empresaId
      }
    });

    totalPages = data.totalPages ?? 1;
    all.push(...(data.items ?? data.data ?? []));
    page++;

  } while (page <= totalPages);

  return all;
};

const fetchEquipos = async (empresaId: string): Promise<EquipoRow[]> => {

  const all: EquipoRow[] = [];
  let page = 1;
  let totalPages = 1;

  do {

    const { data } = await http.get("/equipos", {
      params: {
        page,
        pageSize: 200,
        empresaId
      }
    });

    totalPages = data.totalPages ?? 1;
    all.push(...(data.items ?? data.data ?? []));
    page++;

  } while (page <= totalPages);

  return all;
};

const fetchVisitas = async (empresaId: string): Promise<VisitaRow[]> => {

  const all: VisitaRow[] = [];
  let page = 1;
  let totalPages = 1;

  do {

    const { data } = await http.get("/visitas", {
      params: {
        page,
        pageSize: 100,
        empresaId
      }
    });

    totalPages = data.totalPages ?? 1;
    all.push(...(data.items ?? data.data ?? []));
    page++;

  } while (page <= totalPages);

  return all;
};

const fetchTickets = async (
  empresaId: string
): Promise<TicketRow[]> => {
  const all: TicketRow[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const { data } = await http.get("/helpdesk/tickets", {
      params: {
        page,
        pageSize: 200,
        empresaId,
      },
    });

    totalPages =
      data.totalPages ??
      Math.max(1, Math.ceil((data.total ?? 0) / (data.pageSize ?? 200)));

    const rows = (data.tickets ?? []).map((t: any) => ({
      ticket_id: String(t.id ?? t.publicId ?? ""),
      solicitante_email: t.requester?.email ?? t.fromEmail ?? null,
      empresa: t.empresa?.nombre ?? null,
      subject: t.subject ?? "",
      type: t.category ?? t.type ?? null,
      fecha: t.createdAt ?? t.created_at ?? new Date().toISOString(),
      createdAt: t.createdAt ?? null,
      closedAt: t.closedAt ?? null,
      resolvedAt: t.resolvedAt ?? null,
      assigneeNombre: t.assignee?.nombre ?? null,
      status: t.status ?? null,
    }));

    all.push(...rows);
    page++;
  } while (page <= totalPages);

  return all;
};

const fetchTicketDashboardMonthly = async (
  empresaId: string,
  selectedYear: string,
  selectedMonth: string
): Promise<TicketDashboardMonthlyRow[]> => {
  const fromDate = new Date(Number(selectedYear), Number(selectedMonth) - 1, 1);
  const toDate = new Date(Number(selectedYear), Number(selectedMonth), 0, 23, 59, 59, 999);

  const { data } = await http.get("/helpdesk/tickets/dashboard-empresas/monthly", {
    params: {
      empresaId: Number(empresaId),
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
    },
  });

  return data?.items ?? [];
};

const fetchTeamViewerMonthlyAverages = async (
  fromDate?: string,
  toDate?: string
): Promise<{
  items: TeamViewerMonthlyAverageRow[];
  summary: TeamViewerMonthlySummary | null;
}> => {
  const { data } = await http.get("/teamviewer/monthly-averages", {
    params: {
      fromDate,
      toDate,
    },
  });

  return {
    items: data?.items ?? [],
    summary: data?.summary ?? null,
  };
};

const fetchTeamViewerMonthlyBreakdown = async (
  fromDate?: string,
  toDate?: string
): Promise<TeamViewerMonthlyBreakdownRow[]> => {
  const { data } = await http.get("/teamviewer/monthly-breakdown", {
    params: {
      fromDate,
      toDate,
    },
  });

  return data?.items ?? [];
};

const fetchMantencionesRemotas = async (
  empresaId: string
): Promise<MantencionRemotaRow[]> => {

  const all: MantencionRemotaRow[] = [];
  let page = 1;
  let totalPages = 1;

  do {

    const { data } = await http.get("/mantenciones-remotas", {
      params: {
        page,
        pageSize: 500,
        empresaId
      }
    });

    totalPages = data.totalPages ?? 1;
    all.push(...(data.items ?? data.data ?? []));
    page++;

  } while (page <= totalPages);

  return all;
};

// ─── Main hook ────────────────────────────────────────────────────────────

export const useReportesData = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [globalError, setGlobalError] = useState<string | null>(null);

  useEffect(() => {

    const cargarEmpresas = async () => {

      try {

        const { data } = await http.get("/empresas", {
          params: { pageSize: 1000 }
        });

        setEmpresas(data.items ?? data.data ?? []);

      } catch (e) {

        console.error("Empresas error:", e);
        setGlobalError("No se pudieron cargar las empresas");

      }

    };

    void cargarEmpresas();

  }, []);

  const obtenerDatosReporteGeneral = async (
    empresaFiltro: string,
    selectedYear: string,
    selectedMonth: string
  ): Promise<ReporteGeneralData> => {
    if (!empresaFiltro || !selectedYear || !selectedMonth) {
      return { solicitantes: [], equipos: [], visitas: [], tickets: [] };
    }

    const fromDate = new Date(Number(selectedYear), Number(selectedMonth) - 1, 1).toISOString();
    const toDate = new Date(Number(selectedYear), Number(selectedMonth), 0, 23, 59, 59, 999).toISOString();

    const [
      solicitantes,
      equipos,
      visitas,
      tickets,
      mantencionesRemotas,
      ticketDashboardMonthly,
      teamViewerAveragesResp,
      teamViewerBreakdown,
    ] = await Promise.all([
      fetchSolicitantes(empresaFiltro),
      fetchEquipos(empresaFiltro),
      fetchVisitas(empresaFiltro),
      fetchTickets(empresaFiltro),
      fetchMantencionesRemotas(empresaFiltro),
      fetchTicketDashboardMonthly(empresaFiltro, selectedYear, selectedMonth),
      fetchTeamViewerMonthlyAverages(fromDate, toDate),
      fetchTeamViewerMonthlyBreakdown(fromDate, toDate),
    ]);

    const y = Number(selectedYear);
    const m = Number(selectedMonth);

    const solicitantesActivos = solicitantes.filter((s) => s.isActive !== false);

    const empresaIdNum = Number(empresaFiltro);

    const teamViewerAveragesEmpresa = (teamViewerAveragesResp.items ?? []).filter(
      (r) => Number(r.id_empresa) === empresaIdNum
    );

    const teamViewerBreakdownEmpresa = (teamViewerBreakdown ?? []).filter(
      (r) => Number(r.id_empresa) === empresaIdNum
    );

    const teamViewerSummaryEmpresa = {
      empresas: teamViewerAveragesEmpresa.length,
      totalSesiones: teamViewerBreakdownEmpresa.reduce(
        (acc, r) => acc + Number(r.sesiones_mes || 0),
        0
      ),
      totalMinutos: teamViewerBreakdownEmpresa.reduce(
        (acc, r) => acc + Number(r.minutos_mes || 0),
        0
      ),
      totalHoras: Number(
        (
          teamViewerBreakdownEmpresa.reduce(
            (acc, r) => acc + Number(r.minutos_mes || 0),
            0
          ) / 60
        ).toFixed(1)
      ),
    };

    return {
      solicitantes: solicitantesActivos,
      equipos,
      visitas: visitas.filter((v) => isSameYearMonth(v.inicio ?? null, y, m)),
      tickets: tickets.filter((t) =>
        isSameYearMonth(getCreatedAt(t) ?? t.fecha, y, m)
      ),
      empresaFiltro,
      mantencionesRemotas: mantencionesRemotas.filter((mr) =>
        isSameYearMonth(mr.inicio ?? null, y, m)
      ),
      ticketDashboardMonthly,
      teamViewerMonthlyAverages: teamViewerAveragesEmpresa,
      teamViewerMonthlyBreakdown: teamViewerBreakdownEmpresa,
      teamViewerMonthlySummary: teamViewerSummaryEmpresa,
    };
  };



  return { empresas, globalError, obtenerDatosReporteGeneral };
};