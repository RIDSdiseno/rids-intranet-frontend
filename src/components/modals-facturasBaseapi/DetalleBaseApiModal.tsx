// src/components/modals-facturasBaseapi/DetalleBaseApiModal.tsx
import React from "react";

import type { EmpresaKey, TabRCV } from "./types";

import {
    decodeBase64Utf8,
    formatCLP,
    formatFechaHoraVista,
    formatFechaVista,
    getDocumentoDte,
    getItemsFromDteResponse,
    getValue,
    getXmlBase64FromDteResponse,
    parseDteXml,
    toNumberDte,
} from "./utils";

import { generarPdfDocumentoSeleccionado } from "./pdfDocumento";

import {
    CloseOutlined,
    CloudSyncOutlined,
    DownloadOutlined,
    FileDoneOutlined,
    FilePdfOutlined,
    FileSearchOutlined,
    ProfileOutlined,
    ReloadOutlined,
    ShopOutlined,
    TagsOutlined,
    UnorderedListOutlined,
    LoadingOutlined
} from "@ant-design/icons";

const DetalleBaseApiModal: React.FC<{
    documento: any | null;
    activeTab: TabRCV;
    empresa: EmpresaKey;
    mes: string;
    ano: string;
    onClose: () => void;
    onConsultarDte: (doc: any, forceRefresh?: boolean) => Promise<any | null>;
    detalleDte: any | null;
    detalleLoading: boolean;
    detalleError: string;
    pdfPreparando?: boolean;
    pdfPreparadoUrl?: string | null;
    pdfPreparadoNombre?: string;
}> = ({
    documento,
    activeTab,
    empresa,
    mes,
    ano,
    onClose,
    onConsultarDte,
    detalleDte,
    detalleLoading,
    detalleError,
    pdfPreparando = false,
    pdfPreparadoUrl = null,
    pdfPreparadoNombre = "",
}) => {

        if (!documento) return null;

        const nombre = activeTab === "ventas"
            ? getValue(documento, ["Razon Social", "Razón Social", "Razon Social Receptor", "Razón Social Receptor", "razonSocial", "razonSocialReceptor"])
            : getValue(documento, ["Razon Social", "Razón Social", "Razon Social Proveedor", "Razón Social Proveedor", "razonSocial", "razonSocialProveedor"]);

        const rut = activeTab === "ventas"
            ? getValue(documento, ["Rut cliente", "RUT Cliente", "RUT Receptor", "Rut Receptor", "rutCliente", "rutReceptor"])
            : getValue(documento, ["RUT Proveedor", "Rut Proveedor", "rutProveedor"]);

        const tipoDoc = getValue(documento, ["Tipo Doc", "tipoDoc", "tipoDTE", "tipoDocumento"]);
        const tipoOperacion = getValue(documento, ["Tipo Venta", "Tipo Compra", "tipoVenta", "tipoCompra"]);
        const folio = getValue(documento, ["Folio", "folio"]);
        const fechaDocto = getValue(documento, ["Fecha Docto", "fechaDocto", "fechaEmision"]);
        const fechaRecepcion = getValue(documento, ["Fecha Recepcion", "fechaRecepcion"]);
        const estadoRcv = getValue(
            documento,
            ["Estado", "estado", "Estado Documento", "estadoDocumento"],
            "—"
        );

        const [pdfLoading, setPdfLoading] = React.useState(false);

        const montoExento = getValue(documento, ["Monto Exento", "montoExento"], 0);
        const montoNeto = getValue(documento, ["Monto Neto", "montoNeto"], 0);
        const montoIva = getValue(documento, ["Monto IVA", "Monto Iva", "Monto IVA Recuperable", "montoIva", "montoIVA"], 0);
        const montoTotal = getValue(documento, ["Monto total", "Monto Total", "montoTotal"], 0);

        const dteDocumento = getDocumentoDte(detalleDte);
        const estadoDte = dteDocumento?.estado ?? "—";
        const xmlBase64 = getXmlBase64FromDteResponse(detalleDte);
        const xmlDecodificado = decodeBase64Utf8(xmlBase64);
        const dteVisual = parseDteXml(xmlDecodificado);

        const itemsCache = getItemsFromDteResponse(detalleDte);

        const itemsVisuales =
            dteVisual?.detalles && dteVisual.detalles.length > 0
                ? dteVisual.detalles
                : itemsCache.map((item: any, index: number) => ({
                    nroLinDet: item.linea ?? index + 1,
                    codigo: item.codigo ?? "",
                    nombre: item.nombre ?? "—",
                    descripcion: item.descripcion ?? "",
                    cantidad: toNumberDte(item.cantidad ?? 0),
                    unidad: item.unidadMedida ?? "",
                    precio: toNumberDte(item.precioUnitario ?? 0),
                    monto: toNumberDte(item.montoItem ?? 0),
                }));

        const camposPrincipales = [
            "Nro", "nro", "Tipo Doc", "tipoDoc", "tipoDTE", "tipoDocumento",
            "Tipo Venta", "Tipo Compra", "tipoVenta", "tipoCompra",
            "Rut cliente", "RUT Cliente", "RUT Receptor", "Rut Receptor", "RUT Proveedor", "Rut Proveedor",
            "rutCliente", "rutReceptor", "rutProveedor",
            "Razon Social", "Razón Social", "Razon Social Receptor", "Razón Social Receptor",
            "Razon Social Proveedor", "Razón Social Proveedor", "razonSocial", "razonSocialReceptor", "razonSocialProveedor",
            "Folio", "folio", "Fecha Docto", "Fecha Recepcion", "fechaDocto", "fechaEmision", "fechaRecepcion",
            "Estado", "estado", "Estado Documento", "estadoDocumento",
            "Monto Exento", "montoExento", "Monto Neto", "montoNeto",
            "Monto IVA", "Monto Iva", "Monto IVA Recuperable", "montoIva", "montoIVA",
            "Monto total", "Monto Total", "montoTotal",
        ];

        const filasExtra = Object.entries(documento).filter(([key]) => !camposPrincipales.includes(key));

        const handleGenerarPdf = async () => {
            if (pdfLoading) return;

            setPdfLoading(true);

            try {
                let detalleParaPdf = detalleDte;

                if (activeTab === "ventas" && !detalleParaPdf) {
                    detalleParaPdf = await onConsultarDte(documento);
                }

                if (!detalleParaPdf) {
                    return;
                }

                await generarPdfDocumentoSeleccionado({
                    documento,
                    detalleDte: detalleParaPdf,
                    activeTab,
                    empresa,
                    mes,
                    ano,
                });
            } catch (error) {
                console.error("Error generando PDF", error);

                try {
                    alert("No se pudo generar el PDF");
                } catch { }
            } finally {
                setPdfLoading(false);
            }
        };

        return (
            <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
                <div className="flex max-h-[96vh] w-full flex-col overflow-hidden rounded-t-3xl border border-cyan-200 bg-white shadow-2xl sm:max-h-[92vh] sm:max-w-6xl sm:rounded-3xl">
                    {/* Header */}
                    <div className="border-b border-cyan-100 bg-cyan-50/60 px-4 py-4 text-slate-900 sm:px-6">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-cyan-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-cyan-700 ring-1 ring-cyan-200">
                                        <ProfileOutlined />
                                        Detalle RCV
                                    </span>

                                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-indigo-700 ring-1 ring-indigo-200">
                                        <FileDoneOutlined />
                                        {activeTab === "ventas" ? "Venta" : "Compra"}
                                    </span>

                                    <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-700 ring-1 ring-cyan-200">
                                        Folio {folio}
                                    </span>
                                </div>

                                <h2 className="mt-3 truncate text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                                    Documento #{folio}
                                </h2>

                                <p className="mt-1 max-w-3xl truncate text-sm text-slate-600">
                                    {activeTab === "ventas" ? "Cliente" : "Proveedor"}: {nombre}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Cerrar modal"
                                title="Cerrar"
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-200 bg-white text-cyan-700 transition hover:bg-cyan-50"
                            >
                                <CloseOutlined />
                            </button>
                        </div>

                        {/* Acciones */}
                        <div className="mt-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
                            {activeTab === "ventas" ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => onConsultarDte(documento)}
                                        disabled={detalleLoading}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-cyan-300 bg-cyan-600 px-4 text-sm font-bold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <FileSearchOutlined className={detalleLoading ? "animate-pulse" : ""} />
                                        {detalleLoading ? "Consultando..." : "Ver DTE / Ítems"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (pdfPreparadoUrl) {
                                                const a = document.createElement("a");
                                                a.href = pdfPreparadoUrl;
                                                a.download = pdfPreparadoNombre || "documento-rcv.pdf";
                                                document.body.appendChild(a);
                                                a.click();
                                                a.remove();
                                                return;
                                            }

                                            await handleGenerarPdf();
                                        }}
                                        disabled={detalleLoading || pdfLoading || pdfPreparando}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-cyan-300 bg-white px-4 text-sm font-bold text-cyan-700 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {pdfLoading || pdfPreparando ? (
                                            <LoadingOutlined className="animate-spin" />
                                        ) : (
                                            <FilePdfOutlined />
                                        )}

                                        {pdfPreparando
                                            ? "Preparando PDF..."
                                            : pdfPreparadoUrl
                                                ? "Descargar PDF"
                                                : pdfLoading
                                                    ? "Generando PDF..."
                                                    : "Generar PDF"}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => onConsultarDte(documento, true)}
                                        disabled={detalleLoading}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 text-sm font-bold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        <ReloadOutlined className={detalleLoading ? "animate-spin" : ""} />
                                        Actualizar cache
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    disabled
                                    className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-400"
                                    title="Este endpoint es para DTE emitidos."
                                >
                                    <FileSearchOutlined />
                                    DTE/XML no disponible
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto bg-cyan-50/20 px-4 py-4 sm:px-6 sm:py-5">
                        {/* Resumen superior */}
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            {[
                                { label: "Tipo documento", value: tipoDoc, icon: <FileDoneOutlined /> },
                                { label: "Folio", value: folio, icon: <TagsOutlined /> },
                                { label: "Fecha documento", value: formatFechaVista(fechaDocto), icon: <ProfileOutlined /> },
                                { label: "Estado RCV", value: estadoRcv, icon: <CloudSyncOutlined /> },
                            ].map(({ label, value, icon }) => (
                                <div
                                    key={label}
                                    className="rounded-2xl border border-cyan-100 bg-white p-3 shadow-sm sm:p-4"
                                >
                                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                        <span className="text-cyan-600">{icon}</span>
                                        {label}
                                    </div>

                                    <p className="mt-2 truncate text-sm font-black text-slate-900 sm:text-base">
                                        {value}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {activeTab === "ventas" && (
                            <div className="mt-4 rounded-2xl border border-cyan-200 bg-white p-3 text-sm shadow-sm">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="font-bold text-slate-800">
                                            DTE / PDF automático
                                        </p>

                                        <p className="text-xs text-slate-500">
                                            Al abrir el detalle se consulta el DTE, se cargan los ítems y se prepara el PDF.
                                        </p>
                                    </div>

                                    <span
                                        className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${detalleLoading || pdfPreparando
                                                ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                                : detalleDte && pdfPreparadoUrl
                                                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                                    : detalleDte
                                                        ? "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200"
                                                        : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                                            }`}
                                    >
                                        {detalleLoading
                                            ? "Cargando DTE..."
                                            : pdfPreparando
                                                ? "Preparando PDF..."
                                                : detalleDte && pdfPreparadoUrl
                                                    ? "DTE y PDF listos"
                                                    : detalleDte
                                                        ? "DTE cargado"
                                                        : "Pendiente"}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Datos principales */}
                        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
                            <div className="rounded-3xl border border-cyan-100 bg-white p-4 shadow-sm">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
                                            <ShopOutlined className="text-cyan-600" />
                                            {activeTab === "ventas" ? "Datos del cliente" : "Datos del proveedor"}
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            Contraparte asociada al documento tributario.
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                    <InfoField label="Razón social" value={nombre} />
                                    <InfoField label="RUT" value={rut} />
                                    <InfoField label="Fecha recepción" value={formatFechaHoraVista(fechaRecepcion)} />
                                </div>
                            </div>

                            <div className="rounded-3xl border border-cyan-100 bg-white p-4 shadow-sm">
                                <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
                                    <FileDoneOutlined className="text-cyan-600" />
                                    Datos del documento
                                </h3>

                                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-1">
                                    <InfoField label="Tipo operación" value={tipoOperacion} />
                                    <InfoField label="Tipo documento" value={tipoDoc} />
                                    <InfoField label="Folio" value={folio} />
                                </div>
                            </div>
                        </div>

                        {/* Montos */}
                        <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                            <h3 className="mb-4 flex items-center gap-2 text-sm font-black text-slate-900">
                                <DownloadOutlined className="text-cyan-600" />
                                Montos del documento
                            </h3>

                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                <AmountCard label="Exento" value={formatCLP(montoExento)} tone="slate" />
                                <AmountCard label="Neto" value={formatCLP(montoNeto)} tone="cyan" />
                                <AmountCard label="IVA" value={formatCLP(montoIva)} tone="indigo" />
                                <AmountCard label="Total" value={formatCLP(montoTotal)} tone="dark" />
                            </div>
                        </div>

                        {detalleError && (
                            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                                {detalleError}
                            </div>
                        )}

                        {/* DTE */}
                        {detalleDte ? (
                            <div className="mt-4 rounded-3xl border border-cyan-200 bg-cyan-50/50 p-4 shadow-sm">
                                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h3 className="flex items-center gap-2 text-sm font-black text-cyan-900">
                                            <FileSearchOutlined />
                                            DTE/XML BaseAPI
                                        </h3>

                                        <p className="mt-1 text-xs text-cyan-700">
                                            Detalle tributario obtenido desde cache o BaseAPI.
                                        </p>
                                    </div>

                                    <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${detalleDte?.cached
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-emerald-100 text-emerald-700"
                                        }`}>
                                        {detalleDte?.cached ? "Cargado desde cache" : "Consultado desde BaseAPI"}
                                    </span>
                                </div>

                                {dteDocumento && (
                                    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                                        {[
                                            {
                                                label: "Tipo DTE",
                                                value: dteDocumento.tipo_dte_nombre ?? dteDocumento.tipo_dte,
                                            },
                                            {
                                                label: "Folio",
                                                value: dteDocumento.folio,
                                            },
                                            {
                                                label: "Fecha",
                                                value: formatFechaVista(dteDocumento.fecha),
                                            },
                                            {
                                                label: "Estado DTE",
                                                value: estadoDte,
                                            },
                                        ].map(({ label, value }) => (
                                            <div
                                                key={label}
                                                className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-cyan-100"
                                            >
                                                <p className="text-[11px] font-bold uppercase tracking-wide text-cyan-700">
                                                    {label}
                                                </p>
                                                <p className="mt-1 truncate text-sm font-black text-slate-900">
                                                    {value ?? "—"}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="rounded-3xl border border-cyan-100 bg-white p-4 shadow-sm">
                                    <div className="mb-4 flex items-center justify-between gap-3">
                                        <div>
                                            <h4 className="flex items-center gap-2 text-sm font-black text-slate-900">
                                                <UnorderedListOutlined className="text-cyan-700" />
                                                Ítems / productos
                                            </h4>
                                            <p className="text-xs text-slate-500">
                                                Líneas reales del DTE consultado.
                                            </p>
                                        </div>

                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                            {itemsVisuales.length} ítem{itemsVisuales.length === 1 ? "" : "s"}
                                        </span>
                                    </div>

                                    {itemsVisuales.length > 0 ? (
                                        <>
                                            {/* Cards móviles */}
                                            <div className="space-y-3 md:hidden">
                                                {itemsVisuales.map((item: any, index: number) => (
                                                    <div
                                                        key={`${item.nroLinDet}-${index}-mobile`}
                                                        className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <p className="text-[11px] font-bold uppercase text-slate-400">
                                                                    Línea {item.nroLinDet || index + 1}
                                                                </p>

                                                                <p className="mt-1 truncate text-sm font-black text-slate-900">
                                                                    {item.nombre || "—"}
                                                                </p>

                                                                <p className="mt-1 text-xs text-slate-500">
                                                                    Código: {item.codigo || "—"}
                                                                </p>
                                                            </div>

                                                            <p className="shrink-0 text-sm font-black text-slate-900">
                                                                {formatCLP(item.monto)}
                                                            </p>
                                                        </div>

                                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                                            <MiniField
                                                                label="Cantidad"
                                                                value={[item.cantidad, item.unidad].filter(Boolean).join(" ") || "—"}
                                                            />
                                                            <MiniField
                                                                label="Precio"
                                                                value={formatCLP(item.precio)}
                                                            />
                                                        </div>

                                                        {item.descripcion && (
                                                            <p className="mt-3 rounded-xl bg-white p-2 text-xs text-slate-600">
                                                                {item.descripcion}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Tabla escritorio */}
                                            <div className="hidden overflow-hidden rounded-2xl border border-slate-200 md:block">
                                                <table className="w-full table-fixed text-left text-xs">
                                                    <thead className="bg-slate-100 text-[10px] uppercase tracking-wide text-slate-500">
                                                        <tr>
                                                            <th className="w-[7%] px-3 py-3">#</th>
                                                            <th className="w-[13%] px-3 py-3">Código</th>
                                                            <th className="w-[25%] px-3 py-3">Producto</th>
                                                            <th className="w-[25%] px-3 py-3">Descripción</th>
                                                            <th className="w-[10%] px-3 py-3 text-right">Cantidad</th>
                                                            <th className="w-[10%] px-3 py-3 text-right">Precio</th>
                                                            <th className="w-[10%] px-3 py-3 text-right">Monto</th>
                                                        </tr>
                                                    </thead>

                                                    <tbody className="divide-y divide-slate-100 bg-white">
                                                        {itemsVisuales.map((item: any, index: number) => (
                                                            <tr
                                                                key={`${item.nroLinDet}-${index}`}
                                                                className="hover:bg-cyan-50/70"
                                                            >
                                                                <td className="px-3 py-3 text-slate-500">
                                                                    {item.nroLinDet || index + 1}
                                                                </td>

                                                                <td className="truncate px-3 py-3 text-slate-500">
                                                                    {item.codigo || "—"}
                                                                </td>

                                                                <td className="truncate px-3 py-3 font-bold text-slate-800">
                                                                    {item.nombre || "—"}
                                                                </td>

                                                                <td className="truncate px-3 py-3 text-slate-600">
                                                                    {item.descripcion || "—"}
                                                                </td>

                                                                <td className="truncate px-3 py-3 text-right text-slate-700">
                                                                    {[item.cantidad, item.unidad].filter(Boolean).join(" ") || "—"}
                                                                </td>

                                                                <td className="truncate px-3 py-3 text-right text-slate-700">
                                                                    {formatCLP(item.precio)}
                                                                </td>

                                                                <td className="truncate px-3 py-3 text-right font-black text-slate-900">
                                                                    {formatCLP(item.monto)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                                            No se encontraron ítems en el XML ni en el cache del DTE.
                                        </div>
                                    )}
                                </div>

                                {filasExtra.length > 0 && (
                                    <details className="mt-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
                                        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                                            Ver campos adicionales RCV ({filasExtra.length})
                                        </summary>

                                        <div className="border-t border-slate-100 p-4">
                                            <div className="space-y-2 md:hidden">
                                                {filasExtra.map(([key, value]) => (
                                                    <div
                                                        key={key}
                                                        className="rounded-xl bg-slate-50 p-3"
                                                    >
                                                        <p className="text-[11px] font-bold uppercase text-slate-400">
                                                            {key}
                                                        </p>
                                                        <p className="mt-1 break-words text-sm text-slate-800">
                                                            {value === null || value === undefined || value === ""
                                                                ? "—"
                                                                : typeof value === "object"
                                                                    ? JSON.stringify(value)
                                                                    : String(value)}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="hidden overflow-x-auto md:block">
                                                <table className="w-full text-sm">
                                                    <tbody className="divide-y divide-slate-100">
                                                        {filasExtra.map(([key, value]) => (
                                                            <tr key={key}>
                                                                <td className="w-1/3 px-3 py-2 font-medium text-slate-500">
                                                                    {key}
                                                                </td>

                                                                <td className="px-3 py-2 text-slate-800">
                                                                    {value === null || value === undefined || value === ""
                                                                        ? "—"
                                                                        : typeof value === "object"
                                                                            ? JSON.stringify(value)
                                                                            : String(value)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </details>
                                )}
                            </div>
                        ) : (
                            <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
                                <FileSearchOutlined className="text-3xl text-slate-300" />

                                <h3 className="mt-3 text-sm font-black text-slate-900">
                                    Detalle DTE no cargado
                                </h3>

                                <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                                    Presiona “Ver DTE / Ítems” para consultar el XML y visualizar las líneas reales del documento.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

function InfoField({
    label,
    value,
}: {
    label: string;
    value: React.ReactNode;
}) {
    return (
        <div className="min-w-0 rounded-2xl bg-slate-50 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {label}
            </p>
            <p className="mt-1 truncate text-sm font-bold text-slate-800" title={String(value ?? "")}>
                {value ?? "—"}
            </p>
        </div>
    );
}

function MiniField({
    label,
    value,
}: {
    label: string;
    value: React.ReactNode;
}) {
    return (
        <div className="rounded-xl bg-white p-2">
            <p className="text-[10px] font-bold uppercase text-slate-400">
                {label}
            </p>
            <p className="mt-1 truncate text-xs font-bold text-slate-800">
                {value ?? "—"}
            </p>
        </div>
    );
}

function AmountCard({
    label,
    value,
    tone,
}: {
    label: string;
    value: React.ReactNode;
    tone: "slate" | "cyan" | "indigo" | "dark";
}) {
    const classes: Record<typeof tone, string> = {
        slate: "bg-slate-50 text-slate-900",
        cyan: "bg-cyan-50 text-cyan-900",
        indigo: "bg-indigo-50 text-indigo-900",
        dark: "bg-slate-900 text-white",
    };

    const labelClasses: Record<typeof tone, string> = {
        slate: "text-slate-400",
        cyan: "text-cyan-600",
        indigo: "text-indigo-600",
        dark: "text-slate-300",
    };

    return (
        <div className={`rounded-2xl p-3 sm:p-4 ${classes[tone]}`}>
            <p className={`text-[11px] font-bold uppercase tracking-wide ${labelClasses[tone]}`}>
                {label}
            </p>
            <p className="mt-1 truncate text-base font-black sm:text-lg">
                {value}
            </p>
        </div>
    );
}

export default DetalleBaseApiModal;