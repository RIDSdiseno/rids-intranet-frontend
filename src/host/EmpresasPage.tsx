// src/pages/EmpresasPage.tsx
import React, { useState, useEffect, useMemo } from "react";
import {
  LoadingOutlined,
  ReloadOutlined,
  TeamOutlined,
  BuildOutlined,
  LaptopOutlined,
  PieChartOutlined,
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

import type {
  EmpresaLite,
  EquipoLite,
  SolicitanteLite,
  Visita,
  EstadisticasEmpresa,
  FichaEmpresaCompleta,
  DetalleEmpresa
} from "../components/modals-empresa/types";

import EmpresaDetailsModal from "../components/modals-empresa/EmpresaDetailsModal";
import FichaEmpresaModal from "../components/modals-empresa/FichaEmpresaModal";
import CrearEmpresaModal from "../components/modals-empresa/CrearEmpresa";

import { useAuth } from "../components/hooks/useAuth";
import { http } from "../service/http";

/* ====================== Tipos de página ====================== */
interface Empresa extends EmpresaLite {
  estadisticas: EstadisticasEmpresa;
}

/* ====================== Type guards ====================== */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
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
    direcciones: Array.isArray(input.direcciones) ? input.direcciones as any : null,
    telefono: asNullableStringOr(input.telefono, null),
    email: asNullableStringOr(input.email, null),
    sitioWeb: asNullableStringOr(input.sitioWeb, null),
    industria: asNullableStringOr(input.industria, null),
  };
}

function normalizeEmpresa(input: unknown): Empresa {
  const e = isRecord(input) ? input : {};
  const id = asNumberOr(e.id_empresa, NaN);
  return {
    id_empresa: Number.isFinite(id) ? id : -1,
    nombre: asStringOr(e.nombre, ""),
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

/* ====================== Tooltips ====================== */
type TooltipItem = { name: string; value: number; color?: string; payload?: unknown; };
interface CustomTooltipProps { active?: boolean; payload?: TooltipItem[]; label?: string | number; }

const CustomBarTooltip: React.FC<CustomTooltipProps> = ({ active, label, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-gray-300 bg-white/95 shadow-md p-3">
      <div className="text-sm font-semibold text-gray-900">{label}</div>
      <div className="text-sm text-gray-700">Cantidad: <b>{payload[0].value}</b></div>
    </div>
  );
};

const CustomPieTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-xl border border-gray-300 bg-white/95 shadow-md p-3">
      <div className="text-sm font-semibold text-gray-900">{payload[0].name}</div>
      <div className="text-sm text-gray-700">Cantidad: <b>{payload[0].value}</b></div>
    </div>
  );
};

const renderPieLabel = (props: PieLabelRenderProps) => {
  const { name } = props;
  const raw = (props as { percent?: unknown }).percent;
  const percentNum = typeof raw === "number" ? raw : Number(raw ?? 0);
  const pct = Math.round(percentNum * 100);
  const label = typeof name === "string" ? name : name != null ? String(name) : "Total";
  return `${label} (${pct}%)`;
};

const DARK_PALETTE = [
  "#1e40af", "#dc2626", "#059669", "#7c3aed", "#ea580c",
  "#0891b2", "#b45309", "#be185d", "#4338ca", "#0f766e",
  "#831843", "#78350f", "#374151", "#86198f", "#064e3b",
];

/* ====================== Página ====================== */
type StatBase = { name: string; value: React.ReactNode; icon: React.ReactNode; change: React.ReactNode; };
type RefreshableStat = StatBase & { onRefresh: () => void };
type Stat = StatBase | RefreshableStat;
function isRefreshableStat(s: Stat): s is RefreshableStat {
  return "onRefresh" in s && typeof (s as RefreshableStat).onRefresh === "function";
}

