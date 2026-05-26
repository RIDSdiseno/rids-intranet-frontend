// src/pages/EmpresasPage.tsx
import React, { useState, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import {
  LoadingOutlined,
  ReloadOutlined,
  TeamOutlined,
  BuildOutlined,
  LaptopOutlined,
  PieChartOutlined,
  RiseOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
} from "@ant-design/icons";

import { motion, AnimatePresence } from "framer-motion";

import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

import type {
  NameType,
  ValueType,
} from "recharts/types/component/DefaultTooltipContent";

import type {
  EmpresaLite,
  EquipoLite,
  SolicitanteLite,
  Visita,
  EstadisticasEmpresa,
  FichaEmpresaCompleta,
  DetalleEmpresa,
} from "../components/modals-empresa/types";

import EmpresaDetailsModal from "../components/modals-empresa/EmpresaDetailsModal";
import FichaEmpresaModal from "../components/modals-empresa/FichaEmpresaModal";
import CrearEmpresaModal from "../components/modals-empresa/CrearEmpresa";
import EmpresasHistorial from "../components/modals-empresa/EmpresasHistorial";
import EmpresasInventarioIA from "../components/modals-empresa/EmpresasInventarioIA";

import { useAuth } from "../components/hooks/useAuth";
import { http } from "../service/http";

/* ====================== Tipos de página ====================== */
interface Empresa extends EmpresaLite {
  estadisticas: EstadisticasEmpresa;
}

type EmpresaDashboardData = {
  empresa: { id_empresa: number; nombre: string };
  periodo: { mes: string; ano: string; desde: string; hasta: string };
  kpis: {
    totalSolicitantes: number;
    totalSolicitantesActivos?: number;
    totalEquipos: number;
    visitasMes: number;
    visitasPresencialesMes: number;
    diasConVisitasMes: number;
    mantencionesRemotasMes: number;
    minutosVisitas?: number;
    minutosRemotos?: number;
    totalMinutosSoporte: number;
    horasSoporte: number;
    // Con tickets incluidos
    minutosTickets?: number;
    totalMinutosSoporteConTickets?: number;
    horasSoporteConTickets?: number;
    ticketsMes?: number;
    ticketsMesResueltos?: number;
    ticketsMesAbiertos?: number;
    // KPIs mes anterior para comparación DeltaBadge
    visitasMesAnterior?: number;
    horasSoporteMesAnterior?: number;
    horasSoporteAntConTickets?: number;
  };
  charts: {
    equiposPorMarca: Array<{ marca: string; total: number }>;
    solicitantesConMasEquipos: Array<{ solicitante: string; total: number }>;
    visitasPorTecnico: Array<{ tecnico: string; total: number }>;
    visitasPorDia: Array<{ dia: string; total: number }>;
    horasSoporte: Array<{ tipo: string; minutos: number; horas: number }>;
    // Tendencia de últimos 6 meses — ahora incluye tickets
    tendencia6Meses?: Array<{ label: string; visitas: number; remotas: number; tickets: number; minutos: number }>;
  };
  ultimosEquipos: Array<{
    id_equipo: number;
    serial: string | null;
    marca: string | null;
    modelo: string | null;
    solicitante: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

/* ====================== Type guards ====================== */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function asStringArrayOr(v: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(v)) return fallback;
  return v.filter((i): i is string => typeof i === "string").map((i) => i.trim().toLowerCase()).filter(Boolean);
}
function isString(v: unknown): v is string { return typeof v === "string"; }
function isNumber(v: unknown): v is number { return typeof v === "number" && Number.isFinite(v); }
function isNullableString(v: unknown): v is string | null { return v === null || typeof v === "string"; }
function asNumberOr(v: unknown, fallback: number): number { return isNumber(v) ? v : fallback; }
function asStringOr(v: unknown, fallback: string): string { return isString(v) ? v : fallback; }
function asNullableStringOr(v: unknown, fallback: string | null): string | null { return isNullableString(v) ? v : fallback; }

function normalizeEstadisticas(input: unknown): EstadisticasEmpresa {
  const s = isRecord(input) ? input : {};
  return {
    totalTickets: asNumberOr(s.totalTickets, 0),
    totalSolicitantes: asNumberOr(s.totalSolicitantes, 0),
    totalEquipos: asNumberOr(s.totalEquipos, 0),
    totalVisitas: asNumberOr(s.totalVisitas, 0),
    totalTrabajos: asNumberOr(s.totalTrabajos, 0),
    visitasPendientes: asNumberOr(s.visitasPendientes, 0),
    trabajosPendientes: asNumberOr(s.trabajosPendientes, 0),
  };
}

function normalizeDetalleEmpresa(input: unknown): DetalleEmpresa | undefined {
  if (!isRecord(input)) return undefined;
  const id = asNumberOr(input.id, NaN);
  if (!Number.isFinite(id)) return undefined;
  return {
    id,
    rut: asNullableStringOr(input.rut, null),
    direccion: asNullableStringOr(input.direccion, null),
    direcciones: Array.isArray(input.direcciones) ? (input.direcciones as any) : null,
    telefono: asNullableStringOr(input.telefono, null),
    email: asNullableStringOr(input.email, null),
    sitioWeb: asNullableStringOr(input.sitioWeb, null),
    industria: asNullableStringOr(input.industria, null),
  };
}

function normalizeEmpresa(input: unknown): Empresa {
  const e = isRecord(input) ? input : {};
  const id = asNumberOr(e.id_empresa, NaN);
  const dominios = asStringArrayOr(e.dominios, []);
  return {
    id_empresa: Number.isFinite(id) ? id : -1,
    nombre: asStringOr(e.nombre, ""),
    tieneSucursales: Boolean(e.tieneSucursales),
    dominios,
    dominioPrincipal: asNullableStringOr(e.dominioPrincipal, dominios[0] ?? null),
    detalleEmpresa: normalizeDetalleEmpresa(e.detalleEmpresa),
    estadisticas: normalizeEstadisticas(e.estadisticas),
  };
}

function normalizeEmpresas(arr: unknown): Empresa[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(normalizeEmpresa);
}

/* ====================== Helpers UI ====================== */
function formatNumber(n?: number | null) {
  if (typeof n !== "number") return "—";
  try { return n.toLocaleString("es-CL"); } catch { return String(n); }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return iso; }
}

/** Calcula delta % entre valor actual y anterior */
function calcDelta(curr: number, prev: number): { pct: number; up: boolean; neutral: boolean } {
  if (!prev) return { pct: 0, up: true, neutral: true };
  const pct = Math.round(((curr - prev) / prev) * 100);
  return { pct: Math.abs(pct), up: pct >= 0, neutral: pct === 0 };
}

/* ====================== Paleta ====================== */
const DARK_PALETTE = [
  "#1e40af", "#dc2626", "#059669", "#7c3aed", "#ea580c",
  "#0891b2", "#b45309", "#be185d", "#4338ca", "#0f766e",
  "#831843", "#78350f", "#374151", "#86198f", "#064e3b",
];

const SOPORTE_COLORS = {
  visitas: {
    dot: "bg-blue-500",
    text: "text-blue-700",
    bar: "bg-blue-500",
    barSoft: "bg-blue-400",
  },
  remotas: {
    dot: "bg-sky-500",
    text: "text-sky-700",
    bar: "bg-sky-500",
    barSoft: "bg-sky-400",
  },
  tickets: {
    dot: "bg-slate-500",
    text: "text-slate-700",
    bar: "bg-slate-500",
    barSoft: "bg-slate-400",
  },
  total: {
    text: "text-slate-900",
    border: "border-slate-200",
    headerIcon: "text-blue-600",
  },
};

/* ====================== Skeleton ====================== */
const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 288 }) => (
  <div className="w-full animate-pulse rounded-lg bg-slate-100" style={{ height }} />
);

const ChartEmpty: React.FC<{ message?: string }> = ({ message = "Sin datos para este período" }) => (
  <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
    <PieChartOutlined className="text-3xl" />
    <span className="text-sm">{message}</span>
  </div>
);

/* ====================== Tooltips ====================== */
type TooltipValue = string | number | readonly (string | number)[];
type TooltipItem = { name?: string | number; value?: TooltipValue; color?: string; payload?: unknown };
interface CustomTooltipProps { active?: boolean; payload?: readonly TooltipItem[]; label?: string | number }

