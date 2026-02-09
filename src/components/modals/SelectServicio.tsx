import React, { useState } from "react";
import { motion } from "framer-motion";
import {
    SearchOutlined,
    AppstoreOutlined,
    TableOutlined,
    PlusOutlined,
    BarcodeOutlined,
} from "@ant-design/icons";

interface SelectServicioModalProps {
    show: boolean;
    onClose: () => void;
    servicios: any[];
    filtros: any;
    onFiltroChange: (filtro: string, value: any) => void;
    onLimpiarFiltros: () => void;
    onAgregarServicio: (servicio: any) => void;
}

const SelectServicioModal: React.FC<SelectServicioModalProps> = ({
    show,
    onClose,
    servicios,
    filtros,
    onFiltroChange,
    onAgregarServicio,
}) => {

    if (!show) return null;

    // Vista gráfica: tabla o tarjetas
    const [vista, setVista] = useState<"tabla" | "tarjetas">("tabla");

    // Filtrar servicios
    const filtrarServicios = (lista: any[]) => {
        return lista.filter((s) => {
            const texto = filtros.texto.toLowerCase();
            return (
                s.nombre?.toLowerCase().includes(texto) ||
                s.descripcion?.toLowerCase().includes(texto) ||
                s.codigo?.toLowerCase().includes(texto)
            );
        });
    };

    const serviciosMostrar = filtrarServicios(servicios);

    // ======= VISTA TABLA =======
    const VistaTabla = () => (
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
            <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="p-4 text-left text-sm font-semibold text-slate-700">Código</th>
                        <th className="p-4 text-left text-sm font-semibold text-slate-700">Servicio</th>
                        <th className="p-4 text-left text-sm font-semibold text-slate-700">Descripción</th>
                        <th className="p-4 text-right text-sm font-semibold text-slate-700">Precio</th>
                        <th className="p-4 text-center text-sm font-semibold text-slate-700">Acciones</th>
                    </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                    {serviciosMostrar.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50 transition">
                            <td className="p-4">
                                <div className="flex items-center gap-2">
                                    <BarcodeOutlined className="text-slate-400 text-sm" />
                                    <span className="font-mono text-sm text-slate-600">
                                        {s.codigo || "N/A"}
                                    </span>
                                </div>
                            </td>

                            <td className="p-4">
                                <span className="font-semibold text-slate-800">{s.nombre}</span>
                            </td>

                            <td className="p-4 text-slate-600 text-sm">
                                {s.descripcion || "—"}
                            </td>

                            <td className="p-4 text-right font-semibold text-emerald-600">
                                ${(s.precio || 0).toLocaleString("es-CL")}
                            </td>

                            <td className="p-4">
                                <div className="flex justify-center gap-2">
                                    <button
                                        onClick={() => onAgregarServicio(s)}
                                        className="flex items-center gap-2 px-3 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-sm"
                                    >
                                        <PlusOutlined />
                                        Agregar
                                    </button>

                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {serviciosMostrar.length === 0 && (
                <div className="text-center py-10 text-slate-500">
                    No se encontraron servicios
                </div>
            )}
        </div>
    );

    // ======= VISTA TARJETAS =======
    const VistaTarjetas = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {serviciosMostrar.map((s) => (
                <div
                    key={s.id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-cyan-300 transition-all duration-300 hover:shadow-xl p-5"
                >
                    <h3 className="font-bold text-slate-800 text-lg mb-2">
                        {s.nombre}
                    </h3>

                    {s.descripcion && (
                        <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                            {s.descripcion}
                        </p>
                    )}

                    <p className="text-xs text-slate-500 mb-3">
                        <BarcodeOutlined className="mr-1" />
                        Código: {s.codigo || "N/A"}
                    </p>

                    <div className="flex justify-between items-center mb-4">
                        <span className="text-2xl font-bold text-emerald-600">
                            ${(s.precio || 0).toLocaleString("es-CL")}
                        </span>
                    </div>

                    <button
                        onClick={() => onAgregarServicio(s)}
                        className="w-full py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-xl flex items-center justify-center gap-2 font-semibold hover:from-cyan-700 hover:to-cyan-800 transition shadow"
                    >
                        <PlusOutlined />
                        Agregar
                    </button>
                </div>
            ))}

            {serviciosMostrar.length === 0 && (
                <div className="col-span-full text-center text-slate-500 py-10">
                    No se encontraron servicios
                </div>
            )}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[9999]">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl relative max-h-[95vh] overflow-y-auto"
            >
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-200 p-6 z-10 flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Catálogo de Servicios</h2>
                        <p className="text-sm text-slate-500">Selecciona servicios para agregar</p>
                    </div>

                    {/* Switch tabla / tarjetas */}
                    <div className="flex items-center gap-3">
                        <div className="flex bg-slate-100 rounded-lg p-1">
                            <button
                                onClick={() => setVista("tabla")}
                                className={`px-3 py-2 rounded-md text-sm flex items-center gap-2 transition ${vista === "tabla" ? "bg-white shadow text-cyan-600" : "text-slate-500"
                                    }`}
                            >
                                <TableOutlined /> Tabla
                            </button>
                            <button
                                onClick={() => setVista("tarjetas")}
                                className={`px-3 py-2 rounded-md text-sm flex items-center gap-2 transition ${vista === "tarjetas" ? "bg-white shadow text-cyan-600" : "text-slate-500"
                                    }`}
                            >
                                <AppstoreOutlined /> Tarjetas
                            </button>
                        </div>

                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl p-2">
                            ✕
                        </button>
                    </div>
                </div>

                {/* Buscador */}
                <div className="p-6 border-b border-slate-200">
                    <div className="relative">
                        <SearchOutlined className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={filtros.texto}
                            onChange={(e) => onFiltroChange("texto", e.target.value)}
                            placeholder="Buscar servicios por nombre, descripción o código..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-full border border-slate-200"
                        />
                    </div>
                </div>

                {/* Vista dinámica */}
                <div className="p-6">
                    {vista === "tabla" ? <VistaTabla /> : <VistaTarjetas />}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-200 text-right">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                        Cerrar
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default SelectServicioModal;
