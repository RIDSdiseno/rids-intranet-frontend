// src/components/modals-equipos/adicionales/AdicionalesPage.tsx

import React, {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    CloseCircleFilled,
    DeleteOutlined,
    EditOutlined,
    LeftOutlined,
    LoadingOutlined,
    PlusOutlined,
    ReloadOutlined,
    RightOutlined,
    SearchOutlined,
    TeamOutlined,
    EyeOutlined
} from "@ant-design/icons";

import {
    BuildingOfficeIcon,
    ChevronDownIcon,
} from "@heroicons/react/24/outline";

import { http } from "../../../service/http";
import { useAuth } from "../../hooks/useAuth";

import type {
    AdicionalRow,
    EstadoAdicional,
    OrigenAdicional,
} from "./adicionales.types";

import CrearAdicionalModal from "./CrearAdicionalModal";
import EditarAdicionalModal from "./EditarAdicionalModal";
import AdicionalViewModal from "./AdicionalViewModal";

/* =========================================================
   CONFIG
========================================================= */

const DEFAULT_PAGE_SIZE = 10;

/* =========================================================
   TIPOS
========================================================= */

type ApiList<T> = {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    items: T[];
};

type EmpresaOption = {
    id: number;
    nombre: string;
};

/* =========================================================
   HELPERS GENERALES
========================================================= */

function useDebouncedValue<T>(
    value: T,
    delay = 400
): T {
    const [
        debounced,
        setDebounced,
    ] = useState(value);

    useEffect(() => {
        const timer =
            window.setTimeout(
                () =>
                    setDebounced(value),
                delay
            );

        return () =>
            window.clearTimeout(
                timer
            );
    }, [
        value,
        delay,
    ]);

    return debounced;
}

function clsx(
    ...classes: Array<
        string |
        false |
        null |
        undefined
    >
) {
    return classes
        .filter(Boolean)
        .join(" ");
}

function strHash(
    value: string
) {
    let hash = 0;

    for (
        let i = 0;
        i < value.length;
        i += 1
    ) {
        hash =
            (
                hash * 31 +
                value.charCodeAt(i)
            ) | 0;
    }

    return Math.abs(hash);
}

/* =========================================================
   DESCRIPCIÓN / SERIAL
========================================================= */

function limpiarDescripcionAdicional(
    descripcion?: string | null
): string {
    const text =
        String(
            descripcion ?? ""
        ).trim();

    if (!text) {
        return "—";
    }

    return (
        text
            .replace(
                /^\[AGENTE\]\s*/i,
                ""
            )
            .trim() ||
        "—"
    );
}

function mostrarSerialAdicional(
    serial?: string | null
): string {
    const value =
        String(
            serial ?? ""
        ).trim();

    if (!value) {
        return "—";
    }

    /*
     * Seriales históricos falsos
     * reportados por algunos monitores.
     */
    if (
        value === "0" ||
        value === "1"
    ) {
        return "—";
    }

    return value;
}

/* =========================================================
   ESTADO
========================================================= */

function getEstadoAdicionalLabel(
    estado?: EstadoAdicional | null
): string {
    switch (estado) {
        case "ASIGNADO":
            return "Asignado";

        case "EN_STOCK":
            return "En stock";

        case "EN_REPARACION":
            return "En reparación";

        case "DADO_DE_BAJA":
            return "Dado de baja";

        default:
            return "Sin estado";
    }
}

function getEstadoAdicionalClass(
    estado?: EstadoAdicional | null
): string {
    switch (estado) {
        case "ASIGNADO":
            return (
                "border-emerald-200 " +
                "bg-emerald-50 " +
                "text-emerald-700"
            );

        case "EN_STOCK":
            return (
                "border-cyan-200 " +
                "bg-cyan-50 " +
                "text-cyan-700"
            );

        case "EN_REPARACION":
            return (
                "border-amber-200 " +
                "bg-amber-50 " +
                "text-amber-700"
            );

        case "DADO_DE_BAJA":
            return (
                "border-rose-200 " +
                "bg-rose-50 " +
                "text-rose-700"
            );

        default:
            return (
                "border-slate-200 " +
                "bg-slate-50 " +
                "text-slate-600"
            );
    }
}

/* =========================================================
   ORIGEN
========================================================= */

function getOrigenClass(
    origen?: OrigenAdicional | null
): string {
    if (
        origen === "AGENTE"
    ) {
        return (
            "border-cyan-200 " +
            "bg-cyan-50 " +
            "text-cyan-800"
        );
    }

    return (
        "border-indigo-200 " +
        "bg-indigo-50 " +
        "text-indigo-800"
    );
}

function getOrigenLabel(
    origen?: OrigenAdicional | null
): string {
    return origen === "AGENTE"
        ? "Agente"
        : "Manual";
}

/* =========================================================
   COLORES POR EMPRESA
========================================================= */

const COMPANY_TAG_PALETTE = [
    "border-emerald-200 bg-emerald-50 text-emerald-900",
    "border-teal-200 bg-teal-50 text-teal-900",
    "border-cyan-200 bg-cyan-50 text-cyan-900",
    "border-sky-200 bg-sky-50 text-sky-900",
    "border-blue-200 bg-blue-50 text-blue-900",
    "border-indigo-200 bg-indigo-50 text-indigo-900",
    "border-violet-200 bg-violet-50 text-violet-900",
    "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900",
    "border-rose-200 bg-rose-50 text-rose-900",
    "border-amber-200 bg-amber-50 text-amber-900",
    "border-lime-200 bg-lime-50 text-lime-900",
    "border-green-200 bg-green-50 text-green-900",
];

function companyTagClasses(
    empresaName?: string | null
) {
    if (!empresaName) {
        return (
            "border-neutral-200 " +
            "bg-neutral-50 " +
            "text-neutral-700"
        );
    }

    const index =
        strHash(
            empresaName
        ) %
        COMPANY_TAG_PALETTE.length;

    return (
        COMPANY_TAG_PALETTE[
        index
        ]
    );
}

