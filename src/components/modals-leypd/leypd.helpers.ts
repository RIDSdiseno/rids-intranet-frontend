// src/components/modals-leypd/leypd.helpers.ts

import type {
    CampoFichaLeypd,
    EstadoLeypd,
    LeypdElemento,
} from "./leypd.types";

export const LEYPD_ESTADO_LABELS:
    Record<
        EstadoLeypd,
        string
    > = {
    NO_INICIADO:
        "No iniciado",

    EN_PROGRESO:
        "En progreso",

    IMPLEMENTADO:
        "Implementado",

    NO_APLICA:
        "No aplica",
};

export function getLeypdEstadoColor(
    estado: EstadoLeypd
) {
    switch (
    estado
    ) {
        case "IMPLEMENTADO":
            return "green";

        case "EN_PROGRESO":
            return "blue";

        case "NO_APLICA":
            return "default";

        case "NO_INICIADO":
        default:
            return "orange";
    }
}

export function isLeypdElementoVencido(
    elemento:
        Pick<
            LeypdElemento,
            | "fechaCompromiso"
            | "estado"
        >
) {
    if (
        !elemento.fechaCompromiso
    ) {
        return false;
    }

    if (
        elemento.estado ===
        "IMPLEMENTADO" ||
        elemento.estado ===
        "NO_APLICA"
    ) {
        return false;
    }

    const fecha =
        new Date(
            `${elemento.fechaCompromiso.slice(
                0,
                10
            )}T23:59:59`
        );

    return (
        fecha <
        new Date()
    );
}

export function formatLeypdDate(
    value:
        | string
        | null
        | undefined
) {
    if (!value) {
        return "—";
    }

    const date =
        new Date(
            value
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "—";
    }

    return date.toLocaleDateString(
        "es-CL"
    );
}

export function formatLeypdDateTime(
    value:
        | string
        | null
        | undefined
) {
    if (!value) {
        return "—";
    }

    const date =
        new Date(
            value
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "—";
    }

    return date.toLocaleString(
        "es-CL"
    );
}

/* =====================================================
   VALIDACIÓN FICHA LEY PD
   Espejo de backend: src/service/leypd/leypd-ficha-validacion.ts
   Si cambias una regla aquí, cámbiala también allá.
===================================================== */

export function esValorVacioLeypd(
    valor: unknown
): boolean {
    if (valor === null || valor === undefined) return true;
    if (typeof valor === "string") return valor.trim() === "";
    if (Array.isArray(valor)) return valor.length === 0;
    return false;
}

export function validarRutChilenoLeypd(
    rut: string
): boolean {
    const limpio = rut
        .replace(/[^0-9kK]/g, "")
        .toUpperCase();

    if (limpio.length < 8 || limpio.length > 9) return false;

    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1);

    if (!/^\d+$/.test(cuerpo)) return false;

    let suma = 0;
    let multiplicador = 2;

    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += Number(cuerpo[i]) * multiplicador;
        multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }

    const resto = 11 - (suma % 11);

    const dvEsperado =
        resto === 11 ? "0" :
            resto === 10 ? "K" :
                String(resto);

    return dv === dvEsperado;
}

function esEmailValidoLeypd(valor: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor);
}

function esUrlONoTieneLeypd(valor: string): boolean {
    const limpio = valor.trim();

    if (limpio.toLowerCase() === "no tiene") return true;
    if (/\s/.test(limpio)) return false;

    try {
        const url = new URL(
            /^https?:\/\//i.test(limpio) ? limpio : `https://${limpio}`
        );
        return url.hostname.includes(".");
    } catch {
        return false;
    }
}

function esFechaValidaLeypd(valor: string): boolean {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
    if (!match) return false;

    const anio = Number(match[1]);
    const mes = Number(match[2]);
    const dia = Number(match[3]);

    const fecha = new Date(Date.UTC(anio, mes - 1, dia));

    return (
        fecha.getUTCFullYear() === anio &&
        fecha.getUTCMonth() === mes - 1 &&
        fecha.getUTCDate() === dia
    );
}

export function maxLengthCampoLeypd(
    campo: CampoFichaLeypd
): number {
    if (campo.maxLength) return campo.maxLength;
    return campo.tipo === "textarea" ? 2000 : 300;
}

export function validarValorCampoLeypd(
    campo: CampoFichaLeypd,
    valor: unknown
): string | null {
    if (esValorVacioLeypd(valor)) return null;

    if (
        campo.tipo === "text" ||
        campo.tipo === "textarea" ||
        campo.tipo === "email" ||
        campo.tipo === "date"
    ) {
        if (typeof valor !== "string") {
            return "Debe ser texto.";
        }

        const max = maxLengthCampoLeypd(campo);

        if (valor.length > max) {
            return `Máximo ${max} caracteres.`;
        }

        switch (campo.formato) {
            case "rut":
                return validarRutChilenoLeypd(valor)
                    ? null
                    : "RUT inválido. Verifique número y dígito verificador.";

            case "email":
                return esEmailValidoLeypd(valor.trim())
                    ? null
                    : "Correo electrónico inválido.";

            case "url_o_no_tiene":
                return esUrlONoTieneLeypd(valor)
                    ? null
                    : "Ingrese una dirección web válida o «No tiene».";

            case "fecha":
                return esFechaValidaLeypd(valor)
                    ? null
                    : "Fecha inválida.";
        }
    }

    return null;
}

/**
 * Valida formato de los campos indicados.
 * Si no se pasan keys, valida todos.
 */
export function validarCamposFichaLeypd(
    campos: CampoFichaLeypd[],
    values: Record<string, unknown>,
    keys?: Iterable<string>
): Record<string, string> {
    const permitidas = keys ? new Set(keys) : null;
    const errores: Record<string, string> = {};

    for (const campo of campos) {
        if (permitidas && !permitidas.has(campo.key)) continue;

        const error = validarValorCampoLeypd(campo, values[campo.key]);

        if (error) {
            errores[campo.key] = error;
        }
    }

    return errores;
}

/**
 * Extrae los errores por campo de una respuesta 422
 * del backend (code: FICHA_VALIDACION).
 */
export function obtenerErroresCampoApi(
    err: unknown
): Record<string, string> | null {
    const response = (
        err as {
            response?: {
                status?: number;
                data?: { errores?: unknown };
            };
        }
    )?.response;

    if (response?.status !== 422) return null;

    const errores = response.data?.errores;

    if (!errores || typeof errores !== "object") return null;

    return errores as Record<string, string>;
}

/* =====================================================
   ERRORES API
===================================================== */

/**
 * Mensaje del backend (`message`) o un texto por defecto.
 */
export function obtenerMensajeApiLeypd(
    err: unknown,
    fallback: string
): string {
    const response = (
        err as {
            response?: {
                status?: number;
                data?: { message?: string };
            };
        }
    )?.response;

    if (response?.status === 403) {
        return "No tienes permisos para realizar esta acción.";
    }

    return response?.data?.message ?? fallback;
}