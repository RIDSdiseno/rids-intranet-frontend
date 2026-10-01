import {
    http,
} from "../../../service/http";

import type {
    ApiResponse,
    ContratoPdfData,
    SuscripcionContrato,
    SuscripcionContratoPayload,
} from "./suscripciones.types";

/* =========================================================
   LISTAR
========================================================= */

export async function listarSuscripciones(
    empresaId:
        number
): Promise<
    SuscripcionContrato[]
> {
    const response =
        await http.get<
            ApiResponse<
                SuscripcionContrato[]
            >
        >(
            `/ficha-empresa/${empresaId}/suscripciones`
        );

    return response.data.data;
}

/* =========================================================
   OBTENER
========================================================= */

export async function obtenerSuscripcion(
    empresaId:
        number,

    suscripcionId:
        number
): Promise<
    SuscripcionContrato
> {
    const response =
        await http.get<
            ApiResponse<
                SuscripcionContrato
            >
        >(
            `/ficha-empresa/${empresaId}/suscripciones/${suscripcionId}`
        );

    return response.data.data;
}

/* =========================================================
   CREAR
========================================================= */

export async function crearSuscripcion(
    empresaId:
        number,

    payload:
        SuscripcionContratoPayload
): Promise<
    SuscripcionContrato
> {
    const response =
        await http.post<
            ApiResponse<
                SuscripcionContrato
            >
        >(
            `/ficha-empresa/${empresaId}/suscripciones`,
            payload
        );

    return response.data.data;
}

/* =========================================================
   ACTUALIZAR
========================================================= */

export async function actualizarSuscripcion(
    empresaId:
        number,

    suscripcionId:
        number,

    payload:
        Partial<
            SuscripcionContratoPayload
        >
): Promise<
    SuscripcionContrato
> {
    const response =
        await http.patch<
            ApiResponse<
                SuscripcionContrato
            >
        >(
            `/ficha-empresa/${empresaId}/suscripciones/${suscripcionId}`,
            payload
        );

    return response.data.data;
}

/* =========================================================
   ELIMINAR
========================================================= */

export async function eliminarSuscripcion(
    empresaId:
        number,

    suscripcionId:
        number
): Promise<void> {
    await http.delete(
        `/ficha-empresa/${empresaId}/suscripciones/${suscripcionId}`
    );
}

/* =========================================================
   SUBIR CONTRATO
========================================================= */

export async function subirContrato(
    empresaId:
        number,

    suscripcionId:
        number,

    file:
        File
): Promise<
    SuscripcionContrato
> {
    const formData =
        new FormData();

    formData.append(
        "contrato",
        file
    );

    const response =
        await http.post<
            ApiResponse<
                SuscripcionContrato
            >
        >(
            `/ficha-empresa/${empresaId}/suscripciones/${suscripcionId}/contrato`,
            formData
        );

    return response.data.data;
}

/* =========================================================
   OBTENER CONTRATO
========================================================= */

export async function obtenerContrato(
    empresaId:
        number,

    suscripcionId:
        number
): Promise<
    ContratoPdfData
> {
    const response =
        await http.get<
            ApiResponse<
                ContratoPdfData
            >
        >(
            `/ficha-empresa/${empresaId}/suscripciones/${suscripcionId}/contrato`
        );

    return response.data.data;
}

/* =========================================================
   ELIMINAR CONTRATO
========================================================= */

export async function eliminarContrato(
    empresaId:
        number,

    suscripcionId:
        number
): Promise<void> {
    await http.delete(
        `/ficha-empresa/${empresaId}/suscripciones/${suscripcionId}/contrato`
    );
}