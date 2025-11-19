import React, { useEffect, useState, useRef, useCallback } from "react";
import {
    PlusOutlined,
    SearchOutlined,
    EditOutlined,
    EyeOutlined,
    DeleteOutlined,
    PrinterOutlined,
    FileTextOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    ReloadOutlined,
    CloseCircleOutlined,
    FilterOutlined,
    BarcodeOutlined,
    UserOutlined,
    SettingOutlined,
    PhoneOutlined,
    EnvironmentOutlined,
    InfoCircleOutlined
} from "@ant-design/icons";
import { motion } from "framer-motion";
import Header from "../components/Header";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

/* ======= Tipos basados en el backend ======= */
const EstadoCotizacionGestioo = {
    BORRADOR: "BORRADOR",
    GENERADA: "GENERADA",
    ENVIADA: "ENVIADA",
    APROBADA: "APROBADA",
    RECHAZADA: "RECHAZADA"
} as const;

const TipoCotizacionGestioo = {
    CLIENTE: "CLIENTE",
    INTERNA: "INTERNA",
    PROVEEDOR: "PROVEEDOR"
} as const;

const ItemTipoGestioo = {
    PRODUCTO: "PRODUCTO",
    SERVICIO: "SERVICIO",
    ADICIONAL: "ADICIONAL"
} as const;

type EstadoCotizacionGestioo = typeof EstadoCotizacionGestioo[keyof typeof EstadoCotizacionGestioo];
type TipoCotizacionGestioo = typeof TipoCotizacionGestioo[keyof typeof TipoCotizacionGestioo];
type ItemTipoGestioo = typeof ItemTipoGestioo[keyof typeof ItemTipoGestioo];

interface EntidadGestioo {
    id: number;
    nombre: string;
    rut?: string;
    correo?: string;
    telefono?: string;
    direccion?: string;
    origen?: string;
    createdAt?: string;
}

interface CotizacionItemGestioo {
    id: number;
    cotizacionId: number;
    tipo: ItemTipoGestioo;
    descripcion: string;
    cantidad: number;
    precio: number;
    porcentaje?: number | null;
    createdAt: string;
    tieneIVA?: boolean;
}

interface CotizacionGestioo {
    id: number;
    fecha: string;
    estado: EstadoCotizacionGestioo;
    tipo: TipoCotizacionGestioo;
    entidadId: number | null;
    entidad: EntidadGestioo | null;
    total: number;
    items: CotizacionItemGestioo[];
    createdAt: string;
    updatedAt: string;
}

