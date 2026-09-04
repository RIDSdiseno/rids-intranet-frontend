// src/components/modals-facturasBaseapi/receptores-facturacion/facturaReceptoresApi.ts

import axios from "axios";

import {
    api,
} from "../../../api/api";

/* =========================================================
   TYPES
========================================================= */

export type ReceptorFacturacionOrigen =
    | "CRM"
    | "RCV"
    | "MANUAL"
    | string;

export type EmpresaReceptor = {
    id_empresa:
    number;

    nombre:
    string;
};

export type ReceptorFacturacionContacto = {
    id:
    number;

    receptorId:
    number;

    nombre:
    string | null;

    email:
    string;

    activo:
    boolean;

    recibeFacturas:
    boolean;

    principal:
    boolean;

    origen:
    string;

    createdAt:
    string;

    updatedAt:
    string;
};

export type ReceptorFacturacion = {
    id:
    number;

    rut:
    string;

    razonSocial:
    string | null;

    activo:
    boolean;

    recibeFacturas:
    boolean;

    empresaId:
    number | null;

    origen:
    ReceptorFacturacionOrigen;

    createdAt:
    string;

    updatedAt:
    string;

    empresa:
    EmpresaReceptor | null;

    contactos:
    ReceptorFacturacionContacto[];
};

export type ListarReceptoresParams = {
    search?:
    string;

    origen?:
    string;

    activo?:
    boolean;

    recibeFacturas?:
    boolean;

    sinContactos?:
    boolean;

    empresaId?:
    number;
};

export type ActualizarReceptorPayload = {
    razonSocial?:
    string | null;

    activo?:
    boolean;

    recibeFacturas?:
    boolean;
};

export type CrearContactoPayload = {
    nombre?:
    string | null;

    email:
    string;

    principal?:
    boolean;

    activo?:
    boolean;

    recibeFacturas?:
    boolean;
};

export type ActualizarContactoPayload = {
    nombre?:
    string | null;

    email?:
    string;

    principal?:
    boolean;

    activo?:
    boolean;

    recibeFacturas?:
    boolean;
};

/* =========================================================
   RESPONSES
========================================================= */

type ListarReceptoresResponse = {
    ok:
    boolean;

    total:
    number;

    data:
    ReceptorFacturacion[];
};

type ReceptorResponse = {
    ok:
    boolean;

    data:
    ReceptorFacturacion;
};

type ContactoResponse = {
    ok:
    boolean;

    data:
    ReceptorFacturacionContacto;
};

/* =========================================================
   ERROR
========================================================= */

export function getFacturaApiError(
    error:
        unknown
): string {
    if (
        axios.isAxiosError(
            error
        )
    ) {
        const backendError =
            error.response
                ?.data
                ?.error;

        if (
            typeof backendError ===
            "string" &&
            backendError.trim()
        ) {
            return backendError;
        }

        const backendMessage =
            error.response
                ?.data
                ?.message;

        if (
            typeof backendMessage ===
            "string" &&
            backendMessage.trim()
        ) {
            return backendMessage;
        }

        return (
            error.message ||
            "No fue posible realizar la operación"
        );
    }

    if (
        error instanceof Error
    ) {
        return error.message;
    }

    return "Error desconocido";
}

/* =========================================================
   RECEPTORES
========================================================= */

export async function listarReceptores(
    params:
        ListarReceptoresParams = {}
) {
    const response =
        await api.get<
            ListarReceptoresResponse
        >(
            "/baseapi/facturas/receptores",
            {
                params,
            }
        );

    return response.data;
}

export async function obtenerReceptor(
    id:
        number
) {
    const response =
        await api.get<
            ReceptorResponse
        >(
            `/baseapi/facturas/receptores/${id}`
        );

    return response.data;
}

export async function crearReceptor(
    payload:
        CrearReceptorPayload
) {
    const response =
        await api.post<
            ReceptorResponse
        >(
            "/baseapi/facturas/receptores",
            payload
        );

    return response.data;
}

export async function actualizarReceptor(
    id:
        number,

    payload:
        ActualizarReceptorPayload
) {
    const response =
        await api.patch<
            ReceptorResponse
        >(
            `/baseapi/facturas/receptores/${id}`,
            payload
        );

    return response.data;
}

/* =========================================================
   CONTACTOS
========================================================= */

export async function crearContactoReceptor(
    receptorId:
        number,

    payload:
        CrearContactoPayload
) {
    const response =
        await api.post<
            ContactoResponse
        >(
            `/baseapi/facturas/receptores/${receptorId}/contactos`,
            payload
        );

    return response.data;
}

export async function actualizarContactoReceptor(
    receptorId:
        number,

    contactoId:
        number,

    payload:
        ActualizarContactoPayload
) {
    const response =
        await api.patch<
            ContactoResponse
        >(
            `/baseapi/facturas/receptores/${receptorId}/contactos/${contactoId}`,
            payload
        );

    return response.data;
}

export async function eliminarContactoReceptor(
    receptorId:
        number,

    contactoId:
        number
) {
    const response =
        await api.delete<{
            ok:
            boolean;
        }>(
            `/baseapi/facturas/receptores/${receptorId}/contactos/${contactoId}`
        );

    return response.data;
}

export type CrearReceptorPayload = {
    rut:
    string;

    razonSocial?:
    string | null;

    activo?:
    boolean;
};

export async function eliminarReceptor(
    id:
        number
) {
    const response =
        await api.delete<{
            ok:
            boolean;
        }>(
            `/baseapi/facturas/receptores/${id}`
        );

    return response.data;
}