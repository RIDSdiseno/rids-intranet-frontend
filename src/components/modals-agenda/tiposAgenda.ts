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

export interface AgendaVisita {
  id: number;
  fecha: string;
  tipo: string;
  estado: string;
  empresa: Empresa | null;
  empresaExternaNombre?: string | null;
  tecnicos: TecnicoRelacion[];
  horaInicio?: string | null;
  horaFin?: string | null;
  notas?: string | null;
}