// src/components/modals-cotizaciones/CreateCotizacion.tsx
import React, { useState } from "react";
import { Select } from "antd";
import { motion } from "framer-motion";
import {
    PlusOutlined,
    InfoCircleOutlined,
    BuildOutlined,
    FileTextOutlined,
    DeleteOutlined,
    EditOutlined,
    SearchOutlined
} from "@ant-design/icons";
import type {
    FormData,
    EntidadGestioo,
    MonedaCotizacion,
    SeccionCotizacion,
    CotizacionItemGestioo
} from "./types";
import {
    ItemTipoGestioo,
    TipoCotizacionGestioo,
    EstadoCotizacionGestioo
} from "./types";
import { formatearPrecio, calcularTotales, calcularValoresItem, estadoConfig, normalizarCLP, redondearDecimal, formatearMontoFinal } from "./utils";

import { message } from "antd";
import EditServicioModal from "./EditServicio";

// Props del modal de creación de cotización
interface CreateCotizacionModalProps {
    show: boolean;
    onClose: () => void;
    formData: FormData;
    setFormData: (data: FormData) => void;
    items: any[];
    setItems: React.Dispatch<React.SetStateAction<CotizacionItemGestioo[]>>;
    entidades: EntidadGestioo[];
    filtroOrigen: string;
    setFiltroOrigen: (origen: string) => void;
    onCargarProductos: (mostrarSelector?: boolean) => void;
    onCargarServicios: () => void;
    onAddItem: (tipo: ItemTipoGestioo, seccionId?: number) => void;
    onUpdateItem: (id: number, field: string, value: any) => void;
    onRemoveItem: (id: number) => void;
    onCrearCotizacion: (agregarAlFunnel?: boolean) => void;
    onCrearYEnviarCotizacion?: (agregarAlFunnel?: boolean) => void;
    puedeUsarFunnel?: boolean;
    onCrearEmpresa: () => void;
    onCrearProducto: () => void;
    onCrearPersona: () => void;
    onEditarPersona: (entidad: EntidadGestioo) => void;
    onEditarProducto: (item: CotizacionItemGestioo) => void;
    onEditarServicio: (item: CotizacionItemGestioo) => void;
    onCrearServicio: () => void;
    totales: any;
    apiLoading: boolean;
    onAbrirCrearEquipo?: (item: CotizacionItemGestioo) => void;
    onAbrirSeleccionEquipo?: (item: CotizacionItemGestioo) => void;
    onVincularEquipo?: (itemId: number, equipoId: number | null) => void;
    creatingAndSending?: boolean;
}

