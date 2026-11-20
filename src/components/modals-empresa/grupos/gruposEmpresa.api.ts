// src/components/modals-empresa/grupos/gruposEmpresa.api.ts
// Grupos de empresas (G1): CRUD y asignación desde la ficha.
import { http } from "../../../service/http";

export interface GrupoEmpresaEmpresa {
    id_empresa: number;
    nombre: string;
    isActive: boolean;
}

export interface GrupoEmpresa {
    id: number;
    nombre: string;
    descripcion: string | null;
    createdAt: string;
    updatedAt: string;
    empresas: GrupoEmpresaEmpresa[];
    totalEmpresas: number;
}

export interface GrupoEmpresaInput {
    nombre: string;
    descripcion?: string | null;
    empresaIds?: number[];
}

/** Resumen que devuelve el backend al crear/editar con empresaIds. */
export interface ResumenEmpresasGrupo {
    agregadas: number;
    quitadas: number;
    movidas: number;
}

/** Empresa activa para el selector del modal de grupos. */
export interface EmpresaOpcionGrupo {
    id_empresa: number;
    nombre: string;
    grupo: { id: number; nombre: string } | null;
}

export async function listarGruposEmpresa(): Promise<GrupoEmpresa[]> {
    const { data } = await http.get("/grupos-empresa");
    return Array.isArray(data?.data) ? (data.data as GrupoEmpresa[]) : [];
}

/** Empresas activas (GET /empresas en modo rápido ya trae `grupo`). */
export async function listarEmpresasParaGrupo(): Promise<EmpresaOpcionGrupo[]> {
    const { data } = await http.get("/empresas", { params: { estado: "ACTIVAS" } });
    const items: unknown[] = Array.isArray(data?.data) ? data.data : [];
    return items.flatMap((raw) => {
        const e = raw as { id_empresa?: unknown; nombre?: unknown; grupo?: { id?: unknown; nombre?: unknown } | null };
        if (typeof e.id_empresa !== "number") return [];
        return [{
            id_empresa: e.id_empresa,
            nombre: String(e.nombre ?? ""),
            grupo: e.grupo && typeof e.grupo.id === "number"
                ? { id: e.grupo.id, nombre: String(e.grupo.nombre ?? "") }
                : null,
        }];
    });
}

function leerResumen(data: unknown): ResumenEmpresasGrupo {
    const r = (data as { empresas?: Partial<ResumenEmpresasGrupo> } | undefined)?.empresas;
    return {
        agregadas: Number(r?.agregadas ?? 0),
        quitadas: Number(r?.quitadas ?? 0),
        movidas: Number(r?.movidas ?? 0),
    };
}

export async function crearGrupoEmpresa(input: GrupoEmpresaInput): Promise<ResumenEmpresasGrupo> {
    const { data } = await http.post("/grupos-empresa", input);
    return leerResumen(data);
}

export async function actualizarGrupoEmpresa(id: number, input: GrupoEmpresaInput): Promise<ResumenEmpresasGrupo> {
    const { data } = await http.put(`/grupos-empresa/${id}`, input);
    return leerResumen(data);
}

export async function eliminarGrupoEmpresa(id: number): Promise<void> {
    await http.delete(`/grupos-empresa/${id}`);
}

export async function asignarGrupoEmpresa(empresaId: number, grupoId: number | null): Promise<void> {
    await http.patch(`/empresas/${empresaId}/grupo`, { grupoId });
}

/** Grupo actual de una empresa (GET /empresas/:id devuelve `grupo`). */
export async function obtenerGrupoDeEmpresa(
    empresaId: number
): Promise<{ id: number; nombre: string } | null> {
    const { data } = await http.get(`/empresas/${empresaId}`);
    const grupo = data?.data?.grupo;
    return grupo && typeof grupo.id === "number" ? { id: grupo.id, nombre: String(grupo.nombre) } : null;
}

/** Mensaje del backend ({ error } o { message }) o el texto por defecto. */
export function mensajeErrorGrupo(error: unknown, fallback: string): string {
    const data = (error as { response?: { data?: { error?: unknown; message?: unknown } } })
        ?.response?.data;
    if (typeof data?.error === "string" && data.error.trim()) return data.error;
    if (typeof data?.message === "string" && data.message.trim()) return data.message;
    return fallback;
}