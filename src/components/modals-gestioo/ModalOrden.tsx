// ModalOrden.tsx
import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    PlusOutlined,
    EditOutlined,
} from "@ant-design/icons";
import { Select } from "antd";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

// TYPES
import type {
    OrdenFormData,
    EntidadGestioo,
    EquipoGestioo,
    Tecnico,
    Prioridad,
    Area,
    OrigenGestioo,
    TipoEquipoValue,
} from "./types";

import {
    TipoEquipo,
    TipoEquipoLabel,
} from "./types";

const safeLower = (v: unknown) => String(v ?? "").toLowerCase();

export interface ModalOrdenProps {
    title: string;
    onClose: () => void;
    onSubmit: () => void;

    formData: OrdenFormData;
    setFormData: React.Dispatch<React.SetStateAction<OrdenFormData>>;

    entidades: EntidadGestioo[];
    equipos: EquipoGestioo[];
    tecnicos: Tecnico[];

    loading: boolean;
    buttonLabel: string;

    setShowNewEntidadModal: React.Dispatch<React.SetStateAction<boolean>>;
    setShowNuevoEquipoModal: React.Dispatch<React.SetStateAction<boolean>>;
    setShowEditEntidadModal: React.Dispatch<React.SetStateAction<boolean>>;
    setShowEditEquipoModal: React.Dispatch<React.SetStateAction<boolean>>;

    setEntidades: React.Dispatch<React.SetStateAction<EntidadGestioo[]>>;
    setEquipoEditando: React.Dispatch<React.SetStateAction<EquipoGestioo | null>>;
}

