// src/components/modals-facturasBaseapi/pdfDocumento.tsx
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import type { EmpresaKey, TabRCV } from "./types";

import {
    getDocumentoDte,
    getItemsFromDteResponse,
    getXmlBase64FromDteResponse,
    decodeBase64Utf8,
    parseDteXml,
    getItemsVisualesParaPdf,
    getValue,
    getNombreDtePDF,
    getTituloResumenPDF,
    toNumberCL,
    imageUrlToBase64,
    escapeHtml,
    formatCLP,
    formatFechaPDF,
    formatFechaHoraPDF,
    esperarImagenes,
    getNombreArchivoPDF
} from "./utils"

import {
    EMPRESAS_PDF,
} from "./utils";
import type { utils } from "xlsx-js-style";

function extractTimbreFrmtFromXml(xmlRaw: string): string | null {
    if (!xmlRaw) return null;

    try {
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlRaw, "text/xml");

        const all = Array.from(xml.getElementsByTagName("*")) as any[];
        const ted = all.find((el) => el.localName === "TED");

        if (!ted) return null;

        const frmtEl = (Array.from(ted.getElementsByTagName("*")) as any[]).find((el) => el.localName === "FRMT");

        const txt = frmtEl?.textContent?.trim() ?? null;

        return txt || null;
    } catch (err) {
        return null;
    }
}

import {
    prepararContenedorPdf,
    getHtml2CanvasPdfOptions,
} from "../../utils/pdfLightExport";

