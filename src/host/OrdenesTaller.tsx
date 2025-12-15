import React, { useEffect, useState } from "react";
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
} from "@ant-design/icons";
import { motion } from "framer-motion";
import Header from "../components/Header";

// PDF
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/* ======= Tipos Gestioo ======= */
type OrigenGestioo = "RIDS" | "ECONNET" | "OTRO";

const OrigenGestioo = {
    RIDS: "RIDS" as OrigenGestioo,
    ECONNET: "ECONNET" as OrigenGestioo,
    OTRO: "OTRO" as OrigenGestioo,
};

interface EntidadGestioo {
    id: number;
    nombre: string;
    rut?: string;
    correo?: string;
    telefono?: string;
    direccion?: string;
    origen?: OrigenGestioo;
}

interface EquipoGestioo {
    id: number;
    marca: string;
    modelo: string;
    serie?: string | null;
    tipo?: string | null;
    estado?: string | null;
    solicitante?: {
        id: number;
        nombre: string;
        empresa?: {
            id: number;
            nombre: string;
        } | null;
    } | null;
}

type Prioridad = "baja" | "normal" | "alta";
type Area = "entrada" | "domicilio" | "reparacion" | "salida";

interface DetalleTrabajoGestioo {
    id: number;
    fecha: string;
    tipoTrabajo: string;
    tipoEntidad?: "EMPRESA" | "PERSONA";
    descripcion?: string | null;
    estado: string;
    notas?: string | null;
    area: "ENTRADA" | "DOMICILIO" | "REPARACION" | "SALIDA";
    prioridad: "BAJA" | "NORMAL" | "ALTA";
    entidad?: EntidadGestioo | null;
    equipo?: EquipoGestioo | null;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

/* ===== Helpers de mapeo ===== */
const areaToApi = (a: Area) =>
    a === "entrada" ? "ENTRADA" :
        a === "domicilio" ? "DOMICILIO" :
            a === "reparacion" ? "REPARACION" : "SALIDA";

const prioridadToApi = (p: Prioridad) =>
    p === "baja" ? "BAJA" : p === "alta" ? "ALTA" : "NORMAL";

const estadoToApi = (e: string) => {
    switch (e) {
        case "pendiente": return "PENDIENTE";
        case "en progreso": return "EN_PROCESO";
        case "completada": return "FINALIZADO";
        case "cancelada": return "CANCELADO";
        default: return "PENDIENTE";
    }
};

const estadoFromApi = (e: string | null | undefined) => {
    switch (e) {
        case "PENDIENTE": return "pendiente";
        case "EN_PROCESO": return "en progreso";
        case "FINALIZADO": return "completada";
        case "CANCELADO": return "cancelada";
        default: return "pendiente";
    }
};

/* ===== Fecha local Chile (compatible con datetime-local) ===== */
const getDateTimeLocalCL = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset();
    const local = new Date(now.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
};

//PDF 
// ==============================
//   PDF ORDEN DE TALLER - FULL
// ==============================
const handlePrint = async (orden: DetalleTrabajoGestioo) => {
    try {
        const fechaActual = new Date().toLocaleString("es-CL", {
            dateStyle: "short",
            timeStyle: "short",
        });

        const codigo = String(orden.id).padStart(6, "0");

        // Datos corporativos
        const ORIGEN_DATA = {
            RIDS: {
                nombre: "RIDS LTDA",
                direccion: "Santiago - Providencia, La Concepción 65",
                correo: "soporte@rids.cl",
                telefono: "+56 9 8823 1976",
                logo: "/img/splash.png"
            },
            ECONNET: {
                nombre: "ECONNET SPA",
                direccion: "Santiago - Providencia, La Concepción 65",
                correo: "ventas@econnet.cl",
                telefono: "+56 9 8807 6593",
                logo: "/img/ecconetlogo.png"
            },
            OTRO: {
                nombre: orden.entidad?.nombre ?? "Empresa",
                direccion: orden.entidad?.direccion ?? "",
                correo: orden.entidad?.correo ?? "",
                telefono: orden.entidad?.telefono ?? "",
                logo: "/img/splash.png"
            }
        };

        const origenInfo = ORIGEN_DATA[orden.entidad?.origen ?? "OTRO"];

        // ======================
        //     HTML DEL PDF
        // ======================
        const html = `
<div class="pdf-container" style="
    width: 1700px;
    margin: 0 auto;
    padding: 40px;
    font-family: Arial, sans-serif;
    color: #000;
">

<!-- HEADER -->
<div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #444; padding-bottom: 15px; margin-bottom: 20px;">
    <div style="display: flex; align-items: center; gap: 14px;">
        <img src="${origenInfo.logo}" style="height: 55px;" />
        <div>
            <h2 style="margin: 0; font-size: 22px; font-weight: bold;">${origenInfo.nombre}</h2>
            <p style="margin: 0; font-size: 12px; color: #4b5563;">
                ${origenInfo.direccion} · ${origenInfo.correo}<br>${origenInfo.telefono}
            </p>
        </div>
    </div>

    <div style="text-align: right;">
        <p style="margin: 0; font-size: 12px;">Fecha impresión: ${fechaActual}</p>
        <h3 style="margin: 4px 0 0;">Orden de Taller N° <b>${codigo}</b></h3>
    </div>
</div>

<!-- CLIENTE / EQUIPO -->
<div style="display: flex; gap: 20px; margin-bottom: 25px;">

    <!-- CLIENTE -->
    <div style="flex: 1; border: 1px solid #d1d5db; padding: 15px; border-radius: 10px; background: #f9fafb;">
        <h3 style="margin: 0 0 10px; font-size: 14px;">Datos del Cliente</h3>
        <p><b>Entidad:</b> ${orden.entidad?.nombre ?? "—"}</p>
        <p><b>RUT:</b> ${orden.entidad?.rut ?? "—"}</p>
        <p><b>Teléfono:</b> ${orden.entidad?.telefono ?? "—"}</p>
        <p><b>Correo:</b> ${orden.entidad?.correo ?? "—"}</p>
        <p><b>Dirección:</b> ${orden.entidad?.direccion ?? "—"}</p>
    </div>

    <!-- EQUIPO -->
    <div style="flex: 1; border: 1px solid #d1d5db; padding: 15px; border-radius: 10px; background: #eef6ff;">
        <h3 style="margin: 0 0 10px; font-size: 14px;">Datos del Equipo</h3>
        <p><b>Equipo:</b> ${orden.equipo?.marca ?? "—"} ${orden.equipo?.modelo ?? ""}</p>
        <p><b>Tipo:</b> ${orden.equipo?.tipo ?? "—"}</p>
        <p><b>Serie:</b> ${orden.equipo?.serie ?? "—"}</p>
        <p><b>Área:</b> ${orden.area ?? "—"}</p>
        <p><b>Fecha ingreso:</b> ${new Date(orden.fecha).toLocaleString("es-CL")}</p>
    </div>
</div>

<!-- SECCIONES DE TEXTO -->
<div style="margin-bottom: 15px;">
    <h3 style="font-size: 14px;">Trabajo solicitado:</h3>
    <br>
    <div style="border: 1px solid #d1d5db; padding: 10px; border-radius: 8px; background: #f9fafb;">
        ${orden.tipoTrabajo ?? "—"}
    </div>
</div>

<div style="margin-bottom: 15px;">
    <h3 style="font-size: 14px;">Descripción del problema:</h3>
    <br>
    <div style="border: 1px solid #d1d5db; padding: 10px; border-radius: 8px; background: #f9fafb;">
        ${orden.descripcion ?? "Sin descripción adicional."}
    </div>
</div>

<div style="margin-bottom: 15px;">
    <h3 style="font-size: 14px;">Notas del técnico:</h3>
    <br>
    <div style="border: 1px solid #d1d5db; padding: 10px; border-radius: 8px; background: #f9fafb;">
        ${orden.notas ?? "Sin observaciones."}
    </div>
</div>

<!-- SEGUIMIENTO -->
<div style="background: #e0f2fe; border: 1px solid #93c5fd; padding: 12px; text-align: center; border-radius: 10px; margin-top: 25px; font-size: 14px;">
    Consulte el estado de la orden en:<br>
    <b>https://rids-intranet.netlify.app/home</b><br>
    Código: <b>${codigo}</b>
</div>

<!-- FIRMAS -->
<div style="margin-top: 60px; display: flex; justify-content: space-between;">

    <div style="width: 45%; text-align: center;">
        <br><br><br><br><br><br><br>
        <div style="border-top: 1px dashed #555; padding-top: 6px;">
            Firma Cliente<br>
            <span style="font-size: 11px;">Nombre y RUT</span>
        </div>
    </div>

    <div style="width: 45%; text-align: center;">
        <br><br><br><br><br><br><br>
        <div style="border-top: 1px solid #333; padding-top: 6px;">
            Firma Empresa<br>
            <span style="font-size: 11px;">Representante autorizado</span>
        </div>
    </div>
</div>

<!-- TERMINOS -->
<div style="margin-top: 30px; padding-top: 12px; border-top: 1px solid #ccc; font-size: 11px; color: #444; line-height: 1.4;">
<b>Términos y condiciones:</b><br>
1) Para retirar el equipo es indispensable presentar esta orden.<br>
2) El equipo deberá ser retirado dentro de 30 días desde la notificación.<br>
3) Al dejar el equipo en reparación, el cliente acepta estas condiciones.<br>
4) La empresa no se responsabiliza por accesorios no declarados.
</div>

</div>
`;

        // ======================
        //   GENERAR CANVAS
        // ======================
        const container = document.createElement("div");
        container.innerHTML = html;
        document.body.appendChild(container);

        const canvas = await html2canvas(container, {
            scale: 2,
            width: container.scrollWidth,
            height: container.scrollHeight,
            windowWidth: container.scrollWidth
        });

        const pdf = new jsPDF("p", "mm", "a4");
        const img = canvas.toDataURL("image/png");

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const proportionalHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(img, "PNG", 0, 0, pdfWidth, proportionalHeight);
        pdf.save(`Orden_${codigo}.pdf`);

        document.body.removeChild(container);

    } catch (err) {
        console.error(err);
        alert("Error al generar PDF");
    }
};


const OrdenesTaller: React.FC = () => {
    const [ordenes, setOrdenes] = useState<DetalleTrabajoGestioo[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedOrden, setSelectedOrden] = useState<DetalleTrabajoGestioo | null>(null);
    const [creating, setCreating] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const [entidades, setEntidades] = useState<EntidadGestioo[]>([]);
    const [equipos, setEquipos] = useState<EquipoGestioo[]>([]);
    const [equiposFiltrados, setEquiposFiltrados] = useState<EquipoGestioo[]>([]);

    const [busquedaEquipo, setBusquedaEquipo] = useState("");

    const [formData, setFormData] = useState({
        tipoTrabajo: "",
        descripcion: "",
        prioridad: "normal" as Prioridad,
        estado: "pendiente",
        notas: "",
        area: "entrada" as Area,
        fecha: getDateTimeLocalCL(),
        tipoEntidad: "EMPRESA" as "EMPRESA" | "PERSONA",
        origenEntidad: "",
        entidadId: "",
        equipoId: "",
    });

    const [estadoFiltro, setEstadoFiltro] = useState<"todas" | "pendiente" | "en progreso" | "completada" | "cancelada">("todas");
    const [areaFiltro, setAreaFiltro] = useState<"todas" | Area>("todas");
    const [origenFiltro, setOrigenFiltro] = useState<"todas" | OrigenGestioo>("todas");

    /* ======= Fetch ======= */
    const fetchOrdenes = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/detalle-trabajo-gestioo`, {
                credentials: "include"
            });

            if (!res.ok) {
                throw new Error(`Error ${res.status}: ${res.statusText}`);
            }

            const data = await res.json();

            const lista = Array.isArray(data) ? data : data.data ?? data.items ?? [];
            lista.sort((a: any, b: any) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

            setOrdenes(lista);
        } catch (e) {
            console.error("Error al cargar órdenes:", e);
            setToast({
                type: "error",
                message: "Error al cargar las órdenes de trabajo"
            });
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

    // Efecto para cargar equipos cuando cambia la entidad seleccionada
    useEffect(() => {
        const cargarEquiposDeEmpresa = async () => {
            if (!formData.entidadId) {
                setEquipos([]);
                setEquiposFiltrados([]);
                return;
            }

            try {
                const res = await fetch(`${API_URL}/equipos?empresaId=${formData.entidadId}`, {
                    credentials: "include"
                });

                if (!res.ok) {
                    throw new Error("Error al cargar equipos");
                }

                const data = await res.json();
                const equiposData = Array.isArray(data) ? data : data.data ?? data.items ?? [];
                setEquipos(equiposData);
                setEquiposFiltrados(equiposData);
            } catch (err) {
                console.error("Error cargando equipos:", err);
                setEquipos([]);
                setEquiposFiltrados([]);
            }
        };

        cargarEquiposDeEmpresa();
    }, [formData.entidadId]);

    useEffect(() => {
        fetchOrdenes();
        fetchSelectData();
    }, []);

    // Efecto para limpiar timeouts
    useEffect(() => {
        const toastTimer = setTimeout(() => {
            setToast(null);
        }, 4000);

        return () => {
            clearTimeout(toastTimer);
        };
    }, [toast]);

    /* ======= Crear ======= */
    const handleCreate = async () => {
        // === VALIDACIONES OBLIGATORIAS ===
        if (!formData.tipoTrabajo.trim()) {
            setToast({
                type: "error",
                message: "El tipo de trabajo es obligatorio"
            });
            return;
        }

        if (!formData.entidadId) {
            setToast({
                type: "error",
                message: "Debe seleccionar una empresa o persona"
            });
            return;
        }

        if (!formData.equipoId) {
            setToast({
                type: "error",
                message: "Debe seleccionar un equipo asociado"
            });
            return;
        }

        // =====================================

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

                // Obligatorios
                entidadId: Number(formData.entidadId),
                equipoId: Number(formData.equipoId),
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

            const newData = await res.json();
            console.log("✅ Creación exitosa:", newData);

            setToast({ type: "success", message: "Trabajo creado exitosamente" });

            // Reiniciar formulario
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
            });

            setModalOpen(false);
            fetchOrdenes();

        } catch (error) {
            console.error("❌ Error en frontend:", error);
            setToast({
                type: "error",
                message: (error as Error).message || "Error al crear el trabajo"
            });
        } finally {
            setCreating(false);
        }
    };

    /* ======= Editar ======= */
    const openEditModal = (o: DetalleTrabajoGestioo) => {
        setSelectedOrden(o);
        setFormData({
            tipoTrabajo: o.tipoTrabajo ?? "",
            descripcion: o.descripcion ?? "",
            prioridad: (o.prioridad?.toLowerCase() ?? "normal") as Prioridad,
            estado: estadoFromApi(o.estado),
            notas: o.notas ?? "",
            area: (o.area?.toLowerCase() ?? "entrada") as Area,
            fecha: o.fecha
                ? new Date(o.fecha).toISOString().slice(0, 16)
                : getDateTimeLocalCL(),
            tipoEntidad: o.tipoEntidad ?? "EMPRESA",
            origenEntidad: o.entidad?.origen ?? "",
            entidadId: String(o.entidad?.id ?? ""),
            equipoId: String(o.equipo?.id ?? ""),
        });
        setEditOpen(true);
    };

    const handleUpdate = async () => {
        if (!selectedOrden) return;

        // Validación antes de enviar
        if (!formData.tipoTrabajo.trim()) {
            setToast({
                type: "error",
                message: "El tipo de trabajo es obligatorio"
            });
            return;
        }

        setUpdating(true);
        try {
            // Preparar payload solo con campos válidos
            const payload = {
                tipoTrabajo: formData.tipoTrabajo,
                descripcion: formData.descripcion || null,
                prioridad: prioridadToApi(formData.prioridad),
                estado: estadoToApi(formData.estado),
                notas: formData.notas || null,
                area: areaToApi(formData.area),
                fecha: formData.fecha ? new Date(formData.fecha).toISOString() : undefined,
                // Solo enviar entidadId si tiene valor
                entidadId: formData.entidadId ? Number(formData.entidadId) : null,
                // Solo enviar equipoId si tiene valor
                equipoId: formData.equipoId ? Number(formData.equipoId) : null,
            };

            console.log("📤 Enviando payload de actualización:", payload);

            const res = await fetch(`${API_URL}/detalle-trabajo-gestioo/${selectedOrden.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = await res.json();
                console.error("❌ Error del servidor:", errorData);
                throw new Error(errorData.error || errorData.details || "Error al actualizar el trabajo");
            }

            const updatedData = await res.json();
            console.log("✅ Actualización exitosa:", updatedData);

            setToast({ type: "success", message: "Trabajo actualizado correctamente" });
            setEditOpen(false);
            fetchOrdenes();

        } catch (err) {
            console.error("❌ Error en frontend:", err);
            setToast({
                type: "error",
                message: (err as Error).message || "Error al actualizar el trabajo"
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
                credentials: "include"
            });

            if (!res.ok) {
                throw new Error("Error al eliminar el trabajo");
            }

            setOrdenes((prev) => prev.filter((o) => o.id !== id));
            setToast({ type: "success", message: "Trabajo eliminado correctamente" });
        } catch {
            setToast({ type: "error", message: "Error al eliminar el trabajo" });
        }
    };

    const filtered = ordenes.filter((o) => {
        const matchesEstado =
            estadoFiltro === "todas" ||
            estadoFromApi(o.estado) === estadoFiltro;

        const matchesArea =
            areaFiltro === "todas" ||
            (o.area?.toLowerCase() ?? "") === areaFiltro;

        const matchesOrigen =
            origenFiltro === "todas" ||
            o.entidad?.origen === origenFiltro;

        const matchesEquipo =
            !busquedaEquipo ||
            o.equipo?.marca?.toLowerCase().includes(busquedaEquipo.toLowerCase()) ||
            o.equipo?.modelo?.toLowerCase().includes(busquedaEquipo.toLowerCase()) ||
            o.equipo?.serie?.toLowerCase().includes(busquedaEquipo.toLowerCase()) ||
            o.equipo?.tipo?.toLowerCase().includes(busquedaEquipo.toLowerCase());

        return matchesEstado && matchesArea && matchesOrigen && matchesEquipo;
    });

    const [showNewEntidadModal, setShowNewEntidadModal] = useState(false);
    const [showNuevoEquipoModal, setShowNuevoEquipoModal] = useState(false);
    const [showEditEntidadModal, setShowEditEntidadModal] = useState(false);
    const [showEditEquipoModal, setShowEditEquipoModal] = useState(false);

    return (
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-white via-white to-cyan-50">
            {/* Fondo decorativo */}
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute inset-0 [background:radial-gradient(circle_at_1px_1px,rgba(14,165,233,0.08)_1px,transparent_0)_0_0/22px_22px]" />
                <div className="absolute -top-32 -left-32 w-[60vw] max-w-[520px] aspect-square rounded-full blur-3xl bg-gradient-to-br from-cyan-200 to-indigo-200 opacity-40" />
                <div className="absolute -bottom-40 -right-40 w-[65vw] max-w-[560px] aspect-square rounded-full blur-3xl bg-gradient-to-tr from-fuchsia-200 to-cyan-200 opacity-40" />
            </div>

            <Header />

            {/* Toolbar */}
            <main className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mt-6">
                <div className="rounded-3xl border border-cyan-200 bg-white/80 backdrop-blur-xl shadow-sm p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
                                <ToolOutlined className="text-cyan-600" />
                                Órdenes de Taller
                            </h1>
                            <p className="text-slate-600 text-sm mt-1">
                                Control y seguimiento de trabajos técnicos (Entidad, Equipo).
                            </p>
                        </div>

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
                        {/* Estado */}

                        <div className="mt-4">
                            <input
                                type="text"
                                placeholder="Buscar por marca, modelo, serie o tipo..."
                                value={busquedaEquipo}
                                onChange={(e) => setBusquedaEquipo(e.target.value)}
                                className="border border-cyan-200 rounded-xl px-4 py-2 text-sm w-full md:w-72 focus:ring-2 focus:ring-cyan-400"
                            />
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {["todas", "pendiente", "en progreso", "completada", "cancelada"].map((estado) => (
                                <button
                                    key={estado}
                                    onClick={() => setEstadoFiltro(estado as any)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition border ${estadoFiltro === estado
                                        ? "bg-cyan-600 text-white border-cyan-600"
                                        : "bg-white text-cyan-700 border-cyan-200 hover:bg-cyan-50"
                                        }`}
                                >
                                    {estado === "todas" ? "Todas" : estado.charAt(0).toUpperCase() + estado.slice(1)}
                                </button>
                            ))}
                        </div>

                        {/* Área */}
                        <div className="flex flex-wrap gap-2">
                            {["todas", "entrada", "domicilio", "reparacion", "salida"].map((area) => (
                                <button
                                    key={area}
                                    onClick={() => setAreaFiltro(area as any)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition border ${areaFiltro === area
                                        ? "bg-indigo-600 text-white border-indigo-600"
                                        : "bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                                        }`}
                                >
                                    {area === "todas" ? "Todas" : area.charAt(0).toUpperCase() + area.slice(1)}
                                </button>
                            ))}
                        </div>

                        {/* Origen */}
                        <div className="flex flex-wrap gap-2">
                            {["todas", "RIDS", "ECONNET", "OTRO"].map((origen) => (
                                <button
                                    key={origen}
                                    onClick={() => setOrigenFiltro(origen === "todas" ? "todas" : origen as OrigenGestioo)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition border ${origenFiltro === origen
                                        ? "bg-violet-600 text-white border-violet-600"
                                        : "bg-white text-violet-700 border-violet-200 hover:bg-violet-50"
                                        }`}
                                >
                                    {origen === "todas" ? "Todos" : origen}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tabla - CORREGIDA PARA BOTONES VISIBLES */}
                <section className="mt-6 rounded-3xl border border-cyan-200 bg-white overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm" style={{ minWidth: '1200px' }}>
                            <thead className="bg-gradient-to-r from-cyan-50 to-indigo-50 border-b border-cyan-200 text-slate-800">
                                <tr>
                                    {["ID", "Tipo Trabajo", "Prioridad", "Estado", "Área", "Equipo", "Tipo", "Entidad", "Origen", "Fecha ingreso", "Acciones"].map((h) => (
                                        <th
                                            key={h}
                                            className={`text-left px-4 py-3 font-semibold ${h === "Acciones" ? "w-40" :
                                                h === "ID" ? "w-16" :
                                                    h === "Prioridad" || h === "Estado" || h === "Área" || h === "Origen" ? "w-28" : ""
                                                }`}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={11} className="py-10 text-center text-slate-500">Cargando...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={11} className="py-10 text-center text-slate-500">Sin resultados.</td></tr>
                                ) : (
                                    filtered.map((o) => (
                                        <tr key={o.id} className="border-t border-cyan-100 odd:bg-white even:bg-slate-50/40 hover:bg-cyan-50/60">
                                            <td className="px-4 py-3 w-16">{o.id}</td>
                                            <td className="px-4 py-3 max-w-xs truncate" title={o.tipoTrabajo}>
                                                {o.tipoTrabajo}
                                            </td>
                                            <td className="px-4 py-3 w-28">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${o.prioridad === "ALTA"
                                                    ? "bg-rose-50 text-rose-700 ring-rose-200"
                                                    : o.prioridad === "BAJA"
                                                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                                        : "bg-amber-50 text-amber-700 ring-amber-200"
                                                    }`}>
                                                    {o.prioridad.toLowerCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 w-28">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${estadoFromApi(o.estado) === "completada"
                                                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                                    : estadoFromApi(o.estado) === "en progreso"
                                                        ? "bg-sky-50 text-sky-700 ring-sky-200"
                                                        : estadoFromApi(o.estado) === "cancelada"
                                                            ? "bg-rose-50 text-rose-700 ring-rose-200"
                                                            : "bg-amber-50 text-amber-700 ring-amber-200"
                                                    }`}>
                                                    {estadoFromApi(o.estado)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 w-28">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${o.area === "ENTRADA"
                                                    ? "bg-sky-50 text-sky-700 ring-sky-200"
                                                    : o.area === "DOMICILIO"
                                                        ? "bg-amber-50 text-amber-700 ring-amber-200"
                                                        : o.area === "REPARACION"
                                                            ? "bg-indigo-50 text-indigo-700 ring-indigo-200"
                                                            : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                                    }`}>
                                                    {o.area.toLowerCase()}
                                                </span>
                                            </td>

                                            <td className="px-4 py-3">
                                                {o.equipo ? `${o.equipo.marca} ${o.equipo.modelo}` : "—"}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 ring-1 ring-purple-200">
                                                    {o.equipo?.tipo ?? "—"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">{o.entidad?.nombre ?? "—"}</td>
                                            <td className="px-4 py-3 w-28">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ${o.entidad?.origen === "RIDS"
                                                    ? "bg-cyan-50 text-cyan-700 ring-cyan-200"
                                                    : o.entidad?.origen === "ECONNET"
                                                        ? "bg-purple-50 text-purple-700 ring-purple-200"
                                                        : "bg-slate-50 text-slate-700 ring-slate-200"
                                                    }`}>
                                                    {o.entidad?.origen ?? "—"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                                                <div className="flex flex-col leading-tight">
                                                    <span>
                                                        {new Date(o.fecha).toLocaleDateString("es-CL", {
                                                            day: "2-digit",
                                                            month: "2-digit",
                                                            year: "numeric"
                                                        })}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {new Date(o.fecha).toLocaleTimeString("es-CL", {
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                            hour12: false
                                                        })}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* COLUMNA DE ACCIONES - CORREGIDA */}
                                            <td className="px-4 py-3 min-w-[180px] whitespace-nowrap">
                                                <div className="flex gap-2 justify-start flex-nowrap">
                                                    <button
                                                        onClick={() => openEditModal(o)}
                                                        className="rounded-lg border border-cyan-200 bg-white/90 text-cyan-800 p-2 hover:bg-cyan-50 transition flex items-center justify-center min-w-[36px]"
                                                        title="Editar orden"
                                                        aria-label={`Editar orden ${o.id}`}
                                                    >
                                                        <EyeOutlined />
                                                    </button>
                                                    <button
                                                        onClick={() => handlePrint(o)}
                                                        className="rounded-lg border border-indigo-200 text-indigo-700 p-2 hover:bg-indigo-50 transition flex items-center justify-center min-w-[36px]"
                                                        title="Imprimir orden"
                                                        aria-label={`Imprimir orden ${o.id}`}
                                                    >
                                                        <PrinterOutlined />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(o.id)}
                                                        className="rounded-lg border border-rose-200 text-rose-700 p-2 hover:bg-rose-50 transition flex items-center justify-center min-w-[36px]"
                                                        title="Eliminar orden"
                                                        aria-label={`Eliminar orden ${o.id}`}
                                                    >
                                                        <DeleteOutlined />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </main>

            {/* ===== Modal Crear ===== */}
            {modalOpen && (
                <ModalOrden
                    key="create-modal"
                    title="Nueva Orden de Trabajo"
                    onClose={() => setModalOpen(false)}
                    formData={formData}
                    setFormData={setFormData}
                    entidades={entidades}
                    equipos={equiposFiltrados}
                    onSubmit={handleCreate}
                    loading={creating}
                    buttonLabel="Crear"
                    setShowNewEntidadModal={setShowNewEntidadModal}
                    setShowNuevoEquipoModal={setShowNuevoEquipoModal}
                    setShowEditEntidadModal={setShowEditEntidadModal}
                    setShowEditEquipoModal={setShowEditEquipoModal}
                    setEntidades={setEntidades}
                    setEquiposFiltrados={setEquiposFiltrados}
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
                    entidades={entidades}
                    equipos={equiposFiltrados}
                    onSubmit={handleUpdate}
                    loading={updating}
                    buttonLabel="Guardar cambios"
                    setShowNewEntidadModal={setShowNewEntidadModal}
                    setShowNuevoEquipoModal={setShowNuevoEquipoModal}
                    setShowEditEntidadModal={setShowEditEntidadModal}
                    setShowEditEquipoModal={setShowEditEquipoModal}
                    setEntidades={setEntidades}
                    setEquiposFiltrados={setEquiposFiltrados}
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

            {showNuevoEquipoModal && (
                <ModalNuevoEquipo
                    entidadId={formData.entidadId}
                    onClose={() => setShowNuevoEquipoModal(false)}
                    onSaved={(nuevoId) => {
                        // Recargar equipos después de crear uno nuevo
                        const cargarEquipos = async () => {
                            if (!formData.entidadId) return;
                            try {
                                const res = await fetch(`${API_URL}/equipos?empresaId=${formData.entidadId}`, {
                                    credentials: "include"
                                });
                                const data = await res.json();
                                const equiposData = Array.isArray(data) ? data : data.data ?? data.items ?? [];
                                setEquipos(equiposData);
                                setEquiposFiltrados(equiposData);
                            } catch (err) {
                                console.error("Error cargando equipos:", err);
                            }
                        };
                        cargarEquipos();
                        setFormData((prev) => ({ ...prev, equipoId: String(nuevoId) }));
                    }}
                />
            )}


            {showEditEntidadModal && (
                <ModalEditarEntidad
                    entidadId={formData.entidadId}
                    onClose={() => setShowEditEntidadModal(false)}
                    onSaved={() => {
                        fetchSelectData();
                        // También recargar equipos si la entidad cambió
                        if (formData.entidadId) {
                            const cargarEquipos = async () => {
                                try {
                                    const res = await fetch(`${API_URL}/equipos?empresaId=${formData.entidadId}`, {
                                        credentials: "include"
                                    });
                                    const data = await res.json();
                                    const equiposData = Array.isArray(data) ? data : data.data ?? data.items ?? [];
                                    setEquipos(equiposData);
                                    setEquiposFiltrados(equiposData);
                                } catch (err) {
                                    console.error("Error cargando equipos:", err);
                                }
                            };
                            cargarEquipos();
                        }
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

/* ======= Modal Orden (reutilizable) ======= */
interface ModalProps {
    title: string;
    onClose: () => void;
    onSubmit: () => void;
    formData: any;
    setFormData: (v: any) => void;
    entidades: EntidadGestioo[];
    equipos: EquipoGestioo[];
    loading: boolean;
    buttonLabel: string;
    setShowNewEntidadModal: React.Dispatch<React.SetStateAction<boolean>>;
    setShowNuevoEquipoModal: React.Dispatch<React.SetStateAction<boolean>>;
    setShowEditEntidadModal: React.Dispatch<React.SetStateAction<boolean>>;
    setShowEditEquipoModal: React.Dispatch<React.SetStateAction<boolean>>;
    setEntidades: React.Dispatch<React.SetStateAction<EntidadGestioo[]>>;
    setEquiposFiltrados: React.Dispatch<React.SetStateAction<EquipoGestioo[]>>;
}

const ModalOrden: React.FC<ModalProps> = ({
    title, onClose, onSubmit, formData, setFormData,
    entidades, equipos, loading, buttonLabel,
    setShowNewEntidadModal, setShowNuevoEquipoModal,
    setShowEditEntidadModal, setShowEditEquipoModal,
    setEntidades, setEquiposFiltrados,
}) => {
    const [busquedaEquipo, setBusquedaEquipo] = useState("");

    // Filtrar equipos basados en búsqueda
    const equiposFiltrados = equipos.filter((eq) => {
        const q = busquedaEquipo.toLowerCase();
        return (
            eq.marca?.toLowerCase().includes(q) ||
            eq.modelo?.toLowerCase().includes(q) ||
            eq.serie?.toLowerCase().includes(q) ||
            eq.tipo?.toLowerCase().includes(q)
        );
    });

    const handleClose = () => {
        setBusquedaEquipo("");
        onClose();
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
                            onClick={handleClose}
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
                        {/* Sección 1: Información Principal */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Columna Izquierda */}
                            <div className="space-y-6">
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

                                {/* Descripción */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Descripción del Trabajo
                                    </label>
                                    <textarea
                                        placeholder="Describe detalladamente el trabajo a realizar..."
                                        required
                                        value={formData.descripcion}
                                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                        className="w-full border border-cyan-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all resize-none"
                                        rows={4}
                                    />
                                </div>

                                {/* Notas */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Notas / Observaciones
                                    </label>
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
                                                onChange={(e) => setFormData({ ...formData, prioridad: e.target.value })}
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
                                                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
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
                                                onChange={(e) => setFormData({ ...formData, area: e.target.value as Area })}
                                                className="w-full border border-cyan-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-cyan-400"
                                            >
                                                <option value="entrada"> Entrada</option>
                                                <option value="domicilio"> Domicilio</option>
                                                <option value="reparacion"> Reparación</option>
                                                <option value="salida"> Salida</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Fecha Ingreso</label>
                                            <input
                                                type="datetime-local"
                                                value={formData.fecha}
                                                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                                                className="w-full border border-cyan-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-cyan-400"
                                            />
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
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                Tipo de Entidad
                                            </label>

                                            <select
                                                value={formData.tipoEntidad}
                                                onChange={(e) => {
                                                    const tipo = e.target.value;

                                                    setFormData({
                                                        ...formData,
                                                        tipoEntidad: tipo,
                                                        entidadId: "",
                                                        origenEntidad: "",  // reset
                                                    });

                                                    // Si es PERSONA → cargar todas las personas
                                                    if (tipo === "PERSONA") {
                                                        fetch(`${API_URL}/entidades?tipo=PERSONA`, { credentials: "include" })
                                                            .then(res => res.json())
                                                            .then(data => setEntidades(Array.isArray(data) ? data : data.data))
                                                            .catch(() => setEntidades([]));
                                                    } else {
                                                        // Si es empresa → esperar origen
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
                                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                                    Origen de la Empresa
                                                </label>

                                                <select
                                                    value={formData.origenEntidad}
                                                    onChange={(e) => {
                                                        const origen = e.target.value;

                                                        setFormData({
                                                            ...formData,
                                                            origenEntidad: origen,
                                                            entidadId: "",
                                                        });

                                                        fetch(`${API_URL}/entidades?tipo=EMPRESA&origen=${origen}`, {
                                                            credentials: "include",
                                                        })
                                                            .then(res => res.json())
                                                            .then(data => setEntidades(Array.isArray(data) ? data : data.data))
                                                            .catch(() => setEntidades([]));
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
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="block text-xs font-medium text-slate-600">
                                                    Entidad
                                                </label>

                                                <button
                                                    onClick={() => {
                                                        if (!formData.entidadId) setShowNewEntidadModal(true);
                                                        else setShowEditEntidadModal(true);
                                                    }}
                                                    className={`p-2 rounded-xl text-white transition
                        ${formData.entidadId ? "bg-amber-500 hover:bg-amber-600" : "bg-indigo-600 hover:bg-indigo-700"}
                    `}
                                                    aria-label={formData.entidadId ? "Editar entidad" : "Nueva entidad"}
                                                >
                                                    {formData.entidadId ? <EditOutlined /> : <PlusOutlined />}
                                                </button>
                                            </div>

                                            <select
                                                value={formData.entidadId}
                                                onChange={(e) => {
                                                    const id = e.target.value;
                                                    setFormData({ ...formData, entidadId: id });
                                                }}
                                                disabled={formData.tipoEntidad === "EMPRESA" && !formData.origenEntidad}
                                                className="w-full border border-indigo-200 rounded-xl px-3 py-2 text-sm bg-white"
                                            >
                                                <option value="">
                                                    {formData.tipoEntidad === "EMPRESA" && !formData.origenEntidad
                                                        ? "Seleccione origen primero…"
                                                        : entidades.length === 0
                                                            ? "No hay entidades disponibles"
                                                            : "Seleccionar entidad…"}
                                                </option>

                                                {entidades.map((ent) => (
                                                    <option key={ent.id} value={ent.id}>
                                                        {ent.nombre}
                                                    </option>
                                                ))}
                                            </select>
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
                                                placeholder="Marca, modelo, serie..."
                                                value={busquedaEquipo}
                                                onChange={(e) => setBusquedaEquipo(e.target.value)}
                                                className="w-full border border-emerald-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-400"
                                                disabled={!formData.entidadId}
                                            />
                                            {!formData.entidadId && (
                                                <p className="text-xs text-amber-600 mt-1">
                                                    Primero seleccione una empresa para cargar los equipos
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <label className="block text-xs font-medium text-slate-600">Equipo</label>
                                            <button
                                                onClick={() => {
                                                    if (!formData.equipoId) setShowNuevoEquipoModal(true);
                                                    else setShowEditEquipoModal(true);
                                                }}
                                                disabled={!formData.entidadId}
                                                className={`p-2 rounded-xl text-white transition-all duration-200 ${!formData.entidadId
                                                    ? "bg-gray-400 cursor-not-allowed"
                                                    : formData.equipoId
                                                        ? "bg-amber-500 hover:bg-amber-600"
                                                        : "bg-emerald-600 hover:bg-emerald-700"
                                                    }`}
                                                title={formData.equipoId ? "Editar equipo" : "Nuevo equipo"}
                                                aria-label={formData.equipoId ? "Editar equipo" : "Nuevo equipo"}
                                            >
                                                {formData.equipoId ? <EditOutlined /> : <PlusOutlined />}
                                            </button>
                                        </div>

                                        <select
                                            value={formData.equipoId}
                                            onChange={(e) => setFormData({ ...formData, equipoId: e.target.value })}
                                            disabled={!formData.entidadId || equiposFiltrados.length === 0}
                                            className="w-full border border-emerald-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-400"
                                        >
                                            <option value="">
                                                {!formData.entidadId
                                                    ? "Seleccione una empresa primero"
                                                    : equiposFiltrados.length === 0
                                                        ? "No hay equipos disponibles para esta empresa"
                                                        : "Seleccionar equipo..."}
                                            </option>
                                            {equiposFiltrados.map((eq) => (
                                                <option key={eq.id} value={eq.id}>
                                                    {eq.marca} {eq.modelo}
                                                    {eq.serie && ` • Serie: ${eq.serie}`}
                                                    {eq.tipo && ` • Tipo: ${eq.tipo}`}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-cyan-100 px-6 py-4 bg-slate-50 rounded-b-3xl">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                        <p className="text-xs text-slate-500 text-center sm:text-left">
                            Los campos marcados con <span className="text-rose-500">*</span> son obligatorios
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleClose}
                                className="px-6 py-2.5 rounded-xl bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-all duration-200 font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={onSubmit}
                                disabled={loading || !formData.tipoTrabajo.trim() || !formData.entidadId || !formData.equipoId}
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

/* ===== Interfaces para modales auxiliares ===== */
interface ModalNuevaEntidadProps {
    tipoEntidad: "EMPRESA" | "PERSONA";
    onClose: () => void;
    onSaved: (nuevoId: number) => void;
}

interface ModalNuevoEquipoProps {
    entidadId: string;
    onClose: () => void;
    onSaved: (nuevoId: number) => void;
}

/* Nueva Entidad */
const ModalNuevaEntidad: React.FC<ModalNuevaEntidadProps> = ({ onClose, onSaved, tipoEntidad }) => {
    const [nombre, setNombre] = useState("");
    const [rut, setRut] = useState("");
    const [correo, setCorreo] = useState("");
    const [telefono, setTelefono] = useState("");
    const [direccion, setDireccion] = useState("");
    const [origen, setOrigen] = useState<OrigenGestioo>("RIDS");
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!nombre.trim()) {
            alert("El nombre es obligatorio");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/entidades`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    nombre,
                    rut: rut || null,
                    correo: correo || null,
                    telefono: telefono || null,
                    direccion: direccion || null,
                    tipo: tipoEntidad,
                    origen: origen
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Error al crear entidad");
            }

            const data = await res.json();
            onSaved(data.id ?? data.id_entidad ?? 0);
            onClose();
        } catch (err) {
            alert((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-xl"
            >
                {/* Header */}
                <div className="border-b px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">
                        Nueva Entidad ({tipoEntidad === "EMPRESA" ? "Empresa" : "Persona"})
                    </h2>

                    <button
                        onClick={onClose}
                        className="text-slate-500 hover:text-slate-700 text-xl"
                    >
                        ✕
                    </button>
                </div>

                {/* Formulario */}
                <div className="p-6 space-y-5">

                    {/* Nombre */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                            Nombre <span className="text-rose-500">*</span>
                        </label>
                        <input
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-cyan-400"
                            placeholder="Nombre de la entidad"
                            required
                        />
                    </div>

                    {/* Grid 2 columnas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                        {/* RUT */}
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">RUT</label>
                            <input
                                value={rut}
                                onChange={(e) => setRut(e.target.value)}
                                className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-cyan-400"
                                placeholder="RUT"
                            />
                        </div>

                        {/* Teléfono */}
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Teléfono</label>
                            <input
                                value={telefono}
                                onChange={(e) => setTelefono(e.target.value)}
                                className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-cyan-400"
                                placeholder="Ej: +56 9 9876 5432"
                            />
                        </div>

                        {/* Correo */}
                        <div>
                            <label className="block text-sm font-medium text-slate-600 mb-1">Correo</label>
                            <input
                                value={correo}
                                onChange={(e) => setCorreo(e.target.value)}
                                className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-cyan-400"
                                placeholder="email@empresa.cl"
                            />
                        </div>

                        {/* Origen (solo empresa) */}
                        {tipoEntidad === "EMPRESA" && (
                            <div>
                                <label className="block text-sm font-medium text-slate-600 mb-1">
                                    Origen
                                </label>
                                <select
                                    value={origen}
                                    onChange={(e) => setOrigen(e.target.value as OrigenGestioo)}
                                    className="w-full border border-slate-300 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-cyan-400"
                                >
                                    <option value="RIDS">RIDS</option>
                                    <option value="ECONNET">ECONNET</option>
                                    <option value="OTRO">OTRO</option>
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Dirección */}
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                            Dirección
                        </label>
                        <input
                            value={direccion}
                            onChange={(e) => setDireccion(e.target.value)}
                            className="w-full border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-cyan-400"
                            placeholder="Dirección completa"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t px-6 py-4 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100"
                    >
                        Cancelar
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className={`px-4 py-2 rounded-xl text-white font-medium transition
                        ${loading ? "bg-cyan-400" : "bg-cyan-600 hover:bg-cyan-700"}
                    `}
                    >
                        {loading ? "Guardando..." : "Guardar Entidad"}
                    </button>
                </div>
            </motion.div>
        </div>
    );

};

/* Editar Entidad */
const ModalEditarEntidad: React.FC<{ entidadId: string; onClose: () => void; onSaved: () => void }> = ({ entidadId, onClose, onSaved }) => {
    const [loading, setLoading] = useState(false);
    const [cargandoDatos, setCargandoDatos] = useState(true);

    const [nombre, setNombre] = useState("");
    const [rut, setRut] = useState("");
    const [correo, setCorreo] = useState("");
    const [telefono, setTelefono] = useState("");
    const [direccion, setDireccion] = useState("");
    const [origen, setOrigen] = useState<OrigenGestioo>("RIDS");

    useEffect(() => {
        const cargar = async () => {
            if (!entidadId) return;
            setCargandoDatos(true);
            try {
                const res = await fetch(`${API_URL}/entidades/${entidadId}`, { credentials: "include" });
                if (!res.ok) throw new Error("Error al cargar la entidad");

                const data = await res.json();
                const entidad = data.data ?? data;

                setNombre(entidad.nombre ?? "");
                setRut(entidad.rut ?? "");
                setCorreo(entidad.correo ?? "");
                setTelefono(entidad.telefono ?? "");
                setDireccion(entidad.direccion ?? "");
                setOrigen(entidad.origen ?? "RIDS");
            } catch (err) {
                console.error("Error cargando entidad:", err);
                alert("Error al cargar la entidad.");
            } finally {
                setCargandoDatos(false);
            }
        };
        cargar();
    }, [entidadId]);

    const handleSave = async () => {
        if (!nombre.trim()) {
            alert("El nombre es obligatorio");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/entidades/${entidadId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    nombre,
                    rut: rut || null,
                    correo: correo || null,
                    telefono: telefono || null,
                    direccion: direccion || null,
                    origen: origen
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Error al actualizar la entidad");
            }

            onSaved();
            onClose();
        } catch (err) {
            console.error(err);
            alert("Error al actualizar la entidad");
        } finally {
            setLoading(false);
        }
    };

    if (cargandoDatos) {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md text-center">
                    <p className="text-slate-600 text-sm">Cargando datos de la entidad...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-800 mb-6">Editar Entidad</h3>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl"
                        aria-label="Cerrar modal"
                    >
                        ✕
                    </button>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Nombre <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={nombre}
                                onChange={(e) => setNombre(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                                placeholder="Nombre de la entidad"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">RUT</label>
                            <input
                                type="text"
                                value={rut}
                                onChange={(e) => setRut(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                                placeholder="RUT (opcional)"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Correo</label>
                            <input
                                type="email"
                                value={correo}
                                onChange={(e) => setCorreo(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                                placeholder="Correo electrónico"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Teléfono</label>
                            <input
                                type="text"
                                value={telefono}
                                onChange={(e) => setTelefono(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                                placeholder="Número de teléfono"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Dirección</label>
                            <textarea
                                value={direccion}
                                onChange={(e) => setDireccion(e.target.value)}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 resize-none"
                                placeholder="Dirección completa"
                                rows={3}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Origen</label>
                            <select
                                value={origen}
                                onChange={(e) => setOrigen(e.target.value as OrigenGestioo)}
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                            >
                                <option value="RIDS">RIDS</option>
                                <option value="ECONNET">ECONNET</option>
                                <option value="OTRO">OTRO</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-all duration-200 font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading || !nombre.trim()}
                            className={`px-6 py-2.5 rounded-xl text-white font-medium transition-all duration-200 ${loading
                                ? "bg-cyan-400 cursor-not-allowed"
                                : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-lg hover:shadow-xl"
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Guardando...
                                </span>
                            ) : (
                                "Guardar cambios"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* Nuevo Equipo */
const ModalNuevoEquipo: React.FC<ModalNuevoEquipoProps> = ({ entidadId, onClose, onSaved }) => {
    const [marca, setMarca] = useState("");
    const [modelo, setModelo] = useState("");
    const [serie, setSerie] = useState("");
    const [tipo, setTipo] = useState("");
    const [estado, setEstado] = useState("operativo");
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!marca.trim() || !modelo.trim()) {
            alert("La marca y modelo son obligatorios");
            return;
        }

        if (!entidadId) {
            alert("No hay empresa seleccionada");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/equipos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    marca,
                    modelo,
                    serie: serie || null,
                    tipo: tipo || null,
                    estado: estado || "operativo",
                    // Asociar a un solicitante de la empresa
                    // En una implementación real, necesitarías seleccionar un solicitante
                    // o usar uno por defecto
                    solicitanteId: null, // Deberías obtener o crear un solicitante para la empresa
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Error al crear equipo");
            }

            const data = await res.json();
            onSaved(data.id ?? 0);
            onClose();
        } catch (err) {
            alert((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative">
                <div className="p-6">
                    <h3 className="text-xl font-bold text-slate-800 mb-6">Nuevo Equipo</h3>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl"
                        aria-label="Cerrar modal"
                    >
                        ✕
                    </button>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Marca <span className="text-rose-500">*</span>
                            </label>
                            <input
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                                placeholder="Ej: HP, Dell, Lenovo"
                                required
                                value={marca}
                                onChange={(e) => setMarca(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Modelo <span className="text-rose-500">*</span>
                            </label>
                            <input
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                                placeholder="Modelo del equipo"
                                required
                                value={modelo}
                                onChange={(e) => setModelo(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Número de Serie</label>
                            <input
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                                placeholder="Serie del equipo (opcional)"
                                value={serie}
                                onChange={(e) => setSerie(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo de Equipo</label>
                            <input
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                                placeholder="Ej: Computador, Impresora, Servidor"
                                value={tipo}
                                onChange={(e) => setTipo(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Estado</label>
                            <select
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-white focus:ring-2 focus:ring-cyan-400"
                                value={estado}
                                onChange={(e) => setEstado(e.target.value)}
                            >
                                <option value="operativo">Operativo</option>
                                <option value="en reparacion">En reparación</option>
                                <option value="dado de baja">Dado de baja</option>
                                <option value="reserva">En reserva</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-all duration-200 font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading || !marca.trim() || !modelo.trim()}
                            className={`px-6 py-2.5 rounded-xl text-white font-medium transition-all duration-200 ${loading
                                ? "bg-cyan-400 cursor-not-allowed"
                                : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-lg hover:shadow-xl"
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Guardando...
                                </span>
                            ) : (
                                "Guardar Equipo"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrdenesTaller;