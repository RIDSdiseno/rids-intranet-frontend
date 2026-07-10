// src/components/modals-cotizaciones/cotizaciones-masivas/CotizacionMasivaModal.tsx

import React, { useMemo, useState, useEffect } from "react";
import { Select } from "antd";
import { motion } from "framer-motion";
import {
    CloseOutlined,
    FileAddOutlined,
    PlusOutlined,
    DeleteOutlined,
} from "@ant-design/icons";

import type { EntidadGestioo } from "../types";

type ProductoCatalogo = {
    id: number;
    nombre: string;
    descripcion?: string | null;
    precio?: number;
    precioTotal?: number;
    porcGanancia?: number;
    sku?: string | null;
    serie?: string | null;
    categoria?: string | null;
    imagen?: string | null;
};

type FilaEntidad = {
    entidadId: number;
    cantidades: Record<number, number>;
};

type ModoCotizacionMasiva = "generar" | "editar" | "plantilla";

type GenerarCotizacionesMasivasPayload = {
    nombreGrupo?: string;
    comentariosCotizacion: string;
    cotizaciones: Array<{
        entidadId: number;
        comentariosCotizacion?: string;
        items: Array<{
            productoId: number;
            cantidad: number;
        }>;
    }>;
};

type CrearPlantillaMasivaPayload = {
    nombre: string;
    descripcion?: string;
    tecnicoId?: number | null;
    items: Array<{
        productoId: number;
    }>;
    entidades: Array<{
        entidadId: number;
        cantidades: Array<{
            productoId: number;
            cantidad: number;
        }>;
    }>;
};

interface CotizacionMasivaModalProps {
    show: boolean;
    onClose: () => void;
    entidades: EntidadGestioo[];
    productos: ProductoCatalogo[];
    modo?: ModoCotizacionMasiva;
    tecnicoId?: number | null;
    plantillaInicial?: any | null;
    onGenerar?: (data: GenerarCotizacionesMasivasPayload) => Promise<void>;
    onGuardarPlantilla?: (data: CrearPlantillaMasivaPayload) => Promise<void>;
    onActualizarPlantilla?: (data: CrearPlantillaMasivaPayload) => Promise<void>;
    apiLoading?: boolean;
}

