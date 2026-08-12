// src/components/modals-equipos/adicionales/EditarAdicionalModal.tsx

import {
    CloseOutlined,
    LoadingOutlined,
    SaveOutlined,
    SearchOutlined,
} from "@ant-design/icons";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import { http } from "../../../service/http";

import type {
    AdicionalRow,
    EstadoAdicional,
} from "./adicionales.types";

type Props = {
    open: boolean;
    row: AdicionalRow | null;
    onClose: () => void;
    onSaved: () => void | Promise<void>;
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
    items: EquipoSelectorRow[];
};

const TIPOS = [
    "MONITOR",
    "IMPRESORA",
    "TECLADO",
    "MOUSE",
    "DOCK",
    "CARGADOR",
    "OTRO",
];

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

export default function EditarAdicionalModal({
    open,
    row,
    onClose,
    onSaved,
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
    ] = useState("");

    const [
        descripcion,
        setDescripcion,
    ] = useState("");

    const [
        cantidad,
        setCantidad,
    ] = useState(1);

    const [
        serialAdicional,
        setSerialAdicional,
    ] = useState("");

    const [
        estado,
        setEstado,
    ] =
        useState<EstadoAdicional>(
            "ASIGNADO"
        );

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
       CARGAR ROW
    ===================================================== */

    useEffect(() => {
        if (
            !open ||
            !row
        ) {
            return;
        }

        setEquipoId(
            row.equipoId
        );

        setTipo(
            row.tipo
        );

        setDescripcion(
            String(
                row.descripcion ??
                ""
            )
                .replace(
                    /^\[AGENTE\]\s*/i,
                    ""
                )
                .trim()
        );

        setCantidad(
            row.cantidad ||
            1
        );

        setSerialAdicional(
            row.serialAdicional ??
            ""
        );

        setEstado(
            row.estado
        );

        setEquipoSearch("");
        setError(null);
    }, [
        open,
        row,
    ]);

    /* =====================================================
       EQUIPOS
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
                    "[EditarAdicionalModal]",
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
                    const text = [
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

                    return text.includes(
                        q
                    );
                }
            );
        }, [
            equipos,
            equipoSearch,
        ]);

    /* =====================================================
       GUARDAR
    ===================================================== */

    async function handleSave() {
        if (
            !row ||
            !equipoId
        ) {
            return;
        }

        if (!tipo.trim()) {
            setError(
                "El tipo es obligatorio."
            );
            return;
        }

        try {
            setSaving(true);
            setError(null);

            await http.patch(
                `/equipos-adicionales/${row.id}`,
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

            await onSaved();
        } catch (err: any) {
            setError(
                err?.response
                    ?.data
                    ?.error ||
                err?.message ||
                "No se pudo actualizar el adicional."
            );
        } finally {
            setSaving(false);
        }
    }

    if (
        !open ||
        !row
    ) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">

            <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-indigo-200 bg-white shadow-2xl">

                {/* HEADER */}
                <div className="flex items-start justify-between border-b border-indigo-100 bg-gradient-to-r from-indigo-50 to-cyan-50 px-5 py-4 sm:px-6">

                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                            Adicional #
                            {row.id}
                        </div>

                        <h2 className="mt-1 text-xl font-bold text-slate-900">
                            Editar adicional
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            Modifica la información o reasigna el adicional a otro equipo.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        disabled={
                            saving
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    >
                        <CloseOutlined />
                    </button>
                </div>

                <div className="overflow-y-auto p-5 sm:p-6">

                    {row.origen ===
                        "AGENTE" && (
                            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                Este adicional fue detectado automáticamente por el agente.
                                Al modificarlo pasará a ser administrado manualmente.
                            </div>
                        )}

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
                                    placeholder="Buscar equipo..."
                                    className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
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
                                        Number(
                                            e.target
                                                .value
                                        )
                                    )
                                }
                                disabled={
                                    loadingEquipos
                                }
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                            >
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

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">
                                Tipo
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
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
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
                                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
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
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                            />
                        </div>

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
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                            />
                        </div>

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
                                rows={4}
                                maxLength={
                                    500
                                }
                                className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        disabled={
                            saving
                        }
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700"
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            void handleSave()
                        }
                        disabled={
                            saving
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                    >
                        {saving ? (
                            <LoadingOutlined />
                        ) : (
                            <SaveOutlined />
                        )}

                        {saving
                            ? "Guardando..."
                            : "Guardar cambios"}
                    </button>
                </div>
            </div>
        </div>
    );
}