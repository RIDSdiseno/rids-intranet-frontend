// ModalNuevaEntidad.tsx
import React, { useEffect, useState } from "react";
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

    // Estado para mensaje de error
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Limpiar mensaje de error al abrir modal
    useEffect(() => {
        setErrorMsg(null);
    }, []);

    const parseApiError = async (res: Response): Promise<string> => {
        try {
            const data = await res.json();

            if (res.status === 400) {
                return data.error || "Datos inválidos. Revisa los campos.";
            }

            if (res.status === 409) {
                return "Ya existe una entidad registrada con este RUT.";
            }

            if (res.status === 401) {
                return "Tu sesión expiró. Vuelve a iniciar sesión.";
            }

            if (res.status === 403) {
                return "No tienes permisos para crear entidades.";
            }

            if (res.status >= 500) {
                return "Error interno del sistema. Intenta más tarde.";
            }

            return data.error || "No se pudo crear la entidad.";
        } catch {
            return "Error inesperado al comunicarse con el servidor.";
        }
    };

    const handleSave = async () => {
        if (!nombre.trim()) {
            setErrorMsg("El nombre de la entidad es obligatorio.");
            return;
        }

        if (correo && !correo.includes("@")) {
            setErrorMsg("El correo ingresado no tiene un formato válido.");
            return;
        }

        if (rut && rut.length < 6) {
            setErrorMsg("El RUT ingresado parece incorrecto.");
            return;
        }

        // Guardar nueva entidad
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

            // Manejo de errores
            if (!res.ok) {
                const msg = await parseApiError(res);
                setErrorMsg(msg);
                return;
            }

            const data = await res.json();
            onSaved(data.id ?? data.id_entidad);
            onClose();
        } catch (err) {
            console.error(err);
            setErrorMsg("No se pudo crear la entidad. Intenta nuevamente.");
        }
        finally {
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

                { /* Mensaje de error */}
                {errorMsg && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm">
                        {errorMsg}
                    </div>
                )}

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
