// types/reportes.types.ts

export interface ExportStatus {
  exporting: boolean;
  error: string | null;
  progress?: number;
}

export interface Empresa {
  id_empresa: number;
  nombre: string;
}

export interface SolicitanteRow {
  id_solicitante: number;
  nombre: string;
  email: string | null;
  empresa?: { nombre: string } | null;
  equipos?: unknown[];
}

export interface EquipoRow {
  id_equipo: number;
  serial?: string | null;
  marca?: string | null;
  modelo?: string | null;
  procesador?: string | null;
  ram?: string | null;
  disco?: string | null;
  propiedad?: string | null;
  idSolicitante?: number | null;
}

export interface VisitaRow {
  id_visita: number;
  tecnico?: { nombre: string } | null;
  empresa?: { nombre: string } | null;
  solicitante?: string | null;
  solicitanteRef?: { nombre: string } | null;
  inicio?: string | null;
  fin?: string | null;
  status?: string | null;
  actualizaciones?: boolean | 0 | 1 | null;
  antivirus?: boolean | 0 | 1 | null;
  ccleaner?: boolean | 0 | 1 | null;
  estadoDisco?: boolean | 0 | 1 | null;
  licenciaOffice?: boolean | 0 | 1 | null;
  licenciaWindows?: boolean | 0 | 1 | null;
  mantenimientoReloj?: boolean | 0 | 1 | null;
  rendimientoEquipo?: boolean | 0 | 1 | null;
  confImpresoras?: boolean | 0 | 1 | null;
  confTelefonos?: boolean | 0 | 1 | null;
  confPiePagina?: boolean | 0 | 1 | null;
  otros?: boolean | 0 | 1 | null;
  otrosDetalle?: string | null;
  tipo?: string | null;
}

export interface MantencionRemotaRow {
  id_mantencion: number;
  tecnico?: { nombre: string } | null;
  inicio?: string | null;
  fin?: string | null;
  status?: string | null;
  solicitante?: string | null;
}

export interface TicketRow {
  ticket_id: string;
  solicitante_email: string | null;
  empresa: string | null;
  subject: string;
  type: string | null;
  fecha: string;
}

export interface TicketTimingExtras {
  created_at?: string;
  createdAt?: string;
  closed_at?: string;
  closedAt?: string;
  resolved_at?: string;
  resolvedAt?: string;
  minutosResolucion?: number;
}

export type TicketLike = TicketRow & TicketTimingExtras;

export interface ApiList<T> {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items?: T[];
  data?: T[];
}

export interface TicketsResp {
  page: number;
  pageSize: number;
  total: number;
  rows: TicketRow[];
  totalPages?: number;
}

export interface ReporteGeneralData {
  solicitantes: SolicitanteRow[];
  equipos: EquipoRow[];
  visitas: VisitaRow[];
  tickets: TicketRow[];
  empresaFiltro?: string;
  mantencionesRemotas?: MantencionRemotaRow[];
}