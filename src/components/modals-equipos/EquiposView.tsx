// src/components/modals-equipos/EquiposView.tsx
import React, { useEffect, useState } from "react";
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
} from "./equipos.helpers";

import type {
    EquipoAgentFull,
    EquipoHistorialItem,
    EquipoRow,
} from "./equipos.types";
import { http } from "../../service/http";

import type { TipoEquipoValue } from "../modals-gestioo/types";
import { TipoEquipo, TipoEquipoLabel } from "../modals-gestioo/types";


type Props = {
    open: boolean;
    row: EquipoRow | null;
    historial: EquipoHistorialItem[];
    histLoading: boolean;
    histError: string | null;
    onClose: () => void;
};

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

    useEffect(() => {
        if (!open || !row) return;

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

        void fetchEquipoAgentDetalle();

        return () => c.abort();
    }, [open, row?.id_equipo]);

    if (!open || !row) return null;

    return (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />

            <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-cyan-200 bg-white shadow-xl">
                <div className="px-6 py-4 border-b border-cyan-100 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">
                        Ficha del Equipo #{row.id_equipo}
                    </h3>

                    <button onClick={onClose} className="text-slate-500 hover:text-slate-700">
                        ✕
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <section>
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">
                            Información General
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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
                            <div><strong>Propiedad:</strong> {row.propiedad}</div>

                            <div className="sm:col-span-2">
                                <strong>Observaciones:</strong>
                                <div className="mt-1 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-700">
                                    {row.observaciones || "Sin observaciones"}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">
                            Relación
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div><strong>Empresa:</strong> {row.empresa || "—"}</div>
                            <div><strong>Solicitante:</strong> {row.solicitante || "—"}</div>
                            <div><strong>RUT solicitante:</strong> {formatRut(row.solicitanteRut)}</div>
                            <div><strong>Email solicitante:</strong> {row.solicitanteEmail || "—"}</div>
                        </div>
                    </section>

                    <section>
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">
                            Fechas
                        </h4>

                        <div className="text-sm space-y-1">
                            <div>
                                <strong>Ingreso:</strong>{" "}
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

                            {row.updatedAt && (
                                <div>
                                    <strong>Última edición:</strong>{" "}
                                    {new Date(row.updatedAt).toLocaleString("es-CL", {
                                        year: "numeric",
                                        month: "2-digit",
                                        day: "2-digit",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit",
                                        hour12: false,
                                    })}
                                </div>
                            )}
                        </div>
                    </section>

                    <section>
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">
                            Ficha Técnica
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div><strong>MAC WiFi:</strong> {row.macWifi || "—"}</div>
                            <div><strong>MAC Ethernet:</strong> {row.redEthernet || "—"}</div>
                            <div><strong>Sistema Operativo:</strong> {row.so || "—"}</div>
                            <div><strong>Tipo Disco:</strong> {row.tipoDd || "—"}</div>
                            <div><strong>Estado Almacenamiento:</strong> {row.estadoAlm || "—"}</div>
                            <div><strong>Office:</strong> {row.office || "—"}</div>
                            <div><strong>TeamViewer:</strong> {row.teamViewer || "—"}</div>
                            <div><strong>Clave TeamViewer:</strong> {row.claveTv || "—"}</div>
                            <div>
                                <strong>Revisado:</strong>{" "}
                                {row.revisado ? dayjs(row.revisado).format("DD-MM-YYYY") : "—"}
                            </div>
                        </div>
                    </section>

                    <section>
                        <h4 className="text-sm font-semibold text-slate-700 mb-3">
                            Accesos
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            <div>
                                <strong>Admin RIDS:</strong> {row.adminRidsUsuario || "—"}
                                <br />
                                <span className="text-slate-500">
                                    Contraseña: {row.adminRidsPassword || "—"}
                                </span>
                            </div>

                            <div>
                                <strong>Usuario Empresa:</strong> {row.usuarioEmpresa || "—"}
                                <br />
                                <span className="text-slate-500">
                                    Contraseña: {row.passwordEmpresa || "—"}
                                </span>
                            </div>

                            <div>
                                <strong>Usuario Personal:</strong> {row.usuarioPersonal || "—"}
                                <br />
                                <span className="text-slate-500">
                                    Contraseña: {row.passwordPersonal || "—"}
                                </span>
                            </div>
                        </div>
                    </section>

                    {/* Agente Windows */}
                    <div className="rounded-2xl border border-cyan-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-3 mb-3">
                            <div>
                                <h4 className="text-sm font-semibold text-slate-800">Agente Windows</h4>
                                <p className="text-xs text-slate-500">
                                    Datos reportados automáticamente desde el equipo.
                                </p>
                            </div>

                            {agentLoading ? (
                                <span className="text-xs text-slate-500">Cargando…</span>
                            ) : viewAgent?.agenteActivo ? (
                                <span
                                    className={clsx(
                                        "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                                        agenteEstadoClasses(viewAgent.estadoAgente)
                                    )}
                                >
                                    {viewAgent.estadoAgente}
                                </span>
                            ) : (
                                <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                                    Sin agente
                                </span>
                            )}
                        </div>

                        {agentError ? (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                                {agentError}
                            </div>
                        ) : !agentLoading && !viewAgent ? (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                                Este equipo aún no tiene información del agente.
                            </div>
                        ) : viewAgent ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div>
                                    <strong>Hostname:</strong> {viewAgent.hostname || "—"}
                                </div>

                                <div>
                                    <strong>Usuario actual:</strong> {viewAgent.usuarioActual || "—"}
                                </div>

                                <div>
                                    <strong>Dominio:</strong> {viewAgent.dominio || "—"}
                                </div>

                                <div>
                                    <strong>IP local:</strong> {viewAgent.localIp || "—"}
                                </div>

                                <div>
                                    <strong>MAC principal:</strong> {viewAgent.macAddress || "—"}
                                </div>

                                <div>
                                    <strong>MAC WiFi:</strong> {viewAgent.detalle?.macWifi || row?.macWifi || "—"}
                                </div>

                                <div>
                                    <strong>MAC Ethernet:</strong> {viewAgent.detalle?.redEthernet || row?.redEthernet || "—"}
                                </div>

                                <div>
                                    <strong>RAM detectada:</strong> {viewAgent.ram || row?.ram || "—"}
                                </div>

                                <div>
                                    <strong>Última conexión:</strong> {formatDateTimeCL(viewAgent.lastSeenAt)}
                                </div>

                                <div>
                                    <strong>Último arranque:</strong> {formatDateTimeCL(viewAgent.lastBootAt)}
                                </div>

                                <div>
                                    <strong>Versión agente:</strong> {viewAgent.agenteVersion || "—"}
                                </div>

                                <div className="md:col-span-2">
                                    <strong>Sistema operativo:</strong> {viewAgent.detalle?.so || viewAgent.so || "—"}
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {/* Licencias y acceso remoto */}
                    {viewAgent ? (
                        <div className="rounded-2xl border border-cyan-200 bg-white p-4">
                            <div className="mb-3">
                                <h4 className="text-sm font-semibold text-slate-800">
                                    Licencias y acceso remoto
                                </h4>
                                <p className="text-xs text-slate-500">
                                    Datos técnicos detectados automáticamente por el agente.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <MultiInfoLine
                                    label="Office / Licencia"
                                    value={viewAgent.detalle?.office || viewAgent.office || row?.office}
                                />

                                <InfoLine
                                    label="TeamViewer ID"
                                    value={
                                        viewAgent.detalle?.teamViewer ||
                                        viewAgent.teamViewer ||
                                        row?.teamViewer
                                    }
                                />

                                <InfoLine
                                    label="Tipo de disco"
                                    value={
                                        viewAgent.detalle?.tipoDd ||
                                        viewAgent.tipoDd ||
                                        row?.tipoDd
                                    }
                                />

                                <MultiInfoLine
                                    label="Estado almacenamiento"
                                    value={
                                        viewAgent.detalle?.estadoAlm ||
                                        viewAgent.estadoAlm ||
                                        row?.estadoAlm
                                    }
                                />
                            </div>
                        </div>
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
                                    <strong>BitLocker:</strong> {viewAgent.detalle?.bitlockerEstado || "—"}
                                </div>

                                <div>
                                    <strong>Windows Update:</strong> {viewAgent.detalle?.windowsUpdate || "—"}
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
                        <div className="rounded-2xl border border-cyan-200 bg-white p-4">
                            <h4 className="text-sm font-semibold text-slate-800 mb-3">
                                Software instalado ({viewAgent.softwares.length})
                            </h4>

                            <div className="max-h-72 overflow-auto rounded-xl border border-slate-200">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-slate-50 text-slate-600">
                                        <tr>
                                            <th className="text-left px-3 py-2">Nombre</th>
                                            <th className="text-left px-3 py-2">Versión</th>
                                            <th className="text-left px-3 py-2">Fabricante</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {viewAgent.softwares.map((sw) => (
                                            <tr key={sw.id} className="border-t border-slate-100">
                                                <td className="px-3 py-2">{sw.nombre}</td>
                                                <td className="px-3 py-2">{sw.version || "—"}</td>
                                                <td className="px-3 py-2">{sw.publisher || "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : viewAgent ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                            Sin software reportado por el agente.
                        </div>
                    ) : null}

                    {/* Eventos agente */}
                    {viewAgent?.agenteEventos?.length ? (
                        <div className="rounded-2xl border border-cyan-200 bg-white p-4">
                            <h4 className="text-sm font-semibold text-slate-800 mb-3">
                                Eventos del agente
                            </h4>

                            <div className="space-y-2">
                                {viewAgent.agenteEventos.slice(0, 10).map((ev) => (
                                    <div
                                        key={ev.id}
                                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="font-medium text-slate-800">{ev.tipo}</span>
                                            <span className="text-xs text-slate-500">
                                                {formatDateTimeCL(ev.createdAt)}
                                            </span>
                                        </div>
                                        <div className="text-slate-600">{ev.mensaje || "—"}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {row.adicionales?.length ? (
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

                    <section className="mt-6">
                        <div className="px-5 py-4 border-b border-cyan-100 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-900">
                                Historial equipo #{row.id_equipo}
                            </h3>
                        </div>

                        <div className="p-5 space-y-3">
                            {histLoading && (
                                <div className="text-sm text-slate-600">
                                    Cargando historial…
                                </div>
                            )}

                            {histError && (
                                <div className="text-sm text-rose-700">
                                    {histError}
                                </div>
                            )}

                            {!histLoading && !histError && historial.length === 0 && (
                                <div className="text-sm text-slate-600">
                                    Sin historial.
                                </div>
                            )}

                            {historial.map((h, idx) => {
                                const changes = getChanges(h);

                                const realChanges = changes
                                    ? Object.entries(changes).filter(([_, v]) => {
                                        const before = v?.before ?? "";
                                        const after = v?.after ?? "";
                                        return String(before) !== String(after);
                                    })
                                    : [];

                                return (
                                    <div
                                        key={h.id ?? `${h.createdAt}-${idx}`}
                                        className="relative pl-6 border-l border-slate-200 pb-6"
                                    >
                                        <div
                                            className={clsx(
                                                "absolute left-[-6px] top-2 w-3 h-3 rounded-full",
                                                h.action === "CREATE" ? "bg-emerald-500" : "bg-indigo-500"
                                            )}
                                        />

                                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                                <span
                                                    className={clsx(
                                                        "px-2 py-0.5 rounded-full text-[10px] font-semibold",
                                                        h.action === "CREATE"
                                                            ? "bg-emerald-100 text-emerald-700"
                                                            : h.action === "UPDATE"
                                                                ? "bg-indigo-100 text-indigo-700"
                                                                : h.action === "DELETE"
                                                                    ? "bg-rose-100 text-rose-700"
                                                                    : "bg-slate-100 text-slate-700"
                                                    )}
                                                >
                                                    {actionLabels[h.action ?? ""] ?? h.action}
                                                </span>

                                                <span className="text-xs text-slate-500">
                                                    {new Date(h.createdAt).toLocaleString("es-CL", {
                                                        year: "numeric",
                                                        month: "2-digit",
                                                        day: "2-digit",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        second: "2-digit",
                                                        hour12: false,
                                                    })}
                                                </span>
                                            </div>

                                            <div className="mt-1 text-xs">
                                                <b>{h.action === "CREATE" ? "Creado por:" : "Actualizado por:"}</b>{" "}
                                                {actorName(h.actor)}
                                            </div>

                                            {h.action !== "CREATE" && (
                                                <div className="mt-3 space-y-2 text-xs">
                                                    {realChanges.length > 0 ? (
                                                        realChanges.map(([k, v]) => (
                                                            <div key={k} className="flex flex-wrap items-center gap-2">
                                                                <span className="font-semibold text-slate-700 min-w-[140px]">
                                                                    {fieldLabels[k] ?? k}:
                                                                </span>

                                                                <span className="text-slate-500 font-mono">
                                                                    {String(v?.before ?? "—")}
                                                                </span>

                                                                <span className="text-slate-400 mx-1">→</span>

                                                                <span className="text-slate-900 font-mono font-semibold">
                                                                    {String(v?.after ?? "—")}
                                                                </span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-slate-500 italic">
                                                            Sin cambios relevantes.
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                </div>

                <div className="px-6 py-4 border-t border-cyan-100 bg-slate-50 text-right">
                    <button
                        onClick={onClose}
                        className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm border-slate-200 bg-white hover:bg-slate-100"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}