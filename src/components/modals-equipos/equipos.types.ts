// src/components/modals-equipos/equipos.types.ts
import type { TipoEquipoValue } from "../modals-gestioo/types";

export type EstadoEquipo =
  | "ACTIVO"
  | "EN_STOCK"
  | "DADO_DE_BAJA"
  | "EN_RIDS"
  | "EN_GARANTIA"
  | "EN_TALLER_EXTERNO";

export type EquipoAdicional = {
  id: number;
  tipo: string;
  descripcion?: string | null;
  cantidad: number;
  serialAdicional?: string | null;
};

export type EquipoRow = {
  id_equipo: number;
  serial: string | null;
  tipo?: TipoEquipoValue | null;
  marca: string | null;
  modelo: string | null;
  anioPc?: number | null;
  anioPcOrigen?: "AUTO" | "MANUAL" | "NO_DETERMINADO" | null;
  procesador: string | null;
  ram: string | null;
  disco: string | null;
  propiedad: string | null;
  observaciones?: string | null;

  solicitante: string | null;
  solicitanteRut?: string | null;
  solicitanteEmail?: string | null;

  empresa: string | null;
  idSolicitante: number | null;
  empresaId: number | null;

  createdAt: string;
  updatedAt: string;

  macWifi?: string | null;
  redEthernet?: string | null;
  so?: string | null;
  tipoDd?: string | null;
  estadoAlm?: string | null;
  office?: string | null;
  teamViewer?: string | null;
  claveTv?: string | null;
  revisado?: string | null;
  adminRidsUsuario?: string | null;
  adminRidsPassword?: string | null;
  usuarioEmpresa?: string | null;
  passwordEmpresa?: string | null;
  usuarioPersonal?: string | null;
  passwordPersonal?: string | null;

  adicionales?: EquipoAdicional[];
  estado?: EstadoEquipo | null;
};

export type EmpresaOpt = {
  id: number | null;
  nombre: string;
};

export type SolicitanteLite = {
  id_solicitante: number;
  nombre: string;
  email?: string | null;
  rut?: string | null;
  empresa?: {
    id_empresa: number;
    nombre: string;
  } | null;
};

export type HistChange = {
  before: unknown;
  after: unknown;
};

export type ActorLite = {
  nombre: string;
} | string;

export type EquipoHistorialItem = {
  id?: string | number;
  action?: string;
  createdAt: string;
  actor?: ActorLite | null;
  changes?: Record<string, HistChange> | null;
  diff?: Record<string, HistChange> | null;
  message?: string | null;
};

export type EquipoForm = {
  serial: string;
  tipo: TipoEquipoValue;
  marca: string;
  modelo: string;
  anioPc: string;
  procesador: string;
  ram: string;
  disco: string;
  propiedad: string;
  observaciones: string;

  macWifi: string;
  redEthernet: string;
  so: string;
  tipoDd: string;
  estadoAlm: string;
  office: string;
  teamViewer: string;
  claveTv: string;
  revisado: string;

  adminRidsUsuario: string;
  adminRidsPassword: string;

  usuarioEmpresa: string;
  passwordEmpresa: string;

  usuarioPersonal: string;
  passwordPersonal: string;

  estado: EstadoEquipo;
};

export type RequiredEquipoFields = {
  procesador: boolean;
  ram: boolean;
  disco: boolean;
};

export type TecnicoOpt = {
  id_tecnico: number;
  nombre: string;
  email?: string | null;
};