// src/host/Solicitantes.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  SearchOutlined,
  LeftOutlined,
  RightOutlined,
  CloseCircleFilled,
  ReloadOutlined,
  ClearOutlined,
  DownloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  LoadingOutlined,
  SortAscendingOutlined,
  DownOutlined,
  SortDescendingOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import Header from "../components/Header";
import SolicitanteDetailModal from "../components/SolicitanteDetailModal";
import type { SolicitanteForDetail } from "../components/SolicitanteDetailModal";
import XlsxPopulate from "xlsx-populate/browser/xlsx-populate";
import CrearSolicitante from "../components/CrearSolicitante";

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
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL ??
  "http://localhost:4000/api";
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

/* =================== Helpers =================== */
const tokenHeader = (): HeadersInit => {
  const token = localStorage.getItem("accessToken");
  const h: Record<string, string> = {};
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
};


const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

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
function companyTagClasses(emp?: Empresa) {
  if (!emp) return "border-gray-200 bg-gray-50 text-gray-800";
  const seed = String(emp.id_empresa);
  const idx = strHash(seed) % COMPANY_TAG_PALETTE.length;
  return COMPANY_TAG_PALETTE[idx];
}

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
  if (/^lg$|lg electronics/.test(b))
    return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900";
  if (/microsoft|surface/.test(b))
    return "border-purple-200 bg-purple-50 text-purple-900";
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

/* =================== Excel helpers =================== */
type ValueT = string | number | boolean | Date | null | undefined;
interface Styled { style(s: Record<string, ValueT>): this; }
interface CellLike extends Styled { value(): ValueT; value(v: ValueT): this; relativeCell(dr: number, dc: number): CellLike; }
interface ColumnLike { width(w: number): void; }
interface RangeLike extends Styled { merged(): boolean; merged(m: boolean): this; }
interface WorksheetLike {
  cell(a1: string): CellLike; cell(r: number, c: number): CellLike;
  column(iOrLetter: number | string): ColumnLike;
  range(r1: number, c1: number, r2: number, c2: number): RangeLike;
  name(): string; name(n: string): void;
}
interface WorkbookLike {
  sheet(name: string): WorksheetLike | undefined;
  addSheet(name: string): WorksheetLike;
  outputAsync(): Promise<ArrayBuffer>;
}

