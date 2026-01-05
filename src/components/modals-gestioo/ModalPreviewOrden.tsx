// ModalPreviewOrden.tsx
import React from "react";
import { motion } from "framer-motion";
import { PrinterOutlined } from "@ant-design/icons";

// TYPES
import type {
    DetalleTrabajoGestioo,
    TipoEquipoValue,
} from "./types";

import { TipoEquipoLabel } from "./types";

interface ModalPreviewOrdenProps {
    orden: DetalleTrabajoGestioo;
    onClose: () => void;
    onPrint: () => void;
}

export const ModalPreviewOrden: React.FC<ModalPreviewOrdenProps> = ({
    orden,
    onClose,
    onPrint,
}) => {
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
            >
                {/* Header */}
                <div className="border-b px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">
                        Vista previa Orden #{orden.id}
                    </h2>

                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 text-xl"
                        aria-label="Cerrar"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoBlock
                            title="Cliente"
                            items={[
                                ["Entidad", orden.entidad?.nombre],
                                ["Origen", orden.entidad?.origen],
                                ["Área", orden.area],
                                ["Prioridad", orden.prioridad],
                            ]}
                        />

                        <InfoBlock
                            title="Equipo"
                            items={[
                                [
                                    "Equipo",
                                    `${orden.equipo?.marca ?? "—"} ${orden.equipo?.modelo ?? ""}`,
                                ],
                                [
                                    "Tipo",
                                    orden.equipo?.tipo
                                        ? TipoEquipoLabel[
                                        orden.equipo
                                            .tipo as TipoEquipoValue
                                        ]
                                        : "—",
                                ],
                                ["Serie", orden.equipo?.serial ?? "—"],
                                [
                                    orden.area === "SALIDA"
                                        ? "Fecha salida"
                                        : "Fecha ingreso",
                                    new Date(orden.fecha).toLocaleString(
                                        "es-CL"
                                    ),
                                ],
                            ]}
                        />
                    </div>

                    <Section
                        title="Trabajo solicitado"
                        content={orden.tipoTrabajo}
                    />

                    <Section
                        title="Descripción"
                        content={
                            orden.descripcion ?? "Sin descripción registrada"
                        }
                    />

                    <Section
                        title="Notas del técnico"
                        content={orden.notas ?? "Sin observaciones"}
                    />
                </div>

                {/* Footer */}
                <div className="border-t px-6 py-4 flex justify-end gap-3 bg-slate-50 rounded-b-3xl">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-xl border bg-white hover:bg-slate-100"
                    >
                        Cerrar
                    </button>

                    <button
                        onClick={onPrint}
                        className="px-5 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2"
                    >
                        <PrinterOutlined />
                        Imprimir
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

/* ===== Subcomponentes ===== */

const InfoBlock = ({
    title,
    items,
}: {
    title: string;
    items: [string, React.ReactNode | undefined][];
}) => (
    <div>
        <h4 className="font-semibold mb-2">{title}</h4>
        <div className="space-y-1">
            {items.map(([label, value]) => (
                <p key={label}>
                    <b>{label}:</b> {value ?? "—"}
                </p>
            ))}
        </div>
    </div>
);

const Section = ({
    title,
    content,
}: {
    title: string;
    content: React.ReactNode;
}) => (
    <div>
        <h4 className="font-semibold mb-1">{title}</h4>
        <div className="border rounded-xl p-3 bg-slate-50">
            {content}
        </div>
    </div>
);