export const CotizacionMasivaModal: React.FC<CotizacionMasivaModalProps> = ({
    show,
    onClose,
    entidades,
    productos,
    modo = "generar",
    tecnicoId = null,
    plantillaInicial = null,
    onGenerar,
    onGuardarPlantilla,
    onActualizarPlantilla,
    apiLoading = false,
}) => {
    const [productoIds, setProductoIds] = useState<number[]>([]);
    const [entidadIds, setEntidadIds] = useState<number[]>([]);
    const [filas, setFilas] = useState<FilaEntidad[]>([]);

    const [nombreGrupo, setNombreGrupo] = useState(
        ""
    );

    const [comentariosCotizacion, setComentariosCotizacion] = useState(
        ""
    );

    // Error visible dentro del modal.
    // Se usa para mostrar validaciones sin usar alert().
    const [errorLocal, setErrorLocal] = useState<string | null>(null);

    useEffect(() => {
        if (!show) return;

        if (modo !== "editar" || !plantillaInicial) {
            return;
        }

        const productosPlantilla =
            plantillaInicial.items ?? plantillaInicial.productos ?? [];

        const productosIdsIniciales = productosPlantilla
            .map((item: any) => Number(item.productoId ?? item.producto?.id))
            .filter((id: number) => Number.isFinite(id) && id > 0);

        const entidadesPlantilla = plantillaInicial.entidades ?? [];

        const entidadesIdsIniciales = entidadesPlantilla
            .map((entidad: any) => Number(entidad.entidadId ?? entidad.entidad?.id))
            .filter((id: number) => Number.isFinite(id) && id > 0);

        const filasIniciales: FilaEntidad[] = entidadesPlantilla.map((entidad: any) => {
            const cantidades: Record<number, number> = {};

            const cantidadesPlantilla = entidad.cantidades ?? [];

            cantidadesPlantilla.forEach((cantidad: any) => {
                const productoId = Number(cantidad.productoId ?? cantidad.producto?.id);
                const cantidadValor = Number(cantidad.cantidad ?? 0);

                if (Number.isFinite(productoId) && productoId > 0) {
                    cantidades[productoId] = cantidadValor;
                }
            });

            return {
                entidadId: Number(entidad.entidadId ?? entidad.entidad?.id),
                cantidades,
            };
        });

        setProductoIds(productosIdsIniciales);
        setEntidadIds(entidadesIdsIniciales);
        setFilas(filasIniciales);
        setNombreGrupo(plantillaInicial.nombre ?? "");
        setComentariosCotizacion(plantillaInicial.descripcion ?? "");
    }, [show, modo, plantillaInicial]);

    const esModoPlantilla = modo === "plantilla";
    const esModoEditar = modo === "editar";
    const esModoPlantillaOEditar = esModoPlantilla || esModoEditar;

    const tituloModal = esModoEditar
        ? "Editar plantilla de cotizaciones masivas"
        : esModoPlantilla
            ? "Guardar plantilla de cotizaciones masivas"
            : "Crear cotizaciones masivas";

    const descripcionModal = esModoEditar
        ? "Modifica productos, entidades y cantidades de esta plantilla."
        : esModoPlantilla
            ? "Selecciona productos, entidades y cantidades para reutilizar esta plantilla."
            : "Selecciona productos, entidades y cantidades.";

    const textoBotonPrincipal = esModoEditar
        ? "Actualizar plantilla"
        : esModoPlantilla
            ? "Guardar plantilla"
            : "Generar cotizaciones";

    const entidadesEmpresa = useMemo(() => {
        return entidades.filter((entidad) => entidad.tipo === "EMPRESA");
    }, [entidades]);

    const productosSeleccionados = useMemo(() => {
        return productos.filter((producto) => productoIds.includes(producto.id));
    }, [productos, productoIds]);

    const entidadesSeleccionadas = useMemo(() => {
        return entidadesEmpresa.filter((entidad) =>
            entidadIds.includes(entidad.id)
        );
    }, [entidadesEmpresa, entidadIds]);

    if (!show) return null;

    const limpiarFormulario = () => {
        setProductoIds([]);
        setEntidadIds([]);
        setFilas([]);
        setNombreGrupo("");
        setComentariosCotizacion("");
        setErrorLocal(null);
    };

    const sincronizarFilas = (
        nuevasEntidades: number[],
        nuevosProductos: number[]
    ) => {
        setFilas((prev) => {
            return nuevasEntidades.map((entidadId) => {
                const existente = prev.find((f) => f.entidadId === entidadId);

                const cantidades: Record<number, number> = {};

                nuevosProductos.forEach((productoId) => {
                    cantidades[productoId] =
                        existente?.cantidades?.[productoId] ?? 1;
                });

                return {
                    entidadId,
                    cantidades,
                };
            });
        });
    };

    const handleProductosChange = (ids: number[]) => {
        // Si el usuario cambia productos, ocultamos el error anterior.
        setErrorLocal(null);

        setProductoIds(ids);
        sincronizarFilas(entidadIds, ids);
    };

    const handleEntidadesChange = (ids: number[]) => {
        // Si el usuario cambia entidades, ocultamos el error anterior.
        setErrorLocal(null);

        setEntidadIds(ids);
        sincronizarFilas(ids, productoIds);
    };

    const handleCantidadChange = (
        entidadId: number,
        productoId: number,
        cantidad: number
    ) => {
        // Si el usuario corrige cantidades, ocultamos el error anterior.
        setErrorLocal(null);

        setFilas((prev) =>
            prev.map((fila) =>
                fila.entidadId === entidadId
                    ? {
                        ...fila,
                        cantidades: {
                            ...fila.cantidades,
                            [productoId]: Math.max(0, cantidad),
                        },
                    }
                    : fila
            )
        );
    };

    const quitarEntidad = (entidadId: number) => {
        const nuevasEntidades = entidadIds.filter((id) => id !== entidadId);
        setEntidadIds(nuevasEntidades);
        sincronizarFilas(nuevasEntidades, productoIds);
    };

    // IVA usado para mostrar el mismo cálculo que el backend.
    const IVA_CHILE = 0.19;

    const redondearCLP = (valor: number) => {
        // Redondea montos para evitar decimales en pesos chilenos.
        return Math.round(Number(valor || 0));
    };

    const obtenerPrecioVentaProductoMasivo = (producto: any) => {
        /*
            Criterio de cálculo:
            1. Si el producto tiene precioTotal, se usa como precio de venta.
            2. Si no tiene precioTotal, se calcula usando precio + porcGanancia.
            3. Si porcGanancia viene vacío, se toma como 0.
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

    const calcularItemMasivoPreview = (producto: any, cantidadInput: number) => {
        /*
            Calcula el total visible por producto:
            - precioVenta: precio unitario con ganancia aplicada.
            - subtotal: precioVenta * cantidad.
            - iva: 19% sobre subtotal.
            - total: subtotal + IVA.
        */

        const cantidad = Number(cantidadInput || 0);
        const precioVenta = obtenerPrecioVentaProductoMasivo(producto);
        const subtotal = redondearCLP(precioVenta * cantidad);
        const iva = redondearCLP(subtotal * IVA_CHILE);

        return {
            precioVenta,
            subtotal,
            iva,
            total: subtotal + iva,
        };
    };

    // Calcula el total final del cliente considerando ganancia e IVA.
    const totalFila = (fila: FilaEntidad) => {
        return productosSeleccionados.reduce((acc, producto) => {
            const cantidad = Number(fila.cantidades[producto.id] ?? 0);

            const calculado = calcularItemMasivoPreview(producto, cantidad);

            return acc + calculado.total;
        }, 0);
    };

    const totalGeneral = filas.reduce((acc, fila) => acc + totalFila(fila), 0);

    // Muestra errores de validación dentro del modal.
    // Esto evita usar alert() y mantiene la experiencia visual consistente.
    const mostrarErrorLocal = (mensaje: string) => {
        setErrorLocal(mensaje);

        window.setTimeout(() => {
            setErrorLocal(null);
        }, 5000);
    };

    const handleSubmit = async () => {
        // Limpia errores anteriores antes de validar nuevamente.
        setErrorLocal(null);

        if (productoIds.length === 0) {
            mostrarErrorLocal("Selecciona al menos un producto.");
            return;
        }

        if (entidadIds.length === 0) {
            mostrarErrorLocal("Selecciona al menos una entidad o cliente.");
            return;
        }

        const entidadesConCantidades = filas
            .map((fila) => ({
                entidadId: fila.entidadId,
                cantidades: productoIds
                    .map((productoId) => ({
                        productoId,
                        cantidad: Number(fila.cantidades[productoId] || 0),
                    }))
                    .filter((item) => item.cantidad > 0),
            }))
            .filter((entidad) => entidad.cantidades.length > 0);

        if (entidadesConCantidades.length === 0) {
            mostrarErrorLocal("Debes ingresar al menos una cantidad mayor a 0.");
            return;
        }

        try {
            if (esModoPlantillaOEditar) {
                if (!nombreGrupo.trim()) {
                    mostrarErrorLocal("Debes ingresar un nombre para la plantilla.");
                    return;
                }

                const payloadPlantilla = {
                    nombre: nombreGrupo.trim(),
                    descripcion: comentariosCotizacion.trim() || undefined,
                    tecnicoId,
                    items: productoIds.map((productoId) => ({
                        productoId,
                    })),
                    entidades: entidadesConCantidades,
                };

                if (esModoEditar) {
                    if (!onActualizarPlantilla) {
                        mostrarErrorLocal("No se configuró la función para actualizar plantilla.");
                        return;
                    }

                    await onActualizarPlantilla(payloadPlantilla);
                    limpiarFormulario();
                    return;
                }

                if (!onGuardarPlantilla) {
                    mostrarErrorLocal("No se configuró la función para guardar plantilla.");
                    return;
                }

                await onGuardarPlantilla(payloadPlantilla);
                limpiarFormulario();
                return;
            }

            if (!onGenerar) {
                mostrarErrorLocal("No se configuró la función para generar cotizaciones.");
                return;
            }

            const cotizaciones = entidadesConCantidades.map((entidad) => ({
                entidadId: entidad.entidadId,
                comentariosCotizacion,
                items: entidad.cantidades,
            }));

            await onGenerar({
                nombreGrupo: nombreGrupo.trim(),
                comentariosCotizacion,
                cotizaciones,
            });

            limpiarFormulario();
        } catch (error: any) {
            // Muestra errores inesperados dentro del modal.
            // Los errores del backend también pueden mostrarse por toast desde el componente padre.
            const mensaje =
                error?.response?.data?.error ||
                error?.response?.data?.message ||
                error?.data?.error ||
                error?.data?.message ||
                error?.message ||
                "Ocurrió un error al procesar la cotización masiva.";

            mostrarErrorLocal(mensaje);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-3 py-4 sm:px-4 sm:py-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
                {/* Header fijo y responsive */}
                <div className="flex items-start justify-between gap-3 border-b bg-white px-4 py-4 sm:px-6">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                            <FileAddOutlined />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
                                {tituloModal}
                            </h2>
                            <p className="text-xs text-slate-500 sm:text-sm">
                                {descripcionModal}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            limpiarFormulario();
                            onClose();
                        }}
                        aria-label="Cerrar modal de cotizaciones masivas"
                        className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    >
                        <CloseOutlined />
                    </button>
                </div>

                {/* Body con scroll interno para pantallas pequeñas */}
                <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                    {/* Error local visible para validaciones del modal */}
                    {errorLocal && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                            {errorLocal}
                        </div>
                    )}
                    {/* Selectores principales: 1 columna en móvil, 2 columnas en pantallas grandes */}
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                        <div className="rounded-2xl border border-cyan-100 bg-white p-4">
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Productos base
                            </label>

                            <Select
                                mode="multiple"
                                allowClear
                                showSearch
                                placeholder="Selecciona productos/licencias"
                                value={productoIds}
                                onChange={handleProductosChange}
                                style={{ width: "100%" }}
                                optionFilterProp="label"
                                options={productos.map((producto) => ({
                                    value: producto.id,
                                    label: `${producto.nombre} - $${Number(
                                        producto.precioTotal ??
                                        producto.precio ??
                                        0
                                    ).toLocaleString("es-CL")}`,
                                }))}
                            />
                        </div>

                        <div className="rounded-2xl border border-cyan-100 bg-white p-4">
                            <label className="mb-2 block text-sm font-semibold text-slate-700">
                                Entidades / clientes
                            </label>

                            <Select
                                mode="multiple"
                                allowClear
                                showSearch
                                placeholder="Selecciona entidades"
                                value={entidadIds}
                                onChange={handleEntidadesChange}
                                style={{ width: "100%" }}
                                optionFilterProp="label"
                                options={entidadesEmpresa.map((entidad) => ({
                                    value: entidad.id,
                                    label: entidad.rut
                                        ? `${entidad.nombre} (${entidad.rut})`
                                        : entidad.nombre,
                                }))}
                            />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-cyan-100 bg-white p-4">
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                            {esModoPlantilla
                                ? "Nombre de la plantilla"
                                : "Nombre de la generación masiva"}
                        </label>

                        <input
                            type="text"
                            value={nombreGrupo}
                            onChange={(e) => {
                                setErrorLocal(null);
                                setNombreGrupo(e.target.value);
                            }}
                            className="mb-4 w-full rounded-xl border border-cyan-100 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                            placeholder={
                                esModoPlantilla
                                    ? "Ej: Plantilla mensual de licencias con soporte"
                                    : "Ej: Cotizaciones de licencias mensuales a clientes con soporte mensual"
                            }
                        />

                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Comentario para las cotizaciones
                        </label>

                        <textarea
                            value={comentariosCotizacion}
                            onChange={(e) => {
                                setErrorLocal(null);
                                setComentariosCotizacion(e.target.value);
                            }}
                            rows={3}
                            className="w-full rounded-xl border border-cyan-100 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                            placeholder=""
                        />
                    </div>

                    <div className="rounded-2xl border border-cyan-100 bg-white">
                        {/* Header del bloque de cantidades responsive */}
                        <div className="flex flex-col gap-3 border-b border-cyan-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="font-semibold text-slate-800">
                                    Cantidades por cliente
                                </h3>
                                <p className="text-sm text-slate-500">
                                    Cada fila generará una cotización.
                                </p>
                            </div>

                            <div className="text-right">
                                <div className="text-xs text-slate-500">
                                    Total estimado
                                </div>
                                <div className="text-lg font-bold text-cyan-700">
                                    ${totalGeneral.toLocaleString("es-CL")}
                                </div>
                            </div>
                        </div>

                        {/*
    Vista CARD:
    Se usa hasta pantallas grandes para evitar scroll horizontal.
*/}
                        <div className="space-y-3 p-4 xl:hidden">
                            {filas.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-cyan-200 px-4 py-8 text-center text-sm text-slate-400">
                                    Selecciona productos y entidades para comenzar.
                                </div>
                            ) : (
                                filas.map((fila) => {
                                    const entidad = entidadesSeleccionadas.find(
                                        (e) => e.id === fila.entidadId
                                    );

                                    return (
                                        <article
                                            key={fila.entidadId}
                                            className="rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm"
                                        >
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="min-w-0">
                                                    <h4 className="break-words font-bold text-slate-800">
                                                        {entidad?.nombre ?? fila.entidadId}
                                                    </h4>

                                                    {entidad?.rut && (
                                                        <p className="mt-1 text-xs text-slate-500">
                                                            RUT: {entidad.rut}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                                                    <div className="rounded-xl bg-cyan-50 px-3 py-2 text-right">
                                                        {/* Total del cliente considerando ganancia e IVA */}
                                                        <p className="text-[11px] font-semibold uppercase text-cyan-600">
                                                            Total estimado
                                                        </p>
                                                        <p className="font-bold text-cyan-700">
                                                            ${totalFila(fila).toLocaleString("es-CL")}
                                                        </p>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => quitarEntidad(fila.entidadId)}
                                                        aria-label="Quitar cliente de la plantilla"
                                                        className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                                                    >
                                                        <DeleteOutlined />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Inputs de cantidades por producto en formato responsive */}
                                            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                                {productosSeleccionados.map((producto) => {
                                                    const cantidad = Number(fila.cantidades[producto.id] ?? 0);

                                                    // Calcula precio, subtotal, IVA y total usando el mismo criterio del backend.
                                                    const calculado = calcularItemMasivoPreview(producto, cantidad);

                                                    const precio = calculado.precioVenta;
                                                    const subtotal = calculado.subtotal;
                                                    const iva = calculado.iva;
                                                    const total = calculado.total;

                                                    return (
                                                        <div
                                                            key={producto.id}
                                                            className="rounded-xl border border-cyan-100 bg-cyan-50/40 p-3"
                                                        >
                                                            <div className="min-w-0">
                                                                <p className="break-words text-sm font-semibold text-slate-800">
                                                                    {producto.nombre}
                                                                </p>
                                                                <p className="text-xs text-slate-500">
                                                                    ${precio.toLocaleString("es-CL")}
                                                                </p>
                                                            </div>

                                                            <label className="mt-3 block text-xs font-semibold text-slate-500">
                                                                Cantidad
                                                            </label>

                                                            <input
                                                                type="number"
                                                                min={0}
                                                                value={fila.cantidades[producto.id] ?? 0}
                                                                onChange={(e) =>
                                                                    handleCantidadChange(
                                                                        fila.entidadId,
                                                                        producto.id,
                                                                        Number(e.target.value)
                                                                    )
                                                                }
                                                                className="mt-1 w-full rounded-lg border border-cyan-100 px-3 py-2 text-center text-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                                                            />
                                                            {/* Resumen del cálculo del producto para este cliente */}
                                                            <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-600 min-[420px]:grid-cols-3">
                                                                <div className="rounded-lg bg-white px-3 py-2">
                                                                    <p className="text-slate-400">Neto</p>
                                                                    <p className="font-bold text-slate-800">
                                                                        ${subtotal.toLocaleString("es-CL")}
                                                                    </p>
                                                                </div>

                                                                <div className="rounded-lg bg-white px-3 py-2">
                                                                    <p className="text-slate-400">IVA 19%</p>
                                                                    <p className="font-bold text-slate-800">
                                                                        ${iva.toLocaleString("es-CL")}
                                                                    </p>
                                                                </div>

                                                                <div className="rounded-lg bg-white px-3 py-2">
                                                                    <p className="text-slate-400">Total</p>
                                                                    <p className="font-bold text-cyan-700">
                                                                        ${total.toLocaleString("es-CL")}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </article>
                                    );
                                })
                            )}
                        </div>

                        {/*
    Vista TABLA:
    Solo se muestra en pantallas grandes.
    La tabla se mantiene para trabajar más rápido en desktop.
*/}
                        <div className="hidden overflow-x-auto xl:block">
                            <table className="w-full min-w-[900px] text-sm">
                                <thead className="bg-cyan-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                                            Cliente
                                        </th>

                                        {productosSeleccionados.map((producto) => (
                                            <th
                                                key={producto.id}
                                                className="px-4 py-3 text-center text-xs font-semibold text-slate-600"
                                            >
                                                {producto.nombre}

                                                {/* Precio unitario con ganancia aplicada */}
                                                <div className="font-normal text-slate-400">
                                                    Unitario: ${obtenerPrecioVentaProductoMasivo(producto).toLocaleString("es-CL")}
                                                </div>

                                                {/* Información de ganancia para que el usuario entienda el cálculo */}
                                                {producto.porcGanancia != null && (
                                                    <div className="font-normal text-slate-400">
                                                        Ganancia: {Number(producto.porcGanancia)}%
                                                    </div>
                                                )}
                                            </th>
                                        ))}

                                        {/* Total estimado incluye ganancia e IVA */}
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">
                                            Total estimado
                                        </th>

                                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">
                                            Acción
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-cyan-100">
                                    {filas.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={productosSeleccionados.length + 3}
                                                className="px-4 py-8 text-center text-slate-400"
                                            >
                                                Selecciona productos y entidades para comenzar.
                                            </td>
                                        </tr>
                                    ) : (
                                        filas.map((fila) => {
                                            const entidad = entidadesSeleccionadas.find(
                                                (e) => e.id === fila.entidadId
                                            );

                                            return (
                                                <tr key={fila.entidadId}>
                                                    <td className="px-4 py-3 font-semibold text-slate-700">
                                                        {entidad?.nombre ?? fila.entidadId}
                                                    </td>

                                                    {productosSeleccionados.map((producto) => (
                                                        <td
                                                            key={producto.id}
                                                            className="px-4 py-3 text-center align-top"
                                                        >
                                                            {(() => {
                                                                // Cantidad ingresada para este producto y cliente.
                                                                const cantidad = Number(fila.cantidades[producto.id] ?? 0);

                                                                // Cálculo completo del producto con ganancia e IVA.
                                                                const calculado = calcularItemMasivoPreview(producto, cantidad);

                                                                return (
                                                                    <div className="flex flex-col items-center gap-2">
                                                                        <input
                                                                            type="number"
                                                                            min={0}
                                                                            value={cantidad}
                                                                            onChange={(e) =>
                                                                                handleCantidadChange(
                                                                                    fila.entidadId,
                                                                                    producto.id,
                                                                                    Number(e.target.value)
                                                                                )
                                                                            }
                                                                            className="w-20 rounded-lg border border-cyan-100 px-2 py-1 text-center focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                                                                        />

                                                                        {/* Detalle visible del cálculo para esta cantidad */}
                                                                        <div className="space-y-0.5 text-center text-[11px] leading-tight text-slate-500">
                                                                            <div>
                                                                                Neto:{" "}
                                                                                <span className="font-semibold text-slate-700">
                                                                                    ${calculado.subtotal.toLocaleString("es-CL")}
                                                                                </span>
                                                                            </div>

                                                                            <div>
                                                                                IVA:{" "}
                                                                                <span className="font-semibold text-slate-700">
                                                                                    ${calculado.iva.toLocaleString("es-CL")}
                                                                                </span>
                                                                            </div>

                                                                            <div>
                                                                                Total:{" "}
                                                                                <span className="font-bold text-cyan-700">
                                                                                    ${calculado.total.toLocaleString("es-CL")}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </td>
                                                    ))}

                                                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                                                        ${totalFila(fila).toLocaleString("es-CL")}
                                                    </td>

                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => quitarEntidad(fila.entidadId)}
                                                            aria-label="Quitar cliente"
                                                            className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                                                        >
                                                            <DeleteOutlined />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer responsive: botones apilados en móvil y alineados en desktop */}
                <div className="border-t bg-white px-4 py-4 sm:px-6">
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
                        <button
                            type="button"
                            onClick={() => {
                                limpiarFormulario();
                                onClose();
                            }}
                            className="w-full rounded-xl border border-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-50 sm:w-auto"
                        >
                            Cancelar
                        </button>

                        <button
                            type="button"
                            disabled={
                                apiLoading ||
                                productoIds.length === 0 ||
                                entidadIds.length === 0
                            }
                            onClick={handleSubmit}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2 font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                        >
                            <PlusOutlined />
                            {apiLoading
                                ? esModoEditar
                                    ? "Actualizando..."
                                    : esModoPlantilla
                                        ? "Guardando..."
                                        : "Generando..."
                                : textoBotonPrincipal}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default CotizacionMasivaModal;