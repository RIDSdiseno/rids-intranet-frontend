// ModalEditarEntidad.tsx
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

// TYPES
import type { OrigenGestioo } from "./types";

interface ModalEditarEntidadProps {
    entidadId: string;
    onClose: () => void;
    onSaved: () => void;
}

import { http } from "../../service/http";

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

    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Limpiar mensaje de error al cambiar entidadId
    useEffect(() => {
        setErrorMsg(null);
    }, [entidadId]);

    // Cargar datos de la entidad
    useEffect(() => {
        const cargar = async () => {
            if (!entidadId) return;

            setCargandoDatos(true);
            try {
                const { data } = await http.get(`/entidades/${entidadId}`);

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

        setLoading(true);
        try {
            await http.put(`/entidades/${entidadId}`, {
                nombre,
                rut: rut || null,
                correo: correo || null,
                telefono: telefono || null,
                direccion: direccion || null,
                origen,
            });

            onSaved();
            onClose();
        } catch (err: any) {
            console.error(err);

            const msg =
                err.response?.data?.error ||
                err.response?.data?.message ||
                "No se pudo actualizar la entidad.";

            setErrorMsg(msg);
        }
        finally {
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

    // Función para parsear errores de la API
    const parseApiError = async (res: Response): Promise<string> => {
        try {
            const data = await res.json();

            if (res.status === 400) {
                return data.error || "Datos inválidos. Revisa los campos ingresados.";
            }

            if (res.status === 409) {
                return "Ya existe una entidad con ese RUT.";
            }

            if (res.status === 401) {
                return "Tu sesión expiró. Vuelve a iniciar sesión.";
            }

            if (res.status === 403) {
                return "No tienes permisos para editar esta entidad.";
            }

            if (res.status >= 500) {
                return "Error interno del sistema. Intenta más tarde.";
            }

            return data.error || "No se pudo guardar la entidad.";
        } catch {
            return "Error inesperado al comunicarse con el servidor.";
        }
    };

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

                    {/* MSJ de Error */}
                    {errorMsg && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm">
                            {errorMsg}
                        </div>
                    )}

                    {/* Footer */}
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
