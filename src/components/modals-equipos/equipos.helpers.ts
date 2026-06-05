// src/components/modals-equipos/equipos.helpers.ts
import { TipoEquipo, type TipoEquipoValue } from "../modals-gestioo/types";
import type {
    ActorLite,
    EquipoHistorialItem,
    EstadoEquipo,
    RequiredEquipoFields,
} from "./equipos.types";

export const ESTADO_EQUIPO_OPTIONS: Array<{
    value: EstadoEquipo;
    label: string;
}> = [
        { value: "ACTIVO", label: "Activo" },
        { value: "EN_STOCK", label: "En stock" },
        { value: "DADO_DE_BAJA", label: "Dado de baja" },
        { value: "EN_RIDS", label: "En RIDS" },
        { value: "EN_GARANTIA", label: "En garantía" },
        { value: "EN_TALLER_EXTERNO", label: "En taller externo" },
    ];

export const REQUIRED_FIELDS_BY_TIPO: Record<TipoEquipoValue, RequiredEquipoFields> = {
    [TipoEquipo.GENERICO]: { procesador: true, ram: true, disco: true },
    [TipoEquipo.NOTEBOOK]: { procesador: true, ram: true, disco: true },
    [TipoEquipo.ALL_IN_ONE]: { procesador: true, ram: true, disco: true },
    [TipoEquipo.DESKTOP]: { procesador: true, ram: true, disco: true },
    [TipoEquipo.CPU]: { procesador: true, ram: true, disco: true },
    [TipoEquipo.EQUIPO_ARMADO]: { procesador: true, ram: true, disco: true },

    [TipoEquipo.IMPRESORA]: { procesador: false, ram: false, disco: false },
    [TipoEquipo.SCANNER]: { procesador: false, ram: false, disco: false },
    [TipoEquipo.LASER]: { procesador: false, ram: false, disco: false },
    [TipoEquipo.LED]: { procesador: false, ram: false, disco: false },
    [TipoEquipo.MONITOR]: { procesador: false, ram: false, disco: false },
    [TipoEquipo.ROUTER]: { procesador: false, ram: false, disco: false },
    [TipoEquipo.CARGADOR]: { procesador: false, ram: false, disco: false },
    [TipoEquipo.INSUMOS_COMPUTACIONALES]: { procesador: false, ram: false, disco: false },
    [TipoEquipo.RELOJ_CONTROL]: { procesador: false, ram: false, disco: false },
    [TipoEquipo.OTRO]: { procesador: false, ram: false, disco: false },

    [TipoEquipo.NAS]: { procesador: false, ram: false, disco: true },
    [TipoEquipo.DISCO_DURO_EXTERNO]: { procesador: false, ram: false, disco: true },
};

export const ADICIONAL_TIPOS = [
    "MONITOR",
    "CARGADOR",
    "MOUSE",
    "TECLADO",
    "DOCKING",
    "ADAPTADOR",
    "BOLSO",
    "UPS",
    "AURICULARES",
    "OTRO",
] as const;

export const ADICIONAL_TIPO_LABEL: Record<string, string> = {
    MONITOR: "Monitor",
    CARGADOR: "Cargador",
    MOUSE: "Mouse",
    TECLADO: "Teclado",
    DOCKING: "Docking",
    ADAPTADOR: "Adaptador",
    BOLSO: "Bolso",
    UPS: "UPS",
    AURICULARES: "Auriculares",
    OTRO: "Otro",
};

export const fieldLabels: Record<string, string> = {
    serial: "Serial",
    marca: "Marca",
    modelo: "Modelo",
    anioPc: "Año PC",
    anioPcOrigen: "Origen Año PC",
    procesador: "CPU",
    ram: "RAM",
    disco: "Disco",
    propiedad: "Propiedad",
    observaciones: "Observaciones",
    estado: "Estado",
    empresaId: "Empresa",
    idSolicitante: "Solicitante",
    macWifi: "MAC WiFi",
    so: "Sistema Operativo",
    tipoDd: "Tipo Disco",
    estadoAlm: "Estado Almacenamiento",
    office: "Office",
    teamViewer: "TeamViewer",
    redEthernet: "Red Ethernet (MAC)",
    claveTv: "Clave TeamViewer",
    revisado: "Revisado",
    adicionalesResumen: "Adicionales",
};

export const actionLabels: Record<string, string> = {
    CREATE: "Equipo creado",
    UPDATE: "Equipo actualizado",
    DELETE: "Equipo eliminado",
};

export function clsx(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
}

export function toUC(s?: string | null) {
    return s ? s.toUpperCase() : "";
}

export function formatRut(value?: string | null) {
    if (!value) return "Sin RUT";

    const clean = String(value).replace(/[^0-9kK]/g, "").toUpperCase();

    if (!clean) return "Sin RUT";
    if (clean.length <= 1) return clean;

    const cuerpo = clean.slice(0, -1);
    const dv = clean.slice(-1);

    return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`;
}

export function getEstadoEquipoLabel(value?: string | null) {
    return ESTADO_EQUIPO_OPTIONS.find((opt) => opt.value === value)?.label ?? "Activo";
}

export function getEstadoEquipoClass(value?: string | null) {
    switch (value) {
        case "ACTIVO":
            return "bg-emerald-50 text-emerald-700 border-emerald-200";
        case "EN_STOCK":
            return "bg-blue-50 text-blue-700 border-blue-200";
        case "EN_RIDS":
            return "bg-amber-50 text-amber-700 border-amber-200";
        case "EN_GARANTIA":
            return "bg-cyan-50 text-cyan-700 border-cyan-200";
        case "EN_TALLER_EXTERNO":
            return "bg-purple-50 text-purple-700 border-purple-200";
        case "DADO_DE_BAJA":
            return "bg-rose-50 text-rose-700 border-rose-200";
        default:
            return "bg-slate-50 text-slate-700 border-slate-200";
    }
}

export function getAnioPcOrigenLabel(value?: string | null) {
    switch (value) {
        case "AUTO":
            return "Calculado automáticamente";
        case "MANUAL":
            return "Modificado manualmente";
        case "NO_DETERMINADO":
            return "No determinado";
        default:
            return "No determinado";
    }
}

export function actorName(actor: ActorLite | null | undefined) {
    if (!actor) return "Sistema";
    if (typeof actor === "string") return actor;
    return actor.nombre ?? "Sistema";
}

export function getChanges(h: EquipoHistorialItem) {
    return h.changes ?? h.diff ?? null;
}