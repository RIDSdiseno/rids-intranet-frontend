// src/api/api.ts
import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { notification } from "antd";

const API_URL = import.meta.env.VITE_API_URL;

/* ===============================
   CLIENTE PRINCIPAL
================================ */
export const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

/* ===============================
   CLIENTE SOLO PARA REFRESH
   (SIN INTERCEPTOR)
================================ */
const refreshClient = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

/* ===============================
   TOKEN MANAGEMENT
================================ */
let accessToken: string | null = localStorage.getItem("accessToken");

export const setAccessToken = (t: string | null) => {
    accessToken = t;

    if (t) {
        localStorage.setItem("accessToken", t);
    } else {
        localStorage.removeItem("accessToken");
    }
};

/* ===============================
   REQUEST INTERCEPTOR
================================ */
api.interceptors.request.use((config) => {
    if (accessToken) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
});

/* ===============================
   TYPES
================================ */
type RetriableConfig = AxiosRequestConfig & { _retried?: boolean };

interface ApiErrorResponse {
    error?: string;
}

/* ===============================
   REFRESH QUEUE
================================ */
let isRefreshing = false;

type QueueItem = {
    resolve: (v: unknown) => void;
    reject: (e: unknown) => void;
};

let queue: QueueItem[] = [];

/* ===============================
   RESPONSE INTERCEPTOR
================================ */
api.interceptors.response.use(
    (res) => res,

    async (error: AxiosError<ApiErrorResponse>) => {
        const originalConfig = error.config as RetriableConfig | undefined;

        if (!originalConfig) return Promise.reject(error);

        /* ===============================
           ERROR 500
        =============================== */
        if (error.response?.status === 500) {
            notification.error({
                message: "Error del servidor",
                description: "Ocurrió un error inesperado",
            });
        }

        /* ===============================
           ERROR 403
        =============================== */
        if (error.response?.status === 403) {
            notification.warning({
                message: "Acceso denegado",
            });
        }

        /* ===============================
           MANEJO DE 401 + REFRESH
        =============================== */
        if (
            error.response?.status === 401 &&
            !originalConfig._retried &&
            !originalConfig.url?.includes("/auth/login") &&
            !originalConfig.url?.includes("/auth/refresh")
        ) {
            originalConfig._retried = true;

            /* ===============================
               SI YA SE ESTÁ REFRESCANDO
            =============================== */
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    queue.push({
                        resolve: () => {
                            originalConfig.headers = originalConfig.headers ?? {};
                            originalConfig.headers.Authorization = `Bearer ${accessToken}`;
                            resolve(api(originalConfig));
                        },
                        reject,
                    });
                });
            }

            isRefreshing = true;

            try {
                /* ===============================
                   REFRESH TOKEN
                =============================== */
                const r = await refreshClient.post("/auth/refresh");

                const newAccess = r.data?.accessToken;

                if (newAccess) {
                    setAccessToken(newAccess);
                }

                /* ===============================
                   LIBERAR COLA
                =============================== */
                queue.forEach(({ resolve }) => resolve(null));
                queue = [];

                /* ===============================
                   REINTENTAR REQUEST ORIGINAL
                =============================== */
                originalConfig.headers = originalConfig.headers ?? {};
                originalConfig.headers.Authorization = `Bearer ${newAccess}`;

                return api(originalConfig);

            } catch (e) {

                /* ===============================
                   REFRESH FALLÓ
                =============================== */
                queue.forEach(({ reject }) => reject(e));
                queue = [];

                setAccessToken(null);

                notification.warning({
                    message: "Sesión expirada",
                    description: "Debes iniciar sesión nuevamente",
                    duration: 4,
                });

                setTimeout(() => {
                    window.location.href = "/login";
                }, 2000);

                return Promise.reject(e);

            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

/* ===============================
   EQUIPOS - AGENTE WINDOWS
================================ */

export type EstadoAgenteEquipo =
    | "SIN_AGENTE"
    | "ACTIVO"
    | "SIN_CONEXION"
    | "ADVERTENCIA"
    | "CRITICO";

export type EquipoAgentEmpresa = {
    id_empresa: number;
    nombre: string;
    razonSocial?: string | null;
};

export type EquipoAgentSolicitante = {
    id_solicitante: number;
    nombre: string;
    email?: string | null;
    telefono?: string | null;
};

export type EquipoAgentDetalle = {
    id?: number;
    idEquipo?: number;
    macWifi?: string | null;
    so?: string | null;
    tipoDd?: string | null;
    estadoAlm?: string | null;
    office?: string | null;
    teamViewer?: string | null;
    claveTv?: string | null;
    revisado?: string | null;
    adminRidsPassword?: string | null;
    adminRidsUsuario?: string | null;
    passwordEmpresa?: string | null;
    passwordPersonal?: string | null;
    usuarioEmpresa?: string | null;
    usuarioPersonal?: string | null;
    redEthernet?: string | null;

    antivirusNombre?: string | null;
    antivirusActivo?: boolean | null;
    firewallActivo?: boolean | null;
    bitlockerEstado?: string | null;
    windowsUpdate?: string | null;
    observacionAgente?: string | null;
};

export type EquipoSoftware = {
    id: number;
    equipoId: number;
    nombre: string;
    version?: string | null;
    publisher?: string | null;
    installDate?: string | null;
    createdAt: string;
    updatedAt: string;
};

export type EquipoAgenteEvento = {
    id: number;
    equipoId: number;
    tipo: string;
    mensaje?: string | null;
    metadata?: unknown;
    createdAt: string;
};

export type EquipoAgentItem = {
    id_equipo: number;
    idSolicitante?: number | null;
    empresaId?: number | null;

    serial?: string | null;
    marca: string;
    modelo: string;
    procesador?: string | null;
    ram?: string | null;
    disco?: string | null;
    propiedad?: string | null;
    tipo?: string | null;

    hostname?: string | null;
    usuarioActual?: string | null;
    dominio?: string | null;
    localIp?: string | null;
    publicIp?: string | null;
    macAddress?: string | null;

    ramGb?: number | null;
    diskTotalGb?: number | null;
    diskFreeGb?: number | null;

    lastBootAt?: string | null;
    lastSeenAt?: string | null;
    agenteVersion?: string | null;
    agenteActivo: boolean;
    estadoAgente: EstadoAgenteEquipo;

    createdAt?: string;
    updatedAt?: string;
    deletedAt?: string | null;

    empresa?: EquipoAgentEmpresa | null;
    solicitante?: EquipoAgentSolicitante | null;
    detalle?: EquipoAgentDetalle | null;

    softwares?: EquipoSoftware[];
    agenteEventos?: EquipoAgenteEvento[];

    _count?: {
        softwares?: number;
        agenteEventos?: number;
    };
};

export type GetEquiposAgentParams = {
    search?: string;
    empresaId?: number;
    estadoAgente?: EstadoAgenteEquipo;
    soloConAgente?: boolean;
};

export async function getEquiposAgent(params?: GetEquiposAgentParams) {
    const { data } = await api.get("/equipos/agent", {
        params,
    });

    return data.equipos as EquipoAgentItem[];
}

export async function getEquipoAgentById(id: number) {
    const { data } = await api.get(`/equipos/agent/${id}`);

    return data.equipo as EquipoAgentItem;
}