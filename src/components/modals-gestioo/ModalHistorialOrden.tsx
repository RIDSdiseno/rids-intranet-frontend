// src/components/modals-gestioo/ModalHistorialOrden.tsx
import React, { useEffect, useState } from "react";
import {
    HistoryOutlined,
    PlusCircleOutlined,
    EditOutlined,
    DeleteOutlined,
    LoginOutlined,
    LogoutOutlined,
    FormOutlined,
} from "@ant-design/icons";

import { http } from "../../service/http";

/* ===== Tipos (respuesta de GET /detalle-trabajo-gestioo/:id/historial) ===== */

type TipoHistorial =
    | "CREACION"
    | "CAMBIO"
    | "ELIMINACION"
    | "INGRESO"
    | "FIRMA"
    | "SALIDA";

type ValorHistorial = string | number | boolean | null;

interface CambioHistorial {
    campo: string;
    label: string;
    antes: ValorHistorial;
    despues: ValorHistorial;
}

interface ItemHistorial {
    id: string;
    tipo: TipoHistorial;
    titulo: string;
    descripcion: string | null;
    actor: string | null;
    fecha: string;
    registroId: number;
    area: string | null;
    cambios: CambioHistorial[];
    reconstruido: boolean;
}

interface HistorialResponse {
    ordenGrupoId: number;
    total: number;
    items: ItemHistorial[];
}

/* ===== Estilos por tipo ===== */

const ESTILO_TIPO: Record<TipoHistorial, { icon: React.ReactNode; color: string }> = {
    CREACION: { icon: <PlusCircleOutlined />, color: "bg-emerald-100 text-emerald-700 ring-emerald-200" },
    CAMBIO: { icon: <EditOutlined />, color: "bg-cyan-100 text-cyan-700 ring-cyan-200" },
    ELIMINACION: { icon: <DeleteOutlined />, color: "bg-rose-100 text-rose-700 ring-rose-200" },
    INGRESO: { icon: <LoginOutlined />, color: "bg-sky-100 text-sky-700 ring-sky-200" },
    FIRMA: { icon: <FormOutlined />, color: "bg-indigo-100 text-indigo-700 ring-indigo-200" },
    SALIDA: { icon: <LogoutOutlined />, color: "bg-emerald-100 text-emerald-700 ring-emerald-200" },
};

const formatearFecha = (value: string) =>
    new Date(value).toLocaleString("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

const mostrarValor = (v: ValorHistorial) =>
    v === null || v === "" ? "—" : String(v);

interface ModalHistorialOrdenProps {
    /** id de cualquier registro de la orden (entrada o salida) */
    ordenId: number;
    /** número que se muestra en el título (#ordenGrupoId) */
    ordenNumero: number;
    onClose: () => void;
}

export const ModalHistorialOrden: React.FC<ModalHistorialOrdenProps> = ({
    ordenId,
    ordenNumero,
    onClose,
}) => {
    const [items, setItems] = useState<ItemHistorial[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let activo = true;

        setLoading(true);
        setError(null);

        http.get<HistorialResponse>(`/detalle-trabajo-gestioo/${ordenId}/historial`)
            .then(({ data }) => {
                if (activo) setItems(data.items ?? []);
            })
            .catch((err: any) => {
                if (activo) {
                    setError(
                        err?.response?.data?.error ??
                        "No se pudo cargar el historial de la orden."
                    );
                }
            })
            .finally(() => {
                if (activo) setLoading(false);
            });

        return () => {
            activo = false;
        };
    }, [ordenId]);

    const soloReconstruido =
        items.length > 0 && items.every((i) => i.reconstruido);

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 px-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-xl border border-slate-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="shrink-0 flex items-start justify-between gap-4 border-b border-cyan-100 px-6 py-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <HistoryOutlined className="text-cyan-600" />
                            Historial de la orden #{ordenNumero}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Ingreso, cambios y salida del equipo, del más reciente al más antiguo.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-700 text-xl leading-none"
                        aria-label="Cerrar historial"
                    >
                        ×
                    </button>
                </div>

                {/* Contenido */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {loading ? (
                        <div className="py-10 text-center text-slate-500">
                            Cargando historial...
                        </div>
                    ) : error ? (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            {error}
                        </div>
                    ) : items.length === 0 ? (
                        <div className="py-10 text-center text-slate-500">
                            Esta orden no tiene movimientos registrados.
                        </div>
                    ) : (
                        <>
                            {soloReconstruido && (
                                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                                    Esta orden es anterior al registro de cambios. Se muestran
                                    solo los hitos principales tomados de la propia orden.
                                </div>
                            )}

                            <ol className="relative border-l border-slate-200 ml-3 space-y-5">
                                {items.map((item) => {
                                    const estilo = ESTILO_TIPO[item.tipo] ?? ESTILO_TIPO.CAMBIO;

                                    return (
                                        <li key={item.id} className="ml-6">
                                            <span
                                                className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white text-xs ${estilo.color}`}
                                            >
                                                {estilo.icon}
                                            </span>

                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-semibold text-slate-800 text-sm">
                                                    {item.titulo}
                                                </span>

                                                {item.area && (
                                                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-600 ring-1 ring-slate-200">
                                                        {item.area === "SALIDA" ? "Salida" : item.area === "DOMICILIO" ? "Domicilio" : "Ingreso"}
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-xs text-slate-500 mt-0.5">
                                                {formatearFecha(item.fecha)}
                                                {item.actor && (
                                                    <>
                                                        {" · "}
                                                        {item.reconstruido ? "Técnico: " : "por "}
                                                        <span className="font-medium text-slate-600">
                                                            {item.actor}
                                                        </span>
                                                    </>
                                                )}
                                            </p>

                                            {item.descripcion && (
                                                <p className="text-sm text-slate-600 mt-1">
                                                    {item.descripcion}
                                                </p>
                                            )}

                                            {item.cambios.length > 0 && (
                                                <ul className="mt-2 space-y-1 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2">
                                                    {item.cambios.map((c) => (
                                                        <li key={c.campo} className="text-xs text-slate-600">
                                                            <span className="font-medium text-slate-700">
                                                                {c.label}:
                                                            </span>{" "}
                                                            <span className="line-through text-slate-400">
                                                                {mostrarValor(c.antes)}
                                                            </span>{" "}
                                                            →{" "}
                                                            <span className="font-medium text-slate-800">
                                                                {mostrarValor(c.despues)}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </li>
                                    );
                                })}
                            </ol>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="shrink-0 flex justify-end border-t border-cyan-100 bg-slate-50 px-6 py-3 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModalHistorialOrden;