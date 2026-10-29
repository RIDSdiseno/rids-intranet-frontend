// src/components/modals-proteccion-datos/proteccion-datos.api.ts
import {
    api,
} from "../../api/api";

import type {
    ActualizarCampaniaProteccionDatosPayload,
    AgregarDestinatariosResponse,
    CampaniaProteccionDatos,
    CampaniasProteccionDatosResponse,
    CrearCampaniaProteccionDatosPayload,
    DestinatariosCampaniaResponse,
    EstadoCampaniaProteccionDatos,
    EmpresaProteccionDatos,
    SolicitanteProteccionDatos,
    DocumentoCampoConsentimiento,
    HistorialConsentimientoResponse
} from "./proteccion-datos.types";

/* =========================================================
   CAMPAÑAS
   ========================================================= */

export async function listarCampaniasProteccionDatos(
    params?: {
        estado?:
        EstadoCampaniaProteccionDatos;

        search?:
        string;

        skip?:
        number;

        take?:
        number;
    },
): Promise<CampaniasProteccionDatosResponse> {

    const response =
        await api.get(
            "/proteccion-datos/campanias",
            {
                params,
            },
        );

    return response.data.data;
}

/* =========================================================
   DETALLE
   ========================================================= */

export async function obtenerCampaniaProteccionDatos(
    id: number,
): Promise<CampaniaProteccionDatos> {

    const response =
        await api.get(
            `/proteccion-datos/campanias/${id}`,
        );

    return response.data.data;
}

/* =========================================================
   CREAR
   ========================================================= */

export async function crearCampaniaProteccionDatos(
    payload:
        CrearCampaniaProteccionDatosPayload,
): Promise<CampaniaProteccionDatos> {

    const response =
        await api.post(
            "/proteccion-datos/campanias",
            payload,
        );

    return response.data.data;
}

/* =========================================================
   ACTUALIZAR
   ========================================================= */

export async function actualizarCampaniaProteccionDatos(
    id: number,

    payload:
        ActualizarCampaniaProteccionDatosPayload,
): Promise<CampaniaProteccionDatos> {

    const response =
        await api.patch(
            `/proteccion-datos/campanias/${id}`,
            payload,
        );

    return response.data.data;
}

/* =========================================================
   ACTIVAR
   ========================================================= */

export async function activarCampaniaProteccionDatos(
    id: number,
): Promise<CampaniaProteccionDatos> {

    const response =
        await api.post(
            `/proteccion-datos/campanias/${id}/activar`,
        );

    return response.data.data;
}

/* =========================================================
   FINALIZAR
   ========================================================= */

export async function finalizarCampaniaProteccionDatos(
    id: number,
): Promise<CampaniaProteccionDatos> {

    const response =
        await api.post(
            `/proteccion-datos/campanias/${id}/finalizar`,
        );

    return response.data.data;
}

/* =========================================================
   CANCELAR
   ========================================================= */

export async function cancelarCampaniaProteccionDatos(
    id: number,
): Promise<CampaniaProteccionDatos> {

    const response =
        await api.post(
            `/proteccion-datos/campanias/${id}/cancelar`,
        );

    return response.data.data;
}

/* =========================================================
   DESTINATARIOS
   ========================================================= */

export async function agregarDestinatariosCampania(
    campaniaId: number,

    solicitanteIds: number[],
): Promise<AgregarDestinatariosResponse> {

    const response =
        await api.post(
            `/proteccion-datos/campanias/${campaniaId}/destinatarios`,
            {
                solicitanteIds,
            },
        );

    return response.data.data;
}

/* =========================================================
   LISTAR DESTINATARIOS
   ========================================================= */

export async function listarDestinatariosCampania(
    campaniaId: number,
): Promise<DestinatariosCampaniaResponse> {

    const response =
        await api.get(
            `/proteccion-datos/campanias/${campaniaId}/destinatarios`,
        );

    return response.data.data;
}

/* =========================================================
   QUITAR DESTINATARIO
   ========================================================= */

export async function quitarDestinatarioCampania(
    campaniaId: number,
    consentimientoId: number,
): Promise<{
    ok: boolean;
    consentimientoId: number;
}> {

    const response =
        await api.delete(
            `/proteccion-datos/campanias/${campaniaId}/destinatarios/${consentimientoId}`,
        );

    return response.data.data;
}

/* =========================================================
   EMPRESAS PARA SELECTOR
   ========================================================= */

export async function listarEmpresasProteccionDatos():
    Promise<EmpresaProteccionDatos[]> {

    const response =
        await api.get(
            "/empresas",
        );

    const raw =
        response.data;

    const items =
        Array.isArray(
            raw?.data,
        )
            ? raw.data
            : Array.isArray(
                raw,
            )
                ? raw
                : [];

    return items
        .filter(
            (
                empresa: EmpresaProteccionDatos,
            ) =>
                empresa &&
                Number.isInteger(
                    empresa.id_empresa,
                ) &&
                typeof empresa.nombre ===
                "string",
        )
        .sort(
            (
                a: EmpresaProteccionDatos,
                b: EmpresaProteccionDatos,
            ) =>
                a.nombre.localeCompare(
                    b.nombre,
                    "es",
                ),
        );
}

/* =========================================================
   SOLICITANTES PARA SELECTOR
   ========================================================= */

export async function listarSolicitantesProteccionDatos(
    empresaId?: number | null,
): Promise<SolicitanteProteccionDatos[]> {

    const response =
        await api.get(
            "/solicitantes/mailer",
            {
                params:
                    empresaId
                        ? {
                            empresaId,
                        }
                        : {},
            },
        );

    const items =
        Array.isArray(
            response.data?.items,
        )
            ? response.data.items
            : [];

    return items;
}

/* =========================================================
   ENVIAR CAMPAÑA
   ========================================================= */

export type ResultadoEnvioCampania = {
    campaniaId: number;

    procesados: number;

    enviados: number;

    errores: number;

    resultados: Array<{
        consentimientoId:
        number;

        email:
        string;

        ok:
        boolean;

        error?:
        string;
    }>;
};

export async function enviarCampaniaProteccionDatos(
    id: number,
): Promise<ResultadoEnvioCampania> {

    const response =
        await api.post(
            `/proteccion-datos/campanias/${id}/enviar`,
        );

    return response.data.data;
}

/* =========================================================
   SUBIR DOCUMENTO PROTECCIÓN DE DATOS
   ========================================================= */

export async function subirDocumentoProteccionDatos(
    file:
        File,
): Promise<DocumentoCampoConsentimiento> {

    const formData =
        new FormData();

    formData.append(
        "file",
        file,
    );

    const response =
        await api.post(
            "/proteccion-datos/documentos",
            formData,
        );

    return response.data.data;
}

/* =========================================================
   HISTORIAL DEL CONSENTIMIENTO
   ========================================================= */

export async function listarEventosConsentimiento(
    campaniaId:
        number,

    consentimientoId:
        number,
): Promise<HistorialConsentimientoResponse> {

    const response =
        await api.get(
            `/proteccion-datos/campanias/${campaniaId}/destinatarios/${consentimientoId}/eventos`,
        );

    return response.data.data;
}