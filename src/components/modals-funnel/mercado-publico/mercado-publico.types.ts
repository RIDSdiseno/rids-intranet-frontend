export type EstadoOportunidadMercadoPublico =
    | "NUEVA"
    | "INTERESANTE"
    | "DESCARTADA"
    | "CONVERTIDA";


export type NivelAfinidadMercadoPublico =
    | "BAJA"
    | "MEDIA"
    | "ALTA"
    | "MUY_ALTA";


export type MercadoPublicoEntidadMini = {
    id: number;
    nombre: string;
    rut: string | null;
};


export type MercadoPublicoOportunidadVentaMini = {
    id: number;
    codigo: string;
    etapa: string;
    titulo: string;
};


export type MercadoPublicoOportunidad = {
    id: number;

    codigoExterno: string;

    nombre: string;

    descripcion: string | null;

    codigoEstado: number | null;

    estadoMercadoPublico: string | null;

    tipoLicitacion: string | null;

    fechaPublicacion: string | null;

    fechaCierre: string | null;

    moneda: string | null;

    montoEstimado:
    | string
    | number
    | null;

    organismoCodigo: string | null;

    organismoNombre: string;

    organismoRut: string | null;

    unidadCodigo: string | null;

    unidadNombre: string | null;

    unidadDireccion: string | null;

    unidadComuna: string | null;

    unidadRegion: string | null;

    contactoNombre: string | null;

    contactoCargo: string | null;

    contactoEmail: string | null;

    contactoTelefono: string | null;

    score: number;

    nivelAfinidad:
    NivelAfinidadMercadoPublico;

    coincidencias: string[];

    estado:
    EstadoOportunidadMercadoPublico;

    entidadId: number | null;

    oportunidadVentaId: number | null;

    convertidoPorId: number | null;

    convertidoAt: string | null;

    sincronizadoAt: string;

    createdAt: string;

    updatedAt: string;

    entidad:
    MercadoPublicoEntidadMini |
    null;

    oportunidadVenta:
    MercadoPublicoOportunidadVentaMini |
    null;
};


export type MercadoPublicoMeta = {
    page: number;
    limit: number;
    total: number;
    pages: number;
};


export type MercadoPublicoListadoResponse = {
    success: boolean;

    data:
    MercadoPublicoOportunidad[];

    meta:
    MercadoPublicoMeta;
};


export type MercadoPublicoFiltros = {
    texto?: string;
    estado?: EstadoOportunidadMercadoPublico;
    scoreMin?: number;
    region?: string;
    page?: number;
    limit?: number;
};


export type MercadoPublicoSincronizacionResultado = {
    totalApi:
    number;

    procesadas:
    number;

    nuevas:
    number;

    actualizadas:
    number;

    descartadasScore:
    number;

    detallesConsultados:
    number;

    omitidasExistentes:
    number;

    omitidasPorLimite:
    number;
};


export type MercadoPublicoSincronizarResponse = {
    success: boolean;

    data:
    MercadoPublicoSincronizacionResultado;
};


export type MercadoPublicoCambiarEstadoResponse = {
    success: boolean;

    data:
    MercadoPublicoOportunidad;
};


export type MercadoPublicoConvertirResponse = {
    success: boolean;

    data: {
        oportunidadMercadoPublicoId:
        number;

        entidad: {
            id: number;
            nombre: string;
            rut: string | null;
        };

        oportunidad: {
            id: number;
            codigo: string;
            titulo: string;
            etapa: string;
        };
    };
};