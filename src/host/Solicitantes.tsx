// src/host/Solicitantes.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  SearchOutlined,
  LeftOutlined,
  RightOutlined,
  CloseCircleFilled,
  ReloadOutlined,
  ClearOutlined,
  MailOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { motion, AnimatePresence } from "framer-motion";
import Header from "../components/Header";
import SolicitanteDetailModal from "../components/SolicitanteDetailModal";
import type { SolicitanteForDetail } from "../components/SolicitanteDetailModal";
import XlsxPopulate from "xlsx-populate/browser/xlsx-populate";

/* =================== Tipos =================== */
type Empresa = { id_empresa: number; nombre: string } | null;
type Equipo = {
  id_equipo: number;
  idSolicitante: number;
  serial: string | null;
  marca: string | null;
  modelo: string | null;
  procesador: string | null;
  ram: string | null;
  disco: string | null;
  propiedad: string | null;
};

export type SolicitanteRow = {
  id_solicitante: number;
  nombre: string;
  email?: string | null;
  empresaId: number | null;
  empresa: Empresa;
  equipos: Equipo[];
};

export type ApiList<T> = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: T[];
};

/* =================== Config =================== */
const API_URL =
  (import.meta as ImportMeta).env?.VITE_API_URL || "http://localhost:4000/api";
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

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

/** Hash simple y estable (para elegir color) */
function strHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Paleta de tags (border/bg/text) para empresas */
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
  "border-red-200 bg-red-50 text-red-900",
  "border-orange-200 bg-orange-50 text-orange-900",
  "border-amber-200 bg-amber-50 text-amber-900",
  "border-lime-200 bg-lime-50 text-lime-900",
  "border-green-200 bg-green-50 text-green-900",
];

/** Color para empresa por id/nombre (estable) */
function companyTagClasses(emp?: Empresa) {
  if (!emp) return "border-gray-200 bg-gray-50 text-gray-800";
  const seed =
    typeof emp.id_empresa === "number"
      ? String(emp.id_empresa)
      : emp.nombre || "empresa";
  const idx = strHash(seed) % COMPANY_TAG_PALETTE.length;
  return COMPANY_TAG_PALETTE[idx];
}

