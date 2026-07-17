// src/components/modals-cotizaciones/GenerarPDFModal.tsx
import React, { useEffect, useState } from "react";
import { Modal, Button } from "antd";
import {
    FilePdfOutlined,
    DownloadOutlined,
    EyeOutlined,
} from "@ant-design/icons";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import type { CotizacionGestioo } from "./types";

import {
    PDF_ORIGEN_DATA,
    getPdfOrigenInfo,
    normalizarPdfOrigen,
    type PdfOrigenKey,
} from "../modals-gestioo/pdfOrigen";

interface GenerarPDFModalProps {
    show: boolean;
    onClose: () => void;
    cotizacion: CotizacionGestioo | null;
    onPreviewPDF?: (url: string) => void;
}

/* =====================================================
   HELPER PDF AISLADO EN IFRAME
   Evita que html.a11y-theme-dark afecte la captura.
===================================================== */

const PDF_IFRAME_LIGHT_CSS = `
    html,
    body {
        margin: 0 !important;
        padding: 0 !important;
        width: 874px !important;
        background: #ffffff !important;
        background-color: #ffffff !important;
        color: #111827 !important;
        color-scheme: light !important;
    }

    *,
    *::before,
    *::after {
        box-sizing: border-box !important;
        color-scheme: light !important;
    }

    body,
    div,
    section,
    article,
    table,
    thead,
    tbody,
    tfoot,
    tr {
        background-color: transparent;
    }

    body {
        background: #ffffff !important;
    }

    .container {
        background: #ffffff !important;
        background-color: #ffffff !important;
        color: #111827 !important;
    }

    p,
    span,
    div,
    label,
    li,
    td,
    th,
    h1,
    h2,
    h3,
    h4,
    h5,
    h6,
    b,
    strong {
        color: inherit;
    }

    table {
        background: #ffffff !important;
        background-color: #ffffff !important;
    }

    thead,
    thead tr,
    thead th {
        background: #e9ecef !important;
        background-color: #e9ecef !important;
        color: #111827 !important;
    }

    tbody tr,
    tbody td {
        background: #ffffff !important;
        background-color: #ffffff !important;
        color: #111827 !important;
    }

    tfoot tr,
    tfoot td {
        background: #f8fafc !important;
        background-color: #f8fafc !important;
        color: #111827 !important;
    }

    img {
        background: transparent !important;
    }
`;

async function esperarImagenes(element: HTMLElement) {
    const images = Array.from(element.querySelectorAll("img"));

    await Promise.all(
        images.map(
            (img) =>
                new Promise<void>((resolve) => {
                    if (img.complete) {
                        resolve();
                        return;
                    }

                    img.onload = () => resolve();

                    img.onerror = () => {
                        img.src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='90' height='90' viewBox='0 0 90 90'%3E%3Crect width='90' height='90' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%236b7280' font-size='10'%3ESin imagen%3C/text%3E%3C/svg%3E";
                        resolve();
                    };

                    window.setTimeout(resolve, 5000);
                })
        )
    );

    await new Promise((resolve) => window.setTimeout(resolve, 300));
}

async function crearIframePdfCotizacion(html: string) {
    const iframe = document.createElement("iframe");

    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "0";
    iframe.style.width = "874px";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.background = "#ffffff";
    iframe.style.backgroundColor = "#ffffff";
    iframe.style.pointerEvents = "none";
    iframe.style.zIndex = "-1";

    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;

    if (!doc) {
        iframe.remove();
        throw new Error("No se pudo crear el documento temporal para generar el PDF.");
    }

    doc.open();
    doc.write(html);
    doc.close();

    doc.documentElement.classList.remove("a11y-theme-dark");
    doc.documentElement.style.background = "#ffffff";
    doc.documentElement.style.backgroundColor = "#ffffff";
    doc.documentElement.style.colorScheme = "light";

    if (doc.body) {
        doc.body.classList.remove("a11y-theme-dark");
        doc.body.style.background = "#ffffff";
        doc.body.style.backgroundColor = "#ffffff";
        doc.body.style.color = "#111827";
    }

    const base = doc.createElement("base");
    base.href = `${window.location.origin}/`;
    doc.head.prepend(base);

    const style = doc.createElement("style");
    style.setAttribute("data-pdf-iframe-light", "true");
    style.textContent = PDF_IFRAME_LIGHT_CSS;
    doc.head.appendChild(style);

    await new Promise<void>((resolve) => {
        iframe.onload = () => resolve();
        window.setTimeout(resolve, 500);
    });

    const element = doc.body;

    if (!element) {
        iframe.remove();
        throw new Error("No se pudo preparar el contenido del PDF.");
    }

    await esperarImagenes(element);

    return {
        iframe,
        element,
    };
}

