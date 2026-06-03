// src/components/modal-mantenciones/MantencionUpsert.tsx
import React from "react";
import type {
    FiltersResp,
    MantencionRemota,
    MantencionStatus,
} from "../../lib/mantencionesRemotasApi";

function clsx(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
}

type IdOrEmpty = number | "";

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

type FormState = {
    empresaId: IdOrEmpty;
    tecnicoId: IdOrEmpty;
    fin: string;
    status: MantencionStatus;
    solicitanteId: IdOrEmpty;
    soporteRemoto: boolean;
    actualizaciones: boolean;
    antivirus: boolean;
    ccleaner: boolean;
    estadoDisco: boolean;
    licenciaOffice: boolean;
    licenciaWindows: boolean;
    optimizacion: boolean;
    respaldo: boolean;
    otros: boolean;
    otrosDetalle: string;
};

type SolicitanteOpt = {
    id: number;
    nombre: string;
};

type LoadState = "idle" | "loading" | "error";

const STATUS: MantencionStatus[] = ["EN_CURSO", "COMPLETADA"];

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

function Spinner({ className }: { className?: string }) {
    return (
        <span
            className={clsx(
                "inline-block h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin",
                className
            )}
            aria-hidden="true"
        />
    );
}

function parseNumberOrEmpty(v: string): IdOrEmpty {
    if (!v) return "";
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : "";
}

type Props = {
    open: boolean;
    saving: boolean;
    isCliente: boolean;
    user: {
        rol?: string;
        empresaId?: number | null;
        tecnicoId?: number | null;
        email?: string | null;
        nombre?: string | null;
    };
    filters: FiltersResp | null;
    editing: MantencionRemota | null;
    form: FormState;
    setForm: React.Dispatch<React.SetStateAction<FormState>>;
    err: string | null;
    solState: LoadState;
    solicitantes: SolicitanteOpt[];
    solSearch: string;
    setSolSearch: (v: string) => void;
    onClose: () => void;
    onSubmit: () => void;
};

