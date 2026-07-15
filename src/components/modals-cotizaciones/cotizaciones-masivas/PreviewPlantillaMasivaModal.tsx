// src/components/modals-cotizaciones/cotizaciones-masivas/PreviewPlantillaMasivaModal.tsx

import React from "react";
import { CloseCircleOutlined } from "@ant-design/icons";
import { formatearPrecio } from "../utils";

type Props = {
    show: boolean;
    plantilla: any | null;
    onClose: () => void;
    onGenerar: (plantillaId: number) => void;
};

const IVA_CHILE = 0.19;

const redondearCLP = (valor: number) => {
    // Redondea montos para mostrarlos igual que el backend.
    return Math.round(Number(valor || 0));
};

const obtenerPrecioProductoPlantilla = (producto: any) => {
    /*
        Mismo criterio del backend:
        - Usa precioTotal si existe.
        - Si no, calcula precio + porcGanancia.
    */

    const precioCosto = Number(producto?.precio ?? 0);
    const precioTotal =
        producto?.precioTotal != null ? Number(producto.precioTotal) : null;

    const porcGanancia = Number(producto?.porcGanancia ?? 0);

    if (precioTotal != null && precioTotal > 0) {
        return redondearCLP(precioTotal);
    }

    return redondearCLP(precioCosto * (1 + porcGanancia / 100));
};

const calcularItemPreview = (producto: any, cantidadInput: number) => {
    // Como ProductoGestioo no tiene tieneIVA, asumimos IVA aplicado.
    const cantidad = Number(cantidadInput || 0);
    const precioVenta = obtenerPrecioProductoPlantilla(producto);
    const subtotal = redondearCLP(precioVenta * cantidad);
    const iva = redondearCLP(subtotal * IVA_CHILE);

    return {
        precioVenta,
        subtotal,
        iva,
        total: subtotal + iva,
    };
};

const calcularTotalEntidadPlantilla = (entidadPlantilla: any) => {
    const cantidades = entidadPlantilla?.cantidades ?? [];

    return cantidades.reduce((acc: number, cantidad: any) => {
        const item = calcularItemPreview(
            cantidad.producto,
            Number(cantidad.cantidad ?? 0)
        );

        return acc + item.total;
    }, 0);
};

const calcularTotalPlantilla = (plantilla: any) => {
    const entidadesPlantilla = plantilla?.entidades ?? [];

    return entidadesPlantilla.reduce((acc: number, entidadPlantilla: any) => {
        return acc + calcularTotalEntidadPlantilla(entidadPlantilla);
    }, 0);
};

