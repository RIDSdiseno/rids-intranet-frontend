// src/components/modals-funnel/types.tsx

export const EtapaOportunidadVenta = {
  NUEVA: "NUEVA",
  COTIZACION_PREPARACION: "COTIZACION_PREPARACION",
  COTIZACION_ENVIADA: "COTIZACION_ENVIADA",
  NEGOCIACION: "NEGOCIACION",
  GANADA: "GANADA",
  PERDIDA: "PERDIDA",
  POSTERGADA: "POSTERGADA",
} as const;
export type EtapaOportunidadVenta =
  (typeof EtapaOportunidadVenta)[keyof typeof EtapaOportunidadVenta];

export const PrioridadOportunidadVenta = {
  BAJA: "BAJA",
  MEDIA: "MEDIA",
  ALTA: "ALTA",
  URGENTE: "URGENTE",
} as const;
export type PrioridadOportunidadVenta =
  (typeof PrioridadOportunidadVenta)[keyof typeof PrioridadOportunidadVenta];

export type MonedaOportunidad = "CLP" | "USD";

export const EstadoDesarrolloPropuesta = {
  PENDIENTE: "PENDIENTE",
  EN_PREPARACION: "EN_PREPARACION",
  ESPERANDO_ANTECEDENTES: "ESPERANDO_ANTECEDENTES",
  REVISION_INTERNA: "REVISION_INTERNA",
  LISTA_PARA_COTIZAR: "LISTA_PARA_COTIZAR",
} as const;
export type EstadoDesarrolloPropuesta =
  (typeof EstadoDesarrolloPropuesta)[keyof typeof EstadoDesarrolloPropuesta];

export const TipoServicioOportunidad = {
  SOPORTE_TI: "SOPORTE_TI",
  DESARROLLO_WEB: "DESARROLLO_WEB",
  VENTA_PRODUCTOS: "VENTA_PRODUCTOS",
  OTRO: "OTRO",
} as const;
export type TipoServicioOportunidad =
  (typeof TipoServicioOportunidad)[keyof typeof TipoServicioOportunidad];

export const RiesgoTecnicoOportunidad = {
  BAJO: "BAJO",
  MEDIO: "MEDIO",
  ALTO: "ALTO",
} as const;
export type RiesgoTecnicoOportunidad =
  (typeof RiesgoTecnicoOportunidad)[keyof typeof RiesgoTecnicoOportunidad];

/* =========================================================
   Entidades / responsables (resúmenes usados en selects y tarjetas)
========================================================= */
export interface EntidadResumen {
  id: number;
  nombre: string;
  origen?: "RIDS" | "ECONNET" | "OTRO";
  tipo?: "EMPRESA" | "PERSONA";
  rut?: string | null;
  correo?: string | null;
}

export interface ResponsableResumen {
  id_tecnico: number;
  nombre: string;
  email?: string;
}

/* =========================================================
   Tarjeta del tablero (GET /oportunidades/funnel)
========================================================= */
export interface CotizacionPrincipalResumen {
  id: number;
  estado: string;
}

export interface OportunidadFunnelItem {
  id: number;
  codigo: string;
  titulo: string;
  etapa: EtapaOportunidadVenta;
  prioridad: PrioridadOportunidadVenta;
  montoEstimado: string | number | null;
  moneda: MonedaOportunidad;
  orden: number;
  proyecto: string | null;
  proximaAccion: string | null;
  fechaProximaAccion: string | null;
  fechaProbableCierre: string | null;
  fechaCierre: string | null;
  fechaUltimoContacto: string | null;
  entidad: EntidadResumen | null;
  responsable: ResponsableResumen | null;
  cantidadCotizaciones: number;
  cotizacionPrincipal: CotizacionPrincipalResumen | null;
}

/* =========================================================
   Detalle (GET /oportunidades/:id)
========================================================= */
export interface HistorialEtapaItem {
  id: number;
  oportunidadId: number;
  etapaAnterior: EtapaOportunidadVenta | null;
  etapaNueva: EtapaOportunidadVenta;
  actorId: number | null;
  actor: ResponsableResumen | null;
  createdAt: string;
}

export interface SeguimientoItem {
  id: number;
  oportunidadId: number;
  autorId: number;
  autor: ResponsableResumen | null;
  comentario: string;
  fechaContacto: string | null;
  proximaAccion: string | null;
  fechaProximaAccion: string | null;
  createdAt: string;
}