export default function MantencionUpsertModal(props: Props) {
    const {
        open,
        saving,
        isCliente,
        user,
        filters,
        editing,
        form,
        setForm,
        err,
        solState,
        solicitantes,
        solSearch,
        setSolSearch,
        onClose,
        onSubmit,
    } = props;

    if (!open) return null;

    const isBlocked = editing?.status === "EN_CURSO";
    const canClose = !saving;

    return (
        <div
            className={clsx(
                "fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-3 sm:grid sm:place-items-center sm:p-4",
                saving && "cursor-wait"
            )}
            onClick={() => {
                if (!canClose) return;
                onClose();
            }}
        >
            <div
                className={clsx(
                    "relative w-full max-w-4xl max-h-[94vh] overflow-hidden rounded-3xl border border-cyan-200 bg-white shadow-xl",
                    saving && "opacity-95"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col gap-3 border-b border-cyan-200 bg-gradient-to-r from-cyan-50 to-indigo-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                    <div className="min-w-0">
                        <h3 className="text-lg font-bold text-slate-900 sm:text-xl">
                            {editing ? "Editar mantención" : "Nueva mantención"}
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                            {editing
                                ? "Modifica los datos y guarda para actualizar la mantención."
                                : "Completa los datos y guarda para registrar una nueva mantención."}
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            if (!canClose) return;
                            onClose();
                        }}
                        disabled={!canClose}
                        className={clsx(
                            "w-full rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm text-cyan-800 hover:bg-cyan-50 sm:w-auto sm:py-1.5",
                            !canClose && "cursor-not-allowed opacity-50"
                        )}
                    >
                        Cerrar
                    </button>
                </div>

                <div
                    className={clsx(
                        "max-h-[calc(94vh-140px)] overflow-y-auto p-4 sm:p-5",
                        (saving || isBlocked) && "pointer-events-none select-none"
                    )}
                >
                    {err && (
                        <div className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                            {err}
                        </div>
                    )}

                    {isBlocked && (
                        <div className="mb-3 rounded-2xl border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-700">
                            ⚠️ Esta mantención está en curso y no puede ser editada hasta que se complete.
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                        {!isCliente && (
                            <div className="md:col-span-6">
                                <label className="text-xs text-slate-600">Empresa</label>
                                <select
                                    value={form.empresaId === "" ? "" : String(form.empresaId)}
                                    onChange={(e) =>
                                        setForm((p) => ({
                                            ...p,
                                            empresaId: parseNumberOrEmpty(e.target.value),
                                            solicitanteId: "",
                                        }))
                                    }
                                    className="mt-1 w-full rounded-2xl border border-cyan-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                >
                                    <option value="">Selecciona empresa</option>
                                    {filters?.empresas?.map((emp) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className={clsx("md:col-span-6", isCliente && "md:col-span-12")}>
                            <label className="text-xs text-slate-600">Técnico</label>

                            {isCliente ? (
                                <input
                                    value={
                                        filters?.tecnicos?.find((t) => t.id === Number(form.tecnicoId))?.nombre ||
                                        user.nombre ||
                                        user.email ||
                                        (form.tecnicoId ? `#${form.tecnicoId}` : "No detectado")
                                    }
                                    readOnly
                                    className="mt-1 w-full rounded-2xl border border-cyan-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700"
                                />
                            ) : (
                                <select
                                    value={form.tecnicoId === "" ? "" : String(form.tecnicoId)}
                                    onChange={(e) =>
                                        setForm((p) => ({
                                            ...p,
                                            tecnicoId: parseNumberOrEmpty(e.target.value),
                                        }))
                                    }
                                    className="mt-1 w-full rounded-2xl border border-cyan-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                >
                                    <option value="">Selecciona técnico</option>
                                    {filters?.tecnicos?.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.nombre}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <div className="md:col-span-6">
                            <label className="text-xs text-slate-600">Fin (opcional)</label>
                            <input
                                type="datetime-local"
                                value={form.fin}
                                onChange={(e) => setForm((p) => ({ ...p, fin: e.target.value }))}
                                className="mt-1 w-full rounded-2xl border border-cyan-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                            />
                        </div>

                        <div className="md:col-span-6">
                            <label className="text-xs text-slate-600">Estado</label>
                            <select
                                value={form.status}
                                onChange={(e) =>
                                    setForm((p) => ({
                                        ...p,
                                        status: (e.target.value as MantencionStatus) || "COMPLETADA",
                                    }))
                                }
                                className="mt-1 w-full rounded-2xl border border-cyan-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                            >
                                {STATUS.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-12">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_16rem]">
                                <div className="min-w-0">
                                    <label className="text-xs text-slate-600">Solicitante</label>
                                    <select
                                        disabled={!isCliente && form.empresaId === ""}
                                        value={form.solicitanteId === "" ? "" : String(form.solicitanteId)}
                                        onChange={(e) =>
                                            setForm((p) => ({
                                                ...p,
                                                solicitanteId: parseNumberOrEmpty(e.target.value),
                                            }))
                                        }
                                        className="mt-1 w-full rounded-2xl border border-cyan-200 bg-white px-3 py-2.5 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                    >
                                        <option value="">
                                            {!isCliente && form.empresaId === ""
                                                ? "Primero selecciona empresa"
                                                : solState === "loading"
                                                    ? "Cargando solicitantes..."
                                                    : "Selecciona solicitante"}
                                        </option>

                                        {solicitantes.map((s) => (
                                            <option key={s.id} value={s.id}>
                                                {s.nombre}
                                            </option>
                                        ))}
                                    </select>

                                    {solState === "error" && (
                                        <div className="mt-2 text-xs text-rose-700">
                                            No se pudieron cargar solicitantes.
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs text-slate-600">Buscar</label>
                                    <input
                                        value={solSearch}
                                        onChange={(e) => setSolSearch(e.target.value)}
                                        placeholder="Buscar solicitante…"
                                        disabled={!isCliente && form.empresaId === ""}
                                        className="mt-1 w-full rounded-2xl border border-cyan-200 bg-white px-3 py-2.5 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-12">
                            <div className="mt-2 rounded-2xl border border-cyan-200 bg-white p-4">
                                <h4 className="mb-3 text-sm font-semibold text-slate-900">Checklist</h4>

                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                    {FLAGS.map((f) => (
                                        <label
                                            key={String(f.key)}
                                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                                        >
                                            <span>{f.label}</span>
                                            <input
                                                type="checkbox"
                                                checked={!!form[f.key]}
                                                onChange={(e) =>
                                                    setForm((p) => ({
                                                        ...p,
                                                        [f.key]: e.target.checked,
                                                    }))
                                                }
                                                className="h-4 w-4"
                                            />
                                        </label>
                                    ))}
                                </div>

                                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={!!form.otros}
                                            onChange={(e) =>
                                                setForm((p) => ({ ...p, otros: e.target.checked }))
                                            }
                                            className="h-4 w-4"
                                        />
                                        Otros
                                    </label>

                                    {form.otros && (
                                        <textarea
                                            value={form.otrosDetalle}
                                            onChange={(e) =>
                                                setForm((p) => ({
                                                    ...p,
                                                    otrosDetalle: e.target.value,
                                                }))
                                            }
                                            rows={3}
                                            className="mt-2 w-full rounded-2xl border border-cyan-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                            placeholder="Detalle otros..."
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <button
                            onClick={onClose}
                            disabled={!canClose}
                            className={clsx(
                                "w-full rounded-2xl border border-cyan-200 bg-white px-4 py-2 text-sm text-cyan-800 hover:bg-cyan-50 sm:w-auto",
                                !canClose && "cursor-not-allowed opacity-50"
                            )}
                        >
                            Cancelar
                        </button>

                        <button
                            onClick={onSubmit}
                            disabled={saving || isBlocked}
                            className={clsx(
                                "w-full rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 px-4 py-2 text-sm font-medium text-white hover:brightness-110 sm:w-auto",
                                (saving || isBlocked) && "cursor-not-allowed opacity-50"
                            )}
                        >
                            <span className="inline-flex items-center justify-center gap-2">
                                {saving && <Spinner />}
                                {editing
                                    ? saving
                                        ? "Guardando..."
                                        : "Guardar cambios"
                                    : saving
                                        ? "Creando..."
                                        : "Crear"}
                            </span>
                        </button>
                    </div>
                </div>

                {saving && (
                    <div
                        className="absolute inset-0 bg-white/30 backdrop-blur-[1px]"
                        aria-hidden="true"
                    />
                )}
            </div>
        </div>
    );
}