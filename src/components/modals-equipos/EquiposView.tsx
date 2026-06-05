// src/components/modals-equipos/EquiposView.tsx
import React from "react";
import dayjs from "dayjs";
import type { EquipoHistorialItem, EquipoRow } from "./equipos.types";
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
} from "./equipos.helpers";

type Props = {
    open: boolean;
    row: EquipoRow | null;
    historial: EquipoHistorialItem[];
    histLoading: boolean;
    histError: string | null;
    onClose: () => void;
};

export default function EquipoViewModal({
    open,
    row,
    historial,
    histLoading,
    histError,
    onClose,
}: Props) {
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
                            <div><strong>RAM:</strong> {row.ram}</div>
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