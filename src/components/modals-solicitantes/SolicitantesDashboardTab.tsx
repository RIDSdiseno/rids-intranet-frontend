import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import { api } from "../../api/api";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type SolicitantesDashboardMensualRow = {
    empresaId: number;
    empresa: string;
    mes: string;
    esCargaInicial: boolean;
    nuevos: number;
    eliminados: number;
    neto: number;
};

type MensualResumen = {
    mesKey: string;
    mesLabel: string;
    esCargaInicial: boolean;
    nuevos: number;
    eliminados: number;
    neto: number;
};

type EmpresaResumen = {
    empresaId: number;
    empresa: string;
    cargaInicial: number;
    nuevosReales: number;
    eliminadosReales: number;
    netoReal: number;
    totalActivo: number;
};

type SolicitanteEliminado = {
    id_solicitante: number;
    nombre: string;
    rut: string | null;
    email: string | null;
    deletedAt: string | null;
    deactivatedAt: string | null;
    fechaBaja: string;
    tipoBaja: "ELIMINADO" | "DESACTIVADO";
    empresa: { id_empresa: number; nombre: string } | null;
};

type SolicitanteNuevo = {
    id_solicitante: number;
    nombre: string;
    rut: string | null;
    email: string | null;
    createdAt: string;
    empresa: { id_empresa: number; nombre: string } | null;
};

type Props = {
    empresaId?: number | null;
    refreshTrigger?: number;
};

// Qué métrica muestra el gráfico
type MetricaGrafico = "activos" | "nuevos" | "eliminados";

const AUTO_REFRESH_MS = 60_000;

// ─── API ──────────────────────────────────────────────────────────────────────

async function getSolicitantesDashboardMensual(empresaId?: number | null) {
    const { data } = await api.get<{
        ok: boolean;
        data: SolicitantesDashboardMensualRow[];
        activosActuales: number;
        activosPorEmpresa: { empresaId: number; activos: number }[];
    }>("/solicitantes/dashboard/mensual", {
        params: empresaId ? { empresaId } : undefined,
    });
    return data;
}

async function getSolicitantesEliminadosDetalle(
    mesKey: string,
    empresaId?: number | null
): Promise<SolicitanteEliminado[]> {
    const desde = mesKey;
    const [year, month] = mesKey.split("-").map(Number);
    const primerDiaMesSiguiente = new Date(year, month, 1);
    const ahora = new Date();
    const hasta =
        ahora < primerDiaMesSiguiente
            ? ahora.toISOString()
            : new Date(year, month, 0).toISOString().slice(0, 10);
    const { data } = await api.get<{ ok: boolean; total: number; data: SolicitanteEliminado[] }>(
        "/solicitantes/dashboard/eliminados",
        { params: { desde, hasta, ...(empresaId ? { empresaId } : {}) } }
    );
    return data.data;
}

