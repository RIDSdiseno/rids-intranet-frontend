import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { SearchOutlined } from "@ant-design/icons";

export interface EquipoOption {
    id_equipo: number;
    serial: string | null;
    marca: string;
    modelo: string;
    tipo?: string;
    empresa?: string | null;       // 🔥 NUEVO
    solicitante?: string | null;   // 🔥 NUEVO
}

interface SelectEquipoModalProps {
    show: boolean;
    equipos: EquipoOption[];
    loading?: boolean;
    onClose: () => void;
    onSelect: (equipo: EquipoOption) => void | Promise<void>;
}

const TIPO_COLORS: Record<string, { bg: string; text: string }> = {
    NOTEBOOK: { bg: "bg-blue-50", text: "text-blue-700" },
    ALL_IN_ONE: { bg: "bg-green-50", text: "text-green-700" },
    DESKTOP: { bg: "bg-purple-50", text: "text-purple-700" },
    IMPRESORA: { bg: "bg-amber-50", text: "text-amber-700" },
    default: { bg: "bg-slate-100", text: "text-slate-600" },
};

const tipoLabel = (tipo?: string) =>
    tipo ? tipo.replace(/_/g, " ") : "GENÉRICO";

const tipoColor = (tipo?: string) =>
    TIPO_COLORS[tipo ?? ""] ?? TIPO_COLORS.default;

const SelectEquipoModal: React.FC<SelectEquipoModalProps> = ({
    show,
    equipos,
    loading = false,
    onClose,
    onSelect,
}) => {
    const [search, setSearch] = useState("");

    const filtrados = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return equipos;
        return equipos.filter((eq) =>
            [eq.serial, eq.marca, eq.modelo, eq.empresa, eq.solicitante, String(eq.id_equipo)]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(q)
        );
    }, [equipos, search]);

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
                initial={{ scale: 0.97, opacity: 0, y: 12 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
                {/* HEADER */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between">
                    <div>
                        <h3 className="text-base font-semibold text-slate-800">Seleccionar equipo</h3>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Vincula un equipo existente al producto
                        </p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 text-lg leading-none">
                        ×
                    </button>
                </div>

                {/* BUSCADOR */}
                <div className="px-6 py-3 border-b border-slate-100">
                    <div className="relative">
                        <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por serial, marca, modelo, empresa..."
                            className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 bg-slate-50"
                            autoFocus
                        />
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">
                        {loading ? "Cargando..." : `${filtrados.length} equipo${filtrados.length !== 1 ? "s" : ""} encontrado${filtrados.length !== 1 ? "s" : ""}`}
                    </p>
                </div>

                {/* LISTA */}
                <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                    {loading ? (
                        <div className="p-8 text-center text-slate-400 text-sm">Cargando equipos...</div>
                    ) : filtrados.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-sm">No se encontraron equipos</div>
                    ) : (
                        filtrados.map((eq) => {
                            const color = tipoColor(eq.tipo);
                            return (
                                <div
                                    key={eq.id_equipo}
                                    className="px-6 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        {/* ÍCONO TIPO */}
                                        <div className={`w-9 h-9 rounded-lg ${color.bg} flex items-center justify-center flex-shrink-0`}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={color.text}>
                                                <rect x="2" y="3" width="20" height="14" rx="2" />
                                                <path d="M8 21h8M12 17v4" />
                                            </svg>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-medium text-slate-800">
                                                    {eq.serial || "Sin serial"}
                                                </span>
                                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${color.bg} ${color.text}`}>
                                                    {tipoLabel(eq.tipo)}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {eq.marca} {eq.modelo}
                                            </p>
                                            {(eq.empresa || eq.solicitante) && (
                                                <p className="text-xs text-slate-400 mt-0.5">
                                                    {[eq.empresa, eq.solicitante].filter(Boolean).join(" · ")}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onSelect(eq)}
                                        className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-xs hover:bg-cyan-700 transition whitespace-nowrap"
                                    >
                                        Vincular
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* FOOTER */}
                <div className="px-6 py-3 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-sm hover:bg-slate-50 transition"
                    >
                        Cancelar
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default SelectEquipoModal;