import React from "react";
import { motion } from "framer-motion";
import {
    DeleteOutlined,
    CheckCircleOutlined,
    PrinterOutlined,
    UserOutlined,
    SettingOutlined,
    PlusOutlined,
    FileTextOutlined,
} from "@ant-design/icons";
import { type CotizacionGestioo, EstadoCotizacionGestioo, TipoCotizacionGestioo, ItemTipoGestioo, MonedaCotizacion } from "./types";

interface EditCotizacionModalProps {
    show: boolean;
    cotizacion: CotizacionGestioo | null;
    onClose: () => void;
    onUpdate: () => void;
    onPrint: (cotizacion: CotizacionGestioo) => void;
    onCargarProductos: () => void;
    onCargarServicios: () => void;
    onUpdateCotizacion: (cotizacion: CotizacionGestioo) => void;
    apiLoading: boolean;
}

const EditCotizacionModal: React.FC<EditCotizacionModalProps> = ({
    show,
    cotizacion,
    onClose,
    onUpdate,
    onPrint,
    onCargarProductos,
    onCargarServicios,
    onUpdateCotizacion,
    apiLoading,
}) => {
    if (!show || !cotizacion) return null;

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...cotizacion.items];
        newItems[index] = { ...newItems[index], [field]: value };
        onUpdateCotizacion({ ...cotizacion, items: newItems });
    };

    const handleRemoveItem = (index: number) => {
        const newItems = cotizacion.items.filter((_, i) => i !== index);
        onUpdateCotizacion({ ...cotizacion, items: newItems });
    };

    const handleAddItem = (tipo: ItemTipoGestioo) => {
        const newItem: any = {
            id: Date.now(),
            cotizacionId: cotizacion.id,
            tipo: tipo,
            descripcion: tipo === ItemTipoGestioo.ADICIONAL ? "Descuento adicional" : "Nuevo item",
            cantidad: 1,
            precio: 0,
            porcentaje: tipo === ItemTipoGestioo.ADICIONAL ? 10 : 0,
            createdAt: new Date().toISOString()
        };
        if (tipo === ItemTipoGestioo.PRODUCTO) {
            newItem.tieneIVA = true;
        }
        const newItems = [...cotizacion.items, newItem];
        onUpdateCotizacion({ ...cotizacion, items: newItems });
    };

    const moneda = cotizacion.moneda || "CLP";
    const tasa = cotizacion.tasaCambio || 1;

    // Función para convertir CLP -> moneda seleccionada
    const convertir = (valorCLP: number) =>
        moneda === "USD" ? valorCLP / tasa : valorCLP;

    const formatear = (valor: number) =>
        moneda === "USD"
            ? valor.toLocaleString("en-US", { style: "currency", currency: "USD" })
            : valor.toLocaleString("es-CL", { style: "currency", currency: "CLP" });

    // 1. Subtotal bruto (sin IVA)
    const subtotalBrutoCLP = cotizacion.items
        .filter(item => item.tipo !== ItemTipoGestioo.ADICIONAL)
        .reduce((acc, item) => acc + item.precio * item.cantidad, 0);

    // 2. Descuentos
    const descuentosCLP = cotizacion.items
        .filter(item => item.tipo === ItemTipoGestioo.ADICIONAL)
        .reduce((acc, item) => {
            if (item.porcentaje && item.porcentaje > 0) {
                return acc + (subtotalBrutoCLP * item.porcentaje) / 100;
            }
            return acc + item.precio * item.cantidad;
        }, 0);

    // 3. Subtotal neto sin IVA
    const subtotalCLP = Math.max(0, subtotalBrutoCLP - descuentosCLP);

    // 4. IVA por ítems con IVA
    const ivaCLP = cotizacion.items
        .filter(item => item.tieneIVA === true)
        .reduce((acc, item) => {
            const base = item.precio * item.cantidad;
            const desc = item.porcentaje ? (base * item.porcentaje) / 100 : 0;
            const neto = base - desc;
            return acc + neto * 0.19;
        }, 0);

    // 5. Total final
    const totalCLP = subtotalCLP + ivaCLP;

    return (
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
                                Editar Cotización #{cotizacion.id}
                            </h2>
                            <p className="text-slate-600 text-sm mt-1">
                                Estado actual:
                                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${cotizacion.estado === EstadoCotizacionGestioo.BORRADOR
                                    ? "bg-amber-100 text-amber-800"
                                    : cotizacion.estado === EstadoCotizacionGestioo.APROBADA
                                        ? "bg-green-100 text-green-800"
                                        : "bg-blue-100 text-blue-800"
                                    }`}>
                                    {cotizacion.estado}
                                </span>
                            </p>
                        </div>

                        <button
                            onClick={onClose}
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
                                        value={cotizacion.entidad?.nombre || ""}
                                        onChange={(e) =>
                                            onUpdateCotizacion({
                                                ...cotizacion,
                                                entidad: {
                                                    ...cotizacion.entidad!,
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
                                        value={cotizacion.entidad?.rut || ""}
                                        onChange={(e) =>
                                            onUpdateCotizacion({
                                                ...cotizacion,
                                                entidad: {
                                                    ...cotizacion.entidad!,
                                                    rut: e.target.value
                                                }
                                            })
                                        }
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                        placeholder="RUT"
                                    />
                                </div>

                                {/* ORIGEN */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Origen *
                                    </label>
                                    <select
                                        value={cotizacion.entidad?.origen || ""}
                                        onChange={(e) =>
                                            onUpdateCotizacion({
                                                ...cotizacion,
                                                entidad: {
                                                    ...cotizacion.entidad!,
                                                    origen: e.target.value
                                                }
                                            })
                                        }
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-white"
                                        required
                                    >
                                        <option value="">Seleccionar origen</option>
                                        <option value="RIDS">RIDS</option>
                                        <option value="ECONNET">ECONNET</option>
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
                                        value={cotizacion.entidad?.correo || ""}
                                        onChange={(e) =>
                                            onUpdateCotizacion({
                                                ...cotizacion,
                                                entidad: {
                                                    ...cotizacion.entidad!,
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
                                        value={cotizacion.entidad?.telefono || ""}
                                        onChange={(e) =>
                                            onUpdateCotizacion({
                                                ...cotizacion,
                                                entidad: {
                                                    ...cotizacion.entidad!,
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
                                        value={cotizacion.entidad?.direccion || ""}
                                        onChange={(e) =>
                                            onUpdateCotizacion({
                                                ...cotizacion,
                                                entidad: {
                                                    ...cotizacion.entidad!,
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
                            {cotizacion.entidad?.origen && (
                                <div className="mt-4 p-3 border rounded-lg bg-white">
                                    <p className="text-xs font-medium text-slate-600 mb-1">Origen seleccionado:</p>
                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${cotizacion.entidad.origen === "RIDS"
                                        ? "bg-blue-100 text-blue-800 border border-blue-200"
                                        : cotizacion.entidad.origen === "ECONNET"
                                            ? "bg-green-100 text-green-800 border border-green-200"
                                            : "bg-gray-100 text-gray-800 border border-gray-200"
                                        }`}>
                                        {cotizacion.entidad.origen}
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
                                        value={cotizacion.estado}
                                        onChange={(e) => onUpdateCotizacion({
                                            ...cotizacion,
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
                                        value={cotizacion.tipo}
                                        onChange={(e) => onUpdateCotizacion({
                                            ...cotizacion,
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
                                        value={new Date(cotizacion.fecha).toISOString().slice(0, 16)}
                                        onChange={(e) =>
                                            onUpdateCotizacion({
                                                ...cotizacion,
                                                fecha: e.target.value
                                            })
                                        }
                                        className="w-full border border-cyan-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-white"
                                        required
                                    />
                                </div>

                                {/* MONEDA */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-600 mb-1">
                                        Moneda
                                    </label>
                                    <select
                                        value={cotizacion.moneda}
                                        onChange={(e) =>
                                            onUpdateCotizacion({
                                                ...cotizacion,
                                                moneda: e.target.value as MonedaCotizacion,
                                                tasaCambio:
                                                    e.target.value === "USD"
                                                        ? cotizacion.tasaCambio || 1
                                                        : 1
                                            })
                                        }
                                        className="w-full border border-cyan-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-cyan-400"
                                    >
                                        <option value="CLP">CLP — Pesos chilenos</option>
                                        <option value="USD">USD — Dólares americanos</option>
                                    </select>
                                </div>

                                {/* TASA DE CAMBIO */}
                                {cotizacion.moneda === "USD" && (
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">
                                            Tasa de Cambio
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="1"
                                            value={cotizacion.tasaCambio || 1}
                                            onChange={(e) =>
                                                onUpdateCotizacion({
                                                    ...cotizacion,
                                                    tasaCambio: Number(e.target.value)
                                                })
                                            }
                                            className="w-full border border-cyan-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 bg-white"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* BOTONES PARA AGREGAR ITEMS */}
                    <div className="flex flex-wrap gap-3 mb-4 p-4 border border-slate-200 rounded-xl bg-white">
                        <span className="text-sm font-medium text-slate-700 mr-2">Agregar items:</span>
                        <button
                            type="button"
                            onClick={onCargarProductos}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-700 transition-colors text-sm"
                        >
                            <PlusOutlined />
                            Producto
                        </button>
                        <button
                            onClick={onCargarServicios}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors text-sm"
                        >
                            <PlusOutlined />
                            Servicio
                        </button>
                        <button
                            onClick={() => handleAddItem(ItemTipoGestioo.ADICIONAL)}
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
                                Items de la Cotización ({cotizacion.items.length})
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
                                    {cotizacion.items.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="text-center py-8 text-slate-500">
                                                <FileTextOutlined className="text-3xl text-slate-300 mb-2" />
                                                <p>No hay items en esta cotización</p>
                                                <p className="text-xs text-rose-600 mt-2">
                                                    Debe agregar al menos un item para guardar la cotización
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        cotizacion.items.map((item, index) => {
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
                                                            onChange={(e) => handleItemChange(index, "descripcion", e.target.value)}
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
                                                                handleItemChange(index, "cantidad", value);
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
                                                            onChange={(e) => handleItemChange(index, "precio", Number(e.target.value))}
                                                            disabled={item.tipo === ItemTipoGestioo.ADICIONAL}
                                                            className={`w-32 border border-slate-200 rounded-lg px-3 py-2 text-right focus:outline-none focus:ring-2 focus:ring-cyan-400 ${item.tipo === ItemTipoGestioo.ADICIONAL
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
                                                                    onChange={(e) => handleItemChange(index, "tieneIVA", e.target.checked)}
                                                                />
                                                                IVA
                                                            </label>
                                                        ) : (
                                                            <span className="text-slate-400 text-xs">—</span>
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
                                                                handleItemChange(index, "porcentaje", value);
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
                                                            {formatear(totalItem)}
                                                        </span>
                                                    </td>

                                                    {/* ACCIONES */}
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => handleRemoveItem(index)}
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

                        <div className="flex justify-end text-sm text-slate-700">
                            <div className="text-right space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200 min-w-[230px]">

                                <div className="flex justify-between">
                                    <span>Subtotal bruto:</span>
                                    <span className="font-medium">{formatear(convertir(subtotalBrutoCLP))}</span>
                                </div>

                                <div className="flex justify-between text-rose-600">
                                    <span>Descuentos:</span>
                                    <span className="font-medium">
                                        -{formatear(convertir(descuentosCLP))}
                                    </span>
                                </div>

                                <div className="flex justify-between border-t border-slate-200 pt-1">
                                    <span>Subtotal neto:</span>
                                    <span className="font-medium">{formatear(convertir(subtotalCLP))}</span>
                                </div>

                                <div className="flex justify-between">
                                    <span>IVA (19%):</span>
                                    <span className="font-medium">{formatear(convertir(ivaCLP))}</span>
                                </div>

                                <div className="flex justify-between border-t border-slate-300 pt-2 font-bold text-slate-900">
                                    <span>Total final:</span>
                                    <span>{formatear(convertir(totalCLP))}</span>
                                </div>

                                {/* Si está en USD, mostrar nota del tipo de cambio */}
                                {moneda === "USD" && (
                                    <p className="text-xs text-slate-500 mt-2 text-right">
                                        Cambio usado: 1 USD = {tasa.toLocaleString("es-CL")} CLP
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* BOTONES DE ACCIÓN MEJORADOS */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-slate-200">
                        <div className="text-sm text-slate-500">
                            Última actualización: {new Date(cotizacion.updatedAt).toLocaleString('es-CL')}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-6 py-3 rounded-xl bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-colors font-medium"
                            >
                                Cancelar
                            </button>

                            <button
                                onClick={() => {
                                    onPrint(cotizacion);
                                }}
                                className="px-6 py-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2"
                            >
                                <PrinterOutlined />
                                Generar PDF
                            </button>

                            <button
                                onClick={onUpdate}
                                disabled={cotizacion.items.length === 0 || apiLoading}
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 transition-all duration-200 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <CheckCircleOutlined />
                                {apiLoading ? "Guardando..." : "Guardar Cambios"}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default EditCotizacionModal;