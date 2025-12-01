import React from "react";
import { motion } from "framer-motion";
import {
    BuildOutlined,
    BarcodeOutlined,
    SettingOutlined,
    FileTextOutlined,
    PhoneOutlined,
    EnvironmentOutlined,
    InfoCircleOutlined,
    CloseCircleOutlined,
    CheckCircleOutlined,
} from "@ant-design/icons";

import { formatearRut, validarRut } from "./utils";

import {
    validarEmail,
    validarTelefono,
    validarDireccion,
    validarNombre
} from "./utils"; // debe existir en utils.ts

import type { EmpresaForm } from "./types";

interface NewEmpresaModalProps {
    show: boolean;
    onClose: () => void;
    onSubmit: (datos: any) => void;
    formData: EmpresaForm;
    onFormChange: (field: keyof EmpresaForm, value: string) => void;
    apiLoading: boolean;
}

const NewEmpresaModal: React.FC<NewEmpresaModalProps> = ({
    show,
    onClose,
    onSubmit,
    formData,
    onFormChange,
    apiLoading,
}) => {

    if (!show) return null;

    // === VALIDACIONES AVANZADAS ===
    const nombreValido = validarNombre(formData.nombre);
    const rutValido = validarRut(formData.rut);
    const emailValido = validarEmail(formData.correo);
    const telefonoValido = validarTelefono(formData.telefono);
    const direccionValida = validarDireccion(formData.direccion);

    const formInvalido =
        !nombreValido ||
        !rutValido ||
        !emailValido ||
        !telefonoValido ||
        !direccionValida;

    // === SUBMIT ===
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (formInvalido) {
            alert("Hay campos inválidos. Por favor revise nuevamente.");
            return;
        }

        onSubmit({
            ...formData,
            tipo: "EMPRESA"
        });
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 overflow-y-auto">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative my-8"
            >
                {/* HEADER */}
                <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 rounded-xl text-white">
                            <BuildOutlined className="text-lg" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Crear Nueva Empresa</h2>
                            <p className="text-slate-600 text-sm mt-1">Complete la información de la empresa</p>
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

                    {/* NOMBRE */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <BuildOutlined className="text-blue-600 text-sm" />
                            Nombre de la Empresa *
                        </label>

                        <input
                            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
                            placeholder="Ej: Mi Empresa SpA"
                            value={formData.nombre}
                            onChange={(e) => onFormChange("nombre", e.target.value)}
                            required
                        />

                        {!nombreValido && (
                            <p className="text-rose-600 text-xs flex items-center gap-1">
                                <CloseCircleOutlined /> Mínimo 3 caracteres
                            </p>
                        )}
                    </div>

                    {/* RUT */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <BarcodeOutlined className="text-cyan-600 text-sm" />
                            RUT *
                        </label>

                        <input
                            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
                            placeholder="Ej: 12.345.678-9"
                            value={formData.rut}
                            onChange={(e) => onFormChange("rut", formatearRut(e.target.value))}
                            required
                        />

                        {!rutValido && (
                            <p className="text-rose-600 text-xs flex items-center gap-1">
                                <CloseCircleOutlined /> RUT inválido
                            </p>
                        )}
                    </div>

                    {/* ORIGEN */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <SettingOutlined className="text-indigo-600 text-sm" />
                            Origen *
                        </label>

                        <select
                            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm bg-white"
                            value={formData.origen}
                            onChange={(e) => onFormChange("origen", e.target.value)}
                            required
                        >
                            <option value="RIDS">RIDS</option>
                            <option value="ECONNET">ECONNET</option>
                            <option value="OTRO">OTRO</option>
                        </select>
                    </div>

                    {/* CORREO y TELÉFONO */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* CORREO */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <FileTextOutlined className="text-green-600 text-sm" />
                                Correo Electrónico
                            </label>

                            <input
                                type="email"
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
                                placeholder="ejemplo@empresa.com"
                                value={formData.correo}
                                onChange={(e) => onFormChange("correo", e.target.value)}
                            />

                            {!emailValido && (
                                <p className="text-rose-600 text-xs">
                                    <CloseCircleOutlined /> Correo inválido
                                </p>
                            )}
                        </div>

                        {/* TELÉFONO */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <PhoneOutlined className="text-purple-600 text-sm" />
                                Teléfono
                            </label>

                            <input
                                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
                                placeholder="+56 9 1234 5678"
                                value={formData.telefono}
                                onChange={(e) => onFormChange("telefono", e.target.value)}
                            />

                            {!telefonoValido && (
                                <p className="text-rose-600 text-xs">
                                    <CloseCircleOutlined /> Teléfono inválido (+56 9 XXXXXXXX)
                                </p>
                            )}
                        </div>
                    </div>

                    {/* DIRECCIÓN */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <EnvironmentOutlined className="text-amber-600 text-sm" />
                            Dirección
                        </label>

                        <input
                            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm"
                            placeholder="Ej: Av. Principal 123, Santiago"
                            value={formData.direccion}
                            onChange={(e) => onFormChange("direccion", e.target.value)}
                        />

                        {!direccionValida && (
                            <p className="text-rose-600 text-xs">
                                <CloseCircleOutlined /> Mínimo 5 caracteres
                            </p>
                        )}
                    </div>

                    {/* INFO */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <InfoCircleOutlined className="text-blue-500 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-blue-700">
                                    Información importante
                                </p>
                                <p className="text-xs text-blue-600 mt-1">
                                    La empresa creada estará disponible inmediatamente para usar en cotizaciones.
                                </p>
                            </div>
                        </div>
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
                            className="flex-1 px-4 py-3 rounded-xl text-white bg-gradient-to-r 
                                       from-blue-600 to-indigo-600 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <CheckCircleOutlined />
                            {apiLoading ? "Creando..." : "Crear Empresa"}
                        </button>
                    </div>

                </form>
            </motion.div>
        </div>
    );
};

export default NewEmpresaModal;
