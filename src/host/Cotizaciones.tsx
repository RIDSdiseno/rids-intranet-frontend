import React, { useEffect, useState, useRef, useCallback } from "react";
import { Select, Tooltip } from "antd";
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
    CopyOutlined,
    ToolOutlined
} from "@ant-design/icons";
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
    NewServicioModal
} from "../components/modals-cotizaciones";
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
import {
    TipoCotizacionGestioo,
    ItemTipoGestioo,
    EstadoCotizacionGestioo
} from "../components/modals-cotizaciones/types";
import {
    calcularTotales,
    formatEstado,
    formatTipo,
    formatearPrecio,
    validarCotizacion,
    normalizarItemCotizacion,
    calcularLineaItem
} from "../components/modals-cotizaciones/utils";

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
        estadoSII: EstadoDTE
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

    const [filtroMes, setFiltroMes] = useState<string>("");

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
    const [filtroOrigen, setFiltroOrigen] = useState("TODOS"); // para modal crear
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

        // 🔥 Traducciones comunes del backend
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

    const fetchTecnicos = async () => {
        try {
            const data = await apiFetch("/tecnicos"); // o tu endpoint real
            setTecnicos(data.data || data);
        } catch (error) {
            handleApiError(error, "Error al cargar técnicos");
        }
    };

    const showSuccess = useCallback((message: string) => {
        setToast({ type: "success", message });
        setTimeout(() => setToast(null), 3000);
    }, []);

    // === EFECTOS ===
    useEffect(() => {
        fetchCotizaciones(1);
        fetchEntidades();
        fetchTecnicos();
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
            setPage(currentPage); // 🔥 importante

        } catch (err) {
            handleApiError(err, "Error al cargar cotizaciones");
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
                descripcion: p.nombre || p.descripcion || "Producto sin nombre",
                precio: p.precio || p.precioBase || p.valor || 0,
                porcGanancia: p.porcGanancia || 0,
                precioTotal: p.precioTotal || p.precio || 0,
                nombre: p.nombre,
                sku: p.serie,
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
                descripcion: p.nombre || p.descripcion || "Producto sin nombre",
                precio: p.precio || p.precioBase || p.valor || 0,
                porcGanancia: p.porcGanancia || 0,
                precioTotal: p.precioTotal || p.precio || 0,
                nombre: p.nombre,
                sku: p.serie,
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


    // === FUNCIONES PARA ITEMS ===
    const handleUpdateItem = (id: number, field: string, value: any) => {
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    };

    const handleRemoveItem = (id: number) => {
        setItems(prev => prev.filter(i => i.id !== id));
    };

    // === NUEVA FUNCIÓN PARA ACTUALIZAR ITEMS EN CREACIÓN O EDICIÓN ===
    const handleItemChange = (index: number, field: string, value: any) => {
        // 🔥 Si estamos editando una cotización existente
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

        // 🔥 Si estamos creando una cotización nueva
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

            // 🔥 Si es error 400 (validación), mostrar mensaje normal
            if (error.message.includes("facturada")) {
                setToast({
                    type: "error",
                    message: error.message
                });
                return;
            }

            // 🔥 Otros errores reales
            handleApiError(error, "Error al eliminar cotización");
        }
    };

    // CREAR COTIZACIÓN
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

            // === 1️⃣ SUBIR IMAGEN DE LA COTIZACIÓN ===
            if (formData.imagenFile) {
                const formDataToSend = new FormData();
                formDataToSend.append("imagen", formData.imagenFile);

                const uploadResp = await apiFetch("/upload-imagenes/upload", {
                    method: "POST",
                    body: formDataToSend
                });

                imagenUrl = uploadResp.secure_url || uploadResp.url || null;
            }

            // === 2️⃣ NORMALIZAR ITEMS → convertir siempre a CLP antes de enviar al backend ===
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

                    // 🔥 CLP REAL
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
                };
            });

            // === 3️⃣ CALCULAR TOTALES REALES EN CLP ===
            const totales = calcularTotales(itemsParaEnviar);


            // === 4️⃣ ARMAR PAYLOAD PARA BACKEND ===
            const cotizacionData = {
                tipo: TipoCotizacionGestioo.CLIENTE,
                estado: EstadoCotizacionGestioo.BORRADOR,
                entidadId: Number(formData.entidadId),

                // 🔥 TOTALES REALES (CLP)
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

            console.log("🔥 Enviando cotización:", cotizacionData);

            // === 5️⃣ ENVIAR AL BACKEND ===
            const data = await apiFetch("/cotizaciones", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cotizacionData)
            });

            // === 6️⃣ ACTUALIZAR LISTA ===
            setCotizaciones(prev => [data.data, ...prev]);
            setShowCreateModal(false);
            resetForm();
            showSuccess("Cotización creada correctamente");

        } catch (error) {
            handleApiError(error, "Error al crear cotización");
        }
    };

    // CAMBIAR ESTADO DE COTIZACIÓN
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

            // 🔥 RECARGAR DESDE BD REAL
            await fetchCotizaciones(page);

            showSuccess("Estado actualizado correctamente");

        } catch (error) {
            handleApiError(error, "Error al cambiar estado");
        }
    };

    // DUPLICAR COTIZACIÓN
    const duplicarCotizacion = async (cot: CotizacionGestioo) => {
        try {

            const confirmar = window.confirm(
                `¿Deseas duplicar la cotización N° ${cot.id} como una copia?`
            );
            if (!confirmar) return;

            // ================================
            // 1️⃣ TRAER COTIZACIÓN COMPLETA
            // ================================

            const res = await apiFetch(`/cotizaciones/${cot.id}`);
            const cotCompleta = res.data;

            if (!cotCompleta.items || cotCompleta.items.length === 0) {
                showError("La cotización no tiene items para duplicar");
                return;
            }

            // ================================
            // 2️⃣ GENERAR TEXTO DE COPIA
            // ================================

            const fecha = new Date().toLocaleDateString("es-CL");

            const comentarioCopia =
                `(Copia de cotización #${cotCompleta.id} - ${fecha}) ` +
                (cotCompleta.comentariosCotizacion || "");

            // ================================
            // 3️⃣ NORMALIZAR ITEMS
            // ================================

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

            // ================================
            // 4️⃣ CARGAR FORMULARIO
            // ================================

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

            // ================================
            // 5️⃣ ABRIR MODAL CREAR
            // ================================

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
            // ================================
            // 1️⃣ VALIDACIONES
            // ================================
            const errores = validarCotizacion(selectedCotizacion);
            if (errores.length > 0) {
                handleApiError(
                    { message: errores.join("\n") },
                    "Errores de validación"
                );
                return;
            }

            // ================================
            // 2️⃣ MONEDA Y TASA
            // ================================
            const moneda = selectedCotizacion.moneda || "CLP";
            const tasaCambio =
                moneda === "USD"
                    ? Number(selectedCotizacion.tasaCambio) || 1
                    : 1;

            // ================================
            // 3️⃣ NORMALIZAR ITEMS (ÚNICA VEZ)
            // ================================
            const itemsNormalizados = selectedCotizacion.items.map(item =>
                normalizarItemCotizacion(item, moneda, tasaCambio)
            );

            // ================================
            // 4️⃣ CALCULAR TOTALES (CLP REAL)
            // ================================
            const { total } = calcularTotales(itemsNormalizados as any);

            // ================================
            // 5️⃣ ARMAR PAYLOAD FINAL
            // ================================
            const cotizacionData = {
                tipo: selectedCotizacion.tipo,
                estado: selectedCotizacion.estado,
                entidadId: selectedCotizacion.entidadId,
                fecha: selectedCotizacion.fecha,
                total,                       // 👈 CLP REAL
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

            // Actualizar entidad si fue modificada
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

            // ================================
            // 6️⃣ ENVIAR AL BACKEND
            // ================================
            const updated = await apiFetch(
                `/cotizaciones/${selectedCotizacion.id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(cotizacionData),
                }
            );

            // ================================
            // 7️⃣ ACTUALIZAR UI
            // ================================
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
                cotizacionId: 0, // o lo que uses en creación
                tipo: ItemTipoGestioo.PRODUCTO,

                nombre: productoReal.nombre,                     // 👈 NOMBRE
                descripcion: productoReal.descripcion ?? "",     // 👈 DESCRIPCIÓN

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
            id: Date.now(), // id local del ítem
            cotizacionId: 0, // o el real si lo tienes
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

            // 🔥🔥🔥 CLAVE ABSOLUTA
            servicioId: servicio.id,   // 👈 ID REAL DE ServicioGestioo

            productoId: null,
            createdAt: new Date().toISOString(),
        };

        setItems(prev => [...prev, newItem]);
        setShowSelectorServicio(false);
        showSuccess("Servicio agregado correctamente");
    };


    // === FUNCIONES PARA EDITAR ITEMS ===
    const abrirEditarItem = (item: CotizacionItemGestioo) => {
        // 🟦 PRODUCTO
        if (item.tipo === ItemTipoGestioo.PRODUCTO) {
            abrirEditarProducto(item, "cotizacion");
            return;
        }

        // 🟩 SERVICIO
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
        console.log("🔧 Abrir editar producto:", data, "origen:", origen);

        setOrigenEditProducto(origen);

        // =====================================================
        // 1️⃣ Resolver productoId y item (si viene desde cotización)
        // =====================================================
        const productoId = data.productoId;

        const item =
            origen === "cotizacion" && "id" in data ? data : null;

        // =====================================================
        // 2️⃣ Buscar producto en catálogo
        // =====================================================
        let producto = productosCatalogo.find(p => p.id === productoId);

        // Fallback por SKU (casos antiguos)
        if (!producto && item?.sku) {
            producto = productosCatalogo.find(
                p => p.sku === item.sku || p.serie === item.sku
            );

            // 🔥 Si lo encontramos, sincronizamos el productoId en la cotización
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

        // =====================================================
        // 3️⃣ Validación final
        // =====================================================
        if (!producto) {
            setToast({
                type: "error",
                message:
                    "Este ítem no tiene un producto asociado. Debe volver a agregarlo desde el catálogo."
            });
            setTimeout(() => setToast(null), 4000);
            return;
        }

        // =====================================================
        // 4️⃣ Preparar producto para edición
        // =====================================================
        setProductoAEditar({
            ...producto,

            // 👇 Prioridad: datos del ítem → catálogo
            nombre: item?.nombre ?? producto.nombre,
            descripcion: item?.descripcion ?? producto.descripcion ?? "",

            // Costos
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

        // =====================================================
        // 5️⃣ Abrir modal correcto
        // =====================================================
        setShowSelectorProducto(false);
        setShowEditProductoModal(true);
    };

    const abrirEditarProductoDesdeCatalogo = (data: { productoId: number }) => {
        abrirEditarProducto(data, "catalogo");
    };

    const abrirEditarProductoDesdeCotizacion = (item: CotizacionItemGestioo) => {
        abrirEditarProducto(item, "cotizacion");
    };

    // 🌟 Sincronizador global de productos
    const syncProductoEnSistema = (producto: any) => {

        // 1️⃣ Actualizar catálogo local
        setProductosCatalogo(prev =>
            prev.map(p =>
                p.id === producto.id ? { ...p, ...producto } : p
            )
        );

        // 2️⃣ Si estás editando una cotización
        setSelectedCotizacion(prev => {
            if (!prev) return prev;

            const actualizado: CotizacionGestioo = {
                ...prev,
                items: prev.items.map(i =>
                    i.productoId === producto.id
                        ? {
                            ...i,
                            productoId: producto.id,

                            // 🔥 ACTUALIZAR AMBOS CAMPOS
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

        // 3️⃣ Si estás creando una cotización
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

    // Sincronizador global de productos
    const handleEditarProducto = async (productoData: any) => {
        try {
            if (!productoAEditar?.id) {
                return showError("No se puede editar: producto sin ID.");
            }

            // 1️⃣ Guardar cambios en backend
            await apiFetch(`/productos-gestioo/${productoAEditar.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(productoData),
            });

            // 2️⃣ Obtener producto actualizado REAL desde backend
            const resp = await apiFetch(`/productos-gestioo/${productoAEditar.id}`);
            const productoReal = resp.data;

            // 3️⃣ Sincronizar en TODO el sistema (catálogo, cotización, creación)
            syncProductoEnSistema(productoReal);

            // 4️⃣ Mensaje de éxito
            showSuccess("Producto actualizado correctamente");

            // 5️⃣ Cerrar modal de edición
            setShowEditProductoModal(false);

        } catch (error) {
            handleApiError(error, "Error al actualizar producto");
        }
    };

    // Agregar producto a cotización en edición
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

    // Eliminar producto del catálogo
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

    // Editar ítem (producto o servicio) desde la cotización
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

    // Crear empresa
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
        try {
            // 1️⃣ Agregar al catálogo local
            setProductosCatalogo(prev => [...prev, {
                id: productoFinal.id,
                tipo: "PRODUCTO",
                descripcion: productoFinal.descripcion || productoFinal.nombre,
                precio: productoFinal.precioTotal || productoFinal.precio,
                porcGanancia: productoFinal.porcGanancia,
                precioTotal: productoFinal.precioTotal,
                nombre: productoFinal.nombre,
                sku: productoFinal.serie,
                categoria: productoFinal.categoria,
                imagen: productoFinal.imagen || null
            }]);

            // 2️⃣ Si estamos editando una cotización → agregar el item automáticamente
            if (showEditModal && selectedCotizacion) {

                const nuevoItem: any = {
                    id: Date.now(),                       // temporal
                    tipo: "PRODUCTO",
                    descripcion: productoFinal.nombre,
                    cantidad: 1,
                    precio: productoFinal.precioTotal,    // precio mostrado
                    precioCosto: productoFinal.precio,    // costo real CLP
                    porcGanancia: productoFinal.porcGanancia,
                    porcentaje: 0,
                    tieneIVA: true,
                    tieneDescuento: false,
                    sku: productoFinal.serie,
                    seccionId: 1,                         // 🔥 sección fija
                    imagen: productoFinal.imagen || null,

                    // Campos usados por tus cálculos
                    precioOriginalCLP: productoFinal.precioTotal,
                };

                setSelectedCotizacion(prev => ({
                    ...prev!,
                    items: [...prev!.items, nuevoItem]    // TS ya no reclama
                }));
            }

            // 3️⃣ Cerrar modal
            setShowNewProductoModal(false);

            // 4️⃣ Reset formulario
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

            // 5️⃣ Mostrar éxito
            showSuccess("Producto creado correctamente");

        } catch (error) {
            handleApiError(error, "Error al procesar el nuevo producto");
        }
    };

    // === MODAL EDICIÓN COTIZACIÓN ===
    const openEditModal = async (cotizacion: CotizacionGestioo) => {
        try {
            console.log("🔥 Cotización recibida:", cotizacion);

            // ================================
            // 1️⃣ ASEGURAR CATÁLOGO
            // ================================
            await fetchCatalogo();

            // ================================
            // 2️⃣ OBTENER ITEMS (fallback seguro)
            // ================================
            let items: any[] = [];

            if (!cotizacion.items || !Array.isArray(cotizacion.items) || cotizacion.items.length === 0) {
                items = await recargarItemsCotizacion(cotizacion.id);
            } else {
                items = cotizacion.items;
            }

            // ================================
            // 3️⃣ MONEDA Y TASA
            // ================================
            const moneda = cotizacion.moneda || "CLP";
            const tasaCambio =
                moneda === "USD"
                    ? Number(cotizacion.tasaCambio) || 1
                    : 1;

            // ================================
            // 4️⃣ NORMALIZAR ITEMS (ÚNICA VEZ)
            // ================================
            const itemsNormalizados = items.map(item =>
                normalizarItemCotizacion(item, moneda, tasaCambio)
            );

            // ================================
            // 5️⃣ ARMAR COTIZACIÓN PARA EDICIÓN
            // ================================
            const cotizacionEditable: CotizacionGestioo = {
                ...cotizacion,
                moneda,
                tasaCambio,
                comentariosCotizacion:
                    cotizacion.comentariosCotizacion ?? "",
                imagen: cotizacion.imagen ?? null,
                items: itemsNormalizados,
            };

            // ================================
            // 6️⃣ ABRIR MODAL
            // ================================
            setSelectedCotizacion(cotizacionEditable);
            setShowEditModal(true);

        } catch (error) {
            handleApiError(error, "Error al cargar cotización para editar");
        }
    };

    const recargarItemsCotizacion = async (cotizacionId: number) => {
        try {
            const data = await apiFetch(`/cotizaciones/${cotizacionId}`);
            const items = data.data?.items || data.items || data.data?.cotizacion?.items || data.cotizacion?.items || [];
            return items;
        } catch (error) {
            handleApiError(error, "Error al recargar items");
            return [];
        }
    };

    const [showGenerarPDFModal, setShowGenerarPDFModal] = useState(false);
    const [pdfURL, setPdfURL] = useState<string | null>(null);

    // Nueva función simplificada para vista previa
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

    // Función para manejar el resultado del modal
    const handlePDFPreview = (url: string) => {
        setPdfURL(url);
        setShowViewModal(true);
    };


    // === FILTROS ===
    const q = query.toLowerCase();

    const totales = calcularTotales(
        showEditModal && selectedCotizacion
            ? selectedCotizacion.items
            : items
    );

    return (
        <div className="min-h-screen relative bg-gradient-to-b from-white via-white to-cyan-50">

            <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mt-8 pb-10">
                {/* CARD PRINCIPAL - TÍTULO, BUSCADOR Y FILTROS */}
                <section className="bg-white border border-cyan-200 rounded-2xl shadow-sm px-6 py-6">
                    {/* Encabezado */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center">
                                <FileTextOutlined className="text-cyan-600 text-xl" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">
                                    Cotizaciones
                                </h1>
                                <p className="text-sm text-slate-500">
                                    Gestión y seguimiento de cotizaciones.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => fetchCotizaciones(page)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-300 bg-white text-cyan-700 text-sm hover:bg-cyan-50 transition"
                            >

                                <ReloadOutlined className="text-xs" />
                                <span>Recargar</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    resetForm();
                                    setShowCreateModal(true);
                                }}
                                className="
        inline-flex items-center gap-2 px-6 py-2.5
        rounded-full text-white font-semibold text-sm
        bg-gradient-to-r from-emerald-600 to-cyan-600
        shadow-[0_3px_10px_rgba(0,0,0,0.15)]
        hover:from-emerald-700 hover:to-cyan-700
        transition-all duration-200
    "
                            >
                                <PlusOutlined className="text-base" />
                                Crear
                            </button>

                        </div>
                    </div>

                    {/* Buscador */}
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
                                className="w-full pl-10 pr-4 py-2.5 rounded-full border border-cyan-100 bg-white text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                            />
                        </div>
                    </div>

                    {/* Filtros por origen / estado / tipo */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-5">
                        {/* Origen */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Filtrar por Origen
                            </label>
                            <select
                                value={filtrosHistorial.origen}
                                onChange={(e) =>
                                    setFiltrosHistorial(prev => ({ ...prev, origen: e.target.value }))
                                }
                                className="w-full rounded-full border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                            >
                                <option value="">Todos los orígenes</option>
                                <option value="RIDS">RIDS</option>
                                <option value="ECONNET">ECONNET</option>
                                <option value="OTRO">OTRO</option>
                            </select>
                        </div>

                        {/* Estado */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Filtrar por Estado
                            </label>
                            <select
                                value={filtrosHistorial.estado}
                                onChange={(e) =>
                                    setFiltrosHistorial(prev => ({ ...prev, estado: e.target.value }))
                                }
                                className="w-full rounded-full border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                            >
                                <option value="">Todos los estados</option>
                                <option value={EstadoCotizacionGestioo.BORRADOR}>Borrador</option>
                                <option value={EstadoCotizacionGestioo.APROBADA}>Aprobada</option>
                                <option value={EstadoCotizacionGestioo.RECHAZADA}>Rechazada</option>
                                <option value={EstadoCotizacionGestioo.FACTURADA}>Facturación</option>
                            </select>
                        </div>

                        {/* Técnico */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
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
                                className="w-full rounded-full border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                            >
                                <option value="">Todos los técnicos</option>
                                {tecnicos.map(t => (
                                    <option key={t.id_tecnico} value={t.id_tecnico}>
                                        {t.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Mes */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Filtrar por Mes
                            </label>

                            <input
                                type="month"
                                value={filtroMes}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setFiltroMes(value);
                                    setPage(1); // 👈 reset página

                                    if (!value) {
                                        fetchCotizaciones(1);
                                        return;
                                    }

                                    const [year, month] = value.split("-");
                                    const fechaDesde = `${year}-${month}-01`;
                                    const fechaHasta = new Date(Number(year), Number(month), 0)
                                        .toISOString().split("T")[0];
                                }}
                                className="w-full rounded-full border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                            />
                        </div>

                    </div>
                </section>

                {/* TABLA DE COTIZACIONES */}
                <section className="mt-6">
                    <div className="border border-cyan-200 rounded-2xl bg-white shadow-sm overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
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
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">
                                        Factura
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">
                                        Total
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-200">
                                {cotizaciones.map((c: CotRow) => {
                                    const factura = c.facturas?.[0];   // 🔥 AGREGAR ESTA LÍNEA

                                    return (
                                        <tr key={c.id} className="hover:bg-cyan-50 transition">
                                            <td className="px-4 py-3 text-center text-sm font-semibold text-slate-700">
                                                {c.id}
                                            </td>

                                            <td className="px-4 py-3 text-center text-sm text-slate-600">
                                                {new Date(c.fecha).toLocaleDateString("es-CL")}
                                            </td>

                                            <td className="px-4 py-3 text-center relative">
                                                <div className="inline-block text-left">

                                                    {/* CHIP VISUAL (lo que ya tenías) */}
                                                    <button
                                                        className={`
        px-3 py-1 rounded-full text-xs font-semibold 
        transition
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

                                                    {/* MENÚ DESPLEGABLE */}
                                                    {c._showEstadoMenu && (
                                                        <div
                                                            className="absolute left-1/2 -translate-x-1/2 mt-2 w-36 bg-white shadow-lg rounded-md border border-slate-200 z-50"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {[
                                                                EstadoCotizacionGestioo.BORRADOR,
                                                                EstadoCotizacionGestioo.APROBADA,
                                                                EstadoCotizacionGestioo.RECHAZADA,
                                                            ]
                                                                .map((estado) => (
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
                                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100"
                                                                    >
                                                                        {formatEstado(estado)}
                                                                    </button>
                                                                ))}
                                                        </div>
                                                    )}

                                                </div>
                                            </td>

                                            {/* Técnico */}
                                            <td className="px-4 py-3 text-center text-sm text-slate-700">
                                                {c.tecnico?.nombre || "---"}
                                            </td>

                                            {/* Cliente */}
                                            <td className="px-4 py-3 text-center text-sm text-slate-700">
                                                {c.entidad?.nombre || "---"}
                                            </td>

                                            {/* Factura */}
                                            <td className="px-4 py-3 text-center text-sm">
                                                {factura ? (
                                                    <div className="flex flex-col items-center gap-1">

                                                        {/* Folio */}
                                                        <span className="font-semibold text-cyan-800">
                                                            Folio: {factura.folioSII}
                                                        </span>

                                                        {/* Tipo DTE */}
                                                        <span className="text-xs text-slate-500">
                                                            {getTipoDTELabel(factura.tipoDTE)}
                                                        </span>

                                                        {/* Estado SII */}
                                                        <div className="relative inline-block">

                                                            {/* CHIP */}
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

                                                            {/* MENÚ */}
                                                            {factura._showEstadoMenu && (
                                                                <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-36 bg-white shadow-lg rounded-md border border-slate-200 z-50">
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
                                                                            className="block w-full text-left px-3 py-2 text-xs hover:bg-slate-100"
                                                                        >
                                                                            {estado}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Consultar SII 
                                                        {factura.trackId ? (
                                                            <button
                                                                onClick={async () => {
                                                                    try {
                                                                        await apiFetch(
                                                                            `/cotizaciones/facturas/${factura.id_factura}/consultar-sii`,
                                                                            { method: "POST" }
                                                                        );

                                                                        await fetchCotizaciones(page);
                                                                        showSuccess("Estado actualizado desde SII");

                                                                    } catch (error) {
                                                                        handleApiError(error, "Error al consultar SII");
                                                                    }
                                                                }}
                                                                className="text-indigo-600 hover:text-indigo-800 text-xs"
                                                            >
                                                                Consultar SII
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-gray-400">
                                                                Sin seguimiento SII
                                                            </span>
                                                        )} */}

                                                    </div>
                                                ) : (
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
                                                                        folioSII: folio,                // 🔥 CAMBIO AQUÍ
                                                                        tipoDTE: Number(tipoDTE),
                                                                        rutEmisor: "76758352-4"         // 🔥 AGREGA ESTO (tu empresa)
                                                                    })
                                                                });

                                                                await fetchCotizaciones(page);
                                                                showSuccess("Factura vinculada correctamente");

                                                            } catch (error) {
                                                                handleApiError(error, "Error al vincular factura");
                                                            }
                                                        }}
                                                        className="text-blue-600 hover:text-blue-800 text-xs"
                                                    >
                                                        Vincular factura
                                                    </button>
                                                )}
                                            </td>

                                            {/* Total */}
                                            <td className="px-4 py-3 text-center text-sm font-bold text-slate-900 whitespace-nowrap">
                                                {formatearPrecio(
                                                    c.total,
                                                    c.moneda || "CLP",
                                                    c.tasaCambio ?? 1
                                                )}
                                            </td>

                                            {/* Acciones */}
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex justify-center gap-2">
                                                    {/* Ver - ahora abre el modal de generar PDF */}
                                                    <button
                                                        onClick={() => handlePreviewRealPDF(c)}
                                                        className="text-blue-600 hover:text-blue-800 text-sm"
                                                    >
                                                        <EyeOutlined />
                                                    </button>

                                                    {/* Imprimir - ahora abre el modal de generar PDF */}
                                                    <button
                                                        onClick={() => handlePreviewRealPDF(c)}
                                                        className="text-indigo-600 hover:text-indigo-800 text-sm"
                                                        title="Generar PDF"
                                                    >
                                                        <PrinterOutlined />
                                                    </button>

                                                    {/* Editar */}
                                                    <button
                                                        onClick={() => {
                                                            setShowViewModal(false); // 🔥 CIERRA EL MODAL DE VISTA
                                                            openEditModal(c);        // luego abre el modal de edición
                                                        }}
                                                        className="text-green-600 hover:text-green-800"
                                                    >
                                                        <EditOutlined />
                                                    </button>

                                                    {/* Duplicar */}
                                                    <button
                                                        onClick={() => duplicarCotizacion(c)}
                                                        className="text-purple-600 hover:text-purple-800 text-sm"
                                                        title="Duplicar cotización"
                                                    >
                                                        <CopyOutlined />
                                                    </button>
                                                    {/*
                                                    {factura && (
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    await apiFetch(`/cotizaciones/facturas/${factura.id_factura}/consultar-sii`, {
                                                                        method: "POST",
                                                                    });

                                                                    await fetchCotizaciones(page);
                                                                    showSuccess("Estado actualizado desde SII");

                                                                } catch (error) {
                                                                    handleApiError(error, "Error al consultar SII");
                                                                }
                                                            }}
                                                            className="text-indigo-600 hover:text-indigo-800 text-xs"
                                                        >
                                                            Consultar SII
                                                        </button>
                                                    )} */}
                                                    {/*
                                                    {factura && factura.estado === "PENDIENTE" && (
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    await apiFetch(`/cotizaciones/facturas/${factura.id_factura}/pagar`, {
                                                                        method: "POST",
                                                                    });

                                                                    await fetchCotizaciones(page);
                                                                    showSuccess("Factura marcada como pagada");
                                                                } catch (error) {
                                                                    handleApiError(error, "Error al marcar como pagada");
                                                                }
                                                            }}
                                                            className="text-emerald-600 hover:text-emerald-800 text-sm"
                                                            title="Marcar como pagada"
                                                        >
                                                            <CheckCircleOutlined />
                                                        </button>
                                                    )} */}

                                                    {/* Emitir factura - SOLO SI ESTÁ APROBADA Y NO TIENE FACTURA VINCULADA */}
                                                    {c.estado === EstadoCotizacionGestioo.APROBADA &&
                                                        (!c.facturas || c.facturas.length === 0) && (
                                                            <button
                                                                onClick={async () => {
                                                                    if (!window.confirm("¿Desea emitir factura electrónica?")) return;

                                                                    try {
                                                                        await apiFetch(`/cotizaciones/${c.id}/emitir-sii`, {
                                                                            method: "POST",
                                                                        });

                                                                        await fetchCotizaciones(page);

                                                                        showSuccess("Factura emitida correctamente");

                                                                    } catch (error) {
                                                                        handleApiError(error, "Error al emitir factura");
                                                                    }
                                                                }}
                                                                className="text-purple-600 hover:text-purple-800 text-sm"
                                                                title="Emitir Factura"
                                                            >
                                                                <FileTextOutlined />
                                                            </button>
                                                        )}
                                                    {/*
                                                    {factura && factura.estado !== "ANULADA" && (
                                                        <button
                                                            onClick={async () => {
                                                                if (!window.confirm("¿Seguro que deseas anular esta factura?"))
                                                                    return;

                                                                try {
                                                                    await apiFetch(`/cotizaciones/${factura.id_factura}/anular`, {
                                                                        method: "POST",
                                                                    });

                                                                    await fetchCotizaciones(page);
                                                                    showSuccess("Factura anulada correctamente");

                                                                } catch (error) {
                                                                    handleApiError(error, "Error al anular factura");
                                                                }
                                                            }}
                                                            className="text-red-600 hover:text-red-800 text-sm"
                                                            title="Anular factura"
                                                        >
                                                            Anular
                                                        </button>
                                                    )} */}

                                                    {/* Eliminar */}
                                                    <button
                                                        onClick={() => handleDelete(c.id)}
                                                        className="text-red-600 hover:text-red-800 text-sm"
                                                    >
                                                        <DeleteOutlined />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

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
                    {/* Footer - contador de cotizaciones */}
                    <div className="px-4 py-3 border-t border-cyan-100 bg-white flex items-center justify-between gap-4">
                        {/* Contador */}
                        <span className="text-xs text-slate-500 whitespace-nowrap">
                            Mostrando {cotizaciones.length} de {totalCotizaciones} cotizaciones
                        </span>

                        {/* Paginador */}
                        <div className="flex items-center gap-1.5">
                            {/* Anterior */}
                            <button
                                onClick={() => fetchCotizaciones(page - 1)}
                                disabled={page <= 1}
                                className="px-3 py-1.5 rounded-lg border border-cyan-200 text-sm text-cyan-700 hover:bg-cyan-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                            >
                                ← Anterior
                            </button>

                            {/* Números */}
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
                                            className="px-1 text-slate-400 text-sm"
                                        >
                                            …
                                        </span>
                                    ) : (
                                        <button
                                            key={p}
                                            onClick={() => fetchCotizaciones(p)}
                                            className={`w-8 h-8 rounded-lg text-sm font-medium transition ${page === p
                                                ? "bg-cyan-600 text-white shadow-sm"
                                                : "border border-cyan-200 text-cyan-700 hover:bg-cyan-50"
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    )
                                );
                            })()}

                            {/* Siguiente */}
                            <button
                                onClick={() => {
                                    const next = page + 1;
                                    setPage(next);
                                    fetchCotizaciones(next);
                                }}
                                disabled={page >= totalPages}
                                className="px-3 py-1.5 rounded-lg border border-cyan-200 text-sm text-cyan-700 hover:bg-cyan-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                            >
                                Siguiente →
                            </button>
                        </div>
                    </div>
                </section>
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
                    setPdfURL(null); // 👈 limpiar PDF al cerrar
                }}
                pdfURL={pdfURL}
            />

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

                    // 🔥 Bloquea scroll del modal padre
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
            />

            <EditCotizacionModal
                show={showEditModal}
                cotizacion={selectedCotizacion}
                onGenerarPDF={() => setShowGenerarPDFModal(true)}
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
            />
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
                // 👇 USAR FUNCIÓN DIFERENTE SEGÚN EL CONTEXTO
                onAgregarProducto={
                    showEditModal
                        ? agregarProductoEnEdicion  // 👈 modo edición
                        : agregarProducto           // 👈 modo creación
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
                // 👇 NUEVO CALLBACK PARA ACTUALIZACIÓN EN TIEMPO REAL
                onUpdateRealTime={(itemActualizado) => {
                    if (selectedCotizacion && showEditModal) {
                        const itemsActualizados = selectedCotizacion.items.map(i =>
                            i.id === itemActualizado.id
                                ? { ...i, ...itemActualizado }
                                : i
                        );

                        setSelectedCotizacion({
                            ...selectedCotizacion,
                            items: itemsActualizados // ✅ Usa los items actualizados
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

                    // 🔥 RESET FORM
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
                apiLoading={apiLoading}
            />

            <NewServicioModal
                show={showCreateServicioModal}
                onClose={() => setShowCreateServicioModal(false)}
                onSave={async (servicioCreado) => {
                    try {
                        // 1️⃣ Guardar en backend
                        const resp = await apiFetch("/servicios-gestioo", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(servicioCreado),
                        });

                        const servicioReal = resp.data;

                        // 2️⃣ Actualizar catálogo
                        setServiciosCatalogo(prev => [...prev, servicioReal]);

                        // 3️⃣ Cerrar modal
                        setShowCreateServicioModal(false);

                        showSuccess("Servicio creado correctamente");

                    } catch (error) {
                        handleApiError(error, "Error al crear servicio");
                    }
                }}
                apiLoading={apiLoading}
            />

            {/* Toast */}
            {toast && (
                <motion.div
                    initial={{ y: -40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -40, opacity: 0 }}
                    className={`
            fixed top-5 right-5 
            z-[99999]  /* 🔥 Mayor que cualquier modal */
            flex items-center gap-3 
            px-4 py-3 rounded-xl 
            shadow-[0_10px_40px_rgba(0,0,0,0.3)]
            text-white 
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
