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
  PlusOutlined,
} from "@ant-design/icons";
import Header from "../components/Header";
import CrearEquipoModal from "../components/CrearEquipo";

import {
  BuildingOfficeIcon,
  CalendarIcon,
  ChevronDownIcon,
  ExclamationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

/* =================== Config =================== */
const API_URL =
  (import.meta as ImportMeta).env?.VITE_API_URL || "http://localhost:4000/api";
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 200;
const EXPORT_PAGE_CANDIDATES = [500, 200, 100, 50, 25, 10];
const API_BASE = API_URL.replace(/\/api\/?$/, "");

/* =================== Tipos =================== */
type EquipoRow = {
  id_equipo: number;
  serial: string | null;
  marca: string | null;
  modelo: string | null;
  procesador: string | null;
  ram: string | null;
  disco: string | null;
  propiedad: string | null;
  solicitante: string | null;
  empresa: string | null;
  idSolicitante: number | null;
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

type SolicitanteLite = {
  id_solicitante: number;
  nombre: string;
  empresa?: { id_empresa: number; nombre: string } | null;
};
type ListSolicitantesResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: Array<{
    id_solicitante: number;
    nombre: string;
    empresaId: number | null;
    empresa: { id_empresa: number; nombre: string } | null;
  }>;
};

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
function toUC(s?: string | null) {
  return s ? s.toUpperCase() : "";
}

/** Colores Excel por empresa */
function excelCompanyColors(empresa: string): { headerFill: string; bodyFill: string } {
  const e = (empresa || "").toLowerCase();
  if (e.includes("infinet")) return { headerFill: "FF1E3A8A", bodyFill: "FFDBEAFE" };
  if (e.includes("acme")) return { headerFill: "FF047857", bodyFill: "FFD1FAE5" };
  if (e.includes("contoso")) return { headerFill: "FF6D28D9", bodyFill: "FFEDE9FE" };
  const palette = [
    { headerFill: "FF0E7490", bodyFill: "FFCCFBF1" },
    { headerFill: "FF2563EB", bodyFill: "FFDBEAFE" },
    { headerFill: "FF7C3AED", bodyFill: "FFEDE9FE" },
    { headerFill: "FFB91C1C", bodyFill: "FFFEE2E2" },
    { headerFill: "FFB45309", bodyFill: "FFFFEDD5" },
    { headerFill: "FF15803D", bodyFill: "FFD1FAE5" },
    { headerFill: "FF9D174D", bodyFill: "FFFCE7F3" },
    { headerFill: "FF1D4ED8", bodyFill: "FFDBEAFE" },
  ];
  const idx = strHash(e || "empresa") % palette.length;
  return palette[idx];
}
const strongBorder = {
  top: { style: "thin", color: { rgb: "FF94A3B8" } },
  left: { style: "thin", color: { rgb: "FF94A3B8" } },
  right: { style: "thin", color: { rgb: "FF94A3B8" } },
  bottom: { style: "thin", color: { rgb: "FF94A3B8" } },
} as const;

// Tipos auxiliares (ajusta si ya los importas en otro sitio)
type XLSXNS = typeof import("xlsx-js-style");
type WorkSheet = import("xlsx-js-style").WorkSheet;
type CellObject = import("xlsx-js-style").CellObject;
type ColInfo = import("xlsx-js-style").ColInfo;
type Range = import("xlsx-js-style").Range;

/** Estilo mínimo que usamos (evita `any`) */
type CellStyle = {
  fill?: { fgColor?: { rgb?: string } };
  font?: { bold?: boolean; color?: { rgb?: string } };
  alignment?: {
    horizontal?: "center" | "left" | "right";
    vertical?: "center" | "top" | "bottom";
    wrapText?: boolean;
  };
  border?: typeof strongBorder;
};

/** Aplica estilo si la celda existe */
function setCellStyle(ws: WorkSheet, addr: string, style: CellStyle) {
  const cell = ws[addr] as (CellObject & { s?: CellStyle }) | undefined;
  if (!cell) return;
  cell.s = style;
}

// Helpers seguros de error (ponlos arriba del componente o en un utils)
type ApiErrorPayload = { error?: string; message?: string };

function isApiErrorPayload(v: unknown): v is ApiErrorPayload {
  return typeof v === "object" && v !== null && ("error" in v || "message" in v);
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

function styleWorksheet(
  XLSX: XLSXNS,
  ws: WorkSheet,
  headers: string[],
  totalRows: number,
  headerFill: string,
  bodyFill: string
) {
  // Autofiltro
  const range: Range = {
    s: { r: 0, c: 0 },
    e: { r: totalRows, c: headers.length - 1 },
  };
  ws["!autofilter"] = { ref: XLSX.utils.encode_range(range) };

  // Anchos de columnas
  const cols: ColInfo[] = headers.map((key) => ({
    wch: Math.min(Math.max(key.length + 2, 10), 40),
  }));
  ws["!cols"] = cols;

  // Encabezados
  for (let c = 0; c < headers.length; c++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c });
    setCellStyle(ws, cellRef, {
      fill: { fgColor: { rgb: headerFill } },
      font: { bold: true, color: { rgb: "FFFFFFFF" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: strongBorder,
    });
  }

  // Cuerpo
  for (let r = 1; r <= totalRows; r++) {
    for (let c = 0; c < headers.length; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c });
      const isFirstCol = c === 0;
      setCellStyle(ws, cellRef, {
        fill: { fgColor: { rgb: isFirstCol ? "FFF1F5F9" : bodyFill } },
        alignment: { vertical: "center" },
        border: strongBorder,
      });
    }
  }
}

