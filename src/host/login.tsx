import React, { useState } from "react";
import { LogIn, Eye, EyeOff, HelpCircle } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import axios, { AxiosError, type AxiosRequestConfig } from "axios";

/* =========== Tipos de API =========== */
type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  tecnico: { id_tecnico: number; nombre: string; email: string };
};

type ErrorResponse = { error?: string };
type RefreshResponse = { accessToken: string };

/* =========== Axios (en el mismo archivo) =========== */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // ej: http://localhost:4000/api
  withCredentials: true, // para cookie httpOnly "rt"
});

// token en memoria (persistido en localStorage)
let accessToken: string | null = localStorage.getItem("accessToken");
const setAccessToken = (t: string | null) => {
  accessToken = t;
  if (t) localStorage.setItem("accessToken", t);
  else localStorage.removeItem("accessToken");
};

// Adjunta Bearer si hay token
api.interceptors.request.use((config) => {
  if (accessToken) {
    const headers = config.headers ?? {};
    headers.Authorization = `Bearer ${accessToken}`;
    config.headers = headers;
  }
  return config;
});

// Soporte para marcar un request como reintento sin usar "any"
type RetriableConfig = AxiosRequestConfig & { _retried?: boolean };

// Refresh automático una sola vez por request
let isRefreshing = false;
let queue: Array<() => void> = [];

// Interceptor de respuesta con control para login/refresh
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<ErrorResponse>) => {
    const originalConfig = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    // Si no hay config o es login/refresh, NO intentes refrescar
    if (
      !originalConfig ||
      originalConfig.url?.includes("/auth/login") ||
      originalConfig.url?.includes("/auth/refresh")
    ) {
      return Promise.reject(error);
    }

    if (status === 401 && !originalConfig._retried) {
      originalConfig._retried = true;

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const r = await api.post<RefreshResponse>("/auth/refresh"); // usa cookie "rt"
          const newAccess = r.data?.accessToken;
          if (newAccess) setAccessToken(newAccess);

          queue.forEach((cb) => cb());
          queue = [];

          return api(originalConfig);
        } catch (e) {
          setAccessToken(null);
          queue = [];
          return Promise.reject(e);
        } finally {
          isRefreshing = false;
        }
      }

      // si ya hay un refresh en curso, encola el reintento
      return new Promise((resolve, reject) => {
        queue.push(() => {
          api(originalConfig).then(resolve).catch(reject);
        });
      });
    }

    return Promise.reject(error);
  }
);

