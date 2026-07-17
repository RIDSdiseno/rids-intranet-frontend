// src/components/modals-equipos/EquiposView.tsx
import { useEffect, useState } from "react";
import dayjs from "dayjs";
import {
    ADICIONAL_TIPO_LABEL,
    actionLabels,
    actorName,
    clsx,
    fieldLabels,
    formatRut,
    getChanges,
    getEstadoEquipoClass,
    getEstadoEquipoLabel,
    toUC,
    agenteEstadoClasses,
    diskUsedPercent,
    getAgentEventMetadata,
    getTecnicoInstaladorLabel,
    getPropiedadEquipoLabel,
    getPropiedadEquipoClass,
} from "./equipos.helpers";

import type {
    EquipoAgentFull,
    EquipoHistorialItem,
    EquipoRow,
    EquipoMantencion,
} from "./equipos.types";
import { http } from "../../service/http";

import type { TipoEquipoValue } from "../modals-gestioo/types";
import { TipoEquipoLabel } from "../modals-gestioo/types";

type Props = {
    open: boolean;
    row: EquipoRow | null;
    historial: EquipoHistorialItem[];
    histLoading: boolean;
    histError: string | null;
    onClose: () => void;
};

type EquipoViewTab = "principal" | "historial" | "eventos" | "mantenciones";

const EQUIPO_VIEW_TABS: Array<{
    key: EquipoViewTab;
    label: string;
}> = [
        { key: "principal", label: "Principal" },
        { key: "historial", label: "Historial equipo" },
        { key: "eventos", label: "Eventos agente" },
        { key: "mantenciones", label: "Mantenciones" },
    ];

// ==== Helpers ====
function formatDateTimeCL(value?: string | null) {
    if (!value) return "—";

    return new Intl.DateTimeFormat("es-CL", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(new Date(value));
}

function formatDateCL(value?: string | null) {
    if (!value) return "—";

    return new Intl.DateTimeFormat("es-CL", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "2-digit",
    }).format(new Date(value));
}

