import React, { useEffect, useState, useRef, useCallback } from "react";
import { Select } from "antd";
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
    CopyOutlined
} from "@ant-design/icons";
import { motion } from "framer-motion";
import Header from "../components/Header";
import { useApi } from "../components/modals/UseApi";
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
} from "../components/modals";
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
} from "../components/modals/types";
import {
    TipoCotizacionGestioo,
    ItemTipoGestioo,
    EstadoCotizacionGestioo
} from "../components/modals/types";
import {
    calcularTotales,
    formatEstado,
    formatTipo,
    formatearPrecio,
    validarCotizacion,
    normalizarItemCotizacion,
    calcularLineaItem
} from "../components/modals/utils";

type CotRow = CotizacionGestioo & {
    _showEstadoMenu?: boolean;
};

// Función para mostrar errores
const showError = (msg: string) => {
    alert(msg); // <- reemplaza con tu showToast si quieres
};

const Cotizaciones: React.FC = () => {

    // === ESTADOS PRINCIPALES ===
    const [cotizaciones, setCotizaciones] = useState<CotRow[]>([]);
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
        tipo: ""
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

        const raw = error.message || defaultMessage;

        // Mapeo de errores comunes → mensajes claros
        let userMessage = defaultMessage;

        if (raw.includes("ECONNET") && raw.includes("enum")) {
            userMessage = "El origen seleccionado no es válido. Intente usar: RIDS, ECONNET o OTRO.";
        }

        if (raw.includes("Unique constraint") || raw.includes("unique")) {
            userMessage = "El RUT ya existe. No se pueden duplicar entidades.";
        }

        if (raw.includes("not-null")) {
            userMessage = "Falta un campo obligatorio. Por favor complete todos los datos.";
        }

        if (raw.includes("500") || raw.includes("Internal Server Error")) {
            userMessage = "Ocurrió un error interno. Por favor inténtelo de nuevo.";
        }

        setToast({ type: "error", message: userMessage });

        setTimeout(() => setToast(null), 5000);
    }, []);


    const showSuccess = useCallback((message: string) => {
        setToast({ type: "success", message });
        setTimeout(() => setToast(null), 3000);
    }, []);

    // === EFECTOS ===
    useEffect(() => {
        fetchCotizaciones();
        fetchEntidades();
    }, []);

    useEffect(() => {
        if (showCreateModal) {
            fetchCatalogo();
        }
    }, [showCreateModal]);

    // === FUNCIONES PRINCIPALES ===
    const fetchCotizaciones = async () => {
        try {
            const data = await apiFetch("/cotizaciones");
            const rows = Array.isArray(data.data) ? data.data : [];
            const normalizadas = rows.map((c: any) => ({
                ...c,
                moneda: c.moneda || "CLP",
                tasaCambio: c.tasaCambio ?? 1,
            }));
            setCotizaciones(normalizadas);
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
        } catch (error) {
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
    const handleChangeEstado = async (cot: CotizacionGestioo, nuevoEstado: EstadoCotizacionGestioo) => {
        try {
            // 1️⃣ Actualizar backend
            const updated = await apiFetch(`/cotizaciones/${cot.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...cot,
                    estado: nuevoEstado
                }),
            });

            // 2️⃣ Actualizar tabla sin recargar todo
            setCotizaciones(prev =>
                prev.map(c => c.id === cot.id ? updated.data || updated : c)
            );

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

            // ---------------------------------
            // 1️⃣ Generar texto de copia con fecha
            // ---------------------------------
            const fecha = new Date().toLocaleDateString("es-CL"); // DD/MM/YYYY
            const etiquetaCopia = `(Copia ${fecha})`;

            const comentarioOriginal = cot.comentariosCotizacion || "";

            // Evitar duplicar etiquetas si ya tiene "(Copia …)"
            const comentarioCopia = comentarioOriginal.includes("(Copia")
                ? comentarioOriginal
                : `${comentarioOriginal} ${etiquetaCopia}`.trim();

            // ---------------------------------
            // 2️⃣ Armar payload para crear nueva cotización
            // ---------------------------------
            const payload = {
                tipo: cot.tipo,
                estado: EstadoCotizacionGestioo.BORRADOR,
                entidadId: cot.entidadId,
                moneda: cot.moneda,
                tasaCambio: cot.tasaCambio ?? 1,
                personaResponsable: cot.personaResponsable ?? null,

                // ⭐ Comentario con "(Copia DD/MM/YYYY)"
                comentariosCotizacion: comentarioCopia,

                // Copiar secciones
                secciones: cot.secciones?.map((s) => ({
                    nombre: s.nombre,
                    descripcion: s.descripcion ?? "",
                    orden: s.orden ?? 0
                })) ?? [],

                items: cot.items.map(item =>
                    normalizarItemCotizacion(item, cot.moneda, cot.tasaCambio ?? 1)
                ),

            };

            // ---------------------------------
            // 3️⃣ Crear en el backend
            // ---------------------------------
            const nueva = await apiFetch("/cotizaciones", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const clon = nueva.data;

            // 🔥 NORMALIZAR ANTES DE ABRIR
            const moneda = clon.moneda || "CLP";
            const tasa = moneda === "USD" ? clon.tasaCambio ?? 1 : 1;

            const clonNormalizado = {
                ...clon,
                items: clon.items.map((item: any) =>
                    normalizarItemCotizacion(item, moneda, tasa)
                )
            };

            // 👇 recién aquí abrir modal
            setSelectedCotizacion(clonNormalizado);
            setShowEditModal(true);

            showSuccess(`Cotización duplicada correctamente (#${clon.id})`);

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
            await fetchCotizaciones();

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
        setSelectedCotizacion(cot);
        setShowGenerarPDFModal(true);
    };

    // Función para manejar el resultado del modal
    const handlePDFPreview = (url: string) => {
        setPdfURL(url);
        setShowViewModal(true);
    };


    // === FILTROS ===
    const q = query.toLowerCase();
    const filtered: CotRow[] = cotizaciones.filter((c) => {
        const nombre = c.entidad?.nombre?.toLowerCase() || "";
        const estado = c.estado?.toLowerCase() || "";
        const tipo = c.tipo?.toLowerCase() || "";

        const matchSearch =
            nombre.includes(q) ||
            estado.includes(q) ||
            tipo.includes(q) ||
            String(c.id).includes(query);

        const matchOrigen =
            filtrosHistorial.origen ? c.entidad?.origen === filtrosHistorial.origen : true;

        const matchEstado =
            filtrosHistorial.estado ? c.estado === filtrosHistorial.estado : true;

        const matchTipo =
            filtrosHistorial.tipo ? c.tipo === filtrosHistorial.tipo : true;

        return matchSearch && matchOrigen && matchEstado && matchTipo;
    });

    const totales = calcularTotales(
        showEditModal && selectedCotizacion
            ? selectedCotizacion.items
            : items
    );

    const totalMostrado = filtered.length;
    const totalCotizaciones = cotizaciones.length;

    return (
        <div className="min-h-screen relative bg-gradient-to-b from-white via-white to-cyan-50">
            <Header />

            <main className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mt-8 pb-10">
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
                                onClick={fetchCotizaciones}
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
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
                                <option value={EstadoCotizacionGestioo.GENERADA}>Generada</option>
                                <option value={EstadoCotizacionGestioo.ENVIADA}>Enviada</option>
                                <option value={EstadoCotizacionGestioo.APROBADA}>Aprobada</option>
                                <option value={EstadoCotizacionGestioo.RECHAZADA}>Rechazada</option>
                            </select>
                        </div>

                        {/* Tipo */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                Filtrar por Tipo
                            </label>
                            <select
                                value={filtrosHistorial.tipo}
                                onChange={(e) =>
                                    setFiltrosHistorial(prev => ({ ...prev, tipo: e.target.value }))
                                }
                                className="w-full rounded-full border border-cyan-100 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                            >
                                <option value="">Todos los tipos</option>
                                <option value={TipoCotizacionGestioo.CLIENTE}>Cliente</option>
                                <option value={TipoCotizacionGestioo.INTERNA}>Interna</option>
                                <option value={TipoCotizacionGestioo.PROVEEDOR}>Proveedor</option>
                            </select>
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
                                        Tipo
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">
                                        Cliente
                                    </th>
                                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">
                                        Origen
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
                                {filtered.map((c: CotRow) => (
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
                                                            : c.estado === "GENERADA"
                                                                ? "bg-blue-100 text-blue-700"
                                                                : c.estado === "ENVIADA"
                                                                    ? "bg-cyan-100 text-cyan-700"
                                                                    : c.estado === "APROBADA"
                                                                        ? "bg-green-100 text-green-700"
                                                                        : c.estado === "RECHAZADA"
                                                                            ? "bg-red-100 text-red-700"
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
                                                            EstadoCotizacionGestioo.GENERADA,
                                                            EstadoCotizacionGestioo.ENVIADA,
                                                            EstadoCotizacionGestioo.APROBADA,
                                                            EstadoCotizacionGestioo.RECHAZADA
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
                                                                className="w-full text-left px-3 py-2 text-sm hover:bg-slate-100"
                                                            >
                                                                {formatEstado(estado)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                            </div>
                                        </td>

                                        <td className="px-4 py-3 text-center text-sm text-slate-700">
                                            {formatTipo(c.tipo)}
                                        </td>

                                        <td className="px-4 py-3 text-center text-sm text-slate-700">
                                            {c.entidad?.nombre || "---"}
                                        </td>

                                        <td className="px-4 py-3 text-center text-sm text-slate-700">
                                            {c.entidad?.origen || "---"}
                                        </td>

                                        <td className="px-4 py-3 text-center text-sm font-bold text-slate-900">
                                            {formatearPrecio(
                                                c.total,
                                                c.moneda || "CLP",
                                                c.tasaCambio ?? 1
                                            )}
                                        </td>

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
                                                    onClick={() => {
                                                        setSelectedCotizacion(c);
                                                        setShowGenerarPDFModal(true);
                                                    }}
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
                                ))}

                                {filtered.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="py-6 text-center text-sm text-gray-500"
                                        >
                                            Sin resultados.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Footer - contador de cotizaciones */}
                        <div className="px-4 py-3 border-t border-cyan-100 bg-white text-center text-xs text-slate-500">
                            Mostrando {totalMostrado} de {totalCotizaciones} cotizaciones
                        </div>
                    </div>
                </section>
            </main>

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