/* =========== Utils de validación =========== */
const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/* =========== Componente =========== */
const LoginRids: React.FC = () => {
  const [form, setForm] = useState<{ usuario: string; password: string }>({
    usuario: "",
    password: "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const extractApiError = (err: unknown): string => {
    if (axios.isAxiosError<ErrorResponse>(err)) {
      return err.response?.data?.error ?? err.message;
    }
    if (err instanceof Error) return err.message;
    return "Error inesperado";
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validaciones front
    if (!form.usuario || !form.password) {
      setError("Completa usuario y contraseña");
      return;
    }

    if (!isValidEmail(form.usuario.trim())) {
      setError("Ingresa un correo electrónico válido");
      return;
    }

    setLoading(true);
    try {
      // LOGIN (POST)
      const { data } = await api.post<LoginResponse>("/auth/login", {
        email: form.usuario.trim(),
        password: form.password,
      });

      // Guardar accessToken (el refresh queda en cookie httpOnly)
      setAccessToken(data.accessToken);

      // Redirigir al Home
      navigate("/home", { replace: true });
    } catch (err: unknown) {
      // Manejo específico para 401 (credenciales malas)
      if (axios.isAxiosError<ErrorResponse>(err)) {
        if (err.response?.status === 401) {
          setError(err.response.data?.error ?? "Usuario o contraseña incorrectos");
          setLoading(false);
          return;
        }
      }
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="
        relative w-full
        min-h-screen min-h-[100dvh]
        bg-slate-100
        flex items-stretch justify-center
        p-3 sm:p-4 md:p-6
      "
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="
          relative w-full
          max-w-[1200px]
          grid grid-cols-1 lg:grid-cols-2
          rounded-2xl overflow-hidden shadow-2xl bg-white
        "
      >
        {/* Logo (se adapta de xs a lg) */}
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10">
          <img
            src="/login/LOGO_RIDS_WEB1.png"
            alt="Logo RIDS"
            className="h-8 sm:h-10 md:h-12 w-auto object-contain"
          />
        </div>

        {/* Panel izquierdo (oculto en móviles, visible >= lg) */}
        <div className="relative hidden lg:flex flex-col justify-center items-center">
          {/* Imagen full cover */}
          <img
            src="/login/Soporte.jpg"
            alt="Soporte RIDS"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Capa de color */}
          <div className="absolute inset-0 bg-cyan-700/40 backdrop-blur-[1.5px]" />
          <div className="relative z-10 p-8 xl:p-10 text-white max-w-lg">
            <div className="bg-cyan-500/30 backdrop-blur-md px-5 py-4 md:px-6 md:py-5 rounded-xl shadow-lg">
              <h2 className="text-2xl md:text-3xl xl:text-4xl font-bold leading-tight">
                SOPORTE Y SOLUCIONES
                <br /> COMPUTACIONALES
              </h2>
            </div>
            <div className="mt-4 bg-white/30 backdrop-blur-md text-slate-800 inline-block px-4 py-2 md:px-5 md:py-2.5 rounded-md shadow">
              <p className="text-xs md:text-sm font-semibold">
                Servicios de calidad a un precio justo.
              </p>
            </div>
          </div>
        </div>

        {/* Panel derecho: formulario (100% alto en móviles) */}
        <div
          className="
            bg-white/95 backdrop-blur-sm
            px-4 py-6
            sm:px-8 sm:py-10
            md:px-10 md:py-12
            flex items-center
          "
        >
          <div className="w-full max-w-md mx-auto">
            <div className="mb-6 sm:mb-7">
              <p className="text-[10px] sm:text-xs font-semibold tracking-widest text-cyan-700">
                ACCESO DE SISTEMA
              </p>
              <div className="mt-2 h-0.5 w-24 sm:w-28 bg-cyan-500" />
            </div>

            <form onSubmit={onSubmit} className="space-y-5 sm:space-y-6">
              <div>
                <label
                  htmlFor="usuario"
                  className="block text-sm sm:text-base font-medium text-slate-700"
                >
                  Usuario
                </label>
                <input
                  id="usuario"
                  name="usuario"
                  type="text"
                  value={form.usuario}
                  onChange={onChange}
                  className="
                    mt-2 w-full rounded-xl border border-slate-300
                    px-3.5 py-2.5 sm:px-4 sm:py-3
                    text-sm sm:text-base
                    outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100
                  "
                  placeholder="tu.usuario@correo.com"
                  autoComplete="username"
                  inputMode="email"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm sm:text-base font-medium text-slate-700"
                >
                  Contraseña
                </label>
                <div className="mt-2 relative">
                  <input
                    id="password"
                    name="password"
                    type={showPwd ? "text" : "password"}
                    value={form.password}
                    onChange={onChange}
                    className="
                      w-full rounded-xl border border-slate-300
                      px-3.5 py-2.5 pr-10 sm:px-4 sm:py-3 sm:pr-12
                      text-sm sm:text-base
                      outline-none focus:border-cyan-600 focus:ring-4 focus:ring-cyan-100
                    "
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="
                      absolute right-1.5 sm:right-2
                      top-1/2 -translate-y-1/2
                      p-2 rounded-md text-slate-500 hover:bg-slate-100
                    "
                    aria-label={showPwd ? "ocultar contraseña" : "mostrar contraseña"}
                    title={showPwd ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div
                className="
                  flex flex-col-reverse gap-3
                  xs:flex-row xs:items-center xs:justify-between
                "
              >
                <a
                  href="#/forgot"
                  className="
                    inline-flex justify-center items-center gap-2
                    text-xs sm:text-sm text-cyan-700 hover:text-cyan-900
                  "
                >
                  <HelpCircle className="w-4 h-4" />
                  Olvidé la Contraseña
                </a>

                <button
                  type="submit"
                  disabled={loading}
                  className="
                    inline-flex w-full xs:w-auto
                    justify-center items-center gap-2
                    rounded-xl bg-cyan-600 px-4 sm:px-5 py-2.5 sm:py-3
                    text-white font-semibold
                    shadow hover:bg-cyan-700
                    focus:outline-none focus:ring-4 focus:ring-cyan-200
                    disabled:opacity-60
                  "
                >
                  {loading ? (
                    <span className="animate-pulse">Ingresando…</span>
                  ) : (
                    <>
                      <span>Ingresar</span>
                      <LogIn className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-8 sm:mt-10 h-0.5 w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
            <div className="mt-4 sm:mt-6 text-center text-[10px] sm:text-xs text-slate-500">
              © {new Date().getFullYear()} RIDS — Soporte y Soluciones Computacionales
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginRids;
