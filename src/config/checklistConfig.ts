import type { ChecklistKey } from "./checklistTypes";

export const checklistConfig: {
    section: string;
    items: {
        key: ChecklistKey;
        label: string;
    }[];
}[] = [
        {
            section: "Infraestructura tecnológica",
            items: [
                { key: "levantamientoEquipos", label: "Levantamiento de equipos" },
                { key: "inventarioSoftware", label: "Inventario de software con licencias" }
            ]
        },
        {
            section: "Servicios contratados con RIDS",
            items: [
                { key: "soporteComputacional", label: "Soporte computacional" },
                { key: "sitiosWeb", label: "Sitios web / hosting / dominio" },
                { key: "visitasPresenciales", label: "Visitas presenciales" }
            ]
        },
        {
            section: "Documentación",
            items: [
                { key: "contratoFirmado", label: "Contrato firmado" },
                { key: "facturasArchivadas", label: "Facturas y cotizaciones archivadas" }
            ]
        },
        {
            section: "Soporte y seguimiento",
            items: [
                { key: "historialIncidencias", label: "Registrar historial de incidencias" },
                { key: "reunionesRevision", label: "Periodicidad de reuniones" }
            ]
        },
        {
            section: "Accesos y credenciales",
            items: [
                { key: "registroAccesos", label: "Registro seguro de accesos" }
            ]
        },
        {
            section: "Planificación y mejoras",
            items: [
                { key: "metasDigitales", label: "Definir metas digitales" },
                { key: "planAccion", label: "Plan de acción trimestral/semestral" }
            ]
        }
    ];
