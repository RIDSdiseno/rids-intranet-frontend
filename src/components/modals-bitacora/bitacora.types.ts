export type TipoBitacoraTecnico =
    | "SOPORTE"
    | "INSTALACIÓN"
    | "TERRENO"
    | "REMOTO"
    | "TALLER"
    | "INTERNO"
    | "ADMINISTRATIVO"
    | "REUNION"
    | "OTRO";

export type EstadoBitacoraTecnico =
    | "REGISTRADA"
    | "REVISADA"
    | "PENDIENTE_APROBACION"
    | "APROBADA"
    | "EN_PROCESO"
    | "PENDIENTE_CIERRE"
    | "CERRADA"
    | "RECHAZADA"
    | "ANULADA";

export type TipoRelacionOpcional =
    | ""
    | "solicitantes"
    | "tickets"
    | "trabajos"
    | "visitas"
    | "mantenciones"
    | "equipos"
    | "cotizaciones";

export type RelacionKey =
    Exclude<
        TipoRelacionOpcional,
        ""
    >;

export type FormRelacionKey =
    | "solicitanteId"
    | "ticketId"
    | "trabajoId"
    | "visitaId"
    | "mantencionId"
    | "equipoId"
    | "cotizacionId";

export interface RelacionConfig {
    tipo: RelacionKey;
    label: string;
    formKey: FormRelacionKey;
}

export interface TecnicoOption {
    id_tecnico: number;
    nombre: string;
    email?: string | null;
    rol?: string | null;
}

export interface EmpresaOption {
    id_empresa: number;
    nombre: string;
}

export interface OpcionRelacion {
    id: number;
    label: string;
    raw: unknown;
}

export interface BitacoraTecnico {
    id: number;
    fecha: string;
    titulo?: string | null;
    descripcion: string;

    tipoActividad:
    TipoBitacoraTecnico;

    estado:
    EstadoBitacoraTecnico;

    tecnicoId: number;
    empresaId?: number | null;
    solicitanteId?: number | null;
    ticketId?: number | null;
    trabajoId?: number | null;
    visitaId?: number | null;
    mantencionId?: number | null;
    equipoId?: number | null;
    cotizacionId?: number | null;

    recordatorioAt?: string | null;
    recordatorioCompletado?: boolean;
    recordatorioCompletadoAt?: string | null;
    recordatorioNotificadoAt?: string | null;

    createdAt: string;
    updatedAt: string;

    tecnico?: {
        id_tecnico: number;
        nombre: string;
        email?: string | null;
        rol?: string | null;
    } | null;

    empresa?: {
        id_empresa: number;
        nombre: string;
    } | null;

    solicitante?: {
        id_solicitante: number;
        nombre: string;
        email?: string | null;
    } | null;

    ticket?: {
        id: number;
        publicId: string;
        subject: string;
        status: string;
    } | null;

    trabajo?: {
        id: number;
        numeroOrden?: string | null;
        tipoTrabajo: string;
        estado?: string | null;
        area?: string | null;
        destinoEquipo?: string | null;
    } | null;

    visita?: {
        id_visita: number;
        inicio: string;
        fin?: string | null;
        status: string;
    } | null;

    mantencion?: {
        id_mantencion: number;
        inicio: string;
        fin?: string | null;
        status: string;
    } | null;

    equipo?: {
        id_equipo: number;
        serial?: string | null;
        marca: string;
        modelo: string;
        tipo: string;
    } | null;

    cotizacion?: {
        id: number;
        fecha: string;
        estado: string;
        total: number;
    } | null;

    evidencias?: BitacoraEvidencia[];

    etapas?: BitacoraEtapa[];

    eventos?: BitacoraEvento[];
}

export type EtapaEvidenciaBitacora =
    EtapaBitacora;

export type TipoEvidenciaBitacora =
    | "IMAGEN"
    | "VIDEO";

export interface BitacoraEvidencia {
    id: number;
    bitacoraId: number;

    etapa:
    EtapaEvidenciaBitacora;

    etapaId?: number | null;

    tipo:
    TipoEvidenciaBitacora;

    nombre: string;
    mimeType: string;
    bytes: number;

    url?: string | null;

    storagePath: string;

    publicId?: string | null;

    descripcion?: string | null;

    subidoPorId: number;

    createdAt: string;

    subidoPor?: {
        id_tecnico: number;
        nombre: string;
        email?: string | null;
        rol?: string | null;
    } | null;
}

export interface CrearBitacoraTecnicoPayload {
    fecha?: string;
    titulo?: string;
    descripcion: string;

    tipoActividad?:
    TipoBitacoraTecnico;

    tecnicoId: number;
    empresaId?: number | null;
    solicitanteId?: number | null;
    ticketId?: number | null;
    trabajoId?: number | null;
    visitaId?: number | null;
    mantencionId?: number | null;
    equipoId?: number | null;
    cotizacionId?: number | null;

    recordatorioAt?: string | null;
}

export type ActualizarBitacoraTecnicoPayload = CrearBitacoraTecnicoPayload;