export default function PreviewPlantillaMasivaModal({
    show,
    plantilla,
    onClose,
    onGenerar,
}: Props) {
    if (!show || !plantilla) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 px-3 py-4 sm:px-4 sm:py-6">
            {/*
            Contenedor principal:
            - max-h limita el modal al alto visible.
            - flex-col permite separar header, body y footer.
            - overflow-hidden mantiene el diseño sin salirse de la pantalla.
        */}
            <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* Header fijo del modal */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
                            Vista previa de plantilla
                        </h2>

                        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                            Revisa los clientes, productos y cantidades antes de generar las cotizaciones.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar vista previa de plantilla"
                        className="shrink-0 rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
                    >
                        <CloseCircleOutlined />
                    </button>
                </div>

                {/*
                Body con scroll interno:
                Esto evita que el modal se corte en pantallas pequeñas.
            */}
                <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                    {/* Resumen superior responsive */}
                    <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase text-slate-500">
                                    Nombre
                                </p>
                                <p className="mt-1 break-words font-semibold text-slate-800">
                                    {plantilla.nombre}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-semibold uppercase text-slate-500">
                                    Clientes
                                </p>
                                <p className="mt-1 font-semibold text-slate-800">
                                    {plantilla.entidades?.length ?? 0}
                                </p>
                            </div>

                            <div>
                                <p className="text-xs font-semibold uppercase text-slate-500">
                                    Total estimado
                                </p>
                                <p className="mt-1 font-bold text-emerald-700">
                                    {formatearPrecio(
                                        calcularTotalPlantilla(plantilla),
                                        "CLP",
                                        1
                                    )}
                                </p>
                            </div>
                        </div>

                        {plantilla.descripcion && (
                            <div className="mt-4">
                                <p className="text-xs font-semibold uppercase text-slate-500">
                                    Descripción
                                </p>
                                <p className="mt-1 break-words text-sm text-slate-700">
                                    {plantilla.descripcion}
                                </p>
                            </div>
                        )}
                    </div>

                    {/*
                    Vista MOBILE/TABLET:
                    Se muestran cards para evitar tablas apretadas.
                */}
                    <div className="space-y-4 xl:hidden">
                        {(plantilla.entidades ?? []).map((entidadPlantilla: any) => {
                            const totalEntidad =
                                calcularTotalEntidadPlantilla(entidadPlantilla);

                            return (
                                <article
                                    key={entidadPlantilla.id}
                                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                                >
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="min-w-0">
                                            <h3 className="break-words font-bold text-slate-800">
                                                {entidadPlantilla.entidad?.nombre ?? "Cliente sin nombre"}
                                            </h3>

                                            {entidadPlantilla.entidad?.rut && (
                                                <p className="mt-1 text-xs text-slate-500">
                                                    RUT: {entidadPlantilla.entidad.rut}
                                                </p>
                                            )}

                                            {entidadPlantilla.entidad?.correo && (
                                                <p className="break-words text-xs text-slate-500">
                                                    {entidadPlantilla.entidad.correo}
                                                </p>
                                            )}
                                        </div>

                                        <div className="rounded-xl bg-emerald-50 px-3 py-2 text-left sm:text-right">
                                            <p className="text-[11px] font-semibold uppercase text-emerald-600">
                                                Total cliente
                                            </p>
                                            <p className="font-bold text-emerald-700">
                                                {formatearPrecio(totalEntidad, "CLP", 1)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Productos del cliente en formato card */}
                                    <div className="mt-4 space-y-2">
                                        {(entidadPlantilla.cantidades ?? []).map((cantidad: any) => {
                                            const producto = cantidad.producto;
                                            const cantidadNumero = Number(cantidad.cantidad ?? 0);
                                            const calculado = calcularItemPreview(producto, cantidadNumero);
                                            const precio = calculado.precioVenta;
                                            const subtotal = calculado.subtotal;
                                            const iva = calculado.iva;
                                            const total = calculado.total;

                                            return (
                                                <div
                                                    key={`${entidadPlantilla.id}-${cantidad.productoId}`}
                                                    className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="break-words font-semibold text-slate-800">
                                                            {producto?.nombre ?? "Producto sin nombre"}
                                                        </p>

                                                        {producto?.descripcion && (
                                                            <p className="mt-1 break-words text-xs text-slate-500">
                                                                {producto.descripcion}
                                                            </p>
                                                        )}
                                                    </div>

                                                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-600 min-[420px]:grid-cols-3">
                                                        <div className="rounded-lg bg-white px-3 py-2">
                                                            <p className="text-slate-400">Cantidad</p>
                                                            <p className="font-bold text-slate-800">
                                                                {cantidadNumero}
                                                            </p>
                                                        </div>

                                                        <div className="rounded-lg bg-white px-3 py-2">
                                                            <p className="text-slate-400">Precio</p>
                                                            <p className="font-bold text-slate-800">
                                                                {formatearPrecio(precio, "CLP", 1)}
                                                            </p>
                                                        </div>

                                                        <div className="rounded-lg bg-white px-3 py-2">
                                                            <p className="text-slate-400">Subtotal</p>
                                                            <p className="font-bold text-slate-800">
                                                                {formatearPrecio(subtotal, "CLP", 1)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    {/*
                    Vista DESKTOP:
                    La tabla solo aparece en pantallas grandes para evitar scroll horizontal.
                */}
                    <div className="hidden rounded-xl border border-slate-200 xl:block">
                        <table className="w-full table-fixed text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="w-[24%] px-4 py-3 text-left font-semibold text-slate-600">
                                        Cliente
                                    </th>
                                    <th className="w-[56%] px-4 py-3 text-left font-semibold text-slate-600">
                                        Productos / cantidades
                                    </th>
                                    <th className="w-[20%] px-4 py-3 text-right font-semibold text-slate-600">
                                        Total estimado
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-200">
                                {(plantilla.entidades ?? []).map((entidadPlantilla: any) => {
                                    const totalEntidad =
                                        calcularTotalEntidadPlantilla(entidadPlantilla);

                                    return (
                                        <tr key={entidadPlantilla.id} className="align-top">
                                            <td className="px-4 py-4">
                                                <div className="break-words font-semibold text-slate-800">
                                                    {entidadPlantilla.entidad?.nombre ?? "Cliente sin nombre"}
                                                </div>

                                                {entidadPlantilla.entidad?.rut && (
                                                    <div className="text-xs text-slate-500">
                                                        RUT: {entidadPlantilla.entidad.rut}
                                                    </div>
                                                )}

                                                {entidadPlantilla.entidad?.correo && (
                                                    <div className="break-words text-xs text-slate-500">
                                                        {entidadPlantilla.entidad.correo}
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-4 py-4">
                                                <div className="space-y-2">
                                                    {(entidadPlantilla.cantidades ?? []).map((cantidad: any) => {
                                                        const producto = cantidad.producto;
                                                        const cantidadNumero = Number(cantidad.cantidad ?? 0);
                                                        const calculado = calcularItemPreview(producto, cantidadNumero);
                                                        const precio = calculado.precioVenta;
                                                        const subtotal = calculado.subtotal;
                                                        const iva = calculado.iva;
                                                        const total = calculado.total;

                                                        return (
                                                            <div
                                                                key={`${entidadPlantilla.id}-${cantidad.productoId}`}
                                                                className="rounded-lg border border-slate-100 bg-white px-3 py-2"
                                                            >
                                                                <div className="flex flex-col gap-2 2xl:flex-row 2xl:items-center 2xl:justify-between">
                                                                    <div className="min-w-0">
                                                                        <p className="break-words font-medium text-slate-800">
                                                                            {producto?.nombre ?? "Producto sin nombre"}
                                                                        </p>

                                                                        {producto?.descripcion && (
                                                                            <p className="break-words text-xs text-slate-500">
                                                                                {producto.descripcion}
                                                                            </p>
                                                                        )}
                                                                    </div>

                                                                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-600 2xl:text-right">
                                                                        <div>
                                                                            <span className="block text-slate-400">
                                                                                Cant.
                                                                            </span>
                                                                            <span className="font-semibold">
                                                                                {cantidadNumero}
                                                                            </span>
                                                                        </div>

                                                                        <div>
                                                                            IVA:{" "}
                                                                            <span className="font-semibold">
                                                                                {formatearPrecio(iva, "CLP", 1)}
                                                                            </span>
                                                                        </div>

                                                                        <div>
                                                                            Total:{" "}
                                                                            <span className="font-semibold text-slate-800">
                                                                                {formatearPrecio(total, "CLP", 1)}
                                                                            </span>
                                                                        </div>

                                                                        <div>
                                                                            <span className="block text-slate-400">
                                                                                Precio
                                                                            </span>
                                                                            <span className="font-semibold">
                                                                                {formatearPrecio(precio, "CLP", 1)}
                                                                            </span>
                                                                        </div>

                                                                        <div>
                                                                            <span className="block text-slate-400">
                                                                                Subtotal
                                                                            </span>
                                                                            <span className="font-semibold text-slate-800">
                                                                                {formatearPrecio(subtotal, "CLP", 1)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </td>

                                            <td className="whitespace-nowrap px-4 py-4 text-right font-bold text-slate-900">
                                                {formatearPrecio(totalEntidad, "CLP", 1)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer responsive */}
                <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800">
                                Total general estimado:{" "}
                                <span className="text-emerald-700">
                                    {formatearPrecio(
                                        calcularTotalPlantilla(plantilla),
                                        "CLP",
                                        1
                                    )}
                                </span>
                            </p>

                            <p className="text-xs text-slate-500">
                                Este monto es referencial y se calcula con los precios actuales guardados en los productos.
                            </p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
                            >
                                Cerrar
                            </button>

                            <button
                                type="button"
                                onClick={() => onGenerar(plantilla.id)}
                                className="w-full rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 sm:w-auto"
                            >
                                Generar cotizaciones
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}