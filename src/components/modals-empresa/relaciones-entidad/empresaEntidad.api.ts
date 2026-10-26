import {
    api,
} from "../../../api/api";

import type {
    EmpresaEntidadListadoResponse,
    EmpresaEntidadRelacionResponse,
    ResultadoRelacionAutomatica,
} from "./empresaEntidad.types";


/* =====================================================
   OBTENER RELACIÓN ACTUAL EMPRESA ↔ ENTIDADES
===================================================== */

export async function getRelacionEmpresaEntidades(
    empresaId:
        number
) {

    const {
        data,
    } =
        await api.get<
            EmpresaEntidadRelacionResponse
        >(
            `/empresas/${empresaId}/entidades-relacion`
        );


    return data.data;
}


/* =====================================================
   BUSCAR ENTIDADES DISPONIBLES
===================================================== */

export async function buscarEntidadesEmpresa(
    empresaId:
        number,

    search:
        string = ""
) {

    const {
        data,
    } =
        await api.get<
            EmpresaEntidadListadoResponse
        >(
            `/empresas/${empresaId}/entidades-disponibles`,
            {
                params: {
                    search,
                },
            }
        );


    return data.data;
}


/* =====================================================
   VINCULAR ENTIDAD MANUALMENTE
===================================================== */

export async function vincularEntidadEmpresa(
    empresaId:
        number,

    entidadId:
        number
) {

    const {
        data,
    } =
        await api.patch(
            `/empresas/${empresaId}/entidades/${entidadId}/vincular`
        );


    return data;
}


/* =====================================================
   DESVINCULAR ENTIDAD
===================================================== */

export async function desvincularEntidadEmpresa(
    empresaId:
        number,

    entidadId:
        number
) {

    const {
        data,
    } =
        await api.delete(
            `/empresas/${empresaId}/entidades/${entidadId}/desvincular`
        );


    return data;
}


/* =====================================================
   INTENTAR VINCULACIÓN AUTOMÁTICA
===================================================== */

export async function intentarRelacionAutomatica(
    empresaId:
        number
) {

    const {
        data,
    } =
        await api.post<{
            success:
            boolean;

            data:
            ResultadoRelacionAutomatica;
        }>(
            `/empresas/${empresaId}/entidades/auto`
        );


    return data.data;
}