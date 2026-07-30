// src/components/modals-funnel/FunnelDashboard.tsx
// Dashboard del funnel comercial, inspirado en el dashboard de Beck (KPIs,
// ranking de vendedores, forecast, riesgo comercial) pero adaptado a lo que
// existe en RIDS: sin "unidad de negocio" ni "tipo de cliente" (no aplican),
// usando en su lugar Tipo de servicio y el origen de la entidad (RIDS/ECONNET/OTRO).
import { useCallback, useEffect, useMemo, useState } from "react";
import { Collapse, DatePicker, Select, Spin, Table } from "antd";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import dayjs, { Dayjs } from "dayjs";
import { http } from "../../service/http";
import {
  TipoServicioOportunidad,
  type ApiEnvelope,
  type DashboardFunnelData,
  type EtapaOportunidadVenta,
  type FiltrosDashboard,
  type ResponsableResumen,
} from "./types";
import {
  formatFecha,
  formatMonto,
  getEtapaChartColor,
  getEtapaLabel,
  getOportunidadErrorMessage,
  getTipoServicioOportunidadLabel,
} from "./utils";

const { RangePicker } = DatePicker;

const ETAPAS_FILTRO: EtapaOportunidadVenta[] = [
  "NUEVA",
  "COTIZACION_PREPARACION",
  "COTIZACION_ENVIADA",
  "NEGOCIACION",
  "GANADA",
  "PERDIDA",
  "POSTERGADA",
];

const ORIGENES_FILTRO: Array<"RIDS" | "ECONNET" | "OTRO"> = ["RIDS", "ECONNET", "OTRO"];

interface FiltrosLocal {
  rango: [Dayjs | null, Dayjs | null] | null;
  tipoFecha: "ingreso" | "cierre" | "probableCierre";
  responsableId?: number;
  etapa?: EtapaOportunidadVenta;
  origen?: "RIDS" | "ECONNET" | "OTRO";
  tipoServicio?: TipoServicioOportunidad;
  texto?: string;
  diasSinSeguimiento: number;
}

const FILTROS_INICIALES: FiltrosLocal = {
  rango: null,
  tipoFecha: "ingreso",
  responsableId: undefined,
  etapa: undefined,
  origen: undefined,
  tipoServicio: undefined,
  texto: undefined,
  diasSinSeguimiento: 7,
};

