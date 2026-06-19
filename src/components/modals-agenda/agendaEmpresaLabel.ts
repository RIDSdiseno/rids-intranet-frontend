import type { AgendaVisita, Empresa } from "./tiposAgenda";

export function getAgendaEmpresaNombre(empresa?: Empresa | null, empresaExternaNombre?: string | null): string {
  const nombre = empresa?.nombre?.trim() || empresaExternaNombre?.trim() || "OFICINA";
  return nombre.toLowerCase() === "rids" ? "OFICINA" : nombre;
}

export function getAgendaEmpresaNombreFromVisita(visita: Pick<AgendaVisita, "empresa" | "empresaExternaNombre">): string {
  return getAgendaEmpresaNombre(visita.empresa, visita.empresaExternaNombre);
}

export function getAgendaEmpresaOptionLabel(empresa: Empresa): string {
  return getAgendaEmpresaNombre(empresa, null);
}
