import axios, { AxiosError, type AxiosRequestConfig } from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

let accessToken: string | null = localStorage.getItem("accessToken");

export const setAccessToken = (t: string | null) => {
    accessToken = t;
    if (t) localStorage.setItem("accessToken", t);
    else localStorage.removeItem("accessToken");
};

api.interceptors.request.use((config) => {
    if (accessToken) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
});

type RetriableConfig = AxiosRequestConfig & { _retried?: boolean };

let isRefreshing = false;
let queue: Array<() => void> = [];

interface ApiErrorResponse {
    error?: string;
}

api.interceptors.response.use(
    (res) => res,
    async (error: AxiosError<ApiErrorResponse>) => {
        const originalConfig = error.config as RetriableConfig | undefined;
        if (!originalConfig) return Promise.reject(error);

        if (
            error.response?.status === 401 &&
            error.response?.data?.error === "TOKEN_EXPIRED" &&
            !originalConfig._retried &&
            !originalConfig.url?.includes("/auth/login") &&
            !originalConfig.url?.includes("/auth/refresh")
        ) {
            originalConfig._retried = true;

            if (!isRefreshing) {
                isRefreshing = true;
                try {
                    const r = await api.post("/auth/refresh");
                    const newAccess = r.data?.accessToken;
                    if (newAccess) setAccessToken(newAccess);

                    queue.forEach((cb) => cb());
                    queue = [];

                    return api(originalConfig);
                } catch (e) {
                    setAccessToken(null);
                    queue = [];
                    window.location.href = "/login";
                    return Promise.reject(e);
                } finally {
                    isRefreshing = false;
                }
            }

            return new Promise((resolve, reject) => {
                queue.push(() => {
                    api(originalConfig).then(resolve).catch(reject);
                });
            });
        }

        return Promise.reject(error);
    }
);