// Modal para crear una nueva cotización, con múltiples secciones y items, selección de entidad, y creación/edición rápida de productos y servicios
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
    onUpdateItem,
    onRemoveItem,
    onCrearCotizacion,
    onCrearEmpresa,
    onCrearProducto,
    onCrearPersona,
    onEditarPersona,
    onEditarProducto,
    onCrearServicio,
    onCrearYEnviarCotizacion,
    totales,
    apiLoading,
    onAbrirCrearEquipo,
    onAbrirSeleccionEquipo,
    onVincularEquipo,
    puedeUsarFunnel = false,
}) => {

    // Estados para modales de edición
    const [showEditServicio, setShowEditServicio] = useState(false);
    const [servicioAEditar, setServicioAEditar] = useState<CotizacionItemGestioo | null>(null);

    const [
        agregarAlFunnel,
        setAgregarAlFunnel
    ] = useState(false);

    if (!show) return null;

    const moneda = formData.moneda;
    const tasaCambio = formData.tasaCambio ?? 1;

    // =====================================================
    // TOTALES GENERALES
    // =====================================================

    const {
        subtotalBruto,
        descuentos,
        subtotal,
        iva,
        total,
    } = calcularTotales(items);


    // =====================================================
    // DESGLOSE FINANCIERO
    // =====================================================

    // Costo original total de productos
    const costoOriginalProductos = items.reduce(
        (acc, item) => {
            if (
                item.tipo !==
                ItemTipoGestioo.PRODUCTO
            ) {
                return acc;
            }

            const costoUnitario =
                Number(
                    item.precioCosto || 0
                );

            const cantidad =
                Number(
                    item.cantidad || 1
                );

            return (
                acc +
                costoUnitario *
                cantidad
            );
        },
        0
    );


    // Precio de venta bruto SOLO de productos
    const ventaBrutaProductos = items.reduce(
        (acc, item) => {
            if (
                item.tipo !==
                ItemTipoGestioo.PRODUCTO
            ) {
                return acc;
            }

            const precioVenta =
                Number(
                    item.precioOriginalCLP ??
                    item.precio ??
                    0
                );

            const cantidad =
                Number(
                    item.cantidad || 1
                );

            return (
                acc +
                precioVenta *
                cantidad
            );
        },
        0
    );


    // Ganancia comercial antes de descuentos
    const gananciaBrutaProductos =
        Math.max(
            0,
            ventaBrutaProductos -
            costoOriginalProductos
        );


    // Servicios antes de descuentos
    const ventaBrutaServicios =
        items.reduce(
            (acc, item) => {
                if (
                    item.tipo !==
                    ItemTipoGestioo.SERVICIO
                ) {
                    return acc;
                }

                const precio =
                    Number(
                        item.precioOriginalCLP ??
                        item.precio ??
                        0
                    );

                const cantidad =
                    Number(
                        item.cantidad || 1
                    );

                return (
                    acc +
                    precio *
                    cantidad
                );
            },
            0
        );


    // Margen promedio ponderado
    const margenPromedio =
        ventaBrutaProductos > 0
            ? (
                gananciaBrutaProductos /
                ventaBrutaProductos
            ) * 100
            : 0;

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

    // Motivo por el cual el botón de crear cotización está deshabilitado
    const motivoDeshabilitado = () => {
        if (!formData.entidadId) return "Debes seleccionar una entidad.";
        if (!formData.estadoCotizacion) return "Debes seleccionar el estado.";
        if (items.length === 0) return "Agrega al menos un producto o servicio.";
        if (apiLoading) return "La cotización se está procesando.";
        return "";
    };


    // Función para eliminar sección
    const eliminarSeccion = (seccionId: number) => {
        if (formData.secciones.length <= 1) {
            message.warning({
                content: "La cotización debe tener al menos una sección activa para continuar.",
                duration: 4,
            });
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

    type DescripcionProducto = {
        nombre: string;
        descripcion: string;
    };

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

    // Abrir modal de edición de servicio
    const handleEditarServicioLocal = (item: CotizacionItemGestioo) => {
        setServicioAEditar(item);
        setShowEditServicio(true);
    };

    // ===============================
    // CREAR SERVICIO LOCAL (solo cotización)
    // ===============================
    const handleCrearServicioLocal = (data: any) => {
        const newItem: CotizacionItemGestioo = {
            id: Date.now(),
            cotizacionId: 0 as any, // no existe aún
            tipo: ItemTipoGestioo.SERVICIO,

            nombre: data.nombre,
            descripcion: data.descripcion ?? "",

            cantidad: 1,
            precio: data.precio || 0,
            precioOriginalCLP: data.precio || 0,

            porcentaje: 0,
            tieneIVA: false,
            tieneDescuento: false,

            seccionId: formData.seccionActiva,
            productoId: null,
            createdAt: new Date().toISOString(),
        };

        setItems(prev => [...prev, newItem]);
        message.success("Servicio agregado a la cotización");
    };

    // ===============================
    // FILTRO DE ENTIDADES POR TIPO
    // ===============================
    const entidadesFiltradas = entidades.filter((entidad) => {
        if (entidad.tipo !== formData.tipoEntidad) {
            return false;
        }

        if (
            formData.tipoEntidad === "EMPRESA" &&
            filtroOrigen !== "TODOS"
        ) {
            return entidad.origen === filtroOrigen;
        }

        return true;
    });

    const totalEntidadesPorTipo = entidades.filter(
        (entidad) => entidad.tipo === formData.tipoEntidad
    ).length;

    // Renderizar item individual
    const renderItem = (item: any, index: number) => {
        // ÚNICA FUENTE DE VERDAD
        const valores = calcularValoresItem(item);

        const baseFinal = valores.neto;
        const descuento = valores.descuento;
        const iva = valores.iva;
        const total = valores.total;

        // PRECIO BASE REAL (NO AFECTADO POR DESCUENTO)
        const precioBaseCLP =
            item.precioOriginalCLP ?? item.precio;

        const costoCLP = item.precioCosto ?? 0;

        // GANANCIA REAL DEL PRODUCTO (SIN DESCUENTO)
        const gananciaItem =
            item.tipo === ItemTipoGestioo.PRODUCTO && costoCLP > 0
                ? (precioBaseCLP - costoCLP) * item.cantidad
                : 0;

        // % GANANCIA REAL (NO CAMBIA CON DESCUENTO)
        const margenGanancia =
            item.tipo ===
                ItemTipoGestioo.PRODUCTO
                ? normalizarCLP(
                    item.porcGanancia
                )
                : 0;

        const descuentoItem = valores.descuento;

        const textoDescuento =
            descuentoItem > 0
                ? formatearPrecio(descuentoItem, moneda, tasaCambio)
                : "";

        // Si es un ítem de ajuste adicional, mostrar el descuento como un valor negativo en el total, y resaltar en rojo
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
                {/* NOMBRE */}
                <td className="px-4 py-3 border-r border-cyan-100 align-top">
                    <input
                        value={item.nombre ?? ""}
                        readOnly={item.tipo === ItemTipoGestioo.PRODUCTO}
                        onChange={(e) => {
                            if (item.tipo !== ItemTipoGestioo.PRODUCTO) {
                                handleUpdateItem(item.id, "nombre", e.target.value);
                            }
                        }}
                        className={`w-full max-w-[520px] border rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-400 focus:outline-none ${item.tipo === ItemTipoGestioo.PRODUCTO
                            ? "bg-gray-100 text-gray-600 cursor-not-allowed border-gray-300"
                            : "border-cyan-200 bg-white"
                            }`}
                        placeholder="Nombre del ítem"
                    />
                </td>

                {/* CANTIDAD */}
                <td className="px-3 py-2 text-center border-r border-cyan-100">
                    <input
                        type="number"
                        min={1}
                        step={1}
                        value={item.cantidad}
                        disabled={item.tipo === ItemTipoGestioo.ADICIONAL}
                        onChange={(e) => {
                            const rawValue =
                                e.currentTarget
                                    .valueAsNumber;

                            const cantidad =
                                Number.isNaN(rawValue)
                                    ? 1
                                    : Math.max(
                                        1,
                                        Math.trunc(
                                            rawValue
                                        )
                                    );

                            handleUpdateItem(
                                item.id,
                                "cantidad",
                                cantidad
                            );
                        }}
                        className={`w-16 border border-cyan-200 rounded-lg px-2 py-1 text-center focus:ring-2 focus:ring-cyan-400 focus:outline-none ${item.tipo === ItemTipoGestioo.ADICIONAL
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-white"
                            }`}
                    />
                </td>

                {/* PRECIO UNITARIO */}
                <td className="px-3 py-2 text-center border-r border-cyan-100">
                    <div className="flex flex-col items-center gap-1">
                        <div className="text-sm font-medium text-slate-800">
                            {formatearPrecio(
                                item.precio,
                                formData.moneda,
                                formData.tasaCambio
                            )}
                        </div>

                        {item.tipo === ItemTipoGestioo.PRODUCTO && costoCLP > 0 && (
                            <div className="text-[11px] text-slate-500 whitespace-nowrap">
                                Costo:{" "}
                                {formatearPrecio(
                                    costoCLP,
                                    formData.moneda,
                                    formData.tasaCambio
                                )}
                            </div>
                        )}
                    </div>
                </td>

                {/* % GANANCIA */}
                <td className="px-3 py-2 text-center border-r border-cyan-100">
                    {item.tipo === ItemTipoGestioo.PRODUCTO ? (
                        <div className="flex flex-col items-center">
                            <span className="text-xs font-medium text-emerald-700">
                                {redondearDecimal(
                                    margenGanancia,
                                    2
                                ).toLocaleString("es-CL", {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 2,
                                })}%
                            </span>
                            {gananciaItem > 0 && (
                                <span className="text-xs text-emerald-600">
                                    +{formatearPrecio(
                                        gananciaItem,
                                        formData.moneda,
                                        formData.tasaCambio
                                    )}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-slate-400 text-xs">—</span>
                    )}
                </td>

                {/* IVA */}
                <td className="px-3 py-2 text-center border-r border-cyan-100">
                    {item.tipo !== ItemTipoGestioo.ADICIONAL ? (
                        <div className="flex flex-col items-center gap-1">
                            {/* Checkbox IVA */}
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={item.tieneIVA || false}
                                    onChange={(e) =>
                                        onUpdateItem(item.id, "tieneIVA", e.target.checked)
                                    }
                                    className="rounded focus:ring-cyan-400"
                                />
                                IVA
                            </label>

                            {/* Monto IVA */}
                            {item.tieneIVA && (
                                <span className="text-xs text-slate-600">
                                    {formatearPrecio(
                                        valores.iva,
                                        formData.moneda,
                                        formData.tasaCambio
                                    )}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-slate-400 text-xs">—</span>
                    )}
                </td>

                {/* DESCUENTO */}
                <td className="px-3 py-2 text-center border-r border-cyan-100">
                    {item.tipo !== ItemTipoGestioo.ADICIONAL ? (
                        <div className="flex flex-col items-center gap-1">

                            {/* Checkbox */}
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={item.tieneDescuento || false}
                                    onChange={(e) => {
                                        onUpdateItem(item.id, "tieneDescuento", e.target.checked);

                                        // Si se desactiva → porcentaje = 0
                                        if (!e.target.checked) {
                                            onUpdateItem(item.id, "porcentaje", 0);
                                        }
                                    }}
                                    className="rounded focus:ring-cyan-400"
                                />
                                <span>Desc.</span>
                            </label>

                            {/* Input porcentaje */}
                            <input
                                type="number"
                                min={0}
                                max={100}
                                step={0.01}
                                inputMode="decimal"
                                value={
                                    item.tieneDescuento
                                        ? item.porcentaje ?? ""
                                        : ""
                                }
                                disabled={
                                    !item.tieneDescuento
                                }
                                onChange={(e) => {
                                    /*
                                     * valueAsNumber conserva valores decimales.
                                     */
                                    const rawValue =
                                        e.currentTarget
                                            .valueAsNumber;

                                    const value =
                                        Number.isNaN(rawValue)
                                            ? 0
                                            : Math.max(
                                                0,
                                                Math.min(
                                                    100,
                                                    rawValue
                                                )
                                            );

                                    onUpdateItem(
                                        item.id,
                                        "porcentaje",
                                        value
                                    );
                                }}
                                className={`w-20 rounded-lg px-2 py-1 text-center text-sm ${item.tieneDescuento
                                    ? "border border-cyan-200 bg-white focus:ring-2 focus:ring-cyan-400"
                                    : "border border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
                                    }`}
                                placeholder="%"
                            />

                            {/* MONTO DESCONTADO */}
                            {item.tieneDescuento && descuentoItem > 0 && (
                                <span className="text-xs text-red-600 font-semibold">
                                    -{formatearPrecio(descuentoItem, moneda, tasaCambio)}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-slate-400 text-xs">—</span>
                    )}
                </td>

                {/* NETO SIN IVA */}
                <td className="px-3 py-2 text-right border-r border-cyan-100 font-semibold text-slate-700">
                    {formatearPrecio(
                        baseFinal,
                        formData.moneda,
                        formData.tasaCambio
                    )}
                </td>

                {/* TOTAL CON IVA */}
                <td className="px-3 py-2 text-right border-r border-cyan-100 font-medium">
                    {item.tipo === ItemTipoGestioo.ADICIONAL ? (
                        <span className="text-rose-600">
                            -{formatearPrecio(
                                descuento,
                                formData.moneda,
                                formData.tasaCambio
                            )}
                        </span>
                    ) : (
                        <span>
                            {formatearPrecio(
                                total,
                                formData.moneda,
                                formData.tasaCambio
                            )}
                        </span>
                    )}
                </td>

                {/* ACCIONES */}
                <td className="px-3 py-2 text-right">
                    <button
                        onClick={() => {
                            if (item.tipo === ItemTipoGestioo.PRODUCTO) {
                                onEditarProducto(item);
                            }

                            if (item.tipo === ItemTipoGestioo.SERVICIO) {
                                handleEditarServicioLocal(item);
                            }
                        }}
                        className="text-blue-500 hover:text-blue-700 transition-colors p-1 rounded hover:bg-blue-50"
                    >
                        <EditOutlined className="text-lg" />
                    </button>

                    <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-rose-500 hover:text-rose-700 transition-colors p-1 rounded hover:bg-rose-50 ml-2"
                        title="Eliminar ítem"
                    >
                        <DeleteOutlined className="text-lg" />
                    </button>
                </td>

                {/* EQUIPO - Solo para productos */}
                <td className="px-3 py-2 text-center">
                    {item.tipo !== ItemTipoGestioo.ADICIONAL ? (
                        item.equipoId ? (
                            <div className="flex flex-col items-center gap-1">
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700 font-medium max-w-[120px] truncate">
                                    {item.equipo?.serial ?? `#${item.equipoId}`}
                                </span>
                                <button
                                    onClick={() => onVincularEquipo?.(item.id, null)}
                                    className="text-red-400 hover:text-red-600 text-xs underline"
                                >
                                    Desvincular
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-1">
                                <button
                                    onClick={() => onAbrirCrearEquipo?.(item)}
                                    className="inline-flex items-center gap-1 px-2 py-1 border border-dashed border-cyan-300 text-cyan-600 rounded-lg text-xs hover:bg-cyan-50 transition whitespace-nowrap"
                                >
                                    <PlusOutlined /> Crear
                                </button>
                                <button
                                    onClick={() => onAbrirSeleccionEquipo?.(item)}
                                    className="inline-flex items-center gap-1 px-2 py-1 border border-dashed border-emerald-300 text-emerald-600 rounded-lg text-xs hover:bg-emerald-50 transition whitespace-nowrap"
                                >
                                    <SearchOutlined /> Existente
                                </button>
                            </div>
                        )
                    ) : (
                        <span className="text-slate-300 text-xs">—</span>
                    )}
                </td>
            </tr>
        );
    };

    // Renderizar el modal completo
    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3">
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="
            bg-white
            rounded-2xl
            shadow-2xl
            w-[96vw]
            max-w-[1600px]
            h-[92vh]
            relative
            flex
            flex-col
            overflow-hidden
        "
            >
                <div className="flex-1 overflow-y-auto p-4 lg:p-6 xl:p-8">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            {/* Información del Cliente */}
                            <div className="p-4 border border-cyan-200 rounded-2xl bg-white relative shadow-sm">
                                <h3 className="font-semibold text-slate-700 mb-3">Información del Cliente</h3>

                                <div className="space-y-4">
                                    {/* Tipo de Entidad */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">
                                            Tipo de Entidad <span className="text-rose-500">*</span>
                                        </label>
                                        <select
                                            value={formData.tipoEntidad}
                                            onChange={(e) => {
                                                const tipo = e.target.value as "EMPRESA" | "PERSONA";

                                                setFormData({
                                                    ...formData,
                                                    tipoEntidad: tipo,
                                                    entidadId: "",
                                                    personaResponsable: "",
                                                });

                                                if (tipo === "PERSONA") {
                                                    setFiltroOrigen("TODOS");
                                                }
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
                                        <label className="block text-xs font-medium text-slate-600 mb-1">
                                            Entidad <span className="text-rose-500">*</span>
                                        </label>

                                        <Select
                                            showSearch
                                            placeholder={
                                                formData.tipoEntidad === "PERSONA"
                                                    ? "Seleccione una persona…"
                                                    : "Seleccione una empresa…"
                                            }
                                            value={formData.entidadId || undefined}
                                            disabled={entidadesFiltradas.length === 0}
                                            className="w-full"
                                            optionFilterProp="label"
                                            onChange={(value) =>
                                                setFormData({ ...formData, entidadId: value })
                                            }
                                            filterOption={(input, option) => {
                                                const normalizeText = (text: string) =>
                                                    text
                                                        .toLowerCase()
                                                        .normalize("NFD")
                                                        .replace(/[\u0300-\u036f]/g, "");

                                                const normalizeRut = (rut: string) =>
                                                    rut.replace(/\./g, "").replace(/-/g, "");

                                                const search = normalizeText(input);
                                                const label = normalizeText(String(option?.label ?? ""));
                                                const rut = normalizeRut(String(option?.rut ?? ""));

                                                return (
                                                    label.includes(search) ||
                                                    rut.includes(normalizeRut(input))
                                                );
                                            }}
                                            options={entidadesFiltradas.map((ent) => ({
                                                value: String(ent.id),
                                                label: `${ent.nombre}${ent.rut ? ` (${ent.rut})` : ""}`,
                                                rut: ent.rut ?? "",
                                            }))}
                                        />

                                        <p className="text-xs text-slate-500 mt-1">
                                            Mostrando {entidadesFiltradas.length} de{" "}
                                            {totalEntidadesPorTipo}{" "}
                                            {formData.tipoEntidad === "PERSONA" ? "personas" : "empresas"}
                                        </p>
                                    </div>

                                    {/* Persona Responsable */}
                                    <div>
                                        <label className="block text-xs font-medium text-slate-600 mb-1">
                                            Persona Responsable
                                        </label>

                                        <input
                                            type="text"
                                            value={formData.personaResponsable}
                                            onChange={(e) =>
                                                setFormData({ ...formData, personaResponsable: e.target.value })
                                            }
                                            placeholder="Ej. Juan Pérez"
                                            className="
        w-full px-3 py-2 text-sm
        rounded-xl bg-white
        border border-cyan-200
        text-slate-700
        focus:outline-none focus:ring-2 focus:ring-cyan-400
        transition
        "
                                        />
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
                                        <label className="block text-xs font-medium text-slate-600 mb-1">Tipo <span className="text-rose-500">*</span></label>
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
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-2">
                                                Estado Inicial <span className="text-rose-500">*</span>
                                            </label>

                                            <div className="flex flex-wrap gap-3">
                                                {Object.entries(estadoConfig)
                                                    .filter(([key]) => key !== "FACTURADA")
                                                    .map(([key, config]) => {
                                                        const estado = key as EstadoCotizacionGestioo;
                                                        const isActive = formData.estadoCotizacion === estado;

                                                        return (
                                                            <button
                                                                key={estado}
                                                                type="button"
                                                                onClick={() =>
                                                                    setFormData({ ...formData, estadoCotizacion: estado })
                                                                }
                                                                className={`
            px-4 py-2 rounded-full border text-sm font-semibold
            transition-all duration-200
            ${isActive ? config.active : config.color}
          `}
                                                            >
                                                                {config.label}
                                                            </button>
                                                        );
                                                    })}
                                            </div>

                                            {!formData.estadoCotizacion && (
                                                <p className="text-rose-500 text-xs mt-2">
                                                    Debe seleccionar un estado
                                                </p>
                                            )}
                                        </div>

                                        {/* Moneda */}
                                        <div className="pt-3">
                                            <label className="block text-xs font-medium text-slate-600 mb-2">
                                                Moneda de Cotización <span className="text-rose-500">*</span>
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
                                                        step={0.01}
                                                        inputMode="decimal"
                                                        min={1}
                                                        value={
                                                            formData.tasaCambio
                                                        }
                                                        onChange={(e) => {
                                                            const tasa =
                                                                e.currentTarget
                                                                    .valueAsNumber;

                                                            if (
                                                                Number.isNaN(tasa) ||
                                                                tasa < 1
                                                            ) {
                                                                return;
                                                            }

                                                            setFormData({
                                                                ...formData,
                                                                tasaCambio:
                                                                    tasa,
                                                            });
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
                            <div className="border border-cyan-200 rounded-2xl p-4 bg-white md:col-span-2">
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
                                <div className="border border-cyan-200 rounded-2xl p-4 bg-white md:col-span-2 flex flex-wrap gap-3">
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
                                        onClick={onCrearServicio}
                                        className="px-3 py-1.5 rounded-xl border border-cyan-400 text-cyan-700 hover:bg-cyan-50"
                                    >
                                        + Nuevo servicio
                                    </button>

                                </div>
                            )}

                            {/* TABLA DE ÍTEMS - Solo si hay sección activa */}
                            {seccionActiva && (
                                <div className="border border-cyan-200 rounded-2xl p-4 bg-white md:col-span-2">
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
                                                    Total: {formatearMontoFinal(
                                                        calcularTotalesSeccion(seccionActiva.id).total,
                                                        formData.moneda,
                                                        formData.tasaCambio
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <table className="w-full table-fixed text-sm">
                                        <thead className="bg-cyan-50 text-slate-700 border-b border-cyan-200">
                                            <tr>
                                                <th className="px-4 py-3 text-left border-r border-cyan-200 w-[38%]">
                                                    Nombre
                                                </th>

                                                <th className="px-3 py-3 text-center border-r border-cyan-200 w-[7%]">
                                                    Cant.
                                                </th>

                                                <th className="px-3 py-3 text-center border-r border-cyan-200 w-[10%]">
                                                    P.Unitario
                                                </th>

                                                <th className="px-3 py-3 text-center border-r border-cyan-200 w-[8%]">
                                                    % Margen
                                                </th>

                                                <th className="px-3 py-3 text-center border-r border-cyan-200 w-[7%]">
                                                    IVA
                                                </th>

                                                <th className="px-3 py-3 text-center border-r border-cyan-200 w-[8%]">
                                                    % Desc
                                                </th>

                                                <th className="px-3 py-3 text-right border-r border-cyan-200 w-[10%]">
                                                    Neto sin IVA
                                                </th>

                                                <th className="px-3 py-3 text-right border-r border-cyan-200 w-[10%]">
                                                    Total con IVA
                                                </th>

                                                <th className="px-3 py-3 text-center w-[5%]">
                                                </th>

                                                <th className="px-3 py-3 text-center border-l border-cyan-200 w-[10%]">
                                                    Equipo
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {itemsSeccionActiva.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={10}
                                                        className="text-center py-4 text-slate-400 border-b border-cyan-100"
                                                    >
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

                            {/* DETALLE REAL DE PRODUCTOS */}
                            {itemsSeccionActiva
                                .filter(item => item.tipo === ItemTipoGestioo.PRODUCTO && item.descripcion)
                                .length > 0 && (
                                    <div className="mt-4 border border-slate-200 rounded-2xl p-4 bg-slate-50">
                                        <h4 className="text-sm font-semibold text-slate-700 mb-2">
                                            Detalle de productos de esta cotización
                                        </h4>

                                        <ul className="space-y-2 text-sm text-slate-700">
                                            {itemsSeccionActiva
                                                .filter(item => item.tipo === ItemTipoGestioo.PRODUCTO)
                                                .map((item, idx) => (
                                                    <li
                                                        key={idx}
                                                        className="border-b last:border-b-0 border-slate-200 pb-2 last:pb-0"
                                                    >
                                                        {/* Mostrar NOMBRE del producto */}
                                                        <p className="font-semibold">{item.nombre || "Producto sin nombre"}</p>

                                                        {/* Mostrar DESCRIPCIÓN si existe */}
                                                        {item.descripcion && (
                                                            <p className="text-slate-600 whitespace-pre-wrap break-words [overflow-wrap:anywhere] mt-1 max-w-full">
                                                                {item.descripcion}
                                                            </p>
                                                        )}
                                                    </li>
                                                ))}
                                        </ul>
                                    </div>
                                )
                            }

                            {/* RESUMEN DE SECCIONES */}
                            {formData.secciones.length > 1 && (
                                <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50">
                                    <h4 className="font-semibold text-slate-700 mb-3">Resumen por Sección</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {formData.secciones.map((seccion) => {
                                            const totalesSeccion = calcularTotalesSeccion(seccion.id);
                                            const itemsCount = items.filter(item => item.seccionId === seccion.id).length;

                                            // Si la sección no tiene items, no mostrarla en el resumen
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

                            {/* RESUMEN + COMENTARIOS */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:col-span-2">

                                {/* RESUMEN FINANCIERO */}
                                <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-slate-200 p-6 shadow-sm">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xl font-bold text-slate-800">
                                            Resumen Financiero
                                        </h3>

                                        <div className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
                                            {moneda === "USD"
                                                ? "USD - Dólares"
                                                : "CLP - Pesos Chilenos"
                                            }
                                        </div>
                                    </div>

                                    <div className="space-y-0">

                                        {/* COSTO ORIGINAL */}
                                        <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                            <div>
                                                <div className="text-slate-700 font-medium">
                                                    Costo original de productos
                                                </div>

                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    Costo de compra × cantidad
                                                </div>
                                            </div>

                                            <div className="font-semibold text-slate-900 tabular-nums">
                                                {formatearMontoFinal(
                                                    costoOriginalProductos,
                                                    moneda,
                                                    tasaCambio
                                                )}
                                            </div>
                                        </div>


                                        {/* GANANCIA */}
                                        <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                            <div>
                                                <div className="text-emerald-700 font-medium">
                                                    Ganancia comercial
                                                </div>

                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    Margen promedio:{" "}
                                                    {redondearDecimal(
                                                        margenPromedio,
                                                        2
                                                    ).toLocaleString(
                                                        "es-CL",
                                                        {
                                                            minimumFractionDigits: 0,
                                                            maximumFractionDigits: 2,
                                                        }
                                                    )}%
                                                </div>
                                            </div>

                                            <div className="font-bold text-emerald-600 tabular-nums">
                                                +{" "}
                                                {formatearMontoFinal(
                                                    gananciaBrutaProductos,
                                                    moneda,
                                                    tasaCambio
                                                )}
                                            </div>
                                        </div>


                                        {/* SERVICIOS */}
                                        {ventaBrutaServicios > 0 && (
                                            <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                                <div>
                                                    <div className="text-slate-700 font-medium">
                                                        Servicios
                                                    </div>

                                                    <div className="text-xs text-slate-400 mt-0.5">
                                                        Valor bruto de servicios
                                                    </div>
                                                </div>

                                                <div className="font-semibold text-slate-900 tabular-nums">
                                                    {formatearMontoFinal(
                                                        ventaBrutaServicios,
                                                        moneda,
                                                        tasaCambio
                                                    )}
                                                </div>
                                            </div>
                                        )}


                                        {/* PRECIO VENTA BRUTO */}
                                        <div className="flex justify-between items-center py-3 border-b border-slate-200 bg-slate-50/70 px-3 -mx-3">
                                            <div>
                                                <div className="text-slate-800 font-semibold">
                                                    Precio de venta antes de descuentos
                                                </div>

                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    Productos + servicios
                                                </div>
                                            </div>

                                            <div className="font-bold text-slate-900 tabular-nums">
                                                {formatearMontoFinal(
                                                    subtotalBruto,
                                                    moneda,
                                                    tasaCambio
                                                )}
                                            </div>
                                        </div>


                                        {/* DESCUENTOS */}
                                        <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                            <div>
                                                <div className="text-rose-600 font-medium">
                                                    Descuentos aplicados
                                                </div>

                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    Descuentos comerciales de la cotización
                                                </div>
                                            </div>

                                            <div className="font-bold text-rose-600 tabular-nums">
                                                {descuentos > 0
                                                    ? `- ${formatearMontoFinal(
                                                        descuentos,
                                                        moneda,
                                                        tasaCambio
                                                    )}`
                                                    : formatearMontoFinal(
                                                        0,
                                                        moneda,
                                                        tasaCambio
                                                    )
                                                }
                                            </div>
                                        </div>


                                        {/* NETO */}
                                        <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                            <div>
                                                <div className="text-slate-700 font-medium">
                                                    Neto después de descuentos
                                                </div>

                                                <div className="text-xs text-slate-400 mt-0.5">
                                                    Base afecta antes de IVA
                                                </div>
                                            </div>

                                            <div className="font-semibold text-slate-900 tabular-nums">
                                                {formatearMontoFinal(
                                                    subtotal,
                                                    moneda,
                                                    tasaCambio
                                                )}
                                            </div>
                                        </div>


                                        {/* IVA */}
                                        {iva > 0 && (
                                            <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                                <div>
                                                    <div className="text-slate-700 font-medium">
                                                        IVA (19%)
                                                    </div>

                                                    <div className="text-xs text-slate-400 mt-0.5">
                                                        Impuesto agregado al neto
                                                    </div>
                                                </div>

                                                <div className="font-semibold text-slate-900 tabular-nums">
                                                    +{" "}
                                                    {formatearMontoFinal(
                                                        iva,
                                                        moneda,
                                                        tasaCambio
                                                    )}
                                                </div>
                                            </div>
                                        )}


                                        {/* TOTAL FINAL */}
                                        <div className="flex justify-between items-center pt-5 mt-1 border-t-2 border-slate-300">
                                            <div>
                                                <div className="text-lg font-bold text-slate-900">
                                                    TOTAL FINAL
                                                </div>

                                                <div className="text-xs text-slate-500 mt-1">
                                                    Total a cobrar al cliente
                                                </div>
                                            </div>

                                            <div className="text-2xl font-bold text-blue-700 tabular-nums">
                                                {formatearMontoFinal(
                                                    total,
                                                    moneda,
                                                    tasaCambio
                                                )}
                                            </div>
                                        </div>


                                        {/* EQUIVALENTE CLP */}
                                        {moneda === "USD" && (
                                            <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between text-sm">
                                                <span className="text-slate-500">
                                                    Equivalente en CLP
                                                </span>

                                                <span className="font-semibold text-slate-700 tabular-nums">
                                                    {formatearMontoFinal(
                                                        total * tasaCambio,
                                                        "CLP",
                                                        1
                                                    )}
                                                </span>
                                            </div>
                                        )}

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
                                        value={formData.comentariosCotizacion}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                comentariosCotizacion:
                                                    e.target.value,
                                            })
                                        }
                                        className="
                w-full
                h-48
                border-2
                border-slate-200
                rounded-xl
                px-4
                py-3
                text-base
                focus:outline-none
                focus:border-cyan-500
                focus:ring-2
                focus:ring-cyan-200
                transition-all
                resize-none
                bg-white
            "
                                        placeholder="Agregue comentarios, notas o instrucciones especiales para esta cotización..."
                                    />

                                    <div className="mt-4 text-sm text-slate-500">
                                        <InfoCircleOutlined className="mr-2" />
                                        Estos comentarios serán visibles en el documento PDF generado
                                    </div>
                                </div>
                            </div>

                            {/* BOTONES FINALES */}
                            <div
                                className="
        flex
        flex-col
        gap-4
        pt-4
        border-t
        lg:flex-row
        lg:items-center
        lg:justify-between
    "
                            >
                                {/* IZQUIERDA */}
                                <div
                                    className="
            flex
            flex-col
            gap-3
        "
                                >
                                    {/* ESTADO */}
                                    <div
                                        className="
                flex
                items-center
                gap-2
            "
                                    >
                                        <span
                                            className="
                    text-sm
                    text-slate-600
                "
                                        >
                                            Estado inicial:
                                        </span>

                                        <span
                                            className={`
                    px-3
                    py-1
                    rounded-full
                    text-xs
                    font-semibold
                    ${estadoConfig[
                                                    formData
                                                        .estadoCotizacion
                                                ]?.color
                                                }
                `}
                                        >
                                            {
                                                estadoConfig[
                                                    formData
                                                        .estadoCotizacion
                                                ]?.label
                                            }
                                        </span>
                                    </div>

                                    {/* FUNNEL */}
                                    {puedeUsarFunnel && (
                                        <label
                                            className="
                    flex
                    items-start
                    gap-3
                    cursor-pointer
                    select-none
                    rounded-xl
                    border
                    border-violet-200
                    bg-violet-50/60
                    px-4
                    py-3
                    max-w-md
                "
                                        >
                                            <input
                                                type="checkbox"
                                                checked={
                                                    agregarAlFunnel
                                                }
                                                onChange={(e) =>
                                                    setAgregarAlFunnel(
                                                        e.target.checked
                                                    )
                                                }
                                                className="
                        mt-0.5
                        h-4
                        w-4
                        rounded
                        border-violet-300
                        accent-violet-600
                    "
                                            />

                                            <div>
                                                <div
                                                    className="
                            text-sm
                            font-semibold
                            text-violet-800
                        "
                                                >
                                                    Añadir al Funnel
                                                    automáticamente
                                                </div>

                                                <div
                                                    className="
                            mt-0.5
                            text-xs
                            text-violet-600
                        "
                                                >
                                                    Se creará una
                                                    oportunidad comercial
                                                    vinculada a esta
                                                    cotización.
                                                </div>
                                            </div>
                                        </label>
                                    )}
                                </div>

                                {/* BOTONES */}
                                <div
                                    className="
            flex
            flex-wrap
            gap-3
            justify-end
        "
                                >
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        disabled={apiLoading}
                                        className="
                px-4
                py-2
                rounded-xl
                bg-slate-200
                text-slate-700
                hover:bg-slate-300
                disabled:opacity-50
                disabled:cursor-not-allowed
            "
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            onCrearCotizacion(
                                                agregarAlFunnel
                                            )
                                        }
                                        disabled={
                                            !formData.entidadId ||
                                            !formData.estadoCotizacion ||
                                            items.length === 0 ||
                                            !!motivoDeshabilitado() ||
                                            apiLoading
                                        }
                                        title={
                                            motivoDeshabilitado()
                                        }
                                        className="
                px-4
                py-2
                rounded-xl
                bg-cyan-600
                text-white
                hover:bg-cyan-700
                disabled:opacity-50
                disabled:cursor-not-allowed
            "
                                    >
                                        {apiLoading
                                            ? "Creando..."
                                            : agregarAlFunnel
                                                ? "Crear y añadir al Funnel"
                                                : "Crear Cotización"
                                        }
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
            <EditServicioModal
                show={showEditServicio}
                servicio={servicioAEditar}
                apiLoading={false}
                onClose={() => {
                    setShowEditServicio(false);
                    setServicioAEditar(null);
                }}
                onSave={(data) => {
                    if (!servicioAEditar) return;

                    setItems(prev =>
                        prev.map(i =>
                            i.id === servicioAEditar.id
                                ? {
                                    ...i,
                                    nombre: data.nombre,
                                    descripcion: data.descripcion,
                                    precio: data.precio,
                                    precioOriginalCLP: data.precio,
                                    categoria: data.categoria,
                                    duracionHoras: data.duracionHoras,
                                }
                                : i
                        )
                    );

                    setShowEditServicio(false);
                    setServicioAEditar(null);
                    message.success("Servicio actualizado en la cotización");
                }}
            />

        </div>
    );
};

export default CreateCotizacionModal;