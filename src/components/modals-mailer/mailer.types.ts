// src/components/modals-mailer/mailer.types.ts

export type SolicitanteMailer = {
    id_solicitante: number;
    nombre: string;
    email?: string | null;

    empresa?: {
        id_empresa: number;
        nombre: string;
    } | null;

    isActive?: boolean | null;
};

export type EmpresaMailer = {
    id_empresa: number;
    nombre: string;
};

export type TecnicoMailer = {
    id_tecnico: number;
    nombre: string;
    email?: string | null;
};

export type MailerAttachment = {
    name: string;
    contentType: string;
    contentBytes: string;
    size: number;
};

export type MailerTarget = {
    id?: number;
    nombre?: string;
    email?: string;
};

export type TipoPlantillaCorreo =
    | "HTML"
    | "IMAGEN";

export type PlantillaCorreo = {
    id: number;

    nombre: string;

    descripcion:
    string |
    null;

    tipo:
    TipoPlantillaCorreo;

    nombreArchivo:
    string |
    null;

    mimeType:
    string |
    null;

    bytes:
    number |
    null;

    storagePath?:
    string |
    null;

    previewUrl:
    string |
    null;

    createdAt:
    string;

    updatedAt:
    string;
};

export type PlantillaCorreoDetalle =
    PlantillaCorreo & {
        htmlProcesado:
        string |
        null;

        activo:
        boolean;

        creadoPorId?:
        number |
        null;
    };

export type CrearPlantillaInput = {
    nombre: string;
    descripcion?: string;
    file: File;
};

export type ActualizarPlantillaInput = {
    nombre?: string;
    descripcion?: string | null;
    activo?: boolean;
};

export type EnviarMasivoPayload = {
    targets:
    MailerTarget[];

    subject:
    string;

    bodyHtml?:
    string;

    plantillaId?:
    number;

    attachments?:
    MailerAttachment[];
};

export type EnviarMasivoResponse = {
    ok: boolean;
    queued?: boolean;
    jobId?: string;
    requested?: number;
    queuedCount?: number;
    sent?: number;
    message?: string;

    failures?: Array<{
        to?: string;
        error: string;
    }>;
};

export type MailerContentMode =
    | "EDITOR"
    | "PLANTILLA";

export type SendMode =
    | "html"
    | "plain";

export type MailerJobFailure = {
    to?: string;
    error: string;
};

export type MailerJobStatus =
    | "queued"
    | "processing"
    | "done";

export type MailerJob = {
    id: string;

    createdAt: number;

    ratePerMin: number;

    total: number;

    successes: string[];

    failures:
    MailerJobFailure[];

    completed: number;

    status:
    MailerJobStatus;
};