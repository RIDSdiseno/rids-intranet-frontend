// src/components/modals-leypd/leypd.types.ts

export type EstadoLeypd =
    | "NO_INICIADO"
    | "EN_PROGRESO"
    | "IMPLEMENTADO"
    | "NO_APLICA";

export type AplicabilidadLeypd =
    | "GENERAL"
    | "CONDICIONAL";

export type TipoDocumentoLeypd =
    | "DOCX"
    | "PDF"
    | "XLSX"
    | "JS"
    | "CARPETA";

export interface LeypdDocumento {
    orden: number;
    nombreBase: string;
    tipo: TipoDocumentoLeypd;
    condicional?: boolean;
    subcarpeta?: string;
}

export interface LeypdElemento {
    id: number | null;

    numero: number;
    codigo: string;

    titulo: string;
    carpeta: string;
    descripcion: string;

    aplicabilidad:
    AplicabilidadLeypd;

    documentos:
    LeypdDocumento[];

    estado:
    EstadoLeypd;

    responsable:
    string | null;

    fechaCompromiso:
    string | null;

    evidencia:
    string | null;

    observaciones:
    string | null;

    actualizadoPorId:
    number | null;

    createdAt:
    string | null;

    updatedAt:
    string | null;
}

export interface LeypdResumen {
    total: number;

    implementados: number;
    noAplica: number;
    enProgreso: number;
    sinIniciar: number;

    completados: number;

    porcentaje: number;

    vencidos: number;

    ultimaActualizacion:
    string | null;
}

export interface LeypdEmpresaBase {
    id_empresa: number;
    nombre: string;
    razonSocial: string | null;
    isActive: boolean;
}

export interface LeypdEmpresaDetalle {
    empresa:
    LeypdEmpresaBase;

    resumen:
    LeypdResumen;

    elementos:
    LeypdElemento[];
}

/* =====================================================
   LISTADO
===================================================== */

export interface LeypdFichaResumen {
    existe: boolean;
    respondida: boolean;

    respondidoAt:
    string | null;

    updatedAt:
    string | null;
}

export interface LeypdEmpresaListado {
    empresaId: number;
    empresaNombre: string;
    razonSocial: string | null;

    total: number;

    implementados: number;
    noAplica: number;
    enProgreso: number;
    sinIniciar: number;

    completados: number;

    porcentaje: number;
    vencidos: number;

    ultimaActualizacion:
    string | null;

    ficha:
    LeypdFichaResumen;

    sharepoint:
    LeypdSharepointResumen;
}

export interface LeypdSharepointResumen {
    vinculado: boolean;

    carpetaWebUrl:
    string | null;

    sincronizadoAt:
    string | null;

    ultimoError:
    string | null;

    carpetasFaltantes: number;

    documentosFaltantes: number;
}

export interface LeypdListadoResponse {
    resumen: {
        totalEmpresas: number;
        clientesCompletos: number;
        clientesSinIniciar: number;
        compromisosVencidos: number;
        sharepointVinculadas: number;
        elementosImplementados: number;
    };

    empresas:
    LeypdEmpresaListado[];
}

/* =====================================================
   ACTUALIZACIÓN ELEMENTO
===================================================== */

export interface ActualizarElementoLeypdPayload {
    estado:
    EstadoLeypd;

    responsable:
    string | null;

    fechaCompromiso:
    string | null;

    evidencia:
    string | null;

    observaciones:
    string | null;
}

/* =====================================================
   FICHA
===================================================== */

export type FuenteFichaLeypd =
    | "CRM"
    | "RIDS"
    | "CLIENTE_PORTAL"
    | "ENLACE_PUBLICO";

export interface ValorFichaLeypd {
    valor: unknown;

    fuente:
    FuenteFichaLeypd;

    confirmado:
    boolean;

    actualizadoPor:
    string | null;

    fecha:
    string | null;
}

export type DatosFichaLeypd =
    Record<
        string,
        ValorFichaLeypd
    >;

export type TipoCampoFichaLeypd =
    | "text"
    | "textarea"
    | "email"
    | "number"
    | "boolean"
    | "date"
    | "select"
    | "multiselect";

export type GrupoFichaLeypd =
    | "DATOS_EMPRESA"
    | "SITIO_WEB"
    | "RESPONSABLES"
    | "TRATAMIENTO_DATOS"
    | "APROBACIONES_FECHAS";

export type CondicionFichaLeypd =
    | "RUBRO_SALUD"
    | "EMPRESA_PERSONAS"
    | "VENTA_ONLINE";

