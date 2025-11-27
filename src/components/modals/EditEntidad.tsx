import React from "react";
import { motion } from "framer-motion";
import {
    EditOutlined,
    UserOutlined,
    BarcodeOutlined,
    FileTextOutlined,
    PhoneOutlined,
    EnvironmentOutlined,
    InfoCircleOutlined,
    CloseCircleOutlined,
    CheckCircleOutlined,
} from "@ant-design/icons";
import { formatearRut, validarRut } from "./utils";
import type { EntidadGestioo } from "./types";

interface EditEntidadModalProps {
    show: boolean;
    entidad: EntidadGestioo | null;
    onClose: () => void;
    onSubmit: (datos: any) => void;
    formData: {
        nombre: string;
        rut: string;
        correo: string;
        telefono: string;
        direccion: string;
    };
    onFormChange: (field: string, value: string) => void;
    apiLoading: boolean;
}

const EditEntidadModal: React.FC<EditEntidadModalProps> = ({
    show,
    entidad,
    onClose,
    onSubmit,
    formData,
    onFormChange,
    apiLoading,
}) => {
    if (!show || !entidad) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative"
            >
                {/* Header mejorado */}
                <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500 rounded-xl text-white">
                            <EditOutlined className="text-lg" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Editar Persona</h2>
                            <p className="text-slate-600 text-sm mt-1">Actualice la información de la persona</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    ✕
                </button>

                {/* Formulario mejorado */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Campo Nombre */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <UserOutlined className="text-emerald-600 text-sm" />
                            Nombre Completo *
                        </label>
                        <input
                            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all duration-200"
                            placeholder="Ej: Juan Pérez González"
                            value={formData.nombre}
                            onChange={(e) => onFormChange("nombre", e.target.value)}
                            required
                        />
                    </div>

                    {/* Campo RUT */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <BarcodeOutlined className="text-cyan-600 text-sm" />
                            RUT
                        </label>
                        <input
                            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-200"
                            placeholder="Ej: 12.345.678-9"
                            value={formData.rut}
                            onChange={(e) => onFormChange("rut", formatearRut(e.target.value))}
                        />
                        {formData.rut && !validarRut(formData.rut) && (
                            <p className="text-rose-600 text-xs flex items-center gap-1">
                                <CloseCircleOutlined />
                                RUT no válido
                            </p>
                        )}
                    </div>

                    {/* Grid para Correo y Teléfono */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Campo Correo */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <FileTextOutlined className="text-blue-600 text-sm" />
                                Correo Electrónico
                            </label>
                            <input
                                type="email"
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200"
                                placeholder="ejemplo@correo.com"
                                value={formData.correo}
                                onChange={(e) => onFormChange("correo", e.target.value)}
                            />
                        </div>

                        {/* Campo Teléfono */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <PhoneOutlined className="text-indigo-600 text-sm" />
                                Teléfono
                            </label>
                            <input
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                                placeholder="+56 9 1234 5678"
                                value={formData.telefono}
                                onChange={(e) => onFormChange("telefono", e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Campo Dirección */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <EnvironmentOutlined className="text-amber-600 text-sm" />
                            Dirección
                        </label>
                        <input
                            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all duration-200"
                            placeholder="Ej: Av. Principal 123, Santiago"
                            value={formData.direccion}
                            onChange={(e) => onFormChange("direccion", e.target.value)}
                        />
                    </div>

                    {/* Información de la persona */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <InfoCircleOutlined className="text-blue-500 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-blue-700">Editando persona existente</p>
                                <p className="text-xs text-blue-600 mt-1">
                                    ID: {entidad.id}
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
                            className="flex-1 px-4 py-3 rounded-xl text-white font-medium transition-all duration-200 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
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

export default EditEntidadModal;