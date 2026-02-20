// src/lib/mantencionesRemotasApi.ts
import axios from "axios";
import { http } from "../service/http"; // <-- AJUSTA si tu carpeta es /services o la ruta difiere

export type MantencionStatus = "PENDIENTE" | "COMPLETADA" | "CANCELADA";

export type MantencionRemota = {
  id_mantencion: number;
  empresaId: number;
  tecnicoId: number;
  solicitanteId: number | null;
  solicitante: string;
  inicio: string;
  fin: string | null;

  soporteRemoto: boolean;
  actualizaciones: boolean;
  antivirus: boolean;
  ccleaner: boolean;
  estadoDisco: boolean;
  licenciaOffice: boolean;
  licenciaWindows: boolean;
  optimizacion: boolean;
  respaldo: boolean;
  otros: boolean;
  otrosDetalle: string | null;

  status: MantencionStatus;

  empresa?: { id_empresa: number; nombre: string };
  tecnico?: { id_tecnico: number; nombre: string };
  solicitanteRef?: { id_solicitante: number; nombre: string } | null;
};

export type Paged<T> = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: T[];
};

export type FiltersResp = {
  tecnicos: Array<{ id: number; nombre: string }>;
  empresas: Array<{ id: number; nombre: string }>;
};

export type ListMantencionesParams = {
  page?: number;
  pageSize?: number;
  tecnicoId?: number;
  empresaId?: number;
  status?: MantencionStatus;
  month?: number;
  year?: number;
  q?: string;
};

/**
 * Payload para crear/actualizar.
 * create: requiere empresaId/tecnicoId/inicio/etc (según rol backend)
 * update: suele ser parcial (PATCH)
 */
export type MantencionRemotaUpsert = Partial<{
  empresaId: number;

  // ✅ ahora puedes mandar id o email
  tecnicoId: number;
  tecnicoEmail: string;

  solicitanteId: number | null;
  solicitante: string;

  solicitantesNombres: string[];

  inicio: string;
  fin: string | null;

  soporteRemoto: boolean;
  actualizaciones: boolean;
  antivirus: boolean;
  ccleaner: boolean;
  estadoDisco: boolean;
  licenciaOffice: boolean;
  licenciaWindows: boolean;
  optimizacion: boolean;
  respaldo: boolean;
  otros: boolean;
  otrosDetalle: string | null;

  status: MantencionStatus;
}>;

export type CreateMantencionResponse =
  | MantencionRemota
  | { createdCount: number; mantenciones: MantencionRemota[] };

/* -------------------------- helpers -------------------------- */

/** Formato típico de error que podría venir del backend */
type ApiErrorShape = {
  error?: unknown;
  message?: unknown;
  details?: unknown;
};

/** Convierte unknown a string (seguro) */
function unknownToString(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (v == null) return null;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return null;
}

function normalizeApiError(err: unknown): Error {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;

    const dataUnknown: unknown = err.response?.data;
    const data: ApiErrorShape | null =
      dataUnknown && typeof dataUnknown === "object" ? (dataUnknown as ApiErrorShape) : null;

    if (status === 401) {
      return new Error("Token inválido o no enviado (401). Inicia sesión nuevamente.");
    }
    if (status === 403) {
      return new Error("No autorizado para esta acción (403).");
    }

    // backend típico: { error } o { message } o string
    const msg =
      unknownToString(data?.error) ||
      unknownToString(data?.message) ||
      unknownToString(dataUnknown) ||
      err.message ||
      `HTTP ${status ?? "error"}`;

    return new Error(msg);
  }

  return err instanceof Error ? err : new Error("Error inesperado");
}

/**
 * Limpia params para no mandar undefined/null/""
 */
function cleanParams<T extends Record<string, unknown>>(p: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(p)) {
    const v = p[k];
    if (v === undefined || v === null) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[k as keyof T] = v as T[keyof T];
  }
  return out;
}

/* -------------------------- API calls -------------------------- */

export async function listMantencionesRemotas(
  params: ListMantencionesParams
): Promise<Paged<MantencionRemota>> {
  try {
    const { data } = await http.get<Paged<MantencionRemota>>("/mantenciones-remotas", {
      params: cleanParams(params),
      timeout: 15000,
    });
    return data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

export async function getMantencionRemota(id: number): Promise<MantencionRemota> {
  try {
    const { data } = await http.get<MantencionRemota>(`/mantenciones-remotas/${id}`, {
      timeout: 15000,
    });
    return data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

export async function createMantencionRemota(
  payload: MantencionRemotaUpsert
): Promise<CreateMantencionResponse> {
  try {
    const { data } = await http.post<CreateMantencionResponse>("/mantenciones-remotas", payload, {
      timeout: 15000,
    });
    return data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

export async function updateMantencionRemota(
  id: number,
  payload: MantencionRemotaUpsert
): Promise<MantencionRemota> {
  try {
    const { data } = await http.patch<MantencionRemota>(`/mantenciones-remotas/${id}`, payload, {
      timeout: 15000,
    });
    return data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

export async function deleteMantencionRemota(id: number): Promise<void> {
  try {
    await http.delete(`/mantenciones-remotas/${id}`, { timeout: 15000 });
  } catch (err) {
    throw normalizeApiError(err);
  }
}

export async function closeMantencionRemota(id: number): Promise<MantencionRemota> {
  try {
    const { data } = await http.post<MantencionRemota>(`/mantenciones-remotas/${id}/close`, null, {
      timeout: 15000,
    });
    return data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}

export async function getMantencionesRemotasFilters(): Promise<FiltersResp> {
  try {
    const { data } = await http.get<FiltersResp>("/mantenciones-remotas/filters", {
      timeout: 15000,
    });
    return data;
  } catch (err) {
    throw normalizeApiError(err);
  }
}