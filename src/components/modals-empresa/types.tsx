/* =====================================================
   MODELOS DE DOMINIO (DATA MODELS)
===================================================== */

/* ================= CHECKLIST ================= */

export type ChecklistKey =
    | "levantamientoEquipos"
    | "inventarioSoftware"
    | "soporteComputacional"
    | "sitiosWeb"
    | "visitasPresenciales"
    | "contratoFirmado"
    | "facturasArchivadas"
    | "historialIncidencias"
    | "reunionesRevision"
    | "registroAccesos"
    | "metasDigitales"
    | "planAccion";

export type ChecklistState = Record<ChecklistKey, boolean>;

export interface ChecklistSection {
    section: string;
    items: {
        key: ChecklistKey;
        label: string;
    }[];
}

export interface ChecklistItem {
    key: ChecklistKey;
    label: string;
    section: string;
}

/* ================= EMPRESA / FICHA ================= */

export interface DetalleEmpresa {
    rut?: string | null;
    direccion?: string | null;
    telefono?: string | null;
    email?: string | null;
    sitioWeb?: string | null;
    industria?: string | null;
}

export interface EmpresaLite {
    id_empresa: number;
    nombre: string;
    razonSocial?: string | null;
    detalleEmpresa?: DetalleEmpresa;
}

export interface FichaEmpresa {
    creadaEn: string;
    actualizadaEn?: string;
    condicionesComerciales?: string | null;
}

export interface FichaEmpresaCompleta {
  empresa: EmpresaLite;
  ficha: FichaEmpresa | null;
  checklist: Partial<ChecklistState> | null;
  detalleEmpresa: DetalleEmpresa | null;
  fichaTecnica: FichaTecnicaEmpresa | null; 
  contactos: ContactoEmpresa[];
  sucursales: Sucursal[];                  
}

export interface ContactoEmpresa {
    id: number;
    nombre: string;
    cargo: string;
    email?: string | null;
    telefono?: string | null;
    principal: boolean;
}

/* ================= FICHA TÉCNICA EMPRESA ================= */

export interface FichaTecnicaEmpresa {
    tecnicoPrincipal?: string | null;
    tecnicosRespaldo?: string | null;

    fechaUltimaVisita?: string | Date | null;
    proximaVisitaProgramada?: string | Date | null;
    observacionesVisita?: string | null;

    pcsNotebooks?: string | null;
    servidores?: string | null;
    impresorasPerifericos?: string | null;
    otrosEquipos?: string | null;

    sistemasOperativos?: string | null;
    aplicacionesCriticas?: string | null;
    licenciasVigentes?: string | null;
    antivirusSeguridad?: string | null;

    // 🔥 ISP / Conectividad
    proveedorInternet?: string | null;
    velocidadContratada?: string | null;
    routersSwitches?: string | null;
    configuracionIP?: string | null;

    dominioWeb?: string | null;
    hostingProveedor?: string | null;
    certificadoSSL?: string | null;
    correosCorporativos?: string | null;
    redesSociales?: string | null;

    metodoRespaldo?: string | null;
    frecuenciaRespaldo?: string | null;
    responsableRespaldo?: string | null;
    ultimaRestauracion?: string | Date | null;
}

/* ================= RED SUCURSAL ================= */

export interface RedSucursal {
    wifiNombre?: string | null;
    claveWifi?: string | null;
    ipRed?: string | null;
    gateway?: string | null;
    observaciones?: string | null;
}

/* ================= EQUIPOS / SOLICITANTES ================= */

export interface EquipoLite {
    id_equipo: number;
    serial?: string | null;
    marca?: string | null;
    modelo?: string | null;
    procesador?: string | null;
    ram?: string | null;
    disco?: string | null;
    propiedad?: string | null;

    solicitante?: {
        id_solicitante: number;
        nombre: string;
    } | null;
}

export interface SolicitanteLite {
    id_solicitante: number;
    nombre: string;
    email: string | null;
    telefono?: string | null;
    equipos?: EquipoLite[];
}


