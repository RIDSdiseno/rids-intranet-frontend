import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    DeleteOutlined,
    CheckCircleOutlined,
    PrinterOutlined,
    UserOutlined,
    SettingOutlined,
    PlusOutlined,
    FileTextOutlined,
    DollarOutlined,
    TagOutlined,
    InfoCircleOutlined,
    EditOutlined,
} from "@ant-design/icons";
import {
    type CotizacionGestioo,
    EstadoCotizacionGestioo,
    TipoCotizacionGestioo,
    ItemTipoGestioo,
    MonedaCotizacion,
    type CotizacionItemGestioo,
} from "./types";

import { formatearPrecio, normalizarCLP, calcularTotales, calcularValoresItem } from "./utils";

interface EditCotizacionModalProps {
    show: boolean;
    cotizacion: CotizacionGestioo | null;
    onClose: () => void;
    onUpdate: () => void;
    onGenerarPDF: () => void;
    onCargarProductos: () => void;
    onCargarServicios: () => void;
    onUpdateCotizacion: (cotizacion: CotizacionGestioo) => void;
    apiLoading: boolean;
    onCrearProducto: () => void;
    onUpdateRealTime?: (itemActualizado: any) => void;
    onEditarProducto: (item: CotizacionItemGestioo) => void;
    onItemChange: (index: number, field: string, value: any) => void;
}

