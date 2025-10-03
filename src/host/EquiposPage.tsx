// src/pages/EquiposPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  SearchOutlined,
  LeftOutlined,
  RightOutlined,
  CloseCircleFilled,
  ReloadOutlined,
  LaptopOutlined,
  TagOutlined,
  TeamOutlined,
  DownloadOutlined,
  LoadingOutlined,
  UpOutlined,
  DownOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import Header from "../components/Header";

/* =================== Config =================== */
const API_URL =
  (import.meta as ImportMeta).env?.VITE_API_URL || "http://localhost:4000/api";
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 200; // para armar opciones de empresa
const EXPORT_PAGE_CANDIDATES = [500, 200, 100, 50, 25, 10]; // prueba escalonada

/* =================== Tipos =================== */
type EquipoRow = {
  id_equipo: number;
  serial: string;
  marca: string;
  modelo: string;
  procesador: string;
  ram: string;
  disco: string;
  propiedad: string;
  solicitante: string | null;
  empresa: string | null;
  idSolicitante: number;
  empresaId: number | null;
};

type ApiList<T> = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: T[];
};

type EmpresaOpt = { id: number | null; nombre: string };

/* =================== Helpers =================== */
function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}
function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
function strHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Paleta por empresa para Excel (fills más claros para cuerpo, más fuertes para header) */
function excelCompanyColors(empresa: string): { headerFill: string; bodyFill: string } {
  const e = (empresa || "").toLowerCase();

  // Casos especiales visibles
  if (e.includes("infinet")) return { headerFill: "FF1E3A8A", bodyFill: "FFDBEAFE" }; // azul fuerte / azul muy claro
  if (e.includes("acme"))    return { headerFill: "FF047857", bodyFill: "FFD1FAE5" }; // verde fuerte / verde muy claro
  if (e.includes("contoso")) return { headerFill: "FF6D28D9", bodyFill: "FFEDE9FE" }; // violeta fuerte / violeta muy claro

  // Fallback determinístico
  const palette = [
    { headerFill: "FF0E7490", bodyFill: "FFCCFBF1" }, // teal
    { headerFill: "FF2563EB", bodyFill: "FFDBEAFE" }, // azul
    { headerFill: "FF7C3AED", bodyFill: "FFEDE9FE" }, // violeta
    { headerFill: "FFB91C1C", bodyFill: "FFFEE2E2" }, // rojo
    { headerFill: "FFB45309", bodyFill: "FFFFEDD5" }, // naranja
    { headerFill: "FF15803D", bodyFill: "FFD1FAE5" }, // verde
    { headerFill: "FF9D174D", bodyFill: "FFFCE7F3" }, // fucsia
    { headerFill: "FF1D4ED8", bodyFill: "FFDBEAFE" }, // azul medio
  ];
  const idx = strHash(e || "empresa") % palette.length;
  return palette[idx];
}

/** Estilo de borde (resaltado) para todas las celdas */
const strongBorder = {
  top:    { style: "thin", color: { rgb: "FF94A3B8" } },
  left:   { style: "thin", color: { rgb: "FF94A3B8" } },
  right:  { style: "thin", color: { rgb: "FF94A3B8" } },
  bottom: { style: "thin", color: { rgb: "FF94A3B8" } },
} as const;

/** Aplica estilos a una hoja: header distinto, cuerpo con color por empresa, autofiltro y anchos */
function styleWorksheet(
  XLSX: typeof import("xlsx-js-style"),
  ws: import("xlsx-js-style").WorkSheet,
  headers: string[],
  totalRows: number,
  headerFill: string,
  bodyFill: string
) {
  ws["!autofilter"] = {
    ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: totalRows, c: headers.length - 1 } }),
  };

  (ws["!cols"] as Array<{ wch: number }>) = headers.map((key) => ({
    wch: Math.min(Math.max(key.length + 2, 10), 40),
  }));

  // Header con color fuerte, texto blanco y borde
  for (let c = 0; c < headers.length; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c });
    const cell = ws[cellRef];
    if (!cell) continue;
    cell.s = {
      fill:   { fgColor: { rgb: headerFill } },
      font:   { bold: true, color: { rgb: "FFFFFFFF" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: strongBorder,
    };
  }

  // Cuerpo con fill por empresa y bordes; primera columna algo distinta
  for (let r = 1; r <= totalRows; r++) {
    for (let c = 0; c < headers.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      if (!ws[cellRef]) continue;
      const isFirstCol = c === 0;
      ws[cellRef]!.s = {
        fill: { fgColor: { rgb: isFirstCol ? "FFF1F5F9" : bodyFill } },
        alignment: { vertical: "center" },
        border: strongBorder,
      };
    }
  }
}

