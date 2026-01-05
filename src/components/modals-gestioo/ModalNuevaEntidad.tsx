// ModalNuevaEntidad.tsx
import React, { useState } from "react";
import { motion } from "framer-motion";

// TYPES
import type { OrigenGestioo } from "./types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

export interface ModalNuevaEntidadProps {
    tipoEntidad: "EMPRESA" | "PERSONA";
    onClose: () => void;
    onSaved: (nuevoId: number) => void;
}

export const ModalNuevaEntidad: React.FC<ModalNuevaEntidadProps> = ({
    tipoEntidad,
    onClose,
    onSaved,
}) => {
    const [nombre, setNombre] = useState("");
    const [rut, setRut] = useState("");
    const [correo, setCorreo] = useState("");
    const [telefono, setTelefono] = useState("");
    const [direccion, setDireccion] = useState("");
    const [origen, setOrigen] = useState<OrigenGestioo>("RIDS");
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!nombre.trim()) {
            alert("El nombre es obligatorio");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/entidades`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    nombre,
                    rut: rut || null,
                    correo: correo || null,
                    telefono: telefono || null,
                    direccion: direccion || null,
                    tipo: tipoEntidad,
                    origen: tipoEntidad === "EMPRESA" ? origen : undefined,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Error al crear entidad");
            }

            const data = await res.json();
            onSaved(data.id ?? data.id_entidad);
            onClose();
        } catch (err) {
            alert((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-xl"
            >
                {/* Header */}
                <div className="border-b px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">
                        Nueva Entidad ({tipoEntidad === "EMPRESA" ? "Empresa" : "Persona"})
                    </h2>

                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-700 text-xl"
                        aria-label="Cerrar modal"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                            Nombre <span className="text-rose-500">*</span>
                        </label>
                        <input
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-cyan-400"
                            placeholder="Nombre de la entidad"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">
                                RUT
                            </label>
                            <input
                                value={rut}
                                onChange={(e) => setRut(e.target.value)}
                                className="w-full border border-slate-300 rounded-xl px-3 py-2"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">
                                Teléfono
                            </label>
                            <input
                                value={telefono}
                                onChange={(e) => setTelefono(e.target.value)}
                                className="w-full border border-slate-300 rounded-xl px-3 py-2"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">
                                Correo
                            </label>
                            <input
                                value={correo}
                                onChange={(e) => setCorreo(e.target.value)}
                                className="w-full border border-slate-300 rounded-xl px-3 py-2"
                            />
                        </div>

                        {tipoEntidad === "EMPRESA" && (
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Origen
                                </label>
                                <select
                                    value={origen}
                                    onChange={(e) => setOrigen(e.target.value as OrigenGestioo)}
                                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white"
                                >
                                    <option value="RIDS">RIDS</option>
                                    <option value="ECONNET">ECONNET</option>
                                    <option value="OTRO">OTRO</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                            Dirección
                        </label>
                        <input
                            value={direccion}
                            onChange={(e) => setDireccion(e.target.value)}
                            className="w-full border border-slate-300 rounded-xl px-3 py-2"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t px-6 py-4 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-white border border-slate-300"
                    >
                        Cancelar
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className={`px-4 py-2 rounded-xl text-white font-medium ${loading
                                ? "bg-cyan-400"
                                : "bg-cyan-600 hover:bg-cyan-700"
                            }`}
                    >
                        {loading ? "Guardando..." : "Guardar Entidad"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