function KpiCard({ label, valor, tono = "default" }: { label: string; valor: string; tono?: "default" | "success" | "danger" | "warning" }) {
  const color =
    tono === "success" ? "text-emerald-600" : tono === "danger" ? "text-rose-600" : tono === "warning" ? "text-amber-600" : "text-slate-800";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-xl font-bold ${color}`}>{valor}</div>
    </div>
  );
}

function SeccionTitulo({ children }: { children: React.ReactNode }) {
  return <h4 className="mb-2 text-sm font-semibold text-slate-700">{children}</h4>;
}

function TablaSimple({
  columnas,
  filas,
  vacio,
}: {
  columnas: string[];
  filas: (string | number)[][];
  vacio: string;
}) {
  if (filas.length === 0) return <p className="text-sm text-slate-400">{vacio}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-400">
            {columnas.map((c) => (
              <th key={c} className="py-1.5 pr-3 font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-b-0">
              {fila.map((valor, j) => (
                <td key={j} className="py-1.5 pr-3 text-slate-700">
                  {valor}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FunnelDashboard() {
  const [filtros, setFiltros] = useState<FiltrosLocal>(FILTROS_INICIALES);
  const [data, setData] = useState<DashboardFunnelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [responsables, setResponsables] = useState<ResponsableResumen[]>([]);

  useEffect(() => {
    http
      .get("/tecnicos")
      .then((res) => setResponsables(res.data?.data ?? res.data?.items ?? res.data ?? []))
      .catch(() => setResponsables([]));
  }, []);

  const cargar = useCallback(async (f: FiltrosLocal) => {
    setLoading(true);
    setError(null);
    try {
      const params: FiltrosDashboard = {
        tipoFecha: f.tipoFecha,
        responsableId: f.responsableId,
        etapa: f.etapa,
        origen: f.origen,
        tipoServicio: f.tipoServicio,
        texto: f.texto || undefined,
        diasSinSeguimiento: f.diasSinSeguimiento,
      };
      if (f.rango?.[0]) params.fechaDesde = f.rango[0].format("YYYY-MM-DD");
      if (f.rango?.[1]) params.fechaHasta = f.rango[1].format("YYYY-MM-DD");

      const res = await http.get<ApiEnvelope<DashboardFunnelData>>("/oportunidades/dashboard", { params });
      setData(res.data.data);
    } catch (err) {
      setError(getOportunidadErrorMessage(err, "No se pudo cargar el dashboard."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar(FILTROS_INICIALES);
    // Carga inicial única; los cambios posteriores de filtro se aplican con el botón "Aplicar filtros".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function aplicarPreset(preset: "hoy" | "semana" | "mes" | "anio") {
    const hoy = dayjs();
    const rango: [Dayjs, Dayjs] =
      preset === "hoy"
        ? [hoy, hoy]
        : preset === "semana"
        ? [hoy.startOf("week"), hoy.endOf("week")]
        : preset === "mes"
        ? [hoy.startOf("month"), hoy.endOf("month")]
        : [hoy.startOf("year"), hoy.endOf("year")];
    const nuevos = { ...filtros, rango };
    setFiltros(nuevos);
    cargar(nuevos);
  }

  function limpiarFiltros() {
    setFiltros(FILTROS_INICIALES);
    cargar(FILTROS_INICIALES);
  }

  const pieData = useMemo(() => {
    if (!data) return [];
    return data.porEtapa.map((p) => ({ name: getEtapaLabel(p.etapa), value: p.cantidad, etapa: p.etapa }));
  }, [data]);

  const barCantidadData = useMemo(() => {
    if (!data) return [];
    return data.porEtapa.map((p) => ({ name: getEtapaLabel(p.etapa), cantidad: p.cantidad, etapa: p.etapa }));
  }, [data]);

  const barMontoData = useMemo(() => {
    if (!data) return [];
    return data.porEtapa.map((p) => ({ name: getEtapaLabel(p.etapa), monto: p.monto, etapa: p.etapa }));
  }, [data]);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Filtros</h3>
          <div className="flex gap-2">
            <button onClick={() => aplicarPreset("hoy")} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50">
              Hoy
            </button>
            <button onClick={() => aplicarPreset("semana")} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50">
              Esta semana
            </button>
            <button onClick={() => aplicarPreset("mes")} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50">
              Este mes
            </button>
            <button onClick={() => aplicarPreset("anio")} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50">
              Este año
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Rango de fechas</label>
            <RangePicker
              className="w-full"
              format="DD-MM-YYYY"
              value={filtros.rango}
              onChange={(value) => setFiltros((f) => ({ ...f, rango: value as [Dayjs | null, Dayjs | null] | null }))}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Tipo de fecha</label>
            <Select
              className="w-full"
              value={filtros.tipoFecha}
              onChange={(value) => setFiltros((f) => ({ ...f, tipoFecha: value }))}
              options={[
                { value: "ingreso", label: "Fecha de ingreso" },
                { value: "cierre", label: "Fecha de cierre" },
                { value: "probableCierre", label: "Fecha probable de cierre" },
              ]}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Responsable comercial</label>
            <Select
              allowClear
              showSearch
              className="w-full"
              placeholder="Todos"
              value={filtros.responsableId}
              optionFilterProp="label"
              onChange={(value) => setFiltros((f) => ({ ...f, responsableId: value }))}
              options={responsables.map((r) => ({ value: r.id_tecnico, label: r.nombre }))}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Etapa</label>
            <Select
              allowClear
              className="w-full"
              placeholder="Todas"
              value={filtros.etapa}
              onChange={(value) => setFiltros((f) => ({ ...f, etapa: value }))}
              options={ETAPAS_FILTRO.map((e) => ({ value: e, label: getEtapaLabel(e) }))}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Origen</label>
            <Select
              allowClear
              className="w-full"
              placeholder="Todos"
              value={filtros.origen}
              onChange={(value) => setFiltros((f) => ({ ...f, origen: value }))}
              options={ORIGENES_FILTRO.map((o) => ({ value: o, label: o }))}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Tipo de servicio</label>
            <Select
              allowClear
              className="w-full"
              placeholder="Todos"
              value={filtros.tipoServicio}
              onChange={(value) => setFiltros((f) => ({ ...f, tipoServicio: value }))}
              options={Object.values(TipoServicioOportunidad).map((t) => ({
                value: t,
                label: getTipoServicioOportunidadLabel(t),
              }))}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Buscar (título, proyecto, código)</label>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              value={filtros.texto ?? ""}
              onChange={(e) => setFiltros((f) => ({ ...f, texto: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Días sin seguimiento</label>
            <input
              type="number"
              min={1}
              className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              value={filtros.diasSinSeguimiento}
              onChange={(e) => setFiltros((f) => ({ ...f, diasSinSeguimiento: Number(e.target.value) || 7 }))}
            />
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => cargar(filtros)}
            className="rounded-lg bg-cyan-600 px-4 py-1.5 text-sm text-white hover:bg-cyan-700 transition"
          >
            Aplicar filtros
          </button>
          <button
            onClick={limpiarFiltros}
            className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition"
          >
            Limpiar filtros
          </button>
          <button
            onClick={() => cargar(filtros)}
            className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition"
          >
            Recargar
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center py-16">
          <Spin size="large" tip="Cargando dashboard…" />
        </div>
      ) : data ? (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <KpiCard label="Total oportunidades" valor={String(data.kpis.total)} />
            <KpiCard label="Activas" valor={String(data.kpis.activas)} />
            <KpiCard label="Ganadas" valor={String(data.kpis.ganadas)} tono="success" />
            <KpiCard label="Perdidas" valor={String(data.kpis.perdidas)} tono="danger" />
            <KpiCard label="Postergadas" valor={String(data.kpis.postergadas)} tono="warning" />
            <KpiCard label="Pipeline total" valor={formatMonto(data.kpis.pipelineTotal)} />
            <KpiCard label="Monto ganado" valor={formatMonto(data.kpis.montoGanado)} tono="success" />
            <KpiCard label="Monto perdido" valor={formatMonto(data.kpis.montoPerdido)} tono="danger" />
            <KpiCard label="Tasa de cierre" valor={`${data.kpis.tasaCierre}%`} />
            <KpiCard label="Reactivadas" valor={String(data.kpis.clientesReactivados)} />
            <KpiCard label="Sin seguimiento" valor={String(data.kpis.sinSeguimiento)} tono="warning" />
            <KpiCard label="Acciones vencidas" valor={String(data.kpis.accionesVencidas)} tono="danger" />
          </div>

          {/* Próximas acciones */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
              <div className="text-xs font-medium uppercase text-rose-600">Vencidas</div>
              <div className="mt-1 text-xl font-bold text-rose-700">{data.proximasAcciones.vencidas}</div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="text-xs font-medium uppercase text-amber-600">Hoy</div>
              <div className="mt-1 text-xl font-bold text-amber-700">{data.proximasAcciones.hoy}</div>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
              <div className="text-xs font-medium uppercase text-blue-600">Próximos 7 días</div>
              <div className="mt-1 text-xl font-bold text-blue-700">{data.proximasAcciones.proximos7}</div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <SeccionTitulo>Distribución por etapa</SeccionTitulo>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                    {pieData.map((entry) => (
                      <Cell key={entry.etapa} fill={getEtapaChartColor(entry.etapa)} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <SeccionTitulo>Oportunidades por etapa</SeccionTitulo>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barCantidadData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="cantidad">
                    {barCantidadData.map((entry) => (
                      <Cell key={entry.etapa} fill={getEtapaChartColor(entry.etapa)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <SeccionTitulo>Monto por etapa (CLP)</SeccionTitulo>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barMontoData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value: number) => formatMonto(value)} />
                  <Bar dataKey="monto">
                    {barMontoData.map((entry) => (
                      <Cell key={entry.etapa} fill={getEtapaChartColor(entry.etapa)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ranking de responsables */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <SeccionTitulo>Ranking de responsables</SeccionTitulo>
            <Table
              size="small"
              rowKey="responsableId"
              pagination={false}
              dataSource={data.rankingResponsables}
              columns={[
                { title: "Responsable", dataIndex: "responsable" },
                { title: "Total", dataIndex: "total", align: "right" as const },
                { title: "Activas", dataIndex: "activas", align: "right" as const },
                { title: "Ganadas", dataIndex: "ganadas", align: "right" as const },
                { title: "Perdidas", dataIndex: "perdidas", align: "right" as const },
                { title: "Postergadas", dataIndex: "postergadas", align: "right" as const },
                {
                  title: "Monto total",
                  dataIndex: "montoTotal",
                  align: "right" as const,
                  render: (v: number) => formatMonto(v),
                },
                {
                  title: "Monto ganado",
                  dataIndex: "montoGanado",
                  align: "right" as const,
                  render: (v: number) => formatMonto(v),
                },
              ]}
            />
          </div>

          {/* Sin seguimiento */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between">
              <SeccionTitulo>Oportunidades sin seguimiento</SeccionTitulo>
              {data.sinSeguimiento.cantidad > 0 && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  {data.sinSeguimiento.cantidad} activas sin movimiento en más de {filtros.diasSinSeguimiento} días
                </span>
              )}
            </div>
            <TablaSimple
              columnas={["Código", "Proyecto/Título", "Empresa", "Responsable", "Etapa", "Última actividad", "Próxima acción", "Valor"]}
              filas={data.sinSeguimiento.items.map((i) => [
                i.codigo,
                i.proyecto || i.titulo,
                i.entidad ?? "—",
                i.responsable ?? "—",
                getEtapaLabel(i.etapa),
                formatFecha(i.ultimaActividad),
                i.proximaAccion ?? "—",
                formatMonto(i.valor),
              ])}
              vacio="Sin oportunidades activas fuera de seguimiento."
            />
          </div>

          {/* Análisis avanzado */}
          <Collapse
            items={[
              {
                key: "pipeline",
                label: "Pipeline avanzado",
                children: (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <SeccionTitulo>Por tipo de servicio</SeccionTitulo>
                      <TablaSimple
                        columnas={["Tipo de servicio", "Cantidad", "Monto"]}
                        filas={data.avanzado.porTipoServicio.map((p) => [
                          p.tipoServicio === "SIN_ESPECIFICAR"
                            ? "Sin especificar"
                            : getTipoServicioOportunidadLabel(p.tipoServicio as TipoServicioOportunidad),
                          p.cantidad,
                          formatMonto(p.monto),
                        ])}
                        vacio="Sin datos."
                      />
                    </div>
                    <div>
                      <SeccionTitulo>Top clientes (activas)</SeccionTitulo>
                      <TablaSimple
                        columnas={["Cliente", "Cantidad", "Monto"]}
                        filas={data.avanzado.topClientes.map((c) => [c.cliente, c.cantidad, formatMonto(c.monto)])}
                        vacio="Sin datos."
                      />
                    </div>
                  </div>
                ),
              },
              {
                key: "forecast",
                label: "Forecast",
                children: (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {(["d30", "d60", "d90"] as const).map((clave, i) => (
                      <div key={clave} className="rounded-lg border border-slate-200 p-3">
                        <div className="text-xs font-medium uppercase text-slate-400">
                          Forecast {[30, 60, 90][i]} días
                        </div>
                        <div className="mt-1 text-sm text-slate-600">
                          {data.avanzado.forecast[clave].cantidad} oportunidades
                        </div>
                        <div className="text-sm text-slate-600">
                          Monto total: {formatMonto(data.avanzado.forecast[clave].montoTotal)}
                        </div>
                        <div className="text-sm font-semibold text-slate-800">
                          Monto ponderado: {formatMonto(data.avanzado.forecast[clave].montoPonderado)}
                        </div>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                key: "motivos",
                label: "Motivos de cierre",
                children: (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <SeccionTitulo>Motivos de pérdida</SeccionTitulo>
                      <TablaSimple
                        columnas={["Motivo", "Cantidad"]}
                        filas={data.avanzado.motivos.perdida.map((m) => [m.motivo, m.cantidad])}
                        vacio="Sin oportunidades perdidas en el período."
                      />
                    </div>
                    <div>
                      <SeccionTitulo>Motivos de postergación</SeccionTitulo>
                      <TablaSimple
                        columnas={["Motivo", "Cantidad"]}
                        filas={data.avanzado.motivos.postergacion.map((m) => [m.motivo, m.cantidad])}
                        vacio="Sin oportunidades postergadas en el período."
                      />
                    </div>
                  </div>
                ),
              },
              {
                key: "riesgo",
                label: "Riesgo comercial",
                children: (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                        <div className="text-xs font-medium uppercase text-rose-600">Oportunidades detenidas</div>
                        <div className="mt-1 text-xl font-bold text-rose-700">
                          {data.avanzado.riesgo.detenidas.cantidad}
                        </div>
                        <div className="text-xs text-rose-500">+{filtros.diasSinSeguimiento} días sin movimiento</div>
                      </div>
                      <div className="rounded-lg border border-slate-200 p-3">
                        <div className="text-xs font-medium uppercase text-slate-500">Sin próxima acción</div>
                        <div className="mt-1 text-xl font-bold text-slate-700">
                          {data.avanzado.riesgo.sinProximaAccion.cantidad}
                        </div>
                      </div>
                    </div>
                    <div>
                      <SeccionTitulo>Top detenidas (sin movimiento)</SeccionTitulo>
                      <TablaSimple
                        columnas={["Código", "Título", "Empresa", "Responsable", "Etapa", "Última actividad", "Valor"]}
                        filas={data.avanzado.riesgo.detenidas.items.slice(0, 10).map((i) => [
                          i.codigo,
                          i.titulo,
                          i.entidad ?? "—",
                          i.responsable ?? "—",
                          getEtapaLabel(i.etapa),
                          formatFecha(i.ultimaActividad),
                          formatMonto(i.valor),
                        ])}
                        vacio="Sin oportunidades detenidas."
                      />
                    </div>
                    <div>
                      <SeccionTitulo>Sin próxima acción definida</SeccionTitulo>
                      <TablaSimple
                        columnas={["Código", "Título", "Empresa", "Responsable", "Etapa", "Valor"]}
                        filas={data.avanzado.riesgo.sinProximaAccion.items.map((i) => [
                          i.codigo,
                          i.titulo,
                          i.entidad ?? "—",
                          i.responsable ?? "—",
                          getEtapaLabel(i.etapa),
                          formatMonto(i.valor),
                        ])}
                        vacio="Todas tienen próxima acción definida."
                      />
                    </div>
                  </div>
                ),
              },
              {
                key: "conversion",
                label: "Conversión por etapa",
                children: (
                  <TablaSimple
                    columnas={["Etapa", "Cantidad", "% del total", "Conversión a la siguiente etapa"]}
                    filas={data.avanzado.conversionPorEtapa.map((c) => [
                      getEtapaLabel(c.etapa),
                      c.cantidad,
                      `${c.porcentajeDelTotal}%`,
                      `${c.tasaConversionSiguiente}%`,
                    ])}
                    vacio="Sin datos."
                  />
                ),
              },
            ]}
          />
        </>
      ) : null}
    </div>
  );
}
