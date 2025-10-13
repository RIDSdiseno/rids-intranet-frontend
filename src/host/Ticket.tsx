// src/pages/TicketsPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  SearchOutlined,
  ReloadOutlined,
  CloseCircleFilled,
  LeftOutlined,
  RightOutlined,
  FileExcelOutlined,
} from "@ant-design/icons";
import axios, { AxiosError } from "axios";
import Header from "../components/Header";

/* ===================== Tipos de la API ===================== */
type ApiRow = {
  ticket_id: string;
  solicitante_email: string | null;
  empresa: string | null;
  subject: string;
  type: string | null;
  fecha: string; // ISO
};

type ApiResp = {
  page: number;
  pageSize: number;
  total: number;
  rows: ApiRow[];
};

type EmpresaOpt = { key: string; label: string };

/* ===================== Config ===================== */
const PAGE_SIZE = 10;
const BASE_URL = (import.meta as ImportMeta).env.VITE_API_URL;
const APP_TZ = (import.meta as ImportMeta).env.VITE_TZ || "America/Santiago";

/* ===================== Cliente axios local ===================== */
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 15000,
});

/* ===================== Utils ===================== */
const clsx = (...xs: Array<string | undefined | null | false>) => xs.filter(Boolean).join(" ");
const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

/** Quita tildes */
function stripAccents(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

/** Clave de empresa: sin tildes, sin sufijos legales, minúsculas, espacios colapsados */
function companyKey(raw?: string | null): string {
  const base = (raw ?? "Sin empresa").trim().replace(/\s+/g, " ");
  const noAccents = stripAccents(base).toLowerCase();
  // borra sufijos legales comunes (sa, s.a., ltda, spa, s.p.a)
  return noAccents
    .replace(/\b(s\.?\s*a\.?|sa|ltda\.?|spa|s\.?\s*p\.?\s*a\.?)\b/g, "")
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Fecha en 24h, fija a la TZ de la app (igual que Railway) */
function formatInTZ(iso: string | Date, tz: string = APP_TZ): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")} ${pick("hour")}:${pick(
    "minute",
  )}:${pick("second")}`;
}
const fmtDT = (d?: string | Date | null) => (d ? formatInTZ(d) : "—");

/* ===================== Tipos XLSX ===================== */
import type * as XLSXNS from "xlsx-js-style";
import type { WorkBook, WorkSheet, CellObject } from "xlsx-js-style";

/** Bordes negros para todo el rango */
function setAllBorders(
  XLSX: typeof XLSXNS,
  ws: WorkSheet,
  range?: string,
  thickness: "thin" | "medium" = "thin",
  color: string = "FF000000",
): void {
  const ref = range || ws["!ref"];
  if (!ref) return;
  const [s, e] = ref.split(":");
  const S = XLSX.utils.decode_cell(s);
  const E = XLSX.utils.decode_cell(e);
  const sheet = ws as unknown as Record<string, CellObject>;
  for (let R = S.r; R <= E.r; R++) {
    for (let C = S.c; C <= E.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (!sheet[addr]) sheet[addr] = { t: "s", v: "" };
      sheet[addr].s = {
        ...(sheet[addr].s || {}),
        border: {
          top: { style: thickness, color: { rgb: color } },
          left: { style: thickness, color: { rgb: color } },
          right: { style: thickness, color: { rgb: color } },
          bottom: { style: thickness, color: { rgb: color } },
        },
      };
    }
  }
}

/** Encabezado con color + borde negro */
function styleHeaderRow(ws: WorkSheet, headerCells: string[], fillRGB = "0EA5E9"): void {
  const sheet = ws as unknown as Record<string, CellObject>;
  for (const a of headerCells) {
    if (!sheet[a]) continue;
    sheet[a].s = {
      font: { bold: true, color: { rgb: "FFFFFFFF" } },
      fill: { patternType: "solid", fgColor: { rgb: `FF${fillRGB}` } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "FF000000" } },
        left: { style: "thin", color: { rgb: "FF000000" } },
        right: { style: "thin", color: { rgb: "FF000000" } },
        bottom: { style: "thin", color: { rgb: "FF000000" } },
      },
    };
  }
}

const COMPANY_COLORS = [
  "FDE68A",
  "A7F3D0",
  "BFDBFE",
  "FBCFE8",
  "C7D2FE",
  "FCA5A5",
  "FCD34D",
  "BBF7D0",
  "BAE6FD",
  "DDD6FE",
] as const;

/* ===================== Página ===================== */
const TicketsPage: React.FC = () => {
  // filtros
  const [q, setQ] = useState<string>("");
  const [onlyClosed, setOnlyClosed] = useState<boolean>(true);

  // filtros de fecha
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number | "">(""); // "" = todos

  // filtro de empresa (SELECT por clave normalizada)
  const [empresaOptions, setEmpresaOptions] = useState<EmpresaOpt[]>([]);
  const [empresaKeyFilter, setEmpresaKeyFilter] = useState<string>(""); // clave normalizada

  // paginación / datos
  const [page, setPage] = useState<number>(1);
  const [data, setData] = useState<ApiResp | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((data?.total ?? 0) / (data?.pageSize ?? PAGE_SIZE))),
    [data],
  );
  const canPrev = page > 1;
  const canNext = page < totalPages;

  // carga/errores
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const reqRef = useRef<number>(0);
  const empReqRef = useRef<number>(0);

  const showingRange = useMemo(() => {
    if (!data || data.total === 0) return null;
    const start = (data.page - 1) * data.pageSize + 1;
    const end = Math.min(data.page * data.pageSize, data.total);
    return { start, end };
  }, [data]);

  /* ===== Fetch listado ===== */
  // Helper: trae TODOS los tickets del año actual con los filtros base (sin empresa)
async function fetchAllYearRows(
  year: number,
  q: string,
  onlyClosed: boolean
): Promise<ApiRow[]> {
  const paramsBase: Record<string, string> = {
    page: "1",
    pageSize: "800",
    year: String(year),
    _ts: String(Date.now()),
  };
  if (q.trim().length > 0) paramsBase.search = q.trim();
  if (onlyClosed) paramsBase.status = "5";

  const first = await api.get<ApiResp>("/tickets", { params: paramsBase });
  const all: ApiRow[] = [...(first.data.rows || [])];

  const total = first.data.total ?? all.length;
  const perPage = Number(paramsBase.pageSize);
  const pages = Math.max(1, Math.ceil(total / perPage));

  for (let p = 2; p <= pages; p++) {
    const res = await api.get<ApiResp>("/tickets", {
      params: { ...paramsBase, page: String(p) },
    });
    all.push(...(res.data.rows || []));
  }
  return all;
}

  /* ===== Fetch listado ===== */
  const fetchList = async (): Promise<void> => {
    const seq = ++reqRef.current;
    setLoading(true);
    setError(null);

    try {
      let rows: ApiRow[] = [];

      if (month === "") {
        // “Todos”: agregamos TODO el año en el cliente
        rows = await fetchAllYearRows(year, q, onlyClosed);
        // si quieres respetar un backend que por defecto trae solo el mes actual,
        // esta rama evita esa limitación
      } else {
        // Mes específico: dejamos que el backend pagine
        const params: Record<string, string> = {
          page: String(page),
          pageSize: String(PAGE_SIZE),
          year: String(year),
          month: String(month),
          _ts: String(Date.now()),
        };
        if (q.trim().length > 0) params.search = q.trim();
        if (onlyClosed) params.status = "5";

        const res = await api.get<ApiResp>("/tickets", { params });
        if (seq !== reqRef.current) return;

        rows = Array.isArray(res.data.rows) ? [...res.data.rows] : [];

        // Filtrado de empresa robusto
        if (empresaKeyFilter) {
          rows = rows.filter((r) => companyKey(r.empresa) === empresaKeyFilter);
        }

        // Orden y set de data directo (paginación del backend)
        rows.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        setData({
          page: res.data.page ?? page,
          pageSize: res.data.pageSize ?? PAGE_SIZE,
          total: empresaKeyFilter ? rows.length : res.data.total ?? rows.length,
          rows,
        });
        return; // terminamos aquí para el caso "mes específico"
      }

      // --- Rama “Todos los meses”: filtramos, ordenamos y paginamos en el cliente ---
      if (empresaKeyFilter) {
        rows = rows.filter((r) => companyKey(r.empresa) === empresaKeyFilter);
      }
      rows.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

      const total = rows.length;
      const start = (page - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE;
      const pageRows = rows.slice(start, end);

      setData({
        page,
        pageSize: PAGE_SIZE,
        total,
        rows: pageRows,
      });
    } catch (e) {
      if (seq !== reqRef.current) return;
      const msg =
        e instanceof AxiosError
          ? `HTTP ${e.response?.status ?? "error"}`
          : e instanceof Error
          ? e.message
          : "Error al cargar tickets";
      setError(msg);
    } finally {
      if (seq === reqRef.current) setLoading(false);
    }
  };


  /* ===== Fetch opciones de empresa (una vez, sin filtros) ===== */
  const fetchEmpresaOptions = async (): Promise<void> => {
    const seq = ++empReqRef.current;
    try {
      const paramsBase: Record<string, string> = {
        page: "1",
        pageSize: "800",
        _ts: String(Date.now()),
      };
      const first = await api.get<ApiResp>("/tickets", { params: paramsBase });
      if (seq !== empReqRef.current) return;

      const all: ApiRow[] = [...(first.data.rows || [])];
      const total = first.data.total ?? all.length;
      const perPage = Number(paramsBase.pageSize);
      const pages = Math.max(1, Math.ceil(total / perPage));

      for (let p = 2; p <= pages; p++) {
        const res = await api.get<ApiResp>("/tickets", {
          params: { ...paramsBase, page: String(p) },
        });
        all.push(...(res.data.rows || []));
      }

      // Dedup por clave
      const seen = new Set<string>();
      const opts: EmpresaOpt[] = [];
      for (const r of all) {
        const label = (r.empresa ?? "Sin empresa").trim() || "Sin empresa";
        const key = companyKey(label);
        if (!seen.has(key)) {
          seen.add(key);
          opts.push({ key, label });
        }
      }
      opts.sort((a, b) => a.label.localeCompare(b.label, "es"));
      setEmpresaOptions(opts);

      // si la selección ya no existe, limpiar
      if (empresaKeyFilter && !opts.some((o) => o.key === empresaKeyFilter)) {
        setEmpresaKeyFilter("");
        setPage(1);
      }
    } catch {
      setEmpresaOptions([]);
    }
  };

  useEffect(() => {
    if (!BASE_URL) {
      setError("VITE_API_URL no está definido");
      return;
    }
    void fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q, onlyClosed, year, month, empresaKeyFilter]);

  useEffect(() => {
    void fetchEmpresaOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearAll = (): void => {
    setQ("");
    setOnlyClosed(true);
    setMonth("");
    setYear(now.getFullYear());
    setEmpresaKeyFilter("");
    setPage(1);
  };

  /* ===================== Exportar a Excel ===================== */
  const exportExcel = async (): Promise<void> => {
    try {
      // 1) Trae TODO con filtros básicos (sin empresa; filtramos aquí)
      const paramsBase: Record<string, string> = {
        page: "1",
        pageSize: "800",
        year: String(year),
        _ts: String(Date.now()),
      };
      if (q.trim().length > 0) paramsBase.search = q.trim();
      if (onlyClosed) paramsBase.status = "5";
      if (month !== "") paramsBase.month = String(month);

      const first = await api.get<ApiResp>("/tickets", { params: paramsBase });
      const allRows: ApiRow[] = [...(first.data.rows || [])];

      const total = first.data.total ?? allRows.length;
      const perPage = Number(paramsBase.pageSize);
      const pages = Math.max(1, Math.ceil(total / perPage));

      for (let p = 2; p <= pages; p++) {
        const res = await api.get<ApiResp>("/tickets", {
          params: { ...paramsBase, page: String(p) },
        });
        allRows.push(...(res.data.rows || []));
      }

      // Orden por fecha DESC
      allRows.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

      // Filtro robusto por empresa
      const filtered = empresaKeyFilter
        ? allRows.filter((r) => companyKey(r.empresa) === empresaKeyFilter)
        : allRows;

      // 2) Agrupa por etiqueta visible (mantiene el nombre tal como viene)
      const byCompany = new Map<string, ApiRow[]>();
      for (const r of filtered) {
        const label = (r.empresa ?? "Sin empresa").trim() || "Sin empresa";
        const arr = byCompany.get(label) ?? [];
        arr.push(r);
        byCompany.set(label, arr);
      }

      // 3) xlsx-js-style
      const XLSX = await import("xlsx-js-style");

      // 4) Resumen
      const summary = Array.from(byCompany.entries())
        .map(([empresa, rows]) => ({ empresa, tickets: rows.length }))
        .sort((a, b) => b.tickets - a.tickets);

      const wsResumen: WorkSheet = XLSX.utils.aoa_to_sheet([
        ["Empresa", "Tickets"],
        ...summary.map((x) => [x.empresa, x.tickets]),
      ]);
      wsResumen["!cols"] = [{ wch: 40 }, { wch: 10 }];
      styleHeaderRow(wsResumen, ["A1", "B1"], "0EA5E9");
      setAllBorders(XLSX, wsResumen);

      const wb: WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

      // 5) Hojas por empresa
      const header = ["ID", "Asunto", "Solicitante (email)", "Tipo", "Fecha"];
      let colorIdx = 0;

      for (const [empresa, rows] of byCompany) {
        rows.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        const body = rows.map((r) => [
          r.ticket_id,
          r.subject,
          r.solicitante_email ?? "",
          r.type ?? "",
          formatInTZ(r.fecha), // 24h + TZ
        ]);

        const ws: WorkSheet = XLSX.utils.aoa_to_sheet([header, ...body]);
        ws["!cols"] = [{ wch: 10 }, { wch: 60 }, { wch: 35 }, { wch: 16 }, { wch: 22 }];

        const fill = COMPANY_COLORS[colorIdx % COMPANY_COLORS.length];
        colorIdx++;
        styleHeaderRow(ws, ["A1", "B1", "C1", "D1", "E1"], fill);
        setAllBorders(XLSX, ws);

        const safe = (empresa || "Empresa").replace(/[\\/?*[\]:]/g, "_").slice(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, safe);
      }

      const parts: string[] = [`Tickets_${year}${month ? "_" + pad2(Number(month)) : ""}`];
      if (empresaKeyFilter) {
        const selected = empresaOptions.find((o) => o.key === empresaKeyFilter)?.label ?? "empresa";
        parts.push(selected.replace(/\s+/g, "_"));
      }
      const fileName = `${parts.join("_")}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error al exportar";
      setError(msg);
    }
  };

  /* =============== UI =============== */
  const years = Array.from({ length: 8 }, (_, i) => now.getFullYear() - i);
  const months = [
    { v: "", label: "Todos" },
    { v: 1, label: "Enero" },
    { v: 2, label: "Febrero" },
    { v: 3, label: "Marzo" },
    { v: 4, label: "Abril" },
    { v: 5, label: "Mayo" },
    { v: 6, label: "Junio" },
    { v: 7, label: "Julio" },
    { v: 8, label: "Agosto" },
    { v: 9, label: "Septiembre" },
    { v: 10, label: "Octubre" },
    { v: 11, label: "Noviembre" },
    { v: 12, label: "Diciembre" },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50/40 via-white to-white">
      <Header />

      <main className="p-6 max-w-6xl mx-auto">
        {/* Header de página */}
        <header className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900">Tickets</h1>
            <p className="text-sm text-neutral-500">
              Filtra por texto, estado, período y empresa; exporta a Excel con bordes y horario 24 h.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full md:w-auto">
            {/* Buscar */}
            <div className="relative w-full sm:w-64">
              <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Buscar asunto/solicitante/email"
                className={clsx(
                  "w-full rounded-2xl border border-neutral-300 bg-white pl-9 pr-10 py-2.5",
                  "focus:outline-none focus:ring-2 focus:ring-cyan-600/30 focus:border-cyan-600/50",
                )}
                aria-label="Buscar tickets"
              />
              {q.length > 0 && (
                <button
                  onClick={() => setQ("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  aria-label="Limpiar búsqueda"
                >
                  <CloseCircleFilled />
                </button>
              )}
            </div>

            {/* Empresa (por clave normalizada) */}
            <select
              value={empresaKeyFilter}
              onChange={(e) => {
                setEmpresaKeyFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-2xl border border-neutral-300 bg-white px-3 py-2.5 text-sm min-w-[220px]"
              aria-label="Filtrar por empresa"
              title="Filtrar por empresa"
            >
              <option value="">— Todas las empresas —</option>
              {empresaOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Año */}
            <select
              value={year}
              onChange={(e) => {
                setYear(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-2xl border border-neutral-300 bg-white px-3 py-2.5 text-sm"
              aria-label="Filtrar por año"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            {/* Mes */}
            <select
              value={month}
              onChange={(e) => {
                const v = e.target.value;
                setMonth(v === "" ? "" : Number(v));
                setPage(1);
              }}
              className="rounded-2xl border border-neutral-300 bg-white px-3 py-2.5 text-sm"
              aria-label="Filtrar por mes"
            >
              {months.map((m) => (
                <option key={String(m.v)} value={String(m.v)}>
                  {m.label}
                </option>
              ))}
            </select>

            {/* Solo cerrados */}
            <label className="inline-flex items-center gap-2 text-sm rounded-2xl border border-cyan-300 px-3 py-2.5 bg-white">
              <input
                type="checkbox"
                checked={onlyClosed}
                onChange={(e) => {
                  setOnlyClosed(e.target.checked);
                  setPage(1);
                }}
              />
              Solo cerrados
            </label>

            <button
              onClick={clearAll}
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300 text-cyan-800 px-3 py-2.5 text-sm hover:bg-cyan-50"
              title="Limpiar filtros"
            >
              <CloseCircleFilled /> Limpiar
            </button>

            {/* Exportar */}
            <button
              onClick={() => void exportExcel()}
              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-300 text-emerald-800 px-3 py-2.5 text-sm hover:bg-emerald-50"
              title="Exportar a Excel"
            >
              <FileExcelOutlined /> Exportar
            </button>

            <button
              onClick={() => void fetchList()}
              className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm border-cyan-300 text-cyan-800 hover:bg-cyan-50"
              title="Recargar"
            >
              <ReloadOutlined /> Recargar
            </button>
          </div>
        </header>

        {/* Tabla */}
        <section
          className="rounded-3xl border border-cyan-100 shadow-sm shadow-cyan-100/40 bg-white overflow-hidden"
          aria-live="polite"
          aria-busy={loading ? "true" : "false"}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-cyan-50 text-cyan-900 border-b border-cyan-100 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-3 w-[90px] font-semibold">ID</th>
                  <th className="text-left px-4 py-3 min-w-[260px] font-semibold">Asunto</th>
                  <th className="text-left px-4 py-3 min-w-[220px] font-semibold">Empresa</th>
                  <th className="text-left px-4 py-3 min-w-[240px] font-semibold">
                    Solicitante (email)
                  </th>
                  <th className="text-left px-4 py-3 min-w-[160px] font-semibold">Tipo</th>
                  <th className="text-left px-4 py-3 min-w-[180px] font-semibold">Fecha</th>
                  <th className="px-4 py-3 w-[70px]" />
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={`sk-${i}`} className="border-t border-neutral-100">
                      {Array.from({ length: 7 }).map((__, j) => (
                        <td key={`sk-${i}-${j}`} className="px-4 py-3">
                          <div className="h-4 w-full max-w-[260px] animate-pulse rounded bg-neutral-200/70" />
                        </td>
                      ))}
                    </tr>
                  ))}

                {!loading && error && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-red-600">
                      {error}
                    </td>
                  </tr>
                )}

                {!loading && !error && (data?.rows?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-neutral-500">
                      Sin resultados.
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  data?.rows?.map((t) => (
                    <tr
                      key={t.ticket_id}
                      className={clsx(
                        "border-t border-neutral-100 transition-colors",
                        "odd:bg-white even:bg-neutral-50/30 hover:bg-cyan-50/70",
                      )}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">{t.ticket_id}</td>
                      <td className="px-4 py-3">
                        <div className="max-w-[420px] truncate" title={t.subject}>
                          {t.subject}
                        </div>
                      </td>
                      <td className="px-4 py-3">{t.empresa ?? "—"}</td>
                      <td className="px-4 py-3">{t.solicitante_email ?? "—"}</td>
                      <td className="px-4 py-3">{t.type ?? "—"}</td>
                      <td className="px-4 py-3">{fmtDT(t.fecha)}</td>
                      <td className="px-4 py-3 text-right" />
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Footer paginación */}
          <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-cyan-100">
            <div className="text-sm text-neutral-700">
              {data && data.total > 0 ? (
                <>
                  Mostrando <strong>{showingRange?.start}</strong>–<strong>{showingRange?.end}</strong>{" "}
                  de <strong>{data.total}</strong> • Página <strong>{data.page}</strong> de{" "}
                  <strong>{totalPages}</strong>
                </>
              ) : (
                "—"
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => void fetchList()}
                className="inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm border-cyan-300 text-cyan-800 hover:bg-cyan-50"
                title="Recargar"
              >
                <ReloadOutlined /> Recargar
              </button>
              <div className="w-px h-5 bg-cyan-100" />
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!canPrev || loading}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm",
                  "border-cyan-300 text-cyan-800 hover:bg-cyan-50",
                  (!canPrev || loading) && "opacity-50 cursor-not-allowed hover:bg-transparent",
                )}
              >
                <LeftOutlined />
                <span className="hidden sm:inline">Anterior</span>
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={!canNext || loading}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm",
                  "border-cyan-300 text-cyan-800 hover:bg-cyan-50",
                  (!canNext || loading) && "opacity-50 cursor-not-allowed hover:bg-transparent",
                )}
              >
                <span className="hidden sm:inline">Siguiente</span>
                <RightOutlined />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default TicketsPage;
