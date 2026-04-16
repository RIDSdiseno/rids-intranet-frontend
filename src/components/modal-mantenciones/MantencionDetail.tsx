import type { MantencionRemota, MantencionStatus } from "../../lib/mantencionesRemotasApi";

function clsx(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
}

type LoadState = "idle" | "loading" | "error";

type ChecklistKey =
    | "soporteRemoto"
    | "actualizaciones"
    | "antivirus"
    | "ccleaner"
    | "estadoDisco"
    | "licenciaOffice"
    | "licenciaWindows"
    | "optimizacion"
    | "respaldo";

const FLAGS: Array<{ key: ChecklistKey; label: string }> = [
    { key: "soporteRemoto", label: "Soporte remoto" },
    { key: "actualizaciones", label: "Actualizaciones" },
    { key: "antivirus", label: "Antivirus" },
    { key: "ccleaner", label: "CCleaner" },
    { key: "estadoDisco", label: "Estado disco" },
    { key: "licenciaOffice", label: "Licencia Office" },
    { key: "licenciaWindows", label: "Licencia Windows" },
    { key: "optimizacion", label: "Optimización" },
    { key: "respaldo", label: "Respaldo" },
];

function formatDateTime(iso?: string | null) {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleString("es-CL", {
            timeZone: "America/Santiago",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
            hourCycle: "h23",
        });
    } catch {
        return String(iso);
    }
}

function boolLabel(v?: boolean | null) {
    return v ? "Sí" : "No";
}

function StatusBadge({ status }: { status: MantencionStatus | string }) {
    const norm = (status || "").toUpperCase();
    const styles: Record<string, string> = {
        COMPLETADA: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
        EN_CURSO: "bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200",
    };
    const klass =
        styles[norm] || "bg-slate-50 text-slate-700 ring-1 ring-slate-200";

    return (
        <span className={clsx("px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide", klass)}>
            {status}
        </span>
    );
}

type Props = {
    open: boolean;
    state: LoadState;
    err: string | null;
    details: MantencionRemota | null;
    onClose: () => void;
    onEdit: (row: MantencionRemota) => void;
};

export default function MantencionDetailsModal(props: Props) {
    const { open, state, err, details, onClose, onEdit } = props;
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-3 sm:grid sm:place-items-center sm:p-4"
            onClick={onClose}
        >
            <div
               className="w-full max-w-3xl max-h-[94vh] overflow-hidden rounded-3xl border border-cyan-200 bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col gap-3 border-b border-cyan-200 bg-gradient-to-r from-indigo-50 to-cyan-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <h3 className="text-lg font-bold text-slate-900">Detalles</h3>
                        {details?.status && <StatusBadge status={details.status} />}
                    </div>

                    <button
                        onClick={onClose}
                        className="rounded-xl border border-cyan-200 bg-white px-3 py-1.5 text-sm text-cyan-800 hover:bg-cyan-50"
                    >
                        Cerrar
                    </button>
                </div>

                <div className="max-h-[calc(94vh-140px)] overflow-y-auto p-4 sm:p-5">
                    {state === "loading" && (
                        <div className="rounded-2xl border border-cyan-200 bg-white p-4 animate-pulse">
                            <div className="h-4 w-40 bg-cyan-50 rounded mb-3" />
                            <div className="h-3 w-4/5 bg-cyan-50 rounded mb-2" />
                            <div className="h-3 w-2/3 bg-cyan-50 rounded" />
                        </div>
                    )}

                    {state === "error" && (
                        <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 text-sm">
                            {err ?? "No se pudo cargar el detalle."}
                        </div>
                    )}

                    {details && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                <div className="md:col-span-4 rounded-2xl border border-cyan-200 bg-white p-4">
                                    <div className="text-xs text-slate-500">ID</div>
                                    <div className="text-sm font-semibold text-slate-900">
                                        #{details.id_mantencion}
                                    </div>
                                </div>

                                <div className="md:col-span-4 rounded-2xl border border-cyan-200 bg-white p-4">
                                    <div className="text-xs text-slate-500">Empresa</div>
                                    <div className="text-sm font-semibold text-slate-900">
                                        {details.empresa?.nombre ?? `#${details.empresaId}`}
                                    </div>
                                </div>

                                <div className="md:col-span-4 rounded-2xl border border-cyan-200 bg-white p-4">
                                    <div className="text-xs text-slate-500">Técnico</div>
                                    <div className="text-sm font-semibold text-slate-900">
                                        {details.tecnico?.nombre ?? `#${details.tecnicoId}`}
                                    </div>
                                </div>

                                <div className="md:col-span-6 rounded-2xl border border-cyan-200 bg-white p-4">
                                    <div className="text-xs text-slate-500">Solicitante</div>
                                    <div className="text-sm font-semibold text-slate-900">
                                        {details.solicitanteRef?.nombre ?? details.solicitante ?? "—"}
                                    </div>
                                </div>

                                <div className="md:col-span-3 rounded-2xl border border-cyan-200 bg-white p-4">
                                    <div className="text-xs text-slate-500">Inicio</div>
                                    <div className="text-sm font-semibold text-slate-900">
                                        {formatDateTime(details.inicio)}
                                    </div>
                                </div>

                                <div className="md:col-span-3 rounded-2xl border border-cyan-200 bg-white p-4">
                                    <div className="text-xs text-slate-500">Fin</div>
                                    <div className="text-sm font-semibold text-slate-900">
                                        {formatDateTime(details.fin)}
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-cyan-200 bg-white p-4">
                                <h4 className="text-sm font-semibold text-slate-900 mb-3">
                                    Checklist
                                </h4>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-slate-700">
                                    {FLAGS.map((f) => {
                                        const val = Boolean(details[f.key]);
                                        return (
                                            <div
                                                key={String(f.key)}
                                                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"
                                            >
                                                <span>{f.label}</span>
                                                <span
                                                    className={clsx(
                                                        "text-xs font-semibold px-2 py-0.5 rounded-full",
                                                        val
                                                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                                            : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                                                    )}
                                                >
                                                    {boolLabel(val)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm text-slate-700 font-medium">Otros</div>
                                        <span
                                            className={clsx(
                                                "text-xs font-semibold px-2 py-0.5 rounded-full",
                                                details.otros
                                                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                                    : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                                            )}
                                        >
                                            {boolLabel(details.otros)}
                                        </span>
                                    </div>

                                    {details.otros || (details.otrosDetalle?.trim() ?? "") ? (
                                        <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">
                                            {details.otrosDetalle?.trim()
                                                ? details.otrosDetalle
                                                : "—"}
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-2 justify-end">
                                <button
                                    onClick={() => onEdit(details)}
                                    className="rounded-2xl border border-emerald-200 bg-white px-4 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                                >
                                    Editar
                                </button>
                                <button
                                    onClick={onClose}
                                    className="rounded-2xl border border-cyan-200 bg-white px-4 py-2 text-sm text-cyan-800 hover:bg-cyan-50"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}