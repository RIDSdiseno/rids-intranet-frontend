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
    OTRO: "Otro",
};

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