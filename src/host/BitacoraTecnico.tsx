// src/pages/BitacoraTecnico.tsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../api/api";

import {
    EditOutlined,
    DeleteOutlined,
    ReloadOutlined,
    FileTextOutlined,
    CalendarOutlined,
    UserOutlined,
    PlusOutlined,
    EyeOutlined,
} from "@ant-design/icons";

import {
    DatePicker,
    Select,
    Input,
    Button,
    Tooltip,
    Popconfirm,
    Modal,
} from "antd";

import dayjs from "dayjs";
import "dayjs/locale/es";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale("es");

const CHILE_TZ = "America/Santiago";

/* =====================================================
   TYPES
===================================================== */

type TipoBitacoraTecnico =
    | "SOPORTE"
    | "TERRENO"
    | "REMOTO"
    | "TALLER"
    | "INTERNO"
    | "ADMINISTRATIVO"
    | "REUNION"
    | "OTRO";

type EstadoBitacoraTecnico = "REGISTRADA" | "REVISADA" | "ANULADA";

type UiMessageType = "success" | "error" | "warning" | "info";

type TipoRelacionOpcional =
    | ""
    | "solicitantes"
    | "tickets"
    | "trabajos"
    | "visitas"
    | "mantenciones"
    | "equipos"
    | "cotizaciones";

type RelacionKey = Exclude<TipoRelacionOpcional, "">;

type FormRelacionKey =
    | "solicitanteId"
    | "ticketId"
    | "trabajoId"
    | "visitaId"
    | "mantencionId"
    | "equipoId"
    | "cotizacionId";

interface RelacionConfig {
    tipo: RelacionKey;
    label: string;
    formKey: FormRelacionKey;
}

type VistaBitacora = "resumen-diario";

interface UiMessage {
    type: UiMessageType;
    text: string;
}

interface FormErrors {
    tecnicoId?: string;
    descripcion?: string;
    empresaId?: string;
    relacion?: string;
}

interface TecnicoOption {
    id_tecnico: number;
    nombre: string;
    email?: string | null;
    rol?: string | null;
}

interface EmpresaOption {
    id_empresa: number;
    nombre: string;
}

interface OpcionRelacion {
    id: number;
    label: string;
    raw: unknown;
}

interface BitacoraTecnico {
    id: number;
    fecha: string;
    titulo?: string | null;
    descripcion: string;
    tipoActividad: TipoBitacoraTecnico;
    estado: EstadoBitacoraTecnico;

    tecnicoId: number;
    empresaId?: number | null;
    solicitanteId?: number | null;
    ticketId?: number | null;
    trabajoId?: number | null;
    visitaId?: number | null;
    mantencionId?: number | null;
    equipoId?: number | null;
    cotizacionId?: number | null;

    createdAt: string;
    updatedAt: string;

    tecnico?: {
        id_tecnico: number;
        nombre: string;
        email?: string | null;
        rol?: string | null;
    } | null;

    empresa?: {
        id_empresa: number;
        nombre: string;
    } | null;

    solicitante?: {
        id_solicitante: number;
        nombre: string;
        email?: string | null;
    } | null;

    ticket?: {
        id: number;
        publicId: string;
        subject: string;
        status: string;
    } | null;

    trabajo?: {
        id: number;
        numeroOrden?: string | null;
        tipoTrabajo: string;
        estado?: string | null;
        area?: string | null;
        destinoEquipo?: string | null;
    } | null;

    visita?: {
        id_visita: number;
        inicio: string;
        fin?: string | null;
        status: string;
    } | null;

    mantencion?: {
        id_mantencion: number;
        inicio: string;
        fin?: string | null;
        status: string;
    } | null;

    equipo?: {
        id_equipo: number;
        serial?: string | null;
        marca: string;
        modelo: string;
        tipo: string;
    } | null;

    cotizacion?: {
        id: number;
        fecha: string;
        estado: string;
        total: number;
    } | null;
}

interface CrearBitacoraTecnicoPayload {
    fecha?: string;
    titulo?: string;
    descripcion: string;
    tipoActividad?: TipoBitacoraTecnico;

    tecnicoId: number;
    empresaId?: number | null;
    solicitanteId?: number | null;
    ticketId?: number | null;
    trabajoId?: number | null;
    visitaId?: number | null;
    mantencionId?: number | null;
    equipoId?: number | null;
    cotizacionId?: number | null;
}

interface ActualizarBitacoraTecnicoPayload extends CrearBitacoraTecnicoPayload {
    estado?: EstadoBitacoraTecnico;
}

interface FiltrosBitacoraTecnico {
    fecha?: string;
    desde?: string;
    hasta?: string;
    tecnicoId?: number;
    empresaId?: number;
    solicitanteId?: number;
    ticketId?: number;
    trabajoId?: number;
    visitaId?: number;
    mantencionId?: number;
    equipoId?: number;
    cotizacionId?: number;
    tipoActividad?: TipoBitacoraTecnico;
    estado?: EstadoBitacoraTecnico;
    search?: string;
}

/* =====================================================
   API LOCAL
===================================================== */

function buildQuery(params?: FiltrosBitacoraTecnico) {
    const query = new URLSearchParams();

    if (!params) return "";

    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== "") {
            query.set(key, String(value));
        }
    });

    const queryString = query.toString();

    return queryString ? `?${queryString}` : "";
}

async function obtenerBitacorasTecnico(
    params?: FiltrosBitacoraTecnico
): Promise<{ data: BitacoraTecnico[] }> {
    const res = await api.get(`/bitacora-tecnico${buildQuery(params)}`, {
        headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
        },
    });

    return res.data;
}

async function crearBitacoraTecnico(
    payload: CrearBitacoraTecnicoPayload
): Promise<{ data: BitacoraTecnico }> {
    const res = await api.post("/bitacora-tecnico", payload);
    return res.data;
}

async function actualizarBitacoraTecnico(
    id: number,
    payload: ActualizarBitacoraTecnicoPayload
): Promise<{ data: BitacoraTecnico }> {
    const res = await api.put(`/bitacora-tecnico/${id}`, payload);
    return res.data;
}

