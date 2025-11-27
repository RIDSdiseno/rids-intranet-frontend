import React from "react";
import { motion } from "framer-motion";
import {
    FilterOutlined,
    SearchOutlined,
    BarcodeOutlined,
    EditOutlined,
    CloseCircleOutlined,
    ReloadOutlined,
} from "@ant-design/icons";

interface SelectServicioModalProps {
    show: boolean;
    onClose: () => void;
    servicios: any[];
    filtros: any;
    onFiltroChange: (filtro: string, value: any) => void;
    onLimpiarFiltros: () => void;
    onAgregarServicio: (servicio: any) => void;
    onEditarServicio: (servicio: any) => void;
    orden: string;
    onOrdenChange: (orden: string) => void;
}

const SelectServicioModal: React.FC<SelectServicioModalProps> = ({
    show,
    onClose,
    servicios,
    filtros,
    onFiltroChange,
    onLimpiarFiltros,
    onAgregarServicio,
    onEditarServicio,
    orden,
    onOrdenChange,
}) => {
    if (!show) return null;

    const filtrarServiciosAvanzado = (servicios: any[]) => {
        return servicios.filter(servicio => {
            const coincideTexto =
                servicio.nombre?.toLowerCase().includes(filtros.texto.toLowerCase()) ||
                servicio.descripcion?.toLowerCase().includes(filtros.texto.toLowerCase()) ||
                servicio.codigo?.toLowerCase().includes(filtros.texto.toLowerCase());

            const coincideCodigo = !filtros.codigo ||
                servicio.codigo?.toLowerCase().includes(filtros.codigo.toLowerCase());

            const precio = servicio.precio || servicio.precioBase || 0;
            const precioMin = filtros.precioMin ? Number(filtros.precioMin) : 0;
            const precioMax = filtros.precioMax ? Number(filtros.precioMax) : Infinity;
            const coincidePrecio = precio >= precioMin && precio <= precioMax;

            const coincideCategoria = !filtros.categoria ||
                servicio.categoria?.toLowerCase().includes(filtros.categoria.toLowerCase());

            return coincideTexto && coincideCodigo && coincidePrecio && coincideCategoria;
        });
    };

    const ordenarServicios = (servicios: any[]) => {
        return servicios.sort((a, b) => {
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

    const serviciosMostrar = ordenarServicios(filtrarServiciosAvanzado(servicios));
    const hayFiltrosActivos = filtros.texto || filtros.codigo || filtros.precioMin || filtros.precioMax || filtros.categoria;

    return (
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
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl"
                    >
                        ✕
                    </button>

                    {/* FILTROS AVANZADOS */}
                    <div className="mb-6 p-4 border border-emerald-200 rounded-2xl bg-emerald-50/30">
                        {/* Búsqueda principal */}
                        <div className="relative mb-4">
                            <SearchOutlined className="absolute left-3 top-3 text-emerald-600" />
                            <input
                                type="text"
                                placeholder="Buscar servicios por nombre, descripción o código..."
                                value={filtros.texto}
                                onChange={(e) => onFiltroChange("texto", e.target.value)}
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
                                    value={filtros.codigo}
                                    onChange={(e) => onFiltroChange("codigo", e.target.value)}
                                    className="flex-1 border border-green-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                />
                                <button
                                    onClick={() => onFiltroChange("codigo", "")}
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
                                    value={filtros.precioMin}
                                    onChange={(e) => onFiltroChange("precioMin", e.target.value)}
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
                                    value={filtros.precioMax}
                                    onChange={(e) => onFiltroChange("precioMax", e.target.value)}
                                    className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
                                />
                            </div>

                            {/* Filtro por categoría */}
                            <div>
                                <label className="block text-xs font-medium text-emerald-700 mb-1">
                                    Categoría
                                </label>
                                <select
                                    value={filtros.categoria}
                                    onChange={(e) => onFiltroChange("categoria", e.target.value)}
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
                                    value={orden}
                                    onChange={(e) => onOrdenChange(e.target.value)}
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
                                {serviciosMostrar.length} de {servicios.length} servicios encontrados
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={onLimpiarFiltros}
                                    className="px-3 py-1.5 text-xs border border-emerald-300 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors flex items-center gap-1"
                                >
                                    <ReloadOutlined />
                                    Limpiar Todos los Filtros
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {serviciosMostrar.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 border border-emerald-200 rounded-2xl bg-emerald-50/30 p-6">
                                {hayFiltrosActivos ? (
                                    <>
                                        <p>No se encontraron servicios que coincidan con los filtros aplicados</p>
                                        <button
                                            onClick={onLimpiarFiltros}
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
                                                    onEditarServicio(servicio);
                                                }}
                                                className="p-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                                                title="Editar servicio"
                                            >
                                                <EditOutlined className="text-xs" />
                                            </button>
                                        </div>

                                        {/* CARD ITEM */}
                                        <div onClick={() => onAgregarServicio(servicio)}>
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
                                                        onAgregarServicio(servicio);
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
                            onClick={onClose}
                            className="px-4 py-2 border border-emerald-200 text-emerald-700 rounded-xl hover:bg-emerald-50 transition-colors"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default SelectServicioModal;