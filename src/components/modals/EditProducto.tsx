import React, { useEffect } from "react";
import { motion } from "framer-motion";
import {
    EditOutlined,
    CloseCircleOutlined,
    CheckCircleOutlined,
    PercentageOutlined,
    InfoCircleOutlined,
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
    apiLoading,
    onUpdateRealTime,
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

    const { fetchApi } = useApi(); // hook estable

    // ✅ UN SOLO useEffect
    useEffect(() => {
        if (!show || !producto) return;

        setFormData({
            nombre: producto.nombre || "",
            descripcion: producto.descripcion || "",
            precio: producto.precioCosto ?? producto.precio ?? 0,
            porcGanancia: producto.porcGanancia ?? 0,
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
    }, [show, producto]);

    // 👇 return recién acá
    if (!show || !producto) return null;

    // ======================================================
    // VALIDACIONES
    // ======================================================
    const nombreInvalido = !formData.nombre.trim();
    const precioInvalido = formData.precio <= 0;
    const precioVentaInvalido = formData.precioTotal <= 0;

    const tieneErrores =
        nombreInvalido || precioInvalido || precioVentaInvalido;

    // ======================================================
    // SINCRONIZACIÓN TIEMPO REAL
    // ======================================================
    const updateRealTimeGeneral = () => {
        if (!onUpdateRealTime) return;

        onUpdateRealTime({
            id: producto.id,
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            precioCosto: formData.precio,
            porcGanancia: formData.porcGanancia,
            precioOriginalCLP: formData.precioTotal,
            precio: formData.precioTotal,
            imagen: formData.imagen,
            categoria: formData.categoria,
            stock: formData.stock,
            codigo: formData.codigo,
        });
    };

    // ======================================================
    // SUBMIT SEGURO
    // ======================================================
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (nombreInvalido) {
            alert("El nombre del producto es obligatorio.");
            return;
        }

        if (precioInvalido) {
            alert("El precio de costo debe ser mayor a 0.");
            return;
        }

        if (precioVentaInvalido) {
            alert("El precio de venta debe ser mayor a 0.");
            return;
        }

        let imagenUrl = formData.imagen;
        let publicId = producto.publicId;

        if (formData.imagenFile) {
            const form = new FormData();
            form.append("productoId", String(producto.id));
            form.append("imagen", formData.imagenFile);

            const uploadResp = await fetchApi("/upload-imagenes/upload", {
                method: "POST",
                body: form,
            });

            imagenUrl = uploadResp?.producto?.imagen || imagenUrl;
            publicId = uploadResp?.producto?.publicId || publicId;
        }

        onSave({
            id: producto.id,
            nombre: formData.nombre,
            descripcion: formData.descripcion,
            precioCosto: formData.precio,
            porcGanancia: formData.porcGanancia,
            categoria: formData.categoria,
            stock: formData.stock,
            serie: formData.codigo,
            imagen: imagenUrl,
            publicId,
        });
    };

    // ======================================================
    // HANDLERS NUMÉRICOS
    // ======================================================
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
            porcGanancia: calcularPorcGanancia(
                formData.precio,
                precioTotal
            ),
        };
        setFormData(nuevo);
        updateRealTimeGeneral();
    };

    // ======================================================
    // RENDER
    // ======================================================
    return (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-[10000] p-4 overflow-y-auto">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl relative my-8"
            >
                {/* HEADER */}
                <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-500 rounded-xl text-white">
                            <EditOutlined className="text-lg" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">
                                Editar Producto
                            </h2>
                            <p className="text-slate-600 text-sm mt-1">
                                Actualiza la información del producto
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
                    {/* NOMBRE */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700">
                            Nombre *
                        </label>
                        <input
                            value={formData.nombre}
                            onChange={(e) =>
                                setFormData((p) => ({
                                    ...p,
                                    nombre: e.target.value,
                                }))
                            }
                            className={`w-full border rounded-xl px-4 py-3 text-sm
                                ${nombreInvalido
                                    ? "border-rose-400"
                                    : "border-slate-300"
                                }`}
                        />
                        {nombreInvalido && (
                            <p className="text-xs text-rose-600 mt-1">
                                El nombre es obligatorio
                            </p>
                        )}
                    </div>

                    {/* DESCRIPCIÓN */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700">
                            Descripción
                        </label>
                        <textarea
                            value={formData.descripcion}
                            onChange={(e) =>
                                setFormData((p) => ({
                                    ...p,
                                    descripcion: e.target.value,
                                }))
                            }
                            rows={3}
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
                                value={formData.precio}
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
                                value={formData.porcGanancia}
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
                                value={formData.precioTotal}
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

                    {/* BOTONES */}
                    <div className="flex gap-3 pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl bg-white border border-slate-300"
                        >
                            <CloseCircleOutlined /> Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={apiLoading || tieneErrores}
                            title={
                                nombreInvalido
                                    ? "Nombre obligatorio"
                                    : precioInvalido
                                        ? "Costo inválido"
                                        : precioVentaInvalido
                                            ? "Precio de venta inválido"
                                            : ""
                            }
                            className="flex-1 px-4 py-3 rounded-xl text-white bg-gradient-to-r from-cyan-600 to-blue-600 disabled:opacity-50"
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
