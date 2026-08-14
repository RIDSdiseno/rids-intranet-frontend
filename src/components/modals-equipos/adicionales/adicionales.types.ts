// src/components/modals-equipos/adicionales/adicionales.types.ts

export type OrigenAdicional =
  | "MANUAL"
  | "AGENTE";

export type EstadoAdicional =
  | "ASIGNADO"
  | "EN_STOCK"
  | "EN_REPARACION"
  | "DADO_DE_BAJA";

/* =========================================================
   EQUIPO
========================================================= */

export type AdicionalEquipoLite = {
  id_equipo: number;

  serial?: string | null;

  marca?: string | null;
  modelo?: string | null;

  tipo?: string | null;

  estado?: string | null;

  empresaId?: number | null;

  empresa?: {
    id_empresa: number;
    nombre: string;
    isActive?: boolean;
  } | null;

  solicitante?: {
    id_solicitante: number;
    nombre: string;

    email?: string | null;
    rut?: string | null;

    empresaId?: number | null;

    empresa?: {
      id_empresa: number;
      nombre: string;
      isActive?: boolean;
    } | null;
  } | null;
};

/* =========================================================
   RELACIÓN ADICIONAL ↔ EQUIPO
========================================================= */

export type AdicionalEquipoRelacion = {
  id: number;

  adicionalId: number;
  equipoId: number;

  origen: OrigenAdicional;

  observacion?: string | null;

  createdAt?: string;
  updatedAt?: string;

  equipo: AdicionalEquipoLite;
};

/* =========================================================
   SOLICITANTE
========================================================= */

export type AdicionalSolicitanteLite = {
  id: number;

  nombre: string;

  email?: string | null;
  rut?: string | null;
};

/* =========================================================
   EMPRESA
========================================================= */

export type AdicionalEmpresaLite = {
  id: number;
  nombre: string;
};

/* =========================================================
   ADICIONAL
========================================================= */

export type AdicionalRow = {
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

  origen: OrigenAdicional;
  estado: EstadoAdicional;

  createdAt: string;
  updatedAt: string;

  /*
   * NUEVA RELACIÓN N:N
   */
  equipos: AdicionalEquipoRelacion[];

  /*
   * Resumen generado por backend.
   */
  empresas: AdicionalEmpresaLite[];

  solicitantes:
  AdicionalSolicitanteLite[];

  totalEquipos: number;
};

/* =========================================================
   FORMULARIO
========================================================= */

export type AdicionalForm = {
  nombre: string;

  tipo: string;

  marca: string;
  modelo: string;

  descripcion: string;

  cantidad: number;

  serialAdicional: string;

  macAddress: string;
  ipAddress: string;

  hostname: string;

  ubicacion: string;

  estado: EstadoAdicional;

  /*
   * Puede tener cero, uno o
   * múltiples equipos.
   */
  equipoIds: number[];
};