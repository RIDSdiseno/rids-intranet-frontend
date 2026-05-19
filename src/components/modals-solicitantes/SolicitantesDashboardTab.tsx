import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Tooltip,
    Legend,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { api } from "../../api/api";

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Tooltip,
    Legend
);

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

    const { data } = await api.get<{
        ok: boolean;
        total: number;
        data: SolicitanteEliminado[];
    }>("/solicitantes/dashboard/eliminados", {
        params: { desde, hasta, ...(empresaId ? { empresaId } : {}) },
    });
    return data.data;
}

async function getSolicitantesNuevosDetalle(
    mesKey: string,
    empresaId?: number | null,
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

    const { data } = await api.get<{
        ok: boolean;
        total: number;
        data: SolicitanteNuevo[];
    }>("/solicitantes/dashboard/nuevos", {
        params: {
            desde,
            hasta,
            ...(empresaId ? { empresaId } : {}),
            ...(esCargaInicial !== undefined ? { esCargaInicial } : {}),
        },
    });

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

        if (a.esCargaInicial === b.esCargaInicial) return 0;

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
            // ✅ Los eliminados del mes de carga inicial también cuentan
            actual.eliminadosReales += row.eliminados;
            actual.netoReal -= row.eliminados;
        } else {
            actual.nuevosReales += row.nuevos;
            actual.eliminadosReales += row.eliminados;
            actual.netoReal += row.neto;
        }
        map.set(row.empresaId, actual);
    }
    for (const empresa of map.values()) {
        empresa.totalActivo = empresa.cargaInicial + empresa.netoReal;
    }
    return Array.from(map.values()).sort((a, b) => b.cargaInicial - a.cargaInicial);
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function MetricCard({
    label,
    value,
    sub,
    valueClass = "",
}: {
    label: string;
    value: string | number;
    sub?: React.ReactNode;
    valueClass?: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
            <div className={`mt-1 text-2xl font-semibold tabular-nums ${valueClass}`}>{value}</div>
            {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
        </div>
    );
}

function NetoBadge({ value }: { value: number }) {
    if (value > 0)
        return <span className="font-semibold text-emerald-600">+{formatNum(value)} ↑</span>;
    if (value < 0)
        return <span className="font-semibold text-rose-600">{formatNum(value)} ↓</span>;
    return <span className="font-semibold text-slate-400">{formatNum(value)}</span>;
}

// ─── Panel de detalle ─────────────────────────────────────────────────────────

type PanelTipo = "nuevos" | "eliminados";

function DetallePanel({
    tipo,
    mes,
    items,
    loading,
    onClose,
}: {
    tipo: PanelTipo;
    mes: MensualResumen | null;
    items: SolicitanteNuevo[] | SolicitanteEliminado[];
    loading: boolean;
    onClose: () => void;
}) {
    if (!mes) return null;

    const esNuevos = tipo === "nuevos";
    const borderColor = esNuevos ? "border-emerald-200" : "border-rose-200";
    const headerBg = esNuevos ? "bg-emerald-50/60 border-emerald-100" : "bg-rose-50/60 border-rose-100";
    const titleColor = esNuevos ? "text-emerald-800" : "text-rose-800";
    const subtitleColor = esNuevos ? "text-emerald-400" : "text-rose-400";
    const btnColor = esNuevos
        ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
        : "border-rose-200 text-rose-600 hover:bg-rose-50";

    // ✅ Label diferente cuando es carga inicial
    const titulo = esNuevos
        ? mes.esCargaInicial
            ? `Carga inicial — ${mes.mesLabel}`
            : `Nuevos en ${mes.mesLabel}`
        : `Bajas en ${mes.mesLabel}`;

    return (
        <div className={`overflow-hidden rounded-3xl border ${borderColor} bg-white shadow-sm`}>
            <div className={`flex items-center justify-between border-b ${headerBg} px-5 py-4`}>
                <div>
                    <h3 className={`text-base font-semibold ${titleColor}`}>{titulo}</h3>
                    <p className={`mt-0.5 text-sm ${subtitleColor}`}>
                        {loading
                            ? "Cargando…"
                            : `${items.length} solicitante${items.length !== 1 ? "s" : ""}`}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className={`rounded-xl border bg-white px-3 py-1.5 text-sm ${btnColor}`}
                >
                    Cerrar ✕
                </button>
            </div>

            {loading ? (
                <div className="px-5 py-10 text-center text-sm text-slate-400">
                    Cargando detalle…
                </div>
            ) : items.length === 0 ? (
                <div className="px-5 py-10 text-center text-sm text-slate-400">
                    No hay registros para este mes.
                    {!esNuevos && (
                        <>
                            <br />
                            <span className="text-xs text-slate-300">
                                Solo se registran bajas desde que existe fecha de eliminación o desactivación.
                            </span>
                        </>
                    )}
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
                                <th className="px-4 py-3 text-left font-medium">
                                    {esNuevos ? "Fecha creación" : "Fecha baja"}
                                </th>
                                <th className="px-4 py-3 text-left font-medium">Hora</th>
                                {!esNuevos && (
                                    <th className="px-4 py-3 text-left font-medium">Tipo</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((s) => {
                                const fechaIso = esNuevos
                                    ? (s as SolicitanteNuevo).createdAt
                                    : (s as SolicitanteEliminado).fechaBaja;
                                return (
                                    <tr
                                        key={s.id_solicitante}
                                        className="border-t border-slate-100 odd:bg-white even:bg-slate-50/40"
                                    >
                                        <td className="px-4 py-3 font-medium text-slate-700">
                                            {s.nombre}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums text-slate-500 whitespace-nowrap">
                                            {s.rut ?? <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">
                                            {s.email ?? <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">
                                            {s.empresa?.nombre ?? <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums text-slate-500">
                                            {formatFecha(fechaIso)}
                                        </td>
                                        <td className="px-4 py-3 tabular-nums text-slate-400 text-xs">
                                            {formatHora(fechaIso)}
                                        </td>
                                        {!esNuevos && (
                                            <td className="px-4 py-3">
                                                {(s as SolicitanteEliminado).tipoBaja === "ELIMINADO" ? (
                                                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                                                        Eliminado
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                                        Desactivado
                                                    </span>
                                                )}
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
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);

    const [panelTipo, setPanelTipo] = useState<PanelTipo | null>(null);
    const [mesPanelSeleccionado, setMesPanelSeleccionado] = useState<MensualResumen | null>(null);
    const [detalleItems, setDetalleItems] = useState<SolicitanteNuevo[] | SolicitanteEliminado[]>([]);
    const [loadingDetalle, setLoadingDetalle] = useState(false);

    const [activosPorEmpresa, setActivosPorEmpresa] = useState<{ empresaId: number; activos: number }[]>([]);


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
        const handle = () => {
            if (document.visibilityState === "visible") void cargarDashboard(true);
        };
        document.addEventListener("visibilitychange", handle);
        return () => document.removeEventListener("visibilitychange", handle);
    }, [cargarDashboard]);

    useEffect(() => {
        const t = setInterval(() => void cargarDashboard(true), AUTO_REFRESH_MS);
        return () => clearInterval(t);
    }, [cargarDashboard]);

    // ─── Detalle ──────────────────────────────────────────────────────────────

    const abrirDetalle = useCallback(async (tipo: PanelTipo, mes: MensualResumen) => {
        setPanelTipo(tipo);
        setMesPanelSeleccionado(mes);
        setDetalleItems([]);
        setLoadingDetalle(true);
        setTimeout(() => panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
        try {
            const data = tipo === "nuevos"
                ? await getSolicitantesNuevosDetalle(
                    mes.mesKey,
                    empresaId,
                    mes.esCargaInicial
                )
                : await getSolicitantesEliminadosDetalle(mes.mesKey, empresaId);
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

    // ─── Métricas ─────────────────────────────────────────────────────────────

    const mensual = useMemo(() => agruparPorMes(rows), [rows]);
    const empresas = useMemo(() => agruparPorEmpresa(rows), [rows]);

    const cargaInicial = useMemo(
        () => rows.filter((r) => r.esCargaInicial).reduce((acc, r) => acc + r.nuevos, 0),
        [rows]
    );
    const nuevosReales = useMemo(
        () => rows.filter((r) => !r.esCargaInicial).reduce((acc, r) => acc + r.nuevos, 0),
        [rows]
    );
    // Todos los eliminados cuentan, incluidos los del mes de carga inicial
    const eliminadosReales = useMemo(
        () => rows.reduce((acc, r) => acc + r.eliminados, 0),
        [rows]
    );
    const netoReal = nuevosReales - eliminadosReales;

    const netoAcumulado = useMemo(() => {
        let acum = 0;
        return mensual.map((m) => {
            if (!m.esCargaInicial) acum += m.neto;
            return m.esCargaInicial ? null : acum;
        });
    }, [mensual]);

    const activosMap = useMemo(
        () => new Map(activosPorEmpresa.map((r) => [r.empresaId, r.activos])),
        [activosPorEmpresa]
    );

    const isMesSeleccionado = (m: MensualResumen, tipo: PanelTipo) =>
        panelTipo === tipo &&
        mesPanelSeleccionado?.mesKey === m.mesKey &&
        mesPanelSeleccionado?.esCargaInicial === m.esCargaInicial;

    // ─── Chart ────────────────────────────────────────────────────────────────

    const chartData = {
        labels: mensual.map((m) => m.mesLabel),
        datasets: [
            {
                type: "bar" as const,
                label: "Nuevos",
                data: mensual.map((m) => m.nuevos),
                backgroundColor: mensual.map((m) =>
                    isMesSeleccionado(m, "nuevos")
                        ? "#0F6E56"
                        : m.esCargaInicial
                            ? "#9FE1CB"
                            : "#1D9E75"
                ),
                borderColor: mensual.map((m) => (m.esCargaInicial ? "#5DCAA5" : "#0F6E56")),
                borderWidth: mensual.map((m) =>
                    isMesSeleccionado(m, "nuevos") ? 2 : 1
                ) as any,
                order: 2,
            },
            {
                type: "bar" as const,
                label: "Eliminados/Desactivados",
                data: mensual.map((m) => m.eliminados),
                backgroundColor: mensual.map((m) =>
                    isMesSeleccionado(m, "eliminados")
                        ? "#D85A30"
                        : "#F09995"
                ),
                borderColor: mensual.map((m) =>
                    isMesSeleccionado(m, "eliminados")
                        ? "#993C1D"
                        : "#D85A30"
                ),
                borderWidth: mensual.map((m) =>
                    isMesSeleccionado(m, "eliminados") ? 2 : 1
                ) as any,
                order: 2,
            },
            {
                type: "line" as const,
                label: "Neto acumulado",
                data: netoAcumulado,
                borderColor: "#185FA5",
                backgroundColor: "transparent",
                borderWidth: 2,
                pointRadius: 4,
                pointBackgroundColor: "#185FA5",
                tension: 0.3,
                yAxisID: "y2",
                order: 1,
                spanGaps: false,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        onHover: (event: any, elements: any[]) => {
            if (!event?.native?.target) return;
            const canvas = event.native.target as HTMLCanvasElement;
            const clickable = elements.some((el) => {
                const mes = mensual[el.index];
                // ✅ Nuevos: clickeable siempre que haya datos (incluye carga inicial)
                if (el.datasetIndex === 0) return mes?.nuevos > 0;
                // ✅ Eliminados: clickeable siempre que haya datos (incluye mes de carga inicial)
                if (el.datasetIndex === 1) return mes?.eliminados > 0;
                return false;
            });
            canvas.style.cursor = clickable ? "pointer" : "default";
        },
        onClick: (_event: any, elements: any[]) => {
            if (elements.length === 0) return;
            const el = elements[0];
            const mes = mensual[el.index];
            if (!mes) return;
            // ✅ Sin restricción por esCargaInicial en ninguno de los dos
            if (el.datasetIndex === 0 && mes.nuevos > 0) {
                void abrirDetalle("nuevos", mes);
            }
            if (el.datasetIndex === 1 && mes.eliminados > 0) {
                void abrirDetalle("eliminados", mes);
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    afterTitle: (items: any[]) => {
                        const mes = mensual[items?.[0]?.dataIndex];
                        return mes?.esCargaInicial ? "Carga inicial histórica." : "";
                    },
                    afterBody: (items: any[]) => {
                        const item = items?.[0];
                        if (!item) return "";
                        const mes = mensual[item.dataIndex];
                        // ✅ Mostrar hint en ambos datasets sin restricción por carga inicial
                        if (item.datasetIndex === 0 && mes?.nuevos > 0)
                            return "Click para ver el detalle ↓";
                        if (item.datasetIndex === 1 && mes?.eliminados > 0)
                            return "Click para ver el detalle ↓";
                        return "";
                    },
                },
            },
        },
        scales: {
            x: {
                ticks: { font: { size: 11 }, autoSkip: false, maxRotation: 35 },
                grid: { display: false },
            },
            y: {
                ticks: { font: { size: 11 } },
                grid: { color: "rgba(128,128,128,0.08)" },
            },
            y2: {
                position: "right" as const,
                ticks: { font: { size: 11 }, color: "#185FA5" },
                grid: { display: false },
            },
        },
    };

    // ─── Estados ──────────────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="rounded-3xl border border-cyan-200 bg-white p-8 text-center text-slate-400 shadow-sm">
                <div className="text-sm">Cargando dashboard de solicitantes…</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
                {error}
            </div>
        );
    }

    // ─── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="rounded-3xl border border-cyan-200 bg-white/90 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Dashboard de solicitantes</h2>
                        <p className="mt-1 text-sm text-slate-500">
                            Haz click en cualquier barra para ver el detalle de{" "}
                            <span className="font-medium text-emerald-600">nuevos</span> o{" "}
                            <span className="font-medium text-rose-500">eliminados/desactivados</span> ese mes.
                        </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        {ultimaActualizacion && (
                            <span className="text-xs text-slate-400">
                                Actualizado {formatHora(ultimaActualizacion.toISOString())}
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={() => void cargarDashboard()}
                            className="rounded-2xl border border-cyan-200 bg-white px-3 py-1.5 text-sm text-cyan-800 hover:bg-cyan-50"
                        >
                            Recargar
                        </button>
                    </div>
                </div>
            </div>

            {/* Tarjetas */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <MetricCard
                    label="Activos actuales"
                    value={activosActuales !== null ? formatNum(activosActuales) : "—"}
                    sub="Conteo real de usuarios activos"
                    valueClass="text-sky-700"
                />
                <MetricCard
                    label="Carga inicial"
                    value={formatNum(cargaInicial)}
                    sub="Primer mes registrado"
                />
                <MetricCard
                    label="Nuevos reales"
                    value={formatNum(nuevosReales)}
                    valueClass="text-emerald-600"
                    sub={
                        cargaInicial > 0
                            ? `+${((nuevosReales / cargaInicial) * 100).toFixed(1)}% s/ carga`
                            : undefined
                    }
                />
                <MetricCard
                    label="Eliminados/Desactivados"
                    value={formatNum(eliminadosReales)}
                    valueClass="text-rose-600"
                />
                <MetricCard
                    label="Neto real acumulado"
                    value={netoReal > 0 ? `+${formatNum(netoReal)}` : formatNum(netoReal)}
                    valueClass={
                        netoReal > 0
                            ? "text-emerald-600"
                            : netoReal < 0
                                ? "text-rose-600"
                                : "text-slate-400"
                    }
                    sub={
                        netoReal > 0
                            ? "Tendencia positiva ↗"
                            : netoReal < 0
                                ? "Tendencia negativa ↘"
                                : "Sin variación"
                    }
                />
            </div>

            {/* Gráfico */}
            <div className="rounded-3xl border border-cyan-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 className="text-base font-semibold text-slate-800">
                            Nuevos vs eliminados por mes
                        </h3>
                        <p className="text-sm text-slate-500">
                            Click en cualquier barra para ver quiénes entraron o fueron dados de baja ese mes.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-600" />
                            Nuevos
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-400" />
                            Eliminados
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block h-0.5 w-4 bg-sky-700" />
                            Neto acum.
                        </span>
                    </div>
                </div>

                <div className="h-[360px]">
                    <Chart type="bar" data={chartData} options={chartOptions} />
                </div>
            </div>

            {/* Panel de detalle */}
            <div ref={panelRef}>
                {panelTipo && (
                    <DetallePanel
                        tipo={panelTipo}
                        mes={mesPanelSeleccionado}
                        items={detalleItems}
                        loading={loadingDetalle}
                        onClose={cerrarPanel}
                    />
                )}
            </div>

            {/* Tabla por empresa */}
            <div className="overflow-hidden rounded-3xl border border-cyan-200 bg-white shadow-sm">
                <div className="border-b border-cyan-100 p-5">
                    <h3 className="text-base font-semibold text-slate-800">Resumen por empresa</h3>
                    <p className="mt-0.5 text-sm text-slate-500">
                        Total activo estimado = carga inicial + neto real acumulado por empresa.
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gradient-to-r from-cyan-50 to-indigo-50 text-slate-700">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium">Empresa</th>
                                <th className="px-4 py-3 text-right font-medium">Carga inicial</th>
                                <th className="px-4 py-3 text-right font-medium">Nuevos reales</th>
                                <th className="px-4 py-3 text-right font-medium">Eliminados</th>
                                <th className="px-4 py-3 text-right font-medium">Neto real</th>
                                <th className="px-4 py-3 text-right font-medium">Activos actuales</th>
                            </tr>
                        </thead>

                        <tbody>
                            {empresas.map((empresa) => (
                                <tr
                                    key={empresa.empresaId}
                                    className="border-t border-cyan-100 odd:bg-white even:bg-slate-50/40"
                                >
                                    <td className="px-4 py-3 font-medium text-slate-700">
                                        {empresa.empresa}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                                        {formatNum(empresa.cargaInicial)}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums text-emerald-600">
                                        +{formatNum(empresa.nuevosReales)}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums text-rose-500">
                                        {empresa.eliminadosReales > 0
                                            ? `-${formatNum(empresa.eliminadosReales)}`
                                            : <span className="text-slate-300">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums">
                                        <NetoBadge value={empresa.netoReal} />
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-sky-700">
                                        {activosMap.get(empresa.empresaId) !== undefined
                                            ? formatNum(activosMap.get(empresa.empresaId)!)
                                            : formatNum(empresa.totalActivo)}
                                    </td>
                                </tr>
                            ))}

                            {empresas.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                                        No hay datos para mostrar.
                                    </td>
                                </tr>
                            )}
                        </tbody>

                        {empresas.length > 1 && (
                            <tfoot className="border-t-2 border-cyan-200 bg-cyan-50/50">
                                <tr>
                                    <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                                        Total
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-700">
                                        {formatNum(cargaInicial)}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-600">
                                        +{formatNum(nuevosReales)}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-rose-500">
                                        -{formatNum(eliminadosReales)}
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                                        <NetoBadge value={netoReal} />
                                    </td>
                                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-sky-700">
                                        {activosActuales !== null
                                            ? formatNum(activosActuales)
                                            : formatNum(
                                                empresas.reduce((acc, e) => acc + e.totalActivo, 0)
                                            )}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
}