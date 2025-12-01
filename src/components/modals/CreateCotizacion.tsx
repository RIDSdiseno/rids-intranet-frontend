import React from "react";
import { motion } from "framer-motion";
import {
    PlusOutlined,
    InfoCircleOutlined,
    BuildOutlined,
    FileTextOutlined,
    DeleteOutlined
} from "@ant-design/icons";
import type {
    FormData,
    EntidadGestioo,
    MonedaCotizacion,
    SeccionCotizacion
} from "./types";
import {
    ItemTipoGestioo,
    TipoCotizacionGestioo,
    EstadoCotizacionGestioo
} from "./types";
import { formatearPrecio, calcularTotales } from "./utils";

interface CreateCotizacionModalProps {
    show: boolean;
    onClose: () => void;
    formData: FormData;
    setFormData: (data: FormData) => void;
    items: any[];
    setItems: (items: any[]) => void;
    entidades: EntidadGestioo[];
    filtroOrigen: string;
    setFiltroOrigen: (origen: string) => void;
    onCargarProductos: (mostrarSelector?: boolean) => void;
    onCargarServicios: () => void;
    onAddItem: (tipo: ItemTipoGestioo, seccionId?: number) => void;
    onUpdateItem: (id: number, field: string, value: any) => void;
    onRemoveItem: (id: number) => void;
    onCrearCotizacion: () => void;
    onCrearEmpresa: () => void;
    onCrearProducto: () => void;
    onCrearPersona: () => void;
    onEditarPersona: (entidad: EntidadGestioo) => void;
    totales: any;
    apiLoading: boolean;
}

