// src/pages/EmpresasPage.tsx
import React, { useState, useEffect, useMemo } from "react";
import {
  LoadingOutlined,
  ReloadOutlined,
  TeamOutlined,
  BuildOutlined,
  LaptopOutlined,
  PieChartOutlined,
  RiseOutlined,
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
} from "recharts";

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
    totalMinutosSoporte: number;
    horasSoporte: number;
  };
  charts: {
    equiposPorMarca: Array<{ marca: string; total: number }>;
    solicitantesConMasEquipos: Array<{ solicitante: string; total: number }>;
    visitasPorTecnico: Array<{ tecnico: string; total: number }>;
    visitasPorDia: Array<{ dia: string; total: number }>;
    horasSoporte: Array<{ tipo: string; minutos: number; horas: number }>;
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

/* ====================== Paleta ====================== */
const DARK_PALETTE = [
  "#1e40af", "#dc2626", "#059669", "#7c3aed", "#ea580c",
  "#0891b2", "#b45309", "#be185d", "#4338ca", "#0f766e",
  "#831843", "#78350f", "#374151", "#86198f", "#064e3b",
];

/* ====================== Componente: Skeleton de gráfico ====================== */
const ChartSkeleton: React.FC<{ height?: number }> = ({ height = 288 }) => (
  <div
    className="w-full animate-pulse rounded-lg bg-slate-100"
    style={{ height }}
  />
);

/* ====================== Componente: Empty state de gráfico ====================== */
const ChartEmpty: React.FC<{ message?: string }> = ({
  message = "Sin datos para este período",
}) => (
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
  // Intentar obtener el nombre completo desde payload (para barras horizontales)
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
        Cantidad:{" "}
        <span className="font-bold text-gray-900">{formatTooltipValue(item?.value)}</span>
      </div>
    </div>
  );
};

/* ====================== Componente: Donut chart con leyenda ====================== */
interface DonutChartProps {
  data: Array<{ name: string; value: number; color: string }>;
  loading?: boolean;
}

