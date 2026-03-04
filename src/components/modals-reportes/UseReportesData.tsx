// hooks/useReportesData.ts
import { useState, useEffect } from "react";
import type {
  Empresa,
  SolicitanteRow,
  EquipoRow,
  VisitaRow,
  TicketRow,
  MantencionRemotaRow,
  ApiList,
  TicketsResp,
  TicketLike,
  ReporteGeneralData,
} from "../modals-reportes/typesReportes";

const API_URL =
  (import.meta as ImportMeta).env.VITE_API_URL || "http://localhost:4000/api";

export const tokenHeader = (): HeadersInit => {
  const token = localStorage.getItem("accessToken");
  const h: Record<string, string> = {};
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
};

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
    const u = new URL(`${API_URL}/solicitantes`);
    u.searchParams.set("page", String(page));
    u.searchParams.set("pageSize", "100");
    u.searchParams.set("empresaId", empresaId);
    const r = await fetch(u, { headers: tokenHeader() });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = (await r.json()) as ApiList<SolicitanteRow>;
    totalPages = j.totalPages ?? 1;
    all.push(...(j.items ?? j.data ?? []));
    page++;
  } while (page <= totalPages);

  return all;
};

const fetchEquipos = async (empresaId: string): Promise<EquipoRow[]> => {
  const all: EquipoRow[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const u = new URL(`${API_URL}/equipos`);
    u.searchParams.set("page", String(page));
    u.searchParams.set("pageSize", "200");
    u.searchParams.set("empresaId", empresaId);
    const r = await fetch(u, { headers: tokenHeader() });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = (await r.json()) as ApiList<EquipoRow>;
    totalPages = j.totalPages ?? 1;
    all.push(...(j.items ?? j.data ?? []));
    page++;
  } while (page <= totalPages);

  return all;
};

const fetchVisitas = async (empresaId: string): Promise<VisitaRow[]> => {
  const all: VisitaRow[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const u = new URL(`${API_URL}/visitas`);
    u.searchParams.set("page", String(page));
    u.searchParams.set("pageSize", "100");
    u.searchParams.set("empresaId", empresaId);
    const r = await fetch(u, { headers: tokenHeader() });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = (await r.json()) as ApiList<VisitaRow>;
    totalPages = j.totalPages ?? 1;
    all.push(...(j.items ?? j.data ?? []));
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
  const emp = empresas.find((e) => e.id_empresa === Number(empresaId));

  do {
    const u = new URL(`${API_URL}/tickets`);
    u.searchParams.set("page", String(page));
    u.searchParams.set("pageSize", "200");
    if (emp) u.searchParams.set("empresa", emp.nombre);
    const r = await fetch(u, { headers: tokenHeader() });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = (await r.json()) as TicketsResp;
    totalPages = j.totalPages ?? Math.max(1, Math.ceil(j.total / j.pageSize));
    all.push(...(j.rows ?? []));
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
    const u = new URL(`${API_URL}/mantenciones-remotas`);
    u.searchParams.set("page", String(page));
    u.searchParams.set("pageSize", "500");
    u.searchParams.set("empresaId", empresaId);
    const r = await fetch(u, { headers: tokenHeader() });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const j = await r.json();
    totalPages = j.totalPages ?? 1;
    all.push(...(j.items ?? j.data ?? []));
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
        const url = new URL(`${API_URL}/empresas`);
        url.searchParams.set("pageSize", "1000");
        const r = await fetch(url.toString(), { headers: tokenHeader() });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const j = (await r.json()) as { items?: Empresa[]; data?: Empresa[] };
        setEmpresas(j.items ?? j.data ?? []);
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