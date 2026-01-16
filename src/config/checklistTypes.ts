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
