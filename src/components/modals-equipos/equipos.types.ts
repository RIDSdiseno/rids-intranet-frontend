// src/components/modals-equipos/equipos.types.ts
import type { TipoEquipoValue } from "../modals-gestioo/types";

export type EstadoEquipo =
  | "ACTIVO"
  | "EN_STOCK"
  | "DADO_DE_BAJA"
  | "EN_RIDS"
  | "EN_GARANTIA"
  | "EN_TALLER_EXTERNO";

export type OrigenEquipoAdicional =
  | "MANUAL"
  | "AGENTE";

export type EstadoEquipoAdicional =
  | "ASIGNADO"
  | "EN_STOCK"
  | "EN_REPARACION"
  | "DADO_DE_BAJA";

export type EquipoAdicional = {
  id: number;

  nombre?: string | null;

  tipo: string;

  marca?: string | null;
  modelo?: string | null;

  descripcion?: string | null;

  cantidad: number;

  serialAdicional?: string | null;

  macAddress?: string | null;
  ipAddress?: string | null;

  hostname?: string | null;

  ubicacion?: string | null;

  origen: "MANUAL" | "AGENTE";

  estado:
  | "ASIGNADO"
  | "EN_STOCK"
  | "EN_REPARACION"
  | "DADO_DE_BAJA";

  /*
   * Datos de la relación AdicionalEquipo.
   * El backend los agrega al hacer flatten
   * de la relación N:N.
   */
  relacionId?: number;

  equipoId?: number;

  origenRelacion?:
  | "MANUAL"
  | "AGENTE";

  observacionRelacion?:
  | string
  | null;

  createdAt?: string;
  updatedAt?: string;
};

export type PropiedadEquipo = "Empresa" | "Personal" | "Externo";

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
  propiedad?: PropiedadEquipo | string | null;
  propietarioExterno?: string | null;
  observaciones?: string | null;

  solicitante: string | null;
  solicitanteRut?: string | null;
  solicitanteEmail?: string | null;

  /**
   * Empresa directa asignada al equipo.
   */
  empresa: string | null;
  empresaId: number | null;

  /**
   * Solicitante asociado actualmente.
   */
  idSolicitante: number | null;

  /**
   * Empresa real a la que pertenece el solicitante.
   * Sirve para detectar asociaciones históricas inconsistentes.
   */
  solicitanteEmpresaId?: number | null;
  solicitanteEmpresa?: string | null;

  createdAt: string;
  updatedAt: string;

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
  agenteActivo?: boolean | null;
  estadoAgente?: EstadoAgente | null;

  macWifi?: string | null;
  redEthernet?: string | null;
  so?: string | null;
  tipoDd?: string | null;
  estadoAlm?: string | null;
  office?: string | null;

  oneDrive?: string | null;
  oneDriveEstado?: string | null;
  oneDriveInstalado?: boolean | null;
  oneDriveEnEjecucion?: boolean | null;
  oneDriveOperativo?: boolean | null;
  oneDriveVersion?: string | null;
  oneDriveUsuario?: string | null;
  oneDriveDetalle?: unknown;

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

  mantGeneralInstalado?: boolean | null;
  mantGeneralVersion?: string | null;
  mantGeneralLastSeenAt?: string | null;
  mantGeneralInstalledAt?: string | null;
  mantGeneralConfigPath?: string | null;
  mantGeneralExePath?: string | null;
  mantGeneralTecnicoId?: number | null;
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

  empresaId?: number | null;

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
  propiedad: PropiedadEquipo;
  propietarioExterno: string;
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

  oneDrive?: string | null;
  oneDriveEstado?: string | null;
  oneDriveInstalado?: boolean | null;
  oneDriveEnEjecucion?: boolean | null;
  oneDriveOperativo?: boolean | null;
  oneDriveVersion?: string | null;
  oneDriveUsuario?: string | null;
  oneDriveDetalle?: unknown;

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

  email?: string | null;
  rut?: string | null;

  empresaId: number | null;
  empresa: EmpresaDTO | null;
};

export type EquipoDTO = {
  id_equipo: number;
  serial: string;
  tipo?: TipoEquipoValue | null;
  marca: string;
  modelo: string;

  anioPc?: number | null;
  anioPcOrigen?: "AUTO" | "MANUAL" | "NO_DETERMINADO" | null;

  procesador: string;
  ram: string;
  disco: string;

  propiedad?: PropiedadEquipo | string | null;
  propietarioExterno?: string | null;

  estado: EstadoEquipo;
  observaciones?: string | null;

  empresaId: number | null;
  idSolicitante: number | null;

  solicitante: SolicitanteDTO | null;
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
  propiedad: PropiedadEquipo;
  propietarioExterno?: string | null;
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
  tecnicoId?: number | null;
  tecnico?: {
    id_tecnico: number;
    nombre: string;
    email: string;
    rol?: string | null;
    status?: boolean | null;
  } | null;
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