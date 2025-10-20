import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LoadingOutlined,
  ReloadOutlined,
  TeamOutlined,
  BuildOutlined,
  LaptopOutlined,
  WarningOutlined,
  SearchOutlined,
  PieChartOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import Header from "../components/Header";
import EmpresaDetailsModal, {
  type EquipoLite,
  type SolicitanteLite,
  type Visita,
  type EmpresaLite,
} from "../components/EmpresaDetailsModal";

/* ====================== Config ====================== */
const API_URL =
  (import.meta as ImportMeta).env.VITE_API_URL || "http://localhost:4000/api";

/* ====================== Tipos de página ====================== */
interface EstadisticasEmpresa {
  totalSolicitantes: number;
  totalEquipos: number;
  totalTickets: number;
  totalVisitas: number;
  totalTrabajos: number;
  visitasPendientes: number;
  trabajosPendientes: number;
}

interface Empresa extends EmpresaLite {
  solicitantes: Array<{
    id_solicitante: number;
    nombre: string;
    email: string | null;
    equipos: Array<{ id_equipo: number }>;
  }>;
  estadisticas: EstadisticasEmpresa;
}

interface Ticket {
  empresa: string | null;
  id_ticket?: number;
  asunto?: string | null;
  estado?: string | null;
  prioridad?: string | null;
  creado_en?: string | null;
  solicitante?: string | null;
}

/* ====================== Helpers ====================== */
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

function formatNumber(n?: number | null) {
  if (typeof n !== "number") return "—";
  try {
    return n.toLocaleString("es-CL");
  } catch {
    return String(n);
  }
}
function qs(params: Record<string, string | number | undefined | null>) {
  const s = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return s ? `?${s}` : "";
}

/** debounce simple con refs (sin setTimeout leaks) */
function useDebounced<T>(value: T, delay = 350) {
  const [v, setV] = useState(value);
  const tRef = useRef<number | null>(null);
  useEffect(() => {
    if (tRef.current) window.clearTimeout(tRef.current);
    tRef.current = window.setTimeout(() => setV(value), clamp(delay, 120, 1500));
    return () => {
      if (tRef.current) window.clearTimeout(tRef.current);
    };
  }, [value, delay]);
  return v;
}

/* ====================== Tooltips ====================== */
type TooltipItem = {
  name: string;
  value: number;
  color?: string;
  payload?: unknown;
};
interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string | number;
}

const CustomBarTooltip: React.FC<CustomTooltipProps> = ({
  active,
  label,
  payload,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-gray-300 bg-white/95 shadow-md p-3">
      <div className="text-sm font-semibold text-gray-900">{label}</div>
      <div className="text-sm text-gray-700">
        Cantidad: <b>{payload[0].value}</b>
      </div>
    </div>
  );
};
const CustomPieTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-gray-300 bg-white/95 shadow-md p-3">
      <div className="text-sm font-semibold text-gray-900">
        {payload[0].name}
      </div>
      <div className="text-sm text-gray-700">
        Cantidad: <b>{payload[0].value}</b>
      </div>
    </div>
  );
};
const renderPieLabel = (props: PieLabelRenderProps) => {
  const { name } = props;
  const raw = (props as { percent?: unknown }).percent;
  const percentNum = typeof raw === "number" ? raw : Number(raw ?? 0);
  const pct = Math.round(percentNum * 100);
  const label =
    typeof name === "string" ? name : name != null ? String(name) : "Total";
  return `${label} (${pct}%)`;
};

const DARK_PALETTE = [
  "#1e40af",
  "#dc2626",
  "#059669",
  "#7c3aed",
  "#ea580c",
  "#0891b2",
  "#b45309",
  "#be185d",
  "#4338ca",
  "#0f766e",
  "#831843",
  "#78350f",
  "#374151",
  "#86198f",
  "#064e3b",
];

/* ====================== Página ====================== */
type StatBase = {
  name: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  change: React.ReactNode;
};
type RefreshableStat = StatBase & { onRefresh: () => void };
type Stat = StatBase | RefreshableStat;
function isRefreshableStat(s: Stat): s is RefreshableStat {
  return "onRefresh" in s && typeof (s as RefreshableStat).onRefresh === "function";
}

