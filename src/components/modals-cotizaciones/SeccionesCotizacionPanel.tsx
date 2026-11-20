// src/components/modals-cotizaciones/SeccionesCotizacionPanel.tsx
// Panel de secciones (mismo diseño que en «Crear cotización»), usado al editar.
// `null` representa el grupo «General (sin título)» de cotizaciones antiguas.
import React from "react";
import { DeleteOutlined, FileTextOutlined, PlusOutlined } from "@ant-design/icons";

import type { SeccionCotizacion } from "./types";

interface Props {
    secciones: SeccionCotizacion[];
    seccionActiva: number | null;
    /** Mostrar el grupo «General (sin título)» (ítems sin sección). */
    mostrarGeneral: boolean;
    totalTexto: (seccionId: number | null) => string;
    cantidadItems: (seccionId: number | null) => number;
    onSeleccionar: (seccionId: number | null) => void;
    onAgregar: () => void;
    onEliminar: (seccionId: number) => void;
    onActualizar: (seccionId: number, campo: "nombre" | "descripcion", valor: string) => void;
    puedeEliminar: (seccionId: number) => boolean;
}

const SeccionesCotizacionPanel: React.FC<Props> = ({
    secciones,
    seccionActiva,
    mostrarGeneral,
    totalTexto,
    cantidadItems,
    onSeleccionar,
    onAgregar,
    onEliminar,
    onActualizar,
    puedeEliminar,
}) => {
    const activa = secciones.find((s) => s.id === seccionActiva) ?? null;

    const chip = (
        clave: string,
        seccionId: number | null,
        nombre: string,
        eliminable: boolean
    ) => {
        const isActive = seccionActiva === seccionId;

        return (
            <div
                key={clave}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors min-w-0 flex-shrink-0 ${isActive
                    ? "bg-cyan-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                onClick={() => onSeleccionar(seccionId)}
            >
                <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">
                        {nombre} ({cantidadItems(seccionId)})
                    </span>
                    <span className={`text-xs ${isActive ? "text-cyan-100" : "text-slate-500"}`}>
                        {totalTexto(seccionId)}
                    </span>
                </div>
                {eliminable && seccionId !== null && (
                    <button
                        type="button"
                        title="Eliminar sección"
                        onClick={(e) => {
                            e.stopPropagation();
                            onEliminar(seccionId);
                        }}
                        className={`text-xs opacity-70 hover:opacity-100 ${isActive ? "text-white" : "text-slate-500"}`}
                    >
                        <DeleteOutlined />
                    </button>
                )}
            </div>
        );
    };

    return (
        <div className="border border-cyan-200 rounded-2xl p-4 bg-white mb-6">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <FileTextOutlined className="text-cyan-600" />
                    <h3 className="font-semibold text-slate-700">Secciones de Cotización</h3>
                </div>
                <button
                    type="button"
                    onClick={onAgregar}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-sm hover:bg-cyan-700 transition"
                >
                    <PlusOutlined />
                    Nueva Sección
                </button>
            </div>

            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {mostrarGeneral && chip("general", null, "General (sin título)", false)}
                {secciones.map((s) => chip(String(s.id), s.id, s.nombre, puedeEliminar(s.id)))}
            </div>

            {activa ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                            Nombre de Sección
                        </label>
                        <input
                            type="text"
                            value={activa.nombre}
                            maxLength={150}
                            onChange={(e) => onActualizar(activa.id, "nombre", e.target.value)}
                            className="w-full border border-cyan-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400"
                            placeholder="Ej: Hardware, Software, Servicios..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                            Descripción (opcional)
                        </label>
                        <input
                            type="text"
                            value={activa.descripcion || ""}
                            maxLength={1000}
                            onChange={(e) => onActualizar(activa.id, "descripcion", e.target.value)}
                            className="w-full border border-cyan-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400"
                            placeholder="Descripción breve de la sección..."
                        />
                    </div>
                </div>
            ) : (
                mostrarGeneral && (
                    <p className="text-xs text-slate-500 px-1">
                        Ítems sin sección: en el PDF se muestran primero y sin título.
                        Puedes moverlos a una sección con el selector de cada fila.
                    </p>
                )
            )}
        </div>
    );
};

export default SeccionesCotizacionPanel;