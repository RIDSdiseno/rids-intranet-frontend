import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

/* =========================
   TipoEquipo como CONST (compatible con erasableSyntaxOnly)
========================= */
export const TipoEquipo = {
    GENERICO: "GENERICO",
    NOTEBOOK: "NOTEBOOK",
    ALL_IN_ONE: "ALL_IN_ONE",
    DESKTOP: "DESKTOP",
    CPU: "CPU",
    EQUIPO_ARMADO: "EQUIPO_ARMADO",

    IMPRESORA: "IMPRESORA",
    SCANNER: "SCANNER",
    LASER: "LASER",
    LED: "LED",

    MONITOR: "MONITOR",
    NAS: "NAS",
    ROUTER: "ROUTER",

    DISCO_DURO_EXTERNO: "DISCO_DURO_EXTERNO",
    CARGADOR: "CARGADOR",
    INSUMOS_COMPUTACIONALES: "INSUMOS_COMPUTACIONALES",

    RELOJ_CONTROL: "RELOJ_CONTROL",

    OTRO: "OTRO",
} as const;

/** ✅ Type derivado (reemplaza al enum) */
export type TipoEquipoValue = typeof TipoEquipo[keyof typeof TipoEquipo];

export const TipoEquipoLabel: Record<TipoEquipoValue, string> = {
    GENERICO: "Genérico",
    NOTEBOOK: "Notebook",
    ALL_IN_ONE: "All in One",
    DESKTOP: "Desktop",
    CPU: "CPU",
    EQUIPO_ARMADO: "Equipo Armado",

    IMPRESORA: "Impresora",
    SCANNER: "Scanner",
    LASER: "Láser",
    LED: "LED",

    MONITOR: "Monitor",
    NAS: "NAS",
    ROUTER: "Router",

    DISCO_DURO_EXTERNO: "Disco Duro Externo",
    CARGADOR: "Cargador",
    INSUMOS_COMPUTACIONALES: "Insumos Computacionales",

    RELOJ_CONTROL: "Reloj Control",

    OTRO: "Otro",
};

/* =========================
   Tipos
========================= */
interface EquipoGestioo {
    id_equipo: number;
    marca: string;
    modelo: string;
    serial: string | null;
    tipo: TipoEquipoValue;
}

interface ModalEditarEquipoProps {
    equipo: EquipoGestioo;
    onClose: () => void;
    onSaved: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

/* =========================
   Componente
========================= */
export const ModalEditarEquipo: React.FC<ModalEditarEquipoProps> = ({
    equipo,
    onClose,
    onSaved,
}) => {
    const [marca, setMarca] = useState(equipo.marca);
    const [modelo, setModelo] = useState(equipo.modelo);
    const [serial, setSerial] = useState(equipo.serial ?? "");
    const [tipo, setTipo] = useState<TipoEquipoValue>(
        equipo.tipo ?? TipoEquipo.GENERICO
    );

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setMarca(equipo.marca);
        setModelo(equipo.modelo);
        setSerial(equipo.serial ?? "");
        setTipo(equipo.tipo ?? TipoEquipo.GENERICO);
    }, [equipo]);

    const handleSave = async () => {
        if (!marca.trim() || !modelo.trim()) {
            alert("La marca y el modelo son obligatorios");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/equipos/${equipo.id_equipo}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    marca: marca.trim(),
                    modelo: modelo.trim(),
                    serial: serial.trim() || null,
                    tipo, // ✅ string enum-like validado por union type
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Error al actualizar equipo");
            }

            onSaved();
            onClose();
        } catch (err) {
            console.error(err);
            alert((err as Error).message);
        } finally {
            setLoading(false);
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
                        Editar Equipo #{equipo.id_equipo}
                    </h3>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl"
                        aria-label="Cerrar modal"
                    >
                        ✕
                    </button>

                    <div className="space-y-4">
                        {/* Marca */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Marca <span className="text-rose-500">*</span>
                            </label>
                            <input
                                value={marca}
                                onChange={(e) => setMarca(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-400"
                            />
                        </div>

                        {/* Modelo */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Modelo <span className="text-rose-500">*</span>
                            </label>
                            <input
                                value={modelo}
                                onChange={(e) => setModelo(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-400"
                            />
                        </div>

                        {/* Serie */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Número de Serie
                            </label>
                            <input
                                value={serial}
                                onChange={(e) => setSerial(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-400"
                            />
                        </div>

                        {/* Tipo de Equipo */}
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Tipo de Equipo
                            </label>
                            <select
                                value={tipo}
                                onChange={(e) => setTipo(e.target.value as TipoEquipoValue)}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white focus:ring-2 focus:ring-emerald-400"
                            >
                                {Object.values(TipoEquipo).map((t) => (
                                    <option key={t} value={t}>
                                        {TipoEquipoLabel[t]}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
                        >
                            Cancelar
                        </button>

                        <button
                            onClick={handleSave}
                            disabled={loading || !marca.trim() || !modelo.trim()}
                            className={`px-6 py-2.5 rounded-xl text-white font-medium ${loading
                                    ? "bg-emerald-400 cursor-not-allowed"
                                    : "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                                }`}
                        >
                            {loading ? "Guardando..." : "Guardar cambios"}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
