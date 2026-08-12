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
    EstadoAdicional,
} from "./adicionales.types";

/* =========================================================
   TIPOS
========================================================= */

type Props = {
    open: boolean;
    onClose: () => void;
    onCreated: () => void | Promise<void>;
};

type EquipoSelectorRow = {
    id_equipo: number;
    serial?: string | null;
    marca?: string | null;
    modelo?: string | null;
    tipo?: string | null;
    estado?: string | null;
};

type EquiposResponse = {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    items: EquipoSelectorRow[];
};

/* =========================================================
   ESTADOS DISPONIBLES
========================================================= */

const ESTADOS: Array<{
    value: EstadoAdicional;
    label: string;
}> = [
        {
            value: "ASIGNADO",
            label: "Asignado",
        },
        {
            value: "EN_STOCK",
            label: "En stock",
        },
        {
            value: "EN_REPARACION",
            label: "En reparación",
        },
        {
            value: "DADO_DE_BAJA",
            label: "Dado de baja",
        },
    ];

const TIPOS = [
    "MONITOR",
    "IMPRESORA",
    "TECLADO",
    "MOUSE",
    "DOCK",
    "CARGADOR",
    "OTRO",
];

/* =========================================================
   COMPONENTE
========================================================= */

export default function CrearAdicionalModal({
    open,
    onClose,
    onCreated,
}: Props) {

    const [
        equipoId,
        setEquipoId,
    ] = useState<number | null>(
        null
    );

    const [
        tipo,
        setTipo,
    ] = useState(
        "MONITOR"
    );

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
            EquipoSelectorRow[]
        >([]);

    const [
        equipoSearch,
        setEquipoSearch,
    ] = useState("");

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
        setEquipoId(null);
        setTipo("MONITOR");
        setDescripcion("");
        setSerialAdicional("");
        setCantidad(1);
        setEstado("ASIGNADO");
        setEquipoSearch("");
        setError(null);
    }

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

    /* =====================================================
       FILTRAR EQUIPOS
    ===================================================== */

    const equiposFiltrados =
        useMemo(() => {
            const q =
                equipoSearch
                    .trim()
                    .toLowerCase();

            if (!q) {
                return equipos;
            }

            return equipos.filter(
                (equipo) => {
                    const texto = [
                        equipo.id_equipo,
                        equipo.serial,
                        equipo.marca,
                        equipo.modelo,
                        equipo.tipo,
                    ]
                        .filter(
                            Boolean
                        )
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
        ]);

    /* =====================================================
       CREAR
    ===================================================== */

    async function handleSubmit() {
        if (!equipoId) {
            setError(
                "Debes seleccionar un equipo."
            );
            return;
        }

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
                    equipoId,

                    tipo:
                        tipo.trim(),

                    descripcion:
                        descripcion.trim() ||
                        null,

                    cantidad,

                    serialAdicional:
                        serialAdicional.trim() ||
                        null,

                    estado,
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
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">

            <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-cyan-200 bg-white shadow-2xl">

                {/* HEADER */}
                <div className="flex items-start justify-between gap-4 border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-indigo-50 px-5 py-4 sm:px-6">

                    <div>
                        <h2 className="text-xl font-bold text-slate-900">
                            Nuevo adicional
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Registra un adicional y vincúlalo a un equipo.
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
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
                    >
                        <CloseOutlined />
                    </button>
                </div>

                {/* BODY */}
                <div className="overflow-y-auto p-5 sm:p-6">

                    {error && (
                        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                        {/* EQUIPO */}
                        <div className="space-y-2 md:col-span-2">

                            <label className="text-sm font-semibold text-slate-700">
                                Equipo asociado
                                <span className="ml-1 text-rose-500">
                                    *
                                </span>
                            </label>

                            <div className="relative">
                                <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                                <input
                                    value={
                                        equipoSearch
                                    }
                                    onChange={(
                                        e
                                    ) =>
                                        setEquipoSearch(
                                            e.target
                                                .value
                                        )
                                    }
                                    placeholder="Buscar equipo por serial, marca o modelo..."
                                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                                />
                            </div>

                            <select
                                value={
                                    equipoId ??
                                    ""
                                }
                                onChange={(
                                    e
                                ) =>
                                    setEquipoId(
                                        e.target
                                            .value
                                            ? Number(
                                                e.target
                                                    .value
                                            )
                                            : null
                                    )
                                }
                                disabled={
                                    loadingEquipos
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                            >
                                <option value="">
                                    {loadingEquipos
                                        ? "Cargando equipos..."
                                        : "Seleccionar equipo"}
                                </option>

                                {equiposFiltrados.map(
                                    (
                                        equipo
                                    ) => (
                                        <option
                                            key={
                                                equipo.id_equipo
                                            }
                                            value={
                                                equipo.id_equipo
                                            }
                                        >
                                            Equipo #
                                            {
                                                equipo.id_equipo
                                            }
                                            {" · "}
                                            {equipo.serial ||
                                                "Sin serial"}
                                            {" · "}
                                            {equipo.marca ||
                                                ""}
                                            {" "}
                                            {equipo.modelo ||
                                                ""}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        {/* TIPO */}
                        <div className="space-y-2">
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
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                            >
                                {TIPOS.map(
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
                                            {value}
                                        </option>
                                    )
                                )}
                            </select>
                        </div>

                        {/* ESTADO */}
                        <div className="space-y-2">
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
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                            >
                                {ESTADOS.map(
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

                        {/* SERIAL */}
                        <div className="space-y-2">
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
                                    )
                                }
                                placeholder="Serial del adicional"
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                            />
                        </div>

                        {/* CANTIDAD */}
                        <div className="space-y-2">
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
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                            />
                        </div>

                        {/* DESCRIPCIÓN */}
                        <div className="space-y-2 md:col-span-2">

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
                                    500
                                }
                                rows={4}
                                placeholder="Descripción, modelo, características, etc."
                                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
                            />

                            <div className="text-right text-xs text-slate-400">
                                {
                                    descripcion.length
                                }
                                /500
                            </div>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">

                    <button
                        type="button"
                        onClick={
                            handleClose
                        }
                        disabled={
                            saving
                        }
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
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