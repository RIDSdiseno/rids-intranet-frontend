// src/components/modals-cotizaciones/cotizaciones-masivas/PlantillasMasivasModal.tsx

import React from "react";
import { CloseCircleOutlined } from "@ant-design/icons";

type Props = {
    show: boolean;
    onClose: () => void;
    plantillas: any[];
    loading: boolean;
    generandoPlantillaId: number | null;
    onPreview: (plantilla: any) => void;
    onGenerar: (plantillaId: number) => void;
    onEditar: (plantilla: any) => void;
    onDesactivar: (plantillaId: number) => void;
};

export default function PlantillasMasivasModal({
    show,
    onClose,
    plantillas,
    loading,
    generandoPlantillaId,
    onPreview,
    onGenerar,
    onEditar,
    onDesactivar,
}: Props) {
    if (!show) return null;

    // Helper para mostrar fecha de creación sin romper si viene null/undefined.
    const formatearFecha = (fecha?: string | null) => {
        if (!fecha) return "---";

        return new Date(fecha).toLocaleDateString("es-CL");
    };

    // Helper para no repetir las acciones en vista tipo card y tabla.
    // En pantallas medianas/grandes, los botones se pueden ordenar en grilla
    // para evitar que fuercen el ancho de la tabla.
    const renderAcciones = (plantilla: any, mobile = false) => (
        <div
            className={
                mobile
                    ? "grid grid-cols-2 gap-2"
                    : "grid grid-cols-2 gap-2 2xl:flex 2xl:flex-wrap 2xl:justify-end"
            }
        >
            {/* Botón para revisar detalle de la plantilla antes de generar */}
            <button
                type="button"
                onClick={() => onPreview(plantilla)}
                className="w-full rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
                Vista previa
            </button>

            {/* Botón para crear cotizaciones reales desde la plantilla */}
            <button
                type="button"
                onClick={() => onGenerar(plantilla.id)}
                disabled={generandoPlantillaId === plantilla.id}
                className="w-full rounded-full bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {generandoPlantillaId === plantilla.id ? "Generando..." : "Generar"}
            </button>

            {/* Botón para abrir la plantilla en modo edición */}
            <button
                type="button"
                onClick={() => onEditar(plantilla)}
                className="w-full rounded-full border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
            >
                Editar
            </button>

            {/* Botón para desactivar la plantilla */}
            <button
                type="button"
                onClick={() => onDesactivar(plantilla.id)}
                className="w-full rounded-full border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
            >
                Desactivar
            </button>
        </div>
    );

    return (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 px-4 py-6">
            <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* Header sticky para que el botón cerrar siempre quede visible */}
                <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
                            Plantillas de cotizaciones masivas
                        </h2>

                        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                            Selecciona una plantilla guardada para generar cotizaciones nuevamente.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar modal de plantillas masivas"
                        className="shrink-0 rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
                    >
                        <CloseCircleOutlined />
                    </button>
                </div>

                {/* 
                    Cuerpo con scroll interno:
                    Así el modal no se sale de pantallas pequeñas.
                */}
                <div className="max-h-[70vh] overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                    {loading ? (
                        <div className="py-10 text-center text-sm text-slate-500">
                            Cargando plantillas...
                        </div>
                    ) : plantillas.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center sm:px-6">
                            <p className="text-sm font-medium text-slate-600">
                                No hay plantillas masivas guardadas.
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                                Puedes crear una desde el botón “Nueva plantilla”.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* 
    Vista CARD:
    Se usa hasta pantallas grandes para evitar scroll horizontal
    en notebooks, tablets y pantallas medianas.
*/}
                            <div className="space-y-3 xl:hidden">
                                {plantillas.map((plantilla) => (
                                    <article
                                        key={plantilla.id}
                                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h3 className="break-words text-base font-bold text-slate-800">
                                                    {plantilla.nombre}
                                                </h3>

                                                {plantilla.descripcion && (
                                                    <p className="mt-1 break-words text-xs text-slate-500">
                                                        {plantilla.descripcion}
                                                    </p>
                                                )}

                                                <p className="mt-2 text-xs text-slate-400">
                                                    Creada: {formatearFecha(plantilla.createdAt)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Resumen numérico en mobile */}
                                        <div className="mt-4 grid grid-cols-3 gap-2">
                                            <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                                                <p className="text-[11px] font-semibold uppercase text-slate-400">
                                                    Clientes
                                                </p>
                                                <p className="mt-1 text-base font-bold text-slate-800">
                                                    {plantilla.entidades?.length ?? 0}
                                                </p>
                                            </div>

                                            <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                                                <p className="text-[11px] font-semibold uppercase text-slate-400">
                                                    Productos
                                                </p>
                                                <p className="mt-1 text-base font-bold text-slate-800">
                                                    {plantilla.items?.length ?? 0}
                                                </p>
                                            </div>

                                            <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                                                <p className="text-[11px] font-semibold uppercase text-slate-400">
                                                    Usos
                                                </p>
                                                <p className="mt-1 text-base font-bold text-slate-800">
                                                    {plantilla.ejecuciones?.length ?? 0}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-4">
                                            {renderAcciones(plantilla, true)}
                                        </div>
                                    </article>
                                ))}
                            </div>

                            {/* 
    Vista TABLA:
    Solo se muestra en pantallas grandes.
    Se evita min-w para que no fuerce scroll horizontal innecesario.
*/}
                            <div className="hidden rounded-xl border border-slate-200 xl:block">
                                <table className="w-full table-fixed text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            {/* Columna principal más ancha para nombre/descripción */}
                                            <th className="w-[34%] px-4 py-3 text-left font-semibold text-slate-600">
                                                Nombre
                                            </th>

                                            {/* Columnas numéricas compactas */}
                                            <th className="w-[12%] px-4 py-3 text-center font-semibold text-slate-600">
                                                Clientes
                                            </th>

                                            <th className="w-[12%] px-4 py-3 text-center font-semibold text-slate-600">
                                                Productos
                                            </th>

                                            <th className="w-[12%] px-4 py-3 text-center font-semibold text-slate-600">
                                                Ejecuciones
                                            </th>

                                            {/* Columna de acciones más amplia para evitar corte */}
                                            <th className="w-[30%] px-4 py-3 text-right font-semibold text-slate-600">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-200">
                                        {plantillas.map((plantilla) => (
                                            <tr key={plantilla.id} className="hover:bg-slate-50">
                                                <td className="max-w-[360px] px-4 py-3">
                                                    <div className="break-words font-semibold text-slate-800">
                                                        {plantilla.nombre}
                                                    </div>

                                                    {plantilla.descripcion && (
                                                        <div className="mt-0.5 break-words text-xs text-slate-500">
                                                            {plantilla.descripcion}
                                                        </div>
                                                    )}

                                                    <div className="mt-1 text-xs text-slate-400">
                                                        Creada: {formatearFecha(plantilla.createdAt)}
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3 text-center">
                                                    {plantilla.entidades?.length ?? 0}
                                                </td>

                                                <td className="px-4 py-3 text-center">
                                                    {plantilla.items?.length ?? 0}
                                                </td>

                                                <td className="px-4 py-3 text-center">
                                                    {plantilla.ejecuciones?.length ?? 0}
                                                </td>

                                                {/* Acciones con ancho controlado para que los botones no fuercen scroll */}
                                                <td className="px-4 py-3 align-middle">
                                                    {renderAcciones(plantilla)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}