function formatTimeCL(value?: string | null) {
    if (!value) return "—";

    return new Intl.DateTimeFormat("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(new Date(value));
}

function getAgentEventLabel(tipo?: string | null) {
    const labels: Record<string, string> = {
        INVENTORY_SYNC: "Inventario sincronizado",
        AGENT_INSTALLED: "Agente instalado",
        AGENT_UNINSTALLED: "Agente desinstalado",
        AGENT_ERROR: "Error del agente",
        AGENT_STARTED: "Agente iniciado",
        AGENT_STOPPED: "Agente detenido",
    };

    return labels[String(tipo ?? "")] ?? tipo ?? "Evento";
}

function getAgentEventClass(tipo?: string | null) {
    const value = String(tipo ?? "");

    if (value.includes("ERROR")) {
        return "border-rose-200 bg-rose-50 text-rose-700";
    }

    if (value.includes("INSTALLED") || value.includes("STARTED")) {
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (value.includes("UNINSTALLED") || value.includes("STOPPED")) {
        return "border-amber-200 bg-amber-50 text-amber-700";
    }

    if (value.includes("INVENTORY")) {
        return "border-cyan-200 bg-cyan-50 text-cyan-700";
    }

    return "border-slate-200 bg-slate-50 text-slate-700";
}

function getMantencionEstadoLabel(estado?: string | null) {
    const value = String(estado ?? "");

    const labels: Record<string, string> = {
        COMPLETADA: "Completada",
        COMPLETADA_CON_ADVERTENCIAS: "Completada con advertencias",
        CANCELADA: "Cancelada",
    };

    if (labels[value]) {
        return labels[value];
    }

    if (value) {
        return value;
    }

    return "Sin estado";
}

function getMantencionEstadoClass(estado?: string | null) {
    const value = String(estado ?? "");

    if (value === "COMPLETADA") {
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (value === "COMPLETADA_CON_ADVERTENCIAS") {
        return "border-amber-200 bg-amber-50 text-amber-700";
    }

    if (value === "CANCELADA") {
        return "border-rose-200 bg-rose-50 text-rose-700";
    }

    return "border-slate-200 bg-slate-50 text-slate-700";
}

function getMantencionDotClass(estado?: string | null) {
    const value = String(estado ?? "");

    if (value === "COMPLETADA") return "bg-emerald-500";
    if (value === "COMPLETADA_CON_ADVERTENCIAS") return "bg-amber-500";
    if (value === "CANCELADA") return "bg-rose-500";

    return "bg-slate-400";
}

function normalizarArrayTexto(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.map(String).filter(Boolean);
    }

    return [];
}

function groupAgentEventsByDate<T extends { createdAt?: string | null }>(events: T[]) {
    return events.reduce<Record<string, T[]>>((acc, event) => {
        const key = event.createdAt
            ? new Date(event.createdAt).toISOString().slice(0, 10)
            : "sin-fecha";

        if (!acc[key]) acc[key] = [];
        acc[key].push(event);

        return acc;
    }, {});
}

function getAgentEventMetadataSummary(metadata: unknown) {
    const parsed = getAgentEventMetadata(metadata);

    const items: string[] = [];

    if (parsed.lastBootAt) {
        items.push(`Último arranque: ${formatDateTimeCL(parsed.lastBootAt)}`);
    }

    const uptime =
        parsed.uptimeText ||
        formatUptimeFromSeconds(parsed.uptimeSeconds);

    if (uptime) {
        items.push(`Tiempo activo: ${uptime}`);
    }

    return items;
}

function formatTimeWithSecondsCL(value?: string | null) {
    if (!value) return "—";

    return new Intl.DateTimeFormat("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).format(new Date(value));
}

function groupHistoryByDate<T extends { createdAt?: string | null }>(items: T[]) {
    return items.reduce<Record<string, T[]>>((acc, item) => {
        const key = item.createdAt
            ? new Date(item.createdAt).toISOString().slice(0, 10)
            : "sin-fecha";

        if (!acc[key]) acc[key] = [];
        acc[key].push(item);

        return acc;
    }, {});
}

function getHistoryActionLabel(action?: string | null) {
    const labels: Record<string, string> = {
        CREATE: "CREACIÓN",
        UPDATE: "ACTUALIZACIÓN",
        DELETE: "ELIMINACIÓN",
        REVIEW: "REVISIÓN",
    };

    const value = String(action ?? "").trim().toUpperCase();

    return labels[value] ?? actionLabels[value] ?? (value || "Movimiento");
}

function getHistoryActionClass(action?: string | null) {
    if (action === "CREATE") {
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (action === "UPDATE") {
        return "border-indigo-200 bg-indigo-50 text-indigo-700";
    }

    if (action === "REVIEW") {
        return "border-cyan-200 bg-cyan-50 text-cyan-700";
    }

    if (action === "DELETE") {
        return "border-rose-200 bg-rose-50 text-rose-700";
    }

    return "border-slate-200 bg-slate-50 text-slate-700";
}

function getHistoryDotClass(action?: string | null) {
    if (action === "CREATE") return "bg-emerald-500";
    if (action === "UPDATE") return "bg-indigo-500";
    if (action === "REVIEW") return "bg-cyan-500";
    if (action === "DELETE") return "bg-rose-500";

    return "bg-slate-400";
}

function getHistoryActorLabel(action?: string | null) {
    if (action === "CREATE") return "Creado por:";
    if (action === "REVIEW") return "Revisado por:";
    if (action === "DELETE") return "Eliminado por:";

    return "Actualizado por:";
}

function formatHistoryValue(value: unknown) {
    if (value === null || value === undefined || value === "") return "—";

    if (typeof value === "boolean") {
        return value ? "Sí" : "No";
    }

    return String(value);
}

function getPrimaryOfficeLicense(value?: string | null) {
    const text = String(value ?? "").trim();

    if (!text) return "—";

    const parts = text
        .split(/\|\||\n|;/)
        .map((part) => part.trim())
        .filter(Boolean);

    const installedApp = parts.find((part) =>
        /^Instalado:/i.test(part) &&
        /office|microsoft 365/i.test(part)
    );

    if (installedApp) {
        return installedApp.replace(/^Instalado:\s*/i, "").trim();
    }

    const license = parts.find((part) =>
        /^Licencia:/i.test(part) &&
        /office|microsoft 365|proplus|o365/i.test(part)
    );

    if (license) {
        return license.replace(/^Licencia:\s*/i, "").trim();
    }

    const product = parts.find((part) =>
        /^Producto/i.test(part) &&
        /office|microsoft 365|proplus|o365/i.test(part)
    );

    if (product) {
        return product.replace(/^Producto\s*/i, "").trim();
    }

    return parts[0] || text;
}

function getTipoEquipoLabel(tipo?: string | null) {
    if (!tipo) return "—";

    return TipoEquipoLabel[tipo as TipoEquipoValue] ?? tipo;
}

// ==== Helpers Agente ====
function boolTag(value?: boolean | null) {
    if (value === true) {
        return (
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800" >
                Activo
            </span>
        );
    }

    if (value === false) {
        return (
            <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-800" >
                Inactivo
            </span>
        );
    }

    return <span className="text-slate-500" >—</span>;
}

function splitAgentText(value?: string | null) {
    if (!value) return [];

    return value
        .split("||")
        .map((x) => x.trim())
        .filter(Boolean);
}

function formatUptimeFromSeconds(value?: number | string | null) {
    if (value === undefined || value === null || value === "") return "";

    const totalSeconds = Number(value);

    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "";

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);

    return `${days} días ${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatUptimeFromLastBoot(value?: string | null) {
    if (!value) return "";

    const bootDate = new Date(value);

    if (Number.isNaN(bootDate.getTime())) return "";

    const totalSeconds = Math.floor((Date.now() - bootDate.getTime()) / 1000);

    return formatUptimeFromSeconds(totalSeconds);
}

function InfoLine({
    label,
    value,
}: {
    label: string;
    value?: string | number | null;
}) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {label}
            </div>
            <div className="mt-1 break-words text-sm text-slate-800">
                {value || "—"}
            </div>
        </div>
    );
}

function MultiInfoLine({
    label,
    value,
}: {
    label: string;
    value?: string | null;
}) {
    const lines = splitAgentText(value);

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {label}
            </div>

            {lines.length > 0 ? (
                <div className="mt-2 space-y-1">
                    {lines.map((line, idx) => (
                        <div
                            key={`${label}-${idx}`}
                            className="rounded-lg bg-white px-2 py-1 text-sm text-slate-800 ring-1 ring-slate-100"
                        >
                            {line}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="mt-1 text-sm text-slate-500">—</div>
            )}
        </div>
    );
}

// ==== Componente Principal ====
export default function EquipoViewModal({
    open,
    row,
    historial,
    histLoading,
    histError,
    onClose,
}: Props) {
    const [agentLoading, setAgentLoading] = useState(false);
    const [agentError, setAgentError] = useState<string | null>(null);
    const [viewAgent, setViewAgent] = useState<EquipoAgentFull | null>(null);

    const [mantencionesLoading, setMantencionesLoading] = useState(false);
    const [mantencionesError, setMantencionesError] = useState<string | null>(null);
    const [mantenciones, setMantenciones] = useState<EquipoMantencion[]>([]);

    const [activeTab, setActiveTab] = useState<EquipoViewTab>("principal");

    useEffect(() => {
        if (!open || !row) return;

        setActiveTab("principal");

        const idEquipo = row.id_equipo;
        const c = new AbortController();

        async function fetchEquipoAgentDetalle() {
            setAgentLoading(true);
            setAgentError(null);
            setViewAgent(null);

            try {
                const res = await http.get(`/equipos/agent/${idEquipo}`, {
                    signal: c.signal,
                });

                setViewAgent(res.data.equipo ?? null);
            } catch (err) {
                if ((err as Error).name === "AbortError") return;

                setAgentError(
                    (err as Error).message || "Error al cargar datos del agente"
                );
                setViewAgent(null);
            } finally {
                setAgentLoading(false);
            }
        }

        async function fetchMantencionesEquipo() {
            setMantencionesLoading(true);
            setMantencionesError(null);
            setMantenciones([]);

            try {
                const res = await http.get(
                    `/equipos/equipos-mantencion/${idEquipo}/mantenciones`,
                    {
                        signal: c.signal,
                    }
                );

                setMantenciones(res.data.data ?? []);
            } catch (err) {
                if ((err as Error).name === "AbortError") return;

                setMantencionesError(
                    (err as Error).message ||
                    "Error al cargar mantenciones del equipo"
                );
                setMantenciones([]);
            } finally {
                setMantencionesLoading(false);
            }
        }

        void fetchEquipoAgentDetalle();
        void fetchMantencionesEquipo();

        return () => c.abort();
    }, [open, row?.id_equipo]);

    if (!open || !row) return null;

    const latestAgentEvent = viewAgent?.agenteEventos?.[0] as
        | { metadata?: unknown }
        | undefined;

    const latestAgentMetadata = getAgentEventMetadata(latestAgentEvent?.metadata);

    const isMacAgent = latestAgentMetadata.platform === "MACOS";

    const agentPlatformLabel = isMacAgent ? "macOS" : "Windows";
    const agentTitle = isMacAgent ? "Agente macOS" : "Agente Windows";

    const uptimeValue =
        latestAgentMetadata.uptimeText ||
        formatUptimeFromSeconds(latestAgentMetadata.uptimeSeconds) ||
        formatUptimeFromLastBoot(viewAgent?.lastBootAt);

    const agenteLastSeenAt = viewAgent?.lastSeenAt || row.lastSeenAt;
    const agenteInstalado = Boolean(agenteLastSeenAt);

    const agenteEstado =
        viewAgent?.estadoAgente ||
        row.estadoAgente ||
        (agenteInstalado ? "ACTIVO" : "SIN_AGENTE");

    const agenteVersion = viewAgent?.agenteVersion || row.agenteVersion;
    const agenteHostname = viewAgent?.hostname || row.hostname;
    const agenteUsuario = viewAgent?.usuarioActual || row.usuarioActual;
    const agenteIpLocal = viewAgent?.localIp || row.localIp;
    const agenteMac = viewAgent?.macAddress || row.macAddress;
    const agenteUltimoArranque = viewAgent?.lastBootAt || row.lastBootAt;

    return (
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6"
        >
            <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />

            {/*<div className="relative flex h-[94dvh] w-full max-w-[950px] flex-col overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-2xl">*/}
            <div className="relative flex h-[94dvh] w-full max-w-[1280px] flex-col overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-2xl">
                <div className="shrink-0 border-b border-cyan-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
                                Ficha del Equipo #{row.id_equipo}
                            </h3>

                            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                                Visualización completa del equipo, agente, software e historial.
                                Visualización completa del equipo, agente, software e historial.
                            </p>
                        </div>

                        <button
                            onClick={onClose}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div className="shrink-0 border-b border-cyan-100 bg-white px-4 py-2 sm:px-6 lg:px-8">
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {EQUIPO_VIEW_TABS.map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveTab(tab.key)}
                                className={clsx(
                                    "whitespace-nowrap rounded-xl border px-4 py-2 text-sm font-semibold transition",
                                    activeTab === tab.key
                                        ? "border-cyan-300 bg-cyan-50 text-cyan-800 shadow-sm"
                                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 px-3 py-4 sm:px-5 lg:px-8 lg:py-6">
                    <div className="mx-auto flex min-h-full w-full max-w-[1380px] flex-col space-y-5">
                        {activeTab === "principal" ? (
                            <>
                                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                    <h4 className="mb-3 text-sm font-semibold text-slate-800">
                                        Información General
                                    </h4>

                                    <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                                        <div><strong>Tipo de equipo:</strong> {getTipoEquipoLabel(row.tipo)}</div>
                                        <div><strong>Serial:</strong> {toUC(row.serial)}</div>
                                        <div><strong>Marca:</strong> {row.marca}</div>
                                        <div><strong>Modelo:</strong> {row.modelo}</div>

                                        <div>
                                            <strong>Estado:</strong>{" "}
                                            <span
                                                className={clsx(
                                                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                                                    getEstadoEquipoClass(row.estado)
                                                )}
                                            >
                                                {getEstadoEquipoLabel(row.estado)}
                                            </span>
                                        </div>

                                        <div><strong>CPU:</strong> {row.procesador}</div>
                                        <div><strong>RAM:</strong> {row.ram || "—"}</div>
                                        <div><strong>Disco:</strong> {row.disco}</div>
                                        <div>
                                            <strong>Pertenencia:</strong>{" "}
                                            <span
                                                className={clsx(
                                                    "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                                                    getPropiedadEquipoClass(row.propiedad)
                                                )}
                                            >
                                                {getPropiedadEquipoLabel(row.propiedad, row.propietarioExterno)}
                                            </span>
                                        </div>

                                        <div className="sm:col-span-2">
                                            <strong>Observaciones:</strong>
                                            <div className="mt-1 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700">
                                                {row.observaciones || "Sin observaciones"}
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                        <div className="mb-4">
                                            <h4 className="text-sm font-semibold text-slate-800">
                                                Relación
                                            </h4>
                                            <p className="mt-1 text-xs text-slate-500">
                                                Empresa y solicitante asociados al equipo.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                                <div className="text-xs font-medium text-slate-500">Empresa</div>
                                                <div className="mt-1 font-semibold text-slate-800">
                                                    {row.empresa || "—"}
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                                <div className="text-xs font-medium text-slate-500">Solicitante</div>
                                                <div className="mt-1 font-semibold text-slate-800">
                                                    {row.solicitante || "—"}
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                                <div className="text-xs font-medium text-slate-500">RUT solicitante</div>
                                                <div className="mt-1 font-semibold text-slate-800">
                                                    {formatRut(row.solicitanteRut)}
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                                <div className="text-xs font-medium text-slate-500">Email solicitante</div>
                                                <div className="mt-1 break-all font-semibold text-slate-800">
                                                    {row.solicitanteEmail || "—"}
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                        <div className="mb-4">
                                            <h4 className="text-sm font-semibold text-slate-800">
                                                Fechas
                                            </h4>
                                            <p className="mt-1 text-xs text-slate-500">
                                                Registro de creación y última edición del equipo.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 text-sm">
                                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                                <div className="text-xs font-medium text-slate-500">Ingreso</div>
                                                <div className="mt-1 font-semibold text-slate-800">
                                                    {new Date(row.createdAt).toLocaleString("es-CL", {
                                                        year: "numeric",
                                                        month: "2-digit",
                                                        day: "2-digit",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        second: "2-digit",
                                                        hour12: false,
                                                    })}
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                                <div className="text-xs font-medium text-slate-500">Última edición</div>
                                                <div className="mt-1 font-semibold text-slate-800">
                                                    {row.updatedAt
                                                        ? new Date(row.updatedAt).toLocaleString("es-CL", {
                                                            year: "numeric",
                                                            month: "2-digit",
                                                            day: "2-digit",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                            second: "2-digit",
                                                            hour12: false,
                                                        })
                                                        : "—"}
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                    <section className="rounded-2xl border border-cyan-200 bg-white p-4 shadow-sm sm:p-5">
                                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-800">
                                                    Mant.General RIDS
                                                </h4>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Estado del ejecutable de mantención general en este equipo.
                                                </p>
                                            </div>

                                            {row.mantGeneralInstalado ? (
                                                <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                                    Instalado / registrado
                                                </span>
                                            ) : (
                                                <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                                                    No registrado
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                                <div className="text-xs font-medium text-slate-500">Estado</div>
                                                <div className="mt-1 font-semibold text-slate-800">
                                                    {row.mantGeneralInstalado ? "Instalado / configurado" : "Sin registro"}
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                                <div className="text-xs font-medium text-slate-500">Versión</div>
                                                <div className="mt-1 break-all font-semibold text-slate-800">
                                                    {row.mantGeneralVersion || "—"}
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                                <div className="text-xs font-medium text-slate-500">Última apertura</div>
                                                <div className="mt-1 font-semibold text-slate-800">
                                                    {formatDateTimeCL(row.mantGeneralLastSeenAt)}
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                                <div className="text-xs font-medium text-slate-500">Primer registro</div>
                                                <div className="mt-1 font-semibold text-slate-800">
                                                    {formatDateTimeCL(row.mantGeneralInstalledAt)}
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 sm:col-span-2">
                                                <div className="text-xs font-medium text-slate-500">Ruta ejecutable</div>
                                                <div className="mt-1 break-all font-mono text-xs font-semibold text-slate-800">
                                                    {row.mantGeneralExePath || "—"}
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 sm:col-span-2 xl:col-span-3">
                                                <div className="text-xs font-medium text-slate-500">Ruta config.json</div>
                                                <div className="mt-1 break-all font-mono text-xs font-semibold text-slate-800">
                                                    {row.mantGeneralConfigPath || "—"}
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                    <section className="rounded-2xl border border-blue-200 bg-white p-4 shadow-sm sm:p-5">
                                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-800">
                                                    Agente de inventario RIDS
                                                </h4>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Estado del agente/script de inventario instalado en este equipo.
                                                </p>
                                            </div>

                                            {agenteInstalado ? (
                                                <span
                                                    className={clsx(
                                                        "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                                                        agenteEstadoClasses(agenteEstado)
                                                    )}
                                                >
                                                    {agenteEstado}
                                                </span>
                                            ) : (
                                                <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
                                                    Sin agente
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                                <div className="text-xs font-medium text-slate-500">
                                                    Estado
                                                </div>
                                                <div className="mt-1 font-semibold text-slate-800">
                                                    {agenteInstalado ? agenteEstado : "Sin registro"}
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                                <div className="text-xs font-medium text-slate-500">
                                                    Versión agente
                                                </div>
                                                <div className="mt-1 break-all font-semibold text-slate-800">
                                                    {agenteVersion || "—"}
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                                <div className="text-xs font-medium text-slate-500">
                                                    Última conexión
                                                </div>
                                                <div className="mt-1 font-semibold text-slate-800">
                                                    {formatDateTimeCL(agenteLastSeenAt)}
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                                <div className="text-xs font-medium text-slate-500">
                                                    Último arranque
                                                </div>
                                                <div className="mt-1 font-semibold text-slate-800">
                                                    {formatDateTimeCL(agenteUltimoArranque)}
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                                <div className="text-xs font-medium text-slate-500">
                                                    Hostname
                                                </div>
                                                <div className="mt-1 break-all font-semibold text-slate-800">
                                                    {agenteHostname || "—"}
                                                </div>
                                            </div>

                                            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                                <div className="text-xs font-medium text-slate-500">
                                                    Usuario actual
                                                </div>
                                                <div className="mt-1 break-all font-semibold text-slate-800">
                                                    {agenteUsuario || "—"}
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>

                                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                    <div className="mb-4">
                                        <h4 className="text-sm font-semibold text-slate-800">
                                            Ficha Técnica
                                        </h4>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Información técnica, conectividad, software y revisión del equipo.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                            <div className="text-xs font-medium text-slate-500">MAC WiFi</div>
                                            <div className="mt-1 break-all font-semibold text-slate-800">
                                                {row.macWifi || "—"}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                            <div className="text-xs font-medium text-slate-500">MAC Ethernet</div>
                                            <div className="mt-1 break-all font-semibold text-slate-800">
                                                {row.redEthernet || "—"}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                            <div className="text-xs font-medium text-slate-500">Sistema Operativo</div>
                                            <div className="mt-1 font-semibold text-slate-800">
                                                {row.so || "—"}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                            <div className="text-xs font-medium text-slate-500">Tipo Disco</div>
                                            <div className="mt-1 font-semibold text-slate-800">
                                                {row.tipoDd || "—"}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                            <div className="text-xs font-medium text-slate-500">Estado Almacenamiento</div>
                                            <div className="mt-1 font-semibold text-slate-800">
                                                {row.estadoAlm || "—"}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                            <div className="text-xs font-medium text-slate-500">Office</div>

                                            <div
                                                className="mt-1 line-clamp-2 font-semibold text-slate-800"
                                                title={row.office || ""}
                                            >
                                                {getPrimaryOfficeLicense(row.office)}
                                            </div>

                                            {row.office ? (
                                                <div className="mt-2 text-[11px] text-slate-500">
                                                    Resumen de licencia principal detectada.
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                            <div className="text-xs font-medium text-slate-500">TeamViewer</div>
                                            <div className="mt-1 font-semibold text-slate-800">
                                                {row.teamViewer || "—"}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                            <div className="text-xs font-medium text-slate-500">Clave TeamViewer</div>
                                            <div className="mt-1 font-semibold text-slate-800">
                                                {row.claveTv || "—"}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                                            <div className="text-xs font-medium text-slate-500">Revisado</div>
                                            <div className="mt-1 font-semibold text-slate-800">
                                                {row.revisado ? dayjs(row.revisado).format("DD-MM-YYYY") : "—"}
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                                    <div className="mb-4">
                                        <h4 className="text-sm font-semibold text-slate-800">
                                            Accesos
                                        </h4>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Credenciales registradas para administración y usuarios del equipo.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                                            <div className="text-xs font-medium text-slate-500">Admin RIDS</div>
                                            <div className="mt-1 font-semibold text-slate-800">
                                                {row.adminRidsUsuario || "—"}
                                            </div>
                                            <div className="mt-2 text-xs text-slate-500">
                                                Contraseña
                                            </div>
                                            <div className="mt-1 break-all font-mono text-xs font-semibold text-slate-700">
                                                {row.adminRidsPassword || "—"}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                                            <div className="text-xs font-medium text-slate-500">Usuario Empresa</div>
                                            <div className="mt-1 font-semibold text-slate-800">
                                                {row.usuarioEmpresa || "—"}
                                            </div>
                                            <div className="mt-2 text-xs text-slate-500">
                                                Contraseña
                                            </div>
                                            <div className="mt-1 break-all font-mono text-xs font-semibold text-slate-700">
                                                {row.passwordEmpresa || "—"}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                                            <div className="text-xs font-medium text-slate-500">Usuario Personal</div>
                                            <div className="mt-1 font-semibold text-slate-800">
                                                {row.usuarioPersonal || "—"}
                                            </div>
                                            <div className="mt-2 text-xs text-slate-500">
                                                Contraseña
                                            </div>
                                            <div className="mt-1 break-all font-mono text-xs font-semibold text-slate-700">
                                                {row.passwordPersonal || "—"}
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Licencias y acceso remoto */}
                                {viewAgent ? (
                                    <section className="rounded-2xl border border-cyan-200 bg-white p-4 shadow-sm sm:p-5">
                                        <div className="mb-4">
                                            <h4 className="text-sm font-semibold text-slate-800">
                                                Licencias y acceso remoto
                                            </h4>
                                            <p className="mt-1 text-xs text-slate-500">
                                                Datos técnicos detectados automáticamente por el agente.
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.35fr_0.85fr]">
                                            {/* Office / Licencia */}
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                                                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                    Office / Licencia
                                                </div>

                                                <MultiInfoLine
                                                    label=""
                                                    value={viewAgent.detalle?.office || viewAgent.office || row?.office}
                                                />
                                            </div>

                                            {/* Acceso remoto */}
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                                                <div className="mb-3 flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                            Acceso remoto
                                                        </div>
                                                        <p className="mt-1 text-[11px] text-slate-500">
                                                            Credenciales detectadas para conexión remota.
                                                        </p>
                                                    </div>

                                                    <span
                                                        className={clsx(
                                                            "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                                                            viewAgent.detalle?.teamViewer ||
                                                                viewAgent.teamViewer ||
                                                                row?.teamViewer
                                                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                                : "border-slate-200 bg-slate-100 text-slate-500"
                                                        )}
                                                    >
                                                        {viewAgent.detalle?.teamViewer ||
                                                            viewAgent.teamViewer ||
                                                            row?.teamViewer
                                                            ? "Disponible"
                                                            : "Sin ID"}
                                                    </span>
                                                </div>

                                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                                                    <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                                                        <div className="text-[11px] font-medium text-slate-500">
                                                            TeamViewer ID
                                                        </div>
                                                        <div className="mt-1 break-all font-mono text-sm font-bold text-slate-800">
                                                            {viewAgent.detalle?.teamViewer ||
                                                                viewAgent.teamViewer ||
                                                                row?.teamViewer ||
                                                                "—"}
                                                        </div>
                                                    </div>

                                                    <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
                                                        <div className="text-[11px] font-medium text-slate-500">
                                                            Clave TeamViewer
                                                        </div>
                                                        <div className="mt-1 break-all font-mono text-sm font-bold text-slate-800">
                                                            {viewAgent.claveTv || row?.claveTv || "—"}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                                            {/* Tipo de disco */}
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                                                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                    Tipo de disco
                                                </div>

                                                <div className="rounded-lg bg-white px-2.5 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-100">
                                                    {viewAgent.detalle?.tipoDd ||
                                                        viewAgent.tipoDd ||
                                                        row?.tipoDd ||
                                                        "—"}
                                                </div>
                                            </div>

                                            {/* Estado almacenamiento */}
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                                                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                    Estado almacenamiento
                                                </div>

                                                <MultiInfoLine
                                                    label=""
                                                    value={
                                                        viewAgent.detalle?.estadoAlm ||
                                                        viewAgent.estadoAlm ||
                                                        row?.estadoAlm
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </section>
                                ) : null}

                                {/* Seguridad automática */}
                                {viewAgent ? (
                                    <div className="rounded-2xl border border-cyan-200 bg-white p-4">
                                        <h4 className="text-sm font-semibold text-slate-800 mb-3">
                                            Seguridad y estado
                                        </h4>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                            <div>
                                                <strong>Antivirus:</strong>{" "}
                                                {viewAgent.detalle?.antivirusNombre || "—"}{" "}
                                                {boolTag(viewAgent.detalle?.antivirusActivo)}
                                            </div>

                                            <div>
                                                <strong>Firewall:</strong> {boolTag(viewAgent.detalle?.firewallActivo)}
                                            </div>

                                            <div>
                                                <strong>{isMacAgent ? "FileVault:" : "BitLocker:"}</strong>{" "}
                                                {viewAgent.detalle?.bitlockerEstado ||
                                                    latestAgentMetadata.fileVaultEstado ||
                                                    "—"}
                                            </div>

                                            <div>
                                                <strong>{isMacAgent ? "Actualizaciones macOS:" : "Windows Update:"}</strong>{" "}
                                                {isMacAgent
                                                    ? "No aplica / no reportado"
                                                    : viewAgent.detalle?.windowsUpdate || "—"}
                                            </div>
                                        </div>
                                    </div>
                                ) : null}

                                {/* Disco agente */}
                                {viewAgent ? (
                                    <div className="rounded-2xl border border-cyan-200 bg-white p-4">
                                        <h4 className="text-sm font-semibold text-slate-800 mb-3">
                                            Uso de disco
                                        </h4>

                                        {diskUsedPercent(viewAgent) !== null ? (
                                            <div>
                                                <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                                                    <span>
                                                        {viewAgent.diskFreeGb} GB libres de {viewAgent.diskTotalGb} GB
                                                    </span>
                                                    <span>{diskUsedPercent(viewAgent)}% usado</span>
                                                </div>

                                                <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                                                    <div
                                                        className={clsx(
                                                            "h-full rounded-full transition-all",
                                                            (diskUsedPercent(viewAgent) ?? 0) >= 90
                                                                ? "bg-rose-500"
                                                                : (diskUsedPercent(viewAgent) ?? 0) >= 80
                                                                    ? "bg-amber-500"
                                                                    : "bg-cyan-500"
                                                        )}
                                                        style={{ width: `${diskUsedPercent(viewAgent) ?? 0}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-slate-600">
                                                {viewAgent.disco || "Sin información de disco."}
                                            </div>
                                        )}
                                    </div>
                                ) : null}

                                {/* Software instalado */}
                                {viewAgent?.softwares?.length ? (
                                    <section className="rounded-2xl border border-cyan-200 bg-white p-4 shadow-sm sm:p-5">
                                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-800">
                                                    Software instalado
                                                </h4>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Aplicaciones detectadas automáticamente por el agente Windows.
                                                </p>
                                            </div>

                                            <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                                                {viewAgent.softwares.length} programas
                                            </span>
                                        </div>

                                        <div className="max-h-[420px] overflow-auto rounded-xl border border-slate-200">
                                            <table className="w-full min-w-[760px] table-fixed text-sm">
                                                <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                                    <tr>
                                                        <th className="w-[50%] px-4 py-3 text-left font-semibold">
                                                            Nombre
                                                        </th>
                                                        <th className="w-[20%] px-4 py-3 text-left font-semibold">
                                                            Versión
                                                        </th>
                                                        <th className="w-[30%] px-4 py-3 text-left font-semibold">
                                                            Fabricante
                                                        </th>
                                                    </tr>
                                                </thead>

                                                <tbody className="divide-y divide-slate-100 bg-white">
                                                    {viewAgent.softwares.map((sw) => (
                                                        <tr
                                                            key={sw.id}
                                                            className="transition hover:bg-cyan-50/50"
                                                        >
                                                            <td className="px-4 py-3 align-top">
                                                                <div
                                                                    className="truncate font-medium text-slate-800"
                                                                    title={sw.nombre || "Software sin nombre"}
                                                                >
                                                                    {sw.nombre || "Software sin nombre"}
                                                                </div>
                                                            </td>

                                                            <td className="px-4 py-3 align-top">
                                                                <div
                                                                    className="truncate font-mono text-xs font-semibold text-slate-700"
                                                                    title={sw.version || ""}
                                                                >
                                                                    {sw.version || "—"}
                                                                </div>
                                                            </td>

                                                            <td className="px-4 py-3 align-top">
                                                                <div
                                                                    className="truncate text-slate-700"
                                                                    title={sw.publisher || ""}
                                                                >
                                                                    {sw.publisher || "—"}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>
                                ) : viewAgent ? (
                                    <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm sm:p-5">
                                        <div className="font-semibold text-slate-800">
                                            Software instalado
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Sin software reportado por el agente.
                                        </p>
                                    </section>
                                ) : null}

                            </>
                        ) : null}

                        {/* Eventos agente */}
                        {activeTab === "eventos" ? (
                            <>
                                {agentLoading ? (
                                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                                        Cargando eventos del agente…
                                    </div>
                                ) : agentError ? (
                                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                                        {agentError}
                                    </div>
                                ) : viewAgent?.agenteEventos?.length ? (
                                    <div className="rounded-2xl border border-cyan-200 bg-white p-4">
                                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <h4 className="text-sm font-semibold text-slate-800">
                                                    Historial de eventos del agente
                                                </h4>
                                                <p className="text-xs text-slate-500">
                                                    Últimos registros enviados automáticamente por el agente.
                                                </p>
                                            </div>

                                            <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                                                {viewAgent.agenteEventos.length} eventos
                                            </span>
                                        </div>

                                        <div className="overflow-visible pr-1">
                                            <div className="space-y-5">
                                                {Object.entries(
                                                    groupAgentEventsByDate(viewAgent.agenteEventos.slice(0, 50))
                                                ).map(([dateKey, events]) => (
                                                    <div key={dateKey}>
                                                        <div className="sticky top-0 z-10 mb-3 bg-white/95 py-1 backdrop-blur">
                                                            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                                                                {dateKey === "sin-fecha"
                                                                    ? "Sin fecha"
                                                                    : formatDateCL(events[0]?.createdAt)}
                                                            </span>
                                                        </div>

                                                        <div className="relative space-y-3 border-l border-slate-200 pl-5">
                                                            {events.map((ev) => {
                                                                const metadataSummary = getAgentEventMetadataSummary(ev.metadata);
                                                                const meta = getAgentEventMetadata(ev.metadata);
                                                                const tecnicoInstalador = getTecnicoInstaladorLabel(ev.metadata);

                                                                return (
                                                                    <div key={ev.id} className="relative">
                                                                        <div className="absolute -left-[27px] top-3 h-3 w-3 rounded-full border-2 border-white bg-cyan-500 shadow-sm" />

                                                                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm transition hover:border-cyan-200 hover:bg-cyan-50/40">
                                                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                                                <div className="min-w-0">
                                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                                        <span
                                                                                            className={clsx(
                                                                                                "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                                                                                                getAgentEventClass(ev.tipo)
                                                                                            )}
                                                                                        >
                                                                                            {getAgentEventLabel(ev.tipo)}
                                                                                        </span>

                                                                                        <span className="font-mono text-[11px] text-slate-400">
                                                                                            {ev.tipo}
                                                                                        </span>
                                                                                    </div>

                                                                                    <p className="mt-2 text-sm text-slate-700">
                                                                                        {ev.mensaje || "Sin mensaje asociado."}
                                                                                    </p>

                                                                                    {tecnicoInstalador ||
                                                                                        meta.platform ||
                                                                                        meta.usuarioSistemaEjecutor ||
                                                                                        meta.usuarioWindowsEjecutor ||
                                                                                        meta.usuarioMacEjecutor ||
                                                                                        meta.taskUserConfigurado ||
                                                                                        meta.launchdLabel ? (
                                                                                        <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 xl:grid-cols-3">
                                                                                            {meta.platform ? (
                                                                                                <div className="rounded-lg border border-slate-100 bg-white px-2.5 py-2">
                                                                                                    <div className="font-medium text-slate-500">
                                                                                                        Plataforma
                                                                                                    </div>
                                                                                                    <div className="mt-0.5 break-all font-semibold text-slate-800">
                                                                                                        {meta.platform === "MACOS" ? "macOS" : "Windows"}
                                                                                                    </div>
                                                                                                </div>
                                                                                            ) : null}

                                                                                            {tecnicoInstalador ? (
                                                                                                <div className="rounded-lg border border-slate-100 bg-white px-2.5 py-2">
                                                                                                    <div className="font-medium text-slate-500">
                                                                                                        Técnico instalador
                                                                                                    </div>
                                                                                                    <div className="mt-0.5 break-all font-semibold text-slate-800">
                                                                                                        {tecnicoInstalador}
                                                                                                    </div>
                                                                                                </div>
                                                                                            ) : null}

                                                                                            {meta.usuarioSistemaEjecutor ||
                                                                                                meta.usuarioMacEjecutor ||
                                                                                                meta.usuarioWindowsEjecutor ? (
                                                                                                <div className="rounded-lg border border-slate-100 bg-white px-2.5 py-2">
                                                                                                    <div className="font-medium text-slate-500">
                                                                                                        {meta.platform === "MACOS" ? "Usuario macOS" : "Usuario Windows"}
                                                                                                    </div>
                                                                                                    <div className="mt-0.5 break-all font-mono font-semibold text-slate-800">
                                                                                                        {meta.usuarioSistemaEjecutor ||
                                                                                                            meta.usuarioMacEjecutor ||
                                                                                                            meta.usuarioWindowsEjecutor}
                                                                                                    </div>
                                                                                                </div>
                                                                                            ) : null}

                                                                                            {meta.platform === "MACOS" && meta.launchdLabel ? (
                                                                                                <div className="rounded-lg border border-slate-100 bg-white px-2.5 py-2">
                                                                                                    <div className="font-medium text-slate-500">
                                                                                                        LaunchDaemon
                                                                                                    </div>
                                                                                                    <div className="mt-0.5 break-all font-mono font-semibold text-slate-800">
                                                                                                        {meta.launchdLabel}
                                                                                                    </div>
                                                                                                </div>
                                                                                            ) : null}

                                                                                            {meta.platform !== "MACOS" && meta.taskUserConfigurado ? (
                                                                                                <div className="rounded-lg border border-slate-100 bg-white px-2.5 py-2">
                                                                                                    <div className="font-medium text-slate-500">
                                                                                                        Tarea configurada como
                                                                                                    </div>
                                                                                                    <div className="mt-0.5 break-all font-mono font-semibold text-slate-800">
                                                                                                        {meta.taskUserConfigurado}
                                                                                                    </div>
                                                                                                </div>
                                                                                            ) : null}
                                                                                        </div>
                                                                                    ) : null}
                                                                                </div>

                                                                                <div className="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600">
                                                                                    {formatTimeCL(ev.createdAt)}
                                                                                </div>
                                                                            </div>

                                                                            {metadataSummary.length > 0 ? (
                                                                                <div className="mt-3 grid grid-cols-1 gap-2 border-t border-slate-200 pt-3 sm:grid-cols-2">
                                                                                    {metadataSummary.map((item) => (
                                                                                        <div
                                                                                            key={item}
                                                                                            className="rounded-lg bg-white px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-100"
                                                                                        >
                                                                                            {item}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            ) : null}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
                                        Sin eventos reportados por el agente.
                                    </div>
                                )}
                            </>
                        ) : null}

                        {/* Adicionales de Equipo */}
                        {activeTab === "principal" && row.adicionales?.length ? (
                            <section>
                                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                                    Adicionales
                                </h4>

                                <div className="space-y-2">
                                    {row.adicionales.map((a) => (
                                        <div key={a.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                                            <div><strong>Tipo:</strong> {ADICIONAL_TIPO_LABEL[a.tipo] || a.tipo}</div>
                                            <div><strong>Descripción:</strong> {a.descripcion || "—"}</div>
                                            <div><strong>Cantidad:</strong> {a.cantidad}</div>
                                            <div><strong>Serial:</strong> {a.serialAdicional || "—"}</div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ) : null}

                        {/* Historial equipo */}
                        {activeTab === "historial" ? (
                            <section className="mt-1">
                                <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-cyan-100 pb-4">
                                    <div>
                                        <h3 className="text-lg font-semibold text-slate-900">
                                            Historial equipo #{row.id_equipo}
                                        </h3>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Registro de cambios realizados sobre la ficha del equipo.
                                        </p>
                                    </div>

                                    {!histLoading && !histError ? (
                                        <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                                            {historial.length} movimientos
                                        </span>
                                    ) : null}
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                    {histLoading && (
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                            Cargando historial…
                                        </div>
                                    )}

                                    {histError && (
                                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                            {histError}
                                        </div>
                                    )}

                                    {!histLoading && !histError && historial.length === 0 && (
                                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                            Sin historial registrado.
                                        </div>
                                    )}

                                    {!histLoading && !histError && historial.length > 0 && (
                                        <div className="overflow-visible pr-1">
                                            <div className="space-y-6">
                                                {Object.entries(groupHistoryByDate(historial)).map(([dateKey, items]) => (
                                                    <div key={dateKey}>
                                                        <div className="sticky top-0 z-10 mb-4 bg-white/95 py-1 backdrop-blur">
                                                            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                                                                {dateKey === "sin-fecha"
                                                                    ? "Sin fecha"
                                                                    : formatDateCL(items[0]?.createdAt)}
                                                            </span>
                                                        </div>

                                                        <div className="relative space-y-4 border-l border-slate-200 pl-5">
                                                            {items.map((h, idx) => {
                                                                const changes = getChanges(h);

                                                                const realChanges = changes
                                                                    ? Object.entries(changes).filter(([_, v]) => {
                                                                        const before = v?.before ?? "";
                                                                        const after = v?.after ?? "";
                                                                        return String(before) !== String(after);
                                                                    })
                                                                    : [];

                                                                const actionLabel = getHistoryActionLabel(h.action);

                                                                return (
                                                                    <div
                                                                        key={h.id ?? `${h.createdAt}-${idx}`}
                                                                        className="relative"
                                                                    >
                                                                        <div
                                                                            className={clsx(
                                                                                "absolute -left-[27px] top-4 h-3 w-3 rounded-full border-2 border-white shadow-sm",
                                                                                getHistoryDotClass(h.action)
                                                                            )}
                                                                        />

                                                                        <article className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/30">
                                                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                                                <div className="min-w-0">
                                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                                        <span
                                                                                            className={clsx(
                                                                                                "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                                                                                                getHistoryActionClass(h.action)
                                                                                            )}
                                                                                        >
                                                                                            {actionLabel}
                                                                                        </span>

                                                                                        <span className="text-xs font-semibold text-slate-700">
                                                                                            {getHistoryActorLabel(h.action)}{" "}
                                                                                            <span className="font-bold text-slate-900">
                                                                                                {actorName(h.actor)}
                                                                                            </span>
                                                                                        </span>
                                                                                    </div>
                                                                                </div>

                                                                                <span className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                                                                                    {formatTimeWithSecondsCL(h.createdAt)}
                                                                                </span>
                                                                            </div>

                                                                            {realChanges.length > 0 ? (
                                                                                <div className="mt-4 space-y-2">
                                                                                    {realChanges.map(([k, v]) => (
                                                                                        <div
                                                                                            key={k}
                                                                                            className="rounded-xl border border-slate-200 bg-white px-3 py-2"
                                                                                        >
                                                                                            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                                                                                {fieldLabels[k] ?? k}
                                                                                            </div>

                                                                                            <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                                                                                                <div className="rounded-lg bg-slate-50 px-2 py-1.5 font-mono text-slate-500">
                                                                                                    {formatHistoryValue(v?.before)}
                                                                                                </div>

                                                                                                <div className="hidden text-center text-slate-400 sm:block">
                                                                                                    →
                                                                                                </div>

                                                                                                <div className="rounded-lg bg-indigo-50 px-2 py-1.5 font-mono font-semibold text-slate-900">
                                                                                                    {formatHistoryValue(v?.after)}
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            ) : (
                                                                                <div className="mt-4 rounded-xl border border-emerald-100 bg-white px-3 py-2 text-xs text-slate-600">
                                                                                    Ficha del equipo creada en el sistema.
                                                                                </div>
                                                                            )}
                                                                        </article>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                        ) : null}

                        {/* Mantenciones equipo */}
                        {activeTab === "mantenciones" ? (
                            <section className="rounded-2xl border border-cyan-200 bg-white p-4 shadow-sm sm:p-5">
                                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-800">
                                            Mantenciones registradas
                                        </h4>
                                        <p className="mt-1 text-xs text-slate-500">
                                            Historial de mantenciones ejecutadas desde RIDS-Mant.General.
                                        </p>
                                    </div>

                                    {!mantencionesLoading && !mantencionesError ? (
                                        <span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                                            {mantenciones.length} mantención(es)
                                        </span>
                                    ) : null}
                                </div>

                                {mantencionesLoading ? (
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                        Cargando mantenciones…
                                    </div>
                                ) : null}

                                {mantencionesError ? (
                                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                        {mantencionesError}
                                    </div>
                                ) : null}

                                {!mantencionesLoading && !mantencionesError && mantenciones.length === 0 ? (
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                                        Este equipo todavía no tiene mantenciones registradas.
                                    </div>
                                ) : null}

                                {!mantencionesLoading && !mantencionesError && mantenciones.length > 0 ? (
                                    <div className="overflow-visible pr-1">
                                        <div className="space-y-5">
                                            {Object.entries(groupHistoryByDate(mantenciones)).map(
                                                ([dateKey, items]) => (
                                                    <div key={dateKey}>
                                                        <div className="sticky top-0 z-10 mb-3 bg-white/95 py-1 backdrop-blur">
                                                            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                                                                {dateKey === "sin-fecha"
                                                                    ? "Sin fecha"
                                                                    : formatDateCL(items[0]?.createdAt)}
                                                            </span>
                                                        </div>

                                                        <div className="relative space-y-4 border-l border-slate-200 pl-5">
                                                            {items.map((mantencion) => {
                                                                const tareasRealizadas = normalizarArrayTexto(
                                                                    mantencion.tareasRealizadas
                                                                );

                                                                const tareasConError = normalizarArrayTexto(
                                                                    mantencion.tareasConError
                                                                );

                                                                return (
                                                                    <article
                                                                        key={mantencion.id}
                                                                        className="relative rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm transition hover:border-cyan-200 hover:bg-cyan-50/30"
                                                                    >
                                                                        <div
                                                                            className={clsx(
                                                                                "absolute -left-[27px] top-5 h-3 w-3 rounded-full border-2 border-white shadow-sm",
                                                                                getMantencionDotClass(mantencion.estado)
                                                                            )}
                                                                        />

                                                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                                                            <div className="min-w-0">
                                                                                <div className="flex flex-wrap items-center gap-2">
                                                                                    <span
                                                                                        className={clsx(
                                                                                            "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                                                                                            getMantencionEstadoClass(
                                                                                                mantencion.estado
                                                                                            )
                                                                                        )}
                                                                                    >
                                                                                        {getMantencionEstadoLabel(
                                                                                            mantencion.estado
                                                                                        )}
                                                                                    </span>

                                                                                    <span className="text-sm font-bold text-slate-900">
                                                                                        {mantencion.tipo || "Mantención"}
                                                                                    </span>
                                                                                </div>

                                                                                <p className="mt-2 text-xs text-slate-500">
                                                                                    Ejecutada desde{" "}
                                                                                    <span className="font-semibold">
                                                                                        {mantencion.origen || "RIDS-Mant.General"}
                                                                                    </span>
                                                                                </p>
                                                                            </div>

                                                                            <div className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
                                                                                {formatTimeWithSecondsCL(
                                                                                    mantencion.fechaInicio ||
                                                                                    mantencion.createdAt
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        <div className="mt-4 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 xl:grid-cols-5">
                                                                            <div className="rounded-lg border border-slate-100 bg-white px-2.5 py-2">
                                                                                <div className="font-medium text-slate-500">
                                                                                    Duración
                                                                                </div>
                                                                                <div className="mt-0.5 font-semibold text-slate-800">
                                                                                    {mantencion.duracionTexto || "—"}
                                                                                </div>
                                                                            </div>

                                                                            <div className="rounded-lg border border-slate-100 bg-white px-2.5 py-2">
                                                                                <div className="font-medium text-slate-500">
                                                                                    Usuario
                                                                                </div>
                                                                                <div className="mt-0.5 break-all font-semibold text-slate-800">
                                                                                    {mantencion.usuarioActual || "—"}
                                                                                </div>
                                                                            </div>

                                                                            <div className="rounded-lg border border-slate-100 bg-white px-2.5 py-2">
                                                                                <div className="font-medium text-slate-500">
                                                                                    Hostname
                                                                                </div>
                                                                                <div className="mt-0.5 break-all font-semibold text-slate-800">
                                                                                    {mantencion.hostname || "—"}
                                                                                </div>
                                                                            </div>

                                                                            <div className="rounded-lg border border-slate-100 bg-white px-2.5 py-2">
                                                                                <div className="font-medium text-slate-500">
                                                                                    Versión herramienta
                                                                                </div>
                                                                                <div className="mt-0.5 break-all font-semibold text-slate-800">
                                                                                    {mantencion.agenteVersion || "—"}
                                                                                </div>
                                                                            </div>
                                                                            <div className="rounded-lg border border-cyan-100 bg-cyan-50/50 px-2.5 py-2">
                                                                                <div className="font-medium text-cyan-700">
                                                                                    Técnico responsable
                                                                                </div>

                                                                                <div className="mt-0.5 break-all font-semibold text-slate-800">
                                                                                    {mantencion.tecnico?.nombre || "No informado"}
                                                                                </div>

                                                                                {mantencion.tecnico?.email ? (
                                                                                    <div className="mt-0.5 break-all text-[11px] text-slate-500">
                                                                                        {mantencion.tecnico.email}
                                                                                    </div>
                                                                                ) : null}
                                                                            </div>
                                                                        </div>

                                                                        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                                                                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                                                                                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                                                    Tareas realizadas ({tareasRealizadas.length})
                                                                                </div>

                                                                                {tareasRealizadas.length > 0 ? (
                                                                                    <ul className="space-y-1 text-sm text-slate-700">
                                                                                        {tareasRealizadas.map((tarea, index) => (
                                                                                            <li
                                                                                                key={`${mantencion.id}-ok-${index}`}
                                                                                                className="flex gap-2"
                                                                                            >
                                                                                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                                                                                                <span>{tarea}</span>
                                                                                            </li>
                                                                                        ))}
                                                                                    </ul>
                                                                                ) : (
                                                                                    <div className="text-sm text-slate-500">
                                                                                        Sin tareas registradas.
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                                                                                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                                                    Tareas con error ({tareasConError.length})
                                                                                </div>

                                                                                {tareasConError.length > 0 ? (
                                                                                    <ul className="space-y-1 text-sm text-rose-700">
                                                                                        {tareasConError.map((tarea, index) => (
                                                                                            <li
                                                                                                key={`${mantencion.id}-err-${index}`}
                                                                                                className="flex gap-2"
                                                                                            >
                                                                                                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                                                                                                <span>{tarea}</span>
                                                                                            </li>
                                                                                        ))}
                                                                                    </ul>
                                                                                ) : (
                                                                                    <div className="text-sm text-slate-500">
                                                                                        Sin errores registrados.
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {mantencion.reporteTexto ? (
                                                                            <details className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-3">
                                                                                <summary className="cursor-pointer text-sm font-semibold text-slate-700">
                                                                                    Ver reporte técnico
                                                                                </summary>

                                                                                <pre className="mt-3 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
                                                                                    {mantencion.reporteTexto}
                                                                                </pre>
                                                                            </details>
                                                                        ) : null}
                                                                    </article>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                ) : null}
                            </section>
                        ) : null}
                    </div>
                </div>

                <div className="shrink-0 border-t border-cyan-100 bg-white px-4 py-3 sm:px-6 lg:px-8">
                    <div className="flex justify-end">
                        <button
                            onClick={onClose}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm hover:bg-slate-100 sm:w-auto"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}