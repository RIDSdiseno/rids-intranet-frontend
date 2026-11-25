// src/components/modals-equipos/DashboardAgentesPage.tsx
import {
    Fragment,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    ClearOutlined,
    ReloadOutlined,
    SearchOutlined,
    DownloadOutlined
} from "@ant-design/icons";

import {
    Badge,
    Button,
    ConfigProvider,
    Input,
    Select,
    Tooltip,
} from "antd";

import {
    ArrowPathIcon,
    BuildingOfficeIcon,
    CheckCircleIcon,
    ChevronDownIcon,
    ChevronUpDownIcon,
    ChevronUpIcon,
    ClipboardDocumentCheckIcon,
    InformationCircleIcon,
    CloudIcon,
    ComputerDesktopIcon,
    CpuChipIcon,
    ExclamationTriangleIcon,
    ShieldCheckIcon,
    SignalSlashIcon,
} from "@heroicons/react/24/outline";

import { api } from "../../../api/api";
import { useAuth } from "../../../components/hooks/useAuth";

import type {
    DashboardAgenteItem,
    DashboardAgenteResponse,
    DashboardAnalizadoMesFilter,
    DashboardEstadoAgente,
    DashboardEstadoOneDrive,
    DashboardSaludOneDrive,
} from "./dashboard-agente.types";

import { EquiposFueraDashboard } from "./EquiposFueraDashboard";

import axios from "axios";

import XLSX from "xlsx-js-style";

type EmpresaOption = {
    id: number;
    nombre: string;
};

type EmpresaCoverageRow = {
    empresaId: number | null;
    nombre: string;
    total: number;
    revisados: number;
    pendientes: number;
    analisis: number;
    pct: number;
};

/*
 * Filtros que no existen en el backend porque agrupan varios estados.
 * Se aplican sobre la tabla en el navegador.
 */
type FiltroLocal =
    | null
    | "DESACTUALIZADO"
    | "OD_ALERTAS"
    | "OD_INESTABLE";

/* Cada card del dashboard aplica uno de estos filtros al hacer clic. */
type FiltroCard =
    | "TODOS_EQUIPOS"
    | "ANALIZADOS"
    | "NO_ANALIZADOS"
    | "AGENTE_ACTIVO"
    | "SIN_CONEXION"
    | "SIN_AGENTE"
    | "DESACTUALIZADO"
    | "OD_OPERATIVO"
    | "OD_ALERTAS"
    | "OD_NO_INSTALADO"
    | "OD_SIN_INFO"
    | "OD_ESTABLE"
    | "OD_INESTABLE";

type FiltrosCards = {
    estadoAgente: "TODOS" | DashboardEstadoAgente;
    estadoOneDrive: "TODOS" | DashboardEstadoOneDrive;
    saludOneDrive: "TODOS" | DashboardSaludOneDrive;
    analizadoMes: DashboardAnalizadoMesFilter;
    filtroLocal: FiltroLocal;
};

const FILTROS_CARDS_DEFAULT: FiltrosCards = {
    estadoAgente: "TODOS",
    estadoOneDrive: "TODOS",
    saludOneDrive: "TODOS",
    analizadoMes: "TODOS",
    filtroLocal: null,
};

const FILTRO_POR_CARD: Record<FiltroCard, Partial<FiltrosCards>> = {
    TODOS_EQUIPOS: {},
    ANALIZADOS: { analizadoMes: "ANALIZADO" },
    NO_ANALIZADOS: { analizadoMes: "NO_ANALIZADO" },
    AGENTE_ACTIVO: { estadoAgente: "ACTIVO" },
    SIN_CONEXION: { estadoAgente: "SIN_CONEXION" },
    SIN_AGENTE: { estadoAgente: "SIN_AGENTE" },
    DESACTUALIZADO: { filtroLocal: "DESACTUALIZADO" },
    OD_OPERATIVO: { estadoOneDrive: "OPERATIVO" },
    OD_ALERTAS: { filtroLocal: "OD_ALERTAS" },
    OD_NO_INSTALADO: { estadoOneDrive: "NO_INSTALADO" },
    OD_SIN_INFO: { estadoOneDrive: "SIN_INFORMACION" },
    OD_ESTABLE: { saludOneDrive: "ESTABLE" },
    OD_INESTABLE: { filtroLocal: "OD_INESTABLE" },
};

/* Columnas ordenables de la tabla de detalle. */
type SortKey =
    | "equipo"
    | "empresa"
    | "agente"
    | "ultimaConexion"
    | "analisis"
    | "oneDrive"
    | "usuario"
    | "salud"
    | "operatividad"
    | "alertas";

type SortDir = "asc" | "desc";

const ORDEN_ESTADO_AGENTE: Record<string, number> = {
    ACTIVO: 0,
    SIN_CONEXION: 1,
    SIN_AGENTE: 2,
};

const ORDEN_SALUD: Record<string, number> = {
    ESTABLE: 0,
    INTERMITENTE: 1,
    CON_FALLAS: 2,
    NO_INSTALADO: 3,
    SIN_DATOS: 4,
};

function textoEquipo(item: DashboardAgenteItem): string {
    return `${item.marca ?? ""} ${item.modelo ?? ""}`.trim();
}

/* Compara dos equipos según la columna elegida (orden ascendente). */
function compararItems(
    a: DashboardAgenteItem,
    b: DashboardAgenteItem,
    key: SortKey,
): number {
    const texto = (x: string, y: string) => x.localeCompare(y, "es", { sensitivity: "base" });
    const fechaMs = (v: string | null) => (v ? new Date(v).getTime() : Number.NEGATIVE_INFINITY);

    switch (key) {
        case "equipo":
            return texto(textoEquipo(a), textoEquipo(b));
        case "empresa":
            return (
                texto(a.empresa?.nombre ?? "~", b.empresa?.nombre ?? "~") ||
                texto(textoEquipo(a), textoEquipo(b))
            );
        case "agente":
            return (ORDEN_ESTADO_AGENTE[a.agente.estado] ?? 9) - (ORDEN_ESTADO_AGENTE[b.agente.estado] ?? 9);
        case "ultimaConexion":
            return fechaMs(a.agente.ultimaConexion) - fechaMs(b.agente.ultimaConexion);
        case "analisis":
            return a.analisisMes.cantidad - b.analisisMes.cantidad;
        case "oneDrive":
            return texto(getOneDriveStateLabel(a.oneDrive.estado), getOneDriveStateLabel(b.oneDrive.estado));
        case "usuario":
            return texto(a.oneDrive.usuario ?? "~", b.oneDrive.usuario ?? "~");
        case "salud":
            return (ORDEN_SALUD[a.oneDrive.saludMes.estado] ?? 9) - (ORDEN_SALUD[b.oneDrive.saludMes.estado] ?? 9);
        case "operatividad":
            return a.oneDrive.saludMes.porcentajeOperativo - b.oneDrive.saludMes.porcentajeOperativo;
        case "alertas":
            return a.alertas.length - b.alertas.length;
        default:
            return 0;
    }
}

/* Encabezado de columna con tooltip y orden ascendente/descendente al hacer clic. */
function SortableTh({
    label,
    tooltip,
    sortKey,
    currentKey,
    currentDir,
    onSort,
    className,
    align = "left",
}: {
    label: string;
    tooltip: string;
    sortKey: SortKey;
    currentKey: SortKey;
    currentDir: SortDir;
    onSort: (key: SortKey) => void;
    className: string;
    align?: "left" | "right" | "center";
}) {
    const activo = sortKey === currentKey;

    return (
        <th
            className={className}
            aria-sort={activo ? (currentDir === "asc" ? "ascending" : "descending") : "none"}
        >
            <Tooltip title={tooltip}>
                <button
                    type="button"
                    onClick={() => onSort(sortKey)}
                    className={clsx(
                        "inline-flex items-center gap-1 uppercase tracking-wide hover:text-cyan-700",
                        activo && "text-cyan-700",
                        align === "right" && "flex-row-reverse",
                        align === "center" && "justify-center",
                    )}
                >
                    {label}
                    {activo ? (
                        <ChevronUpIcon
                            className={clsx(
                                "h-3.5 w-3.5 transition-transform",
                                currentDir === "desc" && "rotate-180",
                            )}
                        />
                    ) : (
                        <ChevronUpDownIcon className="h-3.5 w-3.5 opacity-50" />
                    )}
                </button>
            </Tooltip>
        </th>
    );
}

/* =========================================================
   HELPERS
========================================================= */

function useDebouncedValue<T>(value: T, delay = 450) {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const timeout = window.setTimeout(
            () => setDebounced(value),
            delay
        );

        return () => window.clearTimeout(timeout);
    }, [value, delay]);

    return debounced;
}

function formatDateTimeCL(value?: string | null) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return new Intl.DateTimeFormat("es-CL", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(date);
}

