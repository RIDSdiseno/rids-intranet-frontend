// src/components/modals-proteccion-datos/proteccion-datos.helpers.ts
import type {
    EstadoCampaniaProteccionDatos,
    EstadoConsentimientoDatos,
} from "./proteccion-datos.types";

export function getEstadoCampaniaLabel(
    estado:
        EstadoCampaniaProteccionDatos,
): string {
    switch (
    estado
    ) {
        case "BORRADOR":
            return "Borrador";

        case "ACTIVA":
            return "Activa";

        case "FINALIZADA":
            return "Finalizada";

        case "CANCELADA":
            return "Cancelada";
    }
}

export function getEstadoCampaniaColor(
    estado:
        EstadoCampaniaProteccionDatos,
): string {
    switch (
    estado
    ) {
        case "BORRADOR":
            return "default";

        case "ACTIVA":
            return "processing";

        case "FINALIZADA":
            return "success";

        case "CANCELADA":
            return "error";
    }
}

export function getEstadoConsentimientoLabel(
    estado:
        EstadoConsentimientoDatos,
): string {
    switch (
    estado
    ) {
        case "PENDIENTE":
            return "Pendiente";

        case "ENVIADO":
            return "Enviado";

        case "ERROR_ENVIO":
            return "Error de envío";

        case "ACEPTADO":
            return "Aceptado";

        case "RECHAZADO":
            return "Rechazado";

        case "REVOCADO":
            return "Revocado";

        case "EXPIRADO":
            return "Expirado";
    }
}

export function formatearFechaHora(
    value:
        string |
        Date |
        null |
        undefined,
): string {

    if (
        !value
    ) {
        return "—";
    }

    try {

        return new Intl.DateTimeFormat(
            "es-CL",
            {
                day:
                    "2-digit",

                month:
                    "2-digit",

                year:
                    "numeric",

                hour:
                    "2-digit",

                minute:
                    "2-digit",

                hour12:
                    false,
            },
        ).format(
            new Date(
                value,
            ),
        );

    } catch {

        return String(
            value,
        );
    }
}

export function formatearHora(
    value:
        string |
        Date |
        null |
        undefined,
): string {

    if (
        !value
    ) {
        return "—";
    }

    try {

        return new Intl.DateTimeFormat(
            "es-CL",
            {
                hour:
                    "2-digit",

                minute:
                    "2-digit",

                hour12:
                    false,
            },
        ).format(
            new Date(
                value,
            ),
        );

    } catch {

        return String(
            value,
        );
    }
}