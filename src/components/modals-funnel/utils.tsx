// src/components/modals-funnel/utils.tsx
import type {
  EtapaOportunidadVenta,
  PrioridadOportunidadVenta,
  EstadoDesarrolloPropuesta,
  TipoServicioOportunidad,
  RiesgoTecnicoOportunidad,
} from "./types";

/* =========================================================
   Etapas — orden de columnas, etiquetas y color
========================================================= */
export const ORDEN_ETAPAS: EtapaOportunidadVenta[] = [
  "NUEVA",
  "COTIZACION_PREPARACION",
  "COTIZACION_ENVIADA",
  "NEGOCIACION",
  "GANADA",
];

// PERDIDA/POSTERGADA no son columnas propias del tablero (se pliegan dentro de
// NEGOCIACION, ver getEtapaColumnaVisible), pero sí deben poder seleccionarse
// desde el selector "Cambiar etapa" del drawer — por eso van en una lista aparte.
export const ETAPAS_SELECCIONABLES: EtapaOportunidadVenta[] = [...ORDEN_ETAPAS, "PERDIDA", "POSTERGADA"];

const ETAPA_LABELS: Record<EtapaOportunidadVenta, string> = {
  NUEVA: "Nueva oportunidad",
  COTIZACION_PREPARACION: "Cotización en preparación",
  COTIZACION_ENVIADA: "Cotización enviada",
  NEGOCIACION: "Negociación",
  GANADA: "Ganada",
  PERDIDA: "Perdida",
  POSTERGADA: "Postergada",
};

export function getEtapaLabel(etapa: EtapaOportunidadVenta): string {
  return ETAPA_LABELS[etapa] ?? etapa;
}

// Clases Tailwind para encabezado de columna (fondo suave, coherente con el resto de la app)
const ETAPA_COLUMN_CLASSES: Record<EtapaOportunidadVenta, string> = {
  NUEVA: "bg-slate-50 border-slate-200",
  COTIZACION_PREPARACION: "bg-amber-50 border-amber-200",
  COTIZACION_ENVIADA: "bg-indigo-50 border-indigo-200",
  NEGOCIACION: "bg-orange-50 border-orange-200",
  GANADA: "bg-emerald-50 border-emerald-200",
  PERDIDA: "bg-rose-50 border-rose-200",
  POSTERGADA: "bg-orange-50 border-orange-200",
};

export function getEtapaColumnClass(etapa: EtapaOportunidadVenta): string {
  return ETAPA_COLUMN_CLASSES[etapa] ?? "bg-slate-50 border-slate-200";
}

// Clases Tailwind para el badge de etapa dentro de la tarjeta/drawer
const ETAPA_BADGE_CLASSES: Record<EtapaOportunidadVenta, string> = {
  NUEVA: "bg-slate-100 text-slate-700",
  COTIZACION_PREPARACION: "bg-amber-100 text-amber-800",
  COTIZACION_ENVIADA: "bg-indigo-100 text-indigo-700",
  NEGOCIACION: "bg-orange-100 text-orange-800",
  GANADA: "bg-emerald-100 text-emerald-700",
  PERDIDA: "bg-rose-100 text-rose-700",
  POSTERGADA: "bg-orange-100 text-orange-700",
};

export function getEtapaBadgeClass(etapa: EtapaOportunidadVenta): string {
  return ETAPA_BADGE_CLASSES[etapa] ?? "bg-slate-100 text-slate-700";
}

// Colores en hex (no clases Tailwind) para usar en gráficos recharts.
const ETAPA_CHART_COLORS: Record<EtapaOportunidadVenta, string> = {
  NUEVA: "#64748b",
  COTIZACION_PREPARACION: "#d97706",
  COTIZACION_ENVIADA: "#4f46e5",
  NEGOCIACION: "#ea580c",
  GANADA: "#059669",
  PERDIDA: "#e11d48",
  POSTERGADA: "#f97316",
};

export function getEtapaChartColor(etapa: EtapaOportunidadVenta): string {
  return ETAPA_CHART_COLORS[etapa] ?? "#64748b";
}

/* =========================================================
   Prioridad — etiquetas y color (antd Tag color)
========================================================= */
const PRIORIDAD_LABELS: Record<PrioridadOportunidadVenta, string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
  URGENTE: "Urgente",
};

export function getPrioridadLabel(prioridad: PrioridadOportunidadVenta): string {
  return PRIORIDAD_LABELS[prioridad] ?? prioridad;
}

