// src/components/modals-proteccion-datos/proteccion-datos.types.ts

export type TipoCampoConsentimiento =
    | "TEXT"
    | "CHECKBOX"
    | "RADIO";

export type OpcionCampoConsentimiento = {
    value: string;

    label: string;
};

export type CampoConsentimiento = {
    key: string;

    tipo:
    TipoCampoConsentimiento;

    label: string;

    descripcion?:
    string;

    obligatorio:
    boolean;

    placeholder?:
    string;

    opciones?:
    OpcionCampoConsentimiento[];

    documentos?:
    DocumentoCampoConsentimiento[];

    /** Documentos de la carpeta LEYPD de la empresa de cada destinatario. */
    documentosLeypd?:
    DocumentoLeypdCampoConsentimiento[];
};

export type DocumentoLeypdCampoConsentimiento = {
    elemento:
    number;

    nombreBase:
    string;

    titulo:
    string;
};

export type ConfiguracionConsentimiento = {
    schemaVersion:
    2;

    tituloFormulario:
    string;

    descripcionFormulario?:
    string;

    textoBoton:
    string;

    campos:
    CampoConsentimiento[];
};

export type RespuestaConsentimiento = {
    aceptado:
    boolean;

    respuestas:
    Record<
        string,
        string |
        boolean
    >;
};

export type OrigenCampaniaProteccionDatos =
    | "GENERAL"
    | "LEYPD";

export type EstadoCampaniaProteccionDatos =
    | "BORRADOR"
    | "ACTIVA"
    | "FINALIZADA"
    | "CANCELADA";

export type EstadoConsentimientoDatos =
    | "PENDIENTE"
    | "ENVIADO"
    | "ERROR_ENVIO"
    | "ACEPTADO"
    | "RECHAZADO"
    | "REVOCADO"
    | "EXPIRADO";

/* =========================================================
   CAMPAÑA
   ========================================================= */

export type CampaniaProteccionDatos = {
    id: number;

    nombre: string;

    descripcion:
    string | null;

    tituloDocumento: string;

    versionDocumento: string;

    contenidoHtml: string;

    documentoHash: string;

    configuracionConsentimiento:
    ConfiguracionConsentimiento | null;

    asuntoCorreo: string;

    cuerpoCorreoHtml: string;

    estado:
    EstadoCampaniaProteccionDatos;

    fechaInicio:
    string | null;

    fechaFin:
    string | null;

    fechaEnvioInicial:
    string | null;

    creadoPorId:
    number | null;

    empresaId:
    number | null;

    origen:
    OrigenCampaniaProteccionDatos;

    leypdElementoNumero:
    number | null;

    createdAt:
    string;

    updatedAt:
    string;

    creadoPor?: {
        id_tecnico: number;

        nombre: string;

        email: string;
    } | null;

    _count?: {
        destinatarios: number;
    };
};

/* =========================================================
   CREATE
   ========================================================= */

export type CrearCampaniaProteccionDatosPayload = {
    nombre: string;

    descripcion?:
    string | null;

    tituloDocumento: string;

    versionDocumento: string;

    contenidoHtml: string;

    configuracionConsentimiento?:
    ConfiguracionConsentimiento | null;

    asuntoCorreo: string;

    cuerpoCorreoHtml: string;

    fechaInicio?:
    string | null;

    fechaFin?:
    string | null;

    /*
     * TEMPORAL.
     * Después debe obtenerse desde JWT.
     */
    creadoPorId?:
    number | null;

    empresaId?:
    number | null;

    origen?:
    OrigenCampaniaProteccionDatos;

    leypdElementoNumero?:
    number | null;
};

/* =========================================================
   UPDATE
   ========================================================= */

export type ActualizarCampaniaProteccionDatosPayload = {
    nombre?: string;

    empresaId?:
    number | null;

    descripcion?:
    string | null;

    tituloDocumento?:
    string;

    versionDocumento?:
    string;

    contenidoHtml?:
    string;

    configuracionConsentimiento?:
    ConfiguracionConsentimiento | null;

    asuntoCorreo?:
    string;

    cuerpoCorreoHtml?:
    string;

    fechaInicio?:
    string | null;

    fechaFin?:
    string | null;
};