// === HOOK PERSONALIZADO PARA API ===
const useApi = () => {
    const [loading, setLoading] = useState(false);

    const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}${endpoint}`, {
                credentials: "include",
                ...options
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || `Error ${res.status}: ${res.statusText}`);
            }

            return await res.json();
        } catch (error) {
            throw error;
        } finally {
            setLoading(false);
        }
    };

    return { fetchApi, loading };
};

// === FUNCIÓN UTILITARIA PARA CÁLCULOS ===
const calcularTotales = (items: CotizacionItemGestioo[]) => {
    const subtotalBruto = items
        .filter(item => item.tipo !== ItemTipoGestioo.ADICIONAL)
        .reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

    const descuentos = items
        .filter(item => item.tipo === ItemTipoGestioo.ADICIONAL)
        .reduce((acc, item) => {
            if (item.porcentaje && item.porcentaje > 0) {
                return acc + (subtotalBruto * item.porcentaje) / 100;
            }
            return acc + (item.precio * item.cantidad);
        }, 0);

    const subtotal = Math.max(0, subtotalBruto - descuentos);

    // Cálculo correcto de IVA - solo para productos con tieneIVA = true
    const iva = items
        .filter(item => item.tieneIVA)
        .reduce((acc, item) => {
            const base = item.precio * item.cantidad;
            const descuentoItem = item.porcentaje ? (base * item.porcentaje) / 100 : 0;
            return acc + (base - descuentoItem) * 0.19;
        }, 0);

    const total = subtotal + iva;

    return { subtotalBruto, descuentos, subtotal, iva, total };
};

// === VALIDACIÓN DE FORMULARIOS ===
const validarCotizacion = (cotizacion: CotizacionGestioo): string[] => {
    const errores: string[] = [];

    if (!cotizacion.entidad?.nombre?.trim()) {
        errores.push("El nombre de la entidad es obligatorio");
    }

    if (!cotizacion.entidad?.origen) {
        errores.push("El origen de la entidad es obligatorio");
    }

    if (cotizacion.items.length === 0) {
        errores.push("Debe agregar al menos un item");
    }

    cotizacion.items.forEach((item, index) => {
        if (!item.descripcion?.trim()) {
            errores.push(`Item ${index + 1}: La descripción es obligatoria`);
        }
        if (item.cantidad <= 0) {
            errores.push(`Item ${index + 1}: La cantidad debe ser mayor a 0`);
        }
        if (item.precio < 0) {
            errores.push(`Item ${index + 1}: El precio no puede ser negativo`);
        }
    });

    return errores;
};

// === VALIDAR RUT CHILENO ===
const validarRut = (rut: string) => {
    rut = rut.replace(/^0+|[^0-9kK]+/g, "").toUpperCase();
    if (rut.length < 8) return false;
    const cuerpo = rut.slice(0, -1);
    const dv = rut.slice(-1);
    let suma = 0;
    let multiplo = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += parseInt(cuerpo.charAt(i), 10) * multiplo;
        multiplo = multiplo === 7 ? 2 : multiplo + 1;
    }
    const dvEsperado = 11 - (suma % 11);
    const dvReal =
        dvEsperado === 11 ? "0" : dvEsperado === 10 ? "K" : dvEsperado.toString();
    return dv === dvReal;
};

// === FORMATEAR RUT CHILENO ===
const formatearRut = (rut: string) => {
    rut = rut.replace(/^0+|[^0-9kK]+/g, "").toUpperCase();
    if (rut.length <= 1) return rut;
    const cuerpo = rut.slice(0, -1);
    const dv = rut.slice(-1);
    let formateado = "";
    let i = 0;
    for (let j = cuerpo.length - 1; j >= 0; j--) {
        formateado = cuerpo.charAt(j) + formateado;
        i++;
        if (i === 3 && j !== 0) {
            formateado = "." + formateado;
            i = 0;
        }
    }
    return `${formateado}-${dv}`;
};

const Cotizaciones: React.FC = () => {
    // === ESTADOS PRINCIPALES ===
    const [cotizaciones, setCotizaciones] = useState<CotizacionGestioo[]>([]);
    const [query, setQuery] = useState("");
    const [selectedCotizacion, setSelectedCotizacion] = useState<CotizacionGestioo | null>(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const [showNewEntidadModal, setShowNewEntidadModal] = useState(false);
    const [showEditEntidadModal, setShowEditEntidadModal] = useState(false);
    const [entidadParaEditar, setEntidadParaEditar] = useState<EntidadGestioo | null>(null);

    const [nombre, setNombre] = useState("");
    const [rut, setRut] = useState("");
    const [correo, setCorreo] = useState("");
    const [telefono, setTelefono] = useState("");
    const [direccion, setDireccion] = useState("");

    // === HOOKS PERSONALIZADOS ===
    const { fetchApi: apiFetch, loading: apiLoading } = useApi();

    // === MANEJO DE ERRORES MEJORADO ===
    const handleApiError = useCallback((error: any, defaultMessage: string) => {
        console.error("API Error:", error);
        const message = error.message || defaultMessage;
        setToast({ type: "error", message });
        setTimeout(() => setToast(null), 5000);
    }, []);

    const showSuccess = useCallback((message: string) => {
        setToast({ type: "success", message });
        setTimeout(() => setToast(null), 3000);
    }, []);

    // === ESTADOS PARA CREACIÓN ===
    const [entidades, setEntidades] = useState<EntidadGestioo[]>([]);
    const [entidadSeleccionada, setEntidadSeleccionada] = useState<EntidadGestioo | null>(null);
    // Cambiar el tipo de items en el estado
    const [items, setItems] = useState<
        {
            id: number;
            tipo: ItemTipoGestioo;
            descripcion: string;
            cantidad: number;
            precio: number;
            porcentaje?: number;
            tieneIVA?: boolean; // ← AGREGAR ESTE CAMPO
        }[]
    >([]);

    // === FILTROS MEJORADOS ===
    const [filtroProductos, setFiltroProductos] = useState("");
    const [filtroServicios, setFiltroServicios] = useState("");
    const [filtroCodigoProducto, setFiltroCodigoProducto] = useState("");
    const [filtroCodigoServicio, setFiltroCodigoServicio] = useState("");
    const [filtroPrecioMinProducto, setFiltroPrecioMinProducto] = useState("");
    const [filtroPrecioMaxProducto, setFiltroPrecioMaxProducto] = useState("");
    const [filtroPrecioMinServicio, setFiltroPrecioMinServicio] = useState("");
    const [filtroPrecioMaxServicio, setFiltroPrecioMaxServicio] = useState("");
    const [filtroCategoriaProducto, setFiltroCategoriaProducto] = useState("");
    const [filtroCategoriaServicio, setFiltroCategoriaServicio] = useState("");

    const [productosFiltrados, setProductosFiltrados] = useState<any[]>([]);
    const [serviciosFiltrados, setServiciosFiltrados] = useState<any[]>([]);

    // === FILTROS HISTORIAL ===
    const [filtroHistorialOrigen, setFiltroHistorialOrigen] = useState("");
    const [filtroHistorialEstado, setFiltroHistorialEstado] = useState("");
    const [filtroHistorialTipo, setFiltroHistorialTipo] = useState("");

    // === ORDENAMIENTO ===
    const [ordenProducto, setOrdenProducto] = useState("asc");
    const [ordenServicio, setOrdenServicio] = useState("asc");

    // === CATEGORÍAS ===
    const [categoriasDisponibles, setCategoriasDisponibles] = useState<string[]>([]);

    // === DEBOUNCE ===
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // === FORMULARIO ===
    const [formData, setFormData] = useState({
        tipoEntidad: "EMPRESA",
        origenEntidad: "",
        entidadId: "",
    });

    const [catalogo, setCatalogo] = useState<
        { id: number; tipo: "PRODUCTO" | "SERVICIO"; descripcion: string; precio: number }[]
    >([]);

    const [productosCatalogo, setProductosCatalogo] = useState<any[]>([]);
    const [serviciosCatalogo, setServiciosCatalogo] = useState<any[]>([]);

    const [showSelectorProducto, setShowSelectorProducto] = useState(false);
    const [showSelectorServicio, setShowSelectorServicio] = useState(false);

    // === EDICIÓN PRODUCTOS/SERVICIOS ===
    const [showEditProductoModal, setShowEditProductoModal] = useState(false);
    const [showEditServicioModal, setShowEditServicioModal] = useState(false);
    const [productoAEditar, setProductoAEditar] = useState<any>(null);
    const [servicioAEditar, setServicioAEditar] = useState<any>(null);

    // === EFECTOS ===
    useEffect(() => {
        return () => {
            if (debounceRef.current) {
                clearTimeout(debounceRef.current);
            }
        };
    }, []);

    // === FUNCIONES PRINCIPALES MEJORADAS ===
    const fetchCotizaciones = async () => {
        try {
            const data = await apiFetch('/cotizaciones');
            setCotizaciones(data.data || []);
        } catch (err) {
            handleApiError(err, "Error al cargar cotizaciones");
            console.log(entidadSeleccionada);

        }
    };

    const fetchCatalogo = async () => {
        try {
            const [productosData, serviciosData] = await Promise.all([
                apiFetch('/productos-gestioo'),
                apiFetch('/servicios-gestioo')
            ]);

            const productos = productosData.data || productosData.items || productosData.rows || productosData || [];
            const servicios = serviciosData.data || serviciosData.items || serviciosData.rows || serviciosData || [];

            const catalogoFormateado = [
                ...productos.map((p: any) => ({
                    id: p.id,
                    tipo: "PRODUCTO" as const,
                    descripcion: p.nombre || p.descripcion || "Producto sin nombre",
                    precio: p.precio || p.precioBase || p.valor || 0,
                    nombre: p.nombre,
                    codigo: p.codigo,
                    categoria: p.categoria
                })),
                ...servicios.map((s: any) => ({
                    id: s.id,
                    tipo: "SERVICIO" as const,
                    descripcion: s.nombre || s.descripcion || "Servicio sin nombre",
                    precio: s.precio || s.precioBase || s.valor || 0,
                    nombre: s.nombre,
                    codigo: s.codigo
                }))
            ];

            setCatalogo(catalogoFormateado);
        } catch (error) {
            handleApiError(error, "Error al cargar catálogo");
        }
        console.log(catalogo);
        console.log(productosFiltrados);
        console.log(serviciosFiltrados);

    };

    const cargarProductos = async () => {
        try {
            const data = await apiFetch('/productos-gestioo');
            const productos = data.data || data.items || data.rows || data || [];

            const productosMapeados = productos.map((p: any) => ({
                id: p.id,
                tipo: "PRODUCTO" as const,
                descripcion: p.nombre || p.descripcion || "Producto sin nombre",
                precio: p.precio || p.precioBase || p.valor || 0,
                nombre: p.nombre,
                codigo: p.codigo,
                categoria: p.categoria
            }));

            setProductosCatalogo(productosMapeados);
            setProductosFiltrados(productosMapeados);

            const categoriasUnicas = [...new Set(productosMapeados
                .map((p: any) => p.categoria)
                .filter(Boolean)
                .sort()
            )] as string[];

            setCategoriasDisponibles(categoriasUnicas);
            setShowSelectorProducto(true);
        } catch (e) {
            handleApiError(e, "Error al cargar productos");
        }
    };

    const cargarServicios = async () => {
        try {
            const data = await apiFetch('/servicios-gestioo');
            const servicios = data.data || data.items || data.rows || data || [];

            setServiciosCatalogo(servicios);
            setServiciosFiltrados(servicios);
            setShowSelectorServicio(true);
        } catch (e) {
            handleApiError(e, "Error al cargar servicios");
        }
    };

    const fetchEntidades = async () => {
        try {
            const data = await apiFetch('/entidades');
            setEntidades(data.data || data.items || data || []);
        } catch (err) {
            handleApiError(err, "Error al cargar entidades");
        }
    };

    // === FUNCIONES DE FILTRADO MEJORADAS ===
    const filtrarProductosAvanzado = (productos: any[]) => {
        return productos.filter(producto => {
            const coincideTexto =
                producto.nombre?.toLowerCase().includes(filtroProductos.toLowerCase()) ||
                producto.descripcion?.toLowerCase().includes(filtroProductos.toLowerCase()) ||
                producto.codigo?.toLowerCase().includes(filtroProductos.toLowerCase());

            const coincideCodigo = !filtroCodigoProducto ||
                producto.codigo?.toLowerCase().includes(filtroCodigoProducto.toLowerCase());

            const precio = producto.precio || producto.precioBase || 0;
            const precioMin = filtroPrecioMinProducto ? Number(filtroPrecioMinProducto) : 0;
            const precioMax = filtroPrecioMaxProducto ? Number(filtroPrecioMaxProducto) : Infinity;
            const coincidePrecio = precio >= precioMin && precio <= precioMax;

            const coincideCategoria = !filtroCategoriaProducto ||
                (producto.categoria &&
                    producto.categoria.toLowerCase().includes(filtroCategoriaProducto.toLowerCase()));

            return coincideTexto && coincideCodigo && coincidePrecio && coincideCategoria;
        });
    };

    const filtrarServiciosAvanzado = (servicios: any[]) => {
        return servicios.filter(servicio => {
            const coincideTexto =
                servicio.nombre?.toLowerCase().includes(filtroServicios.toLowerCase()) ||
                servicio.descripcion?.toLowerCase().includes(filtroServicios.toLowerCase()) ||
                servicio.codigo?.toLowerCase().includes(filtroServicios.toLowerCase());

            const coincideCodigo = !filtroCodigoServicio ||
                servicio.codigo?.toLowerCase().includes(filtroCodigoServicio.toLowerCase());

            const precio = servicio.precio || servicio.precioBase || 0;
            const precioMin = filtroPrecioMinServicio ? Number(filtroPrecioMinServicio) : 0;
            const precioMax = filtroPrecioMaxServicio ? Number(filtroPrecioMaxServicio) : Infinity;
            const coincidePrecio = precio >= precioMin && precio <= precioMax;

            const coincideCategoria = !filtroCategoriaServicio ||
                servicio.categoria?.toLowerCase().includes(filtroCategoriaServicio.toLowerCase());

            return coincideTexto && coincideCodigo && coincidePrecio && coincideCategoria;
        });
    };

    // === FUNCIONES DE ORDENAMIENTO ===
    const ordenarProductos = (productos: any[]) => {
        return productos.sort((a, b) => {
            switch (ordenProducto) {
                case "asc":
                    return a.nombre.localeCompare(b.nombre);
                case "desc":
                    return b.nombre.localeCompare(a.nombre);
                case "precio-asc":
                    return (a.precio || 0) - (b.precio || 0);
                case "precio-desc":
                    return (b.precio || 0) - (a.precio || 0);
                default:
                    return a.nombre.localeCompare(b.nombre);
            }
        });
    };

    const ordenarServicios = (servicios: any[]) => {
        return servicios.sort((a, b) => {
            switch (ordenServicio) {
                case "asc":
                    return a.nombre.localeCompare(b.nombre);
                case "desc":
                    return b.nombre.localeCompare(a.nombre);
                case "precio-asc":
                    return (a.precio || 0) - (b.precio || 0);
                case "precio-desc":
                    return (b.precio || 0) - (a.precio || 0);
                default:
                    return a.nombre.localeCompare(b.nombre);
            }
        });
    };

    // Productos y servicios para mostrar
    const productosMostrar = ordenarProductos(filtrarProductosAvanzado(productosCatalogo));
    const serviciosMostrar = ordenarServicios(filtrarServiciosAvanzado(serviciosCatalogo));

    // === FUNCIONES PARA EDITAR PRODUCTOS Y SERVICIOS ===
    const abrirEditarProducto = (producto: any) => {
        setProductoAEditar(producto);
        setShowEditProductoModal(true);
    };

    const abrirEditarServicio = (servicio: any) => {
        setServicioAEditar(servicio);
        setShowEditServicioModal(true);
    };

    const handleEditarProducto = async (productoData: any) => {
        try {
            if (!productoAEditar || !productoAEditar.id) {
                throw new Error("No hay producto seleccionado para editar");
            }

            const responseData = await apiFetch(`/productos-gestioo/${productoAEditar.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(productoData)
            });

            const productoActualizado = responseData.data || productoData;

            setProductosCatalogo(prev =>
                prev.map(p => p.id === productoAEditar.id ? { ...p, ...productoActualizado } : p)
            );

            setShowEditProductoModal(false);
            showSuccess("Producto actualizado correctamente");
        } catch (error: any) {
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

    useEffect(() => {
        fetchCotizaciones();
        fetchEntidades();
    }, []);

    useEffect(() => {
        if (showCreateModal) {
            fetchCatalogo();
        }
    }, [showCreateModal]);

    // === FUNCIONES PARA AGREGAR ITEMS ===
    // En agregarProducto
    const agregarProducto = (producto: any) => {
        const baseItem = {
            id: Date.now(),
            tipo: ItemTipoGestioo.PRODUCTO,
            descripcion: producto.nombre || producto.descripcion || "Producto",
            cantidad: 1,
            precio: producto.precio || producto.precioBase || 0,
            porcentaje: undefined,
            tieneIVA: true,
        };

        if (showEditModal) {
            const nuevoItem: CotizacionItemGestioo = {
                ...baseItem,
                cotizacionId: selectedCotizacion!.id,
                createdAt: new Date().toISOString(),
            };

            setSelectedCotizacion(prev => ({
                ...prev!,
                items: [...prev!.items, nuevoItem],
            }));

        } else {
            // Crear cotizacion
            setItems(prev => [...prev, baseItem]);
        }

        setShowSelectorProducto(false);
        showSuccess("Producto agregado a la cotización");
    };

    // En agregarServicio
    const agregarServicio = (servicio: any) => {
        const baseItem = {
            id: Date.now(),
            tipo: ItemTipoGestioo.SERVICIO,
            descripcion: servicio.nombre || servicio.descripcion || "Servicio",
            cantidad: 1,
            precio: servicio.precio || servicio.precioBase || 0,
            porcentaje: undefined,
            tieneIVA: false,
        };

        if (showEditModal) {
            const nuevoItem: CotizacionItemGestioo = {
                ...baseItem,
                cotizacionId: selectedCotizacion!.id,
                createdAt: new Date().toISOString(),
            };

            setSelectedCotizacion(prev => ({
                ...prev!,
                items: [...prev!.items, nuevoItem],
            }));

        } else {
            setItems(prev => [...prev, baseItem]);
        }

        setShowSelectorServicio(false);
        showSuccess("Servicio agregado a la cotización");
    };



    // En handleAddItem
    const handleAddItem = (tipo: ItemTipoGestioo) => {
        setItems([
            ...items,
            {
                id: Date.now(),
                tipo,
                descripcion: "",
                cantidad: 1,
                precio: 0,
                porcentaje: tipo === ItemTipoGestioo.ADICIONAL ? 0 : undefined,
                tieneIVA: tipo === ItemTipoGestioo.PRODUCTO // ← IVA solo para productos
            },
        ]);
    };

    const handleUpdateItem = (
        id: number,
        field: keyof (typeof items)[0],
        value: any
    ) => {
        setItems((prev) =>
            prev.map((i) => (i.id === id ? { ...i, [field]: value } : i))
        );
    };

    const handleRemoveItem = (id: number) => {
        setItems((prev) => prev.filter((i) => i.id !== id));
    };

    // === ELIMINAR COTIZACIÓN ===
    const handleDelete = async (id: number) => {
        if (!window.confirm("¿Seguro que deseas eliminar esta cotización?")) return;
        try {
            await apiFetch(`/cotizaciones/${id}`, { method: "DELETE" });
            setCotizaciones((prev) => prev.filter((c) => c.id !== id));
            showSuccess("Cotización eliminada correctamente");
        } catch (error) {
            handleApiError(error, "Error al eliminar cotización");
        }
    };

    // === CREAR COTIZACIÓN ===
    const handleCreateCotizacion = async () => {
        if (!formData.entidadId) {
            handleApiError(null, "Debe seleccionar una entidad");
            return;
        }

        if (items.length === 0) {
            handleApiError(null, "Debe agregar al menos un item");
            return;
        }

        try {
            const { total } = calcularTotales(items as CotizacionItemGestioo[]);

            // En handleCreateCotizacion, actualizar el mapeo de items:
            const cotizacionData = {
                tipo: TipoCotizacionGestioo.CLIENTE,
                estado: EstadoCotizacionGestioo.BORRADOR,
                entidadId: Number(formData.entidadId),
                total: total,
                items: items.map(item => ({
                    tipo: item.tipo,
                    descripcion: item.descripcion,
                    cantidad: item.cantidad,
                    precio: item.precio,
                    porcentaje: item.porcentaje || null,
                    tieneIVA: item.tieneIVA || false // ← AGREGAR ESTE CAMPO
                }))
            };

            const data = await apiFetch('/cotizaciones', {
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

    // === ACTUALIZAR COTIZACIÓN ===
    const handleUpdateCotizacion = async () => {
        if (!selectedCotizacion) {
            handleApiError(null, "No hay cotización seleccionada");
            return;
        }

        try {
            // Validación mejorada
            const errores = validarCotizacion(selectedCotizacion);
            if (errores.length > 0) {
                handleApiError({ message: errores.join('\n') }, "Errores de validación");
                return;
            }

            // Recalcular totales usando la función utilitaria
            const { total: totalCalculado } = calcularTotales(selectedCotizacion.items);

            const cotizacionData = {
                tipo: selectedCotizacion.tipo,
                estado: selectedCotizacion.estado,
                entidadId: selectedCotizacion.entidadId,
                total: totalCalculado,
                fecha: selectedCotizacion.fecha,
                entidad: {
                    id: selectedCotizacion.entidad!.id,
                    nombre: selectedCotizacion.entidad!.nombre.trim(),
                    rut: selectedCotizacion.entidad!.rut?.trim() || null,
                    correo: selectedCotizacion.entidad!.correo?.trim() || null,
                    telefono: selectedCotizacion.entidad!.telefono?.trim() || null,
                    direccion: selectedCotizacion.entidad!.direccion?.trim() || null,
                    origen: selectedCotizacion.entidad!.origen
                },
                items: selectedCotizacion.items.map(item => ({
                    tipo: item.tipo,
                    descripcion: item.descripcion.trim(),
                    cantidad: Number(item.cantidad),
                    precio: Number(item.precio),
                    porcentaje: item.porcentaje !== null && item.porcentaje !== undefined
                        ? Number(item.porcentaje)
                        : null,
                    tieneIVA: item.tieneIVA || false
                }))
            };

            const cotizacionActualizada = await apiFetch(`/cotizaciones/${selectedCotizacion.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cotizacionData)
            });

            setCotizaciones(prev => prev.map(c =>
                c.id === selectedCotizacion.id ? cotizacionActualizada.data || cotizacionActualizada : c
            ));

            setShowEditModal(false);
            showSuccess("Cotización actualizada correctamente");

            await fetchCotizaciones();
        } catch (error: any) {
            handleApiError(error, "Error al actualizar cotización");
        }
    };

    // Resetear formulario
    const resetForm = () => {
        setItems([]);
        setEntidadSeleccionada(null);
        setFormData({
            tipoEntidad: "EMPRESA",
            origenEntidad: "",
            entidadId: "",
        });
    };

    // Función para recargar los items de una cotización
    const recargarItemsCotizacion = async (cotizacionId: number) => {
        try {
            const data = await apiFetch(`/cotizaciones/${cotizacionId}`);

            const items =
                data.data?.items ||
                data.items ||
                data.data?.cotizacion?.items ||
                data.cotizacion?.items ||
                [];

            return items;
        } catch (error) {
            handleApiError(error, "Error al recargar items");
            return [];
        }
    };

    // Modificar openEditModal para ser async
    const openEditModal = async (cotizacion: CotizacionGestioo) => {
        let items: CotizacionItemGestioo[] = [];

        try {
            if (!cotizacion.items || !Array.isArray(cotizacion.items) || cotizacion.items.length === 0) {
                items = await recargarItemsCotizacion(cotizacion.id);
            } else {
                items = cotizacion.items;
            }

            const itemsMapeados = items.map((item: CotizacionItemGestioo) => ({
                ...item,
                id: item.id,
                cantidad: Number(item.cantidad) || 1,
                precio: Number(item.precio) || 0,
                porcentaje: item.porcentaje !== null && item.porcentaje !== undefined ? Number(item.porcentaje) : null,
                tieneIVA: item.tieneIVA ?? false
            }));

            const nuevaCotizacion = {
                ...cotizacion,
                items: itemsMapeados,
            };

            setSelectedCotizacion(nuevaCotizacion);
            setShowEditModal(true);

        } catch (error) {
            handleApiError(error, "Error al cargar cotización para editar");
        }
    };

    /* ====== PDF ====== */
    const handlePrint = async (cot: CotizacionGestioo) => {
        try {
            const fechaActual = new Date().toLocaleString("es-CL", {
                dateStyle: "short",
                timeStyle: "short",
            });

            const codigo = `COT-${String(cot.id).padStart(6, "0")}`;

            type OrigenGestioo = "RIDS" | "ECCONET" | "OTRO";

            const ORIGEN_DATA: Record<OrigenGestioo, {
                nombre: string;
                direccion: string;
                correo: string;
                telefono: string;
                logo: string;
            }> = {
                RIDS: {
                    nombre: "RIDS LTDA",
                    direccion: "Santiago - Providencia, La Concepción 65",
                    correo: "soporte@rids.cl",
                    telefono: "+56 9 0000 0000",
                    logo: `${window.location.origin}/img/splash.png`
                },
                ECCONET: {
                    nombre: "ECCONET SPA",
                    direccion: "Santiago - Providencia, La Concepción 65",
                    correo: "contacto@ecconet.cl",
                    telefono: "+56 9 1111 1111",
                    logo: `${window.location.origin}/img/ecconetlogo.png`
                },
                OTRO: {
                    nombre: cot.entidad?.nombre ?? "Empresa",
                    direccion: cot.entidad?.direccion ?? "",
                    correo: cot.entidad?.correo ?? "",
                    telefono: cot.entidad?.telefono ?? "",
                    logo: `${window.location.origin}/img/splash.png`
                }
            };

            const origen = (cot.entidad?.origen ?? "OTRO") as OrigenGestioo;
            const origenInfo = ORIGEN_DATA[origen];

            const itemsHtml = cot.items.map(item => `
            <tr>
                <td style="padding:6px; border-bottom:1px solid #ddd;">${item.descripcion}</td>
                <td style="padding:6px; border-bottom:1px solid #ddd; text-align:center;">${item.cantidad}</td>
                <td style="padding:6px; border-bottom:1px solid #ddd; text-align:right;">$${item.precio.toLocaleString("es-CL")}</td>
                <td style="padding:6px; border-bottom:1px solid #ddd; text-align:right;">$${(item.precio * item.cantidad).toLocaleString("es-CL")}</td>
            </tr>
        `).join("");

            const html = `
<div style="width:790px; padding:32px; font-family:Arial; border:1px solid #ccc;">

    <!-- ENCABEZADO -->
    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #444; padding-bottom:12px;">
        <div style="display:flex; align-items:center; gap:12px;">
            <img src="${origenInfo.logo}" style="height:55px;" />
            <div>
                <h2 style="margin:0; font-size:20px;">${origenInfo.nombre}</h2>
                <p style="margin:0; font-size:12px; color:#555;">
                    ${origenInfo.direccion} · ${origenInfo.correo} · <br>${origenInfo.telefono}
                </p>
            </div>
        </div>
        <div style="text-align:right;">
            <p style="margin:0; font-size:12px;">Fecha impresión: ${fechaActual}</p>
            <h3 style="margin:0; font-size:16px;">Cotización Nº ${codigo}</h3>
        </div>
    </div>

    <!-- CLIENTE -->
    <div style="margin-top:20px; background:#f7f7f7; padding:14px; border-radius:10px; border:1px solid #ddd;">
        <h3 style="margin:0 0 10px 0;">Datos del Cliente</h3>
        <p><b>Entidad:</b> ${cot.entidad?.nombre ?? "—"}</p>
        <p><b>RUT:</b> ${cot.entidad?.rut ?? "—"}</p>
        <p><b>Correo:</b> ${cot.entidad?.correo ?? "—"}</p>
        <p><b>Teléfono:</b> ${cot.entidad?.telefono ?? "—"}</p>
        <p><b>Dirección:</b> ${cot.entidad?.direccion ?? "—"}</p>
        <p><b>Origen:</b> ${cot.entidad?.origen ?? "—"}</p>
    </div>

    <!-- EMPRESA ORIGEN -->
    <div style="margin-top:20px; background:#eef6ff; padding:14px; border-radius:10px; border:1px solid #c7ddf8;">
        <h3 style="margin:0 0 10px 0;">Datos de la Empresa (Origen)</h3>
        <p><b>Empresa:</b> ${origenInfo.nombre}</p>
        <p><b>Dirección:</b> ${origenInfo.direccion}</p>
        <p><b>Correo:</b> ${origenInfo.correo}</p>
        <p><b>Teléfono:</b> ${origenInfo.telefono}</p>
        <p><b>Origen seleccionado:</b> ${cot.entidad?.origen ?? "OTRO"}</p>
    </div>

    <!-- ITEMS -->
    <div style="margin-top:20px;">
        <h3 style="margin-bottom:8px;">Detalle de la Cotización</h3>
        <table style="width:100%; border-collapse:collapse; font-size:13px;">
            <thead>
                <tr style="background:#e5e7eb;">
                    <th style="padding:6px; text-align:left;">Descripción</th>
                    <th style="padding:6px; text-align:center;">Cant.</th>
                    <th style="padding:6px; text-align:right;">Precio unit.</th>
                    <th style="padding:6px; text-align:right;">Total</th>
                </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
        </table>
    </div>

    <!-- TOTAL -->
    <div style="margin-top:20px; text-align:right; font-size:16px; font-weight:bold;">
        Total: $${Math.round(cot.total).toLocaleString("es-CL")}
    </div>
    <br><br><br><br>
    <!-- FIRMAS -->
    <div style="margin-top:60px; display:flex; justify-content:space-between;">
        <div style="width:45%; border-top:1px dashed #666; padding-top:5px; text-align:center;">
            Firma Cliente
        </div>
        <div style="width:45%; border-top:1px solid #000; padding-top:5px; text-align:center;">
            Firma Empresa
        </div>
    </div>

</div>
`;

            const container = document.createElement("div");
            container.innerHTML = html;
            document.body.appendChild(container);

            const canvas = await html2canvas(container, { scale: 2 });
            const pdf = new jsPDF("p", "mm", "a4");

            const width = pdf.internal.pageSize.getWidth();
            const height = (canvas.height * width) / canvas.width;

            pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, width, height);
            pdf.save(`Cotizacion_${codigo}.pdf`);

            document.body.removeChild(container);

        } catch (e) {
            handleApiError(e, "Error al generar PDF");
        }
    };

    // === FUNCIONES AUXILIARES ===
    const filtered = cotizaciones.filter(
        (c) =>
            (c.entidad?.nombre?.toLowerCase().includes(query.toLowerCase()) ||
                c.estado.toLowerCase().includes(query.toLowerCase()) ||
                c.tipo.toLowerCase().includes(query.toLowerCase()) ||
                String(c.id).includes(query)) &&
            (filtroHistorialOrigen ? c.entidad?.origen === filtroHistorialOrigen : true) &&
            (filtroHistorialEstado ? c.estado === filtroHistorialEstado : true) &&
            (filtroHistorialTipo ? c.tipo === filtroHistorialTipo : true)
    );

    const formatEstado = (estado: EstadoCotizacionGestioo) => {
        const estados: { [key in EstadoCotizacionGestioo]: string } = {
            [EstadoCotizacionGestioo.BORRADOR]: "Borrador",
            [EstadoCotizacionGestioo.GENERADA]: "Generada",
            [EstadoCotizacionGestioo.ENVIADA]: "Enviada",
            [EstadoCotizacionGestioo.APROBADA]: "Aprobada",
            [EstadoCotizacionGestioo.RECHAZADA]: "Rechazada"
        };
        return estados[estado];
    };

    const formatTipo = (tipo: TipoCotizacionGestioo) => {
        const tipos: { [key in TipoCotizacionGestioo]: string } = {
            [TipoCotizacionGestioo.CLIENTE]: "Cliente",
            [TipoCotizacionGestioo.INTERNA]: "Interna",
            [TipoCotizacionGestioo.PROVEEDOR]: "Proveedor"
        };
        return tipos[tipo];
    };

    // === FUNCIONES PARA LIMPIAR FILTROS ===
    const limpiarFiltrosProductos = () => {
        setFiltroProductos("");
        setFiltroCodigoProducto("");
        setFiltroPrecioMinProducto("");
        setFiltroPrecioMaxProducto("");
        setFiltroCategoriaProducto("");
    };

    const limpiarFiltrosServicios = () => {
        setFiltroServicios("");
        setFiltroCodigoServicio("");
        setFiltroPrecioMinServicio("");
        setFiltroPrecioMaxServicio("");
        setFiltroCategoriaServicio("");
    };

    // === CÁLCULOS PARA LA CREACIÓN ===
    const { subtotalBruto, descuentos, subtotal, iva, total } = calcularTotales(items as CotizacionItemGestioo[]);

    /* ====== INTERFAZ ====== */
    return (
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-white via-white to-cyan-50">
            <Header />

            <main className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mt-6">
                <div className="rounded-3xl border border-cyan-200 bg-white/80 backdrop-blur-xl shadow-sm p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
                                <FileTextOutlined className="text-cyan-600" />
                                Cotizaciones
                            </h1>
                            <p className="text-slate-600 text-sm mt-1">Gestión y seguimiento de cotizaciones.</p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={fetchCotizaciones}
                                disabled={apiLoading}
                                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-cyan-800 border border-cyan-200 bg-white hover:bg-cyan-50 transition disabled:opacity-50"
                            >
                                <ReloadOutlined /> {apiLoading ? "Cargando..." : "Recargar"}
                            </button>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-white bg-gradient-to-tr from-emerald-600 to-cyan-600 hover:brightness-110 transition shadow"
                            >
                                <PlusOutlined /> Crear
                            </button>
                        </div>
                    </div>

                    {/* Buscador y Filtros */}
                    <div className="mt-4">
                        <div className="flex items-center gap-2 mb-4">
                            <SearchOutlined className="text-cyan-600/70" />
                            <input
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Buscar cotización, cliente o estado..."
                                className="flex-1 rounded-2xl border border-cyan-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                            />
                        </div>

                        {/* Filtros Avanzados */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Filtro por Origen */}
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Filtrar por Origen
                                </label>
                                <select
                                    value={filtroHistorialOrigen}
                                    onChange={(e) => setFiltroHistorialOrigen(e.target.value)}
                                    className="w-full rounded-2xl border border-cyan-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                >
                                    <option value="">Todos los orígenes</option>
                                    <option value="RIDS">RIDS</option>
                                    <option value="ECCONET">ECCONET</option>
                                    <option value="OTRO">OTRO</option>
                                </select>
                            </div>

                            {/* Filtro por Estado */}
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Filtrar por Estado
                                </label>
                                <select
                                    value={filtroHistorialEstado}
                                    onChange={(e) => setFiltroHistorialEstado(e.target.value)}
                                    className="w-full rounded-2xl border border-cyan-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                >
                                    <option value="">Todos los estados</option>
                                    <option value={EstadoCotizacionGestioo.BORRADOR}>Borrador</option>
                                    <option value={EstadoCotizacionGestioo.GENERADA}>Generada</option>
                                    <option value={EstadoCotizacionGestioo.ENVIADA}>Enviada</option>
                                    <option value={EstadoCotizacionGestioo.APROBADA}>Aprobada</option>
                                    <option value={EstadoCotizacionGestioo.RECHAZADA}>Rechazada</option>
                                </select>
                            </div>

                            {/* Filtro por Tipo */}
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                    Filtrar por Tipo
                                </label>
                                <select
                                    value={filtroHistorialTipo}
                                    onChange={(e) => setFiltroHistorialTipo(e.target.value)}
                                    className="w-full rounded-2xl border border-cyan-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                >
                                    <option value="">Todos los tipos</option>
                                    <option value={TipoCotizacionGestioo.CLIENTE}>Cliente</option>
                                    <option value={TipoCotizacionGestioo.INTERNA}>Interna</option>
                                    <option value={TipoCotizacionGestioo.PROVEEDOR}>Proveedor</option>
                                </select>
                            </div>
                        </div>

                        {/* Botón para limpiar filtros */}
                        {(filtroHistorialOrigen || filtroHistorialEstado || filtroHistorialTipo) && (
                            <div className="mt-3 flex justify-end">
                                <button
                                    onClick={() => {
                                        setFiltroHistorialOrigen("");
                                        setFiltroHistorialEstado("");
                                        setFiltroHistorialTipo("");
                                    }}
                                    className="text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
                                >
                                    <ReloadOutlined />
                                    Limpiar filtros
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabla */}
                <section className="mt-6 rounded-3xl border border-cyan-200 bg-white overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gradient-to-r from-cyan-50 to-indigo-50 border-b border-cyan-200 text-slate-800">
                                <tr>
                                    {["N°", "Fecha Cotización", "Estado", "Tipo", "Cliente", "Origen", "Total", "Acciones"].map((h) => (
                                        <th key={h} className="text-left px-4 py-3 font-semibold border-r border-cyan-200 last:border-r-0">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {apiLoading ? (
                                    <tr><td colSpan={8} className="py-10 text-center text-slate-500">Cargando...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={8} className="py-10 text-center text-slate-500">Sin resultados.</td></tr>
                                ) : (
                                    filtered.map((c) => (
                                        <tr key={c.id} className="border-t border-cyan-100 odd:bg-white even:bg-cyan-50/30 hover:bg-cyan-50/60">
                                            <td className="px-4 py-3 border-r border-cyan-100 last:border-r-0">{c.id}</td>
                                            <td className="px-4 py-3 border-r border-cyan-100 last:border-r-0">{new Date(c.fecha).toLocaleString("es-CL")}</td>
                                            <td className="px-4 py-3 border-r border-cyan-100 last:border-r-0">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ring-cyan-200
        ${c.estado === EstadoCotizacionGestioo.BORRADOR
                                                        ? "bg-rose-50 text-rose-700 ring-rose-200"
                                                        : c.estado === EstadoCotizacionGestioo.GENERADA
                                                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                                            : c.estado === EstadoCotizacionGestioo.ENVIADA
                                                                ? "bg-amber-50 text-amber-700 ring-amber-200"
                                                                : "bg-sky-50 text-sky-700 ring-sky-200"}`}>
                                                    {c.estado === EstadoCotizacionGestioo.BORRADOR ? <ClockCircleOutlined /> : <CheckCircleOutlined />}
                                                    {formatEstado(c.estado)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 border-r border-cyan-100 last:border-r-0">{formatTipo(c.tipo)}</td>
                                            <td className="px-4 py-3 border-r border-cyan-100 last:border-r-0">{c.entidad?.nombre || "—"}</td>
                                            <td className="px-4 py-3 border-r border-cyan-100 last:border-r-0">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ring-1 ring-cyan-200
                                    ${c.entidad?.origen === "RIDS"
                                                        ? "bg-blue-50 text-blue-700 ring-blue-200"
                                                        : c.entidad?.origen === "ECCONET"
                                                            ? "bg-green-50 text-green-700 ring-green-200"
                                                            : "bg-gray-50 text-gray-700 ring-gray-200"}`}>
                                                    {c.entidad?.origen || "—"}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 border-r border-cyan-100 last:border-r-0">
                                                ${Math.round(c.total).toLocaleString("es-CL")}
                                            </td>
                                            <td className="px-4 py-3 border-r border-cyan-100 last:border-r-0">
                                                <div className="flex gap-2">
                                                    <button title="Ver" onClick={() => { setSelectedCotizacion(c); setShowViewModal(true); }} className="rounded-lg border border-cyan-200 bg-white text-cyan-700 px-2 py-1 hover:bg-cyan-50 transition"><EyeOutlined /></button>
                                                    <button
                                                        title="Editar"
                                                        onClick={() => openEditModal(c)}
                                                        className="rounded-lg border border-amber-200 bg-white text-amber-700 px-2 py-1 hover:bg-amber-50 transition"
                                                    >
                                                        <EditOutlined />
                                                    </button>
                                                    <button title="PDF" onClick={() => handlePrint(c)} className="rounded-lg border border-indigo-200 text-indigo-700 px-2 py-1 hover:bg-indigo-50 transition"><PrinterOutlined /></button>
                                                    <button title="Eliminar" onClick={() => handleDelete(c.id)} className="rounded-lg border border-rose-200 text-rose-700 px-2 py-1 hover:bg-rose-50 transition"><DeleteOutlined /></button>
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

            {/* Contador de resultados */}
            <div className="mt-4 text-center text-sm text-slate-500">
                Mostrando {filtered.length} de {cotizaciones.length} cotizaciones
                {(filtroHistorialOrigen || filtroHistorialEstado || filtroHistorialTipo || query) && (
                    <span className="text-cyan-600 ml-2">
                        (filtros aplicados)
                    </span>
                )}
            </div>

            {/* MODAL: Ver Cotización */}
            {showViewModal && selectedCotizacion && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">
                            Cotización #{selectedCotizacion.id}
                        </h2>
                        <button onClick={() => setShowViewModal(false)} className="absolute top-3 right-4 text-slate-400 hover:text-slate-600">✕</button>
                        <div className="space-y-2 text-sm text-slate-700">
                            <p><b>Fecha:</b> {new Date(selectedCotizacion.fecha).toLocaleString("es-CL")}</p>
                            <p><b>Estado:</b> {formatEstado(selectedCotizacion.estado)}</p>
                            <p><b>Tipo:</b> {formatTipo(selectedCotizacion.tipo)}</p>
                            <p><b>Cliente:</b> {selectedCotizacion.entidad?.nombre || "—"}</p>
                            <p><b>Origen:</b> {selectedCotizacion.entidad?.origen || "—"}</p>
                            <p><b>RUT:</b> {selectedCotizacion.entidad?.rut || "—"}</p>
                            <p><b>Correo:</b> {selectedCotizacion.entidad?.correo || "—"}</p>
                            <p><b>Total:</b> ${Math.round(selectedCotizacion.total).toLocaleString("es-CL")}</p>
                            <div className="mt-4">
                                <b>Items:</b>
                                <ul className="mt-2 space-y-1">
                                    {selectedCotizacion.items.map((item, _index) => (
                                        <li key={item.id} className="text-xs border-b pb-1">
                                            {item.descripcion} - ${item.precio.toLocaleString("es-CL")} x {item.cantidad}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* MODAL: Crear Cotización MEJORADO */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl relative max-h-[90vh] overflow-y-auto"
                    >
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-slate-800 mb-4">
                                Nueva Cotización
                            </h2>

                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    resetForm();
                                }}
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl"
                            >
                                ✕
                            </button>

                            <div className="space-y-6">
                                {/* BLOQUE PRINCIPAL MEJORADO */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Información del Cliente */}
                                    <div className="p-4 border rounded-2xl bg-slate-50 relative">
                                        <h3 className="font-semibold text-slate-700 mb-3">Información del Cliente</h3>

                                        <div className="space-y-4">
                                            {/* === Tipo de Entidad === */}
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                                    Tipo de Entidad
                                                </label>

                                                <select
                                                    value={formData.tipoEntidad}
                                                    onChange={(e) => {
                                                        const tipo = e.target.value;
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            tipoEntidad: tipo,
                                                            entidadId: "",
                                                            origenEntidad: "",
                                                        }));

                                                        if (tipo === "PERSONA") {
                                                            fetch(`${API_URL}/entidades?tipo=PERSONA`, { credentials: "include" })
                                                                .then((r) => r.json())
                                                                .then((res) => setEntidades(res.data ?? res));
                                                        } else {
                                                            setEntidades([]);
                                                        }
                                                    }}
                                                    className="w-full border border-indigo-200 rounded-xl px-3 py-2 text-sm bg-white"
                                                >
                                                    <option value="EMPRESA">Empresa</option>
                                                    <option value="PERSONA">Persona</option>
                                                </select>
                                            </div>

                                            {/* === Origen de Empresa === */}
                                            {formData.tipoEntidad === "EMPRESA" && (
                                                <div>
                                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                                        Origen Empresa
                                                    </label>

                                                    <select
                                                        value={formData.origenEntidad}
                                                        onChange={(e) => {
                                                            const origen = e.target.value;

                                                            setFormData((prev) => ({
                                                                ...prev,
                                                                origenEntidad: origen,
                                                                entidadId: "",
                                                            }));

                                                            if (origen) {
                                                                fetch(`${API_URL}/entidades?tipo=EMPRESA&origen=${origen}`, {
                                                                    credentials: "include",
                                                                })
                                                                    .then((r) => r.json())
                                                                    .then((res) => setEntidades(res.data ?? res));
                                                            }
                                                        }}
                                                        className="w-full border border-indigo-200 rounded-xl px-3 py-2 text-sm bg-white"
                                                    >
                                                        <option value="">Seleccione…</option>
                                                        <option value="RIDS">RIDS</option>
                                                        <option value="ECCONET">ECCONET</option>
                                                        <option value="OTRO">OTRO</option>
                                                    </select>
                                                </div>
                                            )}

                                            {/* Botón Crear Persona */}
                                            {formData.tipoEntidad === "PERSONA" && (
                                                <div className="flex gap-2 mt-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setNombre("");
                                                            setRut("");
                                                            setCorreo("");
                                                            setTelefono("");
                                                            setDireccion("");
                                                            setShowNewEntidadModal(true);
                                                        }}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs hover:bg-emerald-700 transition"
                                                    >
                                                        <PlusOutlined /> Crear Persona
                                                    </button>

                                                    {formData.entidadId && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const ent = entidades.find(e => e.id === Number(formData.entidadId));
                                                                if (!ent) return;

                                                                setNombre(ent.nombre);
                                                                setRut(ent.rut ?? "");
                                                                setCorreo(ent.correo ?? "");
                                                                setTelefono(ent.telefono ?? "");
                                                                setDireccion(ent.direccion ?? "");

                                                                setEntidadParaEditar(ent);
                                                                setShowEditEntidadModal(true);
                                                            }}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs hover:bg-amber-600 transition"
                                                        >
                                                            <EditOutlined /> Editar
                                                        </button>
                                                    )}
                                                </div>
                                            )}


                                            {/* === Selector Final de Entidad === */}
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1">Entidad</label>
                                                <select
                                                    value={formData.entidadId}
                                                    onChange={(e) =>
                                                        setFormData((prev) => ({ ...prev, entidadId: e.target.value }))
                                                    }
                                                    disabled={entidades.length === 0}
                                                    className="w-full border border-indigo-200 rounded-xl px-3 py-2 text-sm bg-white"
                                                >
                                                    <option value="">Seleccione…</option>
                                                    {entidades.map((ent) => (
                                                        <option key={ent.id} value={ent.id}>
                                                            {ent.nombre} {ent.rut ? `(${ent.rut})` : ""}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* === Información de Cotización === */}
                                    <div className="p-4 border rounded-2xl bg-slate-50">
                                        <h3 className="font-semibold text-slate-700 mb-3">Configuración</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                                                <select
                                                    className="w-full border border-cyan-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-cyan-400"
                                                    defaultValue={TipoCotizacionGestioo.CLIENTE}
                                                >
                                                    <option value={TipoCotizacionGestioo.CLIENTE}>Cliente</option>
                                                    <option value={TipoCotizacionGestioo.INTERNA}>Interna</option>
                                                    <option value={TipoCotizacionGestioo.PROVEEDOR}>Proveedor</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
                                                <select
                                                    className="w-full border border-cyan-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-cyan-400"
                                                    defaultValue={EstadoCotizacionGestioo.BORRADOR}
                                                >
                                                    <option value={EstadoCotizacionGestioo.BORRADOR}>Borrador</option>
                                                    <option value={EstadoCotizacionGestioo.GENERADA}>Generada</option>
                                                    <option value={EstadoCotizacionGestioo.ENVIADA}>Enviada</option>
                                                    <option value={EstadoCotizacionGestioo.APROBADA}>Aprobada</option>
                                                    <option value={EstadoCotizacionGestioo.RECHAZADA}>Rechazada</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* BOTONES DE PRODUCTOS / SERVICIOS */}
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={cargarProductos}
                                        className="px-3 py-1.5 rounded-xl border border-cyan-300 text-cyan-700 hover:bg-cyan-50"
                                    >
                                        + Producto
                                    </button>

                                    <button
                                        type="button"
                                        onClick={cargarServicios}
                                        className="px-3 py-1.5 rounded-xl border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                    >
                                        + Servicio
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleAddItem(ItemTipoGestioo.ADICIONAL)}
                                        className="px-3 py-1.5 rounded-xl border border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                                    >
                                        + Descuento Adicional
                                    </button>
                                </div>

                                {/* TABLA DE ÍTEMS */}
                                <div className="border border-cyan-200 rounded-2xl overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead className="bg-cyan-50 text-slate-700 border-b border-cyan-200">
                                            <tr>
                                                <th className="px-3 py-2 text-left border-r border-cyan-200">Tipo</th>
                                                <th className="px-3 py-2 text-left border-r border-cyan-200">Descripción</th>
                                                <th className="px-3 py-2 text-center border-r border-cyan-200 w-20">Cant.</th>
                                                <th className="px-3 py-2 text-center border-r border-cyan-200 w-28">P.Unitario</th>
                                                <th className="px-3 py-2 text-center border-r border-cyan-200 w-20">IVA</th>
                                                <th className="px-3 py-2 text-center border-r border-cyan-200 w-24">% Desc</th>
                                                <th className="px-3 py-2 text-right border-r border-cyan-200 w-28">Subtotal</th>
                                                <th className="px-3 py-2 text-right w-16"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="text-center py-4 text-slate-400 border-b border-cyan-100">
                                                        No hay productos o servicios agregados.
                                                    </td>
                                                </tr>
                                            ) : (
                                                items.map((item, index) => {
                                                    // Calcular subtotal por item
                                                    const base = item.precio * item.cantidad;
                                                    const descuento = item.porcentaje ? (base * item.porcentaje) / 100 : 0;
                                                    const baseFinal = base - descuento;
                                                    const ivaItem = item.tieneIVA ? baseFinal * 0.19 : 0;
                                                    const totalItem = baseFinal + ivaItem;

                                                    return (
                                                        <tr
                                                            key={item.id}
                                                            className={`border-b border-cyan-100 last:border-b-0 ${item.tipo === ItemTipoGestioo.ADICIONAL
                                                                ? "bg-rose-50/50"
                                                                : index % 2 === 0
                                                                    ? "bg-white"
                                                                    : "bg-cyan-50/30"
                                                                }`}
                                                        >
                                                            {/* TIPO */}
                                                            <td className="px-3 py-2 border-r border-cyan-100">
                                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${item.tipo === ItemTipoGestioo.PRODUCTO
                                                                    ? 'bg-cyan-100 text-cyan-800'
                                                                    : item.tipo === ItemTipoGestioo.SERVICIO
                                                                        ? 'bg-emerald-100 text-emerald-800'
                                                                        : 'bg-amber-100 text-amber-800'
                                                                    }`}>
                                                                    {item.tipo === ItemTipoGestioo.PRODUCTO ? 'Producto' :
                                                                        item.tipo === ItemTipoGestioo.SERVICIO ? 'Servicio' : 'Descuento'}
                                                                </span>
                                                            </td>

                                                            {/* DESCRIPCIÓN */}
                                                            <td className="px-3 py-2 border-r border-cyan-100">
                                                                <input
                                                                    value={item.descripcion}
                                                                    onChange={(e) => handleUpdateItem(item.id, "descripcion", e.target.value)}
                                                                    className="w-full border border-cyan-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-cyan-400 focus:outline-none"
                                                                    placeholder={
                                                                        item.tipo === ItemTipoGestioo.ADICIONAL ? "Descripción del descuento" : "Descripción"
                                                                    }
                                                                />
                                                            </td>

                                                            {/* CANTIDAD */}
                                                            <td className="px-3 py-2 text-center border-r border-cyan-100">
                                                                <input
                                                                    type="number"
                                                                    min={1}
                                                                    value={item.cantidad}
                                                                    disabled={item.tipo === ItemTipoGestioo.ADICIONAL}
                                                                    onChange={(e) =>
                                                                        handleUpdateItem(item.id, "cantidad", Math.max(1, Number(e.target.value)))
                                                                    }
                                                                    className={`w-16 border border-cyan-200 rounded-lg px-2 py-1 text-center focus:ring-2 focus:ring-cyan-400 focus:outline-none ${item.tipo === ItemTipoGestioo.ADICIONAL
                                                                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                                        : "bg-white"
                                                                        }`}
                                                                />
                                                            </td>

                                                            {/* PRECIO UNITARIO */}
                                                            <td className="px-3 py-2 text-center border-r border-cyan-100">
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    step={100}
                                                                    value={item.precio === 0 ? "" : item.precio}
                                                                    disabled={item.tipo === ItemTipoGestioo.ADICIONAL}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value === "" ? 0 : Number(e.target.value);
                                                                        handleUpdateItem(item.id, "precio", value);
                                                                    }}
                                                                    className={`w-24 border border-cyan-200 rounded-lg px-2 py-1 text-center focus:ring-2 focus:ring-cyan-400 focus:outline-none ${item.tipo === ItemTipoGestioo.ADICIONAL
                                                                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                                                        : "bg-white"
                                                                        }`}
                                                                    placeholder="$"
                                                                />
                                                            </td>

                                                            {/* IVA - SOLO PARA PRODUCTOS */}
                                                            <td className="px-3 py-2 text-center border-r border-cyan-100">
                                                                {item.tipo === ItemTipoGestioo.PRODUCTO ? (
                                                                    <label className="flex items-center justify-center gap-2 text-sm">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={item.tieneIVA || false}
                                                                            onChange={(e) => handleUpdateItem(item.id, "tieneIVA", e.target.checked)}
                                                                            className="rounded focus:ring-cyan-400"
                                                                        />
                                                                        IVA
                                                                    </label>
                                                                ) : (
                                                                    <span className="text-slate-400 text-xs">—</span>
                                                                )}
                                                            </td>

                                                            {/* PORCENTAJE DESCUENTO */}
                                                            <td className="px-3 py-2 text-center border-r border-cyan-100">
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    max={100}
                                                                    step={0.5}
                                                                    value={item.porcentaje === 0 ? "" : item.porcentaje}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value === "" ? 0 : Number(e.target.value);
                                                                        handleUpdateItem(item.id, "porcentaje", value);
                                                                    }}
                                                                    disabled={item.tipo !== ItemTipoGestioo.ADICIONAL}
                                                                    className={`w-20 border rounded-lg px-2 py-1 text-center focus:outline-none ${item.tipo === ItemTipoGestioo.ADICIONAL
                                                                        ? "border-cyan-200 focus:ring-2 focus:ring-cyan-400 bg-white"
                                                                        : "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
                                                                        }`}
                                                                    placeholder="%"
                                                                />
                                                            </td>

                                                            {/* SUBTOTAL */}
                                                            <td className="px-3 py-2 text-right border-r border-cyan-100">
                                                                <span className={
                                                                    item.tipo === ItemTipoGestioo.ADICIONAL
                                                                        ? 'text-rose-600 font-medium'
                                                                        : 'text-slate-800 font-medium'
                                                                }>
                                                                    {item.tipo === ItemTipoGestioo.ADICIONAL ? (
                                                                        <>-${descuento.toLocaleString("es-CL")}</>
                                                                    ) : (
                                                                        <>${totalItem.toLocaleString("es-CL")}</>
                                                                    )}
                                                                </span>
                                                            </td>

                                                            {/* ACCIONES */}
                                                            <td className="px-3 py-2 text-right">
                                                                <button
                                                                    onClick={() => handleRemoveItem(item.id)}
                                                                    className="text-rose-500 hover:text-rose-700 transition-colors p-1 rounded hover:bg-rose-50"
                                                                    title="Eliminar item"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* TOTALES */}
                                <div className="flex justify-end text-sm text-slate-700">
                                    <div className="text-right space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <p>Subtotal bruto: ${Math.round(subtotalBruto).toLocaleString("es-CL")}</p>

                                        <p className="text-rose-600">
                                            Descuentos: -${Math.round(descuentos).toLocaleString("es-CL")}
                                        </p>

                                        <p>Subtotal: ${Math.round(subtotal).toLocaleString("es-CL")}</p>

                                        <p>IVA (19%): ${Math.round(iva).toLocaleString("es-CL")}</p>

                                        <p className="font-bold text-slate-900 border-t pt-1">
                                            Total final: ${Math.round(total).toLocaleString("es-CL")}
                                        </p>

                                    </div>
                                </div>

                                {/* BOTONES */}
                                <div className="flex justify-between items-center pt-4 border-t">
                                    <div>
                                        <p className="text-slate-600 text-sm">
                                            Estado inicial: <b>Borrador</b>
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowCreateModal(false);
                                                resetForm();
                                            }}
                                            className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={handleCreateCotizacion}
                                            disabled={!formData.entidadId || items.length === 0}
                                            className="px-4 py-2 rounded-xl bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Crear Cotización
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* MODAL: Seleccionar Productos CON FILTROS MEJORADOS Y CATEGORÍAS REALES */}
            {showSelectorProducto && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[9999]">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl relative max-h-[90vh] overflow-y-auto z-[10000]"
                    >

                        <div className="p-6">
                            <h2 className="text-xl font-bold text-slate-800 mb-4 border-b border-cyan-200 pb-3">
                                <FilterOutlined className="text-cyan-600 mr-2" />
                                Seleccionar Productos
                            </h2>

                            <button
                                onClick={() => setShowSelectorProducto(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl"
                            >
                                ✕
                            </button>

                            {/* FILTROS AVANZADOS MEJORADOS */}
                            <div className="mb-6 p-4 border border-cyan-200 rounded-2xl bg-cyan-50/30">
                                {/* Búsqueda principal */}
                                <div className="relative mb-4">
                                    <SearchOutlined className="absolute left-3 top-3 text-cyan-600" />
                                    <input
                                        type="text"
                                        placeholder="Buscar productos por nombre, descripción o código..."
                                        value={filtroProductos}
                                        onChange={(e) => setFiltroProductos(e.target.value)}
                                        className="w-full border border-cyan-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-white"
                                    />
                                </div>

                                {/* Búsqueda rápida por código */}
                                <div className="mb-4 p-3 border border-emerald-200 rounded-xl bg-emerald-50">
                                    <label className="block text-xs font-medium text-emerald-700 mb-2">
                                        <BarcodeOutlined className="mr-1" />
                                        Búsqueda Rápida por Código
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Ingresa código de producto..."
                                            value={filtroCodigoProducto}
                                            onChange={(e) => {
                                                setFiltroCodigoProducto(e.target.value);
                                                if (e.target.value.length >= 3) {
                                                    setFiltroProductos("");
                                                }
                                            }}
                                            className="flex-1 border border-emerald-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                        />
                                        <button
                                            onClick={() => setFiltroCodigoProducto("")}
                                            className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
                                        >
                                            Limpiar
                                        </button>
                                    </div>
                                </div>

                                {/* Filtros avanzados en grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {/* Filtro por precio mínimo */}
                                    <div>
                                        <label className="block text-xs font-medium text-cyan-700 mb-1">
                                            Precio Mín.
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="Mínimo"
                                            value={filtroPrecioMinProducto}
                                            onChange={(e) => setFiltroPrecioMinProducto(e.target.value)}
                                            className="w-full border border-cyan-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400"
                                        />
                                    </div>

                                    {/* Filtro por precio máximo */}
                                    <div>
                                        <label className="block text-xs font-medium text-cyan-700 mb-1">
                                            Precio Máx.
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="Máximo"
                                            value={filtroPrecioMaxProducto}
                                            onChange={(e) => setFiltroPrecioMaxProducto(e.target.value)}
                                            className="w-full border border-cyan-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400"
                                        />
                                    </div>

                                    {/* ✅ FILTRO POR CATEGORÍA - CON CATEGORÍAS REALES */}
                                    <div>
                                        <label className="block text-xs font-medium text-cyan-700 mb-1">
                                            Categoría
                                        </label>
                                        <select
                                            value={filtroCategoriaProducto}
                                            onChange={(e) => setFiltroCategoriaProducto(e.target.value)}
                                            className="w-full border border-cyan-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400"
                                        >
                                            <option value="">Todas las categorías</option>
                                            {categoriasDisponibles.map((categoria, index) => (
                                                <option key={index} value={categoria}>
                                                    {categoria}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Ordenamiento */}
                                    <div>
                                        <label className="block text-xs font-medium text-cyan-700 mb-1">
                                            Ordenar por
                                        </label>
                                        <select
                                            value={ordenProducto}
                                            onChange={(e) => setOrdenProducto(e.target.value)}
                                            className="w-full border border-cyan-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400"
                                        >
                                            <option value="asc">A-Z</option>
                                            <option value="desc">Z-A</option>
                                            <option value="precio-asc">Precio: Menor a Mayor</option>
                                            <option value="precio-desc">Precio: Mayor a Menor</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Filtros rápidos de precio */}
                                <div className="mt-4">
                                    <label className="block text-xs font-medium text-slate-600 mb-2">
                                        Rango de Precio Rápido
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { label: "Menos de $10.000", min: 0, max: 10000 },
                                            { label: "$10.000 - $50.000", min: 10000, max: 50000 },
                                            { label: "$50.000 - $100.000", min: 50000, max: 100000 },
                                            { label: "Más de $100.000", min: 100000, max: Infinity }
                                        ].map((rango, index) => (
                                            <button
                                                key={index}
                                                onClick={() => {
                                                    setFiltroPrecioMinProducto(rango.min === 0 ? "" : rango.min.toString());
                                                    setFiltroPrecioMaxProducto(rango.max === Infinity ? "" : rango.max.toString());
                                                }}
                                                className="px-3 py-1.5 text-xs border border-cyan-200 text-cyan-700 rounded-lg hover:bg-cyan-50 transition-colors"
                                            >
                                                {rango.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Indicadores de filtros activos */}
                                {(filtroProductos || filtroCodigoProducto || filtroPrecioMinProducto || filtroPrecioMaxProducto || filtroCategoriaProducto) && (
                                    <div className="mt-4 p-3 border border-amber-200 rounded-xl bg-amber-50">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-medium text-amber-700">Filtros activos:</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {filtroProductos && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs">
                                                    Texto: "{filtroProductos}"
                                                    <button onClick={() => setFiltroProductos("")}>×</button>
                                                </span>
                                            )}
                                            {filtroCodigoProducto && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs">
                                                    Código: "{filtroCodigoProducto}"
                                                    <button onClick={() => setFiltroCodigoProducto("")}>×</button>
                                                </span>
                                            )}
                                            {(filtroPrecioMinProducto || filtroPrecioMaxProducto) && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs">
                                                    Precio: ${filtroPrecioMinProducto || "0"} - ${filtroPrecioMaxProducto || "∞"}
                                                    <button onClick={() => { setFiltroPrecioMinProducto(""); setFiltroPrecioMaxProducto(""); }}>×</button>
                                                </span>
                                            )}
                                            {filtroCategoriaProducto && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs">
                                                    Categoría: {filtroCategoriaProducto}
                                                    <button onClick={() => setFiltroCategoriaProducto("")}>×</button>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Contador y botones de acción */}
                                <div className="flex justify-between items-center mt-4">
                                    <div className="text-sm text-cyan-700">
                                        {productosMostrar.length} de {productosCatalogo.length} productos encontrados
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={limpiarFiltrosProductos}
                                            className="px-3 py-1.5 text-xs border border-cyan-300 text-cyan-700 rounded-lg hover:bg-cyan-50 transition-colors"
                                        >
                                            Limpiar Todos los Filtros
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {productosMostrar.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500 border border-cyan-200 rounded-2xl bg-cyan-50/30 p-6">
                                        {filtroProductos || filtroCodigoProducto || filtroPrecioMinProducto || filtroPrecioMaxProducto || filtroCategoriaProducto ? (
                                            <>
                                                <p>No se encontraron productos que coincidan con los filtros aplicados</p>
                                                <button
                                                    onClick={limpiarFiltrosProductos}
                                                    className="mt-2 px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors"
                                                >
                                                    Mostrar todos los productos
                                                </button>
                                            </>
                                        ) : (
                                            <p>No hay productos disponibles</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {productosMostrar.map((producto) => (
                                            <div
                                                key={producto.id}
                                                className="border border-cyan-200 rounded-2xl p-4 hover:shadow-md transition-all cursor-pointer bg-white hover:border-cyan-300 relative group"
                                            >
                                                {/* BOTONES EDITAR + ELIMINAR */}
                                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            abrirEditarProducto(producto);
                                                        }}
                                                        className="p-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                                                        title="Editar producto"
                                                    >
                                                        <EditOutlined className="text-xs" />
                                                    </button>

                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEliminarProducto(producto.id);
                                                        }}
                                                        className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                                                        title="Eliminar producto"
                                                    >
                                                        <DeleteOutlined className="text-xs" />
                                                    </button>
                                                </div>

                                                {/* CARD ITEM */}
                                                <div onClick={() => agregarProducto(producto)}>
                                                    <h3 className="font-semibold text-slate-800 mb-2 pr-8">
                                                        {producto.nombre || "Producto sin nombre"}
                                                    </h3>

                                                    {/* ✅ MOSTRAR CATEGORÍA */}
                                                    {producto.categoria && (
                                                        <p className="text-xs text-cyan-600 mb-2">
                                                            <span className="font-medium">Categoría:</span> {producto.categoria}
                                                        </p>
                                                    )}

                                                    {producto.codigo && (
                                                        <p className="text-xs text-slate-500 mb-2">
                                                            <BarcodeOutlined className="mr-1" />
                                                            Código: {producto.codigo}
                                                        </p>
                                                    )}

                                                    <div className="flex justify-between items-center">
                                                        <span className="text-lg font-bold text-cyan-700">
                                                            ${(producto.precio || 0).toLocaleString("es-CL")}
                                                        </span>

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                agregarProducto(producto);
                                                            }}
                                                            className="px-3 py-1 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-sm transition-colors"
                                                        >
                                                            Agregar
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex justify-end border-t border-cyan-200 pt-4">
                                <button
                                    onClick={() => setShowSelectorProducto(false)}
                                    className="px-4 py-2 border border-cyan-200 text-cyan-700 rounded-xl hover:bg-cyan-50 transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* === MODAL: Editar Cotización (Completo ERP) === */}
            {/* MODAL: Editar Cotización - VERSIÓN MEJORADA */}
            {/* === MODAL: Editar Cotización (VERSIÓN COMPLETA) === */}
            {showEditModal && selectedCotizacion && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl relative max-h-[95vh] overflow-y-auto"
                    >
                        <div className="p-6">
                            {/* HEADER MEJORADO */}
                            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">
                                        Editar Cotización #{selectedCotizacion.id}
                                    </h2>
                                    <p className="text-slate-600 text-sm mt-1">
                                        Estado actual:
                                        <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${selectedCotizacion.estado === EstadoCotizacionGestioo.BORRADOR
                                            ? "bg-amber-100 text-amber-800"
                                            : selectedCotizacion.estado === EstadoCotizacionGestioo.APROBADA
                                                ? "bg-green-100 text-green-800"
                                                : "bg-blue-100 text-blue-800"
                                            }`}>
                                            {formatEstado(selectedCotizacion.estado)}
                                        </span>
                                    </p>
                                </div>

                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="text-slate-400 hover:text-slate-600 text-xl p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* INFORMACIÓN PRINCIPAL EN GRID */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                                {/* DATOS DEL CLIENTE MEJORADO CON ORIGEN */}
                                <div className="lg:col-span-2 p-4 border border-slate-200 rounded-xl bg-slate-50">
                                    <h3 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                        <UserOutlined />
                                        Datos del Cliente
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* ENTIDAD */}
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                Entidad *
                                            </label>
                                            <input
                                                type="text"
                                                value={selectedCotizacion.entidad?.nombre || ""}
                                                onChange={(e) =>
                                                    setSelectedCotizacion({
                                                        ...selectedCotizacion,
                                                        entidad: {
                                                            ...selectedCotizacion.entidad!,
                                                            nombre: e.target.value
                                                        }
                                                    })
                                                }
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                                placeholder="Nombre de la entidad"
                                                required
                                            />
                                        </div>

                                        {/* RUT */}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                RUT
                                            </label>
                                            <input
                                                type="text"
                                                value={selectedCotizacion.entidad?.rut || ""}
                                                onChange={(e) =>
                                                    setSelectedCotizacion({
                                                        ...selectedCotizacion,
                                                        entidad: {
                                                            ...selectedCotizacion.entidad!,
                                                            rut: e.target.value
                                                        }
                                                    })
                                                }
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                                placeholder="RUT"
                                            />
                                        </div>

                                        {/* ORIGEN - NUEVO CAMPO */}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                Origen *
                                            </label>
                                            <select
                                                value={selectedCotizacion.entidad?.origen || ""}
                                                onChange={(e) =>
                                                    setSelectedCotizacion({
                                                        ...selectedCotizacion,
                                                        entidad: {
                                                            ...selectedCotizacion.entidad!,
                                                            origen: e.target.value
                                                        }
                                                    })
                                                }
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-white"
                                                required
                                            >
                                                <option value="">Seleccionar origen</option>
                                                <option value="RIDS">RIDS</option>
                                                <option value="ECCONET">ECCONET</option>
                                                <option value="OTRO">OTRO</option>
                                            </select>
                                        </div>

                                        {/* CORREO */}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                Correo
                                            </label>
                                            <input
                                                type="email"
                                                value={selectedCotizacion.entidad?.correo || ""}
                                                onChange={(e) =>
                                                    setSelectedCotizacion({
                                                        ...selectedCotizacion,
                                                        entidad: {
                                                            ...selectedCotizacion.entidad!,
                                                            correo: e.target.value
                                                        }
                                                    })
                                                }
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                                placeholder="Correo electrónico"
                                            />
                                        </div>

                                        {/* TELÉFONO */}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                Teléfono
                                            </label>
                                            <input
                                                type="text"
                                                value={selectedCotizacion.entidad?.telefono || ""}
                                                onChange={(e) =>
                                                    setSelectedCotizacion({
                                                        ...selectedCotizacion,
                                                        entidad: {
                                                            ...selectedCotizacion.entidad!,
                                                            telefono: e.target.value
                                                        }
                                                    })
                                                }
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                                placeholder="Teléfono"
                                            />
                                        </div>

                                        {/* DIRECCIÓN */}
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                Dirección
                                            </label>
                                            <input
                                                type="text"
                                                value={selectedCotizacion.entidad?.direccion || ""}
                                                onChange={(e) =>
                                                    setSelectedCotizacion({
                                                        ...selectedCotizacion,
                                                        entidad: {
                                                            ...selectedCotizacion.entidad!,
                                                            direccion: e.target.value
                                                        }
                                                    })
                                                }
                                                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                                placeholder="Dirección"
                                            />
                                        </div>
                                    </div>

                                    {/* BADGE VISUAL DEL ORIGEN */}
                                    {selectedCotizacion.entidad?.origen && (
                                        <div className="mt-4 p-3 border rounded-lg bg-white">
                                            <p className="text-xs font-medium text-slate-600 mb-1">Origen seleccionado:</p>
                                            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${selectedCotizacion.entidad.origen === "RIDS"
                                                ? "bg-blue-100 text-blue-800 border border-blue-200"
                                                : selectedCotizacion.entidad.origen === "ECCONET"
                                                    ? "bg-green-100 text-green-800 border border-green-200"
                                                    : "bg-gray-100 text-gray-800 border border-gray-200"
                                                }`}>
                                                {selectedCotizacion.entidad.origen === "RIDS" && ""}
                                                {selectedCotizacion.entidad.origen === "ECCONET" && ""}
                                                {selectedCotizacion.entidad.origen === "OTRO" && ""}
                                                {selectedCotizacion.entidad.origen}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* CONFIGURACIÓN DE COTIZACIÓN */}
                                <div className="p-4 border border-cyan-200 rounded-xl bg-cyan-50/30">
                                    <h3 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                        <SettingOutlined />
                                        Configuración
                                    </h3>
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Estado *</label>
                                            <select
                                                value={selectedCotizacion.estado}
                                                onChange={(e) => setSelectedCotizacion({
                                                    ...selectedCotizacion,
                                                    estado: e.target.value as EstadoCotizacionGestioo
                                                })}
                                                className="w-full border border-cyan-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-white"
                                                required
                                            >
                                                <option value={EstadoCotizacionGestioo.BORRADOR}>Borrador</option>
                                                <option value={EstadoCotizacionGestioo.GENERADA}>Generada</option>
                                                <option value={EstadoCotizacionGestioo.ENVIADA}>Enviada</option>
                                                <option value={EstadoCotizacionGestioo.APROBADA}>Aprobada</option>
                                                <option value={EstadoCotizacionGestioo.RECHAZADA}>Rechazada</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">Tipo *</label>
                                            <select
                                                value={selectedCotizacion.tipo}
                                                onChange={(e) => setSelectedCotizacion({
                                                    ...selectedCotizacion,
                                                    tipo: e.target.value as TipoCotizacionGestioo
                                                })}
                                                className="w-full border border-cyan-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-white"
                                                required
                                            >
                                                <option value={TipoCotizacionGestioo.CLIENTE}>Cliente</option>
                                                <option value={TipoCotizacionGestioo.INTERNA}>Interna</option>
                                                <option value={TipoCotizacionGestioo.PROVEEDOR}>Proveedor</option>
                                            </select>
                                        </div>

                                        {/* FECHA DE COTIZACIÓN */}
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                Fecha de Cotización *
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={new Date(selectedCotizacion.fecha).toISOString().slice(0, 16)}
                                                onChange={(e) =>
                                                    setSelectedCotizacion({
                                                        ...selectedCotizacion,
                                                        fecha: e.target.value
                                                    })
                                                }
                                                className="w-full border border-cyan-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-white"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* BOTONES PARA AGREGAR ITEMS */}
                            <div className="flex flex-wrap gap-3 mb-4 p-4 border border-slate-200 rounded-xl bg-white">
                                <span className="text-sm font-medium text-slate-700 mr-2">Agregar items:</span>
                                <button
                                    onClick={cargarProductos}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors text-sm"
                                >
                                    <PlusOutlined />
                                    Producto
                                </button>
                                <button
                                    onClick={cargarServicios}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm"
                                >
                                    <PlusOutlined />
                                    Servicio
                                </button>
                                <button
                                    onClick={() => {
                                        const newItem: CotizacionItemGestioo = {
                                            id: Date.now(),
                                            cotizacionId: selectedCotizacion.id,
                                            tipo: ItemTipoGestioo.ADICIONAL,
                                            descripcion: "Descuento adicional",
                                            cantidad: 1,
                                            precio: 0,
                                            porcentaje: 10,
                                            createdAt: new Date().toISOString()
                                        };
                                        setSelectedCotizacion({
                                            ...selectedCotizacion,
                                            items: [...selectedCotizacion.items, newItem]
                                        });
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-colors text-sm"
                                >
                                    <PlusOutlined />
                                    Descuento
                                </button>
                            </div>

                            {/* TABLA DE ITEMS MEJORADA */}
                            <div className="mb-6 border border-slate-200 rounded-xl overflow-hidden">
                                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                                    <h3 className="text-lg font-semibold text-slate-700">
                                        Items de la Cotización ({selectedCotizacion.items.length})
                                    </h3>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-100 text-slate-700">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-semibold border-r border-slate-200">Tipo</th>
                                                <th className="px-4 py-3 text-left font-semibold border-r border-slate-200">Descripción *</th>
                                                <th className="px-4 py-3 text-center font-semibold border-r border-slate-200 w-24">Cantidad *</th>
                                                <th className="px-4 py-3 text-right font-semibold border-r border-slate-200 w-32">P. Unitario *</th>
                                                <th className="px-4 py-3 text-right font-semibold border-r border-slate-200 w-32">IVA *</th>
                                                <th className="px-4 py-3 text-center font-semibold border-r border-slate-200 w-28">% Desc.</th>
                                                <th className="px-4 py-3 text-right font-semibold border-r border-slate-200 w-32">Subtotal</th>
                                                <th className="px-4 py-3 text-center font-semibold w-20">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedCotizacion.items.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="text-center py-8 text-slate-500">
                                                        <FileTextOutlined className="text-3xl text-slate-300 mb-2" />
                                                        <p>No hay items en esta cotización</p>
                                                        <p className="text-xs text-rose-600 mt-2">
                                                            Debe agregar al menos un item para guardar la cotización
                                                        </p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                selectedCotizacion.items.map((item, index) => {
                                                    const base = item.precio * item.cantidad;
                                                    const descuento = item.porcentaje ? (base * item.porcentaje) / 100 : 0;
                                                    const baseFinal = base - descuento;

                                                    let totalItem = baseFinal;

                                                    // SOLO PRODUCTOS: aplicar IVA
                                                    if (item.tipo === ItemTipoGestioo.PRODUCTO && item.tieneIVA) {
                                                        totalItem = baseFinal * 1.19;
                                                    }

                                                    return (
                                                        <tr
                                                            key={item.id}
                                                            className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${item.tipo === ItemTipoGestioo.ADICIONAL ? 'bg-rose-50/50' : ''
                                                                }`}
                                                        >
                                                            {/* TIPO */}
                                                            <td className="px-4 py-3 border-r border-slate-100">
                                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${item.tipo === ItemTipoGestioo.PRODUCTO
                                                                    ? 'bg-cyan-100 text-cyan-800'
                                                                    : item.tipo === ItemTipoGestioo.SERVICIO
                                                                        ? 'bg-emerald-100 text-emerald-800'
                                                                        : 'bg-amber-100 text-amber-800'
                                                                    }`}>
                                                                    {item.tipo === ItemTipoGestioo.PRODUCTO ? 'Producto' :
                                                                        item.tipo === ItemTipoGestioo.SERVICIO ? 'Servicio' : 'Descuento'}
                                                                </span>
                                                            </td>

                                                            {/* DESCRIPCIÓN */}
                                                            <td className="px-4 py-3 border-r border-slate-100">
                                                                <input
                                                                    value={item.descripcion}
                                                                    onChange={(e) => {
                                                                        const newItems = [...selectedCotizacion.items];
                                                                        newItems[index].descripcion = e.target.value;
                                                                        setSelectedCotizacion({ ...selectedCotizacion, items: newItems });
                                                                    }}
                                                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                                                                    placeholder="Descripción del item"
                                                                    required
                                                                />
                                                            </td>

                                                            {/* CANTIDAD */}
                                                            <td className="px-4 py-3 border-r border-slate-100 text-center">
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={item.cantidad}
                                                                    onChange={(e) => {
                                                                        const value = Math.max(1, Number(e.target.value));
                                                                        const newItems = [...selectedCotizacion.items];
                                                                        newItems[index].cantidad = value;
                                                                        setSelectedCotizacion({ ...selectedCotizacion, items: newItems });
                                                                    }}
                                                                    disabled={item.tipo === ItemTipoGestioo.ADICIONAL}
                                                                    className={`w-20 border border-slate-200 rounded-lg px-2 py-2 text-center focus:outline-none focus:ring-2 focus:ring-cyan-400 ${item.tipo === ItemTipoGestioo.ADICIONAL
                                                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                                        : 'bg-white'
                                                                        }`}
                                                                    required
                                                                />
                                                            </td>

                                                            {/* PRECIO UNITARIO */}
                                                            <td className="px-4 py-3 border-r border-slate-100 text-right">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    step="100"
                                                                    value={item.precio}
                                                                    onChange={(e) => {
                                                                        const value = Math.max(0, Number(e.target.value));
                                                                        const newItems = [...selectedCotizacion.items];
                                                                        newItems[index].precio = value;
                                                                        setSelectedCotizacion({ ...selectedCotizacion, items: newItems });
                                                                    }}
                                                                    disabled={item.tipo === ItemTipoGestioo.ADICIONAL}
                                                                    className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-cyan-400 ${item.tipo === ItemTipoGestioo.ADICIONAL
                                                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                                        : 'bg-white'
                                                                        }`}
                                                                    required
                                                                />
                                                            </td>

                                                            {/* IVA */}
                                                            <td className="px-4 py-3 border-r border-slate-100 text-center">
                                                                {item.tipo === ItemTipoGestioo.PRODUCTO ? (
                                                                    <label className="flex items-center justify-center gap-2 text-sm">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={item.tieneIVA || false}
                                                                            onChange={(e) => {
                                                                                const newItems = [...selectedCotizacion.items];
                                                                                newItems[index].tieneIVA = e.target.checked;
                                                                                setSelectedCotizacion({ ...selectedCotizacion, items: newItems });
                                                                            }}
                                                                        />
                                                                        IVA
                                                                    </label>
                                                                ) : (
                                                                    <span className="text-slate-400 text-xs">—</span> // servicios no pueden tener IVA
                                                                )}
                                                            </td>

                                                            {/* PORCENTAJE DESCUENTO */}
                                                            <td className="px-4 py-3 border-r border-slate-100 text-center">
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    step="0.5"
                                                                    value={item.porcentaje || 0}
                                                                    onChange={(e) => {
                                                                        const value = Math.min(100, Math.max(0, Number(e.target.value)));
                                                                        const newItems = [...selectedCotizacion.items];
                                                                        newItems[index].porcentaje = value;
                                                                        setSelectedCotizacion({ ...selectedCotizacion, items: newItems });
                                                                    }}
                                                                    className="w-20 border border-slate-200 rounded-lg px-2 py-2 text-center focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-white"
                                                                />
                                                            </td>

                                                            {/* SUBTOTAL */}
                                                            <td className="px-4 py-3 border-r border-slate-100 text-right font-semibold">
                                                                <span className={
                                                                    item.tipo === ItemTipoGestioo.ADICIONAL
                                                                        ? 'text-rose-600'
                                                                        : 'text-slate-800'
                                                                }>
                                                                    ${totalItem.toLocaleString("es-CL")}
                                                                </span>
                                                            </td>

                                                            {/* ACCIONES */}
                                                            <td className="px-4 py-3 text-center">
                                                                <button
                                                                    onClick={() => {
                                                                        const newItems = selectedCotizacion.items.filter((_, i) => i !== index);
                                                                        setSelectedCotizacion({ ...selectedCotizacion, items: newItems });
                                                                    }}
                                                                    className="text-rose-500 hover:text-rose-700 p-2 rounded-lg hover:bg-rose-50 transition-colors"
                                                                    title="Eliminar item"
                                                                >
                                                                    <DeleteOutlined />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* RESUMEN FINANCIERO MEJORADO */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 mb-6">
                                <h3 className="text-lg font-semibold text-slate-700 mb-4">Resumen Financiero</h3>

                                {(() => {
                                    // 1. Subtotal bruto (sin IVA)
                                    const subtotalBruto = selectedCotizacion.items
                                        .filter(item => item.tipo !== ItemTipoGestioo.ADICIONAL)
                                        .reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

                                    // 2. Descuentos
                                    const descuentos = selectedCotizacion.items
                                        .filter(item => item.tipo === ItemTipoGestioo.ADICIONAL)
                                        .reduce((acc, item) => {
                                            if (item.porcentaje && item.porcentaje > 0) {
                                                return acc + (subtotalBruto * item.porcentaje) / 100;
                                            }
                                            return acc + (item.precio * item.cantidad);
                                        }, 0);

                                    // 3. Subtotal neto sin IVA
                                    const subtotal = Math.max(0, subtotalBruto - descuentos);

                                    // 4. IVA solo por ítems con tieneIVA = true
                                    const iva = selectedCotizacion.items
                                        .filter(item => item.tieneIVA === true)  // 🔥 solo a productos con IVA
                                        .reduce((acc, item) => {
                                            const subtotalItem = item.precio * item.cantidad;

                                            // Si tiene descuento porcentual, aplícalo antes del IVA
                                            const descuentoItem = item.porcentaje
                                                ? (subtotalItem * item.porcentaje) / 100
                                                : 0;

                                            const subtotalNetoItem = subtotalItem - descuentoItem;

                                            return acc + subtotalNetoItem * 0.19; // aplicar IVA por ítem
                                        }, 0);

                                    // 5. Total final
                                    const total = subtotal + iva;

                                    return (
                                        // Reemplazar el resumen actual con este:
                                        <div className="flex justify-end text-sm text-slate-700">
                                            <div className="text-right space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200 min-w-[200px]">
                                                <div className="flex justify-between">
                                                    <span>Subtotal bruto:</span>
                                                    <span className="font-medium">${subtotalBruto.toLocaleString("es-CL")}</span>
                                                </div>
                                                <div className="flex justify-between text-rose-600">
                                                    <span>Descuentos:</span>
                                                    <span className="font-medium">-${descuentos.toLocaleString("es-CL")}</span>
                                                </div>
                                                <div className="flex justify-between border-t border-slate-200 pt-1">
                                                    <span>Subtotal neto:</span>
                                                    <span className="font-medium">${subtotal.toLocaleString("es-CL")}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>IVA (19%):</span>
                                                    <span className="font-medium">${iva.toLocaleString("es-CL")}</span>
                                                </div>
                                                <div className="flex justify-between border-t border-slate-300 pt-2 font-bold text-slate-900">
                                                    <span>Total final:</span>
                                                    <span>${total.toLocaleString("es-CL")}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* BOTONES DE ACCIÓN MEJORADOS */}
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-slate-200">
                                <div className="text-sm text-slate-500">
                                    Última actualización: {new Date(selectedCotizacion.updatedAt).toLocaleString('es-CL')}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowEditModal(false)}
                                        className="px-6 py-3 rounded-xl bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors font-medium"
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        onClick={() => {
                                            handlePrint(selectedCotizacion);
                                        }}
                                        className="px-6 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2"
                                    >
                                        <PrinterOutlined />
                                        Generar PDF
                                    </button>

                                    <button
                                        onClick={handleUpdateCotizacion}
                                        disabled={selectedCotizacion.items.length === 0}
                                        className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 transition-all duration-200 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <CheckCircleOutlined />
                                        Guardar Cambios
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
            {/* MODAL: Seleccionar Servicios CON FILTROS MEJORADOS */}
            {showSelectorServicio && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl relative max-h-[90vh] overflow-y-auto"
                    >
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-slate-800 mb-4 border-b border-emerald-200 pb-3">
                                <FilterOutlined className="text-emerald-600 mr-2" />
                                Seleccionar Servicios
                            </h2>

                            <button
                                onClick={() => setShowSelectorServicio(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl"
                            >
                                ✕
                            </button>

                            {/* FILTROS AVANZADOS MEJORADOS */}
                            <div className="mb-6 p-4 border border-emerald-200 rounded-2xl bg-emerald-50/30">
                                {/* Búsqueda principal */}
                                <div className="relative mb-4">
                                    <SearchOutlined className="absolute left-3 top-3 text-emerald-600" />
                                    <input
                                        type="text"
                                        placeholder="Buscar servicios por nombre, descripción o código..."
                                        value={filtroServicios}
                                        onChange={(e) => setFiltroServicios(e.target.value)}
                                        className="w-full border border-emerald-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                                    />
                                </div>

                                {/* Búsqueda rápida por código */}
                                <div className="mb-4 p-3 border border-green-200 rounded-xl bg-green-50">
                                    <label className="block text-xs font-medium text-green-700 mb-2">
                                        <BarcodeOutlined className="mr-1" />
                                        Búsqueda Rápida por Código
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="Ingresa código de servicio..."
                                            value={filtroCodigoServicio}
                                            onChange={(e) => {
                                                setFiltroCodigoServicio(e.target.value);
                                                if (e.target.value.length >= 3) {
                                                    setFiltroServicios("");
                                                }
                                            }}
                                            className="flex-1 border border-green-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                        />
                                        <button
                                            onClick={() => setFiltroCodigoServicio("")}
                                            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                                        >
                                            Limpiar
                                        </button>
                                    </div>
                                </div>

                                {/* Filtros avanzados en grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {/* Filtro por precio mínimo */}
                                    <div>
                                        <label className="block text-xs font-medium text-emerald-700 mb-1">
                                            Precio Mín.
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="Mínimo"
                                            value={filtroPrecioMinServicio}
                                            onChange={(e) => setFiltroPrecioMinServicio(e.target.value)}
                                            className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                        />
                                    </div>

                                    {/* Filtro por precio máximo */}
                                    <div>
                                        <label className="block text-xs font-medium text-emerald-700 mb-1">
                                            Precio Máx.
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="Máximo"
                                            value={filtroPrecioMaxServicio}
                                            onChange={(e) => setFiltroPrecioMaxServicio(e.target.value)}
                                            className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                        />
                                    </div>

                                    {/* Filtro por categoría */}
                                    <div>
                                        <label className="block text-xs font-medium text-emerald-700 mb-1">
                                            Categoría
                                        </label>
                                        <select
                                            value={filtroCategoriaServicio}
                                            onChange={(e) => setFiltroCategoriaServicio(e.target.value)}
                                            className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                        >
                                            <option value="">Todas</option>
                                            <option value="consultoria">Consultoría</option>
                                            <option value="soporte">Soporte Técnico</option>
                                            <option value="mantenimiento">Mantenimiento</option>
                                            <option value="desarrollo">Desarrollo</option>
                                        </select>
                                    </div>

                                    {/* Ordenamiento */}
                                    <div>
                                        <label className="block text-xs font-medium text-emerald-700 mb-1">
                                            Ordenar por
                                        </label>
                                        <select
                                            value={ordenServicio}
                                            onChange={(e) => setOrdenServicio(e.target.value)}
                                            className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                        >
                                            <option value="asc">A-Z</option>
                                            <option value="desc">Z-A</option>
                                            <option value="precio-asc">Precio: Menor a Mayor</option>
                                            <option value="precio-desc">Precio: Mayor a Menor</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Contador y botones de acción */}
                                <div className="flex justify-between items-center mt-4">
                                    <div className="text-sm text-emerald-700">
                                        {serviciosMostrar.length} de {serviciosCatalogo.length} servicios encontrados
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={limpiarFiltrosServicios}
                                            className="px-3 py-1.5 text-xs border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors"
                                        >
                                            Limpiar Todos los Filtros
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {serviciosMostrar.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500 border border-emerald-200 rounded-2xl bg-emerald-50/30 p-6">
                                        {filtroServicios || filtroCodigoServicio || filtroPrecioMinServicio || filtroPrecioMaxServicio || filtroCategoriaServicio ? (
                                            <>
                                                <p>No se encontraron servicios que coincidan con los filtros aplicados</p>
                                                <button
                                                    onClick={limpiarFiltrosServicios}
                                                    className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors"
                                                >
                                                    Mostrar todos los servicios
                                                </button>
                                            </>
                                        ) : (
                                            <p>No hay servicios disponibles</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {serviciosMostrar.map((servicio) => (
                                            <div
                                                key={servicio.id}
                                                className="border border-emerald-200 rounded-2xl p-4 hover:shadow-md transition-all cursor-pointer bg-white hover:border-emerald-300 relative group"
                                            >
                                                {/* BOTONES EDITAR */}
                                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            abrirEditarServicio(servicio);
                                                        }}
                                                        className="p-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                                                        title="Editar servicio"
                                                    >
                                                        <EditOutlined className="text-xs" />
                                                    </button>
                                                </div>

                                                {/* CARD ITEM */}
                                                <div onClick={() => agregarServicio(servicio)}>
                                                    <h3 className="font-semibold text-slate-800 mb-2 pr-8">
                                                        {servicio.nombre || "Servicio sin nombre"}
                                                    </h3>

                                                    {servicio.descripcion && (
                                                        <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                                                            {servicio.descripcion}
                                                        </p>
                                                    )}

                                                    {servicio.codigo && (
                                                        <p className="text-xs text-slate-500 mb-2">
                                                            <BarcodeOutlined className="mr-1" />
                                                            Código: {servicio.codigo}
                                                        </p>
                                                    )}

                                                    <div className="flex justify-between items-center">
                                                        <span className="text-lg font-bold text-emerald-700">
                                                            ${(servicio.precio || 0).toLocaleString("es-CL")}
                                                        </span>

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                agregarServicio(servicio);
                                                            }}
                                                            className="px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm transition-colors"
                                                        >
                                                            Agregar
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 flex justify-end border-t border-emerald-200 pt-4">
                                <button
                                    onClick={() => setShowSelectorServicio(false)}
                                    className="px-4 py-2 border border-emerald-200 text-emerald-700 rounded-xl hover:bg-emerald-50 transition-colors"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* MODAL: Editar Producto CON CATEGORÍA */}
            {showEditProductoModal && productoAEditar && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative"
                    >
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-slate-800 mb-4">
                                Editar Producto
                            </h2>

                            <button
                                onClick={() => setShowEditProductoModal(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl"
                            >
                                ✕
                            </button>

                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);
                                    const productoData = {
                                        nombre: formData.get('nombre') as string,
                                        descripcion: formData.get('descripcion') as string,
                                        precio: Number(formData.get('precio')),
                                        codigo: formData.get('codigo') as string,
                                        categoria: formData.get('categoria') as string, // ← AGREGAR CATEGORÍA
                                    };
                                    handleEditarProducto(productoData);
                                }}
                                className="space-y-4"
                            >
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Nombre del Producto
                                    </label>
                                    <input
                                        name="nombre"
                                        defaultValue={productoAEditar.nombre}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                                        placeholder="Nombre del producto"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Descripción
                                    </label>
                                    <textarea
                                        name="descripcion"
                                        defaultValue={productoAEditar.descripcion}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 resize-none"
                                        placeholder="Descripción del producto"
                                        rows={3}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Precio
                                    </label>
                                    <input
                                        name="precio"
                                        type="number"
                                        step="0.01"
                                        defaultValue={productoAEditar.precio}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                                        placeholder="0"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Código
                                    </label>
                                    <input
                                        name="codigo"
                                        defaultValue={productoAEditar.codigo}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                                        placeholder="Código del producto"
                                    />
                                </div>

                                {/* ✅ AGREGAR CAMPO CATEGORÍA */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Categoría
                                    </label>
                                    <input
                                        name="categoria"
                                        defaultValue={productoAEditar.categoria}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                                        placeholder="Categoría del producto"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditProductoModal(false)}
                                        className="px-6 py-2.5 rounded-xl bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-all duration-200 font-medium"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2.5 rounded-xl text-white font-medium transition-all duration-200 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-lg hover:shadow-xl"
                                    >
                                        Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* MODAL: Editar Servicio */}
            {showEditServicioModal && servicioAEditar && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative"
                    >
                        <div className="p-6">
                            <h2 className="text-xl font-bold text-slate-800 mb-4">
                                Editar Servicio
                            </h2>

                            <button
                                onClick={() => setShowEditServicioModal(false)}
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl"
                            >
                                ✕
                            </button>

                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);
                                    const servicioData = {
                                        nombre: formData.get('nombre') as string,
                                        descripcion: formData.get('descripcion') as string,
                                        precio: Number(formData.get('precio')),
                                        codigo: formData.get('codigo') as string,
                                    };
                                    handleEditarServicio(servicioData);
                                }}
                                className="space-y-4"
                            >
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Nombre del Servicio
                                    </label>
                                    <input
                                        name="nombre"
                                        defaultValue={servicioAEditar.nombre}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                                        placeholder="Nombre del servicio"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Descripción
                                    </label>
                                    <textarea
                                        name="descripcion"
                                        defaultValue={servicioAEditar.descripcion}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 resize-none"
                                        placeholder="Descripción del servicio"
                                        rows={3}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Precio
                                    </label>
                                    <input
                                        name="precio"
                                        type="number"
                                        step="0.01"
                                        defaultValue={servicioAEditar.precio}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                                        placeholder="0"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Código
                                    </label>
                                    <input
                                        name="codigo"
                                        defaultValue={servicioAEditar.codigo}
                                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
                                        placeholder="Código del servicio"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditServicioModal(false)}
                                        className="px-6 py-2.5 rounded-xl bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-all duration-200 font-medium"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2.5 rounded-xl text-white font-medium transition-all duration-200 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 shadow-lg hover:shadow-xl"
                                    >
                                        Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </div>
            )}

            {showEditEntidadModal && entidadParaEditar && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative"
                    >
                        <h2 className="text-lg font-bold mb-4">Editar Persona</h2>

                        <button
                            onClick={() => setShowEditEntidadModal(false)}
                            className="absolute top-3 right-4 text-slate-400 hover:text-slate-600"
                        >✕</button>

                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();

                                try {
                                    await apiFetch(`/entidades/${entidadParaEditar.id}`, {
                                        method: "PUT",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            nombre,
                                            rut,
                                            correo,
                                            telefono,
                                            direccion,
                                        })
                                    });

                                    fetchEntidades();
                                    showSuccess("Persona actualizada correctamente");
                                    setShowEditEntidadModal(false);
                                } catch (err) {
                                    handleApiError(err, "Error al actualizar la persona");
                                }
                            }}
                            className="space-y-4"
                        >
                            <div>
                                <label className="text-xs">Nombre</label>
                                <input className="w-full border rounded-lg px-2 py-1"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-xs">RUT</label>
                                <input className="w-full border rounded-lg px-2 py-1"
                                    value={rut}
                                    onChange={(e) => setRut(formatearRut(e.target.value))}
                                />
                            </div>

                            <div>
                                <label className="text-xs">Correo</label>
                                <input className="w-full border rounded-lg px-2 py-1"
                                    value={correo}
                                    onChange={(e) => setCorreo(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-xs">Teléfono</label>
                                <input className="w-full border rounded-lg px-2 py-1"
                                    value={telefono}
                                    onChange={(e) => setTelefono(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-xs">Dirección</label>
                                <input className="w-full border rounded-lg px-2 py-1"
                                    value={direccion}
                                    onChange={(e) => setDireccion(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
                            >
                                Guardar Cambios
                            </button>
                        </form>
                    </motion.div>
                </div>
            )}

            {showNewEntidadModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative"
                    >
                        {/* Header mejorado */}
                        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-cyan-50 rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500 rounded-xl text-white">
                                    <UserOutlined className="text-lg" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Crear Nueva Persona</h2>
                                    <p className="text-slate-600 text-sm mt-1">Complete la información de la persona</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowNewEntidadModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            ✕
                        </button>

                        {/* Formulario mejorado */}
                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();

                                const datos = {
                                    nombre,
                                    rut,
                                    correo,
                                    telefono,
                                    direccion,
                                    tipo: "PERSONA",
                                    origen: null
                                };

                                try {
                                    const res = await apiFetch("/entidades", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify(datos)
                                    });

                                    // Actualizar lista de entidades
                                    fetchEntidades();

                                    // Setear entidad recién creada como seleccionada
                                    setFormData(prev => ({
                                        ...prev,
                                        entidadId: res.data.id.toString()
                                    }));

                                    setShowNewEntidadModal(false);
                                    showSuccess("Persona creada correctamente");

                                    // Limpiar formulario
                                    setNombre("");
                                    setRut("");
                                    setCorreo("");
                                    setTelefono("");
                                    setDireccion("");
                                } catch (error) {
                                    handleApiError(error, "Error al crear persona");
                                }
                            }}
                            className="p-6 space-y-4"
                        >
                            {/* Campo Nombre */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <UserOutlined className="text-emerald-600 text-sm" />
                                    Nombre Completo *
                                </label>
                                <input
                                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all duration-200"
                                    placeholder="Ej: Juan Pérez González"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Campo RUT */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <BarcodeOutlined className="text-cyan-600 text-sm" />
                                    RUT
                                </label>
                                <input
                                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-200"
                                    placeholder="Ej: 12.345.678-9"
                                    value={rut}
                                    onChange={(e) => setRut(formatearRut(e.target.value))}
                                />
                                {rut && !validarRut(rut) && (
                                    <p className="text-rose-600 text-xs flex items-center gap-1">
                                        <CloseCircleOutlined />
                                        RUT no válido
                                    </p>
                                )}
                            </div>

                            {/* Grid para Correo y Teléfono */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Campo Correo */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <FileTextOutlined className="text-blue-600 text-sm" />
                                        Correo Electrónico
                                    </label>
                                    <input
                                        type="email"
                                        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200"
                                        placeholder="ejemplo@correo.com"
                                        value={correo}
                                        onChange={(e) => setCorreo(e.target.value)}
                                    />
                                </div>

                                {/* Campo Teléfono */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <PhoneOutlined className="text-indigo-600 text-sm" />
                                        Teléfono
                                    </label>
                                    <input
                                        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                                        placeholder="+56 9 1234 5678"
                                        value={telefono}
                                        onChange={(e) => setTelefono(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Campo Dirección */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <EnvironmentOutlined className="text-amber-600 text-sm" />
                                    Dirección
                                </label>
                                <input
                                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all duration-200"
                                    placeholder="Ej: Av. Principal 123, Santiago"
                                    value={direccion}
                                    onChange={(e) => setDireccion(e.target.value)}
                                />
                            </div>

                            {/* Información adicional */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <InfoCircleOutlined className="text-slate-400 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-slate-700">Información importante</p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Los campos marcados con * son obligatorios. La persona creada estará disponible inmediatamente para usar en la cotización.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Botones de acción */}
                            <div className="flex gap-3 pt-4 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setShowNewEntidadModal(false)}
                                    className="flex-1 px-4 py-3 rounded-xl bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-all duration-200 font-medium flex items-center justify-center gap-2"
                                >
                                    <CloseCircleOutlined />
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 rounded-xl text-white font-medium transition-all duration-200 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                                >
                                    <CheckCircleOutlined />
                                    Crear Persona
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}

            {showEditEntidadModal && entidadParaEditar && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative"
                    >
                        {/* Header mejorado */}
                        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-500 rounded-xl text-white">
                                    <EditOutlined className="text-lg" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">Editar Persona</h2>
                                    <p className="text-slate-600 text-sm mt-1">Actualice la información de la persona</p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowEditEntidadModal(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            ✕
                        </button>

                        {/* Formulario mejorado */}
                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();

                                try {
                                    await apiFetch(`/entidades/${entidadParaEditar.id}`, {
                                        method: "PUT",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                            nombre,
                                            rut,
                                            correo,
                                            telefono,
                                            direccion,
                                        })
                                    });

                                    fetchEntidades();
                                    showSuccess("Persona actualizada correctamente");
                                    setShowEditEntidadModal(false);
                                } catch (err) {
                                    handleApiError(err, "Error al actualizar la persona");
                                }
                            }}
                            className="p-6 space-y-4"
                        >
                            {/* Campo Nombre */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <UserOutlined className="text-emerald-600 text-sm" />
                                    Nombre Completo *
                                </label>
                                <input
                                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all duration-200"
                                    placeholder="Ej: Juan Pérez González"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                    required
                                />
                            </div>

                            {/* Campo RUT */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <BarcodeOutlined className="text-cyan-600 text-sm" />
                                    RUT
                                </label>
                                <input
                                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all duration-200"
                                    placeholder="Ej: 12.345.678-9"
                                    value={rut}
                                    onChange={(e) => setRut(formatearRut(e.target.value))}
                                />
                                {rut && !validarRut(rut) && (
                                    <p className="text-rose-600 text-xs flex items-center gap-1">
                                        <CloseCircleOutlined />
                                        RUT no válido
                                    </p>
                                )}
                            </div>

                            {/* Grid para Correo y Teléfono */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Campo Correo */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <FileTextOutlined className="text-blue-600 text-sm" />
                                        Correo Electrónico
                                    </label>
                                    <input
                                        type="email"
                                        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all duration-200"
                                        placeholder="ejemplo@correo.com"
                                        value={correo}
                                        onChange={(e) => setCorreo(e.target.value)}
                                    />
                                </div>

                                {/* Campo Teléfono */}
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                                        <PhoneOutlined className="text-indigo-600 text-sm" />
                                        Teléfono
                                    </label>
                                    <input
                                        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition-all duration-200"
                                        placeholder="+56 9 1234 5678"
                                        value={telefono}
                                        onChange={(e) => setTelefono(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Campo Dirección */}
                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700 flex items-center gap-2">
                                    <EnvironmentOutlined className="text-amber-600 text-sm" />
                                    Dirección
                                </label>
                                <input
                                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all duration-200"
                                    placeholder="Ej: Av. Principal 123, Santiago"
                                    value={direccion}
                                    onChange={(e) => setDireccion(e.target.value)}
                                />
                            </div>

                            {/* Información de la persona */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <InfoCircleOutlined className="text-blue-500 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-blue-700">Editando persona existente</p>
                                        <p className="text-xs text-blue-600 mt-1">
                                            ID: {entidadParaEditar.id}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Botones de acción */}
                            <div className="flex gap-3 pt-4 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setShowEditEntidadModal(false)}
                                    className="flex-1 px-4 py-3 rounded-xl bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-all duration-200 font-medium flex items-center justify-center gap-2"
                                >
                                    <CloseCircleOutlined />
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-3 rounded-xl text-white font-medium transition-all duration-200 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                                >
                                    <CheckCircleOutlined />
                                    Guardar Cambios
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </div>
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

export default Cotizaciones;