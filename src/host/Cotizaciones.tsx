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
    PrinterOutlined
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
    EditServicioModal,
    NewEntidadModal,
    EditEntidadModal,
    NewEmpresaModal,
    NewProductoModal
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
    Toast
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
    validarCotizacion
} from "../components/modals/utils";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const Cotizaciones: React.FC = () => {

    // === REF PARA IMPRESIÓN ===
    const printRef = useRef<HTMLDivElement | null>(null);

    // === ESTADOS PRINCIPALES ===
    const [cotizaciones, setCotizaciones] = useState<CotizacionGestioo[]>([]);
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
    const [ordenServicio, setOrdenServicio] = useState("asc");

    // === HOOKS PERSONALIZADOS ===
    const { fetchApi: apiFetch, loading: apiLoading } = useApi();
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

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
            descripcion: tipo === ItemTipoGestioo.ADICIONAL ? "Descuento adicional" : "Nuevo item",
            cantidad: 1,
            precio: 0,
            porcentaje: 0,                 // Siempre 0 al inicio
            tieneIVA: false,
            tieneDescuento: false,         // 👈 nuevo campo
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

    const handleCreateCotizacion = async () => {
        if (!formData.entidadId) {
            handleApiError(null, "Debe seleccionar una entidad");
            return;
        }

        // Verificar que haya al menos un item en alguna sección
        const totalItems = items.length;
        if (totalItems === 0) {
            handleApiError(null, "Debe agregar al menos un item en alguna sección");
            return;
        }

        try {
            let imagenUrl = null;

            // === 1️⃣ SUBIR IMAGEN DE LA COTIZACIÓN SI EXISTE ===
            if (formData.imagenFile) {
                const formDataToSend = new FormData();
                formDataToSend.append("imagen", formData.imagenFile);

                const uploadResp = await apiFetch("/upload-imagenes/upload", {
                    method: "POST",
                    body: formDataToSend
                });

                // Cloudinary devuelve 'url' o 'secure_url'
                imagenUrl = uploadResp.secure_url || uploadResp.url || null;
                console.log("✅ Imagen de cotización subida:", imagenUrl);
            }

            const { total } = calcularTotales(items as any[]);

            // Preparar items para enviar, incluyendo información de sección E IMAGEN
            const itemsParaEnviar = items.map(item => ({
                tipo: item.tipo,
                descripcion: item.descripcion,
                cantidad: item.cantidad,
                precio: item.precio,
                porcentaje: item.porcentaje || null,
                tieneIVA: item.tieneIVA || false,
                sku: item.sku || null,
                precioCosto: item.precioCosto,
                porcGanancia: item.porcGanancia,
                seccionId: item.seccionId,
                tieneDescuento: item.tieneDescuento || false,
                imagen: item.imagen || null,  // <-- INCLUIR IMAGEN DEL PRODUCTO
            }));

            const cotizacionData = {
                tipo: TipoCotizacionGestioo.CLIENTE,
                estado: EstadoCotizacionGestioo.BORRADOR,
                entidadId: Number(formData.entidadId),
                total,
                moneda: formData.moneda,
                tasaCambio: formData.moneda === "USD" ? Number(formData.tasaCambio || 1) : 1,
                items: itemsParaEnviar,
                comentariosCotizacion: formData.comentariosCotizacion.trim() || null,
                secciones: formData.secciones,
                personaResponsable: formData.personaResponsable || null,
                imagen: imagenUrl  // <-- IMAGEN DE LA COTIZACIÓN
            };

            console.log("Enviando cotización:", cotizacionData);

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

    const handleUpdateCotizacion = async () => {
        if (!selectedCotizacion) {
            handleApiError(null, "No hay cotización seleccionada");
            return;
        }

        try {
            const errores = validarCotizacion(selectedCotizacion);
            if (errores.length > 0) {
                handleApiError({ message: errores.join("\n") }, "Errores de validación");
                return;
            }

            const { total: totalCalculado } = calcularTotales(selectedCotizacion.items);
            const moneda = selectedCotizacion.moneda || "CLP";
            const tasaCambio = moneda === "USD" ? Number(selectedCotizacion.tasaCambio) || 1 : 1;

            const itemsConvertidos = selectedCotizacion.items.map(item => {
                let precioFinal = Number(item.precio);
                if (moneda === "USD") {
                    precioFinal = Number(item.precio) / tasaCambio;

                }

                return {
                    tipo: item.tipo,
                    descripcion: item.descripcion.trim(),
                    cantidad: Number(item.cantidad),
                    precio: precioFinal,
                    porcentaje: item.porcentaje !== null && item.porcentaje !== undefined
                        ? Number(item.porcentaje)
                        : null,
                    tieneIVA: item.tieneIVA || false,
                    sku: item.sku || null,
                    tieneDescuento: item.tieneDescuento || false,
                };
            });

            const cotizacionData = {
                tipo: selectedCotizacion.tipo,
                estado: selectedCotizacion.estado,
                entidadId: selectedCotizacion.entidadId,
                total: totalCalculado,
                fecha: selectedCotizacion.fecha,
                moneda,
                tasaCambio,
                entidad: {
                    id: selectedCotizacion.entidad!.id,
                    nombre: selectedCotizacion.entidad!.nombre.trim(),
                    rut: selectedCotizacion.entidad!.rut?.trim() || null,
                    correo: selectedCotizacion.entidad!.correo?.trim() || null,
                    telefono: selectedCotizacion.entidad!.telefono?.trim() || null,
                    direccion: selectedCotizacion.entidad!.direccion?.trim() || null,
                    origen: selectedCotizacion.entidad!.origen
                },
                items: itemsConvertidos,
                comentariosCotizacion: selectedCotizacion.comentariosCotizacion?.trim() || null,
            };

            const cotizacionActualizada = await apiFetch(
                `/cotizaciones/${selectedCotizacion.id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(cotizacionData)
                }
            );

            setCotizaciones(prev =>
                prev.map(c =>
                    c.id === selectedCotizacion.id
                        ? cotizacionActualizada.data || cotizacionActualizada
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
            // 1️⃣ Traer el producto REAL desde el backend (SIEMPRE incluye imagen correcta)
            const resp = await apiFetch(`/productos-gestioo/${producto.id}`);
            const productoReal = resp.data;

            const newItem = {
                id: Date.now(),
                tipo: ItemTipoGestioo.PRODUCTO,
                descripcion: productoReal.nombre,
                cantidad: 1,
                precio: productoReal.precioTotal || productoReal.precio,
                precioCosto: productoReal.precio,
                porcGanancia: productoReal.porcGanancia,
                porcentaje: 0,
                tieneIVA: true,
                tieneDescuento: false,
                sku: productoReal.serie,
                seccionId: formData.seccionActiva,

                // 2️⃣ AHORA SIEMPRE TENDRÁS LA IMAGEN CORRECTA
                imagen: productoReal.imagen || null,
            };

            setItems(prev => [...prev, newItem]);
            setShowSelectorProducto(false);
            showSuccess("Producto agregado correctamente");

        } catch (error) {
            handleApiError(error, "No se pudo cargar la imagen del producto");
        }
    };


    const agregarServicio = (servicio: any) => {
        const newItem = {
            id: Date.now(),
            tipo: ItemTipoGestioo.SERVICIO,
            descripcion: servicio.nombre,
            cantidad: 1,
            precio: servicio.precio || 0,
            porcentaje: 0,
            tieneIVA: false,
            tieneDescuento: false,         // 👈 nuevo
            seccionId: formData.seccionActiva
        };

        setItems(prev => [...prev, newItem]);
        setShowSelectorServicio(false);
        showSuccess("Servicio agregado correctamente");
    };

    const abrirEditarProducto = (producto: any) => {
        setProductoAEditar(producto);
        setShowSelectorProducto(false);
        setShowEditProductoModal(true);
    };

    const handleEditarProducto = async (productoData: any) => {
        try {
            // 1️⃣ Guardar cambios
            const updated = await apiFetch(`/productos-gestioo/${productoAEditar.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(productoData)
            });

            // 2️⃣ Volver a cargar el producto actualizado desde el backend
            const resp = await apiFetch(`/productos-gestioo/${productoAEditar.id}`);
            const productoReal = resp.data;

            // 3️⃣ Actualizamos el catálogo
            setProductosCatalogo(prev =>
                prev.map(p => p.id === productoReal.id ? {
                    ...p,
                    imagen: productoReal.imagen
                } : p)
            );

            setItems(prev =>
                prev.map(i =>
                    i.sku === productoReal.serie
                        ? { ...i, imagen: productoReal.imagen }
                        : i
                )
            );

            showSuccess("Producto actualizado correctamente");
            setShowEditProductoModal(false);
            setShowSelectorProducto(true);

        } catch (error) {
            handleApiError(error, "Error al actualizar producto");
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

    const abrirEditarServicio = (servicio: any) => {
        setServicioAEditar(servicio);
        setShowEditServicioModal(true);
    };

    const handleEditarServicio = async (servicioData: any) => {
        try {
            await apiFetch(`/servicios-gestioo/${servicioAEditar.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(servicioData)
            });

            setServiciosCatalogo(prev =>
                prev.map(s => s.id === servicioAEditar.id ? { ...s, ...servicioData } : s)
            );

            setShowEditServicioModal(false);
            showSuccess("Servicio actualizado correctamente");
        } catch (error: any) {
            handleApiError(error, "Error al actualizar servicio");
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

            // 2️⃣ Cerrar modal
            setShowNewProductoModal(false);

            // 3️⃣ Reset formulario
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

            // 4️⃣ Mostrar éxito
            showSuccess("Producto creado correctamente");

        } catch (error) {
            handleApiError(error, "Error al procesar el nuevo producto");
        }
    };

    // === MODAL EDICIÓN COTIZACIÓN ===
    const openEditModal = async (cotizacion: CotizacionGestioo) => {
        let items: any[] = [];

        try {
            if (!cotizacion.items || !Array.isArray(cotizacion.items) || cotizacion.items.length === 0) {
                items = await recargarItemsCotizacion(cotizacion.id);
            } else {
                items = cotizacion.items;
            }

            const itemsMapeados = items.map((item: any) => ({
                ...item,
                id: item.id,
                cantidad: Number(item.cantidad) || 1,
                precio: Number(item.precio) || 0,
                porcentaje: item.porcentaje !== null && item.porcentaje !== undefined ? Number(item.porcentaje) : null,
                tieneIVA: item.tieneIVA ?? false
            }));

            const nuevaCotizacion = {
                ...cotizacion,
                moneda: cotizacion.moneda || "CLP",
                tasaCambio: cotizacion.tasaCambio ?? 1,
                comentariosCotizacion: cotizacion.comentariosCotizacion ?? "",
                items: itemsMapeados,
            };

            setSelectedCotizacion(nuevaCotizacion);
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

    const handlePrint = async (cot: CotizacionGestioo) => {
        try {
            // ================================
            // FUNCIÓN MEJORADA PARA CONVERTIR IMÁGENES
            // ================================
            async function urlToBase64(url: string | null): Promise<string | null> {
                try {
                    // Verificar si la URL es válida
                    if (!url || !url.startsWith('http')) {
                        console.warn("URL de imagen inválida:", url);
                        return null;
                    }

                    // Crear timeout para evitar bloqueos
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000);

                    // Intentar fetch con diferentes estrategias
                    let response;

                    // Estrategia 1: Intentar con CORS primero
                    try {
                        response = await fetch(url, {
                            signal: controller.signal,
                            mode: 'cors',
                            cache: 'no-cache',
                            headers: {
                                'Accept': 'image/*'
                            }
                        });
                    } catch (corsError) {
                        console.log("CORS falló, intentando sin CORS...");
                        // Estrategia 2: Usar proxy CORS
                        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                        response = await fetch(proxyUrl, {
                            signal: controller.signal,
                            cache: 'no-cache'
                        });
                    }

                    clearTimeout(timeoutId);

                    if (!response || !response.ok) {
                        console.warn("No se pudo cargar la imagen:", url, response?.status);
                        return null;
                    }

                    const blob = await response.blob();

                    if (blob.size === 0) {
                        console.warn("Blob vacío para imagen:", url);
                        return null;
                    }

                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            resolve(reader.result as string);
                        };
                        reader.onerror = () => {
                            console.warn("Error leyendo blob");
                            resolve(null);
                        };
                        reader.readAsDataURL(blob);
                    });

                } catch (error) {
                    console.warn("Error en urlToBase64 para:", url, error);
                    return null;
                }
            }

            // ================================
            // VALIDACIONES
            // ================================
            if (!cot) {
                alert("No hay datos de cotización");
                return;
            }

            if (!cot.items || cot.items.length === 0) {
                alert("No hay items en esta cotización para generar el PDF");
                return;
            }

            // ================================
            // DATOS BASE
            // ================================
            const fechaActual = new Date().toLocaleString("es-CL", {
                dateStyle: "short",
                timeStyle: "short",
            });

            const codigo = `COT-${String(cot.id).padStart(6, "0")}`;

            type OrigenGestiooLocal = "RIDS" | "ECONNET" | "OTRO";

            const ORIGEN_DATA: Record<OrigenGestiooLocal, {
                nombre: string;
                direccion: string;
                correo: string;
                telefono: string;
                logo: string;
                rut: string;
            }> = {
                RIDS: {
                    nombre: "RIDS LTDA",
                    direccion: "Santiago - Providencia, La Concepción 65",
                    correo: "soporte@rids.cl",
                    telefono: "+56 9 8823 1976",
                    rut: "76.758.352-4",
                    logo: "/img/splash.png",
                },
                ECONNET: {
                    nombre: "ECONNET SPA",
                    direccion: "Santiago - Providencia, La Concepción 65",
                    correo: "ventas@econnet.cl",
                    telefono: "+56 9 8807 6593",
                    rut: "76.758.352-4",
                    logo: "/img/ecconetlogo.png",
                },
                OTRO: {
                    nombre: cot.entidad?.nombre ?? "Empresa",
                    direccion: cot.entidad?.direccion ?? "",
                    correo: cot.entidad?.correo ?? "",
                    telefono: cot.entidad?.telefono ?? "",
                    rut: cot.entidad?.rut ?? "",
                    logo: "/img/splash.png",
                },
            };

            const origen = (cot.entidad?.origen ?? "OTRO") as OrigenGestiooLocal;
            const origenInfo = ORIGEN_DATA[origen];

            // ================================
            // FORMATO MONEDA
            // ================================
            const formatPDF = (valorCLP: number) => {
                if (isNaN(valorCLP)) return "$0";

                if (cot.moneda === "USD") {
                    const tasa = cot.tasaCambio || 1;
                    const usd = valorCLP / tasa;
                    return `US$ ${usd.toFixed(2)}`;
                }
                return `$${Math.round(valorCLP).toLocaleString("es-CL")}`;
            };

            // ================================
            // FUNCIÓN PARA CALCULAR VALORES
            // ================================
            const calcularValoresItem = (item: any) => {
                const precio = Number(item.precio) || 0;
                const cantidad = Number(item.cantidad) || 0;
                const porcentaje = item.porcentaje ? Number(item.porcentaje) : 0;

                const base = precio * cantidad;

                const tieneDescuentoValido = item.tieneDescuento && porcentaje > 0;
                const esAdicional = item.tipo === "ADICIONAL";
                const descuentoItem =
                    tieneDescuentoValido && !esAdicional ? (base * porcentaje) / 100 : 0;

                const baseConDescuento = base - descuentoItem;

                const ivaMonto =
                    item.tieneIVA && !esAdicional ? baseConDescuento * 0.19 : 0;

                const totalItem = baseConDescuento + ivaMonto;

                return {
                    base,
                    descuentoItem,
                    baseConDescuento,
                    ivaMonto,
                    totalItem,
                    porcentajeMostrar: tieneDescuentoValido ? porcentaje : 0,
                    ivaPorcentajeMostrar: item.tieneIVA ? 19 : 0,
                };
            };

            // ================================
            // CONVERTIR IMÁGENES A BASE64
            // ================================

            // Convertir imagen principal de la cotización
            const imagenBase64 = await urlToBase64(cot.imagen ?? null);

            // Preparar caché para imágenes de productos (evitar conversiones duplicadas)
            const imagenesCache = new Map<string, string | null>();

            // ================================
            // PROCESAR ÍTEMS CON IMÁGENES
            // ================================
            let seccionesHtml = "";
            let totalGeneral = 0;

            // Función auxiliar para obtener imagen en base64 desde caché
            const obtenerImagenBase64 = async (url: string | null | undefined): Promise<string | null> => {
                if (!url) return null;
                if (imagenesCache.has(url)) return imagenesCache.get(url) || null;

                const base64 = await urlToBase64(url ?? null);
                imagenesCache.set(url, base64);
                return base64;
            };


            // Con secciones
            if (cot.secciones && cot.secciones.length > 0) {
                const seccionesOrdenadas = [...cot.secciones].sort(
                    (a, b) => (a.orden || 0) - (b.orden || 0)
                );

                for (const seccion of seccionesOrdenadas) {
                    const itemsSeccion = cot.items.filter(
                        (item) => item.seccionId === seccion.id
                    );
                    if (itemsSeccion.length === 0) continue;

                    let totalSeccion = 0;

                    const itemsHtmlPromises = itemsSeccion.map(async (item) => {
                        const valores = calcularValoresItem(item);

                        // Obtener imagen en base64 desde caché
                        const imagenItemBase64 = await obtenerImagenBase64(item.imagen ?? null);

                        totalSeccion += valores.totalItem;

                        return `
<tr>
    <td style="padding:8px;border-bottom:1px solid #ddd;text-align:center;">
        ${item.sku || ""}
    </td>
    <td style="padding:8px;border-bottom:1px solid #ddd; display:flex; align-items:center; gap:8px;">
        <span>${item.descripcion}</span>
    </td>
    <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right;">
        ${formatPDF(Number(item.precio) || 0)}
    </td>
    <td style="padding:8px;border-bottom:1px solid #ddd;text-align:center;">
        ${item.cantidad}
    </td>
    <td style="padding:8px;border-bottom:1px solid #ddd;text-align:center;">
        ${valores.porcentajeMostrar}%
    </td>
    <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right;">
        ${formatPDF(valores.descuentoItem)}
    </td>
    <td style="padding:8px;border-bottom:1px solid #ddd;text-align:center;">
        ${valores.ivaPorcentajeMostrar}%
    </td>
    <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right;">
        ${formatPDF(valores.ivaMonto)}
    </td>
    <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right;">
        ${formatPDF(valores.totalItem)}
    </td>
</tr>`;
                    });

                    const itemsHtml = (await Promise.all(itemsHtmlPromises)).join("");
                    totalGeneral += totalSeccion;

                    seccionesHtml += `
    <div style="margin-bottom: 30px;">
        <div style="background:#f8f9fa; padding:10px 15px; border-radius:6px; margin-bottom:15px; border-left:4px solid #007bff;">
            <h3 style="margin:0; font-size:18px; font-weight:bold; color:#333;">${seccion.nombre.toUpperCase()}</h3>
            ${seccion.descripcion
                            ? `<p style="margin:4px 0 0 0; font-size:14px; color:#666;">${seccion.descripcion}</p>`
                            : ""
                        }
        </div>
        
        <table style="width:100%;border-collapse:collapse;font-size:13px; margin-bottom:20px;">
            <thead>
                <tr style="background:#e9ecef;">
                    <th style="padding:8px;text-align:center; border:1px solid #dee2e6;">Código</th>
                    <th style="padding:8px;text-align:left; border:1px solid #dee2e6;">Descripción</th>
                    <th style="padding:8px;text-align:right; border:1px solid #dee2e6;">P.Unitario</th>
                    <th style="padding:8px;text-align:center; border:1px solid #dee2e6;">Cant.</th>
                    <th style="padding:8px;text-align:center; border:1px solid #dee2e6;">Desc (%)</th>
                    <th style="padding:8px;text-align:right; border:1px solid #dee2e6;">Desc ($)</th>
                    <th style="padding:8px;text-align:center; border:1px solid #dee2e6;">IVA (%)</th>
                    <th style="padding:8px;text-align:right; border:1px solid #dee2e6;">IVA ($)</th>
                    <th style="padding:8px;text-align:right; border:1px solid #dee2e6;">Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="8" style="padding:8px; text-align:right; border:1px solid #dee2e6; font-weight:bold;">
                        Total ${seccion.nombre}:
                    </td>
                    <td style="padding:8px; text-align:right; border:1px solid #dee2e6; font-weight:bold;">
                        ${formatPDF(totalSeccion)}
                    </td>
                </tr>
            </tfoot>
        </table>
    </div>`;
                }
            } else {
                // SIN secciones
                const itemsHtmlPromises = cot.items.map(async (item) => {
                    const valores = calcularValoresItem(item);

                    // Obtener imagen en base64 desde caché
                    const imagenItemBase64 = await obtenerImagenBase64(item.imagen);

                    totalGeneral += valores.totalItem;

                    return `
    <tr>
        <td style="padding:8px;border-bottom:1px solid #ddd;text-align:center;">
            ${item.sku || ""}
        </td>
        <td style="padding:8px;border-bottom:1px solid #ddd; display:flex; align-items:center; gap:8px;">
            <span>${item.descripcion}</span>
        </td>
        <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right;">
            ${formatPDF(Number(item.precio) || 0)}
        </td>
        <td style="padding:8px;border-bottom:1px solid #ddd;text-align:center;">
            ${item.cantidad}
        </td>
        <td style="padding:8px;border-bottom:1px solid #ddd;text-align:center;">
            ${valores.porcentajeMostrar}%
        </td>
        <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right;">
            ${formatPDF(valores.descuentoItem)}
        </td>
        <td style="padding:8px;border-bottom:1px solid #ddd;text-align:center;">
            ${valores.ivaPorcentajeMostrar}%
        </td>
        <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right;">
            ${formatPDF(valores.ivaMonto)}
        </td>
        <td style="padding:8px;border-bottom:1px solid #ddd;text-align:right;">
            ${formatPDF(valores.totalItem)}
        </td>
    </tr>`;
                });
                // Obtener imagen en base64 desde caché
                const itemsHtml = (await Promise.all(itemsHtmlPromises)).join("");

                seccionesHtml = `
    <table style="width:100%;border-collapse:collapse;font-size:13px; margin-bottom:20px;">
        <thead>
            <tr style="background:#e9ecef;">
                <th style="padding:8px;text-align:center; border:1px solid #dee2e6;">Código</th>
                <th style="padding:8px;text-align:left; border:1px solid #dee2e6;">Descripción</th>
                <th style="padding:8px;text-align:right; border:1px solid #dee2e6;">P.Unitario</th>
                <th style="padding:8px;text-align:center; border:1px solid #dee2e6;">Cant.</th>
                <th style="padding:8px;text-align:center; border:1px solid #dee2e6;">Desc (%)</th>
                <th style="padding:8px;text-align:right; border:1px solid #dee2e6;">Desc ($)</th>
                <th style="padding:8px;text-align:center; border:1px solid #dee2e6;">IVA (%)</th>
                <th style="padding:8px;text-align:right; border:1px solid #dee2e6;">IVA ($)</th>
                <th style="padding:8px;text-align:right; border:1px solid #dee2e6;">Total</th>
            </tr>
        </thead>
        <tbody>
            ${itemsHtml}
        </tbody>
    </table>`;
            }

            // ================================
            // HTML COMPLETO
            // ================================
            const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Cotización ${codigo}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #000; }
        .container { width: 874px; margin: 0 auto;  padding-bottom: 40px;}
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #444; padding-bottom: 12px; }
        .info-section { display: flex; gap: 20px; margin-top: 20px; }
        .info-box { flex: 1; padding: 14px; border-radius: 10px; font-size: 12px; }
        .client-info { background: #f7f7f7; border: 1px solid #ddd; }
        .company-info { background: #eef6ff; border: 1px solid #c7ddf8; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { padding: 8px; border: 1px solid #dee2e6; }
        thead th { background: #e9ecef; }
        tfoot td { font-weight: bold; }
        .payment-info { margin-top: 30px; padding: 20px; border: 1px solid #ccc; border-radius: 10px; background: #fafafa; font-size: 13px; }
        .footer-section {
            display: flex;
            justify-content: space-between;
            gap: 40px;
            margin-top: 40px;
        }
        .comentarios-box {
            flex: 1;
            padding: 12px;
            border: 1px solid #d1d5db;
            border-radius: 10px;
            background: #f9fafb;
            font-size: 12px;
        }
        .comentarios-box h4 {
            margin: 0 0 6px 0;
            font-size: 13px;
            color: #111827;
            font-weight: bold;
        }
        .comentarios-box p {
            margin: 0;
            font-size: 12px;
            color: #374151;
            white-space: pre-wrap;
        }
        .signature {
            width: 260px;
            display: flex;
            justify-content: center;
            align-items: flex-end;
        }
        .signature-line {
            width: 100%;
            border-top: 1px solid #000;
            padding-top: 8px;
            padding-bottom: 6px;
            text-align: center;
            font-size: 12px;
            line-height: 1.4;
        }
        @media print {
            body { padding: 0; }
            .container { width: 100%; }
        }
        /* Estilos para imágenes en PDF */
        .product-image {
            width: 45px;
            height: 45px;
            object-fit: cover;
            border-radius: 6px;
            border: 1px solid #ccc;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Encabezado -->
        <br><br><br>
        <div class="header">
            <div style="display:flex;align-items:center;gap:12px;">
                <img src="${origenInfo.logo}" style="height:55px;" onerror="this.style.display='none'" />
                <div>
                    <h2 style="margin:0;font-size:20px;">${origenInfo.nombre}</h2>
                    <p style="margin:0;font-size:12px;color:#555;">
                        <b>RUT:</b> ${origenInfo.rut}<br>
                        ${origenInfo.direccion}<br>
                        ${origenInfo.correo} · ${origenInfo.telefono}
                    </p>
                </div>
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
                <p style="margin:0;font-size:11px;color:#4b5563;">
                    Fecha impresión: ${fechaActual}
                </p>
                <div style="border:1.5px solid #000; padding:6px 14px; text-align:center; font-family: Arial, sans-serif; min-width:150px;">
                    <div style="font-size:11px; font-weight:bold; color:#b91c1c;">R.U.T.: ${origenInfo.rut}</div>
                    <div style="font-size:11px; font-weight:bold; color:#b91c1c; margin-top:2px;">COTIZACIÓN</div>
                    <div style="font-size:12px; font-weight:bold; color:#b91c1c; margin-top:4px;">N° ${codigo}</div>
                </div>
            </div>
        </div>

        <br>

        <!-- Cliente + Empresa -->
        <div class="info-section">
            <div class="info-box client-info">
                <h3 style="margin:0 0 10px 0;">Datos del Cliente</h3>
                <p><b>Entidad:</b> ${cot.entidad?.nombre ?? "—"}</p>
                <p><b>RUT:</b> ${cot.entidad?.rut ?? "—"}</p>
                <p><b>Correo:</b> ${cot.entidad?.correo ?? "—"}</p>
                <p><b>Teléfono:</b> ${cot.entidad?.telefono ?? "—"}</p>
                <p><b>Dirección:</b> ${cot.entidad?.direccion ?? "—"}</p>
                <p><b>Origen:</b> ${cot.entidad?.origen ?? "—"}</p>
            </div>

            <div class="info-box company-info">
                <h3 style="margin:0 0 10px 0;">Empresa (Origen)</h3>
                <p><b>Empresa:</b> ${origenInfo.nombre}</p>
                <p><b>RUT:</b> ${origenInfo.rut}</p>
                <p><b>Dirección:</b> ${origenInfo.direccion}</p>
                <p><b>Correo:</b> ${origenInfo.correo}</p>
                <p><b>Teléfono:</b> ${origenInfo.telefono}</p>
            </div>
        </div>

        <!-- Items -->
        <h3 style="margin-top:30px; margin-bottom:15px;">Detalle de la cotización</h3>
        ${seccionesHtml}

        <!-- Total General -->
        <div style="margin-top:30px; padding:15px; background:#f8f9fa; border-radius:8px; border:2px solid #dee2e6;">
            <div style="text-align:right; font-size:18px; font-weight:bold;">
                Total General: ${formatPDF(totalGeneral)}
            </div>
        </div>
        <br>
         <!-- Imágenes en fila horizontal -->
<div style="
    display:flex;
    flex-direction:row;
    gap:12px;
    margin-top:15px;
    flex-wrap:nowrap;       /* ⬅ evita que se vayan hacia abajo */
    overflow-x:auto;        /* ⬅ si son muchas, aparece scroll horizontal */
    padding-bottom:10px;
">
    ${(
                    await Promise.all(
                        cot.items.map(async (item) => {
                            const img = await obtenerImagenBase64(item.imagen);
                            if (!img) return "";
                            return `
                        <img src="${img}"
                            style="
                                width:110px;
                                height:110px;
                                object-fit:cover;
                                border-radius:10px;
                                border:1px solid #ccc;
                                flex-shrink:0;  /* ⬅ evita que se achiquen */
                            "
                        />
                    `;
                        })
                    )
                ).join("")
                }
</div>


        <!-- Formas de pago -->
        <div class="payment-info">
            <p><b>Pago por transferencia electrónica o depósito</b></p>
            <p><b>Tiempo de validez:</b> 5 días</p>
            <p><b>Tiempo de entrega:</b> 5 días hábiles</p>
            <p><b>Banco:</b> Itaú · <b>Cuenta Corriente:</b> 0213150814 · <b>RUT:</b> 76.758.352-4</p>
            <p><b>Correo de pagos:</b> pagos@rids.cl</p>
            <p><b>Notas:</b> Se inicia previa aceptación y abono del 50%.</p>
        </div>
        <br>
        <!-- Comentarios + Firma -->
        <div class="footer-section">
            <div class="comentarios-box">
                <h4>Comentarios de la cotización</h4>
                <p>${cot.comentariosCotizacion || "—"}</p>
            </div>
            <div class="signature">
                <div class="signature-line">Firma y aclaración</div>
            </div>
        </div>
    </div>
</body>
</html>`;

            // ================================
            // RENDER INVISIBLE + HTML2CANVAS
            // ================================
            const container = document.createElement("div");
            container.style.position = "fixed";
            container.style.left = "-9999px";
            container.style.top = "-9999px";
            container.style.width = "874px";
            container.style.backgroundColor = "#ffffff";
            container.innerHTML = html;
            document.body.appendChild(container);

            // Esperar a que todas las imágenes se carguen
            const images = container.querySelectorAll("img");
            const imagePromises = Array.from(images).map((img) => {
                return new Promise<void>((resolve) => {
                    if (img.complete) {
                        resolve();
                        return;
                    }

                    img.onload = () => {
                        console.log("Imagen cargada:", img.src.substring(0, 50));
                        resolve();
                    };

                    img.onerror = () => {
                        console.warn("Error cargando imagen en PDF");
                        // Si falla, intentar cargar una imagen placeholder
                        img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='45' height='45' viewBox='0 0 45 45'%3E%3Crect width='45' height='45' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='10'%3ESin imagen%3C/text%3E%3C/svg%3E";
                        resolve();
                    };

                    // Timeout para imágenes que tardan demasiado
                    setTimeout(() => {
                        if (img.src && !img.complete) {
                            console.log("Timeout para imagen:", img.src.substring(0, 50));
                            resolve();
                        }
                    }, 5000);
                });
            });

            await Promise.all(imagePromises);

            // Esperar un poco más para asegurar renderizado
            await new Promise(resolve => setTimeout(resolve, 500));

            // ================================
            // CONVERTIR A CANVAS CON MEJORES OPCIONES
            // ================================
            const canvas = await html2canvas(container, {
                scale: 2,
                useCORS: true,
                allowTaint: true,  // Permitir taint para imágenes base64
                backgroundColor: "#FFFFFF",
                logging: false,
                width: 874,
                windowWidth: 874,
                scrollY: 0,
                scrollX: 0,
                onclone: (clonedDoc) => {
                    // Asegurar que todas las imágenes tengan dimensiones explícitas
                    const clonedImages = clonedDoc.querySelectorAll("img");
                    clonedImages.forEach(img => {
                        if (!img.style.width) img.style.width = "auto";
                        if (!img.style.height) img.style.height = "auto";
                    });
                }
            });

            // ================================
            // CREAR PDF
            // ================================
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "pt",
                format: "a4",
            });

            const imgData = canvas.toDataURL("image/jpeg", 0.95); // JPEG con mejor compresión
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            const pageHeight = pdf.internal.pageSize.getHeight();
            let position = 0;

            // Manejar múltiples páginas
            while (position < pdfHeight) {
                if (position > 0) {
                    pdf.addPage();
                }

                pdf.addImage(imgData, "JPEG", 0, -position, pdfWidth, pdfHeight);
                position += pageHeight;
            }

            pdf.save(`Cotizacion_${codigo}.pdf`);

            // Limpiar
            document.body.removeChild(container);
            showSuccess("PDF generado correctamente");

        } catch (e) {
            console.error("Error al generar PDF:", e);
            handleApiError(e, "Error al generar PDF");
        }
    };


    // === FILTROS ===
    const q = query.toLowerCase();
    const filtered = cotizaciones.filter((c) => {
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

    const totales = calcularTotales(items as any[]);

    const totalMostrado = filtered.length;
    const totalCotizaciones = cotizaciones.length;

    return (
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-white via-white to-cyan-50">
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
                                {filtered.map((c) => (
                                    <tr key={c.id} className="hover:bg-cyan-50 transition">
                                        <td className="px-4 py-3 text-center text-sm font-semibold text-slate-700">
                                            {c.id}
                                        </td>

                                        <td className="px-4 py-3 text-center text-sm text-slate-600">
                                            {new Date(c.fecha).toLocaleDateString("es-CL")}
                                        </td>

                                        <td className="px-4 py-3 text-center">
                                            <span
                                                className={`
                                                    px-3 py-1 rounded-full text-xs font-semibold 
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
                                            >
                                                {formatEstado(c.estado)}
                                            </span>
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
                                                {/* Ver */}
                                                <button
                                                    onClick={() => {
                                                        setSelectedCotizacion(c);
                                                        setShowViewModal(true);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                                >
                                                    <EyeOutlined />
                                                </button>

                                                {/* Imprimir */}
                                                <button
                                                    onClick={() => handlePrint(c)}
                                                    className="text-indigo-600 hover:text-indigo-800 text-sm"
                                                    title="Imprimir cotización"
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

            {/* MODALES */}
            <ViewCotizacionModal
                show={showViewModal}
                cotizacion={selectedCotizacion}
                onClose={() => setShowViewModal(false)}
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
                onCrearProducto={() => setShowNewProductoModal(true)}
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
                totales={totales}
                apiLoading={apiLoading}
            />

            <EditCotizacionModal
                show={showEditModal}
                cotizacion={selectedCotizacion}
                onClose={() => setShowEditModal(false)}
                onUpdate={handleUpdateCotizacion}
                onPrint={handlePrint}
                onCargarProductos={cargarProductos}
                onCargarServicios={cargarServicios}
                onUpdateCotizacion={setSelectedCotizacion}
                apiLoading={apiLoading}
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
                onAgregarProducto={agregarProducto}
                onEditarProducto={abrirEditarProducto}
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
                onEditarServicio={abrirEditarServicio}
                orden={ordenServicio}
                onOrdenChange={setOrdenServicio}
            />

            <EditProductoModal
                show={showEditProductoModal}
                producto={productoAEditar}
                onClose={() => setShowEditProductoModal(false)}
                onSave={handleEditarProducto}
                onBackToSelector={() => {
                    setShowEditProductoModal(false);
                    setShowSelectorProducto(true);
                }}
                apiLoading={apiLoading}
            />

            <EditServicioModal
                show={showEditServicioModal}
                servicio={servicioAEditar}
                onClose={() => setShowEditServicioModal(false)}
                onSave={handleEditarServicio}
                apiLoading={apiLoading}
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
                onClose={() => setShowNewProductoModal(false)}
                onSubmit={handleCrearProducto}
                formData={productoForm}
                onFormChange={(field, value) =>
                    setProductoForm(prev => ({ ...prev, [field]: value }))
                }
                categoriasDisponibles={categoriasDisponibles}
                apiLoading={apiLoading}
            />

            {/* Toast */}
            {toast && (
                <motion.div
                    initial={{ y: -40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -40, opacity: 0 }}
                    className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-white ${toast.type === "success" ? "bg-green-600" : "bg-rose-600"
                        }`}
                >
                    {toast.type === "success" ? (
                        <CheckCircleOutlined />
                    ) : (
                        <CloseCircleOutlined />
                    )}
                    <span>{toast.message}</span>
                </motion.div>
            )}

            {/* === CONTENEDOR OCULTO PARA PDF === */}
            <div
                ref={printRef}
                style={{
                    all: "unset",
                    display: "block",
                    position: "absolute",
                    left: "-9999px",
                    top: "-9999px",
                    backgroundColor: "#ffffff",
                    color: "#000000",
                    padding: "20px",
                }}
            >
            </div>


        </div>
    );
};

export default Cotizaciones;
