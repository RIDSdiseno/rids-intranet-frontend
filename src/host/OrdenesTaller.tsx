// OrdenesTaller.tsx
import React, { useEffect, useMemo, useState } from "react";

// ICONS
import {
    ReloadOutlined,
    EyeOutlined,
    PrinterOutlined,
    DeleteOutlined,
    ToolOutlined,
    PlusOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    EditOutlined,
    SwapOutlined
} from "@ant-design/icons";
import { motion } from "framer-motion";

// HEADER
import Header from "../components/Header";

// TYPES    
import type {
    OrigenGestioo,
    Prioridad,
    Area,
    TipoEquipoValue,
    OrdenFormData,
    EntidadGestioo,
    EquipoGestioo,
    DetalleTrabajoGestioo,
    Tecnico,
} from "../components/modals-gestioo/types";

// TYPES
import {
    normalizeArea,
    normalizeEstado,
    TipoEquipo,
    TipoEquipoLabel,
} from "../components/modals-gestioo/types";

// PDF
import { handlePrint } from "../components/modals-gestioo/pdf";

// MODALS
import { ModalEditarEquipo } from "../components/modals-gestioo/EditEquipo";
import { ModalNuevoEquipo } from "../components/modals-gestioo/ModalNuevoEquipo";
import { ModalNuevaEntidad } from "../components/modals-gestioo/ModalNuevaEntidad";
import { ModalOrden } from "../components/modals-gestioo/ModalOrden";
import { ModalEditarEntidad } from "../components/modals-gestioo/ModalEditarEntidad";
import { ModalPreviewOrden } from "../components/modals-gestioo/ModalPreviewOrden";

// API URL
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

/* ===== Helpers de mapeo ===== */
const areaToApi = (a: Area) =>
    a === "entrada" ? "ENTRADA" : a === "domicilio" ? "DOMICILIO" : a === "reparacion" ? "REPARACION" : "SALIDA";

const prioridadToApi = (p: Prioridad) => (p === "baja" ? "BAJA" : p === "alta" ? "ALTA" : "NORMAL");

const estadoToApi = (e: string) => {
    switch (e) {
        case "pendiente":
            return "PENDIENTE";
        case "en progreso":
            return "EN_PROCESO";
        case "completada":
            return "FINALIZADO";
        case "cancelada":
            return "CANCELADO";
        default:
            return "PENDIENTE";
    }
};

const safeLower = (v: unknown) => String(v ?? "").toLowerCase();

/* ===== Helpers de validación ===== */
const validarOrdenParaImprimir = (
    o: DetalleTrabajoGestioo
): string | null => {
    if (!o.entidad) return "La orden no tiene una entidad asociada";
    if (!o.equipo) return "La orden no tiene un equipo asociado";
    if (!o.fecha) return "La orden no tiene una fecha válida";
    return null;
};

/* ===== Fecha local Chile (compatible con datetime-local) ===== */
const getDateTimeLocalCL = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
};

const toDateTimeLocal = (date: string | Date) => {
    const d = new Date(date);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
};

