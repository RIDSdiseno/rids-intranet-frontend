import React from "react";
import { motion } from "framer-motion";
import {
    EditOutlined,
    CloseCircleOutlined,
    CheckCircleOutlined,
} from "@ant-design/icons";

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
    if (!show || !servicio) return null;

    const [formData, setFormData] = React.useState({
        nombre: servicio.nombre || "",
        descripcion: servicio.descripcion || "",
        precio: servicio.precio || 0,
        codigo: servicio.codigo || "",
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative"
            >
                <div className="p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">
                        Editar Servicio
                    </h2>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl"
                    >
                        ✕
                    </button>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Nombre del Servicio
                            </label>
                            <input
                                name="nombre"
                                value={formData.nombre}
                                onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                                placeholder="Nombre del servicio"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Descripción
                            </label>
                            <textarea
                                name="descripcion"
                                value={formData.descripcion}
                                onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 resize-none"
                                placeholder="Descripción del servicio"
                                rows={3}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Precio
                            </label>
                            <input
                                name="precio"
                                type="number"
                                step="0.01"
                                value={formData.precio}
                                onChange={(e) => setFormData(prev => ({ ...prev, precio: Number(e.target.value) }))}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                                placeholder="0"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Código
                            </label>
                            <input
                                name="codigo"
                                value={formData.codigo}
                                onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                                placeholder="Código del servicio"
                            />
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2.5 rounded-xl bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-all duration-200 font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={apiLoading}
                                className="px-6 py-2.5 rounded-xl text-white font-medium transition-all duration-200 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-lg hover:shadow-xl disabled:opacity-50"
                            >
                                {apiLoading ? "Guardando..." : "Guardar Cambios"}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default EditServicioModal;