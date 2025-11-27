import React from "react";
import { motion } from "framer-motion";
import {
    FilterOutlined,
    SearchOutlined,
    BarcodeOutlined,
    EditOutlined,
    DeleteOutlined,
    ReloadOutlined,
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
    const hayFiltrosActivos = filtros.texto || filtros.codigo || filtros.precioMin || filtros.precioMax || filtros.categoria;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-[9999]">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl relative max-h-[90vh] overflow-y-auto z-[9999]"
            >
                <div className="p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-4 border-b border-cyan-200 pb-3">
                        <FilterOutlined className="text-cyan-600 mr-2" />
                        Seleccionar Productos
                    </h2>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl"
                    >
                        ✕
                    </button>

                    {/* FILTROS AVANZADOS */}
                    <div className="mb-6 p-4 border border-cyan-200 rounded-2xl bg-cyan-50/30">
                        {/* Búsqueda principal */}
                        <div className="relative mb-4">
                            <SearchOutlined className="absolute left-3 top-3 text-cyan-600" />
                            <input
                                type="text"
                                placeholder="Buscar productos por nombre, descripción o código..."
                                value={filtros.texto}
                                onChange={(e) => onFiltroChange("texto", e.target.value)}
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
                                    value={filtros.codigo}
                                    onChange={(e) => {
                                        onFiltroChange("codigo", e.target.value);
                                        if (e.target.value.length >= 3) {
                                            onFiltroChange("texto", "");
                                        }
                                    }}
                                    className="flex-1 border border-emerald-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                />
                                <button
                                    onClick={() => onFiltroChange("codigo", "")}
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
                                    value={filtros.precioMin}
                                    onChange={(e) => onFiltroChange("precioMin", e.target.value)}
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
                                    value={filtros.precioMax}
                                    onChange={(e) => onFiltroChange("precioMax", e.target.value)}
                                    className="w-full border border-cyan-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-400"
                                />
                            </div>

                            {/* Filtro por categoría */}
                            <div>
                                <label className="block text-xs font-medium text-cyan-700 mb-1">
                                    Categoría
                                </label>
                                <select
                                    value={filtros.categoria}
                                    onChange={(e) => onFiltroChange("categoria", e.target.value)}
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
                                    value={orden}
                                    onChange={(e) => onOrdenChange(e.target.value)}
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
                                            onFiltroChange("precioMin", rango.min === 0 ? "" : rango.min.toString());
                                            onFiltroChange("precioMax", rango.max === Infinity ? "" : rango.max.toString());
                                        }}
                                        className="px-3 py-1.5 text-xs border border-cyan-200 text-cyan-700 rounded-lg hover:bg-cyan-50 transition-colors"
                                    >
                                        {rango.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Indicadores de filtros activos */}
                        {hayFiltrosActivos && (
                            <div className="mt-4 p-3 border border-amber-200 rounded-xl bg-amber-50">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-medium text-amber-700">Filtros activos:</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {filtros.texto && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs">
                                            Texto: "{filtros.texto}"
                                            <button onClick={() => onFiltroChange("texto", "")}>×</button>
                                        </span>
                                    )}
                                    {filtros.codigo && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs">
                                            Código: "{filtros.codigo}"
                                            <button onClick={() => onFiltroChange("codigo", "")}>×</button>
                                        </span>
                                    )}
                                    {(filtros.precioMin || filtros.precioMax) && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs">
                                            Precio: ${filtros.precioMin || "0"} - ${filtros.precioMax || "∞"}
                                            <button onClick={() => { onFiltroChange("precioMin", ""); onFiltroChange("precioMax", ""); }}>×</button>
                                        </span>
                                    )}
                                    {filtros.categoria && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs">
                                            Categoría: {filtros.categoria}
                                            <button onClick={() => onFiltroChange("categoria", "")}>×</button>
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Contador y botones de acción */}
                        <div className="flex justify-between items-center mt-4">
                            <div className="text-sm text-cyan-700">
                                {productosMostrar.length} de {productos.length} productos encontrados
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={onLimpiarFiltros}
                                    className="px-3 py-1.5 text-xs border border-cyan-300 text-cyan-700 rounded-lg hover:bg-cyan-50 transition-colors flex items-center gap-1"
                                >
                                    <ReloadOutlined />
                                    Limpiar Todos los Filtros
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {productosMostrar.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 border border-cyan-200 rounded-2xl bg-cyan-50/30 p-6">
                                {hayFiltrosActivos ? (
                                    <>
                                        <p>No se encontraron productos que coincidan con los filtros aplicados</p>
                                        <button
                                            onClick={onLimpiarFiltros}
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
                                                    onEditarProducto(producto);
                                                }}
                                                className="p-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                                                title="Editar producto"
                                            >
                                                <EditOutlined className="text-xs" />
                                            </button>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onEliminarProducto(producto.id);
                                                }}
                                                className="p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                                                title="Eliminar producto"
                                            >
                                                <DeleteOutlined className="text-xs" />
                                            </button>
                                        </div>

                                        {/* CARD ITEM */}
                                        <div onClick={() => onAgregarProducto(producto)}>
                                            <h3 className="font-semibold text-slate-800 mb-2 pr-8">
                                                {producto.nombre || "Producto sin nombre"}
                                            </h3>

                                            {producto.categoria && (
                                                <p className="text-xs text-cyan-600 mb-2">
                                                    <span className="font-medium">Categoría:</span> {producto.categoria}
                                                </p>
                                            )}

                                            {producto.sku && (
                                                <p className="text-xs text-slate-500 mb-2">
                                                    <BarcodeOutlined className="mr-1" />
                                                    Código: {producto.sku}
                                                </p>
                                            )}

                                            <div className="flex justify-between items-center">
                                                <div>
                                                    {/* Mostrar SIEMPRE el precio final bien formateado */}
                                                    <span className="text-lg font-bold text-cyan-700">
                                                        ${Number(
                                                            producto.precioTotal !== null && producto.precioTotal !== undefined
                                                                ? producto.precioTotal
                                                                : producto.precio
                                                        ).toLocaleString("es-CL")}
                                                    </span>

                                                    {/* Mostrar sección de ganancia SOLO si hay datos reales */}
                                                    {(producto.porcGanancia !== null && producto.porcGanancia !== undefined) && producto.precio && (
                                                        <div className="text-xs text-slate-500 mt-1">
                                                            <div>Ganancia: {Number(producto.porcGanancia)}%</div>
                                                            <div>Costo: ${Number(producto.precio).toLocaleString("es-CL")}</div>
                                                        </div>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onAgregarProducto(producto);
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
                            onClick={onClose}
                            className="px-4 py-2 border border-cyan-200 text-cyan-700 rounded-xl hover:bg-cyan-50 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default SelectProductoModal;