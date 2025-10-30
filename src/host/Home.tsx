import { useEffect, useMemo, useState, type FC, type ReactNode } from "react";
import Header from "../components/Header";
import {
  UserOutlined,
  LaptopOutlined,
  SafetyCertificateOutlined,
  LoadingOutlined,
  ReloadOutlined,
  CalendarOutlined,
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
} from "recharts";
import axios, { AxiosError } from "axios";

/* =================== Config =================== */
const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

/* =================== Axios client =================== */
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
  },
});

// Interceptor para inyectar Bearer cuando exista
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  // anti-cache param
  config.params = { ...(config.params || {}), _ts: Date.now() };
  return config;
});

const toErrorMessage = (e: unknown, fallback = "Error desconocido") => {
  const ax = e as AxiosError<{ error?: string } | string>;
  if (ax?.response?.data) {
    if (typeof ax.response.data === "string") return ax.response.data || fallback;
    if (typeof ax.response.data === "object") return ax.response.data.error || fallback;
  }
  return ax?.message || fallback;
};

/* =================== Helpers =================== */
const NF_CL = new Intl.NumberFormat("es-CL");
function formatNumber(n?: number | null) {
  return typeof n === "number" ? NF_CL.format(n) : "—";
}

function getCurrentMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const from = new Date(y, m, 1);
  const to = new Date(y, m + 1, 1);
  const toIsoDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  return { from: toIsoDate(from), to: toIsoDate(to) };
}

/* =================== Tipos =================== */
type PagedTotal = { total: number };

type VisitaEmpresaBreakdown = {
  empresaId: number;
  empresa: string;
  cantidad: number;
};

type VisitaMetricRow = {
  tecnicoId: number;
  tecnico: string;
  cantidad: number;
  empresas?: VisitaEmpresaBreakdown[];
};

type VisitasMetrics = {
  total: number;
  porTecnico: VisitaMetricRow[];
};

type StatBase = {
  name: string;
  value: ReactNode;
  icon: ReactNode;
  change: ReactNode;
};
type RefreshableStat = StatBase & { onRefresh: () => void; isLoading: boolean };
type Stat = StatBase | RefreshableStat;
function isRefreshableStat(s: Stat): s is RefreshableStat {
  return "onRefresh" in s && typeof (s as RefreshableStat).onRefresh === "function";
}

/* ===== Colores determinísticos por técnico ===== */
const PALETTE = [
  "#06b6d4", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444",
  "#a855f7", "#14b8a6", "#f97316", "#3b82f6", "#84cc16",
];
function hashToIndex(idOrText: number | string) {
  const s = String(idOrText);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % PALETTE.length;
}
function colorForTech(id: number, name: string) {
  return PALETTE[hashToIndex(`${id}-${name}`)];
}

/* ===== Tooltip personalizado ===== */
type TooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ value: number; payload: VisitaMetricRow }>;
};
const CustomTooltip: FC<TooltipProps> = ({ active, label, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload as VisitaMetricRow;
  const empresas = (row.empresas ?? [])
    .filter((e) => (e?.cantidad ?? 0) > 0)
    .sort((a, b) => b.cantidad - a.cantidad);

  return (
    <div className="rounded-xl border border-cyan-100 bg-white/95 shadow-md p-3">
      <div className="text-sm font-semibold text-cyan-900">
        Técnico: <span className="font-bold">{label}</span>
      </div>
      <div className="text-sm text-neutral-700">Total visitas: <b>{row.cantidad}</b></div>
      {empresas.length > 0 ? (
        <div className="mt-2 text-xs">
          <div className="mb-1 font-medium text-neutral-600">Por empresa</div>
          <ul className="space-y-1">
            {empresas.slice(0, 8).map((e) => (
              <li key={e.empresaId} className="flex items-center justify-between gap-4">
                <span className="truncate text-neutral-700">{e.empresa}</span>
                <span className="font-semibold text-neutral-900">{e.cantidad}</span>
              </li>
            ))}
            {empresas.length > 8 && (
              <li className="text-[11px] text-neutral-500 mt-1">+{empresas.length - 8} empresas más…</li>
            )}
          </ul>
        </div>
      ) : (
        <div className="mt-2 text-xs text-neutral-500">Sin desglose por empresa.</div>
      )}
    </div>
  );
};

/* ===== Hooks para breakpoint y truncado ===== */
type LegacyMQL = MediaQueryList & {
  addListener?: (listener: (e: MediaQueryListEvent) => void) => void;
  removeListener?: (listener: (e: MediaQueryListEvent) => void) => void;
};

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mql: MediaQueryList = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);

    // Suscribir (API moderna con fallback)
    if ("addEventListener" in mql) {
      mql.addEventListener("change", onChange);
    } else if ("addListener" in mql) {
      (mql as LegacyMQL).addListener?.(onChange);
    }

    // Estado inicial
    setMatches(mql.matches);

    // Cleanup
    return () => {
      if ("removeEventListener" in mql) {
        mql.removeEventListener("change", onChange);
      } else if ("removeListener" in mql) {
        (mql as LegacyMQL).removeListener?.(onChange);
      }
    };
  }, [query]);

  return matches;
}

