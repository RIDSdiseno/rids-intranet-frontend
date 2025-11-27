import React from "react";
import { motion } from "framer-motion";
import {
    BarcodeOutlined,
    PercentageOutlined,
    InfoCircleOutlined,
    CloseCircleOutlined,
    CheckCircleOutlined,
} from "@ant-design/icons";
import { calcularPrecioTotal, calcularPorcGanancia } from "./utils";
import type { ProductoForm } from "./types";

interface NewProductoModalProps {
    show: boolean;
    onClose: () => void;
    onSubmit: (datos: any) => void;
    formData: ProductoForm;
    onFormChange: (field: keyof ProductoForm, value: any) => void;
    categoriasDisponibles: string[];
    apiLoading: boolean;
}

const NewProductoModal: React.FC<NewProductoModalProps> = ({
    show,
    onClose,
    onSubmit,
    formData,
    onFormChange,
    categoriasDisponibles,
    apiLoading,
}) => {
    if (!show) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Asegurar que precioTotal esté calculado
        const datos = {
            ...formData,
            precioTotal: formData.precioTotal || calcularPrecioTotal(formData.precio, formData.porcGanancia)
        };
        onSubmit(datos);
    };

    const handlePrecioChange = (precio: number) => {
        const precioTotal = calcularPrecioTotal(precio, formData.porcGanancia);
        onFormChange("precio", precio);
        onFormChange("precioTotal", precioTotal);
    };

    const handlePorcGananciaChange = (porcGanancia: number) => {
        const precioTotal = calcularPrecioTotal(formData.precio, porcGanancia);
        onFormChange("porcGanancia", porcGanancia);
        onFormChange("precioTotal", precioTotal);
    };

    const handlePrecioTotalChange = (precioTotal: number) => {
        const porcGanancia = calcularPorcGanancia(formData.precio, precioTotal);
        onFormChange("precioTotal", precioTotal);
        onFormChange("porcGanancia", porcGanancia);
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative max-h-[90vh] overflow-y-auto"
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500 rounded-xl text-white">
                            <BarcodeOutlined className="text-lg" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Crear Nuevo Producto</h2>
                            <p className="text-slate-600 text-sm mt-1">Complete la información del producto</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    ✕
                </button>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Información Básica */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700">Nombre del Producto *</label>
                            <input
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                                placeholder="Ej: Laptop Dell XPS 13"
                                value={formData.nombre}
                                onChange={(e) => onFormChange("nombre", e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700">Categoría</label>
                            <select
                                value={formData.categoria}
                                onChange={(e) => onFormChange("categoria", e.target.value)}
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                            >
                                <option value="">Seleccionar categoría</option>
                                {categoriasDisponibles.map((categoria, index) => (
                                    <option key={index} value={categoria}>
                                        {categoria}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Descripción */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">Descripción</label>
                        <textarea
                            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 resize-none"
                            placeholder="Descripción detallada del producto..."
                            rows={3}
                            value={formData.descripcion}
                            onChange={(e) => onFormChange("descripcion", e.target.value)}
                        />
                    </div>

                    {/* CÁLCULO DE PRECIOS Y GANANCIA */}
                    <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl p-4">
                        <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                            <PercentageOutlined className="text-cyan-600" />
                            Cálculo de Precios y Ganancia
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Precio Costo */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700">Precio Costo ($) *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="w-full border border-cyan-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 bg-white"
                                    placeholder="0"
                                    value={formData.precio || ""}
                                    onChange={(e) => handlePrecioChange(Number(e.target.value) || 0)}
                                    required
                                />
                            </div>

                            {/* Porcentaje Ganancia */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700">% Ganancia</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="1000"
                                        className="w-full border border-cyan-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 bg-white pr-12"
                                        placeholder="0"
                                        value={formData.porcGanancia || ""}
                                        onChange={(e) => handlePorcGananciaChange(Number(e.target.value) || 0)}
                                    />
                                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500">%</span>
                                </div>
                            </div>

                            {/* Precio Venta */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700">Precio Venta ($)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="w-full border border-emerald-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 bg-white font-semibold text-emerald-700"
                                    placeholder="0"
                                    value={formData.precioTotal || ""}
                                    onChange={(e) => handlePrecioTotalChange(Number(e.target.value) || 0)}
                                />
                            </div>
                        </div>

                        {/* Resumen de ganancia */}
                        {formData.precio > 0 && formData.precioTotal > 0 && (
                            <div className="mt-4 p-3 bg-white border border-emerald-200 rounded-lg">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Ganancia por unidad:</span>
                                        <span className="font-bold text-emerald-700">
                                            ${(formData.precioTotal - formData.precio).toLocaleString('es-CL')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Margen de ganancia:</span>
                                        <span className="font-bold text-emerald-700">
                                            {formData.porcGanancia}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Stock y Serie */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700">Stock Inicial</label>
                            <input
                                type="number"
                                min="0"
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                                placeholder="0"
                                value={formData.stock || ""}
                                onChange={(e) => onFormChange("stock", Number(e.target.value))}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700">Código/Serie</label>
                            <input
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                                placeholder="Ej: PROD-001, SKU-123"
                                value={formData.serie}
                                onChange={(e) => onFormChange("serie", e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Información adicional */}
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <InfoCircleOutlined className="text-purple-500 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-purple-700">Información del producto</p>
                                <p className="text-xs text-purple-600 mt-1">
                                    El precio de venta se calculará automáticamente basado en el costo y el porcentaje de ganancia.
                                    Puede ajustar cualquiera de los tres valores y los demás se recalcularán automáticamente.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Botones de acción */}
                    <div className="flex gap-3 pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-all duration-200 font-medium flex items-center justify-center gap-2"
                        >
                            <CloseCircleOutlined />
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={apiLoading}
                            className="flex-1 px-4 py-3 rounded-xl text-white font-medium transition-all duration-200 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <CheckCircleOutlined />
                            {apiLoading ? "Creando..." : "Crear Producto"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default NewProductoModal;