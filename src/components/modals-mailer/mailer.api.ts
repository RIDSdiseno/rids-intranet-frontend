// src/components/modals-mailer/mailer.api.ts

import {
    api,
} from "../../api/api";

import type {
    ActualizarPlantillaInput,
    CrearPlantillaInput,
    EmpresaMailer,
    EnviarMasivoPayload,
    EnviarMasivoResponse,
    MailerJob,
    PlantillaCorreo,
    PlantillaCorreoDetalle,
    SolicitanteMailer,
    TecnicoMailer,
    UsoPlantillaCorreo,
    FirmaRemitenteMailer
} from "./mailer.types";


// =====================================================
// DESTINATARIOS
// =====================================================

export async function getSolicitantesMailer(
    empresaId?: number | null
): Promise<SolicitanteMailer[]> {

    const params:
        Record<string, number> =
        {};

    if (
        empresaId !== undefined &&
        empresaId !== null
    ) {
        params.empresaId =
            empresaId;
    }

    const {
        data,
    } =
        await api.get(
            "/solicitantes/mailer",
            {
                params,
            }
        );

    return Array.isArray(
        data?.items
    )
        ? data.items
        : [];
}


export async function getEmpresasMailer():
    Promise<EmpresaMailer[]> {

    const {
        data,
    } =
        await api.get(
            "/empresas"
        );

    const items =
        Array.isArray(
            data?.data
        )
            ? data.data
            : Array.isArray(
                data
            )
                ? data
                : [];

    return items;
}


export async function getTecnicosMailer():
    Promise<TecnicoMailer[]> {

    const {
        data,
    } =
        await api.get(
            "/tecnicos",
            {
                params: {
                    page: 1,
                    pageSize: 500,
                },
            }
        );

    const items =
        data?.data ??
        data?.items ??
        data ??
        [];

    return Array.isArray(
        items
    )
        ? items
        : [];
}


// =====================================================
// PLANTILLAS - READ
// =====================================================

export async function getPlantillasCorreo(
    uso?:
        UsoPlantillaCorreo
):
    Promise<PlantillaCorreo[]> {

    const {
        data,
    } =
        await api.get(
            "/correo/plantillas",
            {
                params:
                    uso
                        ? {
                            uso,
                        }
                        : undefined,
            }
        );

    return Array.isArray(
        data?.plantillas
    )
        ? data.plantillas
        : [];
}


export async function getPlantillaCorreo(
    id: number
): Promise<PlantillaCorreoDetalle> {

    const {
        data,
    } =
        await api.get(
            `/correo/plantillas/${id}`
        );

    return data.plantilla;
}


// =====================================================
// PLANTILLAS - CREATE
// =====================================================

export async function crearPlantillaCorreo({
    nombre,
    descripcion,
    uso,
    file,
}: CrearPlantillaInput):
    Promise<PlantillaCorreoDetalle> {

    const formData =
        new FormData();

    formData.append(
        "nombre",
        nombre.trim()
    );

    formData.append(
        "uso",
        uso
    );

    if (
        descripcion !== undefined &&
        descripcion.trim()
    ) {
        formData.append(
            "descripcion",
            descripcion.trim()
        );
    }

    formData.append(
        "file",
        file
    );

    const {
        data,
    } =
        await api.post(
            "/correo/plantillas",
            formData
        );

    return data.plantilla;
}


// =====================================================
// PLANTILLAS - UPDATE
// =====================================================

export async function actualizarPlantillaCorreo(
    id: number,
    input: ActualizarPlantillaInput
): Promise<PlantillaCorreoDetalle> {

    const {
        data,
    } =
        await api.patch(
            `/correo/plantillas/${id}`,
            input
        );

    return data.plantilla;
}


// =====================================================
// PLANTILLAS - DELETE
// =====================================================

export async function eliminarPlantillaCorreo(
    id: number
): Promise<void> {

    await api.delete(
        `/correo/plantillas/${id}`
    );
}

// =====================================================
// FIRMA REMITENTE
// =====================================================

export async function getFirmaRemitente():
    Promise<FirmaRemitenteMailer> {

    const {
        data,
    } =
        await api.get(
            "/correo/firma-remitente"
        );

    return data.firma;
}

// =====================================================
// ENVÍO
// =====================================================

export async function enviarCorreoMasivo(
    payload:
        EnviarMasivoPayload
): Promise<EnviarMasivoResponse> {

    const {
        data,
    } =
        await api.post(
            "/correo/enviar-masivo",
            payload
        );

    return data;
}

// =====================================================
// ESTADO ENVÍO MASIVO
// =====================================================

export async function getEstadoEnvioMasivo(
    id: string
): Promise<MailerJob> {

    const {
        data,
    } =
        await api.get(
            `/correo/enviar-masivo/status/${id}`
        );

    return data.job;
}