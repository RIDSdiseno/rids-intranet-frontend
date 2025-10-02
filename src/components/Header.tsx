import React from "react";
import { LogOut, HelpCircle, Globe, Home, CalendarDays } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

// Rutas consistentes con App.tsx (minúsculas)
const HOME_PATH = "/home";
const VISITAS_PATH = "/visitas";
const SOLICITANTES_PATH = "/solicitantes";
const EQUIPOS_PATH = "/equipos";
const EMPRESAS_PATH = "/empresas"; // ajusta si tu app usa otra

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isActive = (path: string) => pathname.startsWith(path);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // no-op
    } finally {
      localStorage.removeItem("accessToken");
      navigate("/login", { replace: true });
    }
  };

  const goHome = () => navigate(HOME_PATH);
  const goToSolicitantes = () => navigate(SOLICITANTES_PATH);
  const goToVisitas = () => navigate(VISITAS_PATH);
  const goToEmpresas = () => navigate(EMPRESAS_PATH);
  const goToEquipos = () => navigate(EQUIPOS_PATH);

  const baseBtn =
    "hover:text-cyan-900 transition underline-offset-4";
  const activeBtn =
    "text-cyan-900 underline decoration-2";

  return (
    <header className="w-full border-b border-neutral-200 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo a la izquierda (click = Home) */}
        <button
          onClick={goHome}
          className="flex items-center hover:opacity-90 transition"
          aria-label="Ir a inicio"
          title="Inicio"
        >
          <img
            src="/login/LOGO_RIDS_WEB1.png"
            alt="RIDS Logo"
            className="h-8 w-auto object-contain"
          />
        </button>

        {/* Menú centrado (desktop) */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-cyan-800">
          <button
            onClick={goHome}
            className={`${baseBtn} ${isActive(HOME_PATH) ? activeBtn : ""}`}
          >
            Inicio
          </button>

          <button
            onClick={goToSolicitantes}
            className={`${baseBtn} ${isActive(SOLICITANTES_PATH) ? activeBtn : ""}`}
          >
            Solicitantes
          </button>

          <button
            onClick={goToVisitas}
            className={`${baseBtn} ${isActive(VISITAS_PATH) ? activeBtn : ""}`}
          >
            Visitas
          </button>

          <button
            onClick={goToEmpresas}
            className={`${baseBtn} ${isActive(EMPRESAS_PATH) ? activeBtn : ""}`}
          >
            Empresas
          </button>

          <button
            onClick={goToEquipos}
            className={`${baseBtn} ${isActive(EQUIPOS_PATH) ? activeBtn : ""}`}
          >
            Equipos
          </button>

          <button className={baseBtn}>Reportes</button>
        </nav>

        {/* Iconos / Logout a la derecha */}
        <div className="flex items-center gap-5 text-cyan-800">
          {/* Home (mobile) */}
          <button
            onClick={goHome}
            className="md:hidden hover:text-cyan-900 transition"
            aria-label="Inicio"
            title="Inicio"
          >
            <Home className="h-5 w-5" />
          </button>

          {/* Visitas (mobile) */}
          <button
            onClick={goToVisitas}
            className="md:hidden hover:text-cyan-900 transition"
            aria-label="Visitas"
            title="Visitas"
          >
            <CalendarDays className="h-5 w-5" />
          </button>

          <button
            className="hover:text-cyan-900 transition"
            aria-label="Ayuda"
            title="Ayuda"
          >
            <HelpCircle className="h-5 w-5" />
          </button>

          <button
            className="hover:text-cyan-900 transition"
            aria-label="Idioma"
            title="Idioma"
          >
            <Globe className="h-5 w-5" />
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 transition"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogOut className="h-5 w-5" />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