/* =====================================================
   MODAL
===================================================== */

const GenerarPDFModal: React.FC<GenerarPDFModalProps> = ({
    show,
    onClose,
    cotizacion,
    onPreviewPDF,
}) => {
    const [generating, setGenerating] = useState(false);
    const [mostrarTotales, setMostrarTotales] = useState(true);

    const [origenPdf, setOrigenPdf] = useState<PdfOrigenKey>(
        normalizarPdfOrigen(cotizacion?.entidad?.origen ?? "RIDS")
    );

    useEffect(() => {
        if (cotizacion) {
            setOrigenPdf(normalizarPdfOrigen(cotizacion.entidad?.origen ?? "RIDS"));
        }
    }, [cotizacion]);

    const handleGenerarPDF = async (previewMode = false) => {
        if (!cotizacion) return;

        setGenerating(true);

        try {
            const pdf = await generarPDF(cotizacion, mostrarTotales, origenPdf);

            if (previewMode && onPreviewPDF) {
                const blob = pdf.output("blob");
                const url = URL.createObjectURL(blob);

                onPreviewPDF(url);
                onClose();
                return;
            }

            const codigo = `COT-${String(cotizacion.id).padStart(6, "0")}`;

            const entidadNombre =
                cotizacion.entidad?.nombre
                    ?.replace(/[^a-zA-Z0-9-_ ]/g, "")
                    ?.replace(/\s+/g, "_") || "Sin_Entidad";

            pdf.save(`Cotizacion_${codigo}_${entidadNombre}.pdf`);
            onClose();
        } catch (error) {
            console.error("Error al generar PDF:", error);
        } finally {
            setGenerating(false);
        }
    };

    if (!cotizacion) return null;

    return (
        <Modal
            open={show}
            onCancel={onClose}
            title="Generar PDF"
            footer={null}
            width={400}
        >
            <div className="p-6 text-center">
                <div className="mb-6">
                    <FilePdfOutlined className="mb-4 text-6xl text-red-500" />

                    <h3 className="mb-2 text-lg font-semibold">
                        Cotización #{cotizacion.id}
                    </h3>

                    <p className="text-gray-600">
                        {cotizacion.entidad?.nombre || "Sin cliente"}
                    </p>
                </div>

                <div className="mb-5 flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                    <input
                        type="checkbox"
                        id="mostrarTotales"
                        checked={mostrarTotales}
                        onChange={(e) => setMostrarTotales(e.target.checked)}
                        className="h-4 w-4 cursor-pointer"
                    />

                    <label
                        htmlFor="mostrarTotales"
                        className="cursor-pointer select-none text-sm text-gray-700"
                    >
                        Mostrar precios y totales
                    </label>
                </div>

                <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left">
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                        Empresa emisora del PDF
                    </label>

                    <select
                        value={origenPdf}
                        onChange={(e) => setOrigenPdf(e.target.value as PdfOrigenKey)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    >
                        <option value="RIDS">{PDF_ORIGEN_DATA.RIDS.nombre}</option>
                        <option value="ECONNET">{PDF_ORIGEN_DATA.ECONNET.nombre}</option>
                        <option value="OTRO">Usar datos del cliente</option>
                    </select>

                    <p className="mt-2 text-xs text-gray-500">
                        Esta opción solo cambia la empresa que aparece como emisora en el PDF.
                    </p>
                </div>

                <div className="space-y-3">
                    <Button
                        type="primary"
                        icon={<EyeOutlined />}
                        loading={generating}
                        onClick={() => handleGenerarPDF(true)}
                        className="h-12 w-full text-base"
                        size="large"
                    >
                        Vista Previa
                    </Button>

                    <Button
                        type="default"
                        icon={<DownloadOutlined />}
                        loading={generating}
                        onClick={() => handleGenerarPDF(false)}
                        className="h-12 w-full text-base"
                        size="large"
                    >
                        Descargar PDF
                    </Button>
                </div>

                <div className="mt-4 text-sm text-gray-500">
                    <p>Se generará un PDF con todos los detalles.</p>
                </div>
            </div>
        </Modal>
    );
};

/* =====================================================
   GENERACIÓN PDF
===================================================== */

const generarPDF = async (
    cot: CotizacionGestioo,
    mostrarTotales = true,
    origenPdf: PdfOrigenKey = "RIDS"
) => {
    async function urlToBase64(url: string | null | undefined): Promise<string | null> {
        try {
            if (!url) return null;

            if (url.startsWith("data:image")) {
                return url;
            }

            const finalUrl = url.startsWith("http")
                ? url
                : `${window.location.origin}${url.startsWith("/") ? url : `/${url}`}`;

            const controller = new AbortController();
            const timeoutId = window.setTimeout(() => controller.abort(), 10000);

            let response: Response;

            try {
                response = await fetch(finalUrl, {
                    signal: controller.signal,
                    mode: "cors",
                    cache: "no-cache",
                    headers: { Accept: "image/*" },
                });
            } catch {
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(
                    finalUrl
                )}`;

                response = await fetch(proxyUrl, {
                    signal: controller.signal,
                    cache: "no-cache",
                });
            }

            window.clearTimeout(timeoutId);

            if (!response.ok) {
                console.warn("No se pudo cargar la imagen:", finalUrl, response.status);
                return null;
            }

            const blob = await response.blob();

            if (blob.size === 0) {
                console.warn("Blob vacío para imagen:", finalUrl);
                return null;
            }

            return await new Promise<string | null>((resolve) => {
                const reader = new FileReader();

                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.warn("Error convirtiendo imagen a base64:", url, error);
            return null;
        }
    }

    if (!cot) {
        throw new Error("No hay datos de cotización");
    }

    if (!cot.items || cot.items.length === 0) {
        throw new Error("No hay items en esta cotización para generar el PDF");
    }

    const fechaActual = new Date().toLocaleString("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

    const codigo = `COT-${String(cot.id).padStart(6, "0")}`;

    const origenInfo = getPdfOrigenInfo(origenPdf, {
        nombre: cot.entidad?.nombre,
        direccion: cot.entidad?.direccion,
        correo: cot.entidad?.correo,
        telefono: cot.entidad?.telefono,
        rut: cot.entidad?.rut,
    });

    const imagenesCache = new Map<string, string | null>();

    const obtenerImagenBase64 = async (
        url: string | null | undefined
    ): Promise<string | null> => {
        if (!url) return null;

        if (imagenesCache.has(url)) {
            return imagenesCache.get(url) || null;
        }

        const base64 = await urlToBase64(url);
        imagenesCache.set(url, base64);

        return base64;
    };

    const logoBase64 = await obtenerImagenBase64(origenInfo.logo);
    const logoPdf = logoBase64 || origenInfo.logo;

    const formatPDF = (valorCLP: number) => {
        if (Number.isNaN(valorCLP)) return "$0";

        if (cot.moneda === "USD") {
            const tasa = cot.tasaCambio || 1;
            const usd = valorCLP / tasa;

            return `US$ ${Math.round(usd).toLocaleString("es-CL")}`;
        }

        return `$${Math.round(valorCLP).toLocaleString("es-CL")}`;
    };

    const truncarTexto = (texto: string, maxCaracteres = 250): string => {
        if (!texto) return "";

        const limpio = texto.replace(/\n/g, " ").trim();

        if (limpio.length <= maxCaracteres) return limpio;

        return `${limpio.substring(0, maxCaracteres).trimEnd()}...`;
    };

    const calcularLineaItem = (item: any) => {
        const precio = Number(item.precio) || 0;
        const cantidad = Number(item.cantidad) || 0;
        const porcentaje = item.porcentaje ? Number(item.porcentaje) : 0;

        const base = precio * cantidad;
        const tieneDescuentoValido = item.tieneDescuento && porcentaje > 0;
        const esAdicional = item.tipo === "ADICIONAL";

        const descuentoItem =
            tieneDescuentoValido && !esAdicional ? (base * porcentaje) / 100 : 0;

        const baseConDescuento = base - descuentoItem;
        const ivaMonto = item.tieneIVA && !esAdicional ? baseConDescuento * 0.19 : 0;
        const totalItem = baseConDescuento + ivaMonto;

        return {
            base,
            descuentoItem,
            baseConDescuento,
            ivaMonto,
            totalItem,
            porcentajeMostrar: tieneDescuentoValido ? porcentaje : 0,
            ivaPorcentajeMostrar: item.tieneIVA ? 19 : 0,
        };
    };

    const theadCols = mostrarTotales
        ? `<th style="padding:8px;text-align:center;border:1px solid #dee2e6;">Código</th>
       <th style="padding:8px;text-align:left;border:1px solid #dee2e6;">Nombre</th>
       <th style="padding:8px;text-align:center;border:1px solid #dee2e6;">Cant.</th>
       <th style="padding:8px;text-align:right;border:1px solid #dee2e6;">P.Unitario</th>
       <th style="padding:8px;text-align:right;border:1px solid #dee2e6;">Subtotal</th>
       <th style="padding:8px;text-align:center;border:1px solid #dee2e6;">Desc (%)</th>
       <th style="padding:8px;text-align:right;border:1px solid #dee2e6;">Desc ($)</th>
       <th style="padding:8px;text-align:center;border:1px solid #dee2e6;">IVA (%)</th>
       <th style="padding:8px;text-align:right;border:1px solid #dee2e6;">IVA ($)</th>
       <th style="padding:8px;text-align:right;border:1px solid #dee2e6;">Total</th>`
        : `<th style="padding:8px;text-align:center;border:1px solid #dee2e6;">Código</th>
       <th style="padding:8px;text-align:left;border:1px solid #dee2e6;">Nombre</th>
       <th style="padding:8px;text-align:center;border:1px solid #dee2e6;">Cant.</th>`;

    const buildEquipoDetalle = (item: any) => {
        if (!item.equipo) return "";

        const partes: string[] = [];

        if (item.equipo.serial) {
            partes.push(`<b>Serial:</b> ${item.equipo.serial}`);
        }

        if (item.equipo.marca) {
            partes.push(`<b>Marca:</b> ${item.equipo.marca}`);
        }

        if (item.equipo.modelo) {
            partes.push(`<b>Modelo:</b> ${item.equipo.modelo}`);
        }

        if (partes.length === 0) return "";

        return `
            <div style="margin-top:4px;font-size:9px;color:#1f2937;line-height:1.4;background:#f8fafc;border:1px solid #e5e7eb;border-radius:6px;padding:6px;">
                ${partes.join(" · ")}
            </div>
        `;
    };

    const buildItemRow = (
        item: any,
        valores: ReturnType<typeof calcularLineaItem>
    ) => {
        if (mostrarTotales) {
            return `
                <tr>
                    <td style="padding:8px;text-align:center;vertical-align:top;">${item.sku || ""}</td>
                    <td style="padding:8px;text-align:left;vertical-align:top;">
                        <div style="font-weight:600;font-size:11px;margin-bottom:3px;color:#111827;">
                            ${item.nombre}
                        </div>
                        ${item.descripcion
                    ? `<div style="font-size:9px;color:#4b5563;line-height:1.4;">${truncarTexto(
                        item.descripcion,
                        250
                    )}</div>`
                    : ""
                }
                        ${buildEquipoDetalle(item)}
                    </td>
                    <td style="padding:8px;text-align:center;vertical-align:top;">${item.cantidad}</td>
                    <td style="padding:8px;text-align:right;vertical-align:top;">${formatPDF(Number(item.precio) || 0)}</td>
                    <td style="padding:8px;text-align:right;vertical-align:top;">${formatPDF(valores.base)}</td>
                    <td style="padding:8px;text-align:center;vertical-align:top;">${valores.porcentajeMostrar}%</td>
                    <td style="padding:8px;text-align:right;vertical-align:top;">${formatPDF(valores.descuentoItem)}</td>
                    <td style="padding:8px;text-align:center;vertical-align:top;">${valores.ivaPorcentajeMostrar}%</td>
                    <td style="padding:8px;text-align:right;vertical-align:top;">${formatPDF(valores.ivaMonto)}</td>
                    <td style="padding:8px;text-align:right;vertical-align:top;font-weight:bold;">${formatPDF(valores.totalItem)}</td>
                </tr>
            `;
        }

        return `
            <tr>
                <td style="padding:8px;text-align:center;vertical-align:top;">${item.sku || ""}</td>
                <td style="padding:8px;text-align:left;vertical-align:top;">
                    <div style="font-weight:600;font-size:11px;margin-bottom:3px;color:#111827;">
                        ${item.nombre}
                    </div>
                    ${item.descripcion
                ? `<div style="font-size:9px;color:#4b5563;line-height:1.4;">${truncarTexto(
                    item.descripcion,
                    250
                )}</div>`
                : ""
            }
                    ${buildEquipoDetalle(item)}
                </td>
                <td style="padding:8px;text-align:center;vertical-align:top;">${item.cantidad}</td>
            </tr>
        `;
    };

    let seccionesHtml = "";
    let totalGeneral = 0;

    if (cot.secciones && cot.secciones.length > 0) {
        const seccionesOrdenadas = [...cot.secciones].sort(
            (a, b) => (a.orden || 0) - (b.orden || 0)
        );

        for (const seccion of seccionesOrdenadas) {
            const itemsSeccion = cot.items.filter(
                (item) => item.seccionId === seccion.id
            );

            if (itemsSeccion.length === 0) continue;

            let totalSeccion = 0;

            const itemsHtml = (
                await Promise.all(
                    itemsSeccion.map(async (item) => {
                        const valores = calcularLineaItem(item);
                        totalSeccion += valores.totalItem;

                        return buildItemRow(item, valores);
                    })
                )
            ).join("");

            totalGeneral += totalSeccion;

            seccionesHtml += `
                <div style="margin-bottom:30px;">
                    <div style="background:#f8f9fa;padding:10px 15px;border-radius:6px;margin-bottom:15px;border-left:4px solid #007bff;">
                        <h3 style="margin:0;font-size:18px;font-weight:bold;color:#333;">
                            ${seccion.nombre.toUpperCase()}
                        </h3>
                        ${seccion.descripcion
                    ? `<p style="margin:4px 0 0 0;font-size:14px;color:#666;">${seccion.descripcion}</p>`
                    : ""
                }
                    </div>

                    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
                        <thead>
                            <tr style="background:#e9ecef;">
                                ${theadCols}
                            </tr>
                        </thead>

                        <tbody>
                            ${itemsHtml}
                        </tbody>

                        ${mostrarTotales
                    ? `
                                    <tfoot>
                                        <tr>
                                            <td colspan="9" style="padding:8px;text-align:right;border:1px solid #dee2e6;font-weight:bold;">
    Total ${seccion.nombre}:
</td>
                                            <td style="padding:8px;text-align:right;border:1px solid #dee2e6;font-weight:bold;">
                                                ${formatPDF(totalSeccion)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                  `
                    : ""
                }
                    </table>
                </div>
            `;
        }
    } else {
        const itemsHtml = (
            await Promise.all(
                cot.items.map(async (item) => {
                    const valores = calcularLineaItem(item);
                    totalGeneral += valores.totalItem;

                    return buildItemRow(item, valores);
                })
            )
        ).join("");

        seccionesHtml = `
            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
                <thead>
                    <tr style="background:#e9ecef;">
                        ${theadCols}
                    </tr>
                </thead>

                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
        `;
    }

    const imagenesItemsHtml = (
        await Promise.all(
            cot.items.map(async (item) => {
                const img = await obtenerImagenBase64(item.imagen);

                if (!img) return "";

                return `
                    <img
                        src="${img}"
                        style="width:110px;height:110px;object-fit:cover;border-radius:10px;border:1px solid #ccc;flex-shrink:0;"
                    />
                `;
            })
        )
    ).join("");

    const html = `
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="UTF-8" />
                <title>Cotización ${codigo}</title>

                <style>
                    html,
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 0;
                        background: #ffffff !important;
                        color: #111827 !important;
                        color-scheme: light !important;
                    }

                    body {
                        width: 874px;
                    }

                    * {
                        box-sizing: border-box;
                    }

                    .container {
                        width: 874px;
                        margin: 0 auto;
                        padding: 40px 20px 40px 20px;
                        background: #ffffff !important;
                        color: #111827 !important;
                    }

                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border-bottom: 3px solid #444;
                        padding-bottom: 12px;
                        margin-bottom: 25px;
                        margin-top: 45px;
                        background: #ffffff !important;
                    }

                    .info-section {
                        display: flex;
                        gap: 20px;
                        margin-top: 25px;
                    }

                    .info-box {
                        flex: 1;
                        padding: 14px;
                        border-radius: 10px;
                        font-size: 12px;
                        line-height: 1.45;
                    }

                    .client-info {
                        background: #f7f7f7 !important;
                        border: 1px solid #ddd;
                    }

                    .company-info {
                        background: #eef6ff !important;
                        border: 1px solid #c7ddf8;
                    }

                    .avoid-break {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }

                    .imagenes-contenedor {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }

                    .imagenes-contenedor img {
                        max-height: 90px;
                        object-fit: contain;
                    }

                    h3.section-title {
                        font-size: 20px;
                        font-weight: bold;
                        margin-top: 15px;
                        margin-bottom: 15px;
                        color: #111827 !important;
                    }

                    table {
                        width: 90%;
                        font-size: 9px;
                        background: #ffffff !important;
                    }

                    th,
                    td {
                        border: 1px solid #d0d0d0;
                        line-height: 1.2;
                        font-size: 10px;
                        color: #111827 !important;
                    }

                    thead th {
                        background: #e9ecef !important;
                        border: 1px solid #d0d0d0;
                        font-weight: bold;
                        text-align: center;
                        vertical-align: middle;
                    }

                    tbody tr,
                    tbody td {
                        background: #ffffff !important;
                    }

                    tbody td {
                        border: 1px solid #d0d0d0;
                        padding: 6px 4px;
                        vertical-align: middle !important;
                        text-align: center;
                    }

                    tbody td div {
                        background: transparent;
                    }

                    .total-general {
                        margin-top: 35px;
                        padding: 15px;
                        background: #fff8e1 !important;
                        border: 2px solid #f5c02a;
                        border-radius: 8px;
                        font-size: 18px;
                        font-weight: bold;
                        text-align: right;
                        color: #111827 !important;
                    }

                    .footer-section {
                        display: flex;
                        justify-content: space-between;
                        gap: 40px;
                        margin-top: 100px;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }

                    .payment-info {
                        padding: 20px;
                        border: 1px solid #ccc;
                        border-radius: 10px;
                        background: #fafafa !important;
                        font-size: 13px;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }

                    .comentarios-box {
                        flex: 1;
                        padding: 12px;
                        border: 1px solid #d1d5db;
                        border-radius: 10px;
                        background: #f9fafb !important;
                        font-size: 12px;
                    }

                    .signature {
                        width: 260px;
                        display: flex;
                        justify-content: center;
                        align-items: flex-end;
                        margin: auto;
                    }

                    .signature-line {
                        width: 100%;
                        border-top: 1px solid #000;
                        padding-top: 8px;
                        text-align: center;
                        font-size: 12px;
                    }

                    p {
                        margin-top: 0;
                        margin-bottom: 4px;
                        color: #111827;
                    }
                </style>
            </head>

            <body>
                <div class="container">
                    <div class="header">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <img src="${logoPdf}" style="height:55px;" />

                            <div>
                                <h2 style="margin:0;font-size:20px;color:#111827;">
                                    ${origenInfo.nombre}
                                </h2>

                                <p style="margin:0;font-size:12px;color:#555;line-height:1.4;">
                                    <b>RUT:</b> ${origenInfo.rut}<br />
                                    ${origenInfo.direccion}<br />
                                    ${origenInfo.correo} · ${origenInfo.telefono}
                                </p>
                            </div>
                        </div>

                        <div style="text-align:right;">
                            <p style="margin:0;font-size:11px;color:#4b5563;">
                                Fecha impresión: ${fechaActual}
                            </p>

                            <p style="margin:2px 0 0 0;font-size:11px;color:#4b5563;">
                                Fecha cotización: ${new Date(cot.fecha).toLocaleDateString("es-CL")}
                            </p>

                            <div style="border:1.5px solid #000;padding:6px 14px;min-width:150px;margin-top:6px;">
                                <div style="font-size:11px;font-weight:bold;color:#b91c1c;">
                                    R.U.T.: ${origenInfo.rut}
                                </div>

                                <div style="font-size:11px;font-weight:bold;color:#b91c1c;margin-top:2px;">
                                    COTIZACIÓN
                                </div>

                                <div style="font-size:12px;font-weight:bold;color:#b91c1c;margin-top:4px;">
                                    N° ${codigo}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="info-section">
                        <div class="info-box client-info">
                            <h3 style="margin:0 0 10px 0;color:#111827;">Datos del Cliente</h3>
                            <p><b>Entidad:</b> ${cot.entidad?.nombre ?? "—"}</p>
                            <p><b>RUT:</b> ${cot.entidad?.rut ?? "—"}</p>
                            <p><b>Correo:</b> ${cot.entidad?.correo ?? "—"}</p>
                            <p><b>Teléfono:</b> ${cot.entidad?.telefono ?? "—"}</p>
                            <p><b>Dirección:</b> ${cot.entidad?.direccion ?? "—"}</p>
                        </div>

                        <div class="info-box company-info">
                            <h3 style="margin:0 0 10px 0;color:#111827;">Empresa (Origen)</h3>
                            <p><b>Empresa:</b> ${origenInfo.nombre}</p>
                            <p><b>RUT:</b> ${origenInfo.rut}</p>
                            <p><b>Dirección:</b> ${origenInfo.direccion}</p>
                            <p><b>Correo:</b> ${origenInfo.correo}</p>
                            <p><b>Teléfono:</b> ${origenInfo.telefono}</p>
                        </div>
                    </div>

                    <h3 class="section-title">Detalle de la cotización</h3>

                    ${seccionesHtml}

                    ${mostrarTotales
            ? `
                            <div class="total-general">
                                Total General: ${formatPDF(totalGeneral)}
                            </div>
                          `
            : ""}

                    <div
                        class="imagenes-contenedor avoid-break"
                        style="display:flex;flex-direction:row;gap:12px;margin-top:15px;flex-wrap:nowrap;overflow-x:auto;padding-bottom:10px;"
                    >
                        ${imagenesItemsHtml}
                    </div>

                    <div style="height:60px;"></div>

                    <div class="payment-info avoid-break">
                        <p><b>Pago por transferencia electrónica o depósito</b></p>
                        <p><b>Tiempo de validez:</b> 5 días</p>
                        <p><b>Tiempo de entrega:</b> 5 días hábiles</p>
                        <p>
                            <b>Banco:</b> Itaú ·
                            <b>Cuenta Corriente:</b> 0213150814 ·
                            <b>RUT:</b> 76.758.352-4
                        </p>
                        <p><b>Correo de pagos:</b> pagos@rids.cl</p>
                        <p><b>Notas:</b> Se inicia previa aceptación y abono del 50%.</p>
                    </div>

                    <div class="footer-section avoid-break">
                        <div class="comentarios-box">
                            <h4 style="margin:0 0 8px 0;color:#111827;">
                                Comentarios de la cotización
                            </h4>

                            <p>${cot.comentariosCotizacion || "—"}</p>
                        </div>

                        <div class="signature">
                            <div class="signature-line">Firma y aclaración</div>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    `;

    const { iframe, element } = await crearIframePdfCotizacion(html);

    try {
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: "#ffffff",
            logging: false,
            width: 874,
            windowWidth: 874,
            scrollY: 0,
            scrollX: 0,
            onclone: (clonedDoc) => {
                clonedDoc.documentElement.classList.remove("a11y-theme-dark");
                clonedDoc.documentElement.style.background = "#ffffff";
                clonedDoc.documentElement.style.backgroundColor = "#ffffff";
                clonedDoc.documentElement.style.colorScheme = "light";

                if (clonedDoc.body) {
                    clonedDoc.body.classList.remove("a11y-theme-dark");
                    clonedDoc.body.style.background = "#ffffff";
                    clonedDoc.body.style.backgroundColor = "#ffffff";
                    clonedDoc.body.style.color = "#111827";
                }

                const style = clonedDoc.createElement("style");
                style.textContent = PDF_IFRAME_LIGHT_CSS;
                clonedDoc.head.appendChild(style);

                const clonedImages = clonedDoc.querySelectorAll("img");

                clonedImages.forEach((img) => {
                    if (!img.style.width) img.style.width = "auto";
                    if (!img.style.height) img.style.height = "auto";
                });
            },
        });

        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "pt",
            format: "a4",
        });

        const imgData = canvas.toDataURL("image/jpeg", 0.95);

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        // Evita páginas extra por diferencias mínimas de cálculo/píxeles.
        const margenTolerancia = 8;

        // Calcula páginas necesarias reales.
        const totalPages = Math.max(
            1,
            Math.ceil((pdfHeight - margenTolerancia) / pageHeight)
        );

        for (let page = 0; page < totalPages; page++) {
            if (page > 0) {
                pdf.addPage();
            }

            const position = page * pageHeight;

            pdf.addImage(
                imgData,
                "JPEG",
                0,
                -position,
                pdfWidth,
                pdfHeight
            );
        }

        return pdf;
    } finally {
        if (iframe.parentNode) {
            iframe.parentNode.removeChild(iframe);
        }
    }
};

export default GenerarPDFModal;
export { generarPDF };
