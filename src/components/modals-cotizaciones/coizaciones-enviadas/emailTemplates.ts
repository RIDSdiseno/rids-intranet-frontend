// src/components/modals-cotizaciones/cotizaciones-enviadas/emailTemplates.tsx

import type {
    CotizacionGestioo,
} from "../types";


/* =====================================================
   ESCAPE HTML
===================================================== */

export function escapeHtml(
    value:
        string |
        number |
        null |
        undefined
): string {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =====================================================
   FORMATO MONEDA
===================================================== */

export function formatCurrency(
    value:
        number |
        null |
        undefined,

    moneda: string = "CLP"
): string {
    const amount =
        Number(value ?? 0);

    if (moneda === "USD") {
        return new Intl.NumberFormat(
            "es-CL",
            {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }
        ).format(amount);
    }

    return new Intl.NumberFormat(
        "es-CL",
        {
            style: "currency",
            currency: "CLP",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }
    ).format(amount);
}


/* =====================================================
   FORMATO FECHA
===================================================== */

function formatDate(
    value:
        string |
        Date |
        null |
        undefined
): string {
    if (!value) {
        return "—";
    }

    const date =
        value instanceof Date
            ? value
            : new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "—";
    }

    return date.toLocaleDateString(
        "es-CL",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        }
    );
}


/* =====================================================
   HTML DEL CORREO
===================================================== */

export function buildCotizacionHtml(
    cotizacion: CotizacionGestioo
): string {
    const cliente =
        escapeHtml(
            cotizacion.entidad?.nombre ||
            "Cliente"
        );

    const id =
        Number(
            cotizacion.id || 0
        );

    const numeroCotizacion =
        `COT-${String(id).padStart(
            6,
            "0"
        )}`;

    const moneda =
        cotizacion.moneda ||
        "CLP";

    const total =
        formatCurrency(
            cotizacion.total ?? 0,
            moneda
        );

    const fecha =
        formatDate(
            cotizacion.fecha ??
            cotizacion.createdAt
        );

    return `
<!doctype html>

<html>
<head>
    <meta charset="utf-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
    >
</head>

<body
    style="
        margin:0;
        padding:0;
        background:#ffffff;
        font-family:
            Arial,
            Helvetica,
            sans-serif;
        color:#1f2937;
    "
>

    <div
        style="
            width:100%;
            max-width:720px;
            margin:0;
            padding:0;
            font-size:14px;
            line-height:1.6;
            color:#1f2937;
        "
    >

        <p
            style="
                margin:0 0 20px 0;
                padding:0;
            "
        >
            Hola <strong>${cliente}</strong>,
        </p>


        <p
            style="
                margin:0 0 20px 0;
                padding:0;
            "
        >
            Adjuntamos la cotización solicitada.
        </p>


        <table
            role="presentation"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="
                border-collapse:collapse;
                margin:0 0 20px 0;
                font-family:
                    Arial,
                    Helvetica,
                    sans-serif;
                font-size:14px;
                line-height:1.6;
                color:#1f2937;
            "
        >
            <tr>
                <td
                    style="
                        padding:0 14px 2px 0;
                        font-weight:600;
                        white-space:nowrap;
                    "
                >
                    Cotización:
                </td>

                <td
                    style="
                        padding:0 0 2px 0;
                    "
                >
                    ${escapeHtml(numeroCotizacion)}
                </td>
            </tr>

            <tr>
                <td
                    style="
                        padding:0 14px 2px 0;
                        font-weight:600;
                        white-space:nowrap;
                    "
                >
                    Fecha:
                </td>

                <td
                    style="
                        padding:0 0 2px 0;
                    "
                >
                    ${escapeHtml(fecha)}
                </td>
            </tr>

            <tr>
                <td
                    style="
                        padding:0 14px 0 0;
                        font-weight:600;
                        white-space:nowrap;
                    "
                >
                    Total:
                </td>

                <td
                    style="
                        padding:0;
                        font-weight:600;
                    "
                >
                    ${escapeHtml(total)}
                </td>
            </tr>
        </table>


        <p
            style="
                margin:0 0 20px 0;
                padding:0;
            "
        >
            El documento completo se encuentra adjunto
            en formato PDF.
        </p>


        <p
            style="
                margin:0 0 20px 0;
                padding:0;
            "
        >
            Si tienes consultas sobre esta cotización,
            puedes responder directamente a este correo.
        </p>


        <p
            style="
                margin:0;
                padding:0;
            "
        >
            Saludos cordiales,
        </p>

    </div>

</body>
</html>
`;
}


/* =====================================================
   TEXTO SIMPLE
===================================================== */

export function buildCotizacionPlainText(
    cotizacion: CotizacionGestioo
): string {
    const cliente =
        cotizacion.entidad?.nombre ||
        "Cliente";

    const id =
        Number(
            cotizacion.id || 0
        );

    const numeroCotizacion =
        `COT-${String(id).padStart(
            6,
            "0"
        )}`;

    const moneda =
        cotizacion.moneda ||
        "CLP";

    const total =
        formatCurrency(
            cotizacion.total ?? 0,
            moneda
        );

    const fecha =
        formatDate(
            cotizacion.fecha ??
            cotizacion.createdAt
        );

    return [
        `Hola ${cliente},`,
        "",
        "Adjuntamos la cotización solicitada.",
        "",
        `Cotización: ${numeroCotizacion}`,
        `Fecha: ${fecha}`,
        `Total: ${total}`,
        "",
        "El documento completo se encuentra adjunto en formato PDF.",
        "",
        "Si tienes consultas sobre esta cotización, puedes responder directamente a este correo.",
        "",
        "Saludos cordiales,",
    ].join("\n");
}