// src/components/modals-mailer/MailerPlantillasModal.tsx

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    DeleteOutlined,
    EditOutlined,
    EyeOutlined,
    PlusOutlined,
    ReloadOutlined,
    SearchOutlined,
} from "@ant-design/icons";

import {
    Modal,
    notification,
} from "antd";

import {
    eliminarPlantillaCorreo,
    getPlantillaCorreo,
    getPlantillasCorreo,
} from "./mailer.api";

import type {
    PlantillaCorreo,
    PlantillaCorreoDetalle,
} from "./mailer.types";

import MailerPlantillaFormModal
    from "./MailerPlantillaFormModal";

import MailerPlantillaPreviewModal
    from "./MailerPlantillaPreviewModal";


type Props = {
    open: boolean;

    selectedId:
    number |
    null;

    onClose:
    () => void;

    onSelect:
    (
        plantilla:
            PlantillaCorreoDetalle
    ) => void;
};


export default function MailerPlantillasModal({
    open,
    selectedId,
    onClose,
    onSelect,
}: Props) {

    const [
        plantillas,
        setPlantillas,
    ] =
        useState<
            PlantillaCorreo[]
        >(
            []
        );

    const [
        loading,
        setLoading,
    ] =
        useState(
            false
        );

    const [
        search,
        setSearch,
    ] =
        useState(
            ""
        );

    const [
        formOpen,
        setFormOpen,
    ] =
        useState(
            false
        );

    const [
        editing,
        setEditing,
    ] =
        useState<
            PlantillaCorreo |
            null
        >(
            null
        );

    const [
        previewOpen,
        setPreviewOpen,
    ] =
        useState(
            false
        );

    const [
        preview,
        setPreview,
    ] =
        useState<
            PlantillaCorreoDetalle |
            null
        >(
            null
        );


    async function load() {

        try {

            setLoading(
                true
            );

            const data =
                await getPlantillasCorreo();

            setPlantillas(
                data
            );

        } catch (
        error: any
        ) {

            notification.error({
                message:
                    "Error cargando plantillas",

                description:
                    error?.response
                        ?.data
                        ?.message ??
                    error?.message ??
                    "Error desconocido",
            });

        } finally {

            setLoading(
                false
            );
        }
    }


    useEffect(
        () => {

            if (
                open
            ) {
                void load();
            }

        },
        [
            open,
        ]
    );


    const filtered =
        useMemo(
            () => {

                const query =
                    search
                        .trim()
                        .toLowerCase();

                if (
                    !query
                ) {
                    return plantillas;
                }

                return plantillas.filter(
                    (
                        plantilla
                    ) =>
                        plantilla.nombre
                            .toLowerCase()
                            .includes(
                                query
                            ) ||

                        String(
                            plantilla.descripcion ??
                            ""
                        )
                            .toLowerCase()
                            .includes(
                                query
                            ) ||

                        plantilla.tipo
                            .toLowerCase()
                            .includes(
                                query
                            )
                );
            },
            [
                search,
                plantillas,
            ]
        );


    async function handleUse(
        plantilla:
            PlantillaCorreo
    ) {

        try {

            const detalle =
                await getPlantillaCorreo(
                    plantilla.id
                );

            onSelect(
                detalle
            );

            onClose();

        } catch (
        error: any
        ) {

            notification.error({
                message:
                    "No fue posible seleccionar la plantilla",

                description:
                    error?.response
                        ?.data
                        ?.message ??
                    error?.message,
            });
        }
    }


    async function handlePreview(
        plantilla:
            PlantillaCorreo
    ) {

        try {

            const detalle =
                await getPlantillaCorreo(
                    plantilla.id
                );

            setPreview(
                detalle
            );

            setPreviewOpen(
                true
            );

        } catch (
        error: any
        ) {

            notification.error({
                message:
                    "No fue posible cargar la vista previa",

                description:
                    error?.response
                        ?.data
                        ?.message ??
                    error?.message,
            });
        }
    }


    function handleDelete(
        plantilla:
            PlantillaCorreo
    ) {

        Modal.confirm({
            title:
                "Eliminar plantilla",

            content:
                `¿Seguro que deseas eliminar "${plantilla.nombre}"? Esta acción también eliminará el archivo almacenado.`,

            okText:
                "Eliminar",

            cancelText:
                "Cancelar",

            okType:
                "danger",

            async onOk() {

                try {

                    await eliminarPlantillaCorreo(
                        plantilla.id
                    );

                    notification.success({
                        message:
                            "Plantilla eliminada",
                    });

                    await load();

                } catch (
                error: any
                ) {

                    notification.error({
                        message:
                            "No fue posible eliminar la plantilla",

                        description:
                            error?.response
                                ?.data
                                ?.message ??
                            error?.message,
                    });

                    throw error;
                }
            },
        });
    }


    if (
        !open
    ) {
        return null;
    }


    return (
        <>

            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4">

                <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

                    {/* HEADER */}

                    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">

                        <div>

                            <h3 className="text-lg font-black text-slate-900">
                                Plantillas del Mailer
                            </h3>

                            <p className="text-xs text-slate-400">
                                Crea, consulta, edita, elimina y selecciona plantillas reutilizables.
                            </p>

                        </div>


                        <div className="flex items-center gap-2">

                            <button
                                type="button"
                                onClick={
                                    () =>
                                        void load()
                                }
                                disabled={
                                    loading
                                }
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
                            >
                                <ReloadOutlined
                                    className={
                                        loading
                                            ? "animate-spin"
                                            : ""
                                    }
                                />
                            </button>

                            <button
                                type="button"
                                onClick={
                                    onClose
                                }
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
                            >
                                Cerrar
                            </button>

                        </div>

                    </div>


                    {/* TOOLBAR */}

                    <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/60 px-6 py-4">

                        <div className="relative flex-1">

                            <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                            <input
                                value={
                                    search
                                }
                                onChange={
                                    (
                                        event
                                    ) =>
                                        setSearch(
                                            event.target.value
                                        )
                                }
                                placeholder="Buscar plantilla..."
                                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                            />

                        </div>

                        <button
                            type="button"
                            onClick={
                                () => {

                                    setEditing(
                                        null
                                    );

                                    setFormOpen(
                                        true
                                    );
                                }
                            }
                            className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-600 px-4 text-sm font-bold text-white hover:bg-cyan-500"
                        >
                            <PlusOutlined />

                            Nueva plantilla
                        </button>

                    </div>


                    {/* LISTADO */}

                    <div className="flex-1 overflow-auto p-6">

                        {loading ? (

                            <div className="py-16 text-center text-sm text-slate-400">
                                Cargando plantillas...
                            </div>

                        ) : filtered.length ===
                            0 ? (

                            <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center">

                                <p className="font-semibold text-slate-600">
                                    No hay plantillas
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                    Crea la primera plantilla para comenzar.
                                </p>

                            </div>

                        ) : (

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">

                                {filtered.map(
                                    (
                                        plantilla
                                    ) => {

                                        const selected =
                                            selectedId ===
                                            plantilla.id;

                                        return (
                                            <div
                                                key={
                                                    plantilla.id
                                                }
                                                className={
                                                    `overflow-hidden rounded-2xl border bg-white shadow-sm transition ${selected
                                                        ? "border-cyan-400 ring-2 ring-cyan-100"
                                                        : "border-slate-200 hover:border-cyan-200"
                                                    }`
                                                }
                                            >

                                                {/* THUMBNAIL */}

                                                <div className="flex h-44 items-center justify-center overflow-hidden bg-slate-100">

                                                    {plantilla.tipo ===
                                                        "IMAGEN" &&
                                                        plantilla.previewUrl ? (

                                                        <img
                                                            src={
                                                                plantilla.previewUrl
                                                            }
                                                            alt={
                                                                plantilla.nombre
                                                            }
                                                            className="h-full w-full object-contain"
                                                        />

                                                    ) : (

                                                        <div className="text-center">

                                                            <div className="text-3xl font-black text-slate-300">
                                                                HTML
                                                            </div>

                                                            <div className="mt-1 text-xs text-slate-400">
                                                                Plantilla HTML
                                                            </div>

                                                        </div>

                                                    )}

                                                </div>


                                                <div className="p-4">

                                                    <div className="flex items-start justify-between gap-3">

                                                        <div className="min-w-0">

                                                            <p className="truncate font-bold text-slate-800">
                                                                {
                                                                    plantilla.nombre
                                                                }
                                                            </p>

                                                            <p className="mt-0.5 text-xs text-slate-400">
                                                                {
                                                                    plantilla.tipo
                                                                }

                                                                {plantilla.bytes
                                                                    ? ` · ${Math.round(
                                                                        plantilla.bytes /
                                                                        1024
                                                                    )} KB`
                                                                    : ""}
                                                            </p>

                                                        </div>

                                                        {selected && (

                                                            <span className="rounded-full bg-cyan-100 px-2 py-1 text-[10px] font-bold text-cyan-700">
                                                                En uso
                                                            </span>

                                                        )}

                                                    </div>


                                                    {plantilla.descripcion && (

                                                        <p className="mt-3 line-clamp-2 min-h-[32px] text-xs text-slate-500">
                                                            {
                                                                plantilla.descripcion
                                                            }
                                                        </p>

                                                    )}


                                                    <div className="mt-4 flex flex-wrap gap-2">

                                                        <button
                                                            type="button"
                                                            onClick={
                                                                () =>
                                                                    void handlePreview(
                                                                        plantilla
                                                                    )
                                                            }
                                                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                                                        >
                                                            <EyeOutlined />

                                                            Ver
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={
                                                                () => {

                                                                    setEditing(
                                                                        plantilla
                                                                    );

                                                                    setFormOpen(
                                                                        true
                                                                    );
                                                                }
                                                            }
                                                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                                                        >
                                                            <EditOutlined />

                                                            Editar
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={
                                                                () =>
                                                                    handleDelete(
                                                                        plantilla
                                                                    )
                                                            }
                                                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
                                                        >
                                                            <DeleteOutlined />

                                                            Eliminar
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={
                                                                () =>
                                                                    void handleUse(
                                                                        plantilla
                                                                    )
                                                            }
                                                            className="ml-auto rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-500"
                                                        >
                                                            Usar
                                                        </button>

                                                    </div>

                                                </div>

                                            </div>
                                        );
                                    }
                                )}

                            </div>

                        )}

                    </div>

                </div>

            </div>


            <MailerPlantillaFormModal
                open={
                    formOpen
                }
                plantilla={
                    editing
                }
                onClose={
                    () => {

                        setFormOpen(
                            false
                        );

                        setEditing(
                            null
                        );
                    }
                }
                onSaved={
                    async (
                        plantilla
                    ) => {

                        await load();

                        if (
                            selectedId ===
                            plantilla.id
                        ) {
                            onSelect(
                                plantilla
                            );
                        }
                    }
                }
            />


            <MailerPlantillaPreviewModal
                open={
                    previewOpen
                }
                plantilla={
                    preview
                }
                onClose={
                    () => {

                        setPreviewOpen(
                            false
                        );

                        setPreview(
                            null
                        );
                    }
                }
            />

        </>
    );
}