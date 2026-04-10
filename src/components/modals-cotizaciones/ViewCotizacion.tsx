import React from "react";
import { motion } from "framer-motion";
import type { CotizacionGestioo } from "./types";
import { formatEstado, formatearPrecio } from "./utils";

interface ViewCotizacionModalProps {
    show: boolean;
    cotizacion: CotizacionGestioo | null;
    onClose: () => void;

    // ⭐ URL del PDF generado (vista previa real)
    pdfURL?: string | null;
}

const ViewCotizacionModal: React.FC<ViewCotizacionModalProps> = ({
    show,
    cotizacion,
    onClose,
    pdfURL
}) => {

    if (!show) return null;

    /* ============================================================
        1) MODO VISTA PREVIA REAL DEL PDF
       ============================================================ */
    if (pdfURL) {
        return (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-[99999]">

                <div className="bg-white rounded-xl shadow-xl w-[900px] h-[90vh] relative flex flex-col">

                    {/* Botón cerrar */}
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-4 text-slate-400 hover:text-slate-600 text-xl z-10"
                    >
                        ✕
                    </button>

                    {/* Contenedor del PDF */}
                    <div className="flex-1 mt-10">
                        <iframe
                            src={pdfURL}
                            className="w-full h-full border-none"
                        />
                    </div>
                </div>
            </div>
        );
    }

    /* ============================================================
        2) MODO NORMAL (vista simple)
       ============================================================ */
    if (!cotizacion) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[99999] p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative"
            >
                {/* Header */}
                <div className="bg-white rounded-t-2xl px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-10">
                    <div>
                        <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">Cotización</div>
                        <div className="text-xl font-bold text-slate-800">#{cotizacion.id}</div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${cotizacion.estado === "APROBADA"
                            ? "bg-green-100 text-green-700"
                            : cotizacion.estado === "RECHAZADA"
                                ? "bg-red-100 text-red-700"
                                : "bg-amber-100 text-amber-700"
                            }`}>
                            {formatEstado(cotizacion.estado)}
                        </span>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 text-xl leading-none"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-4">

                    {/* Datos del cliente */}
                    <div className="bg-white rounded-xl border border-slate-100 p-4">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                            Datos del cliente
                        </div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            <div>
                                <span className="text-slate-400">Cliente</span>
                                <div className="font-medium text-slate-800">{cotizacion.entidad?.nombre || "—"}</div>
                            </div>
                            <div>
                                <span className="text-slate-400">RUT</span>
                                <div className="font-medium text-slate-800">{cotizacion.entidad?.rut || "—"}</div>
                            </div>
                            <div>
                                <span className="text-slate-400">Correo</span>
                                <div className="font-medium text-slate-800">{cotizacion.entidad?.correo || "—"}</div>
                            </div>
                            <div>
                                <span className="text-slate-400">Teléfono</span>
                                <div className="font-medium text-slate-800">{cotizacion.entidad?.telefono || "—"}</div>
                            </div>
                            <div>
                                <span className="text-slate-400">Dirección</span>
                                <div className="font-medium text-slate-800">{cotizacion.entidad?.direccion || "—"}</div>
                            </div>
                            <div>
                                <span className="text-slate-400">Fecha</span>
                                <div className="font-medium text-slate-800">
                                    {new Date(cotizacion.fecha).toLocaleDateString("es-CL")}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tabla de items */}
                    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100">
                            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                Items ({cotizacion.items.length})
                            </div>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-slate-400 text-xs">
                                    <th className="text-left px-4 py-2 font-medium">#</th>
                                    <th className="text-left px-4 py-2 font-medium">Producto</th>
                                    <th className="text-center px-4 py-2 font-medium">Cant.</th>
                                    <th className="whitespace-nowrappx-4 py-2 font-medium">Precio unit.</th>
                                    <th className="whitespace-nowrap px-4 py-2 font-medium">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cotizacion.items.map((item, index) => (
                                    <tr key={item.id} className="border-t border-slate-50 hover:bg-slate-50 transition">
                                        <td className="px-4 py-3 text-slate-400">{index + 1}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-800">{item.nombre}</div>
                                            {item.descripcion && (
                                                <div className="text-xs text-slate-400 mt-0.5">{item.descripcion}</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center text-slate-600">{item.cantidad}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                                            {formatearPrecio(
                                                item.precioOriginalCLP ?? item.precio,
                                                cotizacion.moneda || "CLP",
                                                cotizacion.tasaCambio ?? 1
                                            )}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800">
                                            {formatearPrecio(
                                                (item.precioOriginalCLP ?? item.precio) * item.cantidad,
                                                cotizacion.moneda || "CLP",
                                                cotizacion.tasaCambio ?? 1
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totales */}
                    <div className="bg-white rounded-xl border border-slate-100 p-4">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                            Resumen
                        </div>
                        <div className="flex flex-col gap-2 text-sm">
                            {/* Subtotal */}
                            <div className="flex justify-between text-slate-600">
                                <span>Subtotal ({cotizacion.items.length} items)</span>
                                <span>
                                    {formatearPrecio(cotizacion.subtotal ?? cotizacion.total, cotizacion.moneda || "CLP", cotizacion.tasaCambio ?? 1)}
                                </span>
                            </div>

                            {/* Descuentos si existen */}
                            {(cotizacion.descuentos ?? 0) > 0 && (
                                <div className="flex justify-between text-red-500">
                                    <span>Descuentos</span>
                                    <span>- {formatearPrecio(cotizacion.descuentos ?? 0, cotizacion.moneda || "CLP", cotizacion.tasaCambio ?? 1)}</span>
                                </div>
                            )}

                            {/* IVA si existe */}
                            {(cotizacion.iva ?? 0) > 0 && (
                                <div className="flex justify-between text-slate-600">
                                    <span>IVA (19%)</span>
                                    <span>{formatearPrecio(cotizacion.iva ?? 0, cotizacion.moneda || "CLP", cotizacion.tasaCambio ?? 1)}</span>
                                </div>
                            )}
                            {/* Total */}
                            <div className="flex justify-between font-bold text-slate-800 text-base border-t border-slate-100 pt-2 mt-1">
                                <span>Total</span>
                                <span className="text-cyan-600">
                                    {formatearPrecio(cotizacion.total, cotizacion.moneda || "CLP", cotizacion.tasaCambio ?? 1)}
                                </span>
                            </div>
                        </div>
                    </div>

                </div>
            </motion.div>
        </div>
    );
};

export default ViewCotizacionModal;