const EditCotizacionModal: React.FC<EditCotizacionModalProps> = ({
    show,
    cotizacion,
    onClose,
    onUpdate,
    onGenerarPDF,
    onCargarProductos,
    onCargarServicios,
    onUpdateCotizacion,
    apiLoading,
    onCrearProducto,
    onUpdateRealTime,
    onEditarProducto
}) => {

    // ==========================
    // ESTADO LOCAL DE ÍTEMS
    // ==========================
    const [itemsLocal, setItemsLocal] = useState<CotizacionItemGestioo[]>([]);

    useEffect(() => {
        if (show && cotizacion) {
            setItemsLocal(cotizacion.items || []);
        }
    }, [show, cotizacion]);

    if (!show || !cotizacion) return null;

    const handleActualizarItem = (itemEditado: any) => {
        const newItems = itemsLocal.map(i =>
            i.id === itemEditado.id
                ? {
                    ...i,
                    nombre: itemEditado.nombre ?? i.nombre,
                    descripcion:
                        itemEditado.descripcion?.trim() === "" ? null : itemEditado.descripcion ?? i.descripcion,
                    precioCosto: itemEditado.precioCosto ?? i.precioCosto,
                    porcGanancia: itemEditado.porcGanancia ?? i.porcGanancia,
                    precioOriginalCLP: itemEditado.precioOriginalCLP ?? i.precioOriginalCLP,
                    precio: itemEditado.precio ?? i.precio,
                    imagen: itemEditado.imagen ?? i.imagen,
                    sku: itemEditado.codigo ?? i.sku,
                }
                : i
        );

        setItemsLocal(newItems);
        onUpdateCotizacion({ ...cotizacion, items: newItems });
    };

    // Helper para aplicar cambios y sincronizar con el padre
    const syncItems = (newItems: CotizacionItemGestioo[]) => {
        setItemsLocal(newItems);
        onUpdateCotizacion({
            ...cotizacion,
            items: newItems,
        });
    };


    // ==========================
    // MANEJO DE MONEDA
    // ==========================
    const moneda: MonedaCotizacion = cotizacion.moneda || "CLP";
    const tasa = cotizacion.tasaCambio || 1;

    const handleCambioMoneda = (nuevaMoneda: "CLP" | "USD") => {
        const tasaCambio = cotizacion.tasaCambio || 1;

        const itemsActualizados = itemsLocal.map((item) => {
            const realCLP = Number(item.precioOriginalCLP || 0);
            return {
                ...item,
                precio: nuevaMoneda === "USD" ? realCLP / tasaCambio : realCLP,
            };
        });

        setItemsLocal(itemsActualizados);
        onUpdateCotizacion({
            ...cotizacion,
            moneda: nuevaMoneda,
            items: itemsActualizados,
        });
    };

    const handleItemChange = (
        index: number,
        campo: keyof CotizacionItemGestioo,
        valor: any
    ) => {
        const items = [...itemsLocal];
        const item = { ...items[index] };

        if (campo === "precio") {
            const precioNum = Number(valor) || 0;
            let precioCLP = precioNum;

            if (cotizacion.moneda === "USD") {
                precioCLP = precioNum * (cotizacion.tasaCambio || 1);
            }

            item.precioOriginalCLP = precioCLP; // CLP real
            item.precio = precioNum;            // valor mostrado (CLP o USD)
        } else {
            (item as any)[campo] = valor;
        }

        items[index] = item;
        syncItems(items);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = itemsLocal.filter((_, i) => i !== index);
        syncItems(newItems);
    };

    const handleAddItem = (tipo: ItemTipoGestioo) => {
        const tempId = `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`;

        const newItem: any = {
            id: tempId,
            cotizacionId: cotizacion.id,
            tipo,
            descripcion: tipo === ItemTipoGestioo.ADICIONAL ? "Descuento adicional": null,
            cantidad: 1,
            precio: 0,
            precioOriginalCLP: 0, // 👈 IMPORTANTE: agregar este campo
            porcentaje: tipo === ItemTipoGestioo.ADICIONAL ? 10 : 0,
            tieneDescuento: tipo === ItemTipoGestioo.ADICIONAL,
            createdAt: new Date().toISOString(),
        };

        if (tipo === ItemTipoGestioo.PRODUCTO) {
            newItem.tieneIVA = true;
        }

        const newItems = [...itemsLocal, newItem];
        syncItems(newItems);
    };

    // ==========================
    // FECHA
    // ==========================
    const fechaInputValue = (() => {
        try {
            const d = new Date(cotizacion.fecha);
            const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
            return local.toISOString().slice(0, 16);
        } catch {
            return "";
        }
    })();

    // CALCULAR TOTALES EN TIEMPO REAL
    const { subtotalBruto, descuentos, subtotal, iva, total } =
        calcularTotales(itemsLocal);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl relative max-h-[90vh] overflow-hidden flex flex-col"
            >
                {/* HEADER */}
                <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-50 to-white px-8 py-6 border-b border-slate-200">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg">
                                <FileTextOutlined className="text-xl" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-800">
                                    Editar Cotización{" "}
                                    <span className="text-blue-600">#{cotizacion.id}</span>
                                </h1>
                                <div className="flex items-center gap-3 mt-2">
                                    <div
                                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${cotizacion.estado === EstadoCotizacionGestioo.BORRADOR
                                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                                            : cotizacion.estado ===
                                                EstadoCotizacionGestioo.APROBADA
                                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                                : "bg-blue-100 text-blue-800 border border-blue-200"
                                            }`}
                                    >
                                        <div
                                            className={`w-2 h-2 rounded-full ${cotizacion.estado ===
                                                EstadoCotizacionGestioo.BORRADOR
                                                ? "bg-amber-500"
                                                : cotizacion.estado ===
                                                    EstadoCotizacionGestioo.APROBADA
                                                    ? "bg-emerald-500"
                                                    : "bg-blue-500"
                                                }`}
                                        />
                                        {cotizacion.estado}
                                    </div>
                                    <div className="text-slate-500 text-sm">
                                        <DollarOutlined className="mr-1" />
                                        {moneda === "USD"
                                            ? "Dólares (USD)"
                                            : "Pesos Chilenos (CLP)"}
                                    </div>
                                    <div className="text-slate-500 text-sm">
                                        <TagOutlined className="mr-1" />
                                        {cotizacion.tipo}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 hover:bg-slate-100 rounded-xl transition-all duration-200 text-slate-500 hover:text-slate-700"
                        >
                            <div className="text-xl font-light">×</div>
                        </button>
                    </div>
                </div>

                {/* CONTENIDO PRINCIPAL */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-8">
                        {/* GRID PRINCIPAL */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
                            {/* DATOS DEL CLIENTE */}
                            <div className="xl:col-span-2">
                                <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 p-6 shadow-sm">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 rounded-lg bg-cyan-100 text-cyan-700">
                                                <UserOutlined className="text-lg" />
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-800">
                                                Datos del Cliente
                                            </h3>
                                        </div>
                                        <div className="text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                                            Cliente ID: {cotizacion.entidad?.id || "N/A"}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                Entidad / Razón Social{" "}
                                                <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={cotizacion.entidad?.nombre || ""}
                                                onChange={(e) =>
                                                    onUpdateCotizacion({
                                                        ...cotizacion,
                                                        entidad: {
                                                            ...cotizacion.entidad!,
                                                            nombre: e.target.value,
                                                        },
                                                    })
                                                }
                                                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all"
                                                placeholder="Ingrese nombre de la entidad"
                                                required
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
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
                                                            rut: e.target.value,
                                                        },
                                                    })
                                                }
                                                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all"
                                                placeholder="00.000.000-0"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                Origen <span className="text-rose-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <select
                                                    value={cotizacion.entidad?.origen || ""}
                                                    onChange={(e) =>
                                                        onUpdateCotizacion({
                                                            ...cotizacion,
                                                            entidad: {
                                                                ...cotizacion.entidad!,
                                                                origen: e.target.value,
                                                            },
                                                        })
                                                    }
                                                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all appearance-none bg-white"
                                                    required
                                                >
                                                    <option value="">Seleccionar origen</option>
                                                    <option value="RIDS">RIDS</option>
                                                    <option value="ECONNET">ECONNET</option>
                                                    <option value="OTRO">OTRO</option>
                                                </select>
                                                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400">
                                                    ▼
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                Correo Electrónico
                                            </label>
                                            <input
                                                type="email"
                                                value={cotizacion.entidad?.correo || ""}
                                                onChange={(e) =>
                                                    onUpdateCotizacion({
                                                        ...cotizacion,
                                                        entidad: {
                                                            ...cotizacion.entidad!,
                                                            correo: e.target.value,
                                                        },
                                                    })
                                                }
                                                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all"
                                                placeholder="cliente@empresa.com"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
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
                                                            telefono: e.target.value,
                                                        },
                                                    })
                                                }
                                                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all"
                                                placeholder="+56 9 1234 5678"
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
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
                                                            direccion: e.target.value,
                                                        },
                                                    })
                                                }
                                                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all"
                                                placeholder="Av. Principal 123, Ciudad"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* CONFIGURACIÓN */}
                            <div>
                                <div className="bg-gradient-to-br from-white to-blue-50 rounded-2xl border border-blue-100 p-6 shadow-sm h-full">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2.5 rounded-lg bg-blue-100 text-blue-700">
                                            <SettingOutlined className="text-lg" />
                                        </div>


                                        <h3 className="text-xl font-bold text-slate-800">
                                            Configuración
                                        </h3>
                                    </div>

                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                Estado <span className="text-rose-500">*</span>
                                            </label>
                                            <select
                                                value={cotizacion.estado}
                                                onChange={(e) =>
                                                    onUpdateCotizacion({
                                                        ...cotizacion,
                                                        estado:
                                                            e.target.value as EstadoCotizacionGestioo,
                                                    })
                                                }
                                                className="w-full border-2 border-blue-200 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all appearance-none bg-white"
                                                required
                                            >
                                                <option value={EstadoCotizacionGestioo.BORRADOR}>
                                                    Borrador
                                                </option>
                                                <option value={EstadoCotizacionGestioo.GENERADA}>
                                                    Generada
                                                </option>
                                                <option value={EstadoCotizacionGestioo.ENVIADA}>
                                                    Enviada
                                                </option>
                                                <option value={EstadoCotizacionGestioo.APROBADA}>
                                                    Aprobada
                                                </option>
                                                <option value={EstadoCotizacionGestioo.RECHAZADA}>
                                                    Rechazada
                                                </option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                Tipo de Cotización{" "}
                                                <span className="text-rose-500">*</span>
                                            </label>
                                            <select
                                                value={cotizacion.tipo}
                                                onChange={(e) =>
                                                    onUpdateCotizacion({
                                                        ...cotizacion,
                                                        tipo: e.target.value as TipoCotizacionGestioo,
                                                    })
                                                }
                                                className="w-full border-2 border-blue-200 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all appearance-none bg-white"
                                                required
                                            >
                                                <option value={TipoCotizacionGestioo.CLIENTE}>
                                                    Cliente
                                                </option>
                                                <option value={TipoCotizacionGestioo.INTERNA}>
                                                    Interna
                                                </option>
                                                <option value={TipoCotizacionGestioo.PROVEEDOR}>
                                                    Proveedor
                                                </option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                Fecha de Cotización{" "}
                                                <span className="text-rose-500">*</span>
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="datetime-local"
                                                    value={fechaInputValue}
                                                    onChange={(e) =>
                                                        onUpdateCotizacion({
                                                            ...cotizacion,
                                                            fecha: e.target.value,
                                                        })
                                                    }
                                                    className="w-full border-2 border-blue-200 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all bg-white"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                    Moneda
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        value={cotizacion.moneda}
                                                        onChange={(e) =>
                                                            handleCambioMoneda(
                                                                e.target.value as MonedaCotizacion
                                                            )
                                                        }
                                                        className="w-full border-2 border-blue-200 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all appearance-none bg-white"
                                                    >
                                                        <option value="CLP">
                                                            🇨🇱 CLP - Pesos Chilenos
                                                        </option>
                                                        <option value="USD">
                                                            🇺🇸 USD - Dólares Americanos
                                                        </option>
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400">
                                                        ▼
                                                    </div>
                                                </div>
                                            </div>

                                            {cotizacion.moneda === "USD" && (
                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                        Tasa de Cambio
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="1"
                                                            value={cotizacion.tasaCambio || 1}
                                                            onChange={(e) =>
                                                                onUpdateCotizacion({
                                                                    ...cotizacion,
                                                                    tasaCambio: Number(
                                                                        e.target.value
                                                                    ),
                                                                })
                                                            }
                                                            className="w-full border-2 border-blue-200 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all bg-white pr-12"
                                                            placeholder="0.00"
                                                        />
                                                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 text-sm">
                                                            CLP
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {cotizacion.moneda === "USD" && (
                                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                                                <div className="flex items-center gap-2 text-blue-700 mb-2">
                                                    <InfoCircleOutlined />
                                                    <span className="font-medium">
                                                        Información de cambio
                                                    </span>
                                                </div>
                                                <p className="text-sm text-blue-600">
                                                    Tasa actual:{" "}
                                                    <strong>
                                                        1 USD ={" "}
                                                        {tasa.toLocaleString("es-CL")} CLP
                                                    </strong>
                                                </p>
                                                <p className="text-xs text-blue-500 mt-1">
                                                    {moneda === "USD"
                                                        ? "Mostrando valores en dólares (USD)"
                                                        : "Mostrando valores en pesos chilenos (CLP)"}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN DE ÍTEMS */}
                        <div className="mb-8">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                <div>
                                    <h3 className="text-2xl font-bold text-slate-800">
                                        Ítems de la Cotización
                                    </h3>
                                    <p className="text-slate-600 mt-2">
                                        Agregue productos, servicios o descuentos
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <button
                                        type="button"
                                        onClick={onCargarProductos}
                                        className="inline-flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 text-white rounded-xl hover:from-cyan-700 hover:to-cyan-800 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                                    >
                                        <PlusOutlined />
                                        <span>Productos</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onCrearProducto}
                                        className="inline-flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                                    >
                                        <PlusOutlined />
                                        <span>Crear Producto</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onCargarServicios}
                                        className="inline-flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                                    >
                                        <PlusOutlined />
                                        <span>Servicios</span>
                                    </button>
                                </div>
                            </div>

                            {/* TABLA DE ITEMS */}
                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-lg">
                                <div className="bg-gradient-to-r from-slate-50 to-white px-6 py-4 border-b border-slate-200">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <h4 className="text-lg font-bold text-slate-800">
                                                Sección General
                                            </h4>
                                            <span className="bg-cyan-100 text-cyan-800 text-sm font-medium px-3 py-1 rounded-full">
                                                {itemsLocal.length} ítems
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm text-slate-600">
                                                Total estimado
                                            </div>
                                            <div className="text-2xl font-bold text-slate-900">
                                                {formatearPrecio(total, moneda, tasa)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-slate-100 border-b border-slate-200">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 w-32">
                                                    Tipo
                                                </th>
                                                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 min-w-[200px]">
                                                    Nombre
                                                </th>
                                                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700 w-24">
                                                    Cant.
                                                </th>
                                                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700 w-40">
                                                    P. Unitario (
                                                    {moneda === "USD" ? "US$" : "$"})
                                                </th>
                                                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700 w-28">
                                                    % Ganancia
                                                </th>
                                                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700 w-28">
                                                    IVA
                                                </th>
                                                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700 w-28">
                                                    % Desc
                                                </th>
                                                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700 w-32">
                                                    Neto sin IVA
                                                </th>
                                                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700 w-32">
                                                    Total con IVA
                                                </th>
                                                <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700 w-20">
                                                    Acción
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {itemsLocal.length === 0 ? (
                                                <tr>
                                                    <td colSpan={10} className="px-6 py-12 text-center">
                                                        <div className="flex flex-col items-center justify-center">
                                                            <div className="p-4 rounded-full bg-slate-100 mb-4">
                                                                <FileTextOutlined className="text-3xl text-slate-400" />
                                                            </div>
                                                            <h4 className="text-lg font-medium text-slate-700 mb-2">
                                                                No hay ítems en esta cotización
                                                            </h4>
                                                            <p className="text-slate-500 mb-6">
                                                                Agregue productos, servicios o descuentos para comenzar
                                                            </p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                itemsLocal.map((item, index) => {
                                                    const valores = calcularValoresItem(item);

                                                    const precioCosto = Number(item.precioCosto || 0);
                                                    const cantidad = Number(item.cantidad || 1);

                                                    const costoTotalCLP = precioCosto * cantidad;

                                                    //  PRECIO BASE REAL (NO AFECTADO POR DESCUENTO)
                                                    const precioBaseCLP = Number(item.precioOriginalCLP || 0);
                                                    const costoCLP = Number(item.precioCosto || 0);

                                                    //  GANANCIA REAL (NO CAMBIA CON DESCUENTO)
                                                    const gananciaItemCLP =
                                                        item.tipo === ItemTipoGestioo.PRODUCTO && costoCLP > 0
                                                            ? (precioBaseCLP - costoCLP) * cantidad
                                                            : 0;

                                                    //  % GANANCIA REAL
                                                    const margenGanancia =
                                                        item.tipo === ItemTipoGestioo.PRODUCTO && costoCLP > 0
                                                            ? ((precioBaseCLP - costoCLP) / costoCLP) * 100
                                                            : 0;

                                                    return (
                                                        <tr
                                                            key={`${item.id}-${index}`}
                                                            className={`border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors ${item.tipo ===
                                                                ItemTipoGestioo.ADICIONAL
                                                                ? "bg-rose-50/30 hover:bg-rose-50/50"
                                                                : ""
                                                                }`}
                                                        >
                                                            {/* TIPO */}
                                                            <td className="px-6 py-4">
                                                                <span
                                                                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${item.tipo ===
                                                                        ItemTipoGestioo.PRODUCTO
                                                                        ? "bg-cyan-100 text-cyan-800"
                                                                        : item.tipo ===
                                                                            ItemTipoGestioo.SERVICIO
                                                                            ? "bg-emerald-100 text-emerald-800"
                                                                            : "bg-amber-100 text-amber-800"
                                                                        }`}
                                                                >
                                                                    {item.tipo ===
                                                                        ItemTipoGestioo.PRODUCTO
                                                                        ? "Producto"
                                                                        : item.tipo ===
                                                                            ItemTipoGestioo.SERVICIO
                                                                            ? "Servicio"
                                                                            : "Descuento"}
                                                                </span>
                                                            </td>

                                                            {/* DESCRIPCIÓN */}
                                                            <td className="px-6 py-4 min-w-[200px]">
                                                                <input
                                                                    value={item.nombre || ""}
                                                                    readOnly={item.tipo === ItemTipoGestioo.PRODUCTO}
                                                                    onChange={(e) =>
                                                                        handleItemChange(
                                                                            index,
                                                                            "nombre",
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all"
                                                                    placeholder="Descripción del ítem"
                                                                />
                                                                {item.tipo ===
                                                                    ItemTipoGestioo.PRODUCTO &&
                                                                    precioCosto > 0 && (
                                                                        <div className="text-xs text-slate-500 mt-1 truncate">
                                                                            Costo:{" "}
                                                                            {formatearPrecio(
                                                                                precioCosto,
                                                                                moneda,
                                                                                tasa
                                                                            )}
                                                                        </div>
                                                                    )}
                                                            </td>

                                                            {/* CANTIDAD */}
                                                            <td className="px-6 py-4 text-center">
                                                                <input
                                                                    type="number"
                                                                    min={1}
                                                                    value={item.cantidad || 1}
                                                                    disabled={
                                                                        item.tipo ===
                                                                        ItemTipoGestioo.ADICIONAL
                                                                    }
                                                                    onChange={(e) =>
                                                                        handleItemChange(
                                                                            index,
                                                                            "cantidad",
                                                                            Math.max(
                                                                                1,
                                                                                Number(e.target.value)
                                                                            )
                                                                        )
                                                                    }
                                                                    className={`w-20 border border-slate-200 rounded-lg px-3 py-2 text-center focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all ${item.tipo ===
                                                                        ItemTipoGestioo.ADICIONAL
                                                                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                                        : "bg-white"
                                                                        }`}
                                                                />
                                                            </td>

                                                            {/* PRECIO UNITARIO */}
                                                            <td className="px-6 py-4">
                                                                <div className="flex flex-col items-center space-y-1">

                                                                    <input
                                                                        type="number"
                                                                        min={0}
                                                                        step={0.01}
                                                                        readOnly={item.tipo === ItemTipoGestioo.PRODUCTO}
                                                                        value={item.precio === null || item.precio === undefined ? "" : item.precio}
                                                                        disabled={item.tipo === ItemTipoGestioo.SERVICIO}
                                                                        onChange={(e) => {
                                                                            const raw = e.target.value;

                                                                            if (raw === "") {
                                                                                handleItemChange(index, "precio", 0);
                                                                                return;
                                                                            }

                                                                            const num = Number(raw);
                                                                            if (!isNaN(num)) {
                                                                                handleItemChange(index, "precio", num);
                                                                            }
                                                                        }}
                                                                        className={`
                w-28 md:w-32      /* ← MÁS ANCHO */
                px-4 py-2.5       /* ← MÁS GRANDE Y LEGIBLE */
                border border-slate-200 rounded-lg
                text-right         /* ← Precios alineados a la derecha */
                text-sm
                transition-all
                ${item.tipo === ItemTipoGestioo.SERVICIO
                                                                                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                                                                : "bg-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                                                                            }
            `}
                                                                        placeholder={moneda === "USD" ? "US$" : "$"}
                                                                    />

                                                                    {/* Precio en CLP formateado debajo */}
                                                                    <div className="text-xs text-slate-500">
                                                                        {formatearPrecio(
                                                                            valores.base / (item.cantidad || 1),
                                                                            moneda,
                                                                            tasa
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            {/* % GANANCIA */}
                                                            <td className="px-6 py-4 text-center">
                                                                {item.tipo === ItemTipoGestioo.PRODUCTO ? (
                                                                    <div className="flex flex-col items-center">
                                                                        <div
                                                                            className={`text-sm font-semibold ${margenGanancia > 0 ? "text-emerald-600" : "text-slate-500"
                                                                                }`}
                                                                        >
                                                                            {margenGanancia.toFixed(1)}%
                                                                        </div>

                                                                        {gananciaItemCLP > 0 && (
                                                                            <div className="text-xs text-emerald-500 mt-1">
                                                                                + {formatearPrecio(gananciaItemCLP, moneda, tasa)}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-300">—</span>
                                                                )}
                                                            </td>

                                                            {/* IVA */}
                                                            <td className="px-6 py-4 text-center">
                                                                {item.tipo !== ItemTipoGestioo.ADICIONAL ? (
                                                                    <div className="flex flex-col items-center gap-1">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={item.tieneIVA || false}
                                                                            onChange={(e) =>
                                                                                handleItemChange(index, "tieneIVA", e.target.checked)
                                                                            }
                                                                            className="w-4 h-4 text-cyan-600 border-slate-300 rounded"
                                                                        />

                                                                        {item.tieneIVA && valores.iva > 0 && (
                                                                            <span className="text-[11px] text-slate-500 whitespace-nowrap">
                                                                                {formatearPrecio(valores.iva, moneda, tasa)}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-300">—</span>
                                                                )}
                                                            </td>

                                                            {/* DESCUENTO */}
                                                            <td className="px-6 py-4 text-center">
                                                                <div className="flex items-center justify-center gap-2">

                                                                    {/* Checkbox */}
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={item.tieneDescuento || false}
                                                                        onChange={(e) => {
                                                                            const checked = e.target.checked;

                                                                            handleItemChange(index, "tieneDescuento", checked);

                                                                            // Si se apaga el descuento → limpiar porcentaje
                                                                            if (!checked) {
                                                                                handleItemChange(index, "porcentaje", 0);
                                                                            }
                                                                        }}
                                                                        className="w-4 h-4"
                                                                    />

                                                                    {/* Input SIEMPRE visible, pero desactivado si el checkbox no está activo */}
                                                                    <input
                                                                        type="number"
                                                                        min={0}
                                                                        max={100}
                                                                        step={0.1}
                                                                        value={item.porcentaje || 0}
                                                                        disabled={!item.tieneDescuento}
                                                                        onChange={(e) => {
                                                                            let val = Number(e.target.value);
                                                                            if (isNaN(val)) val = 0;
                                                                            val = Math.min(100, Math.max(0, val));

                                                                            handleItemChange(index, "porcentaje", val);
                                                                        }}
                                                                        className={`w-16 border rounded px-2 py-1 text-sm text-center ${item.tieneDescuento ? "border-slate-300 bg-white" : "bg-slate-100 text-slate-400"}`}
                                                                    />
                                                                    <span className="text-xs">%</span>
                                                                </div>
                                                            </td>

                                                            {/* NETO */}
                                                            <td className="px-6 py-4 text-right">
                                                                {item.tipo === ItemTipoGestioo.ADICIONAL
                                                                    ? "—"
                                                                    : formatearPrecio(valores.neto, moneda, tasa)}
                                                            </td>

                                                            {/* SUBTOTAL / TOTAL ITEM */}
                                                            <td className="px-6 py-4 text-right font-bold">
                                                                {item.tipo === ItemTipoGestioo.ADICIONAL
                                                                    ? "—"
                                                                    : formatearPrecio(valores.total, moneda, tasa)}
                                                            </td>

                                                            {/* ACCIÓN */}
                                                            <td className="px-6 py-4 text-center">
                                                                <div className="flex items-center justify-center gap-2">
                                                                    {item.tipo === ItemTipoGestioo.PRODUCTO && (
                                                                        <button
                                                                            onClick={() => onEditarProducto(item)}
                                                                            className="p-2 text-slate-500 hover:text-slate-700"
                                                                        >
                                                                            <EditOutlined />
                                                                        </button>

                                                                    )}
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            handleRemoveItem(index)
                                                                        }
                                                                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors duration-200"
                                                                        title="Eliminar ítem"
                                                                    >
                                                                        <DeleteOutlined className="text-lg" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {itemsLocal.length > 0 && (
                                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
                                        <div className="flex justify-between items-center">
                                            <div className="text-sm text-slate-600">
                                                Mostrando {itemsLocal.length} ítem
                                                {itemsLocal.length !== 1 ? "s" : ""}
                                            </div>
                                            <div className="text-sm font-medium text-slate-700">
                                                Moneda:{" "}
                                                {moneda === "USD"
                                                    ? "Dólares (USD)"
                                                    : "Pesos Chilenos (CLP)"}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* DETALLE DE PRODUCTOS (FUERA DE LA TABLA) */}
                                {itemsLocal.some(
                                    (i) => i.tipo !== ItemTipoGestioo.ADICIONAL && i.descripcion
                                ) && (
                                        <div className="mt-6 bg-slate-50 rounded-xl border border-slate-200 p-5">
                                            <h4 className="text-sm font-semibold text-slate-700 mb-3">
                                                Detalle de productos de esta cotización
                                            </h4>

                                            <ul className="space-y-2 text-sm text-slate-600">
                                                {itemsLocal
                                                    .filter(
                                                        (item) =>
                                                            item.tipo !== ItemTipoGestioo.ADICIONAL &&
                                                            item.descripcion
                                                    )
                                                    .map((item, idx) => (
                                                        <li key={`${item.id}-desc-${idx}`}>
                                                            <span className="font-medium text-slate-800">
                                                                {item.nombre}
                                                            </span>
                                                            {": "}
                                                            <span>{item.descripcion}</span>
                                                        </li>
                                                    ))}
                                            </ul>
                                        </div>
                                    )}
                            </div>
                        </div>

                        {/* RESUMEN + COMENTARIOS */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                            <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold text-slate-800">
                                        Resumen Financiero
                                    </h3>
                                    <div className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                                        {moneda === "USD"
                                            ? "USD - Dólares"
                                            : "CLP - Pesos Chilenos"}
                                    </div>
                                </div>

                                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                    <div className="text-slate-700">Total productos antes de descuentos:</div>
                                    <div className="font-medium text-slate-900">
                                        {formatearPrecio(subtotalBruto, moneda, tasa)}
                                    </div>
                                </div>

                                {descuentos > 0 && (
                                    <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                        <div className="text-rose-600 font-medium">Descuentos Aplicados:</div>
                                        <div className="font-bold text-rose-600">
                                            - {formatearPrecio(descuentos, moneda, tasa)}
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                    <div className="text-slate-700">Subtotal neto sin IVA:</div>
                                    <div className="font-semibold text-slate-900">
                                        {formatearPrecio(subtotal, moneda, tasa)}
                                    </div>
                                </div>

                                {iva > 0 && (
                                    <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                        <div className="text-slate-700">IVA (19%)</div>
                                        <div className="font-semibold text-slate-900">
                                            {formatearPrecio(iva, moneda, tasa)}
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-between items-center pt-4 border-t border-slate-300">
                                    <div className="text-lg font-bold text-slate-900">
                                        TOTAL FINAL
                                    </div>
                                    <div className="text-2xl font-bold text-blue-700">
                                        {formatearPrecio(total, moneda, tasa)}
                                    </div>
                                </div>

                            </div>

                            {/* COMENTARIOS */}
                            <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 p-6 shadow-sm">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2.5 rounded-lg bg-slate-100 text-slate-700">
                                        <FileTextOutlined className="text-lg" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-800">
                                        Comentarios y Notas
                                    </h3>
                                </div>

                                <textarea
                                    className="w-full h-48 border-2 border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all resize-none bg-white"
                                    placeholder="Agregue comentarios, notas o instrucciones especiales para esta cotización..."
                                    value={cotizacion.comentariosCotizacion ?? ""}
                                    onChange={(e) =>
                                        onUpdateCotizacion({
                                            ...cotizacion,
                                            comentariosCotizacion: e.target.value,
                                        })
                                    }
                                />

                                <div className="mt-4 text-sm text-slate-500">
                                    <InfoCircleOutlined className="mr-2" />
                                    Estos comentarios serán visibles en el documento PDF
                                    generado
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="sticky bottom-0 bg-white border-t border-slate-200 px-8 py-6 shadow-lg">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="text-sm text-slate-500">
                            <div>
                                Última actualización:{" "}
                                {new Date(
                                    cotizacion.updatedAt
                                ).toLocaleString("es-CL")}
                            </div>
                            <div className="mt-1">
                                ID: {cotizacion.id} • Creada:{" "}
                                {new Date(
                                    cotizacion.createdAt
                                ).toLocaleDateString("es-CL")}
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-8 py-3.5 rounded-xl bg-white text-slate-700 border-2 border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 font-semibold shadow-sm"
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                onClick={onGenerarPDF}
                                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                            >
                                <PrinterOutlined className="text-lg" />
                                <span>Generar PDF</span>
                            </button>

                            <button
                                type="button"
                                onClick={onUpdate}
                                disabled={itemsLocal.length === 0 || apiLoading}
                                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                            >
                                {apiLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Guardando...</span>
                                    </>
                                ) : (
                                    <>
                                        <CheckCircleOutlined className="text-lg" />
                                        <span>Guardar Cambios</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default EditCotizacionModal;