const DonutChart: React.FC<DonutChartProps> = ({ data, loading }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const [hovered, setHovered] = useState<number | null>(null);

  if (loading) return <ChartSkeleton height={180} />;
  if (!data.length || total === 0) return <div className="h-44"><ChartEmpty /></div>;

  // Calcular arcos SVG
  const cx = 60;
  const cy = 60;
  const r = 48;
  const innerR = 30;
  const circumference = 2 * Math.PI * r;

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
            <circle
              key={s.i}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={hovered === s.i ? 14 : 11}
              strokeDasharray={`${s.dash} ${circumference - s.dash}`}
              strokeDashoffset={s.offset}
              strokeLinecap="butt"
              style={{ transition: "stroke-width 0.2s", cursor: "pointer", transform: "rotate(-90deg)", transformOrigin: "60px 60px" }}
              onMouseEnter={() => setHovered(s.i)}
              onMouseLeave={() => setHovered(null)}
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
          <div
            key={s.i}
            className="flex items-center gap-2 cursor-pointer rounded-md px-1 py-0.5 transition-colors"
            style={{ background: hovered === s.i ? `${s.color}15` : "transparent" }}
            onMouseEnter={() => setHovered(s.i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <span className="text-xs text-slate-600 flex-1 truncate">{s.name}</span>
            <span className="text-xs font-semibold text-slate-800 shrink-0">
              {Math.round(s.pct * 100)}%
            </span>
            <span className="text-xs text-slate-400 shrink-0 w-6 text-right">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ====================== Componente: Barra horizontal custom ====================== */
interface HBarChartProps {
  data: Array<{ name: string; value: number; fullName?: string }>;
  color?: string;
  loading?: boolean;
  maxBars?: number;
}

const HBarChart: React.FC<HBarChartProps> = ({
  data,
  color = "#1e40af",
  loading,
  maxBars = 8,
}) => {
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
          <div
            key={i}
            className="flex items-center gap-3 group"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <div
              className="text-xs text-slate-500 text-right shrink-0 truncate"
              style={{ width: 110 }}
              title={item.fullName ?? item.name}
            >
              {item.name}
            </div>
            <div className="flex-1 h-7 bg-slate-100 rounded-md overflow-hidden relative">
              <div
                className="h-full rounded-md transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  background: color,
                  opacity: isHov ? 1 : 0.75,
                }}
              />
              {isHov && (
                <div className="absolute inset-0 flex items-center px-2">
                  <span className="text-xs font-semibold text-white drop-shadow">
                    {item.fullName ?? item.name}
                  </span>
                </div>
              )}
            </div>
            <div
              className="text-xs font-semibold text-slate-700 shrink-0 text-right"
              style={{ width: 32 }}
            >
              {formatNumber(item.value)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ====================== Componente: Gráfico unificado con toggle de métrica ====================== */
type MetricKey = "equipos" | "solicitantes";

interface UnifiedRankingChartProps {
  equiposData: Array<{ name: string; equipos: number; solicitantes: number; fullName: string }>;
  loading?: boolean;
}

const UnifiedRankingChart: React.FC<UnifiedRankingChartProps> = ({ equiposData, loading }) => {
  const [metric, setMetric] = useState<MetricKey>("equipos");

  const mapped = useMemo(
    () =>
      equiposData.map((d) => ({
        name: d.name,
        value: metric === "equipos" ? d.equipos : d.solicitantes,
        fullName: d.fullName,
      })),
    [equiposData, metric]
  );

  const colors: Record<MetricKey, string> = {
    equipos: "#1e40af",
    solicitantes: "#059669",
  };

  return (
    <div>
      {/* Toggle */}
      <div className="flex gap-1 mb-4">
        {(["equipos", "solicitantes"] as MetricKey[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMetric(m)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${metric === m
                ? "text-white shadow-sm"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            style={metric === m ? { background: colors[m] } : {}}
          >
            {m === "equipos" ? "Equipos" : "Solicitantes"}
          </button>
        ))}
      </div>
      <HBarChart
        data={mapped}
        color={colors[metric]}
        loading={loading}
        maxBars={8}
      />
    </div>
  );
};

/* ====================== Componente: Sparkline ====================== */
interface SparklineProps {
  values: number[];
  color?: string;
  height?: number;
}

const Sparkline: React.FC<SparklineProps> = ({ values, color = "#1e40af", height = 28 }) => {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-0.5" style={{ height }}>
      {values.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-t-sm"
          style={{
            height: `${Math.round((v / max) * 100)}%`,
            background: color,
            opacity: i === values.length - 1 ? 1 : 0.4 + (i / values.length) * 0.4,
            minHeight: 2,
          }}
        />
      ))}
    </div>
  );
};

/* ====================== Tipos de página ====================== */
type StatBase = {
  name: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  change: React.ReactNode;
  sparkValues?: number[];
  sparkColor?: string;
  delta?: string;
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

  useEffect(() => {
    if (isCliente) setActiveTab("overview");
  }, [isCliente]);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [empresaSel, setEmpresaSel] = useState<EmpresaLite | null>(null);
  const [solicitantesSel, setSolicitantesSel] = useState<SolicitanteLite[]>([]);
  const [equiposSel, setEquiposSel] = useState<EquipoLite[]>([]);
  const [visitasSel, setVisitasSel] = useState<Visita[]>([]);
  const [contactosSel, setContactosSel] = useState<any[]>([]);

  const nowDashboard = new Date();
  const [mesDashboard, setMesDashboard] = useState(
    String(nowDashboard.getMonth() + 1).padStart(2, "0")
  );
  const [anoDashboard, setAnoDashboard] = useState(
    String(nowDashboard.getFullYear())
  );
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
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
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
    const pageSize = 100;
    let page = 1;
    let all: SolicitanteLite[] = [];
    let totalPages = 1;
    do {
      const { data: json } = await http.get("/solicitantes", { params: { empresaId, page, pageSize } });
      if (Array.isArray(json.items)) all = all.concat(json.items);
      totalPages = json.totalPages ?? 1;
      page++;
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
      setEmpresaDashboardError(
        err?.response?.data?.message || err?.message || "No se pudo cargar el dashboard mensual."
      );
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
    const pageSize = 100;
    let page = 1;
    let totalPages = 1;
    let all: Visita[] = [];
    do {
      const { data: json } = await http.get("/visitas", { params: { empresaId, page, pageSize } });
      if (Array.isArray(json.items)) all = all.concat(json.items);
      totalPages = json.totalPages ?? 1;
      page++;
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
    } catch {
      setDetailsError("No se pudo cargar el detalle de la empresa.");
    } finally {
      setDetailsLoading(false);
    }
  };

  /* ===================== REFRESH FICHA ===================== */
  const refreshEmpresaCompleta = async (empresaId: number) => {
    try {
      const { data } = await http.get(`/ficha-empresa/${empresaId}/completa`);
      setFichaData({ ...data });
      setEmpresaSel(() => ({ ...data.empresa, detalleEmpresa: normalizeDetalleEmpresa(data.empresa.detalleEmpresa) }));
      setEmpresas((prev) =>
        prev.map((e) =>
          e.id_empresa === data.empresa.id_empresa
            ? {
              ...e,
              nombre: data.empresa.nombre,
              dominios: Array.isArray(data.empresa.dominios) ? data.empresa.dominios : [],
              dominioPrincipal: Array.isArray(data.empresa.dominios) ? data.empresa.dominios[0] ?? null : null,
              detalleEmpresa: normalizeDetalleEmpresa(data.empresa.detalleEmpresa),
            }
            : e
        )
      );
    } catch { /* silencioso */ }
  };

  /* ===================== OPEN FICHA ===================== */
  const openFichaEmpresa = async (empresa: EmpresaLite) => {
    try {
      setFichaOpen(true); setFichaLoading(true); setFichaError(null);
      const { data } = await http.get(`/ficha-empresa/${empresa.id_empresa}/completa`);
      setFichaData(data);
    } catch {
      setFichaError("No se pudo cargar la ficha");
    } finally {
      setFichaLoading(false);
    }
  };

  /* ===================== Derivados ===================== */
  const statsTotales = useMemo(
    () =>
      empresas.reduce(
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

  // Datos para el gráfico unificado (barras horizontales)
  const equiposPorEmpresa = useMemo(
    () =>
      empresas
        .map((e) => ({
          name: e.nombre.length > 14 ? e.nombre.slice(0, 14) + "…" : e.nombre,
          equipos: e.estadisticas.totalEquipos,
          solicitantes: e.estadisticas.totalSolicitantes,
          fullName: e.nombre,
        }))
        .sort((a, b) => b.equipos - a.equipos)
        .slice(0, 10),
    [empresas]
  );

  // Distribución tamaño para donut
  const distribucionTamanio = useMemo(() => {
    const ranges = [
      { name: "Grande (51+)", min: 51, max: Infinity, color: "#1e40af" },
      { name: "Mediana (11–50)", min: 11, max: 50, color: "#059669" },
      { name: "Pequeña (1–10)", min: 1, max: 10, color: "#ea580c" },
      { name: "Sin equipos", min: 0, max: 0, color: "#94a3b8" },
    ];
    return ranges
      .map((r) => ({
        name: r.name,
        value: empresas.filter((e) =>
          r.min === 0 && r.max === 0
            ? e.estadisticas.totalEquipos === 0
            : e.estadisticas.totalEquipos >= r.min && e.estadisticas.totalEquipos <= r.max
        ).length,
        color: r.color,
      }))
      .filter((x) => x.value > 0);
  }, [empresas]);

  /* ===================== Stats cards ===================== */
  const computedStats: Stat[] = useMemo(() => {
    if (isCliente) {
      return [
        {
          name: "Solicitantes",
          value: empresaDashboardLoading || refreshing
            ? <span className="inline-flex items-center gap-2"><LoadingOutlined /> Cargando…</span>
            : formatNumber(empresaDashboard?.kpis.totalSolicitantes ?? 0),
          icon: <TeamOutlined className="text-green-700 text-xl" />,
          change: "Usuarios asociados a tu empresa",
          sparkColor: "#059669",
        },
        {
          name: "Equipos",
          value: empresaDashboardLoading || refreshing
            ? <span className="inline-flex items-center gap-2"><LoadingOutlined /> Cargando…</span>
            : formatNumber(empresaDashboard?.kpis.totalEquipos ?? 0),
          icon: <LaptopOutlined className="text-purple-700 text-xl" />,
          change: "Dispositivos asociados a tu empresa",
          sparkColor: "#7c3aed",
        },
        {
          name: "Días con visitas",
          value: empresaDashboardLoading || refreshing
            ? <span className="inline-flex items-center gap-2"><LoadingOutlined /> Cargando…</span>
            : formatNumber(empresaDashboard?.kpis.diasConVisitasMes ?? 0),
          icon: <PieChartOutlined className="text-cyan-700 text-xl" />,
          change: `${empresaDashboard?.kpis.visitasPresencialesMes ?? 0} visitas presenciales en ${mesDashboard}/${anoDashboard}`,
          sparkColor: "#0891b2",
        },
        {
          name: "Horas de soporte (mes)",
          value: empresaDashboardLoading || refreshing
            ? <span className="inline-flex items-center gap-2"><LoadingOutlined /> Cargando…</span>
            : `${Number(empresaDashboard?.kpis.horasSoporte ?? 0).toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} h`,
          icon: <BuildOutlined className="text-blue-700 text-xl" />,
          change: `${empresaDashboard?.kpis.totalMinutosSoporte ?? 0} minutos registrados`,
          sparkColor: "#1e40af",
        },
      ];
    }
    return [
      {
        name: "Total Empresas",
        value: refreshing
          ? <span className="inline-flex items-center gap-2"><LoadingOutlined /> Cargando…</span>
          : formatNumber(statsTotales.totalEmpresas),
        icon: <BuildOutlined className="text-blue-700 text-xl" />,
        change: "Empresas registradas",
        delta: "+2 esta semana",
        deltaUp: true,
        sparkColor: "#1e40af",
        onRefresh: () => fetchEmpresas(true),
      },
      {
        name: "Solicitantes Activos",
        value: refreshing
          ? <span className="inline-flex items-center gap-2"><LoadingOutlined /> Cargando…</span>
          : formatNumber(statsTotales.totalSolicitantes),
        icon: <TeamOutlined className="text-green-700 text-xl" />,
        change: "Total de usuarios",
        sparkColor: "#059669",
      },
      {
        name: "Equipos Registrados",
        value: refreshing
          ? <span className="inline-flex items-center gap-2"><LoadingOutlined /> Cargando…</span>
          : formatNumber(statsTotales.totalEquipos),
        icon: <LaptopOutlined className="text-purple-700 text-xl" />,
        change: "Dispositivos en inventario",
        sparkColor: "#7c3aed",
      },
      {
        name: "Visitas Totales",
        value: refreshing
          ? <span className="inline-flex items-center gap-2"><LoadingOutlined /> Cargando…</span>
          : formatNumber(statsTotales.totalVisitas),
        icon: <PieChartOutlined className="text-cyan-700 text-xl" />,
        change: "Visitas registradas",
        sparkColor: "#0891b2",
      },
    ];
  }, [isCliente, empresaDashboard, empresaDashboardLoading, refreshing, statsTotales, mesDashboard, anoDashboard]);

  const filteredEmpresas = useMemo(
    () =>
      empresas.filter(
        (e) =>
          e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.detalleEmpresa?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [empresas, searchTerm]
  );

  /* ===================== Render: loading / error ===================== */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-white flex items-center justify-center">
        <div className="text-lg flex items-center gap-2 text-slate-600">
          <LoadingOutlined /> Cargando empresas…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-white p-6">
        <div className="ml-64">
          <strong>Error:</strong> {error}
          <button onClick={() => fetchEmpresas()} className="ml-4 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm">
            Reintentar
          </button>
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
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex gap-2 mb-8 bg-white rounded-xl p-1 shadow-md inline-flex mt-6"
          >
            {[
              { key: "overview" as const, label: "Resumen" },
              { key: "companies" as const, label: "Empresas" },
              { key: "historial" as const, label: "Historial" },
              { key: "inventarioIA" as const, label: "Inventario IA Empresas" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${activeTab === tab.key
                    ? "bg-cyan-700 text-white shadow-md"
                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                  }`}
              >
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
                    <select
                      value={mesDashboard}
                      onChange={(e) => setMesDashboard(e.target.value)}
                      className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                    >
                      {[["01", "Enero"], ["02", "Febrero"], ["03", "Marzo"], ["04", "Abril"], ["05", "Mayo"], ["06", "Junio"],
                      ["07", "Julio"], ["08", "Agosto"], ["09", "Septiembre"], ["10", "Octubre"], ["11", "Noviembre"], ["12", "Diciembre"]]
                        .map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase">Año</div>
                    <input
                      value={anoDashboard}
                      onChange={(e) => setAnoDashboard(e.target.value)}
                      className="mt-1 w-28 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                      placeholder="Año"
                    />
                  </div>
                  {empresaDashboardLoading && (
                    <span className="text-sm text-slate-500 inline-flex items-center gap-2">
                      <LoadingOutlined /> Actualizando dashboard…
                    </span>
                  )}
                  {empresaDashboardError && (
                    <span className="text-sm text-rose-600">{empresaDashboardError}</span>
                  )}
                </div>
              )}

              {/* ---- KPI Cards mejoradas ---- */}
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-8">
                {computedStats.map((stat, idx) => (
                  <motion.div
                    key={stat.name}
                    className="bg-white rounded-xl shadow-md p-5 border border-slate-100 relative overflow-hidden"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: idx * 0.1 }}
                    whileHover={{ scale: 1.03, boxShadow: "0 12px 24px rgba(0,0,0,.12)" }}
                  >
                    <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-blue-100/40 blur-2xl" />
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-slate-500 text-xs font-semibold uppercase tracking-wide">{stat.name}</div>
                        <div className="mt-2 text-3xl font-bold text-slate-800">{stat.value}</div>
                        <div className="text-xs text-slate-500 mt-1">{stat.change}</div>
                        {/* Delta */}
                        {(stat as StatBase).delta && (
                          <div className={`text-xs mt-1 font-medium flex items-center gap-1 ${(stat as StatBase).deltaUp ? "text-emerald-600" : "text-red-500"}`}>
                            <RiseOutlined />
                            {(stat as StatBase).delta}
                          </div>
                        )}
                        {/* Sparkline */}
                        {(stat as StatBase).sparkValues && (
                          <div className="mt-2">
                            <Sparkline
                              values={(stat as StatBase).sparkValues!}
                              color={(stat as StatBase).sparkColor ?? "#1e40af"}
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {stat.icon}
                        {isRefreshableStat(stat) && (
                          <button
                            onClick={stat.onRefresh}
                            className="ml-1 rounded-lg border border-blue-200 text-blue-700 px-2 py-1 text-xs hover:bg-blue-50"
                            title="Actualizar"
                            type="button"
                          >
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
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Equipos por marca — barras horizontales */}
                    <motion.div
                      className="bg-white rounded-xl shadow-md p-6 border border-slate-100"
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                    >
                      <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <LaptopOutlined className="text-green-700" />
                        Equipos por marca
                      </h2>
                      <HBarChart
                        loading={empresaDashboardLoading}
                        data={(empresaDashboard?.charts.equiposPorMarca ?? []).map((d, i) => ({
                          name: d.marca?.length > 14 ? d.marca.slice(0, 14) + "…" : (d.marca ?? "Sin marca"),
                          value: d.total,
                          fullName: d.marca ?? "Sin marca",
                        }))}
                        color={DARK_PALETTE[0]}
                      />
                    </motion.div>

                    {/* Solicitantes con más equipos — barras horizontales */}
                    <motion.div
                      className="bg-white rounded-xl shadow-md p-6 border border-slate-100"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: 0.35 }}
                    >
                      <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <TeamOutlined className="text-blue-700" />
                        Solicitantes con más equipos
                      </h2>
                      <HBarChart
                        loading={empresaDashboardLoading}
                        data={(empresaDashboard?.charts.solicitantesConMasEquipos ?? []).map((d) => ({
                          name: d.solicitante?.length > 14 ? d.solicitante.slice(0, 14) + "…" : (d.solicitante ?? "—"),
                          value: d.total,
                          fullName: d.solicitante ?? "—",
                        }))}
                        color={DARK_PALETTE[4]}
                      />
                    </motion.div>

                    {/* Visitas por técnico — barras horizontales */}
                    <motion.div
                      className="bg-white rounded-xl shadow-md p-6 border border-slate-100"
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                    >
                      <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <PieChartOutlined className="text-cyan-700" />
                        Visitas por técnico del mes
                      </h2>
                      <HBarChart
                        loading={empresaDashboardLoading}
                        data={(empresaDashboard?.charts.visitasPorTecnico ?? []).map((d) => ({
                          name: d.tecnico?.length > 14 ? d.tecnico.slice(0, 14) + "…" : (d.tecnico ?? "—"),
                          value: d.total,
                          fullName: d.tecnico ?? "—",
                        }))}
                        color={DARK_PALETTE[5]}
                      />
                    </motion.div>

                    {/* Horas de soporte — barras horizontales */}
                    <motion.div
                      className="bg-white rounded-xl shadow-md p-6 border border-slate-100"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: 0.45 }}
                    >
                      <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <BuildOutlined className="text-purple-700" />
                        Horas de soporte del mes
                      </h2>
                      <HBarChart
                        loading={empresaDashboardLoading}
                        data={(empresaDashboard?.charts.horasSoporte ?? []).map((d) => ({
                          name: d.tipo?.length > 14 ? d.tipo.slice(0, 14) + "…" : (d.tipo ?? "—"),
                          value: d.horas,
                          fullName: d.tipo ?? "—",
                        }))}
                        color={DARK_PALETTE[10]}
                      />
                    </motion.div>
                  </div>

                  {/* Visitas por día — ancho completo */}
                  <motion.div
                    className="bg-white rounded-xl shadow-md p-6 border border-slate-100 mb-6"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                  >
                    <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <PieChartOutlined className="text-cyan-700" />
                      Mantenciones en visita por día del mes
                    </h2>
                    {empresaDashboardLoading ? (
                      <ChartSkeleton height={200} />
                    ) : !(empresaDashboard?.charts.visitasPorDia?.length) ? (
                      <div className="h-48"><ChartEmpty /></div>
                    ) : (
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={empresaDashboard.charts.visitasPorDia}
                            margin={{ top: 4, right: 8, left: -10, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                            <XAxis
                              dataKey="dia"
                              tick={{ fontSize: 11, fill: "#64748b" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              allowDecimals={false}
                              tick={{ fontSize: 11, fill: "#64748b" }}
                              axisLine={false}
                              tickLine={false}
                            />
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
                    {/* Gráfico unificado con toggle */}
                    <motion.div
                      className="bg-white rounded-xl shadow-md p-6 border border-slate-100"
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: 0.3 }}
                    >
                      <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                        <LaptopOutlined className="text-blue-700" />
                        Ranking de empresas
                      </h2>
                      <p className="text-xs text-slate-400 mb-4">Top 10 — alterna entre equipos y solicitantes</p>
                      <UnifiedRankingChart
                        equiposData={equiposPorEmpresa}
                        loading={refreshing}
                      />
                    </motion.div>

                    {/* Distribución tamaño — Donut */}
                    <motion.div
                      className="bg-white rounded-xl shadow-md p-6 border border-slate-100"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: 0.35 }}
                    >
                      <h2 className="text-base font-bold text-slate-800 mb-1 flex items-center gap-2">
                        <PieChartOutlined className="text-cyan-700" />
                        Distribución por tamaño
                      </h2>
                      <p className="text-xs text-slate-400 mb-4">Clasificación según cantidad de equipos</p>
                      <DonutChart data={distribucionTamanio} loading={refreshing} />
                    </motion.div>
                  </div>

                  {/* Segunda fila: top equipos + top solicitantes como barras horizontales simples */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <motion.div
                      className="bg-white rounded-xl shadow-md p-6 border border-slate-100"
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                    >
                      <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <LaptopOutlined className="text-green-700" />
                        Top empresas por equipos
                      </h2>
                      <HBarChart
                        loading={refreshing}
                        data={equiposPorEmpresa.map((d) => ({ name: d.name, value: d.equipos, fullName: d.fullName }))}
                        color="#1e40af"
                        maxBars={8}
                      />
                    </motion.div>

                    <motion.div
                      className="bg-white rounded-xl shadow-md p-6 border border-slate-100"
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.45 }}
                    >
                      <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <TeamOutlined className="text-emerald-700" />
                        Top empresas por solicitantes
                      </h2>
                      <HBarChart
                        loading={refreshing}
                        data={equiposPorEmpresa
                          .slice()
                          .sort((a, b) => b.solicitantes - a.solicitantes)
                          .map((d) => ({ name: d.name, value: d.solicitantes, fullName: d.fullName }))}
                        color="#059669"
                        maxBars={8}
                      />
                    </motion.div>
                  </div>
                </>
              )}
            </>
          )}

          {/* ========== COMPANIES ========== */}
          {activeTab === "companies" && (
            <motion.div
              className="bg-white rounded-xl shadow-md p-6 border border-slate-100"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h2 className="text-lg font-semibold text-slate-900">Lista de Empresas</h2>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Buscar empresas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                  />
                  {!isCliente && (
                    <button
                      onClick={() => setCreateEmpresaOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-white bg-gradient-to-tr from-cyan-600 to-indigo-600 shadow-[0_6px_18px_-6px_rgba(37,99,235,0.45)] hover:brightness-110 transition"
                    >
                      + Nueva empresa
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3 mt-6">
                {filteredEmpresas.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center text-neutral-400">
                    <BuildOutlined className="text-3xl mb-2 text-slate-400" />
                    <div>No se encontraron empresas que coincidan con la búsqueda</div>
                  </div>
                ) : (
                  filteredEmpresas.map((empresa, index) => (
                    <motion.div
                      key={empresa.id_empresa}
                      className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all duration-300 group"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <div className="flex items-start space-x-4 min-w-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors shrink-0">
                          <BuildOutlined className="text-blue-700" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
                              {empresa.nombre}
                            </h3>
                            <span className="text-sm text-slate-500">
                              • {empresa.estadisticas.totalSolicitantes} solicitantes •{" "}
                              {empresa.estadisticas.totalEquipos} equipos
                            </span>
                          </div>
                          <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                            <p><span className="font-medium text-slate-600">RUT:</span> {empresa.detalleEmpresa?.rut || "Sin RUT registrado"}</p>
                            <p><span className="font-medium text-slate-600">Dirección:</span> {empresa.detalleEmpresa?.direccion || "Sin dirección registrada"}</p>
                          </div>
                          {empresa.dominios?.length ? (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {empresa.dominios.map((dominio) => (
                                <span key={dominio} className="rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-700 border border-cyan-100">
                                  {dominio}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-1 text-xs text-slate-400">Sin dominios registrados</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <button onClick={() => openFichaEmpresa(empresa)} className="text-emerald-700 hover:text-emerald-900 font-medium group-hover:translate-x-1 transition-transform">
                          Ver ficha →
                        </button>
                        <button onClick={() => openDetails(empresa)} className="text-blue-700 hover:text-blue-900 font-medium group-hover:translate-x-1 transition-transform">
                          Ver detalles →
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}

          {/* ========== HISTORIAL ========== */}
          {activeTab === "historial" && (
            <motion.div
              className="bg-white rounded-xl shadow-md p-6 border border-slate-100"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <EmpresasHistorial endpoint="/audit/empresas" />
            </motion.div>
          )}

          {/* ========== INVENTARIO IA ========== */}
          {activeTab === "inventarioIA" && (
            <motion.div
              className="bg-white rounded-xl shadow-md p-6 border border-slate-100"
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <EmpresasInventarioIA />
            </motion.div>
          )}
        </main>
      </div>

      {/* Modales */}
      <EmpresaDetailsModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        loading={detailsLoading}
        error={detailsError}
        empresa={empresaSel}
        solicitantes={solicitantesSel}
        equipos={equiposSel}
        visitas={visitasSel}
        contactos={contactosSel}
        onUpdated={() => { if (empresaSel?.id_empresa) refreshEmpresaCompleta(empresaSel.id_empresa); }}
        canEdit={canEditEmpresa}
      />

      <FichaEmpresaModal
        open={fichaOpen}
        onClose={() => setFichaOpen(false)}
        loading={fichaLoading}
        empresa={fichaData?.empresa ?? null}
        ficha={fichaData?.ficha ?? null}
        checklist={fichaData?.checklist ?? null}
        detalleEmpresa={fichaData?.empresa?.detalleEmpresa ?? null}
        contactos={fichaData?.contactos ?? []}
        canEdit={canEditEmpresa}
        onUpdated={() => {
          if (fichaData?.empresa?.id_empresa) refreshEmpresaCompleta(fichaData.empresa.id_empresa);
        }}
      />

      {createEmpresaOpen && (
        <CrearEmpresaModal
          open={createEmpresaOpen}
          onClose={() => setCreateEmpresaOpen(false)}
          onCreated={() => { setCreateEmpresaOpen(false); fetchEmpresas(); }}
        />
      )}
    </div>
  );
};

export default EmpresasPage;