const EmpresasPage: React.FC = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const { isCliente } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "companies">(
    isCliente ? "companies" : "overview"
  );

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [empresaSel, setEmpresaSel] = useState<EmpresaLite | null>(null);
  const [solicitantesSel, setSolicitantesSel] = useState<SolicitanteLite[]>([]);
  const [equiposSel, setEquiposSel] = useState<EquipoLite[]>([]);
  const [visitasSel, setVisitasSel] = useState<Visita[]>([]);

  const [contactosSel, setContactosSel] = useState<any[]>([]);

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

      // 🔥 api ya maneja el token automáticamente
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
      const { data: json } = await http.get("/solicitantes", {
        params: { empresaId, page, pageSize }
      });

      if (Array.isArray(json.items)) all = all.concat(json.items);
      totalPages = json.totalPages ?? 1;
      page++;
    } while (page <= totalPages);

    return all;
  };

  /* ===================== FETCH VISITAS PAGINADAS ===================== */
  const fetchAllVisitasByEmpresa = async (empresaId: number): Promise<Visita[]> => {
    const pageSize = 100;
    let page = 1;
    let totalPages = 1;
    let all: Visita[] = [];

    do {
      const { data: json } = await http.get("/visitas", {
        params: { empresaId, page, pageSize }
      });

      if (Array.isArray(json.items)) all = all.concat(json.items);
      totalPages = json.totalPages ?? 1;
      page++;
    } while (page <= totalPages);

    return all;
  };

  /* ===================== OPEN DETAILS ===================== */
  const openDetails = async (empresa: Empresa) => {
    setEmpresaSel({
      id_empresa: empresa.id_empresa,
      nombre: empresa.nombre,
      detalleEmpresa: empresa.detalleEmpresa,
    });

    setSolicitantesSel([]);
    setEquiposSel([]);
    setVisitasSel([]);
    setContactosSel([]);
    setDetailsError(null);
    setDetailsLoading(true);
    setDetailsOpen(true);

    try {
      const solicitantes = await fetchAllSolicitantesByEmpresa(empresa.id_empresa);
      setSolicitantesSel(solicitantes);

      const { data: fichaCompleta } = await http.get(
        `/ficha-empresa/${empresa.id_empresa}/completa`
      );

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
      setEmpresaSel(() => ({
        ...data.empresa,
        detalleEmpresa: normalizeDetalleEmpresa(data.empresa.detalleEmpresa),
      }));

      setEmpresas(prev =>
        prev.map(e =>
          e.id_empresa === data.empresa.id_empresa
            ? { ...e, nombre: data.empresa.nombre, detalleEmpresa: normalizeDetalleEmpresa(data.empresa.detalleEmpresa) }
            : e
        )
      );
    } catch {
      // silencioso
    }
  };

  /* ===================== OPEN FICHA ===================== */
  const openFichaEmpresa = async (empresa: EmpresaLite) => {
    try {
      setFichaOpen(true);
      setFichaLoading(true);
      setFichaError(null);

      const { data } = await http.get(`/ficha-empresa/${empresa.id_empresa}/completa`);
      setFichaData(data);
    } catch {
      setFichaError("No se pudo cargar la ficha");
    } finally {
      setFichaLoading(false);
    }
  };

  /* ===================== Derivados ===================== */
  const statsTotales = useMemo(() =>
    empresas.reduce((acc, e) => ({
      totalEmpresas: acc.totalEmpresas + 1,
      totalSolicitantes: acc.totalSolicitantes + (e.estadisticas.totalSolicitantes ?? 0),
      totalEquipos: acc.totalEquipos + (e.estadisticas.totalEquipos ?? 0),
      totalVisitas: acc.totalVisitas + (e.estadisticas.totalVisitas ?? 0),
      totalTrabajos: acc.totalTrabajos + (e.estadisticas.totalTrabajos ?? 0),
      visitasPendientes: acc.visitasPendientes + (e.estadisticas.visitasPendientes ?? 0),
      trabajosPendientes: acc.trabajosPendientes + (e.estadisticas.trabajosPendientes ?? 0),
    }), { totalEmpresas: 0, totalSolicitantes: 0, totalEquipos: 0, totalVisitas: 0, totalTrabajos: 0, visitasPendientes: 0, trabajosPendientes: 0 }),
    [empresas]
  );

  const equiposPorEmpresa = useMemo(() =>
    empresas.map(e => ({
      name: e.nombre.length > 12 ? e.nombre.slice(0, 12) + "..." : e.nombre,
      equipos: e.estadisticas.totalEquipos,
      solicitantes: e.estadisticas.totalSolicitantes,
      fullName: e.nombre,
    })).sort((a, b) => b.equipos - a.equipos).slice(0, 8),
    [empresas]
  );

  const solicitantesPorEmpresa = useMemo(() =>
    empresas.map(e => ({
      name: e.nombre.length > 10 ? e.nombre.slice(0, 10) + "..." : e.nombre,
      solicitantes: e.estadisticas.totalSolicitantes,
      equipos: e.estadisticas.totalEquipos,
      fullName: e.nombre,
    })).sort((a, b) => b.solicitantes - a.solicitantes).slice(0, 6),
    [empresas]
  );

  const distribucionTamanioEmpresas = useMemo(() => {
    const ranges = [
      { name: "Pequeña (1-10)", min: 1, max: 10, color: "#059669" },
      { name: "Mediana (11-50)", min: 11, max: 50, color: "#ea580c" },
      { name: "Grande (51+)", min: 51, max: Infinity, color: "#dc2626" },
      { name: "Sin equipos", min: 0, max: 0, color: "#374151" },
    ];
    return ranges.map(r => {
      const count = empresas.filter(e =>
        r.min === 0 && r.max === 0
          ? e.estadisticas.totalEquipos === 0
          : e.estadisticas.totalEquipos >= r.min && e.estadisticas.totalEquipos <= r.max
      ).length;
      return { name: r.name, value: count, color: r.color };
    }).filter(x => x.value > 0);
  }, [empresas]);

  const computedStats: Stat[] = useMemo(() => [
    {
      name: "Total Empresas",
      value: refreshing ? <span className="inline-flex items-center gap-2"><LoadingOutlined /> Cargando…</span> : formatNumber(statsTotales.totalEmpresas),
      icon: <BuildOutlined className="text-blue-700 text-xl" />,
      change: "Empresas registradas",
      onRefresh: () => fetchEmpresas(true),
    },
    {
      name: "Solicitantes Activos",
      value: refreshing ? <span className="inline-flex items-center gap-2"><LoadingOutlined /> Cargando…</span> : formatNumber(statsTotales.totalSolicitantes),
      icon: <TeamOutlined className="text-green-700 text-xl" />,
      change: "Total de usuarios",
    },
    {
      name: "Equipos Registrados",
      value: refreshing ? <span className="inline-flex items-center gap-2"><LoadingOutlined /> Cargando…</span> : formatNumber(statsTotales.totalEquipos),
      icon: <LaptopOutlined className="text-purple-700 text-xl" />,
      change: "Dispositivos en inventario",
    },
    {
      name: "Visitas Totales",
      value: refreshing ? <span className="inline-flex items-center gap-2"><LoadingOutlined /> Cargando…</span> : formatNumber(statsTotales.totalVisitas),
      icon: <PieChartOutlined className="text-cyan-700 text-xl" />,
      change: "Visitas registradas",
    },
  ], [statsTotales, refreshing]);

  const filteredEmpresas = useMemo(() =>
    empresas.filter(e =>
      e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.detalleEmpresa?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    ), [empresas, searchTerm]
  );

  /* ===================== Render ===================== */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-white">
        <div className="ml-64 transition-all duration-300">
          <div className="text-lg flex items-center gap-2 text-slate-600">
            <LoadingOutlined /> Cargando empresas...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-white">
        <div className="p-6">
          <div className="ml-64 transition-all duration-300">
            <strong>Error:</strong> {error}
            <button onClick={() => fetchEmpresas()} className="ml-4 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm">
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-white">
      <div className="flex-1">
        <main className="flex-1 p-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-3xl font-extrabold text-slate-800">Dashboard de Empresas</h1>
            <p className="mt-2 text-slate-600">
              {isCliente ? "Información y estadísticas de tu empresa." : "Análisis y estadísticas de todas las empresas."}
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="flex gap-2 mb-8 bg-white rounded-xl p-1 shadow-md inline-flex mt-6">
            {(isCliente ? ["companies"] : ["overview", "companies"]).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab as "overview" | "companies")}
                className={`px-6 py-2 rounded-lg font-medium text-sm transition-all duration-300 ${activeTab === tab ? "bg-cyan-700 text-white shadow-md" : "text-slate-600 hover:text-slate-800 hover:bg-slate-100"}`}>
                {tab === "overview" ? "Resumen" : "Empresas"}
              </button>
            ))}
          </motion.div>

          {/* === OVERVIEW === */}
          {activeTab === "overview" && (
            <>
              <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-8">
                {computedStats.map((stat, idx) => (
                  <motion.div key={stat.name} className="bg-white rounded-xl shadow-md p-5 border border-slate-100 relative overflow-hidden"
                    initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: idx * 0.1 }}
                    whileHover={{ scale: 1.03, boxShadow: "0 12px 24px rgba(0,0,0,.12)" }}>
                    <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-blue-100/40 blur-2xl" />
                    <div className="flex items-start justify-between">
                      <div className="text-slate-600 font-medium">{stat.name}</div>
                      <div className="flex items-center gap-2">
                        {stat.icon}
                        {isRefreshableStat(stat) && (
                          <button onClick={stat.onRefresh} className="ml-1 rounded-lg border border-blue-200 text-blue-700 px-2 py-1 text-xs hover:bg-blue-50" title="Actualizar">
                            <ReloadOutlined />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 text-3xl font-bold text-slate-800">{stat.value}</div>
                    <div className="text-sm text-slate-500 mt-1">{stat.change}</div>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <motion.div className="bg-white rounded-xl shadow-md p-6 border border-slate-100" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <LaptopOutlined className="text-green-700" />Equipos por Empresa (Top 8)
                    </h2>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={equiposPorEmpresa}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#374151" }} interval={0} height={50} angle={-45} textAnchor="end" />
                        <YAxis allowDecimals={false} tick={{ fill: "#374151" }} />
                        <Tooltip content={(props) => <CustomBarTooltip {...props} />} />
                        <Bar dataKey="equipos">
                          {equiposPorEmpresa.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={DARK_PALETTE[(index + 3) % DARK_PALETTE.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>

                <motion.div className="bg-white rounded-xl shadow-md p-6 border border-slate-100" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.35 }}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-800">
                      <span className="inline-flex items-center gap-2"><TeamOutlined className="text-blue-700" />Empresas con Más Solicitantes</span>
                    </h2>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={solicitantesPorEmpresa}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#374151" }} interval={0} height={50} angle={-45} textAnchor="end" />
                        <YAxis allowDecimals={false} tick={{ fill: "#374151" }} />
                        <Tooltip content={(props) => <CustomBarTooltip {...props} />} />
                        <Bar dataKey="solicitantes">
                          {solicitantesPorEmpresa.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={DARK_PALETTE[(index + 6) % DARK_PALETTE.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </div>

              <div className="grid grid-cols-1 gap-6 mb-8">
                <motion.div className="bg-white rounded-xl shadow-md p-6 border border-slate-100" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.45 }}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-slate-800">
                      <span className="inline-flex items-center gap-2"><PieChartOutlined className="text-purple-700" />Distribución por Tamaño</span>
                    </h2>
                  </div>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={distribucionTamanioEmpresas} cx="50%" cy="50%" labelLine={false} label={renderPieLabel} outerRadius={80} fill="#8884d8" dataKey="value">
                          {distribucionTamanioEmpresas.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={(props) => <CustomPieTooltip {...props} />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
              </div>
            </>
          )}

          {/* === COMPANIES === */}
          {activeTab === "companies" && (
            <motion.div className="bg-white rounded-xl shadow-md p-6 border border-slate-100" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h2 className="text-lg font-semibold text-slate-900">Lista de Empresas</h2>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar empresas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                    />
                  </div>
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
                    <div>No se encontraron empresas que coincidan con la búsqueda</div>
                  </div>
                ) : (
                  filteredEmpresas.map((empresa, index) => (
                    <motion.div key={empresa.id_empresa}
                      className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all duration-300 group"
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }}>
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors duration-300">
                          <BuildOutlined className="text-blue-700" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors duration-300">{empresa.nombre}</h3>
                          <p className="text-sm text-slate-600">
                            {empresa.estadisticas.totalSolicitantes} solicitantes • {empresa.estadisticas.totalEquipos} equipos
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <button onClick={() => openFichaEmpresa(empresa)} className="text-emerald-700 hover:text-emerald-900 font-medium group-hover:translate-x-1 transition-transform duration-300">
                          Ver ficha →
                        </button>
                        <button onClick={() => openDetails(empresa)} className="text-blue-700 hover:text-blue-900 font-medium group-hover:translate-x-1 transition-transform duration-300">
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
      </div>

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
        onUpdated={() => { if (fichaData?.empresa?.id_empresa) refreshEmpresaCompleta(fichaData.empresa.id_empresa); }}
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