/* ================= VISITAS ================= */

export type VisitaEstado =
    | "PENDIENTE"
    | "COMPLETADA"
    | "CANCELADA";

export interface Visita {
    id_visita: number;

    empresaId?: number | null;
    tecnicoId?: number | null;
    solicitanteId?: number | null;

    inicio?: string | Date | null;
    fin?: string | Date | null;
    status?: VisitaEstado | string | null;

    // checks
    confImpresoras?: boolean;
    confTelefonos?: boolean;
    confPiePagina?: boolean;
    otros?: boolean;
    actualizaciones?: boolean;
    antivirus?: boolean;
    ccleaner?: boolean;
    estadoDisco?: boolean;
    licenciaOffice?: boolean;
    licenciaWindows?: boolean;
    mantenimientoReloj?: boolean;
    rendimientoEquipo?: boolean;

    otrosDetalle?: string | null;

    empresa?: { id_empresa: number; nombre: string } | null;
    tecnico?: { id_tecnico: number; nombre: string } | string | null;
    solicitanteRef?: { id_solicitante: number; nombre: string } | null;

    // legacy
    fecha?: string | null;
    estado?: string | null;
    motivo?: string | null;
}


/* ================= ESTADÍSTICAS ================= */

export interface EstadisticasEmpresa {
    totalTickets: number;
    totalSolicitantes: number;
    totalEquipos: number;
    totalVisitas: number;
    totalTrabajos: number;
    visitasPendientes: number;
    trabajosPendientes: number;
}

/* =====================================================
   PROPS DE COMPONENTES (UI CONTRACTS)
===================================================== */

/* ================= TABS / MODALS ================= */

export type TabKey = "solicitantes" | "equipos" | "visitas" | "resumen" |  "redes" ;

/* ChecklistTab */
export interface ChecklistTabProps {
    empresaId: number;
    checklist: Partial<ChecklistState> | null;
    onUpdated?: () => void;
}

/* FichaTab */
export interface FichaTabProps {
    empresa: {
        id_empresa: number;
        nombre: string;
        razonSocial?: string | null; // 👈 AÑADIR ESTO
    };
    ficha: {
        creadaEn: string;
        condicionesComerciales?: string | null;
    } | null;
    detalleEmpresa: {
        rut?: string | null;
        direccion?: string | null;
    } | null;

    contactos: ContactoEmpresa[];

    onUpdated?: () => void;
}

/* EmpresaDetailsModal */
export interface EmpresaDetailsModalProps {
    open: boolean;
    onClose: () => void;
    loading: boolean;
    error?: string | null;
    empresa: EmpresaLite | null;
    solicitantes: SolicitanteLite[];
    equipos: EquipoLite[];
    visitas: Visita[];
}

/* FichaEmpresaModal */
export interface FichaEmpresaModalProps {
    open: boolean;
    onClose: () => void;
    empresa: EmpresaLite | null;
    ficha: FichaEmpresa | null;
    checklist: Partial<ChecklistState> | null;
    detalleEmpresa: DetalleEmpresa | null;
    contactos?: ContactoEmpresa[];
    loading: boolean;
}

/* =====================================================
   HELPERS / UTILS COMPARTIDOS
===================================================== */

export const toTimestamp = (value: string | Date): number =>
    value instanceof Date
        ? value.getTime()
        : new Date(value).getTime();

export const toDateStringCL = (
    value?: string | Date | null
): string => {
    if (!value) return "—";
    const ts = toTimestamp(value);
    if (Number.isNaN(ts)) return "—";

    return new Date(ts).toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

export interface ResponsableSucursal {
    id: number;
    nombre: string;
    cargo: string;
    email?: string | null;
    telefono?: string | null;
}

export interface Sucursal {
    id_sucursal: number;
    nombre: string;
    direccion?: string | null;
    telefono?: string | null;
    responsableSucursals: ResponsableSucursal[];
    redSucursal?: RedSucursal | null;
}
