import type {
    EstadoAdicional,
} from "./adicionales.types";

export const ADICIONAL_TIPOS = [
    "MONITOR",
    "IMPRESORA",
    "TECLADO",
    "MOUSE",
    "DOCK",
    "CARGADOR",
    "CAMARA",
    "SWITCH",
    "UPS",
    "ROUTER",
    "TELEFONO_IP",
    "PARLANTE",
    "ECOGRAFO",
    "OTRO",
] as const;

export type TipoAdicional =
    (typeof ADICIONAL_TIPOS)[number];

export const ADICIONAL_TIPO_LABEL: Record<
    TipoAdicional,
    string
> = {
    MONITOR: "Monitor",
    IMPRESORA: "Impresora",
    TECLADO: "Teclado",
    MOUSE: "Mouse",
    DOCK: "Dock",
    CARGADOR: "Cargador",
    CAMARA: "Cámara",
    SWITCH: "Switch",
    UPS: "UPS",
    ROUTER: "Router",
    TELEFONO_IP: "Teléfono IP",
    PARLANTE: "Parlante / Altavoz",
    ECOGRAFO: "Ecógrafo",
    OTRO: "Otro",
};

/** Etiqueta legible; si el tipo no está en la lista (ej. uno antiguo), devuelve el valor tal cual. */
export function getTipoAdicionalLabel(
    tipo?: string | null
): string {
    const value =
        String(tipo ?? "").trim();

    return (
        ADICIONAL_TIPO_LABEL[
        value.toUpperCase() as TipoAdicional
        ] ??
        (value || "—")
    );
}

export const ADICIONAL_ESTADOS: Array<{
    value: EstadoAdicional;
    label: string;
}> = [
        {
            value: "ASIGNADO",
            label: "Asignado",
        },
        {
            value: "EN_STOCK",
            label: "En stock",
        },
        {
            value: "EN_REPARACION",
            label: "En reparación",
        },
        {
            value: "DADO_DE_BAJA",
            label: "Dado de baja",
        },
    ];