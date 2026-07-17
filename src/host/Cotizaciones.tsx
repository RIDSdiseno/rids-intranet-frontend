// src/host/Cotizaciones.tsx
// Este componente es el corazón de la gestión de cotizaciones. Aquí se listan todas las cotizaciones con paginación, búsqueda y filtros avanzados. Desde esta vista se pueden crear nuevas cotizaciones, editar las existentes, eliminar o generar PDF. También se manejan los modales para seleccionar productos/servicios del catálogo, crear nuevos productos/servicios/entidades, y vincular equipos a los items de las cotizaciones. Se utiliza una combinación de estados locales para manejar la UI y llamadas a la API para persistir los cambios en el backend. Además, se implementa un sistema de toast para mostrar mensajes de éxito o error al usuario.
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
    PlusOutlined,
    SearchOutlined,
    EditOutlined,
    EyeOutlined,
    DeleteOutlined,
    CheckCircleOutlined,
    ReloadOutlined,
    CloseCircleOutlined,
    FileTextOutlined,
    PrinterOutlined,
    MailOutlined,
    CopyOutlined,
} from "@ant-design/icons";
import { Modal } from 'antd';
import { motion } from "framer-motion";
import { useApi } from "../components/modals-cotizaciones/UseApi";
import {
    ViewCotizacionModal,
    CreateCotizacionModal,
    EditCotizacionModal,
    SelectProductoModal,
    SelectServicioModal,
    EditProductoModal,
    NewEntidadModal,
    EditEntidadModal,
    NewEmpresaModal,
    NewProductoModal,
    GenerarPDFModal,
    NewServicioModal,
} from "../components/modals-cotizaciones";
import { generarPDF } from "../components/modals-cotizaciones/GenerarPDFModal";
import { http } from '../service/http';
import SendCotizacionModal from "../components/modals-cotizaciones/SendCotizacionModal";
import CotizacionesEnviadas from "./CotizacionesEnviadas";
import type {
    CotizacionGestioo,
    EntidadGestioo,
    FormData,
    EmpresaForm,
    ProductoForm,
    FiltrosProductos,
    FiltrosServicios,
    FiltrosHistorial,
    Toast,
    CotizacionItemGestioo
} from "../components/modals-cotizaciones/types";
import { notification } from 'antd';
import { escapeHtml, formatCurrency, buildCotizacionHtml } from '../lib/emailTemplates';
import {
    TipoCotizacionGestioo,
    ItemTipoGestioo,
    EstadoCotizacionGestioo
} from "../components/modals-cotizaciones/types";
import {
    calcularTotales,
    formatEstado,
    formatearPrecio,
    validarCotizacion,
    normalizarItemCotizacion,
} from "../components/modals-cotizaciones/utils";

import CrearEquipoModal from "../components/modals-equipos/CrearEquipo";
import type { EquipoDTO } from "../components/modals-equipos/equipos.types";

import type { EquipoOption } from "../components/modals-cotizaciones/SelectEquipo";

import SelectEquipoModal from "../components/modals-cotizaciones/SelectEquipo";

import { useAuth } from "../components/hooks/useAuth"
import CotizacionesMasivasManager from "../components/modals-cotizaciones/cotizaciones-masivas/CotizacionesMasivasManager";

const { isCliente } = useAuth();

// Definición de tipos específicos para esta vista
type EstadoDTE =
    | "EMITIDO"
    | "RECIBIDO"
    | "ACEPTADO"
    | "RECHAZADO"
    | "OBSERVADO"
    | "ANULADO";

const estados: EstadoDTE[] = [
    "EMITIDO",
    "RECIBIDO",
    "ACEPTADO",
    "RECHAZADO",
    "OBSERVADO",
    "ANULADO"
];

type CotRow = CotizacionGestioo & {
    tecnico?: {
        id_tecnico: number;
        nombre: string;
        email: string;
    } | null;

    facturas: {
        id_factura: number;
        numeroFactura: string;
        estadoSII: EstadoDTE;
        tipoDTE: number;
        folioSII: string;
        fechaEmision: string;
        total: number;
        trackId?: string | null;
        _showEstadoMenu?: boolean;
    }[];

    trabajos?: {
        id: number;
        numeroOrden: string | null;
    }[];

    _showEstadoMenu?: boolean;
};

const getTipoDTELabel = (tipo: number) => {
    switch (tipo) {
        case 33:
            return "Factura Electrónica";
        case 34:
            return "Factura Exenta";
        case 61:
            return "Nota de Crédito";
        case 56:
            return "Nota de Débito";
        default:
            return `DTE ${tipo}`;
    }
};

