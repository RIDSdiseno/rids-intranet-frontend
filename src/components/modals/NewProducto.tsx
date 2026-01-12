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
import { useApi } from "./UseApi";

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

    const { fetchApi } = useApi();

    // ==========================
    // VALIDACIONES
    // ==========================
    const nombreInvalido = !formData.nombre?.trim();
    const precioInvalido = Number(formData.precio) <= 0;
    const precioVentaInvalido = Number(formData.precioTotal) <= 0;

    const formInvalido =
        nombreInvalido || precioInvalido || precioVentaInvalido;

    const motivoDeshabilitado = () => {
        if (nombreInvalido) return "El nombre del producto es obligatorio.";
        if (precioInvalido)
            return "El precio de costo debe ser mayor a 0.";
        if (precioVentaInvalido)
            return "El precio de venta debe ser mayor a 0.";
        if (apiLoading) return "Creando producto, por favor espere.";
        return "";
    };

    // ==========================
    // SUBMIT SEGURO
    // ==========================
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formInvalido) {
            alert("Hay campos inválidos. Revisa la información ingresada.");
            return;
        }

        try {
            // 1️⃣ Crear producto (sin imagen)
            const nuevoProductoResp = await fetchApi("/productos-gestioo", {
                method: "POST",
                body: JSON.stringify({
                    nombre: formData.nombre,
                    descripcion: formData.descripcion,
                    precio: formData.precio,
                    porcGanancia: formData.porcGanancia,
                    precioTotal:
                        formData.precioTotal ||
                        calcularPrecioTotal(
                            formData.precio,
                            formData.porcGanancia
                        ),
                    categoria: formData.categoria,
                    stock: formData.stock,
                    serie: formData.serie,
                }),
                headers: { "Content-Type": "application/json" },
            });

            const nuevoProducto = nuevoProductoResp.data;

            let imagenUrl = nuevoProducto.imagen;
            let publicId = nuevoProducto.publicId;

            // 2️⃣ Subir imagen si existe
            if (formData.imagenFile) {
                const form = new FormData();
                form.append("productoId", String(nuevoProducto.id));
                form.append("imagen", formData.imagenFile);

                const uploadResp = await fetchApi(
                    "/upload-imagenes/upload",
                    {
                        method: "POST",
                        body: form,
                    }
                );

                imagenUrl = uploadResp?.imagen || imagenUrl;
                publicId = uploadResp?.publicId || publicId;
            }

            // 3️⃣ Enviar producto completo al padre
            onSubmit({
                ...nuevoProducto,
                imagen: imagenUrl,
                publicId,
            });
        } catch (error) {
            console.error("❌ Error al crear producto:", error);
            alert("Error al crear el producto. Intente nuevamente.");
        }
    };

    // ==========================
    // HANDLERS NUMÉRICOS
    // ==========================
    const handlePrecioChange = (precio: number) => {
        onFormChange("precio", precio);
        onFormChange(
            "precioTotal",
            calcularPrecioTotal(precio, formData.porcGanancia)
        );
    };

    const handlePorcGananciaChange = (porcGanancia: number) => {
        onFormChange("porcGanancia", porcGanancia);
        onFormChange(
            "precioTotal",
            calcularPrecioTotal(formData.precio, porcGanancia)
        );
    };

    const handlePrecioTotalChange = (precioTotal: number) => {
        onFormChange("precioTotal", precioTotal);
        onFormChange(
            "porcGanancia",
            calcularPorcGanancia(formData.precio, precioTotal)
        );
    };

    // ==========================
    // RENDER
    // ==========================
    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative max-h-[90vh] overflow-y-auto"
            >
                {/* HEADER */}
                <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500 rounded-xl text-white">
                            <BarcodeOutlined className="text-lg" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">
                                Crear Nuevo Producto
                            </h2>
                            <p className="text-slate-600 text-sm mt-1">
                                Complete la información del producto
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl p-2 hover:bg-slate-100 rounded-lg"
                >
                    ✕
                </button>

                {/* FORM */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* NOMBRE / CATEGORÍA */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700">
                                Nombre del Producto *
                            </label>
                            <input
                                value={formData.nombre}
                                onChange={(e) =>
                                    onFormChange("nombre", e.target.value)
                                }
                                className={`w-full border rounded-xl px-4 py-3 text-sm
                                    ${nombreInvalido
                                        ? "border-rose-400"
                                        : "border-slate-300"
                                    }`}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700">
                                Categoría
                            </label>
                            <select
                                value={formData.categoria}
                                onChange={(e) =>
                                    onFormChange("categoria", e.target.value)
                                }
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm bg-white"
                            >
                                <option value="">
                                    Seleccionar categoría
                                </option>
                                {categoriasDisponibles.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* DESCRIPCIÓN */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700">
                            Descripción
                        </label>
                        <textarea
                            rows={3}
                            value={formData.descripcion}
                            onChange={(e) =>
                                onFormChange("descripcion", e.target.value)
                            }
                            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm resize-none"
                        />
                    </div>

                    {/* PRECIOS */}
                    <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                            <PercentageOutlined />
                            Cálculo de precios
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input
                                type="number"
                                min={0}
                                value={formData.precio || ""}
                                onChange={(e) =>
                                    handlePrecioChange(
                                        Number(e.target.value) || 0
                                    )
                                }
                                placeholder="Costo"
                                className="border rounded-xl px-3 py-2"
                            />

                            <input
                                type="number"
                                min={0}
                                value={formData.porcGanancia || ""}
                                onChange={(e) =>
                                    handlePorcGananciaChange(
                                        Number(e.target.value) || 0
                                    )
                                }
                                placeholder="% Ganancia"
                                className="border rounded-xl px-3 py-2"
                            />

                            <input
                                type="number"
                                min={0}
                                value={formData.precioTotal || ""}
                                onChange={(e) =>
                                    handlePrecioTotalChange(
                                        Number(e.target.value) || 0
                                    )
                                }
                                placeholder="Precio venta"
                                className="border rounded-xl px-3 py-2 font-semibold text-emerald-700"
                            />
                        </div>

                        {(precioInvalido || precioVentaInvalido) && (
                            <div className="mt-3 text-xs text-amber-700 flex items-center gap-2">
                                <InfoCircleOutlined />
                                Revisa los valores de costo y precio de venta.
                            </div>
                        )}
                    </div>

                    {/* IMAGEN */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700">
                            Imagen del Producto
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                                onFormChange(
                                    "imagenFile",
                                    e.target.files?.[0] || null
                                )
                            }
                            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
                        />
                        {formData.imagenFile && (
                            <img
                                src={URL.createObjectURL(formData.imagenFile)}
                                alt="preview"
                                className="mt-2 w-32 h-32 object-cover rounded-xl border"
                            />
                        )}
                    </div>

                    {/* BOTONES */}
                    <div className="flex gap-3 pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl bg-white text-slate-700 border border-slate-300"
                        >
                            <CloseCircleOutlined /> Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={apiLoading || formInvalido}
                            title={motivoDeshabilitado()}
                            className="flex-1 px-4 py-3 rounded-xl text-white bg-gradient-to-r from-purple-600 to-pink-600 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <CheckCircleOutlined />
                            {apiLoading ? "Creando..." : "Crear Producto"}
                        </button>
                    </div>

                    {apiLoading && (
                        <p className="text-xs text-slate-500 text-center mt-2">
                            Creando producto, por favor espere…
                        </p>
                    )}
                </form>
            </motion.div>
        </div>
    );
};

export default NewProductoModal;