/** Tags empresa (chips) */
const COMPANY_TAG_PALETTE = [
  "border-emerald-200 bg-emerald-50 text-emerald-900",
  "border-teal-200 bg-teal-50 text-teal-900",
  "border-cyan-200 bg-cyan-50 text-cyan-900",
  "border-sky-200 bg-sky-50 text-sky-900",
  "border-blue-200 bg-blue-50 text-blue-900",
  "border-indigo-200 bg-indigo-50 text-indigo-900",
  "border-violet-200 bg-violet-50 text-violet-900",
  "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900",
  "border-rose-200 bg-rose-50 text-rose-900",
  "border-amber-200 bg-amber-50 text-amber-900",
  "border-lime-200 bg-lime-50 text-lime-900",
  "border-green-200 bg-green-50 text-green-900",
];
function companyTagClasses(empresaName?: string | null) {
  if (!empresaName) return "border-neutral-200 bg-neutral-50 text-neutral-700";
  const idx = strHash(empresaName) % COMPANY_TAG_PALETTE.length;
  return COMPANY_TAG_PALETTE[idx];
}

/** Tags marca */
function brandTagClasses(brand?: string | null) {
  const b = (brand || "").trim().toLowerCase();
  if (/apple|macbook|imac|mac/.test(b))
    return "border-slate-300 bg-slate-50 text-slate-900";
  if (/dell/.test(b)) return "border-indigo-200 bg-indigo-50 text-indigo-900";
  if (/\bhp\b|hewlett|packard/.test(b))
    return "border-sky-200 bg-sky-50 text-sky-900";
  if (/lenovo/.test(b))
    return "border-orange-200 bg-orange-50 text-orange-900";
  if (/acer/.test(b)) return "border-lime-200 bg-lime-50 text-lime-900";
  if (/asus/.test(b)) return "border-violet-200 bg-violet-50 text-violet-900";
  if (/samsung/.test(b)) return "border-blue-200 bg-blue-50 text-blue-900";
  if (/\bmsi\b/.test(b)) return "border-rose-200 bg-rose-50 text-rose-900";
  if (/toshiba/.test(b)) return "border-amber-200 bg-amber-50 text-amber-900";
  if (/huawei/.test(b)) return "border-red-200 bg-red-50 text-red-900";
  const FALLBACK = [
    "border-teal-200 bg-teal-50 text-teal-900",
    "border-cyan-200 bg-cyan-50 text-cyan-900",
    "border-emerald-200 bg-emerald-50 text-emerald-900",
    "border-blue-200 bg-blue-50 text-blue-900",
    "border-indigo-200 bg-indigo-50 text-indigo-900",
    "border-violet-200 bg-violet-50 text-violet-900",
    "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900",
    "border-rose-200 bg-rose-50 text-rose-900",
    "border-amber-200 bg-amber-50 text-amber-900",
    "border-lime-200 bg-lime-50 text-lime-900",
  ];
  const idx = strHash(b || "brand") % FALLBACK.length;
  return FALLBACK[idx];
}

/** Tema por empresa (color de fila y borde izquierdo). Incluye casos especiales. */
function companyRowTheme(empresa?: string | null): {
  bg: string;
  borderLeft: string;
} {
  const e = (empresa || "").toLowerCase().trim();
  if (e.includes("infinet"))
    return { bg: "bg-blue-50/60", borderLeft: "border-blue-400" };
  if (e.includes("acme"))
    return { bg: "bg-emerald-50/60", borderLeft: "border-emerald-400" };
  if (e.includes("contoso"))
    return { bg: "bg-violet-50/60", borderLeft: "border-violet-400" };

  const palette = [
    { bg: "bg-cyan-50/60", borderLeft: "border-cyan-400" },
    { bg: "bg-sky-50/60", borderLeft: "border-sky-400" },
    { bg: "bg-indigo-50/60", borderLeft: "border-indigo-400" },
    { bg: "bg-rose-50/60", borderLeft: "border-rose-400" },
    { bg: "bg-amber-50/60", borderLeft: "border-amber-400" },
    { bg: "bg-lime-50/60", borderLeft: "border-lime-400" },
    { bg: "bg-teal-50/60", borderLeft: "border-teal-400" },
    { bg: "bg-fuchsia-50/60", borderLeft: "border-fuchsia-400" },
    { bg: "bg-emerald-50/60", borderLeft: "border-emerald-400" },
    { bg: "bg-blue-50/60", borderLeft: "border-blue-400" },
  ];
  const idx = strHash(e || "empresa") % palette.length;
  return palette[idx];
}