export interface CampoFichaLeypd {
    numero: number;

    key: string;

    grupo:
    GrupoFichaLeypd;

    label: string;

    descripcion?: string;

    tipo:
    TipoCampoFichaLeypd;

    obligatorio:
    boolean;

    elementos:
    number[];

    precarga:
    boolean;

    condicion?:
    CondicionFichaLeypd;

    opciones?: Array<{
        value: string;
        label: string;
    }>;

    placeholder?: string;

    formato?:
    | "rut"
    | "email"
    | "url_o_no_tiene"
    | "fecha";

    maxLength?: number;
}

export interface LeypdFicha {
    id: number | null;

    datos:
    DatosFichaLeypd;

    enlaceCreadoAt:
    string | null;

    tokenExpiresAt:
    string | null;

    tokenRevokedAt:
    string | null;

    respondidoAt:
    string | null;

    respondidoPor:
    string | null;

    fuenteRespuesta:
    string | null;

    createdAt:
    string | null;

    updatedAt:
    string | null;
}

export interface LeypdFichaInternaResponse {
    empresa: {
        id_empresa: number;
        nombre: string;
        razonSocial: string | null;
    };

    ficha:
    LeypdFicha;

    campos:
    CampoFichaLeypd[];
}

/* =====================================================
   ENLACE
===================================================== */

export interface GenerarEnlaceFichaLeypdResponse {
    token: string;
    url: string;
    expiresAt: string;
}

/* =====================================================
   JOB
===================================================== */

export type EstadoActualizacionLeypd =
    | "PENDIENTE"
    | "EJECUTANDO"
    | "COMPLETADO"
    | "ERROR"
    | "CANCELADO";

export interface LeypdActualizacion {
    id: number;

    estado:
    EstadoActualizacionLeypd;

    pasoActual: number;
    totalPasos:
    number | null;

    progreso: number;

    mensaje:
    string | null;

    error:
    string | null;

    iniciadoPorId:
    number | null;

    iniciadoAt:
    string | null;

    terminadoAt:
    string | null;

    createdAt:
    string;

    updatedAt:
    string;

    iniciadoPor?: {
        id_tecnico: number;
        nombre: string;
    } | null;
}

/* =====================================================
   FICHA PÚBLICA
===================================================== */

export interface LeypdFichaPublicaResponse {
    empresa: {
        nombre: string;
        razonSocial: string | null;
    };

    datos:
    DatosFichaLeypd;

    campos:
    CampoFichaLeypd[];

    nombreRespondienteBorrador:
    string | null;

    respondidoAt:
    string | null;

    tokenExpiresAt:
    string | null;
}

export interface GuardarFichaPublicaPayload {
    nombre: string | null;

    datos: Record<
        string,
        unknown
    >;
}

export interface EnviarFichaPublicaPayload {
    nombre: string;

    datos: Record<
        string,
        unknown
    >;
}

/* =====================================================
   ELEMENTO 04 — CONSENTIMIENTOS
===================================================== */

export interface ResumenConsentimientosLeypd {
    empresaId: number;

    totales: {
        campanias: number;
        activas: number;
        borradores: number;

        destinatarios: number;

        respondidos: number;
        aceptados: number;
        rechazados: number;
        revocados: number;

        pendientes: number;
        erroresEnvio: number;
        expirados: number;
    };

    campanias: Array<{
        id: number;
        nombre: string;

        estado:
        | "BORRADOR"
        | "ACTIVA"
        | "FINALIZADA"
        | "CANCELADA";

        versionDocumento: string;

        fechaInicio: string | null;
        fechaFin: string | null;
        fechaEnvioInicial: string | null;

        createdAt: string;

        destinatarios: number;
    }>;
}

/* =====================================================
   SHAREPOINT
===================================================== */

export interface DocumentoSharepointLeypd {
    nombre: string;
    webUrl: string;
    tamano: number | null;
    modificadoAt: string | null;
    esCarpeta: boolean;
}

export interface ElementoSharepointLeypd {
    numero: number;
    carpetaEsperada: string;
    existe: boolean;
    itemId: string | null;
    webUrl: string | null;
    documentos: DocumentoSharepointLeypd[];
    faltantes: string[];
    opcionalesFaltantes: string[];
}

export interface LeypdSharepointResponse {
    vinculado: boolean;

    carpeta: {
        nombre: string;
        webUrl: string;
    } | null;

    checklist: {
        nombre: string | null;
        webUrl: string;
    } | null;

    sincronizadoAt: string | null;
    ultimoError: string | null;

    elementos: ElementoSharepointLeypd[];
}