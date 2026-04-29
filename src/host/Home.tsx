// Página principal del host, mostrando un dashboard con estadísticas generales, gráficos de distribución y alertas rápidas basadas solo en las visitas del mes. Se incluyen tarjetas para cada métrica clave como total de solicitantes, equipos registrados, visitas del mes y total de incidencias, con la posibilidad de refrescar cada una individualmente. También se muestran alertas para técnicos sobre el promedio y con baja actividad, y un gráfico detallado de visitas por técnico con tooltip personalizado que muestra el desglose por empresa. La página se adapta a diferentes tamaños de pantalla y utiliza animaciones suaves para mejorar la experiencia del usuario.
import { useEffect, useMemo, useState, type FC, type ReactNode } from "react";
import {
  UserOutlined,
  LaptopOutlined,
  SafetyCertificateOutlined,
  LoadingOutlined,
  ReloadOutlined,
  CalendarOutlined,
  TrophyOutlined,
  TeamOutlined,
  RiseOutlined,
  WarningOutlined,
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

function formatMinutes(min: number | null | undefined): string {
  if (min == null) return "—";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
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

type TecnicoMetric = {
  tecnicoId: number;
  nombre: string;
  email?: string;
  assignedTickets: number;
  openTickets: number;
  pendingTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  reopenedTickets: number;
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
  firstResponse: {
    ok: number;
    breached: number;
    pending: number;
    total: number;
    compliance: number;
  };
  resolution: {
    ok: number;
    breached: number;
    pending: number;
    total: number;
    compliance: number;
  };
};

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

/* ===== Tooltip personalizado barras ===== */
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
            {empresas.slice(0, 5).map((e) => (
              <li key={e.empresaId} className="flex items-center justify-between gap-4">
                <span className="truncate text-neutral-700">{e.empresa}</span>
                <span className="font-semibold text-neutral-900">{e.cantidad}</span>
              </li>
            ))}
            {empresas.length > 5 && (
              <li className="mt-1 text-[11px] text-neutral-500">
                +{empresas.length - 5} empresas más…
              </li>
            )}
          </ul>
        </div>
      ) : (
        <div className="mt-2 text-xs text-neutral-500">Sin desglose por empresa.</div>
      )}
    </div>
  );
};

/* ===== Tooltip personalizado pie ===== */
type PieTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: VisitaMetricRow; value: number; name: string }>;
};

