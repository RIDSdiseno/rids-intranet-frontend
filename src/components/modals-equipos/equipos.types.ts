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

export type ActorLite =
  | {
    nombre?: string | null;
    email?: string | null;
  }
  | string;

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

export type EquipoSoftwareAgent = {
  id: number;
  equipoId: number;
  nombre: string;
  version?: string | null;
  publisher?: string | null;
  installDate?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type EquipoAgenteEvento = {
  id: number;
  equipoId: number;
  tipo: string;
  mensaje?: string | null;
  metadata?: unknown;
  createdAt: string;
};

export type EquipoDetalleAgent = {
  so?: string | null;
  macWifi?: string | null;
  redEthernet?: string | null;
  tipoDd?: string | null;
  estadoAlm?: string | null;
  office?: string | null;
  teamViewer?: string | null;

  antivirusNombre?: string | null;
  antivirusActivo?: boolean | null;
  firewallActivo?: boolean | null;
  bitlockerEstado?: string | null;
  windowsUpdate?: string | null;
  observacionAgente?: string | null;
};

export type EstadoAgente =
  | "SIN_AGENTE"
  | "ACTIVO"
  | "SIN_CONEXION"
  | "ADVERTENCIA"
  | "CRITICO";

export type EquipoAgentFull = EquipoRow & {
  hostname?: string | null;
  usuarioActual?: string | null;
  dominio?: string | null;
  localIp?: string | null;
  publicIp?: string | null;
  macAddress?: string | null;
  ramGb?: number | null;
  diskTotalGb?: number | null;
  diskFreeGb?: number | null;
  lastBootAt?: string | null;
  lastSeenAt?: string | null;
  agenteVersion?: string | null;
  agenteActivo?: boolean;
  estadoAgente?: EstadoAgente;
  detalle?: EquipoDetalleAgent | null;
  softwares?: EquipoSoftwareAgent[];
  agenteEventos?: EquipoAgenteEvento[];
};

export type EmpresaDTO = {
  id_empresa: number;
  nombre: string;
};

export type SolicitanteDTO = {
  id_solicitante: number;
  nombre: string;
  empresaId: number | null;
  empresa: EmpresaDTO | null;
};

export type EquipoDTO = {
  id_equipo: number;
  serial: string;
  marca: string;
  modelo: string;
  anioPc?: number | null;
  anioPcOrigen?: "AUTO" | "MANUAL" | "NO_DETERMINADO" | null;
  procesador: string;
  ram: string;
  disco: string;
  propiedad: string;
  estado: EstadoEquipo;
  observaciones?: string | null;
  idSolicitante: number;
  solicitante: SolicitanteDTO | null;
};

export type EquipoAdicionalInput = {
  tipo: string;
  descripcion?: string | null;
  cantidad: number;
  serialAdicional?: string | null;
};

export type CreateEquipoPayload = {
  empresaId: number;
  idSolicitante: number | null;
  tipo: TipoEquipoValue;
  serial: string;
  marca: string;
  modelo: string;
  anioPc?: number | null;
  procesador: string;
  ram: string;
  disco: string;
  propiedad: string;
  estado: EstadoEquipo;
  observaciones?: string | null;

  macWifi?: string;
  redEthernet?: string;
  so?: string;
  tipoDd?: string;
  estadoAlm?: string;
  office?: string;
  teamViewer?: string;
  claveTv?: string;
  revisado?: string;

  adminRidsUsuario?: string;
  adminRidsPassword?: string;
  usuarioEmpresa?: string;
  passwordEmpresa?: string;
  usuarioPersonal?: string;
  passwordPersonal?: string;

  adicionales?: EquipoAdicionalInput[];
};

export type CreateEquipoResponse = {
  ok: boolean;
  totalReceived: number;
  totalCreated: number;
  totalErrors: number;
  created: EquipoDTO[];
  errors: Array<{
    serial?: string;
    error: string;
  }>;
};

export type ListSolicitantesResponse = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: Array<{
    id_solicitante: number;
    nombre: string;
    email?: string | null;
    rut?: string | null;
    empresaId: number | null;
    empresa: { id_empresa: number; nombre: string } | null;
  }>;
};

export type EquipoMantencion = {
  id: number;
  equipoId: number;
  tipo: string;
  estado: "COMPLETADA" | "COMPLETADA_CON_ADVERTENCIAS" | "CANCELADA" | string;
  origen: string;

  fechaInicio: string;
  fechaFin?: string | null;
  duracionSegundos?: number | null;
  duracionTexto?: string | null;

  tareasRealizadas: string[];
  tareasConError: string[];

  resumen?: string | null;
  reporteTexto?: string | null;

  serial?: string | null;
  hostname?: string | null;
  usuarioActual?: string | null;
  localIp?: string | null;
  macAddress?: string | null;
  marca?: string | null;
  modelo?: string | null;
  agenteVersion?: string | null;

  createdAt: string;
};