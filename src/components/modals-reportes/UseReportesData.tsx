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
  empresaId: string,
  empresas: Empresa[]
): Promise<TicketRow[]> => {

  const all: TicketRow[] = [];
  let page = 1;
  let totalPages = 1;

  const emp = empresas.find(e => e.id_empresa === Number(empresaId));

  do {

    const { data } = await http.get("/tickets", {
      params: {
        page,
        pageSize: 200,
        empresa: emp?.nombre
      }
    });

    totalPages =
      data.totalPages ?? Math.max(1, Math.ceil(data.total / data.pageSize));

    all.push(...(data.rows ?? []));
    page++;

  } while (page <= totalPages);

  return all;
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

    const [solicitantes, equipos, visitas, tickets, mantencionesRemotas] =
      await Promise.all([
        fetchSolicitantes(empresaFiltro),
        fetchEquipos(empresaFiltro),
        fetchVisitas(empresaFiltro),
        fetchTickets(empresaFiltro, empresas),
        fetchMantencionesRemotas(empresaFiltro),
      ]);

    const y = Number(selectedYear);
    const m = Number(selectedMonth);

    return {
      solicitantes,
      equipos,
      visitas: visitas.filter((v) => isSameYearMonth(v.inicio ?? null, y, m)),
      tickets: tickets.filter((t) =>
        isSameYearMonth(getCreatedAt(t) ?? t.fecha, y, m)
      ),
      empresaFiltro,
      mantencionesRemotas: mantencionesRemotas.filter((mr) =>
        isSameYearMonth(mr.inicio ?? null, y, m)
      ),
    };
  };

  return { empresas, globalError, obtenerDatosReporteGeneral };
};