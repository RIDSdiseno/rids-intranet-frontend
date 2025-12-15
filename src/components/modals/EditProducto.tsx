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
    onUpdateRealTime?: (itemActualizado: any) => void;
}

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
    onUpdateRealTime
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

    // =====================================================================================
    // 🔥 FUNCIONALIDAD PRINCIPAL — sincroniza el item con los cambios en tiempo real
    // =====================================================================================
    const updateRealTimeGeneral = () => {
        if (!onUpdateRealTime) return;

        onUpdateRealTime({
            id: producto.id,

            nombre: formData.nombre,           // 👈 nombre real del ítem
            descripcion: formData.descripcion, // 👈 descripción larga

            precioCosto: formData.precio,
            porcGanancia: formData.porcGanancia,
            precioOriginalCLP: formData.precioTotal,
            precio: formData.precioTotal,

            tieneIVA: producto.tieneIVA ?? true,
            imagen: formData.imagen,
            categoria: formData.categoria,
            stock: formData.stock,
            codigo: formData.codigo,
        });
    };

    // =====================================================================================
    // Al abrir el modal, cargar datos del producto seleccionado
    // =====================================================================================
    React.useEffect(() => {
        if (show && producto) {
            setFormData({
                nombre: producto.nombre || "",
                descripcion: producto.descripcion || "",

                // 👇 COSTO REAL SIEMPRE VIENE DE precioCosto
                precio: producto.precioCosto ?? producto.precio ?? 0,

                // 👇 GANANCIA SIEMPRE DEL PRODUCTO
                porcGanancia: producto.porcGanancia ?? 0,

                // 👇 PRECIO FINAL DEBE SER SIEMPRE costo * (1 + ganancia/100)
                precioTotal: calcularPrecioTotal(
                    producto.precioCosto ?? 0,
                    producto.porcGanancia ?? 0
                ),

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

    if (!show || !producto) return null;

    // =====================================================================================
    // GUARDAR CAMBIOS
    // =====================================================================================
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let imagenUrl = formData.imagen;
        let newPublicId = producto.publicId;
        let uploadResp: any = null;

        if (formData.imagenFile) {
            const form = new FormData();
            form.append("productoId", String(producto.id));
            form.append("imagen", formData.imagenFile);

            uploadResp = await apiFetch("/upload-imagenes/upload", {
                method: "POST",
                body: form,
            });

            imagenUrl = uploadResp?.producto?.imagen || imagenUrl;
            newPublicId = uploadResp?.producto?.publicId || newPublicId;
        }

        // 🔥 AQUÍ ESTÁ EL PROBLEMA: No estabas enviando la descripción
        onSave({
            id: producto.id,
            nombre: formData.nombre,           // 🟢 Nombre
            descripcion: formData.descripcion, // 🟢 Descripción (NUEVO)

            precioCosto: formData.precio,
            precio: formData.precio,
            porcGanancia: formData.porcGanancia,

            categoria: formData.categoria,
            stock: formData.stock,

            serie: formData.codigo,

            imagen: imagenUrl,
            publicId: newPublicId,
        });
    };

    // =====================================================================================
    // HANDLERS NUMÉRICOS (COSTO, % GANANCIA, PRECIO FINAL)
    // =====================================================================================
    const handlePrecioChange = (precio: number) => {
        const nuevo = {
            ...formData,
            precio,
            precioTotal: calcularPrecioTotal(precio, formData.porcGanancia),
        };
        setFormData(nuevo);
        updateRealTimeGeneral();
    };

    const handlePorcGananciaChange = (porcGanancia: number) => {
        const nuevo = {
            ...formData,
            porcGanancia,
            precioTotal: calcularPrecioTotal(formData.precio, porcGanancia),
        };
        setFormData(nuevo);
        updateRealTimeGeneral();
    };

    const handlePrecioTotalChange = (precioTotal: number) => {
        const nuevo = {
            ...formData,
            precioTotal,
            porcGanancia: calcularPorcGanancia(formData.precio, precioTotal),
        };
        setFormData(nuevo);
        updateRealTimeGeneral();
    };

    // =====================================================================================
    // RENDER
    // =====================================================================================
    return (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-[10000] p-4 overflow-y-auto">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative my-8 max-h-[90vh] overflow-y-auto"
            >
                {/* HEADER */}
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

                {/* Btn Cerrar EDIT */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    ✕
                </button>

                {/* FORMULARIO */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">

                    {/* Nombre y categoría */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700">Nombre *</label>
                            <input
                                name="nombre"
                                value={formData.nombre}
                                onChange={(e) => {
                                    setFormData(prev => ({ ...prev, nombre: e.target.value }));
                                    updateRealTimeGeneral();
                                }}
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700">Categoría</label>
                            <input
                                name="categoria"
                                value={formData.categoria}
                                onChange={(e) => {
                                    setFormData(prev => ({ ...prev, categoria: e.target.value }));
                                    updateRealTimeGeneral();
                                }}
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                            />
                        </div>
                    </div>

                    {/* Descripción */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">Descripción</label>
                        <textarea
                            name="descripcion"
                            value={formData.descripcion}
                            onChange={(e) => {
                                setFormData(prev => ({ ...prev, descripcion: e.target.value }));
                                updateRealTimeGeneral();
                            }}
                            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 resize-none"
                            rows={3}
                        />
                    </div>

                    {/* COSTO - GANANCIA - PRECIO FINAL */}
                    <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-xl p-4">

                        <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
                            <PercentageOutlined className="text-cyan-600" />
                            Cálculo de Precios y Ganancia
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                            {/* Precio costo */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700">Precio costo *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.precio || ""}
                                    onChange={(e) => handlePrecioChange(Number(e.target.value) || 0)}
                                    className="w-full border border-cyan-200 rounded-xl px-4 py-3 text-sm bg-white"
                                    required
                                />
                            </div>

                            {/* Porcentaje de ganancia */}
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
                                        className="w-full border border-cyan-200 rounded-xl px-4 py-3 text-sm bg-white pr-12"
                                    />
                                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500">%</span>
                                </div>
                            </div>

                            {/* Precio Venta */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700">Precio Venta</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.precioTotal || ""}
                                    onChange={(e) => handlePrecioTotalChange(Number(e.target.value) || 0)}
                                    className="w-full border border-emerald-200 rounded-xl px-4 py-3 text-sm bg-white font-semibold text-emerald-700"
                                />
                            </div>
                        </div>

                        {/* RESUMEN DE GANANCIA */}
                        {formData.precio > 0 && formData.precioTotal > 0 && (
                            <div className="mt-4 p-3 bg-white border border-emerald-200 rounded-lg">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Ganancia por unidad:</span>
                                        <span className="font-bold text-emerald-700">
                                            ${(formData.precioTotal - formData.precio).toLocaleString("es-CL")}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Margen:</span>
                                        <span className="font-bold text-emerald-700">
                                            {formData.porcGanancia}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* STOCK Y CÓDIGO */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700">Stock</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.stock || ""}
                                onChange={(e) => {
                                    setFormData(prev => ({ ...prev, stock: Number(e.target.value) }));
                                    updateRealTimeGeneral();
                                }}
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700">Código / Serie</label>
                            <input
                                name="codigo"
                                value={formData.codigo}
                                onChange={(e) => {
                                    setFormData(prev => ({ ...prev, codigo: e.target.value }));
                                    updateRealTimeGeneral();
                                }}
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
                            />
                        </div>
                    </div>

                    {/* IMAGEN */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700">Imagen</label>

                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                setFormData(prev => ({ ...prev, imagenFile: file }));
                                updateRealTimeGeneral();
                            }}
                            className="w-full border border-slate-300 rounded-xl px-4 py-2 text-sm"
                        />

                        {formData.imagen && (
                            <div className="mt-3">
                                <p className="text-xs text-slate-500 mb-1">Imagen actual:</p>
                                <img
                                    src={formData.imagen}
                                    alt="Producto"
                                    className="h-32 w-32 object-cover rounded-lg border"
                                />
                            </div>
                        )}

                        {formData.imagenFile && (
                            <div className="mt-3">
                                <p className="text-xs text-emerald-600 mb-1">Previsualización:</p>
                                <img
                                    src={URL.createObjectURL(formData.imagenFile)}
                                    alt="Preview"
                                    className="h-32 w-32 object-cover rounded-lg border"
                                />
                            </div>
                        )}
                    </div>

                    {/* BOTONES */}
                    <div className="flex gap-3 pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
                        >
                            <CloseCircleOutlined />
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={apiLoading}
                            className="flex-1 px-4 py-3 rounded-xl text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-lg"
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
