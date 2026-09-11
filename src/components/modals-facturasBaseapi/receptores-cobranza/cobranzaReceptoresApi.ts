// src/components/modals-facturasBaseapi/receptores-cobranza/cobranzaReceptoresApi.ts

import {
    AxiosError,
} from "axios";

import {
    api,
} from "../../../api/api";

/* =========================================================
   TYPES
========================================================= */

export type EmpresaReceptorCobranza = {
    id_empresa: number;
    nombre: string;
    razonSocial?: string | null;
    isActive?: boolean;
};

export type ReceptorCobranzaContacto = {
    id: number;
    receptorId: number;

    nombre: string | null;
    email: string;

    activo: boolean;
    recibeCobranza: boolean;
    principal: boolean;

    origen: string;

    createdAt?: string;
    updatedAt?: string;
};

export type ReceptorCobranza = {
    id: number;

    rut: string;
    razonSocial: string | null;

    activo: boolean;
    recibeCobranza: boolean;

    diasCredito: number | null;

    empresaId: number | null;

    origen: string;

    createdAt?: string;
    updatedAt?: string;

    empresa?: EmpresaReceptorCobranza | null;

    contactos: ReceptorCobranzaContacto[];
};

export type ListarReceptoresCobranzaParams = {
    search?: string;
    origen?: string;

    activo?: boolean;
    recibeCobranza?: boolean;

    sinContactos?: boolean;

    empresaId?: number;
};

export type CrearReceptorCobranzaPayload = {
    rut: string;

    razonSocial?:
    string |
    null;

    activo?:
    boolean;

    diasCredito?:
    number |
    null;

    empresaId?:
    number |
    null;
};

export type ActualizarReceptorCobranzaPayload = {
    razonSocial?:
    string |
    null;

    activo?:
    boolean;

    recibeCobranza?:
    boolean;

    diasCredito?:
    number |
    null;

    empresaId?:
    number |
    null;
};

export type CrearContactoCobranzaPayload = {
    nombre?:
    string |
    null;

    email:
    string;

    principal?:
    boolean;

    activo?:
    boolean;

    recibeCobranza?:
    boolean;
};

export type ActualizarContactoCobranzaPayload = {
    nombre?:
    string |
    null;

    email?:
    string;

    principal?:
    boolean;

    activo?:
    boolean;

    recibeCobranza?:
    boolean;
};

/* =========================================================
   RESPONSE TYPES
========================================================= */

type ListarReceptoresCobranzaResponse = {
    ok: boolean;
    total: number;
    data: ReceptorCobranza[];
};

type ReceptorCobranzaResponse = {
    ok: boolean;
    data: ReceptorCobranza;
};

type ContactoCobranzaResponse = {
    ok: boolean;
    data: ReceptorCobranzaContacto;
};

type CopiarContactosFacturacionResponse = {
    ok: boolean;

    data: {
        creados: number;
        actualizados: number;
        total: number;

        receptor:
        ReceptorCobranza |
        null;
    };
};

type ApiErrorBody = {
    error?: string;
    message?: string;
};

/* =========================================================
   ERROR HELPER
========================================================= */

export function getCobranzaReceptoresApiError(
    error: unknown
): string {
    if (
        error instanceof
        AxiosError
    ) {
        const data =
            error.response?.data as
            ApiErrorBody |
            undefined;

        return String(
            data?.error ??
            data?.message ??
            error.message ??
            "Error al procesar la solicitud"
        );
    }

    if (
        error instanceof
        Error
    ) {
        return error.message;
    }

    return "Ocurrió un error inesperado";
}

/* =========================================================
   LISTAR
========================================================= */

export async function listarReceptoresCobranza(
    params:
        ListarReceptoresCobranzaParams =
        {}
): Promise<ListarReceptoresCobranzaResponse> {
    const {
        data,
    } =
        await api.get<ListarReceptoresCobranzaResponse>(
            "/baseapi/cobranza/receptores",
            {
                params,
            }
        );

    return data;
}

/* =========================================================
   OBTENER POR ID
========================================================= */

export async function obtenerReceptorCobranza(
    receptorId:
        number
): Promise<ReceptorCobranza> {
    const {
        data,
    } =
        await api.get<ReceptorCobranzaResponse>(
            `/baseapi/cobranza/receptores/${receptorId}`
        );

    return data.data;
}

/* =========================================================
   OBTENER POR RUT
========================================================= */

export async function obtenerReceptorCobranzaPorRut(
    rut:
        string
): Promise<ReceptorCobranza> {
    const {
        data,
    } =
        await api.get<ReceptorCobranzaResponse>(
            `/baseapi/cobranza/receptores/rut/${encodeURIComponent(
                rut
            )}`
        );

    return data.data;
}

/* =========================================================
   CREAR RECEPTOR
========================================================= */

export async function crearReceptorCobranza(
    payload:
        CrearReceptorCobranzaPayload
): Promise<ReceptorCobranza> {
    const {
        data,
    } =
        await api.post<ReceptorCobranzaResponse>(
            "/baseapi/cobranza/receptores",
            payload
        );

    return data.data;
}

/* =========================================================
   ACTUALIZAR RECEPTOR
========================================================= */

export async function actualizarReceptorCobranza(
    receptorId:
        number,

    payload:
        ActualizarReceptorCobranzaPayload
): Promise<ReceptorCobranza> {
    const {
        data,
    } =
        await api.patch<ReceptorCobranzaResponse>(
            `/baseapi/cobranza/receptores/${receptorId}`,
            payload
        );

    return data.data;
}

/* =========================================================
   ELIMINAR RECEPTOR
========================================================= */

export async function eliminarReceptorCobranza(
    receptorId:
        number
): Promise<void> {
    await api.delete(
        `/baseapi/cobranza/receptores/${receptorId}`
    );
}

/* =========================================================
   CREAR CONTACTO
========================================================= */

export async function crearContactoCobranza(
    receptorId:
        number,

    payload:
        CrearContactoCobranzaPayload
): Promise<ReceptorCobranzaContacto> {
    const {
        data,
    } =
        await api.post<ContactoCobranzaResponse>(
            `/baseapi/cobranza/receptores/${receptorId}/contactos`,
            payload
        );

    return data.data;
}

/* =========================================================
   ACTUALIZAR CONTACTO
========================================================= */

export async function actualizarContactoCobranza(
    receptorId:
        number,

    contactoId:
        number,

    payload:
        ActualizarContactoCobranzaPayload
): Promise<ReceptorCobranzaContacto> {
    const {
        data,
    } =
        await api.patch<ContactoCobranzaResponse>(
            `/baseapi/cobranza/receptores/${receptorId}/contactos/${contactoId}`,
            payload
        );

    return data.data;
}

/* =========================================================
   ELIMINAR CONTACTO
========================================================= */

export async function eliminarContactoCobranza(
    receptorId:
        number,

    contactoId:
        number
): Promise<void> {
    await api.delete(
        `/baseapi/cobranza/receptores/${receptorId}/contactos/${contactoId}`
    );
}

/* =========================================================
   COPIAR CONTACTOS DESDE FACTURACIÓN
========================================================= */

export async function copiarContactosFacturacion(
    receptorId:
        number
): Promise<
    CopiarContactosFacturacionResponse["data"]
> {
    const {
        data,
    } =
        await api.post<CopiarContactosFacturacionResponse>(
            `/baseapi/cobranza/receptores/${receptorId}/copiar-contactos-facturacion`
        );

    return data.data;
}