export interface CotizacionVinculada {
  id: number;
  estado: string;
  total: number;
  moneda: MonedaOportunidad;
  createdAt: string;
  entidad: EntidadResumen | null;
}

export interface AuditLogItem {
  id: number;
  entity: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE";
  changes: Record<string, { before: unknown; after: unknown }> | null;
  description: string | null;
  createdAt: string;
  actorId: number | null;
}

export interface OportunidadDetalle extends OportunidadFunnelItemBase {
  entidadId: number | null;
  entidad: (EntidadResumen & { correo?: string | null; telefono?: string | null }) | null;
  contactoNombre: string | null;
  contactoEmail: string | null;
  contactoTelefono: string | null;
  responsableId: number;
  responsable: ResponsableResumen | null;
  probabilidadCierre: number | null;
  fechaProbableCierre: string | null;
  observaciones: string | null;
  estadoDesarrolloPropuesta: EstadoDesarrolloPropuesta | null;
  tipoServicio: TipoServicioOportunidad | null;
  tipoServicioOtro: string | null;
  informacionPendiente: string | null;
  riesgoTecnico: RiesgoTecnicoOportunidad | null;
  condicionesEspeciales: string | null;
  fechaComprometidaEnvio: string | null;
  comentariosInternos: string | null;
  montoPropuesto: string | number | null;
  fechaEnvioPropuesta: string | null;
  fechaVencimientoPropuesta: string | null;
  comentariosCliente: string | null;
  objeciones: string | null;
  versionPropuesta: string | null;
  contrapropuestas: string | null;
  ajustesSolicitados: string | null;
  motivoPerdida: string | null;
  motivoPostergacion: string | null;
  fechaReactivacion: string | null;
  fechaCierre: string | null;
  montoFinal: string | number | null;
  activo: boolean;
  desactivadoAt: string | null;
  createdAt: string;
  updatedAt: string;
  seguimientos: SeguimientoItem[];
  historialEtapas: HistorialEtapaItem[];
  cotizaciones: CotizacionVinculada[];
  auditoria: AuditLogItem[];
}

// Campos base compartidos entre el resumen del funnel y el detalle
interface OportunidadFunnelItemBase {
  id: number;
  codigo: string;
  titulo: string;
  etapa: EtapaOportunidadVenta;
  prioridad: PrioridadOportunidadVenta;
  montoEstimado: string | number | null;
  moneda: MonedaOportunidad;
  orden: number;
  proyecto: string | null;
  proximaAccion: string | null;
  fechaProximaAccion: string | null;
  fechaUltimoContacto: string | null;
}

/* =========================================================
   Historial combinado (GET /oportunidades/:id/historial)
========================================================= */
export interface HistorialCombinadoResponse {
  cambiosEtapa: HistorialEtapaItem[];
  auditoria: AuditLogItem[];
}

/* =========================================================
   Payloads
========================================================= */
export interface CrearOportunidadPayload {
  titulo: string;
  responsableId?: number;
  entidadId?: number | null;
  proyecto?: string | null;
  contactoNombre?: string | null;
  contactoEmail?: string | null;
  contactoTelefono?: string | null;
  prioridad?: PrioridadOportunidadVenta;
  montoEstimado?: number | null;
  moneda?: MonedaOportunidad;
  probabilidadCierre?: number | null;
  fechaProbableCierre?: string | null;
  proximaAccion?: string | null;
  fechaProximaAccion?: string | null;
  observaciones?: string | null;
  estadoDesarrolloPropuesta?: EstadoDesarrolloPropuesta | null;
  tipoServicio?: TipoServicioOportunidad | null;
  tipoServicioOtro?: string | null;
  informacionPendiente?: string | null;
  riesgoTecnico?: RiesgoTecnicoOportunidad | null;
  condicionesEspeciales?: string | null;
  fechaComprometidaEnvio?: string | null;
  comentariosInternos?: string | null;
  montoPropuesto?: number | null;
  fechaEnvioPropuesta?: string | null;
  fechaVencimientoPropuesta?: string | null;
  comentariosCliente?: string | null;
  objeciones?: string | null;
  versionPropuesta?: string | null;
  contrapropuestas?: string | null;
  ajustesSolicitados?: string | null;
}

export type EditarOportunidadPayload = Partial<CrearOportunidadPayload> & {
  fechaUltimoContacto?: string | null;
};

