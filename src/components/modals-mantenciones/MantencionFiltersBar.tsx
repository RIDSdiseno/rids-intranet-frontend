// src/components/modal-mantenciones/MantencionFiltersBar.tsx
import React from "react";
import type { FiltersResp, MantencionStatus } from "../../lib/mantencionesRemotasApi";

function clsx(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
}

type IdOrEmpty = number | "";

type Props = {
    q: string;
    setQ: React.Dispatch<React.SetStateAction<string>>;
    tecnicoId: IdOrEmpty;
    setTecnicoId: React.Dispatch<React.SetStateAction<IdOrEmpty>>;
    empresaId: IdOrEmpty;
    setEmpresaId: React.Dispatch<React.SetStateAction<IdOrEmpty>>;
    status: MantencionStatus | "";
    setStatus: React.Dispatch<React.SetStateAction<MantencionStatus | "">>;
    month: IdOrEmpty;
    setMonth: React.Dispatch<React.SetStateAction<IdOrEmpty>>;
    year: IdOrEmpty;
    setYear: React.Dispatch<React.SetStateAction<IdOrEmpty>>;
    filters: FiltersResp | null;
    isCliente: boolean;
    STATUS: MantencionStatus[];
    parseNumberOrEmpty: (v: string) => IdOrEmpty;
    parseStatusOrEmpty: (v: string) => MantencionStatus | "";
    clearAll: () => void;
    onReload: () => void;
    onOpenCreate: () => void;
    setPage: React.Dispatch<React.SetStateAction<number>>;
};

export default function MantencionFiltersBar({
    q,
    setQ,
    tecnicoId,
    setTecnicoId,
    empresaId,
    setEmpresaId,
    status,
    setStatus,
    month,
    setMonth,
    year,
    setYear,
    filters,
    isCliente,
    STATUS,
    parseNumberOrEmpty,
    parseStatusOrEmpty,
    clearAll,
    onReload,
    onOpenCreate,
    setPage,
}: Props) {
    return (
        <div className="px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6 max-w-7xl mx-auto w-full">
            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-cyan-200 bg-white/80 backdrop-blur-xl shadow-sm">
                <div className="absolute inset-0 opacity-60 bg-[conic-gradient(from_180deg_at_50%_50%,rgba(14,165,233,0.06),transparent_30%,rgba(99,102,241,0.06),transparent_60%,rgba(236,72,153,0.06),transparent_90%)]" />
                <div className="relative p-4 sm:p-6 md:p-8">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                        Mantenciones{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-indigo-600">
                            Remotas
                        </span>
                    </h1>

                    <p className="mt-1 text-xs sm:text-sm text-slate-600">
                        Filtra por técnico, empresa, mes/año o búsqueda libre. Crea, edita, cierra o elimina.
                    </p>

                    <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-4">
                            <input
                                value={q}
                                onChange={(e) => {
                                    setPage(1);
                                    setQ(e.target.value);
                                }}
                                placeholder="Buscar (solicitante, empresa, técnico, otros)…"
                                className="w-full rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400"
                            />
                        </div>

                        <div className="md:col-span-3">
                            <select
                                value={tecnicoId}
                                onChange={(e) => {
                                    setPage(1);
                                    setTecnicoId(parseNumberOrEmpty(e.target.value));
                                }}
                                className="w-full rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                            >
                                <option value="">Todos los técnicos</option>
                                {filters?.tecnicos?.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {!isCliente && (
                            <div className="md:col-span-3">
                                <select
                                    value={empresaId}
                                    onChange={(e) => {
                                        setPage(1);
                                        setEmpresaId(parseNumberOrEmpty(e.target.value));
                                    }}
                                    className="w-full rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                >
                                    <option value="">Todas las empresas</option>
                                    {filters?.empresas?.map((emp) => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.nombre}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className={clsx("md:col-span-2", isCliente && "md:col-span-3")}>
                            <select
                                value={status}
                                onChange={(e) => {
                                    setPage(1);
                                    setStatus(parseStatusOrEmpty(e.target.value));
                                }}
                                className="w-full rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                            >
                                <option value="">Estado (todos)</option>
                                {STATUS.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <input
                                value={month}
                                onChange={(e) => {
                                    setPage(1);
                                    setMonth(parseNumberOrEmpty(e.target.value));
                                }}
                                placeholder="Mes (1-12)"
                                className="w-full rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <input
                                value={year}
                                onChange={(e) => {
                                    setPage(1);
                                    setYear(parseNumberOrEmpty(e.target.value));
                                }}
                                placeholder="Año (2026)"
                                className="w-full rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                            />
                        </div>

                        <div className="md:col-span-12">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <button
                                    onClick={clearAll}
                                    type="button"
                                    className="inline-flex items-center justify-center rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm text-cyan-800 hover:bg-cyan-50 active:scale-[0.98] transition"
                                >
                                    Limpiar
                                </button>

                                <button
                                    onClick={onReload}
                                    type="button"
                                    className="inline-flex items-center justify-center rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm text-cyan-800 hover:bg-cyan-50 active:scale-[0.98] transition"
                                >
                                    Recargar
                                </button>

                                {!isCliente && (
                                    <button
                                        onClick={onOpenCreate}
                                        type="button"
                                        className="inline-flex items-center justify-center rounded-2xl px-3 py-2.5 text-sm font-medium text-white bg-gradient-to-tr from-emerald-600 to-cyan-600 shadow-[0_6px_18px_-6px_rgba(16,185,129,0.45)] hover:brightness-110 active:scale-[0.98] transition"
                                    >
                                        + Nueva
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent" />
                </div>
            </div>
        </div>
    );
}