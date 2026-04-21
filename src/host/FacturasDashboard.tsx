// FacturasDashboard.tsx
// Dashboard de Ventas y Compras desde el RCV del SII
// Instalar: npm install recharts
// Agregar ruta en tu router: /facturas

import React, { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import {
  FileTextOutlined,
  ReloadOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DollarOutlined,
  CalendarOutlined,
  BarChartOutlined,
} from "@ant-design/icons";

// ============================================================
// TIPOS
// ============================================================
interface VentaRCV {
  folio: number;
  tipoDTE: number;
  rutReceptor: string;
  razonSocialReceptor: string;
  fechaEmision: string;
  montoNeto: number;
  montoIVA: number;
  montoTotal: number;
  estado: string;
}

interface ResultadoRCV {
  rut: string;
  mes: string;
  ano: string;
  ventas: VentaRCV[];
  total: number;
}

interface Toast {
  type: "success" | "error";
  message: string;
}

// ============================================================
// HELPERS
// ============================================================
const formatCLP = (valor: number) =>
  new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" }).format(valor);

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const COLORES_ESTADO: Record<string, string> = {
  Confirmada: "#10b981",
  Pendiente: "#f59e0b",
  Anulada: "#ef4444",
  Rechazada: "#ef4444",
};

const COLORES_GRAFICO = ["#06b6d4", "#0891b2", "#0e7490", "#155e75", "#164e63"];

// ============================================================
// COMPONENTE METRIC CARD
// ============================================================
const MetricCard: React.FC<{
  titulo: string;
  valor: string;
  subtitulo?: string;
  icono: React.ReactNode;
  color: string;
  tendencia?: "up" | "down" | "neutral";
  tendenciaValor?: string;
}> = ({ titulo, valor, subtitulo, icono, color, tendencia, tendenciaValor }) => (
  <div className="rounded-2xl border border-cyan-100 bg-white p-5 shadow-sm transition hover:shadow-md">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{titulo}</p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{valor}</p>
        {subtitulo && <p className="mt-0.5 text-xs text-slate-400">{subtitulo}</p>}
      </div>
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
        {icono}
      </div>
    </div>
    {tendencia && tendenciaValor && (
      <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${
        tendencia === "up" ? "text-emerald-600" : tendencia === "down" ? "text-red-500" : "text-slate-400"
      }`}>
        {tendencia === "up" ? <ArrowUpOutlined /> : tendencia === "down" ? <ArrowDownOutlined /> : null}
        {tendenciaValor}
      </div>
    )}
  </div>
);

// ============================================================
// BADGE ESTADO
// ============================================================
const BadgeEstado: React.FC<{ estado: string }> = ({ estado }) => {
  const color = COLORES_ESTADO[estado] ?? "#94a3b8";
  const bg =
    estado === "Confirmada" ? "bg-emerald-100 text-emerald-700" :
    estado === "Pendiente" ? "bg-amber-100 text-amber-700" :
    estado === "Anulada" || estado === "Rechazada" ? "bg-red-100 text-red-700" :
    "bg-slate-100 text-slate-600";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${bg}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {estado || "Sin estado"}
    </span>
  );
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
const FacturasDashboard: React.FC = () => {
  const now = new Date();
  const [mes, setMes] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [ano, setAno] = useState(String(now.getFullYear()));
  const [activeTab, setActiveTab] = useState<"ventas" | "compras">("ventas");
  const [empresa, setEmpresa] = useState<"econnet" | "rids">("econnet");
  const [loading, setLoading] = useState(false);
  const [datos, setDatos] = useState<ResultadoRCV | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");

  const showError = (msg: string) => {
    setToast({ type: "error", message: msg });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchDatos = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
      const refreshParam = forceRefresh ? "&refresh=true" : "";
      const endpoint = activeTab === "ventas"
        ? `${BASE_URL}/facturas/ventas?mes=${mes}&ano=${ano}&empresa=${empresa}${refreshParam}`
        : `${BASE_URL}/facturas/ventas?mes=${mes}&ano=${ano}&empresa=${empresa}${refreshParam}`;

      const token = localStorage.getItem("accessToken") ?? "";

      const res = await fetch(endpoint, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? err?.message ?? `Error ${res.status}`);
      }

      const json = await res.json();
      setDatos(json.data);
    } catch (err: any) {
      showError(err?.message ?? "Error al cargar datos del SII");
    } finally {
      setLoading(false);
    }
  }, [mes, ano, activeTab, empresa]);

  useEffect(() => {
    fetchDatos();
  }, [fetchDatos]);

  // ============================================================
  // MÉTRICAS CALCULADAS
  // ============================================================
  const ventas = datos?.ventas ?? [];

  const ventasFiltradas = ventas.filter((v) => {
    const matchBusqueda =
      !busqueda ||
      v.razonSocialReceptor.toLowerCase().includes(busqueda.toLowerCase()) ||
      String(v.folio).includes(busqueda) ||
      v.rutReceptor.includes(busqueda);
    const matchEstado = !filtroEstado || v.estado === filtroEstado;
    return matchBusqueda && matchEstado;
  });

  const totalNeto = ventas.reduce((s, v) => s + v.montoNeto, 0);
  const totalIVA = ventas.reduce((s, v) => s + v.montoIVA, 0);
  const totalBruto = ventas.reduce((s, v) => s + v.montoTotal, 0);
  const totalDocs = ventas.length;
  const confirmadas = ventas.filter((v) => v.estado === "Confirmada").length;
  const pendientes = ventas.filter((v) => v.estado === "Pendiente").length;

  // Gráfico por día
  const porDia = ventas.reduce<Record<string, number>>((acc, v) => {
    const dia = v.fechaEmision?.split("T")[0] ?? "Sin fecha";
    acc[dia] = (acc[dia] ?? 0) + v.montoTotal;
    return acc;
  }, {});
  const datosGraficoDia = Object.entries(porDia)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, total]) => ({
      fecha: fecha.split("-").slice(1).join("/"),
      total,
    }));

  // Gráfico por cliente (top 5)
  const porCliente = ventas.reduce<Record<string, number>>((acc, v) => {
    const nombre = v.razonSocialReceptor || "Sin nombre";
    acc[nombre] = (acc[nombre] ?? 0) + v.montoTotal;
    return acc;
  }, {});
  const top5Clientes = Object.entries(porCliente)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([nombre, total]) => ({ nombre: nombre.length > 20 ? nombre.slice(0, 20) + "…" : nombre, total }));

  // Gráfico por estado (pie)
  const porEstado = ventas.reduce<Record<string, number>>((acc, v) => {
    const est = v.estado || "Sin estado";
    acc[est] = (acc[est] ?? 0) + 1;
    return acc;
  }, {});
  const datosEstado = Object.entries(porEstado).map(([name, value]) => ({ name, value }));

  const estadosUnicos = [...new Set(ventas.map((v) => v.estado).filter(Boolean))];

  const ANOS = Array.from({ length: 5 }, (_, i) => String(now.getFullYear() - i));

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-white to-cyan-50">
      <div className="mx-auto mt-4 w-full max-w-screen-2xl px-3 pb-10 pt-16 sm:mt-8 sm:px-6 sm:pt-6 lg:px-8">

        {/* ===== HEADER ===== */}
        <section className="rounded-2xl border border-cyan-200 bg-white px-4 py-5 shadow-sm sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50">
                <BarChartOutlined className="text-xl text-cyan-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Facturas SII</h1>
                <p className="text-sm text-slate-500">Registro de Compras y Ventas — datos en tiempo real</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Tabs */}
              <div className="flex rounded-full border border-cyan-200 bg-cyan-50 p-1">
                {(["ventas", "compras"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition ${
                      activeTab === tab
                        ? "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-cyan-700"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Empresa */}
              <div className="flex rounded-full border border-cyan-200 bg-cyan-50 p-1">
                {(["econnet", "rids"] as const).map((emp) => (
                  <button
                    key={emp}
                    onClick={() => setEmpresa(emp)}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase transition ${
                      empresa === emp
                        ? "bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-cyan-700"
                    }`}
                  >
                    {emp}
                  </button>
                ))}
              </div>

              {/* Mes */}
              <select
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="rounded-full border border-cyan-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                {MESES.map((m, i) => (
                  <option key={i} value={String(i + 1).padStart(2, "0")}>{m}</option>
                ))}
              </select>

              {/* Año */}
              <select
                value={ano}
                onChange={(e) => setAno(e.target.value)}
                className="rounded-full border border-cyan-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                {ANOS.map((a) => <option key={a}>{a}</option>)}
              </select>

              <button
                onClick={() => fetchDatos(true)}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white px-4 py-2 text-sm text-cyan-700 transition hover:bg-cyan-50 disabled:opacity-50"
              >
                <ReloadOutlined className={loading ? "animate-spin" : ""} />
                {loading ? "Cargando…" : "Recargar"}
              </button>
            </div>
          </div>

          {/* Período activo */}
          <div className="mt-4 flex items-center gap-2">
            <CalendarOutlined className="text-cyan-500" />
            <span className="text-sm font-medium text-slate-600">
              Período: <span className="text-cyan-700 font-semibold">{MESES[parseInt(mes) - 1]} {ano}</span>
              <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 uppercase">{empresa}</span>
              {datos && (
                <span className="ml-2 text-slate-400">— {totalDocs} documentos encontrados</span>
              )}
            </span>
            {loading && (
              <span className="ml-2 rounded-full bg-cyan-100 px-2 py-0.5 text-xs text-cyan-700">
                Consultando SII…
              </span>
            )}
          </div>
        </section>

        {/* ===== MÉTRICAS ===== */}
        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <MetricCard
            titulo="Total Bruto"
            valor={loading ? "—" : formatCLP(totalBruto)}
            subtitulo="IVA incluido"
            icono={<DollarOutlined className="text-lg text-emerald-600" />}
            color="bg-emerald-50 border border-emerald-100"
          />
          <MetricCard
            titulo="Neto"
            valor={loading ? "—" : formatCLP(totalNeto)}
            subtitulo="Sin IVA"
            icono={<BarChartOutlined className="text-lg text-cyan-600" />}
            color="bg-cyan-50 border border-cyan-100"
          />
          <MetricCard
            titulo="IVA"
            valor={loading ? "—" : formatCLP(totalIVA)}
            subtitulo="19%"
            icono={<FileTextOutlined className="text-lg text-indigo-600" />}
            color="bg-indigo-50 border border-indigo-100"
          />
          <MetricCard
            titulo="Documentos"
            valor={loading ? "—" : String(totalDocs)}
            subtitulo="total del período"
            icono={<FileTextOutlined className="text-lg text-slate-600" />}
            color="bg-slate-50 border border-slate-200"
          />
          <MetricCard
            titulo="Confirmadas"
            valor={loading ? "—" : String(confirmadas)}
            icono={<CheckCircleOutlined className="text-lg text-emerald-600" />}
            color="bg-emerald-50 border border-emerald-100"
          />
          <MetricCard
            titulo="Pendientes"
            valor={loading ? "—" : String(pendientes)}
            icono={<ClockCircleOutlined className="text-lg text-amber-600" />}
            color="bg-amber-50 border border-amber-100"
          />
        </section>

        {/* ===== GRÁFICOS ===== */}
        {!loading && ventas.length > 0 && (
          <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-3">
            {/* Línea por día */}
            <div className="xl:col-span-2 rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-700">Ventas por día</h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={datosGraficoDia}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                  <Tooltip formatter={((v: unknown) => typeof v === "number" ? formatCLP(v) : String(v ?? "")) as any} />
                  <Line type="monotone" dataKey="total" stroke="#0891b2" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Pie por estado */}
            <div className="rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-700">Estado documentos</h2>
              {datosEstado.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={datosEstado} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                      {datosEstado.map((_, i) => (
                        <Cell key={i} fill={COLORES_GRAFICO[i % COLORES_GRAFICO.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[220px] items-center justify-center text-sm text-slate-400">Sin datos</div>
              )}
            </div>

            {/* Barras top clientes */}
            <div className="xl:col-span-3 rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-700">Top 5 clientes por monto</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={top5Clientes} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                  <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11 }} width={160} />
                  <Tooltip formatter={((v: unknown) => typeof v === "number" ? formatCLP(v) : String(v ?? "")) as any} />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                    {top5Clientes.map((_, i) => (
                      <Cell key={i} fill={COLORES_GRAFICO[i % COLORES_GRAFICO.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* ===== TABLA ===== */}
        <section className="mt-6">
          <div className="overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-sm">
            {/* Header tabla */}
            <div className="flex flex-col gap-3 border-b border-cyan-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <FileTextOutlined className="text-cyan-600" />
                <span className="text-sm font-semibold text-slate-700 capitalize">
                  {activeTab} — {MESES[parseInt(mes) - 1]} {ano}
                </span>
                {!loading && (
                  <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs text-cyan-700">
                    {ventasFiltradas.length} de {totalDocs}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Búsqueda */}
                <div className="relative">
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar cliente, folio o RUT..."
                    className="w-64 rounded-full border border-cyan-100 bg-white py-2 pl-4 pr-4 text-sm text-slate-700 placeholder-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  />
                </div>

                {/* Filtro estado */}
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="rounded-full border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-700 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                >
                  <option value="">Todos los estados</option>
                  {estadosUnicos.map((e) => <option key={e}>{e}</option>)}
                </select>
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center justify-center gap-3 py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-200 border-t-cyan-600" />
                <p className="text-sm text-slate-500">Consultando el SII… esto puede tardar hasta 2 minutos</p>
              </div>
            )}

            {/* Sin datos */}
            {!loading && ventas.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
                <FileTextOutlined className="text-4xl" />
                <p className="text-sm">No hay documentos para {MESES[parseInt(mes) - 1]} {ano}</p>
              </div>
            )}

            {/* Tabla desktop */}
            {!loading && ventasFiltradas.length > 0 && (
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px] divide-y divide-gray-200">
                  <thead className="bg-cyan-50">
                    <tr>
                      {["Folio", "Tipo DTE", "Fecha Emisión", "Cliente", "RUT", "Neto", "IVA", "Total", "Estado"].map((h) => (
                        <th key={h} className="px-4 py-3 text-center text-xs font-semibold text-slate-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ventasFiltradas.map((v, i) => (
                      <tr key={i} className="transition hover:bg-cyan-50">
                        <td className="px-4 py-3 text-center text-sm font-semibold text-cyan-700">{v.folio}</td>
                        <td className="px-4 py-3 text-center text-xs text-slate-500">
                          {v.tipoDTE === 33 ? "Factura Electrónica" : v.tipoDTE === 34 ? "Factura Exenta" : v.tipoDTE === 61 ? "N. Crédito" : `DTE ${v.tipoDTE}`}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-600">
                          {v.fechaEmision ? new Date(v.fechaEmision).toLocaleDateString("es-CL") : "—"}
                        </td>
                        <td className="px-4 py-3 text-left text-sm font-medium text-slate-800 max-w-[200px] truncate">
                          {v.razonSocialReceptor || "—"}
                        </td>
                        <td className="px-4 py-3 text-center text-xs text-slate-500">{v.rutReceptor || "—"}</td>
                        <td className="px-4 py-3 text-right text-sm text-slate-700">{formatCLP(v.montoNeto)}</td>
                        <td className="px-4 py-3 text-right text-sm text-slate-500">{formatCLP(v.montoIVA)}</td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">{formatCLP(v.montoTotal)}</td>
                        <td className="px-4 py-3 text-center"><BadgeEstado estado={v.estado} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Mobile cards */}
            {!loading && ventasFiltradas.length > 0 && (
              <div className="block md:hidden divide-y divide-cyan-100">
                {ventasFiltradas.map((v, i) => (
                  <div key={i} className="px-4 py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-base font-bold text-cyan-700">Folio {v.folio}</span>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {v.fechaEmision ? new Date(v.fechaEmision).toLocaleDateString("es-CL") : "—"}
                        </p>
                      </div>
                      <BadgeEstado estado={v.estado} />
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-800">{v.razonSocialReceptor || "—"}</p>
                    <div className="mt-2 flex justify-between text-sm">
                      <span className="text-slate-500">Neto: {formatCLP(v.montoNeto)}</span>
                      <span className="font-bold text-slate-900">{formatCLP(v.montoTotal)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer tabla */}
            {!loading && ventasFiltradas.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-cyan-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-slate-500">
                  {ventasFiltradas.length} documentos · Total: <span className="font-bold text-slate-900">{formatCLP(ventasFiltradas.reduce((s, v) => s + v.montoTotal, 0))}</span>
                </span>
                <div className="flex gap-4 text-xs text-slate-500">
                  <span>Neto: <b className="text-slate-700">{formatCLP(ventasFiltradas.reduce((s, v) => s + v.montoNeto, 0))}</b></span>
                  <span>IVA: <b className="text-slate-700">{formatCLP(ventasFiltradas.reduce((s, v) => s + v.montoIVA, 0))}</b></span>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed left-3 right-3 top-3 z-[99999] flex items-center gap-3 rounded-xl px-4 py-3 text-white shadow-xl sm:left-auto sm:right-5 sm:top-5 ${toast.type === "success" ? "bg-green-600" : "bg-rose-600"}`}>
          {toast.type === "success" ? <CheckCircleOutlined className="text-xl" /> : <CloseCircleOutlined className="text-xl" />}
          <span className="font-medium">{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default FacturasDashboard;