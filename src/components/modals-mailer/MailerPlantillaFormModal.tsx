// src/components/modals-mailer/MailerPlantillaFormModal.tsx

import {
    useEffect,
    useState,
} from "react";

import {
    notification,
} from "antd";

import {
    actualizarPlantillaCorreo,
    crearPlantillaCorreo,
} from "./mailer.api";

import type {
    PlantillaCorreo,
    PlantillaCorreoDetalle,
} from "./mailer.types";

type Props = {
    open: boolean;

    plantilla?:
    PlantillaCorreo |
    PlantillaCorreoDetalle |
    null;

    onClose:
    () => void;

    onSaved:
    (
        plantilla:
            PlantillaCorreoDetalle
    ) => void;
};

export default function MailerPlantillaFormModal({
    open,
    plantilla,
    onClose,
    onSaved,
}: Props) {

    const editing =
        !!plantilla;


    const [
        nombre,
        setNombre,
    ] =
        useState(
            ""
        );

    const [
        descripcion,
        setDescripcion,
    ] =
        useState(
            ""
        );

    const [
        file,
        setFile,
    ] =
        useState<
            File |
            null
        >(
            null
        );

    const [
        saving,
        setSaving,
    ] =
        useState(
            false
        );


    useEffect(
        () => {

            if (
                !open
            ) {
                return;
            }

            setNombre(
                plantilla?.nombre ??
                ""
            );

            setDescripcion(
                plantilla?.descripcion ??
                ""
            );

            setFile(
                null
            );

        },
        [
            open,
            plantilla,
        ]
    );


    async function handleSave() {

        const nombreTrim =
            nombre.trim();

        if (
            !nombreTrim
        ) {

            notification.warning({
                message:
                    "Nombre requerido",
            });

            return;
        }


        if (
            !editing &&
            !file
        ) {

            notification.warning({
                message:
                    "Archivo requerido",

                description:
                    "Selecciona un archivo HTML, PNG, JPG, JPEG o WEBP.",
            });

            return;
        }


        try {

            setSaving(
                true
            );


            if (
                editing &&
                plantilla
            ) {

                const actualizado =
                    await actualizarPlantillaCorreo(
                        plantilla.id,
                        {
                            nombre:
                                nombreTrim,

                            descripcion:
                                descripcion.trim() ||
                                null,
                        }
                    );

                notification.success({
                    message:
                        "Plantilla actualizada",
                });

                onSaved(
                    actualizado
                );

                onClose();

                return;
            }


            if (
                !file
            ) {
                return;
            }


            const creada =
                await crearPlantillaCorreo({
                    nombre:
                        nombreTrim,

                    file,

                    ...(descripcion.trim()
                        ? {
                            descripcion:
                                descripcion.trim(),
                        }
                        : {}),
                });

            notification.success({
                message:
                    "Plantilla creada",

                description:
                    "La plantilla quedó disponible para futuros envíos.",
            });

            onSaved(
                creada
            );

            onClose();

        } catch (
        error: any
        ) {

            notification.error({
                message:
                    editing
                        ? "No fue posible actualizar la plantilla"
                        : "No fue posible crear la plantilla",

                description:
                    error?.response
                        ?.data
                        ?.message ??
                    error?.message ??
                    "Error desconocido",
            });

        } finally {

            setSaving(
                false
            );
        }
    }


    if (
        !open
    ) {
        return null;
    }


    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4">

            <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">

                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">

                    <div>

                        <h3 className="text-lg font-black text-slate-900">
                            {editing
                                ? "Editar plantilla"
                                : "Nueva plantilla"}
                        </h3>

                        <p className="text-xs text-slate-400">
                            {editing
                                ? "Modifica los datos de la plantilla."
                                : "Importa HTML, PNG, JPG, JPEG o WEBP."}
                        </p>

                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50"
                    >
                        Cerrar
                    </button>

                </div>


                <div className="space-y-5 px-6 py-6">

                    <div>

                        <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                            Nombre
                        </label>

                        <input
                            value={
                                nombre
                            }
                            onChange={
                                (
                                    event
                                ) =>
                                    setNombre(
                                        event.target.value
                                    )
                            }
                            className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                        />

                    </div>


                    <div>

                        <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                            Descripción
                        </label>

                        <textarea
                            value={
                                descripcion
                            }
                            onChange={
                                (
                                    event
                                ) =>
                                    setDescripcion(
                                        event.target.value
                                    )
                            }
                            rows={
                                4
                            }
                            className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                        />

                    </div>


                    {!editing && (

                        <div>

                            <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
                                Archivo
                            </label>

                            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-cyan-200 bg-cyan-50/50 px-6 py-8 text-center transition hover:bg-cyan-50">

                                <span className="text-sm font-semibold text-cyan-700">
                                    {file
                                        ? file.name
                                        : "Seleccionar archivo"}
                                </span>

                                <span className="mt-1 text-xs text-slate-400">
                                    HTML · PNG · JPG · JPEG · WEBP · máximo 10 MB
                                </span>

                                <input
                                    type="file"
                                    accept=".html,.htm,.png,.jpg,.jpeg,.webp,text/html,image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    onChange={
                                        (
                                            event
                                        ) =>
                                            setFile(
                                                event
                                                    .target
                                                    .files
                                                ?.[0] ??
                                                null
                                            )
                                    }
                                />

                            </label>

                        </div>
                    )}


                    {editing &&
                        plantilla && (

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">

                                Archivo actual:{" "}

                                <span className="font-semibold text-slate-700">
                                    {plantilla.nombreArchivo ??
                                        "—"}
                                </span>

                                <div className="mt-1">
                                    El archivo de la plantilla no se reemplaza desde la edición; solo nombre y descripción.
                                </div>

                            </div>

                        )}

                </div>


                <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        disabled={
                            saving
                        }
                        className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        onClick={
                            () =>
                                void handleSave()
                        }
                        disabled={
                            saving
                        }
                        className="rounded-xl bg-cyan-600 px-5 py-2 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-50"
                    >
                        {saving
                            ? "Guardando..."
                            : editing
                                ? "Guardar cambios"
                                : "Crear plantilla"}
                    </button>

                </div>

            </div>

        </div>
    );
}