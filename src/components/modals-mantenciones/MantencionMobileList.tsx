// src/components/modal-mantenciones/MantencionMobileList.tsx
import type { MantencionRemota } from "../../lib/mantencionesRemotasApi";
import StatusBadge from "./StatusBadge";

function clsx(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
}

type LoadState = "idle" | "loading" | "error";

type Props = {
    state: LoadState;
    err: string | null;
    items: MantencionRemota[];
    formatDateTime: (iso?: string | null) => string;
    onOpenDetails: (row: MantencionRemota) => void;
    onOpenEdit: (row: MantencionRemota) => void;
    onCloseMantencion: (id: number) => void;
    onDeleteMantencion: (id: number) => void;
    canManage?: boolean;
};

export default function MantencionMobileList({
    state,
    err,
    items,
    formatDateTime,
    onOpenDetails,
    onOpenEdit,
    onCloseMantencion,
    onDeleteMantencion,
    canManage = true,
}: Props) {
    return (
        <section
            className="md:hidden space-y-3 mt-4"
            aria-live="polite"
            aria-busy={state === "loading" ? "true" : "false"}
        >
            {state === "loading" && (
                <div className="space-y-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div
                            key={`skm-${i}`}
                            className="rounded-2xl border border-cyan-200 bg-white p-4 animate-pulse"
                        >
                            <div className="h-4 w-28 bg-cyan-50 rounded mb-2" />
                            <div className="h-3 w-4/5 bg-cyan-50 rounded mb-2" />
                            <div className="h-3 w-1/2 bg-cyan-50 rounded" />
                        </div>
                    ))}
                </div>
            )}

            {state === "error" && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 p-4 text-center">
                    {err}
                </div>
            )}

            {state === "idle" && items.length === 0 && (
                <div className="rounded-2xl border border-cyan-200 bg-white text-slate-600 p-4 text-center">
                    Sin resultados.
                </div>
            )}

            {state === "idle" &&
                items.map((r) => {
                    const empresa = r.empresa?.nombre ?? `#${r.empresaId}`;
                    const tecnico = r.tecnico?.nombre ?? `#${r.tecnicoId}`;
                    const solicitante = r.solicitante ?? "—";

                    return (
                        <article
                            key={r.id_mantencion}
                            className="rounded-2xl border border-cyan-200 bg-white p-4 transition hover:shadow-md"
                        >
                            <header className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="text-xs text-slate-500">#{r.id_mantencion}</div>
                                    <h3 className="text-base font-semibold text-slate-900">{empresa}</h3>
                                    <p className="text-xs text-slate-600 mt-0.5">
                                        {tecnico} • {formatDateTime(r.inicio)}
                                    </p>
                                </div>
                                <StatusBadge status={r.status} />
                            </header>

                            <p className="text-sm text-slate-700 mt-2">
                                <span className="text-slate-500">Solicitante:</span> {solicitante}
                            </p>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => onOpenDetails(r)}
                                    className="rounded-xl border border-indigo-200 text-indigo-700 px-2 py-2 text-sm hover:bg-indigo-50"
                                >
                                    Detalles
                                </button>

                                {canManage && (
                                    <>
                                        <button
                                            onClick={() => onOpenEdit(r)}
                                            disabled={r.status === "EN_CURSO"}
                                            className={clsx(
                                                "inline-flex items-center gap-1 rounded-lg border px-2 py-1 transition",
                                                r.status === "EN_CURSO"
                                                    ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                                                    : "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                                            )}
                                        >
                                            Editar
                                        </button>

                                        <button
                                            onClick={() => onCloseMantencion(r.id_mantencion)}
                                            disabled={r.status === "COMPLETADA"}
                                            className={clsx(
                                                "rounded-xl border px-2 py-2 text-sm transition",
                                                r.status === "COMPLETADA"
                                                    ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                                                    : "border-cyan-200 text-cyan-800 hover:bg-cyan-50"
                                            )}
                                        >
                                            Cerrar
                                        </button>

                                        <button
                                            onClick={() => onDeleteMantencion(r.id_mantencion)}
                                            className="rounded-xl border border-rose-200 text-rose-700 px-2 py-2 text-sm hover:bg-rose-50"
                                        >
                                            Eliminar
                                        </button>
                                    </>
                                )}
                            </div>
                        </article>
                    );
                })}
        </section>
    );
}