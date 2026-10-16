// src/components/modals-funnel/proximasAcciones.ts

export const PROXIMAS_ACCIONES = [
    {
        value:
            "LLAMAR",
        label:
            "Llamar",
    },
    {
        value:
            "WHATSAPP",
        label:
            "WhatsApp",
    },
    {
        value:
            "ENVIAR_CORREO",
        label:
            "Enviar correo",
    },
    {
        value:
            "VISITA_PRESENCIAL",
        label:
            "Visita presencial",
    },
    {
        value:
            "ENVIAR_COTIZACION",
        label:
            "Enviar cotización",
    },
    {
        value:
            "HACER_SEGUIMIENTO",
        label:
            "Hacer seguimiento",
    },
    {
        value:
            "AGENDAR_REUNION",
        label:
            "Agendar reunión",
    },
    {
        value:
            "REVISAR_COTIZACION",
        label:
            "Revisar cotización",
    },
    {
        value:
            "AJUSTAR_PROPUESTA",
        label:
            "Ajustar propuesta",
    },
    {
        value:
            "ESPERAR_RESPUESTA",
        label:
            "Esperar respuesta del cliente",
    },
    {
        value:
            "NEGOCIAR",
        label:
            "Negociar condiciones",
    },
    {
        value:
            "SOLICITAR_APROBACION",
        label:
            "Solicitar aprobación",
    },
    {
        value:
            "CONFIRMAR_COMPRA",
        label:
            "Confirmar compra",
    },
    {
        value:
            "CERRAR_OPORTUNIDAD",
        label:
            "Cerrar oportunidad",
    },
];

export interface ProximaAccionOption {
    value: string;
    label: string;
}

export function getProximaAccionLabel(
    value?: string | null
): string {
    if (!value) {
        return "—";
    }

    return (
        PROXIMAS_ACCIONES.find(
            (opcion) =>
                opcion.value === value
        )?.label ??
        value
    );
}

export function getProximasAccionesOptions(
    valorActual?: string | null
): ProximaAccionOption[] {
    if (!valorActual) {
        return PROXIMAS_ACCIONES;
    }

    const existe =
        PROXIMAS_ACCIONES.some(
            (opcion) =>
                opcion.value === valorActual
        );

    if (existe) {
        return PROXIMAS_ACCIONES;
    }

    /*
     * Compatibilidad con oportunidades antiguas
     * donde próximaAccion era texto libre.
     */
    return [
        {
            value:
                valorActual,

            label:
                `${valorActual} (valor anterior)`,
        },

        ...PROXIMAS_ACCIONES,
    ];
}