const CustomPieTooltip: FC<PieTooltipProps> = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const total = item.payload.cantidad;
  return (
    <div className="rounded-xl border border-cyan-100 bg-white/95 shadow-md p-3">
      <div className="text-sm font-semibold text-cyan-900">{item.name}</div>
      <div className="text-sm text-neutral-700">Visitas: <b>{total}</b></div>
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

    if ("addEventListener" in mql) {
      mql.addEventListener("change", onChange);
    } else if ("addListener" in mql) {
      (mql as LegacyMQL).addListener?.(onChange);
    }

    setMatches(mql.matches);

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

  const [tecnicosMetrics, setTecnicosMetrics] = useState<TecnicoMetric[]>([]);
  const [loadingTecnicosMetrics, setLoadingTecnicosMetrics] = useState(false);
  const [errorTecnicosMetrics, setErrorTecnicosMetrics] = useState<string | null>(null);

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

  // Funciones para cargar cada métrica individualmente, con manejo de loading y error. Se pueden llamar al montar el componente y también al refrescar cada tarjeta.
  const fetchTotalSolicitantes = (signal?: AbortSignal) =>
    fetchTotal("/solicitantes", setTotalSolicitantes, setLoadingSol, setErrorSol, signal);

  const fetchTotalEquipos = (signal?: AbortSignal) =>
    fetchTotal("/equipos", setTotalEquipos, setLoadingEq, setErrorEq, signal);

  const fetchTotalTickets = async (signal?: AbortSignal) => {
    try {
      setLoadingTic(true);
      setErrorTic(null);

      const { data } = await api.get("/helpdesk/tickets/home-summary", {
        params: {
          from,
          to,
        },
        signal,
      });

      if (data?.ok) {
        setTotalTickets(data.data.recibidos ?? 0);
      } else {
        setTotalTickets(0);
      }
    } catch (e) {
      if (
        (e as Error).name === "CanceledError" ||
        (e as Error).name === "AbortError"
      ) {
        return;
      }

      setErrorTic(toErrorMessage(e, "Error al cargar resumen de tickets"));
      setTotalTickets(null);
    } finally {
      setLoadingTic(false);
    }
  };

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

  const fetchTecnicosMetrics = async (signal?: AbortSignal) => {
    try {
      setLoadingTecnicosMetrics(true);
      setErrorTecnicosMetrics(null);

      const { data } = await api.get("/helpdesk/tickets/tecnicos/metrics", {
        params: { from, to },
        signal,
      });

      if (data?.ok) {
        const rows = [...(data.data ?? [])].sort(
          (a, b) => Number(b.closedTickets || 0) - Number(a.closedTickets || 0)
        );
        setTecnicosMetrics(rows);
      } else {
        setTecnicosMetrics([]);
      }
    } catch (e) {
      if ((e as Error).name === "CanceledError" || (e as Error).name === "AbortError") return;
      setErrorTecnicosMetrics(toErrorMessage(e, "Error al cargar métricas de técnicos"));
      setTecnicosMetrics([]);
    } finally {
      setLoadingTecnicosMetrics(false);
    }
  };

  // Al montar el componente, se cargan todas las métricas en paralelo utilizando AbortController para poder cancelar las solicitudes si el componente se desmonta antes de que terminen.
  useEffect(() => {
    const c1 = new AbortController();
    const c2 = new AbortController();
    const c3 = new AbortController();
    const c4 = new AbortController();

    const c5 = new AbortController();
    fetchTecnicosMetrics(c5.signal);

    fetchTotalSolicitantes(c1.signal);
    fetchTotalEquipos(c2.signal);
    fetchVisitasMetrics(c3.signal);
    fetchTotalTickets(c4.signal);

    return () => {
      c1.abort();
      c2.abort();
      c3.abort();
      c4.abort();
      c5.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===== NUEVAS MÉTRICAS SOLO CON VISITAS ===== */
  const topTecnico = useMemo(() => {
    if (!visitasByTech.length) return null;
    return [...visitasByTech].sort((a, b) => b.cantidad - a.cantidad)[0];
  }, [visitasByTech]);


  const topTecnicosHelpdesk = useMemo(() => {
    return [...tecnicosMetrics]
      .sort((a, b) => b.closedTickets - a.closedTickets)
      .slice(0, 5);
  }, [tecnicosMetrics]);

  const ticketsResueltosMes = useMemo(() => {
    return tecnicosMetrics.reduce(
      (acc, t) => acc + Number(t.resolvedTickets || 0),
      0
    );
  }, [tecnicosMetrics]);

  const ticketsCerradosMes = useMemo(() => {
    return tecnicosMetrics.reduce(
      (acc, t) => acc + Number(t.closedTickets || 0),
      0
    );
  }, [tecnicosMetrics]);

  const topTecnicoTickets = useMemo(() => {
    if (!tecnicosMetrics.length) return null;

    return [...tecnicosMetrics]
      .sort((a, b) => Number(b.closedTickets || 0) - Number(a.closedTickets || 0))[0];
  }, [tecnicosMetrics]);

  const slaCierrePromedio = useMemo(() => {
    if (!tecnicosMetrics.length) return null;

    const rows = tecnicosMetrics.filter(
      (t) => typeof t.resolution?.compliance === "number"
    );

    if (!rows.length) return null;

    const total = rows.reduce(
      (acc, t) => acc + Number(t.resolution.compliance || 0),
      0
    );

    return Math.round(total / rows.length);
  }, [tecnicosMetrics]);

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
        name: "Tickets recibidos",
        value: loadingTic ? (
          <span className="inline-flex items-center gap-2">
            <LoadingOutlined /> Cargando…
          </span>
        ) : (
          formatNumber(totalTickets)
        ),
        icon: <SafetyCertificateOutlined className="text-cyan-600 text-xl" />,
        change: errorTic ? (
          <span className="text-red-600">Error: {errorTic}</span>
        ) : (
          <>
            Recibidos en el mes{" "}
            <span className="text-xs text-neutral-500">
              ({from} → {to})
            </span>
          </>
        ),
        onRefresh: () => fetchTotalTickets(),
        isLoading: loadingTic,
      },

      /* ===== NUEVAS CARDS ===== */
      {
        name: "Top técnico visitas",
        value: loadingVis ? (
          <span className="inline-flex items-center gap-2">
            <LoadingOutlined /> Cargando…
          </span>
        ) : topTecnico ? (
          topTecnico.tecnico
        ) : (
          "—"
        ),
        icon: <TrophyOutlined className="text-amber-500 text-xl" />,
        change: topTecnico ? `${formatNumber(topTecnico.cantidad)} visitas` : "Sin datos",
        onRefresh: () => fetchVisitasMetrics(),
        isLoading: loadingVis,
      },
      {
        name: "Top técnico tickets",
        value: loadingTecnicosMetrics ? (
          <span className="inline-flex items-center gap-2">
            <LoadingOutlined /> Cargando…
          </span>
        ) : topTecnicoTickets ? (
          topTecnicoTickets.nombre
        ) : (
          "—"
        ),
        icon: <TrophyOutlined className="text-indigo-600 text-xl" />,
        change: topTecnicoTickets
          ? `${formatNumber(topTecnicoTickets.closedTickets)} tickets cerrados`
          : "Sin datos",
        onRefresh: () => fetchTecnicosMetrics(),
        isLoading: loadingTecnicosMetrics,
      },
      {
        name: "Tickets cerrados",
        value: loadingTecnicosMetrics ? (
          <span className="inline-flex items-center gap-2">
            <LoadingOutlined /> Cargando…
          </span>
        ) : (
          formatNumber(ticketsCerradosMes)
        ),
        icon: <TrophyOutlined className="text-amber-500 text-xl" />,
        change: errorTecnicosMetrics ? (
          <span className="text-red-600">Error: {errorTecnicosMetrics}</span>
        ) : (
          "Cerrados en el mes"
        ),
        onRefresh: () => fetchTecnicosMetrics(),
        isLoading: loadingTecnicosMetrics,
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

      loadingTecnicosMetrics,
      errorTecnicosMetrics,
      ticketsResueltosMes,
      ticketsCerradosMes,
      topTecnicoTickets,
      slaCierrePromedio,
    ]
  );

  // Renderizamos el dashboard principal con las estadísticas generales, los gráficos de distribución y la lista de empresas. Incluimos animaciones suaves al cargar los datos y al interactuar con los elementos. También mostramos botones para refrescar los datos y crear nuevas empresas, y adaptamos la información mostrada según el rol del usuario (cliente o admin).
  return (
    <div className="mx-auto w-full max-w-screen-2xl px-3 py-4 sm:px-6 lg:px-8">
      <div className="space-y-5 sm:space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-1"
        >
          <h1 className="text-lg sm:text-2xl font-extrabold leading-tight text-slate-800">
            Dashboard de Estadísticas
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Resumen general de la actividad y soporte de RIDS.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
          {computedStats.map((stat, idx) => (
            <motion.div
              key={stat.name}
              className="bg-white rounded-xl shadow-md p-3 sm:p-4 border border-slate-100 relative overflow-hidden"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: idx * 0.08 }}
              whileHover={{ scale: 1.03, boxShadow: "0 12px 24px rgba(0,0,0,.12)" }}
            >
              <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-cyan-100/40 blur-2xl" />
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-600 sm:text-base">
                    {stat.name}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {stat.icon}
                  {isRefreshableStat(stat) && (
                    <button
                      onClick={stat.onRefresh}
                      className={`rounded-full p-1.5 text-cyan-700 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-50 ${stat.isLoading ? "animate-spin" : ""
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
              <div className="mt-2 text-xl font-bold text-slate-800 sm:text-2xl break-words">
                {stat.value}
              </div>
              <div className="mt-1 text-xs text-slate-500 sm:text-sm break-words">
                {stat.change}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Gráfico principal */}
        <motion.div
          className="mt-5 sm:mt-6 bg-white rounded-xl shadow-md p-3 sm:p-4 border border-slate-100"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-800">Visitas del mes por técnico</h2>
            <button
              onClick={() => fetchVisitasMetrics()}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-200 px-3 py-2 text-xs text-cyan-700 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${loadingVis ? "animate-spin" : ""
                }`}
              title="Actualizar"
              aria-label="Actualizar visitas"
              disabled={loadingVis}
            >
              {loadingVis ? <LoadingOutlined /> : <ReloadOutlined />} Refrescar
            </button>
          </div>

          <div className="h-[280px] sm:h-72">
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
        <motion.div
          className="mt-5 sm:mt-6 bg-white rounded-xl shadow-md p-3 sm:p-4 border border-slate-100"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-800">
              Top técnicos por tickets resueltos
            </h2>

            <button
              onClick={() => fetchTecnicosMetrics()}
              className={`inline-flex items-center gap-2 rounded-lg border border-cyan-200 text-cyan-700 px-3 py-1.5 text-xs hover:bg-cyan-50 disabled:opacity-50 disabled:cursor-not-allowed ${loadingTecnicosMetrics ? "animate-spin" : ""
                }`}
              disabled={loadingTecnicosMetrics}
            >
              {loadingTecnicosMetrics ? <LoadingOutlined /> : <ReloadOutlined />} Refrescar
            </button>
          </div>

          {loadingTecnicosMetrics ? (
            <div className="py-10 text-neutral-500 flex items-center justify-center">
              <LoadingOutlined /> &nbsp; Cargando…
            </div>
          ) : errorTecnicosMetrics ? (
            <div className="py-6 text-red-600">{errorTecnicosMetrics}</div>
          ) : topTecnicosHelpdesk.length === 0 ? (
            <div className="py-6 text-neutral-400">No hay métricas de técnicos disponibles.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {topTecnicosHelpdesk.map((t, index) => (
                <div
                  key={t.tecnicoId}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="text-sm text-slate-500">#{index + 1}</div>
                      <div className="text-base font-semibold text-slate-800">{t.nombre}</div>
                      <div className="text-xs text-slate-500">{t.email || "Sin email"}</div>
                    </div>

                    <div className="rounded-full bg-cyan-100 text-cyan-800 text-xs font-semibold px-3 py-1">
                      {t.closedTickets} cerrados
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">SLA 1ra respuesta</span>
                      <span className="font-semibold text-slate-800">
                        {t.firstResponse.compliance}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">SLA cierre</span>
                      <span className="font-semibold text-slate-800">
                        {t.resolution.compliance}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Tiempo prom. 1ra respuesta</span>
                      <span className="font-semibold text-slate-800">
                        {formatMinutes(t.avgFirstResponseMinutes)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Tiempo prom. creación → cierre</span>
                      <span className="font-semibold text-slate-800">
                        {formatMinutes(t.avgResolutionMinutes)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Home;