function formatDateCL(value?: string | null) {
    if (!value) return "—";

    const date = new Date(`${value}T12:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date);
}

function formatNumber(value: number | string) {
    if (typeof value === "string") return value;

    return new Intl.NumberFormat("es-CL").format(value);
}

function clsx(
    ...values: Array<string | false | null | undefined>
) {
    return values.filter(Boolean).join(" ");
}

function getAgentStateLabel(estado: DashboardEstadoAgente) {
    const labels: Record<DashboardEstadoAgente, string> = {
        ACTIVO: "Activo",
        SIN_CONEXION: "Sin conexión",
        SIN_AGENTE: "Sin agente",
    };

    return labels[estado];
}

function getAgentStateClass(estado: DashboardEstadoAgente) {
    if (estado === "ACTIVO") {
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (estado === "SIN_CONEXION") {
        return "border-amber-200 bg-amber-50 text-amber-700";
    }

    return "border-slate-200 bg-slate-100 text-slate-600";
}

function getOneDriveStateLabel(estado: DashboardEstadoOneDrive) {
    const labels: Record<DashboardEstadoOneDrive, string> = {
        OPERATIVO: "Operativo",
        NO_INSTALADO: "No instalado",
        NO_EJECUTANDO: "No ejecutándose",
        SIN_USUARIO: "Sin usuario",
        CON_ADVERTENCIAS: "Con advertencias",
        SIN_INFORMACION: "Sin información",
    };

    return labels[estado];
}

function getOneDriveStateClass(estado: DashboardEstadoOneDrive) {
    if (estado === "OPERATIVO") {
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (
        estado === "NO_EJECUTANDO" ||
        estado === "SIN_USUARIO" ||
        estado === "CON_ADVERTENCIAS"
    ) {
        return "border-amber-200 bg-amber-50 text-amber-700";
    }

    if (estado === "NO_INSTALADO") {
        return "border-slate-200 bg-slate-100 text-slate-600";
    }

    return "border-rose-200 bg-rose-50 text-rose-700";
}

function getOneDriveHealthLabel(estado: DashboardSaludOneDrive) {
    const labels: Record<DashboardSaludOneDrive, string> = {
        ESTABLE: "Estable",
        INTERMITENTE: "Intermitente",
        CON_FALLAS: "Con fallas",
        NO_INSTALADO: "No instalado",
        SIN_DATOS: "Sin datos",
    };

    return labels[estado];
}

function getOneDriveHealthClass(estado: DashboardSaludOneDrive) {
    if (estado === "ESTABLE") {
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (estado === "INTERMITENTE") {
        return "border-amber-200 bg-amber-50 text-amber-700";
    }

    if (estado === "CON_FALLAS") {
        return "border-rose-200 bg-rose-50 text-rose-700";
    }

    return "border-slate-200 bg-slate-100 text-slate-600";
}

function coverageBarColor(pct: number) {
    if (pct >= 90) return "bg-emerald-500";
    if (pct >= 50) return "bg-amber-500";
    return "bg-rose-500";
}

function coverageBadgeClass(pct: number) {
    if (pct >= 90) {
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }
    if (pct >= 50) {
        return "border-amber-200 bg-amber-50 text-amber-700";
    }
    return "border-rose-200 bg-rose-50 text-rose-700";
}

function getOperatividadBarClass(
    estado: DashboardSaludOneDrive,
    porcentaje: number
) {
    /*
     * SIN_DATOS y NO_INSTALADO no representan una
     * falla medida, por eso se muestran en gris.
     */
    if (
        estado === "SIN_DATOS" ||
        estado === "NO_INSTALADO"
    ) {
        return "bg-slate-300";
    }

    if (porcentaje >= 100) {
        return "bg-emerald-500";
    }

    if (porcentaje >= 70) {
        return "bg-amber-500";
    }

    return "bg-rose-500";
}

function getOperatividadText(
    estado: DashboardSaludOneDrive,
    porcentaje: number
) {
    /*
     * Evita interpretar ausencia de información
     * como una operatividad real de 0%.
     */
    if (estado === "SIN_DATOS") {
        return "Sin datos";
    }

    if (estado === "NO_INSTALADO") {
        return "No instalado";
    }

    return `${porcentaje}%`;
}

/* =========================================================
   COMPONENTES DE UI
========================================================= */

function BooleanValue({
    value,
    trueText = "Sí",
    falseText = "No",
}: {
    value: boolean | null;
    trueText?: string;
    falseText?: string;
}) {
    if (value === null) {
        return (
            <span className="text-xs text-slate-400">
                Sin información
            </span>
        );
    }

    return (
        <span
            className={clsx(
                "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
                value
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-700"
            )}
        >
            {value ? trueText : falseText}
        </span>
    );
}

type KpiTone =
    | "neutral"
    | "positive"
    | "warning"
    | "critical"
    | "brand";

const KPI_TONES: Record<
    KpiTone,
    { chip: string; border: string }
> = {
    neutral: {
        chip: "bg-slate-100 text-slate-500",
        border: "border-slate-200",
    },
    positive: {
        chip: "bg-emerald-50 text-emerald-600",
        border: "border-slate-200",
    },
    warning: {
        chip: "bg-amber-50 text-amber-600",
        border: "border-amber-200",
    },
    critical: {
        chip: "bg-rose-50 text-rose-600",
        border: "border-rose-200",
    },
    brand: {
        chip: "bg-cyan-50 text-cyan-600",
        border: "border-slate-200",
    },
};

function KpiCard({
    icon: Icon,
    label,
    value,
    tone = "neutral",
    context,
    progress,
    tooltip,
    onClick,
    active = false,
}: {
    icon?: React.ComponentType<{ className?: string }>;
    label: string;
    value: number | string;
    tone?: KpiTone;
    context?: string;
    progress?: number;
    /* Explicación del indicador (ícono i junto al título) */
    tooltip?: string;
    /* Si existe, la card es clickeable y aplica su filtro */
    onClick?: () => void;
    /* La card corresponde al filtro activo */
    active?: boolean;
}) {
    const t = KPI_TONES[tone];

    return (
        <div
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            aria-pressed={onClick ? active : undefined}
            onClick={onClick}
            onKeyDown={(e) => {
                if (onClick && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onClick();
                }
            }}
            className={clsx(
                "flex min-w-0 flex-col rounded-2xl border bg-white p-3 shadow-sm transition sm:p-4 sm:hover:-translate-y-0.5 sm:hover:shadow-md",
                t.border,
                onClick && "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
                active && "ring-2 ring-cyan-500 ring-offset-1"
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {label}

                    {tooltip && (
                        <Tooltip title={tooltip}>
                            <InformationCircleIcon
                                className="h-3.5 w-3.5 shrink-0 cursor-help text-slate-400"
                                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                            />
                        </Tooltip>
                    )}
                </span>

                {Icon && (
                    <span
                        className={clsx(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                            t.chip
                        )}
                    >
                        <Icon className="h-4 w-4" />
                    </span>
                )}
            </div>

            <div className="mt-3 break-words text-2xl font-extrabold tabular-nums text-slate-900 sm:text-3xl">
                {formatNumber(value)}
            </div>

            {progress !== undefined && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all"
                        style={{
                            width: `${Math.min(
                                100,
                                Math.max(0, progress)
                            )}%`,
                        }}
                    />
                </div>
            )}

            {context && (
                <div className="mt-2 text-xs text-slate-500">
                    {context}
                </div>
            )}

            {onClick && (
                <div className="mt-2 text-[11px] font-medium text-cyan-700">
                    {active ? "Filtro aplicado · clic para quitar" : "Clic para ver en la tabla"}
                </div>
            )}
        </div>
    );
}

function KpiSection({
    title,
    description,
    hint,
    columns = 4,
    children,
}: {
    title: string;
    description?: string;
    hint?: string;

    /*
     * Permite adaptar la cantidad de columnas según
     * el número de indicadores de cada sección.
     */
    columns?: 3 | 4 | 6;

    children: React.ReactNode;
}) {
    /*
     * En pantallas grandes:
     *
     * - 3 indicadores: tres columnas.
     * - 4 indicadores: cuatro columnas.
     * - 6 indicadores: tres columnas en XL y seis en 2XL.
     */
    const gridColumnsClass =
        columns === 6
            ? "md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6"
            : columns === 3
                ? "md:grid-cols-3"
                : "md:grid-cols-2 xl:grid-cols-4";

    return (
        <section>
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2 className="text-sm font-bold tracking-tight text-slate-700">
                        {title}
                    </h2>

                    {description && (
                        <p className="mt-0.5 text-xs text-slate-400">
                            {description}
                        </p>
                    )}
                </div>

                {hint && (
                    <span className="w-fit rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-xs font-medium text-slate-500">
                        {hint}
                    </span>
                )}
            </div>

            <div
                className={clsx(
                    "grid grid-cols-1 gap-3 sm:gap-4",
                    gridColumnsClass
                )}
            >
                {children}
            </div>
        </section>
    );
}

function MiniBarChart({
    data,
}: {
    data: DashboardAgenteResponse["graficos"]["actividadPorDia"];
}) {
    const maxValue = Math.max(
        1,
        ...data.map((item) => item.equiposAnalizados)
    );

    if (data.length === 0) {
        return (
            <div className="mt-6 flex flex-col items-center justify-center gap-2 py-16 text-center">
                <ComputerDesktopIcon className="h-8 w-8 text-slate-300" />
                <p className="text-sm text-slate-500">
                    No se registraron análisis durante el período.
                </p>
            </div>
        );
    }

    const gridLines = 4;
    const barMaxPx = 188;

    const promedio = Math.round(
        data.reduce(
            (sum, item) => sum + item.equiposAnalizados,
            0
        ) / data.length
    );

    const promedioBottom = (promedio / maxValue) * barMaxPx;

    return (
        <div className="mt-6">
            <div className="mb-2 flex flex-col gap-1 text-[11px] font-medium sm:flex-row sm:items-center sm:justify-between">
                <span className="inline-flex items-center gap-1.5 text-cyan-700">
                    <span className="inline-block h-0 w-4 border-t border-dashed border-cyan-400" />
                    Promedio {formatNumber(promedio)}/día
                </span>
                <span className="text-slate-400">
                    Máx. {formatNumber(maxValue)} equipos/día
                </span>
            </div>

            <div className="-mx-1 overflow-x-auto px-1 pb-2">
                <div className="min-w-[560px] sm:min-w-[680px] lg:min-w-[720px]">
                    <div
                        className="relative"
                        style={{ height: 200 }}
                    >
                        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                            {Array.from({
                                length: gridLines + 1,
                            }).map((_, index) => (
                                <div
                                    key={index}
                                    className="border-t border-dashed border-slate-100"
                                />
                            ))}
                        </div>

                        {promedio > 0 && (
                            <div
                                className="pointer-events-none absolute inset-x-0"
                                style={{
                                    bottom: `${promedioBottom}px`,
                                }}
                            >
                                <div className="border-t border-dashed border-cyan-400/80" />
                            </div>
                        )}

                        <div className="absolute inset-0 flex items-end gap-1.5">
                            {data.map((item) => {
                                const height = Math.max(
                                    6,
                                    (item.equiposAnalizados /
                                        maxValue) *
                                    barMaxPx
                                );

                                return (
                                    <div
                                        key={item.fecha}
                                        className="group/bar flex h-full min-w-[24px] flex-1 flex-col items-center justify-end"
                                        title={`${formatDateCL(
                                            item.fecha
                                        )}: ${item.equiposAnalizados
                                            } equipos, ${item.analisis
                                            } análisis`}
                                    >
                                        <div className="mb-1 text-[10px] font-semibold text-slate-500 opacity-0 transition group-hover/bar:opacity-100">
                                            {
                                                item.equiposAnalizados
                                            }
                                        </div>

                                        <div
                                            className="w-full max-w-[24px] rounded-t-md bg-gradient-to-t from-cyan-600 to-indigo-500 transition group-hover/bar:from-cyan-500 group-hover/bar:to-indigo-400"
                                            style={{
                                                height: `${height}px`,
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-2 flex gap-1.5">
                        {data.map((item) => (
                            <div
                                key={item.fecha}
                                className="min-w-[24px] flex-1 text-center text-[10px] text-slate-400"
                            >
                                {item.fecha.slice(-2)}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function EmpresaCoverage({
    empresas,
    selectedId,
    onSelect,
}: {
    empresas: EmpresaCoverageRow[];
    /* Empresa aplicada como filtro (se resalta) */
    selectedId?: number | null;
    /* Si existe, cada empresa es clickeable y filtra la tabla */
    onSelect?: (empresaId: number | null) => void;
}) {
    const totalEquipos = empresas.reduce(
        (sum, empresa) => sum + empresa.total,
        0
    );

    const totalRevisados = empresas.reduce(
        (sum, empresa) => sum + empresa.revisados,
        0
    );

    const pctGlobal = totalEquipos
        ? Math.round((totalRevisados / totalEquipos) * 100)
        : 0;

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <BuildingOfficeIcon className="h-5 w-5 text-cyan-600" />
                        <h3 className="text-sm font-semibold text-slate-800">
                            Cobertura por empresa
                        </h3>

                        <Tooltip title="Porcentaje de PCs en uso de cada empresa que enviaron al menos un inventario durante el mes seleccionado. No considera dados de baja, vendidos, equipos que no son PC ni equipos en stock o en RIDS.">
                            <InformationCircleIcon className="h-4 w-4 cursor-help text-slate-400" />
                        </Tooltip>
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                        Equipos revisados este mes respecto al
                        total administrado en cada empresa.
                        {onSelect && " Haz clic en una empresa para ver sus equipos en la tabla."}
                    </p>
                </div>

                {empresas.length > 0 && (
                    <div className="grid grid-cols-1 gap-1 text-xs text-slate-500 sm:flex sm:flex-wrap sm:items-center sm:gap-x-4">
                        <span>
                            <strong className="text-slate-800">
                                {formatNumber(empresas.length)}
                            </strong>{" "}
                            empresas
                        </span>
                        <span>
                            <strong className="text-slate-800">
                                {formatNumber(totalEquipos)}
                            </strong>{" "}
                            equipos
                        </span>
                        <span>
                            <strong className="text-emerald-700">
                                {formatNumber(totalRevisados)}
                            </strong>{" "}
                            revisados ({pctGlobal}%)
                        </span>
                    </div>
                )}
            </div>

            {empresas.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <BuildingOfficeIcon className="h-8 w-8 text-slate-300" />
                    <p className="text-sm text-slate-500">
                        No hay empresas para los filtros
                        seleccionados.
                    </p>
                </div>
            ) : (
                <>
                    <div className="mt-4 grid max-h-[430px] grid-cols-1 gap-x-8 gap-y-3.5 overflow-y-auto pr-1 lg:grid-cols-2">
                        {empresas.map((empresa) => {
                            const clickeable =
                                Boolean(onSelect) && empresa.empresaId !== null;
                            const seleccionada =
                                empresa.empresaId !== null &&
                                empresa.empresaId === selectedId;

                            return (
                                <div
                                    key={empresa.empresaId ?? empresa.nombre}
                                    role={clickeable ? "button" : undefined}
                                    tabIndex={clickeable ? 0 : undefined}
                                    aria-pressed={clickeable ? seleccionada : undefined}
                                    title={
                                        clickeable
                                            ? seleccionada
                                                ? "Clic para quitar el filtro de empresa"
                                                : "Clic para ver los equipos de esta empresa en la tabla"
                                            : undefined
                                    }
                                    onClick={() => {
                                        if (clickeable) onSelect?.(empresa.empresaId);
                                    }}
                                    onKeyDown={(e) => {
                                        if (clickeable && (e.key === "Enter" || e.key === " ")) {
                                            e.preventDefault();
                                            onSelect?.(empresa.empresaId);
                                        }
                                    }}
                                    className={clsx(
                                        "grid grid-cols-1 gap-2 rounded-xl px-2 py-1.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-x-3",
                                        clickeable && "cursor-pointer transition hover:bg-cyan-50/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",
                                        seleccionada && "bg-cyan-50 ring-1 ring-cyan-300"
                                    )}
                                >
                                    <div className="min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="truncate text-sm font-medium text-slate-700">
                                                {empresa.nombre}
                                            </span>

                                            {empresa.pendientes >
                                                0 && (
                                                    <span className="shrink-0 text-[11px] font-medium text-rose-500">
                                                        {formatNumber(
                                                            empresa.pendientes
                                                        )}{" "}
                                                        sin revisar
                                                    </span>
                                                )}
                                        </div>

                                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className={clsx(
                                                    "h-full rounded-full transition-all",
                                                    coverageBarColor(
                                                        empresa.pct
                                                    )
                                                )}
                                                style={{
                                                    width: `${empresa.pct}%`,
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-2 sm:block sm:w-16 sm:text-right">
                                        <span
                                            className={clsx(
                                                "inline-flex justify-center rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums",
                                                coverageBadgeClass(
                                                    empresa.pct
                                                )
                                            )}
                                        >
                                            {empresa.pct}%
                                        </span>

                                        <div className="mt-0.5 text-[11px] tabular-nums text-slate-400">
                                            {formatNumber(
                                                empresa.revisados
                                            )}
                                            /
                                            {formatNumber(
                                                empresa.total
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                            Cobertura ≥ 90%
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            50% – 89%
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-rose-500" />
                            Menos de 50%
                        </span>
                    </div>
                </>
            )}
        </section>
    );
}

function VersionDistribution({
    title,
    items,
    icon: Icon,
}: {
    title: string;
    items: Array<{ version: string; cantidad: number }>;
    icon: React.ComponentType<{ className?: string }>;
}) {
    const total = items.reduce(
        (sum, item) => sum + item.cantidad,
        0
    );

    const max = Math.max(1, ...items.map((item) => item.cantidad));

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-cyan-600" />
                    <h3 className="text-sm font-semibold text-slate-800">
                        {title}
                    </h3>
                </div>

                <span className="text-xs text-slate-400">
                    {formatNumber(total)} equipos
                </span>
            </div>

            <div className="mt-4 space-y-3.5">
                {items.slice(0, 8).map((item) => {
                    const pct = total
                        ? Math.round(
                            (item.cantidad / total) * 100
                        )
                        : 0;

                    return (
                        <div key={item.version}>
                            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                                <span className="truncate font-medium text-slate-700">
                                    {item.version}
                                </span>

                                <span className="shrink-0 tabular-nums font-semibold text-slate-500">
                                    {formatNumber(
                                        item.cantidad
                                    )}
                                    <span className="ml-1 font-normal text-slate-400">
                                        · {pct}%
                                    </span>
                                </span>
                            </div>

                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500"
                                    style={{
                                        width: `${(item.cantidad /
                                            max) *
                                            100
                                            }%`,
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}

                {items.length === 0 && (
                    <div className="py-8 text-center text-sm text-slate-500">
                        Sin datos para el período.
                    </div>
                )}
            </div>
        </section>
    );
}

function DetailField({
    label,
    value,
}: {
    label: string;
    value: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1 border-b border-slate-100 py-2 last:border-none sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <span className="shrink-0 text-xs font-medium text-slate-500">
                {label}
            </span>

            <span className="min-w-0 break-words text-left text-sm text-slate-800 sm:text-right">
                {value}
            </span>
        </div>
    );
}

function EquipoExpandedDetail({
    item,
}: {
    item: DashboardAgenteItem;
}) {
    return (
        <div
            className="
        grid
        grid-cols-1
        gap-3
        p-3
        sm:gap-4
        sm:p-4
        lg:grid-cols-2
        xl:grid-cols-3
    "
        >
            <section className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2">
                    <CpuChipIcon className="h-4 w-4 text-slate-500" />
                    <h4 className="text-sm font-semibold text-slate-800">
                        Equipo y agente
                    </h4>
                </div>

                <div className="mt-3">
                    <DetailField
                        label="Hostname"
                        value={item.agente.hostname || "—"}
                    />
                    {/* Serial registrado para identificar físicamente el equipo. */}
                    <DetailField
                        label="Serial"
                        value={item.serial || "Sin serial"}
                    />
                    <DetailField
                        label="Usuario"
                        value={item.agente.usuarioActual || "—"}
                    />
                    {/* Identificación comercial del equipo. */}
                    <DetailField
                        label="Marca y modelo"
                        value={
                            [item.marca, item.modelo]
                                .filter(Boolean)
                                .join(" ") || "—"
                        }
                    />
                    <DetailField
                        label="Sistema"
                        value={
                            item.hardware.sistemaOperativo ||
                            "—"
                        }
                    />
                    <DetailField
                        label="RAM"
                        value={
                            item.hardware.ramGb !== null
                                ? `${item.hardware.ramGb} GB`
                                : "—"
                        }
                    />
                    <DetailField
                        label="Disco libre"
                        value={
                            item.hardware.diskFreeGb !== null
                                ? `${item.hardware.diskFreeGb} GB`
                                : "—"
                        }
                    />
                    <DetailField
                        label="Último arranque"
                        value={formatDateTimeCL(
                            item.agente.ultimoArranque
                        )}
                    />
                </div>
            </section>

            <section className="min-w-0 rounded-xl border border-cyan-200 bg-cyan-50/40 p-4">
                <div className="flex items-center gap-2">
                    <CloudIcon className="h-4 w-4 text-cyan-600" />
                    <h4 className="text-sm font-semibold text-slate-800">
                        Configuración OneDrive
                    </h4>
                </div>

                <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between gap-3 py-1.5">
                        <span className="text-xs font-medium text-slate-500">
                            Instalado
                        </span>
                        <BooleanValue
                            value={item.oneDrive.instalado}
                        />
                    </div>

                    <div className="flex items-center justify-between gap-3 py-1.5">
                        <span className="text-xs font-medium text-slate-500">
                            En ejecución
                        </span>
                        <BooleanValue
                            value={item.oneDrive.enEjecucion}
                        />
                    </div>

                    <div className="flex items-center justify-between gap-3 py-1.5">
                        <span className="text-xs font-medium text-slate-500">
                            Operativo
                        </span>
                        <BooleanValue
                            value={item.oneDrive.operativo}
                        />
                    </div>

                    <DetailField
                        label="Usuario"
                        value={item.oneDrive.usuario || "—"}
                    />
                    <DetailField
                        label="Versión"
                        value={item.oneDrive.version || "—"}
                    />
                </div>

                <div className="mt-3">
                    <span className="text-xs font-medium text-slate-500">
                        Estado reportado
                    </span>
                    <div className="mt-1 whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-600">
                        {item.oneDrive.estadoReportado ||
                            "Sin detalle"}
                    </div>
                </div>
            </section>

            <section className="min-w-0 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
                <div className="flex items-center gap-2">
                    <ClipboardDocumentCheckIcon className="h-4 w-4 text-indigo-600" />
                    <h4 className="text-sm font-semibold text-slate-800">
                        Operatividad mensual de OneDrive
                    </h4>
                </div>

                <div className="mt-3">
                    <div className="flex items-center justify-between gap-3 py-1.5">
                        <span className="text-xs font-medium text-slate-500">
                            Estado
                        </span>
                        <span
                            className={clsx(
                                "inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
                                getOneDriveHealthClass(
                                    item.oneDrive.saludMes.estado
                                )
                            )}
                        >
                            {getOneDriveHealthLabel(
                                item.oneDrive.saludMes.estado
                            )}
                        </span>
                    </div>

                    <DetailField
                        label="Operatividad"
                        value={getOperatividadText(
                            item.oneDrive.saludMes.estado,
                            item.oneDrive.saludMes.porcentajeOperativo
                        )}
                    />
                    <DetailField
                        label="Análisis con datos"
                        value={
                            item.oneDrive.saludMes
                                .totalAnalisisConDatos
                        }
                    />
                    <DetailField
                        label="Análisis correctos"
                        value={
                            item.oneDrive.saludMes
                                .analisisOperativos
                        }
                    />
                    <DetailField
                        label="Análisis con falla"
                        value={
                            item.oneDrive.saludMes
                                .analisisConFalla
                        }
                    />
                    <DetailField
                        label="Usuarios detectados"
                        value={
                            item.oneDrive.saludMes
                                .usuariosDetectados.length > 0
                                ? item.oneDrive.saludMes.usuariosDetectados.join(
                                    ", "
                                )
                                : "—"
                        }
                    />
                    <DetailField
                        label="Versiones detectadas"
                        value={
                            item.oneDrive.saludMes
                                .versionesDetectadas.length > 0
                                ? item.oneDrive.saludMes.versionesDetectadas.join(
                                    ", "
                                )
                                : "—"
                        }
                    />
                </div>

                {item.alertas.length > 0 && (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800">
                            <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                            Alertas
                        </div>

                        <ul className="mt-2 space-y-1 text-xs text-amber-700">
                            {item.alertas.map((alerta) => (
                                <li
                                    key={alerta}
                                    className="flex gap-1.5"
                                >
                                    <span className="text-amber-400">
                                        •
                                    </span>
                                    <span>{alerta}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </section>
        </div>
    );
}

/*
 * Contenedor visual para cada filtro.
 * Usa un div porque Select de Ant Design no es un
 * elemento select HTML asociado directamente a un label.
 */
function FilterField({
    label,
    children,
    className,
}: {
    label: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={clsx("min-w-0", className)}>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {label}
            </div>

            {children}
        </div>
    );
}

function EquipoMobileCard({
    item,
    expanded,
    onToggle,
}: {
    item: DashboardAgenteItem;
    expanded: boolean;
    onToggle: () => void;
}) {
    const hasAlertas = item.alertas.length > 0;

    return (
        <article
            className={clsx(
                "overflow-hidden rounded-2xl border bg-white shadow-sm",
                hasAlertas
                    ? "border-amber-200"
                    : "border-slate-200",
                expanded && "ring-2 ring-cyan-100"
            )}
        >
            <button
                type="button"
                onClick={onToggle}
                className="flex w-full items-start justify-between gap-3 p-4 text-left"
                aria-expanded={expanded}
            >
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <ComputerDesktopIcon className="h-5 w-5 shrink-0 text-cyan-600" />

                        <span className="truncate font-semibold text-slate-900">
                            {item.agente.hostname ||
                                `Equipo #${item.idEquipo}`}
                        </span>
                    </div>

                    <div className="mt-1 truncate text-xs text-slate-500">
                        {item.serial || "Sin serial"}
                    </div>

                    <div className="mt-0.5 truncate text-xs text-slate-400">
                        {[item.marca, item.modelo]
                            .filter(Boolean)
                            .join(" ") || "Sin marca y modelo"}
                    </div>
                </div>

                <ChevronDownIcon
                    className={clsx(
                        "mt-1 h-5 w-5 shrink-0 text-slate-400 transition-transform",
                        expanded && "rotate-180 text-cyan-600"
                    )}
                />
            </button>

            <div className="grid grid-cols-1 gap-3 border-t border-slate-100 bg-slate-50/50 p-4 min-[420px]:grid-cols-2">
                <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-slate-400">
                        Empresa
                    </div>
                    <div className="mt-1 truncate text-sm font-medium text-slate-700">
                        {item.empresa?.nombre || "Sin empresa"}
                    </div>
                    <div className="truncate text-xs text-slate-500">
                        {item.solicitante?.nombre || "Sin solicitante"}
                    </div>
                </div>

                <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-400">
                        Análisis
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-700">
                        {item.analisisMes.cantidad}
                    </div>
                    <div className="text-xs text-slate-500">
                        {item.analisisMes.diasAnalizados} día(s)
                    </div>
                </div>

                <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-400">
                        Agente
                    </div>
                    <span
                        className={clsx(
                            "mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
                            getAgentStateClass(item.agente.estado)
                        )}
                    >
                        {getAgentStateLabel(item.agente.estado)}
                    </span>
                </div>

                <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-400">
                        OneDrive
                    </div>
                    <span
                        className={clsx(
                            "mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
                            getOneDriveStateClass(item.oneDrive.estado)
                        )}
                    >
                        {getOneDriveStateLabel(item.oneDrive.estado)}
                    </span>
                </div>

                <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-400">
                        Salud mensual
                    </div>
                    <span
                        className={clsx(
                            "mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold",
                            getOneDriveHealthClass(
                                item.oneDrive.saludMes.estado
                            )
                        )}
                    >
                        {getOneDriveHealthLabel(
                            item.oneDrive.saludMes.estado
                        )}
                    </span>
                </div>

                <div>
                    <div className="text-[11px] uppercase tracking-wide text-slate-400">
                        Operatividad
                    </div>
                    <div className="mt-1 text-sm font-semibold text-slate-700">
                        {getOperatividadText(
                            item.oneDrive.saludMes.estado,
                            item.oneDrive.saludMes.porcentajeOperativo
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-col gap-1 border-t border-slate-100 px-4 py-3 text-xs min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                <span className="text-slate-500">
                    Última conexión
                </span>

                <span className="font-medium text-slate-700">
                    {formatDateTimeCL(item.agente.ultimaConexion)}
                </span>
            </div>

            {hasAlertas && (
                <div className="flex items-center gap-2 border-t border-amber-100 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    {item.alertas.length} alerta(s)
                </div>
            )}

            {expanded && (
                <div className="border-t border-cyan-100 bg-slate-50/80">
                    <EquipoExpandedDetail item={item} />
                </div>
            )}
        </article>
    );
}

function TableSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                    <div
                        key={index}
                        className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white"
                    />
                ))}
            </div>

            <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        </div>
    );
}