/** Colores por marca conocidas + paleta fallback por hash */
function brandTagClasses(brand?: string | null) {
  const b = (brand || "").trim().toLowerCase();

  // conocidas
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
  if (/^lg$|lg electronics/.test(b))
    return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900";
  if (/microsoft|surface/.test(b))
    return "border-purple-200 bg-purple-50 text-purple-900";

  // fallback hash
  const BRAND_PALETTE = [
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
  const idx = strHash(b || "brand") % BRAND_PALETTE.length;
  return BRAND_PALETTE[idx];
}

/* ============ Excel helpers (colores + hojas por empresa) ============ */
type ValueT = string | number | boolean | Date | null | undefined;
interface Styled { style(s: Record<string, ValueT>): this; }
interface CellLike extends Styled { value(): ValueT; value(v: ValueT): this; relativeCell(dr: number, dc: number): CellLike; }
interface ColumnLike { width(w: number): void; }
interface RangeLike extends Styled { merged(): boolean; merged(m: boolean): this; }
interface WorksheetLike {
  cell(a1: string): CellLike; cell(r: number, c: number): CellLike;
  column(iOrLetter: number | string): ColumnLike; range(r1: number, c1: number, r2: number, c2: number): RangeLike;
  name(): string; name(n: string): void;
}
interface WorkbookLike { sheet(name: string): WorksheetLike | undefined; addSheet(name: string): WorksheetLike; outputAsync(): Promise<ArrayBuffer>; }

const HEADER = ["ID", "Nombre", "Email", "Empresa", "Equipos", "Detalle equipos"] as const;
const COLOR_BORDER = "D1D5DB";
const COLOR_HEADER_TEXT = "0B4266";
const COLOR_TEXT = "111827";

/* Paleta determinista por empresa para el título de hoja */
const PALETTE = ["D9F99D","E0F2FE","FDE68A","FBCFE8","FCA5A5","DDD6FE","A7F3D0","FDE2E2","FFE4E6","F5F5F4"];
function colorFor(key: string): string { let h=0; for (let i=0;i<key.length;i++) h=(h*31+key.charCodeAt(i))>>>0; return PALETTE[h%PALETTE.length]; }
function safeSheetName(raw: string) { const base=(raw||"Empresa").replace(/[\\/:*?"[\]]/g,"_").slice(0,31); return base.length?base:"Empresa"; }
function ensureUniqueSheetName(wb: WorkbookLike, desired: string) { let name=desired, i=2; while (wb.sheet(name)) { const s=`_${i}`; name=(desired.slice(0,31-s.length)+s).replace(/[\\/:*?"[\]]/g,"_"); i++; } return name; }
function setAllBorders(ws: WorksheetLike, r1: number, c1: number, r2: number, c2: number) {
  ws.range(r1,c1,r2,c2).style({ border: true, borderColor: COLOR_BORDER });
}

/** Crea hoja Resumen y hojas por empresa (agrupando por ID) */
async function buildExcelPerEmpresa(items: SolicitanteRow[]) {
  const wb = await (XlsxPopulate as unknown as { fromBlankAsync(): Promise<WorkbookLike> }).fromBlankAsync() as WorkbookLike;

  // ========= Resumen =========
  const wsR = wb.addSheet("Resumen");
  wsR.cell("A1").value("Empresa").style({ bold:true, fill:"F1F5F9", fontColor:COLOR_HEADER_TEXT, border:true, borderColor:COLOR_BORDER, horizontalAlignment:"center" });
  wsR.cell("B1").value("Solicitantes").style({ bold:true, fill:"F1F5F9", fontColor:COLOR_HEADER_TEXT, border:true, borderColor:COLOR_BORDER, horizontalAlignment:"center" });
  wsR.cell("C1").value("Equipos").style({ bold:true, fill:"F1F5F9", fontColor:COLOR_HEADER_TEXT, border:true, borderColor:COLOR_BORDER, horizontalAlignment:"center" });

  // Resumen: agrupa por ID (nombre solo display)
  type Acc = { solicitantes: number; equipos: number; nombre: string };
  const byId = new Map<string, Acc>();
  for (const s of items) {
    const id = s.empresa?.id_empresa ?? s.empresaId ?? null;
    const key = String(id ?? "null");
    const nombre = s.empresa?.nombre ?? (id !== null ? `#${id}` : "Sin empresa");
    const hit = byId.get(key) ?? { solicitantes: 0, equipos: 0, nombre };
    hit.solicitantes += 1;
    hit.equipos += s.equipos?.length ?? 0;
    hit.nombre = nombre;
    byId.set(key, hit);
  }

  const rows = Array.from(byId.values()).sort((a,b)=>a.nombre.localeCompare(b.nombre,"es"));
  let r = 2;
  for (const t of rows) {
    wsR.cell(r,1).value(t.nombre);
    wsR.cell(r,2).value(t.solicitantes);
    wsR.cell(r,3).value(t.equipos);
    r++;
  }
  wsR.column("A").width(36); wsR.column("B").width(16); wsR.column("C").width(16);
  setAllBorders(wsR, 1,1, Math.max(1, r-1), 3);

  // ========= Hojas por empresa =========
  type EmpKey = { id: number | null; nombre: string };
  const group = new Map<string, { key: EmpKey; rows: SolicitanteRow[] }>();
  for (const s of items) {
    const id = s.empresa?.id_empresa ?? s.empresaId ?? null;
    const nombre = s.empresa?.nombre ?? (id !== null ? `#${id}` : "Sin empresa");
    const key = String(id ?? "null");
    if (!group.has(key)) group.set(key, { key: { id, nombre }, rows: [] });
    group.get(key)!.rows.push(s);
  }

  for (const { key, rows: people } of Array.from(group.values()).sort((a,b)=>a.key.nombre.localeCompare(b.key.nombre,"es"))) {
    const empresa = key.nombre;
    const ws = wb.addSheet(ensureUniqueSheetName(wb, safeSheetName(empresa)));

    // Título con color por empresa
    ws.cell("A1").value(`Solicitantes — ${empresa}`).style({
      bold:true, fontFamily:"Calibri", fontSize:16, fontColor:COLOR_HEADER_TEXT,
      horizontalAlignment:"center", verticalAlignment:"center", fill:colorFor(empresa),
    });
    ws.range(1,1,1,HEADER.length).merged(true);

    // Cabeceras
    for (let c=0; c<HEADER.length; c++) {
      ws.cell(3,c+1).value(HEADER[c]).style({
        bold:true, fontFamily:"Calibri", fontSize:11, fontColor:COLOR_HEADER_TEXT,
        fill:"F8FAFC", horizontalAlignment:"left", verticalAlignment:"center", border:true, borderColor:COLOR_BORDER
      });
    }

    // Filas
    let rr = 4;
    for (const s of people) {
      const equiposNum = s.equipos?.length ?? 0;
      const equiposDetalle = equiposNum
        ? s.equipos.map(e => {
            const mm = [e.marca, e.modelo].filter(Boolean).join(" ");
            const ser = e.serial ? ` (${e.serial})` : "";
            return (mm || "Equipo") + ser;
          }).join(" · ")
        : "—";
      const rowValues: ValueT[] = [
        s.id_solicitante,
        s.nombre,
        s.email || "—",
        empresa,
        equiposNum,
        equiposDetalle,
      ];
      for (let c=0; c<rowValues.length; c++) {
        ws.cell(rr, c+1).value(rowValues[c]).style({ fontFamily:"Calibri", fontSize:11, fontColor:COLOR_TEXT });
      }
      if ((rr-4) % 2 === 1) ws.range(rr,1,rr,HEADER.length).style({ fill:"F9FAFB" });
      rr++;
    }

    // Formato columnas + bordes
    const widths = [10, 28, 32, 26, 10, 60];
    widths.forEach((w, i) => ws.column(i+1).width(w));
    if (people.length > 0) setAllBorders(ws, 3,1, rr-1, HEADER.length);
  }

  // Remueve la hoja por defecto si está vacía
  const defaultSheet = wb.sheet("Sheet1");
  if (defaultSheet) defaultSheet.name("_");

  const out = await wb.outputAsync();
  const blob = new Blob([out as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const urlBlob = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = urlBlob;
  a.download = `Solicitantes_${new Date().toISOString().slice(0,10)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(urlBlob);
}

/* =================== Animations =================== */
// Curva bezier equivalente a easeOut (evita el error de tipos)
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const fadeInUp = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: EASE_OUT },
  },
} as const;

const subtleHover = { whileHover: { y: -2, scale: 1.01, transition: { duration: 0.15 } } } as const;
const press = { whileTap: { scale: 0.98 } } as const;

const listStagger = {
  animate: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
} as const;

const rowItem = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT } },
} as const;

/* =================== Skeletons =================== */
const TableSkeletonRows: React.FC<{ cols: number; rows?: number }> = ({
  cols, rows = 6,
}) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={`sk-${i}`} className="border-t border-cyan-100/60">
        {Array.from({ length: cols }).map((__, j) => (
          <td key={`sk-${i}-${j}`} className="px-4 py-3">
            <div className="h-4 w-full max-w-[240px] animate-pulse rounded bg-gradient-to-r from-cyan-50 via-cyan-100 to-cyan-50" />
          </td>
        ))}
      </tr>
    ))}
  </>
);

/* =================== Page =================== */
const SolicitantesPage: React.FC = () => {
  // búsqueda y filtros
  const [q, setQ] = useState<string>("");
  const qDebounced = useDebouncedValue<string>(q, 400);

  // paginación
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  // carga/errores y datos
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiList<SolicitanteRow> | null>(null);

  // selección modal
  const [selected, setSelected] = useState<SolicitanteForDetail | null>(null);
  const [openDetail, setOpenDetail] = useState<boolean>(false);

  // filtro empresa
  type EmpresaOpt = { id: number; nombre: string };
  const [empresaOptions, setEmpresaOptions] = useState<EmpresaOpt[]>([]);
  const [empresaFilterId, setEmpresaFilterId] = useState<number | null>(null);

  // anti-race
  const reqSeqRef = useRef(0);
  const totalsSeqRef = useRef(0);

  // totales
  type Totals = { solicitantes: number; empresas: number; equipos: number };
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loadingTotals, setLoadingTotals] = useState<boolean>(false);
  const [errorTotals, setErrorTotals] = useState<string | null>(null);

  const canPrev = page > 1;
  const canNext = useMemo(
    () => (data ? page < data.totalPages : false),
    [data, page]
  );

  const showingRange = useMemo(() => {
    if (!data || data.total === 0) return null;
    const start = (data.page - 1) * data.pageSize + 1;
    const end = Math.min(data.page * data.pageSize, data.total);
    return { start, end };
  }, [data]);

  // Ajuste si la página queda fuera de rango al cambiar filtros
  useEffect(() => {
    if (data && page > data.totalPages) {
      setPage(Math.max(1, data.totalPages));
    }
  }, [data, page]);

  /* ======== FETCH LISTA ======== */
  async function fetchList(signal?: AbortSignal) {
    const seq = ++reqSeqRef.current;
    try {
      setLoading(true);
      setError(null);

      const url = new URL(`${API_URL}/solicitantes`);
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", String(pageSize));

      if (empresaFilterId !== null) {
        url.searchParams.set("empresaId", String(empresaFilterId));
      } else if (qDebounced.trim()) {
        url.searchParams.set("q", qDebounced.trim());
      }
      url.searchParams.set("_ts", String(Date.now()));

      const token = localStorage.getItem("accessToken");
      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
        credentials: "include",
        signal,
      });

      if (seq !== reqSeqRef.current) return;

      if (res.status === 304) {
        setLoading(false);
        return;
      }
      if (!res.ok && res.status !== 204) {
        let apiErr = `HTTP ${res.status}`;
        try {
          const payload = await res.json();
          apiErr = (payload as { error?: string })?.error || apiErr;
        } catch { /* noop */ }
        throw new Error(apiErr);
      }
      if (res.status === 204) {
        setData({ page, pageSize, total: 0, totalPages: 1, items: [] });
        return;
      }

      const ct = res.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        const json = (await res.json()) as ApiList<SolicitanteRow>;
        setData(json);
      } else {
        const text = await res.text();
        if (text) {
          try {
            const json = JSON.parse(text) as ApiList<SolicitanteRow>;
            setData(json);
          } catch {
            setData({ page, pageSize, total: 0, totalPages: 1, items: [] });
          }
        } else {
          setData({ page, pageSize, total: 0, totalPages: 1, items: [] });
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error)?.message || "Error al cargar");
    } finally {
      if (seq === reqSeqRef.current) setLoading(false);
    }
  }

  /* ======== FETCH TOTALES + OPCIONES ======== */
  async function fetchTotals(signal?: AbortSignal) {
    const seq = ++totalsSeqRef.current;
    try {
      setLoadingTotals(true);
      setErrorTotals(null);

      const token = localStorage.getItem("accessToken");
      try {
        const urlM = new URL(`${API_URL}/solicitantes/metrics`);
        if (empresaFilterId !== null) {
          urlM.searchParams.set("empresaId", String(empresaFilterId));
        } else if (qDebounced.trim()) {
          urlM.searchParams.set("q", qDebounced.trim());
        }
        urlM.searchParams.set("_ts", String(Date.now()));
        const r = await fetch(urlM.toString(), {
          method: "GET",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: "no-store",
          credentials: "include",
          signal,
        });
        if (seq !== totalsSeqRef.current) return;
        if (r.ok) {
          const ct = r.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            const m = (await r.json()) as Partial<Totals>;
            if (
              typeof m.solicitantes === "number" &&
              typeof m.empresas === "number" &&
              typeof m.equipos === "number"
            ) {
              setTotals({
                solicitantes: m.solicitantes,
                empresas: m.empresas,
                equipos: m.equipos,
              });
              return;
            }
          }
        }
      } catch { /* fallback */ }

      // Fallback: paginar todo para sumar y armar opciones
      let solicitantesTotal = 0;
      const empresasSet = new Map<number, string>();
      let equiposTotal = 0;

      const baseUrl = new URL(`${API_URL}/solicitantes`);
      baseUrl.searchParams.set("page", "1");
      baseUrl.searchParams.set("pageSize", String(MAX_PAGE_SIZE));
      if (empresaFilterId !== null) {
        baseUrl.searchParams.set("empresaId", String(empresaFilterId));
      } else if (qDebounced.trim()) {
        baseUrl.searchParams.set("q", qDebounced.trim());
      }
      baseUrl.searchParams.set("_ts", String(Date.now()));

      const firstRes = await fetch(baseUrl.toString(), {
        method: "GET",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        cache: "no-store",
        credentials: "include",
        signal,
      });

      if (seq !== totalsSeqRef.current) return;
      if (!firstRes.ok) throw new Error(`Totals HTTP ${firstRes.status}`);

      const first = (await firstRes.json()) as ApiList<SolicitanteRow>;
      const totalPages = first.totalPages || 1;

      const consume = (pageData: ApiList<SolicitanteRow>) => {
        solicitantesTotal += pageData.items.length;
        for (const it of pageData.items) {
          const id = it.empresa?.id_empresa;
          if (typeof id === "number") empresasSet.set(id, it.empresa!.nombre);
          equiposTotal += it.equipos?.length ?? 0;
        }
      };

      consume(first);

      for (let p = 2; p <= totalPages; p++) {
        if (signal?.aborted) return;
        const u = new URL(`${API_URL}/solicitantes`);
        u.searchParams.set("page", String(p));
        u.searchParams.set("pageSize", String(MAX_PAGE_SIZE));
        if (empresaFilterId !== null) {
          u.searchParams.set("empresaId", String(empresaFilterId));
        } else if (qDebounced.trim()) {
          u.searchParams.set("q", qDebounced.trim());
        }
        u.searchParams.set("_ts", String(Date.now()));

        const r = await fetch(u.toString(), {
          method: "GET",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          cache: "no-store",
          credentials: "include",
          signal,
        });

        if (seq !== totalsSeqRef.current) return;
        if (!r.ok) throw new Error(`Totals HTTP ${r.status}`);

        const pj = (await r.json()) as ApiList<SolicitanteRow>;
        consume(pj);
      }

      setTotals({
        solicitantes: solicitantesTotal,
        empresas: empresasSet.size,
        equipos: equiposTotal,
      });

      const opts = Array.from(empresasSet.entries())
        .map(([id, nombre]) => ({ id, nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      setEmpresaOptions(opts);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setErrorTotals((err as Error)?.message || "Error al cargar totales");

      if (data) {
        const empresasSet = new Map<number, string>();
        let equipos = 0;
        for (const it of data.items) {
          const id = it.empresa?.id_empresa;
          if (typeof id === "number") empresasSet.set(id, it.empresa!.nombre);
          equipos += it.equipos?.length ?? 0;
        }
        setTotals({
          solicitantes: data.total,
          empresas: empresasSet.size,
          equipos,
        });
        setEmpresaOptions(
          Array.from(empresasSet.entries())
            .map(([id, nombre]) => ({ id, nombre }))
            .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
        );
      }
    } finally {
      if (seq === totalsSeqRef.current) setLoadingTotals(false);
    }
  }

  /* ======== Effects ======== */
  useEffect(() => {
    const ctrl = new AbortController();
    fetchList(ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, qDebounced, empresaFilterId]);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchTotals(ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qDebounced, empresaFilterId]);

  const goPrev = () => canPrev && setPage((p) => p - 1);
  const goNext = () => canNext && setPage((p) => p + 1);

  /* ======== Handlers ======== */
  const openRow = (row: SolicitanteRow) => {
    const detail: SolicitanteForDetail = {
      id_solicitante: row.id_solicitante,
      nombre: row.nombre,
      empresaId: row.empresaId,
      empresa: row.empresa,
      equipos: row.equipos,
    };
    setSelected(detail);
    setOpenDetail(true);
  };
  const closeDetail = () => setOpenDetail(false);

  const clearSearch = () => {
    setQ("");
    setPage(1);
    const ctrl1 = new AbortController();
    fetchList(ctrl1.signal);
    const ctrl2 = new AbortController();
    fetchTotals(ctrl2.signal);
  };

  const clearEmpresaFilter = () => {
    setEmpresaFilterId(null);
    setPage(1);
  };

  const manualReload = () => {
    const ctrl1 = new AbortController();
    fetchList(ctrl1.signal);
    const ctrl2 = new AbortController();
    fetchTotals(ctrl2.signal);
  };

  /** Exportar Excel */
  const onExportExcel = async () => {
    try {
      const token = localStorage.getItem("accessToken");

      const firstU = new URL(`${API_URL}/solicitantes`);
      firstU.searchParams.set("page", "1");
      firstU.searchParams.set("pageSize", String(MAX_PAGE_SIZE));
      if (empresaFilterId !== null) {
        firstU.searchParams.set("empresaId", String(empresaFilterId));
      } else if (qDebounced.trim()) {
        firstU.searchParams.set("q", qDebounced.trim());
      }
      firstU.searchParams.set("_ts", String(Date.now()));

      const firstR = await fetch(firstU.toString(), {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: "include",
        cache: "no-store",
      });
      if (!firstR.ok) throw new Error(`HTTP ${firstR.status}`);
      const first = (await firstR.json()) as ApiList<SolicitanteRow>;
      const all: SolicitanteRow[] = [...first.items];

      for (let p = 2; p <= (first.totalPages || 1); p++) {
        const u = new URL(`${API_URL}/solicitantes`);
        u.searchParams.set("page", String(p));
        u.searchParams.set("pageSize", String(MAX_PAGE_SIZE));
        if (empresaFilterId !== null) {
          u.searchParams.set("empresaId", String(empresaFilterId));
        } else if (qDebounced.trim()) {
          u.searchParams.set("q", qDebounced.trim());
        }
        u.searchParams.set("_ts", String(Date.now()));
        const r = await fetch(u.toString(), {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          credentials: "include",
          cache: "no-store",
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const pj = (await r.json()) as ApiList<SolicitanteRow>;
        all.push(...pj.items);
      }

      await buildExcelPerEmpresa(all);
    } catch (e) {
      console.error("[Export Excel] Error:", e);
      alert("No se pudo exportar el Excel. Revisa consola.");
    }
  };

  /* =================== UI =================== */
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-white via-white to-cyan-50">
      {/* Fondo tecnológico claro */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {/* Grid sutil animado */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="absolute inset-0 [background:radial-gradient(circle_at_1px_1px,rgba(14,165,233,0.08)_1px,transparent_0)_0_0/22px_22px]"
        />
        {/* Blobs suaves */}
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.4 }}
          transition={{ duration: 0.8, ease: EASE_OUT }}
          className="absolute -top-32 -left-32 w-[60vw] max-w-[520px] aspect-square rounded-full blur-3xl bg-gradient-to-br from-cyan-200 to-indigo-200"
        />
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 0.4 }}
          transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.1 }}
          className="absolute -bottom-40 -right-40 w-[65vw] max-w-[560px] aspect-square rounded-full blur-3xl bg-gradient-to-tr from-fuchsia-200 to-cyan-200"
        />
      </div>

      <Header />

      <main className="px-4 sm:px-6 pt-4 sm:pt-6 pb-8 max-w-6xl mx-auto">
        {/* Hero / Toolbar */}
        <motion.div
          {...fadeInUp}
          className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-cyan-200 bg-white/80 backdrop-blur-xl shadow-sm"
        >
          <div className="absolute inset-0 opacity-60 bg-[conic-gradient(from_180deg_at_50%_50%,rgba(14,165,233,0.06),transparent_30%,rgba(99,102,241,0.06),transparent_60%,rgba(236,72,153,0.06),transparent_90%)]" />
          <div className="relative p-4 sm:p-6 md:p-8">
            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900"
            >
              <span className="align-middle">Solicitantes</span>{" "}
              <span className="align-middle text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-indigo-600">
                RIDS.CL
              </span>
            </motion.h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Gestión de solicitantes, empresas y equipos — búsqueda avanzada y exportación.
            </p>

            {/* Toolbar responsive */}
            <motion.div
              variants={listStagger}
              initial="initial"
              animate="animate"
              className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3"
            >
              {/* búsqueda */}
              <motion.div variants={fadeInUp} className="relative lg:col-span-2">
                <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600/60" />
                <input
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(1); }}
                  placeholder={empresaFilterId !== null ? "Búsqueda deshabilitada por filtro empresa" : "Buscar por nombre o empresa…"}
                  className="w-full rounded-xl sm:rounded-2xl border border-cyan-200 bg-white pl-9 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400 shadow-inner"
                  aria-label="Buscar solicitantes por nombre o empresa"
                  disabled={empresaFilterId !== null}
                />
                <AnimatePresence>
                  {q.length > 0 && empresaFilterId === null && (
                    <motion.button
                      key="clear-q"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={clearSearch}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-700/70 hover:text-cyan-900 transition"
                      aria-label="Limpiar búsqueda"
                      title="Limpiar"
                    >
                      <CloseCircleFilled />
                    </motion.button>
                  )}
                </AnimatePresence>
                {empresaFilterId !== null && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5">
                    Filtro empresa
                  </div>
                )}
              </motion.div>

              {/* filtro empresa */}
              <motion.div variants={fadeInUp} className="flex gap-2">
                <select
                  value={empresaFilterId ?? ""}
                  onChange={(e) => { const v = e.target.value; setEmpresaFilterId(v ? Number(v) : null); setPage(1); }}
                  className="w-full rounded-xl sm:rounded-2xl border border-cyan-200 bg-white px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  aria-label="Filtrar por empresa"
                >
                  <option value="">— Filtrar por empresa —</option>
                  {empresaOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.nombre}</option>
                  ))}
                </select>
                {empresaFilterId !== null && (
                  <motion.button
                    {...press}
                    {...subtleHover}
                    onClick={clearEmpresaFilter}
                    className="inline-flex items-center justify-center rounded-xl border border-emerald-200 text-emerald-700 px-3 py-2 bg-white hover:bg-emerald-50"
                    title="Quitar filtro de empresa"
                    aria-label="Quitar filtro de empresa"
                  >
                    <ClearOutlined />
                  </motion.button>
                )}
              </motion.div>

              {/* acciones */}
              <motion.div variants={fadeInUp} className="grid grid-cols-2 gap-2">
                <motion.button
                  {...press}
                  {...subtleHover}
                  onClick={manualReload}
                  className="col-span-1 inline-flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl border border-cyan-200 text-cyan-800 bg-white px-3 py-2.5 text-sm hover:bg-cyan-50 transition shadow-sm"
                  title="Recargar"
                >
                  <ReloadOutlined className="hidden sm:inline" />
                  <span className="truncate">Recargar</span>
                </motion.button>
                <motion.button
                  {...press}
                  {...subtleHover}
                  onClick={onExportExcel}
                  className="col-span-1 inline-flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl px-3 py-2.5 text-sm
                             bg-gradient-to-br from-cyan-600 to-indigo-600 text-white shadow-[0_8px_24px_-6px_rgba(14,165,233,0.35)] hover:brightness-110 transition"
                  title="Exportar a Excel por empresa"
                >
                  <DownloadOutlined className="hidden sm:inline" />
                  <span className="truncate">Exportar</span>
                </motion.button>
              </motion.div>
            </motion.div>

            {/* KPIs de totales */}
            <motion.div
              variants={listStagger}
              initial="initial"
              animate="animate"
              className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3"
            >
              {loadingTotals ? (
                <motion.div variants={fadeInUp} className="sm:col-span-3 rounded-2xl border border-cyan-200 bg-white p-3 text-slate-600">
                  Cargando totales…
                </motion.div>
              ) : errorTotals ? (
                <motion.div variants={fadeInUp} className="sm:col-span-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-700">
                  {errorTotals}
                </motion.div>
              ) : totals ? (
                <>
                  <motion.div variants={fadeInUp} className="rounded-2xl border border-cyan-200 bg-white p-3 hover:shadow-md transition">
                    <div className="text-xs text-slate-500">Solicitantes</div>
                    <div className="text-xl font-bold text-slate-900">{totals.solicitantes}</div>
                  </motion.div>
                  <motion.div variants={fadeInUp} className="rounded-2xl border border-cyan-200 bg-white p-3 hover:shadow-md transition">
                    <div className="text-xs text-slate-500">Empresas</div>
                    <div className="text-xl font-bold text-slate-900">{totals.empresas}</div>
                  </motion.div>
                  <motion.div variants={fadeInUp} className="rounded-2xl border border-cyan-200 bg-white p-3 hover:shadow-md transition">
                    <div className="text-xs text-slate-500">Equipos</div>
                    <div className="text-xl font-bold text-slate-900">{totals.equipos}</div>
                  </motion.div>
                </>
              ) : null}
            </motion.div>
          </div>
        </motion.div>

        {/* Cards (mobile) */}
        <section className="md:hidden space-y-3 mt-4" aria-live="polite" aria-busy={loading?"true":"false"}>
          {loading && (
            <div className="space-y-3">
              {Array.from({length:6}).map((_,i)=>(
                <div key={`skc-${i}`} className="rounded-2xl border border-cyan-200 bg-white p-4">
                  <div className="h-4 w-24 bg-cyan-100 rounded animate-pulse mb-2" />
                  <div className="h-3 w-3/4 bg-cyan-100 rounded animate-pulse mb-2" />
                  <div className="h-3 w-1/2 bg-cyan-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          )}
          {!loading && error && (
            <motion.div {...fadeInUp} className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 p-4 text-center">{error}</motion.div>
          )}
          {!loading && !error && data?.items?.length===0 && (
            <motion.div {...fadeInUp} className="rounded-2xl border border-cyan-200 bg-white text-slate-600 p-4 text-center">Sin resultados.</motion.div>
          )}
          <AnimatePresence mode="popLayout">
            {!loading && !error && data?.items?.map((s)=> (
              <motion.article
                key={s.id_solicitante}
                {...fadeInUp}
                whileHover={{ y: -2, boxShadow: "0 8px 24px -10px rgba(14,165,233,.25)" }}
                className="rounded-2xl border border-cyan-200 bg-white p-4 transition"
                onClick={()=>openRow(s)}
              >
                <header className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-500">#{s.id_solicitante}</div>
                    <h3 className="text-base font-semibold text-slate-900">{s.nombre}</h3>
                    <p className="text-xs text-slate-600 mt-0.5 flex items-center gap-1">
                      <MailOutlined /> <span className="truncate">{s.email ?? "—"}</span>
                    </p>
                  </div>
                  <span
                    className={clsx(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
                      companyTagClasses(s.empresa)
                    )}
                  >
                    {s.empresa?.nombre ?? "—"}
                  </span>
                </header>
                <div className="mt-3">
                  {s.equipos.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {s.equipos.map((e) => {
                        const label = e.marca ?? "Equipo";
                        const title = [e.marca, e.modelo, e.serial].filter(Boolean).join(" · ");
                        return (
                          <span
                            key={e.id_equipo}
                            className={clsx("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] border", brandTagClasses(e.marca))}
                            title={title}
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <span className="text-slate-600 text-sm">Sin equipos</span>
                  )}
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </section>

        {/* Tabla (desktop) */}
        <section
          className="hidden md:block rounded-3xl border border-cyan-200 bg-white overflow-hidden mt-4"
          aria-live="polite" aria-busy={loading?"true":"false"}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gradient-to-r from-cyan-50 to-indigo-50 text-slate-800 border-b border-cyan-200 sticky top-0 z-10">
                <tr>
                  {["ID","Nombre","Email","Empresa","Equipos"].map((h)=>(
                    <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <motion.tbody
                variants={listStagger}
                initial="initial"
                animate="animate"
                className="text-slate-800"
              >
                {loading && <TableSkeletonRows cols={5} rows={8} />}
                {!loading && error && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-rose-600">{error}</td></tr>
                )}
                {!loading && !error && data?.items?.length===0 && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Sin resultados.</td></tr>
                )}
                {!loading && !error && data?.items?.map((s)=>(
                  <motion.tr
                    key={s.id_solicitante}
                    variants={rowItem}
                    whileHover={{ backgroundColor: "rgba(219, 234, 254, 0.6)" }}
                    className="border-t border-cyan-100 transition-colors cursor-pointer odd:bg-white even:bg-slate-50/50"
                    onClick={()=>openRow(s)}
                    title="Ver detalle"
                  >
                    <td className="px-4 py-3 whitespace-nowrap">{s.id_solicitante}</td>
                    <td className="px-4 py-3"><div className="max-w-[320px] truncate">{s.nombre}</div></td>
                    <td className="px-4 py-3">
                      {s.email ? (
                        <div className="flex items-center gap-2 max-w-[320px]">
                          <a href={`mailto:${s.email}`} className="truncate text-cyan-700 underline decoration-dotted hover:decoration-solid">
                            {s.email}
                          </a>
                          <motion.button
                            {...press}
                            whileHover={{ y: -1 }}
                            onClick={(e)=>{ e.stopPropagation(); navigator.clipboard.writeText(s.email!); }}
                            className="text-xs px-2 py-0.5 rounded border border-cyan-200 hover:bg-cyan-50"
                            title="Copiar email"
                            aria-label="Copiar email"
                          >
                            Copiar
                          </motion.button>
                        </div>
                      ) : <div className="max-w-[320px] truncate text-slate-500">—</div>}
                    </td>
                    <td className="px-4 py-3">
                      {s.empresa?.nombre ? (
                        <span className={clsx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border", companyTagClasses(s.empresa))}>
                          {s.empresa.nombre}
                        </span>
                      ) : <span className="text-slate-500">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {s.equipos.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {s.equipos.map((e) => {
                            const label = e.marca ?? "Equipo";
                            const title = [e.marca, e.modelo, e.serial].filter(Boolean).join(" · ");
                            return (
                              <span
                                key={e.id_equipo}
                                className={clsx("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] border", brandTagClasses(e.marca))}
                                title={title}
                              >
                                {label}
                              </span>
                            );
                          })}
                        </div>
                      ) : <span className="text-slate-500">0</span>}
                    </td>
                  </motion.tr>
                ))}
              </motion.tbody>
            </table>
          </div>

          {/* Footer paginación + selector tamaño */}
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
              ) : <span>—</span>}
            </div>

            <div className="grid grid-cols-3 sm:flex sm:items-center gap-2">
              <label className="text-sm text-slate-700">
                Filas:{" "}
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="ml-2 rounded-xl border border-cyan-200 bg-white px-2 py-1 text-sm text-slate-900"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                </select>
              </label>

              <motion.button
                {...press}
                {...subtleHover}
                onClick={goPrev}
                disabled={!canPrev || loading}
                className={clsx(
                  "inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-sm",
                  "border-cyan-200 text-cyan-800 bg-white hover:bg-cyan-50",
                  (!canPrev || loading) && "opacity-40 cursor-not-allowed hover:bg-white"
                )}
                aria-label="Página anterior"
              >
                <LeftOutlined />
                <span className="hidden sm:inline">Anterior</span>
              </motion.button>
              <motion.button
                {...press}
                {...subtleHover}
                onClick={goNext}
                disabled={!canNext || loading}
                className={clsx(
                  "inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-sm",
                  "border-cyan-200 text-cyan-800 bg-white hover:bg-cyan-50",
                  (!canNext || loading) && "opacity-40 cursor-not-allowed hover:bg-white"
                )}
                aria-label="Página siguiente"
              >
                <span className="hidden sm:inline">Siguiente</span>
                <RightOutlined />
              </motion.button>
            </div>
          </div>
        </section>
      </main>

      {/* Modal de detalle */}
      <SolicitanteDetailModal
        open={openDetail}
        onClose={closeDetail}
        solicitante={selected}
      />
    </div>
  );
};

export default SolicitantesPage;
