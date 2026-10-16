// src/components/modals-cotizaciones/ViewCotizacionModal.tsx

import React from "react";
import { motion } from "framer-motion";

import {
    type CotizacionGestioo,
    ItemTipoGestioo,
} from "./types";

import {
    formatEstado,
    formatearPrecio,
    calcularTotales,
    calcularValoresItem,
    formatearMontoFinal,
    redondearDecimal,
} from "./utils";

interface ViewCotizacionModalProps {
    show: boolean;
    cotizacion: CotizacionGestioo | null;
    onClose: () => void;

    // URL del PDF generado
    pdfURL?: string | null;
}

const ViewCotizacionModal: React.FC<ViewCotizacionModalProps> = ({
    show,
    cotizacion,
    onClose,
    pdfURL,
}) => {

    if (!show) {
        return null;
    }

    /* ============================================================
       1) MODO VISTA PREVIA REAL DEL PDF
    ============================================================ */

    if (pdfURL) {
        return (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6 z-[99999]">
                <div
                    className="
                        bg-white
                        rounded-xl
                        shadow-xl
                        w-[900px]
                        max-w-[95vw]
                        h-[90vh]
                        relative
                        flex
                        flex-col
                    "
                >
                    {/* BOTÓN CERRAR */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="
                            absolute
                            top-3
                            right-4
                            text-slate-400
                            hover:text-slate-600
                            text-xl
                            z-10
                        "
                    >
                        ✕
                    </button>

                    {/* CONTENEDOR PDF */}
                    <div className="flex-1 mt-10">
                        <iframe
                            src={pdfURL}
                            title="Vista previa de cotización"
                            className="w-full h-full border-none"
                        />
                    </div>
                </div>
            </div>
        );
    }

    /* ============================================================
       2) MODO NORMAL
    ============================================================ */

    if (!cotizacion) {
        return null;
    }

    const moneda =
        cotizacion.moneda || "CLP";

    const tasa =
        cotizacion.tasaCambio || 1;

    const items =
        cotizacion.items || [];


    /* ============================================================
       TOTALES GENERALES
    ============================================================ */

    const {
        subtotalBruto,
        descuentos,
        subtotal,
        iva,
        total,
    } = calcularTotales(items);


    /* ============================================================
       DESGLOSE FINANCIERO
    ============================================================ */

    // Costo original total de productos
    const costoOriginalProductos =
        items.reduce(
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


    // Venta bruta SOLO de productos
    const ventaBrutaProductos =
        items.reduce(
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


    // Venta bruta de servicios
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


    return (
        <div
            className="
                fixed
                inset-0
                bg-black/40
                flex
                items-center
                justify-center
                z-[99999]
                p-3
            "
        >
            <motion.div
                initial={{
                    scale: 0.95,
                    opacity: 0,
                }}
                animate={{
                    scale: 1,
                    opacity: 1,
                }}
                transition={{
                    duration: 0.2,
                }}
                className="
                    bg-slate-50
                    rounded-2xl
                    shadow-2xl
                    w-[96vw]
                    max-w-[1800px]
                    h-[92vh]
                    relative
                    flex
                    flex-col
                    overflow-hidden
                "
            >

                {/* =====================================================
                    HEADER
                ===================================================== */}

                <div
                    className="
                        bg-white
                        rounded-t-2xl
                        px-6
                        py-4
                        border-b
                        border-slate-100
                        flex
                        items-center
                        justify-between
                        sticky
                        top-0
                        z-10
                    "
                >
                    <div>
                        <div
                            className="
                                text-xs
                                text-slate-400
                                font-medium
                                uppercase
                                tracking-wide
                            "
                        >
                            Cotización
                        </div>

                        <div className="text-xl font-bold text-slate-800">
                            #{cotizacion.id}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">

                        {/* ESTADO */}
                        <span
                            className={`
                                text-xs
                                font-semibold
                                px-3
                                py-1
                                rounded-full
                                ${cotizacion.estado === "APROBADA"
                                    ? "bg-green-100 text-green-700"
                                    : cotizacion.estado === "RECHAZADA"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-amber-100 text-amber-700"
                                }
                            `}
                        >
                            {formatEstado(
                                cotizacion.estado
                            )}
                        </span>

                        {/* CERRAR */}
                        <button
                            type="button"
                            onClick={onClose}
                            className="
                                text-slate-400
                                hover:text-slate-600
                                text-xl
                                leading-none
                            "
                        >
                            ✕
                        </button>
                    </div>
                </div>


                {/* =====================================================
                    CONTENIDO PRINCIPAL
                ===================================================== */}

                <div
                    className="
                        flex-1
                        overflow-y-auto
                        p-4
                        lg:p-6
                        xl:p-8
                        space-y-6
                    "
                >

                    {/* =====================================================
                        DATOS DEL CLIENTE
                    ===================================================== */}

                    <div
                        className="
                            bg-white
                            rounded-xl
                            border
                            border-slate-100
                            p-5
                        "
                    >
                        <div
                            className="
                                text-xs
                                font-semibold
                                text-slate-400
                                uppercase
                                tracking-wide
                                mb-4
                            "
                        >
                            Datos del cliente
                        </div>

                        <div
                            className="
                                grid
                                grid-cols-1
                                md:grid-cols-2
                                xl:grid-cols-3
                                gap-x-8
                                gap-y-4
                                text-sm
                            "
                        >

                            {/* CLIENTE */}
                            <div>
                                <span className="text-slate-400">
                                    Cliente
                                </span>

                                <div className="font-medium text-slate-800">
                                    {cotizacion.entidad?.nombre || "—"}
                                </div>
                            </div>


                            {/* RUT */}
                            <div>
                                <span className="text-slate-400">
                                    RUT
                                </span>

                                <div className="font-medium text-slate-800">
                                    {cotizacion.entidad?.rut || "—"}
                                </div>
                            </div>


                            {/* CORREO */}
                            <div>
                                <span className="text-slate-400">
                                    Correo
                                </span>

                                <div className="font-medium text-slate-800">
                                    {cotizacion.entidad?.correo || "—"}
                                </div>
                            </div>


                            {/* TELÉFONO */}
                            <div>
                                <span className="text-slate-400">
                                    Teléfono
                                </span>

                                <div className="font-medium text-slate-800">
                                    {cotizacion.entidad?.telefono || "—"}
                                </div>
                            </div>


                            {/* DIRECCIÓN */}
                            <div>
                                <span className="text-slate-400">
                                    Dirección
                                </span>

                                <div className="font-medium text-slate-800">
                                    {cotizacion.entidad?.direccion || "—"}
                                </div>
                            </div>


                            {/* FECHA */}
                            <div>
                                <span className="text-slate-400">
                                    Fecha
                                </span>

                                <div className="font-medium text-slate-800">
                                    {new Date(
                                        cotizacion.fecha
                                    ).toLocaleDateString(
                                        "es-CL"
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>


                    {/* =====================================================
                        TABLA DE ÍTEMS
                    ===================================================== */}

                    <div
                        className="
                            bg-white
                            rounded-xl
                            border
                            border-slate-100
                            overflow-hidden
                        "
                    >

                        {/* HEADER TABLA */}
                        <div
                            className="
                                px-4
                                py-3
                                border-b
                                border-slate-100
                                flex
                                justify-between
                                items-center
                            "
                        >
                            <div
                                className="
                                    text-xs
                                    font-semibold
                                    text-slate-400
                                    uppercase
                                    tracking-wide
                                "
                            >
                                Ítems ({items.length})
                            </div>

                            <div className="text-xs text-slate-500">
                                {moneda === "USD"
                                    ? "USD - Dólares"
                                    : "CLP - Pesos Chilenos"
                                }
                            </div>
                        </div>


                        {/* SCROLL HORIZONTAL */}
                        <div className="overflow-x-auto">

                            <table
                                className="
                                    w-full
                                    min-w-[1250px]
                                    text-sm
                                "
                            >

                                <thead>
                                    <tr
                                        className="
                                            bg-slate-50
                                            text-slate-400
                                            text-xs
                                        "
                                    >
                                        <th className="text-left px-4 py-3 font-medium">
                                            #
                                        </th>

                                        <th className="text-left px-4 py-3 font-medium min-w-[280px]">
                                            Producto
                                        </th>

                                        <th className="text-center px-3 py-3 font-medium">
                                            Cant.
                                        </th>

                                        <th className="text-right px-3 py-3 font-medium whitespace-nowrap">
                                            Costo
                                        </th>

                                        <th className="text-right px-3 py-3 font-medium whitespace-nowrap">
                                            P. Unitario
                                        </th>

                                        <th className="text-center px-3 py-3 font-medium whitespace-nowrap">
                                            % Ganancia
                                        </th>

                                        <th className="text-right px-3 py-3 font-medium whitespace-nowrap">
                                            Neto
                                        </th>

                                        <th className="text-right px-3 py-3 font-medium whitespace-nowrap">
                                            IVA
                                        </th>

                                        <th className="text-right px-4 py-3 font-medium whitespace-nowrap">
                                            Total
                                        </th>
                                    </tr>
                                </thead>


                                <tbody>

                                    {items.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={9}
                                                className="
                                                    px-6
                                                    py-10
                                                    text-center
                                                    text-slate-400
                                                "
                                            >
                                                Esta cotización no tiene ítems.
                                            </td>
                                        </tr>
                                    ) : (
                                        items.map(
                                            (
                                                item,
                                                index
                                            ) => {

                                                const valores =
                                                    calcularValoresItem(
                                                        item
                                                    );

                                                const costo =
                                                    Number(
                                                        item.precioCosto || 0
                                                    );

                                                const margen =
                                                    Number(
                                                        item.porcGanancia || 0
                                                    );

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

                                                const gananciaItem =
                                                    item.tipo ===
                                                        ItemTipoGestioo.PRODUCTO &&
                                                        costo > 0
                                                        ? (
                                                            precioVenta -
                                                            costo
                                                        ) * cantidad
                                                        : 0;

                                                return (
                                                    <tr
                                                        key={item.id}
                                                        className="
                                                            border-t
                                                            border-slate-50
                                                            hover:bg-slate-50
                                                            transition
                                                        "
                                                    >

                                                        {/* # */}
                                                        <td className="px-4 py-3 text-slate-400">
                                                            {index + 1}
                                                        </td>


                                                        {/* PRODUCTO */}
                                                        <td className="px-4 py-3">
                                                            <div
                                                                className="
                                                                    font-medium
                                                                    text-slate-800
                                                                "
                                                            >
                                                                {item.nombre || "—"}
                                                            </div>

                                                            {item.descripcion &&
                                                                item.descripcion.trim() !==
                                                                item.nombre?.trim() && (
                                                                    <div
                                                                        className="
                                                                            text-xs
                                                                            text-slate-400
                                                                            mt-1
                                                                            max-w-[460px]
                                                                            line-clamp-2
                                                                            break-words
                                                                        "
                                                                    >
                                                                        {item.descripcion}
                                                                    </div>
                                                                )}
                                                        </td>


                                                        {/* CANTIDAD */}
                                                        <td
                                                            className="
                                                                px-3
                                                                py-3
                                                                text-center
                                                                text-slate-600
                                                            "
                                                        >
                                                            {cantidad}
                                                        </td>


                                                        {/* COSTO */}
                                                        <td
                                                            className="
                                                                px-3
                                                                py-3
                                                                text-right
                                                                whitespace-nowrap
                                                                text-slate-600
                                                                tabular-nums
                                                            "
                                                        >
                                                            {item.tipo ===
                                                                ItemTipoGestioo.PRODUCTO &&
                                                                costo > 0
                                                                ? formatearPrecio(
                                                                    costo,
                                                                    moneda,
                                                                    tasa
                                                                )
                                                                : "—"
                                                            }
                                                        </td>


                                                        {/* PRECIO UNITARIO */}
                                                        <td
                                                            className="
                                                                px-3
                                                                py-3
                                                                text-right
                                                                whitespace-nowrap
                                                                font-medium
                                                                text-slate-800
                                                                tabular-nums
                                                            "
                                                        >
                                                            {formatearPrecio(
                                                                precioVenta,
                                                                moneda,
                                                                tasa
                                                            )}
                                                        </td>


                                                        {/* MARGEN */}
                                                        <td
                                                            className="
                                                                px-3
                                                                py-3
                                                                text-center
                                                                whitespace-nowrap
                                                            "
                                                        >
                                                            {item.tipo ===
                                                                ItemTipoGestioo.PRODUCTO ? (
                                                                <div
                                                                    className="
                                                                        flex
                                                                        flex-col
                                                                        items-center
                                                                    "
                                                                >
                                                                    <span
                                                                        className="
                                                                            font-semibold
                                                                            text-emerald-600
                                                                        "
                                                                    >
                                                                        {redondearDecimal(
                                                                            margen,
                                                                            2
                                                                        ).toLocaleString(
                                                                            "es-CL",
                                                                            {
                                                                                minimumFractionDigits: 0,
                                                                                maximumFractionDigits: 2,
                                                                            }
                                                                        )}
                                                                        %
                                                                    </span>

                                                                    {gananciaItem > 0 && (
                                                                        <span
                                                                            className="
                                                                                text-[11px]
                                                                                text-emerald-500
                                                                                mt-0.5
                                                                            "
                                                                        >
                                                                            +{" "}
                                                                            {formatearPrecio(
                                                                                gananciaItem,
                                                                                moneda,
                                                                                tasa
                                                                            )}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-300">
                                                                    —
                                                                </span>
                                                            )}
                                                        </td>


                                                        {/* NETO */}
                                                        <td
                                                            className="
                                                                px-3
                                                                py-3
                                                                text-right
                                                                whitespace-nowrap
                                                                text-slate-700
                                                                tabular-nums
                                                            "
                                                        >
                                                            {formatearPrecio(
                                                                valores.neto,
                                                                moneda,
                                                                tasa
                                                            )}
                                                        </td>


                                                        {/* IVA */}
                                                        <td
                                                            className="
                                                                px-3
                                                                py-3
                                                                text-right
                                                                whitespace-nowrap
                                                                text-slate-600
                                                                tabular-nums
                                                            "
                                                        >
                                                            {item.tieneIVA &&
                                                                valores.iva > 0
                                                                ? formatearPrecio(
                                                                    valores.iva,
                                                                    moneda,
                                                                    tasa
                                                                )
                                                                : "—"
                                                            }
                                                        </td>


                                                        {/* TOTAL */}
                                                        <td
                                                            className="
                                                                px-4
                                                                py-3
                                                                text-right
                                                                whitespace-nowrap
                                                                font-bold
                                                                text-slate-900
                                                                tabular-nums
                                                            "
                                                        >
                                                            {formatearPrecio(
                                                                valores.total,
                                                                moneda,
                                                                tasa
                                                            )}
                                                        </td>

                                                    </tr>
                                                );
                                            }
                                        )
                                    )}

                                </tbody>
                            </table>
                        </div>
                    </div>


                    {/* =====================================================
                        RESUMEN + COMENTARIOS
                    ===================================================== */}

                    <div
                        className="
                            grid
                            grid-cols-1
                            lg:grid-cols-2
                            gap-6
                        "
                    >

                        {/* =====================================================
                            RESUMEN FINANCIERO
                        ===================================================== */}

                        <div
                            className="
                                bg-white
                                rounded-xl
                                border
                                border-slate-100
                                p-5
                            "
                        >

                            {/* HEADER */}
                            <div
                                className="
                                    flex
                                    items-center
                                    justify-between
                                    mb-5
                                "
                            >
                                <div>
                                    <div
                                        className="
                                            text-xs
                                            font-semibold
                                            text-slate-400
                                            uppercase
                                            tracking-wide
                                        "
                                    >
                                        Resumen financiero
                                    </div>

                                    <div className="text-xs text-slate-400 mt-1">
                                        Desglose general de la cotización
                                    </div>
                                </div>

                                <div
                                    className="
                                        text-xs
                                        font-medium
                                        text-slate-600
                                        bg-slate-100
                                        px-3
                                        py-1
                                        rounded-lg
                                    "
                                >
                                    {moneda === "USD"
                                        ? "USD - Dólares"
                                        : "CLP - Pesos Chilenos"
                                    }
                                </div>
                            </div>


                            <div className="space-y-0">

                                {/* COSTO ORIGINAL */}
                                <div
                                    className="
                                        flex
                                        justify-between
                                        items-center
                                        py-3
                                        border-b
                                        border-slate-100
                                    "
                                >
                                    <div>
                                        <div className="text-slate-700 font-medium">
                                            Costo original de productos
                                        </div>

                                        <div className="text-xs text-slate-400 mt-0.5">
                                            Costo de compra × cantidad
                                        </div>
                                    </div>

                                    <div
                                        className="
                                            font-semibold
                                            text-slate-900
                                            tabular-nums
                                        "
                                    >
                                        {formatearMontoFinal(
                                            costoOriginalProductos,
                                            moneda,
                                            tasa
                                        )}
                                    </div>
                                </div>


                                {/* GANANCIA */}
                                <div
                                    className="
                                        flex
                                        justify-between
                                        items-center
                                        py-3
                                        border-b
                                        border-slate-100
                                    "
                                >
                                    <div>
                                        <div className="text-emerald-700 font-medium">
                                            Ganancia comercial
                                        </div>

                                        <div className="text-xs text-slate-400 mt-0.5">
                                            Margen promedio ponderado:{" "}
                                            {redondearDecimal(
                                                margenPromedio,
                                                2
                                            ).toLocaleString(
                                                "es-CL",
                                                {
                                                    minimumFractionDigits: 0,
                                                    maximumFractionDigits: 2,
                                                }
                                            )}
                                            %
                                        </div>
                                    </div>

                                    <div
                                        className="
                                            font-bold
                                            text-emerald-600
                                            tabular-nums
                                        "
                                    >
                                        +{" "}
                                        {formatearMontoFinal(
                                            gananciaBrutaProductos,
                                            moneda,
                                            tasa
                                        )}
                                    </div>
                                </div>


                                {/* SERVICIOS */}
                                {ventaBrutaServicios > 0 && (
                                    <div
                                        className="
                                            flex
                                            justify-between
                                            items-center
                                            py-3
                                            border-b
                                            border-slate-100
                                        "
                                    >
                                        <div>
                                            <div className="text-slate-700 font-medium">
                                                Servicios
                                            </div>

                                            <div className="text-xs text-slate-400 mt-0.5">
                                                Valor bruto de servicios
                                            </div>
                                        </div>

                                        <div
                                            className="
                                                font-semibold
                                                text-slate-900
                                                tabular-nums
                                            "
                                        >
                                            {formatearMontoFinal(
                                                ventaBrutaServicios,
                                                moneda,
                                                tasa
                                            )}
                                        </div>
                                    </div>
                                )}


                                {/* PRECIO DE VENTA */}
                                <div
                                    className="
                                        flex
                                        justify-between
                                        items-center
                                        py-3
                                        px-3
                                        -mx-3
                                        bg-slate-50
                                        border-b
                                        border-slate-200
                                    "
                                >
                                    <div>
                                        <div className="text-slate-800 font-semibold">
                                            Precio de venta antes de descuentos
                                        </div>

                                        <div className="text-xs text-slate-400 mt-0.5">
                                            Productos + servicios
                                        </div>
                                    </div>

                                    <div
                                        className="
                                            font-bold
                                            text-slate-900
                                            tabular-nums
                                        "
                                    >
                                        {formatearMontoFinal(
                                            subtotalBruto,
                                            moneda,
                                            tasa
                                        )}
                                    </div>
                                </div>


                                {/* DESCUENTOS */}
                                <div
                                    className="
                                        flex
                                        justify-between
                                        items-center
                                        py-3
                                        border-b
                                        border-slate-100
                                    "
                                >
                                    <div>
                                        <div className="text-rose-600 font-medium">
                                            Descuentos aplicados
                                        </div>

                                        <div className="text-xs text-slate-400 mt-0.5">
                                            Descuentos comerciales de la cotización
                                        </div>
                                    </div>

                                    <div
                                        className="
                                            font-bold
                                            text-rose-600
                                            tabular-nums
                                        "
                                    >
                                        {descuentos > 0
                                            ? `- ${formatearMontoFinal(
                                                descuentos,
                                                moneda,
                                                tasa
                                            )}`
                                            : formatearMontoFinal(
                                                0,
                                                moneda,
                                                tasa
                                            )
                                        }
                                    </div>
                                </div>


                                {/* NETO */}
                                <div
                                    className="
                                        flex
                                        justify-between
                                        items-center
                                        py-3
                                        border-b
                                        border-slate-100
                                    "
                                >
                                    <div>
                                        <div className="text-slate-700 font-medium">
                                            Neto después de descuentos
                                        </div>

                                        <div className="text-xs text-slate-400 mt-0.5">
                                            Base afecta antes de IVA
                                        </div>
                                    </div>

                                    <div
                                        className="
                                            font-semibold
                                            text-slate-900
                                            tabular-nums
                                        "
                                    >
                                        {formatearMontoFinal(
                                            subtotal,
                                            moneda,
                                            tasa
                                        )}
                                    </div>
                                </div>


                                {/* IVA */}
                                {iva > 0 && (
                                    <div
                                        className="
                                            flex
                                            justify-between
                                            items-center
                                            py-3
                                            border-b
                                            border-slate-100
                                        "
                                    >
                                        <div>
                                            <div className="text-slate-700 font-medium">
                                                IVA (19%)
                                            </div>

                                            <div className="text-xs text-slate-400 mt-0.5">
                                                Impuesto agregado al neto
                                            </div>
                                        </div>

                                        <div
                                            className="
                                                font-semibold
                                                text-slate-900
                                                tabular-nums
                                            "
                                        >
                                            +{" "}
                                            {formatearMontoFinal(
                                                iva,
                                                moneda,
                                                tasa
                                            )}
                                        </div>
                                    </div>
                                )}


                                {/* TOTAL */}
                                <div
                                    className="
                                        flex
                                        justify-between
                                        items-center
                                        pt-5
                                        mt-1
                                        border-t-2
                                        border-slate-200
                                    "
                                >
                                    <div>
                                        <div
                                            className="
                                                text-lg
                                                font-bold
                                                text-slate-900
                                            "
                                        >
                                            TOTAL FINAL
                                        </div>

                                        <div className="text-xs text-slate-400 mt-0.5">
                                            Total a cobrar al cliente
                                        </div>
                                    </div>

                                    <div
                                        className="
                                            text-2xl
                                            font-bold
                                            text-cyan-600
                                            tabular-nums
                                        "
                                    >
                                        {formatearMontoFinal(
                                            total,
                                            moneda,
                                            tasa
                                        )}
                                    </div>
                                </div>


                                {/* EQUIVALENTE CLP */}
                                {moneda === "USD" && (
                                    <div
                                        className="
                                            mt-4
                                            pt-4
                                            border-t
                                            border-slate-100
                                            flex
                                            justify-between
                                            items-center
                                            text-sm
                                        "
                                    >
                                        <span className="text-slate-500">
                                            Equivalente en CLP
                                        </span>

                                        <span
                                            className="
                                                font-semibold
                                                text-slate-700
                                                tabular-nums
                                            "
                                        >
                                            {formatearMontoFinal(
                                                total * tasa,
                                                "CLP",
                                                1
                                            )}
                                        </span>
                                    </div>
                                )}

                            </div>
                        </div>


                        {/* =====================================================
                            COMENTARIOS Y DATOS ADICIONALES
                        ===================================================== */}

                        <div
                            className="
                                bg-white
                                rounded-xl
                                border
                                border-slate-100
                                p-5
                            "
                        >
                            <div
                                className="
                                    text-xs
                                    font-semibold
                                    text-slate-400
                                    uppercase
                                    tracking-wide
                                    mb-4
                                "
                            >
                                Información adicional
                            </div>


                            {/* COMENTARIOS */}
                            <div className="mb-6">
                                <div className="text-sm font-semibold text-slate-700 mb-2">
                                    Comentarios de la cotización
                                </div>

                                <div
                                    className="
                                        min-h-[120px]
                                        border
                                        border-slate-200
                                        bg-slate-50
                                        rounded-xl
                                        p-4
                                        text-sm
                                        text-slate-700
                                        whitespace-pre-wrap
                                        break-words
                                    "
                                >
                                    {cotizacion.comentariosCotizacion?.trim()
                                        ? cotizacion.comentariosCotizacion
                                        : "Sin comentarios."
                                    }
                                </div>
                            </div>


                            {/* INFORMACIÓN GENERAL */}
                            <div className="space-y-3 text-sm">

                                <div
                                    className="
                                        flex
                                        justify-between
                                        gap-6
                                        py-2
                                        border-b
                                        border-slate-100
                                    "
                                >
                                    <span className="text-slate-500">
                                        Tipo de cotización
                                    </span>

                                    <span className="font-medium text-slate-800">
                                        {cotizacion.tipo || "—"}
                                    </span>
                                </div>


                                <div
                                    className="
                                        flex
                                        justify-between
                                        gap-6
                                        py-2
                                        border-b
                                        border-slate-100
                                    "
                                >
                                    <span className="text-slate-500">
                                        Estado
                                    </span>

                                    <span className="font-medium text-slate-800">
                                        {formatEstado(
                                            cotizacion.estado
                                        )}
                                    </span>
                                </div>


                                <div
                                    className="
                                        flex
                                        justify-between
                                        gap-6
                                        py-2
                                        border-b
                                        border-slate-100
                                    "
                                >
                                    <span className="text-slate-500">
                                        Moneda
                                    </span>

                                    <span className="font-medium text-slate-800">
                                        {moneda === "USD"
                                            ? "USD - Dólares"
                                            : "CLP - Pesos Chilenos"
                                        }
                                    </span>
                                </div>


                                {moneda === "USD" && (
                                    <div
                                        className="
                                            flex
                                            justify-between
                                            gap-6
                                            py-2
                                            border-b
                                            border-slate-100
                                        "
                                    >
                                        <span className="text-slate-500">
                                            Tasa de cambio
                                        </span>

                                        <span className="font-medium text-slate-800">
                                            1 USD ={" "}
                                            {Number(
                                                tasa
                                            ).toLocaleString(
                                                "es-CL",
                                                {
                                                    minimumFractionDigits: 0,
                                                    maximumFractionDigits: 2,
                                                }
                                            )}{" "}
                                            CLP
                                        </span>
                                    </div>
                                )}


                                <div
                                    className="
                                        flex
                                        justify-between
                                        gap-6
                                        py-2
                                    "
                                >
                                    <span className="text-slate-500">
                                        Cantidad de ítems
                                    </span>

                                    <span className="font-medium text-slate-800">
                                        {items.length}
                                    </span>
                                </div>

                            </div>
                        </div>

                    </div>

                </div>
            </motion.div>
        </div>
    );
};

export default ViewCotizacionModal;