export async function generarPdfDocumentoSeleccionado(params: {
    documento: any;
    detalleDte: any | null;
    activeTab: TabRCV;
    empresa: EmpresaKey;
    mes: string;
    ano: string;
    autoDownload?: boolean;
    observacion?: string | null;
}): Promise<{
    blob: Blob;
    url: string;
    fileName: string;
}> {
    const autoDownload = params.autoDownload ?? true;

    const { documento, detalleDte, activeTab, empresa, mes, ano } = params;

    const empresaPdf = EMPRESAS_PDF[empresa];

    if (!empresaPdf) {
        throw new Error(`No existe configuración PDF para la empresa: ${empresa}`);
    }

    const dteDocumento = getDocumentoDte(detalleDte);
    const itemsCache = getItemsFromDteResponse(detalleDte);

    const xmlBase64 = getXmlBase64FromDteResponse(detalleDte);
    const xmlDecodificado = decodeBase64Utf8(xmlBase64);
    const dteVisual = parseDteXml(xmlDecodificado);

    const itemsVisuales = getItemsVisualesParaPdf(detalleDte);

    // Intentamos obtener el timbre desde la respuesta del backend o extrayéndolo del XML
    const timbreBase64FromResponse =
        (detalleDte && (
            detalleDte.timbre_base64 ??
            detalleDte.data?.documento?.timbre_base64 ??
            detalleDte.documento?.timbre_base64 ??
            null
        )) ?? null;

    const timbreBase64 = timbreBase64FromResponse || extractTimbreFrmtFromXml(xmlDecodificado);

    const folio =
        dteDocumento?.folio ??
        dteVisual?.idDoc?.folio ??
        getValue(documento, ["Folio", "folio"], "—");

    const tipoDTE =
        dteDocumento?.tipo_dte ??
        dteVisual?.idDoc?.tipoDte ??
        getValue(documento, ["Tipo Doc", "tipoDoc", "tipoDTE", "tipoDocumento"], "—");

    const tipoDTEString = dteDocumento?.tipo_dte_nombre ?? "";
    const tipoDTELabel = getNombreDtePDF(tipoDTE, tipoDTEString);
    const tituloResumen = getTituloResumenPDF(tipoDTE);

    const nombreArchivo = `documento-${empresa}-${activeTab}-${tipoDTE}-${folio}-${ano}-${mes}.pdf`;

    const nombre =
        activeTab === "ventas"
            ? getValue(documento, [
                "Razon Social",
                "Razón Social",
                "Razon Social Receptor",
                "Razón Social Receptor",
                "razonSocial",
                "razonSocialReceptor",
            ])
            : getValue(documento, [
                "Razon Social",
                "Razón Social",
                "Razon Social Proveedor",
                "Razón Social Proveedor",
                "razonSocial",
                "razonSocialProveedor",
            ]);

    const rut =
        activeTab === "ventas"
            ? getValue(documento, [
                "Rut cliente",
                "RUT Cliente",
                "RUT Receptor",
                "Rut Receptor",
                "rutCliente",
                "rutReceptor",
            ])
            : getValue(documento, [
                "RUT Proveedor",
                "Rut Proveedor",
                "rutProveedor",
            ]);

    const fechaDocto =
        dteDocumento?.fecha ??
        dteVisual?.idDoc?.fechaEmision ??
        getValue(documento, ["Fecha Docto", "fechaDocto", "fechaEmision"], "—");

    const fechaRecepcion = getValue(
        documento,
        [
            "Fecha Recepcion",
            "Fecha Recepción",
            "Fecha Recepcion SII",
            "Fecha Recepción SII",
            "fechaRecepcion",
            "fechaRecepcionSii",
        ],
        "—"
    );

    const fechaAcuse = getValue(
        documento,
        ["Fecha Acuse Recibo", "Fecha Acuse", "fechaAcuseRecibo"],
        "—"
    );

    const estado =
        dteDocumento?.estado ??
        getValue(
            documento,
            ["Estado", "estado", "Estado Documento", "estadoDocumento"],
            "—"
        );

    const tipoVenta = getValue(
        documento,
        ["Tipo Venta", "Tipo Compra", "tipoVenta", "tipoCompra"],
        activeTab === "ventas" ? "Del Giro" : "Compra"
    );

    const montoExento = toNumberCL(
        dteVisual?.totales?.montoExento ||
        getValue(documento, ["Monto Exento", "montoExento"], 0)
    );

    const montoNeto = toNumberCL(
        dteVisual?.totales?.montoNeto ||
        getValue(documento, ["Monto Neto", "montoNeto"], 0)
    );

    const montoIva = toNumberCL(
        dteVisual?.totales?.iva ||
        getValue(
            documento,
            ["Monto IVA", "Monto Iva", "Monto IVA Recuperable", "montoIva", "montoIVA"],
            0
        )
    );

    const montoTotal = toNumberCL(
        dteVisual?.totales?.montoTotal ||
        getValue(documento, ["Monto total", "Monto Total", "montoTotal"], 0)
    );

    const logoBase64 = empresaPdf.logo
        ? await imageUrlToBase64(empresaPdf.logo)
        : "";

    const logoHtml = logoBase64
        ? `<img src="${logoBase64}" class="empresa-logo" />`
        : `<div class="logo-placeholder">${escapeHtml(empresaPdf.nombre.slice(0, 1))}</div>`;

    const detalleHtml =
        itemsVisuales.length > 0
            ? itemsVisuales
                .map((item: any, index: number) => {
                    const nombreItem = item.nombre || `Ítem ${index + 1}`;
                    const descripcionItem = item.descripcion || "";
                    const cantidadItem = [item.cantidad, item.unidad].filter(Boolean).join(" ");
                    const precioItem = item.precio ?? 0;
                    const montoItem = item.monto ?? 0;

                    return `
                    <tr>
                        <td style="width:8%; text-align:center;">
                            ${escapeHtml(item.nroLinDet || index + 1)}
                        </td>
                        <td style="width:52%;">
                            <b>${escapeHtml(nombreItem)}</b>
                            ${descripcionItem
                            ? `<br><span class="item-desc">${escapeHtml(descripcionItem)}</span>`
                            : ""
                        }
                            ${item.codigo
                            ? `<br><span class="item-meta">Código: ${escapeHtml(item.codigo)}</span>`
                            : ""
                        }
                        </td>
                        <td style="width:13%; text-align:right;">
                            ${escapeHtml(cantidadItem || "—")}
                        </td>
                        <td style="width:13%; text-align:right;">
                            ${escapeHtml(formatCLP(precioItem))}
                        </td>
                        <td style="width:14%;" class="text-right">
                            ${escapeHtml(formatCLP(montoItem))}
                        </td>
                    </tr>
                `;
                })
                .join("")
            : `
            <tr>
                <td colspan="5" style="text-align:center; color:#6b7280;">
                    No se encontraron ítems reales en el XML del DTE.
                </td>
            </tr>
        `;

    // Observación por defecto: vacía. Puede ser provista por quien genera el PDF (por ejemplo, el modal Recordatorio).
    const observacion = params.observacion ?? "";

    const fechaImpresion = new Date().toLocaleString("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });

    const tituloContraparte = activeTab === "ventas"
        ? "Datos del Cliente"
        : "Datos del Proveedor";

    const receptorVisual = dteVisual?.receptor;

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
    * { box-sizing: border-box; }

    body {
        margin: 0;
        background: #fff;
        color: #111827;
        font-family: Arial, Helvetica, sans-serif;
    }

    .page {
    width: 794px;
    min-height: 1123px;
    padding: 38px 54px 28px 54px;
    background: #fff;
}

    .header {
    display: grid;
    grid-template-columns: 1fr 230px;
    column-gap: 20px;
    align-items: start;
}

    .empresa {
    display: flex;
    gap: 12px;
    align-items: center;
    padding-top: 10px;
}

.empresa-logo {
    width: 115px;
    height: 55px;
    object-fit: contain;
}

    .logo-placeholder {
        width: 90px;
        height: 58px;
        border-radius: 50%;
        border: 2px solid #38bdf8;
        color: #0891b2;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        font-weight: bold;
    }

    .empresa-nombre {
    font-size: 15px;
    font-weight: bold;
    letter-spacing: .2px;
    margin-bottom: 2px;
}

.empresa-meta {
    font-size: 9.5px;
    line-height: 1.3;
    color: #374151;
}

    .fechas {
    text-align: right;
    font-size: 9.5px;
    color: #374151;
    margin-bottom: 8px;
}

.sii-box {
    border: 2.4px solid #111827;
    padding: 10px 12px 9px 12px;
    text-align: center;
    color: #c43a3a;
    font-weight: bold;
    min-height: 92px;
}

.sii-rut {
    font-size: 12px;
    margin-bottom: 8px;
}

.sii-tipo {
    font-size: 12.5px;
    line-height: 1.18;
    margin-bottom: 8px;
}

.sii-folio {
    font-size: 13px;
    margin-bottom: 5px;
}

.sii-label {
    font-size: 10px;
    letter-spacing: 1.2px;
}

    .divider {
    border: 0;
    border-top: 2px solid #444;
    margin: 14px 0 18px 0;
}

.title {
    font-size: 16px;
    letter-spacing: .2px;
    font-weight: 500;
    margin: 0 0 12px 0;
}

    .cards {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 14px;
        margin-bottom: 31px;
    }

    .card {
        border: 1px solid #d7d7d7;
        border-radius: 8px;
        padding: 17px 15px;
        min-height: 158px;
        font-size: 12px;
        line-height: 1.45;
    }

    .card.blue {
        background: #eef6ff;
        border-color: #c7dff6;
    }

    .card.gray {
        background: #fafafa;
    }

    .card-title {
        font-weight: normal;
        font-size: 12px;
        margin-bottom: 10px;
    }

    .row {
        margin: 1px 0;
    }
   
.section-title {
    font-size: 15px;
    font-weight: 500;
    margin: 0 0 8px 0;
}

    table {
        width: 100%;
        border-collapse: collapse;
        font-size: 10px;
    }

    th {
        background: #e9ecef;
        border: 1px solid #cfd4da;
        text-align: center;
        padding: 8px;
        font-weight: bold;
    }

    td {
        border: 1px solid #d8d8d8;
        padding: 8px 10px;
        vertical-align: top;
    }

    .text-right {
        text-align: right;
        font-weight: bold;
    }

    .item-desc {
        font-size: 9px;
        color: #555;
    }

    .item-meta {
        font-size: 9px;
        color: #777;
    }

    .totales {
        width: 290px;
        margin-left: auto;
        margin-top: 19px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        overflow: hidden;
        font-size: 12px;
    }

    .totales-row {
        display: flex;
        justify-content: space-between;
        padding: 12px 14px;
        border-bottom: 1px solid #e5e7eb;
    }

    .totales-row:last-child {
        border-bottom: none;
        background: #fff8d8;
        font-size: 14px;
        font-weight: bold;
    }

    .observaciones {
        margin-top: 37px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        background: #fafafa;
        padding: 13px 14px;
        font-size: 12px;
        line-height: 1.35;
    }

    .footer {
        margin-top: 22px;
        text-align: right;
        color: #6b7280;
        font-size: 10px;
    }

    .timbre {
        position: absolute;
        left: 54px;
        bottom: 90px;
    }

    .timbre-img {
        width: 160px;
        height: auto;
        object-fit: contain;
        border: 1px solid #e5e7eb;
        background: #ffffff;
        padding: 6px;
    }
</style>
</head>
<body>
<div class="page">
    <div class="header">
        <div class="empresa">
            ${logoHtml}
            <div>
                <div class="empresa-nombre">${escapeHtml(empresaPdf.nombre)}</div>
                <div class="empresa-meta">
                    RUT: ${escapeHtml(empresaPdf.rut)}<br />
                    ${escapeHtml(empresaPdf.direccion)}<br />
                    ${escapeHtml(empresaPdf.correo)}${empresaPdf.telefono ? ` · ${escapeHtml(empresaPdf.telefono)}` : ""}
                </div>
            </div>
        </div>

        <div>
            <div class="fechas">
                Fecha impresión: ${escapeHtml(fechaImpresion)}<br />
                Fecha emisión: ${escapeHtml(formatFechaPDF(fechaDocto))}
            </div>

            <div class="sii-box">
                <div class="sii-rut">R.U.T.: ${escapeHtml(empresaPdf.rut)}</div>
                <div class="sii-tipo">${escapeHtml(tipoDTELabel)}</div>
                <div class="sii-folio">N° ${escapeHtml(folio)}</div>
                <div class="sii-label">S.I.I.</div>
            </div>
        </div>
    </div>

    <hr class="divider" />

    <h1 class="title">${escapeHtml(tituloResumen)}</h1>

    <div class="cards">
        <div class="card gray">
            <div class="card-title">${escapeHtml(tituloContraparte)}</div>
            <div class="row"><b>Razón social:</b> ${escapeHtml(nombre)}</div>
            <div class="row"><b>RUT:</b> ${escapeHtml(rut)}</div>
            <div class="row"><b>Giro:</b> ${escapeHtml(receptorVisual?.giro || "—")}</div>
            <div class="row"><b>Dirección:</b> ${escapeHtml(receptorVisual?.direccion || "—")}</div>
            <div class="row"><b>Comuna:</b> ${escapeHtml(receptorVisual?.comuna || "—")}</div>
            <div class="row"><b>Ciudad:</b> ${escapeHtml(receptorVisual?.ciudad || "—")}</div>
        </div>

       <div class="card blue">
    <div class="card-title">Datos del Documento</div>
    <div class="row"><b>Tipo DTE:</b> ${escapeHtml(tipoDTELabel)}</div>
    <div class="row"><b>Tipo operación:</b> ${escapeHtml(tipoVenta)}</div>
    <div class="row"><b>Folio:</b> ${escapeHtml(folio)}</div>
    <div class="row"><b>Estado:</b> ${escapeHtml(estado)}</div>
    <div class="row"><b>Fecha emisión:</b> ${escapeHtml(formatFechaPDF(fechaDocto))}</div>
    <div class="row"><b>Recepción SII:</b> ${escapeHtml(formatFechaHoraPDF(fechaRecepcion))}</div>
    <div class="row"><b>Acuse de recibo:</b> ${escapeHtml(formatFechaPDF(fechaAcuse))}</div>
</div>
    </div>

   <h2 class="section-title">Resumen del documento</h2>

<table>
    <thead>
        <tr>
            <th style="width:8%;">#</th>
            <th style="width:52%;">Descripción</th>
            <th style="width:13%;">Cantidad</th>
            <th style="width:13%;">Precio</th>
            <th style="width:14%;">Total</th>
        </tr>
    </thead>
    <tbody>
        ${detalleHtml}
    </tbody>
</table>
        </thead>
    </table>

    <div class="totales">
        <div class="totales-row">
            <span>Exento</span>
            <span>${escapeHtml(formatCLP(montoExento))}</span>
        </div>
        <div class="totales-row">
            <span>Neto</span>
            <span>${escapeHtml(formatCLP(montoNeto))}</span>
        </div>
        <div class="totales-row">
            <span>IVA</span>
            <span>${escapeHtml(formatCLP(montoIva))}</span>
        </div>
        <div class="totales-row">
            <span>Total</span>
            <span>${escapeHtml(formatCLP(montoTotal))}</span>
        </div>
    </div>

    <div class="observaciones">
        <div style="margin-bottom:4px;">Observaciones</div>
        ${escapeHtml(observacion)}
    </div>
    <div class="timbre">
        ${timbreBase64 ? `<img src="data:image/png;base64,${timbreBase64}" class="timbre-img"/>` : ``}
    </div>

    <div class="footer">
        Documento generado automáticamente desde el módulo de facturación.
    </div>
</div>
</body>
</html>
`;

    const container = document.createElement("div");

    try {
        container.innerHTML = html;
        prepararContenedorPdf(container, "794px");

        document.body.appendChild(container);

        await esperarImagenes(container);

        const canvas = await html2canvas(
            container,
            getHtml2CanvasPdfOptions({
                scale: 3,
                useCORS: true,
                allowTaint: true,
                backgroundColor: "#ffffff",
                logging: false,
                imageTimeout: 0,
                width: container.scrollWidth,
                height: container.scrollHeight,
                windowWidth: container.scrollWidth,
            })
        );

        const imgData = canvas.toDataURL("image/jpeg", 0.96);

        const pdf = new jsPDF("p", "mm", "a4");

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const pdfMargin = 6;
        const printableWidth = pdfWidth - pdfMargin * 2;
        const printableHeight = pageHeight - pdfMargin * 2;

        const imgProps = pdf.getImageProperties(imgData);
        const pdfHeight = (imgProps.height * printableWidth) / imgProps.width;

        let remainingHeight = pdfHeight;
        let sourceY = 0;

        while (remainingHeight > 0) {
            if (sourceY > 0) pdf.addPage();

            pdf.addImage(
                imgData,
                "JPEG",
                pdfMargin,
                pdfMargin - sourceY,
                printableWidth,
                pdfHeight
            );

            remainingHeight -= printableHeight;
            sourceY += printableHeight;
        }

        const blob = pdf.output("blob");
        const url = URL.createObjectURL(blob);

        if (autoDownload) {
            pdf.save(nombreArchivo);
        }

        return {
            blob,
            url,
            fileName: nombreArchivo,
        };
    } finally {
        if (container.parentNode) {
            container.parentNode.removeChild(container);
        }
    }
}