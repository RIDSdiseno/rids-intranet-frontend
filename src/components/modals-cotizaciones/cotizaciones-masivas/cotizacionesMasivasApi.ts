import { api } from "../../../api/api";

export type GenerarCotizacionesMasivasPayload = {
    nombreGrupo?: string;
    comentariosCotizacion: string;
    cotizaciones: Array<{
        entidadId: number;
        comentariosCotizacion?: string;
        items: Array<{
            productoId: number;
            cantidad: number;
        }>;
    }>;
};

export type CrearPlantillaMasivaPayload = {
    nombre: string;
    descripcion?: string;
    tecnicoId?: number | null;
    items: Array<{
        productoId: number;
    }>;
    entidades: Array<{
        entidadId: number;
        cantidades: Array<{
            productoId: number;
            cantidad: number;
        }>;
    }>;
};

export async function generarCotizacionesMasivasDirecto(
    payload: GenerarCotizacionesMasivasPayload
) {
    const { data } = await api.post(
        "/cotizaciones-masivas/generar-directo",
        payload
    );

    return data;
}

export async function crearPlantillaMasiva(
    payload: CrearPlantillaMasivaPayload
) {
    const { data } = await api.post("/cotizaciones-masivas", payload);
    return data;
}

export async function listarPlantillasMasivas() {
    const { data } = await api.get("/cotizaciones-masivas");
    return data;
}

export async function generarDesdePlantilla(
    plantillaId: number,
    payload?: {
        nombreEjecucion?: string;
        comentariosCotizacion?: string;
    }
) {
    const { data } = await api.post(
        `/cotizaciones-masivas/${plantillaId}/generar`,
        payload ?? {}
    );

    return data;
}

export async function desactivarPlantillaMasiva(plantillaId: number) {
    const { data } = await api.delete(`/cotizaciones-masivas/${plantillaId}`);
    return data;
}