/* =========================================================
   LISTADO
   ========================================================= */

export type CampaniasProteccionDatosResponse = {
    items:
    CampaniaProteccionDatos[];

    total:
    number;

    skip:
    number;

    take:
    number;
};

/* =========================================================
   DESTINATARIOS
   ========================================================= */

export type DestinatarioConsentimiento = {
    id: number;

    solicitanteId:
    number | null;

    empresaId:
    number | null;

    nombre:
    string | null;

    email: string;

    empresaNombre:
    string | null;

    estado:
    EstadoConsentimientoDatos;

    fechaEnvio:
    string | null;

    fechaAperturaFormulario:
    string | null;

    fechaRespuesta:
    string | null;

    fechaRevocacion:
    string | null;

    aceptado:
    boolean | null;

    versionDocumento:
    string;

    evidenciaPath:
    string | null;

    createdAt:
    string;

    updatedAt:
    string;

    respuestaJson:
    RespuestaConsentimiento | null;

    documentoHash:
    string;
};

export type DestinatariosCampaniaResponse = {
    campania: {
        id: number;

        nombre: string;

        estado:
        EstadoCampaniaProteccionDatos;
    };

    total: number;

    destinatarios:
    DestinatarioConsentimiento[];
};

export type AgregarDestinatariosResponse = {
    agregados: number;

    omitidos: Array<{
        solicitanteId: number;

        motivo: string;
    }>;
};

/* =========================================================
   SELECTOR DE SOLICITANTES
   ========================================================= */

export type EmpresaProteccionDatos = {
    id_empresa: number;

    nombre: string;
};

export type SolicitanteProteccionDatos = {
    id_solicitante: number;

    nombre: string;

    email:
    string | null;

    empresaId:
    number | null;

    empresa: {
        id_empresa: number;

        nombre: string;
    } | null;
};

export type DocumentoCampoConsentimiento = {
    titulo:
    string;

    nombre:
    string;

    path:
    string;

    contentType:
    string;

    size:
    number;

    sha256:
    string;
};

export type TipoEventoConsentimiento =
    | "CREADO"
    | "ENVIADO"
    | "ERROR_ENVIO"
    | "FORMULARIO_ABIERTO"
    | "ACEPTADO"
    | "RECHAZADO"
    | "REVOCADO"
    | "REENVIADO"
    | "DOCUMENTO_ABIERTO"
    | "COMPROBANTE_ENVIADO";;

export type EventoConsentimiento = {
    id:
    number;

    tipo:
    TipoEventoConsentimiento;

    detalle:
    Record<
        string,
        unknown
    > |
    null;

    ip:
    string |
    null;

    userAgent:
    string |
    null;

    createdAt:
    string;
};

export type HistorialConsentimientoResponse = {
    consentimiento: {
        id:
        number;

        estadoActual:
        EstadoConsentimientoDatos;

        aceptadoOriginalmente:
        boolean |
        null;

        fechaRespuesta:
        string |
        null;

        fechaRevocacion:
        string |
        null;
    };

    eventos:
    EventoConsentimiento[];
};

/* =========================================================
   RESUMEN POR EMPRESA
   ========================================================= */

export type ResumenCampaniaEmpresa = {
    id: number;
    nombre: string;
    tituloDocumento: string;
    versionDocumento: string;
    estado: EstadoCampaniaProteccionDatos;
    fechaEnvioInicial: string | null;
    fechaFin: string | null;
    createdAt: string;

    /** Destinatarios de esta empresa en la campaña. */
    destinatarios: number;
    enviados: number;
    aceptados: number;
    rechazados: number;
    revocados: number;
    pendientes: number;
    errores: number;
    ultimoEnvio: string | null;
};

export type ResumenEmpresaProteccionDatos = {
    empresaId: number | null;
    empresaNombre: string;
    campanias: number;
    campaniasEnviadas: number;
    destinatarios: number;
    enviados: number;
    aceptados: number;
    rechazados: number;
    revocados: number;
    pendientes: number;
    errores: number;
    ultimoEnvio: string | null;
    campaniasDetalle: ResumenCampaniaEmpresa[];
};