// Componente principal de la vista de cotizaciones
const Cotizaciones: React.FC = () => {
    // === ESTADOS PRINCIPALES ===
    const [cotizaciones, setCotizaciones] = useState<CotRow[]>([]);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCotizaciones, setTotalCotizaciones] = useState(0);
    const PAGE_SIZE = 15;

    const [query, setQuery] = useState("");
    const [selectedCotizacion, setSelectedCotizacion] = useState<CotizacionGestioo | null>(null);
    const [toast, setToast] = useState<Toast | null>(null);

    // === ESTADOS DE MODALES ===
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showSelectorProducto, setShowSelectorProducto] = useState(false);
    const [showSelectorServicio, setShowSelectorServicio] = useState(false);
    const [showEditProductoModal, setShowEditProductoModal] = useState(false);
    const [showEditServicioModal, setShowEditServicioModal] = useState(false);
    const [showNewEntidadModal, setShowNewEntidadModal] = useState(false);
    const [showEditEntidadModal, setShowEditEntidadModal] = useState(false);
    const [showNewEmpresaModal, setShowNewEmpresaModal] = useState(false);
    const [showNewProductoModal, setShowNewProductoModal] = useState(false);
    const [showCreateServicioModal, setShowCreateServicioModal] = useState(false);

    const [showCotizacionesMasivasManager, setShowCotizacionesMasivasManager] =
        useState(false);

    const [filtroMes, setFiltroMes] = useState<string>("");

    const [showSelectEquipo, setShowSelectEquipo] = useState(false);
    const [equiposDisponibles, setEquiposDisponibles] = useState<EquipoOption[]>([]);
    const [itemEquipoActual, setItemEquipoActual] = useState<CotizacionItemGestioo | null>(null);

    const [tecnicos, setTecnicos] = useState<
        { id_tecnico: number; nombre: string }[]
    >([]);

    // === ESTADOS PARA FORMULARIOS ===
    const [entidades, setEntidades] = useState<EntidadGestioo[]>([]);
    const [entidadParaEditar, setEntidadParaEditar] = useState<EntidadGestioo | null>(null);
    const [items, setItems] = useState<any[]>([]);
    const [formData, setFormData] = useState<FormData>({
        tipoEntidad: "EMPRESA",
        origenEntidad: "",
        entidadId: "",
        moneda: "CLP",
        tasaCambio: 1,
        estadoCotizacion: EstadoCotizacionGestioo.BORRADOR,
        comentariosCotizacion: "",
        secciones: [{
            id: 1,
            nombre: "Sección Principal",
            descripcion: '',
            items: [],
            orden: 0
        }],
        seccionActiva: 1,
        personaResponsable: "",
        imagenFile: undefined,
        imagen: ""
    });

    // === ESTADOS PARA CREACIÓN ===
    const [nombre, setNombre] = useState("");
    const [rut, setRut] = useState("");
    const [correo, setCorreo] = useState("");
    const [telefono, setTelefono] = useState("");
    const [direccion, setDireccion] = useState("");
    const [empresaForm, setEmpresaForm] = useState<EmpresaForm>({
        nombre: "",
        rut: "",
        correo: "",
        telefono: "",
        direccion: "",
        origen: "RIDS"
    });
    const [productoForm, setProductoForm] = useState<ProductoForm>({
        nombre: "",
        descripcion: "",
        precio: 0,
        porcGanancia: 30,
        precioTotal: 0,
        categoria: "",
        stock: 0,
        serie: "",
        imagen: "",
        imagenFile: null,
    });

    // === ESTADOS PARA FILTROS ===
    const [filtroOrigen, setFiltroOrigen] = useState("TODOS");
    const [filtrosProductos, setFiltrosProductos] = useState<FiltrosProductos>({
        texto: "",
        codigo: "",
        precioMin: "",
        precioMax: "",
        categoria: ""
    });
    const [filtrosServicios, setFiltrosServicios] = useState<FiltrosServicios>({
        texto: "",
        codigo: "",
        precioMin: "",
        precioMax: "",
        categoria: ""
    });
    const [filtrosHistorial, setFiltrosHistorial] = useState<FiltrosHistorial>({
        origen: "",
        estado: "",
        tipo: "",
        tecnico: ""
    });

    // === ESTADOS PARA CATÁLOGOS ===
    const [productosCatalogo, setProductosCatalogo] = useState<any[]>([]);
    const [serviciosCatalogo, setServiciosCatalogo] = useState<any[]>([]);
    const [categoriasDisponibles, setCategoriasDisponibles] = useState<string[]>([]);

    // === ESTADOS PARA EDICIÓN ===
    const [productoAEditar, setProductoAEditar] = useState<any>(null);
    const [servicioAEditar, setServicioAEditar] = useState<any>(null);

    // === ESTADOS PARA ORDENAMIENTO ===
    const [ordenProducto, setOrdenProducto] = useState("asc");

    // === HOOKS PERSONALIZADOS ===
    const { fetchApi: apiFetch, loading: apiLoading } = useApi();
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const [origenEditProducto, setOrigenEditProducto] =
        useState<"catalogo" | "cotizacion" | null>(null);

    const [showCrearEquipoDesdeItem, setShowCrearEquipoDesdeItem] = useState(false);
    const [itemParaEquipo, setItemParaEquipo] = useState<CotizacionItemGestioo | null>(null);
    const [modoEquipoEdit, setModoEquipoEdit] = useState(false);
    const [loadingEquipos, setLoadingEquipos] = useState(false);

    const [loadingCrearProducto, setLoadingCrearProducto] = useState(false);

    // === MANEJO DE ERRORES Y ÉXITOS ===
    const handleApiError = useCallback((error: any, defaultMessage: string) => {
        console.error("API Error:", error);

        let message =
            error?.response?.data?.error ||
            error?.response?.data?.message ||
            error?.data?.error ||
            error?.data?.message ||
            error?.message ||
            defaultMessage;

        if (typeof message !== "string") {
            message = defaultMessage;
        }

        if (message.includes("Unique constraint")) {
            message = "Ya existe un registro con esos datos.";
        }

        if (message.includes("not-null")) {
            message = "Falta un campo obligatorio.";
        }

        if (message.includes("ECONNET") && message.includes("enum")) {
            message = "El origen seleccionado no es válido.";
        }

        setToast({
            type: "error",
            message
        });

        setTimeout(() => setToast(null), 5000);
    }, []);

    const showError = (msg: string) => {
        setToast({ type: "error", message: msg });
    };

    // escapeHtml and formatCurrency moved to src/lib/emailTemplates

        function buildDefaultHtmlForSend(cot: CotizacionGestioo) {
                                const nombre = cot.entidad?.nombre || '';
                                const total = Array.isArray(cot.items) ? cot.items.reduce((s: number, it: any) => s + ((Number(it.precio) || 0) * (Number(it.cantidad) || 1)), 0) : cot.total || 0;
                                return `
                                <div style="font-family:Arial,Helvetica,sans-serif;background:#eef2f7;padding:32px 16px;">
                                  <div style="max-width:600px;margin:0 auto;">

                                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0c4a6e;border-radius:12px 12px 0 0;overflow:hidden;">
                                      <tr><td style="padding:20px 28px;">
                                        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                                          <td><img src="/img/splash.png" alt="RIDS" style="height:36px;display:block;border-radius:5px;background:#ffffff;padding:4px;" /></td>
                                          <td align="right">
                                            <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Cotización</span>
                                            <span style="display:block;font-size:13px;font-weight:600;color:#7dd3fc;margin-top:2px;text-align:right;">#${cot.id}</span>
                                          </td>
                                        </tr></table>
                                      </td></tr>
                                      <tr><td style="background:linear-gradient(90deg,#0ea5e9,#38bdf8);height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
                                    </table>

                                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
                                      <tr><td style="padding:28px 28px 20px;">
                                        <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#0ea5e9;text-transform:uppercase;letter-spacing:0.08em;">Nueva cotización</p>
                                        <p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#0f172a;">Estimado/a ${escapeHtml(nombre)},</p>
                                        <p style="margin:0 0 24px;font-size:14px;color:#475569;line-height:1.7;">Adjuntamos la cotización solicitada. En el archivo adjunto encontrarás el detalle completo. Si deseas realizar cambios, responde a este correo indicando lo que necesitas modificar.</p>

                                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                                          <tr>
                                            <td width="47%" style="background:#f0f9ff;border-radius:10px;padding:16px 18px;vertical-align:top;">
                                              <div style="font-size:10px;font-weight:700;color:#0ea5e9;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Total</div>
                                              <div style="font-size:24px;font-weight:800;color:#0c4a6e;line-height:1;">${formatCurrency(total)}</div>
                                            </td>
                                            <td width="6%"></td>
                                            <td width="47%" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;vertical-align:top;">
                                              <div style="font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px;">Ítems incluidos</div>
                                              <div style="font-size:24px;font-weight:800;color:#0f172a;line-height:1;">${Array.isArray(cot.items) ? cot.items.length : '-'}</div>
                                            </td>
                                          </tr>
                                        </table>

                                      </td></tr>
                                    </table>

                                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;border-top:1px solid #e2e8f0;border-radius:0 0 12px 12px;">
                                      <tr><td style="padding:18px 28px;">
                                        <p style="margin:0 0 4px;font-size:13px;color:#334155;">Saludos cordiales,</p>
                                        <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#0c4a6e;">Equipo RIDS</p>
                                        <p style="margin:0;font-size:11px;color:#94a3b8;">Si no solicitaste esta cotización, puedes ignorar este mensaje. Para asistencia, responde a este correo.</p>
                                      </td></tr>
                                    </table>

                                  </div>
                                </div>`;
        }

    const fetchTecnicos = async () => {
        try {
            const data = await apiFetch("/tecnicos");
            setTecnicos(data.data || data);
        } catch (error) {
            handleApiError(error, "Error al cargar técnicos");
        }
    };

    const showSuccess = useCallback((message: string) => {
        setToast({ type: "success", message });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const handleAbrirCrearEquipoDesdeItem = (item: CotizacionItemGestioo, esEdicion = false) => {
        setItemParaEquipo(item);
        setModoEquipoEdit(esEdicion);
        setShowCrearEquipoDesdeItem(true);
    };

    const handleAbrirSeleccionEquipo = async (
        item: CotizacionItemGestioo,
        esEdicion = false
    ) => {
        setItemEquipoActual(item);
        setModoEquipoEdit(esEdicion);
        setShowSelectEquipo(true);
        await fetchEquiposDisponibles();
    };

    const handleSeleccionarEquipoExistente = async (equipo: EquipoOption) => {
        if (!itemEquipoActual) return;

        const equipoResumen = {
            id_equipo: equipo.id_equipo,
            serial: equipo.serial,
            marca: equipo.marca,
            modelo: equipo.modelo,
        };

        try {
            if (modoEquipoEdit && selectedCotizacion) {
                setSelectedCotizacion(prev => ({
                    ...prev!,
                    items: prev!.items.map(i =>
                        i.id === itemEquipoActual.id
                            ? {
                                ...i,
                                equipoId: equipo.id_equipo,
                                equipo: equipoResumen,
                            }
                            : i
                    ),
                }));
            } else {
                setItems(prev =>
                    prev.map(i =>
                        i.id === itemEquipoActual.id
                            ? {
                                ...i,
                                equipoId: equipo.id_equipo,
                                equipo: equipoResumen,
                            }
                            : i
                    )
                );
            }

            if (typeof itemEquipoActual.id === "number" && itemEquipoActual.id > 0) {
                await handleVincularEquipoAItem(itemEquipoActual.id, equipo.id_equipo);
            }

            setShowSelectEquipo(false);
            setItemEquipoActual(null);

            showSuccess("Equipo vinculado correctamente");
        } catch (error) {
            handleApiError(error, "Error al seleccionar equipo");
        }
    };

    const handleVincularEquipoAItem = async (
        itemId: number,
        equipoId: number | null
    ) => {
        try {
            let itemActualizado: any = null;
            const esItemReal = typeof itemId === "number" && itemId > 0 && itemId < 1_000_000_000;

            if (esItemReal) {
                const resp = await apiFetch(`/cotizaciones/items/${itemId}/equipo`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ equipoId }),
                });

                itemActualizado = resp.item || resp.data?.item || resp.data || null;
            }

            if (modoEquipoEdit && selectedCotizacion) {
                setSelectedCotizacion(prev => ({
                    ...prev!,
                    items: prev!.items.map(i =>
                        i.id === itemId
                            ? {
                                ...i,
                                equipoId: itemActualizado?.equipoId ?? equipoId,
                                equipo: itemActualizado?.equipo ?? (equipoId ? i.equipo : null),
                            }
                            : i
                    ),
                }));
            } else {
                setItems(prev =>
                    prev.map(i =>
                        i.id === itemId
                            ? {
                                ...i,
                                equipoId: itemActualizado?.equipoId ?? equipoId,
                                equipo: itemActualizado?.equipo ?? (equipoId ? i.equipo : null),
                            }
                            : i
                    )
                );
            }
        } catch (error) {
            handleApiError(error, "Error al vincular/desvincular equipo");
        }
    };

    const handleEquipoCreado = (nuevoEquipo: EquipoDTO) => {
        if (!itemParaEquipo) return;

        const equipoResumen = {
            id_equipo: nuevoEquipo.id_equipo,
            serial: nuevoEquipo.serial,
            marca: nuevoEquipo.marca,
            modelo: nuevoEquipo.modelo,
        };

        if (modoEquipoEdit && selectedCotizacion) {
            setSelectedCotizacion(prev => ({
                ...prev!,
                items: prev!.items.map(i =>
                    i.id === itemParaEquipo.id
                        ? { ...i, equipoId: nuevoEquipo.id_equipo, equipo: equipoResumen }
                        : i
                ),
            }));
        } else {
            setItems(prev =>
                prev.map(i =>
                    i.id === itemParaEquipo.id
                        ? { ...i, equipoId: nuevoEquipo.id_equipo, equipo: equipoResumen }
                        : i
                )
            );
        }

        setShowCrearEquipoDesdeItem(false);
        setItemParaEquipo(null);
        showSuccess("Equipo creado y vinculado al item");
    };

    // === EFECTOS ===
    useEffect(() => {
        fetchCotizaciones(1);
        fetchEntidades();
        // Solo cargar técnicos para roles internos — CLIENTE no necesita este dato
        if (!isCliente) {
            fetchTecnicos();
        }
    }, []);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(() => {
            fetchCotizaciones(1);
        }, 400);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [query, filtrosHistorial, filtroMes]);

    useEffect(() => {
        if (showCreateModal) {
            fetchCatalogo();
        }
    }, [showCreateModal]);

    // === FUNCIONES PRINCIPALES ===
    const fetchCotizaciones = async (
        currentPage = 1
    ) => {
        try {
            let url = `/cotizaciones/paginacion?page=${currentPage}&limit=${PAGE_SIZE}`;

            if (query) {
                url += `&search=${encodeURIComponent(query)}`;
            }

            if (filtrosHistorial.tecnico) {
                url += `&tecnico=${filtrosHistorial.tecnico}`;
            }

            if (filtrosHistorial.origen) {
                url += `&origen=${filtrosHistorial.origen}`;
            }

            if (filtrosHistorial.estado) {
                url += `&estado=${filtrosHistorial.estado}`;
            }

            if (filtrosHistorial.tipo) {
                url += `&tipo=${filtrosHistorial.tipo}`;
            }

            if (filtroMes) {
                const [year, month] = filtroMes.split("-");
                const fechaDesde = `${year}-${month}-01`;
                const fechaHasta = new Date(Number(year), Number(month), 0)
                    .toISOString()
                    .split("T")[0];

                url += `&fechaDesde=${fechaDesde}&fechaHasta=${fechaHasta}`;
            }

            const data = await apiFetch(url);

            setCotizaciones(data.data || []);
            setTotalPages(data.pages || 1);
            setTotalCotizaciones(data.total || 0);
            setPage(currentPage);
        } catch (err) {
            handleApiError(err, "Error al cargar cotizaciones");
        }
    };

    const fetchEquiposDisponibles = async () => {
        try {
            setLoadingEquipos(true);

            const params = new URLSearchParams({
                page: "1",
                pageSize: "1000",
            });

            const resp = await apiFetch(`/equipos?${params.toString()}`);
            const data = resp?.data ?? resp;

            setEquiposDisponibles(data?.items ?? []);
        } catch (error) {
            handleApiError(error, "Error al cargar equipos");
            setEquiposDisponibles([]);
        } finally {
            setLoadingEquipos(false);
        }
    };

    const fetchEntidades = async () => {
        try {
            const data = await apiFetch("/entidades");
            setEntidades(data.data || data.items || data || []);
        } catch (err) {
            handleApiError(err, "Error al cargar entidades");
        }
    };

    const fetchCatalogo = async () => {
        try {
            const [productosData, serviciosData] = await Promise.all([
                apiFetch("/productos-gestioo"),
                apiFetch("/servicios-gestioo")
            ]);

            const productos = productosData.data || productosData.items || productosData.rows || productosData || [];
            const servicios = serviciosData.data || serviciosData.items || serviciosData.rows || serviciosData || [];

            const productosMapeados = productos.map((p: any) => ({
                id: p.id,
                tipo: "PRODUCTO" as const,
                descripcion: p.descripcion || "",
                precio: Number(p.precio || p.precioBase || p.valor || 0),
                porcGanancia: Number(p.porcGanancia || 0),
                precioTotal: Number(p.precioTotal || p.precio || 0),
                nombre: p.nombre,
                sku: p.serie,
                serie: p.serie,
                categoria: p.categoria,
                imagen: p.imagen || null,
            }));

            setProductosCatalogo(productosMapeados);
            setServiciosCatalogo(servicios);

            const categoriasUnicas = Array.from(
                new Set(
                    productosMapeados
                        .map((p: any) => String(p.categoria ?? ""))
                        .filter((c: string) => c.trim() !== "")
                )
            ) as string[];
            setCategoriasDisponibles(categoriasUnicas);
        } catch (error) {
            handleApiError(error, "Error al cargar catálogo");
        }
    };

    const cargarProductos = async (mostrarSelector = true) => {
        try {
            const data = await apiFetch("/productos-gestioo");
            const productos = data.data || data.items || data.rows || data || [];

            const productosMapeados = productos.map((p: any) => ({
                id: p.id,
                tipo: "PRODUCTO" as const,
                descripcion: p.descripcion || "",
                precio: Number(p.precio || p.precioBase || p.valor || 0),
                porcGanancia: Number(p.porcGanancia || 0),
                precioTotal: Number(p.precioTotal || p.precio || 0),
                nombre: p.nombre,
                sku: p.serie,
                serie: p.serie,
                categoria: p.categoria,
                imagen: p.imagen || null,
            }));

            setProductosCatalogo(productosMapeados);

            const categoriasUnicas = Array.from(
                new Set(
                    productosMapeados
                        .map((p: any) => String(p.categoria ?? ""))
                        .filter((c: string) => c.trim() !== "")
                )
            ) as string[];
            setCategoriasDisponibles(categoriasUnicas);

            if (mostrarSelector) {
                setShowSelectorProducto(true);
            }
        } catch (e) {
            handleApiError(e, "Error al cargar productos");
        }
    };

    const cargarServicios = async () => {
        try {
            const data = await apiFetch("/servicios-gestioo");
            const servicios = data.data || data.items || data.rows || data || [];
            setServiciosCatalogo(servicios);
            setShowSelectorServicio(true);
        } catch (e) {
            handleApiError(e, "Error al cargar servicios");
        }
    };

    // === FUNCIONES PARA ITEMS ===
    const handleAddItem = (tipo: ItemTipoGestioo, seccionId?: number) => {
        const targetSeccionId = seccionId || formData.seccionActiva;

        const newItem = {
            id: Date.now(),
            tipo,
            nombre: tipo === ItemTipoGestioo.ADICIONAL ? "Descuento adicional" : "",
            descripcion: "",
            cantidad: 1,
            precio: 0,
            precioOriginalCLP: 0,
            porcentaje: 0,
            tieneDescuento: false,
            tieneIVA: false,
            seccionId: targetSeccionId
        };

        setItems(prev => [...prev, newItem]);
    };

    const handleUpdateItem = (id: number, field: string, value: any) => {
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const handleRemoveItem = (id: number) => {
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        if (showEditModal && selectedCotizacion) {
            const updatedItems = [...selectedCotizacion.items];

            updatedItems[index] = {
                ...updatedItems[index],
                [field]: value
            };

            setSelectedCotizacion(prev => ({
                ...prev!,
                items: updatedItems
            }));

            return;
        }

        const updated = [...items];

        updated[index] = {
            ...updated[index],
            [field]: value
        };

        setItems(updated);
    };

    // === FUNCIONES PARA COTIZACIONES ===
    const handleDelete = async (id: number) => {
        if (!window.confirm("¿Seguro que deseas eliminar esta cotización?")) return;

        try {
            await apiFetch(`/cotizaciones/${id}`, { method: "DELETE" });

            setCotizaciones(prev => prev.filter(c => c.id !== id));
            showSuccess("Cotización eliminada correctamente");

        } catch (error: any) {
            if (error.message.includes("facturada")) {
                setToast({
                    type: "error",
                    message: error.message
                });
                return;
            }

            handleApiError(error, "Error al eliminar cotización");
        }
    };

    const handleCreateCotizacion = async () => {
        if (!formData.entidadId) {
            handleApiError(null, "Debe seleccionar una entidad");
            return;
        }

        if (items.length === 0) {
            handleApiError(null, "Debe agregar al menos un item en alguna sección");
            return;
        }

        try {
            let imagenUrl = null;

            if (formData.imagenFile) {
                const formDataToSend = new FormData();
                formDataToSend.append("imagen", formData.imagenFile);

                const uploadResp = await apiFetch("/upload-imagenes/upload", {
                    method: "POST",
                    body: formDataToSend
                });

                imagenUrl = uploadResp.secure_url || uploadResp.url || null;
            }

            const itemsParaEnviar = items.map((item: any) => {
                const tasa = Number(formData.tasaCambio || 1);

                const precioCLP =
                    formData.moneda === "USD"
                        ? Math.round(Number(item.precio || 0) * tasa)
                        : Number(item.precio || 0);

                const precioCostoCLP =
                    item.precioCosto != null
                        ? formData.moneda === "USD"
                            ? Math.round(Number(item.precioCosto) * tasa)
                            : Number(item.precioCosto)
                        : null;

                return {
                    tipo: item.tipo,
                    nombre: item.nombre,
                    descripcion: item.descripcion,
                    cantidad: item.cantidad,
                    precio: precioCLP,
                    precioOriginalCLP: precioCLP,
                    precioCosto: precioCostoCLP,
                    porcentaje: item.porcentaje || null,
                    tieneIVA: item.tieneIVA || false,
                    tieneDescuento: item.tieneDescuento || false,
                    sku: item.sku || null,
                    porcGanancia: item.porcGanancia || null,
                    seccionId: item.seccionId,
                    imagen: item.imagen || null,
                    equipoId: item.equipoId ?? null,
                };
            });

            const totales = calcularTotales(itemsParaEnviar);

            const cotizacionData = {
                tipo: TipoCotizacionGestioo.CLIENTE,
                estado: EstadoCotizacionGestioo.BORRADOR,
                entidadId: Number(formData.entidadId),
                subtotal: totales.subtotal,
                descuentos: totales.descuentos,
                iva: totales.iva,
                total: totales.total,
                moneda: formData.moneda,
                tasaCambio: formData.moneda === "USD"
                    ? Number(formData.tasaCambio || 1)
                    : 1,
                items: itemsParaEnviar,
                comentariosCotizacion: formData.comentariosCotizacion?.trim() || null,
                secciones: formData.secciones,
                personaResponsable: formData.personaResponsable || null,
                imagen: imagenUrl
            };

            const data = await apiFetch("/cotizaciones", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cotizacionData)
            });

            setCotizaciones(prev => [data.data, ...prev]);
            setShowCreateModal(false);
            resetForm();
            showSuccess("Cotización creada correctamente");

        } catch (error) {
            handleApiError(error, "Error al crear cotización");
        }
    };

    // Crear y enviar: crea la cotización y genera el PDF + envía por correo sin abrir modal
    const handleCreateAndSendCotizacion = async () => {
        if (!formData.entidadId) {
            handleApiError(null, "Debe seleccionar una entidad");
            return;
        }

        if (items.length === 0) {
            handleApiError(null, "Debe agregar al menos un item en alguna sección");
            return;
        }

        try {
            // reuse creation logic (file upload if needed)
            let imagenUrl = null;

            if (formData.imagenFile) {
                const formDataToSend = new FormData();
                formDataToSend.append("imagen", formData.imagenFile);

                const uploadResp = await apiFetch("/upload-imagenes/upload", {
                    method: "POST",
                    body: formDataToSend
                });

                imagenUrl = uploadResp.secure_url || uploadResp.url || null;
            }

            const itemsParaEnviar = items.map((item: any) => {
                const tasa = Number(formData.tasaCambio || 1);

                const precioCLP =
                    formData.moneda === "USD"
                        ? Math.round(Number(item.precio || 0) * tasa)
                        : Number(item.precio || 0);

                const precioCostoCLP =
                    item.precioCosto != null
                        ? formData.moneda === "USD"
                            ? Math.round(Number(item.precioCosto) * tasa)
                            : Number(item.precioCosto)
                        : null;

                return {
                    tipo: item.tipo,
                    nombre: item.nombre,
                    descripcion: item.descripcion,
                    cantidad: item.cantidad,
                    precio: precioCLP,
                    precioOriginalCLP: precioCLP,
                    precioCosto: precioCostoCLP,
                    porcentaje: item.porcentaje || null,
                    tieneIVA: item.tieneIVA || false,
                    tieneDescuento: item.tieneDescuento || false,
                    sku: item.sku || null,
                    porcGanancia: item.porcGanancia || null,
                    seccionId: item.seccionId,
                    imagen: item.imagen || null,
                    equipoId: item.equipoId ?? null,
                };
            });

            const totales = calcularTotales(itemsParaEnviar);

            const cotizacionData = {
                tipo: TipoCotizacionGestioo.CLIENTE,
                estado: EstadoCotizacionGestioo.BORRADOR,
                entidadId: Number(formData.entidadId),
                subtotal: totales.subtotal,
                descuentos: totales.descuentos,
                iva: totales.iva,
                total: totales.total,
                moneda: formData.moneda,
                tasaCambio: formData.moneda === "USD"
                    ? Number(formData.tasaCambio || 1)
                    : 1,
                items: itemsParaEnviar,
                comentariosCotizacion: formData.comentariosCotizacion?.trim() || null,
                secciones: formData.secciones,
                personaResponsable: formData.personaResponsable || null,
                imagen: imagenUrl
            };

            const data = await apiFetch("/cotizaciones", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cotizacionData)
            });

            const created = data.data;
            setCotizaciones(prev => [created, ...prev]);
            setShowCreateModal(false);
            resetForm();
            showSuccess("Cotización creada correctamente");

            // Generar el PDF programáticamente y enviarlo
            try {
                const pdf = await generarPDF(created, false, true);
                let dataUrl: string | null = null;
                try { dataUrl = pdf.output('datauristring'); } catch (e) {
                    const blob = pdf.output('blob');
                    dataUrl = await new Promise<string>((res) => {
                        const r = new FileReader(); r.onloadend = () => res(r.result as string); r.readAsDataURL(blob);
                    });
                }

                if (!dataUrl) throw new Error('No se pudo generar el PDF');

                const comma = dataUrl.indexOf(',');
                const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
                const mimeMatch = dataUrl.match(/data:([^;]+);/);
                const contentType = mimeMatch ? mimeMatch[1] : 'application/pdf';

                // armar HTML con logo embebido (simple replacement)
                let finalHtml = buildDefaultHtml(created as any);
                try {
                    const resp = await fetch('/img/splash.png');
                    if (resp.ok) {
                        const blob = await resp.blob();
                        const logoData = await new Promise<string>((res) => {
                            const r = new FileReader(); r.onloadend = () => res(r.result as string); r.readAsDataURL(blob);
                        });
                        finalHtml = finalHtml.replace(/src=["']\/img\/splash\.png["']/g, `src="${logoData}"`);
                    }
                } catch (e) {
                    // ignore logo embedding errors
                }

                const payload = {
                    targets: [{ email: created.entidad?.correo || '', nombre: created.entidad?.nombre || '' }],
                    subject: `Cotización #${created.id} - ${created.entidad?.nombre || ''}`,
                    bodyHtml: finalHtml,
                    attachments: [{ name: `Cotizacion_${created.id}.pdf`, contentType, contentBytes: base64 }]
                };

                const sendResp = await http.post('/correo/enviar-masivo', payload);
                if (sendResp.data?.ok || sendResp.data?.queued || sendResp.data?.jobId) {
                    const queued = !!sendResp.data?.queued;
                    const jobId = sendResp.data?.jobId ?? null;
                    const sucMsg = queued ? `Envio en cola (job ${jobId}) — destinatarios: ${sendResp.data.queuedCount ?? 1}` : `Cotización enviada a ${created.entidad?.correo}`;
                    try { Modal.success({ title: queued ? 'Envío en cola' : 'Envío confirmado', content: sucMsg }); } catch (_) {}
                    notification.success({ message: queued ? 'Envío en cola' : 'Correo enviado', description: sucMsg });
                                        // Registrar envío en cotizaciones-enviadas (no bloquear)
                                        (async () => {
                                            try {
                                                await http.post('/cotizaciones/enviadas', {
                                                    cotizacionId: created.id,
                                                    to: created.entidad?.correo ?? null,
                                                    subject: payload.subject,
                                                    jobId: sendResp.data.jobId ?? null,
                                                    meta: { attachments: Array.isArray(payload.attachments) ? payload.attachments.length : 0 }
                                                });
                                            } catch (err: any) {
                                                console.error('Error registrando cotizacion enviada:', err);
                                                try {
                                                    const msg = err?.response?.data?.error ?? err?.message ?? String(err);
                                                    notification.warning({ message: 'Registro no guardado', description: `No se pudo registrar el envío: ${msg}`, duration: 6 });
                                                } catch (_) {}
                                            }
                                        })();
                } else {
                    notification.error({ message: 'Error al enviar', description: String(sendResp.data?.message ?? 'Respuesta inválida') });
                }
            } catch (err) {
                console.error('Error generando/enviando PDF:', err);
                notification.error({ message: 'Error', description: 'No se pudo generar o enviar el PDF automáticamente.' });
            }

        } catch (error) {
            handleApiError(error, "Error al crear cotización");
        }
    };

    const handleGuardarYEnviarCotizacion = async () => {
        if (!selectedCotizacion) {
            handleApiError(null, 'No hay cotización seleccionada');
            return;
        }

        try {
            // Guardar primero
            await handleUpdateCotizacion();

            // Obtener la versión actualizada
            const resp = await apiFetch(`/cotizaciones/${selectedCotizacion.id}`);
            const cot = resp.data || resp;

            // Generar PDF
            const pdf = await generarPDF(cot, false, true);
            let dataUrl: string | null = null;
            try { dataUrl = pdf.output('datauristring'); } catch (e) {
                const blob = pdf.output('blob');
                dataUrl = await new Promise<string>((res) => {
                    const r = new FileReader(); r.onloadend = () => res(r.result as string); r.readAsDataURL(blob);
                });
            }

            if (!dataUrl) throw new Error('No se pudo generar el PDF');

            const comma = dataUrl.indexOf(',');
            const base64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
            const mimeMatch = dataUrl.match(/data:([^;]+);/);
            const contentType = mimeMatch ? mimeMatch[1] : 'application/pdf';

            // Construir HTML (simple) e intentar embeber logo
            let finalHtml = buildDefaultHtmlForSend(cot as any);
            try {
                const r = await fetch('/img/splash.png');
                if (r.ok) {
                    const blob = await r.blob();
                    const logoData = await new Promise<string>((res) => {
                        const fr = new FileReader(); fr.onloadend = () => res(fr.result as string); fr.readAsDataURL(blob);
                    });
                    finalHtml = finalHtml.replace(/src=["']\/img\/splash\.png["']/g, `src="${logoData}"`);
                }
            } catch (e) {
                // ignore
            }

            const payload = {
                targets: [{ email: cot.entidad?.correo || '', nombre: cot.entidad?.nombre || '' }],
                subject: `Cotización #${cot.id} - ${cot.entidad?.nombre || ''}`,
                bodyHtml: finalHtml,
                attachments: [{ name: `Cotizacion_${cot.id}.pdf`, contentType, contentBytes: base64 }]
            };

                const sendResp = await http.post('/correo/enviar-masivo', payload);
            if (sendResp.data?.ok || sendResp.data?.queued || sendResp.data?.jobId) {
                const queued = !!sendResp.data?.queued;
                const jobId = sendResp.data?.jobId ?? null;
                const sucMsg = queued ? `Envio en cola (job ${jobId}) — destinatarios: ${sendResp.data.queuedCount ?? 1}` : `Cotización enviada a ${cot.entidad?.correo}`;
                try { Modal.success({ title: queued ? 'Envío en cola' : 'Envío confirmado', content: sucMsg }); } catch (_) {}
                notification.success({ message: queued ? 'Envío en cola' : 'Correo enviado', description: sucMsg });
                                // Registrar envío en cotizaciones-enviadas (no bloquear)
                                (async () => {
                                    try {
                                        await http.post('/cotizaciones/enviadas', {
                                            cotizacionId: cot.id,
                                            to: cot.entidad?.correo ?? null,
                                            subject: payload.subject,
                                            jobId: sendResp.data.jobId ?? null,
                                            meta: { attachments: Array.isArray(payload.attachments) ? payload.attachments.length : 0 }
                                        });
                                    } catch (err: any) {
                                        console.error('Error registrando cotizacion enviada:', err);
                                        try {
                                            const msg = err?.response?.data?.error ?? err?.message ?? String(err);
                                            notification.warning({ message: 'Registro no guardado', description: `No se pudo registrar el envío: ${msg}`, duration: 6 });
                                        } catch (_) {}
                                    }
                                })();
            } else {
                notification.error({ message: 'Error al enviar', description: String(sendResp.data?.message ?? 'Respuesta inválida') });
            }

        } catch (err) {
            console.error('Error al guardar y enviar:', err);
            notification.error({ message: 'Error', description: 'No se pudo guardar y enviar la cotización.' });
        }
    };

    const handleChangeEstado = async (
        cot: CotRow,
        nuevoEstado: EstadoCotizacionGestioo
    ): Promise<void> => {
        try {
            if (nuevoEstado === EstadoCotizacionGestioo.FACTURADA) {
                showError("Las cotizaciones solo pueden facturarse desde el botón Facturar.");
                return;
            }

            await apiFetch(`/cotizaciones/${cot.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ estado: nuevoEstado }),
            });

            await fetchCotizaciones(page);

            showSuccess("Estado actualizado correctamente");

        } catch (error) {
            handleApiError(error, "Error al cambiar estado");
        }
    };

    const duplicarCotizacion = async (cot: CotizacionGestioo) => {
        try {
            const confirmar = window.confirm(
                `¿Deseas duplicar la cotización N° ${cot.id} como una copia?`
            );
            if (!confirmar) return;

            const res = await apiFetch(`/cotizaciones/${cot.id}`);
            const cotCompleta = res.data;

            if (!cotCompleta.items || cotCompleta.items.length === 0) {
                showError("La cotización no tiene items para duplicar");
                return;
            }

            const fecha = new Date().toLocaleDateString("es-CL");

            const comentarioCopia =
                `(Copia de cotización #${cotCompleta.id} - ${fecha}) ` +
                (cotCompleta.comentariosCotizacion || "");

            const moneda = cotCompleta.moneda || "CLP";
            const tasa = moneda === "USD" ? cotCompleta.tasaCambio ?? 1 : 1;

            const itemsNormalizados = cotCompleta.items.map((item: any) => {
                const normalizado = normalizarItemCotizacion(item, moneda, tasa);

                return {
                    ...normalizado,
                    seccionId: item.seccionId || 1
                };
            });

            setItems(itemsNormalizados);

            setFormData({
                tipoEntidad: "EMPRESA",
                origenEntidad: cotCompleta.entidad?.origen || "",
                entidadId: cotCompleta.entidadId?.toString() || "",
                moneda,
                tasaCambio: tasa,
                estadoCotizacion: EstadoCotizacionGestioo.BORRADOR,
                comentariosCotizacion: comentarioCopia,
                secciones: cotCompleta.secciones ?? [{
                    id: 1,
                    nombre: "Sección Principal",
                    descripcion: "",
                    items: [],
                    orden: 0
                }],
                seccionActiva: 1,
                personaResponsable: cotCompleta.personaResponsable || "",
                imagenFile: undefined,
                imagen: cotCompleta.imagen || ""
            });

            setShowCreateModal(true);

            showSuccess("Cotización cargada para duplicar");

        } catch (error) {
            handleApiError(error, "Error al duplicar cotización");
        }
    };

    const handleUpdateCotizacion = async () => {
        if (!selectedCotizacion) {
            handleApiError(null, "No hay cotización seleccionada");
            return;
        }

        try {
            const errores = validarCotizacion(selectedCotizacion);
            if (errores.length > 0) {
                handleApiError(
                    { message: errores.join("\n") },
                    "Errores de validación"
                );
                return;
            }

            const moneda = selectedCotizacion.moneda || "CLP";
            const tasaCambio =
                moneda === "USD"
                    ? Number(selectedCotizacion.tasaCambio) || 1
                    : 1;

            const itemsNormalizados = selectedCotizacion.items.map(item => {
                const normalizado = normalizarItemCotizacion(item, moneda, tasaCambio);

                return {
                    ...normalizado,
                    equipoId: item.equipoId ?? null,
                    equipo: item.equipo ?? null,
                };
            });

            const { total } = calcularTotales(itemsNormalizados as any);

            const cotizacionData = {
                tipo: selectedCotizacion.tipo,
                estado: selectedCotizacion.estado,
                entidadId: selectedCotizacion.entidadId ?? selectedCotizacion.entidad?.id,
                fecha: selectedCotizacion.fecha,
                total,
                moneda,
                tasaCambio,
                comentariosCotizacion:
                    selectedCotizacion.comentariosCotizacion?.trim() || null,
                personaResponsable:
                    selectedCotizacion.personaResponsable || null,
                items: itemsNormalizados,
                secciones: selectedCotizacion.secciones || [],
                imagen: selectedCotizacion.imagen || null,
            };

            const entidadId = selectedCotizacion.entidad?.id;

            if (entidadId) {
                await apiFetch(`/entidades/${entidadId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        nombre: selectedCotizacion.entidad?.nombre,
                        rut: selectedCotizacion.entidad?.rut,
                        correo: selectedCotizacion.entidad?.correo,
                        telefono: selectedCotizacion.entidad?.telefono,
                        direccion: selectedCotizacion.entidad?.direccion,
                        origen: selectedCotizacion.entidad?.origen,
                    })
                });
            }

            const updated = await apiFetch(
                `/cotizaciones/${selectedCotizacion.id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(cotizacionData),
                }
            );

            setCotizaciones(prev =>
                prev.map(c =>
                    c.id === selectedCotizacion.id
                        ? updated.data || updated
                        : c
                )
            );

            setShowEditModal(false);
            showSuccess("Cotización actualizada correctamente");
            await fetchCotizaciones(page);

        } catch (error) {
            handleApiError(error, "Error al actualizar cotización");
        }
    };

    // === FUNCIONES AUXILIARES ===
    const resetForm = () => {
        setItems([]);
        setFormData({
            tipoEntidad: "EMPRESA",
            origenEntidad: "",
            entidadId: "",
            moneda: "CLP",
            tasaCambio: 1,
            estadoCotizacion: EstadoCotizacionGestioo.BORRADOR,
            comentariosCotizacion: "",
            secciones: [{
                id: 1,
                nombre: "Sección Principal",
                descripcion: '',
                items: [],
                orden: 0
            }],
            seccionActiva: 1
        });
    };

    // === FUNCIONES PARA PRODUCTOS ===
    const agregarProducto = async (producto: any) => {
        try {
            const resp = await apiFetch(`/productos-gestioo/${producto.id}`);
            const productoReal = resp.data;

            const newItem = {
                id: Date.now(),
                cotizacionId: 0,
                tipo: ItemTipoGestioo.PRODUCTO,
                nombre: productoReal.nombre,
                descripcion: productoReal.descripcion ?? "",
                cantidad: 1,
                precio: productoReal.precioTotal || productoReal.precio,
                precioOriginalCLP: productoReal.precioTotal || productoReal.precio,
                precioCosto: productoReal.precio,
                porcGanancia: productoReal.porcGanancia || 0,
                porcentaje: 0,
                tieneIVA: true,
                tieneDescuento: false,
                sku: productoReal.serie || "",
                seccionId: formData.seccionActiva,
                imagen: productoReal.imagen || null,
                productoId: productoReal.id,
                createdAt: new Date().toISOString(),
            };

            setItems(prev => [...prev, newItem]);
            setShowSelectorProducto(false);
            showSuccess("Producto agregado correctamente");

        } catch (error) {
            handleApiError(error, "No se pudo cargar el producto");
        }
    };

    // === FUNCIONES PARA SERVICIOS ===
    const agregarServicio = (servicio: any) => {
        const newItem: CotizacionItemGestioo = {
            id: Date.now(),
            cotizacionId: 0,
            tipo: ItemTipoGestioo.SERVICIO,
            nombre: servicio.nombre,
            descripcion: servicio.descripcion ?? "",
            cantidad: 1,
            precio: servicio.precio || 0,
            precioOriginalCLP: servicio.precio || 0,
            porcentaje: 0,
            tieneIVA: false,
            tieneDescuento: false,
            seccionId: formData.seccionActiva,
            servicioId: servicio.id,
            productoId: null,
            createdAt: new Date().toISOString(),
        };

        setItems(prev => [...prev, newItem]);
        setShowSelectorServicio(false);
        showSuccess("Servicio agregado correctamente");
    };

    // === FUNCIONES PARA EDITAR ITEMS ===
    const abrirEditarItem = (item: CotizacionItemGestioo) => {
        if (item.tipo === ItemTipoGestioo.PRODUCTO) {
            abrirEditarProducto(item, "cotizacion");
            return;
        }

        if (item.tipo === ItemTipoGestioo.SERVICIO) {
            setServicioAEditar(item);
            setShowEditServicioModal(true);
            return;
        }
    };

    const abrirEditarProducto = (
        data: { productoId: number } | CotizacionItemGestioo,
        origen: "catalogo" | "cotizacion"
    ) => {
        setOrigenEditProducto(origen);

        const productoId = data.productoId;
        const item =
            origen === "cotizacion" && "id" in data ? data : null;

        let producto = productosCatalogo.find(p => p.id === productoId);

        if (!producto && item?.sku) {
            producto = productosCatalogo.find(
                p => p.sku === item.sku || p.serie === item.sku
            );

            if (producto && selectedCotizacion && item) {
                setSelectedCotizacion(prev => {
                    if (!prev) return prev;

                    return {
                        ...prev,
                        items: prev.items.map(i =>
                            i.id === item.id
                                ? { ...i, productoId: producto!.id }
                                : i
                        )
                    };
                });
            }
        }

        if (!producto) {
            console.warn("Producto no encontrado en catálogo, usando datos del item");

            if (item) {
                setProductoAEditar({
                    id: item.productoId ?? null,
                    nombre: item.nombre,
                    descripcion: item.descripcion ?? "",
                    precioCosto: item.precioCosto ?? item.precio ?? 0,
                    precio: item.precio ?? 0,
                    precioTotal: item.precio ?? 0,
                    porcGanancia: item.porcGanancia ?? 0,
                    categoria: "",
                    stock: 0,
                    codigo: item.sku ?? "",
                    imagen: item.imagen ?? null,
                });

                setShowSelectorProducto(false);
                setShowEditProductoModal(true);
                return;
            }

            setToast({
                type: "error",
                message: "No se pudo editar el producto"
            });
            return;
        }

        setProductoAEditar({
            ...producto,
            nombre: item?.nombre ?? producto.nombre,
            descripcion: item?.descripcion ?? producto.descripcion ?? "",
            precioCosto: producto.precio ?? 0,
            precio: producto.precio ?? 0,
            precioTotal: producto.precioTotal ?? producto.precio ?? 0,
            porcGanancia: producto.porcGanancia ?? 0,
            categoria: producto.categoria ?? "",
            stock: producto.stock ?? 0,
            codigo: producto.serie ?? producto.codigo ?? "",
            imagen: producto.imagen ?? null,
            publicId: producto.publicId ?? null,
        });

        setShowSelectorProducto(false);
        setShowEditProductoModal(true);
    };

    const abrirEditarProductoDesdeCotizacion = (item: CotizacionItemGestioo) => {
        abrirEditarProducto(item, "cotizacion");
    };

    const syncProductoEnSistema = (producto: any) => {
        setProductosCatalogo(prev =>
            prev.map(p =>
                p.id === producto.id ? { ...p, ...producto } : p
            )
        );

        setSelectedCotizacion(prev => {
            if (!prev) return prev;

            const actualizado: CotizacionGestioo = {
                ...prev,
                items: prev.items.map(i =>
                    i.productoId === producto.id
                        ? {
                            ...i,
                            productoId: producto.id,
                            nombre: producto.nombre,
                            descripcion: producto.descripcion || i.descripcion,
                            precioCosto: producto.precio,
                            porcGanancia: producto.porcGanancia,
                            precioOriginalCLP: producto.precioTotal ?? producto.precio,
                            precio: producto.precioTotal ?? producto.precio,
                            imagen: producto.imagen,
                            sku: producto.serie ?? producto.sku,
                        }
                        : i
                )
            };

            return actualizado;
        });

        if (showCreateModal) {
            setItems(prev =>
                prev.map(i =>
                    i.productoId === producto.id
                        ? {
                            ...i,
                            productoId: producto.id,
                            nombre: producto.nombre,
                            descripcion: producto.descripcion || i.descripcion,
                            precioCosto: producto.precio,
                            porcGanancia: producto.porcGanancia,
                            precioOriginalCLP: producto.precioTotal ?? producto.precio,
                            precio: producto.precioTotal ?? producto.precio,
                            imagen: producto.imagen,
                            sku: producto.serie ?? producto.sku,
                        }
                        : i
                )
            );
        }
    };

    const handleEditarProducto = async (productoData: any) => {
        try {
            if (!productoAEditar?.id) {
                return showError("No se puede editar: producto sin ID.");
            }

            await apiFetch(`/productos-gestioo/${productoAEditar.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(productoData),
            });

            const resp = await apiFetch(`/productos-gestioo/${productoAEditar.id}`);
            const productoReal = resp.data;

            syncProductoEnSistema(productoReal);

            showSuccess("Producto actualizado correctamente");
            setShowEditProductoModal(false);

        } catch (error) {
            handleApiError(error, "Error al actualizar producto");
        }
    };

    const agregarProductoEnEdicion = async (producto: any) => {
        if (!selectedCotizacion) return;

        try {
            const resp = await apiFetch(`/productos-gestioo/${producto.id}`);
            const productoReal = resp.data;

            const precioCosto = Number(productoReal.precio || 0);
            const porcGanancia = Number(productoReal.porcGanancia || 0);
            const precioVenta = Math.round(precioCosto * (1 + porcGanancia / 100));

            const newItem: CotizacionItemGestioo = {
                id: Number(`-9${Date.now()}`),
                cotizacionId: selectedCotizacion.id,
                tipo: ItemTipoGestioo.PRODUCTO,
                nombre: productoReal.nombre,
                descripcion: productoReal.descripcion ?? "",
                cantidad: 1,
                precioCosto,
                porcGanancia,
                precioOriginalCLP: precioVenta,
                precio: precioVenta,
                porcentaje: 0,
                tieneIVA: true,
                tieneDescuento: false,
                sku: productoReal.serie,
                seccionId: 1,
                imagen: productoReal.imagen || null,
                productoId: productoReal.id,
                createdAt: new Date().toISOString(),
            };

            const normalizado = normalizarItemCotizacion(
                newItem,
                selectedCotizacion.moneda,
                selectedCotizacion.tasaCambio ?? 1
            );

            setSelectedCotizacion(prev =>
                prev
                    ? { ...prev, items: [...prev.items, normalizado] }
                    : prev
            );

            setShowSelectorProducto(false);
            showSuccess("Producto agregado correctamente");

        } catch (error) {
            handleApiError(error, "No se pudo cargar el producto");
        }
    };

    const handleEliminarProducto = async (productoId: number) => {
        try {
            const confirmar = window.confirm("¿Seguro que deseas eliminar este producto?");
            if (!confirmar) return;

            await apiFetch(`/productos-gestioo/${productoId}`, {
                method: "DELETE"
            });

            setProductosCatalogo(prev => prev.filter(p => p.id !== productoId));
            showSuccess("Producto eliminado correctamente");
        } catch (error: any) {
            handleApiError(error, "Error al eliminar producto");
        }
    };

    const editarItem = (item: CotizacionItemGestioo) => {
        if (item.tipo === ItemTipoGestioo.PRODUCTO) {
            abrirEditarProducto(item, "cotizacion");
            return;
        }

        if (item.tipo === ItemTipoGestioo.SERVICIO) {
            setServicioAEditar(item);
            setShowEditServicioModal(true);
            return;
        }
    };

    // === FUNCIONES PARA ENTIDADES ===
    const handleCrearPersona = async (datos: any) => {
        try {
            const res = await apiFetch("/entidades", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(datos)
            });

            await fetchEntidades();
            setFormData(prev => ({
                ...prev,
                entidadId: res.data.id.toString()
            }));
            setShowNewEntidadModal(false);
            showSuccess("Persona creada correctamente");
            setNombre("");
            setRut("");
            setCorreo("");
            setTelefono("");
            setDireccion("");
        } catch (error) {
            handleApiError(error, "Error al crear persona");
        }
    };

    const handleEditarPersona = async (datos: any) => {
        if (!entidadParaEditar) return;
        try {
            await apiFetch(`/entidades/${entidadParaEditar.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(datos)
            });

            await fetchEntidades();
            showSuccess("Persona actualizada correctamente");
            setShowEditEntidadModal(false);
        } catch (error) {
            handleApiError(error, "Error al actualizar la persona");
        }
    };

    const handleCrearEmpresa = async (datos: any) => {
        try {
            const res = await apiFetch("/entidades", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(datos)
            });

            await fetchEntidades();
            setFormData(prev => ({
                ...prev,
                entidadId: (res.data?.id ?? res.id).toString()
            }));
            setShowNewEmpresaModal(false);
            showSuccess("Empresa creada correctamente");
            setEmpresaForm({
                nombre: "",
                rut: "",
                correo: "",
                telefono: "",
                direccion: "",
                origen: "RIDS"
            });
        } catch (error) {
            handleApiError(error, "Error al crear empresa, formulario inválido");
        }
    };

    const handleCrearProducto = async (productoFinal: any) => {
        if (loadingCrearProducto) return;

        const yaExiste = productosCatalogo.some(
            (p) =>
                p.nombre?.toLowerCase().trim() ===
                productoFinal.nombre?.toLowerCase().trim()
        );

        if (yaExiste) {
            showError("Ya existe un producto con ese nombre");
            return;
        }

        try {
            setLoadingCrearProducto(true);

            const productoCatalogo = {
                id: productoFinal.id,
                tipo: "PRODUCTO" as const,
                descripcion: productoFinal.descripcion || productoFinal.nombre,
                precio: productoFinal.precioTotal || productoFinal.precio,
                porcGanancia: productoFinal.porcGanancia || 0,
                precioTotal: productoFinal.precioTotal || productoFinal.precio || 0,
                nombre: productoFinal.nombre,
                sku: productoFinal.serie,
                categoria: productoFinal.categoria,
                imagen: productoFinal.imagen || null
            };

            setProductosCatalogo(prev => [...prev, productoCatalogo]);

            const seccionIdEdicion =
                selectedCotizacion?.secciones?.[0]?.id ??
                selectedCotizacion?.items?.[0]?.seccionId ??
                1;

            const nuevoItem: CotizacionItemGestioo = {
                id: showEditModal && selectedCotizacion
                    ? Number(`-9${Date.now()}`)
                    : Date.now(),
                cotizacionId: showEditModal && selectedCotizacion ? selectedCotizacion.id : 0,
                tipo: ItemTipoGestioo.PRODUCTO,
                nombre: productoFinal.nombre,
                descripcion: productoFinal.descripcion ?? "",
                cantidad: 1,
                precio: productoFinal.precioTotal || productoFinal.precio || 0,
                precioOriginalCLP: productoFinal.precioTotal || productoFinal.precio || 0,
                precioCosto: productoFinal.precio || 0,
                porcGanancia: productoFinal.porcGanancia || 0,
                porcentaje: 0,
                tieneIVA: true,
                tieneDescuento: false,
                sku: productoFinal.serie || "",
                seccionId: showEditModal && selectedCotizacion
                    ? seccionIdEdicion
                    : formData.seccionActiva,
                imagen: productoFinal.imagen || null,
                productoId: productoFinal.id,
                createdAt: new Date().toISOString(),
            };

            if (showEditModal && selectedCotizacion) {
                const normalizado = normalizarItemCotizacion(
                    nuevoItem,
                    selectedCotizacion.moneda || "CLP",
                    selectedCotizacion.tasaCambio ?? 1
                );

                setSelectedCotizacion(prev => ({
                    ...prev!,
                    items: [...prev!.items, normalizado]
                }));
            } else {
                setItems(prev => [...prev, nuevoItem]);
            }

            setShowNewProductoModal(false);

            setProductoForm({
                nombre: "",
                descripcion: "",
                precio: 0,
                porcGanancia: 30,
                precioTotal: 0,
                categoria: "",
                stock: 0,
                serie: "",
                imagen: "",
                imagenFile: null,
            });

            document.body.classList.remove("modal-nested-open");

            showSuccess("Producto creado y agregado a la cotización");
        } catch (error) {
            handleApiError(error, "Error al procesar el nuevo producto");
        } finally {
            setLoadingCrearProducto(false);
        }
    };

    // === MODAL EDICIÓN COTIZACIÓN ===
    const openEditModal = async (cotizacion: CotizacionGestioo) => {
        try {
            const resp = await apiFetch(`/cotizaciones/${cotizacion.id}`);
            const cotCompleta = resp.data || resp;

            await fetchCatalogo();

            const moneda = cotCompleta.moneda || "CLP";
            const tasaCambio =
                moneda === "USD"
                    ? Number(cotCompleta.tasaCambio) || 1
                    : 1;

            const items = Array.isArray(cotCompleta.items) ? cotCompleta.items : [];

            const itemsNormalizados = items.map((item: any) =>
                normalizarItemCotizacion(item, moneda, tasaCambio)
            );

            const cotizacionEditable: CotizacionGestioo = {
                ...cotCompleta,
                moneda,
                tasaCambio,
                comentariosCotizacion: cotCompleta.comentariosCotizacion ?? "",
                imagen: cotCompleta.imagen ?? null,
                items: itemsNormalizados,
            };

            setSelectedCotizacion(cotizacionEditable);
            setShowEditModal(true);
        } catch (error) {
            handleApiError(error, "Error al cargar cotización para editar");
        }
    };

    const [showGenerarPDFModal, setShowGenerarPDFModal] = useState(false);
    const [pdfURL, setPdfURL] = useState<string | null>(null);
    const [showPdfViewerModal, setShowPdfViewerModal] = useState(false);
    const [showSendMailModal, setShowSendMailModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'list'|'enviadas'>('list');

    // Estados para filtros de la vista "Cotizaciones Enviadas" (se envían por evento)
    const [envSearch, setEnvSearch] = useState("");
    const [envFilterCliente, setEnvFilterCliente] = useState("");
    const [envFilterGenero, setEnvFilterGenero] = useState("");
    const [envFilterEnviadoPor, setEnvFilterEnviadoPor] = useState("");
    const [envMonth, setEnvMonth] = useState("");
    const [envClientesOptions, setEnvClientesOptions] = useState<string[]>([]);
    const [envGenerosOptions, setEnvGenerosOptions] = useState<string[]>([]);
    const [envEnviadosOptions, setEnvEnviadosOptions] = useState<string[]>([]);

    const dispatchCotEnviadasFilters = (partial: any) => {
        const detail = {
            search: envSearch,
            filterCliente: envFilterCliente || null,
            filterGenero: envFilterGenero || null,
            filterEnviadoPor: envFilterEnviadoPor || null,
            dateRange: envMonth ? [envMonth, envMonth] : null,
            ...partial,
        };
        window.dispatchEvent(new CustomEvent('cotizacionesEnviadas:setFilters', { detail }));
    };

    // Al cambiar de pestaña: ocultar cabecera interna de CotizacionesEnviadas cuando está embebida
    useEffect(() => {
        if (activeTab === 'enviadas') {
            window.dispatchEvent(new CustomEvent('cotizacionesEnviadas:showHeader', { detail: { show: false } }));
            // enviar filtros iniciales
            dispatchCotEnviadasFilters({});
            // pedir recarga
            window.dispatchEvent(new CustomEvent('cotizacionesEnviadas:refresh'));
        } else {
            window.dispatchEvent(new CustomEvent('cotizacionesEnviadas:showHeader', { detail: { show: true } }));
        }
    }, [activeTab]);

    // Escuchar listas que envía CotizacionesEnviadas para poblar selects del header embebido
    useEffect(() => {
        const onLists = (ev: any) => {
            const d = ev?.detail || {};
            setEnvClientesOptions(Array.isArray(d.clientes) ? d.clientes : []);
            setEnvGenerosOptions(Array.isArray(d.generos) ? d.generos : []);
            setEnvEnviadosOptions(Array.isArray(d.enviados) ? d.enviados : []);
        };
        window.addEventListener('cotizacionesEnviadas:lists', onLists as EventListener);
        return () => window.removeEventListener('cotizacionesEnviadas:lists', onLists as EventListener);
    }, []);

    const handlePreviewRealPDF = async (cot: CotizacionGestioo) => {
        try {
            const data = await apiFetch(`/cotizaciones/${cot.id}`);
            const cotCompleta = data.data;

            setSelectedCotizacion(cotCompleta);
            setShowGenerarPDFModal(true);
        } catch (error) {
            handleApiError(error, "Error al cargar la cotización para PDF");
        }
    };

    const handlePDFPreview = (url: string) => {
        setPdfURL(url);
        setShowPdfViewerModal(true);
    };

    const totales = calcularTotales(
        showEditModal && selectedCotizacion
            ? selectedCotizacion.items
            : items
    );

    const renderFacturaContent = (c: CotRow) => {
        const factura = c.facturas?.[0];

        if (!factura) {
            return (
                <button
                    onClick={async () => {
                        const folio = prompt("Ingrese folio SII:");
                        const tipoDTE = prompt("Ingrese tipo DTE (33, 34, etc):");

                        if (!folio || !tipoDTE) return;

                        try {
                            await apiFetch(`/cotizaciones/${c.id}/vincular-factura-sii`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    folioSII: folio,
                                    tipoDTE: Number(tipoDTE),
                                    rutEmisor: "76758352-4"
                                })
                            });

                            await fetchCotizaciones(page);
                            showSuccess("Factura vinculada correctamente");

                        } catch (error) {
                            handleApiError(error, "Error al vincular factura");
                        }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                >
                    Vincular factura
                </button>
            );
        }

        return (
            <div className="flex flex-col items-center gap-1">
                <span className="font-semibold text-cyan-800">
                    Folio: {factura.folioSII}
                </span>

                <span className="text-xs text-slate-500">
                    {getTipoDTELabel(factura.tipoDTE)}
                </span>

                <div className="relative inline-block">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setCotizaciones(prev =>
                                prev.map(cot =>
                                    cot.id === c.id
                                        ? {
                                            ...cot,
                                            facturas: cot.facturas.map(f =>
                                                f.id_factura === factura.id_factura
                                                    ? { ...f, _showEstadoMenu: !f._showEstadoMenu }
                                                    : f
                                            )
                                        }
                                        : cot
                                )
                            );
                        }}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold
      ${factura.estadoSII === "ACEPTADO"
                                ? "bg-green-100 text-green-700"
                                : factura.estadoSII === "RECHAZADO"
                                    ? "bg-red-100 text-red-700"
                                    : factura.estadoSII === "ANULADO"
                                        ? "bg-gray-200 text-gray-700"
                                        : factura.estadoSII === "OBSERVADO"
                                            ? "bg-orange-100 text-orange-700"
                                            : factura.estadoSII === "EMITIDO"
                                                ? "bg-blue-100 text-blue-700"
                                                : "bg-yellow-100 text-yellow-700"
                            }
    `}
                    >
                        {factura.estadoSII || "SIN CONSULTAR"}
                    </button>

                    {factura._showEstadoMenu && (
                        <div className="absolute left-1/2 z-50 mt-2 w-36 -translate-x-1/2 rounded-md border border-slate-200 bg-white shadow-lg">
                            {estados.map((estado) => (
                                <button
                                    key={estado}
                                    onClick={async () => {
                                        try {
                                            await apiFetch(`/cotizaciones/facturas/${factura.id_factura}/estado`, {
                                                method: "PATCH",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ estado })
                                            });

                                            setCotizaciones(prev =>
                                                prev.map(cot =>
                                                    cot.id === c.id
                                                        ? {
                                                            ...cot,
                                                            facturas: cot.facturas.map(f =>
                                                                f.id_factura === factura.id_factura
                                                                    ? {
                                                                        ...f,
                                                                        estadoSII: estado as EstadoDTE,
                                                                        _showEstadoMenu: false
                                                                    }
                                                                    : f
                                                            )
                                                        }
                                                        : cot
                                                )
                                            );

                                            showSuccess("Estado actualizado");
                                        } catch (error) {
                                            handleApiError(error, "Error actualizando estado");
                                        }
                                    }}
                                    className="block w-full px-3 py-2 text-left text-xs hover:bg-slate-100"
                                >
                                    {estado}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderEstadoButton = (c: CotRow) => (
        <div className="inline-block text-left">
            <button
                className={`
                    px-3 py-1 rounded-full text-xs font-semibold transition
                    ${c.estado === "BORRADOR"
                        ? "bg-yellow-100 text-yellow-700"
                        : c.estado === "APROBADA"
                            ? "bg-green-100 text-green-700"
                            : c.estado === "RECHAZADA"
                                ? "bg-red-100 text-red-700"
                                : c.estado === EstadoCotizacionGestioo.FACTURADA
                                    ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white"
                                    : "bg-gray-100 text-gray-600"
                    }
                `}
                onClick={(e) => {
                    e.stopPropagation();
                    setCotizaciones(prev =>
                        prev.map(cot =>
                            cot.id === c.id
                                ? { ...cot, _showEstadoMenu: !cot._showEstadoMenu }
                                : cot
                        )
                    );
                }}
            >
                {formatEstado(c.estado)}
            </button>

            {c._showEstadoMenu && (
                <div
                    className="absolute left-1/2 z-50 mt-2 w-36 -translate-x-1/2 rounded-md border border-slate-200 bg-white shadow-lg"
                    onClick={(e) => e.stopPropagation()}
                >
                    {[
                        EstadoCotizacionGestioo.BORRADOR,
                        EstadoCotizacionGestioo.APROBADA,
                        EstadoCotizacionGestioo.RECHAZADA,
                    ].map((estado) => (
                        <button
                            key={estado}
                            onClick={() => {
                                handleChangeEstado(c, estado);
                                setCotizaciones(prev =>
                                    prev.map(cot =>
                                        cot.id === c.id
                                            ? { ...cot, _showEstadoMenu: false }
                                            : cot
                                    )
                                );
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                        >
                            {formatEstado(estado)}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );

    const renderActionButtons = (c: CotRow, mobile = false) => (
        <div className={mobile ? "grid grid-cols-3 gap-2" : "flex justify-center gap-2"}>
            <button
                onClick={async () => {
                    const data = await apiFetch(`/cotizaciones/${c.id}`);
                    setSelectedCotizacion(data.data);
                    setShowViewModal(true);
                }}
                className={mobile ? "rounded-xl border border-blue-200 p-2 text-blue-600 hover:bg-blue-50" : "text-sm text-blue-600 hover:text-blue-800"}
                title="Ver cotización"
            >
                <EyeOutlined />
            </button>

            <button
                onClick={() => handlePreviewRealPDF(c)}
                className={mobile ? "rounded-xl border border-indigo-200 p-2 text-indigo-600 hover:bg-indigo-50" : "text-sm text-indigo-600 hover:text-indigo-800"}
                title="Generar PDF"
            >
                <PrinterOutlined />
            </button>
            <button
                onClick={async () => {
                    try {
                        const data = await apiFetch(`/cotizaciones/${c.id}`);
                        setSelectedCotizacion(data.data || data);
                        setShowSendMailModal(true);
                    } catch (err) {
                        handleApiError(err, 'Error al preparar envío');
                    }
                }}
                className={mobile ? "rounded-xl border border-yellow-200 p-2 text-yellow-600 hover:bg-yellow-50" : "text-sm text-yellow-600 hover:text-yellow-800"}
                title="Enviar correo"
            >
                <MailOutlined />
            </button>
            {!isCliente && (
                <>
                    <button
                        onClick={() => {
                            setShowViewModal(false);
                            openEditModal(c);
                        }}
                        className={mobile ? "rounded-xl border border-green-200 p-2 text-green-600 hover:bg-green-50" : "text-green-600 hover:text-green-800"}
                        title="Editar"
                    >
                        <EditOutlined />
                    </button>

                    <button
                        onClick={() => duplicarCotizacion(c)}
                        className={mobile ? "rounded-xl border border-purple-200 p-2 text-purple-600 hover:bg-purple-50" : "text-sm text-purple-600 hover:text-purple-800"}
                        title="Duplicar cotización"
                    >
                        <CopyOutlined />
                    </button>

                    <button
                        onClick={() => handleDelete(c.id)}
                        className={mobile ? "rounded-xl border border-red-200 p-2 text-red-600 hover:bg-red-50" : "text-sm text-red-600 hover:text-red-800"}
                        title="Eliminar"
                    >
                        <DeleteOutlined />
                    </button>
                </>
            )}
        </div>
    );

    // Render principal
    return (
        <div className="min-h-screen relative bg-gradient-to-b from-white via-white to-cyan-50">
            <div className="mx-auto mt-4 w-full max-w-screen-2xl px-3 pb-10 pt-16 sm:mt-8 sm:px-6 sm:pt-6 lg:px-8">
                {/* CARD PRINCIPAL - TÍTULO, BUSCADOR Y FILTROS */}
                <section className="rounded-2xl border border-cyan-200 bg-white px-4 py-5 shadow-sm sm:px-6 sm:py-6">
                    {/* Encabezado */}
                    <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-200 bg-cyan-50">
                                <FileTextOutlined className="text-xl text-cyan-600" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">
                                    Cotizaciones
                                </h1>
                                <p className="text-sm text-slate-500">
                                    Gestión y seguimiento de cotizaciones.
                                </p>
                                <div className="mt-3">
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('list')}
                                            className={`px-3 py-1 rounded-full text-sm ${activeTab==='list' ? 'bg-cyan-100 text-cyan-800' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                                        >
                                            Cotizaciones
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('enviadas')}
                                            className={`px-3 py-1 rounded-full text-sm ${activeTab==='enviadas' ? 'bg-cyan-100 text-cyan-800' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                                        >
                                            Cotizaciones Enviadas
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-3">
                            {activeTab === 'list' && (
                            <button
                                type="button"
                                onClick={() => fetchCotizaciones(page)}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-cyan-300 bg-white px-4 py-2 text-sm text-cyan-700 transition hover:bg-cyan-50 sm:w-auto"
                            >
                                <ReloadOutlined className="text-xs" />
                                <span>Recargar</span>
                            </button>
                            )}
                            {!isCliente && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setShowCotizacionesMasivasManager(true)}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-purple-300 bg-white px-5 py-2.5 text-sm font-semibold text-purple-700 transition hover:bg-purple-50 sm:w-auto"
                                    >
                                        <FileTextOutlined className="text-base" />
                                        Masivas / Plantillas
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            resetForm();
                                            setShowCreateModal(true);
                                        }}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-600 to-cyan-600 px-6 py-2.5 text-sm font-semibold text-white shadow-[0_3px_10px_rgba(0,0,0,0.15)] transition-all duration-200 hover:from-emerald-700 hover:to-cyan-700 sm:w-auto"
                                    >
                                        <PlusOutlined className="text-base" />
                                        Crear
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Buscador — solo visible en tab de cotizaciones */}
                    {activeTab === 'list' && (
                    <div className="mt-2">
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <SearchOutlined />
                            </span>
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Buscar cotización, cliente o estado..."
                                className="w-full rounded-full border border-cyan-100 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 placeholder-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                            />
                        </div>
                    </div>
                    )}

                    {/* Filtros */}
                    <div className="mt-5">
                        {activeTab === 'list' ? (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                                        Filtrar por Origen
                                    </label>
                                    <select
                                        value={filtrosHistorial.origen}
                                        onChange={(e) =>
                                            setFiltrosHistorial(prev => ({ ...prev, origen: e.target.value }))
                                        }
                                        className="w-full rounded-full border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-700 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                    >
                                        <option value="">Todos los orígenes</option>
                                        <option value="RIDS">RIDS</option>
                                        <option value="ECONNET">ECONNET</option>
                                        <option value="OTRO">OTRO</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                                        Filtrar por Estado
                                    </label>
                                    <select
                                        value={filtrosHistorial.estado}
                                        onChange={(e) =>
                                            setFiltrosHistorial(prev => ({ ...prev, estado: e.target.value }))
                                        }
                                        className="w-full rounded-full border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-700 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                    >
                                        <option value="">Todos los estados</option>
                                        <option value={EstadoCotizacionGestioo.BORRADOR}>Borrador</option>
                                        <option value={EstadoCotizacionGestioo.APROBADA}>Aprobada</option>
                                        <option value={EstadoCotizacionGestioo.RECHAZADA}>Rechazada</option>
                                        <option value={EstadoCotizacionGestioo.FACTURADA}>Facturación</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                                        Filtrar por Técnico
                                    </label>

                                    <select
                                        value={filtrosHistorial.tecnico || ""}
                                        onChange={(e) =>
                                            setFiltrosHistorial(prev => ({
                                                ...prev,
                                                tecnico: e.target.value
                                            }))
                                        }
                                        className="w-full rounded-full border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-700 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                    >
                                        <option value="">Todos los técnicos</option>
                                        {tecnicos.map(t => (
                                            <option key={t.id_tecnico} value={t.id_tecnico}>
                                                {t.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                                        Filtrar por Mes
                                    </label>

                                    <input
                                        type="month"
                                        value={filtroMes}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setFiltroMes(value);
                                            setPage(1);

                                            if (!value) {
                                                fetchCotizaciones(1);
                                                return;
                                            }
                                        }}
                                        className="w-full rounded-full border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-700 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="bg-cyan-50 border border-cyan-100 rounded-xl p-4">
                                <div className="flex flex-col md:flex-row md:items-center gap-4">
                                        <div className="flex items-center w-full rounded-full bg-white border border-cyan-100 px-3 py-1">
                                            <input
                                                type="text"
                                                placeholder="Buscar cotización, cliente o estado..."
                                                className="flex-1 bg-transparent outline-none text-sm text-slate-700 px-3 py-2"
                                                value={envSearch}
                                                onChange={(e) => {
                                                    setEnvSearch(e.target.value);
                                                    dispatchCotEnviadasFilters({ search: e.target.value });
                                                }}
                                            />
                                            <button className="inline-flex items-center justify-center rounded-full bg-cyan-600 text-white p-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                                                </svg>
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <select className="rounded-full border border-slate-300 px-3 py-1 text-sm bg-white" value={envFilterCliente} onChange={(e) => { setEnvFilterCliente(e.target.value); dispatchCotEnviadasFilters({ filterCliente: e.target.value }); }}>
                                                <option value="">Cliente</option>
                                                {envClientesOptions.map(c => (<option key={c} value={c}>{c}</option>))}
                                            </select>

                                            <select className="rounded-full border border-slate-300 px-3 py-1 text-sm bg-white" value={envFilterGenero} onChange={(e) => { setEnvFilterGenero(e.target.value); dispatchCotEnviadasFilters({ filterGenero: e.target.value }); }}>
                                                <option value="">Generado Por</option>
                                                {envGenerosOptions.map(g => (<option key={g} value={g}>{g}</option>))}
                                            </select>

                                            <select className="rounded-full border border-slate-300 px-3 py-1 text-sm bg-white" value={envFilterEnviadoPor} onChange={(e) => { setEnvFilterEnviadoPor(e.target.value); dispatchCotEnviadasFilters({ filterEnviadoPor: e.target.value }); }}>
                                                <option value="">Enviado Por</option>
                                                {envEnviadosOptions.map(s => (<option key={s} value={s}>{s}</option>))}
                                            </select>

                                            <input type="month" className="rounded-full border border-slate-300 px-3 py-1 text-sm bg-white" value={envMonth} onChange={(e) => { setEnvMonth(e.target.value); dispatchCotEnviadasFilters({ dateRange: e.target.value ? [e.target.value, e.target.value] : null }); }} />

                                            <button onClick={() => window.dispatchEvent(new CustomEvent('cotizacionesEnviadas:refresh'))} className="inline-flex items-center gap-2 rounded-full px-4 py-2 border border-cyan-200 text-cyan-700 bg-white hover:bg-cyan-50">Recargar</button>
                                        </div>
                                    </div>
                            </div>
                        )}
                    </div>
                </section>
                

                <SendCotizacionModal show={showSendMailModal} onClose={() => setShowSendMailModal(false)} cotizacion={showSendMailModal ? selectedCotizacion : null} />

                {/* Mostrar la vista de Cotizaciones Enviadas dentro de la misma página cuando esté activa */}
                {activeTab === 'enviadas' && (
                    <section className="mt-6">
                        <CotizacionesEnviadas />
                    </section>
                )}

                {/* LISTADO */}
                {activeTab === 'list' && (
                <section className="mt-6">
                    <div className="overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-sm">
                        {/* MOBILE */}
                        <div className="block md:hidden">
                            {cotizaciones.length === 0 ? (
                                <div className="py-6 text-center text-sm text-gray-500">
                                    Sin resultados.
                                </div>
                            ) : (
                                <div className="divide-y divide-cyan-100">
                                    {cotizaciones.map((c: CotRow) => (
                                        <div key={c.id} className="px-4 py-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="text-base font-semibold text-slate-800">
                                                        Cotización #{c.id}
                                                    </div>
                                                    <div className="mt-1 text-sm text-slate-500">
                                                        {new Date(c.fecha).toLocaleDateString("es-CL")}
                                                    </div>
                                                </div>

                                                <div className="relative shrink-0">
                                                    {renderEstadoButton(c)}
                                                </div>
                                            </div>

                                            <div className="mt-3 space-y-1 text-sm text-slate-600">
                                                <div><b>Técnico:</b> {c.tecnico?.nombre || "---"}</div>
                                                <div><b>Cliente:</b> {c.entidad?.nombre || "---"}</div>
                                                <div>
                                                    <b>Total:</b>{" "}
                                                    {formatearPrecio(
                                                        c.total,
                                                        c.moneda || "CLP",
                                                        c.tasaCambio ?? 1
                                                    )}
                                                </div>
                                                {!isCliente && (
                                                    <div>
                                                        <b>Factura:</b>{" "}
                                                        <span className="inline-block align-middle">
                                                            {renderFacturaContent(c)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-4">
                                                {renderActionButtons(c, true)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* DESKTOP */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full min-w-[1100px] divide-y divide-gray-200">
                                <thead className="bg-cyan-50">
                                    <tr>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">
                                            N°
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">
                                            Fecha Cotización
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">
                                            Estado
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">
                                            Cotización generado por:
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">
                                            Cliente
                                        </th>
                                        {!isCliente && (
                                            <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">
                                                Factura
                                            </th>
                                        )}
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">
                                            Total
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-200">
                                    {cotizaciones.map((c: CotRow) => (
                                        <tr key={c.id} className="transition hover:bg-cyan-50">
                                            <td className="px-4 py-3 text-center text-sm font-semibold text-slate-700">
                                                {c.id}
                                            </td>

                                            <td className="px-4 py-3 text-center text-sm text-slate-600">
                                                {new Date(c.fecha).toLocaleDateString("es-CL")}
                                            </td>

                                            <td className="relative px-4 py-3 text-center">
                                                {renderEstadoButton(c)}
                                            </td>

                                            <td className="px-4 py-3 text-center text-sm text-slate-700">
                                                {c.tecnico?.nombre || "---"}
                                            </td>

                                            <td className="px-4 py-3 text-center text-sm text-slate-700">
                                                {c.entidad?.nombre || "---"}
                                            </td>
                                            {!isCliente && (
                                                <td className="px-4 py-3 text-center text-sm">
                                                    {renderFacturaContent(c)}
                                                </td>
                                            )}

                                            <td className="whitespace-nowrap px-4 py-3 text-center text-sm font-bold text-slate-900">
                                                {formatearPrecio(
                                                    c.total,
                                                    c.moneda || "CLP",
                                                    c.tasaCambio ?? 1
                                                )}
                                            </td>

                                            <td className="px-4 py-3 text-center">
                                                {renderActionButtons(c, false)}
                                            </td>
                                        </tr>
                                    ))}

                                    {cotizaciones.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={9}
                                                className="py-6 text-center text-sm text-gray-500"
                                            >
                                                Sin resultados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="flex flex-col gap-3 border-t border-cyan-100 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <span className="whitespace-nowrap text-xs text-slate-500">
                                Mostrando {cotizaciones.length} de {totalCotizaciones} cotizaciones
                            </span>

                            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:justify-end">
                                <button
                                    onClick={() => fetchCotizaciones(page - 1)}
                                    disabled={page <= 1}
                                    className="rounded-lg border border-cyan-200 px-3 py-1.5 text-sm text-cyan-700 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    ← Anterior
                                </button>

                                {(() => {
                                    const visiblePages: (number | "...")[] = [];

                                    const start = Math.max(1, page - 1);
                                    const end = Math.min(totalPages, page + 1);

                                    if (start > 1) {
                                        visiblePages.push(1);
                                        if (start > 2) visiblePages.push("...");
                                    }

                                    for (let i = start; i <= end; i++) {
                                        visiblePages.push(i);
                                    }

                                    if (end < totalPages) {
                                        if (end < totalPages - 1) visiblePages.push("...");
                                        visiblePages.push(totalPages);
                                    }

                                    return visiblePages.map((p, idx) =>
                                        p === "..." ? (
                                            <span
                                                key={`e-${idx}`}
                                                className="px-1 text-sm text-slate-400"
                                            >
                                                …
                                            </span>
                                        ) : (
                                            <button
                                                key={p}
                                                onClick={() => fetchCotizaciones(p)}
                                                className={`h-8 w-8 rounded-lg text-sm font-medium transition ${page === p
                                                    ? "bg-cyan-600 text-white shadow-sm"
                                                    : "border border-cyan-200 text-cyan-700 hover:bg-cyan-50"
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        )
                                    );
                                })()}

                                <button
                                    onClick={() => {
                                        const next = page + 1;
                                        setPage(next);
                                        fetchCotizaciones(next);
                                    }}
                                    disabled={page >= totalPages}
                                    className="rounded-lg border border-cyan-200 px-3 py-1.5 text-sm text-cyan-700 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Siguiente →
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
                )}
            </div>

            {/* Agregar el nuevo modal */}
            <GenerarPDFModal
                show={showGenerarPDFModal}
                onClose={() => setShowGenerarPDFModal(false)}
                cotizacion={selectedCotizacion}
                onPreviewPDF={handlePDFPreview}
            />

            {/* MODALES */}
            <ViewCotizacionModal
                show={showViewModal}
                cotizacion={selectedCotizacion}
                onClose={() => {
                    setShowViewModal(false);
                }}
                pdfURL={null}
            />

            <ViewCotizacionModal
                show={showPdfViewerModal}
                cotizacion={selectedCotizacion}
                onClose={() => {
                    setShowPdfViewerModal(false);
                    setPdfURL(null);
                }}
                pdfURL={pdfURL}
            />
            {!isCliente && (
                <CotizacionesMasivasManager
                    show={showCotizacionesMasivasManager}
                    onClose={() => setShowCotizacionesMasivasManager(false)}
                    entidades={entidades}
                    productos={productosCatalogo}
                    onReloadCotizaciones={() => fetchCotizaciones(1)}
                    showSuccess={showSuccess}
                    handleApiError={handleApiError}
                    apiFetch={apiFetch}
                    fetchCatalogo={fetchCatalogo}
                    fetchEntidades={fetchEntidades}
                />
            )}
            {!isCliente && (
                <CreateCotizacionModal
                    show={showCreateModal}
                    onClose={() => {
                        setShowCreateModal(false);
                        resetForm();
                    }}
                    formData={formData}
                    setFormData={setFormData}
                    items={items}
                    setItems={setItems}
                    entidades={entidades}
                    filtroOrigen={filtroOrigen}
                    setFiltroOrigen={setFiltroOrigen}
                    onCargarProductos={cargarProductos}
                    onCargarServicios={cargarServicios}
                    onAddItem={handleAddItem}
                    onUpdateItem={handleUpdateItem}
                    onRemoveItem={handleRemoveItem}
                    onCrearCotizacion={handleCreateCotizacion}
                    onCrearEmpresa={() => setShowNewEmpresaModal(true)}
                    onCrearProducto={() => {
                        setShowNewProductoModal(true);
                        document.body.classList.add("modal-nested-open");
                    }}
                    onCrearPersona={() => setShowNewEntidadModal(true)}
                    onEditarPersona={(entidad) => {
                        setEntidadParaEditar(entidad);
                        setNombre(entidad.nombre);
                        setRut(entidad.rut ?? "");
                        setCorreo(entidad.correo ?? "");
                        setTelefono(entidad.telefono ?? "");
                        setDireccion(entidad.direccion ?? "");
                        setShowEditEntidadModal(true);
                    }}
                    onEditarProducto={abrirEditarProductoDesdeCotizacion}
                    onEditarServicio={editarItem}
                    onCrearServicio={() => { setShowCreateServicioModal(true); }}
                    totales={totales}
                    apiLoading={apiLoading}
                    onAbrirCrearEquipo={(item) => handleAbrirCrearEquipoDesdeItem(item, false)}
                    onAbrirSeleccionEquipo={(item) => handleAbrirSeleccionEquipo(item, false)}
                    onVincularEquipo={handleVincularEquipoAItem}
                />)}
            {!isCliente && (
                <EditCotizacionModal
                    show={showEditModal}
                    cotizacion={selectedCotizacion}
                    onGenerarPDF={(cotizacionActualizada) => {
                        setSelectedCotizacion(cotizacionActualizada);
                        setShowGenerarPDFModal(true);
                    }}
                    onClose={() => setShowEditModal(false)}
                    onUpdate={handleUpdateCotizacion}
                    onCargarProductos={cargarProductos}
                    onCargarServicios={cargarServicios}
                    onUpdateCotizacion={setSelectedCotizacion}
                    apiLoading={apiLoading}
                    onCrearProducto={() => {
                        setShowNewProductoModal(true);
                        document.body.classList.add("modal-nested-open");
                    }}
                    onEditarProducto={abrirEditarItem}
                    onItemChange={handleItemChange}
                    onAbrirCrearEquipo={(item) => handleAbrirCrearEquipoDesdeItem(item, true)}
                    onVincularEquipo={handleVincularEquipoAItem}
                    onAbrirSeleccionEquipo={(item) => handleAbrirSeleccionEquipo(item, true)}
                        
                />)}

            <SelectProductoModal
                show={showSelectorProducto}
                onClose={() => setShowSelectorProducto(false)}
                productos={productosCatalogo}
                filtros={filtrosProductos}
                onFiltroChange={(filtro, value) =>
                    setFiltrosProductos(prev => ({ ...prev, [filtro]: value }))
                }
                onLimpiarFiltros={() =>
                    setFiltrosProductos({
                        texto: "",
                        codigo: "",
                        precioMin: "",
                        precioMax: "",
                        categoria: ""
                    })
                }
                onAgregarProducto={
                    showEditModal
                        ? agregarProductoEnEdicion
                        : agregarProducto
                }
                onEliminarProducto={handleEliminarProducto}
                orden={ordenProducto}
                onOrdenChange={setOrdenProducto}
                categoriasDisponibles={categoriasDisponibles}
            />

            <SelectServicioModal
                show={showSelectorServicio}
                onClose={() => setShowSelectorServicio(false)}
                servicios={serviciosCatalogo}
                filtros={filtrosServicios}
                onFiltroChange={(filtro, value) =>
                    setFiltrosServicios(prev => ({ ...prev, [filtro]: value }))
                }
                onLimpiarFiltros={() =>
                    setFiltrosServicios({
                        texto: "",
                        codigo: "",
                        precioMin: "",
                        precioMax: "",
                        categoria: ""
                    })
                }
                onAgregarServicio={agregarServicio}
            />

            <EditProductoModal
                onBackToSelector={() => {
                    setShowEditProductoModal(false);

                    if (origenEditProducto === "catalogo") {
                        setShowSelectorProducto(true);
                    }

                    setOrigenEditProducto(null);
                }}
                show={showEditProductoModal}
                producto={productoAEditar}
                onClose={() => setShowEditProductoModal(false)}
                onSave={handleEditarProducto}
                apiLoading={apiLoading}
                onUpdateRealTime={(itemActualizado) => {
                    if (selectedCotizacion && showEditModal) {
                        const itemsActualizados = selectedCotizacion.items.map(i =>
                            i.id === itemActualizado.id
                                ? { ...i, ...itemActualizado }
                                : i
                        );

                        setSelectedCotizacion({
                            ...selectedCotizacion,
                            items: itemsActualizados
                        });
                    }

                    if (showCreateModal) {
                        setItems(prev =>
                            prev.map(i =>
                                i.id === itemActualizado.id
                                    ? { ...i, ...itemActualizado }
                                    : i
                            )
                        );
                    }
                }}
            />

            <NewEntidadModal
                show={showNewEntidadModal}
                onClose={() => setShowNewEntidadModal(false)}
                onSubmit={handleCrearPersona}
                formData={{ nombre, rut, correo, telefono, direccion }}
                onFormChange={(field, value) => {
                    if (field === "nombre") setNombre(value);
                    if (field === "rut") setRut(value);
                    if (field === "correo") setCorreo(value);
                    if (field === "telefono") setTelefono(value);
                    if (field === "direccion") setDireccion(value);
                }}
                apiLoading={apiLoading}
            />

            <EditEntidadModal
                show={showEditEntidadModal}
                entidad={entidadParaEditar}
                onClose={() => setShowEditEntidadModal(false)}
                onSubmit={handleEditarPersona}
                formData={{ nombre, rut, correo, telefono, direccion }}
                onFormChange={(field, value) => {
                    if (field === "nombre") setNombre(value);
                    if (field === "rut") setRut(value);
                    if (field === "correo") setCorreo(value);
                    if (field === "telefono") setTelefono(value);
                    if (field === "direccion") setDireccion(value);
                }}
                apiLoading={apiLoading}
            />

            <NewEmpresaModal
                show={showNewEmpresaModal}
                onClose={() => setShowNewEmpresaModal(false)}
                onSubmit={handleCrearEmpresa}
                formData={empresaForm}
                onFormChange={(field, value) =>
                    setEmpresaForm(prev => ({ ...prev, [field]: value }))
                }
                apiLoading={apiLoading}
            />

            <NewProductoModal
                show={showNewProductoModal}
                onClose={() => {
                    setShowNewProductoModal(false);

                    setProductoForm({
                        nombre: "",
                        descripcion: "",
                        precio: 0,
                        porcGanancia: 30,
                        precioTotal: 0,
                        categoria: "",
                        stock: 0,
                        serie: "",
                        imagen: "",
                        imagenFile: null,
                    });

                    document.body.classList.remove("modal-nested-open");
                }}
                onSubmit={handleCrearProducto}
                formData={productoForm}
                onFormChange={(field, value) =>
                    setProductoForm(prev => ({ ...prev, [field]: value }))
                }
                categoriasDisponibles={categoriasDisponibles}
                apiLoading={loadingCrearProducto}
            />

            <NewServicioModal
                show={showCreateServicioModal}
                onClose={() => setShowCreateServicioModal(false)}
                onSave={async (servicioCreado) => {
                    try {
                        const resp = await apiFetch("/servicios-gestioo", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(servicioCreado),
                        });

                        const servicioReal = resp.data;

                        setServiciosCatalogo(prev => [...prev, servicioReal]);
                        setShowCreateServicioModal(false);

                        showSuccess("Servicio creado correctamente");

                    } catch (error) {
                        handleApiError(error, "Error al crear servicio");
                    }
                }}
                apiLoading={apiLoading}
            />

            <CrearEquipoModal
                open={showCrearEquipoDesdeItem}
                onClose={() => {
                    setShowCrearEquipoDesdeItem(false);
                    setItemParaEquipo(null);
                }}
                defaultValues={{
                    serial: itemParaEquipo?.sku ?? undefined,
                    precioVenta: itemParaEquipo?.precio,
                }}
                onCreated={handleEquipoCreado}
            />

            <SelectEquipoModal
                show={showSelectEquipo}
                equipos={equiposDisponibles}
                loading={loadingEquipos}
                onClose={() => {
                    setShowSelectEquipo(false);
                    setItemEquipoActual(null);
                }}
                onSelect={handleSeleccionarEquipoExistente}
            />

            {/* Toast */}
            {toast && (
                <motion.div
                    initial={{ y: -40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -40, opacity: 0 }}
                    className={`
                        fixed left-3 right-3 top-3 z-[99999]
                        flex items-center gap-3 rounded-xl px-4 py-3
                        text-white shadow-[0_10px_40px_rgba(0,0,0,0.3)]
                        sm:left-auto sm:right-5 sm:top-5
                        ${toast.type === "success" ? "bg-green-600" : "bg-rose-600"}
                    `}
                >
                    {toast.type === "success" ? (
                        <CheckCircleOutlined className="text-xl" />
                    ) : (
                        <CloseCircleOutlined className="text-xl" />
                    )}
                    <span className="font-medium">{toast.message}</span>
                </motion.div>
            )}
        </div>
    );
};

export default Cotizaciones;