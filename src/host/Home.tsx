import React, { useEffect, useMemo, useState } from "react";
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

/* =================== Config =================== */
const API_URL =
  (import.meta as ImportMeta).env?.VITE_API_URL || "http://localhost:4000/api";

// ❌ Eliminamos la constante de estado, ya no se usa un filtro
// const TICKET_COUNT_STATUS = 5; 

/* =================== Helpers =================== */

function formatNumber(n?: number | null) {
  if (typeof n !== "number") return "—";
  try {
    return n.toLocaleString("es-CL");
  } catch {
    return String(n);
  }
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

/**
 * Helper genérico para hacer peticiones GET seguras a la API.
 */
async function securedFetch<T>(urlPath: string, signal?: AbortSignal): Promise<T> {
    const url = new URL(`${API_URL}${urlPath}`);
    url.searchParams.set("_ts", String(Date.now())); // No-cache bypass

    const token = localStorage.getItem("accessToken");
    
    const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        cache: "no-store",
        signal,
    });

    if (!res.ok) {
        const errorText = await res.text().catch(() => `HTTP Error ${res.status}`);
        throw new Error(errorText || `HTTP ${res.status}`);
    }

    return res.json() as Promise<T>;
}


/* =================== Tipos =================== */
type ApiList<T> = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: T[]; 
};

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
  value: React.ReactNode;
  icon: React.ReactNode;
  change: React.ReactNode;
};
// Modificamos el tipo para incluir 'isLoading'
type RefreshableStat = StatBase & { onRefresh: () => void; isLoading: boolean }; 
type Stat = StatBase | RefreshableStat;

function isRefreshableStat(s: Stat): s is RefreshableStat {
  return "onRefresh" in s && typeof (s as RefreshableStat).onRefresh === "function";
}

/* ===== Colores determinísticos por técnico ===== */
const PALETTE = [
  "#06b6d4", // cyan-500
  "#0ea5e9", // sky-500
  "#22c55e", // green-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#a855f7", // purple-500
  "#14b8a6", // teal-500
  "#f97316", // orange-500
  "#3b82f6", // blue-500
  "#84cc16", // lime-500
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

/* ===== Tooltip personalizado (con desglose por empresa) ===== */
type TooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: Array<{ value: number; payload: VisitaMetricRow }>;
};

