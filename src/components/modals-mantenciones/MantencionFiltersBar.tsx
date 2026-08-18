// src/components/modal-mantenciones/MantencionFiltersBar.tsx

import React from "react";

import {
    ClearOutlined,
    CloseCircleFilled,
    LoadingOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
} from "@ant-design/icons";

import {
    BuildingOfficeIcon,
    CalendarIcon,
    ChevronDownIcon,
    UserIcon,
} from "@heroicons/react/24/outline";

import type {
    FiltersResp,
    MantencionStatus,
} from "../../lib/mantencionesRemotasApi";

import {
    DatePicker,
} from "antd";

import dayjs from "dayjs";

import type {
    Dayjs,
} from "dayjs";

import "dayjs/locale/es";

dayjs.locale("es");

const {
    RangePicker,
} = DatePicker;

/* =========================================================
   HELPERS
========================================================= */

function clsx(
    ...xs: Array<
        string |
        false |
        null |
        undefined
    >
) {
    return xs
        .filter(Boolean)
        .join(" ");
}

/* =========================================================
   TYPES
========================================================= */

type IdOrEmpty =
    number | "";

type LoadState =
    | "idle"
    | "loading"
    | "error";

type Props = {
    q:
    string;

    setQ:
    React.Dispatch<
        React.SetStateAction<string>
    >;

    tecnicoId:
    IdOrEmpty;

    setTecnicoId:
    React.Dispatch<
        React.SetStateAction<IdOrEmpty>
    >;

    empresaId:
    IdOrEmpty;

    setEmpresaId:
    React.Dispatch<
        React.SetStateAction<IdOrEmpty>
    >;

    status:
    MantencionStatus |
    "";

    setStatus:
    React.Dispatch<
        React.SetStateAction<
            MantencionStatus |
            ""
        >
    >;

    fromDate:
    string;

    setFromDate:
    React.Dispatch<
        React.SetStateAction<string>
    >;

    toDate:
    string;

    setToDate:
    React.Dispatch<
        React.SetStateAction<string>
    >;

    filters:
    FiltersResp |
    null;

    isCliente:
    boolean;

    STATUS:
    MantencionStatus[];

    parseNumberOrEmpty: (
        value: string
    ) => IdOrEmpty;

    parseStatusOrEmpty: (
        value: string
    ) =>
        MantencionStatus |
        "";

    clearAll:
    () => void;

    onReload:
    () => void;

    onOpenCreate:
    () => void;

    setPage:
    React.Dispatch<
        React.SetStateAction<number>
    >;

    /*
     * Igual que EquiposPage:
     * muestra cantidad de resultados en el encabezado.
     */
    total:
    number;

    state:
    LoadState;
};

/* =========================================================
   CONSTANTES
========================================================= */

const DATE_RANGE_PRESETS: {
    label: string;
    value: [
        Dayjs,
        Dayjs
    ];
}[] = [
        {
            label:
                "Hoy",

            value: [
                dayjs()
                    .startOf(
                        "day"
                    ),

                dayjs()
                    .endOf(
                        "day"
                    ),
            ],
        },

        {
            label:
                "Este mes",

            value: [
                dayjs()
                    .startOf(
                        "month"
                    ),

                dayjs()
                    .endOf(
                        "month"
                    ),
            ],
        },

        {
            label:
                "Mes anterior",

            value: [
                dayjs()
                    .subtract(
                        1,
                        "month"
                    )
                    .startOf(
                        "month"
                    ),

                dayjs()
                    .subtract(
                        1,
                        "month"
                    )
                    .endOf(
                        "month"
                    ),
            ],
        },

        {
            label:
                "Últimos 3 meses",

            value: [
                dayjs()
                    .subtract(
                        2,
                        "month"
                    )
                    .startOf(
                        "month"
                    ),

                dayjs()
                    .endOf(
                        "day"
                    ),
            ],
        },

        {
            label:
                "Últimos 6 meses",

            value: [
                dayjs()
                    .subtract(
                        5,
                        "month"
                    )
                    .startOf(
                        "month"
                    ),

                dayjs()
                    .endOf(
                        "day"
                    ),
            ],
        },

        {
            label:
                "Este año",

            value: [
                dayjs()
                    .startOf(
                        "year"
                    ),

                dayjs()
                    .endOf(
                        "day"
                    ),
            ],
        },
    ];

function getStatusLabel(
    status:
        MantencionStatus
) {
    switch (
    status
    ) {
        case "EN_CURSO":
            return "En curso";

        case "COMPLETADA":
            return "Completada";

        default:
            return status;
    }
}

/* =========================================================
   COMPONENT
========================================================= */