/** Chips y temas */
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
function brandTagClasses(brand?: string | null) {
  const b = (brand || "").trim().toLowerCase();
  if (/apple|macbook|imac|mac/.test(b)) return "border-slate-300 bg-slate-50 text-slate-900";
  if (/dell/.test(b)) return "border-indigo-200 bg-indigo-50 text-indigo-900";
  if (/\bhp\b|hewlett|packard/.test(b)) return "border-sky-200 bg-sky-50 text-sky-900";
  if (/lenovo/.test(b)) return "border-orange-200 bg-orange-50 text-orange-900";
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
function companyRowTheme(empresa?: string | null): { bg: string; borderLeft: string } {
  const e = (empresa || "").toLowerCase().trim();
  if (e.includes("infinet")) return { bg: "bg-blue-50/60", borderLeft: "border-blue-400" };
  if (e.includes("acme")) return { bg: "bg-emerald-50/60", borderLeft: "border-emerald-400" };
  if (e.includes("contoso")) return { bg: "bg-violet-50/60", borderLeft: "border-violet-400" };
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

/* =================== Solicitanes =================== */
async function fetchSolicitantes(search: string, page = 1, pageSize = 20, empresaId?: number | null): Promise<ListSolicitantesResponse> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (search.trim()) params.set("search", search.trim());
  if (empresaId != null) params.set("empresaId", String(empresaId));
  const token = localStorage.getItem("accessToken");
  const res = await fetch(`${API_URL}/solicitantes?${params.toString()}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error("No se pudo listar solicitantes");
  return res.json();
}

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

  // Export
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Mes para exportación (YYYY-MM)
  const [mesExport, setMesExport] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // Funciones helper para formatear fechas
  const formatMes = (mesString: string) => {
    if (!mesString) return '';
    const [year, month] = mesString.split('-');
    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun",
      "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    return `${monthNames[parseInt(month) - 1]} ${year}`;
  };

  const formatMesCompleto = (mesString: string) => {
    if (!mesString) return '';
    const [year, month] = mesString.split('-');
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    return `${monthNames[parseInt(month) - 1]} de ${year}`;
  };

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
    const sTerm = (searchRaw ?? qDebounced).trim();
    if (sTerm) u.searchParams.set("search", sTerm);
    if (empresaFilterId != null) u.searchParams.set("empresaId", String(empresaFilterId));
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

  /* ======== Export Excel ======== */
  async function exportToExcel() {
    try {
      setExportError(null);
      setExporting(true);

      if (!mesExport) {
        setExportError("Debes seleccionar un mes.");
        return;
      }

      const params = new URLSearchParams({ mes: mesExport });

      // Empresa es opcional
      if (empresaFilterId != null) {
        params.append("empresaId", String(empresaFilterId));
      }


      const token = localStorage.getItem("accessToken");

      const res = await fetch(
        `${API_URL}/inventario/export?${params.toString()}`,
        {
          method: "GET",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "No se pudo exportar inventario");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const fileName = empresaFilterName
        ? `Inventario_${empresaFilterName}_${mesExport}.xlsx`
        : `Inventario_TODAS_${mesExport}.xlsx`;

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      setExportError((err as Error).message || "Error al exportar inventario");
    } finally {
      setExporting(false);
    }
  }

  /* ======== Empresas (desde /equipos como fallback) ======== */
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
  }, [page, pageSize, qDebounced, empresaFilterId, marcaFilter]);

  useEffect(() => {
    const c = new AbortController();
    fetchEmpresaOptions(c.signal);
    return () => c.abort();
  }, []);

  /* ======== Handlers ======== */
  const clearAll = () => {
    setQ("");
    setMarcaFilter("");
    setEmpresaFilterId(null);
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

  // Orden fijo: Empresa ASC, luego Solicitante ASC, luego id_equipo ASC
  const rowsSorted = useMemo(() => {
    const arr = data?.items ? [...data.items] : [];
    const norm = (v?: string | null) => (v ?? "").toString().trim().toLowerCase();
    arr.sort((a, b) => {
      const ea = norm(a.empresa), eb = norm(b.empresa);
      if (ea < eb) return -1;
      if (ea > eb) return 1;
      const sa = norm(a.solicitante), sb = norm(b.solicitante);
      if (sa < sb) return -1;
      if (sa > sb) return 1;
      return (a.id_equipo ?? 0) - (b.id_equipo ?? 0);
    });
    return arr;
  }, [data?.items]);

  /* ================== CREAR (via Modal reutilizable) ================== */
  const [createOpen, setCreateOpen] = useState(false);
  const startCreate = () => setCreateOpen(true);

  /* ================== EDITAR ================== */
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editRow, setEditRow] = useState<EquipoRow | null>(null);
  type EquipoForm = {
    serial: string;
    marca: string;
    modelo: string;
    procesador: string;
    ram: string;
    disco: string;
    propiedad: string;
  };
  const [editForm, setEditForm] = useState<EquipoForm>({
    serial: "",
    marca: "",
    modelo: "",
    procesador: "",
    ram: "",
    disco: "",
    propiedad: "",
  });

  // Nueva cadena Empresa -> Solicitante
  const [editEmpresaId, setEditEmpresaId] = useState<number | null>(null);
  const [editSolicitanteId, setEditSolicitanteId] = useState<number | null>(null);

  // buscador solicitantes (editar) local (filtra sobre opciones ya cargadas)
  const [solSearchE, setSolSearchE] = useState("");
  const solSearchEDeb = useDebouncedValue(solSearchE, 300);
  const [solOptsE, setSolOptsE] = useState<SolicitanteLite[]>([]);
  const [solLoadE, setSolLoadE] = useState(false);

  // Carga solicitantes desde API, filtrando por empresa
  const loadSolicitantesEdit = async (empresaId: number | null, term: string) => {
    if (empresaId == null) {
      setSolOptsE([]);
      return;
    }
    setSolLoadE(true);
    try {
      const resp = await fetchSolicitantes(term, 1, 50, empresaId);
      setSolOptsE(
        resp.items.map((it) => ({
          id_solicitante: it.id_solicitante,
          nombre: it.nombre,
          empresa: it.empresa,
        }))
      );
    } catch {
      // noop
    } finally {
      setSolLoadE(false);
    }
  };

  // Reaccionar a cambios (cuando el modal está abierto)
  useEffect(() => {
    if (!editOpen) return;
    loadSolicitantesEdit(editEmpresaId, solSearchEDeb);
  }, [editOpen, editEmpresaId, solSearchEDeb]);

  const startEdit = (row: EquipoRow) => {
    setEditRow(row);
    setEditForm({
      serial: row.serial || "",
      marca: row.marca || "",
      modelo: row.modelo || "",
      procesador: row.procesador || "",
      ram: row.ram || "",
      disco: row.disco || "",
      propiedad: row.propiedad || "",
    });
    setEditEmpresaId(row.empresaId ?? null);
    setEditSolicitanteId(row.idSolicitante ?? null);
    setSolSearchE("");
    setEditOpen(true);
  };

  const cancelEdit = () => {
    if (editSaving) return;
    setEditOpen(false);
    setEditRow(null);
  };

  const saveEdit = async () => {
    if (!editRow) return;

    for (const k of Object.keys(editForm) as (keyof typeof editForm)[]) {
      if (!String(editForm[k] ?? "").trim()) {
        alert(`El campo "${String(k).toUpperCase()}" es obligatorio.`);
        return;
      }
    }
    if (editEmpresaId == null) {
      alert("Debes seleccionar una empresa.");
      return;
    }
    if (!editSolicitanteId) {
      alert("Debes seleccionar un solicitante.");
      return;
    }

    try {
      setEditSaving(true);
      const token = localStorage.getItem("accessToken");
      const res = await fetch(`${API_URL}/equipos/${editRow.id_equipo}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          ...editForm,
          idSolicitante: editSolicitanteId,
          empresaId: editEmpresaId,
        }),
      });

      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const j: unknown = await res.json();
          if (isApiErrorPayload(j)) msg = j.error ?? j.message ?? msg;
        } catch {
          // si el body no es JSON, mantenemos msg
        }
        throw new Error(msg);
      }

      await reload();
      setEditOpen(false);
      setEditRow(null);
    } catch (err: unknown) {
      alert(getErrorMessage(err) || "No se pudo actualizar el equipo");
    } finally {
      setEditSaving(false);
    }
  };

  /* ================== ELIMINAR ================== */
  async function deleteEquipo(row: EquipoRow) {
    if (!confirm(`¿Eliminar equipo #${row.id_equipo} (${row.serial || ""})?`)) return;

    const token = localStorage.getItem("accessToken");
    try {
      const res = await fetch(`${API_URL}/equipos/${row.id_equipo}`, {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });

      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const j: unknown = await res.json();
          if (isApiErrorPayload(j)) msg = j.error ?? j.message ?? msg;
        } catch {
          // body no-JSON; conservamos msg
        }
        throw new Error(msg);
      }

      reload();
    } catch (err: unknown) {
      alert(getErrorMessage(err) || "No se pudo eliminar el equipo");
    }
  }

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

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-white via-white to-cyan-50">
      {/* Fondo */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 [background:radial-gradient(circle_at_1px_1px,rgba(14,165,233,0.08)_1px,transparent_0)_0_0/22px_22px]" />
        <div className="absolute -top-32 -left-32 w-[60vw] max-w-[520px] aspect-square rounded-full blur-3xl bg-gradient-to-br from-cyan-200 to-indigo-200 opacity-40" />
        <div className="absolute -bottom-40 -right-40 w-[65vw] max-w-[560px] aspect-square rounded-full blur-3xl bg-gradient-to-tr from-fuchsia-200 to-cyan-200 opacity-40" />
      </div>

      <Header />

      {/* Hero / Toolbar */}
      <div className="px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6 max-w-7xl mx-auto w-full">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-cyan-200 bg-white/80 backdrop-blur-xl shadow-sm">
          {/* Capa decorativa: no intercepta clics */}
          <div className="absolute inset-0 opacity-60 pointer-events-none bg-[conic-gradient(from_180deg_at_50%_50%,rgba(14,165,233,0.06),transparent_30%,rgba(99,102,241,0.06),transparent_60%,rgba(236,72,153,0.06),transparent_90%)]" />
          <div className="relative p-4 sm:p-6 md:p-8">
            {/* Título + contador */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                  Equipos{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-indigo-600">
                    RIDS.CL
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-600">
                  Inventario, especificaciones y relación con solicitantes/empresas.
                </p>
              </div>
              <div className="text-sm text-slate-600 md:shrink-0">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <LoadingOutlined /> Cargando…
                  </span>
                ) : (
                  `${(data?.total ?? 0).toLocaleString()} resultado(s)`
                )}
              </div>
            </div>

            {/* Toolbar / filtros */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3">
              {/* Buscar */}
              <div className="relative md:col-span-4 min-w-0">
                <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600/70" />
                <input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  placeholder="serial, modelo, CPU…"
                  className="w-full rounded-2xl border border-cyan-200/70 bg-white/90 pl-9 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400"
                  aria-label="Buscar equipos"
                />
                {q.length > 0 && (
                  <button
                    onClick={() => setQ("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-700/80 hover:text-cyan-900"
                    aria-label="Limpiar búsqueda"
                    title="Limpiar"
                    type="button"
                  >
                    <CloseCircleFilled />
                  </button>
                )}
              </div>

              {/* (Se quitó Orden/Dirección) */}

              {/* Botones principales */}
              <div className="md:col-span-8">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 justify-end">
                  <button
                    onClick={startCreate}
                    className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium text-white bg-gradient-to-tr from-indigo-600 to-cyan-600 shadow-[0_6px_18px_-6px_rgba(37,99,235,0.45)] hover:brightness-110"
                    title="Crear nuevo equipo"
                    type="button"
                  >
                    <PlusOutlined />
                    <span>Nuevo</span>
                  </button>

                  <button
                    onClick={clearAll}
                    className="col-span-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm text-cyan-800 hover:bg-cyan-50"
                    title="Limpiar filtros"
                    type="button"
                  >
                    Limpiar
                  </button>

                  <button
                    onClick={reload}
                    className="col-span-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm text-cyan-800 hover:bg-cyan-50"
                    title="Recargar"
                    type="button"
                  >
                    <ReloadOutlined />
                    <span className="hidden sm:inline">Recargar</span>
                  </button>

                  <button
                    onClick={exportToExcel}
                    disabled={exporting || loading || (data?.total ?? 0) === 0}
                    className={clsx(
                      "col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium text-white",
                      "bg-gradient-to-tr from-emerald-600 to-cyan-600 shadow-[0_6px_18px_-6px_rgba(16,185,129,0.45)] hover:brightness-110",
                      (exporting || loading || (data?.total ?? 0) === 0) && "opacity-60 cursor-not-allowed"
                    )}
                    title="Exportar a Excel"
                    type="button"
                  >
                    <DownloadOutlined />
                    {exporting ? "Exportando…" : "Exportar"}
                  </button>
                </div>
              </div>

              {/* Empresa */}
              {/* Filtros de Empresa y Mes */}
              <div className="md:col-span-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Filtro de Empresa - MEJORADO */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <BuildingOfficeIcon className="w-4 h-4 text-cyan-600" />
                      <label className="block text-sm font-medium text-slate-700">
                        Filtrar por empresa
                      </label>
                    </div>

                    <div className="relative">
                      <select
                        value={empresaFilterId ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setEmpresaFilterId(v === "" ? null : Number(v));
                          setPage(1);
                        }}
                        disabled={empLoading}
                        className={`
            w-full rounded-xl border shadow-sm
            px-4 py-3 pl-10 pr-8
            text-sm text-slate-900
            bg-white
            border-slate-200
            hover:border-cyan-300
            focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20
            transition-all duration-200
            appearance-none
            cursor-pointer
            disabled:opacity-50 disabled:cursor-not-allowed
            ${empLoading ? 'bg-slate-50' : 'bg-white'}
          `}
                        aria-label="Filtrar por empresa"
                      >
                        {/* Opción VACÍA real */}
                        <option value="">Todas las empresas</option>

                        {empresaOptions.map((opt) => (
                          <option key={opt.id ?? -1} value={opt.id ?? ""}>
                            {opt.nombre}
                          </option>
                        ))}
                      </select>

                      {/* Ícono del select */}
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      </div>

                      {/* Flecha del select */}
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronDownIcon className="w-5 h-5 text-slate-400" />
                      </div>
                    </div>

                    {empError && (
                      <div className="flex items-center gap-1.5 text-xs text-rose-600 mt-1.5 animate-pulse">
                        <ExclamationCircleIcon className="w-4 h-4 flex-shrink-0" />
                        <span>{empError}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Chips filtros activos */}
            <div className="mt-3 flex flex-wrap items-center gap-2 min-w-0">
              {empresaFilterName && (
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 text-cyan-900 px-3 py-1 text-xs max-w-full">
                  <span className="shrink-0">Empresa:</span>
                  <strong className="truncate">{empresaFilterName}</strong>
                  <button
                    onClick={() => {
                      setEmpresaFilterId(null);
                      setPage(1);
                    }}
                    className="hover:text-cyan-700 shrink-0"
                    aria-label="Quitar filtro de empresa"
                    title="Quitar filtro de empresa"
                  >
                    <CloseCircleFilled />
                  </button>
                </span>
              )}
              {marcaFilter && (
                <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-900 px-3 py-1 text-xs max-w-full">
                  <span className="shrink-0">Marca:</span>
                  <strong className="truncate">{toUC(marcaFilter)}</strong>
                  <button
                    onClick={() => {
                      setMarcaFilter("");
                      setPage(1);
                    }}
                    className="hover:text-indigo-700 shrink-0"
                    aria-label="Quitar filtro de marca"
                    title="Quitar filtro de marca"
                  >
                    <CloseCircleFilled />
                  </button>
                </span>
              )}
            </div>

            <div className="mt-4 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent" />
          </div>
        </div>
      </div>

      {/* Contenido */}
      <main className="px-3 sm:px-4 md:px-6 lg:px-8 pb-24 md:pb-10 max-w-7xl mx-auto w-full">
        {/* Cards (mobile) */}
        <section
          className="md:hidden space-y-3 mt-4"
          aria-live="polite"
          aria-busy={loading ? "true" : "false"}
        >
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={`sk-m-${i}`} className="rounded-2xl border border-cyan-200 bg-white p-4">
                  <div className="h-4 w-24 bg-cyan-50 rounded mb-2 animate-pulse" />
                  <div className="h-3 w-3/4 bg-cyan-50 rounded mb-2 animate-pulse" />
                  <div className="h-3 w-1/2 bg-cyan-50 rounded animate-pulse" />
                </div>
              ))}
            </div>
          )}
          {!loading && error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 p-4 text-center">{error}</div>
          )}
          {!loading && !error && rowsSorted.length === 0 && (
            <div className="rounded-2xl border border-cyan-200 bg-white text-slate-600 p-4 text-center">
              Sin resultados.
            </div>
          )}
          {!loading &&
            !error &&
            rowsSorted.map((e) => (
              <article key={`m-${e.id_equipo}`} className="rounded-2xl border border-cyan-200 bg-white p-4">
                <header className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-500">#{e.id_equipo}</div>
                    <h3 className="text-base font-semibold text-slate-900">{e.modelo || "—"}</h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {toUC(e.serial)} • {e.procesador || "CPU —"} • {e.ram || "RAM —"} • {e.disco || "Disco —"}
                    </p>
                  </div>
                  {e.marca ? (
                    <button
                      onClick={() => onClickBrand(e.marca!)}
                      className={clsx(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border",
                        brandTagClasses(e.marca)
                      )}
                      title="Filtrar por esta marca"
                    >
                      <TagOutlined className="opacity-80" /> {toUC(e.marca)}
                    </button>
                  ) : null}
                </header>

                <div className="mt-2 flex flex-wrap gap-2">
                  {e.solicitante ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border border-cyan-200 bg-cyan-50 text-cyan-900">
                      <LaptopOutlined className="opacity-80" /> {e.solicitante}
                    </span>
                  ) : null}
                  {e.empresa ? (
                    <span
                      className={clsx(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border",
                        companyTagClasses(e.empresa)
                      )}
                    >
                      <TeamOutlined className="opacity-80" /> {e.empresa}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(e)}
                    className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs border-indigo-200 bg-indigo-50 text-indigo-900 hover:bg-indigo-100"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteEquipo(e)}
                    className="inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100"
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
        </section>

        {/* Tabla (desktop) */}
        <section
          className="hidden md:block rounded-3xl border border-cyan-200 bg-white overflow-hidden mt-4"
          aria-live="polite"
          aria-busy={loading ? "true" : "false"}
        >
          <div className="overflow-x-auto">
            {(() => {
              const colsWithActions = headerCols.length + 1;
              return (
                <table className="min-w-full text-[13px] sm:text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gradient-to-r from-cyan-50 to-indigo-50 border-b border-cyan-200">
                      {headerCols.map((col, i) => (
                        <th
                          key={col.key}
                          className={clsx(
                            "text-left px-4 py-3 font-semibold text-slate-800 select-none",
                            "border-r border-cyan-100",
                            i === 0 && "border-l-2 border-l-cyan-300 rounded-tl-xl",
                            col.className
                          )}
                        >
                          <span>{col.label}</span>
                        </th>
                      ))}
                      <th className="text-left px-4 py-3 font-semibold text-slate-800 select-none rounded-tr-xl w-[160px]">
                        Acciones
                      </th>
                    </tr>
                  </thead>

                  <tbody className="text-slate-800">
                    {loading && (
                      <>
                        {Array.from({ length: 8 }).map((_, i) => (
                          <tr key={`sk-${i}`} className="border-t border-neutral-100">
                            {Array.from({ length: colsWithActions }).map((__, j) => (
                              <td key={`sk-${i}-${j}`} className="px-4 py-3">
                                <div className="h-4 w-full max-w-[240px] animate-pulse rounded bg-neutral-200/70" />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </>
                    )}

                    {!loading && error && (
                      <tr>
                        <td colSpan={colsWithActions} className="px-4 py-10 text-center text-rose-700">
                          {error}
                        </td>
                      </tr>
                    )}

                    {!loading && !error && rowsSorted.length === 0 && (
                      <tr>
                        <td colSpan={colsWithActions} className="px-4 py-12">
                          <div className="flex flex-col items-center gap-3 text-slate-600">
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
                      rowsSorted.map((e) => {
                        const brand = e.marca || "";
                        const isBrandActive =
                          marcaFilter && marcaFilter.toLowerCase() === brand.toLowerCase();
                        const theme = companyRowTheme(e.empresa);
                        return (
                          <tr
                            key={e.id_equipo}
                            className={clsx(
                              "border-t border-cyan-100 transition-colors",
                              theme.bg,
                              "hover:bg-cyan-50/70"
                            )}
                          >
                            <td
                              className={clsx(
                                "px-4 py-3 whitespace-nowrap border-l-4 rounded-l-xl",
                                theme.borderLeft
                              )}
                              title={e.empresa || undefined}
                            >
                              {e.id_equipo}
                            </td>
                            <td className="px-4 py-3 font-mono tracking-wide">{toUC(e.serial)}</td>
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
                                  title={isBrandActive ? "Quitar filtro de esta marca" : "Filtrar por esta marca"}
                                  aria-pressed={isBrandActive ? true : undefined}
                                >
                                  <TagOutlined className="opacity-80" /> {toUC(e.marca)}
                                </button>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">{e.modelo || <span className="text-slate-400">—</span>}</td>
                            <td className="px-4 py-3">{e.procesador || <span className="text-slate-400">—</span>}</td>
                            <td className="px-4 py-3">{e.ram || <span className="text-slate-400">—</span>}</td>
                            <td className="px-4 py-3">{e.disco || <span className="text-slate-400">—</span>}</td>
                            <td className="px-4 py-3">{e.propiedad || <span className="text-slate-400">—</span>}</td>
                            <td className="px-4 py-3">
                              {e.solicitante ? (
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border border-cyan-200 bg-cyan-50 text-cyan-900">
                                  <LaptopOutlined className="opacity-80" /> {e.solicitante}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
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
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            <td className="px-4 py-3 rounded-r-xl whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEdit(e)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-900 px-2 py-1 text-xs hover:bg-indigo-100"
                                  title="Editar"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteEquipo(e)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-900 px-2 py-1 text-xs hover:bg-rose-100"
                                  title="Eliminar"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              );
            })()}
          </div>

          {exportError && (
            <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 text-xs">
              {exportError}
            </div>
          )}

          {/* Paginación */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-slate-50 border-t border-cyan-200">
            <div className="text-sm text-slate-700 text-center sm:text-left">
              {data ? (
                <span>
                  {showingRange ? (
                    <>
                      Mostrando <strong className="text-slate-900">{showingRange.start}</strong>–
                      <strong className="text-slate-900">{showingRange.end}</strong> de{" "}
                      <strong className="text-slate-900">{data.total}</strong> •{" "}
                    </>
                  ) : null}
                  Página <strong className="text-slate-900">{data.page}</strong> de{" "}
                  <strong className="text-slate-900">{data.totalPages}</strong>
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
                  "border-cyan-200 text-cyan-800 bg-white hover:bg-cyan-50",
                  (!canPrev || loading) && "opacity-50 cursor-not-allowed hover:bg-transparent"
                )}
                aria-label="Página anterior"
                type="button"
              >
                <LeftOutlined />
                <span className="hidden sm:inline">Anterior</span>
              </button>

              <div className="hidden sm:flex items-center gap-2 ml-1">
                <span className="text-sm text-slate-600">Por página</span>
                <select
                  value={data?.pageSize ?? pageSize}
                  onChange={(ev) => onChangePageSize(Number(ev.target.value))}
                  className="rounded-xl border border-cyan-200 bg-white px-2 py-1 text-sm"
                >
                  {[10, 20, 30, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={goNext}
                disabled={!canNext || loading}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm",
                  "border-cyan-200 text-cyan-800 bg-white hover:bg-cyan-50",
                  (!canNext || loading) && "opacity-50 cursor-not-allowed hover:bg-transparent"
                )}
                aria-label="Página siguiente"
                type="button"
              >
                <span className="hidden sm:inline">Siguiente</span>
                <RightOutlined />
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ===== Modal de creación (componente reutilizable) ===== */}
      <CrearEquipoModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          reload();
        }}
      />

      {/* ===== Modal de edición (inline) ===== */}
      {editOpen && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40" onClick={cancelEdit} />
          <div className="relative w-full max-w-2xl rounded-2xl border border-cyan-200 bg-white shadow-xl">
            <div className="px-5 py-4 border-b border-cyan-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Editar equipo #{editRow?.id_equipo}</h3>
              <button onClick={cancelEdit} className="text-slate-500 hover:text-slate-700" aria-label="Cerrar">
                ✕
              </button>
            </div>

            {/* Empresa -> Solicitante */}
            <div className="px-5 pt-4 grid grid-cols-1 gap-3">
              {/* 1) Empresa */}
              <label className="text-sm">
                <span className="block text-slate-700 mb-1">
                  Empresa <span className="text-rose-500">*</span>
                </span>
                <select
                  value={editEmpresaId ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    setEditEmpresaId(val);
                    setEditSolicitanteId(null);
                    // Disparará loadSolicitantesEdit por efecto
                  }}
                  className="w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                >
                  <option value="">— Selecciona empresa —</option>
                  {empresaOptions.map((opt) => (
                    <option key={opt.id ?? -1} value={opt.id ?? ""}>
                      {opt.nombre}
                    </option>
                  ))}
                </select>
              </label>

              {/* 2) Solicitante (filtrado por empresa) */}
              <label className="text-sm">
                <span className="block text-slate-700 mb-1">
                  Solicitante <span className="text-rose-500">*</span>
                </span>
                <div className="flex gap-2">
                  <input
                    value={solSearchE}
                    onChange={(e) => setSolSearchE(e.target.value)}
                    placeholder="Buscar por nombre…"
                    className="w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                    disabled={editEmpresaId == null}
                  />
                  {solLoadE ? (
                    <span className="inline-flex items-center px-2 text-slate-500"><LoadingOutlined /></span>
                  ) : null}
                </div>
                <select
                  value={editSolicitanteId ?? ""}
                  onChange={(e) => setEditSolicitanteId(e.target.value ? Number(e.target.value) : null)}
                  className="mt-2 w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  disabled={editEmpresaId == null}
                >
                  <option value="">{solLoadE ? "Cargando…" : "— Selecciona —"}</option>
                  {solOptsE
                    .filter((s) =>
                      solSearchE.trim()
                        ? s.nombre.toLowerCase().includes(solSearchE.trim().toLowerCase())
                        : true
                    )
                    .map((s) => (
                      <option key={s.id_solicitante} value={s.id_solicitante}>
                        {s.nombre}{s.empresa?.nombre ? ` — ${s.empresa.nombre}` : ""}
                      </option>
                    ))}
                </select>
                <div className="text-[11px] text-slate-500 mt-1">
                  Si el equipo cambió de empresa, primero selecciona la nueva empresa para listar sus solicitantes.
                </div>
              </label>
            </div>

            {/* Campos de edición */}
            <div
              className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveEdit();
                }
              }}
            >
              {(() => {
                type FieldKey = keyof typeof editForm;

                const FIELDS: Array<{ key: FieldKey; label: string; autoCap?: boolean }> = [
                  { key: "serial", label: "Serial", autoCap: true },
                  { key: "marca", label: "Marca", autoCap: true },
                  { key: "modelo", label: "Modelo" },
                  { key: "procesador", label: "CPU" },
                  { key: "ram", label: "RAM" },
                  { key: "disco", label: "Disco" },
                  { key: "propiedad", label: "Propiedad" },
                ];

                return FIELDS.map((f) => (
                  <label key={f.key} className="text-sm">
                    <span className="block text-slate-700 mb-1">
                      {f.label} <span className="text-rose-500">*</span>
                    </span>
                    <input
                      required
                      value={editForm[f.key]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setEditForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                      }
                      onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                        const v = e.target.value.trim();
                        const next = f.autoCap ? v.toUpperCase() : v.replace(/\s{2,}/g, " ");
                        if (next !== editForm[f.key]) {
                          setEditForm((prev) => ({ ...prev, [f.key]: next }));
                        }
                      }}
                      placeholder={f.label}
                      className={clsx(
                        "w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900",
                        "border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                      )}
                    />
                  </label>
                ));
              })()}

              <div className="sm:col-span-2 text-[11px] text-slate-500 mt-1">
                Los campos marcados con <span className="text-rose-500">*</span> son obligatorios.
              </div>
            </div>

            <div className="px-5 py-4 border-t border-cyan-100 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end bg-slate-50">
              <button
                onClick={cancelEdit}
                disabled={editSaving}
                className={clsx(
                  "inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm",
                  "border-slate-200 text-slate-700 bg-white hover:bg-slate-100",
                  editSaving && "opacity-50 cursor-not-allowed"
                )}
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                disabled={editSaving}
                className={clsx(
                  "inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium text-white",
                  "bg-gradient-to-tr from-indigo-600 to-cyan-600 hover:brightness-110",
                  editSaving && "opacity-60 cursor-not-allowed"
                )}
              >
                {editSaving ? "Guardando…" : "Guardar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquiposPage;