function companyRowTheme(
    empresa?: string | null
): {
    bg: string;
    borderLeft: string;
} {
    const value =
        String(
            empresa ?? ""
        )
            .trim()
            .toLowerCase();

    const palette = [
        {
            bg: "bg-cyan-50/50",
            borderLeft:
                "border-cyan-400",
        },
        {
            bg: "bg-sky-50/50",
            borderLeft:
                "border-sky-400",
        },
        {
            bg: "bg-indigo-50/50",
            borderLeft:
                "border-indigo-400",
        },
        {
            bg: "bg-rose-50/50",
            borderLeft:
                "border-rose-400",
        },
        {
            bg: "bg-amber-50/50",
            borderLeft:
                "border-amber-400",
        },
        {
            bg: "bg-lime-50/50",
            borderLeft:
                "border-lime-400",
        },
        {
            bg: "bg-teal-50/50",
            borderLeft:
                "border-teal-400",
        },
        {
            bg: "bg-fuchsia-50/50",
            borderLeft:
                "border-fuchsia-400",
        },
        {
            bg: "bg-emerald-50/50",
            borderLeft:
                "border-emerald-400",
        },
        {
            bg: "bg-blue-50/50",
            borderLeft:
                "border-blue-400",
        },
    ];

    const index =
        strHash(
            value ||
            "empresa"
        ) %
        palette.length;

    return palette[index];
}

/* =========================================================
   COMPONENTE
========================================================= */

