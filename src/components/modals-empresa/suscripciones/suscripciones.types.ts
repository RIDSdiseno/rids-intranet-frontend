export type MonedaSuscripcion =
    | "CLP"
    | "USD"
    | "EUR"
    | "UF";

export type SuscripcionEjecutivo = {
    id?: number;

    nombre: string;

    email: string | null;

    telefono: string | null;

    principal: boolean;
};

export type SuscripcionContactoSoporte = {
    id?: number;

    nombre: string | null;

    email: string | null;

    telefono: string | null;

    principal: boolean;
};

export type SuscripcionContrato = {
    id: number;

    empresaId: number;

    proveedor: string;

    fabricante: string;

    productoPlan: string;

    cantidadLicencias: number;

    costoMensual:
    number |
    string |
    null;

    moneda: string;

    fechaInicio:
    string |
    null;

    fechaTermino:
    string |
    null;

    fechaRenovacion:
    string |
    null;

    numeroContrato:
    string |
    null;

    numeroOferta:
    string |
    null;

    observaciones:
    string |
    null;

    activo: boolean;

    contratoNombre:
    string |
    null;

    contratoMimeType:
    string |
    null;

    contratoBytes:
    number |
    null;

    contratoStoragePath?:
    string |
    null;

    ejecutivosComerciales:
    SuscripcionEjecutivo[];

    contactosSoporte:
    SuscripcionContactoSoporte[];

    createdAt: string;

    updatedAt: string;
};

export type SuscripcionContratoPayload = {
    proveedor: string;

    fabricante: string;

    productoPlan: string;

    cantidadLicencias: number;

    costoMensual:
    number |
    null;

    moneda: string;

    fechaInicio:
    string |
    null;

    fechaTermino:
    string |
    null;

    fechaRenovacion:
    string |
    null;

    numeroContrato:
    string |
    null;

    numeroOferta:
    string |
    null;

    observaciones:
    string |
    null;

    activo: boolean;

    ejecutivosComerciales:
    SuscripcionEjecutivo[];

    contactosSoporte:
    SuscripcionContactoSoporte[];
};

export type ContratoPdfData = {
    nombre:
    string |
    null;

    mimeType:
    string |
    null;

    bytes:
    number |
    null;

    url: string;

    expiresIn: number;
};

export type ApiResponse<T> = {
    ok: boolean;

    data: T;

    error?: string;
};