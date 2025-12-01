import React, { useState } from "react";
import { motion } from "framer-motion";
import {
    SearchOutlined,
    BarcodeOutlined,
    EditOutlined,
    PlusOutlined,
    PercentageOutlined,
    ShoppingCartOutlined,
    TableOutlined,
    AppstoreOutlined
} from "@ant-design/icons";

interface SelectProductoModalProps {
    show: boolean;
    onClose: () => void;
    productos: any[];
    filtros: any;
    onFiltroChange: (filtro: string, value: any) => void;
    onLimpiarFiltros: () => void;
    onAgregarProducto: (producto: any) => void;
    onEditarProducto: (producto: any) => void;
    onEliminarProducto: (id: number) => void;
    orden: string;
    onOrdenChange: (orden: string) => void;
    categoriasDisponibles: string[];
}

const SelectProductoModal: React.FC<SelectProductoModalProps> = ({
    show,
    onClose,
    productos,
    filtros,
    onFiltroChange,
    onLimpiarFiltros,
    onAgregarProducto,
    onEditarProducto,
    onEliminarProducto,
    orden,
    onOrdenChange,
    categoriasDisponibles,
}) => {

    if (!show) return null;

    // Estado para vista de tabla o tarjetas
    const [vista, setVista] = useState<'tabla' | 'tarjetas'>('tabla');

    // =============================
    //     FILTROS AVANZADOS
    // =============================
    const filtrarProductosAvanzado = (productos: any[]) => {
        return productos.filter(producto => {
            const coincideTexto =
                producto.nombre?.toLowerCase().includes(filtros.texto.toLowerCase()) ||
                producto.descripcion?.toLowerCase().includes(filtros.texto.toLowerCase()) ||
                producto.codigo?.toLowerCase().includes(filtros.texto.toLowerCase());

            const coincideCodigo = !filtros.codigo ||
                producto.codigo?.toLowerCase().includes(filtros.codigo.toLowerCase());

            const precio = producto.precio || producto.precioBase;
            const precioMin = filtros.precioMin ? Number(filtros.precioMin) : 0;
            const precioMax = filtros.precioMax ? Number(filtros.precioMax) : Infinity;
            const coincidePrecio = precio >= precioMin && precio <= precioMax;

            const coincideCategoria = !filtros.categoria ||
                (producto.categoria &&
                    producto.categoria.toLowerCase().includes(filtros.categoria.toLowerCase()));

            return coincideTexto && coincideCodigo && coincidePrecio && coincideCategoria;
        });
    };

    // =============================
    //     ORDENAMIENTO
    // =============================
    const ordenarProductos = (productos: any[]) => {
        return productos.sort((a, b) => {
            switch (orden) {
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

    const productosMostrar = ordenarProductos(filtrarProductosAvanzado(productos));
    const hayFiltrosActivos =
        filtros.texto || filtros.codigo || filtros.precioMin || filtros.precioMax || filtros.categoria;

    // Estadísticas para el header
    const productosConGanancia = productosMostrar.filter(p => (p.porcGanancia || 0) > 0).length;
    const productosConStock = productosMostrar.filter(p => p.stock > 0).length;

    // =============================
    //     COMPONENTE DE TABLA
    // =============================
    const VistaTabla = () => (
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
            <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="text-left p-4 font-semibold text-slate-700 text-sm">Código</th>
                        <th className="text-left p-4 font-semibold text-slate-700 text-sm">Nombre del Producto</th>
                        <th className="text-left p-4 font-semibold text-slate-700 text-sm">Categoría</th>
                        <th className="text-right p-4 font-semibold text-slate-700 text-sm">Precio Costo</th>
                        <th className="text-right p-4 font-semibold text-slate-700 text-sm">Precio Venta</th>
                        <th className="text-center p-4 font-semibold text-slate-700 text-sm">Ganancia</th>
                        <th className="text-center p-4 font-semibold text-slate-700 text-sm">Stock</th>
                        <th className="text-center p-4 font-semibold text-slate-700 text-sm">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {productosMostrar.map((producto) => (
                        <tr
                            key={producto.id}
                            className="hover:bg-slate-50 transition-colors group"
                        >
                            {/* Código */}
                            <td className="p-4">
                                <div className="flex items-center gap-2">
                                    <BarcodeOutlined className="text-slate-400 text-sm" />
                                    <span className="font-mono text-sm text-slate-600">
                                        {producto.sku || producto.codigo || "N/A"}
                                    </span>
                                </div>
                            </td>

                            {/* Nombre */}
                            <td className="p-4">
                                <div>
                                    <h3 className="font-medium text-slate-800 group-hover:text-cyan-700 transition-colors">
                                        {producto.nombre}
                                    </h3>
                                    {producto.descripcion && (
                                        <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                                            {producto.descripcion}
                                        </p>
                                    )}
                                </div>
                            </td>

                            {/* Categoría */}
                            <td className="p-4">
                                <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                    {producto.categoria || "Sin categoría"}
                                </span>
                            </td>

                            {/* Precio Costo */}
                            <td className="p-4 text-right">
                                <span className="text-sm text-slate-600">
                                    ${Number(producto.precio || 0).toLocaleString("es-CL")}
                                </span>
                            </td>

                            {/* Precio Venta */}
                            <td className="p-4 text-right">
                                <span className="font-semibold text-emerald-600 text-base">
                                    ${Number(
                                        producto.precioTotal !== null && producto.precioTotal !== undefined
                                            ? producto.precioTotal
                                            : producto.precio
                                    ).toLocaleString("es-CL")}
                                </span>
                            </td>

                            {/* Ganancia */}
                            <td className="p-4 text-center">
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${(producto.porcGanancia || 0) > 20
                                    ? "bg-green-100 text-green-800"
                                    : (producto.porcGanancia || 0) > 0
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-slate-100 text-slate-600"
                                    }`}>
                                    {producto.porcGanancia ? `${producto.porcGanancia}%` : "0%"}
                                </span>
                            </td>

                            {/* Stock */}
                            <td className="p-4 text-center">
                                <span className={`text-sm font-medium ${producto.stock > 10
                                    ? "text-green-600"
                                    : producto.stock > 0
                                        ? "text-amber-600"
                                        : "text-red-600"
                                    }`}>
                                    {producto.stock || 0}
                                </span>
                            </td>

                            {/* Acciones */}
                            <td className="p-4">
                                <div className="flex justify-center gap-2">
                                    <button
                                        onClick={() => onAgregarProducto(producto)}
                                        className="flex items-center gap-2 px-3 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm font-medium"
                                    >
                                        <PlusOutlined />
                                        Agregar
                                    </button>
                                    <button
                                        onClick={() => onEditarProducto(producto)}
                                        className="p-2 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                                        title="Editar producto"
                                    >
                                        <EditOutlined />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {productosMostrar.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                    <ShoppingCartOutlined className="text-3xl mb-3 opacity-50" />
                    <p>No se encontraron productos</p>
                </div>
            )}
        </div>
    );

    // =============================
    //     COMPONENTE DE TARJETAS
    // =============================
    const VistaTarjetas = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
            {productosMostrar.map((producto) => (
                <div
                    key={producto.id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-cyan-300 transition-all duration-300 hover:shadow-xl overflow-hidden group"
                >
                    {/* Header con categoría */}
                    <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 border-b border-slate-200">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                                {producto.categoria || "Sin categoría"}
                            </span>
                            {producto.sku && (
                                <span className="text-xs bg-white px-2 py-1 rounded-full border border-slate-300 text-slate-500 font-mono">
                                    #{producto.sku}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Contenido principal */}
                    <div className="p-4">
                        {/* Nombre del producto */}
                        <h3 className="font-semibold text-slate-800 text-base leading-tight mb-2 line-clamp-2 group-hover:text-cyan-700 transition-colors min-h-[2.5rem]">
                            {producto.nombre || "Producto sin nombre"}
                        </h3>

                        {/* Información de precios */}
                        <div className="space-y-3 mb-4">
                            {/* Precio de venta */}
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">Precio venta:</span>
                                <span className="font-bold text-xl text-emerald-600">
                                    ${Number(
                                        producto.precioTotal !== null && producto.precioTotal !== undefined
                                            ? producto.precioTotal
                                            : producto.precio
                                    ).toLocaleString("es-CL")}
                                </span>
                            </div>

                            {/* Información de costos y ganancia */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-slate-50 rounded-lg p-3 text-center">
                                    <div className="text-slate-500 text-xs mb-1">Costo</div>
                                    <div className="font-semibold text-slate-700">
                                        ${Number(producto.precio || 0).toLocaleString("es-CL")}
                                    </div>
                                </div>
                                <div className={`rounded-lg p-3 text-center ${(producto.porcGanancia || 0) > 20
                                    ? "bg-green-50 text-green-700 border border-green-200"
                                    : (producto.porcGanancia || 0) > 0
                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                        : "bg-slate-50 text-slate-500 border border-slate-200"
                                    }`}>
                                    <div className="text-xs mb-1">Ganancia</div>
                                    <div className="font-semibold">
                                        {producto.porcGanancia ? `${producto.porcGanancia}%` : "0%"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stock */}
                        {typeof producto.stock !== 'undefined' && (
                            <div className="flex items-center justify-between mb-4 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                                <span className="text-sm text-slate-500">Stock disponible:</span>
                                <span className={`text-sm font-semibold ${producto.stock > 10
                                    ? "text-green-600"
                                    : producto.stock > 0
                                        ? "text-amber-600"
                                        : "text-red-600"
                                    }`}>
                                    {producto.stock} unidades
                                </span>
                            </div>
                        )}

                        {/* Botones de acción */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => onAgregarProducto(producto)}
                                className="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                            >
                                <PlusOutlined className="text-sm" />
                                Agregar
                            </button>

                            <button
                                onClick={() => onEditarProducto(producto)}
                                className="p-3 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-xl transition-colors border border-slate-200 hover:border-cyan-200"
                                title="Editar producto"
                            >
                                <EditOutlined />
                            </button>
                        </div>
                    </div>

                    {/* Indicador de IVA */}
                    {producto.tieneIVA && (
                        <div className="bg-blue-50 border-t border-blue-200 px-4 py-2">
                            <div className="flex items-center justify-center gap-2 text-xs text-blue-700 font-medium">
                                <PercentageOutlined />
                                <span>Incluye IVA (19%)</span>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[9999]">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl relative max-h-[95vh] overflow-y-auto z-[9999]"
            >

                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-200 z-10">
                    <div className="p-6">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                                    <ShoppingCartOutlined className="text-cyan-600 mr-3" />
                                    Catálogo de Productos
                                </h2>
                                <p className="text-slate-600">
                                    Selecciona productos para agregar a tu cotización
                                </p>
                            </div>

                            <div className="flex items-center gap-4">
                                {/* Selector de vista */}
                                <div className="flex bg-slate-100 rounded-lg p-1">
                                    <button
                                        onClick={() => setVista('tabla')}
                                        className={`px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${vista === 'tabla' ? 'bg-white shadow-sm text-cyan-600' : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        <TableOutlined />
                                        Tabla
                                    </button>
                                    <button
                                        onClick={() => setVista('tarjetas')}
                                        className={`px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors ${vista === 'tarjetas' ? 'bg-white shadow-sm text-cyan-600' : 'text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        <AppstoreOutlined />
                                        Tarjetas
                                    </button>
                                </div>

                                <button
                                    onClick={onClose}
                                    className="text-slate-400 hover:text-slate-600 text-xl p-2 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Estadísticas rápidas */}
                        <div className="flex gap-6 mt-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                                <span className="text-slate-600">{productosMostrar.length} productos</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                <span className="text-slate-600">{productosConGanancia} con ganancia</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-slate-600">{productosConStock} en stock</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {/* Filtros (se mantienen igual) */}
                    <div className="mb-8">
                        <div className="relative">
                            <SearchOutlined className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />

                            <input
                                type="text"
                                placeholder="Buscar productos por nombre, descripción o código..."
                                value={filtros.texto}
                                onChange={(e) => onFiltroChange("texto", e.target.value)}
                                className="
                w-full pl-12 pr-4 py-3
                border border-slate-300
                rounded-xl
                bg-white
                text-slate-700
                placeholder-slate-400
                focus:outline-none
                focus:ring-2 focus:ring-cyan-500
                focus:border-cyan-500
                transition-all
            "
                            />

                            {filtros.texto && (
                                <button
                                    onClick={() => onFiltroChange("texto", "")}
                                    className="
                    absolute right-4 top-1/2 -translate-y-1/2 
                    text-slate-400 hover:text-slate-600
                "
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Vista dinámica */}
                    {vista === 'tabla' ? <VistaTabla /> : <VistaTarjetas />}

                    {/* Footer */}
                    <div className="flex justify-between items-center pt-6 border-t border-slate-200">
                        <div className="text-slate-600">
                            Mostrando <span className="font-semibold">{productosMostrar.length}</span> de{" "}
                            <span className="font-semibold">{productos.length}</span> productos
                        </div>

                        <button
                            onClick={onClose}
                            className="px-6 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                        >
                            Cerrar catálogo
                        </button>
                    </div>
                </div>

            </motion.div>
        </div>
    );
};

export default SelectProductoModal;