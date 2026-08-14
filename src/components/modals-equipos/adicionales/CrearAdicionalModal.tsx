// src/components/modals-equipos/adicionales/CrearAdicionalModal.tsx

import {
    CloseOutlined,
    LoadingOutlined,
    PlusOutlined,
    SearchOutlined,
} from "@ant-design/icons";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import { http } from "../../../service/http";

import type {
    AdicionalEquipoLite,
    EstadoAdicional,
} from "./adicionales.types";

import {
    ADICIONAL_ESTADOS,
    ADICIONAL_TIPOS,
    ADICIONAL_TIPO_LABEL,
} from "./adicionales.constants";

/* =========================================================
   TIPOS
========================================================= */

type Props = {
    open: boolean;
    onClose: () => void;
    onCreated: () => void | Promise<void>;
};

type EquiposResponse = {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    items: AdicionalEquipoLite[];
};

type EmpresaOption = {
    id_empresa: number;
    nombre: string;
};

type EmpresasResponse = {
    success?: boolean;
    data?: EmpresaOption[];
    total?: number;
};

/* =========================================================
   COMPONENTE
========================================================= */

export default function CrearAdicionalModal({
    open,
    onClose,
    onCreated,
}: Props) {

    const [
        equipoIds,
        setEquipoIds,
    ] = useState<number[]>([]);

    const [
        tipo,
        setTipo,
    ] = useState(
        "MONITOR"
    );

    const [
        nombre,
        setNombre,
    ] = useState("");

    const [
        marca,
        setMarca,
    ] = useState("");

    const [
        modelo,
        setModelo,
    ] = useState("");

    const [
        macAddress,
        setMacAddress,
    ] = useState("");

    const [
        ipAddress,
        setIpAddress,
    ] = useState("");

    const [
        hostname,
        setHostname,
    ] = useState("");

    const [
        ubicacion,
        setUbicacion,
    ] = useState("");

    const [
        descripcion,
        setDescripcion,
    ] = useState("");

    const [
        serialAdicional,
        setSerialAdicional,
    ] = useState("");

    const [
        cantidad,
        setCantidad,
    ] = useState(1);

    const [
        estado,
        setEstado,
    ] =
        useState<EstadoAdicional>(
            "ASIGNADO"
        );

    /* =====================================================
       SELECTOR EQUIPO
    ===================================================== */

    const [
        equipos,
        setEquipos,
    ] =
        useState<
            AdicionalEquipoLite[]
        >([]);
    const [
        empresas,
        setEmpresas,
    ] =
        useState<EmpresaOption[]>([]);

    const [
        loadingEmpresas,
        setLoadingEmpresas,
    ] =
        useState(false);

    const [
        equipoSearch,
        setEquipoSearch,
    ] = useState("");

    const [
        empresaEquipoFilter,
        setEmpresaEquipoFilter,
    ] = useState<number | null>(
        null
    );

    const [
        solicitanteEquipoFilter,
        setSolicitanteEquipoFilter,
    ] = useState<number | null>(
        null
    );

    const [
        loadingEquipos,
        setLoadingEquipos,
    ] = useState(false);

    /* =====================================================
       ESTADO REQUEST
    ===================================================== */

    const [
        saving,
        setSaving,
    ] = useState(false);

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null
        );

    /* =====================================================
       RESET
    ===================================================== */

    function resetForm() {
        setEquipoIds([]);

        setNombre("");

        setTipo(
            "MONITOR"
        );

        setEmpresaEquipoFilter(null);

        setSolicitanteEquipoFilter(null);

        setMarca("");
        setModelo("");

        setDescripcion("");

        setSerialAdicional("");

        setMacAddress("");
        setIpAddress("");

        setHostname("");

        setUbicacion("");

        setCantidad(1);

        setEstado(
            "ASIGNADO"
        );

        setEquipoSearch("");

        setError(null);
    }

    /* =====================================================
   CARGAR EMPRESAS
===================================================== */

    useEffect(() => {
        if (!open) {
            return;
        }

        const controller =
            new AbortController();

        async function loadEmpresas() {
            try {
                setLoadingEmpresas(true);

                const res =
                    await http.get(
                        "/empresas",
                        {
                            signal:
                                controller.signal,

                            params: {
                                estado:
                                    "ACTIVAS",
                            },
                        }
                    );

                const raw =
                    res.data as
                    | EmpresasResponse
                    | EmpresaOption[];

                const lista =
                    Array.isArray(raw)
                        ? raw
                        : Array.isArray(
                            raw?.data
                        )
                            ? raw.data
                            : [];

                setEmpresas(
                    lista.sort(
                        (
                            a,
                            b
                        ) =>
                            a.nombre.localeCompare(
                                b.nombre,
                                "es",
                                {
                                    sensitivity:
                                        "base",
                                }
                            )
                    )
                );
            } catch (err) {
                if (
                    (
                        err as Error
                    ).name ===
                    "AbortError"
                ) {
                    return;
                }

                console.error(
                    "[CrearAdicionalModal] load empresas",
                    err
                );

                setEmpresas([]);
            } finally {
                setLoadingEmpresas(false);
            }
        }

        void loadEmpresas();

        return () =>
            controller.abort();

    }, [
        open,
    ]);

    /* =====================================================
       CARGAR EQUIPOS
    ===================================================== */

    useEffect(() => {
        if (!open) {
            return;
        }

        const controller =
            new AbortController();

        async function loadEquipos() {
            try {
                setLoadingEquipos(
                    true
                );

                const res =
                    await http.get(
                        "/equipos",
                        {
                            signal:
                                controller.signal,

                            params: {
                                mode:
                                    "selector",

                                page:
                                    1,

                                pageSize:
                                    1000,
                            },
                        }
                    );

                const data =
                    res.data as EquiposResponse;

                setEquipos(
                    data.items ?? []
                );
            } catch (err) {
                if (
                    (err as Error)
                        .name ===
                    "AbortError"
                ) {
                    return;
                }

                console.error(
                    "[CrearAdicionalModal] load equipos",
                    err
                );
            } finally {
                setLoadingEquipos(
                    false
                );
            }
        }

        void loadEquipos();

        return () =>
            controller.abort();
    }, [open]);

    const empresasEquipoOptions =
        useMemo(
            () =>
                [...empresas].sort(
                    (
                        a,
                        b
                    ) =>
                        a.nombre.localeCompare(
                            b.nombre,
                            "es",
                            {
                                sensitivity:
                                    "base",
                            }
                        )
                ),
            [
                empresas,
            ]
        );

    const solicitantesEquipoOptions =
        useMemo(() => {

            const map =
                new Map<
                    number,
                    {
                        id: number;
                        nombre: string;
                        empresaId: number | null;
                    }
                >();

            for (
                const equipo
                of equipos
            ) {
                const solicitante =
                    equipo.solicitante;

                if (!solicitante) {
                    continue;
                }

                const empresa =
                    equipo.empresa ??
                    solicitante.empresa ??
                    null;

                map.set(
                    solicitante.id_solicitante,
                    {
                        id:
                            solicitante.id_solicitante,

                        nombre:
                            solicitante.nombre,

                        empresaId:
                            empresa?.id_empresa ??
                            null,
                    }
                );
            }

            return Array.from(
                map.values()
            )
                .filter(
                    (
                        solicitante
                    ) =>
                        empresaEquipoFilter ===
                        null ||
                        solicitante.empresaId ===
                        empresaEquipoFilter
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        a.nombre.localeCompare(
                            b.nombre,
                            "es",
                            {
                                sensitivity:
                                    "base",
                            }
                        )
                );

        }, [
            equipos,
            empresaEquipoFilter,
        ]);

    /* =====================================================
       FILTRAR EQUIPOS
    ===================================================== */

    const equiposFiltrados =
        useMemo(() => {

            const q =
                equipoSearch
                    .trim()
                    .toLowerCase();

            return equipos.filter(
                (
                    equipo
                ) => {

                    const empresa =
                        equipo.empresa ??
                        equipo.solicitante
                            ?.empresa ??
                        null;

                    /* =========================
                       EMPRESA
                    ========================= */

                    if (
                        empresaEquipoFilter !==
                        null &&
                        empresa?.id_empresa !==
                        empresaEquipoFilter
                    ) {
                        return false;
                    }

                    /* =========================
                       SOLICITANTE
                    ========================= */

                    if (
                        solicitanteEquipoFilter !==
                        null &&
                        equipo.solicitante
                            ?.id_solicitante !==
                        solicitanteEquipoFilter
                    ) {
                        return false;
                    }

                    /* =========================
                       BÚSQUEDA
                    ========================= */

                    if (!q) {
                        return true;
                    }

                    const texto = [
                        equipo.id_equipo,
                        equipo.serial,
                        equipo.marca,
                        equipo.modelo,
                        equipo.tipo,

                        equipo.solicitante
                            ?.nombre,

                        equipo.solicitante
                            ?.email,

                        empresa?.nombre,
                    ]
                        .filter(Boolean)
                        .join(" ")
                        .toLowerCase();

                    return texto.includes(
                        q
                    );
                }
            );

        }, [
            equipos,
            equipoSearch,
            empresaEquipoFilter,
            solicitanteEquipoFilter,
        ]);

    /* =====================================================
       CREAR
    ===================================================== */

    async function handleSubmit() {

        if (!tipo.trim()) {
            setError(
                "El tipo es obligatorio."
            );

            return;
        }

        if (
            !Number.isInteger(
                cantidad
            ) ||
            cantidad <= 0
        ) {
            setError(
                "La cantidad debe ser mayor a 0."
            );

            return;
        }

        try {
            setSaving(true);
            setError(null);

            await http.post(
                "/equipos-adicionales",
                {
                    nombre:
                        nombre.trim() ||
                        null,

                    tipo:
                        tipo
                            .trim()
                            .toUpperCase(),

                    marca:
                        marca.trim() ||
                        null,

                    modelo:
                        modelo.trim() ||
                        null,

                    descripcion:
                        descripcion.trim() ||
                        null,

                    cantidad,

                    serialAdicional:
                        serialAdicional
                            .trim()
                            .toUpperCase() ||
                        null,

                    macAddress:
                        macAddress.trim() ||
                        null,

                    ipAddress:
                        ipAddress.trim() ||
                        null,

                    hostname:
                        hostname.trim() ||
                        null,

                    ubicacion:
                        ubicacion.trim() ||
                        null,

                    estado,

                    equipoIds,
                }
            );

            resetForm();

            await onCreated();
        } catch (err: any) {
            setError(
                err?.response
                    ?.data
                    ?.error ||
                err?.message ||
                "No se pudo crear el adicional."
            );
        } finally {
            setSaving(false);
        }
    }

    /* =====================================================
       CERRAR
    ===================================================== */

    function handleClose() {
        if (saving) {
            return;
        }

        resetForm();
        onClose();
    }

    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center overflow-hidden bg-slate-950/40 p-2 backdrop-blur-sm sm:p-4">

            <div className="flex max-h-[calc(100dvh-1rem)] w-full min-w-0 max-w-4xl flex-col overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-2xl sm:max-h-[92dvh] sm:rounded-3xl">

                {/* =================================================
                    HEADER
                ================================================= */}

                <div className="flex min-w-0 shrink-0 items-start justify-between gap-3 border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-indigo-50 px-4 py-4 sm:px-6">

                    <div className="min-w-0">

                        <h2 className="break-words text-lg font-bold text-slate-900 sm:text-xl">
                            Nuevo adicional
                        </h2>

                        <p className="mt-1 break-words text-xs text-slate-500 sm:text-sm">
                            Registra un adicional y vincúlalo opcionalmente a uno o más equipos.
                        </p>

                    </div>

                    <button
                        type="button"
                        onClick={
                            handleClose
                        }
                        disabled={
                            saving
                        }
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Cerrar"
                    >
                        <CloseOutlined />
                    </button>

                </div>

                {/* =================================================
                    BODY
                ================================================= */}

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">

                    {error && (
                        <div className="mb-5 break-words rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {
                                error
                            }
                        </div>
                    )}

                    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">

                        {/* =================================================
    EQUIPOS ASOCIADOS
================================================= */}

                        <div className="min-w-0 space-y-3 sm:col-span-2">

                            <div className="flex flex-col gap-1">

                                <label className="text-sm font-semibold text-slate-700">
                                    Equipos asociados
                                </label>

                                <span className="text-xs text-slate-500">
                                    Filtra por empresa o solicitante, o busca directamente un equipo.
                                </span>

                            </div>

                            {/* =================================================
        FILTROS DE EQUIPO
    ================================================= */}

                            <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-3">

                                {/* EMPRESA */}

                                <select
                                    value={
                                        empresaEquipoFilter ??
                                        ""
                                    }
                                    onChange={(
                                        e
                                    ) => {

                                        const value =
                                            e.target.value;

                                        setEmpresaEquipoFilter(
                                            value
                                                ? Number(
                                                    value
                                                )
                                                : null
                                        );

                                        /*
                                         * Si cambia la empresa,
                                         * limpiamos solicitante.
                                         */
                                        setSolicitanteEquipoFilter(
                                            null
                                        );
                                    }}
                                    className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                                >

                                    <option value="">
                                        Todas las empresas
                                    </option>

                                    {empresasEquipoOptions.map(
                                        (
                                            empresa
                                        ) => (
                                            <option
                                                key={
                                                    empresa.id_empresa
                                                }
                                                value={
                                                    empresa.id_empresa
                                                }
                                            >
                                                {
                                                    empresa.nombre
                                                }
                                            </option>
                                        )
                                    )}
                                </select>

                                {/* SOLICITANTE */}

                                <select
                                    value={
                                        solicitanteEquipoFilter ??
                                        ""
                                    }
                                    onChange={(
                                        e
                                    ) => {

                                        const value =
                                            e.target.value;

                                        setSolicitanteEquipoFilter(
                                            value
                                                ? Number(
                                                    value
                                                )
                                                : null
                                        );
                                    }}
                                    className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                                >

                                    <option value="">
                                        Todos los solicitantes
                                    </option>

                                    {solicitantesEquipoOptions.map(
                                        (
                                            solicitante
                                        ) => (
                                            <option
                                                key={
                                                    solicitante.id
                                                }
                                                value={
                                                    solicitante.id
                                                }
                                            >
                                                {
                                                    solicitante.nombre
                                                }
                                            </option>
                                        )
                                    )}

                                </select>

                                {/* BÚSQUEDA */}

                                <div className="relative min-w-0">

                                    <SearchOutlined className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                                    <input
                                        value={
                                            equipoSearch
                                        }
                                        onChange={(
                                            e
                                        ) =>
                                            setEquipoSearch(
                                                e.target.value
                                            )
                                        }
                                        placeholder="ID, serial, marca, modelo..."
                                        className="w-full min-w-0 rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                                    />

                                </div>

                            </div>

                            {/* =================================================
        LISTADO
    ================================================= */}

                            <div className="max-h-64 min-w-0 overflow-y-auto rounded-xl border border-slate-200 bg-white">

                                {loadingEquipos && (
                                    <div className="p-4 text-center text-sm text-slate-500">

                                        <LoadingOutlined className="mr-2" />

                                        Cargando equipos...

                                    </div>
                                )}

                                {!loadingEquipos &&
                                    equiposFiltrados.length ===
                                    0 && (
                                        <div className="p-4 text-center text-sm text-slate-500">
                                            No se encontraron equipos.
                                        </div>
                                    )}

                                {!loadingEquipos &&
                                    equiposFiltrados.map(
                                        (
                                            equipo
                                        ) => {

                                            const selected =
                                                equipoIds.includes(
                                                    equipo.id_equipo
                                                );

                                            const empresa =
                                                equipo.empresa ??
                                                equipo.solicitante
                                                    ?.empresa ??
                                                null;

                                            return (
                                                <label
                                                    key={
                                                        equipo.id_equipo
                                                    }
                                                    className="flex cursor-pointer items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-cyan-50/50"
                                                >

                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            selected
                                                        }
                                                        onChange={() => {

                                                            setEquipoIds(
                                                                (
                                                                    current
                                                                ) =>
                                                                    selected
                                                                        ? current.filter(
                                                                            (
                                                                                id
                                                                            ) =>
                                                                                id !==
                                                                                equipo.id_equipo
                                                                        )
                                                                        : [
                                                                            ...current,
                                                                            equipo.id_equipo,
                                                                        ]
                                                            );

                                                        }}
                                                        className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                                                    />

                                                    <div className="min-w-0 flex-1">

                                                        <div className="break-words text-sm font-semibold text-slate-900">

                                                            Equipo #
                                                            {
                                                                equipo.id_equipo
                                                            }

                                                            {" · "}

                                                            {
                                                                equipo.serial ||
                                                                "Sin serial"
                                                            }

                                                        </div>

                                                        <div className="mt-0.5 break-words text-xs text-slate-500">

                                                            {
                                                                equipo.marca ||
                                                                "Sin marca"
                                                            }

                                                            {" "}

                                                            {
                                                                equipo.modelo ||
                                                                ""
                                                            }

                                                        </div>

                                                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">

                                                            <span>
                                                                Solicitante:{" "}

                                                                <strong className="font-medium text-slate-700">
                                                                    {
                                                                        equipo.solicitante
                                                                            ?.nombre ||
                                                                        "Sin solicitante"
                                                                    }
                                                                </strong>
                                                            </span>

                                                            <span>
                                                                Empresa:{" "}

                                                                <strong className="font-medium text-slate-700">
                                                                    {
                                                                        empresa
                                                                            ?.nombre ||
                                                                        "Sin empresa"
                                                                    }
                                                                </strong>
                                                            </span>

                                                        </div>

                                                    </div>

                                                </label>
                                            );
                                        }
                                    )}

                            </div>

                            {/* =================================================
    EQUIPOS SELECCIONADOS
================================================= */}

                            {equipoIds.length > 0 && (
                                <div className="rounded-xl border border-cyan-200 bg-cyan-50/40 p-3">

                                    <div className="mb-2 flex items-center justify-between gap-3">

                                        <div className="text-xs font-semibold text-cyan-900">
                                            Equipos seleccionados
                                        </div>

                                        <span className="rounded-full border border-cyan-200 bg-white px-2 py-0.5 text-xs font-semibold text-cyan-800">
                                            {
                                                equipoIds.length
                                            }
                                        </span>

                                    </div>

                                    <div className="flex flex-wrap gap-2">

                                        {equipoIds.map(
                                            (
                                                equipoId
                                            ) => {

                                                const equipo =
                                                    equipos.find(
                                                        (
                                                            item
                                                        ) =>
                                                            item.id_equipo ===
                                                            equipoId
                                                    );

                                                if (!equipo) {
                                                    return null;
                                                }

                                                const serial =
                                                    String(
                                                        equipo.serial ??
                                                        ""
                                                    ).trim();

                                                return (
                                                    <button
                                                        key={
                                                            equipoId
                                                        }
                                                        type="button"
                                                        onClick={() =>
                                                            setEquipoIds(
                                                                (
                                                                    current
                                                                ) =>
                                                                    current.filter(
                                                                        (
                                                                            id
                                                                        ) =>
                                                                            id !==
                                                                            equipoId
                                                                    )
                                                            )
                                                        }
                                                        className="inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-200 bg-white px-3 py-1.5 text-xs font-medium text-cyan-900 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                                                        title="Quitar equipo"
                                                    >

                                                        <span className="truncate">
                                                            #
                                                            {
                                                                equipo.id_equipo
                                                            }

                                                            {serial
                                                                ? ` · ${serial}`
                                                                : ""}
                                                        </span>

                                                        <CloseOutlined className="shrink-0" />

                                                    </button>
                                                );
                                            }
                                        )}

                                    </div>

                                </div>
                            )}

                            {/* =================================================
        RESUMEN
    ================================================= */}

                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">

                                <span>

                                    <strong className="text-slate-700">
                                        {
                                            equiposFiltrados.length
                                        }
                                    </strong>{" "}
                                    equipo(s) mostrado(s)

                                    {" · "}

                                    <strong className="text-cyan-700">
                                        {
                                            equipoIds.length
                                        }
                                    </strong>{" "}
                                    seleccionado(s)

                                </span>

                                {equipoIds.length >
                                    0 && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setEquipoIds([])
                                            }
                                            className="font-medium text-rose-600 hover:text-rose-700"
                                        >
                                            Quitar todos
                                        </button>
                                    )}

                            </div>

                        </div>

                        {/* =================================================
                            TIPO
                        ================================================= */}

                        <div className="min-w-0 space-y-2">

                            <label className="text-sm font-semibold text-slate-700">

                                Tipo

                                <span className="ml-1 text-rose-500">
                                    *
                                </span>

                            </label>

                            <select
                                value={
                                    tipo
                                }
                                onChange={(
                                    e
                                ) =>
                                    setTipo(
                                        e.target
                                            .value
                                    )
                                }
                                className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                            >

                                {ADICIONAL_TIPOS.map(
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
                                                ADICIONAL_TIPO_LABEL[
                                                value
                                                ]
                                            }
                                        </option>
                                    )
                                )}

                            </select>

                        </div>

                        {/* =================================================
                            ESTADO
                        ================================================= */}

                        <div className="min-w-0 space-y-2">

                            <label className="text-sm font-semibold text-slate-700">
                                Estado
                            </label>

                            <select
                                value={
                                    estado
                                }
                                onChange={(
                                    e
                                ) =>
                                    setEstado(
                                        e.target
                                            .value as EstadoAdicional
                                    )
                                }
                                className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                            >

                                {ADICIONAL_ESTADOS.map(
                                    (
                                        option
                                    ) => (
                                        <option
                                            key={
                                                option.value
                                            }
                                            value={
                                                option.value
                                            }
                                        >
                                            {
                                                option.label
                                            }
                                        </option>
                                    )
                                )}

                            </select>

                        </div>

                        {/* =================================================
    NOMBRE
================================================= */}

                        <div className="min-w-0 space-y-2">

                            <label className="text-sm font-semibold text-slate-700">
                                Nombre
                            </label>

                            <input
                                value={
                                    nombre
                                }
                                onChange={(
                                    e
                                ) =>
                                    setNombre(
                                        e.target.value
                                    )
                                }
                                maxLength={200}
                                placeholder="Ej: Impresora Contabilidad"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                            />

                        </div>

                        {/* =================================================
    MARCA
================================================= */}

                        <div className="min-w-0 space-y-2">

                            <label className="text-sm font-semibold text-slate-700">
                                Marca
                            </label>

                            <input
                                value={
                                    marca
                                }
                                onChange={(
                                    e
                                ) =>
                                    setMarca(
                                        e.target.value
                                    )
                                }
                                maxLength={200}
                                placeholder="Ej: RICOH"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                            />

                        </div>

                        {/* =================================================
    MODELO
================================================= */}

                        <div className="min-w-0 space-y-2">

                            <label className="text-sm font-semibold text-slate-700">
                                Modelo
                            </label>

                            <input
                                value={
                                    modelo
                                }
                                onChange={(
                                    e
                                ) =>
                                    setModelo(
                                        e.target.value
                                    )
                                }
                                maxLength={200}
                                placeholder="Ej: MP C307"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                            />

                        </div>

                        {/* =================================================
                            SERIAL
                        ================================================= */}

                        <div className="min-w-0 space-y-2">

                            <label className="text-sm font-semibold text-slate-700">
                                Serial adicional
                            </label>
                            <input
                                value={
                                    serialAdicional
                                }
                                onChange={(
                                    e
                                ) =>
                                    setSerialAdicional(
                                        e.target
                                            .value
                                            .toUpperCase()
                                    )
                                }
                                maxLength={200}
                                autoComplete="off"
                                placeholder="Serial único del adicional"
                                className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                            />
                            <p className="text-xs text-slate-500">
                                * El serial es único en todo el inventario de adicionales. *
                            </p>

                        </div>

                        {/* =================================================
                            CANTIDAD
                        ================================================= */}

                        <div className="min-w-0 space-y-2">

                            <label className="text-sm font-semibold text-slate-700">
                                Cantidad
                            </label>

                            <input
                                type="number"
                                min={1}
                                value={
                                    cantidad
                                }
                                onChange={(
                                    e
                                ) =>
                                    setCantidad(
                                        Math.max(
                                            1,
                                            Number(
                                                e.target
                                                    .value
                                            ) ||
                                            1
                                        )
                                    )
                                }
                                className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                            />

                        </div>

                        {/* =================================================
    MAC
================================================= */}

                        <div className="min-w-0 space-y-2">

                            <label className="text-sm font-semibold text-slate-700">
                                Dirección MAC
                            </label>

                            <input
                                value={
                                    macAddress
                                }
                                onChange={(
                                    e
                                ) =>
                                    setMacAddress(
                                        e.target.value
                                            .toUpperCase()
                                    )
                                }
                                maxLength={100}
                                placeholder="AA:BB:CC:DD:EE:FF"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                            />

                        </div>

                        {/* =================================================
    IP
================================================= */}

                        <div className="min-w-0 space-y-2">

                            <label className="text-sm font-semibold text-slate-700">
                                Dirección IP
                            </label>

                            <input
                                value={
                                    ipAddress
                                }
                                onChange={(
                                    e
                                ) =>
                                    setIpAddress(
                                        e.target.value
                                    )
                                }
                                maxLength={100}
                                placeholder="192.168.1.20"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                            />

                        </div>

                        {/* =================================================
    HOSTNAME
================================================= */}

                        <div className="min-w-0 space-y-2">

                            <label className="text-sm font-semibold text-slate-700">
                                Hostname
                            </label>

                            <input
                                value={
                                    hostname
                                }
                                onChange={(
                                    e
                                ) =>
                                    setHostname(
                                        e.target.value
                                    )
                                }
                                maxLength={200}
                                placeholder="Ej: RICOH-CONTAB"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                            />

                        </div>

                        {/* =================================================
    UBICACIÓN
================================================= */}

                        <div className="min-w-0 space-y-2">

                            <label className="text-sm font-semibold text-slate-700">
                                Ubicación
                            </label>

                            <input
                                value={
                                    ubicacion
                                }
                                onChange={(
                                    e
                                ) =>
                                    setUbicacion(
                                        e.target.value
                                    )
                                }
                                maxLength={300}
                                placeholder="Ej: Oficina Contabilidad"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                            />

                        </div>

                        {/* =================================================
                            DESCRIPCIÓN
                        ================================================= */}

                        <div className="min-w-0 space-y-2 sm:col-span-2">

                            <label className="text-sm font-semibold text-slate-700">
                                Descripción
                            </label>

                            <textarea
                                value={
                                    descripcion
                                }
                                onChange={(
                                    e
                                ) =>
                                    setDescripcion(
                                        e.target
                                            .value
                                    )
                                }
                                maxLength={
                                    1000
                                }
                                rows={4}
                                placeholder="Descripción, modelo, características, etc."
                                className="w-full min-w-0 resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                            />

                            <div className="text-right text-xs text-slate-400">
                                {
                                    descripcion.length
                                }
                                /1000
                            </div>

                        </div>

                    </div>

                </div>

                {/* =================================================
                    FOOTER
                ================================================= */}

                <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:justify-end sm:px-6 sm:py-4">

                    <button
                        type="button"
                        onClick={
                            handleClose
                        }
                        disabled={
                            saving
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            void handleSubmit()
                        }
                        disabled={
                            saving
                        }
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >

                        {saving ? (
                            <LoadingOutlined />
                        ) : (
                            <PlusOutlined />
                        )}

                        {saving
                            ? "Guardando..."
                            : "Crear adicional"}

                    </button>

                </div>

            </div>

        </div>
    );
}