const AdicionalesPage:
    React.FC = () => {

        const {
            user,
            isCliente,
        } = useAuth();

        /* =======================================================
           BÚSQUEDA
        ======================================================= */

        const [
            search,
            setSearch,
        ] = useState("");

        const searchDebounced =
            useDebouncedValue(
                search,
                450
            );

        /* =======================================================
           FILTROS
        ======================================================= */

        const [
            tipo,
            setTipo,
        ] = useState("");

        const [
            origen,
            setOrigen,
        ] =
            useState<
                OrigenAdicional | ""
            >("");

        const [
            estado,
            setEstado,
        ] =
            useState<
                EstadoAdicional | ""
            >("");

        const [
            empresaOptions,
            setEmpresaOptions,
        ] =
            useState<
                EmpresaOption[]
            >([]);

        const [
            empresaFilterId,
            setEmpresaFilterId,
        ] =
            useState<number | null>(
                () => {
                    if (
                        isCliente &&
                        user?.empresaId
                    ) {
                        return Number(
                            user.empresaId
                        );
                    }

                    return null;
                }
            );

        const [
            empresasLoading,
            setEmpresasLoading,
        ] =
            useState(false);

        const [
            empresasError,
            setEmpresasError,
        ] =
            useState<
                string | null
            >(null);

        const empresaFilterName =
            useMemo(
                () =>
                    empresaOptions.find(
                        (empresa) =>
                            empresa.id ===
                            empresaFilterId
                    )?.nombre ??
                    "",
                [
                    empresaFilterId,
                    empresaOptions,
                ]
            );

        /* =======================================================
           LISTADO / PAGINACIÓN
        ======================================================= */

        const [
            page,
            setPage,
        ] = useState(1);

        const [
            pageSize,
            setPageSize,
        ] =
            useState(
                DEFAULT_PAGE_SIZE
            );

        const [
            data,
            setData,
        ] =
            useState<
                ApiList<AdicionalRow> | null
            >(null);

        const [
            loading,
            setLoading,
        ] = useState(false);

        const [
            error,
            setError,
        ] =
            useState<
                string | null
            >(null);

        const reqSeqRef =
            useRef(0);

        const canPrev =
            page > 1;

        const totalPages =
            data?.totalPages ??
            1;

        const canNext =
            page <
            totalPages;

        const showingRange =
            useMemo(
                () => {
                    const size =
                        data?.pageSize ??
                        pageSize;

                    if (
                        !data ||
                        data.total === 0
                    ) {
                        return null;
                    }

                    const start =
                        (
                            data.page -
                            1
                        ) *
                        size +
                        1;

                    const end =
                        Math.min(
                            data.page *
                            size,
                            data.total
                        );

                    return {
                        start,
                        end,
                    };
                },
                [
                    data,
                    pageSize,
                ]
            );

        /* =======================================================
           CARGAR ADICIONALES
        ======================================================= */

        async function fetchList(
            signal?: AbortSignal
        ) {
            const seq =
                ++reqSeqRef.current;

            try {
                setLoading(true);
                setError(null);

                const res =
                    await http.get(
                        "/equipos-adicionales",
                        {
                            signal,

                            params: {
                                page,
                                pageSize,

                                search:
                                    searchDebounced ||
                                    undefined,

                                empresaId:
                                    empresaFilterId ||
                                    undefined,

                                tipo:
                                    tipo ||
                                    undefined,

                                origen:
                                    origen ||
                                    undefined,

                                estado:
                                    estado ||
                                    undefined,

                                /*
                                 * Orden global del listado.
                                 */
                                sortBy:
                                    "empresa",

                                sortDir:
                                    "asc",

                                _ts:
                                    Date.now(),
                            },
                        }
                    );

                if (
                    seq !==
                    reqSeqRef.current
                ) {
                    return;
                }

                setData(
                    res.data
                );
            } catch (
            err: unknown
            ) {
                const code =
                    (
                        err as {
                            code?: string;
                        }
                    ).code;

                if (
                    code ===
                    "ERR_CANCELED" ||
                    (
                        err as Error
                    ).name ===
                    "AbortError"
                ) {
                    return;
                }

                const message =
                    (
                        err as any
                    )?.response?.data
                        ?.error ||
                    (
                        err instanceof
                            Error
                            ? err.message
                            : null
                    ) ||
                    "No se pudieron cargar los adicionales";

                setError(
                    message
                );
            } finally {
                if (
                    seq ===
                    reqSeqRef.current
                ) {
                    setLoading(
                        false
                    );
                }
            }
        }

        /* =======================================================
           EMPRESAS
        ======================================================= */

        async function fetchEmpresas(
            signal?: AbortSignal
        ) {
            try {
                setEmpresasLoading(
                    true
                );

                setEmpresasError(
                    null
                );

                const res =
                    await http.get(
                        "/empresas",
                        {
                            signal,
                        }
                    );

                const raw =
                    res.data;

                const list:
                    Array<{
                        id_empresa: number;
                        nombre: string;
                    }> =
                    Array.isArray(raw)
                        ? raw
                        : (
                            raw?.data ??
                            []
                        );

                const options =
                    list
                        .map(
                            (
                                empresa
                            ) => ({
                                id:
                                    empresa.id_empresa,

                                nombre:
                                    empresa.nombre,
                            })
                        )
                        .sort(
                            (
                                a,
                                b
                            ) =>
                                a.nombre.localeCompare(
                                    b.nombre,
                                    "es"
                                )
                        );

                setEmpresaOptions(
                    options
                );
            } catch (
            err: unknown
            ) {
                const code =
                    (
                        err as {
                            code?: string;
                        }
                    ).code;

                if (
                    code ===
                    "ERR_CANCELED" ||
                    (
                        err as Error
                    ).name ===
                    "AbortError"
                ) {
                    return;
                }

                setEmpresaOptions(
                    []
                );

                setEmpresasError(
                    (
                        err as Error
                    )?.message ||
                    "No se pudieron cargar las empresas"
                );
            } finally {
                setEmpresasLoading(
                    false
                );
            }
        }

        /* =======================================================
           EFFECTS
        ======================================================= */

        useEffect(() => {
            const controller =
                new AbortController();

            void fetchList(
                controller.signal
            );

            return () =>
                controller.abort();

            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [
            page,
            pageSize,
            searchDebounced,
            empresaFilterId,
            tipo,
            origen,
            estado,
        ]);

        useEffect(() => {
            const controller =
                new AbortController();

            void fetchEmpresas(
                controller.signal
            );

            return () =>
                controller.abort();
        }, []);

        /* =======================================================
   MODAL CREAR
======================================================= */

        const [
            createOpen,
            setCreateOpen,
        ] = useState(false);

        /* =======================================================
           MODAL VISUALIZAR
        ======================================================= */

        const [
            viewOpen,
            setViewOpen,
        ] = useState(false);

        const [
            viewRow,
            setViewRow,
        ] =
            useState<
                AdicionalRow | null
            >(null);

        /* =======================================================
           MODAL EDITAR
        ======================================================= */

        const [
            editOpen,
            setEditOpen,
        ] = useState(false);

        const [
            editRow,
            setEditRow,
        ] =
            useState<
                AdicionalRow | null
            >(null);

        /* =======================================================
           HANDLERS
        ======================================================= */

        async function reload() {
            const controller =
                new AbortController();

            await fetchList(
                controller.signal
            );
        }

        function clearAll() {
            setSearch("");
            setTipo("");
            setOrigen("");
            setEstado("");

            if (!isCliente) {
                setEmpresaFilterId(
                    null
                );
            }

            setPage(1);
        }

        function goPrev() {
            if (!canPrev) {
                return;
            }

            setPage(
                (
                    current
                ) =>
                    current - 1
            );
        }

        function goNext() {
            if (!canNext) {
                return;
            }

            setPage(
                (
                    current
                ) =>
                    current + 1
            );
        }

        function onChangePageSize(
            value: number
        ) {
            if (
                value ===
                pageSize
            ) {
                return;
            }

            setPageSize(
                value
            );

            setPage(1);
        }

        /* =======================================================
   CREAR
======================================================= */

        function startCreate() {
            setCreateOpen(true);
        }

        function closeCreate() {
            setCreateOpen(false);
        }

        async function handleCreated() {
            setCreateOpen(false);

            /*
             * Como el listado está ordenado
             * por empresa, volvemos a página 1.
             */
            setPage(1);

            await reload();
        }

        /* =======================================================
           VISUALIZAR
        ======================================================= */

        function startView(
            row: AdicionalRow
        ) {
            setViewRow(row);
            setViewOpen(true);
        }

        function closeView() {
            setViewOpen(false);
            setViewRow(null);
        }

        /* =======================================================
           EDITAR
        ======================================================= */

        function startEdit(
            row: AdicionalRow
        ) {
            setEditRow(row);
            setEditOpen(true);
        }

        function closeEdit() {
            setEditOpen(false);
            setEditRow(null);
        }

        async function handleSaved() {
            closeEdit();

            await reload();
        }

        async function eliminar(
            row: AdicionalRow
        ) {
            const confirmed =
                window.confirm(
                    `¿Eliminar adicional #${row.id}?`
                );

            if (!confirmed) {
                return;
            }

            try {
                await http.delete(
                    `/equipos-adicionales/${row.id}`
                );

                /*
                 * Si era el último
                 * elemento de la página,
                 * retrocedemos.
                 */
                if (
                    data &&
                    data.items.length ===
                    1 &&
                    page > 1
                ) {
                    setPage(
                        (
                            current
                        ) =>
                            current - 1
                    );

                    return;
                }

                await reload();
            } catch (
            err: unknown
            ) {
                const message =
                    (
                        err as any
                    )?.response?.data
                        ?.error ||
                    (
                        err instanceof
                            Error
                            ? err.message
                            : null
                    ) ||
                    "No se pudo eliminar el adicional";

                setError(
                    message
                );
            }
        }

        const rows =
            data?.items ?? [];

        /* =======================================================
           RENDER
        ======================================================= */

        return (
            <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-white to-cyan-50 pb-24">

                {/* ===================================================
          FONDO
      =================================================== */}
                <div className="pointer-events-none absolute inset-0 -z-10">
                    <div className="absolute inset-0 [background:radial-gradient(circle_at_1px_1px,rgba(14,165,233,0.08)_1px,transparent_0)_0_0/22px_22px]" />

                    <div className="absolute -left-32 -top-32 aspect-square w-[60vw] max-w-[520px] rounded-full bg-gradient-to-br from-cyan-200 to-indigo-200 opacity-40 blur-3xl" />

                    <div className="absolute -bottom-40 -right-40 aspect-square w-[65vw] max-w-[560px] rounded-full bg-gradient-to-tr from-fuchsia-200 to-cyan-200 opacity-40 blur-3xl" />
                </div>

                {/* ===================================================
          HERO / TOOLBAR
      =================================================== */}
                <div className="mx-auto mt-6 max-w-[1800px] px-4 sm:px-6 lg:px-8">
                    <div className="relative overflow-hidden rounded-2xl border border-cyan-200 bg-white/80 shadow-sm backdrop-blur-xl sm:rounded-3xl">

                        <div className="pointer-events-none absolute inset-0 bg-[conic-gradient(from_180deg_at_50%_50%,rgba(14,165,233,0.06),transparent_30%,rgba(99,102,241,0.06),transparent_60%,rgba(236,72,153,0.06),transparent_90%)] opacity-60" />

                        <div className="relative p-4 sm:p-6 md:p-8">

                            {/* CABECERA */}
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

                                <div className="min-w-0">
                                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl md:text-4xl">
                                        Adicionales{" "}
                                        <span className="bg-gradient-to-r from-cyan-600 to-indigo-600 bg-clip-text text-transparent">
                                            RIDS.CL
                                        </span>
                                    </h1>

                                    <p className="text-xs text-slate-600 sm:text-sm">
                                        Inventario de adicionales vinculados a los equipos.
                                    </p>
                                </div>

                                <div className="text-sm text-slate-600 md:shrink-0">
                                    {loading ? (
                                        <span className="inline-flex items-center gap-2">
                                            <LoadingOutlined />
                                            Cargando…
                                        </span>
                                    ) : (
                                        `${(
                                            data?.total ??
                                            0
                                        ).toLocaleString()} resultado(s)`
                                    )}
                                </div>
                            </div>

                            {/* =================================================
                TOOLBAR SUPERIOR
            ================================================= */}
                            <div className="mt-5 grid grid-cols-1 gap-2 sm:gap-3 md:grid-cols-12">

                                {/* BÚSQUEDA */}
                                <div className="relative min-w-0 md:col-span-5">
                                    <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600/70" />

                                    <input
                                        value={
                                            search
                                        }
                                        onChange={(
                                            e
                                        ) => {
                                            setSearch(
                                                e.target.value
                                            );

                                            setPage(1);
                                        }}
                                        placeholder="serial, tipo, descripción, equipo, solicitante, empresa…"
                                        className="w-full rounded-2xl border border-cyan-200/70 bg-white/90 py-2.5 pl-9 pr-10 text-sm text-slate-900 placeholder-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                    />

                                    {search.length >
                                        0 && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSearch("");
                                                    setPage(1);
                                                }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-700/80 hover:text-cyan-900"
                                                aria-label="Limpiar búsqueda"
                                                title="Limpiar búsqueda"
                                            >
                                                <CloseCircleFilled />
                                            </button>
                                        )}
                                </div>

                                {/* BOTONES */}
                                <div className="min-w-0 md:col-span-7">
                                    <div className="grid grid-cols-2 justify-end gap-2 sm:grid-cols-3">

                                        {!isCliente && (
                                            <button
                                                type="button"
                                                onClick={
                                                    startCreate
                                                }
                                                className={clsx(
                                                    "col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium text-white sm:col-span-1",
                                                    "bg-gradient-to-tr from-indigo-600 to-cyan-600",
                                                    "shadow-[0_6px_18px_-6px_rgba(37,99,235,0.45)]",
                                                    "hover:brightness-110"
                                                )}
                                                title="Crear nuevo adicional"
                                            >
                                                <PlusOutlined />
                                                <span>
                                                    Nuevo
                                                </span>
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={
                                                clearAll
                                            }
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm text-cyan-800 hover:bg-cyan-50"
                                        >
                                            Limpiar
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                void reload()
                                            }
                                            disabled={
                                                loading
                                            }
                                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm text-cyan-800 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <ReloadOutlined />

                                            <span className="hidden sm:inline">
                                                Recargar
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {/* =================================================
                  FILTRO EMPRESA
              ================================================= */}
                                <div className="md:col-span-12">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <BuildingOfficeIcon className="h-4 w-4 text-cyan-600" />

                                                <label className="block text-sm font-medium text-slate-700">
                                                    Filtrar por empresa
                                                </label>
                                            </div>

                                            <div className="relative">
                                                <select
                                                    value={
                                                        empresaFilterId ??
                                                        ""
                                                    }
                                                    onChange={(
                                                        e
                                                    ) => {
                                                        if (
                                                            isCliente
                                                        ) {
                                                            return;
                                                        }

                                                        const value =
                                                            e.target.value;

                                                        setEmpresaFilterId(
                                                            value ===
                                                                ""
                                                                ? null
                                                                : Number(
                                                                    value
                                                                )
                                                        );

                                                        setPage(1);
                                                    }}
                                                    disabled={
                                                        empresasLoading ||
                                                        isCliente
                                                    }
                                                    className={clsx(
                                                        "w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 pl-10 pr-8 text-sm text-slate-900 shadow-sm",
                                                        "transition-all duration-200",
                                                        "hover:border-cyan-300",
                                                        "focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20",
                                                        "disabled:cursor-not-allowed disabled:opacity-50"
                                                    )}
                                                >
                                                    {!isCliente && (
                                                        <option value="">
                                                            Todas las empresas
                                                        </option>
                                                    )}

                                                    {empresaOptions.map(
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

                                            {empresasError && (
                                                <div className="text-xs text-rose-600">
                                                    {
                                                        empresasError
                                                    }
                                                </div>
                                            )}
                                        </div>

                                        {/* TIPO */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">
                                                Tipo de adicional
                                            </label>

                                            <select
                                                value={
                                                    tipo
                                                }
                                                onChange={(
                                                    e
                                                ) => {
                                                    setTipo(
                                                        e.target.value
                                                    );

                                                    setPage(1);
                                                }}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition-all duration-200 hover:border-cyan-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                                            >
                                                <option value="">
                                                    Todos los tipos
                                                </option>

                                                <option value="MONITOR">
                                                    Monitor
                                                </option>

                                                <option value="IMPRESORA">
                                                    Impresora
                                                </option>

                                                <option value="TECLADO">
                                                    Teclado
                                                </option>

                                                <option value="MOUSE">
                                                    Mouse
                                                </option>

                                                <option value="DOCK">
                                                    Dock
                                                </option>

                                                <option value="CARGADOR">
                                                    Cargador
                                                </option>

                                                <option value="OTRO">
                                                    Otro
                                                </option>
                                            </select>
                                        </div>

                                        {/* ORIGEN */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">
                                                Origen
                                            </label>

                                            <select
                                                value={
                                                    origen
                                                }
                                                onChange={(
                                                    e
                                                ) => {
                                                    setOrigen(
                                                        e.target
                                                            .value as
                                                        | OrigenAdicional
                                                        | ""
                                                    );

                                                    setPage(1);
                                                }}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition-all duration-200 hover:border-cyan-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                                            >
                                                <option value="">
                                                    Todos los orígenes
                                                </option>

                                                <option value="MANUAL">
                                                    Manual
                                                </option>

                                                <option value="AGENTE">
                                                    Agente
                                                </option>
                                            </select>
                                        </div>

                                        {/* ESTADO */}
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-slate-700">
                                                Estado
                                            </label>

                                            <select
                                                value={
                                                    estado
                                                }
                                                onChange={(
                                                    e
                                                ) => {
                                                    setEstado(
                                                        e.target
                                                            .value as
                                                        | EstadoAdicional
                                                        | ""
                                                    );

                                                    setPage(1);
                                                }}
                                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition-all duration-200 hover:border-cyan-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                                            >
                                                <option value="">
                                                    Todos los estados
                                                </option>

                                                <option value="ASIGNADO">
                                                    Asignado
                                                </option>

                                                <option value="EN_STOCK">
                                                    En stock
                                                </option>

                                                <option value="EN_REPARACION">
                                                    En reparación
                                                </option>

                                                <option value="DADO_DE_BAJA">
                                                    Dado de baja
                                                </option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* =================================================
                  CHIPS FILTROS ACTIVOS
              ================================================= */}
                                <div className="md:col-span-12">
                                    <div className="flex min-w-0 flex-wrap items-center gap-2">

                                        {empresaFilterName &&
                                            !isCliente && (
                                                <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs text-cyan-900">
                                                    <span>
                                                        Empresa:
                                                    </span>

                                                    <strong className="truncate">
                                                        {
                                                            empresaFilterName
                                                        }
                                                    </strong>

                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setEmpresaFilterId(
                                                                null
                                                            );

                                                            setPage(1);
                                                        }}
                                                        title="Quitar filtro de empresa"
                                                    >
                                                        <CloseCircleFilled />
                                                    </button>
                                                </span>
                                            )}

                                        {tipo && (
                                            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs text-indigo-900">
                                                Tipo:
                                                <strong>
                                                    {
                                                        tipo
                                                    }
                                                </strong>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setTipo("");
                                                        setPage(1);
                                                    }}
                                                >
                                                    <CloseCircleFilled />
                                                </button>
                                            </span>
                                        )}

                                        {origen && (
                                            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs text-cyan-900">
                                                Origen:
                                                <strong>
                                                    {
                                                        getOrigenLabel(
                                                            origen
                                                        )
                                                    }
                                                </strong>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setOrigen("");
                                                        setPage(1);
                                                    }}
                                                >
                                                    <CloseCircleFilled />
                                                </button>
                                            </span>
                                        )}

                                        {estado && (
                                            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-900">
                                                Estado:
                                                <strong>
                                                    {
                                                        getEstadoAdicionalLabel(
                                                            estado
                                                        )
                                                    }
                                                </strong>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEstado("");
                                                        setPage(1);
                                                    }}
                                                >
                                                    <CloseCircleFilled />
                                                </button>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent" />
                        </div>
                    </div>
                </div>

                {/* ===================================================
          CONTENIDO
      =================================================== */}
                <main className="mx-auto mt-6 max-w-[1800px] px-4 sm:px-6 lg:px-8">

                    {/* =================================================
            ERROR GLOBAL
        ================================================= */}
                    {!loading &&
                        error && (
                            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center text-sm text-rose-700">
                                {
                                    error
                                }
                            </div>
                        )}

                    {/* =================================================
            CARDS MOBILE
        ================================================= */}
                    <section
                        className="mt-4 space-y-3 md:hidden"
                        aria-live="polite"
                        aria-busy={
                            loading
                                ? "true"
                                : "false"
                        }
                    >
                        {loading && (
                            <div className="space-y-3">
                                {Array.from({
                                    length: 6,
                                }).map(
                                    (
                                        _,
                                        index
                                    ) => (
                                        <div
                                            key={`adicional-sk-mobile-${index}`}
                                            className="rounded-2xl border border-cyan-200 bg-white p-4"
                                        >
                                            <div className="mb-2 h-4 w-24 animate-pulse rounded bg-cyan-50" />

                                            <div className="mb-2 h-3 w-3/4 animate-pulse rounded bg-cyan-50" />

                                            <div className="h-3 w-1/2 animate-pulse rounded bg-cyan-50" />
                                        </div>
                                    )
                                )}
                            </div>
                        )}

                        {!loading &&
                            !error &&
                            rows.length ===
                            0 && (
                                <div className="rounded-2xl border border-cyan-200 bg-white p-4 text-center text-slate-600">
                                    Sin resultados.
                                </div>
                            )}

                        {!loading &&
                            !error &&
                            rows.map(
                                (
                                    row
                                ) => {
                                    const descripcion =
                                        limpiarDescripcionAdicional(
                                            row.descripcion
                                        );

                                    const serial =
                                        mostrarSerialAdicional(
                                            row.serialAdicional
                                        );

                                    return (
                                        <article
                                            key={`mobile-${row.id}`}
                                            className="rounded-2xl border border-cyan-200 bg-white p-4"
                                        >
                                            <header className="flex items-start justify-between gap-3">

                                                <div className="min-w-0">
                                                    <div className="text-xs text-slate-500">
                                                        Adicional #
                                                        {
                                                            row.id
                                                        }
                                                    </div>

                                                    <h3 className="mt-0.5 text-base font-semibold text-slate-900">
                                                        {
                                                            row.tipo
                                                        }
                                                    </h3>

                                                    <p className="mt-1 text-xs text-slate-600">
                                                        {
                                                            descripcion
                                                        }
                                                    </p>
                                                </div>

                                                <span
                                                    className={clsx(
                                                        "inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                                                        getEstadoAdicionalClass(
                                                            row.estado
                                                        )
                                                    )}
                                                >
                                                    {
                                                        getEstadoAdicionalLabel(
                                                            row.estado
                                                        )
                                                    }
                                                </span>
                                            </header>

                                            <div className="mt-3 flex flex-wrap gap-2">

                                                <span
                                                    className={clsx(
                                                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                                                        getOrigenClass(
                                                            row.origen
                                                        )
                                                    )}
                                                >
                                                    {
                                                        getOrigenLabel(
                                                            row.origen
                                                        )
                                                    }
                                                </span>

                                                {serial !==
                                                    "—" && (
                                                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 font-mono text-[11px] text-slate-700">
                                                            Serial:{" "}
                                                            {
                                                                serial
                                                            }
                                                        </span>
                                                    )}

                                                {row.empresa
                                                    ?.nombre && (
                                                        <span
                                                            className={clsx(
                                                                "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                                                                companyTagClasses(
                                                                    row
                                                                        .empresa
                                                                        .nombre
                                                                )
                                                            )}
                                                        >
                                                            <TeamOutlined />

                                                            {
                                                                row
                                                                    .empresa
                                                                    .nombre
                                                            }
                                                        </span>
                                                    )}
                                            </div>

                                            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                                                <div>
                                                    <strong>
                                                        Equipo:
                                                    </strong>{" "}
                                                    #
                                                    {
                                                        row.equipo
                                                            .id_equipo
                                                    }
                                                </div>

                                                <div className="mt-1">
                                                    <strong>
                                                        Serial equipo:
                                                    </strong>{" "}
                                                    {
                                                        row.equipo
                                                            .serial ||
                                                        "—"
                                                    }
                                                </div>

                                                <div className="mt-1">
                                                    <strong>
                                                        Equipo:
                                                    </strong>{" "}
                                                    {
                                                        row.equipo
                                                            .marca ||
                                                        "—"
                                                    }{" "}
                                                    {
                                                        row.equipo
                                                            .modelo ||
                                                        ""
                                                    }
                                                </div>

                                                <div className="mt-1">
                                                    <strong>
                                                        Solicitante:
                                                    </strong>{" "}
                                                    {
                                                        row.solicitante
                                                            ?.nombre ||
                                                        "—"
                                                    }
                                                </div>
                                            </div>

                                            <div className="mt-3 flex flex-wrap items-center gap-2">

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        startView(
                                                            row
                                                        )
                                                    }
                                                    className="inline-flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs text-cyan-900 hover:bg-cyan-100"
                                                >
                                                    <EyeOutlined />
                                                    Ver
                                                </button>

                                                {!isCliente && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                startEdit(
                                                                    row
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs text-indigo-900 hover:bg-indigo-100"
                                                        >
                                                            <EditOutlined />
                                                            Editar
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                void eliminar(
                                                                    row
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-900 hover:bg-rose-100"
                                                        >
                                                            <DeleteOutlined />
                                                            Eliminar
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </article>
                                    );
                                }
                            )}
                    </section>

                    {/* =================================================
            TABLA DESKTOP
        ================================================= */}
                    <section
                        className="mt-4 hidden rounded-3xl border border-cyan-200 bg-white md:block"
                        style={{
                            overflowX:
                                "auto",
                        }}
                        aria-live="polite"
                        aria-busy={
                            loading
                                ? "true"
                                : "false"
                        }
                    >
                        <div className="overflow-x-auto">
                            <table
                                className="w-full text-[13px] sm:text-sm"
                                style={{
                                    minWidth:
                                        "1280px",
                                }}
                            >
                                <thead className="sticky top-0 z-10">
                                    <tr className="border-b border-cyan-200 bg-gradient-to-r from-cyan-50 to-indigo-50">

                                        <th className="min-w-[110px] border-l-2 border-l-cyan-300 border-r border-cyan-100 px-4 py-3 text-left font-semibold text-slate-800">
                                            Tipo
                                        </th>

                                        <th className="min-w-[340px] border-r border-cyan-100 px-4 py-3 text-left font-semibold text-slate-800">
                                            Descripción
                                        </th>

                                        <th className="min-w-[170px] border-r border-cyan-100 px-4 py-3 text-left font-semibold text-slate-800">
                                            Serial
                                        </th>

                                        <th className="min-w-[220px] border-r border-cyan-100 px-4 py-3 text-left font-semibold text-slate-800">
                                            Equipo
                                        </th>

                                        <th className="min-w-[160px] border-r border-cyan-100 px-4 py-3 text-left font-semibold text-slate-800">
                                            Solicitante
                                        </th>

                                        <th className="min-w-[160px] border-r border-cyan-100 px-4 py-3 text-left font-semibold text-slate-800">
                                            Empresa
                                        </th>

                                        <th className="min-w-[100px] border-r border-cyan-100 px-4 py-3 text-left font-semibold text-slate-800">
                                            Origen
                                        </th>

                                        <th className="min-w-[130px] border-r border-cyan-100 px-4 py-3 text-left font-semibold text-slate-800">
                                            Estado
                                        </th>

                                        <th className="w-[100px] rounded-tr-xl px-4 py-3 text-center font-semibold text-slate-800">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="text-slate-800">

                                    {/* SKELETON */}
                                    {loading &&
                                        Array.from({
                                            length: 8,
                                        }).map(
                                            (
                                                _,
                                                index
                                            ) => (
                                                <tr
                                                    key={`adicional-sk-${index}`}
                                                    className="border-t border-neutral-100"
                                                >
                                                    {Array.from({
                                                        length: 9,
                                                    }).map(
                                                        (
                                                            __,
                                                            cell
                                                        ) => (
                                                            <td
                                                                key={`${index}-${cell}`}
                                                                className="px-4 py-3"
                                                            >
                                                                <div className="h-4 w-full max-w-[220px] animate-pulse rounded bg-neutral-200/70" />
                                                            </td>
                                                        )
                                                    )}
                                                </tr>
                                            )
                                        )}

                                    {/* SIN RESULTADOS */}
                                    {!loading &&
                                        !error &&
                                        rows.length ===
                                        0 && (
                                            <tr>
                                                <td
                                                    colSpan={9}
                                                    className="px-4 py-12"
                                                >
                                                    <div className="flex flex-col items-center gap-3 text-slate-600">
                                                        <span>
                                                            No encontramos resultados
                                                        </span>

                                                        <div className="flex gap-2">

                                                            <button
                                                                type="button"
                                                                onClick={
                                                                    clearAll
                                                                }
                                                                className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 px-3 py-2 text-sm text-cyan-800 hover:bg-cyan-50"
                                                            >
                                                                <CloseCircleFilled />
                                                                Limpiar
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    void reload()
                                                                }
                                                                className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 px-3 py-2 text-sm text-cyan-800 hover:bg-cyan-50"
                                                            >
                                                                <ReloadOutlined />
                                                                Recargar
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}

                                    {/* FILAS */}
                                    {!loading &&
                                        !error &&
                                        rows.map(
                                            (
                                                row
                                            ) => {
                                                const descripcion =
                                                    limpiarDescripcionAdicional(
                                                        row.descripcion
                                                    );

                                                const serial =
                                                    mostrarSerialAdicional(
                                                        row.serialAdicional
                                                    );

                                                const empresa =
                                                    row.empresa
                                                        ?.nombre ||
                                                    null;

                                                const theme =
                                                    companyRowTheme(
                                                        empresa
                                                    );

                                                return (
                                                    <tr
                                                        key={
                                                            row.id
                                                        }
                                                        className={clsx(
                                                            "border-t border-cyan-100 transition-colors",
                                                            theme.bg,
                                                            "hover:bg-cyan-50/70"
                                                        )}
                                                    >
                                                        {/* TIPO */}
                                                        <td
                                                            className={clsx(
                                                                "border-l-2 px-4 py-3 font-semibold",
                                                                theme.borderLeft
                                                            )}
                                                        >
                                                            {
                                                                row.tipo
                                                            }
                                                        </td>

                                                        {/* DESCRIPCIÓN */}
                                                        <td className="max-w-[440px] px-4 py-3">
                                                            <div
                                                                className="line-clamp-2 break-words text-slate-700"
                                                                title={
                                                                    descripcion ===
                                                                        "—"
                                                                        ? ""
                                                                        : descripcion
                                                                }
                                                            >
                                                                {
                                                                    descripcion
                                                                }
                                                            </div>
                                                        </td>

                                                        {/* SERIAL */}
                                                        <td className="px-4 py-3 font-mono text-xs font-semibold tracking-wide">
                                                            {
                                                                serial
                                                            }
                                                        </td>

                                                        {/* EQUIPO */}
                                                        <td className="px-4 py-3">
                                                            <div className="font-semibold text-slate-900">
                                                                Equipo #
                                                                {
                                                                    row.equipo
                                                                        .id_equipo
                                                                }
                                                            </div>

                                                            <div className="mt-0.5 text-xs text-slate-500">
                                                                <span className="font-mono">
                                                                    {row.equipo
                                                                        .serial ||
                                                                        "Sin serial"}
                                                                </span>

                                                                {" · "}

                                                                {row.equipo
                                                                    .marca ||
                                                                    "Sin marca"}

                                                                {" "}

                                                                {row.equipo
                                                                    .modelo ||
                                                                    ""}
                                                            </div>
                                                        </td>

                                                        {/* SOLICITANTE */}
                                                        <td className="px-4 py-3">
                                                            {row.solicitante
                                                                ?.nombre ? (
                                                                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-0.5 text-xs font-medium text-cyan-900">
                                                                    {
                                                                        row
                                                                            .solicitante
                                                                            .nombre
                                                                    }
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-400">
                                                                    —
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* EMPRESA */}
                                                        <td className="px-4 py-3">
                                                            {empresa ? (
                                                                <span
                                                                    className={clsx(
                                                                        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                                                                        companyTagClasses(
                                                                            empresa
                                                                        )
                                                                    )}
                                                                >
                                                                    <TeamOutlined className="opacity-80" />

                                                                    {
                                                                        empresa
                                                                    }
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-400">
                                                                    —
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* ORIGEN */}
                                                        <td className="px-4 py-3">
                                                            <span
                                                                className={clsx(
                                                                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                                                                    getOrigenClass(
                                                                        row.origen
                                                                    )
                                                                )}
                                                            >
                                                                {
                                                                    getOrigenLabel(
                                                                        row.origen
                                                                    )
                                                                }
                                                            </span>
                                                        </td>

                                                        {/* ESTADO */}
                                                        <td className="px-4 py-3">
                                                            <span
                                                                className={clsx(
                                                                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                                                                    getEstadoAdicionalClass(
                                                                        row.estado
                                                                    )
                                                                )}
                                                            >
                                                                {
                                                                    getEstadoAdicionalLabel(
                                                                        row.estado
                                                                    )
                                                                }
                                                            </span>
                                                        </td>

                                                        {/* ACCIONES */}
                                                        {!isCliente && (
                                                            <td className="whitespace-nowrap rounded-r-xl px-4 py-3 align-middle">
                                                                <div className="flex h-full items-center justify-center gap-2">

                                                                    {/* VISUALIZAR */}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            startView(
                                                                                row
                                                                            )
                                                                        }
                                                                        title="Ver adicional"
                                                                        aria-label={`Ver adicional ${row.id}`}
                                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-900 transition hover:bg-cyan-100"
                                                                    >
                                                                        <EyeOutlined />
                                                                    </button>

                                                                    {/* EDITAR */}
                                                                    {!isCliente && (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() =>
                                                                                startEdit(
                                                                                    row
                                                                                )
                                                                            }
                                                                            title="Editar adicional"
                                                                            aria-label={`Editar adicional ${row.id}`}
                                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-900 transition hover:bg-indigo-100"
                                                                        >
                                                                            <EditOutlined />
                                                                        </button>
                                                                    )}

                                                                    {/* ELIMINAR */}
                                                                    {!isCliente && (
                                                                        <button
                                                                            type="button"
                                                                            title="Eliminar adicional"
                                                                            aria-label={`Eliminar adicional ${row.id}`}
                                                                            onClick={() =>
                                                                                void eliminar(
                                                                                    row
                                                                                )
                                                                            }
                                                                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-900 transition hover:bg-rose-100"
                                                                        >
                                                                            <DeleteOutlined />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            }
                                        )}
                                </tbody>
                            </table>
                        </div>

                        {/* =================================================
              PAGINACIÓN
          ================================================= */}
                        <div className="flex flex-col gap-3 border-t border-cyan-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:pr-28 xl:pr-32">

                            <div className="text-center text-sm text-slate-700 sm:text-left">
                                {data ? (
                                    <span>
                                        {showingRange ? (
                                            <>
                                                Mostrando{" "}
                                                <strong className="text-slate-900">
                                                    {
                                                        showingRange.start
                                                    }
                                                </strong>
                                                –
                                                <strong className="text-slate-900">
                                                    {
                                                        showingRange.end
                                                    }
                                                </strong>{" "}
                                                de{" "}
                                                <strong className="text-slate-900">
                                                    {
                                                        data.total
                                                    }
                                                </strong>
                                                {" • "}
                                            </>
                                        ) : null}

                                        Página{" "}
                                        <strong className="text-slate-900">
                                            {
                                                data.page
                                            }
                                        </strong>{" "}
                                        de{" "}
                                        <strong className="text-slate-900">
                                            {
                                                data.totalPages
                                            }
                                        </strong>
                                    </span>
                                ) : (
                                    <span>
                                        —
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">

                                <button
                                    type="button"
                                    onClick={
                                        goPrev
                                    }
                                    disabled={
                                        !canPrev ||
                                        loading
                                    }
                                    className={clsx(
                                        "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm",
                                        "border-cyan-200 bg-white text-cyan-800 hover:bg-cyan-50",
                                        (
                                            !canPrev ||
                                            loading
                                        ) &&
                                        "cursor-not-allowed opacity-50 hover:bg-transparent"
                                    )}
                                >
                                    <LeftOutlined />

                                    <span className="hidden sm:inline">
                                        Anterior
                                    </span>
                                </button>

                                <div className="ml-1 hidden items-center gap-2 sm:flex">

                                    <span className="text-sm text-slate-600">
                                        Por página
                                    </span>

                                    <select
                                        value={
                                            data?.pageSize ??
                                            pageSize
                                        }
                                        onChange={(
                                            e
                                        ) =>
                                            onChangePageSize(
                                                Number(
                                                    e.target.value
                                                )
                                            )
                                        }
                                        className="rounded-xl border border-cyan-200 bg-white px-2 py-1 text-sm"
                                    >
                                        {[
                                            10,
                                            20,
                                            30,
                                            50,
                                            100,
                                        ].map(
                                            (
                                                value
                                            ) => (
                                                <option
                                                    key={
                                                        value
                                                    }
                                                    value={
                                                        value
                                                    }
                                                >
                                                    {
                                                        value
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>

                                <button
                                    type="button"
                                    onClick={
                                        goNext
                                    }
                                    disabled={
                                        !canNext ||
                                        loading
                                    }
                                    className={clsx(
                                        "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm",
                                        "border-cyan-200 bg-white text-cyan-800 hover:bg-cyan-50",
                                        (
                                            !canNext ||
                                            loading
                                        ) &&
                                        "cursor-not-allowed opacity-50 hover:bg-transparent"
                                    )}
                                >
                                    <span className="hidden sm:inline">
                                        Siguiente
                                    </span>

                                    <RightOutlined />
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* =================================================
            PAGINACIÓN MOBILE
        ================================================= */}
                    <section className="mt-4 rounded-2xl border border-cyan-200 bg-slate-50 px-4 py-3 md:hidden">

                        <div className="text-center text-sm text-slate-700">
                            {data ? (
                                <>
                                    Página{" "}
                                    <strong>
                                        {
                                            data.page
                                        }
                                    </strong>{" "}
                                    de{" "}
                                    <strong>
                                        {
                                            data.totalPages
                                        }
                                    </strong>
                                </>
                            ) : (
                                "—"
                            )}
                        </div>

                        <div className="mt-3 flex items-center justify-center gap-2">

                            <button
                                type="button"
                                onClick={
                                    goPrev
                                }
                                disabled={
                                    !canPrev ||
                                    loading
                                }
                                className={clsx(
                                    "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-200 bg-white text-cyan-800",
                                    (
                                        !canPrev ||
                                        loading
                                    ) &&
                                    "cursor-not-allowed opacity-50"
                                )}
                            >
                                <LeftOutlined />
                            </button>

                            <select
                                value={
                                    data?.pageSize ??
                                    pageSize
                                }
                                onChange={(
                                    e
                                ) =>
                                    onChangePageSize(
                                        Number(
                                            e.target.value
                                        )
                                    )
                                }
                                className="rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm"
                            >
                                {[
                                    10,
                                    20,
                                    30,
                                    50,
                                ].map(
                                    (
                                        value
                                    ) => (
                                        <option
                                            key={
                                                value
                                            }
                                            value={
                                                value
                                            }
                                        >
                                            {
                                                value
                                            }{" "}
                                            por página
                                        </option>
                                    )
                                )}
                            </select>

                            <button
                                type="button"
                                onClick={
                                    goNext
                                }
                                disabled={
                                    !canNext ||
                                    loading
                                }
                                className={clsx(
                                    "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-200 bg-white text-cyan-800",
                                    (
                                        !canNext ||
                                        loading
                                    ) &&
                                    "cursor-not-allowed opacity-50"
                                )}
                            >
                                <RightOutlined />
                            </button>
                        </div>
                    </section>
                </main>
                {/* =====================================================
    MODALES
===================================================== */}

                <CrearAdicionalModal
                    open={
                        createOpen
                    }
                    onClose={
                        closeCreate
                    }
                    onCreated={() =>
                        void handleCreated()
                    }
                />

                <EditarAdicionalModal
                    open={
                        editOpen
                    }
                    row={
                        editRow
                    }
                    onClose={
                        closeEdit
                    }
                    onSaved={() =>
                        void handleSaved()
                    }
                />

                <AdicionalViewModal
                    open={
                        viewOpen
                    }
                    row={
                        viewRow
                    }
                    onClose={
                        closeView
                    }
                />
            </div>
        );
    };

export default AdicionalesPage;