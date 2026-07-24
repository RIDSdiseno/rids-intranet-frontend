// src/components/modals-equipos/dashboard-agentes
export type DashboardEstadoAgente =
    | "ACTIVO"
    | "SIN_CONEXION"
    | "SIN_AGENTE";

export type DashboardEstadoOneDrive =
    | "OPERATIVO"
    | "NO_INSTALADO"
    | "NO_EJECUTANDO"
    | "SIN_USUARIO"
    | "CON_ADVERTENCIAS"
    | "SIN_INFORMACION";

export type DashboardSaludOneDrive =
    | "ESTABLE"
    | "INTERMITENTE"
    | "CON_FALLAS"
    | "NO_INSTALADO"
    | "SIN_DATOS";

export type DashboardAnalizadoMesFilter =
    | "TODOS"
    | "ANALIZADO"
    | "NO_ANALIZADO";

export interface DashboardAgenteItem {
    idEquipo: number;
    serial: string | null;
    marca: string;
    modelo: string;
    tipo: string;
    estadoEquipo: string;

    empresa: {
        id: number;
        nombre: string;
    } | null;

    solicitante: {
        id: number;
        nombre: string;
        email: string | null;
    } | null;

    hardware: {
        ramGb: number | null;
        diskTotalGb: number | null;
        diskFreeGb: number | null;
        sistemaOperativo: string | null;
    };

    agente: {
        instalado: boolean;
        estadoGuardado: string;
        estado: DashboardEstadoAgente;
        version: string | null;
        versionRecomendada: string | null;
        versionDesactualizada: boolean;
        ultimaConexion: string | null;
        ultimoArranque: string | null;
        hostname: string | null;
        usuarioActual: string | null;
        localIp: string | null;
    };

    analisisMes: {
        analizado: boolean;
        cantidad: number;
        diasAnalizados: number;
        ultimoAnalisis: string | null;
        ultimoTipo: string | null;
    };

    seguridad: {
        antivirusNombre: string | null;
        antivirusActivo: boolean | null;
        firewallActivo: boolean | null;
        cifradoEstado: string | null;
        windowsUpdate: string | null;
    };

    oneDrive: {
        estado: DashboardEstadoOneDrive;
        resumen: string | null;
        estadoReportado: string | null;
        instalado: boolean | null;
        enEjecucion: boolean | null;
        operativo: boolean | null;
        usuario: string | null;
        version: string | null;
        detalle: unknown;

        saludMes: {
            estado: DashboardSaludOneDrive;
            totalAnalisisConDatos: number;
            analisisOperativos: number;
            analisisConFalla: number;
            porcentajeOperativo: number;
            usuariosDetectados: string[];
            versionesDetectadas: string[];
        };
    };

    clasificacion: {
        requiereRevision: boolean;
        motivo: string | null;
    };

    alertas: string[];
}

export interface DashboardAgenteResponse {
    ok: boolean;

    periodo: {
        year: number;
        month: number;
        desde: string;
        hasta: string;
        timezone: string;
    };

    configuracion: {
        horasSinConexion: number;
        versionAgenteRecomendada: string | null;

        criteriosOneDrive: {
            requiereInstalado: boolean;
            requiereEjecucion: boolean;
            requiereUsuario: boolean;
            requiereOperativo: boolean;
        };

        tiposEventosInventario: string[];
    };

    resumen: {
        totalEquipos: number;
        equiposAnalizados: number;
        equiposNoAnalizados: number;
        totalAnalisis: number;
        porcentajeAnalizados: number;

        agentesActivos: number;
        agentesSinConexion: number;
        equiposSinAgente: number;
        agentesDesactualizados: number;
        pendientesClasificacion: number;

        oneDriveOperativo: number;
        oneDriveNoInstalado: number;
        oneDriveConAdvertencias: number;

        oneDriveEstableMes: number;
        oneDriveIntermitenteMes: number;
        oneDriveConFallasMes: number;

        oneDriveSinInformacion: number;
    };

    graficos: {
        actividadPorDia: Array<{
            fecha: string;
            analisis: number;
            equiposAnalizados: number;
            oneDriveOperativos: number;
            oneDriveConFalla: number;
        }>;

        versionesAgente: Array<{
            version: string;
            cantidad: number;
        }>;

        versionesOneDrive: Array<{
            version: string;
            cantidad: number;
        }>;

        coberturaPorEmpresa: Array<{
            empresaId: number | null;
            nombre: string;
            total: number;
            revisados: number;
            pendientes: number;
            analisis: number;
            porcentaje: number;
        }>;
    };

    items: DashboardAgenteItem[];
}