function formatTooltipValue(value: TooltipValue | undefined) {
  if (Array.isArray(value)) return value.join(" - ");
  return value ?? 0;
}

const CustomBarTooltip = ({ active, label, payload }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  const fullName =
    (item?.payload as any)?.fullName ??
    (item?.payload as any)?.solicitante ??
    (item?.payload as any)?.tecnico ??
    (item?.payload as any)?.marca ??
    (item?.payload as any)?.tipo ??
    label;
  return (
    <div className="rounded-xl border border-gray-200 bg-white/98 shadow-lg p-3 max-w-xs">
      <div className="text-sm font-semibold text-gray-900 mb-1">{fullName}</div>
      <div className="text-sm text-gray-600">
        Cantidad: <span className="font-bold text-gray-900">{formatTooltipValue(item?.value)}</span>
      </div>
    </div>
  );
};

/* ====================== DonutChart ====================== */
interface DonutChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  loading?: boolean;
}

const DonutChart: React.FC<DonutChartProps> = ({ data, loading }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const [hovered, setHovered] = useState<number | null>(null);
  if (loading) return <ChartSkeleton height={180} />;
  if (!data.length || total === 0) return <div className="h-44"><ChartEmpty /></div>;
  const cx = 60; const cy = 60; const r = 48; const circumference = 2 * Math.PI * r;
  let cumulative = 0;
  const slices = data.map((d, i) => {
    const pct = d.value / total;
    const offset = circumference * (1 - cumulative);
    const dash = circumference * pct;
    cumulative += pct;
    return { ...d, pct, dash, offset, i };
  });
  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          {slices.map((s) => (
            <circle key={s.i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color}
              strokeWidth={hovered === s.i ? 14 : 11}
              strokeDasharray={`${s.dash} ${circumference - s.dash}`}
              strokeDashoffset={s.offset} strokeLinecap="butt"
              style={{ transition: "stroke-width 0.2s", cursor: "pointer", transform: "rotate(-90deg)", transformOrigin: "60px 60px" }}
              onMouseEnter={() => setHovered(s.i)} onMouseLeave={() => setHovered(null)}
            />
          ))}
          <text x={cx} y={cy - 6} textAnchor="middle" fontSize="10" fill="#6b7280" fontFamily="inherit">Total</text>
          <text x={cx} y={cy + 10} textAnchor="middle" fontSize="16" fontWeight="600" fill="#1e293b" fontFamily="inherit">
            {hovered !== null ? data[hovered].value : total}
          </text>
        </svg>
      </div>
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        {slices.map((s) => (
          <div key={s.i} className="flex items-center gap-2 cursor-pointer rounded-md px-1 py-0.5 transition-colors"
            style={{ background: hovered === s.i ? `${s.color}15` : "transparent" }}
            onMouseEnter={() => setHovered(s.i)} onMouseLeave={() => setHovered(null)}>
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-xs text-slate-600 flex-1 truncate">{s.name}</span>
            <span className="text-xs font-semibold text-slate-800 shrink-0">{Math.round(s.pct * 100)}%</span>
            <span className="text-xs text-slate-400 shrink-0 w-6 text-right">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ====================== HBarChart ====================== */
interface HBarChartProps {
  data: Array<{ name: string; value: number; fullName?: string }>;
  color?: string;
  loading?: boolean;
  maxBars?: number;
}

const HBarChart: React.FC<HBarChartProps> = ({ data, color = "#1e40af", loading, maxBars = 8 }) => {
  const [hovered, setHovered] = useState<number | null>(null);
  if (loading) return <ChartSkeleton height={Math.min(maxBars, 8) * 44} />;
  const items = data.slice(0, maxBars);
  if (!items.length) return <div className="h-44"><ChartEmpty /></div>;
  const maxVal = Math.max(...items.map((d) => d.value), 1);
  return (
    <div className="flex flex-col gap-1">
      {items.map((item, i) => {
        const pct = (item.value / maxVal) * 100;
        const isHov = hovered === i;
        return (
          <div key={i} className="flex items-center gap-3 group"
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <div className="text-xs text-slate-500 text-right shrink-0 truncate" style={{ width: 110 }} title={item.fullName ?? item.name}>
              {item.name}
            </div>
            <div className="flex-1 h-7 bg-slate-100 rounded-md overflow-hidden relative">
              <div className="h-full rounded-md transition-all duration-300"
                style={{ width: `${pct}%`, background: color, opacity: isHov ? 1 : 0.75 }} />
              {isHov && (
                <div className="absolute inset-0 flex items-center px-2">
                  <span className="text-xs font-semibold text-white drop-shadow">{item.fullName ?? item.name}</span>
                </div>
              )}
            </div>
            <div className="text-xs font-semibold text-slate-700 shrink-0 text-right" style={{ width: 32 }}>
              {formatNumber(item.value)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ====================== UnifiedRankingChart ====================== */
type MetricKey = "equipos" | "solicitantes";

interface UnifiedRankingChartProps {
  equiposData: Array<{ name: string; equipos: number; solicitantes: number; fullName: string }>;
  loading?: boolean;
}

const UnifiedRankingChart: React.FC<UnifiedRankingChartProps> = ({ equiposData, loading }) => {
  const [metric, setMetric] = useState<MetricKey>("equipos");
  const mapped = useMemo(() =>
    equiposData.map((d) => ({ name: d.name, value: metric === "equipos" ? d.equipos : d.solicitantes, fullName: d.fullName })),
    [equiposData, metric]
  );
  const colors: Record<MetricKey, string> = { equipos: "#1e40af", solicitantes: "#059669" };
  return (
    <div>
      <div className="flex gap-1 mb-4">
        {(["equipos", "solicitantes"] as MetricKey[]).map((m) => (
          <button key={m} type="button" onClick={() => setMetric(m)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${metric === m ? "text-white shadow-sm" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
            style={metric === m ? { background: colors[m] } : {}}>
            {m === "equipos" ? "Equipos" : "Solicitantes"}
          </button>
        ))}
      </div>
      <HBarChart data={mapped} color={colors[metric]} loading={loading} maxBars={8} />
    </div>
  );
};

/* ====================== Sparkline ====================== */
const Sparkline: React.FC<{ values: number[]; color?: string; height?: number }> = ({ values, color = "#1e40af", height = 28 }) => {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {values.map((v, i) => (
        <div key={i} className="flex-1 rounded-t-sm"
          style={{ height: `${Math.round((v / max) * 100)}%`, background: color, opacity: i === values.length - 1 ? 1 : 0.4 + (i / values.length) * 0.4, minHeight: 2 }} />
      ))}
    </div>
  );
};

/* ====================== DeltaBadge — comparación vs mes anterior ====================== */
const DeltaBadge: React.FC<{ curr: number; prev?: number; unit?: string }> = ({ curr, prev, unit = "" }) => {
  if (prev === undefined || prev === null) return null;
  const { pct, up, neutral } = calcDelta(curr, prev);
  if (neutral) return (
    <span className="inline-flex items-center gap-0.5 text-xs text-slate-400">
      <MinusOutlined className="text-[10px]" /> igual que mes anterior
    </span>
  );
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-emerald-600" : "text-rose-500"}`}>
      {up ? <ArrowUpOutlined className="text-[10px]" /> : <ArrowDownOutlined className="text-[10px]" />}
      {pct}% vs mes anterior
    </span>
  );
};

/* ====================== SaludBadge ====================== */
const SaludBadge: React.FC<{ nivel: "ok" | "warn" | "alert" }> = ({ nivel }) => {
  const cfg = {
    ok: { label: "OK", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircleOutlined /> },
    warn: { label: "Atención", cls: "bg-amber-50 text-amber-700 border-amber-200", icon: <ClockCircleOutlined /> },
    alert: { label: "Alerta", cls: "bg-rose-50 text-rose-700 border-rose-200", icon: <WarningOutlined /> },
  }[nivel];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.cls}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

/* ====================== Tipos soporte mensual ====================== */
type SoporteMensualRow = {
  empresaId: number;
  empresa: string;

  visitas?: number;
  remotas?: number;
  tickets?: number;

  minutosVisitas: number;
  minutosRemotos: number;
  minutosTickets: number;
  totalMinutos: number;

  horasVisitas?: number;
  horasRemotas?: number;
  horasTickets?: number;
  totalHoras?: number;

  visitasPresenciales?: number;
  sesionesRemotas?: number;
  ticketsTotal?: number;
  ticketsResueltos: number;
  ticketsAbiertos: number;
  diasConVisitas?: number;
};

/* ====================== TablaSoporteEmpresas ====================== */
interface TablaSoporteProps {
  empresas: Empresa[];
  onVerDetalle: (e: Empresa) => void;
  onVerFicha: (e: Empresa) => void;
}

function fmtHoras(minutos: number): string {
  if (!minutos) return "—";
  const h = Math.floor(minutos / 60);
  const m = Math.round(minutos % 60);
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const MESES_LABELS = [
  ["01", "Enero"], ["02", "Febrero"], ["03", "Marzo"], ["04", "Abril"],
  ["05", "Mayo"], ["06", "Junio"], ["07", "Julio"], ["08", "Agosto"],
  ["09", "Septiembre"], ["10", "Octubre"], ["11", "Noviembre"], ["12", "Diciembre"],
];

const TablaSoporteEmpresas: React.FC<TablaSoporteProps> = ({ empresas, onVerDetalle, onVerFicha }) => {
  const now = new Date();
  const [mes, setMes] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [ano, setAno] = useState(String(now.getFullYear()));
  const [soporte, setSoporte] = useState<SoporteMensualRow[]>([]);
  const [loadingSoporte, setLoadingSoporte] = useState(false);
  const [sortBy, setSortBy] = useState<"nombre" | "total" | "visitas" | "remotas" | "tickets">("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    let cancelled = false;

    const fetchSoporte = async () => {
      try {
        setLoadingSoporte(true);
        setSoporte([]);

        const { data } = await http.get("/empresas/soporte-mensual", {
          params: { mes, ano },
        });

        if (cancelled) return;

        const items = Array.isArray(data?.data) ? data.data : [];

        const mapped: SoporteMensualRow[] = items.map((item: any) => ({
          empresaId: Number(item.empresaId),
          empresa: String(item.empresa ?? ""),

          minutosVisitas: Number(item.minutosVisitas ?? 0),
          minutosRemotos: Number(item.minutosRemotos ?? 0),
          minutosTickets: Number(item.minutosTickets ?? 0),
          totalMinutos: Number(item.totalMinutos ?? 0),

          horasVisitas: Number(item.horasVisitas ?? 0),
          horasRemotas: Number(item.horasRemotas ?? 0),
          horasTickets: Number(item.horasTickets ?? 0),
          totalHoras: Number(item.totalHoras ?? 0),

          visitasPresenciales: Number(item.visitasPresenciales ?? item.visitas ?? 0),
          sesionesRemotas: Number(item.sesionesRemotas ?? item.remotas ?? 0),
          ticketsTotal: Number(item.ticketsTotal ?? item.tickets ?? 0),
          ticketsResueltos: Number(item.ticketsResueltos ?? 0),
          ticketsAbiertos: Number(item.ticketsAbiertos ?? 0),
          diasConVisitas: Number(item.diasConVisitas ?? 0),
        }));

        setSoporte(mapped);
      } catch (err) {
        console.error("Error cargando soporte mensual por empresa:", err);
        if (!cancelled) setSoporte([]);
      } finally {
        if (!cancelled) setLoadingSoporte(false);
      }
    };

    void fetchSoporte();

    return () => {
      cancelled = true;
    };
  }, [mes, ano]);

  // Merge soporte con lista base (para mostrar todas las empresas aunque no tengan actividad)
  const rows = useMemo(() => {
    const soporteMap = new Map(soporte.map((s) => [s.empresaId, s]));
    return empresas.map((e) => {
      const s = soporteMap.get(e.id_empresa);
      return {
        empresaId: e.id_empresa,
        empresa: e.nombre,
        solicitantes: e.estadisticas.totalSolicitantes,
        equipos: e.estadisticas.totalEquipos,
        minutosVisitas: s?.minutosVisitas ?? 0,
        minutosRemotos: s?.minutosRemotos ?? 0,
        minutosTickets: s?.minutosTickets ?? 0,
        totalMinutos: s?.totalMinutos ?? 0,
        visitasPresenciales: s?.visitasPresenciales ?? s?.visitas ?? 0,
        sesionesRemotas: s?.sesionesRemotas ?? s?.remotas ?? 0,
        ticketsTotal: s?.ticketsTotal ?? s?.tickets ?? 0,
        ticketsResueltos: s?.ticketsResueltos ?? 0,
        ticketsAbiertos: s?.ticketsAbiertos ?? 0,
        diasConVisitas: s?.diasConVisitas ?? 0,
        onVerDetalle: () => onVerDetalle(e),
        onVerFicha: () => onVerFicha(e),
      };
    });
  }, [empresas, soporte, onVerDetalle, onVerFicha]);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (sortBy === "nombre") {
        const cmp = a.empresa.localeCompare(b.empresa);
        return sortDir === "asc" ? cmp : -cmp;
      }
      const va =
        sortBy === "visitas" ? a.minutosVisitas :
          sortBy === "remotas" ? a.minutosRemotos :
            sortBy === "tickets" ? a.minutosTickets :
              a.totalMinutos;
      const vb =
        sortBy === "visitas" ? b.minutosVisitas :
          sortBy === "remotas" ? b.minutosRemotos :
            sortBy === "tickets" ? b.minutosTickets :
              b.totalMinutos;
      return sortDir === "asc" ? va - vb : vb - va;
    });
  }, [rows, sortBy, sortDir]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  };

  const maxMinutos = useMemo(() => Math.max(...rows.map((r) => r.totalMinutos), 1), [rows]);
  const totalVisitas = useMemo(() => rows.reduce((a, r) => a + r.minutosVisitas, 0), [rows]);
  const totalRemotos = useMemo(() => rows.reduce((a, r) => a + r.minutosRemotos, 0), [rows]);
  const totalTickets = useMemo(() => rows.reduce((a, r) => a + r.minutosTickets, 0), [rows]);
  const totalMinutos = useMemo(() => rows.reduce((a, r) => a + r.totalMinutos, 0), [rows]);
  const totalTkCount = useMemo(() => rows.reduce((a, r) => a + r.ticketsTotal, 0), [rows]);

  const mesLabel = MESES_LABELS.find(([v]) => v === mes)?.[1] ?? mes;

  const ThBtn: React.FC<{ col: typeof sortBy; children: React.ReactNode }> = ({ col, children }) => (
    <button type="button" onClick={() => toggleSort(col)}
      className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition ${sortBy === col ? "text-slate-800" : "text-slate-400 hover:text-slate-600"
        }`}>
      {children}
      {sortBy === col && <span className="text-[10px]">{sortDir === "asc" ? "↑" : "↓"}</span>}
    </button>
  );

  return (
    <>
      {/* ── Controles de mes/año + totales ── */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50/50">
        <select value={mes} onChange={(e) => setMes(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400/40">
          {MESES_LABELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input value={ano} onChange={(e) => setAno(e.target.value)}
          className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
          placeholder="Año" maxLength={4} />
        {loadingSoporte && (
          <span className="text-xs text-slate-400 inline-flex items-center gap-1.5">
            <LoadingOutlined className="text-[10px]" />
            Cargando soporte mensual…
          </span>
        )}
        {!loadingSoporte && totalMinutos > 0 && (
          <div className="ml-auto flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span>
              Visitas: <span className={`font-semibold ${SOPORTE_COLORS.visitas.text}`}>{fmtHoras(totalVisitas)}</span>
            </span>

            <span>
              Remotas: <span className={`font-semibold ${SOPORTE_COLORS.remotas.text}`}>{fmtHoras(totalRemotos)}</span>
            </span>

            <span>
              Tickets: <span className={`font-semibold ${SOPORTE_COLORS.tickets.text}`}>{fmtHoras(totalTickets)}</span>
              <span className="ml-1 text-slate-400">({totalTkCount} tickets)</span>
            </span>
          </div>
        )}
      </div>

      {/* ── Nota metodológica sobre tickets ── */}
      <div className="px-5 py-2 bg-slate-50 border-b border-slate-100 text-[11px] text-slate-500">
        ⓘ Las horas de tickets se calculan desde la creación hasta la resolución o cierre, con un tope de 8h por ticket.
      </div>

      {/* ── Tabla ── */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 text-left"><ThBtn col="nombre">Empresa</ThBtn></th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Usuarios</th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">Equipos</th>
              {/* Las tres fuentes de horas */}
              <th className="px-4 py-3 text-right border-l border-slate-100">
                <ThBtn col="visitas">
                  <span className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${SOPORTE_COLORS.visitas.dot} inline-block`} />
                    Visitas
                  </span>
                </ThBtn>
              </th>
              <th className="px-4 py-3 text-right">
                <ThBtn col="remotas">
                  <span className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${SOPORTE_COLORS.remotas.dot} inline-block`} />
                    Remotas
                  </span>
                </ThBtn>
              </th>
              <th className="px-4 py-3 text-right">
                <ThBtn col="tickets">
                  <span className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${SOPORTE_COLORS.tickets.dot} inline-block`} />
                    Tickets
                  </span>
                </ThBtn>
              </th>
              <th className="px-4 py-3 text-right border-l border-slate-100">
                <ThBtn col="total">Total</ThBtn>
              </th>
              <th className="px-4 py-3 text-left w-40">Distribución</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const hasActivity = row.totalMinutos > 0;
              const barPct = Math.round((row.totalMinutos / maxMinutos) * 100);

              // Proporciones para la barra de desglose (nunca NaN)
              const visitasPct = hasActivity ? Math.round((row.minutosVisitas / row.totalMinutos) * 100) : 0;
              const remotosPct = hasActivity ? Math.round((row.minutosRemotos / row.totalMinutos) * 100) : 0;
              const ticketsPct = hasActivity ? Math.max(0, 100 - visitasPct - remotosPct) : 0;

              return (
                <tr key={row.empresaId} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{row.empresa}</div>
                    {hasActivity && (
                      <div className="text-[10px] text-slate-400 mt-0.5 flex flex-wrap gap-x-2">
                        {row.visitasPresenciales > 0 && (
                          <span>{row.visitasPresenciales} visita{row.visitasPresenciales !== 1 ? "s" : ""} · {row.diasConVisitas} día{row.diasConVisitas !== 1 ? "s" : ""}</span>
                        )}
                        {row.sesionesRemotas > 0 && (
                          <span>{row.sesionesRemotas} remota{row.sesionesRemotas !== 1 ? "s" : ""}</span>
                        )}
                        {row.ticketsTotal > 0 && (
                          <span>
                            {row.ticketsTotal} ticket{row.ticketsTotal !== 1 ? "s" : ""}
                            {row.ticketsAbiertos > 0 && (
                              <span className="text-amber-500 ml-0.5">({row.ticketsAbiertos} abierto{row.ticketsAbiertos !== 1 ? "s" : ""})</span>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-500 text-xs">
                    {formatNumber(row.solicitantes)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-500 text-xs">
                    {formatNumber(row.equipos)}
                  </td>
                  {/* Visitas */}
                  <td className="px-4 py-3 text-right tabular-nums border-l border-slate-100">
                    {row.minutosVisitas > 0
                      ? <span className={`font-medium ${SOPORTE_COLORS.visitas.text}`}>{fmtHoras(row.minutosVisitas)}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  {/* Remotas */}
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.minutosRemotos > 0
                      ? <span className={`font-medium ${SOPORTE_COLORS.remotas.text}`}>{fmtHoras(row.minutosRemotos)}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  {/* Tickets */}
                  <td className="px-4 py-3 text-right tabular-nums">
                    {row.minutosTickets > 0 ? (
                      <div className="flex flex-col items-end">
                        <span className={`font-medium ${SOPORTE_COLORS.tickets.text}`}>{fmtHoras(row.minutosTickets)}</span>
                        <span className="text-[10px] text-slate-400">{row.ticketsTotal} tk</span>
                      </div>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  {/* Total */}
                  <td className="px-4 py-3 text-right tabular-nums border-l border-slate-100">
                    {hasActivity
                      ? <span className="font-bold text-slate-800">{fmtHoras(row.totalMinutos)}</span>
                      : <span className="text-slate-300">—</span>}
                  </td>
                  {/* Barra de distribución por fuente */}
                  <td className="px-4 py-3">
                    {hasActivity ? (
                      <div className="flex flex-col gap-1">
                        {/* Barra total relativa al máximo */}
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-blue-500"
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                        {/* Barra de desglose proporcional por fuente */}
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden flex">
                          {visitasPct > 0 && (
                            <div className={`h-full ${SOPORTE_COLORS.visitas.barSoft}`} style={{ width: `${visitasPct}%` }} />
                          )}
                          {remotosPct > 0 && (
                            <div className={`h-full ${SOPORTE_COLORS.remotas.barSoft}`} style={{ width: `${remotosPct}%` }} />
                          )}
                          {ticketsPct > 0 && (
                            <div className={`h-full ${SOPORTE_COLORS.tickets.barSoft} rounded-r-full`} style={{ width: `${ticketsPct}%` }} />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-2 bg-slate-100 rounded-full" />
                    )}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-slate-400">Sin empresas</td>
              </tr>
            )}
          </tbody>
          {sorted.length > 1 && (
            <tfoot className="border-t-2 border-slate-200 bg-slate-50">
              <tr>
                <td className="px-4 py-3 font-semibold text-slate-700">Total {mesLabel} {ano}</td>
                <td className="px-4 py-3" /><td className="px-4 py-3" />
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-cyan-700 border-l border-slate-200">
                  {fmtHoras(totalVisitas)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-violet-600">
                  {fmtHoras(totalRemotos)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-indigo-600">
                  {fmtHoras(totalTickets)}
                  {totalTkCount > 0 && (
                    <div className="text-[10px] font-normal text-slate-400">{totalTkCount} tickets</div>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-bold text-slate-800 border-l border-slate-200">
                  {fmtHoras(totalMinutos)}
                </td>
                <td className="px-4 py-3" /><td className="px-4 py-3" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  );
};

/* ====================== UltimosEquipos — nuevo componente cliente ====================== */
const UltimosEquipos: React.FC<{
  equipos: EmpresaDashboardData["ultimosEquipos"];
  loading?: boolean;
}> = ({ equipos, loading }) => {
  if (loading) return <ChartSkeleton height={160} />;
  if (!equipos?.length) return <div className="h-28"><ChartEmpty message="Sin equipos recientes" /></div>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-500 text-xs">
            <th className="px-3 py-2 text-left font-medium">Equipo</th>
            <th className="px-3 py-2 text-left font-medium">Asignado a</th>
            <th className="px-3 py-2 text-left font-medium">Registrado</th>
          </tr>
        </thead>
        <tbody>
          {equipos.slice(0, 6).map((eq) => (
            <tr key={eq.id_equipo} className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors">
              <td className="px-3 py-2">
                <div className="font-medium text-slate-700">{[eq.marca, eq.modelo].filter(Boolean).join(" ") || "Sin nombre"}</div>
                {eq.serial && <div className="text-xs text-slate-400">S/N: {eq.serial}</div>}
              </td>
              <td className="px-3 py-2 text-slate-600">{eq.solicitante ?? <span className="text-slate-300">Sin asignar</span>}</td>
              <td className="px-3 py-2 text-xs text-slate-400">{formatDate(eq.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ====================== TendenciaChart — nuevo componente cliente ====================== */
const TendenciaChart: React.FC<{
  data?: EmpresaDashboardData["charts"]["tendencia6Meses"];
  loading?: boolean;
}> = ({ data, loading }) => {
  if (loading) return <ChartSkeleton height={180} />;
  if (!data?.length) return <div className="h-44"><ChartEmpty message="Sin historial de tendencia" /></div>;

  const formatLabel = (label: ReactNode): ReactNode => {
    if (typeof label !== "string") return label;

    try {
      const [y, m] = label.split("-");
      const d = new Date(Number(y), Number(m) - 1, 1);

      if (Number.isNaN(d.getTime())) return label;

      return d.toLocaleDateString("es-CL", {
        month: "short",
        year: "2-digit",
      });
    } catch {
      return label;
    }
  };

  const formatTooltipValue = (
    value: ValueType | undefined,
    name: NameType | undefined
  ): [ReactNode, ReactNode] => {
    const numericValue =
      typeof value === "number"
        ? value
        : Array.isArray(value)
          ? Number(value[0])
          : Number(value ?? 0);

    const key = String(name ?? "");

    const labels: Record<string, string> = {
      visitas: "Visitas presenciales",
      remotas: "Remotas",
      tickets: "Tickets RIDS",
      minutos: "Minutos soporte",
    };

    const formattedValue = Number.isFinite(numericValue)
      ? numericValue.toLocaleString("es-CL")
      : "0";

    return [
      formattedValue,
      labels[key] ?? key,
    ];
  };

  const formatLegend = (value: string): string => {
    const labels: Record<string, string> = {
      visitas: "Visitas",
      remotas: "Remotas",
      tickets: "Tickets",
      minutos: "Min. soporte",
    };

    return labels[value] ?? value;
  };

  const hasTickets = data.some((d) => (d.tickets ?? 0) > 0);

  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />

          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => String(formatLabel(value))}
          />

          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip
            contentStyle={{
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              fontSize: 12,
            }}
            labelFormatter={formatLabel}
            formatter={formatTooltipValue}
          />

          <Legend
            wrapperStyle={{ fontSize: 11 }}
            formatter={(value) => formatLegend(String(value))}
          />

          <Line
            type="monotone"
            dataKey="visitas"
            stroke="#0891b2"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />

          <Line
            type="monotone"
            dataKey="remotas"
            stroke="#7c3aed"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />

          {hasTickets && (
            <Line
              type="monotone"
              dataKey="tickets"
              stroke="#6366f1"
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

/* ====================== Tipos de página ====================== */
type StatBase = {
  name: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  change: React.ReactNode;
  delta?: React.ReactNode;
  sparkValues?: number[];
  sparkColor?: string;
  deltaStr?: string;
  deltaUp?: boolean;
};
type RefreshableStat = StatBase & { onRefresh: () => void };
type Stat = StatBase | RefreshableStat;
type EmpresaTab = "overview" | "companies" | "historial" | "inventarioIA";

function isRefreshableStat(s: Stat): s is RefreshableStat {
  return "onRefresh" in s && typeof (s as RefreshableStat).onRefresh === "function";
}

/* ====================== Página principal ====================== */
const EmpresasPage: React.FC = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const { isCliente } = useAuth();
  const canEditEmpresa = !isCliente;
  const [activeTab, setActiveTab] = useState<EmpresaTab>("overview");

  useEffect(() => { if (isCliente) setActiveTab("overview"); }, [isCliente]);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [empresaSel, setEmpresaSel] = useState<EmpresaLite | null>(null);
  const [solicitantesSel, setSolicitantesSel] = useState<SolicitanteLite[]>([]);
  const [equiposSel, setEquiposSel] = useState<EquipoLite[]>([]);
  const [visitasSel, setVisitasSel] = useState<Visita[]>([]);
  const [contactosSel, setContactosSel] = useState<any[]>([]);

  const nowDashboard = new Date();
  const [mesDashboard, setMesDashboard] = useState(String(nowDashboard.getMonth() + 1).padStart(2, "0"));
  const [anoDashboard, setAnoDashboard] = useState(String(nowDashboard.getFullYear()));
  const [empresaDashboard, setEmpresaDashboard] = useState<EmpresaDashboardData | null>(null);
  const [empresaDashboardLoading, setEmpresaDashboardLoading] = useState(false);
  const [empresaDashboardError, setEmpresaDashboardError] = useState<string | null>(null);

  const [fichaOpen, setFichaOpen] = useState(false);
  const [fichaLoading, setFichaLoading] = useState(false);
  const [fichaError, setFichaError] = useState<string | null>(null);
  const [fichaData, setFichaData] = useState<FichaEmpresaCompleta | null>(null);
  const [createEmpresaOpen, setCreateEmpresaOpen] = useState(false);

  /* ===================== FETCH EMPRESAS ===================== */
  const fetchEmpresas = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true); else setLoading(true);
      setError(null);
      const { data: raw } = await http.get("/empresas", { params: { withStats: 1 } });
      let items: unknown = [];
      if (isRecord(raw)) {
        if (Array.isArray(raw.data)) items = raw.data;
        else if (Array.isArray(raw.items)) items = raw.items;
      }
      setEmpresas(normalizeEmpresas(items));
    } catch (err) {
      setError((err as Error)?.message || "Error al cargar datos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchEmpresas(); }, []);

  /* ===================== FETCH SOLICITANTES PAGINADOS ===================== */
  const fetchAllSolicitantesByEmpresa = async (empresaId: number): Promise<SolicitanteLite[]> => {
    const pageSize = 100; let page = 1; let all: SolicitanteLite[] = []; let totalPages = 1;
    do {
      const { data: json } = await http.get("/solicitantes", { params: { empresaId, page, pageSize } });
      if (Array.isArray(json.items)) all = all.concat(json.items);
      totalPages = json.totalPages ?? 1; page++;
    } while (page <= totalPages);
    return all;
  };

  /* ===================== FETCH DASHBOARD CLIENTE ===================== */
  async function fetchEmpresaClienteDashboard(signal?: AbortSignal) {
    try {
      setEmpresaDashboardLoading(true);
      setEmpresaDashboardError(null);
      const empresaCliente = empresas[0];
      if (!empresaCliente?.id_empresa) { setEmpresaDashboard(null); return; }
      const { data } = await http.get(`/empresas/${empresaCliente.id_empresa}/dashboard`, {
        params: { mes: mesDashboard, ano: anoDashboard },
        signal,
      });
      setEmpresaDashboard(data?.data ?? null);
    } catch (err: any) {
      if (err?.name === "AbortError" || err?.code === "ERR_CANCELED") return;
      setEmpresaDashboardError(err?.response?.data?.message || err?.message || "No se pudo cargar el dashboard mensual.");
      setEmpresaDashboard(null);
    } finally {
      setEmpresaDashboardLoading(false);
    }
  }

  useEffect(() => {
    if (!isCliente || !empresas.length) return;
    const c = new AbortController();
    fetchEmpresaClienteDashboard(c.signal);
    return () => c.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCliente, empresas, mesDashboard, anoDashboard]);

  /* ===================== FETCH VISITAS PAGINADAS ===================== */
  const fetchAllVisitasByEmpresa = async (empresaId: number): Promise<Visita[]> => {
    const pageSize = 100; let page = 1; let totalPages = 1; let all: Visita[] = [];
    do {
      const { data: json } = await http.get("/visitas", { params: { empresaId, page, pageSize } });
      if (Array.isArray(json.items)) all = all.concat(json.items);
      totalPages = json.totalPages ?? 1; page++;
    } while (page <= totalPages);
    return all;
  };

  /* ===================== OPEN DETAILS ===================== */
  const openDetails = async (empresa: Empresa) => {
    setEmpresaSel({ id_empresa: empresa.id_empresa, nombre: empresa.nombre, detalleEmpresa: empresa.detalleEmpresa });
    setSolicitantesSel([]); setEquiposSel([]); setVisitasSel([]); setContactosSel([]);
    setDetailsError(null); setDetailsLoading(true); setDetailsOpen(true);
    try {
      const solicitantes = await fetchAllSolicitantesByEmpresa(empresa.id_empresa);
      setSolicitantesSel(solicitantes);
      const { data: fichaCompleta } = await http.get(`/ficha-empresa/${empresa.id_empresa}/completa`);
      setContactosSel(Array.isArray(fichaCompleta?.contactos) ? fichaCompleta.contactos : []);
      const { data: eqJson } = await http.get(`/empresas/${empresa.id_empresa}/equipos`);
      if (Array.isArray(eqJson?.items)) setEquiposSel(eqJson.items);
      const visitas = await fetchAllVisitasByEmpresa(empresa.id_empresa);
      setVisitasSel(visitas);
    } catch { setDetailsError("No se pudo cargar el detalle de la empresa."); }
    finally { setDetailsLoading(false); }
  };

  /* ===================== FICHA ===================== */
  const refreshEmpresaCompleta = async (empresaId: number) => {
    try {
      const { data } = await http.get(`/ficha-empresa/${empresaId}/completa`);
      setFichaData({ ...data });
      setEmpresaSel(() => ({ ...data.empresa, detalleEmpresa: normalizeDetalleEmpresa(data.empresa.detalleEmpresa) }));
      setEmpresas((prev) =>
        prev.map((e) => e.id_empresa === data.empresa.id_empresa
          ? { ...e, nombre: data.empresa.nombre, dominios: Array.isArray(data.empresa.dominios) ? data.empresa.dominios : [], dominioPrincipal: Array.isArray(data.empresa.dominios) ? data.empresa.dominios[0] ?? null : null, detalleEmpresa: normalizeDetalleEmpresa(data.empresa.detalleEmpresa) }
          : e
        )
      );
    } catch { /* silencioso */ }
  };

  const openFichaEmpresa = async (empresa: EmpresaLite) => {
    try {
      setFichaOpen(true); setFichaLoading(true); setFichaError(null);
      const { data } = await http.get(`/ficha-empresa/${empresa.id_empresa}/completa`);
      setFichaData(data);
    } catch { setFichaError("No se pudo cargar la ficha"); }
    finally { setFichaLoading(false); }
  };

  /* ===================== Derivados ===================== */
  const statsTotales = useMemo(
    () => empresas.reduce(
      (acc, e) => ({
        totalEmpresas: acc.totalEmpresas + 1,
        totalSolicitantes: acc.totalSolicitantes + (e.estadisticas.totalSolicitantes ?? 0),
        totalEquipos: acc.totalEquipos + (e.estadisticas.totalEquipos ?? 0),
        totalVisitas: acc.totalVisitas + (e.estadisticas.totalVisitas ?? 0),
        totalTrabajos: acc.totalTrabajos + (e.estadisticas.totalTrabajos ?? 0),
        visitasPendientes: acc.visitasPendientes + (e.estadisticas.visitasPendientes ?? 0),
        trabajosPendientes: acc.trabajosPendientes + (e.estadisticas.trabajosPendientes ?? 0),
      }),
      { totalEmpresas: 0, totalSolicitantes: 0, totalEquipos: 0, totalVisitas: 0, totalTrabajos: 0, visitasPendientes: 0, trabajosPendientes: 0 }
    ),
    [empresas]
  );

  const empresasConAlerta = useMemo(
    () => empresas.filter(e => (e.estadisticas.visitasPendientes ?? 0) + (e.estadisticas.trabajosPendientes ?? 0) > 0).length,
    [empresas]
  );

  const equiposPorEmpresa = useMemo(
    () => empresas.map((e) => ({
      name: e.nombre.length > 14 ? e.nombre.slice(0, 14) + "…" : e.nombre,
      equipos: e.estadisticas.totalEquipos,
      solicitantes: e.estadisticas.totalSolicitantes,
      fullName: e.nombre,
    })).sort((a, b) => b.equipos - a.equipos).slice(0, 10),
    [empresas]
  );

  const distribucionTamanio = useMemo(() => {
    const ranges = [
      { name: "Grande (51+)", min: 51, max: Infinity, color: "#1e40af" },
      { name: "Mediana (11–50)", min: 11, max: 50, color: "#059669" },
      { name: "Pequeña (1–10)", min: 1, max: 10, color: "#ea580c" },
      { name: "Sin equipos", min: 0, max: 0, color: "#94a3b8" },
    ];
    return ranges.map((r) => ({
      name: r.name,
      value: empresas.filter((e) =>
        r.min === 0 && r.max === 0
          ? e.estadisticas.totalEquipos === 0
          : e.estadisticas.totalEquipos >= r.min && e.estadisticas.totalEquipos <= r.max
      ).length,
      color: r.color,
    })).filter((x) => x.value > 0);
  }, [empresas]);

  /* ===================== Stats cards ===================== */
  const computedStats: Stat[] = useMemo(() => {
    if (isCliente) {
      const kpis = empresaDashboard?.kpis;
      return [
        {
          name: "Usuarios",
          value: empresaDashboardLoading || refreshing
            ? <span className="inline-flex items-center gap-2"><LoadingOutlined /> Cargando…</span>
            : formatNumber(kpis?.totalSolicitantes ?? 0),
          icon: <TeamOutlined className="text-green-700 text-xl" />,
          change: "Solicitantes asociados a tu empresa",
          delta: null,
          sparkColor: "#059669",
        },
        {
          name: "Equipos",
          value: empresaDashboardLoading || refreshing
            ? <span className="inline-flex items-center gap-2"><LoadingOutlined /> Cargando…</span>
            : formatNumber(kpis?.totalEquipos ?? 0),
          icon: <LaptopOutlined className="text-purple-700 text-xl" />,
          change: "Dispositivos registrados",
          sparkColor: "#7c3aed",
        },
        {
          name: "Visitas del mes",
          value: empresaDashboardLoading || refreshing
            ? <span className="inline-flex items-center gap-2"><LoadingOutlined /> Cargando…</span>
            : formatNumber(kpis?.visitasPresencialesMes ?? 0),
          icon: <PieChartOutlined className="text-cyan-700 text-xl" />,
          change: `${kpis?.diasConVisitasMes ?? 0} días con visitas`,
          delta: <DeltaBadge curr={kpis?.visitasPresencialesMes ?? 0} prev={kpis?.visitasMesAnterior} />,
          sparkColor: "#0891b2",
        },
        {
          name: "Horas de soporte",
          value: empresaDashboardLoading || refreshing
            ? <span className="inline-flex items-center gap-2"><LoadingOutlined /> Cargando…</span>
            : `${Number(kpis?.horasSoporteConTickets ?? kpis?.horasSoporte ?? 0).toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} h`,
          icon: <BuildOutlined className="text-blue-700 text-xl" />,
          change: (() => {
            const total = kpis?.totalMinutosSoporteConTickets ?? kpis?.totalMinutosSoporte ?? 0;
            const tickets = kpis?.ticketsMes ?? 0;
            return tickets > 0
              ? `${total} min · ${tickets} ticket${tickets !== 1 ? "s" : ""} (${kpis?.ticketsMesAbiertos ?? 0} abierto${(kpis?.ticketsMesAbiertos ?? 0) !== 1 ? "s" : ""})`
              : `${total} minutos en el mes`;
          })(),
          delta: <DeltaBadge
            curr={kpis?.horasSoporteConTickets ?? kpis?.horasSoporte ?? 0}
            prev={kpis?.horasSoporteAntConTickets ?? kpis?.horasSoporteMesAnterior}
          />,
          sparkColor: "#1e40af",
        },
      ];
    }

    return [
      {
        name: "Total Empresas",
        value: refreshing ? <span className="inline-flex items-center gap-2"><LoadingOutlined /> Cargando…</span> : formatNumber(statsTotales.totalEmpresas),
        icon: <BuildOutlined className="text-blue-700 text-xl" />,
        change: "Empresas registradas",
        sparkColor: "#1e40af",
        onRefresh: () => fetchEmpresas(true),
      },
      {
        name: "Solicitantes Activos",
        value: refreshing ? <span className="inline-flex items-center gap-2"><LoadingOutlined /> Cargando…</span> : formatNumber(statsTotales.totalSolicitantes),
        icon: <TeamOutlined className="text-green-700 text-xl" />,
        change: "Total de usuarios",
        sparkColor: "#059669",
      },
      {
        name: "Equipos Registrados",
        value: refreshing ? <span className="inline-flex items-center gap-2"><LoadingOutlined /> Cargando…</span> : formatNumber(statsTotales.totalEquipos),
        icon: <LaptopOutlined className="text-purple-700 text-xl" />,
        change: "Dispositivos en inventario",
        sparkColor: "#7c3aed",
      },
      {
        name: "Pendientes",
        value: refreshing ? <span className="inline-flex items-center gap-2"><LoadingOutlined /> Cargando…</span>
          : <span className={statsTotales.visitasPendientes + statsTotales.trabajosPendientes > 0 ? "text-amber-600" : ""}>
            {formatNumber(statsTotales.visitasPendientes + statsTotales.trabajosPendientes)}
          </span>,
        icon: <WarningOutlined className={`text-xl ${statsTotales.visitasPendientes + statsTotales.trabajosPendientes > 0 ? "text-amber-500" : "text-slate-400"}`} />,
        change: `${empresasConAlerta} empresa${empresasConAlerta !== 1 ? "s" : ""} con pendientes`,
        sparkColor: "#ea580c",
      },
    ];
  }, [isCliente, empresaDashboard, empresaDashboardLoading, refreshing, statsTotales, empresasConAlerta, mesDashboard, anoDashboard]);

  const filteredEmpresas = useMemo(
    () => empresas.filter((e) =>
      e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.detalleEmpresa?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [empresas, searchTerm]
  );

  /* ===================== Render: loading / error ===================== */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-white flex items-center justify-center">
        <div className="text-lg flex items-center gap-2 text-slate-600"><LoadingOutlined /> Cargando empresas…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-white p-6">
        <div className="ml-64"><strong>Error:</strong> {error}
          <button onClick={() => fetchEmpresas()} className="ml-4 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm">Reintentar</button>
        </div>
      </div>
    );
  }

  /* ===================== Render principal ===================== */
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-white">
      <div className="flex-1">
        <main className="flex-1 p-6">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-3xl font-extrabold text-slate-800">
              {isCliente ? "Dashboard de mi empresa" : "Dashboard de Empresas"}
            </h1>
            <p className="mt-2 text-slate-600">
              {isCliente ? "Información y estadísticas de tu empresa." : "Análisis y estadísticas de todas las empresas."}
            </p>
          </motion.div>

          {/* Tabs */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="flex gap-2 mb-8 bg-white rounded-xl p-1 shadow-md inline-flex mt-6">
            {[
              { key: "overview" as const, label: "Resumen" },
              { key: "companies" as const, label: "Empresas" },
              { key: "historial" as const, label: "Historial" },
              { key: "inventarioIA" as const, label: "Inventario IA" },
            ].map((tab) => (
              <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${activeTab === tab.key ? "bg-cyan-700 text-white shadow-md" : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"}`}>
                {tab.label}
              </button>
            ))}
          </motion.div>

          {/* ========== OVERVIEW ========== */}
          {activeTab === "overview" && (
            <>
              {/* Filtro mes/año para cliente */}
              {isCliente && (
                <div className="mb-6 flex flex-wrap gap-3 items-center rounded-xl border border-cyan-100 bg-white p-4 shadow-sm">
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase">Mes</div>
                    <select value={mesDashboard} onChange={(e) => setMesDashboard(e.target.value)}
                      className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                      {[["01", "Enero"], ["02", "Febrero"], ["03", "Marzo"], ["04", "Abril"], ["05", "Mayo"], ["06", "Junio"],
                      ["07", "Julio"], ["08", "Agosto"], ["09", "Septiembre"], ["10", "Octubre"], ["11", "Noviembre"], ["12", "Diciembre"]]
                        .map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase">Año</div>
                    <input value={anoDashboard} onChange={(e) => setAnoDashboard(e.target.value)}
                      className="mt-1 w-28 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" placeholder="Año" />
                  </div>
                  {empresaDashboardLoading && (
                    <span className="text-sm text-slate-500 inline-flex items-center gap-2"><LoadingOutlined /> Actualizando…</span>
                  )}
                  {empresaDashboardError && <span className="text-sm text-rose-600">{empresaDashboardError}</span>}
                </div>
              )}

              {/* KPI Cards */}
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-8">
                {computedStats.map((stat, idx) => (
                  <motion.div key={stat.name}
                    className="bg-white rounded-xl shadow-md p-5 border border-slate-100 relative overflow-hidden"
                    initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: idx * 0.1 }}
                    whileHover={{ scale: 1.03, boxShadow: "0 12px 24px rgba(0,0,0,.12)" }}>
                    <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-blue-100/40 blur-2xl" />
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{stat.name}</div>
                        <div className="mt-2 text-3xl font-bold text-slate-800">{stat.value}</div>
                        <div className="text-xs text-slate-500 mt-1">{stat.change}</div>
                        {/* Delta comparación mes anterior */}
                        {(stat as StatBase).delta && (
                          <div className="mt-1">{(stat as StatBase).delta}</div>
                        )}
                        {(stat as StatBase).sparkValues && (
                          <div className="mt-2">
                            <Sparkline values={(stat as StatBase).sparkValues!} color={(stat as StatBase).sparkColor ?? "#1e40af"} />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {stat.icon}
                        {isRefreshableStat(stat) && (
                          <button onClick={stat.onRefresh}
                            className="ml-1 rounded-lg border border-blue-200 text-blue-700 px-2 py-1 text-xs hover:bg-blue-50" title="Actualizar" type="button">
                            <ReloadOutlined />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* ========== Gráficos CLIENTE ========== */}
              {isCliente ? (
                <>
                  {/* Fila 1: Tendencia 6 meses + Equipos por marca */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* NUEVO: Tendencia histórica 6 meses */}
                    <motion.div className="bg-white rounded-xl shadow-md p-6 border border-slate-100"
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.25 }}>
                      <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                        <RiseOutlined className="text-cyan-700" />
                        Tendencia últimos 6 meses
                      </h2>
                      <p className="text-xs text-slate-400 mb-3">Solicitantes registrados en Visitas presenciales y mantenciones remotas realizadas y tickets recibidos en el mes</p>
                      <TendenciaChart
                        data={empresaDashboard?.charts.tendencia6Meses}
                        loading={empresaDashboardLoading}
                      />
                    </motion.div>

                    {/* Equipos por marca */}
                    <motion.div className="bg-white rounded-xl shadow-md p-6 border border-slate-100"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
                      <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <LaptopOutlined className="text-green-700" />
                        Equipos por marca
                      </h2>
                      <HBarChart
                        loading={empresaDashboardLoading}
                        data={(empresaDashboard?.charts.equiposPorMarca ?? []).map((d) => ({
                          name: d.marca?.length > 14 ? d.marca.slice(0, 14) + "…" : (d.marca ?? "Sin marca"),
                          value: d.total, fullName: d.marca ?? "Sin marca",
                        }))}
                        color={DARK_PALETTE[0]}
                      />
                    </motion.div>
                  </div>

                  {/* Fila 2: Solicitantes con más equipos + Visitas por técnico */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <motion.div className="bg-white rounded-xl shadow-md p-6 border border-slate-100"
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.35 }}>
                      <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <TeamOutlined className="text-blue-700" />
                        Usuarios con más equipos
                      </h2>
                      <HBarChart
                        loading={empresaDashboardLoading}
                        data={(empresaDashboard?.charts.solicitantesConMasEquipos ?? []).map((d) => ({
                          name: d.solicitante?.length > 14 ? d.solicitante.slice(0, 14) + "…" : (d.solicitante ?? "—"),
                          value: d.total, fullName: d.solicitante ?? "—",
                        }))}
                        color={DARK_PALETTE[4]}
                      />
                    </motion.div>

                    <motion.div className="bg-white rounded-xl shadow-md p-6 border border-slate-100"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.4 }}>
                      <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <PieChartOutlined className="text-cyan-700" />
                        Técnicos que te visitaron este mes
                      </h2>
                      <HBarChart
                        loading={empresaDashboardLoading}
                        data={(empresaDashboard?.charts.visitasPorTecnico ?? []).map((d) => ({
                          name: d.tecnico?.length > 14 ? d.tecnico.slice(0, 14) + "…" : (d.tecnico ?? "—"),
                          value: d.total, fullName: d.tecnico ?? "—",
                        }))}
                        color={DARK_PALETTE[5]}
                      />
                    </motion.div>
                  </div>

                  {/* Fila 3: Horas soporte + Últimos equipos registrados */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <motion.div className="bg-white rounded-xl shadow-md p-6 border border-slate-100"
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.45 }}>
                      <div className="flex items-start justify-between mb-4">
                        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                          <BuildOutlined className="text-purple-700" />
                          Horas de soporte del mes
                        </h2>
                        {/* Comparación vs mes anterior */}
                        {empresaDashboard?.kpis.horasSoporteMesAnterior !== undefined && (
                          <DeltaBadge
                            curr={empresaDashboard.kpis.horasSoporte}
                            prev={empresaDashboard.kpis.horasSoporteMesAnterior}
                          />
                        )}
                      </div>
                      <HBarChart
                        loading={empresaDashboardLoading}
                        data={(empresaDashboard?.charts.horasSoporte ?? []).map((d) => ({
                          name: d.tipo?.length > 14 ? d.tipo.slice(0, 14) + "…" : (d.tipo ?? "—"),
                          value: d.horas, fullName: d.tipo ?? "—",
                        }))}
                        color={DARK_PALETTE[10]}
                      />
                    </motion.div>

                    {/* NUEVO: Últimos equipos registrados */}
                    <motion.div className="bg-white rounded-xl shadow-md p-6 border border-slate-100"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.5 }}>
                      <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <LaptopOutlined className="text-indigo-700" />
                        Últimos equipos registrados
                      </h2>
                      <UltimosEquipos
                        equipos={empresaDashboard?.ultimosEquipos ?? []}
                        loading={empresaDashboardLoading}
                      />
                    </motion.div>
                  </div>

                  {/* Visitas por día — ancho completo */}
                  <motion.div className="bg-white rounded-xl shadow-md p-6 border border-slate-100 mb-6"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.55 }}>
                    <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <PieChartOutlined className="text-cyan-700" />
                      Mantenciones en visita por día del mes
                    </h2>
                    {empresaDashboardLoading ? <ChartSkeleton height={200} /> :
                      !(empresaDashboard?.charts.visitasPorDia?.length) ? <div className="h-48"><ChartEmpty /></div> : (
                        <div className="h-52">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={empresaDashboard.charts.visitasPorDia} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                              <Tooltip content={(props) => <CustomBarTooltip {...props} />} cursor={{ fill: "#f1f5f9" }} />
                              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                                {empresaDashboard.charts.visitasPorDia.map((_, index) => (
                                  <Cell key={`visitas-dia-${index}`} fill={DARK_PALETTE[(index + 6) % DARK_PALETTE.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                  </motion.div>
                </>
              ) : (
                /* ========== Gráficos ADMIN ========== */
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Ranking con toggle */}
                    <motion.div className="bg-white rounded-xl shadow-md p-6 border border-slate-100"
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
                      <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                        <LaptopOutlined className="text-blue-700" />
                        Ranking de empresas
                      </h2>
                      <p className="text-xs text-slate-400 mb-4">Top 10 — alterna entre equipos y solicitantes</p>
                      <UnifiedRankingChart equiposData={equiposPorEmpresa} loading={refreshing} />
                    </motion.div>

                    {/* Distribución tamaño */}
                    <motion.div className="bg-white rounded-xl shadow-md p-6 border border-slate-100"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.35 }}>
                      <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                        <PieChartOutlined className="text-cyan-700" />
                        Distribución por tamaño
                      </h2>
                      <p className="text-xs text-slate-400 mb-4">Clasificación según cantidad de equipos</p>
                      <DonutChart data={distribucionTamanio} loading={refreshing} />
                    </motion.div>
                  </div>

                  {/* Tabla de soporte mensual por empresa */}
                  <motion.div className="bg-white rounded-xl shadow-md border border-slate-100 mb-6 overflow-hidden"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}>
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                      <div>
                        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                          <ClockCircleOutlined className={SOPORTE_COLORS.total.headerIcon} />
                          Soporte mensual por empresa
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Horas de visitas presenciales y mantenciones remotas por empresa. Selecciona el mes arriba. Click en columna para ordenar.
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs shrink-0">
                        <span className={`flex items-center gap-1 ${SOPORTE_COLORS.visitas.text} font-medium`}>
                          <span className={`w-2 h-2 rounded-full ${SOPORTE_COLORS.visitas.dot} inline-block`} />
                          Visitas
                        </span>

                        <span className={`flex items-center gap-1 ${SOPORTE_COLORS.remotas.text} font-medium`}>
                          <span className={`w-2 h-2 rounded-full ${SOPORTE_COLORS.remotas.dot} inline-block`} />
                          Remotas
                        </span>

                        <span className={`flex items-center gap-1 ${SOPORTE_COLORS.tickets.text} font-medium`}>
                          <span className={`w-2 h-2 rounded-full ${SOPORTE_COLORS.tickets.dot} inline-block`} />
                          Tickets
                        </span>
                      </div>
                    </div>
                    <TablaSoporteEmpresas
                      empresas={empresas}
                      onVerDetalle={openDetails}
                      onVerFicha={openFichaEmpresa}
                    />
                  </motion.div>
                </>
              )}
            </>
          )}

          {/* ========== COMPANIES ========== */}
          {activeTab === "companies" && (
            <motion.div className="bg-white rounded-xl shadow-md p-6 border border-slate-100"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h2 className="text-lg font-semibold text-slate-900">Lista de Empresas</h2>
                <div className="flex items-center gap-3">
                  <input type="text" placeholder="Buscar empresas..." value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
                  {!isCliente && (
                    <button onClick={() => setCreateEmpresaOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white bg-gradient-to-tr from-cyan-600 to-indigo-600 shadow-[0_6px_18px_-6px_rgba(37,99,235,0.45)] hover:brightness-110 transition">
                      + Nueva empresa
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-3 mt-6">
                {filteredEmpresas.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-neutral-400">
                    <BuildOutlined className="text-3xl mb-2 text-slate-400" />
                    <div>No se encontraron empresas</div>
                  </div>
                ) : (
                  filteredEmpresas.map((empresa, index) => (
                    <motion.div key={empresa.id_empresa}
                      className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all duration-300 group"
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }}>
                      <div className="flex items-start space-x-4 min-w-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors shrink-0">
                          <BuildOutlined className="text-blue-700" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">{empresa.nombre}</h3>
                            <span className="text-sm text-slate-500">
                              • {empresa.estadisticas.totalSolicitantes} solicitantes • {empresa.estadisticas.totalEquipos} equipos
                            </span>
                            {((empresa.estadisticas.visitasPendientes ?? 0) + (empresa.estadisticas.trabajosPendientes ?? 0)) > 0 && (
                              <SaludBadge nivel={((empresa.estadisticas.visitasPendientes ?? 0) + (empresa.estadisticas.trabajosPendientes ?? 0)) > 5 ? "alert" : "warn"} />
                            )}
                          </div>
                          <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                            <p><span className="font-medium text-slate-600">RUT:</span> {empresa.detalleEmpresa?.rut || "Sin RUT"}</p>
                            <p><span className="font-medium text-slate-600">Dirección:</span> {empresa.detalleEmpresa?.direccion || "Sin dirección"}</p>
                          </div>
                          {empresa.dominios?.length ? (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {empresa.dominios.map((d) => (
                                <span key={d} className="rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-700 border border-cyan-100">{d}</span>
                              ))}
                            </div>
                          ) : <p className="mt-1 text-xs text-slate-400">Sin dominios</p>}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <button onClick={() => openFichaEmpresa(empresa)} className="text-emerald-700 hover:text-emerald-900 font-medium transition">Ver ficha →</button>
                        <button onClick={() => openDetails(empresa)} className="text-blue-700 hover:text-blue-900 font-medium transition">Ver detalles →</button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* ========== HISTORIAL ========== */}
          {activeTab === "historial" && (
            <motion.div className="bg-white rounded-xl shadow-md p-6 border border-slate-100"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <EmpresasHistorial endpoint="/audit/empresas" />
            </motion.div>
          )}

          {/* ========== INVENTARIO IA ========== */}
          {activeTab === "inventarioIA" && (
            <motion.div className="bg-white rounded-xl shadow-md p-6 border border-slate-100"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <EmpresasInventarioIA />
            </motion.div>
          )}
        </main>
      </div>

      {/* Modales */}
      <EmpresaDetailsModal
        open={detailsOpen} onClose={() => setDetailsOpen(false)} loading={detailsLoading} error={detailsError}
        empresa={empresaSel} solicitantes={solicitantesSel} equipos={equiposSel} visitas={visitasSel} contactos={contactosSel}
        onUpdated={() => { if (empresaSel?.id_empresa) refreshEmpresaCompleta(empresaSel.id_empresa); }}
        canEdit={canEditEmpresa}
      />
      <FichaEmpresaModal
        open={fichaOpen} onClose={() => setFichaOpen(false)} loading={fichaLoading}
        empresa={fichaData?.empresa ?? null} ficha={fichaData?.ficha ?? null} checklist={fichaData?.checklist ?? null}
        detalleEmpresa={fichaData?.empresa?.detalleEmpresa ?? null} contactos={fichaData?.contactos ?? []}
        canEdit={canEditEmpresa}
        onUpdated={() => { if (fichaData?.empresa?.id_empresa) refreshEmpresaCompleta(fichaData.empresa.id_empresa); }}
      />
      {createEmpresaOpen && (
        <CrearEmpresaModal open={createEmpresaOpen} onClose={() => setCreateEmpresaOpen(false)}
          onCreated={() => { setCreateEmpresaOpen(false); fetchEmpresas(); }} />
      )}
    </div>
  );
};

export default EmpresasPage;