async function eliminarBitacoraTecnico(id: number): Promise<{ message: string }> {
    const res = await api.delete(`/bitacora-tecnico/${id}`);
    return res.data;
}

/* =====================================================
   CONSTANTES Y HELPERS
===================================================== */

const tiposActividad: TipoBitacoraTecnico[] = [
    "SOPORTE",
    "TERRENO",
    "REMOTO",
    "TALLER",
    "INTERNO",
    "ADMINISTRATIVO",
    "REUNION",
    "OTRO",
];

const estados: EstadoBitacoraTecnico[] = [
    "REGISTRADA",
    "REVISADA",
    "ANULADA",
];

const labelBase =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600";

const cardBase = "rounded-2xl border border-slate-200 bg-white shadow-sm";

function todayInputDate() {
    return dayjs().tz(CHILE_TZ).format("YYYY-MM-DD");
}

function formatFechaChile(value: string) {
    if (!value) return "-";

    const date = dayjs(value);

    if (!date.isValid()) return "-";

    return new Intl.DateTimeFormat("es-CL", {
        timeZone: CHILE_TZ,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour12: false,
    }).format(date.toDate());
}

function formatHoraChile(value: string) {
    if (!value) return "-";

    const date = dayjs(value);

    if (!date.isValid()) return "-";

    return new Intl.DateTimeFormat("es-CL", {
        timeZone: CHILE_TZ,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(date.toDate());
}

function formatFechaHoraChile(value: string) {
    if (!value) return "-";

    const date = dayjs(value);

    if (!date.isValid()) return "-";

    return new Intl.DateTimeFormat("es-CL", {
        timeZone: CHILE_TZ,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(date.toDate());
}

function traducirEstadoTicket(status?: string | null) {
    const estado = String(status ?? "").toUpperCase();

    const estados: Record<string, string> = {
        NEW: "Nuevo",
        OPEN: "Abierto",
        PENDING: "Pendiente",
        CLOSED: "Cerrado",
    };

    return estados[estado] ?? status ?? "-";
}

function normalizarBusqueda(value?: string | number | null) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function incluyeBusqueda(texto: unknown, busqueda: unknown) {
    const textoNormalizado = normalizarBusqueda(String(texto ?? ""));
    const busquedaNormalizada = normalizarBusqueda(String(busqueda ?? ""));

    if (!busquedaNormalizada) return true;

    const palabras = busquedaNormalizada
        .split(/\s+/)
        .filter(Boolean);

    return palabras.every((palabra) => textoNormalizado.includes(palabra));
}

function toNumberOrNull(value: string): number | null {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : null;
}

function getAxiosErrorMessage(error: unknown) {
    const err = error as {
        response?: {
            data?: {
                error?: string;
                message?: string;
            };
        };
        message?: string;
    };

    return (
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Ocurrió un error inesperado"
    );
}

function FieldError({ message }: { message?: string }) {
    if (!message) return null;

    return <p className="mt-1 text-xs font-medium text-red-600">{message}</p>;
}

function mapRelacionOption(
    tipo: TipoRelacionOpcional,
    item: any
): OpcionRelacion | null {
    if (!tipo) return null;

    switch (tipo) {
        case "solicitantes":
            return {
                id: item.id_solicitante,
                label: `${item.nombre}${item.email ? ` - ${item.email}` : ""}`,
                raw: item,
            };

        case "tickets":
            return {
                id: item.id,
                label: `Ticket #${item.id} - ${item.subject} - ${traducirEstadoTicket(item.status)}`,
                raw: item,
            };

        case "trabajos":
            return {
                id: item.id,
                label: `${item.numeroOrden ?? `Orden #${item.id}`} - ${item.tipoTrabajo ?? "Trabajo"} - ${item.area ?? ""} - ${item.destinoEquipo ?? ""} `,
                raw: item,
            };

        case "visitas":
            return {
                id: item.id_visita,
                label: `Visita #${item.id_visita} - ${new Date(item.inicio).toLocaleString("es-CL")} - ${item.status}`,
                raw: item,
            };

        case "mantenciones":
            return {
                id: item.id_mantencion,
                label: `Mantención #${item.id_mantencion} - ${item.deviceNombre ?? item.solicitante ?? "Sin dispositivo"} - ${item.status}`,
                raw: item,
            };

        case "equipos":
            return {
                id: item.id_equipo,
                label: `${item.marca ?? ""} ${item.modelo ?? ""}${item.serial ? ` - ${item.serial}` : ""} - ${item.estado ?? ""}`,
                raw: item,
            };

        case "cotizaciones":
            return {
                id: item.id,
                label: `Cotización #${item.id} - ${item.estado} - $${Number(item.total ?? 0).toLocaleString("es-CL")}`,
                raw: item,
            };

        default:
            return null;
    }
}

const RELACIONES_CONFIG: RelacionConfig[] = [
    {
        tipo: "solicitantes",
        label: "Solicitante",
        formKey: "solicitanteId",
    },
    {
        tipo: "tickets",
        label: "Ticket",
        formKey: "ticketId",
    },
    {
        tipo: "trabajos",
        label: "Trabajo / Orden de taller",
        formKey: "trabajoId",
    },
    {
        tipo: "visitas",
        label: "Visita",
        formKey: "visitaId",
    },
    {
        tipo: "mantenciones",
        label: "Mantención remota",
        formKey: "mantencionId",
    },
    {
        tipo: "equipos",
        label: "Equipo",
        formKey: "equipoId",
    },
    {
        tipo: "cotizaciones",
        label: "Cotización",
        formKey: "cotizacionId",
    },
];

/* =====================================================
   COMPONENTE
===================================================== */

export default function BitacoraTecnicoPage() {
    const [bitacoras, setBitacoras] = useState<BitacoraTecnico[]>([]);
    const [tecnicos, setTecnicos] = useState<TecnicoOption[]>([]);
    const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadingRelacion, setLoadingRelacion] = useState(false);

    const [editId, setEditId] = useState<number | null>(null);
    const [modalBitacoraOpen, setModalBitacoraOpen] = useState(false);

    const [opcionesPorRelacion, setOpcionesPorRelacion] = useState<
        Partial<Record<RelacionKey, OpcionRelacion[]>>
    >({});

    const [loadingPorRelacion, setLoadingPorRelacion] = useState<
        Partial<Record<RelacionKey, boolean>>
    >({});

    const [uiMessage, setUiMessage] = useState<UiMessage | null>(null);
    const [formErrors, setFormErrors] = useState<FormErrors>({});

    const [modalVisualizarOpen, setModalVisualizarOpen] = useState(false);
    const [bitacoraSeleccionada, setBitacoraSeleccionada] =
        useState<BitacoraTecnico | null>(null);

    const [vistaActiva, setVistaActiva] = useState<VistaBitacora>("resumen-diario");

    const [filtros, setFiltros] = useState({
        fecha: todayInputDate(),
        search: "",
        tecnicoId: "",
        empresaId: "",
        tipoActividad: "",
        estado: "",
    });

    const [form, setForm] = useState({
        fecha: todayInputDate(),
        titulo: "",
        descripcion: "",
        tipoActividad: "SOPORTE" as TipoBitacoraTecnico,
        estado: "REGISTRADA" as EstadoBitacoraTecnico,
        tecnicoId: "",
        empresaId: "",
        solicitanteId: "",
        ticketId: "",
        trabajoId: "",
        visitaId: "",
        mantencionId: "",
        equipoId: "",
        cotizacionId: "",
    });

    const tituloFormulario = useMemo(() => {
        return editId ? "Editar bitácora" : "Nueva bitácora";
    }, [editId]);

    const tabActivo =
        "rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition";

    const tabInactivo =
        "rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100";

    const resumenPorTipo = useMemo(() => {
        return bitacoras.reduce<Record<string, number>>((acc, item) => {
            acc[item.tipoActividad] = (acc[item.tipoActividad] ?? 0) + 1;
            return acc;
        }, {});
    }, [bitacoras]);

    const resumenPorTecnico = useMemo(() => {
        return bitacoras.reduce<Record<string, number>>((acc, item) => {
            const nombre = item.tecnico?.nombre ?? "Sin técnico";
            acc[nombre] = (acc[nombre] ?? 0) + 1;
            return acc;
        }, {});
    }, [bitacoras]);

    const tipoMasFrecuente = useMemo(() => {
        return Object.entries(resumenPorTipo).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "-";
    }, [resumenPorTipo]);

    function showMessage(type: UiMessageType, text: string) {
        setUiMessage({ type, text });

        window.setTimeout(() => {
            setUiMessage(null);
        }, 5000);
    }

    function validateForm() {
        const errors: FormErrors = {};

        if (!form.tecnicoId) {
            errors.tecnicoId = "Debes seleccionar un técnico.";
        }

        if (!form.descripcion.trim()) {
            errors.descripcion = "La descripción es obligatoria.";
        }

        setFormErrors(errors);

        return Object.keys(errors).length === 0;
    }

    function resetForm() {
        setEditId(null);
        setFormErrors({});
        setOpcionesPorRelacion({});
        setLoadingPorRelacion({});

        setForm({
            fecha: todayInputDate(),
            titulo: "",
            descripcion: "",
            tipoActividad: "SOPORTE",
            estado: "REGISTRADA",
            tecnicoId: "",
            empresaId: "",
            solicitanteId: "",
            ticketId: "",
            trabajoId: "",
            visitaId: "",
            mantencionId: "",
            equipoId: "",
            cotizacionId: "",
        });
    }

    function cerrarModalBitacora() {
        setModalBitacoraOpen(false);
        resetForm();
    }

    function abrirModalCrear() {
        resetForm();
        setVistaActiva("resumen-diario");
        setModalBitacoraOpen(true);
    }

    function abrirModalVisualizar(bitacora: BitacoraTecnico) {
        setBitacoraSeleccionada(bitacora);
        setModalVisualizarOpen(true);
    }

    function cerrarModalVisualizar() {
        setModalVisualizarOpen(false);
        setBitacoraSeleccionada(null);
    }

    async function cargarTecnicos() {
        try {
            const res = await api.get("/tecnicos");

            const data = Array.isArray(res.data)
                ? res.data
                : Array.isArray(res.data?.data)
                    ? res.data.data
                    : Array.isArray(res.data?.tecnicos)
                        ? res.data.tecnicos
                        : [];

            setTecnicos(data);
        } catch (error) {
            console.error("Error al cargar técnicos:", error);
            setTecnicos([]);
            showMessage("error", "No se pudieron cargar los técnicos.");
        }
    }

    async function cargarEmpresas() {
        try {
            const res = await api.get("/empresas");

            const data = Array.isArray(res.data)
                ? res.data
                : Array.isArray(res.data?.data)
                    ? res.data.data
                    : Array.isArray(res.data?.empresas)
                        ? res.data.empresas
                        : [];

            setEmpresas(data);
        } catch (error) {
            console.error("Error al cargar empresas:", error);
            setEmpresas([]);
            showMessage("error", "No se pudieron cargar las empresas.");
        }
    }

    async function cargarBitacoras() {
        try {
            setLoading(true);

            const resp = await obtenerBitacorasTecnico({
                fecha: filtros.fecha || undefined,
                search: filtros.search || undefined,
                tecnicoId: filtros.tecnicoId ? Number(filtros.tecnicoId) : undefined,
                empresaId: filtros.empresaId ? Number(filtros.empresaId) : undefined,
                tipoActividad: filtros.tipoActividad
                    ? (filtros.tipoActividad as TipoBitacoraTecnico)
                    : undefined,
                estado: filtros.estado
                    ? (filtros.estado as EstadoBitacoraTecnico)
                    : undefined,
            });

            setBitacoras(resp.data ?? []);
        } catch (error) {
            console.error("Error al cargar bitácoras:", error);
            showMessage("error", getAxiosErrorMessage(error));
        } finally {
            setLoading(false);
        }
    }

    async function cargarOpcionesRelacion(
        tipo: RelacionKey,
        empresaIdValue: string
    ) {
        const empresaId = Number(empresaIdValue);

        if (!Number.isInteger(empresaId) || empresaId <= 0) {
            showMessage("warning", "Primero debes seleccionar una empresa.");
            return;
        }

        try {
            setLoadingPorRelacion((prev) => ({
                ...prev,
                [tipo]: true,
            }));

            const res = await api.get("/bitacora-tecnico/opciones-relacion", {
                params: {
                    empresaId,
                    tipo,
                },
            });

            const data = Array.isArray(res.data?.data) ? res.data.data : [];

            const mapped = data
                .map((item: unknown) => mapRelacionOption(tipo, item))
                .filter(Boolean) as OpcionRelacion[];

            setOpcionesPorRelacion((prev) => ({
                ...prev,
                [tipo]: mapped,
            }));
        } catch (error) {
            console.error("Error al cargar opciones de relación:", error);
            showMessage("error", getAxiosErrorMessage(error));

            setOpcionesPorRelacion((prev) => ({
                ...prev,
                [tipo]: [],
            }));
        } finally {
            setLoadingPorRelacion((prev) => ({
                ...prev,
                [tipo]: false,
            }));
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();

        if (!validateForm()) {
            showMessage("error", "Revisa los campos marcados antes de guardar.");
            return;
        }

        const tecnicoId = toNumberOrNull(form.tecnicoId);

        if (!tecnicoId) {
            showMessage("error", "Debes seleccionar un técnico.");
            return;
        }

        try {
            setSaving(true);

            const payload: CrearBitacoraTecnicoPayload = {
                fecha: form.fecha,
                descripcion: form.descripcion.trim(),
                tipoActividad: form.tipoActividad,
                tecnicoId,
                empresaId: toNumberOrNull(form.empresaId),
                solicitanteId: toNumberOrNull(form.solicitanteId),
                ticketId: toNumberOrNull(form.ticketId),
                trabajoId: toNumberOrNull(form.trabajoId),
                visitaId: toNumberOrNull(form.visitaId),
                mantencionId: toNumberOrNull(form.mantencionId),
                equipoId: toNumberOrNull(form.equipoId),
                cotizacionId: toNumberOrNull(form.cotizacionId),
            };

            if (form.titulo.trim()) {
                payload.titulo = form.titulo.trim();
            }

            if (editId) {
                const updatePayload: ActualizarBitacoraTecnicoPayload = {
                    ...payload,
                    estado: form.estado,
                };

                await actualizarBitacoraTecnico(editId, updatePayload);
                showMessage("success", "Bitácora actualizada correctamente.");
            } else {
                await crearBitacoraTecnico(payload);
                showMessage("success", "Bitácora registrada correctamente.");
            }

            setModalBitacoraOpen(false);
            resetForm();
            await cargarBitacoras();
        } catch (error) {
            console.error("Error al guardar bitácora:", error);
            showMessage("error", getAxiosErrorMessage(error));
        } finally {
            setSaving(false);
        }
    }

    function cargarFormularioEditar(bitacora: BitacoraTecnico) {
        setEditId(bitacora.id);

        setForm({
            fecha: bitacora.fecha.slice(0, 10),
            titulo: bitacora.titulo ?? "",
            descripcion: bitacora.descripcion,
            tipoActividad: bitacora.tipoActividad,
            estado: bitacora.estado,
            tecnicoId: String(bitacora.tecnicoId),
            empresaId: bitacora.empresaId ? String(bitacora.empresaId) : "",
            solicitanteId: bitacora.solicitanteId
                ? String(bitacora.solicitanteId)
                : "",
            ticketId: bitacora.ticketId ? String(bitacora.ticketId) : "",
            trabajoId: bitacora.trabajoId ? String(bitacora.trabajoId) : "",
            visitaId: bitacora.visitaId ? String(bitacora.visitaId) : "",
            mantencionId: bitacora.mantencionId ? String(bitacora.mantencionId) : "",
            equipoId: bitacora.equipoId ? String(bitacora.equipoId) : "",
            cotizacionId: bitacora.cotizacionId ? String(bitacora.cotizacionId) : "",
        });

        setFormErrors({});
        setOpcionesPorRelacion({});
        setLoadingPorRelacion({});

        if (bitacora.empresaId) {
            const empresaId = String(bitacora.empresaId);

            const relacionesConValor = RELACIONES_CONFIG.filter((config) => {
                const valor = bitacora[config.formKey as keyof BitacoraTecnico];
                return Boolean(valor);
            });

            relacionesConValor.forEach((config) => {
                cargarOpcionesRelacion(config.tipo, empresaId);
            });
        }
    }

    function abrirModalEditar(bitacora: BitacoraTecnico) {
        cargarFormularioEditar(bitacora);
        setModalBitacoraOpen(true);
    }

    async function handleDelete(id: number) {
        try {
            await eliminarBitacoraTecnico(id);
            showMessage("success", "Bitácora eliminada correctamente.");
            await cargarBitacoras();
        } catch (error) {
            console.error("Error al eliminar bitácora:", error);
            showMessage("error", getAxiosErrorMessage(error));
        }
    }

    function renderRelacionesResumen(bitacora: BitacoraTecnico) {
        const relaciones: string[] = [];

        if (bitacora.solicitante) {
            relaciones.push(`Solicitante: ${bitacora.solicitante.nombre}  ${bitacora.solicitante.email ? `- ${bitacora.solicitante.email}` : ""}`.trim());
        }

        if (bitacora.ticket) {
            relaciones.push(
                `Ticket #${bitacora.ticket.id} - ${traducirEstadoTicket(bitacora.ticket.status)} - ${bitacora.ticket.subject}`.trim()
            );
        }

        if (bitacora.trabajo) {
            relaciones.push(
                `Orden: ${bitacora.trabajo.numeroOrden ?? `#${bitacora.trabajo.id}`}`
            );
        }

        if (bitacora.visita) {
            relaciones.push(`Visita: #${bitacora.visita.id_visita}`);
        }

        if (bitacora.mantencion) {
            relaciones.push(`Mantención: #${bitacora.mantencion.id_mantencion}`);
        }

        if (bitacora.equipo) {
            relaciones.push(
                `Equipo: ${bitacora.equipo.serial ?? ""} ${bitacora.equipo.marca ?? ""} ${bitacora.equipo.modelo ?? ""}`.trim()
            );
        }

        if (bitacora.cotizacion) {
            relaciones.push(`Cotización: #${bitacora.cotizacion.id}`);
        }

        return relaciones;
    }

    function renderRelacionResumen(bitacora: BitacoraTecnico) {
        const relaciones = renderRelacionesResumen(bitacora);

        if (relaciones.length === 0) return "-";

        return relaciones.join(" · ");
    }

    useEffect(() => {
        cargarTecnicos();
        cargarEmpresas();
        cargarBitacoras();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        cargarBitacoras();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        filtros.fecha,
        filtros.search,
        filtros.tecnicoId,
        filtros.empresaId,
        filtros.tipoActividad,
        filtros.estado,
    ]);

    function renderRelacionSelect(config: RelacionConfig) {
        const opciones = opcionesPorRelacion[config.tipo] ?? [];
        const loading = Boolean(loadingPorRelacion[config.tipo]);
        const value = form[config.formKey] || undefined;
        const empresaSeleccionada = Boolean(form.empresaId);

        return (
            <div key={config.tipo}>
                <label className={labelBase}>{config.label}</label>

                <Select
                    value={value}
                    disabled={!empresaSeleccionada}
                    loading={loading}
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    filterOption={(input, option) => incluyeBusqueda(option?.label, input)}
                    placeholder={
                        !empresaSeleccionada
                            ? "Selecciona empresa primero"
                            : loading
                                ? "Cargando..."
                                : `Seleccionar ${config.label.toLowerCase()}`
                    }
                    className="w-full"
                    options={opciones.map((opcion) => ({
                        value: String(opcion.id),
                        label: opcion.label,
                    }))}
                    onDropdownVisibleChange={(open) => {
                        if (
                            open &&
                            empresaSeleccionada &&
                            !loading &&
                            opciones.length === 0
                        ) {
                            cargarOpcionesRelacion(config.tipo, form.empresaId);
                        }
                    }}
                    onFocus={() => {
                        if (
                            empresaSeleccionada &&
                            !loading &&
                            opciones.length === 0
                        ) {
                            cargarOpcionesRelacion(config.tipo, form.empresaId);
                        }
                    }}
                    onChange={(selectedValue) => {
                        setForm((prev) => ({
                            ...prev,
                            [config.formKey]: selectedValue ? String(selectedValue) : "",
                        }));

                        setFormErrors((prev) => ({
                            ...prev,
                            relacion: undefined,
                        }));
                    }}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 px-3 py-4 sm:px-5 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <header className="overflow-hidden rounded-3xl border border-cyan-200 bg-cyan-50/60 shadow-sm">
                    <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-cyan-300 bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800">
                                    Registro técnico
                                </span>

                                <span className="rounded-full border border-indigo-200 bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                                    Bitácora diaria
                                </span>
                            </div>

                            <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                                Bitácora técnica
                            </h1>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                                Registro diario de actividades realizadas por los técnicos, con relación
                                opcional a empresas, tickets, equipos, cotizaciones, visitas y trabajos.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap lg:justify-end">
                            <div className="rounded-2xl border border-cyan-200 bg-white px-4 py-3 shadow-sm">
                                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-cyan-700">
                                    <FileTextOutlined />
                                    Registros
                                </div>
                                <div className="mt-1 text-lg font-black text-slate-950">
                                    {bitacoras.length}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-cyan-200 bg-white px-4 py-3 shadow-sm">
                                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-cyan-700">
                                    <CalendarOutlined />
                                    Periodo
                                </div>
                                <div className="mt-1 text-sm font-black text-slate-950">
                                    {filtros.fecha
                                        ? dayjs.tz(filtros.fecha, CHILE_TZ).format("DD MMM YYYY")
                                        : "Todos"}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-cyan-200 bg-white/80 px-4 py-3 sm:px-6">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={abrirModalCrear}
                                    className={tabInactivo}
                                >
                                    <PlusOutlined className="mr-1" />
                                    Nueva bitácora
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setVistaActiva("resumen-diario")}
                                    className={vistaActiva === "resumen-diario" ? tabActivo : tabInactivo}
                                >
                                    Listado diario
                                </button>
                            </div>

                            <p className="text-xs text-slate-500">
                                Selecciona filtros, registra actividades y consulta el historial técnico.
                            </p>
                        </div>
                    </div>
                </header>

                {uiMessage && (
                    <div
                        className={[
                            "rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm",
                            uiMessage.type === "success"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : uiMessage.type === "error"
                                    ? "border-red-200 bg-red-50 text-red-800"
                                    : uiMessage.type === "warning"
                                        ? "border-amber-200 bg-amber-50 text-amber-800"
                                        : "border-blue-200 bg-blue-50 text-blue-800",
                        ].join(" ")}
                    >
                        {uiMessage.text}
                    </div>
                )}

                <Modal
                    open={modalBitacoraOpen}
                    onCancel={cerrarModalBitacora}
                    footer={null}
                    width={980}
                    destroyOnClose
                    title={
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">
                                {tituloFormulario}
                            </h2>
                            <p className="mt-1 text-sm font-normal text-slate-500">
                                Completa los datos principales y, si aplica, relaciona la actividad
                                con una empresa, ticket, equipo u orden.
                            </p>
                        </div>
                    }
                >
                    <form onSubmit={handleSubmit} className="mt-4 space-y-5">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            <div>
                                <label className={labelBase}>Fecha</label>
                                <DatePicker
                                    value={form.fecha ? dayjs.tz(form.fecha, CHILE_TZ) : null}
                                    onChange={(date) => {
                                        setForm((prev) => ({
                                            ...prev,
                                            fecha: date ? date.tz(CHILE_TZ).format("YYYY-MM-DD") : "",
                                        }));
                                    }}
                                    format="DD/MM/YYYY"
                                    placeholder="Selecciona fecha"
                                    className="w-full rounded-xl"
                                />
                            </div>

                            <div>
                                <label className={labelBase}>Técnico</label>
                                <Select
                                    value={form.tecnicoId || undefined}
                                    onChange={(value) => {
                                        setForm((prev) => ({
                                            ...prev,
                                            tecnicoId: String(value),
                                        }));

                                        setFormErrors((prev) => ({
                                            ...prev,
                                            tecnicoId: undefined,
                                        }));
                                    }}
                                    placeholder="Seleccione técnico"
                                    showSearch
                                    optionFilterProp="label"
                                    filterOption={(input, option) => incluyeBusqueda(option?.label, input)}
                                    className="w-full"
                                    status={formErrors.tecnicoId ? "error" : undefined}
                                    options={tecnicos.map((tecnico) => ({
                                        value: String(tecnico.id_tecnico),
                                        label: tecnico.nombre,
                                    }))}
                                />
                                <FieldError message={formErrors.tecnicoId} />
                            </div>

                            <div>
                                <label className={labelBase}>Empresa</label>
                                <Select
                                    value={form.empresaId || undefined}
                                    onChange={(value) => {
                                        const empresaId = value ? String(value) : "";

                                        setForm((prev) => ({
                                            ...prev,
                                            empresaId,
                                            solicitanteId: "",
                                            ticketId: "",
                                            trabajoId: "",
                                            visitaId: "",
                                            mantencionId: "",
                                            equipoId: "",
                                            cotizacionId: "",
                                        }));

                                        setOpcionesPorRelacion({});
                                        setLoadingPorRelacion({});

                                        setFormErrors((prev) => ({
                                            ...prev,
                                            empresaId: undefined,
                                            relacion: undefined,
                                        }));
                                    }}
                                    allowClear
                                    placeholder="Sin empresa"
                                    showSearch
                                    optionFilterProp="label"
                                    filterOption={(input, option) => incluyeBusqueda(option?.label, input)}
                                    className="w-full"
                                    status={formErrors.empresaId ? "error" : undefined}
                                    options={empresas.map((empresa) => ({
                                        value: String(empresa.id_empresa),
                                        label: empresa.nombre,
                                    }))}
                                />
                                <FieldError message={formErrors.empresaId} />
                            </div>

                            <div>
                                <label className={labelBase}>Tipo actividad</label>
                                <Select
                                    value={form.tipoActividad}
                                    onChange={(value) =>
                                        setForm((prev) => ({
                                            ...prev,
                                            tipoActividad: value as TipoBitacoraTecnico,
                                        }))
                                    }
                                    className="w-full"
                                    options={tiposActividad.map((tipo) => ({
                                        value: tipo,
                                        label: tipo,
                                    }))}
                                />
                            </div>
                        </div>

                        {editId && (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <div>
                                    <label className={labelBase}>Estado</label>
                                    <Select
                                        value={form.estado}
                                        onChange={(value) =>
                                            setForm((prev) => ({
                                                ...prev,
                                                estado: value as EstadoBitacoraTecnico,
                                            }))
                                        }
                                        className="w-full"
                                        options={estados.map((estado) => ({
                                            value: estado,
                                            label: estado,
                                        }))}
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className={labelBase}>Título</label>
                            <Input
                                value={form.titulo}
                                onChange={(e) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        titulo: e.target.value,
                                    }))
                                }
                                placeholder="Ej: Soporte remoto cliente RIDS"
                            />
                        </div>

                        <div>
                            <label className={labelBase}>
                                Descripción de lo realizado
                            </label>
                            <Input.TextArea
                                value={form.descripcion}
                                onChange={(e) => {
                                    setForm((prev) => ({
                                        ...prev,
                                        descripcion: e.target.value,
                                    }));

                                    setFormErrors((prev) => ({
                                        ...prev,
                                        descripcion: undefined,
                                    }));
                                }}
                                rows={5}
                                placeholder="Describe lo realizado por el técnico durante el día..."
                                status={formErrors.descripcion ? "error" : undefined}
                            />
                            <div className="mt-1 flex items-center justify-between">
                                <FieldError message={formErrors.descripcion} />
                                <span className="ml-auto text-xs text-slate-400">
                                    {form.descripcion.length} caracteres
                                </span>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-slate-800">
                                    Relaciones opcionales
                                </h3>
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    Puedes asociar una o más relaciones a esta bitácora. Primero selecciona
                                    una empresa y luego elige los registros relacionados que correspondan.
                                </p>
                            </div>

                            {!form.empresaId && (
                                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                                    Para cargar solicitantes, tickets, órdenes, visitas, mantenciones,
                                    equipos o cotizaciones, primero selecciona una empresa.
                                </div>
                            )}

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {RELACIONES_CONFIG.map((config) => renderRelacionSelect(config))}
                            </div>

                            {formErrors.relacion && (
                                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                                    {formErrors.relacion}
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <Button onClick={cerrarModalBitacora}>
                                Cancelar
                            </Button>

                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={saving}
                            >
                                {editId ? "Actualizar bitácora" : "Guardar bitácora"}
                            </Button>
                        </div>
                    </form>
                </Modal>

                <Modal
                    open={modalVisualizarOpen}
                    onCancel={cerrarModalVisualizar}
                    footer={[
                        <Button key="cerrar" onClick={cerrarModalVisualizar}>
                            Cerrar
                        </Button>,
                        bitacoraSeleccionada ? (
                            <Button
                                key="editar"
                                type="primary"
                                icon={<EditOutlined />}
                                onClick={() => {
                                    cerrarModalVisualizar();
                                    abrirModalEditar(bitacoraSeleccionada);
                                }}
                            >
                                Editar
                            </Button>
                        ) : null,
                    ]}
                    width={780}
                    title={
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">
                                Detalle de bitácora
                            </h2>
                            <p className="mt-1 text-sm font-normal text-slate-500">
                                Visualización completa del registro técnico seleccionado.
                            </p>
                        </div>
                    }
                >
                    {bitacoraSeleccionada && (
                        <div className="space-y-5">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Fecha de actividad
                                    </p>
                                    <p className="mt-1 font-semibold text-slate-900">
                                        {formatFechaChile(bitacoraSeleccionada.fecha)}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Creada
                                    </p>
                                    <p className="mt-1 font-semibold text-slate-900">
                                        {formatFechaHoraChile(bitacoraSeleccionada.createdAt)}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Técnico
                                    </p>
                                    <p className="mt-1 font-semibold text-slate-900">
                                        {bitacoraSeleccionada.tecnico?.nombre ?? "-"}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Empresa
                                    </p>
                                    <p className="mt-1 font-semibold text-slate-900">
                                        {bitacoraSeleccionada.empresa?.nombre ?? "-"}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Tipo
                                    </p>
                                    <p className="mt-1 font-semibold text-blue-700">
                                        {bitacoraSeleccionada.tipoActividad}
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Estado
                                    </p>
                                    <p className="mt-1 font-semibold text-slate-900">
                                        {bitacoraSeleccionada.estado}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Título
                                </p>
                                <p className="mt-2 font-semibold text-slate-900">
                                    {bitacoraSeleccionada.titulo || "Sin título"}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Descripción
                                </p>
                                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                    {bitacoraSeleccionada.descripcion}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Relaciones asociadas
                                </p>

                                {renderRelacionesResumen(bitacoraSeleccionada).length > 0 ? (
                                    <div className="mt-3 flex flex-col gap-2">
                                        {renderRelacionesResumen(bitacoraSeleccionada).map((relacion, index) => (
                                            <div
                                                key={`${relacion}-${index}`}
                                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800"
                                            >
                                                {relacion}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="mt-2 text-sm font-semibold text-slate-800">
                                        Sin relaciones asociadas
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </Modal>

                {vistaActiva === "resumen-diario" && (
                    <section className={`${cardBase} p-4 sm:p-6`}>
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">
                                    Listado diario
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Filtra por fecha, técnico, tipo de actividad o texto.
                                </p>
                            </div>

                            <Button
                                onClick={cargarBitacoras}
                                loading={loading}
                            >
                                Actualizar
                            </Button>
                        </div>

                        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Total actividades
                                </p>
                                <p className="mt-2 text-2xl font-black text-slate-900">
                                    {bitacoras.length}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Técnicos con actividad
                                </p>
                                <p className="mt-2 text-2xl font-black text-slate-900">
                                    {Object.keys(resumenPorTecnico).length}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Tipo más frecuente
                                </p>
                                <p className="mt-2 text-lg font-black text-slate-900">
                                    {tipoMasFrecuente}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    Fecha consultada
                                </p>
                                <p className="mt-2 text-lg font-black text-slate-900">
                                    {filtros.fecha
                                        ? dayjs.tz(filtros.fecha, CHILE_TZ).format("DD/MM/YYYY")
                                        : "Todas"}
                                </p>
                            </div>
                        </div>

                        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
                            <div>
                                <label className={labelBase}>Fecha</label>
                                <DatePicker
                                    value={filtros.fecha ? dayjs.tz(filtros.fecha, CHILE_TZ) : null}
                                    onChange={(date) => {
                                        setFiltros((prev) => ({
                                            ...prev,
                                            fecha: date ? date.tz(CHILE_TZ).format("YYYY-MM-DD") : "",
                                        }));
                                    }}
                                    format="DD/MM/YYYY"
                                    placeholder="Filtrar por fecha"
                                    className="w-full rounded-xl"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className={labelBase}>Buscar</label>
                                <Input
                                    value={filtros.search}
                                    onChange={(e) =>
                                        setFiltros((prev) => ({
                                            ...prev,
                                            search: e.target.value,
                                        }))
                                    }
                                    allowClear
                                    placeholder="Buscar por descripción, técnico, empresa, equipo..."
                                />
                            </div>

                            <div>
                                <label className={labelBase}>Técnico</label>
                                <Select
                                    value={filtros.tecnicoId || undefined}
                                    onChange={(value) =>
                                        setFiltros((prev) => ({
                                            ...prev,
                                            tecnicoId: value ? String(value) : "",
                                        }))
                                    }
                                    allowClear
                                    showSearch
                                    optionFilterProp="label"
                                    filterOption={(input, option) => incluyeBusqueda(option?.label, input)}
                                    placeholder="Todos"
                                    className="w-full"
                                    options={tecnicos.map((tecnico) => ({
                                        value: String(tecnico.id_tecnico),
                                        label: tecnico.nombre,
                                    }))}
                                />
                            </div>

                            <div>
                                <label className={labelBase}>Tipo</label>
                                <Select
                                    value={filtros.tipoActividad || undefined}
                                    onChange={(value) =>
                                        setFiltros((prev) => ({
                                            ...prev,
                                            tipoActividad: value ? String(value) : "",
                                        }))
                                    }
                                    allowClear
                                    placeholder="Todos"
                                    className="w-full"
                                    options={tiposActividad.map((tipo) => ({
                                        value: tipo,
                                        label: tipo,
                                    }))}
                                />
                            </div>

                            <div>
                                <label className={labelBase}>Estado</label>
                                <Select
                                    value={filtros.estado || undefined}
                                    onChange={(value) =>
                                        setFiltros((prev) => ({
                                            ...prev,
                                            estado: value ? String(value) : "",
                                        }))
                                    }
                                    allowClear
                                    placeholder="Todos"
                                    className="w-full"
                                    options={estados.map((estado) => ({
                                        value: estado,
                                        label: estado,
                                    }))}
                                />
                            </div>
                        </div>

                        {loading ? (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                                Cargando bitácoras...
                            </div>
                        ) : bitacoras.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                                <p className="font-semibold text-slate-700">
                                    No hay bitácoras registradas
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                    Cambia los filtros o registra una nueva actividad técnica.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-3 lg:hidden">
                                    {bitacoras.map((bitacora) => (
                                        <article
                                            key={bitacora.id}
                                            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-xs font-semibold text-blue-600">
                                                        {bitacora.tipoActividad}
                                                    </p>
                                                    <h3 className="mt-1 font-semibold text-slate-900">
                                                        {bitacora.titulo || "Sin título"}
                                                    </h3>

                                                    <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                                                        <p>
                                                            Actividad: {formatFechaChile(bitacora.fecha)}
                                                        </p>
                                                        <p>
                                                            Creada: {formatHoraChile(bitacora.createdAt)}
                                                        </p>
                                                    </div>
                                                </div>

                                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                                    {bitacora.estado}
                                                </span>
                                            </div>

                                            <p className="mt-3 text-sm leading-6 text-slate-700">
                                                {bitacora.descripcion}
                                            </p>

                                            <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-600">
                                                <div>
                                                    <span className="font-semibold">Técnico:</span>{" "}
                                                    {bitacora.tecnico?.nombre ?? "-"}
                                                </div>

                                                <div>
                                                    <span className="font-semibold">Empresa:</span>{" "}
                                                    {bitacora.empresa?.nombre ?? "-"}
                                                </div>

                                                <div>
                                                    <span className="font-semibold">Relación:</span>{" "}
                                                    {renderRelacionResumen(bitacora)}
                                                </div>

                                                <div>
                                                    <span className="font-semibold">Creación completa:</span>{" "}
                                                    {formatFechaHoraChile(bitacora.createdAt)}
                                                </div>
                                            </div>

                                            <div className="flex justify-end gap-1">
                                                <Tooltip title="Visualizar">
                                                    <Button
                                                        type="text"
                                                        icon={<EyeOutlined />}
                                                        onClick={() => abrirModalVisualizar(bitacora)}
                                                        aria-label="Visualizar bitácora"
                                                    />
                                                </Tooltip>

                                                <Tooltip title="Editar">
                                                    <Button
                                                        type="text"
                                                        icon={<EditOutlined />}
                                                        onClick={() => abrirModalEditar(bitacora)}
                                                        aria-label="Editar bitácora"
                                                    />
                                                </Tooltip>

                                                <Popconfirm
                                                    title="Eliminar bitácora"
                                                    description="¿Seguro que deseas eliminar esta bitácora?"
                                                    okText="Sí"
                                                    cancelText="No"
                                                    onConfirm={() => handleDelete(bitacora.id)}
                                                >
                                                    <Tooltip title="Eliminar">
                                                        <Button
                                                            type="text"
                                                            danger
                                                            icon={<DeleteOutlined />}
                                                            aria-label="Eliminar bitácora"
                                                        />
                                                    </Tooltip>
                                                </Popconfirm>
                                            </div>
                                        </article>
                                    ))}
                                </div>

                                <div className="hidden overflow-hidden rounded-2xl border border-slate-200 lg:block">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                                                        Actividad
                                                    </th>

                                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                                                        Creada
                                                    </th>

                                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                                                        Técnico
                                                    </th>

                                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                                                        Tipo
                                                    </th>

                                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                                                        Detalle
                                                    </th>

                                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                                                        Empresa
                                                    </th>

                                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                                                        Relación
                                                    </th>

                                                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                                                        Estado
                                                    </th>

                                                    <th className="px-4 py-3 text-right font-semibold text-slate-600">
                                                        Acciones
                                                    </th>
                                                </tr>
                                            </thead>

                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {bitacoras.map((bitacora) => (
                                                    <tr
                                                        key={bitacora.id}
                                                        className="hover:bg-slate-50"
                                                    >
                                                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                                                            {formatFechaChile(bitacora.fecha)}
                                                        </td>

                                                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                                                            <Tooltip title={formatFechaHoraChile(bitacora.createdAt)}>
                                                                <span>{formatHoraChile(bitacora.createdAt)}</span>
                                                            </Tooltip>
                                                        </td>

                                                        <td className="px-4 py-3 text-slate-700">
                                                            {bitacora.tecnico?.nombre ?? "-"}
                                                        </td>

                                                        <td className="px-4 py-3">
                                                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                                                {bitacora.tipoActividad}
                                                            </span>
                                                        </td>

                                                        <td className="max-w-md px-4 py-3">
                                                            <div className="font-semibold text-slate-900">
                                                                {bitacora.titulo || "Sin título"}
                                                            </div>

                                                            <div className="line-clamp-2 text-slate-500">
                                                                {bitacora.descripcion}
                                                            </div>
                                                        </td>

                                                        <td className="px-4 py-3 text-slate-700">
                                                            {bitacora.empresa?.nombre ?? "-"}
                                                        </td>

                                                        <td className="px-4 py-3 text-slate-600">
                                                            {renderRelacionResumen(bitacora)}
                                                        </td>

                                                        <td className="px-4 py-3">
                                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                                                {bitacora.estado}
                                                            </span>
                                                        </td>

                                                        <td className="px-4 py-3">
                                                            <div className="flex justify-end gap-2">
                                                                <Tooltip title="Visualizar">
                                                                    <Button
                                                                        icon={<EyeOutlined />}
                                                                        onClick={() => abrirModalVisualizar(bitacora)}
                                                                        aria-label="Visualizar bitácora"
                                                                    />
                                                                </Tooltip>

                                                                <Tooltip title="Editar">
                                                                    <Button
                                                                        icon={<EditOutlined />}
                                                                        onClick={() => abrirModalEditar(bitacora)}
                                                                        aria-label="Editar bitácora"
                                                                    />
                                                                </Tooltip>

                                                                <Popconfirm
                                                                    title="Eliminar bitácora"
                                                                    description="¿Seguro que deseas eliminar esta bitácora?"
                                                                    okText="Sí"
                                                                    cancelText="No"
                                                                    onConfirm={() => handleDelete(bitacora.id)}
                                                                >
                                                                    <Tooltip title="Eliminar">
                                                                        <Button
                                                                            danger
                                                                            icon={<DeleteOutlined />}
                                                                            aria-label="Eliminar bitácora"
                                                                        />
                                                                    </Tooltip>
                                                                </Popconfirm>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
}