const OrdenesTaller: React.FC = () => {

    // Función para duplicar orden a SALIDA
    const duplicarOrdenSalida = async (orden: DetalleTrabajoGestioo) => {
        if (
            !confirm(
                "Se creará una nueva orden de SALIDA para mantener el historial del equipo.\n\n¿Desea continuar?"
            )
        ) return;

        // Crear nueva orden de SALIDA
        try {
            const payload = {
                tipoTrabajo: orden.tipoTrabajo,
                descripcion: orden.descripcion,
                prioridad: orden.prioridad,
                estado: "PENDIENTE",
                notas: orden.notas,
                area: "SALIDA",
                ordenGrupoId: orden.ordenGrupoId ?? orden.id,
                fecha: new Date().toISOString(),
                fechaIngreso: orden.fechaIngreso ?? orden.fecha,
                entidadId: orden.entidad?.id ?? null,
                equipoId: orden.equipo?.id_equipo ?? null,
                tecnicoId: orden.tecnico?.id_tecnico ?? null,
                incluyeCargador: orden.incluyeCargador ?? false,
            };

            const res = await fetch(`${API_URL}/detalle-trabajo-gestioo`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Error al crear orden de salida");
            }

            setToast({
                type: "success",
                message: "Orden de salida creada correctamente",
            });

            fetchOrdenes();
        } catch (err) {
            setToast({
                type: "error",
                message: (err as Error).message || "No se pudo crear la orden de salida",
            });
        }
    };

    const [ordenes, setOrdenes] = useState<DetalleTrabajoGestioo[]>([]);
    const [loading, setLoading] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewOrden, setPreviewOrden] = useState<DetalleTrabajoGestioo | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedOrden, setSelectedOrden] = useState<DetalleTrabajoGestioo | null>(null);
    const [creating, setCreating] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const [entidades, setEntidades] = useState<EntidadGestioo[]>([]);
    const [equipos, setEquipos] = useState<EquipoGestioo[]>([]);

    const [busquedaEquipo, setBusquedaEquipo] = useState("");

    const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);

    const [formData, setFormData] = useState<OrdenFormData>({
        tipoTrabajo: "",
        descripcion: "",
        prioridad: "normal",
        estado: "pendiente",
        notas: "",
        area: "entrada",
        fecha: getDateTimeLocalCL(),
        tipoEntidad: "EMPRESA",
        origenEntidad: "",
        entidadId: "",
        equipoId: "",
        incluyeCargador: false,
    });

    const [estadoFiltro, setEstadoFiltro] = useState<"todas" | "pendiente" | "en progreso" | "completada" | "cancelada">("todas");
    const [areaFiltro, setAreaFiltro] = useState<"todas" | Area>("todas");
    const [origenFiltro, setOrigenFiltro] = useState<"todas" | OrigenGestioo>("todas");

    /* ======= Fetch ======= */
    const fetchOrdenes = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/detalle-trabajo-gestioo`, { credentials: "include" });

            if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);

            const data = await res.json();
            const lista = Array.isArray(data) ? data : data.data ?? data.items ?? [];
            lista.sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
            setOrdenes(lista);
        } catch (e) {
            console.error("Error al cargar órdenes:", e);
            setToast({ type: "error", message: "Error al cargar las órdenes de trabajo" });
        } finally {
            setLoading(false);
        }
    };

    const fetchSelectData = async () => {
        try {
            const eRes = await fetch(`${API_URL}/entidades`, { credentials: "include" });
            if (!eRes.ok) throw new Error("Error al cargar entidades");
            const e = await eRes.json();
            setEntidades(e.data ?? e.items ?? e ?? []);
        } catch (err) {
            console.error("Error cargando entidades:", err);
            setEntidades([]);
        }
    };

    useEffect(() => {
        fetchOrdenes();
        fetchSelectData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const cargarEquipos = async () => {
            try {
                const res = await fetch(`${API_URL}/equipos?pageSize=700`, {
                    credentials: "include",
                });

                const data = await res.json();
                const list = Array.isArray(data) ? data : data.items ?? [];

                const normalized = list.map((e: any) => ({
                    ...e,
                    tipo: (e.tipo ?? TipoEquipo.GENERICO) as TipoEquipoValue,
                }));

                setEquipos(normalized);
            } catch (e) {
                console.error("Error cargando equipos:", e);
                setEquipos([]);
            }
        };

        cargarEquipos();
    }, []);

    useEffect(() => {
        const toastTimer = setTimeout(() => setToast(null), 4000);
        return () => clearTimeout(toastTimer);
    }, [toast]);

    useEffect(() => {
        fetch(`${API_URL}/tecnicos`, { credentials: "include" })
            .then(res => res.json())
            .then(data => {
                const list = Array.isArray(data) ? data : data.items ?? [];
                setTecnicos(list.filter((t: Tecnico) => t.status));
            })
            .catch(err => console.error("Error cargando técnicos", err));
    }, []);

    /* ======= Crear ======= */
    const handleCreate = async () => {
        if (!formData.tipoTrabajo.trim()) {
            setToast({ type: "error", message: "El tipo de trabajo es obligatorio" });
            return;
        }
        if (!formData.equipoId) {
            setToast({ type: "error", message: "Debe seleccionar un equipo asociado" });
            return;
        }
        if (!formData.tecnicoId) {
            setToast({ type: "error", message: "Debe seleccionar un técnico responsable" });
            return;
        }

        setCreating(true);
        try {
            const payload = {
                tipoTrabajo: formData.tipoTrabajo.trim() || "General",
                descripcion: formData.descripcion.trim() || null,
                prioridad: prioridadToApi(formData.prioridad),
                estado: estadoToApi(formData.estado),
                notas: formData.notas || null,
                area: areaToApi(formData.area),
                fecha: formData.fecha ? new Date(formData.fecha).toISOString() : undefined,
                entidadId: Number(formData.entidadId),
                equipoId: Number(formData.equipoId),
                tecnicoId: formData.tecnicoId ? Number(formData.tecnicoId) : null,
                incluyeCargador: formData.incluyeCargador,
            };

            console.log("📤 Enviando payload de creación:", payload);

            const res = await fetch(`${API_URL}/detalle-trabajo-gestioo`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = await res.json();
                console.error("❌ Error del servidor:", errorData);
                throw new Error(errorData.error || errorData.details || "Error al crear el detalle de trabajo");
            }

            await res.json();
            setToast({ type: "success", message: "Trabajo creado exitosamente" });

            setFormData({
                tipoTrabajo: "",
                descripcion: "",
                prioridad: "normal",
                estado: "pendiente",
                notas: "",
                area: "entrada",
                fecha: getDateTimeLocalCL(),
                tipoEntidad: "EMPRESA",
                origenEntidad: "",
                entidadId: "",
                equipoId: "",
                incluyeCargador: false,
            });

            setModalOpen(false);
            fetchOrdenes();
        } catch (error) {
            console.error("❌ Error en frontend:", error);
            setToast({ type: "error", message: (error as Error).message || "Error al crear el trabajo" });
        } finally {
            setCreating(false);
        }
    };

    const openPreviewModal = (orden: DetalleTrabajoGestioo) => {
        setPreviewOrden(orden);
        setPreviewOpen(true);
    };

    /* ======= Editar ======= */
    const openEditModal = (o: DetalleTrabajoGestioo) => {
        setSelectedOrden(o);
        setFormData({
            tipoTrabajo: o.tipoTrabajo ?? "",
            descripcion: o.descripcion ?? "",
            prioridad: (o.prioridad?.toLowerCase() ?? "normal") as Prioridad,
            estado: normalizeEstado(o.estado),
            notas: o.notas ?? "",
            area: normalizeArea(o.area) as Area,
            fecha: o.fecha ? toDateTimeLocal(o.fecha) : getDateTimeLocalCL(),
            tipoEntidad: o.tipoEntidad ?? "EMPRESA",
            origenEntidad: o.entidad?.origen ?? "",
            entidadId: String(o.entidad?.id ?? ""),
            equipoId: String(o.equipo?.id_equipo ?? ""),

            tecnicoId: o.tecnico?.id_tecnico ? String(o.tecnico.id_tecnico) : "",
            incluyeCargador: o.incluyeCargador ?? false,

        });
        setEditOpen(true);
    };

    // UPDATE
    const handleUpdate = async () => {
        if (!selectedOrden) return;

        if (!formData.tipoTrabajo.trim()) {
            setToast({ type: "error", message: "El tipo de trabajo es obligatorio" });
            return;
        }

        // Área original y nueva
        const originalArea = selectedOrden.area;
        const nuevaArea = areaToApi(formData.area);

        // ¿Debe duplicar a SALIDA?
        const debeDuplicar =
            originalArea !== "SALIDA" && nuevaArea === "SALIDA";

        setUpdating(true);

        try {
            const payload = {
                tipoTrabajo: formData.tipoTrabajo,
                descripcion: formData.descripcion || null,
                prioridad: prioridadToApi(formData.prioridad),
                estado: estadoToApi(formData.estado),
                notas: formData.notas || null,
                area: nuevaArea,
                fecha: formData.fecha
                    ? new Date(formData.fecha).toISOString()
                    : undefined,
                entidadId: formData.entidadId ? Number(formData.entidadId) : null,
                equipoId: formData.equipoId ? Number(formData.equipoId) : null,
                tecnicoId: formData.tecnicoId ? Number(formData.tecnicoId) : null,
                incluyeCargador: formData.incluyeCargador,
            };

            // 🔁 DUPLICAR (ENTRADA → SALIDA)
            if (debeDuplicar) {
                const res = await fetch(`${API_URL}/detalle-trabajo-gestioo`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(payload),
                });

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || "Error al crear orden de salida");
                }

                setToast({
                    type: "success",
                    message: "Orden de SALIDA creada correctamente",
                });
            } else {
                // ✏️ EDICIÓN NORMAL
                const res = await fetch(
                    `${API_URL}/detalle-trabajo-gestioo/${selectedOrden.id}`,
                    {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify(payload),
                    }
                );

                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || "Error al actualizar la orden");
                }

                setToast({
                    type: "success",
                    message: "Orden actualizada correctamente",
                });
            }

            setEditOpen(false);
            fetchOrdenes();
        } catch (err) {
            console.error(err);
            setToast({
                type: "error",
                message: (err as Error).message || "Error al guardar cambios",
            });
        } finally {
            setUpdating(false);
        }
    };

    /* ======= Eliminar ======= */
    const handleDelete = async (id: number) => {
        if (!confirm("¿Eliminar este trabajo?")) return;
        try {
            const res = await fetch(`${API_URL}/detalle-trabajo-gestioo/${id}`, {
                method: "DELETE",
                credentials: "include",
            });

            if (!res.ok) throw new Error("Error al eliminar el trabajo");

            setOrdenes((prev) => prev.filter((o) => o.id !== id));
            setToast({ type: "success", message: "Trabajo eliminado correctamente" });
        } catch {
            setToast({ type: "error", message: "Error al eliminar el trabajo" });
        }
    };

    /* ======= Filtrado ======= */
    const filtered = useMemo(() => {
        const q = safeLower(busquedaEquipo);

        const qNumber = Number(busquedaEquipo);

        return ordenes.filter((o) => {
            const matchesEstado = estadoFiltro === "todas" || normalizeEstado(o.estado) === estadoFiltro;
            const matchesArea = areaFiltro === "todas" || normalizeArea(o.area) === areaFiltro;
            const matchesOrigen = origenFiltro === "todas" || o.entidad?.origen === origenFiltro;

            const tipoLabel = o.equipo?.tipo ? safeLower(TipoEquipoLabel[o.equipo.tipo as TipoEquipoValue]) : "";
            const matchesEquipo =
                !q ||
                safeLower(o.equipo?.marca).includes(q) ||
                safeLower(o.equipo?.modelo).includes(q) ||
                safeLower(o.equipo?.serial).includes(q) ||
                tipoLabel.includes(q);

            const matchesOrdenId =
                busquedaEquipo &&
                !isNaN(qNumber) &&
                (o.ordenGrupoId === qNumber || o.id === qNumber);

            return matchesEstado && matchesArea && matchesOrigen && (matchesEquipo || matchesOrdenId);
        });
    }, [ordenes, estadoFiltro, areaFiltro, origenFiltro, busquedaEquipo]);

    const [showNewEntidadModal, setShowNewEntidadModal] = useState(false);
    const [showNuevoEquipoModal, setShowNuevoEquipoModal] = useState(false);
    const [showEditEntidadModal, setShowEditEntidadModal] = useState(false);
    const [showEditEquipoModal, setShowEditEquipoModal] = useState(false);

    const [equipoEditando, setEquipoEditando] = useState<EquipoGestioo | null>(null);

    const conteoPorEstado = useMemo(() => {
        const base = {
            todas: ordenes.length,
            pendiente: 0,
            "en progreso": 0,
            completada: 0,
            cancelada: 0,
        };

        ordenes.forEach((o) => {
            const estado = normalizeEstado(o.estado) as keyof typeof base;
            if (base[estado] !== undefined) {
                base[estado]++;
            }
        });

        return base;
    }, [ordenes]);

    const conteoPorArea = useMemo(() => {
        const base = {
            todas: ordenes.length,
            entrada: 0,
            domicilio: 0,
            reparacion: 0,
            salida: 0,
        };

        ordenes.forEach((o) => {
            const area = normalizeArea(o.area) as keyof typeof base;
            if (base[area] !== undefined) {
                base[area]++;
            }
        });

        return base;
    }, [ordenes]);

    return (
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-white via-white to-cyan-50">
            {/* Fondo decorativo */}
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute inset-0 [background:radial-gradient(circle_at_1px_1px,rgba(14,165,233,0.08)_1px,transparent_0)_0_0/22px_22px]" />
                <div className="absolute -top-32 -left-32 w-[60vw] max-w-[520px] aspect-square rounded-full blur-3xl bg-gradient-to-br from-cyan-200 to-indigo-200 opacity-40" />
                <div className="absolute -bottom-40 -right-40 w-[65vw] max-w-[560px] aspect-square rounded-full blur-3xl bg-gradient-to-tr from-fuchsia-200 to-cyan-200 opacity-40" />
            </div>

            <Header />

            {/* Contenido principal */}
            <main className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mt-6">
                <div className="rounded-3xl border border-cyan-200 bg-white/80 backdrop-blur-xl shadow-sm p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
                                <ToolOutlined className="text-cyan-600" />
                                Órdenes de Taller
                            </h1>
                            <p className="text-slate-600 text-sm mt-1">Control y seguimiento de trabajos técnicos (Entidad, Equipo).</p>
                        </div>

                        {/* Acciones principales */}
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => {
                                    setFormData({
                                        tipoTrabajo: "",
                                        descripcion: "",
                                        prioridad: "normal",
                                        estado: "pendiente",
                                        notas: "",
                                        area: "entrada",
                                        fecha: getDateTimeLocalCL(),
                                        tipoEntidad: "EMPRESA",
                                        origenEntidad: "",
                                        entidadId: "",
                                        equipoId: "",
                                        incluyeCargador: false,
                                    });
                                    setModalOpen(true);
                                }}
                                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-white bg-gradient-to-tr from-emerald-600 to-cyan-600 hover:brightness-110 transition shadow"
                            >
                                <PlusOutlined /> Nueva Orden
                            </button>

                            <button
                                onClick={fetchOrdenes}
                                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-cyan-800 border border-cyan-200 bg-white hover:bg-cyan-50 transition"
                            >
                                <ReloadOutlined /> Recargar
                            </button>
                        </div>
                    </div>

                    {/* Filtros rápidos */}
                    <div className="mt-4 flex flex-wrap gap-4 items-center">
                        <div className="mt-4">
                            <input
                                type="text"
                                placeholder="Buscar por N° orden, marca, modelo, serie o tipo..."
                                value={busquedaEquipo}
                                onChange={(e) => setBusquedaEquipo(e.target.value)}
                                className="border border-cyan-200 rounded-xl px-4 py-2 text-sm w-full md:w-72 focus:ring-2 focus:ring-cyan-400"
                            />
                        </div>

                        {/* Estado */}
                        <div className="flex flex-wrap gap-2">
                            {(["todas", "pendiente", "en progreso", "completada", "cancelada"] as const).map(
                                (estado) => (
                                    <button
                                        key={estado}
                                        onClick={() => setEstadoFiltro(estado)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition border ${estadoFiltro === estado
                                            ? "bg-cyan-600 text-white border-cyan-600"
                                            : "bg-white text-cyan-700 border-cyan-200 hover:bg-cyan-50"
                                            }`}
                                    >
                                        <span>
                                            {estado === "todas"
                                                ? "Todas"
                                                : estado.charAt(0).toUpperCase() + estado.slice(1)}
                                        </span>

                                        <span
                                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${estadoFiltro === estado
                                                ? "bg-white/20 text-white"
                                                : "bg-cyan-100 text-cyan-700"
                                                }`}
                                        >
                                            {conteoPorEstado[estado]}
                                        </span>
                                    </button>
                                )
                            )}
                        </div>

                        {/* Área */}
                        <div className="flex flex-wrap gap-2">
                            {(["todas", "entrada", "domicilio", "reparacion", "salida"] as const).map(
                                (area) => (
                                    <button
                                        key={area}
                                        onClick={() => setAreaFiltro(area)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition border ${areaFiltro === area
                                            ? "bg-indigo-600 text-white border-indigo-600"
                                            : "bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                                            }`}
                                    >
                                        <span>
                                            {area === "todas"
                                                ? "Todas"
                                                : area.charAt(0).toUpperCase() + area.slice(1)}
                                        </span>

                                        <span
                                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${areaFiltro === area
                                                ? "bg-white/20 text-white"
                                                : "bg-indigo-100 text-indigo-700"
                                                }`}
                                        >
                                            {conteoPorArea[area]}
                                        </span>
                                    </button>
                                )
                            )}
                        </div>

                        {/* Origen */}
                        <div className="flex flex-wrap gap-2">
                            {["todas", "RIDS", "ECONNET", "OTRO"].map((origen) => (
                                <button
                                    key={origen}
                                    onClick={() => setOrigenFiltro(origen === "todas" ? "todas" : (origen as OrigenGestioo))}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition border ${origenFiltro === origen ? "bg-violet-600 text-white border-violet-600" : "bg-white text-violet-700 border-violet-200 hover:bg-violet-50"
                                        }`}
                                >
                                    {origen === "todas" ? "Todos" : origen}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tabla */}
                <section className="mt-6 rounded-3xl border border-cyan-200 bg-white shadow-sm">
                    {/* Contenedor con scroll horizontal - ESTO ES CLAVE */}
                    <div className="overflow-x-auto rounded-3xl">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gradient-to-r from-cyan-50 to-indigo-50 border-b border-cyan-200 text-slate-800">
                                <tr>
                                    {["ID", "Tipo Trabajo", "Estado", "Área", "Equipo", "Empresa", "Origen", "Técnico", "Fecha ingreso", "Acciones"].map((h) => (
                                        <th
                                            key={h}
                                            className={`text-left px-4 py-3 font-semibold whitespace-nowrap ${h === "Acciones" ? "w-40" : h === "ID" ? "w-12" : h === "Prioridad" || h === "Estado" || h === "Área" || h === "Origen" ? "w-28" : ""
                                                }`}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            {/* Cuerpo de la tabla */}
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={12} className="py-10 text-center text-slate-500">
                                            Cargando...
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={12} className="py-10 text-center text-slate-500">
                                            Sin resultados.
                                        </td>
                                    </tr>
                                ) : (
                                    // Listado de órdenes
                                    filtered.map((o) => {

                                        // Determinar fecha a mostrar según área
                                        const fechaMostrar = o.fecha;

                                        // Render fila
                                        return (
                                            <tr
                                                key={o.id}
                                                className="border-t border-cyan-100 odd:bg-white even:bg-slate-50/40 hover:bg-cyan-50/60"
                                            >
                                                {/* ID */}
                                                <td className="px-4 py-3 w-16 align-middle">
                                                    <div className="flex flex-col leading-tight">
                                                        <span className="font-semibold text-slate-800">
                                                            #{o.ordenGrupoId ?? o.id}
                                                        </span>
                                                        <span className="text-xs text-slate-400 italic">
                                                            {o.area === "SALIDA" ? "Salida" : "Ingreso"}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Tipo trabajo */}
                                                <td
                                                    className="px-4 py-3 max-w-xs align-middle"
                                                    title={o.tipoTrabajo}
                                                >
                                                    {o.tipoTrabajo}
                                                </td>

                                                {/* Estado */}
                                                <td className="px-4 py-3 w-28 align-middle">
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-sm font-semibold ring-1 ${normalizeEstado(o.estado) === "completada"
                                                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                                            : normalizeEstado(o.estado) === "en progreso"
                                                                ? "bg-sky-50 text-sky-700 ring-sky-200"
                                                                : normalizeEstado(o.estado) === "cancelada"
                                                                    ? "bg-rose-50 text-rose-700 ring-rose-200"
                                                                    : "bg-amber-50 text-amber-700 ring-amber-200"
                                                            }`}
                                                    >
                                                        {normalizeEstado(o.estado)}
                                                    </span>
                                                </td>

                                                {/* Área */}
                                                <td className="px-4 py-3 w-28 align-middle">
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-sm font-semibold ring-1 ${o.area === "ENTRADA"
                                                            ? "bg-sky-50 text-sky-700 ring-sky-200"
                                                            : o.area === "DOMICILIO"
                                                                ? "bg-amber-50 text-amber-700 ring-amber-200"
                                                                : o.area === "REPARACION"
                                                                    ? "bg-indigo-50 text-indigo-700 ring-indigo-200"
                                                                    : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                                            }`}
                                                    >
                                                        {normalizeArea(o.area)}
                                                    </span>
                                                </td>

                                                {/* Equipo */}
                                                <td className="px-4 py-3 align-middle">
                                                    {o.equipo
                                                        ? `${o.equipo.marca} ${o.equipo.modelo}`
                                                        : "—"}
                                                </td>

                                                {/* Empresa */}
                                                <td className="px-4 py-3 align-middle">
                                                    {o.entidad?.nombre ?? "—"}
                                                </td>

                                                {/* Origen */}
                                                <td className="px-4 py-3 w-28 align-middle">
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${o.entidad?.origen === "RIDS"
                                                            ? "bg-cyan-50 text-cyan-700 ring-cyan-200"
                                                            : o.entidad?.origen === "ECONNET"
                                                                ? "bg-purple-50 text-purple-700 ring-purple-200"
                                                                : "bg-slate-50 text-slate-700 ring-slate-200"
                                                            }`}
                                                    >
                                                        {o.entidad?.origen ?? "—"}
                                                    </span>
                                                </td>

                                                {/* Técnico */}
                                                <td className="px-4 py-3 align-middle">
                                                    {o.tecnico ? (
                                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                                                            {o.tecnico.nombre}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 italic">
                                                            Sin asignar
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Fecha ingreso / salida */}
                                                <td className="px-4 py-3 whitespace-nowrap text-slate-700 align-middle text-center">
                                                    <div className="flex flex-col leading-tight">
                                                        <span className="font-medium">
                                                            {fechaMostrar
                                                                ? new Date(fechaMostrar).toLocaleDateString(
                                                                    "es-CL",
                                                                    {
                                                                        day: "2-digit",
                                                                        month: "2-digit",
                                                                        year: "numeric",
                                                                    }
                                                                )
                                                                : "—"}
                                                        </span>

                                                        <span className="text-xs text-slate-500">
                                                            {fechaMostrar
                                                                ? new Date(fechaMostrar).toLocaleTimeString(
                                                                    "es-CL",
                                                                    {
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                        hour12: false,
                                                                    }
                                                                )
                                                                : ""}
                                                        </span>

                                                        <span className="text-[13px] text-slate-400 italic">
                                                            {o.area === "SALIDA"
                                                                ? "Salida"
                                                                : "Ingreso"}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Acciones */}
                                                <td className="px-4 py-3 min-w-[180px] whitespace-nowrap align-middle">
                                                    <div className="flex gap-2 justify-center items-center">
                                                        <button
                                                            onClick={() => openPreviewModal(o)}
                                                            className="rounded-lg border border-slate-200 bg-white text-slate-700 p-2 hover:bg-slate-50"
                                                            title="Ver orden"
                                                        >
                                                            <EyeOutlined />
                                                        </button>

                                                        <button
                                                            onClick={() => openEditModal(o)}
                                                            className="rounded-lg border border-cyan-200 bg-white/90 text-cyan-800 p-2 hover:bg-cyan-50"
                                                            title="Editar orden"
                                                        >
                                                            <EditOutlined />
                                                        </button>

                                                        {o.area !== "SALIDA" && (
                                                            <button
                                                                onClick={() => duplicarOrdenSalida(o)}
                                                                className="rounded-lg border border-emerald-200 text-emerald-700 p-2 hover:bg-emerald-50"
                                                                title="Generar orden de salida"
                                                            >
                                                                <SwapOutlined />
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => {
                                                                const error =
                                                                    validarOrdenParaImprimir(o);
                                                                if (error) {
                                                                    setToast({
                                                                        type: "error",
                                                                        message: error,
                                                                    });
                                                                    return;
                                                                }
                                                                handlePrint(o);
                                                            }}
                                                            className="rounded-lg border border-indigo-200 text-indigo-700 p-2 hover:bg-indigo-50"
                                                            title="Imprimir orden"
                                                        >
                                                            <PrinterOutlined />
                                                        </button>

                                                        <button
                                                            onClick={() => handleDelete(o.id)}
                                                            className="rounded-lg border border-rose-200 text-rose-700 p-2 hover:bg-rose-50"
                                                            title="Eliminar orden"
                                                        >
                                                            <DeleteOutlined />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>

                        </table>
                    </div>
                </section>
            </main>

            {previewOpen && previewOrden && (
                <ModalPreviewOrden
                    orden={previewOrden}
                    onClose={() => {
                        setPreviewOpen(false);
                        setPreviewOrden(null);
                    }}
                    onPrint={() => handlePrint(previewOrden)}
                />
            )}

            {/* ===== Modal Crear ===== */}
            {modalOpen && (
                <ModalOrden
                    key="create-modal"
                    title="Nueva Orden de Trabajo"
                    onClose={() => setModalOpen(false)}
                    formData={formData}
                    setFormData={setFormData}
                    equipos={equipos}
                    entidades={entidades}
                    onSubmit={handleCreate}
                    loading={creating}
                    buttonLabel="Crear"
                    setShowNewEntidadModal={setShowNewEntidadModal}
                    setShowNuevoEquipoModal={setShowNuevoEquipoModal}
                    setShowEditEntidadModal={setShowEditEntidadModal}
                    setShowEditEquipoModal={setShowEditEquipoModal}
                    setEntidades={setEntidades}
                    setEquipoEditando={setEquipoEditando}

                    tecnicos={tecnicos}
                />
            )}

            {/* ===== Modal Editar ===== */}
            {editOpen && selectedOrden && (
                <ModalOrden
                    key={`edit-modal-${selectedOrden.id}`}
                    title={`Editar Orden #${selectedOrden.id}`}
                    onClose={() => setEditOpen(false)}
                    formData={formData}
                    setFormData={setFormData}
                    equipos={equipos}
                    entidades={entidades}
                    onSubmit={handleUpdate}
                    loading={updating}
                    buttonLabel="Guardar cambios"
                    setShowNewEntidadModal={setShowNewEntidadModal}
                    setShowNuevoEquipoModal={setShowNuevoEquipoModal}
                    setShowEditEntidadModal={setShowEditEntidadModal}
                    setShowEditEquipoModal={setShowEditEquipoModal}
                    setEntidades={setEntidades}
                    setEquipoEditando={setEquipoEditando}

                    tecnicos={tecnicos}
                />
            )}

            {/* ===== Modales Entidad/Equipo ===== */}
            {showNewEntidadModal && (
                <ModalNuevaEntidad
                    tipoEntidad={formData.tipoEntidad}
                    onClose={() => setShowNewEntidadModal(false)}
                    onSaved={(nuevoId) => {
                        fetchSelectData();
                        setFormData((prev) => ({ ...prev, entidadId: String(nuevoId) }));
                    }}
                />
            )}

            {showEditEntidadModal && formData.entidadId && (
                <ModalEditarEntidad
                    entidadId={formData.entidadId}
                    onClose={() => setShowEditEntidadModal(false)}
                    onSaved={() => {
                        setShowEditEntidadModal(false);
                        fetchSelectData();
                        setFormData((prev) => ({ ...prev }));
                    }}
                />
            )}

            {showNuevoEquipoModal && (
                <ModalNuevoEquipo
                    onClose={() => setShowNuevoEquipoModal(false)}
                    onSaved={async (nuevoId) => {
                        try {
                            const res = await fetch(`${API_URL}/equipos?pageSize=700`, {
                                credentials: "include",
                            });

                            const data = await res.json();
                            const list = Array.isArray(data) ? data : data.items ?? [];

                            const normalized = list.map((e: any) => ({
                                ...e,
                                tipo: (e.tipo ?? TipoEquipo.GENERICO) as TipoEquipoValue,
                            }));

                            setEquipos(normalized);

                            // ahora sí existe en el select
                            setFormData((prev) => ({
                                ...prev,
                                equipoId: String(nuevoId),
                            }));
                        } catch (err) {
                            console.error("Error recargando equipos:", err);
                        }
                    }}
                />

            )}

            {/* ===== Modal Editar Equipo ===== */}
            {showEditEquipoModal && equipoEditando && (
                <ModalEditarEquipo
                    equipo={equipoEditando}
                    onClose={() => {
                        setShowEditEquipoModal(false);
                        setEquipoEditando(null);
                    }}
                    onSaved={() => {
                        setShowEditEquipoModal(false);
                        setEquipoEditando(null);

                        const cargarEquipos = async () => {
                            const res = await fetch(`${API_URL}/equipos?pageSize=700`, { credentials: "include" });
                            const data = await res.json();
                            const list = Array.isArray(data) ? data : data.items ?? [];
                            const normalized = (list as any[]).map((e) => ({
                                ...e,
                                tipo: (e.tipo ?? TipoEquipo.GENERICO) as TipoEquipoValue,
                            }));
                            setEquipos(normalized);
                        };
                        cargarEquipos();
                    }}
                />
            )}

            {/* Toast */}
            {toast && (
                <motion.div
                    initial={{ y: -40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -40, opacity: 0 }}
                    className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white ${toast.type === "success" ? "bg-green-600" : "bg-rose-600"
                        }`}
                >
                    {toast.type === "success" ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
                    <span>{toast.message}</span>
                </motion.div>
            )}
        </div>
    );
};

export default OrdenesTaller;