export const ModalOrden: React.FC<ModalOrdenProps> = ({
    title,
    onClose,
    onSubmit,
    formData,
    setFormData,
    entidades,
    equipos,
    tecnicos,
    loading,
    buttonLabel,
    setShowNewEntidadModal,
    setShowNuevoEquipoModal,
    setShowEditEntidadModal,
    setShowEditEquipoModal,
    setEntidades,
    setEquipoEditando,
}) => {
    const [busquedaEquipo, setBusquedaEquipo] = useState("");

    const equiposFiltrados = useMemo(() => {
        const q = safeLower(busquedaEquipo);

        return equipos.filter((eq) => {
            const tipoLabel = eq?.tipo
                ? safeLower(TipoEquipoLabel[eq.tipo])
                : "";

            return (
                !q ||
                safeLower(eq.marca).includes(q) ||
                safeLower(eq.modelo).includes(q) ||
                safeLower(eq.serial).includes(q) ||
                tipoLabel.includes(q)
            );
        });
    }, [equipos, busquedaEquipo]);

    const normalizeText = (value: unknown) =>
        String(value ?? "")
            .toLowerCase()
            .normalize("NFD")                 // separa letras y tildes
            .replace(/[\u0300-\u036f]/g, "")  // elimina tildes
            .trim();

    const normalizeRut = (value: unknown) =>
        normalizeText(value).replace(/[^0-9k]/g, ""); // solo números y K

    const [busquedaEntidad, setBusquedaEntidad] = useState("");

    // Estado para mensaje de error
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Limpiar mensaje de error al cambiar campos del formulario
    useEffect(() => {
        setErrorMsg(null);
    }, [
        formData.tipoTrabajo,
        formData.descripcion,
        formData.entidadId,
        formData.equipoId,
        formData.tecnicoId,
    ]);

    // Filtrar entidades según búsqueda
    const entidadesFiltradas = useMemo(() => {
        const q = normalizeText(busquedaEntidad);

        if (!q) return entidades;

        return entidades.filter((ent) => {
            const nombre = normalizeText(ent.nombre);
            const rut = normalizeRut(ent.rut);

            return nombre.includes(q) || rut.includes(normalizeRut(q));
        });
    }, [entidades, busquedaEntidad]);

    useEffect(() => {
        if (entidadesFiltradas.length === 1) {
            setFormData((prev) => ({
                ...prev,
                entidadId: String(entidadesFiltradas[0].id),
            }));
        }
    }, [entidadesFiltradas, setFormData]);

    // Función para validar y enviar el formulario
    const handleSubmitWithValidation = () => {
        if (!formData.descripcion.trim()) {
            setErrorMsg("Debe ingresar la descripción del estado del equipo.");
            return;
        }

        if (!formData.tipoTrabajo.trim()) {
            setErrorMsg("Debe indicar el tipo de trabajo.");
            return;
        }

        if (!formData.entidadId) {
            setErrorMsg("Debe seleccionar una entidad.");
            return;
        }

        if (!formData.equipoId) {
            setErrorMsg("Debe seleccionar un equipo.");
            return;
        }

        if (!formData.tecnicoId) {
            setErrorMsg("Debe asignar un técnico responsable.");
            return;
        }

        // ✅ OK
        setErrorMsg(null);
        onSubmit();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl relative flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="border-b border-cyan-100 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                            aria-label="Cerrar modal"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Contenido principal - Scrollable */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Columna Izquierda */}
                            <div className="space-y-6">
                                {/* Descripción */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Descripción del Estado<span className="text-rose-500">*</span></label>
                                    <textarea
                                        placeholder="Describe detalladamente el estado del equipo..."
                                        required
                                        value={formData.descripcion}
                                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                        className="w-full border border-cyan-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all resize-none"
                                        rows={4}
                                    />
                                </div>
                                {/* Tipo de Trabajo */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Tipo de Trabajo <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Ej: Reparación, Mantenimiento, Instalación..."
                                        value={formData.tipoTrabajo}
                                        onChange={(e) => setFormData({ ...formData, tipoTrabajo: e.target.value })}
                                        className="w-full border border-cyan-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
                                        required
                                    />
                                </div>

                                {/* Notas */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Notas / Observaciones Técnico</label>
                                    <textarea
                                        placeholder="Observaciones adicionales, comentarios especiales..."
                                        value={formData.notas}
                                        onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                                        className="w-full border border-cyan-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all resize-none"
                                        rows={3}
                                    />
                                </div>
                            </div>

                            {/* Columna Derecha */}
                            <div className="space-y-6">
                                {/* Configuración Rápida */}
                                <div className="bg-cyan-50 rounded-2xl p-4 border border-cyan-200">
                                    <h3 className="text-sm font-semibold text-cyan-800 mb-3 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-cyan-500 rounded-full"></span>
                                        Configuración Rápida
                                    </h3>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Prioridad</label>
                                            <select
                                                value={formData.prioridad}
                                                onChange={(e) => setFormData({ ...formData, prioridad: e.target.value as Prioridad })}
                                                className="w-full border border-cyan-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-cyan-400"
                                            >
                                                <option value="baja"> Baja</option>
                                                <option value="normal"> Normal</option>
                                                <option value="alta"> Alta</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
                                            <select
                                                value={formData.estado}
                                                onChange={(e) => setFormData({ ...formData, estado: e.target.value as OrdenFormData["estado"] })}
                                                className="w-full border border-cyan-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-cyan-400"
                                            >
                                                <option value="pendiente"> Pendiente</option>
                                                <option value="en progreso"> En progreso</option>
                                                <option value="completada"> Completada</option>
                                                <option value="cancelada"> Cancelada</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Área</label>
                                            <select
                                                value={formData.area}
                                                onChange={(e) => {
                                                    const nuevaArea = e.target.value as Area;
    
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        area: nuevaArea,
                                                        fechaIngreso:
                                                            nuevaArea === "salida"
                                                                ? prev.fechaIngreso ?? prev.fecha
                                                                : prev.fechaIngreso,
                                                    }));
                                                }}
                                                className="w-full border border-cyan-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-cyan-400"
                                            >
                                                <option value="entrada"> Entrada</option>
                                                <option value="domicilio"> Domicilio</option>
                                                <option value="reparacion"> Reparación</option>
                                                <option value="salida"> Salida</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                {formData.area === "salida"
                                                    ? "Fecha de salida"
                                                    : "Fecha de ingreso"}
                                            </label>

                                            <input
                                                type="datetime-local"
                                                value={formData.fecha}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, fecha: e.target.value })
                                                }
                                                className="w-full border border-cyan-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-cyan-400"
                                            />

                                            {/* 👇 AQUÍ VA EXACTAMENTE */}
                                            {formData.area === "salida" && (
                                                <p className="text-xs text-amber-700 mt-1">
                                                    Se creará una nueva orden de salida para mantener el historial
                                                </p>
                                            )}
                                        </div>

                                        <div className="mt-4">
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                Técnico Responsable
                                            </label>

                                            <select
                                                required
                                                value={formData.tecnicoId ?? ""}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, tecnicoId: e.target.value })
                                                }
                                                className="w-full border border-cyan-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-cyan-400"
                                            >
                                                <option value="">— Sin asignar —</option>

                                                {tecnicos.map((t) => (
                                                    <option key={t.id_tecnico} value={t.id_tecnico}>
                                                        {t.nombre}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Información del Cliente */}
                                <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-200">
                                    <h3 className="text-sm font-semibold text-indigo-800 mb-3 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                                        Información del Cliente
                                    </h3>

                                    <div className="space-y-3">
                                        {/* Tipo de Entidad */}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de Entidad</label>

                                            <select
                                                value={formData.tipoEntidad}
                                                onChange={(e) => {
                                                    const tipo = e.target.value as "EMPRESA" | "PERSONA";

                                                    setFormData({
                                                        ...formData,
                                                        tipoEntidad: tipo,
                                                        entidadId: "",
                                                        origenEntidad: "",
                                                    });

                                                    if (tipo === "PERSONA") {
                                                        fetch(`${API_URL}/entidades?tipo=PERSONA`, { credentials: "include" })
                                                            .then((res) => res.json())
                                                            .then((data) => setEntidades(Array.isArray(data) ? data : data.data))
                                                            .catch(() => {
                                                                setEntidades([]);
                                                                setErrorMsg("No se pudieron cargar las entidades. Intenta nuevamente.");
                                                            });
                                                    } else {
                                                        setEntidades([]);
                                                    }
                                                }}
                                                className="w-full border border-indigo-200 rounded-xl px-3 py-2 text-sm"
                                            >
                                                <option value="EMPRESA">Empresa</option>
                                                <option value="PERSONA">Persona</option>
                                            </select>
                                        </div>

                                        {/* Origen (solo si es empresa) */}
                                        {formData.tipoEntidad === "EMPRESA" && (
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1">Origen de la Empresa</label>

                                                <select
                                                    required
                                                    value={formData.origenEntidad}
                                                    onChange={(e) => {
                                                        const origen = e.target.value as OrigenGestioo | "";

                                                        setFormData({
                                                            ...formData,
                                                            origenEntidad: origen,
                                                            entidadId: "",
                                                        });

                                                        fetch(`${API_URL}/entidades?tipo=EMPRESA&origen=${origen}`, { credentials: "include" })
                                                            .then((res) => res.json())
                                                            .then((data) => setEntidades(Array.isArray(data) ? data : data.data))
                                                            .catch(() => {
                                                                setEntidades([]);
                                                                setErrorMsg("No se pudieron cargar las entidades. Intenta nuevamente.");
                                                            });
                                                    }}
                                                    className="w-full border border-indigo-200 rounded-xl px-3 py-2 text-sm"
                                                >
                                                    <option value="">Seleccionar origen…</option>
                                                    <option value="RIDS">RIDS</option>
                                                    <option value="ECONNET">ECONNET</option>
                                                    <option value="OTRO">OTRO</option>
                                                </select>
                                            </div>
                                        )}

                                        {/* Entidad */}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                Entidad
                                            </label>

                                            <Select
                                                showSearch
                                                placeholder="Seleccione entidad…"
                                                value={formData.entidadId || undefined}
                                                disabled={
                                                    entidades.length === 0 ||
                                                    (formData.tipoEntidad === "EMPRESA" && !formData.origenEntidad)
                                                }
                                                className="w-full"
                                                optionFilterProp="label"
                                                onChange={(value) =>
                                                    setFormData({ ...formData, entidadId: value })
                                                }
                                                filterOption={(input, option) => {
                                                    const normalize = (text: string) =>
                                                        text
                                                            .toLowerCase()
                                                            .normalize("NFD")
                                                            .replace(/[\u0300-\u036f]/g, "");

                                                    const normalizeRut = (rut: string) =>
                                                        rut.replace(/\./g, "").replace(/-/g, "");

                                                    const search = normalize(input);
                                                    const label = normalize(String(option?.label ?? ""));
                                                    const rut = normalizeRut(String((option as any)?.rut ?? ""));

                                                    return (
                                                        label.includes(search) ||
                                                        rut.includes(normalizeRut(input))
                                                    );
                                                }}
                                                options={entidades.map((ent) => ({
                                                    value: String(ent.id),
                                                    label: `${ent.nombre}${ent.rut ? ` (${ent.rut})` : ""}`,
                                                    rut: ent.rut, // 👈 permite búsqueda por RUT
                                                }))}
                                            />

                                            {formData.tipoEntidad === "EMPRESA" && (
                                                <p className="text-xs text-slate-500 mt-1">
                                                    Mostrando {entidades.length} empresas
                                                </p>
                                            )}
                                        </div>

                                    </div>
                                </div>

                                {/* Información del Equipo */}
                                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200">
                                    <h3 className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                        Información del Equipo
                                    </h3>

                                    <div className="space-y-3">
                                        {/* Buscar Equipo */}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Buscar Equipo</label>
                                            <input
                                                type="text"
                                                placeholder="Marca, modelo, serie o tipo..."
                                                value={busquedaEquipo}
                                                onChange={(e) => setBusquedaEquipo(e.target.value)}
                                                className="w-full border border-emerald-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-400"
                                                disabled={equipos.length === 0}
                                            />
                                            {!formData.entidadId && (
                                                <p className="text-xs text-amber-600 mt-1">Mostrando equipos de todas las empresas</p>
                                            )}
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <label className="block text-xs font-medium text-slate-600">Equipo</label>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (!formData.equipoId) {
                                                        setShowNuevoEquipoModal(true);
                                                    } else {
                                                        const equipo = equipos.find((e) => String(e.id_equipo) === formData.equipoId);
                                                        if (!equipo) {
                                                            setErrorMsg("El equipo seleccionado ya no está disponible.");
                                                            return;
                                                        }
                                                        setEquipoEditando(equipo);
                                                        setShowEditEquipoModal(true);
                                                    }
                                                }}
                                                className={`p-2 rounded-xl text-white transition-all duration-200 ${formData.equipoId ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"
                                                    }`}
                                                title={formData.equipoId ? "Editar equipo" : "Nuevo equipo"}
                                            >
                                                {formData.equipoId ? <EditOutlined /> : <PlusOutlined />}
                                            </button>
                                        </div>

                                        <select
                                            value={formData.equipoId}
                                            onChange={(e) => setFormData((prev) => ({ ...prev, equipoId: e.target.value }))}
                                            className="w-full border border-emerald-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-400"
                                        >
                                            <option value="">
                                                {equiposFiltrados.length === 0 ? "No hay equipos disponibles" : "Seleccionar equipo…"}
                                            </option>

                                            {equiposFiltrados.map((eq) => (
                                                <option key={eq.id_equipo} value={eq.id_equipo}>
                                                    {eq.marca} {eq.modelo} · {TipoEquipoLabel[eq.tipo]}
                                                    {eq.serial ? ` — S/N: ${eq.serial}` : " — S/N: N/A"}
                                                </option>
                                            ))}
                                        </select>
                                        {/* Checkbox cargador */}
                                        <div className="flex items-center gap-3 mt-3">
                                            <input
                                                id="incluyeCargador"
                                                type="checkbox"
                                                checked={formData.incluyeCargador}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        incluyeCargador: e.target.checked,
                                                    })
                                                }
                                                className="w-4 h-4 text-emerald-600 border-emerald-300 rounded focus:ring-emerald-500"
                                            />

                                            <label
                                                htmlFor="incluyeCargador"
                                                className="text-sm font-medium text-slate-700 cursor-pointer"
                                            >
                                                El equipo incluye cargador completo
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                {/* fin columna derecha */}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mensaje de error */}
                {errorMsg && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm">
                        {errorMsg}
                    </div>
                )}

                {/* Footer */}
                <div className="border-t border-cyan-100 px-6 py-4 bg-slate-50 rounded-b-3xl">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                        <p className="text-xs text-slate-500 text-center sm:text-left">
                            Los campos marcados con <span className="text-rose-500">*</span> son obligatorios
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 rounded-xl bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-all duration-200 font-medium"
                            >
                                Cancelar
                            </button>

                            <button
                                onClick={handleSubmitWithValidation}
                                disabled={loading || !formData.tipoTrabajo.trim() || !formData.equipoId || !formData.tecnicoId || !formData.entidadId || !formData.descripcion}
                                className={`px-6 py-2.5 rounded-xl text-white font-medium transition-all duration-200 ${loading
                                    ? "bg-cyan-400 cursor-not-allowed"
                                    : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-lg hover:shadow-xl"
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Procesando...
                                    </span>
                                ) : (
                                    buttonLabel
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
