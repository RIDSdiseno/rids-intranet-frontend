import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CloseOutlined, CheckCircleOutlined } from "@ant-design/icons";

interface EditServicioModalProps {
    show: boolean;
    servicio: any;
    onClose: () => void;
    onSave: (servicioData: any) => void;
    apiLoading: boolean;
}

const EditServicioModal: React.FC<EditServicioModalProps> = ({
    show,
    servicio,
    onClose,
    onSave,
    apiLoading,
}) => {
    const [formData, setFormData] = useState({
        nombre: "",
        descripcion: "",
        precio: 0,
        categoria: "",
        duracionHoras: "",
    });

    // 🔄 sincroniza cuando cambia el servicio
    useEffect(() => {
        if (servicio) {
            setFormData({
                nombre: servicio.nombre ?? "",
                descripcion: servicio.descripcion ?? "",
                precio: servicio.precio ?? 0,
                categoria: servicio.categoria ?? "",
                duracionHoras: servicio.duracionHoras ?? "",
            });
        }
    }, [servicio]);

    if (!show || !servicio) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        onSave({
            nombre: formData.nombre.trim(),
            descripcion: formData.descripcion?.trim() || null,
            precio: Number(formData.precio),
            categoria: formData.categoria?.trim() || null,
            duracionHoras: formData.duracionHoras
                ? Number(formData.duracionHoras)
                : null,
        });
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-lg font-bold text-slate-800">
                        Editar Servicio
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <CloseOutlined />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Nombre */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Nombre del servicio <span className="text-rose-500">*</span>
                        </label>
                        <input
                            required
                            value={formData.nombre}
                            onChange={(e) =>
                                setFormData(p => ({ ...p, nombre: e.target.value }))
                            }
                            className="w-full border rounded-xl px-4 py-2 focus:ring-2 focus:ring-cyan-400"
                        />
                    </div>

                    {/* Descripción */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Descripción (opcional)
                        </label>
                        <textarea
                            rows={3}
                            value={formData.descripcion}
                            onChange={(e) =>
                                setFormData(p => ({ ...p, descripcion: e.target.value }))
                            }
                            className="w-full border rounded-xl px-4 py-2 resize-none focus:ring-2 focus:ring-cyan-400"
                        />
                    </div>

                    {/* Precio */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Precio
                        </label>
                        <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={formData.precio}
                            onChange={(e) =>
                                setFormData(p => ({ ...p, precio: Number(e.target.value) }))
                            }
                            className="w-full border rounded-xl px-4 py-2 focus:ring-2 focus:ring-cyan-400"
                        />
                    </div>

                    {/* Categoría */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Categoría (opcional)
                        </label>
                        <input
                            value={formData.categoria}
                            onChange={(e) =>
                                setFormData(p => ({ ...p, categoria: e.target.value }))
                            }
                            className="w-full border rounded-xl px-4 py-2 focus:ring-2 focus:ring-cyan-400"
                        />
                    </div>

                    {/* Duración */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Duración (horas)
                        </label>
                        <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={formData.duracionHoras}
                            onChange={(e) =>
                                setFormData(p => ({ ...p, duracionHoras: e.target.value }))
                            }
                            className="w-full border rounded-xl px-4 py-2 focus:ring-2 focus:ring-cyan-400"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2 rounded-xl border"
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={apiLoading}
                            className="px-6 py-2 rounded-xl bg-cyan-600 text-white disabled:opacity-50 flex items-center gap-2"
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

export default EditServicioModal;
