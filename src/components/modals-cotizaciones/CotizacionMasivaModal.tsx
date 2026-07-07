// src/components/modals-cotizaciones/CotizacionMasivaModal.tsx

import React, { useMemo, useState } from "react";
import { Select } from "antd";
import { motion } from "framer-motion";
import {
    CloseOutlined,
    FileAddOutlined,
    PlusOutlined,
    DeleteOutlined,
} from "@ant-design/icons";

import type { EntidadGestioo } from "./types";

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

interface CotizacionMasivaModalProps {
    show: boolean;
    onClose: () => void;
    entidades: EntidadGestioo[];
    productos: ProductoCatalogo[];
    onGenerar: (data: {
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
    }) => Promise<void>;
    apiLoading?: boolean;
}

export const CotizacionMasivaModal: React.FC<CotizacionMasivaModalProps> = ({
    show,
    onClose,
    entidades,
    productos,
    onGenerar,
    apiLoading = false,
}) => {
    const [productoIds, setProductoIds] = useState<number[]>([]);
    const [entidadIds, setEntidadIds] = useState<number[]>([]);
    const [filas, setFilas] = useState<FilaEntidad[]>([]);

    const [nombreGrupo, setNombreGrupo] = useState(
        "Cotizaciones de licencias mensuales a clientes con soporte mensual"
    );

    const [comentariosCotizacion, setComentariosCotizacion] = useState(
        "Cotización mensual de licencias."
    );

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
        setNombreGrupo(
            "Cotizaciones de licencias mensuales a clientes con soporte mensual"
        );
        setComentariosCotizacion("Cotización mensual de licencias.");
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
        setProductoIds(ids);
        sincronizarFilas(entidadIds, ids);
    };

    const handleEntidadesChange = (ids: number[]) => {
        setEntidadIds(ids);
        sincronizarFilas(ids, productoIds);
    };

    const handleCantidadChange = (
        entidadId: number,
        productoId: number,
        cantidad: number
    ) => {
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

    const totalFila = (fila: FilaEntidad) => {
        return productosSeleccionados.reduce((acc, producto) => {
            const cantidad = Number(fila.cantidades[producto.id] || 0);
            const precio = Number(producto.precioTotal ?? producto.precio ?? 0);
            return acc + cantidad * precio;
        }, 0);
    };

    const totalGeneral = filas.reduce((acc, fila) => acc + totalFila(fila), 0);

    const handleSubmit = async () => {
        if (productoIds.length === 0) {
            alert("Selecciona al menos un producto.");
            return;
        }

        if (entidadIds.length === 0) {
            alert("Selecciona al menos una entidad.");
            return;
        }

        const cotizaciones = filas
            .map((fila) => ({
                entidadId: fila.entidadId,
                comentariosCotizacion,
                items: productoIds
                    .map((productoId) => ({
                        productoId,
                        cantidad: Number(fila.cantidades[productoId] || 0),
                    }))
                    .filter((item) => item.cantidad > 0),
            }))
            .filter((cot) => cot.items.length > 0);

        if (cotizaciones.length === 0) {
            alert("Debes ingresar al menos una cantidad mayor a 0.");
            return;
        }

        await onGenerar({
            nombreGrupo: nombreGrupo.trim(),
            comentariosCotizacion,
            cotizaciones,
        });

        limpiarFormulario();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-7xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
            >
                <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                            <FileAddOutlined />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">
                                Crear cotizaciones masivas
                            </h2>
                            <p className="text-sm text-slate-500">
                                Selecciona productos, entidades y cantidades.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            limpiarFormulario();
                            onClose();
                        }}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    >
                        <CloseOutlined />
                    </button>
                </div>

                <div className="space-y-5 p-6">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
                            Nombre de la generación masiva
                        </label>

                        <input
                            type="text"
                            value={nombreGrupo}
                            onChange={(e) => setNombreGrupo(e.target.value)}
                            className="mb-4 w-full rounded-xl border border-cyan-100 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                            placeholder="Ej: Cotizaciones de licencias mensuales a clientes con soporte mensual"
                        />

                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                            Comentario para las cotizaciones
                        </label>

                        <textarea
                            value={comentariosCotizacion}
                            onChange={(e) =>
                                setComentariosCotizacion(e.target.value)
                            }
                            rows={3}
                            className="w-full rounded-xl border border-cyan-100 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                            placeholder="Ej: Cotización mensual de licencias..."
                        />
                    </div>

                    <div className="rounded-2xl border border-cyan-100 bg-white">
                        <div className="flex items-center justify-between border-b border-cyan-100 px-4 py-3">
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

                        <div className="overflow-x-auto">
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
                                                <div className="font-normal text-slate-400">
                                                    $
                                                    {Number(
                                                        producto.precioTotal ??
                                                        producto.precio ??
                                                        0
                                                    ).toLocaleString("es-CL")}
                                                </div>
                                            </th>
                                        ))}

                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">
                                            Subtotal
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
                                                colSpan={
                                                    productosSeleccionados.length + 3
                                                }
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

                                                    {productosSeleccionados.map(
                                                        (producto) => (
                                                            <td
                                                                key={producto.id}
                                                                className="px-4 py-3 text-center"
                                                            >
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    value={
                                                                        fila.cantidades[
                                                                        producto.id
                                                                        ] ?? 0
                                                                    }
                                                                    onChange={(e) =>
                                                                        handleCantidadChange(
                                                                            fila.entidadId,
                                                                            producto.id,
                                                                            Number(
                                                                                e.target.value
                                                                            )
                                                                        )
                                                                    }
                                                                    className="w-20 rounded-lg border border-cyan-100 px-2 py-1 text-center focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                                                                />
                                                            </td>
                                                        )
                                                    )}

                                                    <td className="px-4 py-3 text-right font-bold text-slate-800">
                                                        $
                                                        {totalFila(
                                                            fila
                                                        ).toLocaleString("es-CL")}
                                                    </td>

                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                quitarEntidad(
                                                                    fila.entidadId
                                                                )
                                                            }
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

                <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-white px-6 py-4">
                    <button
                        type="button"
                        onClick={() => {
                            limpiarFormulario();
                            onClose();
                        }}
                        className="rounded-xl border border-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-50"
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
                        className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2 font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <PlusOutlined />
                        {apiLoading ? "Generando..." : "Generar cotizaciones"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default CotizacionMasivaModal;