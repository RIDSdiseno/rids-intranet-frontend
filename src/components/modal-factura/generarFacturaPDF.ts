import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

type ItemFactura = {
  codigo?: string;
  nombre?: string;
  descripcion?: string;
  cantidad?: number;
  precio?: number;
  precioUnitario?: number;
  montoItem?: number;
  total?: number;
};

type FacturaRCV = {
  folio?: string | number;
  tipoDTE?: string | number;
  tipoDTEString?: string;
  tipoVenta?: string;
  fechaEmision?: string;
  fechaRecepcion?: string;
  fechaAcuseRecibo?: string;
  estado?: string;
  rutReceptor?: string;
  razonSocialReceptor?: string;
  giroReceptor?: string;
  direccionReceptor?: string;
  comunaReceptor?: string;
  ciudadReceptor?: string;
  montoExento?: number;
  montoNeto?: number;
  montoIVA?: number;
  montoIVARecuperable?: number;
  montoTotal?: number;
  items?: ItemFactura[];
};

type EmpresaPDF = {
  nombre: string;
  rut: string;
  direccion: string;
  correo: string;
  telefono: string;
  logo: string;
};

function formatCLP(value?: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatFecha(fecha?: string) {
  if (!fecha) return "—";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString("es-CL");
}

function getTipoDTEString(factura: FacturaRCV) {
  if (factura.tipoDTEString && factura.tipoDTEString.trim()) {
    return factura.tipoDTEString;
  }

  const tipo = Number(factura.tipoDTE);

  if (tipo === 33) return "Factura Electrónica";
  if (tipo === 34) return "Factura Exenta";
  if (tipo === 61) return "Nota de Crédito";

  return `DTE ${factura.tipoDTE ?? "—"}`;
}

function getTituloDocumento(factura: FacturaRCV) {
  const tipo = Number(factura.tipoDTE);

  if (tipo === 33) return "RESUMEN DE FACTURA ELECTRÓNICA";
  if (tipo === 34) return "RESUMEN DE FACTURA EXENTA";
  if (tipo === 61) return "RESUMEN DE NOTA DE CRÉDITO";

  return "RESUMEN DE DOCUMENTO TRIBUTARIO";
}

function getNombreArchivo(factura: FacturaRCV) {
  const tipo = Number(factura.tipoDTE);
  const folio = String(factura.folio ?? "documento");

  if (tipo === 33) return `Resumen-Factura-${folio}.pdf`;
  if (tipo === 34) return `Resumen-Factura-Exenta-${folio}.pdf`;
  if (tipo === 61) return `Resumen-Nota-Credito-${folio}.pdf`;

  return `Resumen-DTE-${folio}.pdf`;
}

function escapeHtml(value?: string | number | null) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function generarFacturaPDF(
  factura: FacturaRCV,
  empresa: EmpresaPDF
) {
  if (!factura) {
    throw new Error("No hay datos de factura");
  }

  const fechaActual = new Date().toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const items = factura.items ?? [];
  const tieneItems = items.length > 0;
  const tituloDocumento = getTituloDocumento(factura);
  const tipoDTELabel = getTipoDTEString(factura);

  const detalleHtml = tieneItems
    ? items
      .map((item, index) => {
        const precio = Number(item.precio ?? item.precioUnitario ?? 0);
        const total = Number(item.montoItem ?? item.total ?? 0);
        const cantidad = Number(item.cantidad ?? 1);

        return `
            <tr>
              <td style="padding:8px;text-align:center;">${escapeHtml(item.codigo || index + 1)}</td>
              <td style="padding:8px;text-align:left;">
                <div style="font-weight:600;">${escapeHtml(item.nombre || "Ítem")}</div>
                ${item.descripcion
            ? `<div style="font-size:9px;color:#666;margin-top:3px;">${escapeHtml(item.descripcion)}</div>`
            : ""
          }
              </td>
              <td style="padding:8px;text-align:center;">${escapeHtml(cantidad)}</td>
              <td style="padding:8px;text-align:right;">${escapeHtml(formatCLP(precio))}</td>
              <td style="padding:8px;text-align:right;font-weight:bold;">${escapeHtml(formatCLP(total))}</td>
            </tr>
          `;
      })
      .join("")
    : `
      <tr>
        <td style="padding:10px;text-align:center;">—</td>
        <td style="padding:10px;text-align:left;">Detalle de líneas no sincronizado</td>
        <td style="padding:10px;text-align:center;">—</td>
        <td style="padding:10px;text-align:right;">—</td>
        <td style="padding:10px;text-align:right;font-weight:bold;">${escapeHtml(formatCLP(factura.montoTotal))}</td>
      </tr>
    `;

  const montoExentoHtml =
    Number(factura.montoExento ?? 0) > 0
      ? `
      <div class="totales-row">
        <span>Exento</span>
        <span>${escapeHtml(formatCLP(factura.montoExento))}</span>
      </div>
    `
      : "";

  const ivaRecuperableHtml =
    Number(factura.montoIVARecuperable ?? 0) > 0
      ? `
      <div class="totales-row">
        <span>IVA recuperable</span>
        <span>${escapeHtml(formatCLP(factura.montoIVARecuperable))}</span>
      </div>
    `
      : "";

  const observacion = tieneItems
    ? "Este PDF incluye el detalle de ítems sincronizado para el documento."
    : "Este PDF muestra la información general del documento. El detalle de productos o servicios aún no está sincronizado.";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(tituloDocumento)} ${escapeHtml(factura.folio)}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px 20px 20px 20px;
      color: #000;
      background: #fff;
    }

    .container {
      width: 874px;
      margin: 0 auto;
      padding-bottom: 40px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #444;
      padding-bottom: 12px;
      margin-bottom: 25px;
      margin-top: 25px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .header-right {
      text-align: right;
      max-width: 280px;
    }

    .doc-box {
      border: 1.5px solid #000;
      padding: 8px 14px;
      min-width: 200px;
      margin-top: 8px;
      display: inline-block;
      background: #fff;
    }

    .doc-rut,
    .doc-title,
    .doc-folio {
      color: #b91c1c;
      font-weight: bold;
    }

    .doc-rut,
    .doc-title {
      font-size: 11px;
    }

    .doc-folio {
      font-size: 13px;
      margin-top: 4px;
    }

    .status-pill {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: bold;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
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
      background: #f7f7f7;
      border: 1px solid #ddd;
    }

    .company-info {
      background: #eef6ff;
      border: 1px solid #c7ddf8;
    }

    .section-title {
      font-size: 20px;
      font-weight: bold;
      margin-top: 22px;
      margin-bottom: 15px;
      color: #111;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-bottom: 20px;
    }

    th, td {
      border: 1px solid #d0d0d0;
      line-height: 1.2;
      font-size: 10px;
    }

    thead th {
      background: #e9ecef;
      font-weight: bold;
      text-align: center;
      vertical-align: middle;
      padding: 8px;
    }

    tbody td {
      padding: 6px 4px;
      vertical-align: top;
    }

    .totales-box {
      width: 340px;
      margin-left: auto;
      margin-top: 20px;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      overflow: hidden;
      font-size: 12px;
    }

    .totales-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 14px;
      border-bottom: 1px solid #e5e7eb;
    }

    .totales-row:last-child {
      border-bottom: none;
      background: #fff8e1;
      font-size: 15px;
      font-weight: bold;
    }

    .footer-section {
      margin-top: 40px;
    }

    .comentarios-box {
      padding: 12px;
      border: 1px solid #d1d5db;
      border-radius: 10px;
      background: #f9fafb;
      font-size: 12px;
    }

    .meta-note {
      margin-top: 18px;
      font-size: 11px;
      color: #4b5563;
      text-align: right;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-left">
        <img src="${escapeHtml(empresa.logo)}" style="height:55px;" />
        <div>
          <h2 style="margin:0;font-size:20px;">${escapeHtml(empresa.nombre)}</h2>
          <p style="margin:0;font-size:12px;color:#555;line-height:1.4;">
            <b>RUT:</b> ${escapeHtml(empresa.rut)}<br>
            ${escapeHtml(empresa.direccion)}<br>
            ${escapeHtml(empresa.correo)} · ${escapeHtml(empresa.telefono)}
          </p>
        </div>
      </div>

      <div class="header-right">
        <p style="margin:0;font-size:11px;color:#4b5563;">Fecha impresión: ${escapeHtml(fechaActual)}</p>
        <p style="margin:2px 0 0 0;font-size:11px;color:#4b5563;">Fecha emisión: ${escapeHtml(formatFecha(factura.fechaEmision))}</p>

        <div class="doc-box">
          <div class="doc-rut">R.U.T.: ${escapeHtml(empresa.rut)}</div>
          <div class="doc-title">${escapeHtml(tipoDTELabel.toUpperCase())}</div>
          <div class="doc-folio">N° ${escapeHtml(factura.folio != null ? String(factura.folio) : "—")}</div>
        </div>

        <div class="status-pill">${escapeHtml(factura.estado || "Sin estado")}</div>
      </div>
    </div>

    <h3 class="section-title">${escapeHtml(tituloDocumento)}</h3>

    <div class="info-section">
      <div class="info-box client-info">
        <h3 style="margin:0 0 10px 0;">Datos del Cliente</h3>
        <p><b>Razón social:</b> ${escapeHtml(factura.razonSocialReceptor || "—")}</p>
        <p><b>RUT:</b> ${escapeHtml(factura.rutReceptor || "—")}</p>
        <p><b>Giro:</b> ${escapeHtml(factura.giroReceptor || "—")}</p>
        <p><b>Dirección:</b> ${escapeHtml(factura.direccionReceptor || "—")}</p>
        <p><b>Comuna:</b> ${escapeHtml(factura.comunaReceptor || "—")}</p>
        <p><b>Ciudad:</b> ${escapeHtml(factura.ciudadReceptor || "—")}</p>
      </div>

      <div class="info-box company-info">
        <h3 style="margin:0 0 10px 0;">Datos del Documento</h3>
        <p><b>Tipo DTE:</b> ${escapeHtml(tipoDTELabel)}</p>
        <p><b>Tipo venta:</b> ${escapeHtml(factura.tipoVenta || "—")}</p>
        <p><b>Folio:</b> ${escapeHtml(factura.folio != null ? String(factura.folio) : "—")}</p>
        <p><b>Fecha emisión:</b> ${escapeHtml(formatFecha(factura.fechaEmision))}</p>
        <p><b>Recepción SII:</b> ${escapeHtml(formatFecha(factura.fechaRecepcion))}</p>
        <p><b>Acuse de recibo:</b> ${escapeHtml(formatFecha(factura.fechaAcuseRecibo))}</p>
      </div>
    </div>

    <h3 class="section-title">${tieneItems ? "Detalle del documento" : "Resumen del documento"}</h3>

    <table>
      <thead>
        <tr>
          <th style="width:12%;">Código</th>
          <th style="width:46%;">Descripción</th>
          <th style="width:10%;">Cant.</th>
          <th style="width:16%;">P. Unitario</th>
          <th style="width:16%;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${detalleHtml}
      </tbody>
    </table>

    <div class="totales-box">
      ${montoExentoHtml}
      <div class="totales-row">
        <span>Neto</span>
        <span>${escapeHtml(formatCLP(factura.montoNeto))}</span>
      </div>
      <div class="totales-row">
        <span>IVA</span>
        <span>${escapeHtml(formatCLP(factura.montoIVA))}</span>
      </div>
      ${ivaRecuperableHtml}
      <div class="totales-row">
        <span>Total</span>
        <span>${escapeHtml(formatCLP(factura.montoTotal))}</span>
      </div>
    </div>

    <div class="footer-section">
      <div class="comentarios-box">
        <h4 style="margin-top:0;">Observaciones</h4>
        <p style="margin-bottom:0;">${escapeHtml(observacion)}</p>
      </div>

      <div class="meta-note">
        Documento generado automáticamente desde el módulo de facturación.
      </div>
    </div>
  </div>
</body>
</html>
`;

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.width = "874px";
  container.style.backgroundColor = "#ffffff";
  container.innerHTML = html;
  document.body.appendChild(container);

  const images = container.querySelectorAll("img");
  await Promise.all(
    Array.from(images).map(
      (img) =>
        new Promise<void>((resolve) => {
          if ((img as HTMLImageElement).complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        })
    )
  );

  const canvas = await html2canvas(container, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);

  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgProps = pdf.getImageProperties(imgData);
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

  let position = 0;

  while (position < pdfHeight) {
    if (position > 0) pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, -position, pdfWidth, pdfHeight);
    position += pageHeight;
  }

  document.body.removeChild(container);

  pdf.save(getNombreArchivo(factura));
}