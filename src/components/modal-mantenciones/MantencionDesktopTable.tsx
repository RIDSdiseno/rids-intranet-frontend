import React from "react";
import type { MantencionRemota } from "../../lib/mantencionesRemotasApi";
import StatusBadge from "./StatusBadge";
import TableSkeletonRows from "./TableSkeletonRows";
import MantencionPagination from "./MantencionPagination";

function clsx(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
}

type LoadState = "idle" | "loading" | "error";

type Props = {
    state: LoadState;
    err: string | null;
    items: MantencionRemota[];
    total: number;
    page: number;
    totalPages: number;
    pageSize: number;
    setPage: React.Dispatch<React.SetStateAction<number>>;
    setPageSize: React.Dispatch<React.SetStateAction<number>>;
    formatDateTime: (iso?: string | null) => string;
    onOpenDetails: (row: MantencionRemota) => void;
    onOpenEdit: (row: MantencionRemota) => void;
    onCloseMantencion: (id: number) => void;
    onDeleteMantencion: (id: number) => void;
};

export default function MantencionDesktopTable({
    state,
    err,
    items,
    total,
    page,
    totalPages,
    pageSize,
    setPage,
    setPageSize,
    formatDateTime,
    onOpenDetails,
    onOpenEdit,
    onCloseMantencion,
    onDeleteMantencion,
}: Props) {
    return (
        <section className="hidden md:block rounded-3xl border border-cyan-200 bg-white overflow-hidden mt-4">
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-gradient-to-r from-cyan-50 to-indigo-50 text-slate-800 border-b border-cyan-200 sticky top-0 z-10">
                        <tr>
                            {["ID", "Técnico", "Empresa", "Solicitante", "Inicio", "Estado", "Acciones"].map((h) => (
                                <th key={h} className="text-left px-4 py-3 font-semibold">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody className="text-slate-800">
                        {state === "loading" && <TableSkeletonRows cols={7} rows={8} />}

                        {state === "error" && (
                            <tr>
                                <td colSpan={7} className="px-4 py-10 text-center text-rose-700">
                                    {err}
                                </td>
                            </tr>
                        )}

                        {state === "idle" && items.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-4 py-10 text-center text-slate-600">
                                    Sin resultados.
                                </td>
                            </tr>
                        )}

                        {state === "idle" &&
                            items.map((r) => {
                                const empresa = r.empresa?.nombre ?? `#${r.empresaId}`;
                                const tecnico = r.tecnico?.nombre ?? `#${r.tecnicoId}`;
                                const solicitante = r.solicitante ?? "—";

                                return (
                                    <tr
                                        key={r.id_mantencion}
                                        className="border-t border-cyan-100 transition-colors odd:bg-white even:bg-slate-50/40 hover:bg-cyan-50/60"
                                    >
                                        <td className="px-4 py-3 whitespace-nowrap">{r.id_mantencion}</td>
                                        <td className="px-4 py-3">{tecnico}</td>
                                        <td className="px-4 py-3">{empresa}</td>
                                        <td className="px-4 py-3">
                                            <div className="max-w-[420px] truncate" title={solicitante}>
                                                {solicitante}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">{formatDateTime(r.inicio)}</td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={r.status} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <button
                                                    onClick={() => onOpenDetails(r)}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 text-indigo-700 px-2 py-1 hover:bg-indigo-50 transition"
                                                >
                                                    Detalles
                                                </button>

                                                <button
                                                    onClick={() => onOpenEdit(r)}
                                                    disabled={r.status === "EN_CURSO"}
                                                    className={clsx(
                                                        "rounded-xl border px-2 py-2 text-sm transition",
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
                                                        "inline-flex items-center gap-1 rounded-lg border px-2 py-1 transition",
                                                        r.status === "COMPLETADA"
                                                            ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
                                                            : "border-cyan-200 text-cyan-800 hover:bg-cyan-50"
                                                    )}
                                                >
                                                    Cerrar
                                                </button>

                                                <button
                                                    onClick={() => onDeleteMantencion(r.id_mantencion)}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 text-rose-700 px-2 py-1 hover:bg-rose-50 transition"
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                    </tbody>
                </table>
            </div>

            <MantencionPagination
                total={total}
                page={page}
                totalPages={totalPages}
                pageSize={pageSize}
                state={state}
                setPage={setPage}
                setPageSize={setPageSize}
            />
        </section>
    );
}