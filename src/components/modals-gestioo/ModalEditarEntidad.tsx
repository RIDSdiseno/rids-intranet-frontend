// ModalEditarEntidad.tsx
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

// TYPES
import type { OrigenGestioo } from "./types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

interface ModalEditarEntidadProps {
    entidadId: string;
    onClose: () => void;
    onSaved: () => void;
}

export const ModalEditarEntidad: React.FC<ModalEditarEntidadProps> = ({
    entidadId,
    onClose,
    onSaved,
}) => {
    const [loading, setLoading] = useState(false);
    const [cargandoDatos, setCargandoDatos] = useState(true);

    const [nombre, setNombre] = useState("");
    const [rut, setRut] = useState("");
    const [correo, setCorreo] = useState("");
    const [telefono, setTelefono] = useState("");
    const [direccion, setDireccion] = useState("");
    const [origen, setOrigen] = useState<OrigenGestioo>("RIDS");

    useEffect(() => {
        const cargar = async () => {
            if (!entidadId) return;

            setCargandoDatos(true);
            try {
                const res = await fetch(`${API_URL}/entidades/${entidadId}`, {
                    credentials: "include",
                });

                if (!res.ok) throw new Error("Error al cargar entidad");

                const data = await res.json();
                const entidad = data.data ?? data;

                setNombre(entidad.nombre ?? "");
                setRut(entidad.rut ?? "");
                setCorreo(entidad.correo ?? "");
                setTelefono(entidad.telefono ?? "");
                setDireccion(entidad.direccion ?? "");
                setOrigen(entidad.origen ?? "RIDS");
            } catch (err) {
                console.error(err);
                alert("Error al cargar la entidad");
            } finally {
                setCargandoDatos(false);
            }
        };

        cargar();
    }, [entidadId]);

    const handleSave = async () => {
        if (!nombre.trim()) {
            alert("El nombre es obligatorio");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/entidades/${entidadId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    nombre,
                    rut: rut || null,
                    correo: correo || null,
                    telefono: telefono || null,
                    direccion: direccion || null,
                    origen,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Error al actualizar entidad");
            }

            onSaved();
            onClose();
        } catch (err) {
            console.error(err);
            alert("Error al actualizar la entidad");
        } finally {
            setLoading(false);
        }
    };

    if (cargandoDatos) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-2xl shadow-xl">
                    Cargando datos de la entidad…
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative"
            >
                <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-800 mb-6">
                        Editar Entidad
                    </h3>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl"
                    >
                        ✕
                    </button>

                    <div className="space-y-4">
                        <Input label="Nombre *" value={nombre} onChange={setNombre} />
                        <Input label="RUT" value={rut} onChange={setRut} />
                        <Input label="Correo" value={correo} onChange={setCorreo} />
                        <Input label="Teléfono" value={telefono} onChange={setTelefono} />
                        <Input
                            label="Dirección"
                            value={direccion}
                            onChange={setDireccion}
                        />

                        <div>
                            <label className="block text-sm font-semibold mb-1">
                                Origen
                            </label>
                            <select
                                value={origen}
                                onChange={(e) =>
                                    setOrigen(e.target.value as OrigenGestioo)
                                }
                                className="w-full border rounded-xl px-3 py-2"
                            >
                                <option value="RIDS">RIDS</option>
                                <option value="ECONNET">ECONNET</option>
                                <option value="OTRO">OTRO</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                        <button
                            onClick={onClose}
                            className="px-5 py-2 rounded-xl border"
                        >
                            Cancelar
                        </button>

                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className={`px-5 py-2 rounded-xl text-white ${loading ? "bg-cyan-400" : "bg-cyan-600"
                                }`}
                        >
                            {loading ? "Guardando…" : "Guardar cambios"}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// 🔹 Input reutilizable local
const Input = ({
    label,
    value,
    onChange,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
}) => (
    <div>
        <label className="block text-sm font-semibold mb-1">{label}</label>
        <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full border rounded-xl px-3 py-2"
        />
    </div>
);
