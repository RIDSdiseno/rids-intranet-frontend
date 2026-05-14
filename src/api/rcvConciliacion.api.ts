import { api } from "./api";

export type EmpresaKey = "econnet" | "rids";
export type TipoRcv = "ventas" | "compras";

export async function fetchConciliacionRcv(params: {
    empresa: EmpresaKey;
    tipo: TipoRcv;
    mes: string;
    ano: string;
    forceRefresh?: boolean;
}) {
    const res = await api.get("/baseapi/rcv/conciliacion", {
        params: {
            empresa: params.empresa,
            tipo: params.tipo,
            mes: params.mes,
            ano: params.ano,
            ...(params.forceRefresh ? { forceRefresh: true } : {}),
        },
    });

    return res.data;
}

export async function conciliarRcv(payload: {
    empresa: EmpresaKey;
    tipoRcv: TipoRcv;
    tipoDoc: string;
    folio: string;
    rutContraparte: string;
    razonSocial?: string | null;
    fechaDocto?: string | null;
    montoNeto?: number;
    montoIva?: number;
    montoTotal?: number;
    estadoRcv?: string | null;
    origenRcv?: string | null;
    formaPago?: string | null;
    observacion?: string | null;
}) {
    const res = await api.post("/baseapi/rcv/conciliacion/conciliar", payload);
    return res.data;
}

export async function desconciliarRcv(payload: {
    empresa: EmpresaKey;
    tipoRcv: TipoRcv;
    tipoDoc: string;
    folio: string;
    rutContraparte: string;
}) {
    const res = await api.post("/baseapi/rcv/conciliacion/desconciliar", payload);
    return res.data;
}

export async function observarRcv(payload: {
    empresa: EmpresaKey;
    tipoRcv: TipoRcv;
    tipoDoc: string;
    folio: string;
    rutContraparte: string;
    observacion: string;
}) {
    const res = await api.post("/baseapi/rcv/conciliacion/observar", payload);
    return res.data;
}