const PRIORIDAD_TAG_COLOR: Record<PrioridadOportunidadVenta, string> = {
  BAJA: "default",
  MEDIA: "blue",
  ALTA: "orange",
  URGENTE: "red",
};

export function getPrioridadTagColor(prioridad: PrioridadOportunidadVenta): string {
  return PRIORIDAD_TAG_COLOR[prioridad] ?? "default";
}

/* =========================================================
   Desarrollo de propuesta (etapas COTIZACION_PREPARACION / ENVIADA)
========================================================= */
const ESTADO_DESARROLLO_PROPUESTA_LABELS: Record<EstadoDesarrolloPropuesta, string> = {
  PENDIENTE: "Pendiente",
  EN_PREPARACION: "En preparación",
  ESPERANDO_ANTECEDENTES: "Esperando antecedentes",
  REVISION_INTERNA: "Revisión interna",
  LISTA_PARA_COTIZAR: "Lista para cotizar",
};

export function getEstadoDesarrolloPropuestaLabel(estado: EstadoDesarrolloPropuesta): string {
  return ESTADO_DESARROLLO_PROPUESTA_LABELS[estado] ?? estado;
}

const TIPO_SERVICIO_OPORTUNIDAD_LABELS: Record<TipoServicioOportunidad, string> = {
  SOPORTE_TI: "Soporte TI",
  DESARROLLO_WEB: "Desarrollo web",
  VENTA_PRODUCTOS: "Venta de productos",
  OTRO: "Otro",
};

export function getTipoServicioOportunidadLabel(tipo: TipoServicioOportunidad): string {
  return TIPO_SERVICIO_OPORTUNIDAD_LABELS[tipo] ?? tipo;
}

const RIESGO_TECNICO_LABELS: Record<RiesgoTecnicoOportunidad, string> = {
  BAJO: "Bajo",
  MEDIO: "Medio",
  ALTO: "Alto",
};

export function getRiesgoTecnicoLabel(riesgo: RiesgoTecnicoOportunidad): string {
  return RIESGO_TECNICO_LABELS[riesgo] ?? riesgo;
}

/* =========================================================
   Formato de moneda y fecha
========================================================= */
export function formatMonto(valor: string | number | null | undefined, moneda: string = "CLP"): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  const n = typeof valor === "string" ? Number(valor) : valor;
  if (!Number.isFinite(n)) return "—";
  const prefix = moneda === "USD" ? "US$" : "$";
  try {
    return `${prefix}${Math.round(n).toLocaleString("es-CL")}`;
  } catch {
    return `${prefix}${n}`;
  }
}

export function formatFecha(fecha: string | null | undefined): string {
  if (!fecha) return "—";
  try {
    return new Date(fecha).toLocaleDateString("es-CL");
  } catch {
    return "—";
  }
}

export function formatFechaHora(fecha: string | null | undefined): string {
  if (!fecha) return "—";
  try {
    return new Date(fecha).toLocaleString("es-CL");
  } catch {
    return "—";
  }
}

// Una acción se considera vencida si su fecha ya pasó y la oportunidad no está cerrada.
export function esAccionVencida(fechaProximaAccion: string | null | undefined, etapa: EtapaOportunidadVenta): boolean {
  if (!fechaProximaAccion) return false;
  if (etapa === "GANADA" || etapa === "PERDIDA" || etapa === "POSTERGADA") return false;
  const fecha = new Date(fechaProximaAccion);
  if (Number.isNaN(fecha.getTime())) return false;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return fecha.getTime() < hoy.getTime();
}

/* =========================================================
   Extracción de mensaje de error API (mismo patrón que Cotizaciones.tsx,
   adaptado al envelope {success, code, message} usado por /api/oportunidades)
========================================================= */
interface ApiErrorShape {
  response?: { data?: { message?: string; error?: string; code?: string } };
  data?: { message?: string; error?: string; code?: string };
  message?: string;
}

export function getOportunidadErrorMessage(error: unknown, defaultMessage: string): string {
  const e = error as ApiErrorShape;
  const data = e?.response?.data ?? e?.data;
  let message: unknown = data?.message || data?.error || e?.message || defaultMessage;
  if (typeof message !== "string") message = defaultMessage;
  return message as string;
}

export function getOportunidadErrorCode(error: unknown): string | undefined {
  const e = error as ApiErrorShape;
  return e?.response?.data?.code ?? e?.data?.code;
}

export function getEtapaColumnaVisible(etapa: EtapaOportunidadVenta): EtapaOportunidadVenta {
  if (etapa === "PERDIDA" || etapa === "POSTERGADA") return "NEGOCIACION";
  return etapa;
}