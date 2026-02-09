import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    CloseOutlined,
    CheckCircleOutlined,
} from "@ant-design/icons";

interface NewServicioModalProps {
    show: boolean;
    onClose: () => void;
    onSave: (servicioData: any) => void;
    apiLoading: boolean;
}

const NewServicioModal: React.FC<NewServicioModalProps> = ({
    show,
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

    useEffect(() => {
        if (show) {
            setFormData({
                nombre: "",
                descripcion: "",
                precio: 0,
                categoria: "",
                duracionHoras: "",
            });
        }
    }, [show]);

    if (!show) return null;

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
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
            >
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-lg font-bold text-slate-800">
                        Crear Servicio
                    </h2>
                    <button onClick={onClose} className="text-slate-400">
                        <CloseOutlined />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Nombre */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Nombre <span className="text-rose-500">*</span>
                        </label>
                        <input
                            required
                            value={formData.nombre}
                            onChange={(e) =>
                                setFormData(p => ({ ...p, nombre: e.target.value }))
                            }
                            className="w-full border rounded-xl px-4 py-2"
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
                            className="w-full border rounded-xl px-4 py-2"
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
                            className="w-full border rounded-xl px-4 py-2"
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
                            className="w-full border rounded-xl px-4 py-2"
                        />
                    </div>

                    {/* Duración */}
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Duración (horas)
                        </label>
                        <input
                            type="number"
                            step={0.5}
                            min={0}
                            value={formData.duracionHoras}
                            onChange={(e) =>
                                setFormData(p => ({ ...p, duracionHoras: e.target.value }))
                            }
                            className="w-full border rounded-xl px-4 py-2"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <button type="button" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" disabled={apiLoading}>
                            {apiLoading ? "Creando..." : "Crear Servicio"}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

export default NewServicioModal;
