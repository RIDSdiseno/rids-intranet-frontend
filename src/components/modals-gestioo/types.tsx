
/* =========================
   Tipos / Enums FRONT
========================= */

export type OrigenGestioo = "RIDS" | "ECONNET" | "OTRO";
export type Prioridad = "baja" | "normal" | "alta";
export type Area = "entrada" | "domicilio" | "reparacion" | "salida";

export const TipoEquipo = {
    GENERICO: "GENERICO",
    NOTEBOOK: "NOTEBOOK",
    ALL_IN_ONE: "ALL_IN_ONE",
    DESKTOP: "DESKTOP",
    CPU: "CPU",
    EQUIPO_ARMADO: "EQUIPO_ARMADO",

    IMPRESORA: "IMPRESORA",
    SCANNER: "SCANNER",
    LASER: "LASER",
    LED: "LED",

    MONITOR: "MONITOR",
    NAS: "NAS",
    ROUTER: "ROUTER",

    DISCO_DURO_EXTERNO: "DISCO_DURO_EXTERNO",
    CARGADOR: "CARGADOR",
    INSUMOS_COMPUTACIONALES: "INSUMOS_COMPUTACIONALES",

    RELOJ_CONTROL: "RELOJ_CONTROL",

    OTRO: "OTRO",
} as const;

/** 👈 TYPE derivado (ESTE es el que se usa como tipo) */
export type TipoEquipoValue =
    typeof TipoEquipo[keyof typeof TipoEquipo];


export const TipoEquipoLabel: Record<TipoEquipoValue, string> = {
    GENERICO: "Genérico",
    NOTEBOOK: "Notebook",
    ALL_IN_ONE: "All in One",
    DESKTOP: "Desktop",
    CPU: "CPU",
    EQUIPO_ARMADO: "Equipo Armado",

    IMPRESORA: "Impresora",
    SCANNER: "Scanner",
    LASER: "Láser",
    LED: "LED",

    MONITOR: "Monitor",
    NAS: "NAS",
    ROUTER: "Router",

    DISCO_DURO_EXTERNO: "Disco Duro Externo",
    CARGADOR: "Cargador",
    INSUMOS_COMPUTACIONALES: "Insumos Computacionales",

    RELOJ_CONTROL: "Reloj Control",

    OTRO: "Otro",
};

export interface OrdenFormData {
    tipoTrabajo: string;
    descripcion: string;
    prioridad: Prioridad;
    estado: "pendiente" | "en progreso" | "completada" | "cancelada";
    notas: string;
    area: Area;
    fecha: string;
    tipoEntidad: "EMPRESA" | "PERSONA";
    origenEntidad: OrigenGestioo | "";
    entidadId: string;
    equipoId: string;

    tecnicoId?: string;
}

export interface EntidadGestioo {
    id: number;
    nombre: string;
    rut?: string;
    correo?: string;
    telefono?: string;
    direccion?: string;
    origen?: OrigenGestioo;
}

export interface EquipoGestioo {
    id_equipo: number;
    marca: string;
    modelo: string;
    serial: string | null;
    tipo: TipoEquipoValue;
    // Si tu backend aún no lo manda, se mantiene optional para no romper.
    empresaId?: number | null;
}

export interface DetalleTrabajoGestioo {
    id: number;
    fecha: string;
    tipoTrabajo: string;
    tipoEntidad?: "EMPRESA" | "PERSONA";
    descripcion?: string | null;
    estado: string;
    notas?: string | null;
    area: "ENTRADA" | "DOMICILIO" | "REPARACION" | "SALIDA";
    prioridad: "BAJA" | "NORMAL" | "ALTA";
    entidad?: EntidadGestioo | null;
    equipo?: EquipoGestioo | null;

    tecnico?: {
        id_tecnico: number;
        nombre: string;
    } | null;
}

export interface Tecnico {
    id_tecnico: number;
    nombre: string;
    status: boolean;
}

// types.ts (o local al modal)
export interface Empresa {
    id_empresa: number;
    nombre: string;
}

