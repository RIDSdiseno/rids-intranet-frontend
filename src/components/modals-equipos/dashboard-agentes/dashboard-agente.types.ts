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
        /** Plataforma del agente, para comparar contra su versión recomendada */
        plataforma?: "WINDOWS" | "MACOS";
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
        versionAgenteRecomendadaMac?: string | null;
        tiposPcIncluidos?: string[];
        estadosFueraDeOperacion?: string[];

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

    /** Equipos que no entran al dashboard (dados de baja o que no son PC) */
    excluidos?: DashboardExcluidos;

    /** EN_STOCK / EN_RIDS: se muestran aparte */
    fueraDeOperacion?: DashboardFueraDeOperacion;
}

export type DashboardMotivoExclusion = "DADO_DE_BAJA" | "VENDIDO" | "NO_ES_PC";

export interface DashboardExcluidos {
    total: number;

    dadosDeBaja: {
        total: number;
        conAgente: number;
        conAgenteActivo: number;
    };

    /* Opcional para no romper si el backend aún no lo envía */
    vendidos?: {
        total: number;
        conAgente: number;
        conAgenteActivo: number;
    };

    noPc: {
        total: number;
        porTipo: Array<{ tipo: string; cantidad: number }>;
    };

    equipos: Array<{
        idEquipo: number;
        serial: string | null;
        marca: string;
        modelo: string;
        tipo: string;
        estadoEquipo: string;
        empresa: { id: number; nombre: string } | null;
        hostname: string | null;
        ultimaConexion: string | null;
        estadoAgente: DashboardEstadoAgente;
        motivos: DashboardMotivoExclusion[];
    }>;
}

export interface DashboardFueraDeOperacion {
    total: number;
    enStock: number;
    enRids: number;
    items: DashboardAgenteItem[];
}