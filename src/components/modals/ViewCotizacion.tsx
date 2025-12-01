import React from "react";
import { motion } from "framer-motion";
import { FileTextOutlined } from "@ant-design/icons";
import type { CotizacionGestioo } from "./types";
import { formatEstado, formatTipo } from "./utils";

interface ViewCotizacionModalProps {
    show: boolean;
    cotizacion: CotizacionGestioo | null;
    onClose: () => void;

    // ⭐ Permite imprimir sin overlay y sin animaciones
    isPrintView?: boolean;
}

const ViewCotizacionModal: React.FC<ViewCotizacionModalProps> = ({
    show,
    cotizacion,
    onClose,
    isPrintView = false
}) => {

    if (!show || !cotizacion) return null;

    return (
        <div
            className={
                isPrintView
                    ? "" // ⭐ SIN OVERLAY, SIN FIXED, para imprimir correctamente
                    : "fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            }
        >
            <motion.div
                initial={isPrintView ? false : { scale: 0.9, opacity: 0 }}
                animate={isPrintView ? false : { scale: 1, opacity: 1 }}
                className={
                    isPrintView
                        ? "bg-white p-6 w-full max-w-lg"  // ⭐ SIN shadow, SIN rounded, versión limpia para PDF
                        : "bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative"
                }
            >
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <FileTextOutlined className="text-cyan-600" />
                    Cotización #{cotizacion.id}
                </h2>

                {/* ⭐ OCULTAR BOTÓN EN MODO PRINT */}
                {!isPrintView && (
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-4 text-slate-400 hover:text-slate-600 text-xl"
                    >
                        ✕
                    </button>
                )}

                <div className="space-y-2 text-sm text-slate-700">
                    <p><b>Fecha:</b> {new Date(cotizacion.fecha).toLocaleString("es-CL")}</p>
                    <p><b>Estado:</b> {formatEstado(cotizacion.estado)}</p>
                    <p><b>Tipo:</b> {formatTipo(cotizacion.tipo)}</p>
                    <p><b>Cliente:</b> {cotizacion.entidad?.nombre || "—"}</p>
                    <p><b>Origen:</b> {cotizacion.entidad?.origen || "—"}</p>
                    <p><b>RUT:</b> {cotizacion.entidad?.rut || "—"}</p>
                    <p><b>Correo:</b> {cotizacion.entidad?.correo || "—"}</p>
                    <p><b>Teléfono:</b> {cotizacion.entidad?.telefono || "—"}</p>
                    <p><b>Dirección:</b> {cotizacion.entidad?.direccion || "—"}</p>
                    <p><b>Total:</b> ${Math.round(cotizacion.total).toLocaleString("es-CL")}</p>

                    <div className="mt-4">
                        <b>Items ({cotizacion.items.length}):</b>
                        <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                            {cotizacion.items.map((item, index) => (
                                <li key={item.id} className="text-xs border-b pb-1">
                                    <span className="font-medium">{index + 1}.</span> {item.descripcion} -
                                    ${item.precio.toLocaleString("es-CL")} x {item.cantidad}
                                    {item.tipo === "PRODUCTO" && item.tieneIVA && " (IVA)"}
                                    {item.porcentaje && item.porcentaje > 0 && ` - ${item.porcentaje}% desc`}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default ViewCotizacionModal;
