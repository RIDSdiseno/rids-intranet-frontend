import React, { useEffect } from "react";
import { motion } from "framer-motion";
import {
    EditOutlined,
    CloseCircleOutlined,
    CheckCircleOutlined,
    PercentageOutlined,
} from "@ant-design/icons";
import { calcularPrecioTotal, calcularPorcGanancia } from "./utils";
import { useApi } from "./UseApi";

interface EditProductoModalProps {
    show: boolean;
    producto: any;
    onClose: () => void;
    onSave: (productoData: any) => void;
    onBackToSelector: () => void;
    apiLoading: boolean;
}

// Interfaz para el estado del formulario
interface FormDataState {
    nombre: string;
    descripcion: string;
    precio: number;
    porcGanancia: number;
    precioTotal: number;
    categoria: string;
    stock: number;
    codigo: string;
    imagen: string | null;
    imagenFile: File | null;
}

const EditProductoModal: React.FC<EditProductoModalProps> = ({
    show,
    producto,
    onClose,
    onSave,
    onBackToSelector,
    apiLoading,
}) => {

    const [formData, setFormData] = React.useState<FormDataState>({
        nombre: "",
        descripcion: "",
        precio: 0,
        porcGanancia: 0,
        precioTotal: 0,
        categoria: "",
        stock: 0,
        codigo: "",
        imagen: null,
        imagenFile: null,
    });

    const { fetchApi: apiFetch } = useApi();

    // Cuando el modal se abre o cambia producto
    React.useEffect(() => {
        if (show && producto) {
            setFormData({
                nombre: producto.nombre || "",
                descripcion: producto.descripcion || "",
                precio: producto.precio || 0,
                porcGanancia: producto.porcGanancia || 0,
                precioTotal: producto.precioTotal || producto.precio || 0,
                categoria: producto.categoria || "",
                stock: producto.stock || 0,
                codigo: producto.codigo || producto.sku || "",
                imagen: producto.imagen ?? null,
                imagenFile: null,
            });
        }
    }, [show, producto]);

    useEffect(() => {
        console.log("Producto recibido:", producto);
    }, [producto]);

    // -------------------------
    // 2. Return DESPUÉS de hooks
    // -------------------------
    if (!show || !producto) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let imagenUrl = formData.imagen;

        // Si el usuario seleccionó una nueva imagen → subirla
        if (formData.imagenFile) {
            const form = new FormData();
            form.append("imagen", formData.imagenFile);

            console.log("Subiendo nueva imagen...", formData.imagenFile.name);

            const uploadResp = await apiFetch("/upload-imagenes/upload", {
                method: "POST",
                body: form
            });

            console.log("Respuesta de Cloudinary:", uploadResp);

            imagenUrl = uploadResp.secure_url || uploadResp.url || uploadResp.data?.url || null;

            if (!imagenUrl) {
                console.warn("Cloudinary no devolvió URL válida:", uploadResp);
            }
        }

        // Enviar datos al back
        onSave({
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            precio: formData.precio,
            porcGanancia: formData.porcGanancia,
            precioTotal: formData.precioTotal,
            categoria: formData.categoria,
            stock: formData.stock,
            serie: formData.codigo,
            imagen: imagenUrl,
        });
    };

    const handlePrecioChange = (precio: number) => {
        const precioTotal = calcularPrecioTotal(precio, formData.porcGanancia);
        setFormData(prev => ({
            ...prev,
            precio,
            precioTotal
        }));
    };

    const handlePorcGananciaChange = (porcGanancia: number) => {
        const precioTotal = calcularPrecioTotal(formData.precio, porcGanancia);
        setFormData(prev => ({
            ...prev,
            porcGanancia,
            precioTotal
        }));
    };

    const handlePrecioTotalChange = (precioTotal: number) => {
        const porcGanancia = calcularPorcGanancia(formData.precio, precioTotal);
        setFormData(prev => ({
            ...prev,
            precioTotal,
            porcGanancia
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-[10000] p-4 overflow-y-auto">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative my-8 max-h-[90vh] overflow-y-auto"
            >
                {/* Header mejorado */}
                <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-500 rounded-xl text-white">
                            <EditOutlined className="text-lg" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Editar Producto</h2>
                            <p className="text-slate-600 text-sm mt-1">Actualice la información del producto</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onBackToSelector}
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
                                name="nombre"
                                value={formData.nombre}
                                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                                placeholder="Ej: Laptop Dell XPS 13"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700">Categoría</label>
                            <input
                                name="categoria"
                                value={formData.categoria}
                                onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                                placeholder="Ej: Electrónicos, Informática"
                            />
                        </div>
                    </div>

                    {/* Descripción */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">Descripción</label>
                        <textarea
                            name="descripcion"
                            value={formData.descripcion}
                            onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 resize-none"
                            placeholder="Descripción detallada del producto..."
                            rows={3}
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
                                    value={formData.precio || ""}
                                    onChange={(e) => handlePrecioChange(Number(e.target.value) || 0)}
                                    className="w-full border border-cyan-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 bg-white"
                                    placeholder="0"
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
                                        value={formData.porcGanancia || ""}
                                        onChange={(e) => handlePorcGananciaChange(Number(e.target.value) || 0)}
                                        className="w-full border border-cyan-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 bg-white pr-12"
                                        placeholder="0"
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
                                    value={formData.precioTotal || ""}
                                    onChange={(e) => handlePrecioTotalChange(Number(e.target.value) || 0)}
                                    className="w-full border border-emerald-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 bg-white font-semibold text-emerald-700"
                                    placeholder="0"
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

                    {/* Stock y Código */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700">Stock</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.stock || ""}
                                onChange={(e) => setFormData(prev => ({ ...prev, stock: Number(e.target.value) }))}
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                                placeholder="0"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700">Código/Serie</label>
                            <input
                                name="codigo"
                                value={formData.codigo}
                                onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                                placeholder="Ej: PROD-001, SKU-123"
                            />
                        </div>
                    </div>

                    {/* Imagen del producto */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">
                            Imagen del Producto
                        </label>

                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                setFormData(prev => ({
                                    ...prev,
                                    imagenFile: file
                                }));
                            }}
                            className="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm"
                        />

                        {/* Miniatura si existe imagen actual */}
                        {formData.imagen && (
                            <div className="mt-3">
                                <p className="text-xs text-slate-500 mb-1">Imagen actual:</p>
                                <img
                                    src={formData.imagen}
                                    alt="Imagen del producto"
                                    className="h-32 w-32 object-cover rounded-lg border"
                                    onError={(e) => {
                                        // Si falla la imagen, ocultar
                                        e.currentTarget.style.display = 'none';
                                    }}
                                />
                            </div>
                        )}

                        {/* Preview de nueva imagen si se selecciona */}
                        {formData.imagenFile && (
                            <div className="mt-3">
                                <p className="text-xs text-emerald-600 mb-1">Nueva imagen seleccionada:</p>
                                <img
                                    src={URL.createObjectURL(formData.imagenFile)}
                                    alt="Preview"
                                    className="h-32 w-32 object-cover rounded-lg border"
                                />
                            </div>
                        )}
                    </div>

                    {/* Botones de acción */}
                    <div className="flex gap-3 pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={onBackToSelector}
                            className="flex-1 px-4 py-3 rounded-xl bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-all duration-200 font-medium flex items-center justify-center gap-2"
                        >
                            <CloseCircleOutlined />
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={apiLoading}
                            className="flex-1 px-4 py-3 rounded-xl text-white font-medium transition-all duration-200 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <CheckCircleOutlined />
                            {apiLoading ? "Guardando..." : "Guardar Cambios"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default EditProductoModal;