/* =========================================================
   PÁGINA
========================================================= */

export default function DashboardAgentesPage() {
    const { user, isCliente } = useAuth();

    /*
 * Cantidad de equipos visibles por página.
 */
    const TABLE_PAGE_SIZE = 25;

    const now = new Date();

    const [exporting, setExporting] =
        useState(false);

    const [year, setYear] = useState(now.getFullYear());

    const [month, setMonth] = useState(now.getMonth() + 1);

    const [search, setSearch] = useState("");

    const debouncedSearch = useDebouncedValue(search);

    const [empresaOptions, setEmpresaOptions] = useState<
        EmpresaOption[]
    >([]);

    const [empresaId, setEmpresaId] = useState<number | null>(
        () => {
            if (isCliente && user?.empresaId) {
                return Number(user.empresaId);
            }

            return null;
        }
    );

    const [estadoAgente, setEstadoAgente] = useState<
        "TODOS" | DashboardEstadoAgente
    >("TODOS");

    const [estadoOneDrive, setEstadoOneDrive] = useState<
        "TODOS" | DashboardEstadoOneDrive
    >("TODOS");

    const [saludOneDrive, setSaludOneDrive] = useState<
        "TODOS" | DashboardSaludOneDrive
    >("TODOS");

    const [analizadoMes, setAnalizadoMes] =
        useState<DashboardAnalizadoMesFilter>("TODOS");

    const [data, setData] =
        useState<DashboardAgenteResponse | null>(null);

    const [loading, setLoading] = useState(false);

    const [error, setError] = useState<string | null>(null);

    const [expandedId, setExpandedId] = useState<
        number | null
    >(null);

    const [tablePage, setTablePage] = useState(1);

    /* Filtros de las cards que el backend no tiene (se aplican en la tabla) */
    const [filtroLocal, setFiltroLocal] = useState<FiltroLocal>(null);

    /* Orden de la tabla: por defecto, empresa de la A a la Z */
    const [sortKey, setSortKey] = useState<SortKey>("empresa");
    const [sortDir, setSortDir] = useState<SortDir>("asc");

    async function fetchDashboard(signal?: AbortSignal) {
        try {
            setLoading(true);
            setError(null);

            const response =
                await api.get<DashboardAgenteResponse>(
                    "/equipos/agent/dashboard",
                    {
                        signal,
                        params: {
                            year,
                            month,

                            empresaId:
                                empresaId ?? undefined,

                            search:
                                debouncedSearch || undefined,

                            estadoAgente,
                            estadoOneDrive,
                            saludOneDrive,
                            analizadoMes,

                            _ts: Date.now(),
                        },
                    }
                );

            setData(response.data);
        } catch (err) {
            const code = (err as { code?: string }).code;

            if (
                code === "ERR_CANCELED" ||
                (err as Error).name === "AbortError"
            ) {
                return;
            }

            /*
 * Intenta mostrar primero el mensaje enviado por el backend.
 * Si no existe, usa el mensaje general de Axios.
 */
            if (axios.isAxiosError(err)) {
                const backendMessage =
                    err.response?.data?.error;

                setError(
                    typeof backendMessage === "string"
                        ? backendMessage
                        : err.message ||
                        "No fue posible cargar el dashboard."
                );

                return;
            }

            setError(
                err instanceof Error
                    ? err.message
                    : "No fue posible cargar el dashboard."
            );
        } finally {
            setLoading(false);
        }
    }

    async function fetchEmpresas(signal?: AbortSignal) {
        try {
            const response = await api.get("/empresas", {
                signal,
            });

            const rows = Array.isArray(response.data?.data)
                ? response.data.data
                : [];

            const options = rows
                .filter(
                    (empresa: { isActive?: boolean }) =>
                        empresa.isActive !== false
                )
                .map(
                    (empresa: {
                        id_empresa: number;
                        nombre: string;
                    }) => ({
                        id: empresa.id_empresa,
                        nombre: empresa.nombre,
                    })
                )
                .sort(
                    (a: EmpresaOption, b: EmpresaOption) =>
                        a.nombre.localeCompare(b.nombre, "es")
                );

            setEmpresaOptions(options);
        } catch (err) {
            if ((err as Error).name === "AbortError") {
                return;
            }

            console.error("Error cargando empresas:", err);

            setEmpresaOptions([]);
        }
    }

    useEffect(() => {
        const controller = new AbortController();

        void fetchDashboard(controller.signal);

        return () => controller.abort();
    }, [
        year,
        month,
        empresaId,
        debouncedSearch,
        estadoAgente,
        estadoOneDrive,
        saludOneDrive,
        analizadoMes,
    ]);

    /*
 * Cuando cambia cualquier filtro, la tabla vuelve
 * a la primera página y cierra el detalle expandido.
 */
    useEffect(() => {
        setTablePage(1);
        setExpandedId(null);
    }, [
        year,
        month,
        empresaId,
        debouncedSearch,
        estadoAgente,
        estadoOneDrive,
        saludOneDrive,
        analizadoMes,
    ]);

    useEffect(() => {
        const controller = new AbortController();

        void fetchEmpresas(controller.signal);

        return () => controller.abort();
    }, []);

    const years = useMemo(() => {
        const currentYear = new Date().getFullYear();

        return Array.from(
            { length: 6 },
            (_, index) => currentYear - index
        );
    }, []);

    const months = [
        "Enero",
        "Febrero",
        "Marzo",
        "Abril",
        "Mayo",
        "Junio",
        "Julio",
        "Agosto",
        "Septiembre",
        "Octubre",
        "Noviembre",
        "Diciembre",
    ];

    const summary = data?.resumen;

    /*
  * La cobertura se recibe calculada desde el backend.
  * Esto evita que filtros como "Analizados este mes"
  * alteren artificialmente los porcentajes.
  */
    const empresaCoverage =
        useMemo<EmpresaCoverageRow[]>(() => {
            return (
                data?.graficos
                    .coberturaPorEmpresa ??
                []
            ).map((empresa) => ({
                empresaId:
                    empresa.empresaId,

                nombre:
                    empresa.nombre,

                total:
                    empresa.total,

                revisados:
                    empresa.revisados,

                pendientes:
                    empresa.pendientes,

                analisis:
                    empresa.analisis,

                pct:
                    empresa.porcentaje,
            }))
                /* Orden alfabético; «Sin empresa» al final */
                .sort((a, b) =>
                    (a.empresaId === null ? 1 : 0) -
                    (b.empresaId === null ? 1 : 0) ||
                    a.nombre.localeCompare(b.nombre, "es", {
                        sensitivity: "base",
                    })
                );
        }, [
            data?.graficos
                .coberturaPorEmpresa,
        ]);

    const activeFilters = [
        search.trim() !== "",
        !isCliente && empresaId !== null,
        estadoAgente !== "TODOS",
        estadoOneDrive !== "TODOS",
        saludOneDrive !== "TODOS",
        analizadoMes !== "TODOS",
        filtroLocal !== null,
    ].filter(Boolean).length;

    /* ---------- Cards clickeables ---------- */

    const filtrosCardsActuales: FiltrosCards = {
        estadoAgente,
        estadoOneDrive,
        saludOneDrive,
        analizadoMes,
        filtroLocal,
    };

    const esCardActiva = (card: FiltroCard): boolean => {
        /* «Equipos administrados» solo limpia los filtros de las cards */
        if (card === "TODOS_EQUIPOS") return false;

        const esperado = { ...FILTROS_CARDS_DEFAULT, ...FILTRO_POR_CARD[card] };

        return (Object.keys(esperado) as Array<keyof FiltrosCards>).every(
            (k) => esperado[k] === filtrosCardsActuales[k],
        );
    };

    const aplicarFiltrosCards = (f: FiltrosCards) => {
        setEstadoAgente(f.estadoAgente);
        setEstadoOneDrive(f.estadoOneDrive);
        setSaludOneDrive(f.saludOneDrive);
        setAnalizadoMes(f.analizadoMes);
        setFiltroLocal(f.filtroLocal);
        setExpandedId(null);
        setTablePage(1);
    };

    /*
     * Al hacer clic en una card se aplica solo su filtro (y se quitan los de
     * las otras cards). Si ya estaba aplicado, se quita. Empresa, búsqueda y
     * período se mantienen.
     */
    const cardFiltro = (card: FiltroCard) => ({
        active: esCardActiva(card),
        onClick: () => {
            const activa = esCardActiva(card);

            aplicarFiltrosCards(
                activa
                    ? FILTROS_CARDS_DEFAULT
                    : { ...FILTROS_CARDS_DEFAULT, ...FILTRO_POR_CARD[card] },
            );

            document
                .getElementById("tabla-detalle-agentes")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
        },
    });

    /* ---------- Cobertura clickeable ---------- */

    const seleccionarEmpresaCobertura = (id: number | null) => {
        if (isCliente || id === null) return;

        setEmpresaId((actual) => (actual === id ? null : id));

        document
            .getElementById("tabla-detalle-agentes")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    /* ---------- Orden de la tabla ---------- */

    const ordenarPor = (key: SortKey) => {
        if (key === sortKey) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortKey(key);
            setSortDir("asc");
        }

        setTablePage(1);
        setExpandedId(null);
    };

    const clearFilters = () => {
        setSearch("");

        if (!isCliente) {
            setEmpresaId(null);
        }

        setEstadoAgente("TODOS");
        setEstadoOneDrive("TODOS");
        setSaludOneDrive("TODOS");
        setAnalizadoMes("TODOS");
        setFiltroLocal(null);
        setExpandedId(null);
    };

    async function exportDashboardToExcel() {
        if (
            !data ||
            data.items.length === 0
        ) {
            return;
        }

        try {
            setExporting(true);

            /* =====================================================
               DETALLE DE EQUIPOS
            ===================================================== */

            const rowsEquipos =
                data.items.map(
                    (item) => ({
                        "ID Equipo":
                            item.idEquipo,

                        Empresa:
                            item.empresa
                                ?.nombre ??
                            "",

                        Solicitante:
                            item.solicitante
                                ?.nombre ??
                            "",

                        "Correo solicitante":
                            item.solicitante
                                ?.email ??
                            "",

                        Serial:
                            item.serial ??
                            "",

                        Marca:
                            item.marca ??
                            "",

                        Modelo:
                            item.modelo ??
                            "",

                        Hostname:
                            item.agente
                                .hostname ??
                            "",

                        "Usuario actual":
                            item.agente
                                .usuarioActual ??
                            "",

                        "Sistema operativo":
                            item.hardware
                                .sistemaOperativo ??
                            "",

                        "RAM GB":
                            item.hardware
                                .ramGb ??
                            "",

                        "Disco total GB":
                            item.hardware
                                .diskTotalGb ??
                            "",

                        "Disco libre GB":
                            item.hardware
                                .diskFreeGb ??
                            "",

                        "Estado agente":
                            getAgentStateLabel(
                                item.agente.estado
                            ),

                        "Versión agente":
                            item.agente
                                .version ??
                            "",

                        "Versión recomendada":
                            item.agente
                                .versionRecomendada ??
                            "",

                        "Versión desactualizada":
                            item.agente
                                .versionDesactualizada
                                ? "Sí"
                                : "No",

                        "Última conexión":
                            formatDateTimeCL(
                                item.agente
                                    .ultimaConexion
                            ),

                        "Último arranque":
                            formatDateTimeCL(
                                item.agente
                                    .ultimoArranque
                            ),

                        "Análisis del mes":
                            item.analisisMes
                                .cantidad,

                        "Días analizados":
                            item.analisisMes
                                .diasAnalizados,

                        "Analizado este mes":
                            item.analisisMes
                                .analizado
                                ? "Sí"
                                : "No",

                        "Último análisis":
                            formatDateTimeCL(
                                item.analisisMes
                                    .ultimoAnalisis
                            ),

                        "Estado OneDrive":
                            getOneDriveStateLabel(
                                item.oneDrive.estado
                            ),

                        "OneDrive instalado":
                            item.oneDrive
                                .instalado === null
                                ? "Sin información"
                                : item.oneDrive
                                    .instalado
                                    ? "Sí"
                                    : "No",

                        "OneDrive en ejecución":
                            item.oneDrive
                                .enEjecucion === null
                                ? "Sin información"
                                : item.oneDrive
                                    .enEjecucion
                                    ? "Sí"
                                    : "No",

                        "OneDrive operativo":
                            item.oneDrive
                                .operativo === null
                                ? "Sin información"
                                : item.oneDrive
                                    .operativo
                                    ? "Sí"
                                    : "No",

                        "Usuario OneDrive":
                            item.oneDrive
                                .usuario ??
                            "",

                        "Versión OneDrive":
                            item.oneDrive
                                .version ??
                            "",

                        "Salud mensual OneDrive":
                            getOneDriveHealthLabel(
                                item.oneDrive
                                    .saludMes
                                    .estado
                            ),

                        "Operatividad OneDrive":
                            item.oneDrive
                                .saludMes
                                .estado ===
                                "SIN_DATOS"
                                ? "Sin datos"
                                : item.oneDrive
                                    .saludMes
                                    .estado ===
                                    "NO_INSTALADO"
                                    ? "No instalado"
                                    : `${item.oneDrive.saludMes.porcentajeOperativo}%`,

                        "Análisis OneDrive con datos":
                            item.oneDrive
                                .saludMes
                                .totalAnalisisConDatos,

                        "Análisis OneDrive correctos":
                            item.oneDrive
                                .saludMes
                                .analisisOperativos,

                        "Análisis OneDrive con falla":
                            item.oneDrive
                                .saludMes
                                .analisisConFalla,

                        Antivirus:
                            item.seguridad
                                .antivirusNombre ??
                            "",

                        "Antivirus activo":
                            item.seguridad
                                .antivirusActivo ===
                                null
                                ? "Sin información"
                                : item.seguridad
                                    .antivirusActivo
                                    ? "Sí"
                                    : "No",

                        Firewall:
                            item.seguridad
                                .firewallActivo ===
                                null
                                ? "Sin información"
                                : item.seguridad
                                    .firewallActivo
                                    ? "Sí"
                                    : "No",

                        BitLocker:
                            item.seguridad
                                .cifradoEstado ??
                            "",

                        "Windows Update":
                            item.seguridad
                                .windowsUpdate ??
                            "",

                        "Revisión solicitante":
                            item.clasificacion
                                .requiereRevision
                                ? "Sí"
                                : "No",

                        "Motivo revisión":
                            item.clasificacion
                                .motivo ??
                            "",

                        Alertas:
                            item.alertas.length,

                        "Detalle alertas":
                            item.alertas.join(
                                " | "
                            ),
                    })
                );

            /* =====================================================
               RESUMEN
            ===================================================== */

            const resumen =
                data.resumen;

            const rowsResumen = [
                {
                    Indicador:
                        "Equipos administrados",

                    Valor:
                        resumen.totalEquipos,
                },

                {
                    Indicador:
                        "Equipos analizados",

                    Valor:
                        resumen.equiposAnalizados,
                },

                {
                    Indicador:
                        "Equipos no analizados",

                    Valor:
                        resumen.equiposNoAnalizados,
                },

                {
                    Indicador:
                        "Cobertura",

                    Valor:
                        `${resumen.porcentajeAnalizados}%`,
                },

                {
                    Indicador:
                        "Total análisis",

                    Valor:
                        resumen.totalAnalisis,
                },

                {
                    Indicador:
                        "Agentes activos",

                    Valor:
                        resumen.agentesActivos,
                },

                {
                    Indicador:
                        "Agentes sin conexión",

                    Valor:
                        resumen.agentesSinConexion,
                },

                {
                    Indicador:
                        "Equipos sin agente",

                    Valor:
                        resumen.equiposSinAgente,
                },

                {
                    Indicador:
                        "Agentes desactualizados",

                    Valor:
                        resumen.agentesDesactualizados,
                },

                {
                    Indicador:
                        "OneDrive operativo",

                    Valor:
                        resumen.oneDriveOperativo,
                },

                {
                    Indicador:
                        "OneDrive no instalado",

                    Valor:
                        resumen.oneDriveNoInstalado,
                },

                {
                    Indicador:
                        "OneDrive con advertencias",

                    Valor:
                        resumen.oneDriveConAdvertencias,
                },

                {
                    Indicador:
                        "OneDrive sin información",

                    Valor:
                        resumen.oneDriveSinInformacion,
                },

                {
                    Indicador:
                        "OneDrive estable durante el mes",

                    Valor:
                        resumen.oneDriveEstableMes,
                },

                {
                    Indicador:
                        "OneDrive intermitente",

                    Valor:
                        resumen.oneDriveIntermitenteMes,
                },

                {
                    Indicador:
                        "OneDrive con fallas",

                    Valor:
                        resumen.oneDriveConFallasMes,
                },
            ];

            /* =====================================================
               COBERTURA POR EMPRESA
            ===================================================== */

            const rowsEmpresas =
                data.graficos
                    .coberturaPorEmpresa
                    .map(
                        (empresa) => ({
                            Empresa:
                                empresa.nombre,

                            "Total equipos":
                                empresa.total,

                            Revisados:
                                empresa.revisados,

                            Pendientes:
                                empresa.pendientes,

                            "Total análisis":
                                empresa.analisis,

                            Cobertura:
                                `${empresa.porcentaje}%`,
                        })
                    );

            /* =====================================================
               CREAR LIBRO
            ===================================================== */

            const workbook =
                XLSX.utils.book_new();

            const wsEquipos =
                XLSX.utils.json_to_sheet(
                    rowsEquipos
                );

            const wsResumen =
                XLSX.utils.json_to_sheet(
                    rowsResumen
                );

            const wsEmpresas =
                XLSX.utils.json_to_sheet(
                    rowsEmpresas
                );

            /* =====================================================
               ANCHOS
            ===================================================== */

            wsEquipos["!cols"] = [
                { wch: 10 },
                { wch: 28 },
                { wch: 26 },
                { wch: 32 },
                { wch: 20 },
                { wch: 16 },
                { wch: 22 },
                { wch: 22 },
                { wch: 26 },
                { wch: 28 },
                { wch: 12 },
                { wch: 14 },
                { wch: 14 },
                { wch: 18 },
                { wch: 18 },
                { wch: 20 },
                { wch: 20 },
                { wch: 22 },
                { wch: 22 },
            ];

            wsResumen["!cols"] = [
                { wch: 38 },
                { wch: 18 },
            ];

            wsEmpresas["!cols"] = [
                { wch: 32 },
                { wch: 18 },
                { wch: 18 },
                { wch: 18 },
                { wch: 18 },
                { wch: 16 },
            ];

            /* =====================================================
               AUTOFILTER
            ===================================================== */

            if (
                wsEquipos["!ref"]
            ) {
                wsEquipos["!autofilter"] = {
                    ref:
                        wsEquipos["!ref"],
                };
            }

            if (
                wsEmpresas["!ref"]
            ) {
                wsEmpresas["!autofilter"] = {
                    ref:
                        wsEmpresas["!ref"],
                };
            }

            /* =====================================================
               ESTILO DE ENCABEZADOS
            ===================================================== */

            const aplicarEstiloEncabezado =
                (
                    worksheet:
                        XLSX.WorkSheet
                ) => {
                    if (
                        !worksheet["!ref"]
                    ) {
                        return;
                    }

                    const range =
                        XLSX.utils.decode_range(
                            worksheet["!ref"]
                        );

                    for (
                        let col =
                            range.s.c;
                        col <=
                        range.e.c;
                        col++
                    ) {
                        const address =
                            XLSX.utils.encode_cell({
                                r:
                                    0,

                                c:
                                    col,
                            });

                        if (
                            !worksheet[
                            address
                            ]
                        ) {
                            continue;
                        }

                        worksheet[
                            address
                        ].s = {
                            font: {
                                bold:
                                    true,

                                color: {
                                    rgb:
                                        "FFFFFF",
                                },
                            },

                            fill: {
                                fgColor: {
                                    rgb:
                                        "0891B2",
                                },
                            },

                            alignment: {
                                vertical:
                                    "center",

                                horizontal:
                                    "center",
                            },
                        };
                    }
                };

            aplicarEstiloEncabezado(
                wsEquipos
            );

            aplicarEstiloEncabezado(
                wsResumen
            );

            aplicarEstiloEncabezado(
                wsEmpresas
            );

            /* =====================================================
               HOJAS
            ===================================================== */

            XLSX.utils.book_append_sheet(
                workbook,
                wsResumen,
                "Resumen"
            );

            XLSX.utils.book_append_sheet(
                workbook,
                wsEquipos,
                "Equipos"
            );

            XLSX.utils.book_append_sheet(
                workbook,
                wsEmpresas,
                "Cobertura empresas"
            );

            /* =====================================================
               DESCARGAR
            ===================================================== */

            const empresaSeleccionada =
                empresaOptions.find(
                    (
                        empresa
                    ) =>
                        empresa.id ===
                        empresaId
                );

            const empresaSegura =
                empresaSeleccionada
                    ?.nombre
                    ?.trim()
                    .replace(
                        /[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]+/g,
                        "_"
                    ) ??
                "TODAS";

            const monthText =
                String(
                    month
                ).padStart(
                    2,
                    "0"
                );

            const fileName =
                `Dashboard_Agentes_${empresaSegura}_${year}-${monthText}.xlsx`;

            XLSX.writeFile(
                workbook,
                fileName
            );
        } catch (
        error
        ) {
            console.error(
                "Error exportando dashboard:",
                error
            );
        } finally {
            setExporting(false);
        }
    }

    /*
  * Equipos de la tabla: los del backend, más los filtros locales
  * de las cards y el orden elegido en los encabezados.
  */
    const tableItems = useMemo(() => {
        const base = (data?.items ?? []).filter((item) => {
            if (filtroLocal === "DESACTUALIZADO") {
                return item.agente.versionDesactualizada;
            }

            if (filtroLocal === "OD_ALERTAS") {
                return ["NO_EJECUTANDO", "SIN_USUARIO", "CON_ADVERTENCIAS"].includes(
                    item.oneDrive.estado,
                );
            }

            if (filtroLocal === "OD_INESTABLE") {
                return ["INTERMITENTE", "CON_FALLAS"].includes(
                    item.oneDrive.saludMes.estado,
                );
            }

            return true;
        });

        const factor = sortDir === "asc" ? 1 : -1;

        return [...base].sort(
            (a, b) =>
                factor * compararItems(a, b, sortKey) ||
                a.idEquipo - b.idEquipo,
        );
    }, [data?.items, filtroLocal, sortKey, sortDir]);

    const paginatedItems = useMemo(() => {
        const start =
            (tablePage - 1) * TABLE_PAGE_SIZE;

        return tableItems.slice(
            start,
            start + TABLE_PAGE_SIZE
        );
    }, [tableItems, tablePage]);

    const tableTotalPages = Math.max(
        1,
        Math.ceil(
            tableItems.length /
            TABLE_PAGE_SIZE
        )
    );

    const firstVisibleItem =
        tableItems.length
            ? (tablePage - 1) * TABLE_PAGE_SIZE + 1
            : 0;

    const lastVisibleItem = Math.min(
        tablePage * TABLE_PAGE_SIZE,
        tableItems.length
    );

    return (
        <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-white via-white to-cyan-50/60">
            <div className="mx-auto w-full max-w-[1900px] space-y-4 px-3 py-4 sm:space-y-6 sm:px-5 sm:py-6 lg:px-8">
                {/* ============ ENCABEZADO Y FILTROS ============ */}
                <ConfigProvider
                    theme={{
                        token: {
                            // Color principal utilizado por inputs, selects y botones.
                            colorPrimary: "#0891b2",
                            borderRadius: 12,
                            controlHeightLG: 42,
                            fontSize: 14,
                        },
                        components: {
                            Select: {
                                // Fondo de la opción seleccionada en el desplegable.
                                optionSelectedBg: "#ecfeff",
                            },
                            Input: {
                                activeBorderColor: "#06b6d4",
                                hoverBorderColor: "#22d3ee",
                            },
                            Button: {
                                primaryShadow:
                                    "0 2px 8px rgba(8, 145, 178, 0.22)",
                            },
                        },
                    }}
                >
                    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 bg-gradient-to-r from-cyan-50/70 via-white to-indigo-50/70 p-4 sm:p-6 lg:p-7">
                            <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                                <div className="min-w-0">
                                    <h1 className="mt-1.5 break-words text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">
                                        Dashboard Script y Equipos{" "}
                                        <span className="bg-gradient-to-r from-cyan-600 to-indigo-600 bg-clip-text text-transparent">
                                            RIDS.CL
                                        </span>
                                    </h1>

                                    <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-600 sm:text-sm">
                                        Inventarios realizados, estado
                                        del agente y operatividad de
                                        OneDrive durante el mes
                                        seleccionado.
                                    </p>

                                    {data?.periodo && (
                                        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                            {months[
                                                data.periodo.month - 1
                                            ] ??
                                                data.periodo
                                                    .month}{" "}
                                            {data.periodo.year}
                                        </div>
                                    )}
                                </div>

                                <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
                                    {/* Limpia todos los filtros opcionales del dashboard. */}
                                    <Badge
                                        count={activeFilters}
                                        size="small"
                                        offset={[-3, 3]}
                                        overflowCount={9}
                                        className="w-full sm:w-auto"
                                    >
                                        <Button
                                            size="large"
                                            icon={<ClearOutlined />}
                                            onClick={clearFilters}
                                            disabled={activeFilters === 0}
                                            block
                                            className="sm:!w-auto"
                                        >
                                            Limpiar filtros
                                        </Button>
                                    </Badge>

                                    {/* Recarga conservando todos los filtros seleccionados. */}
                                    <Button
                                        type="primary"
                                        size="large"
                                        icon={<ReloadOutlined />}
                                        loading={loading}
                                        onClick={() => void fetchDashboard()}
                                        block
                                        className="sm:!w-auto"
                                    >
                                        Recargar
                                    </Button>
                                    <Button
                                        size="large"
                                        icon={
                                            <DownloadOutlined />
                                        }
                                        loading={
                                            exporting
                                        }
                                        disabled={
                                            loading ||
                                            !data ||
                                            data.items.length ===
                                            0
                                        }
                                        onClick={() =>
                                            void exportDashboardToExcel()
                                        }
                                        block
                                        className="sm:!w-auto"
                                    >
                                        Exportar
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 sm:p-6">
                            {/*
     * ConfigProvider aplica la identidad visual del dashboard
     * solo a esta sección de filtros.
     */}
                            {/* ============ FILTROS PRINCIPALES ============ */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
                                <FilterField
                                    label="Buscar equipo"
                                    className="sm:col-span-2 lg:col-span-2 xl:col-span-2 2xl:col-span-2"
                                >
                                    <Input
                                        size="large"
                                        value={search}
                                        allowClear
                                        prefix={
                                            <SearchOutlined className="text-slate-400" />
                                        }
                                        placeholder="Serial, hostname, empresa, usuario…"
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                    />
                                </FilterField>

                                <FilterField label="Mes">
                                    <Select
                                        size="large"
                                        className="w-full"
                                        value={month}
                                        onChange={(value: number) =>
                                            setMonth(value)
                                        }
                                        options={months.map(
                                            (label, index) => ({
                                                label,
                                                value: index + 1,
                                            })
                                        )}
                                    />
                                </FilterField>

                                <FilterField label="Año">
                                    <Select
                                        size="large"
                                        className="w-full"
                                        value={year}
                                        onChange={(value: number) =>
                                            setYear(value)
                                        }
                                        options={years.map((value) => ({
                                            label: String(value),
                                            value,
                                        }))}
                                    />
                                </FilterField>

                                <FilterField label="Empresa">
                                    <Select
                                        size="large"
                                        className="w-full"
                                        value={empresaId ?? undefined}
                                        disabled={isCliente}
                                        allowClear={!isCliente}
                                        showSearch
                                        optionFilterProp="label"
                                        placeholder="Todas las empresas"
                                        onChange={(
                                            value: number | undefined
                                        ) =>
                                            setEmpresaId(value ?? null)
                                        }
                                        /*
                                         * Se filtra por el texto visible de la empresa.
                                         */
                                        filterOption={(input, option) =>
                                            String(option?.label ?? "")
                                                .toLocaleLowerCase("es")
                                                .includes(
                                                    input.toLocaleLowerCase("es")
                                                )
                                        }
                                        options={empresaOptions.map(
                                            (empresa) => ({
                                                label: empresa.nombre,
                                                value: empresa.id,
                                            })
                                        )}
                                    />
                                </FilterField>

                                <FilterField label="Estado del agente">
                                    <Select<
                                        "TODOS" | DashboardEstadoAgente
                                    >
                                        size="large"
                                        className="w-full"
                                        value={estadoAgente}
                                        onChange={(value) =>
                                            setEstadoAgente(value)
                                        }
                                        options={[
                                            {
                                                label: "Todos los agentes",
                                                value: "TODOS",
                                            },
                                            {
                                                label: "Agente activo",
                                                value: "ACTIVO",
                                            },
                                            {
                                                label: "Sin conexión",
                                                value: "SIN_CONEXION",
                                            },
                                            {
                                                label: "Sin agente",
                                                value: "SIN_AGENTE",
                                            },
                                        ]}
                                    />
                                </FilterField>

                                <FilterField label="Cobertura mensual">
                                    <Select<DashboardAnalizadoMesFilter>
                                        size="large"
                                        className="w-full"
                                        value={analizadoMes}
                                        onChange={(value) =>
                                            setAnalizadoMes(value)
                                        }
                                        options={[
                                            {
                                                label: "Todos los análisis",
                                                value: "TODOS",
                                            },
                                            {
                                                label: "Analizados este mes",
                                                value: "ANALIZADO",
                                            },
                                            {
                                                label: "No analizados",
                                                value: "NO_ANALIZADO",
                                            },
                                        ]}
                                    />
                                </FilterField>
                            </div>

                            {/* ============ FILTROS DE ONEDRIVE ============ */}
                            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <FilterField label="Estado actual de OneDrive">
                                    <Select<
                                        "TODOS" | DashboardEstadoOneDrive
                                    >
                                        size="large"
                                        className="w-full"
                                        value={estadoOneDrive}
                                        onChange={(value) =>
                                            setEstadoOneDrive(value)
                                        }
                                        options={[
                                            {
                                                label:
                                                    "Todos los estados actuales",
                                                value: "TODOS",
                                            },
                                            {
                                                label: "Operativo",
                                                value: "OPERATIVO",
                                            },
                                            {
                                                label: "No instalado",
                                                value: "NO_INSTALADO",
                                            },
                                            {
                                                label: "No ejecutándose",
                                                value: "NO_EJECUTANDO",
                                            },
                                            {
                                                label: "Sin usuario",
                                                value: "SIN_USUARIO",
                                            },
                                            {
                                                label: "Con advertencias",
                                                value: "CON_ADVERTENCIAS",
                                            },
                                            {
                                                label: "Sin información",
                                                value: "SIN_INFORMACION",
                                            },
                                        ]}
                                    />
                                </FilterField>

                                <FilterField label="Estado mensual de OneDrive">
                                    <Select<
                                        "TODOS" | DashboardSaludOneDrive
                                    >
                                        size="large"
                                        className="w-full"
                                        value={saludOneDrive}
                                        onChange={(value) =>
                                            setSaludOneDrive(value)
                                        }
                                        options={[
                                            {
                                                label:
                                                    "Toda la operatividad mensual",
                                                value: "TODOS",
                                            },
                                            {
                                                label: "Estable durante el mes",
                                                value: "ESTABLE",
                                            },
                                            {
                                                label: "Intermitente",
                                                value: "INTERMITENTE",
                                            },
                                            {
                                                label: "Con fallas",
                                                value: "CON_FALLAS",
                                            },
                                            {
                                                label: "No instalado",
                                                value: "NO_INSTALADO",
                                            },
                                            {
                                                label: "Sin datos mensuales",
                                                value: "SIN_DATOS",
                                            },
                                        ]}
                                    />

                                    <p className="mt-1.5 text-[11px] leading-4 text-slate-400">
                                        Indica si presentó estados no operativos durante el mes.
                                    </p>
                                </FilterField>
                            </div>
                        </div>
                    </section>
                </ConfigProvider>

                {error && (
                    <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                        <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
                        <div>
                            <p className="font-semibold">
                                No se pudo cargar el dashboard
                            </p>
                            <p className="mt-0.5 text-rose-600">
                                {error}
                            </p>
                        </div>
                    </div>
                )}

                {loading && !data && <TableSkeleton />}

                {summary && (
                    <>
                        {/* ============ KPIs AGRUPADOS ============ */}
                        <KpiSection
                            title="Cobertura del inventario"
                            description="Cuántos equipos administrados fueron efectivamente revisados este mes."
                            hint={`${summary.porcentajeAnalizados}% analizados`}
                            columns={3}
                        >
                            <KpiCard
                                icon={ComputerDesktopIcon}
                                label="Equipos administrados"
                                tooltip="PCs en uso (activos, en garantía o en taller externo) según los filtros. No incluye dados de baja, vendidos, equipos que no son PC ni equipos en stock o en RIDS. Clic para quitar los filtros de las cards."
                                {...cardFiltro("TODOS_EQUIPOS")}
                                value={summary.totalEquipos}
                                tone="brand"
                                context="Equipos incluidos según los filtros actuales."
                            />

                            <KpiCard
                                icon={CheckCircleIcon}
                                label="Analizados este mes"
                                tooltip="Equipos que enviaron al menos un inventario (sincronización) durante el mes seleccionado. El porcentaje es la cobertura del mes."
                                {...cardFiltro("ANALIZADOS")}
                                value={summary.equiposAnalizados}
                                tone="positive"
                                progress={summary.porcentajeAnalizados}
                                context={`${summary.porcentajeAnalizados}% de cobertura`}
                            />

                            <KpiCard
                                icon={ExclamationTriangleIcon}
                                label="No analizados"
                                tooltip="Equipos sin ningún inventario recibido en el mes: no tienen agente, el PC estuvo apagado o el agente no se ejecutó."
                                {...cardFiltro("NO_ANALIZADOS")}
                                value={summary.equiposNoAnalizados}
                                tone={
                                    summary.equiposNoAnalizados > 0
                                        ? "warning"
                                        : "neutral"
                                }
                                context="Equipos sin sincronización durante el mes seleccionado."
                            />
                        </KpiSection>

                        <KpiSection
                            title="Estado de los agentes"
                            description="Disponibilidad y versión del agente instalado en cada equipo."
                            hint={`${formatNumber(
                                summary.agentesActivos +
                                summary.agentesSinConexion
                            )} con agente registrado`}
                        >
                            <KpiCard
                                icon={CheckCircleIcon}
                                label="Agentes activos"
                                tooltip="El agente reportó dentro del umbral configurado. El agente corre cada 14 días; el umbral deja una semana de margen."
                                {...cardFiltro("AGENTE_ACTIVO")}
                                value={summary.agentesActivos}
                                tone="positive"
                                context={`Reportaron dentro de las últimas ${data?.configuracion.horasSinConexion ?? 0} horas.`}
                            />

                            <KpiCard
                                icon={SignalSlashIcon}
                                label="Sin conexión"
                                tooltip="Tienen agente instalado, pero no reportan desde hace más del umbral configurado. Revisar si el PC está apagado, desconectado o si la tarea programada falló."
                                {...cardFiltro("SIN_CONEXION")}
                                value={summary.agentesSinConexion}
                                tone={
                                    summary.agentesSinConexion > 0
                                        ? "warning"
                                        : "neutral"
                                }
                                context="Tienen agente registrado, pero superaron el tiempo esperado."
                            />

                            <KpiCard
                                icon={ExclamationTriangleIcon}
                                label="Sin agente"
                                tooltip="Equipos registrados en el CRM que nunca han enviado inventario: el agente no está instalado."
                                {...cardFiltro("SIN_AGENTE")}
                                value={summary.equiposSinAgente}
                                tone={
                                    summary.equiposSinAgente > 0
                                        ? "critical"
                                        : "neutral"
                                }
                                context="Equipos que nunca han enviado inventario mediante el agente."
                            />

                            <KpiCard
                                icon={ArrowPathIcon}
                                label="Versión desactualizada"
                                tooltip="Agentes con una versión anterior a la recomendada para su plataforma (Windows o Mac). Las versiones más nuevas no se marcan."
                                {...cardFiltro("DESACTUALIZADO")}
                                value={summary.agentesDesactualizados}
                                tone={
                                    summary.agentesDesactualizados > 0
                                        ? "warning"
                                        : "neutral"
                                }
                                context={
                                    data?.configuracion.versionAgenteRecomendada
                                        ? `Anteriores a ${data.configuracion.versionAgenteRecomendada} (Windows)${data.configuracion.versionAgenteRecomendadaMac ? ` o ${data.configuracion.versionAgenteRecomendadaMac} (Mac)` : ""}.`
                                        : "No existe una versión recomendada configurada."
                                }
                            />
                        </KpiSection>

                        <KpiSection
                            title="Operatividad de OneDrive"
                            description="Estado actual y estabilidad de OneDrive durante el período seleccionado."
                            columns={6}
                        >
                            <KpiCard
                                icon={CloudIcon}
                                label="Operativo actualmente"
                                tooltip="Según el último reporte, OneDrive está instalado, en ejecución, con usuario y sincronizando sin advertencias."
                                {...cardFiltro("OD_OPERATIVO")}
                                value={summary.oneDriveOperativo}
                                tone="positive"
                                context="Instalado, ejecutándose, con usuario y operativo."
                            />

                            <KpiCard
                                icon={ExclamationTriangleIcon}
                                label="Con alertas reales"
                                tooltip="OneDrive está instalado pero no se está ejecutando, no tiene usuario o reporta advertencias."
                                {...cardFiltro("OD_ALERTAS")}
                                value={summary.oneDriveConAdvertencias}
                                tone={
                                    summary.oneDriveConAdvertencias > 0
                                        ? "warning"
                                        : "neutral"
                                }
                                context="El agente confirmó una condición que requiere revisión."
                            />

                            <KpiCard
                                icon={SignalSlashIcon}
                                label="No instalado"
                                tooltip="El agente confirmó que OneDrive no está instalado en el equipo."
                                {...cardFiltro("OD_NO_INSTALADO")}
                                value={summary.oneDriveNoInstalado}
                                tone={
                                    summary.oneDriveNoInstalado > 0
                                        ? "warning"
                                        : "neutral"
                                }
                                context="El agente confirmó que OneDrive no está instalado."
                            />

                            <KpiCard
                                icon={ComputerDesktopIcon}
                                label="Sin información"
                                tooltip="El agente todavía no ha enviado datos de OneDrive (versión antigua del agente o sin reportes). No se considera falla."
                                {...cardFiltro("OD_SIN_INFO")}
                                value={summary.oneDriveSinInformacion}
                                tone="neutral"
                                context="Todavía no se han recibido datos suficientes de OneDrive."
                            />

                            <KpiCard
                                icon={CheckCircleIcon}
                                label="Estable durante el mes"
                                tooltip="OneDrive estuvo operativo en el 100% de los reportes del mes que traían datos."
                                {...cardFiltro("OD_ESTABLE")}
                                value={summary.oneDriveEstableMes}
                                tone="positive"
                                context="Operativo en todos los análisis mensuales con datos."
                            />

                            <KpiCard
                                icon={ExclamationTriangleIcon}
                                label="Intermitente / con fallas"
                                tooltip="Intermitente: operativo entre 70% y 99% de los reportes del mes. Con fallas: menos de 70%."
                                {...cardFiltro("OD_INESTABLE")}
                                value={
                                    summary.oneDriveIntermitenteMes +
                                    summary.oneDriveConFallasMes
                                }
                                tone={
                                    summary.oneDriveIntermitenteMes +
                                        summary.oneDriveConFallasMes >
                                        0
                                        ? "critical"
                                        : "neutral"
                                }
                                context="Presentó al menos un estado de OneDrive no operativo durante el mes."
                            />
                        </KpiSection>

                        {/* ============ GRÁFICO + CONFIGURACIÓN ============ */}
                        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 xl:col-span-2">
                                <div className="flex items-center gap-2">
                                    <ComputerDesktopIcon className="h-5 w-5 text-cyan-600" />
                                    <h3 className="text-sm font-semibold text-slate-800">
                                        Equipos analizados por día
                                    </h3>
                                </div>

                                <p className="mt-1 text-xs text-slate-500">
                                    Equipos únicos con al menos un
                                    análisis en cada día del mes.
                                </p>

                                <MiniBarChart
                                    data={
                                        data?.graficos
                                            .actividadPorDia ??
                                        []
                                    }
                                />
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                <div className="flex items-center gap-2">
                                    <ShieldCheckIcon className="h-5 w-5 text-cyan-600" />
                                    <h3 className="text-sm font-semibold text-slate-800">
                                        Criterios de evaluación
                                    </h3>
                                </div>

                                <div className="mt-4 space-y-3">
                                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                            Agente sin conexión
                                        </div>
                                        <div className="mt-0.5 text-sm text-slate-700">
                                            Tras{" "}
                                            <span className="font-semibold text-slate-900">
                                                {
                                                    data
                                                        ?.configuracion
                                                        .horasSinConexion
                                                }{" "}
                                                horas (
                                                {Math.round(
                                                    (data?.configuracion
                                                        .horasSinConexion ?? 0) / 24
                                                )}{" "}
                                                días)
                                            </span>{" "}
                                            sin reportar.
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                            Versión recomendada
                                        </div>
                                        <div className="mt-0.5 text-sm font-semibold text-slate-900">
                                            {data?.configuracion
                                                .versionAgenteRecomendada
                                                ? `Windows ${data.configuracion.versionAgenteRecomendada}${data.configuracion.versionAgenteRecomendadaMac ? ` · Mac ${data.configuracion.versionAgenteRecomendadaMac}` : ""}`
                                                : "No configurada"}
                                        </div>
                                    </div>

                                    <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                            OneDrive operativo
                                        </div>
                                        <div className="mt-0.5 text-sm text-slate-700">
                                            Instalado,
                                            ejecutándose, con
                                            usuario y operativo.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* ============ COBERTURA POR EMPRESA ============ */}
                        <EmpresaCoverage
                            empresas={empresaCoverage}
                            selectedId={empresaId}
                            {...(isCliente
                                ? {}
                                : { onSelect: seleccionarEmpresaCobertura })}
                        />

                        {/* ============ VERSIONES ============ */}
                        <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <VersionDistribution
                                title="Versiones del agente"
                                icon={CpuChipIcon}
                                items={
                                    data?.graficos
                                        .versionesAgente ?? []
                                }
                            />

                            <VersionDistribution
                                title="Versiones de OneDrive"
                                icon={CloudIcon}
                                items={
                                    data?.graficos
                                        .versionesOneDrive ?? []
                                }
                            />
                        </section>

                        {/* ============ TABLA DETALLE ============ */}
                        <section
                            id="tabla-detalle-agentes"
                            className="min-w-0 scroll-mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm"
                        >
                            <div className="flex flex-col gap-2 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                    <h3 className="font-semibold text-slate-900">
                                        Detalle por equipo
                                    </h3>

                                    <p className="text-xs text-slate-500">
                                        Selecciona una fila para
                                        revisar configuración y
                                        operatividad mensual. Haz clic
                                        en un encabezado para ordenar.
                                    </p>

                                    {filtroLocal && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFiltroLocal(null);
                                                setTablePage(1);
                                            }}
                                            className="mt-1 inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 text-[11px] font-medium text-cyan-700 hover:bg-cyan-100"
                                        >
                                            Filtro:{" "}
                                            {filtroLocal === "DESACTUALIZADO"
                                                ? "versión desactualizada"
                                                : filtroLocal === "OD_ALERTAS"
                                                    ? "OneDrive con alertas"
                                                    : "OneDrive intermitente o con fallas"}{" "}
                                            ✕
                                        </button>
                                    )}
                                </div>

                                <div className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                                    {formatNumber(
                                        tableItems.length
                                    )}{" "}
                                    resultado(s)
                                </div>
                            </div>

                            {/* Vista móvil y tablet pequeña */}
                            {/*
 * En teléfonos y tablets se utiliza la vista de tarjetas.
 * La tabla comienza recién desde el breakpoint LG.
 */}
                            <div className="space-y-3 p-3 lg:hidden">
                                {paginatedItems.map((item) => (
                                    <EquipoMobileCard
                                        key={item.idEquipo}
                                        item={item}
                                        expanded={expandedId === item.idEquipo}
                                        onToggle={() =>
                                            setExpandedId((current) =>
                                                current === item.idEquipo
                                                    ? null
                                                    : item.idEquipo
                                            )
                                        }
                                    />
                                ))}

                                {tableItems.length === 0 && (
                                    <div className="flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-12 text-center">
                                        <ComputerDesktopIcon className="h-8 w-8 text-slate-300" />

                                        <p className="text-sm font-medium text-slate-600">
                                            No se encontraron equipos
                                        </p>

                                        <p className="text-xs text-slate-400">
                                            Ajusta los filtros para ampliar la búsqueda.
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="hidden border-b border-slate-100 bg-slate-50/60 px-4 py-2 text-[11px] text-slate-500 lg:block xl:hidden">
                                Desliza horizontalmente para visualizar todas las columnas.
                            </div>

                            {/* =====================================================
    TABLA RESPONSIVE PARA TABLET Y ESCRITORIO
===================================================== */}
                            <div className="hidden w-full min-w-0 overflow-x-auto overscroll-x-contain lg:block">
                                {/*
     * En resoluciones intermedias mantiene un ancho mínimo
     * para permitir desplazamiento horizontal.
     *
     * En pantallas XL o superiores ocupa todo el ancho
     * disponible del dashboard.
     */}
                                <table
                                    className="
            w-full
            min-w-[1180px]
            table-auto
            border-collapse
            xl:min-w-full
        "
                                >
                                    <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
                                        <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500">
                                            <SortableTh
                                                label="Equipo"
                                                tooltip="Marca y modelo del equipo, con su serial."
                                                sortKey="equipo"
                                                currentKey={sortKey}
                                                currentDir={sortDir}
                                                onSort={ordenarPor}
                                                className="sticky left-0 z-20 w-[20%] min-w-[250px] bg-slate-50 px-4 py-3 font-semibold"
                                            />

                                            <SortableTh
                                                label="Empresa"
                                                tooltip="Empresa del equipo (o la de su solicitante). Orden por defecto: A a Z."
                                                sortKey="empresa"
                                                currentKey={sortKey}
                                                currentDir={sortDir}
                                                onSort={ordenarPor}
                                                className="w-[14%] min-w-[170px] px-4 py-3 font-semibold"
                                            />

                                            <SortableTh
                                                label="Agente"
                                                tooltip="Activo: reportó dentro del umbral. Sin conexión: superó el umbral. Sin agente: nunca reportó."
                                                sortKey="agente"
                                                currentKey={sortKey}
                                                currentDir={sortDir}
                                                onSort={ordenarPor}
                                                className="w-[10%] min-w-[125px] px-4 py-3 font-semibold"
                                            />

                                            <SortableTh
                                                label="Última conexión"
                                                tooltip="Fecha y hora del último inventario recibido desde el agente."
                                                sortKey="ultimaConexion"
                                                currentKey={sortKey}
                                                currentDir={sortDir}
                                                onSort={ordenarPor}
                                                className="w-[11%] min-w-[145px] px-4 py-3 font-semibold"
                                            />

                                            <SortableTh
                                                label="Análisis mes"
                                                tooltip="Cantidad de inventarios recibidos durante el mes seleccionado."
                                                sortKey="analisis"
                                                currentKey={sortKey}
                                                currentDir={sortDir}
                                                onSort={ordenarPor}
                                                className="w-[8%] min-w-[110px] px-4 py-3 text-right font-semibold"
                                                align="right"
                                            />

                                            <SortableTh
                                                label="OneDrive actual"
                                                tooltip="Estado de OneDrive según el último reporte del agente."
                                                sortKey="oneDrive"
                                                currentKey={sortKey}
                                                currentDir={sortDir}
                                                onSort={ordenarPor}
                                                className="w-[11%] min-w-[145px] px-4 py-3 font-semibold"
                                            />

                                            <SortableTh
                                                label="Usuario"
                                                tooltip="Cuenta de OneDrive detectada en el equipo."
                                                sortKey="usuario"
                                                currentKey={sortKey}
                                                currentDir={sortDir}
                                                onSort={ordenarPor}
                                                className="hidden w-[14%] min-w-[190px] px-4 py-3 font-semibold xl:table-cell"
                                            />

                                            <SortableTh
                                                label="Salud mensual"
                                                tooltip="Estabilidad de OneDrive en el mes: estable (100%), intermitente (70–99%) o con fallas (menos de 70%)."
                                                sortKey="salud"
                                                currentKey={sortKey}
                                                currentDir={sortDir}
                                                onSort={ordenarPor}
                                                className="w-[10%] min-w-[135px] px-4 py-3 font-semibold"
                                            />

                                            <SortableTh
                                                label="Operatividad"
                                                tooltip="Porcentaje de reportes del mes en que OneDrive estaba operativo."
                                                sortKey="operatividad"
                                                currentKey={sortKey}
                                                currentDir={sortDir}
                                                onSort={ordenarPor}
                                                className="w-[10%] min-w-[135px] px-4 py-3 text-right font-semibold"
                                                align="right"
                                            />

                                            <SortableTh
                                                label="Alertas"
                                                tooltip="Cantidad de condiciones que requieren revisión en el equipo."
                                                sortKey="alertas"
                                                currentKey={sortKey}
                                                currentDir={sortDir}
                                                onSort={ordenarPor}
                                                className="w-[7%] min-w-[85px] px-4 py-3 text-center font-semibold"
                                                align="center"
                                            />

                                        </tr>
                                    </thead>

                                    <tbody>
                                        {paginatedItems.map((item) => {
                                            const isExpanded =
                                                expandedId ===
                                                item.idEquipo;

                                            const hasAlertas =
                                                item.alertas
                                                    .length >
                                                0;

                                            return (
                                                <Fragment
                                                    key={
                                                        item.idEquipo
                                                    }
                                                >
                                                    <tr
                                                        onClick={() =>
                                                            setExpandedId(
                                                                (
                                                                    current
                                                                ) =>
                                                                    current ===
                                                                        item.idEquipo
                                                                        ? null
                                                                        : item.idEquipo
                                                            )
                                                        }
                                                        className={clsx(
                                                            "cursor-pointer border-t border-slate-100 text-sm transition",
                                                            isExpanded
                                                                ? "bg-cyan-50/60"
                                                                : "hover:bg-slate-50",
                                                            hasAlertas &&
                                                            "border-l-2 border-l-amber-300"
                                                        )}
                                                    >
                                                        <td className="sticky left-0 z-10 w-[20%] min-w-[250px] bg-inherit px-4 py-3">
                                                            <div className="flex items-start gap-2">
                                                                <ChevronDownIcon
                                                                    className={clsx(
                                                                        "mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform",
                                                                        isExpanded &&
                                                                        "rotate-180 text-cyan-600"
                                                                    )}
                                                                />

                                                                <div className="min-w-0">
                                                                    <div className="truncate font-semibold text-slate-800">
                                                                        {item
                                                                            .agente
                                                                            .hostname ||
                                                                            `Equipo #${item.idEquipo}`}
                                                                    </div>

                                                                    <div className="truncate text-xs text-slate-500">
                                                                        {item.serial || "Sin serial"}
                                                                    </div>

                                                                    <div className="truncate text-xs text-slate-400">
                                                                        {[item.marca, item.modelo]
                                                                            .filter(Boolean)
                                                                            .join(" ") || "Sin marca y modelo"}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td className="w-[14%] min-w-[170px] px-4 py-3">
                                                            <div
                                                                className="truncate font-medium text-slate-700"
                                                                title={
                                                                    item.empresa?.nombre ||
                                                                    "Sin empresa"
                                                                }
                                                            >
                                                                {item.empresa?.nombre ||
                                                                    "Sin empresa"}
                                                            </div>

                                                            <div
                                                                className="truncate text-xs text-slate-500"
                                                                title={
                                                                    item.solicitante?.nombre ||
                                                                    "Sin solicitante"
                                                                }
                                                            >
                                                                {item.solicitante?.nombre ||
                                                                    "Sin solicitante"}
                                                            </div>
                                                        </td>

                                                        <td className="w-[10%] min-w-[125px] px-4 py-3">
                                                            <span
                                                                className={clsx(
                                                                    "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                                                                    getAgentStateClass(
                                                                        item
                                                                            .agente
                                                                            .estado
                                                                    )
                                                                )}
                                                            >
                                                                {getAgentStateLabel(
                                                                    item
                                                                        .agente
                                                                        .estado
                                                                )}
                                                            </span>

                                                            <div className="mt-1 text-xs text-slate-500">
                                                                {item
                                                                    .agente
                                                                    .version ||
                                                                    "Sin versión"}
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-3 text-xs text-slate-600">
                                                            {formatDateTimeCL(
                                                                item
                                                                    .agente
                                                                    .ultimaConexion
                                                            )}
                                                        </td>

                                                        <td className="px-4 py-3 text-right">
                                                            <div className="font-semibold tabular-nums text-slate-700">
                                                                {
                                                                    item
                                                                        .analisisMes
                                                                        .cantidad
                                                                }
                                                            </div>

                                                            <div className="text-xs text-slate-500">
                                                                {
                                                                    item
                                                                        .analisisMes
                                                                        .diasAnalizados
                                                                }{" "}
                                                                día(s)
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-3">
                                                            <span
                                                                className={clsx(
                                                                    "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                                                                    getOneDriveStateClass(
                                                                        item
                                                                            .oneDrive
                                                                            .estado
                                                                    )
                                                                )}
                                                            >
                                                                {getOneDriveStateLabel(
                                                                    item
                                                                        .oneDrive
                                                                        .estado
                                                                )}
                                                            </span>

                                                            <div className="mt-1 text-xs text-slate-500">
                                                                {item
                                                                    .oneDrive
                                                                    .version ||
                                                                    "Sin versión"}
                                                            </div>
                                                        </td>

                                                        <td className="hidden w-[14%] min-w-[190px] px-4 py-3 xl:table-cell">
                                                            <div
                                                                className="truncate text-xs text-slate-700"
                                                                title={
                                                                    item.oneDrive.usuario ||
                                                                    "No detectado"
                                                                }
                                                            >
                                                                {item.oneDrive.usuario ||
                                                                    "No detectado"}
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-3">
                                                            <span
                                                                className={clsx(
                                                                    "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                                                                    getOneDriveHealthClass(
                                                                        item
                                                                            .oneDrive
                                                                            .saludMes
                                                                            .estado
                                                                    )
                                                                )}
                                                            >
                                                                {getOneDriveHealthLabel(
                                                                    item
                                                                        .oneDrive
                                                                        .saludMes
                                                                        .estado
                                                                )}
                                                            </span>
                                                        </td>

                                                        <td className="w-[10%] min-w-[135px] px-4 py-3 text-right">
                                                            <div className="inline-flex items-center gap-2">
                                                                <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100">
                                                                    <div
                                                                        className={clsx(
                                                                            "h-full rounded-full",
                                                                            getOperatividadBarClass(
                                                                                item.oneDrive.saludMes.estado,
                                                                                item.oneDrive.saludMes.porcentajeOperativo
                                                                            )
                                                                        )}
                                                                        style={{
                                                                            /*
                                                                             * Para estados sin porcentaje medible se deja una
                                                                             * pequeña marca gris, en vez de una barra roja vacía.
                                                                             */
                                                                            width:
                                                                                item.oneDrive.saludMes.estado === "SIN_DATOS" ||
                                                                                    item.oneDrive.saludMes.estado === "NO_INSTALADO"
                                                                                    ? "12%"
                                                                                    : `${item.oneDrive.saludMes.porcentajeOperativo}%`,
                                                                        }}
                                                                    />
                                                                </div>

                                                                {/* Evita mostrar 0% cuando no existen datos medibles. */}
                                                                <span className="whitespace-nowrap text-sm font-semibold text-slate-700">
                                                                    {getOperatividadText(
                                                                        item.oneDrive.saludMes.estado,
                                                                        item.oneDrive.saludMes
                                                                            .porcentajeOperativo
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        <td className="w-[7%] min-w-[85px] px-4 py-3 text-center">
                                                            <span
                                                                className={clsx(
                                                                    "inline-flex h-6 min-w-[24px] items-center justify-center rounded-full border px-2 text-xs font-semibold tabular-nums",
                                                                    hasAlertas
                                                                        ? "border-amber-200 bg-amber-50 text-amber-700"
                                                                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                                )}
                                                            >
                                                                {
                                                                    item
                                                                        .alertas
                                                                        .length
                                                                }
                                                            </span>
                                                        </td>
                                                    </tr>

                                                    {isExpanded && (
                                                        <tr className="border-t border-cyan-100 bg-slate-50/80">
                                                            <td
                                                                colSpan={
                                                                    10
                                                                }
                                                            >
                                                                <EquipoExpandedDetail
                                                                    item={
                                                                        item
                                                                    }
                                                                />
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Fragment>
                                            );
                                        }
                                        )}

                                        {data?.items.length ===
                                            0 && (
                                                <tr>
                                                    <td
                                                        colSpan={10}
                                                        className="px-4 py-16 text-center"
                                                    >
                                                        <div className="flex flex-col items-center gap-2">
                                                            <ComputerDesktopIcon className="h-8 w-8 text-slate-300" />
                                                            <p className="text-sm font-medium text-slate-600">
                                                                No se
                                                                encontraron
                                                                equipos
                                                            </p>
                                                            <p className="text-xs text-slate-400">
                                                                Ajusta
                                                                los
                                                                filtros
                                                                para
                                                                ampliar
                                                                la
                                                                búsqueda.
                                                            </p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                    </tbody>
                                </table>
                            </div>

                            {/* ============ PAGINACIÓN DE LA TABLA ============ */}
                            {tableItems.length > 0 && (
                                <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                                    <div className="text-xs text-slate-500">
                                        Mostrando{" "}
                                        <strong className="text-slate-700">
                                            {firstVisibleItem}
                                        </strong>{" "}
                                        a{" "}
                                        <strong className="text-slate-700">
                                            {lastVisibleItem}
                                        </strong>{" "}
                                        de{" "}
                                        <strong className="text-slate-700">
                                            {formatNumber(tableItems.length)}
                                        </strong>{" "}
                                        equipos
                                    </div>

                                    <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex sm:w-auto">
                                        <button
                                            type="button"
                                            disabled={tablePage <= 1}
                                            onClick={() => {
                                                setExpandedId(null);

                                                setTablePage((current) =>
                                                    Math.max(1, current - 1)
                                                );
                                            }}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                                        >
                                            Anterior
                                        </button>

                                        <span className="min-w-[76px] text-center text-[11px] font-medium text-slate-500 sm:min-w-[90px] sm:text-xs">
                                            Página {tablePage} de {tableTotalPages}
                                        </span>

                                        <button
                                            type="button"
                                            disabled={tablePage >= tableTotalPages}
                                            onClick={() => {
                                                setExpandedId(null);

                                                setTablePage((current) =>
                                                    Math.min(
                                                        tableTotalPages,
                                                        current + 1
                                                    )
                                                );
                                            }}
                                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                                        >
                                            Siguiente
                                        </button>
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* ============ FUERA DEL DASHBOARD: EN STOCK / EN RIDS Y EXCLUIDOS ============ */}
                        <EquiposFueraDashboard
                            key={`${data?.periodo.year}-${data?.periodo.month}`}
                            excluidos={data?.excluidos}
                            fueraDeOperacion={data?.fueraDeOperacion}
                        />
                    </>
                )}
            </div>
        </div >
    );
}
