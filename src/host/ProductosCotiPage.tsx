// src/host/ProductosCotiPage.tsx
import React, {
    useEffect,
    useState,
    useCallback,
    useMemo,
} from "react";
import {
    Plus,
    Pencil,
    Package,
    Search,
    X,
    Tag,
    DollarSign,
    Percent,
    Box,
    Hash,
    AlertCircle,
    CheckCircle2,
    Eye,
} from "lucide-react";

import { http } from "../service/http";

import NewProducto from "../components/modals-cotizaciones/NewProducto";
import EditProductoModal from "../components/modals-cotizaciones/EditProducto";
import type { ProductoForm } from "../components/modals-cotizaciones/types";

interface Producto {
    id: number;
    nombre: string;
    descripcion?: string | null;
    categoria?: string | null;

    precio: number;
    precioCosto?: number | null;
    porcGanancia?: number | null;
    precioTotal?: number | null;
    precioOriginalCLP?: number | null;

    stock: number;
    serie?: string | null;
    sku?: string | null;
    codigo?: string | null;
    proveedor?: string | null;
    fecha_creacion?: string;
    estado?: string;

    imagen?: string | null;
    publicId?: string | null;
    imagenFile?: File | null;
}

/* ==========================================
   Utils
========================================== */
const debounce = (fn: (...args: any[]) => void, delay: number) => {
    let timer: any;
    return (...args: any[]) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
};

/* ==========================================
   Modal Ver Producto (solo lectura)
========================================== */
interface ModalViewProductoProps {
    show: boolean;
    onClose: () => void;
    form: Producto;
}