const EmpresasPage: React.FC = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const searchDebounced = useDebounced(searchTerm, 300);

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"overview" | "companies">(
    "overview"
  );

  // modal state
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [empresaSel, setEmpresaSel] = useState<EmpresaLite | null>(null);
  const [solicitantesSel, setSolicitantesSel] = useState<SolicitanteLite[]>(
    []
  );
  const [equiposSel, setEquiposSel] = useState<EquipoLite[]>([]);
  const [visitasSel, setVisitasSel] = useState<Visita[]>([]);

  // control de abort
  const fetchCtrlRef = useRef<AbortController | null>(null);

  const fetchEmpresas = async (showRefresh = false) => {
    try {
      fetchCtrlRef.current?.abort();
      const ctrl = new AbortController();
      fetchCtrlRef.current = ctrl;

      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const token = localStorage.getItem("accessToken") ?? "";
      const baseHeaders: HeadersInit = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // Empresas
      const eRes = await fetch(`${API_URL}/empresas`, {
        headers: baseHeaders,
        credentials: "include",
        cache: "no-store",
        signal: ctrl.signal,
      });
      if (!eRes.ok) throw new Error(`HTTP ${eRes.status}: ${eRes.statusText}`);
      const eJson: { data?: Empresa[]; items?: Empresa[] } = await eRes.json();
      const empresasData = eJson.data ?? eJson.items ?? [];
      if (!Array.isArray(empresasData))
        throw new Error("Formato inválido de empresas");
      setEmpresas(empresasData);

      // Tickets
      const tRes = await fetch(`${API_URL}/tickets?all=true`, {
        headers: baseHeaders,
        credentials: "include",
        cache: "no-store",
        signal: ctrl.signal,
      });
      if (!tRes.ok) throw new Error(`HTTP ${tRes.status}: ${tRes.statusText}`);
      const tJson: { rows?: Ticket[]; data?: Ticket[] } = await tRes.json();
      setTickets(tJson.rows ?? tJson.data ?? []);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error)?.message || "Error al cargar datos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmpresas();
    return () => {
      fetchCtrlRef.current?.abort();
    };
  
  }, []);

  /* ===== Derivados ===== */
  const statsTotales = useMemo(
    () =>
      empresas.reduce(
        (acc, e) => ({
          totalEmpresas: acc.totalEmpresas + 1,
          totalSolicitantes:
            acc.totalSolicitantes + (e.estadisticas?.totalSolicitantes ?? 0),
          totalEquipos:
            acc.totalEquipos + (e.estadisticas?.totalEquipos ?? 0),
          totalTickets:
            acc.totalTickets + (e.estadisticas?.totalTickets ?? 0),
          totalVisitas:
            acc.totalVisitas + (e.estadisticas?.totalVisitas ?? 0),
          totalTrabajos:
            acc.totalTrabajos + (e.estadisticas?.totalTrabajos ?? 0),
          visitasPendientes:
            acc.visitasPendientes +
            (e.estadisticas?.visitasPendientes ?? 0),
          trabajosPendientes:
            acc.trabajosPendientes +
            (e.estadisticas?.trabajosPendientes ?? 0),
        }),
        {
          totalEmpresas: 0,
          totalSolicitantes: 0,
          totalEquipos: 0,
          totalTickets: 0,
          totalVisitas: 0,
          totalTrabajos: 0,
          visitasPendientes: 0,
          trabajosPendientes: 0,
        }
      ),
    [empresas]
  );

  const ticketsPorEmpresa = useMemo(() => {
    const result: Record<string, number> = {};
    tickets.forEach((t) => {
      const emp = (t.empresa ?? "Sin empresa").trim() || "Sin empresa";
      result[emp] = (result[emp] ?? 0) + 1;
    });
    return result;
  }, [tickets]);

  const equiposPorEmpresa = useMemo(
    () =>
      empresas
        .map((e) => ({
          name:
            e.nombre.length > 12 ? e.nombre.slice(0, 12) + "..." : e.nombre,
          equipos: e.estadisticas?.totalEquipos ?? 0,
          solicitantes: e.estadisticas?.totalSolicitantes ?? 0,
          fullName: e.nombre,
        }))
        .sort((a, b) => b.equipos - a.equipos)
        .slice(0, 8),
    [empresas]
  );

  const solicitantesPorEmpresa = useMemo(
    () =>
      empresas
        .map((e) => ({
          name:
            e.nombre.length > 10 ? e.nombre.slice(0, 10) + "..." : e.nombre,
          solicitantes: e.estadisticas?.totalSolicitantes ?? 0,
          equipos: e.estadisticas?.totalEquipos ?? 0,
          fullName: e.nombre,
        }))
        .sort((a, b) => b.solicitantes - a.solicitantes)
        .slice(0, 6),
    [empresas]
  );

  const distribucionTamanioEmpresas = useMemo(() => {
    const ranges = [
      { name: "Pequeña (1-10)", min: 1, max: 10, color: "#059669" },
      { name: "Mediana (11-50)", min: 11, max: 50, color: "#ea580c" },
      { name: "Grande (51+)", min: 51, max: Infinity, color: "#dc2626" },
      { name: "Sin equipos", min: 0, max: 0, color: "#374151" },
    ] as const;
    return ranges
      .map((r) => {
        const count = empresas.filter((e) =>
          r.min === 0 && r.max === 0
            ? (e.estadisticas?.totalEquipos ?? 0) === 0
            : (e.estadisticas?.totalEquipos ?? 0) >= r.min &&
              (e.estadisticas?.totalEquipos ?? 0) <= r.max
        ).length;
        return { name: r.name, value: count, color: r.color };
      })
      .filter((x) => x.value > 0);
  }, [empresas]);

  const computedStats: Stat[] = useMemo(
    () => [
      {
        name: "Total Empresas",
        value: refreshing ? (
          <span className="inline-flex items-center gap-2">
            <LoadingOutlined /> Cargando…
          </span>
        ) : (
          formatNumber(statsTotales.totalEmpresas)
        ),
        icon: <BuildOutlined className="text-blue-700 text-xl" />,
        change: "Empresas registradas",
        onRefresh: () => fetchEmpresas(true),
      },
      {
        name: "Solicitantes Activos",
        value: refreshing ? (
          <span className="inline-flex items-center gap-2">
            <LoadingOutlined /> Cargando…
          </span>
        ) : (
          formatNumber(statsTotales.totalSolicitantes)
        ),
        icon: <TeamOutlined className="text-green-700 text-xl" />,
        change: "Total de usuarios",
      },
      {
        name: "Equipos Registrados",
        value: refreshing ? (
          <span className="inline-flex items-center gap-2">
            <LoadingOutlined /> Cargando…
          </span>
        ) : (
          formatNumber(statsTotales.totalEquipos)
        ),
        icon: <LaptopOutlined className="text-purple-700 text-xl" />,
        change: "Dispositivos en inventario",
      },
      {
        name: "Tickets Totales",
        value: refreshing ? (
          <span className="inline-flex items-center gap-2">
            <LoadingOutlined /> Cargando…
          </span>
        ) : (
          formatNumber(
            Object.values(ticketsPorEmpresa).reduce((a, b) => a + b, 0)
          )
        ),
        icon: <WarningOutlined className="text-red-700 text-xl" />,
        change: "Tickets históricos",
      },
    ],
    [statsTotales, ticketsPorEmpresa, refreshing]
  );

  const filteredEmpresas = useMemo(() => {
    const q = searchDebounced.trim().toLowerCase();
    if (!q) return empresas;
    return empresas.filter(
      (e) =>
        e.nombre.toLowerCase().includes(q) ||
        (e.detalleEmpresa?.email ?? "").toLowerCase().includes(q)
    );
  }, [empresas, searchDebounced]);

  /* ====== Abrir modal y cargar detalles de /equipos y /visitas ====== */
  const openDetails = async (empresa: Empresa) => {
    setEmpresaSel({
      id_empresa: empresa.id_empresa,
      nombre: empresa.nombre,
      detalleEmpresa: empresa.detalleEmpresa,
    });
    setSolicitantesSel(
      (empresa.solicitantes ?? []).map((s) => ({
        id_solicitante: s.id_solicitante,
        nombre: s.nombre,
        email: s.email,
        equipos: (s.equipos ?? []).map((eq) => ({ id_equipo: eq.id_equipo })),
      }))
    );
    setEquiposSel([]); // se reemplaza con lo del API
    setVisitasSel([]); // se reemplaza con lo del API
    setDetailsError(null);
    setDetailsLoading(true);
    setDetailsOpen(true);

    const token = localStorage.getItem("accessToken") ?? "";
    const baseHeaders: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    try {
      // Equipos por empresa
      const eqRes = await fetch(
        `${API_URL}/equipos${qs({ empresaId: empresa.id_empresa })}`,
        {
          headers: baseHeaders,
          credentials: "include",
        }
      );
      if (eqRes.ok) {
        const eqJson: {
          data?: EquipoLite[];
          rows?: EquipoLite[];
          items?: EquipoLite[];
        } = await eqRes.json();
        setEquiposSel(eqJson.data ?? eqJson.rows ?? eqJson.items ?? []);
      }

      // Visitas por empresa
      const vRes = await fetch(
        `${API_URL}/visitas${qs({ empresaId: empresa.id_empresa })}`,
        {
          headers: baseHeaders,
          credentials: "include",
        }
      );
      if (vRes.ok) {
        // puede venir como {page,...items} o como {data/rows}
        const contentType = vRes.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const vJson: {
            data?: Visita[];
            rows?: Visita[];
            items?: Visita[];
          } = await vRes.json();
          setVisitasSel(vJson.data ?? vJson.rows ?? vJson.items ?? []);
        } else {
          // fallback raro (texto)
          const text = await vRes.text();
          try {
            const parsed = JSON.parse(text) as {
              data?: Visita[];
              rows?: Visita[];
              items?: Visita[];
            };
            setVisitasSel(parsed.data ?? parsed.rows ?? parsed.items ?? []);
          } catch {
            setVisitasSel([]);
          }
        }
      } else {
        setDetailsError(`No se pudieron cargar visitas (HTTP ${vRes.status})`);
      }
    } catch {
      setDetailsError("No se pudo obtener el detalle desde el API.");
    } finally {
      setDetailsLoading(false);
    }
  };

  /* ====================== Render ====================== */
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-cyan-50 to-white">
        <Header />
        <div className="p-6 flex justify-center items-center h-64">
          <div className="text-lg flex items-center gap-2 text-slate-600">
            <LoadingOutlined /> Cargando empresas...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-cyan-50 to-white">
        <Header />
        <div className="p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <strong>Error:</strong> {error}
            <button
              onClick={() => fetchEmpresas()}
              className="ml-4 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-cyan-50 to-white">
      <Header />

      <main className="flex-1 p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl font-extrabold text-slate-800">
            Dashboard de Empresas
          </h1>
          <p className="mt-2 text-slate-600">
            Análisis y estadísticas de todas las empresas.
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex gap-2 mb-8 bg-white rounded-xl p-1 shadow-md inline-flex mt-6"
        >
          {["overview", "companies"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as "overview" | "companies")}
              className={`px-6 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${
                activeTab === tab
                  ? "bg-cyan-700 text-white shadow-md"
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"
              }`}
            >
              {tab === "overview" ? "Resumen" : "Empresas"}
            </button>
          ))}
        </motion.div>

        {/* === OVERVIEW === */}
        {activeTab === "overview" && (
          <>
            {/* Cards */}
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
                  <div className="flex items-start justify-between">
                    <div className="text-slate-600 font-medium">
                      {stat.name}
                    </div>
                    <div className="flex items-center gap-2">
                      {stat.icon}
                      {isRefreshableStat(stat) && (
                        <button
                          onClick={stat.onRefresh}
                          className="ml-1 rounded-lg border border-blue-200 text-blue-700 px-2 py-1 text-xs hover:bg-blue-50"
                          title="Actualizar"
                        >
                          <ReloadOutlined />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 text-3xl font-bold text-slate-800">
                    {stat.value}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    {stat.change}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Tickets por empresa */}
              <motion.div
                className="bg-white rounded-xl shadow-md p-6 border border-slate-100"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <BarChartOutlined className="text-blue-700" />
                    Tickets por Empresa (Top 8)
                  </h2>
                  <button
                    onClick={() => fetchEmpresas(true)}
                    className="inline-flex items-center gap-2 rounded-lg border border-blue-200 text-blue-700 px-3 py-1.5 text-xs hover:bg-blue-50"
                    title="Actualizar"
                  >
                    <ReloadOutlined /> Refrescar
                  </button>
                </div>
                <div className="h-72">
                  {Object.keys(ticketsPorEmpresa).length === 0 ? (
                    <div className="h-full flex items-center justify-center text-neutral-400">
                      No hay datos de tickets para mostrar
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={Object.entries(ticketsPorEmpresa)
                          .map(([name, value]) => ({
                            name:
                              name.length > 12
                                ? name.slice(0, 12) + "..."
                                : name,
                            value,
                          }))
                          .sort((a, b) => b.value - a.value)
                          .slice(0, 8)}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 12, fill: "#374151" }}
                          interval={0}
                          height={50}
                          angle={-45}
                          textAnchor="end"
                        />
                        <YAxis allowDecimals={false} tick={{ fill: "#374151" }} />
                        <Tooltip content={(props) => <CustomBarTooltip {...props} />} />
                        <Bar dataKey="value">
                          {Array.from({ length: 8 }).map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={DARK_PALETTE[index % DARK_PALETTE.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </motion.div>

              {/* Equipos por empresa */}
              <motion.div
                className="bg-white rounded-xl shadow-md p-6 border border-slate-100"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <LaptopOutlined className="text-green-700" />
                    Equipos por Empresa (Top 8)
                  </h2>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={equiposPorEmpresa}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: "#374151" }}
                        interval={0}
                        height={50}
                        angle={-45}
                        textAnchor="end"
                      />
                      <YAxis allowDecimals={false} tick={{ fill: "#374151" }} />
                      <Tooltip content={(props) => <CustomBarTooltip {...props} />} />
                      <Bar dataKey="equipos">
                        {equiposPorEmpresa.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              DARK_PALETTE[(index + 3) % DARK_PALETTE.length]
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Distribución por tamaño */}
              <motion.div
                className="bg-white rounded-xl shadow-md p-6 border border-slate-100"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-800">
                    <span className="inline-flex items-center gap-2">
                      <PieChartOutlined className="text-purple-700" />
                      Distribución por Tamaño
                    </span>
                  </h2>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distribucionTamanioEmpresas}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderPieLabel}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {distribucionTamanioEmpresas.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={(props) => <CustomPieTooltip {...props} />}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* Más solicitantes */}
              <motion.div
                className="bg-white rounded-xl shadow-md p-6 border border-slate-100"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-800">
                    <span className="inline-flex items-center gap-2">
                      <TeamOutlined className="text-blue-700" />
                      Empresas con Más Solicitantes
                    </span>
                  </h2>
                </div>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={solicitantesPorEmpresa}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: "#374151" }}
                        interval={0}
                        height={50}
                        angle={-45}
                        textAnchor="end"
                      />
                      <YAxis allowDecimals={false} tick={{ fill: "#374151" }} />
                      <Tooltip content={(props) => <CustomBarTooltip {...props} />} />
                      <Bar dataKey="solicitantes">
                        {solicitantesPorEmpresa.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              DARK_PALETTE[(index + 6) % DARK_PALETTE.length]
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            </div>
          </>
        )}

        {/* === COMPANIES === */}
        {activeTab === "companies" && (
          <motion.div
            className="bg-white rounded-xl shadow-md p-6 border border-slate-100"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-800">
                Lista de Empresas
              </h2>
              <div className="flex gap-3">
                <div className="relative">
                  <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar empresas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 w-64"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {filteredEmpresas.length === 0 ? (
                <div className="h-32 flex flex-col items-center justify-center text-neutral-400">
                  <div className="text-2xl mb-2">🏢</div>
                  <div>
                    No se encontraron empresas que coincidan con la búsqueda
                  </div>
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
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-300">
                        <BuildOutlined className="text-blue-700" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors duration-300">
                          {empresa.nombre}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {empresa.estadisticas.totalSolicitantes} solicitantes
                          • {empresa.estadisticas.totalEquipos} equipos
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            empresa.estadisticas.totalTickets > 10
                              ? "bg-orange-100 text-orange-800"
                              : empresa.estadisticas.totalTickets > 0
                              ? "bg-green-100 text-green-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {empresa.estadisticas.totalTickets} tickets
                        </span>
                      </div>
                      <button
                        onClick={() => openDetails(empresa)}
                        className="text-blue-700 hover:text-blue-900 font-medium group-hover:translate-x-1 transition-transform duration-300"
                      >
                        Ver detalles →
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </main>

      {/* Modal Detalles */}
      <EmpresaDetailsModal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        loading={detailsLoading}
        error={detailsError}
        empresa={empresaSel}
        solicitantes={solicitantesSel}
        equipos={equiposSel}
        visitas={visitasSel}
      />
    </div>
  );
};

export default EmpresasPage;