export interface CambiarEtapaPayload {
  etapa: EtapaOportunidadVenta;
  motivoPerdida?: string;
  motivoPostergacion?: string;
  fechaReactivacion?: string;
  fechaCierre?: string;
  montoFinal?: number | null;
}

export interface ReordenarPayload {
  orden: number;
}

export interface CrearSeguimientoPayload {
  comentario: string;
  fechaContacto?: string;
  proximaAccion?: string | null;
  fechaProximaAccion?: string | null;
}

export interface FiltrosOportunidad {
  etapa?: EtapaOportunidadVenta;
  responsableId?: number;
  entidadId?: number;
  prioridad?: PrioridadOportunidadVenta;
  texto?: string;
  page?: number;
  limit?: number;
}

/* =========================================================
   Dashboard del funnel (GET /oportunidades/dashboard)
========================================================= */
export interface FiltrosDashboard {
  fechaDesde?: string;
  fechaHasta?: string;
  tipoFecha?: "ingreso" | "cierre" | "probableCierre";
  responsableId?: number;
  etapa?: EtapaOportunidadVenta;
  origen?: "RIDS" | "ECONNET" | "OTRO";
  tipoServicio?: TipoServicioOportunidad;
  entidadId?: number;
  texto?: string;
  diasSinSeguimiento?: number;
}

export interface DashboardKpis {
  total: number;
  activas: number;
  ganadas: number;
  perdidas: number;
  postergadas: number;
  pipelineTotal: number;
  montoGanado: number;
  montoPerdido: number;
  tasaCierre: number;
  clientesReactivados: number;
  sinSeguimiento: number;
  accionesVencidas: number;
}

export interface DashboardProximasAcciones {
  vencidas: number;
  hoy: number;
  proximos7: number;
}

export interface DashboardPorEtapa {
  etapa: EtapaOportunidadVenta;
  cantidad: number;
  monto: number;
}

export interface DashboardRankingResponsable {
  responsableId: number;
  responsable: string;
  total: number;
  activas: number;
  ganadas: number;
  perdidas: number;
  postergadas: number;
  montoTotal: number;
  montoGanado: number;
}

export interface DashboardSinSeguimientoItem {
  id: number;
  codigo: string;
  titulo: string;
  proyecto: string | null;
  entidad: string | null;
  responsable: string | null;
  etapa: EtapaOportunidadVenta;
  ultimaActividad: string;
  proximaAccion: string | null;
  valor: number;
}

export interface DashboardSinSeguimiento {
  cantidad: number;
  items: DashboardSinSeguimientoItem[];
}

export interface DashboardForecastBucket {
  cantidad: number;
  montoTotal: number;
  montoPonderado: number;
}

export interface DashboardMotivo {
  motivo: string;
  cantidad: number;
}

export interface DashboardRiesgoItem {
  id: number;
  codigo: string;
  titulo: string;
  entidad: string | null;
  responsable: string | null;
  etapa: EtapaOportunidadVenta;
  valor: number;
}

export interface DashboardConversionEtapa {
  etapa: EtapaOportunidadVenta;
  cantidad: number;
  porcentajeDelTotal: number;
  tasaConversionSiguiente: number;
}

export interface DashboardAvanzado {
  porTipoServicio: { tipoServicio: string; cantidad: number; monto: number }[];
  topClientes: { cliente: string; cantidad: number; monto: number }[];
  forecast: { d30: DashboardForecastBucket; d60: DashboardForecastBucket; d90: DashboardForecastBucket };
  motivos: { perdida: DashboardMotivo[]; postergacion: DashboardMotivo[] };
  riesgo: {
    detenidas: DashboardSinSeguimiento;
    sinProximaAccion: { cantidad: number; items: DashboardRiesgoItem[] };
  };
  conversionPorEtapa: DashboardConversionEtapa[];
}

export interface DashboardFunnelData {
  kpis: DashboardKpis;
  proximasAcciones: DashboardProximasAcciones;
  porEtapa: DashboardPorEtapa[];
  rankingResponsables: DashboardRankingResponsable[];
  sinSeguimiento: DashboardSinSeguimiento;
  avanzado: DashboardAvanzado;
}

/* =========================================================
   Envelope de respuesta del backend ({ success, data, ... })
========================================================= */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: { page: number; limit: number; total: number; pages: number };
  code?: string;
  message?: string;
  errors?: unknown;
}

export interface Toast {
  type: "success" | "error";
  message: string;
}
