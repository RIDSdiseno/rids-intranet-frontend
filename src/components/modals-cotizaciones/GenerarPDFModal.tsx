// components/modals/GenerarPDFModal.tsx
import React, { useState } from 'react';
import { Modal, Button } from 'antd';
import { FilePdfOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import type { CotizacionGestioo } from './types';

interface GenerarPDFModalProps {
    show: boolean;
    onClose: () => void;
    cotizacion: CotizacionGestioo | null;
    onPreviewPDF?: (url: string) => void;
}

const GenerarPDFModal: React.FC<GenerarPDFModalProps> = ({
    show,
    onClose,
    cotizacion,
    onPreviewPDF
}) => {
    const [generating, setGenerating] = useState(false);
    const [mostrarTotales, setMostrarTotales] = useState(true);

    const handleGenerarPDF = async (previewMode = false) => {
        if (!cotizacion) return;

        setGenerating(true);
        try {
            const pdf = await generarPDF(cotizacion, previewMode, mostrarTotales);

            if (previewMode && pdf && onPreviewPDF) {
                const blob = pdf.output('blob');
                const url = URL.createObjectURL(blob);
                onPreviewPDF(url);
                onClose();
            } else if (pdf && !previewMode) {
                const codigo = `COT-${String(cotizacion.id).padStart(6, "0")}`;

                const entidadNombre = cotizacion.entidad?.nombre
                    ?.replace(/[^a-zA-Z0-9-_ ]/g, "")
                    ?.replace(/\s+/g, "_")
                    || "Sin_Entidad";

                pdf.save(`Cotizacion_${codigo}_${entidadNombre}.pdf`);
                onClose();
            }

        } catch (error) {
            console.error('Error al generar PDF:', error);
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
            <div className="text-center p-6">
                <div className="mb-6">
                    <FilePdfOutlined className="text-6xl text-red-500 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                        Cotización #{cotizacion.id}
                    </h3>
                    <p className="text-gray-600">
                        {cotizacion.entidad?.nombre || 'Sin cliente'}
                    </p>
                </div>

                {/* Opción mostrar totales */}
                <div className="mb-5 flex items-center justify-center gap-2 bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                    <input
                        type="checkbox"
                        id="mostrarTotales"
                        checked={mostrarTotales}
                        onChange={(e) => setMostrarTotales(e.target.checked)}
                        className="w-4 h-4 cursor-pointer"
                    />
                    <label htmlFor="mostrarTotales" className="text-sm text-gray-700 cursor-pointer select-none">
                        Mostrar precios y totales
                    </label>
                </div>

                <div className="space-y-3">
                    <Button
                        type="primary"
                        icon={<EyeOutlined />}
                        loading={generating}
                        onClick={() => handleGenerarPDF(true)}
                        className="w-full h-12 text-base"
                        size="large"
                    >
                        Vista Previa
                    </Button>

                    <Button
                        type="default"
                        icon={<DownloadOutlined />}
                        loading={generating}
                        onClick={() => handleGenerarPDF(false)}
                        className="w-full h-12 text-base"
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

// ================================
// FUNCIÓN PRINCIPAL DE GENERACIÓN
// ================================
const generarPDF = async (cot: CotizacionGestioo, returnAsBlob = false, mostrarTotales = true) => {

    async function urlToBase64(url: string | null): Promise<string | null> {
        try {
            if (!url || !url.startsWith('http')) {
                console.warn("URL de imagen inválida:", url);
                return null;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            let response;

            try {
                response = await fetch(url, {
                    signal: controller.signal,
                    mode: 'cors',
                    cache: 'no-cache',
                    headers: { 'Accept': 'image/*' }
                });
            } catch (corsError) {
                console.log("CORS falló, intentando sin CORS...");
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
                response = await fetch(proxyUrl, {
                    signal: controller.signal,
                    cache: 'no-cache'
                });
            }

            clearTimeout(timeoutId);

            if (!response || !response.ok) {
                console.warn("No se pudo cargar la imagen:", url, response?.status);
                return null;
            }

            const blob = await response.blob();
            if (blob.size === 0) {
                console.warn("Blob vacío para imagen:", url);
                return null;
            }

            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = () => {
                    console.warn("Error leyendo blob");
                    resolve(null);
                };
                reader.readAsDataURL(blob);
            });

        } catch (error) {
            console.warn("Error en urlToBase64 para:", url, error);
            return null;
        }
    }

    if (!cot) throw new Error("No hay datos de cotización");
    if (!cot.items || cot.items.length === 0) throw new Error("No hay items en esta cotización para generar el PDF");

    const fechaActual = new Date().toLocaleString("es-CL", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: false
    });

    const codigo = `COT-${String(cot.id).padStart(6, "0")}`;

    type OrigenGestiooLocal = "RIDS" | "ECONNET" | "OTRO";

    const ORIGEN_DATA: Record<OrigenGestiooLocal, {
        nombre: string; direccion: string; correo: string;
        telefono: string; logo: string; rut: string;
    }> = {
        RIDS: {
            nombre: "RIDS LTDA",
            direccion: "Santiago - Providencia, La Concepción 65",
            correo: "soporte@rids.cl",
            telefono: "+56 9 8823 1976",
            rut: "76.758.352-4",
            logo: "/img/splash.png",
        },
        ECONNET: {
            nombre: "ECONNET SPA",
            direccion: "Santiago - Providencia, La Concepción 65",
            correo: "ventas@econnet.cl",
            telefono: "+56 9 8807 6593",
            rut: "76.758.352-4",
            logo: "/img/ecconetlogo.png",
        },
        OTRO: {
            nombre: cot.entidad?.nombre ?? "Empresa",
            direccion: cot.entidad?.direccion ?? "",
            correo: cot.entidad?.correo ?? "",
            telefono: cot.entidad?.telefono ?? "",
            rut: cot.entidad?.rut ?? "",
            logo: "/img/splash.png",
        },
    };

    const origen = (cot.entidad?.origen ?? "OTRO") as OrigenGestiooLocal;
    const origenInfo = ORIGEN_DATA[origen];

    const formatPDF = (valorCLP: number) => {
        if (isNaN(valorCLP)) return "$0";
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
        return limpio.substring(0, maxCaracteres).trimEnd() + "...";
    };

    const calcularLineaItem = (item: any) => {
        const precio = Number(item.precio) || 0;
        const cantidad = Number(item.cantidad) || 0;
        const porcentaje = item.porcentaje ? Number(item.porcentaje) : 0;
        const base = precio * cantidad;
        const tieneDescuentoValido = item.tieneDescuento && porcentaje > 0;
        const esAdicional = item.tipo === "ADICIONAL";
        const descuentoItem = tieneDescuentoValido && !esAdicional ? (base * porcentaje) / 100 : 0;
        const baseConDescuento = base - descuentoItem;
        const ivaMonto = item.tieneIVA && !esAdicional ? baseConDescuento * 0.19 : 0;
        const totalItem = baseConDescuento + ivaMonto;
        return {
            base, descuentoItem, baseConDescuento, ivaMonto, totalItem,
            porcentajeMostrar: tieneDescuentoValido ? porcentaje : 0,
            ivaPorcentajeMostrar: item.tieneIVA ? 19 : 0,
        };
    };

    const imagenesCache = new Map<string, string | null>();

    const obtenerImagenBase64 = async (url: string | null | undefined): Promise<string | null> => {
        if (!url) return null;
        if (imagenesCache.has(url)) return imagenesCache.get(url) || null;
        const base64 = await urlToBase64(url ?? null);
        imagenesCache.set(url, base64);
        return base64;
    };

    // ================================
    // COLUMNAS DINÁMICAS según mostrarTotales
    // ================================
    const theadCols = mostrarTotales
        ? `<th style="padding:8px;text-align:center; border:1px solid #dee2e6;">Código</th>
           <th style="padding:8px;text-align:left; border:1px solid #dee2e6;">Nombre</th>
           <th style="padding:8px;text-align:right; border:1px solid #dee2e6;">P.Unitario</th>
           <th style="padding:8px;text-align:center; border:1px solid #dee2e6;">Cant.</th>
           <th style="padding:8px;text-align:center; border:1px solid #dee2e6;">Desc (%)</th>
           <th style="padding:8px;text-align:right; border:1px solid #dee2e6;">Desc ($)</th>
           <th style="padding:8px;text-align:center; border:1px solid #dee2e6;">IVA (%)</th>
           <th style="padding:8px;text-align:right; border:1px solid #dee2e6;">IVA ($)</th>
           <th style="padding:8px;text-align:right; border:1px solid #dee2e6;">Total</th>`
        : `<th style="padding:8px;text-align:center; border:1px solid #dee2e6;">Código</th>
           <th style="padding:8px;text-align:left; border:1px solid #dee2e6;">Nombre</th>
           <th style="padding:8px;text-align:center; border:1px solid #dee2e6;">Cant.</th>`;

    const buildItemRow = (item: any, valores: ReturnType<typeof calcularLineaItem>) => {
        if (mostrarTotales) {
            return `
<tr>
    <td style="padding:8px;text-align:center;vertical-align:top;">${item.sku || ""}</td>
    <td style="padding:8px;text-align:left;vertical-align:top;">
        <div style="font-weight:600;font-size:11px;margin-bottom:3px;">${item.nombre}</div>
        ${item.descripcion ? `<div style="font-size:9px;color:#666;line-height:1.4;">${truncarTexto(item.descripcion, 250)}</div>` : ""}
    </td>
    <td style="padding:8px;text-align:right;vertical-align:top;">${formatPDF(Number(item.precio) || 0)}</td>
    <td style="padding:8px;text-align:center;vertical-align:top;">${item.cantidad}</td>
    <td style="padding:8px;text-align:center;vertical-align:top;">${valores.porcentajeMostrar}%</td>
    <td style="padding:8px;text-align:right;vertical-align:top;">${formatPDF(valores.descuentoItem)}</td>
    <td style="padding:8px;text-align:center;vertical-align:top;">${valores.ivaPorcentajeMostrar}%</td>
    <td style="padding:8px;text-align:right;vertical-align:top;">${formatPDF(valores.ivaMonto)}</td>
    <td style="padding:8px;text-align:right;vertical-align:top;font-weight:bold;">${formatPDF(valores.totalItem)}</td>
</tr>`;
        } else {
            return `
<tr>
    <td style="padding:8px;text-align:center;vertical-align:top;">${item.sku || ""}</td>
    <td style="padding:8px;text-align:left;vertical-align:top;">
        <div style="font-weight:600;font-size:11px;margin-bottom:3px;">${item.nombre}</div>
        ${item.descripcion ? `<div style="font-size:9px;color:#666;line-height:1.4;">${truncarTexto(item.descripcion, 250)}</div>` : ""}
    </td>
    <td style="padding:8px;text-align:center;vertical-align:top;">${item.cantidad}</td>
</tr>`;
        }
    };

    // ================================
    // PROCESAR SECCIONES
    // ================================
    let seccionesHtml = "";
    let totalGeneral = 0;

    if (cot.secciones && cot.secciones.length > 0) {
        const seccionesOrdenadas = [...cot.secciones].sort((a, b) => (a.orden || 0) - (b.orden || 0));

        for (const seccion of seccionesOrdenadas) {
            const itemsSeccion = cot.items.filter((item) => item.seccionId === seccion.id);
            if (itemsSeccion.length === 0) continue;

            let totalSeccion = 0;

            const itemsHtmlPromises = itemsSeccion.map(async (item) => {
                const valores = calcularLineaItem(item);
                totalSeccion += valores.totalItem;
                return buildItemRow(item, valores);
            });

            const itemsHtml = (await Promise.all(itemsHtmlPromises)).join("");
            totalGeneral += totalSeccion;

            seccionesHtml += `
<div style="margin-bottom: 30px;">
    <div style="background:#f8f9fa; padding:10px 15px; border-radius:6px; margin-bottom:15px; border-left:4px solid #007bff;">
        <h3 style="margin:0; font-size:18px; font-weight:bold; color:#333;">${seccion.nombre.toUpperCase()}</h3>
        ${seccion.descripcion ? `<p style="margin:4px 0 0 0; font-size:14px; color:#666;">${seccion.descripcion}</p>` : ""}
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:13px; margin-bottom:20px;">
        <thead>
            <tr style="background:#e9ecef;">
                ${theadCols}
            </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
        ${mostrarTotales ? `
        <tfoot>
            <tr>
                <td colspan="8" style="padding:8px; text-align:right; border:1px solid #dee2e6; font-weight:bold;">
                    Total ${seccion.nombre}:
                </td>
                <td style="padding:8px; text-align:right; border:1px solid #dee2e6; font-weight:bold;">
                    ${formatPDF(totalSeccion)}
                </td>
            </tr>
        </tfoot>` : ""}
    </table>
</div>`;
        }
    } else {
        const itemsHtmlPromises = cot.items.map(async (item) => {
            const valores = calcularLineaItem(item);
            totalGeneral += valores.totalItem;
            return buildItemRow(item, valores);
        });

        const itemsHtml = (await Promise.all(itemsHtmlPromises)).join("");

        seccionesHtml = `
<table style="width:100%;border-collapse:collapse;font-size:13px; margin-bottom:20px;">
    <thead>
        <tr style="background:#e9ecef;">
            ${theadCols}
        </tr>
    </thead>
    <tbody>${itemsHtml}</tbody>
</table>`;
    }

    // ================================
    // HTML COMPLETO
    // ================================
    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Cotización ${codigo}</title>
<style>
    body { font-family: Arial, sans-serif; margin: 40px 20px 20px 20px; color: #000; }
    .container { width: 874px; margin: 0 auto; padding-bottom: 40px; }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #444; padding-bottom: 12px; margin-bottom: 25px; margin-top: 45px; }
    .info-section { display: flex; gap: 20px; margin-top: 25px; }
    .info-box { flex: 1; padding: 14px; border-radius: 10px; font-size: 12px; line-height: 1.45; }
    .client-info { background: #f7f7f7; border: 1px solid #ddd; }
    .company-info { background: #eef6ff; border: 1px solid #c7ddf8; }
    .avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; }
    .imagenes-contenedor img { max-height: 90px; object-fit: contain; }
    .imagenes-contenedor { page-break-inside: avoid !important; break-inside: avoid !important; }
    h3.section-title { font-size: 20px; font-weight: bold; margin-top: 15px; margin-bottom: 15px; color: #111; }
    table { width: 90%; font-size: 9px; }
    tbody td { border: 1px solid #d0d0d0; padding: 6px 4px; vertical-align: middle !important; text-align: center; }
    tbody td div { background: transparent; color: #302f2f; }
    th, td { border: 1px solid #d0d0d0; line-height: 1.2; font-size: 10px; }
    thead th { background: #e9ecef; border: 1px solid #d0d0d0; font-weight: bold; text-align: center; vertical-align: middle; }
    .total-general { margin-top: 35px; padding: 15px; background: #fff8e1; border: 2px solid #f5c02a; border-radius: 8px; font-size: 18px; font-weight: bold; text-align: right; }
    .footer-section { display: flex; justify-content: space-between; gap: 40px; margin-top: 100px; page-break-inside: avoid !important; break-inside: avoid !important; }
    .payment-info { padding: 20px; border: 1px solid #ccc; border-radius: 10px; background: #fafafa; font-size: 13px; page-break-inside: avoid !important; break-inside: avoid !important; }
    .comentarios-box { flex: 1; padding: 12px; border: 1px solid #d1d5db; border-radius: 10px; background: #f9fafb; font-size: 12px; }
    .signature { width: 260px; display: flex; justify-content: center; align-items: flex-end; margin: auto; }
    .signature-line { width: 100%; border-top: 1px solid #000; padding-top: 8px; text-align: center; font-size: 12px; }
</style>
</head>
<body>
<div class="container">
    <div class="header">
        <div style="display:flex;align-items:center;gap:12px;">
            <img src="${origenInfo.logo}" style="height:55px;" />
            <div>
                <h2 style="margin:0;font-size:20px;">${origenInfo.nombre}</h2>
                <p style="margin:0;font-size:12px;color:#555;line-height:1.4;">
                    <b>RUT:</b> ${origenInfo.rut}<br>
                    ${origenInfo.direccion}<br>
                    ${origenInfo.correo} · ${origenInfo.telefono}
                </p>
            </div>
        </div>
        <div style="text-align:right">
            <p style="margin:0;font-size:11px;color:#4b5563;">Fecha impresión: ${fechaActual}</p>
            <p style="margin:2px 0 0 0;font-size:11px;color:#4b5563;">Fecha cotización: ${new Date(cot.fecha).toLocaleDateString("es-CL")}</p>
            <div style="border:1.5px solid #000; padding:6px 14px; min-width:150px; margin-top:6px;">
                <div style="font-size:11px;font-weight:bold;color:#b91c1c;">R.U.T.: ${origenInfo.rut}</div>
                <div style="font-size:11px;font-weight:bold;color:#b91c1c;margin-top:2px;">COTIZACIÓN</div>
                <div style="font-size:12px;font-weight:bold;color:#b91c1c;margin-top:4px;">N° ${codigo}</div>
            </div>
        </div>
    </div>

    <div class="info-section">
        <div class="info-box client-info">
            <h3 style="margin:0 0 10px 0;">Datos del Cliente</h3>
            <p><b>Entidad:</b> ${cot.entidad?.nombre ?? "—"}</p>
            <p><b>RUT:</b> ${cot.entidad?.rut ?? "—"}</p>
            <p><b>Correo:</b> ${cot.entidad?.correo ?? "—"}</p>
            <p><b>Teléfono:</b> ${cot.entidad?.telefono ?? "—"}</p>
            <p><b>Dirección:</b> ${cot.entidad?.direccion ?? "—"}</p>
            <p><b>Origen:</b> ${cot.entidad?.origen ?? "—"}</p>
        </div>
        <div class="info-box company-info">
            <h3 style="margin:0 0 10px 0;">Empresa (Origen)</h3>
            <p><b>Empresa:</b> ${origenInfo.nombre}</p>
            <p><b>RUT:</b> ${origenInfo.rut}</p>
            <p><b>Dirección:</b> ${origenInfo.direccion}</p>
            <p><b>Correo:</b> ${origenInfo.correo}</p>
            <p><b>Teléfono:</b> ${origenInfo.telefono}</p>
        </div>
    </div>

    <h3 class="section-title">Detalle de la cotización</h3>
    ${seccionesHtml}
    <div style="page-break-before: always;"></div>

    ${mostrarTotales ? `
    <div class="total-general">
        Total General: ${formatPDF(totalGeneral)}
    </div>` : ""}

    <div class="imagenes-contenedor avoid-break" style="display:flex;flex-direction:row;gap:12px;margin-top:15px;flex-wrap:nowrap;overflow-x:auto;padding-bottom:10px;">
    ${(
            await Promise.all(
                cot.items.map(async (item) => {
                    const img = await obtenerImagenBase64(item.imagen);
                    if (!img) return "";
                    return `<img src="${img}" style="width:110px;height:110px;object-fit:cover;border-radius:10px;border:1px solid #ccc;flex-shrink:0;" />`;
                })
            )
        ).join("")}
    </div>

    <div style="height:60px;"></div>
    <div class="payment-info avoid-break">
        <p><b>Pago por transferencia electrónica o depósito</b></p>
        <p><b>Tiempo de validez:</b> 5 días</p>
        <p><b>Tiempo de entrega:</b> 5 días hábiles</p>
        <p><b>Banco:</b> Itaú · <b>Cuenta Corriente:</b> 0213150814 · <b>RUT:</b> 76.758.352-4</p>
        <p><b>Correo de pagos:</b> pagos@rids.cl</p>
        <p><b>Notas:</b> Se inicia previa aceptación y abono del 50%.</p>
    </div>

    <div class="footer-section avoid-break">
        <div class="comentarios-box">
            <h4>Comentarios de la cotización</h4>
            <p>${cot.comentariosCotizacion || "—"}</p>
        </div>
        <div class="signature">
            <div class="signature-line">Firma y aclaración</div>
        </div>
    </div>
</div>
</body>
</html>`;

    // ================================
    // RENDER INVISIBLE + HTML2CANVAS
    // ================================
    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "-9999px";
    container.style.width = "874px";
    container.style.backgroundColor = "#ffffff";
    container.innerHTML = html;
    document.body.appendChild(container);

    const images = container.querySelectorAll("img");
    const imagePromises = Array.from(images).map((img) => {
        return new Promise<void>((resolve) => {
            if (img.complete) { resolve(); return; }
            img.onload = () => resolve();
            img.onerror = () => {
                img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='45' height='45' viewBox='0 0 45 45'%3E%3Crect width='45' height='45' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='10'%3ESin imagen%3C/text%3E%3C/svg%3E";
                resolve();
            };
            setTimeout(() => resolve(), 5000);
        });
    });

    await Promise.all(imagePromises);
    await new Promise(resolve => setTimeout(resolve, 500));

    const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#FFFFFF",
        logging: false,
        width: 874,
        windowWidth: 874,
        scrollY: 0,
        scrollX: 0,
        onclone: (clonedDoc) => {
            const clonedImages = clonedDoc.querySelectorAll("img");
            clonedImages.forEach(img => {
                if (!img.style.width) img.style.width = "auto";
                if (!img.style.height) img.style.height = "auto";
            });
        }
    });

    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const pageHeight = pdf.internal.pageSize.getHeight();
    let position = 0;

    while (position < pdfHeight) {
        if (position > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, -position, pdfWidth, pdfHeight);
        position += pageHeight;
    }

    document.body.removeChild(container);
    return pdf;
};

export default GenerarPDFModal;