// src/components/modals-facturasBaseapi/finanzas/cobranza/cobranza-auto.types.ts
// Fase 5c: tipos de /baseapi/finanzas/cxc/cobranza-auto/*

import type { EmpresaCxc } from "../cxc.types";

export type ConfigCobranzaAuto = {
    empresaKey: EmpresaCxc;
    activo: boolean;
    envioAutomatico: boolean;
    adjuntarPdf: boolean;
    horaConsultaSii: string;
    horaCobranza: string;
    diasPorVencer: number[];
    diasVencidos: number[];
    updatedAt: string;
};

export type ReglasFijasCobranza = {
    saldoMinimo: number;
    topeDiasVencida: number;
    repetirCadaDias: number;
    diasRecuperacion: number;
};

export type ConfigCobranzaResponse = {
    ok: boolean;
    data: { empresas: ConfigCobranzaAuto[]; reglas: ReglasFijasCobranza };
};

export type DestinatarioCobranza = {
    contactoId: number;
    nombre: string;
    email: string;
    cargo: string | null;
    principal: boolean;
};

export type CandidatoCobranza = {
    tipoDoc: string;
    folio: string;
    rutContraparte: string;
    razonSocial: string | null;
    montoPendiente: number;
    fechaVencimiento: string;
    diasDiferencia: number;
    tipoRecordatorio: string;
    yaEnviado: boolean;
    destinatarios: DestinatarioCobranza[];
};

export type ExclusionCobranza = {
    tipoDoc: string;
    folio: string;
    rutContraparte: string;
    razonSocial: string | null;
    saldo: number;
    fechaVencimiento: string;
    diasDiferencia: number;
    tipoRecordatorio: string;
    motivo: "BAJO_MINIMO" | "SOBRE_TOPE";
};

export type DiaCalendarioCobranza = {
    fecha: string;
    desplazamiento: number;
    candidatos: CandidatoCobranza[];
    excluidos: ExclusionCobranza[];
};

export type CalendarioCobranzaResponse = {
    ok: boolean;
    data: { empresaKey: EmpresaCxc; dias: DiaCalendarioCobranza[] };
};

export type EstadoRecordatorio = "PENDIENTE" | "PROCESANDO" | "ENVIADO" | "ERROR" | "CANCELADO";

export type RecordatorioCola = {
    id: number;
    empresaKey: string;
    tipoDoc: string;
    folio: string;
    rutContraparte: string;
    razonSocial: string | null;
    tipoRecordatorio: string;
    emailDestino: string;
    nombreDestino: string | null;
    estado: string;
    automatico: boolean;
    montoTotal: number;
    fechaVencimiento: string | null;
    diasDiferencia: number | null;
    asunto: string | null;
    error: string | null;
    intentos: number;
    fecha: string;
    hora: string;
    enviadoAt: string | null;
    horaEnvio: string | null;
};

export type ColaCobranzaResponse = {
    ok: boolean;
    data: { filas: RecordatorioCola[]; porEstado: Record<string, number>; truncado: boolean };
};

export type ResultadoPrepararResponse = {
    ok: boolean;
    data: { activa: boolean; candidatos: number; conDestinatario: number; yaEnviados: number; pendientesEnvio: number };
};

export type ResultadoEnviarResponse = {
    ok: boolean;
    data: { recuperados: number; procesados: number; enviados: number; errores: number; omitidos: number };
};