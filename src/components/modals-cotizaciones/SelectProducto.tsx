import React, { useState } from "react";
import { motion } from "framer-motion";
import {
    SearchOutlined,
    BarcodeOutlined,
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
    onAgregarProducto,
    orden,
}) => {
    if (!show) return null;

    const [vista, setVista] = useState<"tabla" | "tarjetas">("tabla");

    const filtrarProductosAvanzado = (productos: any[]) => {
        return productos.filter(producto => {
            const nombre = (producto.nombre || "").toLowerCase();
            const descripcion = (producto.descripcion || "").toLowerCase();
            const codigo = (producto.sku || producto.codigo || "").toLowerCase();
            const categoria = (producto.categoria || "").toLowerCase();

            const textoFiltro = filtros.texto.toLowerCase();

            const coincideTexto =
                nombre.includes(textoFiltro) ||
                descripcion.includes(textoFiltro) ||
                codigo.includes(textoFiltro);

            if (!coincideTexto) return false;

            const coincideCodigo =
                !filtros.codigo ||
                codigo.includes(filtros.codigo.toLowerCase());

            if (!coincideCodigo) return false;

            const precio = Number(producto.precio || 0);
            const precioMin = filtros.precioMin ? Number(filtros.precioMin) : 0;
            const precioMax = filtros.precioMax ? Number(filtros.precioMax) : Infinity;

            if (precio < precioMin || precio > precioMax) return false;

            const coincideCategoria =
                !filtros.categoria ||
                categoria.includes(filtros.categoria.toLowerCase());

            if (!coincideCategoria) return false;

            return true;
        });
    };

    const ordenarProductos = (productos: any[]) => {
        return [...productos].sort((a, b) => {
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
    const productosConGanancia = productosMostrar.filter(p => (p.porcGanancia || 0) > 0).length;
    const productosConStock = productosMostrar.filter(p => p.stock > 0).length;

    const VistaTabla = () => (
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[980px]">
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
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <BarcodeOutlined className="text-slate-400 text-sm" />
                                        <span className="font-mono text-sm text-slate-600">
                                            {producto.sku || producto.codigo || "N/A"}
                                        </span>
                                    </div>
                                </td>

                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        {producto.imagen && (
                                            <img
                                                src={producto.imagen}
                                                className="w-12 h-12 rounded-md border object-cover shrink-0"
                                                alt="img"
                                            />
                                        )}

                                        <div className="min-w-0">
                                            <h3 className="font-medium text-slate-800 group-hover:text-cyan-700 transition-colors break-words">
                                                {producto.nombre}
                                            </h3>

                                            {producto.descripcion && (
                                                <p className="text-sm text-slate-500 mt-1 line-clamp-1">
                                                    {producto.descripcion}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </td>

                                <td className="p-4">
                                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                        {producto.categoria || "Sin categoría"}
                                    </span>
                                </td>

                                <td className="p-4 text-right">
                                    <span className="text-sm text-slate-600">
                                        ${Number(producto.precio || 0).toLocaleString("es-CL")}
                                    </span>
                                </td>

                                <td className="p-4 text-right">
                                    <span className="font-semibold text-emerald-600 text-base">
                                        ${Number(
                                            producto.precioTotal !== null && producto.precioTotal !== undefined
                                                ? producto.precioTotal
                                                : producto.precio
                                        ).toLocaleString("es-CL")}
                                    </span>
                                </td>

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

                                <td className="p-4">
                                    <div className="flex justify-center gap-2">
                                        <button
                                            onClick={() =>
                                                onAgregarProducto({
                                                    id: producto.id,
                                                    idLocal: `temp-${producto.id}-${Date.now()}`,
                                                    productoId: producto.id,
                                                    tipo: "PRODUCTO",
                                                    nombre: producto.nombre,
                                                    descripcion: producto.descripcion,
                                                    cantidad: 1,
                                                    precioCosto: producto.precio,
                                                    porcGanancia: producto.porcGanancia ?? 0,
                                                    precioOriginalCLP: producto.precioTotal ?? producto.precio,
                                                    precio: producto.precioTotal ?? producto.precio,
                                                    tieneIVA: true,
                                                })
                                            }
                                            className="flex items-center gap-2 px-3 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm font-medium"
                                        >
                                            <PlusOutlined />
                                            Agregar
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {productosMostrar.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                    <ShoppingCartOutlined className="text-3xl mb-3 opacity-50" />
                    <p>No se encontraron productos</p>
                </div>
            )}
        </div>
    );

    const VistaTarjetas = () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6">
            {productosMostrar.map((producto) => (
                <div
                    key={producto.id}
                    className="bg-white rounded-2xl border border-slate-200 hover:border-cyan-300 transition-all duration-300 hover:shadow-xl overflow-hidden group"
                >
                    <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-3 border-b border-slate-200">
                        <div className="flex justify-between items-center gap-2">
                            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide break-words">
                                {producto.categoria || "Sin categoría"}
                            </span>
                            {producto.sku && (
                                <span className="text-xs bg-white px-2 py-1 rounded-full border border-slate-300 text-slate-500 font-mono shrink-0">
                                    #{producto.sku}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="p-4">
                        {producto.imagen && (
                            <img
                                src={producto.imagen}
                                alt="producto"
                                className="w-full h-40 object-cover rounded-xl mb-4 border"
                            />
                        )}

                        <h3 className="font-semibold text-slate-800 text-base leading-tight mb-2 line-clamp-2 group-hover:text-cyan-700 transition-colors min-h-[2.5rem]">
                            {producto.nombre || "Producto sin nombre"}
                        </h3>

                        <div className="space-y-3 mb-4">
                            <div className="flex justify-between items-center gap-3">
                                <span className="text-sm text-slate-500">Precio venta:</span>
                                <span className="font-bold text-xl text-emerald-600 text-right break-words">
                                    ${Number(
                                        producto.precioTotal !== null && producto.precioTotal !== undefined
                                            ? producto.precioTotal
                                            : producto.precio
                                    ).toLocaleString("es-CL")}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="bg-slate-50 rounded-lg p-3 text-center">
                                    <div className="text-slate-500 text-xs mb-1">Costo</div>
                                    <div className="font-semibold text-slate-700 break-words">
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

                        {typeof producto.stock !== "undefined" && (
                            <div className="flex items-center justify-between mb-4 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 gap-3">
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

                        <div className="flex gap-2">
                            <button
                                onClick={() =>
                                    onAgregarProducto({
                                        id: producto.id,
                                        idLocal: `temp-${producto.id}-${Date.now()}`,
                                        productoId: producto.id,
                                        tipo: "PRODUCTO",
                                        nombre: producto.nombre,
                                        descripcion: producto.descripcion,
                                        cantidad: 1,
                                        precioCosto: producto.precio,
                                        porcGanancia: producto.porcGanancia ?? 0,
                                        precioOriginalCLP: producto.precioTotal ?? producto.precio,
                                        precio: producto.precioTotal ?? producto.precio,
                                        tieneIVA: true,
                                    })
                                }
                                className="flex-1 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-700 hover:to-cyan-800 text-white py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                            >
                                <PlusOutlined className="text-sm" />
                                Agregar
                            </button>
                        </div>
                    </div>

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
        <div className="fixed inset-0 bg-black/40 flex items-start sm:items-center justify-center p-3 sm:p-4 z-[9999]">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl relative max-h-[95vh] overflow-hidden z-[9999]"
            >
                <div className="max-h-[95vh] overflow-y-auto">
                    {/* Header */}
                    <div className="sticky top-0 bg-white border-b border-slate-200 z-10">
                        <div className="p-4 sm:p-6">
                            <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-start">
                                <div className="min-w-0">
                                    <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2 break-words">
                                        <ShoppingCartOutlined className="text-cyan-600 mr-3" />
                                        Catálogo de Productos
                                    </h2>
                                    <p className="text-slate-600 text-sm sm:text-base">
                                        Selecciona productos para agregar a tu cotización
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                    {/* Selector de vista */}
                                    <div className="flex bg-slate-100 rounded-lg p-1 w-full sm:w-auto">
                                        <button
                                            onClick={() => setVista("tabla")}
                                            className={`flex-1 sm:flex-none px-3 py-2 rounded-md text-sm flex items-center justify-center gap-2 transition-colors ${vista === "tabla"
                                                    ? "bg-white shadow-sm text-cyan-600"
                                                    : "text-slate-500 hover:text-slate-700"
                                                }`}
                                        >
                                            <TableOutlined />
                                            Tabla
                                        </button>
                                        <button
                                            onClick={() => setVista("tarjetas")}
                                            className={`flex-1 sm:flex-none px-3 py-2 rounded-md text-sm flex items-center justify-center gap-2 transition-colors ${vista === "tarjetas"
                                                    ? "bg-white shadow-sm text-cyan-600"
                                                    : "text-slate-500 hover:text-slate-700"
                                                }`}
                                        >
                                            <AppstoreOutlined />
                                            Tarjetas
                                        </button>
                                    </div>

                                    <button
                                        onClick={onClose}
                                        className="w-full sm:w-auto text-slate-400 hover:text-slate-600 text-xl p-2 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 sm:border-0"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {/* Estadísticas rápidas */}
                            <div className="flex flex-wrap gap-3 sm:gap-6 mt-4 text-sm">
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

                    <div className="p-4 sm:p-6">
                        {/* Filtros */}
                        <div className="mb-8">
                            <div className="relative">
                                <SearchOutlined className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg" />

                                <input
                                    type="text"
                                    placeholder="Buscar productos por nombre, descripción o código..."
                                    value={filtros.texto}
                                    onChange={(e) => onFiltroChange("texto", e.target.value)}
                                    className="
                                        w-full pl-12 pr-10 py-3
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
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        {vista === "tabla" ? <VistaTabla /> : <VistaTarjetas />}

                        {/* Footer */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center pt-6 border-t border-slate-200">
                            <div className="text-slate-600 text-sm sm:text-base">
                                Mostrando <span className="font-semibold">{productosMostrar.length}</span> de{" "}
                                <span className="font-semibold">{productos.length}</span> productos
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full sm:w-auto px-6 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
                            >
                                Cerrar catálogo
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default SelectProductoModal;