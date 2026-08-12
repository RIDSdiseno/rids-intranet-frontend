// src/components/modals-equipos/adicionales/adicionales.types.ts
export type OrigenAdicional =
  | "MANUAL"
  | "AGENTE";

export type EstadoAdicional =
  | "ASIGNADO"
  | "EN_STOCK"
  | "EN_REPARACION"
  | "DADO_DE_BAJA";

export type AdicionalEquipoLite = {
  id_equipo: number;
  serial?: string | null;
  marca?: string | null;
  modelo?: string | null;
  tipo?: string | null;
  estado?: string | null;
};

export type AdicionalSolicitanteLite = {
  id: number;
  nombre: string;
  email?: string | null;
  rut?: string | null;
};

export type AdicionalEmpresaLite = {
  id: number;
  nombre: string;
};

export type AdicionalRow = {
  id: number;
  equipoId: number;

  tipo: string;
  descripcion?: string | null;
  cantidad: number;
  serialAdicional?: string | null;

  origen: OrigenAdicional;
  estado: EstadoAdicional;

  createdAt: string;
  updatedAt: string;

  equipo: AdicionalEquipoLite;

  empresa?: AdicionalEmpresaLite | null;
  solicitante?: AdicionalSolicitanteLite | null;
};

export type AdicionalForm = {
  equipoId: number | null;
  tipo: string;
  descripcion: string;
  cantidad: number;
  serialAdicional: string;
  estado: EstadoAdicional;
};