export interface FiltrosBitacoraTecnico {
    fecha?: string;
    desde?: string;
    hasta?: string;
    tecnicoId?: number;
    empresaId?: number;
    solicitanteId?: number;
    ticketId?: number;
    trabajoId?: number;
    visitaId?: number;
    mantencionId?: number;
    equipoId?: number;
    cotizacionId?: number;
    tipoActividad?: TipoBitacoraTecnico;
    estado?: EstadoBitacoraTecnico;
    search?: string;
}

export interface FormErrors {
    tecnicoId?: string;
    descripcion?: string;
    empresaId?: string;
    relacion?: string;
}

/* =====================================================
   ESTADO DEL FORMULARIO CREAR / EDITAR
===================================================== */

export interface BitacoraFormState {
    fecha: string;
    titulo: string;
    descripcion: string;

    tipoActividad:
    TipoBitacoraTecnico;

    estado:
    EstadoBitacoraTecnico;

    tecnicoId: string;
    empresaId: string;

    solicitanteId: string;
    ticketId: string;
    trabajoId: string;
    visitaId: string;
    mantencionId: string;
    equipoId: string;
    cotizacionId: string;

    /*
     * Se mantiene como string ISO porque
     * es el formato utilizado por DatePicker
     * y posteriormente enviado al backend.
     */
    recordatorioAt: string;
}

/* =====================================================
   NOTA RÁPIDA
===================================================== */

export interface NotaRapidaState {
    tecnicoId: string;

    titulo: string;

    descripcion: string;

    tipoActividad:
    TipoBitacoraTecnico;

    /*
     * String ISO.
     * Vacío significa que no existe recordatorio.
     */
    recordatorioAt: string;
}

/* =====================================================
   ESTADO VISUAL DEL RECORDATORIO
===================================================== */

export type EstadoRecordatorioVisual =
    | "SIN_RECORDATORIO"
    | "PENDIENTE"
    | "VENCIDO"
    | "COMPLETADO";

/* =====================================================
EVIDENCIAS PENDIENTES DEL FORMULARIO
===================================================== */

export interface EvidenciaPendiente {
    idTemporal: string;

    etapa:
    EtapaEvidenciaBitacora;

    archivo:
    File;

    descripcion:
    string;

    /*
     * URL local generada con URL.createObjectURL().
     * Solo sirve para previsualizar antes de guardar.
     */
    previewUrl:
    string;
}

/* =====================================================
   ETAPAS DE BITÁCORA
===================================================== */

export type EtapaBitacora =
    | "ANTES"
    | "EN_PROCESO"
    | "DESPUES";

export type EstadoEtapaBitacora =
    | "PENDIENTE"
    | "EN_PROCESO"
    | "PENDIENTE_REVISION"
    | "APROBADA"
    | "RECHAZADA"
    | "COMPLETADA";

export type EstadoAprobacionBitacora =
    | "PENDIENTE"
    | "APROBADA"
    | "RECHAZADA"
    | "CANCELADA";

export type TipoEventoBitacora =
    | "CREADA"
    | "ETAPA_INICIADA"
    | "ETAPA_ACTUALIZADA"
    | "ETAPA_COMPLETADA"
    | "EVIDENCIA_AGREGADA"
    | "EVIDENCIA_ELIMINADA"
    | "REVISION_SOLICITADA"
    | "REVISION_APROBADA"
    | "REVISION_RECHAZADA"
    | "REVISION_CANCELADA"
    | "BITACORA_CERRADA"
    | "BITACORA_ANULADA";

export interface BitacoraAprobacion {
    id: number;

    bitacoraId: number;
    etapaId: number;

    estado:
    EstadoAprobacionBitacora;

    solicitadoPorId: number;
    aprobadorId: number;

    comentarioSolicitud?: string | null;
    comentarioRespuesta?: string | null;

    solicitadoAt: string;
    respondidoAt?: string | null;

    solicitadoPor?: {
        id_tecnico: number;
        nombre: string;
        email?: string | null;
    } | null;

    aprobador?: {
        id_tecnico: number;
        nombre: string;
        email?: string | null;
    } | null;
}

export interface BitacoraEtapa {
    id: number;

    bitacoraId: number;

    etapa:
    EtapaBitacora;

    estado:
    EstadoEtapaBitacora;

    titulo?: string | null;

    descripcion?: string | null;

    requiereRevision: boolean;

    iniciadoAt?: string | null;
    completadoAt?: string | null;

    createdAt: string;
    updatedAt: string;

    evidencias:
    BitacoraEvidencia[];

    aprobaciones:
    BitacoraAprobacion[];
}

export interface BitacoraEvento {
    id: number;

    bitacoraId: number;
    etapaId?: number | null;

    tipo:
    TipoEventoBitacora;

    actorId?: number | null;

    descripcion?: string | null;

    metadata?: unknown;

    createdAt: string;

    actor?: {
        id_tecnico: number;
        nombre: string;
        email?: string | null;
    } | null;

    etapa?: BitacoraEtapa | null;
}

export interface BitacoraEtapaFormState {
    descripcion: string;

    requiereRevision: boolean;

    aprobadorId: string;

    comentarioSolicitud: string;
}

export type BitacoraEtapasFormState =
    Record<
        EtapaBitacora,
        BitacoraEtapaFormState
    >;