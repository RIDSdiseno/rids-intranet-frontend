// src/components/modals-leypd/leypd.api.ts

import {
    api,
} from "../../api/api";

import type {
    ActualizarElementoLeypdPayload,
    EnviarFichaPublicaPayload,
    GenerarEnlaceFichaLeypdResponse,
    GuardarFichaPublicaPayload,
    LeypdActualizacion,
    LeypdEmpresaDetalle,
    LeypdFichaInternaResponse,
    LeypdFichaPublicaResponse,
    LeypdListadoResponse,
    ResumenConsentimientosLeypd,
    LeypdSharepointResponse
} from "./leypd.types";

/* =====================================================
   DASHBOARD
===================================================== */

export async function getLeypd() {
    const {
        data,
    } =
        await api.get<LeypdListadoResponse>(
            "/leypd"
        );

    return data;
}

/* =====================================================
   EMPRESA
===================================================== */

export async function getLeypdEmpresa(
    empresaId: number
) {
    const {
        data,
    } =
        await api.get<LeypdEmpresaDetalle>(
            `/leypd/${empresaId}`
        );

    return data;
}

/* =====================================================
   ELEMENTOS
===================================================== */

export async function updateLeypdElemento(
    empresaId: number,
    numero: number,
    payload: ActualizarElementoLeypdPayload
) {
    const {
        data,
    } =
        await api.put(
            `/leypd/${empresaId}/elementos/${numero}`,
            payload
        );

    return data;
}

/* =====================================================
   ELEMENTO 04 — CONSENTIMIENTOS
===================================================== */

export async function getLeypdConsentimientos(
    empresaId: number
) {
    const {
        data,
    } =
        await api.get<ResumenConsentimientosLeypd>(
            `/leypd/${empresaId}/elementos/4/consentimientos`
        );

    return data;
}

/* =====================================================
   SHAREPOINT
===================================================== */

export async function getLeypdSharepoint(
    empresaId: number
) {
    const {
        data,
    } =
        await api.get<LeypdSharepointResponse>(
            `/leypd/${empresaId}/sharepoint`
        );

    return data;
}

export async function vincularLeypdSharepoint(
    empresaId: number,
    url: string
) {
    const {
        data,
    } =
        await api.post<LeypdSharepointResponse>(
            `/leypd/${empresaId}/sharepoint/vincular`,
            {
                url,
            }
        );

    return data;
}

export async function sincronizarLeypdSharepoint(
    empresaId: number
) {
    const {
        data,
    } =
        await api.post<LeypdSharepointResponse>(
            `/leypd/${empresaId}/sharepoint/sincronizar`
        );

    return data;
}

/* =====================================================
   FICHA INTERNA
===================================================== */

export async function getLeypdFicha(
    empresaId: number
) {
    const {
        data,
    } =
        await api.get<LeypdFichaInternaResponse>(
            `/leypd/${empresaId}/ficha`
        );

    return data;
}

export async function updateLeypdFicha(
    empresaId: number,
    datos: Record<
        string,
        unknown
    >
) {
    const {
        data,
    } =
        await api.put(
            `/leypd/${empresaId}/ficha`,
            {
                datos,
            }
        );

    return data;
}

/* =====================================================
   ENLACE
===================================================== */

export async function createLeypdFichaLink(
    empresaId: number
) {
    const {
        data,
    } =
        await api.post<GenerarEnlaceFichaLeypdResponse>(
            `/leypd/${empresaId}/ficha/enlace`
        );

    return data;
}

export async function revokeLeypdFichaLink(
    empresaId: number
) {
    const {
        data,
    } =
        await api.post(
            `/leypd/${empresaId}/ficha/revocar`
        );

    return data;
}

/* =====================================================
   ACTUALIZACIONES
===================================================== */

export async function createLeypdActualizacion() {
    const {
        data,
    } =
        await api.post<LeypdActualizacion>(
            "/leypd/actualizaciones"
        );

    return data;
}

export async function getLeypdActualizacion(
    id: number
) {
    const {
        data,
    } =
        await api.get<LeypdActualizacion>(
            `/leypd/actualizaciones/${id}`
        );

    return data;
}

export async function getLeypdActualizacionActiva() {
    const {
        data,
    } =
        await api.get<{
            actualizacion:
            LeypdActualizacion | null;
        }>(
            "/leypd/actualizaciones/activa"
        );

    return data;
}

/* =====================================================
   FICHA PÚBLICA
===================================================== */

export async function getLeypdFichaPublica(
    token: string
) {
    const {
        data,
    } =
        await api.get<LeypdFichaPublicaResponse>(
            `/public/leypd/ficha/${token}`
        );

    return data;
}

export async function saveLeypdFichaPublica(
    token: string,
    payload: GuardarFichaPublicaPayload
) {
    const {
        data,
    } =
        await api.put(
            `/public/leypd/ficha/${token}`,
            payload
        );

    return data;
}

export async function sendLeypdFichaPublica(
    token: string,
    payload: EnviarFichaPublicaPayload
) {
    const {
        data,
    } =
        await api.post(
            `/public/leypd/ficha/${token}/enviar`,
            payload
        );

    return data;
}