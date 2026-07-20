export interface Tecnico {
  id_tecnico: number;
  nombre: string;
}

export interface TecnicoRelacion {
  tecnico: Tecnico;
}

export interface Empresa {
  id_empresa: number;
  nombre: string;
}

export interface Sucursal {
  id_sucursal: number;
  nombre: string;
  direccion?: string | null;
  latitud?: number | null;
  longitud?: number | null;
}

export type OrigenVisita = "MANUAL" | "AGENDA";

export interface FormularioVisitaAsociada {
  id_visita: number;
  agendaId?: number | null;
  status: string;
  origen: OrigenVisita | string;
  inicio?: string | null;
  fin?: string | null;
}

export type EstadoAgenda =
  | "PROGRAMADA"
  | "NOTIFICADA"
  | "EN_RUTA"
  | "INICIADA"
  | "COMPLETADA"
  | "CANCELADA";

export function getAgendaEstadoLabel(estado?: string | null): string {
  const labels: Record<EstadoAgenda, string> = {
    PROGRAMADA: "Programada",
    NOTIFICADA: "Notificada",
    EN_RUTA: "En ruta",
    INICIADA: "Iniciada",
    COMPLETADA: "Completada",
    CANCELADA: "Cancelada",
  };

  const key = String(estado ?? "PROGRAMADA").toUpperCase() as EstadoAgenda;
  return labels[key] ?? String(estado ?? "Sin estado").replace(/_/g, " ");
}

export function getAgendaEstadoBadgeStyle(estado?: string | null): CSSProperties {
  const key = String(estado ?? "").toUpperCase();

  if (key === "INICIADA") {
    return { color: "#047857", background: "#ecfdf5", border: "1px solid #a7f3d0" };
  }

  if (key === "EN_RUTA") {
    return { color: "#1d4ed8", background: "#eff6ff", border: "1px solid #bfdbfe" };
  }

  if (key === "COMPLETADA") {
    return { color: "#475569", background: "#f8fafc", border: "1px solid #cbd5e1" };
  }

  if (key === "CANCELADA") {
    return { color: "#be123c", background: "#fff1f2", border: "1px solid #fecdd3" };
  }

  return { color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a" };
}

export function getAgendaEstadoEventColor(estado?: string | null): string {
  const key = String(estado ?? "").toUpperCase();

  if (key === "INICIADA") return "#10b981";
  if (key === "EN_RUTA") return "#2563eb";
  if (key === "COMPLETADA") return "#64748b";
  if (key === "CANCELADA") return "#e11d48";
  return "#f59e0b";
}

export interface AgendaVisita {
  id: number;
  fecha: string;
  tipo: string;
  estado: EstadoAgenda | string;
  empresa: Empresa | null;
  empresaExternaNombre?: string | null;
  sucursalId?: number | null;
  sucursal?: Sucursal | null;
  destinoNombre?: string | null;
  destinoDireccion?: string | null;
  tecnicos: TecnicoRelacion[];
  horaInicio?: string | null;
  horaFin?: string | null;
  fechaInicioRuta?: string | null;
  fechaInicioVisita?: string | null;
  visitaId?: number | null;
  visitaStatus?: string | null;
  visitaOrigen?: OrigenVisita | string | null;
  visita?: FormularioVisitaAsociada | null;
  notas?: string | null;
}
import type { CSSProperties } from "react";
