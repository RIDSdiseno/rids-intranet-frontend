// PDF
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// TYPES    
import type {
    TipoEquipoValue,
    DetalleTrabajoGestioo,
} from "./types";

import {
    TipoEquipoLabel,
} from "./types";

// ==============================
//   PDF ORDEN DE TALLER - FULL
// ==============================
export const handlePrint = async (orden: DetalleTrabajoGestioo) => {
    try {
        const fechaActual = new Date().toLocaleString("es-CL", {
            dateStyle: "short",
            timeStyle: "short",
        });

        const codigo = String(orden.id).padStart(6, "0");

        // Datos corporativos
        const ORIGEN_DATA = {
            RIDS: {
                nombre: "RIDS LTDA",
                direccion: "Santiago - Providencia, La Concepción 65",
                correo: "soporte@rids.cl",
                telefono: "+56 9 8823 1976",
                logo: "/img/splash.png",
            },
            ECONNET: {
                nombre: "ECONNET SPA",
                direccion: "Santiago - Providencia, La Concepción 65",
                correo: "ventas@econnet.cl",
                telefono: "+56 9 8807 6593",
                logo: "/img/ecconetlogo.png",
            },
            OTRO: {
                nombre: orden.entidad?.nombre ?? "Empresa",
                direccion: orden.entidad?.direccion ?? "",
                correo: orden.entidad?.correo ?? "",
                telefono: orden.entidad?.telefono ?? "",
                logo: "/img/splash.png",
            },
        };

        const origenInfo = ORIGEN_DATA[orden.entidad?.origen ?? "OTRO"];

        const tipoEquipoLabel =
            orden.equipo?.tipo ? TipoEquipoLabel[orden.equipo.tipo as TipoEquipoValue] ?? "—" : "—";

        const html = `
<div class="pdf-container" style="
    width: 1700px;
    margin: 0 auto;
    padding: 40px;
    font-family: Arial, sans-serif;
    color: #000;
    font-size: 30px;
">
<br>
<br>

<!-- HEADER -->
<div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #444; padding-bottom: 15px; margin-bottom: 20px;">
    <div style="display: flex; align-items: center; gap: 14px;">
        <img src="${origenInfo.logo}" style="height: 85px;" />
        <div>
            <h2 style="margin: 0; font-size: 30px; font-weight: bold;">${origenInfo.nombre}</h2>
            <p style="margin: 0; font-size: 25px; color: #4b5563;">
                ${origenInfo.direccion} · ${origenInfo.correo}<br>${origenInfo.telefono}
            </p>
        </div>
    </div>

    <div style="text-align: right;">
        <p style="margin: 0; font-size: 25px;">Fecha impresión: ${fechaActual}</p>
        <h3 style="margin: 4px 0 0;">Orden de Taller N° <b>${codigo}</b></h3>
    </div>
</div>

<!-- CLIENTE / EQUIPO -->
<div style="display: flex; gap: 20px; margin-bottom: 25px;">

    <!-- CLIENTE -->
    <div style="flex: 1; border: 1px solid #d1d5db; padding: 15px; border-radius: 10px; background: #f9fafb;">
        <h3 style="margin: 0 0 10px; font-size: 30px;">Datos del Cliente</h3>
        <p><b>Entidad:</b> ${orden.entidad?.nombre ?? "—"}</p>
        <p><b>RUT:</b> ${orden.entidad?.rut ?? "—"}</p>
        <p><b>Teléfono:</b> ${orden.entidad?.telefono ?? "—"}</p>
        <p><b>Correo:</b> ${orden.entidad?.correo ?? "—"}</p>
        <p><b>Dirección:</b> ${orden.entidad?.direccion ?? "—"}</p>
    </div>

    <!-- EQUIPO -->
    <div style="flex: 1; border: 1px solid #d1d5db; padding: 15px; border-radius: 10px; background: #eef6ff;">
        <h3 style="margin: 0 0 10px; font-size: 30px;">Datos del Equipo</h3>
        <p><b>Equipo:</b> ${orden.equipo?.marca ?? "—"} ${orden.equipo?.modelo ?? ""}</p>
        <p><b>Tipo:</b> ${tipoEquipoLabel}</p>
        <p><b>Serie:</b> ${orden.equipo?.serial ?? "—"}</p>
        <p><b>Procesador:</b> ${orden.equipo?.procesador ?? "—"}</p>
<p><b>RAM:</b> ${orden.equipo?.ram ?? "—"}</p>
<p><b>Disco:</b> ${orden.equipo?.disco ?? "—"}</p>
<p><b>Propiedad:</b> ${orden.equipo?.propiedad ?? "—"}</p>
<p>
  <b>Cargador incluido:</b>
    ${orden.incluyeCargador ? "Sí" : "No"}
  </span>
</p>


        <p><b>Área:</b> ${orden.area ?? "—"}</p>
        <p>
  <b>${orden.area === "SALIDA" ? "Fecha salida:" : "Fecha ingreso:"}</b>
  ${new Date(orden.fecha).toLocaleString("es-CL")}
</p>

    </div>
</div>

<div style="margin-bottom: 15px;">
    <h3 style="font-size: 30px;">Descripción del Estado:</h3>
    <br>
    <div style="border: 1px solid #d1d5db; padding: 10px; border-radius: 8px; background: #f9fafb;">
        ${orden.descripcion ?? "Sin descripción adicional."}
    </div>
</div>

<!-- SECCIONES DE TEXTO -->
<div style="margin-bottom: 15px;">
    <h3 style="font-size: 30px;">Trabajo solicitado:</h3>
    <br>
    <div style="border: 1px solid #d1d5db; padding: 10px; border-radius: 8px; background: #f9fafb;">
        ${orden.tipoTrabajo ?? "—"}
    </div>
</div>

<div style="margin-bottom: 15px;">
    <h3 style="font-size: 30px;">Notas del técnico:</h3>
    <br>
    <div style="border: 1px solid #d1d5db; padding: 10px; border-radius: 8px; background: #f9fafb;">
        ${orden.notas ?? "Sin observaciones."}
    </div>
</div>

<!-- SEGUIMIENTO -->
<div style="background: #e0f2fe; border: 1px solid #93c5fd; padding: 12px; text-align: center; border-radius: 10px; margin-top: 25px; font-size: 14px;">
    Consulte el estado de la orden en:<br>
    <b>https://rids-intranet.netlify.app/home</b><br>
    Código: <b>${codigo}</b>
</div>

<!-- FIRMAS -->
<div style="margin-top: 60px; display: flex; justify-content: space-between;">

    <div style="width: 45%; text-align: center;">
        <br><br><br><br><br><br><br>
        <div style="border-top: 1px dashed #555; padding-top: 6px;">
            Firma Cliente<br>
            <span style="font-size: 20px;">Nombre y RUT</span>
        </div>
    </div>

    <div style="width: 45%; text-align: center;">
        <br><br><br><br><br><br><br>
        <div style="border-top: 1px solid #333; padding-top: 6px;">
            Firma Empresa<br>
            <span style="font-size: 20px;">Representante autorizado</span>
        </div>
    </div>
</div>

<!-- TERMINOS -->
<div style="margin-top: 30px; padding-top: 12px; border-top: 1px solid #ccc; font-size: 15px; color: #444; line-height: 1.4;">
<b>Términos y condiciones:</b><br>
1) Para retirar el equipo es indispensable presentar esta orden.<br>
2) El equipo deberá ser retirado dentro de 30 días desde la notificación.<br>
3) Al dejar el equipo en reparación, el cliente acepta estas condiciones.<br>
4) La empresa no se responsabiliza por accesorios no declarados.
</div>

</div>
`;

        const container = document.createElement("div");
        container.innerHTML = html;
        document.body.appendChild(container);

        const canvas = await html2canvas(container, {
            scale: 2,
            width: container.scrollWidth,
            height: container.scrollHeight,
            windowWidth: container.scrollWidth,
        });

        const pdf = new jsPDF("p", "mm", "a4");
        const img = canvas.toDataURL("image/png");

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const proportionalHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(img, "PNG", 0, 0, pdfWidth, proportionalHeight);
        pdf.save(`Orden_${codigo}.pdf`);

        document.body.removeChild(container);
    } catch (err) {
        console.error(err);
        alert("Error al generar PDF");
    }
};