// modal para ver detalle del producto (solo lectura)
const ModalViewProducto: React.FC<ModalViewProductoProps> = ({
    show,
    onClose,
    form,
}) => {
    if (!show) return null;


    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-cyan-50 rounded-xl">
                                <Eye className="w-5 h-5 text-cyan-600" />
                            </div>
                            <h2 className="text-xl font-semibold text-slate-900">
                                Detalle del Producto
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>

                    <div className="space-y-3 text-sm">
                        <div>
                            <span className="font-semibold text-slate-700">
                                Nombre:
                            </span>{" "}
                            <span className="text-slate-800">{form.nombre}</span>
                        </div>
                        <div>
                            <span className="font-semibold text-slate-700">
                                Categoría:
                            </span>{" "}
                            <span className="text-slate-800">
                                {form.categoria || "Sin categoría"}
                            </span>
                        </div>
                        <div>
                            <span className="font-semibold text-slate-700">
                                Serie:
                            </span>{" "}
                            <span className="text-slate-800">
                                {form.serie || "—"}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <span className="font-semibold text-slate-700">
                                    Precio costo:
                                </span>
                                <div className="font-mono text-slate-800">
                                    ${form.precio.toLocaleString("es-CL")}
                                </div>
                            </div>
                            <div>
                                <span className="font-semibold text-slate-700">
                                    Precio venta:
                                </span>
                                <div className="font-mono text-slate-800">
                                    $
                                    {Number(
                                        form.precioTotal || form.precio
                                    ).toLocaleString("es-CL")}
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <span className="font-semibold text-slate-700">
                                    % Ganancia:
                                </span>
                                <div className="text-slate-800">
                                    {form.porcGanancia ?? 0}%
                                </div>
                            </div>
                            <div>
                                <span className="font-semibold text-slate-700">
                                    Stock:
                                </span>
                                <div className="text-slate-800">
                                    {form.stock} unidades
                                </div>
                            </div>
                        </div>
                        {form.descripcion && (
                            <div>
                                <span className="font-semibold text-slate-700">
                                    Descripción:
                                </span>
                                <p className="text-slate-800 mt-1 whitespace-pre-wrap">
                                    {form.descripcion}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 border-t bg-slate-50 rounded-b-2xl flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ==========================================
   Página principal
========================================== */
const ProductosPage: React.FC = () => {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [query, setQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [notification, setNotification] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);

    const [pagina, setPagina] = useState(1);
    const itemsPorPagina = 10;

    const [categoriaFiltro, setCategoriaFiltro] = useState("Todas");

    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showView, setShowView] = useState(false);

    const [productoAEditar, setProductoAEditar] = useState<Producto | null>(null);

    const [productoForm, setProductoForm] = useState<ProductoForm>({
        nombre: "",
        descripcion: "",
        precio: 0,
        porcGanancia: 0,
        precioTotal: 0,
        categoria: "",
        stock: 0,
        serie: "",
        imagen: null,
        imagenFile: null,
    });

    const [form, setForm] = useState<Producto>({
        id: 0,
        nombre: "",
        descripcion: "",
        categoria: "",
        precio: 0,
        porcGanancia: 0,
        precioTotal: 0,
        stock: 0,
        serie: "",
        sku: "",
        proveedor: "",
        imagen: null,
        imagenFile: null,
    });

    const showNotification = useCallback(
        (type: "success" | "error", message: string) => {
            setNotification({ type, message });
            setTimeout(() => setNotification(null), 3000);
        },
        []
    );

    // carga productos desde la API
    const loadProductos = async () => {
        setIsLoading(true);
        try {
            const res = await http.get("/productos-gestioo");
            const productosData = Array.isArray(res.data)
                ? res.data
                : Array.isArray(res.data?.data)
                    ? res.data.data
                    : [];

            const formateados = productosData.map((p: Producto) => ({
                ...p,
                precio: Number(p.precio) || 0,
                precioTotal: Number(p.precioTotal) || Number(p.precio) || 0,
                porcGanancia: Number(p.porcGanancia) || 0,
                stock: Number(p.stock) || 0,
                categoria: p.categoria || "Sin categoría",
                serie:
                    p.serie || `PROD-${p.id?.toString().padStart(4, "0") ?? "0000"}`,
                estado: p.stock > 0 ? "Disponible" : "Agotado",
            }));

            setProductos(formateados);
        } catch (err) {
            console.error("❌ Error cargando productos", err);
            showNotification("error", "Error al cargar los productos");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadProductos();
    }, []);

    const categoriasDisponibles = useMemo(() => {
        const set = new Set<string>();
        productos.forEach((p) => set.add(p.categoria || "Sin categoría"));
        return ["Todas", ...Array.from(set)];
    }, [productos]);

    const filtrados = useMemo(() => {
        let lista = productos;

        if (categoriaFiltro !== "Todas") {
            lista = lista.filter(
                (p) => (p.categoria || "Sin categoría") === categoriaFiltro
            );
        }

        const q = query.toLowerCase();

        lista = lista.filter(
            (p) =>
                p.nombre.toLowerCase().includes(q) ||
                (p.categoria || "").toLowerCase().includes(q) ||
                (p.serie || "").toLowerCase().includes(q) ||
                (p.descripcion || "").toLowerCase().includes(q)
        );

        return lista;
    }, [productos, query, categoriaFiltro]);

    const totalPaginas = Math.ceil(filtrados.length / itemsPorPagina);
    const paginados = useMemo(() => {
        const inicio = (pagina - 1) * itemsPorPagina;
        return filtrados.slice(inicio, inicio + itemsPorPagina);
    }, [filtrados, pagina, itemsPorPagina]);

    const debouncedSearch = useMemo(
        () =>
            debounce((value: string) => {
                setQuery(value);
            }, 300),
        []
    );

    const getEstadoColor = (stock: number) => {
        if (stock > 50)
            return {
                bg: "bg-green-50",
                text: "text-green-700",
                border: "border-green-200",
            };
        if (stock > 10)
            return {
                bg: "bg-blue-50",
                text: "text-blue-700",
                border: "border-blue-200",
            };
        if (stock > 0)
            return {
                bg: "bg-yellow-50",
                text: "text-yellow-700",
                border: "border-yellow-200",
            };
        return {
            bg: "bg-red-50",
            text: "text-red-700",
            border: "border-red-200",
        };
    };

    const getGananciaColor = (porcGanancia?: number | null) => {
        const ganancia = Number(porcGanancia ?? 0);

        if (ganancia > 50) return "text-green-600";
        if (ganancia > 20) return "text-cyan-600";
        if (ganancia > 0) return "text-yellow-600";
        return "text-slate-600";
    };

    const resetProductoForm = () => {
        setProductoForm({
            nombre: "",
            descripcion: "",
            precio: 0,
            porcGanancia: 0,
            precioTotal: 0,
            categoria: "",
            stock: 0,
            serie: "",
            imagen: null,
            imagenFile: null,
        });
    };

    const openCreate = () => {
        resetProductoForm();
        resetProductoForm();
        setShowCreate(true);
    };

    const closeCreate = () => {
        setShowCreate(false);
        resetProductoForm();
    };

    const openEdit = (producto: Producto) => {
        setProductoAEditar({
            ...producto,
            nombre: producto.nombre ?? "",
            descripcion: producto.descripcion ?? "",
            categoria: producto.categoria ?? "",
            precio: Number(producto.precio ?? 0),
            precioCosto: Number(producto.precioCosto ?? producto.precio ?? 0),
            precioTotal: Number(producto.precioTotal ?? producto.precio ?? 0),
            precioOriginalCLP: Number(
                producto.precioOriginalCLP ??
                producto.precioTotal ??
                producto.precio ??
                0
            ),
            porcGanancia: Number(producto.porcGanancia ?? 0),
            stock: Number(producto.stock ?? 0),
            serie: producto.serie ?? "",
            sku: producto.sku ?? "",
            codigo: producto.codigo ?? producto.serie ?? "",
            imagen: producto.imagen ?? null,
            publicId: producto.publicId ?? null,
            imagenFile: null,
        });

        setShowEdit(true);
    };

    const closeEdit = () => {
        setShowEdit(false);
        setProductoAEditar(null);
    };

    const openView = (p: Producto) => {
        setForm(p);
        setShowView(true);
    };

    const handleProductoFormChange = (
        field: keyof ProductoForm,
        value: any
    ) => {
        setProductoForm((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    // función para actualizar un producto existente, con validaciones y manejo de imagen
    const handleGuardarProductoEditado = async (productoData: any) => {
        if (!productoData?.id) return;
        if (isSaving) return;

        setIsSaving(true);

        try {
            await http.put(`/productos-gestioo/${productoData.id}`, {
                nombre: productoData.nombre,
                descripcion: productoData.descripcion,
                precio: Number(
                    productoData.precioCosto ??
                    productoData.precio ??
                    0
                ),
                porcGanancia: Number(productoData.porcGanancia ?? 0),
                precioTotal: Number(
                    productoData.precioTotal ??
                    productoData.precioOriginalCLP ??
                    productoData.precio ??
                    productoData.precioCosto ??
                    0
                ),
                categoria: productoData.categoria,
                stock: Number(productoData.stock ?? 0),
                serie: productoData.serie ?? productoData.codigo ?? null,
                imagen: productoData.imagen,
                publicId: productoData.publicId,
            });

            showNotification("success", "Producto actualizado exitosamente");
            closeEdit();
            await loadProductos();
            showNotification("success", "Producto actualizado exitosamente");
            closeEdit();
            await loadProductos();
        } catch (err: any) {
            console.error("❌ Error actualizando producto:", err);

            console.error("❌ Error actualizando producto:", err);

            const msg =
                err?.response?.data?.message ||
                err?.response?.data?.message ||
                err?.response?.data?.error ||
                err?.message ||
                "Error al actualizar el producto";

            err?.message ||
                "Error al actualizar el producto";

            showNotification("error", msg);
        } finally {
            setIsSaving(false);
        }
    };


    // función para eliminar un producto, con confirmación y manejo de errores
    const handleDelete = async (id: number) => {
        if (!window.confirm("¿Seguro deseas eliminar este producto?")) return;

        setIsSaving(true);
        try {
            await http.delete(`/productos-gestioo/${id}`);
            showNotification("success", "Producto eliminado exitosamente");
            loadProductos();
        } catch (err) {
            console.error("❌ Error eliminando producto", err);
            showNotification("error", "Error al eliminar el producto");
        } finally {
            setIsSaving(false);
        }
    };


    // función para cambiar el estado del producto (disponible/agotado)
    return (
        <>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-cyan-50/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    {/* NOTIFICACIÓN */}
                    {notification && (
                        <div
                            className={`mb-8 p-4 rounded-xl border shadow-sm animate-fadeIn ${notification.type === "success"
                                ? "bg-gradient-to-r from-green-50 to-emerald-50/80 border-green-200 text-green-800"
                                : "bg-gradient-to-r from-red-50 to-rose-50/80 border-red-200 text-red-800"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={`p-2 rounded-lg ${notification.type === "success"
                                        ? "bg-green-100 text-green-600"
                                        : "bg-red-100 text-red-600"
                                        }`}
                                >
                                    {notification.type === "success" ? (
                                        <CheckCircle2 size={20} />
                                    ) : (
                                        <AlertCircle size={20} />
                                    )}
                                </div>
                                <div>
                                    <p className="font-medium">
                                        {notification.message}
                                    </p>
                                    <p className="text-sm opacity-80 mt-0.5">
                                        {notification.type === "success"
                                            ? "Operación completada correctamente"
                                            : "Por favor, intenta nuevamente"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* HEADER PRINCIPAL */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2.5 bg-gradient-to-br from-cyan-600 to-cyan-700 rounded-xl shadow-sm">
                                    <Package className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold text-slate-900">
                                        Productos
                                    </h1>
                                    <p className="text-slate-600 mt-1">
                                        Gestión de inventario y precios
                                    </p>
                                </div>
                            </div>

                            {/* ESTADÍSTICAS */}
                            <div className="flex flex-wrap items-center gap-4 mt-4">
                                <div className="px-3 py-1.5 bg-cyan-50 text-cyan-700 rounded-lg text-sm font-medium border border-cyan-200">
                                    <span className="font-bold">
                                        {productos.length}
                                    </span>{" "}
                                    productos
                                </div>
                                <div className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-200">
                                    <span className="font-bold">
                                        {productos.filter((p) => p.stock > 0).length}
                                    </span>{" "}
                                    disponibles
                                </div>
                                <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200">
                                    <span className="font-bold">
                                        {productos.reduce(
                                            (acc, p) => acc + p.stock,
                                            0
                                        )}
                                    </span>{" "}
                                    en stock
                                </div>
                            </div>
                        </div>

                        {/* ACCIONES + FILTRO */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={openCreate}
                                className="inline-flex items-center gap-2 px-5 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-all duration-200 font-medium shadow-sm hover:shadow group"
                            >
                                <div className="p-1 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors">
                                    <Plus size={18} className="text-white" />
                                </div>
                                Nuevo Producto
                            </button>
                        </div>
                    </div>

                    {/* FILTRO CATEGORÍA */}
                    <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                        <div className="max-w-xs w-full">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Filtrar por categoría
                            </label>
                            <select
                                value={categoriaFiltro}
                                onChange={(e) => {
                                    setCategoriaFiltro(e.target.value);
                                    setPagina(1);
                                }}
                                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-sm"
                            >
                                {categoriasDisponibles.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* BUSCADOR */}
                    <div className="relative max-w-2xl mb-8">
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-cyan-500/5 rounded-2xl blur-xl" />
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Buscar productos por nombre, categoría, código o descripción..."
                                className="w-full pl-12 pr-4 py-3.5 bg-white/90 border border-slate-300/80 rounded-2xl focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 outline-none transition-all duration-200 shadow-sm hover:shadow backdrop-blur-sm placeholder-slate-500"
                                defaultValue={query}
                                onChange={(e) => {
                                    debouncedSearch(e.target.value);
                                    setPagina(1);
                                }}
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                                {query
                                    ? `${filtrados.length} resultados`
                                    : "Escribe para buscar"}
                            </div>
                        </div>
                    </div>

                    {/* CONTENEDOR PRINCIPAL */}
                    <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200/80 overflow-hidden">
                        {isLoading ? (
                            <div className="py-16">
                                <div className="flex flex-col items-center justify-center gap-4">
                                    <div className="relative">
                                        <div className="w-16 h-16 border-4 border-slate-200 rounded-full"></div>
                                        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-cyan-500 rounded-full border-t-transparent animate-spin"></div>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-slate-700 font-medium">
                                            Cargando productos
                                        </p>
                                        <p className="text-slate-500 text-sm mt-1">
                                            Obteniendo información del inventario...
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : filtrados.length === 0 ? (
                            <div className="py-16 text-center">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl mb-6 border border-slate-200">
                                    <Package className="w-10 h-10 text-slate-400" />
                                </div>
                                <h3 className="text-xl font-semibold text-slate-900 mb-2">
                                    {query
                                        ? "No se encontraron productos"
                                        : "No hay productos registrados"}
                                </h3>
                                <p className="text-slate-600 max-w-md mx-auto mb-6">
                                    {query
                                        ? "No encontramos productos que coincidan con tu búsqueda. Intenta con otros términos."
                                        : "Comienza agregando tu primer producto al inventario."}
                                </p>
                                {!query && (
                                    <button
                                        onClick={openCreate}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-all duration-200 font-medium shadow-sm hover:shadow"
                                    >
                                        <Plus size={18} />
                                        Agregar primer producto
                                    </button>
                                )}
                            </div>
                        ) : (
                            <>
                                {/* TABLA DESKTOP */}
                                <div className="hidden lg:block">
                                    <table className="w-full">
                                        <thead className="bg-gradient-to-r from-slate-50 to-slate-100/80 border-b border-slate-200/80">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                                    <div className="flex items-center gap-2">
                                                        <Hash size={14} />
                                                        Código
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                                    <div className="flex items-center gap-2">
                                                        <Package size={14} />
                                                        Producto
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                                    <div className="flex items-center gap-2">
                                                        <Tag size={14} />
                                                        Categoría
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                                    <div className="flex items-center gap-2">
                                                        <DollarSign size={14} />
                                                        Costo / Venta
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                                    <div className="flex items-center gap-2">
                                                        <Percent size={14} />
                                                        Ganancia
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                                    <div className="flex items-center gap-2">
                                                        <Box size={14} />
                                                        Stock
                                                    </div>
                                                </th>
                                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                                    Acciones
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100/80">
                                            {paginados.map((p) => {
                                                const estadoColor = getEstadoColor(p.stock);
                                                const gananciaColor = getGananciaColor(
                                                    p.porcGanancia
                                                );
                                                return (
                                                    <tr
                                                        key={p.id}
                                                        className="hover:bg-gradient-to-r hover:from-slate-50/80 hover:to-cyan-50/30 transition-all duration-200"
                                                    >
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-slate-900 font-mono">
                                                                {p.serie}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                {p.imagen && (
                                                                    <img
                                                                        src={p.imagen}
                                                                        className="w-10 h-10 object-cover rounded-lg border"
                                                                    />
                                                                )}
                                                                <div>
                                                                    <div className="text-sm font-semibold text-slate-900">
                                                                        {p.nombre}
                                                                    </div>
                                                                    {p.descripcion && (
                                                                        <div className="text-xs text-slate-500 truncate max-w-xs">
                                                                            {p.descripcion}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className="px-3 py-1 text-xs font-medium bg-slate-100 text-slate-800 rounded-full border border-slate-200">
                                                                {p.categoria}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="space-y-1">
                                                                <div className="text-sm text-slate-600">
                                                                    <span className="font-medium">
                                                                        Costo:{" "}
                                                                    </span>
                                                                    <span className="font-mono">
                                                                        $
                                                                        {p.precio.toLocaleString(
                                                                            "es-CL"
                                                                        )}
                                                                    </span>
                                                                </div>
                                                                <div className="text-sm text-slate-800">
                                                                    <span className="font-medium">
                                                                        Venta:{" "}
                                                                    </span>
                                                                    <span className="font-mono font-semibold">
                                                                        $
                                                                        {Number(
                                                                            p.precioTotal ||
                                                                            p.precio
                                                                        ).toLocaleString(
                                                                            "es-CL"
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div
                                                                className={`text-sm font-semibold ${gananciaColor}`}
                                                            >
                                                                {p.porcGanancia
                                                                    ? `${p.porcGanancia}%`
                                                                    : "0%"}
                                                            </div>
                                                            <div className="text-xs text-slate-500">
                                                                $
                                                                {(
                                                                    (p.precioTotal ||
                                                                        p.precio) -
                                                                    p.precio
                                                                ).toLocaleString("es-CL")}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col gap-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-semibold text-slate-900">
                                                                        {p.stock}
                                                                    </span>
                                                                    <span
                                                                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${estadoColor.bg} ${estadoColor.text} ${estadoColor.border}`}
                                                                    >
                                                                        {p.stock > 0
                                                                            ? "Disponible"
                                                                            : "Agotado"}
                                                                    </span>
                                                                </div>
                                                                <div className="w-full bg-slate-200 rounded-full h-1.5">
                                                                    <div
                                                                        className={`h-1.5 rounded-full ${p.stock > 50
                                                                            ? "bg-green-500"
                                                                            : p.stock > 10
                                                                                ? "bg-cyan-500"
                                                                                : p.stock > 0
                                                                                    ? "bg-yellow-500"
                                                                                    : "bg-red-500"
                                                                            }`}
                                                                        style={{
                                                                            width: `${Math.min(
                                                                                p.stock,
                                                                                100
                                                                            )}%`,
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => openView(p)}
                                                                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                                                    title="Ver detalles"
                                                                >
                                                                    <Eye size={18} />
                                                                </button>
                                                                <button
                                                                    onClick={() => openEdit(p)}
                                                                    className="p-2 text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 rounded-lg transition-colors"
                                                                    title="Editar"
                                                                >
                                                                    <Pencil size={18} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(p.id)}
                                                                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                                    title="Eliminar"
                                                                >
                                                                    <TrashIcon />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* CARDS MÓVIL */}
                                <div className="lg:hidden divide-y divide-slate-100/80">
                                    {paginados.map((p) => {
                                        const estadoColor = getEstadoColor(p.stock);
                                        const gananciaColor = getGananciaColor(
                                            p.porcGanancia
                                        );
                                        return (
                                            <div
                                                key={p.id}
                                                className="p-6 hover:bg-gradient-to-r hover:from-slate-50/80 hover:to-cyan-50/30 transition-all duration-200"
                                            >
                                                <div className="space-y-4">
                                                    {/* HEADER CARD */}
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-12 w-12 flex items-center justify-center bg-gradient-to-br from-cyan-50 to-cyan-100 text-cyan-700 rounded-xl shadow-sm">
                                                                <Package size={20} />
                                                            </div>
                                                            <div>
                                                                <h3 className="font-semibold text-slate-900">
                                                                    {p.nombre}
                                                                </h3>
                                                                <div className="text-sm text-slate-600 font-mono">
                                                                    {p.serie}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <span
                                                            className={`px-3 py-1 text-xs font-medium rounded-full ${estadoColor.bg} ${estadoColor.text} ${estadoColor.border}`}
                                                        >
                                                            {p.stock > 0
                                                                ? "Disponible"
                                                                : "Agotado"}
                                                        </span>
                                                    </div>

                                                    {/* INFO */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/60">
                                                            <div className="text-xs text-slate-500 font-medium">
                                                                Categoría
                                                            </div>
                                                            <div className="text-sm text-slate-800">
                                                                {p.categoria}
                                                            </div>
                                                        </div>
                                                        <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/60">
                                                            <div className="text-xs text-slate-500 font-medium">
                                                                Stock
                                                            </div>
                                                            <div className="text-sm font-semibold text-slate-800">
                                                                {p.stock} unidades
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* PRECIOS */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/60">
                                                            <div className="text-xs text-slate-500 font-medium">
                                                                Costo
                                                            </div>
                                                            <div className="text-sm font-mono text-slate-800">
                                                                $
                                                                {p.precio.toLocaleString(
                                                                    "es-CL"
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/60">
                                                            <div className="text-xs text-slate-500 font-medium">
                                                                Venta
                                                            </div>
                                                            <div className="text-sm font-mono font-semibold text-slate-800">
                                                                $
                                                                {Number(
                                                                    p.precioTotal ||
                                                                    p.precio
                                                                ).toLocaleString(
                                                                    "es-CL"
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* GANANCIA */}
                                                    <div className="p-3 bg-gradient-to-r from-slate-50/80 to-cyan-50/30 rounded-lg border border-slate-200/60">
                                                        <div className="flex items-center justify-between">
                                                            <div className="text-sm font-medium text-slate-700">
                                                                Ganancia
                                                            </div>
                                                            <div
                                                                className={`text-sm font-bold ${gananciaColor}`}
                                                            >
                                                                {p.porcGanancia
                                                                    ? `${p.porcGanancia}%`
                                                                    : "0%"}
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-slate-500 mt-1">
                                                            $
                                                            {(
                                                                (p.precioTotal ||
                                                                    p.precio) -
                                                                p.precio
                                                            ).toLocaleString("es-CL")}
                                                        </div>
                                                    </div>

                                                    {/* ACCIONES */}
                                                    <div className="flex gap-2 pt-2">
                                                        <button
                                                            onClick={() => openView(p)}
                                                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-all duration-200 font-medium border border-blue-200 hover:border-blue-300"
                                                        >
                                                            <Eye size={16} />
                                                            Ver
                                                        </button>
                                                        <button
                                                            onClick={() => openEdit(p)}
                                                            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-50 text-cyan-700 rounded-xl hover:bg-cyan-100 transition-all duration-200 font-medium border border-cyan-200 hover:border-cyan-300"
                                                        >
                                                            <Pencil size={16} />
                                                            Editar
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(p.id)}
                                                            className="flex-0 inline-flex items-center justify-center px-3 py-2.5 bg-red-50 text-red-700 rounded-xl hover:bg-red-100 transition-all duration-200 font-medium border border-red-200 hover:border-red-300"
                                                        >
                                                            <TrashIcon />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>


                    {/* PAGINACIÓN */}
                    {totalPaginas > 1 && (
                        <div className="mt-8 pt-6 border-t border-slate-200/80">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                {/* Info página */}
                                <div className="text-sm text-slate-600 bg-white/80 backdrop-blur-sm px-4 py-3 rounded-xl border border-slate-200/80">
                                    Mostrando{" "}
                                    <span className="font-medium text-cyan-600">
                                        {(pagina - 1) * itemsPorPagina + 1}
                                    </span>{" "}
                                    -{" "}
                                    <span className="font-medium text-cyan-600">
                                        {Math.min(
                                            pagina * itemsPorPagina,
                                            filtrados.length
                                        )}
                                    </span>{" "}
                                    de{" "}
                                    <span className="font-medium">
                                        {filtrados.length}
                                    </span>{" "}
                                    productos • Página{" "}
                                    <span className="font-medium text-cyan-600">
                                        {pagina}
                                    </span>{" "}
                                    de{" "}
                                    <span className="font-medium">
                                        {totalPaginas}
                                    </span>
                                </div>

                                {/* Controles paginación */}
                                <div className="flex items-center gap-2">
                                    {/* Primera */}
                                    <button
                                        className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${pagina === 1
                                            ? "text-slate-400 cursor-not-allowed bg-slate-100/50"
                                            : "text-slate-700 hover:bg-slate-100 hover:text-cyan-600 border border-slate-300/80 hover:border-cyan-300"
                                            }`}
                                        disabled={pagina === 1}
                                        onClick={() => setPagina(1)}
                                    >
                                        <span className="text-lg font-bold">«</span>
                                    </button>

                                    {/* Anterior */}
                                    <button
                                        className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${pagina === 1
                                            ? "text-slate-400 cursor-not-allowed bg-slate-100/50"
                                            : "text-slate-700 hover:bg-slate-100 hover:text-cyan-600 border border-slate-300/80 hover:border-cyan-300"
                                            }`}
                                        disabled={pagina === 1}
                                        onClick={() =>
                                            setPagina((p) => Math.max(1, p - 1))
                                        }
                                    >
                                        <span className="text-lg">‹</span>
                                    </button>

                                    {/* Números */}
                                    <div className="flex items-center gap-1.5 mx-2">
                                        {(() => {
                                            const pages: number[] = [];
                                            const maxVisible = 5;

                                            if (totalPaginas <= maxVisible) {
                                                for (
                                                    let i = 1;
                                                    i <= totalPaginas;
                                                    i++
                                                )
                                                    pages.push(i);
                                            } else {
                                                let start = Math.max(
                                                    1,
                                                    pagina - 2
                                                );
                                                let end = Math.min(
                                                    totalPaginas,
                                                    start + maxVisible - 1
                                                );

                                                if (end - start + 1 < maxVisible) {
                                                    start = Math.max(
                                                        1,
                                                        end - maxVisible + 1
                                                    );
                                                }

                                                if (start > 1) pages.push(1);
                                                if (start > 2) pages.push(-1);

                                                for (let i = start; i <= end; i++) {
                                                    pages.push(i);
                                                }

                                                if (end < totalPaginas - 1)
                                                    pages.push(-1);
                                                if (end < totalPaginas)
                                                    pages.push(totalPaginas);
                                            }

                                            return pages.map((num, index) =>
                                                num === -1 ? (
                                                    <span
                                                        key={`dots-${index}`}
                                                        className="px-2 text-slate-400"
                                                    >
                                                        ...
                                                    </span>
                                                ) : (
                                                    <button
                                                        key={num}
                                                        onClick={() =>
                                                            setPagina(num)
                                                        }
                                                        className={`flex items-center justify-center w-10 h-10 rounded-xl font-medium transition-all duration-200 ${pagina === num
                                                            ? "bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-md transform scale-105"
                                                            : "text-slate-700 hover:bg-slate-100 hover:text-cyan-600 border border-slate-300/80 hover:border-cyan-300"
                                                            }`}
                                                    >
                                                        {num}
                                                    </button>
                                                )
                                            );
                                        })()}
                                    </div>

                                    {/* Siguiente */}
                                    <button
                                        className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${pagina === totalPaginas
                                            ? "text-slate-400 cursor-not-allowed bg-slate-100/50"
                                            : "text-slate-700 hover:bg-slate-100 hover:text-cyan-600 border border-slate-300/80 hover:border-cyan-300"
                                            }`}
                                        disabled={pagina === totalPaginas}
                                        onClick={() =>
                                            setPagina((p) =>
                                                Math.min(totalPaginas, p + 1)
                                            )
                                        }
                                    >
                                        <span className="text-lg">›</span>
                                    </button>

                                    {/* Última */}
                                    <button
                                        className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 ${pagina === totalPaginas
                                            ? "text-slate-400 cursor-not-allowed bg-slate-100/50"
                                            : "text-slate-700 hover:bg-slate-100 hover:text-cyan-600 border border-slate-300/80 hover:border-cyan-300"
                                            }`}
                                        disabled={pagina === totalPaginas}
                                        onClick={() => setPagina(totalPaginas)}
                                    >
                                        <span className="text-lg font-bold">
                                            »
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* MODALES */}
            <NewProducto
                show={showCreate}
                onClose={closeCreate}
                onSubmit={async () => {
                    closeCreate();
                    await loadProductos();
                    showNotification("success", "Producto creado exitosamente");
                }}
                formData={productoForm}
                onFormChange={handleProductoFormChange}
                categoriasDisponibles={categoriasDisponibles.filter(
                    (cat) => cat !== "Todas"
                )}
                apiLoading={isSaving}
            />

            <EditProductoModal
                show={showEdit}
                producto={productoAEditar}
                onClose={closeEdit}
                onSave={handleGuardarProductoEditado}
                onBackToSelector={closeEdit}
                apiLoading={isSaving}
            />

            <ModalViewProducto
                show={showView}
                onClose={() => setShowView(false)}
                form={form}
            />
        </>
    );
};

/* Pequeño icono Trash para no ampliar el import */
const TrashIcon: React.FC = () => (
    <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862A2 2 0 015.867 19.142L5 7m5 4v6m4-6v6M9 7h6m-5-3h4a1 1 0 011 1v2H8V5a1 1 0 011-1z"
        />
    </svg>
);

export default ProductosPage;