const HEADER = ["ID", "Nombre", "Email", "Empresa", "Equipos", "Detalle equipos"] as const;
const COLOR_BORDER = "D1D5DB";
const COLOR_HEADER_TEXT = "0B4266";
const COLOR_TEXT = "111827";
const PALETTE = ["D9F99D","E0F2FE","FDE68A","FBCFE8","FCA5A5","DDD6FE","A7F3D0","FDE2E2","FFE4E6","F5F5F4"];
function colorFor(key: string): string {
  let h = 0; for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
function safeSheetName(raw: string) {
  const base = (raw || "Empresa").replace(/[\\/:*?"[\]]/g, "_").slice(0, 31);
  return base.length ? base : "Empresa";
}
function ensureUniqueSheetName(wb: WorkbookLike, desired: string) {
  let name = desired, i = 2;
  while (wb.sheet(name)) {
    const s = `_${i}`;
    name = (desired.slice(0, 31 - s.length) + s).replace(/[\\/:*?"[\]]/g, "_");
    i++;
  }
  return name;
}
function setAllBorders(ws: WorksheetLike, r1: number, c1: number, r2: number, c2: number) {
  ws.range(r1, c1, r2, c2).style({ border: true, borderColor: COLOR_BORDER });
}

async function buildExcelPerEmpresa(items: SolicitanteRow[]) {
  const wb = (await (XlsxPopulate as unknown as { fromBlankAsync(): Promise<WorkbookLike>; }).fromBlankAsync()) as WorkbookLike;
  const wsR = wb.addSheet("Resumen");
  wsR.cell("A1").value("Empresa").style({ bold: true, fill: "F1F5F9", fontColor: COLOR_HEADER_TEXT, border: true, borderColor: COLOR_BORDER, horizontalAlignment: "center" });
  wsR.cell("B1").value("Solicitantes").style({ bold: true, fill: "F1F5F9", fontColor: COLOR_HEADER_TEXT, border: true, borderColor: COLOR_BORDER, horizontalAlignment: "center" });
  wsR.cell("C1").value("Equipos").style({ bold: true, fill: "F1F5F9", fontColor: COLOR_HEADER_TEXT, border: true, borderColor: COLOR_BORDER, horizontalAlignment: "center" });

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
  const rows = Array.from(byId.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  let r = 2;
  for (const t of rows) {
    wsR.cell(r, 1).value(t.nombre);
    wsR.cell(r, 2).value(t.solicitantes);
    wsR.cell(r, 3).value(t.equipos);
    r++;
  }
  wsR.column("A").width(36); wsR.column("B").width(16); wsR.column("C").width(16);
  setAllBorders(wsR, 1, 1, Math.max(1, r - 1), 3);

  type EmpKey = { id: number | null; nombre: string };
  const group = new Map<string, { key: EmpKey; rows: SolicitanteRow[] }>();
  for (const s of items) {
    const id = s.empresa?.id_empresa ?? s.empresaId ?? null;
    const nombre = s.empresa?.nombre ?? (id !== null ? `#${id}` : "Sin empresa");
    const key = String(id ?? "null");
    if (!group.has(key)) group.set(key, { key: { id, nombre }, rows: [] });
    group.get(key)!.rows.push(s);
  }
  for (const { key, rows: people } of Array.from(group.values()).sort((a, b) => a.key.nombre.localeCompare(b.key.nombre, "es"))) {
    const empresa = key.nombre;
    const ws = wb.addSheet(ensureUniqueSheetName(wb, safeSheetName(empresa)));
    ws.cell("A1").value(`Solicitantes — ${empresa}`).style({
      bold: true, fontFamily: "Calibri", fontSize: 16, fontColor: COLOR_HEADER_TEXT,
      horizontalAlignment: "center", verticalAlignment: "center", fill: colorFor(empresa),
    });
    ws.range(1, 1, 1, HEADER.length).merged(true);
    for (let c = 0; c < HEADER.length; c++) {
      ws.cell(3, c + 1).value(HEADER[c]).style({
        bold: true, fontFamily: "Calibri", fontSize: 11, fontColor: COLOR_HEADER_TEXT,
        fill: "F8FAFC", horizontalAlignment: "left", verticalAlignment: "center",
        border: true, borderColor: COLOR_BORDER,
      });
    }
    let rr = 4;
    for (const s of people) {
      const equiposNum = s.equipos?.length ?? 0;
      const equiposDetalle = equiposNum
        ? s.equipos.map((e) => {
            const mm = [e.marca, e.modelo].filter(Boolean).join(" ");
            const ser = e.serial ? ` (${e.serial})` : "";
            return (mm || "Equipo") + ser;
          }).join(" · ")
        : "—";
      const rowValues: ValueT[] = [
        s.id_solicitante, s.nombre, s.email || "—", empresa, equiposNum, equiposDetalle,
      ];
      rowValues.forEach((val, c) => {
        ws.cell(rr, c + 1).value(val).style({ fontFamily: "Calibri", fontSize: 11, fontColor: COLOR_TEXT });
      });
      if ((rr - 4) % 2 === 1) ws.range(rr, 1, rr, HEADER.length).style({ fill: "F9FAFB" });
      rr++;
    }
    const widths = [10, 28, 32, 26, 10, 60];
    widths.forEach((w, i) => ws.column(i + 1).width(w));
    if (people.length > 0) setAllBorders(ws, 3, 1, rr - 1, HEADER.length);
  }
  const defaultSheet = wb.sheet("Sheet1"); if (defaultSheet) defaultSheet.name("_");
  const out = await wb.outputAsync();
  const blob = new Blob([out as ArrayBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const urlBlob = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = urlBlob;
  a.download = `Solicitantes_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(urlBlob);
}

/* =================== Animations =================== */
const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const fadeInUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } } } as const;
const subtleHover = { whileHover: { y: -2, scale: 1.01, transition: { duration: 0.15 } } } as const;
const press = { whileTap: { scale: 0.98 } } as const;
const rowItem = { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: EASE_OUT } } } as const;

/* =================== Modal Editar =================== */
const emailValid = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
type UpdatePayload = { nombre?: string; email?: string | null; empresaId?: number; };
function isApiError(x: unknown): x is { error?: string } { return typeof x === "object" && x !== null && "error" in x; }

const EditSolicitanteModal: React.FC<{
  open: boolean; onClose: () => void; solicitante: SolicitanteRow | null; onUpdated: () => void;
}> = ({ open, onClose, solicitante, onUpdated }) => {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState<string>("");
  const [empresaId, setEmpresaId] = useState<string>("");
  const [empresas, setEmpresas] = useState<{ id_empresa: number; nombre: string }[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<{ nombre?: boolean; email?: boolean }>({});

  useEffect(() => {
    if (!open) return;
    setNombre(solicitante?.nombre ?? "");
    setEmail(solicitante?.email ?? "");
    setEmpresaId(
      solicitante?.empresa?.id_empresa != null
        ? String(solicitante.empresa.id_empresa)
        : solicitante?.empresaId != null
        ? String(solicitante.empresaId)
        : ""
    );
    setError(null); setTouched({});
    type EmpresaDTO = { id_empresa: number; nombre: string };
    type EmpresasResponse = { items?: EmpresaDTO[]; data?: EmpresaDTO[] };
    const ctrl = new AbortController();
    const load = async () => {
      try {
        const u = new URL(`${API_URL}/empresas`); u.searchParams.set("pageSize", "2000");
        const r = await fetch(u.toString(), { headers: tokenHeader(), signal: ctrl.signal });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j: EmpresasResponse = await r.json();
        const list: EmpresaDTO[] = (j.items ?? j.data ?? []).map((e) => ({ id_empresa: e.id_empresa, nombre: e.nombre }));
        setEmpresas(list);
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setEmpresas([]);
      }
    };
    void load();
    return () => ctrl.abort();
  }, [open, solicitante]);

  const filteredEmpresas = useMemo(() => {
    const s = normalize(search.trim()); if (!s) return empresas;
    return empresas.filter((e) => normalize(e.nombre).includes(s));
  }, [empresas, search]);

  const nombreError = touched.nombre && !nombre.trim() ? "El nombre es obligatorio." : null;
  const emailError = touched.email && email.trim() && !emailValid(email.trim()) ? "El correo no tiene un formato válido." : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ nombre: true, email: true });
    if (!nombre.trim() || (email.trim() && !emailValid(email.trim()))) { setError("Revisa los campos marcados."); return; }
    if (!solicitante) return;

    setError(null); setSaving(true);
    try {
      const payload: UpdatePayload = {};
      const nombreClean = nombre.trim();
      const emailClean = email.trim();

      if (nombreClean !== solicitante.nombre) payload.nombre = nombreClean;
      if ((emailClean || null) !== (solicitante.email ?? null)) payload.email = emailClean ? emailClean : null;

      const nextEmpresaId = empresaId ? Number(empresaId) : undefined;
      const currentEmpresaId = solicitante.empresa?.id_empresa ?? solicitante.empresaId ?? undefined;
      if (nextEmpresaId !== undefined && nextEmpresaId !== currentEmpresaId) payload.empresaId = nextEmpresaId;

      if (Object.keys(payload).length === 0) { onClose(); return; }

      const r = await fetch(`${API_URL}/solicitante/${solicitante.id_solicitante}`, {
        method: "PATCH", headers: { "Content-Type": "application/json", ...tokenHeader() },
        body: JSON.stringify(payload),
      });

      let j: unknown = null; try { j = await r.json(); } catch { /* optional */ }
      if (!r.ok) {
        const msg = isApiError(j) && j.error ? j.error : `HTTP ${r.status}`;
        throw new Error(msg);
      }
      onUpdated(); onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar.");
    } finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden">
          {saving && (
            <div className="absolute inset-0 z-10 grid place-items-center bg-white/60 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-cyan-700">
                <LoadingOutlined className="animate-spin" /> Guardando…
              </div>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-cyan-50 to-indigo-50">
            <div className="font-semibold text-slate-800">Editar solicitante</div>
            <button onClick={onClose} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800" disabled={saving} aria-label="Cerrar modal">
              <CloseOutlined />
            </button>
          </div>
          <form onSubmit={submit} className="p-4 space-y-4">
            {error && <div className="rounded-lg border border-rose-300 bg-rose-50 text-rose-700 px-3 py-2">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nombre <span className="text-rose-500">*</span>
              </label>
              <input
                value={nombre}
                onBlur={() => setTouched((t) => ({ ...t, nombre: true }))}
                onChange={(e) => setNombre(e.target.value)}
                disabled={saving}
                className={clsx(
                  "w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2",
                  nombreError ? "border-rose-300 focus:ring-rose-400/40" : "border-cyan-200 focus:ring-cyan-500/30"
                )}
              />
              {nombreError && <p className="mt-1 text-xs text-rose-600">{nombreError}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <input
                type="email"
                value={email}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                onChange={(e) => setEmail(e.target.value)}
                disabled={saving}
                className={clsx(
                  "w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2",
                  emailError ? "border-rose-300 focus:ring-rose-400/40" : "border-cyan-200 focus:ring-cyan-500/30"
                )}
              />
              {emailError && <p className="mt-1 text-xs text-rose-600">{emailError}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Empresa</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar empresa…"
                  disabled={saving}
                  className="flex-1 px-3 py-2 rounded-lg border border-cyan-200 focus:ring-2 focus:ring-cyan-500/30"
                />
              </div>
              <select
                value={empresaId}
                onChange={(e) => setEmpresaId(e.target.value)}
                disabled={saving}
                className="w-full px-3 py-2 rounded-lg border border-cyan-200 focus:ring-2 focus:ring-cyan-500/30"
              >
                <option value="">— Selecciona —</option>
                {filteredEmpresas.map((emp) => (
                  <option key={emp.id_empresa} value={String(emp.id_empresa)}>
                    {emp.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} disabled={saving} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                <CloseOutlined /> Cancelar
              </button>
              <button type="submit" disabled={saving || !!nombreError || !!emailError} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60">
                {saving ? <LoadingOutlined className="animate-spin" /> : <SaveOutlined />} Guardar cambios
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

/* =================== Page =================== */
type SortKey = "empresa" | "nombre" | "id";
type SortDir = "asc" | "desc";

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

  // selección modal detalle
  const [selected, setSelected] = useState<SolicitanteForDetail | null>(null);
  const [openDetail, setOpenDetail] = useState<boolean>(false);

  // modales CRUD
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<SolicitanteRow | null>(null);

  // filtro empresa
  type EmpresaOpt = { id: number; nombre: string };
  const [empresaOptions, setEmpresaOptions] = useState<EmpresaOpt[]>([]);
  const [empresaFilterId, setEmpresaFilterId] = useState<number | null>(null);
  const empresaSelectRef = useRef<HTMLSelectElement | null>(null);

  // orden (UI select + toggle)
  const [sortKey, setSortKey] = useState<SortKey>("empresa");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // anti-race
  const reqSeqRef = useRef(0);
  const totalsSeqRef = useRef(0);

  // totales
  type Totals = { solicitantes: number; empresas: number; equipos: number };
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loadingTotals, setLoadingTotals] = useState<boolean>(false);
  const [errorTotals, setErrorTotals] = useState<string | null>(null);

  

  const showingRange = useMemo(() => {
    if (!data || data.total === 0) return null;
    const start = (data.page - 1) * data.pageSize + 1;
    const end = Math.min(data.page * data.pageSize, data.total);
    return { start, end };
  }, [data]);

  /* ======== Cargar opciones de empresa ======== */
  useEffect(() => {
    type EmpresasResponse = { items?: Array<{ id_empresa: number; nombre: string }>; data?: Array<{ id_empresa: number; nombre: string }>; };
    const ctrl = new AbortController();
    const loadEmpresas = async () => {
      try {
        const u = new URL(`${API_URL}/empresas`);
        u.searchParams.set("pageSize", "5000");
        const r = await fetch(u.toString(), { headers: tokenHeader(), cache: "no-store", signal: ctrl.signal });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j: EmpresasResponse = await r.json();
        const list = (j.items ?? j.data ?? []) as Array<{ id_empresa: number; nombre: string }>;
        setEmpresaOptions(
          list.map((e) => ({ id: e.id_empresa, nombre: e.nombre }))
              .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
        );
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setEmpresaOptions([]);
      }
    };
    void loadEmpresas();
    return () => ctrl.abort();
  }, []);

  // Ajuste si la página queda fuera de rango
  useEffect(() => {
    if (data && page > data.totalPages) setPage(Math.max(1, data.totalPages));
  }, [data, page]);

  /* ======== FETCH LISTA ======== */
  const fetchList = useCallback(
    async (signal?: AbortSignal) => {
      const seq = ++reqSeqRef.current;
      try {
        setLoading(true); setError(null);

        const url = new URL(`${API_URL}/solicitante`);
        url.searchParams.set("page", String(page));
        url.searchParams.set("pageSize", String(pageSize));
        url.searchParams.set("orderBy", sortKey);
        url.searchParams.set("orderDir", sortDir);

        // backend actual usa empresaId O q.
        if (empresaFilterId !== null) {
          url.searchParams.set("empresaId", String(empresaFilterId));
        } else if (qDebounced.trim()) {
          url.searchParams.set("q", qDebounced.trim());
        }
        url.searchParams.set("_ts", String(Date.now()));

        const res = await fetch(url.toString(), {
          method: "GET",
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache", ...tokenHeader() },
          cache: "no-store",
          credentials: "include",
          signal,
        });

        if (seq !== reqSeqRef.current) return;
        if (!res.ok && res.status !== 204) {
          let apiErr = `HTTP ${res.status}`;
          try {
            const payload: unknown = await res.json();
            if (typeof payload === "object" && payload !== null && "error" in payload) {
              apiErr = (payload as { error?: string }).error || apiErr;
            }
          } catch {/* ignore */}
          throw new Error(apiErr);
        }
        if (res.status === 204) {
          setData({ page, pageSize, total: 0, totalPages: 1, items: [] });
          return;
        }
        const json = (await res.json()) as ApiList<SolicitanteRow>;
        setData(json);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Error al cargar");
      } finally {
        if (seq === reqSeqRef.current) setLoading(false);
      }
    },
    [page, pageSize, empresaFilterId, qDebounced, sortKey, sortDir]
  );

  /* ======== FETCH TOTALES ======== */
  const fetchTotals = useCallback(
    async (signal?: AbortSignal) => {
      const seq = ++totalsSeqRef.current;
      try {
        setLoadingTotals(true); setErrorTotals(null);
        const urlM = new URL(`${API_URL}/solicitante/metrics`);
        if (empresaFilterId !== null) {
          urlM.searchParams.set("empresaId", String(empresaFilterId));
        } else if (qDebounced.trim()) {
          urlM.searchParams.set("q", qDebounced.trim());
        }
        urlM.searchParams.set("_ts", String(Date.now()));
        const r = await fetch(urlM.toString(), {
          method: "GET",
          headers: { "Cache-Control": "no-cache", Pragma: "no-cache", ...tokenHeader() },
          cache: "no-store",
          credentials: "include",
          signal,
        });
        if (seq !== totalsSeqRef.current) return;
        if (r.ok) {
          const m = (await r.json()) as Partial<Totals>;
          if (typeof m.solicitantes === "number" && typeof m.empresas === "number" && typeof m.equipos === "number") {
            setTotals({ solicitantes: m.solicitantes, empresas: m.empresas, equipos: m.equipos });
          } else setTotals(null);
        } else setTotals(null);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setErrorTotals(err instanceof Error ? err.message : "Error al cargar totales");
      } finally {
        if (seq === totalsSeqRef.current) setLoadingTotals(false);
      }
    },
    [empresaFilterId, qDebounced]
  );

  /* ======== Effects ======== */
  useEffect(() => {
    const ctrl = new AbortController();
    void fetchList(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchList]);

  useEffect(() => {
    const ctrl = new AbortController();
    void fetchTotals(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchTotals, data?.total]);

  const canNext = useMemo(() => (data ? page < data.totalPages : false), [data, page]);

  // estado: id del que se está eliminando
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // pequeño toast de feedback
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    window.setTimeout(() => setToast(null), 2500);
  };

  

  /* ======== Handlers ======== */
  const openRow = (row: SolicitanteRow) => {
    const detail: SolicitanteForDetail = {
      id_solicitante: row.id_solicitante,
      nombre: row.nombre,
      empresaId: row.empresaId,
      empresa: row.empresa,
      equipos: row.equipos,
    };
    setSelected(detail); setOpenDetail(true);
  };
  const closeDetail = () => setOpenDetail(false);

  const clearSearch = () => {
    setQ(""); setPage(1);
    const ctrl1 = new AbortController(); void fetchList(ctrl1.signal);
    const ctrl2 = new AbortController(); void fetchTotals(ctrl2.signal);
  };

  const clearEmpresaFilter = () => { setEmpresaFilterId(null); setPage(1); };

  const manualReload = () => {
    const ctrl1 = new AbortController(); void fetchList(ctrl1.signal);
    const ctrl2 = new AbortController(); void fetchTotals(ctrl2.signal);
  };

  /** Exportar Excel */
  const onExportExcel = async () => {
    try {
      const firstU = new URL(`${API_URL}/solicitante`);
      firstU.searchParams.set("page", "1");
      firstU.searchParams.set("pageSize", String(MAX_PAGE_SIZE));
      firstU.searchParams.set("orderBy", sortKey);
      firstU.searchParams.set("orderDir", sortDir);
      if (empresaFilterId !== null) firstU.searchParams.set("empresaId", String(empresaFilterId));
      else if (qDebounced.trim()) firstU.searchParams.set("q", qDebounced.trim());
      firstU.searchParams.set("_ts", String(Date.now()));

      const firstR = await fetch(firstU.toString(), { headers: tokenHeader(), credentials: "include", cache: "no-store" });
      if (!firstR.ok) throw new Error(`HTTP ${firstR.status}`);
      const first = (await firstR.json()) as ApiList<SolicitanteRow>;
      const all: SolicitanteRow[] = [...first.items];

      for (let p = 2; p <= (first.totalPages || 1); p++) {
        const u = new URL(`${API_URL}/solicitante`);
        u.searchParams.set("page", String(p));
        u.searchParams.set("pageSize", String(MAX_PAGE_SIZE));
        u.searchParams.set("orderBy", sortKey);
        u.searchParams.set("orderDir", sortDir);
        if (empresaFilterId !== null) u.searchParams.set("empresaId", String(empresaFilterId));
        else if (qDebounced.trim()) u.searchParams.set("q", qDebounced.trim());
        u.searchParams.set("_ts", String(Date.now()));
        const r = await fetch(u.toString(), { headers: tokenHeader(), credentials: "include", cache: "no-store" });
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

  /* ======== Ordenamiento local (lista PLANA) ======== */
  const sortedItems = useMemo(() => {
    const arr = [...(data?.items ?? [])];

    const byEmpresa = (a: SolicitanteRow, b: SolicitanteRow) =>
      (a.empresa?.nombre ?? "Sin empresa").localeCompare(b.empresa?.nombre ?? "Sin empresa", "es");

    const byNombre = (a: SolicitanteRow, b: SolicitanteRow) =>
      normalize(a.nombre).localeCompare(normalize(b.nombre), "es");

    const byId = (a: SolicitanteRow, b: SolicitanteRow) =>
      a.id_solicitante - b.id_solicitante;

    const cmp =
      sortKey === "empresa" ? byEmpresa :
      sortKey === "nombre"  ? byNombre  :
      byId;

    arr.sort((a, b) => (sortDir === "asc" ? cmp(a, b) : -cmp(a, b)));
    return arr;
  }, [data?.items, sortKey, sortDir]);

  /* =================== UI =================== */
  return (
  <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-white via-white to-cyan-50">
    {/* Fondo */}
    <div className="pointer-events-none absolute inset-0 -z-10">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="absolute inset-0 [background:radial-gradient(circle_at_1px_1px,rgba(14,165,233,0.08)_1px,transparent_0)_0_0/22px_22px]"
      />
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

    <main className="px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6 pb-24 md:pb-10 max-w-7xl mx-auto w-full">
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

          {/* Subtítulo */}
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Gestión de solicitantes, empresas y equipos — búsqueda, exportación y CRUD.
          </p>

          {/* === CONTROLES (toolbar) === */}
          <div className="mt-5 flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:flex-wrap items-stretch gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600/70" />
                <input
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(1); }}
                  placeholder={
                    empresaFilterId !== null
                      ? "Búsqueda deshabilitada por filtro empresa"
                      : "Buscar por nombre o empresa…"
                  }
                  className="w-full rounded-2xl border border-cyan-200/70 bg-white/90 pl-9 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                  aria-label="Buscar solicitantes por nombre o empresa"
                  disabled={empresaFilterId !== null}
                />
                {q.length > 0 && empresaFilterId === null && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-700/80 hover:text-cyan-900"
                    aria-label="Limpiar búsqueda"
                    title="Limpiar"
                    type="button"
                  >
                    <CloseCircleFilled />
                  </button>
                )}
              </div>

              {/* Filtro empresa */}
              <div className="relative w-full sm:w-64 md:w-72 lg:w-80 xl:w-96">
                <select
                  ref={empresaSelectRef}
                  value={empresaFilterId ?? ""}
                  onFocus={() => empresaSelectRef.current?.showPicker?.()}
                  onClick={() => empresaSelectRef.current?.showPicker?.()}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEmpresaFilterId(v ? Number(v) : null);
                    setPage(1);
                  }}
                  className="w-full appearance-none rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 pr-10 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  aria-label="Filtrar por empresa"
                >
                  <option value="">— Filtrar por empresa —</option>
                  {empresaOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.nombre}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cyan-700/80">
                  <DownOutlined />
                </span>

                {empresaFilterId !== null && (
                  <button
                    onClick={clearEmpresaFilter}
                    type="button"
                    className="absolute -right-10 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50"
                    title="Quitar filtro"
                    aria-label="Quitar filtro de empresa"
                  >
                    <ClearOutlined />
                  </button>
                )}
              </div>

              {/* Orden */}
              <div className="flex items-stretch gap-2 md:ml-auto flex-wrap">
                <div className="relative w-full sm:w-44">
                  <label className="sr-only">Ordenar por</label>
                  <select
                    value={sortKey}
                    onChange={(e) => {
                      const next = e.target.value as SortKey;
                      setSortKey(next); setPage(1);
                    }}
                    className="w-full rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 pr-9 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  >
                    <option value="nombre">Nombre</option>
                    <option value="empresa">Empresa</option>
                    <option value="id">ID</option>
                  </select>
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-cyan-700/80">
                    <SortAscendingOutlined />
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => { setSortDir((d) => (d === "asc" ? "desc" : "asc")); setPage(1); }}
                  title={sortDir === "asc" ? "Ascendente" : "Descendente"}
                  aria-label="Cambiar dirección de orden"
                  className={clsx(
                    "inline-flex items-center justify-center rounded-2xl border px-3 py-2.5 text-sm",
                    "border-cyan-200/70 bg-white/90 text-cyan-800 hover:bg-cyan-50"
                  )}
                >
                  {sortDir === "asc" ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
                </button>

                {/* Acciones */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full sm:w-auto">
                  {/* Nuevo */}
                  <button
                    onClick={() => setOpenCreate(true)}
                    type="button"
                    className="
                      inline-flex items-center justify-center gap-2
                      rounded-2xl px-3 py-2.5 text-sm font-medium
                      text-white bg-gradient-to-tr from-emerald-600 to-cyan-600
                      w-full sm:w-auto min-w-[120px]
                      shadow-[0_6px_18px_-6px_rgba(16,185,129,0.45)]
                      hover:brightness-110 active:scale-[0.98]
                      transition duration-200
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white
                      disabled:opacity-60 disabled:cursor-not-allowed
                    "
                    title="Nuevo solicitante"
                  >
                    <PlusOutlined className="hidden sm:inline" />
                    <span className="truncate">Nuevo</span>
                  </button>

                  {/* Recargar */}
                  <button
                    onClick={manualReload}
                    type="button"
                    className="
                      inline-flex items-center justify-center gap-2 rounded-2xl
                      border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm
                      text-cyan-800 hover:bg-cyan-50 active:scale-[0.98]
                      transition duration-200 w-full sm:w-auto min-w-[120px]
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white
                      disabled:opacity-60 disabled:cursor-not-allowed
                    "
                    title="Recargar"
                  >
                    <ReloadOutlined className="hidden sm:inline" />
                    <span className="truncate">Recargar</span>
                  </button>

                  {/* Exportar */}
                  <button
                    onClick={onExportExcel}
                    type="button"
                    className="
                      inline-flex items-center justify-center gap-2 rounded-2xl
                      px-3 py-2.5 text-sm font-medium text-white
                      bg-gradient-to-tr from-cyan-600 to-indigo-600
                      shadow-[0_6px_18px_-6px_rgba(14,165,233,0.45)]
                      hover:brightness-110 active:scale-[0.98]
                      transition duration-200 w-full sm:w-auto min-w-[120px]
                      focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white
                      disabled:opacity-60 disabled:cursor-not-allowed
                    "
                    title="Exportar a Excel por empresa"
                  >
                    <DownloadOutlined className="hidden sm:inline" />
                    <span className="truncate">Exportar</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Separador sutil */}
            <div className="mt-3 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent" />

            {/* === KPIs === */}
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {loadingTotals ? (
                <div className="sm:col-span-3 rounded-2xl border border-cyan-200/70 bg-white/70 p-3 text-slate-600">
                  Cargando totales…
                </div>
              ) : errorTotals ? (
                <div className="sm:col-span-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-rose-700">
                  {errorTotals}
                </div>
              ) : (
                <>
                  <div className="rounded-2xl border border-cyan-200/60 bg-white/70 backdrop-blur-md p-4 shadow-sm hover:shadow-md transition">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Solicitantes</div>
                    <div className="mt-1 text-2xl font-extrabold text-slate-900">{totals?.solicitantes ?? "—"}</div>
                  </div>
                  <div className="rounded-2xl border border-cyan-200/60 bg-white/70 backdrop-blur-md p-4 shadow-sm hover:shadow-md transition">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Empresas</div>
                    <div className="mt-1 text-2xl font-extrabold text-slate-900">{totals?.empresas ?? "—"}</div>
                  </div>
                  <div className="rounded-2xl border border-cyan-200/60 bg-white/70 backdrop-blur-md p-4 shadow-sm hover:shadow-md transition">
                    <div className="text-[11px] uppercase tracking-wide text-slate-500">Equipos</div>
                    <div className="mt-1 text-2xl font-extrabold text-slate-900">{totals?.equipos ?? "—"}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabla (desktop) — SIEMPRE PLANA */}
      <section
        className="hidden md:block rounded-3xl border border-cyan-200 bg-white overflow-hidden mt-4"
        aria-live="polite"
        aria-busy={loading ? "true" : "false"}
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gradient-to-r from-cyan-50 to-indigo-50 text-slate-800 border-b border-cyan-200 sticky top-0 z-10">
              <tr>
                {["ID", "Nombre", "Email", "Empresa", "Equipos", "Acciones"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold align-middle">
                    <div className="inline-flex items-center gap-2">
                      {h}
                      {h === "Empresa" && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-normal text-cyan-700 bg-cyan-100/60 border border-cyan-200 rounded px-1.5 py-0.5">
                          {sortDir === "asc" ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
                          {sortKey === "empresa"
                            ? sortDir === "asc" ? "Empresa A–Z" : "Empresa Z–A"
                            : sortKey === "nombre"
                            ? sortDir === "asc" ? "Nombre A–Z" : "Nombre Z–A"
                            : sortDir === "asc" ? "ID asc." : "ID desc."}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {loading && (
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="border-t border-cyan-100/60">
                    {Array.from({ length: 6 }).map((__, j) => (
                      <td key={`sk-${i}-${j}`} className="px-4 py-3">
                        <div className="h-4 w-full max-w-[240px] animate-pulse rounded bg-gradient-to-r from-cyan-50 via-cyan-100 to-cyan-50" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            )}

            {!loading && !error && sortedItems.length === 0 && (
              <tbody>
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">Sin resultados.</td>
                </tr>
              </tbody>
            )}

            {!loading && !error && sortedItems.length > 0 && (
              <tbody>
                {sortedItems.map((s, idx) => (
                  <motion.tr
                    key={s.id_solicitante}
                    variants={rowItem}
                    whileHover={{ backgroundColor: "rgba(219, 234, 254, 0.35)" }}
                    className={clsx(
                      "border-t border-cyan-100 transition-colors",
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                    )}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">{s.id_solicitante}</td>
                    <td className="px-4 py-3">
                      <button
                        className="text-left max-w-[320px] truncate hover:underline decoration-dotted text-cyan-700"
                        onClick={() => openRow(s)}
                        title="Ver detalle"
                        type="button"
                      >
                        {s.nombre}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {s.email ? (
                        <div className="flex items-center gap-2 max-w-[320px]">
                          <a
                            href={`mailto:${s.email}`}
                            className="truncate text-cyan-700 underline decoration-dotted hover:decoration-solid"
                          >
                            {s.email}
                          </a>
                          <motion.button
                            {...press}
                            whileHover={{ y: -1 }}
                            onClick={() => navigator.clipboard.writeText(s.email!)}
                            className="text-xs px-2 py-0.5 rounded border border-cyan-200 hover:bg-cyan-50"
                            title="Copiar email"
                            aria-label="Copiar email"
                            type="button"
                          >
                            Copiar
                          </motion.button>
                        </div>
                      ) : (
                        <div className="max-w-[320px] truncate text-slate-500">—</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.empresa?.nombre ? (
                        <span className={clsx(
                          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border",
                          companyTagClasses(s.empresa)
                        )}>
                          {s.empresa.nombre}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
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
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditing(s); }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                          title="Editar"
                          type="button"
                        >
                          <EditOutlined /> Editar
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (deletingId !== null) return; // evita dobles clics
                            setDeletingId(s.id_solicitante);
                            const base = `${API_URL}/solicitante/${s.id_solicitante}`;

                            const tryDelete = async (force = false) => {
                              const url = force ? `${base}?force=true` : base;
                              const r = await fetch(url, { method: "DELETE", headers: tokenHeader() });
                              if (!r.ok) {
                                try {
                                  const j: unknown = await r.json();
                                  if (r.status === 409 && typeof j === "object" && j !== null && "error" in j) {
                                    return { ok: false, conflict: true, message: (j as { error?: string }).error };
                                  }
                                } catch { /* ignore */ }
                                throw new Error(`HTTP ${r.status}`);
                              }
                              return { ok: true };
                            };

                            try {
                              const first = await tryDelete(false);
                              if ((first as { ok: boolean }).ok) {
                                showToast("Solicitante eliminado", "success");
                                manualReload();
                                return;
                              }
                              if ((first as { conflict?: boolean }).conflict) {
                                const ask = window.confirm(
                                  "Este solicitante tiene equipos asociados. ¿Deseas forzar la eliminación y desvincular sus equipos?"
                                );
                                if (!ask) return;
                                const forced = await tryDelete(true);
                                if ((forced as { ok: boolean }).ok) {
                                  showToast("Solicitante eliminado", "success");
                                  manualReload();
                                  return;
                                }
                                throw new Error("No se pudo eliminar.");
                              }
                            } catch (err) {
                              showToast(err instanceof Error ? err.message : "No se pudo eliminar.", "error");
                            } finally {
                              setDeletingId(null);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-60"
                          title="Eliminar"
                          type="button"
                          disabled={deletingId === s.id_solicitante}
                        >
                          {deletingId === s.id_solicitante ? (
                            <>
                              <LoadingOutlined className="animate-spin" /> Eliminando…
                            </>
                          ) : (
                            <>
                              <DeleteOutlined /> Eliminar
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            )}

            {!loading && error && (
              <tbody>
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-rose-600">{error}</td>
                </tr>
              </tbody>
            )}
          </table>
        </div>

        {/* Footer paginación + selector tamaño */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-slate-50 border-t border-cyan-200">
          <div className="text-sm text-slate-700 text-center sm:text-left">
            {data ? (
              <span>
                {showingRange ? (
                  <>
                    Mostrando{" "}
                    <strong className="text-slate-900">{showingRange.start}</strong>
                    –{/* EN DASH */}
                    <strong className="text-slate-900">{showingRange.end}</strong>{" "}
                    de <strong className="text-slate-900">{data.total}</strong> •{" "}
                  </>
                ) : null}
                Página <strong className="text-slate-900">{data.page}</strong> de{" "}
                <strong className="text-slate-900">{data.totalPages}</strong>
              </span>
            ) : (
              <span>—</span>
            )}
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
              onClick={() => page > 1 && setPage((p) => p - 1)}
              disabled={page <= 1 || loading}
              className={clsx(
                "inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-sm",
                "border-cyan-200 text-cyan-800 bg-white hover:bg-cyan-50",
                (page <= 1 || loading) && "opacity-40 cursor-not-allowed hover:bg-white"
              )}
              aria-label="Página anterior"
              type="button"
            >
              <LeftOutlined />
              <span className="hidden sm:inline">Anterior</span>
            </motion.button>

            <motion.button
              {...press}
              {...subtleHover}
              onClick={() => canNext && setPage((p) => p + 1)}
              disabled={!canNext || loading}
              className={clsx(
                "inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-sm",
                "border-cyan-200 text-cyan-800 bg-white hover:bg-cyan-50",
                (!canNext || loading) && "opacity-40 cursor-not-allowed hover:bg-white"
              )}
              aria-label="Página siguiente"
              type="button"
            >
              <span className="hidden sm:inline">Siguiente</span>
              <RightOutlined />
            </motion.button>
          </div>
        </div>
      </section>

      {/* Cards (mobile) — SIEMPRE PLANAS */}
      <section className="md:hidden mt-4 space-y-3">
        {loading && (
          <>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={`sk-m-${i}`} className="rounded-2xl border border-cyan-200 bg-white p-4">
                <div className="h-4 w-2/3 animate-pulse rounded bg-gradient-to-r from-cyan-50 via-cyan-100 to-cyan-50" />
                <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-gradient-to-r from-cyan-50 via-cyan-100 to-cyan-50" />
              </div>
            ))}
          </>
        )}

        {!loading && !error && sortedItems.length === 0 && (
          <div className="rounded-2xl border border-cyan-200 bg-white p-6 text-center text-slate-500">
            Sin resultados.
          </div>
        )}

        {!loading && !error && sortedItems.map((s) => (
          <div key={`m-row-${s.id_solicitante}`} className="rounded-2xl border border-cyan-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <button
                  className="text-left text-sm font-semibold text-cyan-700 hover:underline decoration-dotted"
                  onClick={() => openRow(s)}
                  type="button"
                  title="Ver detalle"
                >
                  {s.nombre}
                </button>
                <div className="mt-1 text-xs text-slate-600">ID #{s.id_solicitante}</div>
                <div className="mt-1 text-xs text-slate-600">
                  {s.email ? (
                    <a href={`mailto:${s.email}`} className="text-cyan-700 underline decoration-dotted">
                      {s.email}
                    </a>
                  ) : "—"}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.equipos.length > 0 ? (
                    s.equipos.map((e) => (
                      <span
                        key={`m-tag-${e.id_equipo}`}
                        className={clsx("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] border", brandTagClasses(e.marca))}
                        title={[e.marca, e.modelo, e.serial].filter(Boolean).join(" · ")}
                      >
                        {e.marca ?? "Equipo"}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">0 equipos</span>
                  )}
                </div>
              </div>

              <div className="shrink-0 flex flex-col gap-2">
                <button
                  onClick={() => setEditing(s)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                  title="Editar"
                  type="button"
                >
                  <EditOutlined /> Editar
                </button>
                <button
                  onClick={async () => {
                    const base = `${API_URL}/solicitante/${s.id_solicitante}`;
                    const tryDelete = async (force = false) => {
                      const url = force ? `${base}?force=true` : base;
                      const r = await fetch(url, { method: "DELETE", headers: tokenHeader() });
                      if (!r.ok) {
                        try {
                          const j: unknown = await r.json();
                          if (r.status === 409 && typeof j === "object" && j !== null && "error" in j) {
                            return { ok: false, conflict: true, message: (j as { error?: string }).error };
                          }
                        } catch { /* ignore */ }
                        throw new Error(`HTTP ${r.status}`);
                      }
                      return { ok: true };
                    };
                    try {
                      const first = await tryDelete(false);
                      if ((first as { ok: boolean }).ok) { manualReload(); return; }
                      if ((first as { conflict?: boolean }).conflict) {
                        const ask = window.confirm("Este solicitante tiene equipos asociados. ¿Deseas forzar la eliminación y desvincular sus equipos?");
                        if (!ask) return;
                        const forced = await tryDelete(true);
                        if ((forced as { ok: boolean }).ok) { manualReload(); return; }
                        throw new Error("No se pudo eliminar.");
                      }
                    } catch (err) {
                      alert(err instanceof Error ? err.message : "No se pudo eliminar.");
                    }
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs rounded border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100"
                  title="Eliminar"
                  type="button"
                >
                  <DeleteOutlined /> Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>
    </main>

    {/* Toast feedback */}
    {toast && (
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        className={clsx(
          "fixed bottom-6 right-6 z-[120] rounded-xl px-4 py-3 shadow-lg border",
          toast.type === "success"
            ? "bg-emerald-600 text-white border-emerald-500"
            : "bg-rose-600 text-white border-rose-500"
        )}
        role="status"
        aria-live="polite"
      >
        {toast.text}
      </motion.div>
    )}

    {/* Modales */}
    <SolicitanteDetailModal open={openDetail} onClose={closeDetail} solicitante={selected} />

    {openCreate && (
      <div className="fixed inset-0 z-[100]">
        <div className="absolute inset-0 bg-black/60" onClick={() => setOpenCreate(false)} />
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-cyan-50">
              <div className="font-semibold text-slate-800 flex items-center gap-2">
                <PlusOutlined /> Nuevo solicitante
              </div>
              <button
                onClick={() => setOpenCreate(false)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800"
                aria-label="Cerrar modal"
              >
                <CloseOutlined />
              </button>
            </div>
            <div className="p-4">
              <CrearSolicitante
                onCancel={() => setOpenCreate(false)}
                onSuccess={() => { setOpenCreate(false); manualReload(); }}
              />
            </div>
          </div>
        </div>
      </div>
    )}

    <EditSolicitanteModal
      open={!!editing}
      onClose={() => setEditing(null)}
      solicitante={editing}
      onUpdated={manualReload}
    />
  </div>
);

};

export default SolicitantesPage;