const CustomTooltip: React.FC<TooltipProps> = ({ active, label, payload }) => {
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
      <div className="text-sm text-neutral-700">
        Total visitas: <b>{row.cantidad}</b>
      </div>

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
              <li className="text-[11px] text-neutral-500 mt-1">
                +{empresas.length - 8} empresas más…
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

/* =================== Page =================== */
const Home: React.FC = () => {
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

  // 🔄 Estado renombrado a 'TotalTickets' para reflejar que no hay filtro
  const [totalTickets, setTotalTickets] = useState<number | null>(null);
  const [loadingTic, setLoadingTic] = useState<boolean>(false);
  const [errorTic, setErrorTic] = useState<string | null>(null);


  /* ====== fetch total solicitantes ====== */
  const fetchTotalSolicitantes = async (signal?: AbortSignal) => {
    try {
      setLoadingSol(true);
      setErrorSol(null);

      const data = await securedFetch<ApiList<unknown>>(
        "/solicitantes?page=1&pageSize=1", 
        signal
      );
      setTotalSolicitantes(data.total ?? 0);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setErrorSol((err as Error)?.message || "Error al cargar solicitantes");
      setTotalSolicitantes(null);
    } finally {
      setLoadingSol(false);
    }
  };

  /* ====== fetch total equipos ====== */
  const fetchTotalEquipos = async (signal?: AbortSignal) => {
    try {
      setLoadingEq(true);
      setErrorEq(null);

      const data = await securedFetch<ApiList<unknown>>(
        "/equipos?page=1&pageSize=1", 
        signal
      );
      setTotalEquipos(data.total ?? 0);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setErrorEq((err as Error)?.message || "Error al cargar equipos");
      setTotalEquipos(null);
    } finally {
      setLoadingEq(false);
    }
  };

  /* ====== fetch métricas visitas ====== */
  const fetchVisitasMetrics = async (signal?: AbortSignal) => {
    try {
      setLoadingVis(true);
      setErrorVis(null);

      const data = await securedFetch<VisitasMetrics>(
        `/visitas/metrics?from=${from}&to=${to}`, 
        signal
      );

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
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setErrorVis((err as Error)?.message || "Error al cargar visitas");
      setVisitasTotal(null);
      setVisitasByTech([]);
    } finally {
      setLoadingVis(false);
    }
  };

  /* ====== fetch Total de Todos los Tickets (ACTUALIZADO) ====== */
  const fetchTotalTickets = async (signal?: AbortSignal) => {
    try {
      setLoadingTic(true);
      setErrorTic(null);

      // ✅ SE ELIMINA EL FILTRO DE ESTADO
      const data = await securedFetch<ApiList<unknown>>(
        `/tickets?page=1&pageSize=1`, 
        signal
      );
      
      // 🔄 Usamos el estado totalTickets
      setTotalTickets(data.total ?? 0);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setErrorTic((err as Error)?.message || "Error al cargar tickets");
      setTotalTickets(null);
    } finally {
      setLoadingTic(false);
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
    fetchTotalTickets(c4.signal); // 🔄 Llamamos a la nueva función
    
    return () => {
      c1.abort();
      c2.abort();
      c3.abort();
      c4.abort(); 
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===== estadísticas de las cards (con estados de carga actualizados) ===== */
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
        change: errorSol ? (
          <span className="text-red-600">Error: {errorSol}</span>
        ) : (
          "Total de solicitantes"
        ),
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
        change: errorEq ? (
          <span className="text-red-600">Error: {errorEq}</span>
        ) : (
          "Total de dispositivos"
        ),
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
      // TARJETA DE TOTAL DE TICKETS (ACTUALIZADA)
      {
        // 🔄 Nombre de la tarjeta actualizado
        name: "Total de Incidencias", 
        value: loadingTic ? (
          <span className="inline-flex items-center gap-2">
            <LoadingOutlined /> Cargando…
          </span>
        ) : (
          // 🔄 Usamos el estado totalTickets
          formatNumber(totalTickets)
        ),
        icon: <SafetyCertificateOutlined className="text-cyan-600 text-xl" />,
        change: errorTic ? (
            <span className="text-red-600">Error: {errorTic}</span>
        ) : (
            // 🔄 Descripción de estado actualizada
            <>Todos los tickets registrados</>
        ),
        onRefresh: () => fetchTotalTickets(), // 🔄 Llamamos a la nueva función
        isLoading: loadingTic,
      },
    ],
    [
      loadingSol, totalSolicitantes, errorSol,
      loadingEq, totalEquipos, errorEq,
      loadingVis, visitasTotal, errorVis, from, to,
      loadingTic, totalTickets, errorTic, // 🔄 Dependencia actualizada
    ]
  );

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-cyan-50 to-white">
      <Header />

      <main className="flex-1 p-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl font-extrabold text-slate-800">
            Dashboard de Estadísticas
          </h1>
          <p className="mt-2 text-slate-600">
            Resumen general de la actividad y soporte de RIDS.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="mt-6 grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          {computedStats.map((stat, idx) => (
            <motion.div
              key={stat.name}
              className="bg-white rounded-xl shadow-md p-5 border border-slate-100 relative overflow-hidden"
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
                      // Implementación de UX mejorada: icono giratorio y deshabilitado
                      className={`ml-1 rounded-full p-1.5 transition text-cyan-700 hover:bg-cyan-100 disabled:opacity-50 disabled:cursor-not-allowed ${
                        stat.isLoading
                          ? "animate-spin"
                          : ""
                      }`}
                      title="Actualizar"
                      disabled={stat.isLoading}
                    >
                      <ReloadOutlined className="text-sm" />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-3 text-3xl font-bold text-slate-800">
                {stat.value}
              </div>
              <div className="text-sm text-slate-500 mt-1">{stat.change}</div>
            </motion.div>
          ))}
        </div>

        {/* Gráfico */}
        <motion.div
          className="mt-10 bg-white rounded-xl shadow-md p-6 border border-slate-100"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">
              Visitas del mes por técnico
            </h2>
            <button
              onClick={() => fetchVisitasMetrics()}
              className={`inline-flex items-center gap-2 rounded-lg border border-cyan-200 text-cyan-700 px-3 py-1.5 text-xs hover:bg-cyan-50 disabled:opacity-50 disabled:cursor-not-allowed ${
                loadingVis ? "animate-spin" : ""
              }`}
              title="Actualizar"
              disabled={loadingVis}
            >
              {loadingVis ? <LoadingOutlined /> : <ReloadOutlined />} Refrescar
            </button>
          </div>

          <div className="h-72">
            {loadingVis ? (
              <div className="h-full flex items-center justify-center text-neutral-500">
                <LoadingOutlined /> &nbsp; Cargando…
              </div>
            ) : visitasByTech.length === 0 ? (
              <div className="h-full flex items-center justify-center text-neutral-400">
                No hay visitas registradas en el rango ({from} → {to})
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={visitasByTech}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tecnico" tick={{ fontSize: 12 }} interval={0} height={50} />
                  <YAxis allowDecimals={false} />
                  <Tooltip content={(props) => <CustomTooltip {...props} />} />
                  <Bar dataKey="cantidad">
                    {visitasByTech.map((row) => (
                      <Cell
                        key={row.tecnicoId}
                        fill={colorForTech(row.tecnicoId, row.tecnico)}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-2 text-xs text-neutral-500">
            Rango: <span className="font-medium">{from}</span> a{" "}
            <span className="font-medium">{to}</span>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Home;