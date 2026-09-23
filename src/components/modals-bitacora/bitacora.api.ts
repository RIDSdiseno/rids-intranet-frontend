import {
    api,
} from "../../api/api";

import type {
    ActualizarBitacoraTecnicoPayload,
    BitacoraEtapa,
    BitacoraEvidencia,
    BitacoraTecnico,
    CrearBitacoraTecnicoPayload,
    EtapaBitacora,
    FiltrosBitacoraTecnico,
} from "./bitacora.types";

function buildQuery(
    params?: FiltrosBitacoraTecnico
) {
    const query =
        new URLSearchParams();

    if (!params) {
        return "";
    }

    Object.entries(
        params
    ).forEach(
        ([key, value]) => {
            if (
                value !== undefined &&
                value !== null &&
                String(value).trim() !== ""
            ) {
                query.set(
                    key,
                    String(value)
                );
            }
        }
    );

    const queryString =
        query.toString();

    return queryString
        ? `?${queryString}`
        : "";
}

export async function obtenerBitacoraTecnicoPorId(
    id: number
): Promise<{
    data: BitacoraTecnico;
}> {
    const res =
        await api.get(
            `/bitacora-tecnico/${id}`
        );

    return res.data;
}

export async function obtenerBitacorasTecnico(
    params?: FiltrosBitacoraTecnico
): Promise<{
    data: BitacoraTecnico[];
}> {
    const res =
        await api.get(
            `/bitacora-tecnico${buildQuery(
                params
            )}`,
            {
                headers: {
                    "Cache-Control":
                        "no-cache",
                    Pragma:
                        "no-cache",
                },
            }
        );

    return res.data;
}

export async function crearBitacoraTecnico(
    payload:
        CrearBitacoraTecnicoPayload
) {
    const res =
        await api.post(
            "/bitacora-tecnico",
            payload
        );

    return res.data;
}

export async function actualizarBitacoraTecnico(
    id: number,
    payload:
        ActualizarBitacoraTecnicoPayload
) {
    const res =
        await api.put(
            `/bitacora-tecnico/${id}`,
            payload
        );

    return res.data;
}

export async function eliminarBitacoraTecnico(
    id: number
) {
    const res =
        await api.delete(
            `/bitacora-tecnico/${id}`
        );

    return res.data;
}

export async function actualizarEstadoRecordatorio(
    id: number,
    completado: boolean
) {
    const res =
        await api.patch(
            `/bitacora-tecnico/${id}/recordatorio`,
            {
                completado,
            }
        );

    return res.data;
}

export async function obtenerEvidenciasBitacora(
    bitacoraId: number
): Promise<{
    data: BitacoraEvidencia[];
}> {
    const res =
        await api.get(
            `/bitacora-tecnico/${bitacoraId}/evidencias`
        );

    return res.data;
}

export async function subirEvidenciaBitacora(
    bitacoraId: number,
    etapa:
        EtapaBitacora,
    archivo: File,
    descripcion?: string
) {
    const formData =
        new FormData();

    formData.append(
        "archivo",
        archivo
    );

    formData.append(
        "etapa",
        etapa
    );

    if (
        descripcion?.trim()
    ) {
        formData.append(
            "descripcion",
            descripcion.trim()
        );
    }

    const res =
        await api.post(
            `/bitacora-tecnico/${bitacoraId}/evidencias`,
            formData
        );

    return res.data;
}

export async function eliminarEvidenciaBitacora(
    bitacoraId: number,
    evidenciaId: number
) {
    const res =
        await api.delete(
            `/bitacora-tecnico/${bitacoraId}/evidencias/${evidenciaId}`
        );

    return res.data;
}

export async function obtenerEtapasBitacora(
    bitacoraId:
        number
): Promise<{
    data:
        BitacoraEtapa[];
}> {
    const res =
        await api.get(
            `/bitacora-tecnico/${bitacoraId}/etapas`
        );

    return res.data;
}

export async function actualizarEtapaBitacora(
    bitacoraId:
        number,

    etapaId:
        number,

    payload: {
        titulo?: string | null;

        descripcion?: string | null;

        requiereRevision?: boolean;
    }
) {
    const res =
        await api.patch(
            `/bitacora-tecnico/${bitacoraId}/etapas/${etapaId}`,
            payload
        );

    return res.data;
}

export async function completarEtapaBitacora(
    bitacoraId:
        number,

    etapaId:
        number
) {
    const res =
        await api.post(
            `/bitacora-tecnico/${bitacoraId}/etapas/${etapaId}/completar`
        );

    return res.data;
}

export async function solicitarRevisionEtapa(
    bitacoraId:
        number,

    etapaId:
        number,

    payload: {
        aprobadorId: number;

        comentarioSolicitud?: string;
    }
) {
    const res =
        await api.post(
            `/bitacora-tecnico/${bitacoraId}/etapas/${etapaId}/solicitar-revision`,
            payload
        );

    return res.data;
}

export async function responderRevisionEtapa(
    bitacoraId:
        number,

    etapaId:
        number,

    aprobacionId:
        number,

    payload: {
        aprobar: boolean;

        comentarioRespuesta?: string;
    }
) {
    const res =
        await api.post(
            `/bitacora-tecnico/${bitacoraId}/etapas/${etapaId}/aprobaciones/${aprobacionId}/responder`,
            payload
        );

    return res.data;
}