/* =================== Skeletons =================== */
const TableSkeletonRows: React.FC<{ cols: number; rows?: number }> = ({
  cols,
  rows = 8,
}) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={`sk-${i}`} className="border-t border-neutral-100">
        {Array.from({ length: cols }).map((__, j) => (
          <td key={`sk-${i}-${j}`} className="px-4 py-3">
            <div className="h-4 w-full max-w-[240px] animate-pulse rounded bg-neutral-200/70" />
          </td>
        ))}
      </tr>
    ))}
  </>
);

/* =================== Utils UI =================== */
const toUC = (s?: string | null) => (s ? s.toUpperCase() : "");
type SortKey =
  | "id_equipo"
  | "serial"
  | "marca"
  | "modelo"
  | "procesador"
  | "ram"
  | "disco"
  | "propiedad"
  | "solicitante"
  | "empresa";
type SortDir = "asc" | "desc";
const sortIcon = (dir?: SortDir) =>
  !dir ? <SwapOutlined className="opacity-50" /> : dir === "asc" ? <UpOutlined /> : <DownOutlined />;

/* =================== Page =================== */
const EquiposPage: React.FC = () => {
  // Búsqueda
  const [q, setQ] = useState("");
  const qDebounced = useDebouncedValue(q, 450);

  // Empresa (SELECT)
  const [empresaOptions, setEmpresaOptions] = useState<EmpresaOpt[]>([]);
  const [empresaFilterId, setEmpresaFilterId] = useState<number | null>(null);
  const [empLoading, setEmpLoading] = useState(false);
  const [empError, setEmpError] = useState<string | null>(null);

  const empresaFilterName = useMemo(
    () => empresaOptions.find((e) => e.id === empresaFilterId)?.nombre ?? "",
    [empresaFilterId, empresaOptions]
  );

  // Marca (clic en tag)
  const [marcaFilter, setMarcaFilter] = useState<string>("");

  // Datos / paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [data, setData] = useState<ApiList<EquipoRow> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ordenamiento client-side
  const [sortKey, setSortKey] = useState<SortKey>("id_equipo");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Export
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const canPrev = page > 1;
  const totalPages = data?.totalPages ?? 1;
  const canNext = page < totalPages;

  const showingRange = useMemo(() => {
    const pgSize = data?.pageSize ?? pageSize;
    if (!data || data.total === 0) return null;
    const start = (data.page - 1) * pgSize + 1;
    const end = Math.min(data.page * pgSize, data.total);
    return { start, end };
  }, [data, pageSize]);

  const reqSeqRef = useRef(0);
  const empSeqRef = useRef(0);

  /* ======== URL builder ======== */
  const buildUrl = (p: number, ps: number, searchRaw?: string) => {
    const u = new URL(`${API_URL}/equipos`);
    u.searchParams.set("page", String(p));
    u.searchParams.set("pageSize", String(ps));
    const sTerm = searchRaw ?? qDebounced;
    const merged = [sTerm, empresaFilterName].filter(Boolean).join(" ").trim();
    if (merged) u.searchParams.set("search", merged);
    if (empresaFilterName) u.searchParams.set("empresaName", empresaFilterName);
    if (marcaFilter) u.searchParams.set("marca", marcaFilter);
    u.searchParams.set("_ts", String(Date.now()));
    return u.toString();
  };

  /* ======== Fetch lista ======== */
  async function fetchList(signal?: AbortSignal) {
    const seq = ++reqSeqRef.current;
    try {
      setLoading(true);
      setError(null);
      const url = buildUrl(page, pageSize);
      const token = localStorage.getItem("accessToken");
      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        cache: "no-store",
        signal,
      });

      if (seq !== reqSeqRef.current) return;

      if (!res.ok && res.status !== 204) {
        let apiErr = `HTTP ${res.status}`;
        try {
          const payload = await res.json();
          apiErr = (payload as { error?: string })?.error || apiErr;
        } catch {
          const text = await res.text();
          if (text) apiErr = text.slice(0, 200);
        }
        throw new Error(apiErr);
      }

      if (res.status === 204) {
        setData({ page, pageSize, total: 0, totalPages: 1, items: [] });
        return;
      }

      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        const text = await res.text();
        throw new Error(
          `La API devolvió contenido no-JSON (content-type: ${ct}). Resumen: ${text.slice(0, 200)}`
        );
      }

      const json = (await res.json()) as ApiList<EquipoRow>;
      setData(json);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error)?.message || "Error al cargar equipos");
    } finally {
      if (seq === reqSeqRef.current) setLoading(false);
    }
  }

  /* ======== Export Excel (Todos + por empresa + Resumen con estilos) ======== */
  async function exportToExcel() {
    try {
      setExportError(null);
      setExporting(true);

      const token = localStorage.getItem("accessToken");
      const fetchPage = async (p: number, ps: number) => {
        const res = await fetch(buildUrl(p, ps, q), {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          cache: "no-store",
        });
        return res;
      };

      // Detectar pageSize aceptado
      let detected: number | null = null;
      let firstPage: ApiList<EquipoRow> | null = null;
      for (const candidate of EXPORT_PAGE_CANDIDATES) {
        const res = await fetchPage(1, candidate);
        if (res.ok || res.status === 204) {
          detected = candidate;
          firstPage =
            res.status === 204
              ? { page: 1, pageSize: candidate, total: 0, totalPages: 1, items: [] }
              : ((await res.json()) as ApiList<EquipoRow>);
          break;
        }
        if (res.status !== 400) {
          let msg = `HTTP ${res.status}`;
          try {
            const payload = await res.json();
            msg = (payload as { error?: string })?.error || msg;
          } catch { /* ignore */ }
          throw new Error(msg);
        }
      }
      if (!detected || !firstPage) throw new Error("No se pudo determinar pageSize.");

      // Acumular todo
      const all: EquipoRow[] = [];
      all.push(...(firstPage.items || []));
      for (let p = 2; p <= (firstPage.totalPages || 1); p++) {
        const rx = await fetchPage(p, detected);
        if (!rx.ok) throw new Error(`HTTP ${rx.status}`);
        const jx = (await rx.json()) as ApiList<EquipoRow>;
        all.push(...(jx.items || []));
      }

      // Map a filas
      const rowMap = (e: EquipoRow) => ({
        ID: e.id_equipo,
        SERIAL: toUC(e.serial),
        MARCA: toUC(e.marca),
        MODELO: e.modelo || "",
        CPU: e.procesador || "",
        RAM: e.ram || "",
        DISCO: e.disco || "",
        PROPIEDAD: e.propiedad || "",
        SOLICITANTE: e.solicitante || "",
        EMPRESA: e.empresa || "",
        SolicitanteId: e.idSolicitante,
        EmpresaId: e.empresaId ?? "",
      });

      // Agrupar por empresa
      const byEmpresa = new Map<string, EquipoRow[]>();
      for (const it of all) {
        const key = it.empresa || "— SIN EMPRESA —";
        if (!byEmpresa.has(key)) byEmpresa.set(key, []);
        byEmpresa.get(key)!.push(it);
      }

      // Resúmenes
      const resumenRows: { EMPRESA: string; TOTAL: number }[] = [];
      const resumenMarcaRows: { EMPRESA: string; MARCA: string; TOTAL: number }[] = [];
      for (const [emp, arr] of byEmpresa) {
        resumenRows.push({ EMPRESA: emp, TOTAL: arr.length });
        const m = new Map<string, number>();
        for (const it of arr) {
          const mk = (it.marca || "—").toUpperCase();
          m.set(mk, (m.get(mk) || 0) + 1);
        }
        for (const [marca, total] of m) {
          resumenMarcaRows.push({ EMPRESA: emp, MARCA: marca, TOTAL: total });
        }
      }

      // ✅ Import con estilos
      const XLSX = await import("xlsx-js-style");
      const wb = XLSX.utils.book_new();

      // Hoja: Todos (header gris fuerte, cuerpo gris claro)
      const rowsTodos = all.map(rowMap);
      const wsTodos = XLSX.utils.json_to_sheet(rowsTodos);
      const todosHeader = Object.keys(rowsTodos[0] || { ID: "", SERIAL: "" });
      styleWorksheet(
        XLSX,
        wsTodos,
        todosHeader,
        rowsTodos.length,
        "FF334155", // header gris oscuro
        "FFF8FAFC"  // cuerpo gris muy claro
      );
      XLSX.utils.book_append_sheet(wb, wsTodos, "Todos");

      // Hojas por empresa (colores propios)
      for (const [emp, arr] of byEmpresa) {
        const rs = arr.map(rowMap);
        const ws = XLSX.utils.json_to_sheet(rs);
        const header = Object.keys(rs[0] || { ID: "", SERIAL: "" });

        const { headerFill, bodyFill } = excelCompanyColors(emp);
        styleWorksheet(XLSX, ws, header, rs.length, headerFill, bodyFill);

        // nombre seguro (<=31 chars, sin inválidos) — ¡ojo con '[' y ']'!
        const safeName = emp.replace(/[\\/?*[\]:]/g, "_").slice(0, 31) || "Empresa";
        XLSX.utils.book_append_sheet(wb, ws, safeName);
      }

      // Hoja Resumen (estilo neutro, con bordes)
      const wsResumen = XLSX.utils.json_to_sheet(resumenRows);
      const resumenHeader = Object.keys(resumenRows[0] || { EMPRESA: "", TOTAL: 0 });
      styleWorksheet(XLSX, wsResumen, resumenHeader, resumenRows.length, "FF0F766E", "FFECFEFF");
      XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

      const wsResumenMarca = XLSX.utils.json_to_sheet(resumenMarcaRows);
      const resumenMarcaHeader = Object.keys(resumenMarcaRows[0] || { EMPRESA: "", MARCA: "", TOTAL: 0 });
      styleWorksheet(XLSX, wsResumenMarca, resumenMarcaHeader, resumenMarcaRows.length, "FF6B21A8", "FFEDE9FE");
      XLSX.utils.book_append_sheet(wb, wsResumenMarca, "Resumen x Marca");

      // Guardar
      const parts: string[] = ["equipos"];
      if (empresaFilterName) parts.push(`empresa-${empresaFilterName.replace(/\s+/g, "_")}`);
      if (marcaFilter) parts.push(`marca-${marcaFilter.replace(/\s+/g, "_")}`);
      const fileName = `${parts.join("_")}_${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:T]/g, "-")}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      setExportError((err as Error)?.message || "Error al exportar a Excel");
    } finally {
      setExporting(false);
    }
  }

  /* ======== Empresas (fallback desde /equipos) ======== */
  async function fetchEmpresaOptions(signal?: AbortSignal) {
    const seq = ++empSeqRef.current;
    try {
      setEmpLoading(true);
      setEmpError(null);

      const base = new URL(`${API_URL}/equipos`);
      base.searchParams.set("page", "1");
      base.searchParams.set("pageSize", String(MAX_PAGE_SIZE));
      base.searchParams.set("_ts", String(Date.now()));

      const token = localStorage.getItem("accessToken");
      const r1 = await fetch(base.toString(), {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        cache: "no-store",
        signal,
      });
      if (seq !== empSeqRef.current) return;
      if (!r1.ok) throw new Error(`HTTP ${r1.status}`);

      const first = (await r1.json()) as ApiList<EquipoRow>;
      const totalPagesLocal = first.totalPages || 1;

      const empresas = new Map<number, string>();
      const consumePage = (pl: ApiList<EquipoRow>) => {
        for (const it of pl.items) {
          if (it.empresaId != null && it.empresa) {
            empresas.set(it.empresaId, it.empresa);
          }
        }
      };

      consumePage(first);
      for (let p = 2; p <= totalPagesLocal; p++) {
        if (signal?.aborted) return;
        const u = new URL(`${API_URL}/equipos`);
        u.searchParams.set("page", String(p));
        u.searchParams.set("pageSize", String(MAX_PAGE_SIZE));
        u.searchParams.set("_ts", String(Date.now()));
        const rx = await fetch(u.toString(), {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          cache: "no-store",
          signal,
        });
        if (seq !== empSeqRef.current) return;
        if (!rx.ok) throw new Error(`HTTP ${rx.status}`);
        const pj = (await rx.json()) as ApiList<EquipoRow>;
        consumePage(pj);
      }

      const opts: EmpresaOpt[] = Array.from(empresas.entries())
        .map(([id, nombre]) => ({ id, nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

      setEmpresaOptions(opts);
      if (opts.length > 0 && empresaFilterId == null) {
        setEmpresaFilterId(opts[0].id!);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setEmpError((err as Error)?.message || "Error al cargar empresas");
      setEmpresaOptions([]);
    } finally {
      if (seq === empSeqRef.current) setEmpLoading(false);
    }
  }

  /* ======== Effects ======== */
  useEffect(() => {
    const c = new AbortController();
    fetchList(c.signal);
    return () => c.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, qDebounced, empresaFilterName, marcaFilter]);

  useEffect(() => {
    const c = new AbortController();
    fetchEmpresaOptions(c.signal);
    return () => c.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ======== Handlers ======== */
  const clearAll = () => {
    setQ("");
    setMarcaFilter("");
    setEmpresaFilterId(null);   // 👈 ahora también limpia la empresa
    setPage(1);
    const c = new AbortController();
    fetchList(c.signal);
  };

  const reload = () => {
    const c = new AbortController();
    fetchList(c.signal);
  };
  const goPrev = () => canPrev && setPage((p) => p - 1);
  const goNext = () => canNext && setPage((p) => p + 1);
  const onChangePageSize = (val: number) => {
    if (val === pageSize) return;
    setPageSize(val);
    setPage(1);
  };
  const onClickBrand = (brand: string) => {
    const b = brand.trim();
    setMarcaFilter((prev) => (prev.toLowerCase() === b.toLowerCase() ? "" : b));
    setPage(1);
  };

  // ordenar client-side (sin 'any')
  const sortedItems = useMemo(() => {
    const arr = data?.items ? [...data.items] : [];
    const dir: 1 | -1 = sortDir === "asc" ? 1 : -1;

    const toComparable = (
      v: string | number | null | undefined
    ): { n?: number; s: string } => {
      if (typeof v === "number") return { n: v, s: String(v) };
      const s = (v ?? "").toString().toLowerCase();
      return { s };
    };

    arr.sort((a, b) => {
      const va = a[sortKey] as string | number | null | undefined;
      const vb = b[sortKey] as string | number | null | undefined;
      const ca = toComparable(va);
      const cb = toComparable(vb);
      if (typeof ca.n === "number" && typeof cb.n === "number") {
        return (ca.n - cb.n) * dir;
      }
      if (ca.s < cb.s) return -1 * dir;
      if (ca.s > cb.s) return 1 * dir;
      return 0;
    });

    return arr;
  }, [data?.items, sortKey, sortDir]);

  // usar el setter (toggleSort)
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  /* =================== UI =================== */
  const headerCols = [
    { key: "id_equipo", label: "ID", className: "w-[80px]" },
    { key: "serial", label: "Serial", className: "min-w-[180px]" },
    { key: "marca", label: "Marca", className: "min-w-[160px]" },
    { key: "modelo", label: "Modelo", className: "min-w-[200px]" },
    { key: "procesador", label: "CPU", className: "min-w-[200px]" },
    { key: "ram", label: "RAM", className: "min-w-[110px]" },
    { key: "disco", label: "Disco", className: "min-w-[130px]" },
    { key: "propiedad", label: "Propiedad", className: "min-w-[130px]" },
    { key: "solicitante", label: "Solicitante", className: "min-w-[200px]" },
    { key: "empresa", label: "Empresa", className: "min-w-[200px]" },
  ] as const;
  const lastHeaderIdx = headerCols.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50/40 via-white to-white">
      <Header />

      <main className="p-4 sm:p-6 max-w-6xl mx-auto">
        {/* Título + contador */}
        <header className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
              Equipos
            </h1>
            <p className="text-sm text-neutral-500">
              Inventario, especificaciones y relación con solicitantes/empresas — RIDS
            </p>
          </div>
          <div className="text-sm text-neutral-600">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <LoadingOutlined /> Cargando…
              </span>
            ) : (
              `${(data?.total ?? 0).toLocaleString()} resultado(s)`
            )}
          </div>
        </header>

        {/* Filtros principales (incluye SELECT de empresas) */}
        {/* Filtros principales (RESPONSIVO) */}
        <section className="rounded-3xl border border-cyan-100 bg-white shadow-sm shadow-cyan-100/40 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Buscar */}
            <div className="lg:col-span-3 sm:col-span-2 min-w-0">
            <label className="text-xs font-semibold text-neutral-600">Buscar</label>
            <div className="relative">
                <span className="absolute left-3 top-[10px] sm:top-[10px] text-neutral-500">
                <SearchOutlined />
                </span>
                <input
                value={q}
                onChange={(e) => { setQ(e.target.value); setPage(1); }}
                placeholder="serial, modelo, CPU…"
                className="mt-1 w-full rounded-2xl border pl-9 pr-10 py-2.5 outline-none focus:ring-2 focus:ring-cyan-600/30 focus:border-cyan-600/50"
                />
                {q.length > 0 && (
                <button
                    onClick={() => setQ("")}
                    className="absolute right-2 top-[10px] sm:top-[10px] text-neutral-400 hover:text-neutral-600"
                    aria-label="Limpiar búsqueda"
                    title="Limpiar"
                >
                    <CloseCircleFilled />
                </button>
                )}
            </div>
            </div>

            {/* Empresa (SELECT) */}
            <div className="lg:col-span-2 sm:col-span-2 min-w-0">
            <label className="text-xs font-semibold text-neutral-600">Empresa</label>
            <div className="mt-1">
                <select
                value={empresaFilterId ?? ""}
                onChange={(e) => {
                    const v = e.target.value;
                    setEmpresaFilterId(v ? Number(v) : null);
                    setPage(1);
                }}
                className="w-full min-w-0 rounded-2xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-600/30 focus:border-cyan-600/50"
                >
                <option value="">
                    {empLoading ? "Cargando empresas..." : "— Filtrar por empresa —"}
                </option>
                {empresaOptions.map((opt) => (
                    <option key={opt.id ?? -1} value={opt.id ?? ""}>
                    {opt.nombre}
                    </option>
                ))}
                </select>
            </div>
            {empError && <div className="text-[11px] text-red-600 mt-1">{empError}</div>}
            </div>


            {/* Acciones */}
            <div className="lg:col-span-1 sm:col-span-2">
            <div className="h-full flex sm:justify-end items-end">
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                    onClick={clearAll}
                    className="flex-1 sm:flex-none rounded-2xl border border-cyan-300 text-cyan-800 px-3 py-2.5 text-sm hover:bg-cyan-50"
                    title="Limpiar filtros"
                >
                    Limpiar
                </button>
                <button
                    onClick={reload}
                    className="rounded-2xl border border-cyan-300 text-cyan-800 px-3 py-2.5 text-sm hover:bg-cyan-50"
                    title="Recargar"
                >
                    <ReloadOutlined />
                </button>
                <button
                    onClick={exportToExcel}
                    disabled={exporting || loading}
                    className={clsx(
                    "rounded-2xl border px-3 py-2.5 text-sm inline-flex items-center gap-2",
                    "border-emerald-300 text-emerald-800 hover:bg-emerald-50",
                    (exporting || loading) && "opacity-60 cursor-not-allowed"
                    )}
                    title="Exportar a Excel (Todos, por Empresa y Resumen)"
                >
                    <DownloadOutlined />
                    {exporting ? "Exportando…" : "Exportar Excel"}
                </button>
                </div>
            </div>
            </div>
        </div>

        {/* Chips de filtros activos */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
            {empresaFilterName && (
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 text-cyan-900 px-3 py-1 text-xs">
                Empresa: <strong className="truncate max-w-[40vw]">{empresaFilterName}</strong>
                <button
                onClick={() => { setEmpresaFilterId(null); setPage(1); }}
                className="hover:text-cyan-700"
                aria-label="Quitar filtro de empresa"
                title="Quitar filtro de empresa"
                >
                <CloseCircleFilled />
                </button>
            </span>
            )}
            {marcaFilter && (
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-900 px-3 py-1 text-xs">
                Marca: <strong>{toUC(marcaFilter)}</strong>
                <button
                onClick={() => { setMarcaFilter(""); setPage(1); }}
                className="hover:text-indigo-700"
                aria-label="Quitar filtro de marca"
                title="Quitar filtro de marca"
                >
                <CloseCircleFilled />
                </button>
            </span>
            )}
            {exportError && (
            <span className="text-xs text-red-600">Error exportando: {exportError}</span>
            )}
        </div>

        {/* Rango + page size */}
        <div className="mt-3 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="text-xs text-neutral-500">
            {data && data.total > 0 ? (
                <>Mostrando <b>{showingRange?.start}</b>–<b>{showingRange?.end}</b> de <b>{data.total}</b></>
            ) : "—"}
            </div>
            <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-600">Por página</span>
            <select
                value={data?.pageSize ?? pageSize}
                onChange={(ev) => onChangePageSize(Number(ev.target.value))}
                className="rounded-xl border px-2 py-1"
            >
                {[10, 20, 30].map((n) => (
                <option key={n} value={n}>{n}</option>
                ))}
            </select>
            </div>
        </div>
        </section>


        {/* Tabla */}
        <section
          className="mt-4 rounded-3xl border border-cyan-100 shadow-sm shadow-cyan-100/40 bg-white overflow-hidden"
          aria-live="polite"
          aria-busy={loading ? "true" : "false"}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-[13px] sm:text-sm">
              {/* Encabezado con fondo y bordes reforzados */}
              <thead className="sticky top-0 z-10">
                <tr className="bg-gradient-to-r from-cyan-50 to-white border-b-2 border-cyan-200">
                  {headerCols.map((col, i) => (
                    <th
                      key={col.key}
                      className={clsx(
                        "text-left px-4 py-3 font-semibold text-cyan-900 select-none",
                        "border-r border-cyan-100",
                        i === 0 && "border-l-2 border-l-cyan-300 rounded-tl-xl",
                        i === lastHeaderIdx && "rounded-tr-xl",
                        col.className
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key as SortKey)}
                        className="inline-flex items-center gap-1 hover:opacity-80"
                        title="Ordenar"
                      >
                        <span>{col.label}</span>
                        <span>
                          {sortKey === col.key ? sortIcon(sortDir) : sortIcon(undefined)}
                        </span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading && <TableSkeletonRows cols={headerCols.length} rows={8} />}

                {!loading && error && (
                  <tr>
                    <td colSpan={headerCols.length} className="px-4 py-10 text-center text-red-600">
                      {error}
                    </td>
                  </tr>
                )}

                {!loading && !error && sortedItems.length === 0 && (
                  <tr>
                    <td colSpan={headerCols.length} className="px-4 py-12">
                      <div className="flex flex-col items-center gap-3 text-neutral-600">
                        <span>No encontramos resultados</span>
                        <div className="flex gap-2">
                          <button
                            onClick={clearAll}
                            className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 text-cyan-800 px-3 py-2 text-sm hover:bg-cyan-50"
                          >
                            <CloseCircleFilled />
                            Limpiar
                          </button>
                          <button
                            onClick={reload}
                            className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 text-cyan-800 px-3 py-2 text-sm hover:bg-cyan-50"
                          >
                            <ReloadOutlined />
                            Recargar
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}

                {!loading &&
                  !error &&
                  sortedItems.map((e) => {
                    const brand = e.marca || "";
                    const isBrandActive =
                      marcaFilter && marcaFilter.toLowerCase() === brand.toLowerCase();
                    const theme = companyRowTheme(e.empresa);

                    return (
                      <tr
                        key={e.id_equipo}
                        className={clsx(
                          "border-t border-neutral-100 transition-colors",
                          theme.bg,
                          "hover:bg-cyan-50/70"
                        )}
                      >
                        {/* borde izquierdo por empresa */}
                        <td
                          className={clsx(
                            "px-4 py-3 whitespace-nowrap border-l-4 rounded-l-xl",
                            theme.borderLeft
                          )}
                          title={e.empresa || undefined}
                        >
                          {e.id_equipo}
                        </td>

                        <td className="px-4 py-3 font-mono tracking-wide">
                          {toUC(e.serial)}
                        </td>

                        <td className="px-4 py-3">
                          {e.marca ? (
                            <button
                              type="button"
                              onClick={() => onClickBrand(brand)}
                              className={clsx(
                                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border transition",
                                brandTagClasses(e.marca),
                                "hover:brightness-95",
                                isBrandActive && "ring-2 ring-offset-1 ring-indigo-300"
                              )}
                              title={
                                isBrandActive
                                  ? "Quitar filtro de esta marca"
                                  : "Filtrar por esta marca"
                              }
                              aria-pressed={isBrandActive ? true : undefined}
                            >
                              <TagOutlined className="opacity-80" /> {toUC(e.marca)}
                            </button>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3">
                          {e.modelo || <span className="text-neutral-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {e.procesador || <span className="text-neutral-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {e.ram || <span className="text-neutral-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {e.disco || <span className="text-neutral-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {e.propiedad || <span className="text-neutral-400">—</span>}
                        </td>

                        <td className="px-4 py-3">
                          {e.solicitante ? (
                            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border border-cyan-200 bg-cyan-50 text-cyan-900">
                              <LaptopOutlined className="opacity-80" /> {e.solicitante}
                            </span>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3 rounded-r-xl">
                          {e.empresa ? (
                            <span
                              className={clsx(
                                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border",
                                companyTagClasses(e.empresa)
                              )}
                            >
                              <TeamOutlined className="opacity-80" /> {e.empresa}
                            </span>
                          ) : (
                            <span className="text-neutral-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Paginación resultados */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 bg-white border-t border-cyan-100">
            <div className="text-sm text-neutral-700">
              {data ? (
                <span>
                  {showingRange ? (
                    <>
                      Mostrando <strong>{showingRange.start}</strong>–<strong>{showingRange.end}</strong> de{" "}
                      <strong>{data.total}</strong> •{" "}
                    </>
                  ) : null}
                  Página <strong>{data.page}</strong> de <strong>{data.totalPages}</strong>
                </span>
              ) : (
                <span>—</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={goPrev}
                disabled={!canPrev || loading}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm",
                  "border-cyan-300 text-cyan-800 hover:bg-cyan-50",
                  (!canPrev || loading) && "opacity-50 cursor-not-allowed hover:bg-transparent"
                )}
                aria-label="Página anterior"
              >
                <LeftOutlined />
                <span className="hidden sm:inline">Anterior</span>
              </button>

              <button
                onClick={goNext}
                disabled={!canNext || loading}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm",
                  "border-cyan-300 text-cyan-800 hover:bg-cyan-50",
                  (!canNext || loading) && "opacity-50 cursor-not-allowed hover:bg-transparent"
                )}
                aria-label="Página siguiente"
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

export default EquiposPage;
