import {
    api,
} from "../../../api/api";

import type {
    EstadoOportunidadMercadoPublico,
    MercadoPublicoCambiarEstadoResponse,
    MercadoPublicoConvertirResponse,
    MercadoPublicoFiltros,
    MercadoPublicoListadoResponse,
    MercadoPublicoSincronizarResponse,
} from "./mercado-publico.types";


export async function listarMercadoPublico(
    filtros:
        MercadoPublicoFiltros = {}
): Promise<MercadoPublicoListadoResponse> {

    const params:
        Record<
            string,
            string | number
        > = {};


    if (
        filtros.texto
    ) {
        params.texto =
            filtros.texto;
    }


    if (
        filtros.estado
    ) {
        params.estado =
            filtros.estado;
    }


    if (
        filtros.scoreMin !==
        undefined
    ) {
        params.scoreMin =
            filtros.scoreMin;
    }


    if (
        filtros.region
    ) {
        params.region =
            filtros.region;
    }


    if (
        filtros.page !==
        undefined
    ) {
        params.page =
            filtros.page;
    }


    if (
        filtros.limit !==
        undefined
    ) {
        params.limit =
            filtros.limit;
    }


    const {
        data,
    } =
        await api.get<
            MercadoPublicoListadoResponse
        >(
            "/mercado-publico",
            {
                params,
            }
        );


    return data;
}


export async function sincronizarMercadoPublico():
    Promise<MercadoPublicoSincronizarResponse> {

    const {
        data,
    } =
        await api.post<
            MercadoPublicoSincronizarResponse
        >(
            "/mercado-publico/sincronizar"
        );


    return data;
}


export async function actualizarEstadoMercadoPublico(
    id:
        number,
    estado:
        EstadoOportunidadMercadoPublico
): Promise<MercadoPublicoCambiarEstadoResponse> {

    const {
        data,
    } =
        await api.patch<
            MercadoPublicoCambiarEstadoResponse
        >(
            `/mercado-publico/${id}/estado`,
            {
                estado,
            }
        );


    return data;
}


export async function convertirMercadoPublicoAFunnel(
    id:
        number
): Promise<MercadoPublicoConvertirResponse> {

    const {
        data,
    } =
        await api.post<
            MercadoPublicoConvertirResponse
        >(
            `/mercado-publico/${id}/convertir`
        );


    return data;
}