export default function MantencionFiltersBar({
    q,
    setQ,

    tecnicoId,
    setTecnicoId,

    empresaId,
    setEmpresaId,

    status,
    setStatus,

    fromDate,
    setFromDate,

    toDate,
    setToDate,

    filters,
    isCliente,

    STATUS,

    parseNumberOrEmpty,
    parseStatusOrEmpty,

    clearAll,
    onReload,
    onOpenCreate,

    setPage,

    total,
    state,
}: Props) {

    const tecnicoSeleccionado =
        tecnicoId !== ""
            ? filters
                ?.tecnicos
                ?.find(
                    (
                        tecnico
                    ) =>
                        tecnico.id ===
                        Number(
                            tecnicoId
                        )
                )
            : null;

    const empresaSeleccionada =
        empresaId !== ""
            ? filters
                ?.empresas
                ?.find(
                    (
                        empresa
                    ) =>
                        empresa.id ===
                        Number(
                            empresaId
                        )
                )
            : null;

    const hasFilters =
        q.trim() !== "" ||
        tecnicoId !== "" ||
        (
            !isCliente &&
            empresaId !== ""
        ) ||
        status !== "" ||
        fromDate !== "" ||
        toDate !== "";

    return (
        <div className="mx-auto mt-6 w-full max-w-7xl px-3 sm:px-4 md:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-2xl border border-cyan-200 bg-white/80 shadow-sm backdrop-blur-xl sm:rounded-3xl">
                {/* =====================================================
                    DECORACIÓN DE FONDO
                ===================================================== */}

                <div className="pointer-events-none absolute inset-0 opacity-60 bg-[conic-gradient(from_180deg_at_50%_50%,rgba(14,165,233,0.06),transparent_30%,rgba(99,102,241,0.06),transparent_60%,rgba(236,72,153,0.06),transparent_90%)]" />

                <div className="relative p-4 sm:p-6 md:p-8">
                    {/* =====================================================
                        TÍTULO + TOTAL
                    ===================================================== */}

                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
                                Mantenciones{" "}
                                <span className="bg-gradient-to-r from-cyan-600 to-indigo-600 bg-clip-text text-transparent">
                                    Remotas
                                </span>
                            </h1>

                            <p className="text-xs text-slate-600 sm:text-sm">
                                Consulta y administra las mantenciones remotas registradas por empresa, técnico y período.
                            </p>
                        </div>

                        {/* Igual que en EquiposPage */}
                        <div className="text-sm text-slate-600 md:shrink-0">
                            {state ===
                                "loading" ? (
                                <span className="inline-flex items-center gap-2">
                                    <LoadingOutlined />

                                    Cargando…
                                </span>
                            ) : (
                                `${total.toLocaleString(
                                    "es-CL"
                                )} resultado(s)`
                            )}
                        </div>
                    </div>

                    {/* =====================================================
                        FILA PRINCIPAL:
                        BÚSQUEDA + BOTONES
                    ===================================================== */}

                    <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-12">
                        {/* Búsqueda */}

                        <div className="relative min-w-0 lg:col-span-6 xl:col-span-7">
                            <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600/70" />

                            <input
                                value={
                                    q
                                }
                                onChange={(
                                    event
                                ) => {
                                    setQ(
                                        event
                                            .target
                                            .value
                                    );

                                    setPage(
                                        1
                                    );
                                }}
                                placeholder="solicitante, empresa, técnico, otros…"
                                className="w-full rounded-2xl border border-cyan-200/70 bg-white/90 py-2.5 pl-9 pr-10 text-sm text-slate-900 placeholder-slate-400 transition focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                            />

                            {q.length >
                                0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setQ(
                                                ""
                                            );

                                            setPage(
                                                1
                                            );
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-700/80 hover:text-cyan-900"
                                        aria-label="Limpiar búsqueda"
                                        title="Limpiar búsqueda"
                                    >
                                        <CloseCircleFilled />
                                    </button>
                                )}
                        </div>

                        {/* Acciones */}

                        <div className="min-w-0 lg:col-span-6 xl:col-span-5">
                            <div
                                className={clsx(
                                    "grid justify-end gap-2",
                                    isCliente
                                        ? "grid-cols-2"
                                        : "grid-cols-1 sm:grid-cols-3"
                                )}
                            >
                                <button
                                    type="button"
                                    onClick={
                                        clearAll
                                    }
                                    disabled={
                                        !hasFilters
                                    }
                                    className={clsx(
                                        "inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm text-cyan-800 transition hover:bg-cyan-50",

                                        !hasFilters &&
                                        "cursor-not-allowed opacity-50"
                                    )}
                                >
                                    <ClearOutlined />

                                    Limpiar
                                </button>

                                <button
                                    type="button"
                                    onClick={
                                        onReload
                                    }
                                    disabled={
                                        state ===
                                        "loading"
                                    }
                                    className={clsx(
                                        "inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm text-cyan-800 transition hover:bg-cyan-50",

                                        state ===
                                        "loading" &&
                                        "cursor-not-allowed opacity-50"
                                    )}
                                >
                                    <ReloadOutlined />

                                    <span>
                                        Recargar
                                    </span>
                                </button>

                                {!isCliente && (
                                    <button
                                        type="button"
                                        onClick={
                                            onOpenCreate
                                        }
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-600 px-3 py-2.5 text-sm font-medium text-white shadow-[0_6px_18px_-6px_rgba(37,99,235,0.45)] transition hover:brightness-110"
                                    >
                                        <PlusOutlined />

                                        Nueva
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* =================================================
                            FILTROS PRINCIPALES
                        ================================================= */}

                        <div className="lg:col-span-12">
                            <div
                                className={clsx(
                                    "grid grid-cols-1 gap-4",
                                    isCliente
                                        ? "md:grid-cols-2 xl:grid-cols-4"
                                        : "md:grid-cols-2 xl:grid-cols-5"
                                )}
                            >
                                {/* Empresa */}

                                {!isCliente && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <BuildingOfficeIcon className="h-4 w-4 text-cyan-600" />

                                            <label className="text-sm font-medium text-slate-700">
                                                Empresa
                                            </label>
                                        </div>

                                        <div className="relative">
                                            <select
                                                value={
                                                    empresaId
                                                }
                                                onChange={(
                                                    event
                                                ) => {
                                                    setEmpresaId(
                                                        parseNumberOrEmpty(
                                                            event
                                                                .target
                                                                .value
                                                        )
                                                    );

                                                    setPage(
                                                        1
                                                    );
                                                }}
                                                className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pl-10 pr-8 text-sm text-slate-900 shadow-sm transition-all duration-200 hover:border-cyan-300 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                                            >
                                                <option value="">
                                                    Todas las empresas
                                                </option>

                                                {filters
                                                    ?.empresas
                                                    ?.map(
                                                        (
                                                            empresa
                                                        ) => (
                                                            <option
                                                                key={
                                                                    empresa.id
                                                                }
                                                                value={
                                                                    empresa.id
                                                                }
                                                            >
                                                                {
                                                                    empresa.nombre
                                                                }
                                                            </option>
                                                        )
                                                    )}
                                            </select>

                                            <BuildingOfficeIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                                            <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                        </div>
                                    </div>
                                )}

                                {/* Técnico */}

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <UserIcon className="h-4 w-4 text-indigo-500" />

                                        <label className="text-sm font-medium text-slate-700">
                                            Técnico
                                        </label>
                                    </div>

                                    <div className="relative">
                                        <select
                                            value={
                                                tecnicoId
                                            }
                                            onChange={(
                                                event
                                            ) => {
                                                setTecnicoId(
                                                    parseNumberOrEmpty(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                );

                                                setPage(
                                                    1
                                                );
                                            }}
                                            className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pl-10 pr-8 text-sm text-slate-900 shadow-sm transition-all duration-200 hover:border-indigo-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        >
                                            <option value="">
                                                Todos los técnicos
                                            </option>

                                            {filters
                                                ?.tecnicos
                                                ?.map(
                                                    (
                                                        tecnico
                                                    ) => (
                                                        <option
                                                            key={
                                                                tecnico.id
                                                            }
                                                            value={
                                                                tecnico.id
                                                            }
                                                        >
                                                            {
                                                                tecnico.nombre
                                                            }
                                                        </option>
                                                    )
                                                )}
                                        </select>

                                        <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                                        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    </div>
                                </div>

                                {/* Estado */}

                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-slate-700">
                                        Estado
                                    </label>

                                    <div className="relative">
                                        <select
                                            value={
                                                status
                                            }
                                            onChange={(
                                                event
                                            ) => {
                                                setStatus(
                                                    parseStatusOrEmpty(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                );

                                                setPage(
                                                    1
                                                );
                                            }}
                                            className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pr-8 text-sm text-slate-900 shadow-sm transition-all duration-200 hover:border-cyan-300 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                                        >
                                            <option value="">
                                                Todos los estados
                                            </option>

                                            {STATUS.map(
                                                (
                                                    item
                                                ) => (
                                                    <option
                                                        key={
                                                            item
                                                        }
                                                        value={
                                                            item
                                                        }
                                                    >
                                                        {getStatusLabel(
                                                            item
                                                        )}
                                                    </option>
                                                )
                                            )}
                                        </select>

                                        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                    </div>
                                </div>

                                {/* =========================================
    PERÍODO
========================================= */}

                                <div
                                    className={
                                        isCliente
                                            ? "md:col-span-2 xl:col-span-2"
                                            : "md:col-span-2 xl:col-span-2"
                                    }
                                >
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <CalendarIcon className="h-4 w-4 text-cyan-600" />

                                            <label className="text-sm font-medium text-slate-700">
                                                Período
                                            </label>
                                        </div>

                                        <RangePicker
                                            value={[
                                                fromDate
                                                    ? dayjs(fromDate)
                                                    : null,

                                                toDate
                                                    ? dayjs(toDate)
                                                    : null,
                                            ]}
                                            onChange={(dates) => {
                                                setFromDate(
                                                    dates?.[0]
                                                        ? dates[0]
                                                            .startOf("day")
                                                            .toISOString()
                                                        : ""
                                                );

                                                setToDate(
                                                    dates?.[1]
                                                        ? dates[1]
                                                            .endOf("day")
                                                            .toISOString()
                                                        : ""
                                                );

                                                setPage(1);
                                            }}
                                            presets={DATE_RANGE_PRESETS}
                                            format="DD/MM/YYYY"
                                            allowClear
                                            placeholder={[
                                                "Desde",
                                                "Hasta",
                                            ]}
                                            className="
        w-full
        !h-[43px]
        !rounded-xl
        !border-slate-200
        hover:!border-cyan-300
        focus-within:!border-cyan-500
        focus-within:!shadow-[0_0_0_2px_rgba(6,182,212,0.15)]
    "
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* =====================================================
                        CHIPS DE FILTROS ACTIVOS
                    ===================================================== */}

                    <div className="mt-4 flex min-w-0 flex-wrap items-center gap-2">
                        {q.trim() && (
                            <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs text-cyan-900">
                                <span className="shrink-0">
                                    Búsqueda:
                                </span>

                                <strong className="max-w-[260px] truncate">
                                    {q.trim()}
                                </strong>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setQ(
                                            ""
                                        );

                                        setPage(
                                            1
                                        );
                                    }}
                                    className="shrink-0 hover:text-cyan-700"
                                >
                                    <CloseCircleFilled />
                                </button>
                            </span>
                        )}

                        {!isCliente &&
                            empresaId !==
                            "" && (
                                <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs text-cyan-900">
                                    <span className="shrink-0">
                                        Empresa:
                                    </span>

                                    <strong className="truncate">
                                        {empresaSeleccionada
                                            ?.nombre ??
                                            empresaId}
                                    </strong>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEmpresaId(
                                                ""
                                            );

                                            setPage(
                                                1
                                            );
                                        }}
                                        className="shrink-0 hover:text-cyan-700"
                                    >
                                        <CloseCircleFilled />
                                    </button>
                                </span>
                            )}

                        {tecnicoId !==
                            "" && (
                                <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs text-indigo-900">
                                    <span className="shrink-0">
                                        Técnico:
                                    </span>

                                    <strong className="truncate">
                                        {tecnicoSeleccionado
                                            ?.nombre ??
                                            tecnicoId}
                                    </strong>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setTecnicoId(
                                                ""
                                            );

                                            setPage(
                                                1
                                            );
                                        }}
                                        className="shrink-0 hover:text-indigo-700"
                                    >
                                        <CloseCircleFilled />
                                    </button>
                                </span>
                            )}

                        {status !==
                            "" && (
                                <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-900">
                                    <span className="shrink-0">
                                        Estado:
                                    </span>

                                    <strong>
                                        {getStatusLabel(
                                            status
                                        )}
                                    </strong>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setStatus(
                                                ""
                                            );

                                            setPage(
                                                1
                                            );
                                        }}
                                        className="shrink-0 hover:text-emerald-700"
                                    >
                                        <CloseCircleFilled />
                                    </button>
                                </span>
                            )}

                        {(
                            fromDate ||
                            toDate
                        ) && (
                                <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs text-cyan-900">
                                    <span className="shrink-0">
                                        Período:
                                    </span>

                                    <strong className="truncate">
                                        {fromDate
                                            ? dayjs(
                                                fromDate
                                            ).format(
                                                "DD/MM/YYYY"
                                            )
                                            : "Inicio"}

                                        {" - "}

                                        {toDate
                                            ? dayjs(
                                                toDate
                                            ).format(
                                                "DD/MM/YYYY"
                                            )
                                            : "Hoy"}
                                    </strong>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFromDate(
                                                ""
                                            );

                                            setToDate(
                                                ""
                                            );

                                            setPage(
                                                1
                                            );
                                        }}
                                        className="shrink-0 hover:text-cyan-700"
                                        aria-label="Quitar filtro de período"
                                        title="Quitar filtro de período"
                                    >
                                        <CloseCircleFilled />
                                    </button>
                                </span>
                            )}
                    </div>

                    <div className="mt-4 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent" />
                </div>
            </div>
        </div>
    );
}