async function getSolicitantesNuevosDetalle(
    mesKey: string,
    empresaId?: number | null,
    // Solo pasar true para restringir a carga inicial; false/undefined = mes completo sin restricción
    esCargaInicial?: boolean
): Promise<SolicitanteNuevo[]> {
    const desde = mesKey;
    const [year, month] = mesKey.split("-").map(Number);
    const primerDiaMesSiguiente = new Date(year, month, 1);
    const ahora = new Date();
    const hasta =
        ahora < primerDiaMesSiguiente
            ? ahora.toISOString()
            : new Date(year, month, 0).toISOString().slice(0, 10);
    const { data } = await api.get<{ ok: boolean; total: number; data: SolicitanteNuevo[] }>(
        "/solicitantes/dashboard/nuevos",
        {
            params: {
                desde,
                hasta,
                ...(empresaId ? { empresaId } : {}),
                // Solo enviar esCargaInicial cuando es true; nunca enviar false
                // porque el backend interpreta false como "> cargaInicialHasta" y
                // excluye todos los registros anteriores a esa marca de tiempo.
                ...(esCargaInicial === true ? { esCargaInicial: true } : {}),
            },
        }
    );
    return data.data;
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function formatMes(mes: string) {
    return new Date(mes).toLocaleDateString("es-CL", {
        month: "short",
        year: "numeric",
        timeZone: "UTC",
    });
}

function formatNum(n: number) {
    return n.toLocaleString("es-CL");
}

function formatFecha(iso: string) {
    return new Date(iso).toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function formatHora(iso: string) {
    return new Date(iso).toLocaleTimeString("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

function agruparPorMes(rows: SolicitantesDashboardMensualRow[]): MensualResumen[] {
    const map = new Map<string, MensualResumen>();
    for (const row of rows) {
        const mesKey = row.mes.slice(0, 10);
        const groupKey = `${mesKey}:${row.esCargaInicial ? "carga" : "real"}`;
        const actual = map.get(groupKey) ?? {
            mesKey,
            mesLabel: row.esCargaInicial
                ? `${formatMes(row.mes)} · Carga inicial`
                : formatMes(row.mes),
            esCargaInicial: row.esCargaInicial,
            nuevos: 0,
            eliminados: 0,
            neto: 0,
        };
        actual.nuevos += row.nuevos;
        actual.eliminados += row.eliminados;
        actual.neto += row.neto;
        map.set(groupKey, actual);
    }
    return Array.from(map.values()).sort((a, b) => {
        const byMes = a.mesKey.localeCompare(b.mesKey);
        if (byMes !== 0) return byMes;
        return a.esCargaInicial ? -1 : 1;
    });
}

function agruparPorEmpresa(rows: SolicitantesDashboardMensualRow[]): EmpresaResumen[] {
    const map = new Map<number, EmpresaResumen>();
    for (const row of rows) {
        const actual = map.get(row.empresaId) ?? {
            empresaId: row.empresaId,
            empresa: row.empresa,
            cargaInicial: 0,
            nuevosReales: 0,
            eliminadosReales: 0,
            netoReal: 0,
            totalActivo: 0,
        };
        if (row.esCargaInicial) {
            actual.cargaInicial += row.nuevos;
            actual.eliminadosReales += row.eliminados;
            actual.netoReal -= row.eliminados;
        } else {
            actual.nuevosReales += row.nuevos;
            actual.eliminadosReales += row.eliminados;
            actual.netoReal += row.neto;
        }
        map.set(row.empresaId, actual);
    }
    for (const e of map.values()) e.totalActivo = e.cargaInicial + e.netoReal;
    return Array.from(map.values()).sort((a, b) => b.cargaInicial - a.cargaInicial);
}

/** Calcula el stock acumulado de activos por empresa hasta un mes dado */
function calcularStockHastaMes(
    rows: SolicitantesDashboardMensualRow[],
    mesKey: string,
    activosPorEmpresa: { empresaId: number; activos: number }[]
): Map<number, number> {
    // Todos los mesKeys ordenados hasta el seleccionado (inclusive)
    const todosMesKeys = [...new Set(rows.map((r) => r.mes.slice(0, 10)))].sort();
    const mesKeysHasta = todosMesKeys.filter((m) => m <= mesKey);
    const esUltimoMes = mesKey === todosMesKeys[todosMesKeys.length - 1];

    const stockMap = new Map<number, number>();

    for (const mk of mesKeysHasta) {
        const rowsDeMes = rows.filter((r) => r.mes.slice(0, 10) === mk);
        for (const r of rowsDeMes) {
            const prev = stockMap.get(r.empresaId) ?? 0;
            stockMap.set(r.empresaId, prev + r.nuevos - r.eliminados);
        }
    }

    // Si es el último mes, corregir con valores reales de activos
    if (esUltimoMes) {
        for (const { empresaId, activos } of activosPorEmpresa) {
            if (stockMap.has(empresaId)) {
                stockMap.set(empresaId, activos);
            }
        }
    }

    return stockMap;
}

/** Genera un color HSL consistente por empresa */
function empresaColor(index: number, total: number): string {
    const hue = Math.round((index * 360) / Math.max(total, 1));
    const sat = index % 2 === 0 ? 65 : 55;
    const lum = index % 3 === 0 ? 42 : index % 3 === 1 ? 48 : 38;
    return `hsl(${hue}, ${sat}%, ${lum}%)`;
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function MetricCard({
    label, value, sub, valueClass = "",
}: {
    label: string; value: string | number; sub?: React.ReactNode; valueClass?: string;
}) {
    return (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="text-xs text-gray-500 mb-1">{label}</div>
            <div className={`text-2xl font-medium text-gray-900 tabular-nums ${valueClass}`}>{value}</div>
            {sub && <div className="mt-0.5 text-xs text-gray-400">{sub}</div>}
        </div>
    );
}

function NetoBadge({ value }: { value: number }) {
    if (value > 0) return <span className="font-semibold text-emerald-600">+{formatNum(value)} ↑</span>;
    if (value < 0) return <span className="font-semibold text-rose-600">{formatNum(value)} ↓</span>;
    return <span className="font-semibold text-slate-400">{formatNum(value)}</span>;
}

// ─── Panel de detalle ─────────────────────────────────────────────────────────

type PanelTipo = "nuevos" | "eliminados";

function DetallePanel({
    tipo, mes, items, loading, onClose, empresaNombre,
}: {
    tipo: PanelTipo;
    mes: MensualResumen | null;
    items: SolicitanteNuevo[] | SolicitanteEliminado[];
    loading: boolean;
    onClose: () => void;
    empresaNombre?: string | null;
}) {
    if (!mes) return null;
    const esNuevos = tipo === "nuevos";
    const titulo = esNuevos
        ? mes.esCargaInicial ? `Carga inicial — ${mes.mesLabel}` : `Nuevos en ${mes.mesLabel}`
        : `Bajas en ${mes.mesLabel}`;

    return (
        <div className={`overflow-hidden rounded-2xl border ${esNuevos ? "border-emerald-200" : "border-rose-200"} bg-white shadow-sm`}>
            <div className={`flex items-center justify-between border-b px-5 py-4 ${esNuevos ? "bg-emerald-50/60 border-emerald-100" : "bg-rose-50/60 border-rose-100"}`}>
                <div>
                    <h3 className={`text-base font-semibold ${esNuevos ? "text-emerald-800" : "text-rose-800"}`}>
                        {titulo}
                        {empresaNombre && (
                            <span className="ml-2 text-xs font-normal opacity-70">— {empresaNombre}</span>
                        )}
                    </h3>
                    <p className={`mt-0.5 text-sm ${esNuevos ? "text-emerald-400" : "text-rose-400"}`}>
                        {loading ? "Cargando…" : `${items.length} solicitante${items.length !== 1 ? "s" : ""}`}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className={`rounded-xl border bg-white px-3 py-1.5 text-sm ${esNuevos ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50" : "border-rose-200 text-rose-600 hover:bg-rose-50"}`}
                >
                    Cerrar ✕
                </button>
            </div>
            {loading ? (
                <div className="px-5 py-10 text-center text-sm text-slate-400">Cargando detalle…</div>
            ) : items.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-slate-400">
                    No hay registros para este mes.
                    {!esNuevos && <><br /><span className="text-xs text-slate-300">Solo se registran bajas desde que existe fecha de eliminación o desactivación.</span></>}
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium">Nombre</th>
                                <th className="px-4 py-3 text-left font-medium">RUT</th>
                                <th className="px-4 py-3 text-left font-medium">Email</th>
                                <th className="px-4 py-3 text-left font-medium">Empresa</th>
                                <th className="px-4 py-3 text-left font-medium">{esNuevos ? "Fecha creación" : "Fecha baja"}</th>
                                <th className="px-4 py-3 text-left font-medium">Hora</th>
                                {!esNuevos && <th className="px-4 py-3 text-left font-medium">Tipo</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((s) => {
                                const fechaIso = esNuevos
                                    ? (s as SolicitanteNuevo).createdAt
                                    : (s as SolicitanteEliminado).fechaBaja;
                                return (
                                    <tr key={s.id_solicitante} className="border-t border-slate-100 odd:bg-white even:bg-slate-50/40">
                                        <td className="px-4 py-3 font-medium text-slate-700">{s.nombre}</td>
                                        <td className="px-4 py-3 tabular-nums text-slate-500 whitespace-nowrap">{s.rut ?? <span className="text-slate-300">—</span>}</td>
                                        <td className="px-4 py-3 text-slate-500">{s.email ?? <span className="text-slate-300">—</span>}</td>
                                        <td className="px-4 py-3 text-slate-500">{s.empresa?.nombre ?? <span className="text-slate-300">—</span>}</td>
                                        <td className="px-4 py-3 tabular-nums text-slate-500">{formatFecha(fechaIso)}</td>
                                        <td className="px-4 py-3 tabular-nums text-slate-400 text-xs">{formatHora(fechaIso)}</td>
                                        {!esNuevos && (
                                            <td className="px-4 py-3">
                                                {(s as SolicitanteEliminado).tipoBaja === "ELIMINADO"
                                                    ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">Eliminado</span>
                                                    : <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Desactivado</span>}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function SolicitantesDashboardTab({
    empresaId = null,
    refreshTrigger,
}: Props) {
    const [rows, setRows] = useState<SolicitantesDashboardMensualRow[]>([]);
    const [activosActuales, setActivosActuales] = useState<number | null>(null);
    const [activosPorEmpresa, setActivosPorEmpresa] = useState<{ empresaId: number; activos: number }[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);

    // Selector de mes para el gráfico
    const [mesFiltro, setMesFiltro] = useState<string>("");
    // Qué métrica muestra el gráfico
    const [metricaGrafico, setMetricaGrafico] = useState<MetricaGrafico>("activos");
    // Empresa clickeada en el gráfico (para filtrar el panel de detalle)
    const [empresaDetalleId, setEmpresaDetalleId] = useState<number | null>(null);

    // Empresa expandida en la tabla
    const [expandedEmpresa, setExpandedEmpresa] = useState<number | null>(null);

    // Panel de detalle (nuevos / eliminados)
    const [panelTipo, setPanelTipo] = useState<PanelTipo | null>(null);
    const [mesPanelSeleccionado, setMesPanelSeleccionado] = useState<MensualResumen | null>(null);
    const [detalleItems, setDetalleItems] = useState<SolicitanteNuevo[] | SolicitanteEliminado[]>([]);
    const [loadingDetalle, setLoadingDetalle] = useState(false);

    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstance = useRef<Chart | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    // ─── Carga ────────────────────────────────────────────────────────────────

    const cargarDashboard = useCallback(async (silencioso = false) => {
        try {
            if (!silencioso) setLoading(true);
            setError(null);
            const result = await getSolicitantesDashboardMensual(empresaId);
            setRows(result.data);
            setActivosActuales(result.activosActuales ?? null);
            setActivosPorEmpresa(result.activosPorEmpresa ?? []);
            setUltimaActualizacion(new Date());
        } catch (err) {
            console.error("[SolicitantesDashboardTab]", err);
            if (!silencioso) setError("No se pudo cargar el dashboard de solicitantes.");
        } finally {
            if (!silencioso) setLoading(false);
        }
    }, [empresaId]);

    useEffect(() => { void cargarDashboard(); }, [cargarDashboard]);

    useEffect(() => {
        if (refreshTrigger === undefined || refreshTrigger === 0) return;
        void cargarDashboard(true);
    }, [refreshTrigger, cargarDashboard]);

    useEffect(() => {
        const handle = () => { if (document.visibilityState === "visible") void cargarDashboard(true); };
        document.addEventListener("visibilitychange", handle);
        return () => document.removeEventListener("visibilitychange", handle);
    }, [cargarDashboard]);

    useEffect(() => {
        const t = setInterval(() => void cargarDashboard(true), AUTO_REFRESH_MS);
        return () => clearInterval(t);
    }, [cargarDashboard]);

    // ─── Meses disponibles ────────────────────────────────────────────────────

    const mesKeys = useMemo(() => {
        return [...new Set(rows.map((r) => r.mes.slice(0, 10)))].sort();
    }, [rows]);

    // Inicializar mesFiltro al último mes disponible
    useEffect(() => {
        if (mesKeys.length > 0 && !mesFiltro) {
            setMesFiltro(mesKeys[mesKeys.length - 1]);
        }
    }, [mesKeys, mesFiltro]);

    // ─── Datos agrupados ──────────────────────────────────────────────────────

    const mensual = useMemo(() => agruparPorMes(rows), [rows]);
    const empresas = useMemo(() => agruparPorEmpresa(rows), [rows]);

    const cargaInicial = useMemo(() => rows.filter((r) => r.esCargaInicial).reduce((acc, r) => acc + r.nuevos, 0), [rows]);
    const nuevosReales = useMemo(() => rows.filter((r) => !r.esCargaInicial).reduce((acc, r) => acc + r.nuevos, 0), [rows]);
    const eliminadosReales = useMemo(() => rows.reduce((acc, r) => acc + r.eliminados, 0), [rows]);
    const netoReal = nuevosReales - eliminadosReales;

    const activosMap = useMemo(
        () => new Map(activosPorEmpresa.map((r) => [r.empresaId, r.activos])),
        [activosPorEmpresa]
    );

    // Mapa de color por empresa (índice estable por orden de aparición)
    const empresaColorMap = useMemo(() => {
        const allEmpresas = [...new Set([
            ...rows.map((r) => r.empresaId.toString()),
        ])];
        const total = allEmpresas.length;
        const map = new Map<number, string>();
        empresas.forEach((e, idx) => {
            map.set(e.empresaId, empresaColor(idx, total));
        });
        return map;
    }, [rows, empresas]);

    // ─── Datos del mes seleccionado para el gráfico ───────────────────────────

    const datosMesFiltro = useMemo(() => {
        if (!mesFiltro) return [];

        // Solo filas del mes seleccionado que NO son carga inicial,
        // para que "Nuevos" muestre altas reales y "Bajas" muestre bajas reales.
        // La carga inicial solo aporta al stock acumulado (métrica "Activos").
        const rowsDeMesReales = rows.filter(
            (r) => r.mes.slice(0, 10) === mesFiltro && !r.esCargaInicial
        );
        // Para "Activos" usamos el stock acumulado que SÍ considera la carga inicial.
        const stockMes = calcularStockHastaMes(rows, mesFiltro, activosPorEmpresa);

        return empresas.map((emp) => {
            const rowEmpresa = rowsDeMesReales.find((r) => r.empresaId === emp.empresaId);
            const activos = stockMes.get(emp.empresaId) ?? 0;
            // Nuevos y eliminados: solo del mes real (sin carga inicial)
            const nuevos = rowEmpresa?.nuevos ?? 0;
            const eliminados = rowEmpresa?.eliminados ?? 0;
            return {
                empresaId: emp.empresaId,
                empresa: emp.empresa,
                color: empresaColorMap.get(emp.empresaId) ?? "#888",
                activos,
                nuevos,
                eliminados,
            };
        }).filter((d) => {
            if (metricaGrafico === "activos") return d.activos > 0;
            if (metricaGrafico === "nuevos") return d.nuevos > 0;
            return d.eliminados > 0;
        }).sort((a, b) => {
            if (metricaGrafico === "activos") return b.activos - a.activos;
            if (metricaGrafico === "nuevos") return b.nuevos - a.nuevos;
            return b.eliminados - a.eliminados;
        });
    }, [rows, mesFiltro, empresas, activosPorEmpresa, empresaColorMap, metricaGrafico]);

    // Resumen del mes filtrado
    const resumenMesFiltro = useMemo(() => {
        if (!mesFiltro) return null;
        const rowsDeMes = rows.filter((r) => r.mes.slice(0, 10) === mesFiltro);
        // Nuevos y eliminados: solo filas reales (sin carga inicial) para no inflar
        const rowsReales = rowsDeMes.filter((r) => !r.esCargaInicial);
        const esCargaInicial = rowsDeMes.some((r) => r.esCargaInicial);
        return {
            nuevos: rowsReales.reduce((acc, r) => acc + r.nuevos, 0),
            eliminados: rowsReales.reduce((acc, r) => acc + r.eliminados, 0),
            neto: rowsReales.reduce((acc, r) => acc + r.neto, 0),
            // Si el mes SOLO tiene carga inicial (sin fila real), lo indicamos
            soloEsCargaInicial: esCargaInicial && rowsReales.length === 0,
            esCargaInicial,
        };
    }, [rows, mesFiltro]);

    // MensualResumen del mes seleccionado para el panel de detalle.
    // Siempre usamos el registro real (!esCargaInicial) si existe, porque
    // getSolicitantesNuevosDetalle usa esCargaInicial para ajustar el rango de fechas.
    // Si el mes SOLO tiene carga inicial, usamos ese registro pero marcado como no-carga
    // para que el API busque en el rango completo del mes.
    const mensualDelMesFiltro = useMemo((): MensualResumen | null => {
        if (!mesFiltro) return null;
        // Preferir siempre el registro real
        const real = mensual.find((m) => m.mesKey === mesFiltro && !m.esCargaInicial);
        if (real) return real;
        // Fallback: mes que solo tiene carga inicial → forzar esCargaInicial: false
        // para que la API no limite el rango a cargaInicialHasta
        const carga = mensual.find((m) => m.mesKey === mesFiltro);
        if (!carga) return null;
        return { ...carga, esCargaInicial: false };
    }, [mensual, mesFiltro]);

    // ─── Gráfico (chart.js/auto, igual que MantencionesDashboard) ─────────────

    useEffect(() => {
        if (!chartRef.current || loading) return;
        if (datosMesFiltro.length === 0) {
            chartInstance.current?.destroy();
            chartInstance.current = null;
            return;
        }

        const labels = datosMesFiltro.map((d) => d.empresa);
        const values = datosMesFiltro.map((d) => {
            if (metricaGrafico === "activos") return d.activos;
            if (metricaGrafico === "nuevos") return d.nuevos;
            return d.eliminados;
        });
        const colors = datosMesFiltro.map((d) => d.color);

        const metricaLabel =
            metricaGrafico === "activos" ? "Activos acumulados"
                : metricaGrafico === "nuevos" ? "Nuevos del mes"
                    : "Eliminados/Bajas del mes";

        if (chartInstance.current) chartInstance.current.destroy();

        chartInstance.current = new Chart(chartRef.current, {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: metricaLabel,
                    data: values,
                    backgroundColor: colors,
                    borderRadius: 6,
                    borderSkipped: false,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                onClick: (_event, elements) => {
                    if (elements.length === 0) return;
                    const idx = elements[0].index;
                    const dato = datosMesFiltro[idx];
                    if (!dato || !mensualDelMesFiltro) return;

                    // Guardar la empresa clickeada para filtrar el panel de detalle
                    setEmpresaDetalleId(dato.empresaId);

                    if (metricaGrafico === "nuevos" && dato.nuevos > 0) {
                        void abrirDetalle("nuevos", mensualDelMesFiltro, dato.empresaId);
                    } else if (metricaGrafico === "eliminados" && dato.eliminados > 0) {
                        void abrirDetalle("eliminados", mensualDelMesFiltro, dato.empresaId);
                    }
                },
                onHover: (event, elements) => {
                    const canvas = event.native?.target as HTMLCanvasElement | undefined;
                    if (!canvas) return;
                    const clickable = elements.length > 0
                        && (metricaGrafico === "nuevos" || metricaGrafico === "eliminados");
                    canvas.style.cursor = clickable ? "pointer" : "default";
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${formatNum(Number(ctx.parsed.y))} solicitantes`,
                            afterBody: () =>
                                metricaGrafico !== "activos"
                                    ? "Click para ver el detalle ↓"
                                    : "",
                        },
                    },
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: {
                            font: { size: 11 },
                            autoSkip: false,
                            maxRotation: 35,
                            callback: function (_val, index) {
                                const label = labels[index] ?? "";
                                // Truncar etiquetas largas
                                return label.length > 18 ? label.slice(0, 16) + "…" : label;
                            },
                        },
                    },
                    y: {
                        grid: { color: "rgba(128,128,128,0.1)" },
                        ticks: {
                            font: { size: 11 },
                            callback: (v) => formatNum(Number(v)),
                        },
                        title: {
                            display: true,
                            text: "Solicitantes",
                            font: { size: 11 },
                            color: "#64748b",
                        },
                    },
                },
            },
        });

        return () => { chartInstance.current?.destroy(); };
    }, [datosMesFiltro, loading, metricaGrafico]);

    // ─── Detalle ──────────────────────────────────────────────────────────────

    // empresaId del prop = filtro global del dashboard
    // empresaIdDetalle = empresa específica clickeada en el gráfico (puede ser null = todas)
    const abrirDetalle = useCallback(async (
        tipo: PanelTipo,
        mes: MensualResumen,
        empresaIdDetalle?: number | null
    ) => {
        setPanelTipo(tipo);
        setMesPanelSeleccionado(mes);
        setDetalleItems([]);
        setLoadingDetalle(true);
        // Usar empresaId específico si se pasó, sino el filtro global del prop
        const idParaApi = empresaIdDetalle ?? empresaId ?? null;
        setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
        try {
            const data = tipo === "nuevos"
                ? await getSolicitantesNuevosDetalle(mes.mesKey, idParaApi, mes.esCargaInicial ? true : undefined)
                : await getSolicitantesEliminadosDetalle(mes.mesKey, idParaApi);
            setDetalleItems(data);
        } catch (err) {
            console.error("[Detalle]", err);
            setDetalleItems([]);
        } finally {
            setLoadingDetalle(false);
        }
    }, [empresaId]);

    const cerrarPanel = useCallback(() => {
        setPanelTipo(null);
        setMesPanelSeleccionado(null);
        setDetalleItems([]);
    }, []);

    // ─── Estados de carga/error ───────────────────────────────────────────────

    if (loading) {
        return (
            <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-400">
                <div className="text-sm">Cargando dashboard de solicitantes…</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
            </div>
        );
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="space-y-4">

            {/* ── Header ── */}
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h2 className="text-base font-semibold text-gray-800">Dashboard de solicitantes</h2>
                        <p className="mt-0.5 text-sm text-gray-500">
                            Selecciona un mes y una métrica para ver la distribución por empresa.
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        {ultimaActualizacion && (
                            <span className="text-xs text-gray-400">
                                Actualizado {formatHora(ultimaActualizacion.toISOString())}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => void cargarDashboard()}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                            Recargar
                        </button>
                    </div>
                </div>
            </div>

            {/* ── Métricas globales ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                <MetricCard
                    label="Activos actuales"
                    value={activosActuales !== null ? formatNum(activosActuales) : "—"}
                    sub="Conteo real"
                />
                <MetricCard label="Carga inicial" value={formatNum(cargaInicial)} sub="Primer mes" />
                <MetricCard label="Nuevos reales" value={formatNum(nuevosReales)} valueClass="text-emerald-700"
                    sub={cargaInicial > 0 ? `+${((nuevosReales / cargaInicial) * 100).toFixed(1)}% s/ carga` : undefined}
                />
                <MetricCard label="Eliminados / Bajas" value={formatNum(eliminadosReales)} valueClass="text-rose-600" />
                <MetricCard
                    label="Neto acumulado"
                    value={netoReal > 0 ? `+${formatNum(netoReal)}` : formatNum(netoReal)}
                    valueClass={netoReal > 0 ? "text-emerald-600" : netoReal < 0 ? "text-rose-600" : "text-gray-400"}
                    sub={netoReal > 0 ? "Tendencia positiva ↗" : netoReal < 0 ? "Tendencia negativa ↘" : "Sin variación"}
                />
            </div>

            {/* ── Gráfico por empresa del mes seleccionado ── */}
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">

                {/* Cabecera con controles */}
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-800">
                        Solicitantes por empresa
                        {mesFiltro && (
                            <span className="ml-2 text-xs font-normal text-gray-500">
                                — {formatMes(mesFiltro)}
                                {resumenMesFiltro?.esCargaInicial && (
                                    <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-amber-700 text-[10px]">
                                        Carga inicial
                                    </span>
                                )}
                            </span>
                        )}
                    </span>

                    <div className="flex flex-wrap items-center gap-2">
                        {/* Selector de mes */}
                        <select
                            value={mesFiltro}
                            onChange={(e) => setMesFiltro(e.target.value)}
                            className="text-xs rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        >
                            {mesKeys.map((mk) => (
                                <option key={mk} value={mk}>{formatMes(mk)}</option>
                            ))}
                        </select>

                        {/* Selector de métrica */}
                        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
                            {(["activos", "nuevos", "eliminados"] as MetricaGrafico[]).map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => setMetricaGrafico(m)}
                                    className={`px-3 py-1.5 transition ${metricaGrafico === m
                                            ? m === "activos"
                                                ? "bg-blue-600 text-white"
                                                : m === "nuevos"
                                                    ? "bg-emerald-600 text-white"
                                                    : "bg-rose-500 text-white"
                                            : "bg-white text-gray-600 hover:bg-gray-50"
                                        }`}
                                >
                                    {m === "activos" ? "Activos" : m === "nuevos" ? "Nuevos" : "Bajas"}
                                </button>
                            ))}
                        </div>

                        {/* Badge de empresas con datos */}
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            {datosMesFiltro.length} empresa{datosMesFiltro.length !== 1 ? "s" : ""}
                        </span>
                    </div>
                </div>

                {/* Leyenda de empresas */}
                {datosMesFiltro.length > 0 && (
                    <div className="flex flex-wrap gap-3 px-5 pt-3 pb-1">
                        {datosMesFiltro.map((d) => (
                            <span key={d.empresaId} className="flex items-center gap-1.5 text-xs text-gray-500">
                                <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: d.color }}
                                />
                                {d.empresa}
                            </span>
                        ))}
                    </div>
                )}

                {/* Resumen del mes seleccionado */}
                {resumenMesFiltro && (
                    <div className="flex flex-wrap gap-4 px-5 py-2 border-b border-gray-100 bg-gray-50/50">
                        {resumenMesFiltro.soloEsCargaInicial ? (
                            <span className="text-xs text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
                                Este mes corresponde a la carga inicial histórica. Los nuevos son altas de sistema, no altas reales del mes.
                            </span>
                        ) : (
                            <>
                                <span className="text-xs text-gray-500">
                                    Nuevos este mes:
                                    <span className="ml-1 font-semibold text-emerald-700">+{formatNum(resumenMesFiltro.nuevos)}</span>
                                </span>
                                <span className="text-xs text-gray-500">
                                    Bajas este mes:
                                    <span className="ml-1 font-semibold text-rose-600">-{formatNum(resumenMesFiltro.eliminados)}</span>
                                </span>
                                <span className="text-xs text-gray-500">
                                    Neto:
                                    <span className={`ml-1 font-semibold ${resumenMesFiltro.neto >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                                        {resumenMesFiltro.neto >= 0 ? "+" : ""}{formatNum(resumenMesFiltro.neto)}
                                    </span>
                                </span>

                                {/* Botones para abrir panel de detalle — muestran TODAS las empresas del mes */}
                                {mensualDelMesFiltro && resumenMesFiltro.nuevos > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEmpresaDetalleId(null);
                                            void abrirDetalle("nuevos", mensualDelMesFiltro, null);
                                        }}
                                        className="text-xs text-emerald-700 underline hover:text-emerald-900 transition"
                                    >
                                        Ver todos los nuevos ↓
                                    </button>
                                )}
                                {mensualDelMesFiltro && resumenMesFiltro.eliminados > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEmpresaDetalleId(null);
                                            void abrirDetalle("eliminados", mensualDelMesFiltro, null);
                                        }}
                                        className="text-xs text-rose-600 underline hover:text-rose-800 transition"
                                    >
                                        Ver todas las bajas ↓
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* Canvas del gráfico */}
                <div className="p-4">
                    {datosMesFiltro.length === 0 ? (
                        <div className="h-48 flex flex-col items-center justify-center gap-1 text-sm text-gray-400">
                            Sin datos para el mes seleccionado
                            {resumenMesFiltro?.soloEsCargaInicial && metricaGrafico !== "activos" && (
                                <span className="text-xs text-amber-600">
                                    Este mes solo tiene carga inicial. Cambia a "Activos" para ver el stock.
                                </span>
                            )}
                        </div>
                    ) : (
                        <div style={{ position: "relative", height: 260 }}>
                            <canvas ref={chartRef} />
                        </div>
                    )}
                </div>
            </div>

            {/* ── Panel de detalle (nuevos / eliminados) ── */}
            <div ref={panelRef}>
                {panelTipo && (
                    <DetallePanel
                        tipo={panelTipo}
                        mes={mesPanelSeleccionado}
                        items={detalleItems}
                        loading={loadingDetalle}
                        onClose={cerrarPanel}
                        empresaNombre={
                            empresaDetalleId
                                ? (datosMesFiltro.find((d) => d.empresaId === empresaDetalleId)?.empresa ?? null)
                                : null
                        }
                    />
                )}
            </div>

            {/* ── Ranking / tabla por empresa ── */}
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-800">Resumen por empresa</span>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                        {empresas.length} empresa{empresas.length !== 1 ? "s" : ""}
                    </span>
                </div>

                {empresas.length === 0 ? (
                    <div className="p-6 text-sm text-gray-400">Sin datos para mostrar.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-xs">
                                    <th className="text-left px-5 py-3 font-medium">Empresa</th>
                                    <th className="text-right px-5 py-3 font-medium">Carga inicial</th>
                                    <th className="text-right px-5 py-3 font-medium">Nuevos reales</th>
                                    <th className="text-right px-5 py-3 font-medium">Eliminados</th>
                                    <th className="text-right px-5 py-3 font-medium">Neto</th>
                                    <th className="text-left px-5 py-3 font-medium w-40">Distribución</th>
                                    <th className="text-right px-5 py-3 font-medium">Activos actuales</th>
                                </tr>
                            </thead>
                            <tbody>
                                {empresas.map((emp) => {
                                    const color = empresaColorMap.get(emp.empresaId) ?? "#888";
                                    const activosEmp = activosMap.get(emp.empresaId) ?? emp.totalActivo;
                                    const maxActivos = Math.max(
                                        ...empresas.map((e) => activosMap.get(e.empresaId) ?? e.totalActivo),
                                        1
                                    );
                                    const barWidth = Math.round((activosEmp / maxActivos) * 100);
                                    const totalActivos = activosActuales ?? empresas.reduce((a, e) => a + (activosMap.get(e.empresaId) ?? e.totalActivo), 0);
                                    const pct = totalActivos > 0 ? Math.round((activosEmp / totalActivos) * 100) : 0;
                                    const isOpen = expandedEmpresa === emp.empresaId;

                                    // Detalle mensual de esta empresa
                                    const mesesEmpresa = [...new Set(rows.filter((r) => r.empresaId === emp.empresaId).map((r) => r.mes.slice(0, 10)))].sort();

                                    return (
                                        <React.Fragment key={emp.empresaId}>
                                            <tr
                                                className="border-t border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                                                onClick={() => setExpandedEmpresa((prev) => prev === emp.empresaId ? null : emp.empresaId)}
                                            >
                                                <td className="px-5 py-3 font-medium text-gray-900">
                                                    <span className="flex items-center gap-2">
                                                        <span
                                                            className="w-2 h-2 rounded-full shrink-0"
                                                            style={{ backgroundColor: color }}
                                                        />
                                                        {emp.empresa}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-right tabular-nums text-gray-700">
                                                    {formatNum(emp.cargaInicial)}
                                                </td>
                                                <td className="px-5 py-3 text-right tabular-nums text-emerald-600">
                                                    +{formatNum(emp.nuevosReales)}
                                                </td>
                                                <td className="px-5 py-3 text-right tabular-nums text-rose-500">
                                                    {emp.eliminadosReales > 0
                                                        ? `-${formatNum(emp.eliminadosReales)}`
                                                        : <span className="text-gray-300">—</span>}
                                                </td>
                                                <td className="px-5 py-3 text-right tabular-nums">
                                                    <NetoBadge value={emp.netoReal} />
                                                </td>
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-16">
                                                            <div
                                                                style={{ width: `${barWidth}%`, backgroundColor: color }}
                                                                className="h-full rounded-full"
                                                            />
                                                        </div>
                                                        <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3 text-right tabular-nums font-semibold text-blue-700">
                                                    {formatNum(activosEmp)}
                                                </td>
                                            </tr>

                                            {/* Fila expandida: detalle mes a mes */}
                                            {isOpen && (
                                                <tr className="bg-gray-50/60">
                                                    <td colSpan={7} className="px-5 pb-4">
                                                        <div className="mt-2 rounded-xl border border-gray-200 bg-white overflow-hidden">
                                                            <div className="px-4 py-3 border-b border-gray-100 text-sm font-medium text-gray-700">
                                                                Detalle mensual — {emp.empresa}
                                                            </div>
                                                            <div className="overflow-x-auto">
                                                                <table className="min-w-full text-sm">
                                                                    <thead>
                                                                        <tr className="bg-gray-50 text-gray-500 text-xs">
                                                                            <th className="text-left px-4 py-2 font-medium">Mes</th>
                                                                            <th className="text-right px-4 py-2 font-medium">Nuevos</th>
                                                                            <th className="text-right px-4 py-2 font-medium">Eliminados</th>
                                                                            <th className="text-right px-4 py-2 font-medium">Neto</th>
                                                                            <th className="text-right px-4 py-2 font-medium">Stock acum.</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {mesesEmpresa.map((mk) => {
                                                                            const rowsMes = rows.filter(
                                                                                (r) => r.empresaId === emp.empresaId && r.mes.slice(0, 10) === mk
                                                                            );
                                                                            const nuevosMes = rowsMes.reduce((a, r) => a + r.nuevos, 0);
                                                                            const elimMes = rowsMes.reduce((a, r) => a + r.eliminados, 0);
                                                                            const netoMes = nuevosMes - elimMes;
                                                                            const stockAcum = calcularStockHastaMes(rows, mk, activosPorEmpresa).get(emp.empresaId) ?? 0;
                                                                            const esCargaMes = rowsMes.some((r) => r.esCargaInicial);
                                                                            return (
                                                                                <tr key={mk} className="border-t border-gray-100">
                                                                                    <td className="px-4 py-2 text-gray-700">
                                                                                        {formatMes(mk)}
                                                                                        {esCargaMes && (
                                                                                            <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                                                                                                carga
                                                                                            </span>
                                                                                        )}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-right tabular-nums text-emerald-600">+{formatNum(nuevosMes)}</td>
                                                                                    <td className="px-4 py-2 text-right tabular-nums text-rose-500">
                                                                                        {elimMes > 0 ? `-${formatNum(elimMes)}` : <span className="text-gray-300">—</span>}
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-right tabular-nums">
                                                                                        <NetoBadge value={netoMes} />
                                                                                    </td>
                                                                                    <td className="px-4 py-2 text-right tabular-nums font-medium text-blue-700">
                                                                                        {formatNum(stockAcum)}
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                    </tbody>
                                                                    <tfoot>
                                                                        <tr className="border-t-2 border-gray-200 bg-gray-50">
                                                                            <td className="px-4 py-2 font-medium text-gray-900">Total</td>
                                                                            <td className="px-4 py-2 text-right tabular-nums font-semibold text-emerald-600">
                                                                                +{formatNum(emp.cargaInicial + emp.nuevosReales)}
                                                                            </td>
                                                                            <td className="px-4 py-2 text-right tabular-nums font-semibold text-rose-500">
                                                                                -{formatNum(emp.eliminadosReales)}
                                                                            </td>
                                                                            <td className="px-4 py-2 text-right tabular-nums font-semibold">
                                                                                <NetoBadge value={emp.netoReal} />
                                                                            </td>
                                                                            <td className="px-4 py-2 text-right tabular-nums font-semibold text-blue-700">
                                                                                {formatNum(activosMap.get(emp.empresaId) ?? emp.totalActivo)}
                                                                            </td>
                                                                        </tr>
                                                                    </tfoot>
                                                                </table>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="border-t-2 border-gray-200 bg-gray-50">
                                    <td className="px-5 py-3 font-medium text-gray-900">Total</td>
                                    <td className="px-5 py-3 text-right tabular-nums font-semibold text-gray-900">{formatNum(cargaInicial)}</td>
                                    <td className="px-5 py-3 text-right tabular-nums font-semibold text-emerald-600">+{formatNum(nuevosReales)}</td>
                                    <td className="px-5 py-3 text-right tabular-nums font-semibold text-rose-500">-{formatNum(eliminadosReales)}</td>
                                    <td className="px-5 py-3 text-right tabular-nums font-semibold">
                                        <NetoBadge value={netoReal} />
                                    </td>
                                    <td className="px-5 py-3" />
                                    <td className="px-5 py-3 text-right tabular-nums font-semibold text-blue-700">
                                        {activosActuales !== null
                                            ? formatNum(activosActuales)
                                            : formatNum(empresas.reduce((a, e) => a + (activosMap.get(e.empresaId) ?? e.totalActivo), 0))}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