function truncate(value: string, max: number) {
  if (!value) return "";
  return value.length <= max ? value : value.slice(0, Math.max(0, max - 1)) + "…";
}

/** Tick del XAxis que trunca por breakpoint */
const ResponsiveTick: FC<{
  x?: number;
  y?: number;
  payload?: { value: string };
  isMobile: boolean;
  isTablet: boolean;
}> = ({ x = 0, y = 0, payload, isMobile, isTablet }) => {
  const full = payload?.value ?? "";
  const max = isMobile ? 7 : isTablet ? 10 : 16;
  const text = truncate(full, max);
  const fontSize = isMobile ? 10 : isTablet ? 11 : 12;
  const dy = isMobile ? 10 : 12;
  return (
    <g transform={`translate(${x},${y})`}>
      <text dy={dy} textAnchor="middle" fontSize={fontSize} fill="#334155" style={{ pointerEvents: "none" }}>
        {text}
      </text>
    </g>
  );
};

/* =================== Page =================== */
const Home: FC = () => {
  // total solicitantes
  const [totalSolicitantes, setTotalSolicitantes] = useState<number | null>(null);
  const [loadingSol, setLoadingSol] = useState<boolean>(false);
  const [errorSol, setErrorSol] = useState<string | null>(null);

  // total equipos
  const [totalEquipos, setTotalEquipos] = useState<number | null>(null);
  const [loadingEq, setLoadingEq] = useState<boolean>(false);
  const [errorEq, setErrorEq] = useState<string | null>(null);

  // visitas
  const dateRange = useMemo(getCurrentMonthRange, []);
  const { from, to } = dateRange;
  const [visitasTotal, setVisitasTotal] = useState<number | null>(null);
  const [visitasByTech, setVisitasByTech] = useState<VisitaMetricRow[]>([]);
  const [loadingVis, setLoadingVis] = useState<boolean>(false);
  const [errorVis, setErrorVis] = useState<string | null>(null);

  // tickets
  const [totalTickets, setTotalTickets] = useState<number | null>(null);
  const [loadingTic, setLoadingTic] = useState<boolean>(false);
  const [errorTic, setErrorTic] = useState<string | null>(null);

  // breakpoints
  const isMobile = useMediaQuery("(max-width: 640px)");
  const isTablet = useMediaQuery("(min-width: 641px) and (max-width: 1024px)");

  /* ===== helper: fetch sólo total con axios ===== */
  const fetchTotal = async (
    path: "/solicitantes" | "/equipos" | "/tickets",
    setter: (n: number | null) => void,
    setLoading: (b: boolean) => void,
    setError: (s: string | null) => void,
    signal?: AbortSignal
  ) => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get<PagedTotal>(`${path}`, {
        params: { page: 1, pageSize: 1 },
        signal,
      });
      setter(data.total ?? 0);
    } catch (e) {
      if ((e as Error).name === "CanceledError" || (e as Error).name === "AbortError") return;
      setError(toErrorMessage(e, `Error al cargar ${path.slice(1)}`));
      setter(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchTotalSolicitantes = (signal?: AbortSignal) =>
    fetchTotal("/solicitantes", setTotalSolicitantes, setLoadingSol, setErrorSol, signal);

  const fetchTotalEquipos = (signal?: AbortSignal) =>
    fetchTotal("/equipos", setTotalEquipos, setLoadingEq, setErrorEq, signal);

  const fetchTotalTickets = (signal?: AbortSignal) =>
    fetchTotal("/tickets", setTotalTickets, setLoadingTic, setErrorTic, signal);

  /* ===== métricas de visitas con axios ===== */
  const fetchVisitasMetrics = async (signal?: AbortSignal) => {
    try {
      setLoadingVis(true);
      setErrorVis(null);
      const { data } = await api.get<VisitasMetrics>(`/visitas/metrics`, {
        params: { from, to },
        signal,
      });
      const rows = (data.porTecnico ?? [])
        .map((r) => ({
          ...r,
          empresas: (r.empresas ?? [])
            .filter((e) => (e?.cantidad ?? 0) > 0)
            .sort((a, b) => b.cantidad - a.cantidad),
        }))
        .sort((a, b) => b.cantidad - a.cantidad);
      setVisitasTotal(data.total ?? 0);
      setVisitasByTech(rows);
    } catch (e) {
      if ((e as Error).name === "CanceledError" || (e as Error).name === "AbortError") return;
      setErrorVis(toErrorMessage(e, "Error al cargar visitas"));
      setVisitasTotal(null);
      setVisitasByTech([]);
    } finally {
      setLoadingVis(false);
    }
  };

  useEffect(() => {
    const c1 = new AbortController();
    const c2 = new AbortController();
    const c3 = new AbortController();
    const c4 = new AbortController();

    fetchTotalSolicitantes(c1.signal);
    fetchTotalEquipos(c2.signal);
    fetchVisitasMetrics(c3.signal);
    fetchTotalTickets(c4.signal);

    return () => {
      c1.abort();
      c2.abort();
      c3.abort();
      c4.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===== estadísticas ===== */
  const computedStats: Stat[] = useMemo(
    () => [
      {
        name: "Usuarios Activos",
        value: loadingSol ? (
          <span className="inline-flex items-center gap-2">
            <LoadingOutlined /> Cargando…
          </span>
        ) : (
          formatNumber(totalSolicitantes)
        ),
        icon: <UserOutlined className="text-cyan-600 text-xl" />,
        change: errorSol ? <span className="text-red-600">Error: {errorSol}</span> : "Total de solicitantes",
        onRefresh: () => fetchTotalSolicitantes(),
        isLoading: loadingSol,
      },
      {
        name: "Equipos Registrados",
        value: loadingEq ? (
          <span className="inline-flex items-center gap-2">
            <LoadingOutlined /> Cargando…
          </span>
        ) : (
          formatNumber(totalEquipos)
        ),
        icon: <LaptopOutlined className="text-cyan-600 text-xl" />,
        change: errorEq ? <span className="text-red-600">Error: {errorEq}</span> : "Total de dispositivos",
        onRefresh: () => fetchTotalEquipos(),
        isLoading: loadingEq,
      },
      {
        name: "Visitas del mes",
        value: loadingVis ? (
          <span className="inline-flex items-center gap-2">
            <LoadingOutlined /> Cargando…
          </span>
        ) : (
          formatNumber(visitasTotal)
        ),
        icon: <CalendarOutlined className="text-cyan-600 text-xl" />,
        change: errorVis ? (
          <span className="text-red-600">Error: {errorVis}</span>
        ) : (
          <>
            Mes actual{" "}
            <span className="text-xs text-neutral-500">
              ({from} → {to})
            </span>
          </>
        ),
        onRefresh: () => fetchVisitasMetrics(),
        isLoading: loadingVis,
      },
      {
        name: "Total de Incidencias",
        value: loadingTic ? (
          <span className="inline-flex items-center gap-2">
            <LoadingOutlined /> Cargando…
          </span>
        ) : (
          formatNumber(totalTickets)
        ),
        icon: <SafetyCertificateOutlined className="text-cyan-600 text-xl" />,
        change: errorTic ? <span className="text-red-600">Error: {errorTic}</span> : <>Todos los tickets registrados</>,
        onRefresh: () => fetchTotalTickets(),
        isLoading: loadingTic,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      loadingSol,
      totalSolicitantes,
      errorSol,
      loadingEq,
      totalEquipos,
      errorEq,
      loadingVis,
      visitasTotal,
      errorVis,
      from,
      to,
      loadingTic,
      totalTickets,
      errorTic,
    ]
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-cyan-50 to-white">
      <Header />

      <main className="flex-1 p-4 sm:p-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800">Dashboard de Estadísticas</h1>
          <p className="mt-2 text-slate-600">Resumen general de la actividad y soporte de RIDS.</p>
        </motion.div>

        {/* Cards */}
        <div className="mt-6 grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {computedStats.map((stat, idx) => (
            <motion.div
              key={stat.name}
              className="bg-white rounded-xl shadow-md p-4 sm:p-5 border border-slate-100 relative overflow-hidden"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              whileHover={{ scale: 1.03, boxShadow: "0 12px 24px rgba(0,0,0,.12)" }}
            >
              <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-cyan-100/40 blur-2xl" />
              <div className="flex items-start justify-between">
                <div className="text-slate-600 font-medium">{stat.name}</div>
                <div className="flex items-center gap-2">
                  {stat.icon}
                  {isRefreshableStat(stat) && (
                    <button
                      onClick={stat.onRefresh}
                      className={`ml-1 rounded-full p-1.5 transition text-cyan-700 hover:bg-cyan-100 disabled:opacity-50 disabled:cursor-not-allowed ${
                        stat.isLoading ? "animate-spin" : ""
                      }`}
                      title="Actualizar"
                      aria-label={`Actualizar ${stat.name}`}
                      disabled={stat.isLoading}
                    >
                      <ReloadOutlined className="text-sm" />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-3 text-2xl sm:text-3xl font-bold text-slate-800">{stat.value}</div>
              <div className="text-sm text-slate-500 mt-1">{stat.change}</div>
            </motion.div>
          ))}
        </div>

        {/* Gráfico */}
        <motion.div
          className="mt-8 sm:mt-10 bg-white rounded-xl shadow-md p-4 sm:p-6 border border-slate-100"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-800">Visitas del mes por técnico</h2>
            <button
              onClick={() => fetchVisitasMetrics()}
              className={`inline-flex items-center gap-2 rounded-lg border border-cyan-200 text-cyan-700 px-3 py-1.5 text-xs hover:bg-cyan-50 disabled:opacity-50 disabled:cursor-not-allowed ${
                loadingVis ? "animate-spin" : ""
              }`}
              title="Actualizar"
              aria-label="Actualizar visitas"
              disabled={loadingVis}
            >
              {loadingVis ? <LoadingOutlined /> : <ReloadOutlined />} Refrescar
            </button>
          </div>

        <div className="h-64 sm:h-72">
          {loadingVis ? (
            <div className="h-full flex items-center justify-center text-neutral-500" role="status" aria-live="polite">
              <LoadingOutlined /> &nbsp; Cargando…
            </div>
          ) : visitasByTech.length === 0 ? (
            <div className="h-full flex items-center justify-center text-neutral-400">
              No hay visitas registradas en el rango ({from} → {to})
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={visitasByTech}
                margin={{ top: 8, right: 8, left: 8, bottom: isMobile ? 24 : 12 }}
                barCategoryGap={isMobile ? "20%" : "10%"}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="tecnico"
                  height={isMobile ? 54 : 46}
                  interval={isMobile ? "preserveStartEnd" : 0}
                  minTickGap={isMobile ? 4 : 8}
                  tickMargin={isMobile ? 6 : 10}
                  tick={(props) => <ResponsiveTick {...props} isMobile={isMobile} isTablet={isTablet} />}
                />
                <YAxis allowDecimals={false} />
                <Tooltip content={(props) => <CustomTooltip {...props} />} />
                <Bar dataKey="cantidad">
                  {visitasByTech.map((row) => (
                    <Cell key={row.tecnicoId} fill={colorForTech(row.tecnicoId, row.tecnico)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

          <div className="mt-2 text-xs text-neutral-500">
            Rango: <span className="font-medium">{from}</span> a <span className="font-medium">{to}</span>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Home;