const CreateCotizacionModal: React.FC<CreateCotizacionModalProps> = ({
    show,
    onClose,
    formData,
    setFormData,
    items,
    setItems,
    entidades,
    filtroOrigen,
    setFiltroOrigen,
    onCargarProductos,
    onCargarServicios,
    onAddItem,
    onUpdateItem,
    onRemoveItem,
    onCrearCotizacion,
    onCrearEmpresa,
    onCrearProducto,
    onCrearPersona,
    onEditarPersona,
    totales,
    apiLoading,
}) => {
    if (!show) return null;

    const entidadSeleccionada = entidades.find(e => e.id.toString() === formData.entidadId);

    // Función para agregar nueva sección
    const agregarSeccion = () => {
        const nuevaSeccion: SeccionCotizacion = {
            id: Date.now(),
            nombre: `Sección ${formData.secciones.length + 1}`,
            descripcion: '',
            items: [],
            orden: formData.secciones.length
        };

        setFormData({
            ...formData,
            secciones: [...formData.secciones, nuevaSeccion],
            seccionActiva: nuevaSeccion.id
        });
    };

    // Función para eliminar sección
    const eliminarSeccion = (seccionId: number) => {
        if (formData.secciones.length <= 1) {
            alert("Debe haber al menos una sección");
            return;
        }

        // Eliminar items de la sección que se va a eliminar
        const itemsAEliminar = items.filter(item => item.seccionId === seccionId);
        itemsAEliminar.forEach(item => onRemoveItem(item.id));

        const nuevasSecciones = formData.secciones.filter(s => s.id !== seccionId);
        const nuevaSeccionActiva = nuevasSecciones.length > 0 ? nuevasSecciones[0].id : 0;

        setFormData({
            ...formData,
            secciones: nuevasSecciones,
            seccionActiva: nuevaSeccionActiva
        });
    };

    // Función para actualizar sección
    const actualizarSeccion = (seccionId: number, campo: string, valor: string) => {
        setFormData({
            ...formData,
            secciones: formData.secciones.map(seccion =>
                seccion.id === seccionId ? { ...seccion, [campo]: valor } : seccion
            )
        });
    };

    // Función para cambiar sección activa
    const cambiarSeccionActiva = (seccionId: number) => {
        setFormData({
            ...formData,
            seccionActiva: seccionId
        });
    };

    // Obtener sección activa
    const seccionActiva = formData.secciones.find(s => s.id === formData.seccionActiva);
    const itemsSeccionActiva = items.filter(item => item.seccionId === formData.seccionActiva);

    const handleUpdateItem = (id: number, field: string, value: any) => {
        onUpdateItem(id, field, value);
    };

    const handleRemoveItem = (id: number) => {
        onRemoveItem(id);
    };

    // Calcular totales por sección
    const calcularTotalesSeccion = (seccionId: number) => {
        const itemsSeccion = items.filter(item => item.seccionId === seccionId);
        return calcularTotales(itemsSeccion);
    };

    // Renderizar item individual
    const renderItem = (item: any, index: number) => {
        const base = item.precio * item.cantidad;
        const descuento = item.porcentaje ? (base * item.porcentaje) / 100 : 0;
        const baseFinal = base - descuento;
        const ivaItem = item.tieneIVA ? baseFinal * 0.19 : 0;
        const totalItem = baseFinal + ivaItem;

        const gananciaItem = item.tipo === ItemTipoGestioo.PRODUCTO && item.precioCosto
            ? (item.precio - item.precioCosto) * item.cantidad
            : 0;

        const margenGanancia = item.tipo === ItemTipoGestioo.PRODUCTO && item.precioCosto && item.precioCosto > 0
            ? ((item.precio - item.precioCosto) / item.precioCosto) * 100
            : item.porcGanancia || 0;

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
                    <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${item.tipo === ItemTipoGestioo.PRODUCTO
                            ? "bg-cyan-100 text-cyan-800"
                            : item.tipo === ItemTipoGestioo.SERVICIO
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                    >
                        {item.tipo === ItemTipoGestioo.PRODUCTO
                            ? "Producto"
                            : item.tipo === ItemTipoGestioo.SERVICIO
                                ? "Servicio"
                                : "Descuento"}
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
                    {item.tipo === ItemTipoGestioo.PRODUCTO && item.precioCosto && item.precioCosto > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                            Costo: ${item.precioCosto.toLocaleString("es-CL")}
                        </p>
                    )}
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
                    <div className="text-xs text-slate-500 mt-1">
                        {formatearPrecio(item.precio, formData.moneda, formData.tasaCambio)}
                    </div>
                </td>

                {/* PORCENTAJE GANANCIA */}
                <td className="px-3 py-2 text-center border-r border-cyan-100">
                    {item.tipo === ItemTipoGestioo.PRODUCTO ? (
                        <div className="flex flex-col items-center">
                            <span
                                className={`text-xs font-medium ${margenGanancia > 0 ? "text-emerald-700" : "text-slate-500"
                                    }`}
                            >
                                {margenGanancia.toFixed(1)}%
                            </span>
                            {gananciaItem > 0 && (
                                <span className="text-xs text-emerald-600">
                                    +${gananciaItem.toLocaleString("es-CL")}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-slate-400 text-xs">—</span>
                    )}
                </td>

                {/* IVA */}
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
                        value={item.porcentaje === 0 ? "" : item.porcentaje ?? ""}
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
                    <span
                        className={
                            item.tipo === ItemTipoGestioo.ADICIONAL
                                ? "text-rose-600 font-medium"
                                : "text-slate-800 font-medium"
                        }
                    >
                        {item.tipo === ItemTipoGestioo.ADICIONAL ? (
                            <>{formatearPrecio(descuento, formData.moneda, formData.tasaCambio)}</>
                        ) : (
                            <>{formatearPrecio(totalItem, formData.moneda, formData.tasaCambio)}</>
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
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl relative max-h-[90vh] overflow-y-auto"
            >
                <div className="p-6">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">
                        Nueva Cotización
                    </h2>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl"
                    >
                        ✕
                    </button>

                    <div className="space-y-6">
                        {/* BLOQUE PRINCIPAL */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Información del Cliente */}
                            <div className="p-4 border border-cyan-200 rounded-2xl bg-white relative shadow-sm">
                                <h3 className="font-semibold text-slate-700 mb-3">Información del Cliente</h3>

                                <div className="space-y-4">
                                    {/* Tipo de Entidad */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">
                                            Tipo de Entidad
                                        </label>
                                        <select
                                            value={formData.tipoEntidad}
                                            onChange={(e) => {
                                                setFormData({
                                                    ...formData,
                                                    tipoEntidad: e.target.value as "EMPRESA" | "PERSONA",
                                                    entidadId: ""
                                                });
                                            }}
                                            className="
        w-full px-3 py-2 text-sm
        rounded-xl bg-white
        border border-cyan-200
        text-slate-700
        focus:outline-none focus:ring-2 focus:ring-cyan-400
        transition
    "
                                        >
                                            <option value="EMPRESA">Empresa</option>
                                            <option value="PERSONA">Persona</option>
                                        </select>
                                    </div>

                                    {/* Filtro por Origen (solo para empresas) */}
                                    {formData.tipoEntidad === "EMPRESA" && (
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1">
                                                Filtrar por Origen
                                            </label>
                                            <select
                                                value={filtroOrigen}
                                                onChange={(e) => setFiltroOrigen(e.target.value)}
                                                className="
        w-full px-3 py-2 text-sm
        rounded-xl bg-white
        border border-cyan-200
        text-slate-700
        focus:outline-none focus:ring-2 focus:ring-cyan-400
        transition
    "
                                            >
                                                <option value="TODOS">Todos los orígenes</option>
                                                <option value="RIDS">RIDS</option>
                                                <option value="ECONNET">ECONNET</option>
                                                <option value="OTRO">OTRO</option>
                                            </select>
                                        </div>
                                    )}

                                    {/* Botones de creación */}
                                    <div className="flex gap-2">
                                        {formData.tipoEntidad === "EMPRESA" ? (
                                            <button
                                                type="button"
                                                onClick={onCrearEmpresa}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700 transition"
                                            >
                                                <PlusOutlined /> Crear Empresa
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={onCrearPersona}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs hover:bg-emerald-700 transition"
                                                >
                                                    <PlusOutlined /> Crear Persona
                                                </button>
                                                {formData.entidadId && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const ent = entidades.find(e => e.id === Number(formData.entidadId));
                                                            if (ent) onEditarPersona(ent);
                                                        }}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs hover:bg-amber-600 transition"
                                                    >
                                                        <BuildOutlined /> Editar
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* Selector de Entidad */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Entidad</label>
                                        <select
                                            value={formData.entidadId}
                                            onChange={(e) => setFormData({ ...formData, entidadId: e.target.value })}
                                            disabled={entidades.length === 0}
                                            className="
        w-full px-3 py-2 text-sm
        rounded-xl bg-white
        border border-cyan-200
        text-slate-700
        focus:outline-none focus:ring-2 focus:ring-cyan-400
        transition
    "
                                        >
                                            <option value="">Seleccione…</option>
                                            {entidades
                                                .filter(entidad => {
                                                    if (formData.tipoEntidad === "EMPRESA" && filtroOrigen !== "TODOS") {
                                                        return entidad.origen === filtroOrigen;
                                                    }
                                                    return true;
                                                })
                                                .map((ent) => (
                                                    <option key={ent.id} value={ent.id}>
                                                        {ent.nombre} {ent.rut ? `(${ent.rut})` : ""}
                                                    </option>
                                                ))}
                                        </select>
                                        {formData.tipoEntidad === "EMPRESA" && (
                                            <p className="text-xs text-slate-500 mt-1">
                                                Mostrando {entidades.filter(ent => {
                                                    if (filtroOrigen !== "TODOS") {
                                                        return ent.origen === filtroOrigen;
                                                    }
                                                    return true;
                                                }).length} de {entidades.length} empresas
                                            </p>
                                        )}
                                    </div>

                                    {/* Información de la entidad seleccionada */}
                                    {formData.entidadId && entidadSeleccionada && (
                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                                            <div className="flex items-start gap-2">
                                                <InfoCircleOutlined className="text-blue-500 mt-0.5 text-sm" />
                                                <div className="flex-1">
                                                    <p className="text-xs font-medium text-blue-700">Entidad seleccionada</p>
                                                    <div className="text-xs text-blue-600 mt-1 space-y-1">
                                                        <p><strong>Nombre:</strong> {entidadSeleccionada.nombre}</p>
                                                        {entidadSeleccionada.rut && <p><strong>RUT:</strong> {entidadSeleccionada.rut}</p>}
                                                        {entidadSeleccionada.origen && <p><strong>Origen:</strong> {entidadSeleccionada.origen}</p>}
                                                        {entidadSeleccionada.correo && <p><strong>Email:</strong> {entidadSeleccionada.correo}</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Información de Cotización */}
                            <div className="p-4 border border-cyan-200 rounded-2xl bg-white shadow-sm">
                                <h3 className="font-semibold text-slate-700 mb-3">Configuración</h3>
                                <div className="space-y-4">
                                    {/* Tipo */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                                        <select
                                            className="w-full border border-cyan-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                            defaultValue={TipoCotizacionGestioo.CLIENTE}
                                        >
                                            <option value={TipoCotizacionGestioo.CLIENTE}>Cliente</option>
                                            <option value={TipoCotizacionGestioo.INTERNA}>Interna</option>
                                            <option value={TipoCotizacionGestioo.PROVEEDOR}>Proveedor</option>
                                        </select>
                                    </div>

                                    {/* Estado */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Estado</label>
                                        <select
                                            className="w-full border border-cyan-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                            defaultValue={EstadoCotizacionGestioo.BORRADOR}
                                        >
                                            <option value={EstadoCotizacionGestioo.BORRADOR}>Borrador</option>
                                            <option value={EstadoCotizacionGestioo.GENERADA}>Generada</option>
                                            <option value={EstadoCotizacionGestioo.ENVIADA}>Enviada</option>
                                            <option value={EstadoCotizacionGestioo.APROBADA}>Aprobada</option>
                                            <option value={EstadoCotizacionGestioo.RECHAZADA}>Rechazada</option>
                                        </select>
                                    </div>

                                    {/* Moneda */}
                                    <div className="border-t border-slate-200 pt-3">
                                        <label className="block text-xs font-medium text-slate-600 mb-2">
                                            Moneda de Cotización
                                        </label>
                                        <select
                                            value={formData.moneda}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    moneda: e.target.value as MonedaCotizacion,
                                                    tasaCambio: e.target.value === "USD" ? (formData.tasaCambio || 950) : 1
                                                })
                                            }
                                            className="w-full border border-cyan-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-cyan-400"
                                        >
                                            <option value="CLP">CLP - Pesos chilenos</option>
                                            <option value="USD">USD - Dólares americanos</option>
                                        </select>

                                        {formData.moneda === "USD" && (
                                            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                <label className="block text-xs font-medium text-blue-700 mb-1">
                                                    Tasa de Cambio (CLP → USD)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="1"
                                                    value={formData.tasaCambio}
                                                    onChange={(e) => {
                                                        const tasa = Number(e.target.value);
                                                        if (tasa < 1) return;
                                                        setFormData({ ...formData, tasaCambio: tasa });
                                                    }}
                                                    className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-400"
                                                    placeholder="Ej: 950"
                                                />
                                                <p className="text-xs text-blue-600 mt-1">
                                                    <strong>Equivalencia:</strong> 1 USD = {formData.tasaCambio.toLocaleString("es-CL")} CLP
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECCIONES DE COTIZACIÓN */}
                        <div className="border border-cyan-200 rounded-2xl p-4 bg-white">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <FileTextOutlined className="text-cyan-600" />
                                    <h3 className="font-semibold text-slate-700">Secciones de Cotización</h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={agregarSeccion}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-sm hover:bg-cyan-700 transition"
                                >
                                    <PlusOutlined />
                                    Nueva Sección
                                </button>
                            </div>

                            {/* Pestañas de secciones */}
                            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                                {formData.secciones.map((seccion) => {
                                    const totalesSeccion = calcularTotalesSeccion(seccion.id);
                                    const isActive = formData.seccionActiva === seccion.id;

                                    return (
                                        <div
                                            key={seccion.id}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors min-w-0 flex-shrink-0 ${isActive
                                                ? 'bg-cyan-600 text-white'
                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                }`}
                                            onClick={() => cambiarSeccionActiva(seccion.id)}
                                        >
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-sm font-medium truncate">
                                                    {seccion.nombre}
                                                </span>
                                                <span className={`text-xs ${isActive ? 'text-cyan-100' : 'text-slate-500'}`}>
                                                    {formatearPrecio(totalesSeccion.total, formData.moneda, formData.tasaCambio)}
                                                </span>
                                            </div>
                                            {formData.secciones.length > 1 && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        eliminarSeccion(seccion.id);
                                                    }}
                                                    className={`text-xs opacity-70 hover:opacity-100 ${isActive ? 'text-white' : 'text-slate-500'}`}
                                                >
                                                    <DeleteOutlined />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Configuración de sección activa */}
                            {seccionActiva && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-3 bg-slate-50 rounded-lg">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">
                                            Nombre de Sección
                                        </label>
                                        <input
                                            type="text"
                                            value={seccionActiva.nombre}
                                            onChange={(e) => actualizarSeccion(seccionActiva.id, 'nombre', e.target.value)}
                                            className="w-full border border-cyan-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400"
                                            placeholder="Ej: Hardware, Software, Servicios..."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">
                                            Descripción (opcional)
                                        </label>
                                        <input
                                            type="text"
                                            value={seccionActiva.descripcion || ''}
                                            onChange={(e) => actualizarSeccion(seccionActiva.id, 'descripcion', e.target.value)}
                                            className="w-full border border-cyan-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-cyan-400"
                                            placeholder="Descripción breve de la sección..."
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Mensaje cuando no hay secciones */}
                            {formData.secciones.length === 0 && (
                                <div className="text-center py-8 text-slate-500 border-2 border-dashed border-slate-200 rounded-xl">
                                    <FileTextOutlined className="text-4xl mb-2 opacity-50" />
                                    <p>No hay secciones creadas</p>
                                    <p className="text-sm">Agrega secciones para organizar tu cotización</p>
                                    <button
                                        type="button"
                                        onClick={agregarSeccion}
                                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 text-white text-sm hover:bg-cyan-700 transition"
                                    >
                                        <PlusOutlined />
                                        Crear Primera Sección
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* BOTONES DE PRODUCTOS / SERVICIOS - Solo si hay sección activa */}
                        {seccionActiva && (
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => onCargarProductos(true)}
                                    className="px-3 py-1.5 rounded-xl border border-cyan-300 text-cyan-700 hover:bg-cyan-50"
                                >
                                    + Seleccionar Producto
                                </button>

                                <button
                                    type="button"
                                    onClick={onCrearProducto}
                                    className="px-3 py-1.5 rounded-xl border border-purple-300 text-purple-700 hover:bg-purple-50"
                                >
                                    + Crear Producto Nuevo
                                </button>

                                <button
                                    type="button"
                                    onClick={onCargarServicios}
                                    className="px-3 py-1.5 rounded-xl border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                >
                                    + Servicio
                                </button>

                                <button
                                    type="button"
                                    onClick={() => onAddItem(ItemTipoGestioo.ADICIONAL, formData.seccionActiva)}
                                    className="px-3 py-1.5 rounded-xl border border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                                >
                                    + Descuento Adicional
                                </button>
                            </div>
                        )}

                        {/* TABLA DE ÍTEMS - Solo si hay sección activa */}
                        {seccionActiva && (
                            <div className="border border-cyan-200 rounded-2xl overflow-hidden">
                                <div className="bg-cyan-50 px-4 py-3 border-b border-cyan-200">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h4 className="font-semibold text-cyan-800">
                                                {seccionActiva.nombre}
                                            </h4>
                                            {seccionActiva.descripcion && (
                                                <p className="text-sm text-cyan-600 mt-1">
                                                    {seccionActiva.descripcion}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm text-cyan-700 bg-white px-2 py-1 rounded-full border border-cyan-200">
                                                {itemsSeccionActiva.length} items
                                            </span>
                                            <span className="text-sm font-medium text-cyan-800">
                                                Total: {formatearPrecio(
                                                    calcularTotalesSeccion(seccionActiva.id).total,
                                                    formData.moneda,
                                                    formData.tasaCambio
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <table className="w-full text-sm">
                                    <thead className="bg-cyan-50 text-slate-700 border-b border-cyan-200">
                                        <tr>
                                            <th className="px-3 py-2 text-left border-r border-cyan-200">Tipo</th>
                                            <th className="px-3 py-2 text-left border-r border-cyan-200">Descripción</th>
                                            <th className="px-3 py-2 text-center border-r border-cyan-200 w-20">Cant.</th>
                                            <th className="px-3 py-2 text-center border-r border-cyan-200 w-28">P.Unitario</th>
                                            <th className="px-3 py-2 text-center border-r border-cyan-200 w-24">% Ganancia</th>
                                            <th className="px-3 py-2 text-center border-r border-cyan-200 w-20">IVA</th>
                                            <th className="px-3 py-2 text-center border-r border-cyan-200 w-24">% Desc</th>
                                            <th className="px-3 py-2 text-right border-r border-cyan-200 w-28">Subtotal</th>
                                            <th className="px-3 py-2 text-right w-16"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {itemsSeccionActiva.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} className="text-center py-4 text-slate-400 border-b border-cyan-100">
                                                    No hay productos o servicios en esta sección.
                                                </td>
                                            </tr>
                                        ) : (
                                            itemsSeccionActiva.map((item, index) => renderItem(item, index))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* RESUMEN DE SECCIONES */}
                        {formData.secciones.length > 1 && (
                            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
                                <h4 className="font-semibold text-slate-700 mb-3">Resumen por Sección</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {formData.secciones.map((seccion) => {
                                        const totalesSeccion = calcularTotalesSeccion(seccion.id);
                                        const itemsCount = items.filter(item => item.seccionId === seccion.id).length;

                                        return (
                                            <div
                                                key={seccion.id}
                                                className={`p-3 rounded-lg border cursor-pointer transition-colors ${formData.seccionActiva === seccion.id
                                                    ? 'bg-cyan-100 border-cyan-300'
                                                    : 'bg-white border-slate-200 hover:border-cyan-200'
                                                    }`}
                                                onClick={() => cambiarSeccionActiva(seccion.id)}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <h5 className="font-medium text-slate-800 text-sm">
                                                        {seccion.nombre}
                                                    </h5>
                                                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                                                        {itemsCount} items
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-600 mb-2 line-clamp-2">
                                                    {seccion.descripcion || 'Sin descripción'}
                                                </p>
                                                <p className="text-sm font-bold text-cyan-700">
                                                    {formatearPrecio(totalesSeccion.total, formData.moneda, formData.tasaCambio)}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* TOTALES GENERALES */}
                        <div className="flex justify-end text-sm text-slate-700">
                            <div className="text-right space-y-1 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <p>Subtotal bruto: {formatearPrecio(totales.subtotalBruto, formData.moneda, formData.tasaCambio)}</p>
                                <p className="text-rose-600">
                                    Descuentos: -{formatearPrecio(totales.descuentos, formData.moneda, formData.tasaCambio)}
                                </p>
                                <p>Subtotal: {formatearPrecio(totales.subtotal, formData.moneda, formData.tasaCambio)}</p>
                                <p>IVA (19%): {formatearPrecio(totales.iva, formData.moneda, formData.tasaCambio)}</p>
                                <p className="font-bold text-slate-900 border-t pt-1">
                                    Total final: {formatearPrecio(totales.total, formData.moneda, formData.tasaCambio)}
                                </p>
                                {formData.moneda === "USD" && (
                                    <p className="text-xs text-slate-500 border-t pt-1 mt-1">
                                        Equivalente en CLP: ${Math.round(totales.total).toLocaleString("es-CL")}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* BOTONES FINALES */}
                        <div className="flex justify-between items-center pt-4 border-t">
                            <div>
                                <p className="text-slate-600 text-sm">
                                    Estado inicial: <b>Borrador</b>
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 hover:bg-slate-300"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={onCrearCotizacion}
                                    disabled={!formData.entidadId || items.length === 0 || apiLoading}
                                    className="px-4 py-2 rounded-xl bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {apiLoading ? "Creando..." : "Crear Cotización"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default CreateCotizacionModal;