export interface Solicitante {
    id: number;
    nombre: string;
    email?: string | null;
    empresaId: number;
}

export const MARCAS_EQUIPO = [
    "ACER",
    "APPLE",
    "ASUS",
    "CHUWI",
    "DELL",
    "HP",
    "HUAWEI",
    "LENOVO",
    "MSI",
    "SAMSUNG",
] as const;

export type MarcaEquipo = typeof MARCAS_EQUIPO[number];

export const MODELOS_POR_MARCA = {
    ACER: [
        "Aspire 5 N19C3",
        "Aspire A314-22",
        "Aspire A315-41",
        "Aspire A315-53",
        "Aspire A515-43",
        "Aspire A515-54",
        "Aspire Lite 15 AL15-72P-79W5",
        "Aspire 3",
        "Aspire 5",
        "Swift 3",
        "Swift 5",
        "TravelMate P2",
    ],
    APPLE: ["MacBook Air", "MacBook Pro", "MacBook Air M1",
        "MacBook Air M2",
        "MacBook Pro 13",
        "MacBook Pro 14",
        "MacBook Pro 16",],
    ASUS: ["All series",
        "B1402CBA",
        "DEMO NOTEBOOK",
        "VivoBook ASUS Laptop X515MA",
        "VivoBook X515",
        "VivoBook 15",
        "ROG Strix",
        "TUF Gaming F15",],
    CHUWI: ["Herobook Pro", "CoreBook X",],
    DELL: [
        "Latitude 3400",
        "Latitude 5400",
        "Latitude 5450",
        "Latitude 7400",
        "Latitude 7450",
        "Latitude 7480",
        "Optiplex 3040",
        "Optiplex 3060",
        "Optiplex 7070",
        "T450",
        "XPS 13",
    ],
    HP: ["240 G5", "EliteBook 820 G3", "EliteBook 840 G5", "Victus HP",
        "EliteBook 840 G3", "EliteBook Folio 1040 G3",
        "ProBook 4320s",],
    HUAWEI: ["MateBook D15", "MateBook D14", "NBLB-WAX9N",],
    LENOVO: [
        "ThinkPad L14",
        "V14 G1",
        "V14 Gen2",
        "V145-14AST (81MS)",
        "X1 Carbon",
        "X1 Carbon 20K4",
        "Yoga 11e",
        "Yoga 11e 20LNS0YE00",
        "Yoga C940-14IIL Type 81Q9",
        "Yoga Slim 7",
        "IdeaPad 3 15ITL6",
        "IdeaPad Slim 3i",
        "ThinkPad T480",
        "ThinkPad X1 Carbon",
    ],
    MSI: ["GS66 Stealth 10SD", "MS-7A15", "Modern 14",],
    SAMSUNG: ["530U3BI", "550P5C / 550P7C", "Galaxy Book",],
} as const;

export const PROCESADORES = [
    // Intel
    "Intel Core i3",
    "Intel Core i5",
    "Intel Core i7",
    "Intel Core i9",
    "Intel Core i5-8250U",
    "Intel Core i5-10400",
    "Intel Core i7-8565U",

    // AMD
    "AMD Ryzen 3",
    "AMD Ryzen 5",
    "AMD Ryzen 7",

    // Apple
    "Apple M1",
    "Apple M2",

    // Otros
    "Celeron",
    "Pentium",
] as const;

export type ProcesadorEquipo = typeof PROCESADORES[number];

export const RAMS = [
    "2 GB",
    "4 GB",
    "8 GB",
    "12 GB",
    "16 GB",
    "32 GB",
    "64 GB",
] as const;

export type RamEquipo = typeof RAMS[number];

export const DISCOS = [
    "120 GB SSD",
    "240 GB SSD",
    "256 GB SSD",
    "480 GB SSD",
    "512 GB SSD",
    "1 TB SSD",

    "500 GB HDD",
    "1 TB HDD",
] as const;

export type DiscoEquipo = typeof DISCOS[number];
