import React from "react";
import { useState } from "react";
import {
  LogOut,
  Home,
  CalendarDays,
  Ticket,
  Users,
  Building2,
  Laptop,
  BarChart3,
  Factory,
  Menu,
  X,
  FileText,
  Briefcase, // <-- nuevo icono para Documentos
  Package,
  User,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";

/* ================== CONFIGURACIÓN DE RUTAS Y API ================== */

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

const HOME_PATH = "/home";
const VISITAS_PATH = "/visitas";
const SOLICITANTES_PATH = "/solicitantes";
const EQUIPOS_PATH = "/equipos";
const ORDENESTALLER = "/OrdenesTaller";
const COTIZACIONES = "/Cotizaciones";

const EMPRESAS_PATH = "/empresas";
const REPORTES_PATH = "/reportes";
const TICKETS_PATH = "/tickets";
const DOCUMENTOS_PATH = "/documentos"; // <-- nueva ruta
const HELPDESK_PATH = "/helpdesk";

/* ================== TIPOS DE NAVEGACIÓN ================== */

type NavItem = {
  label: string;
  to: string;
  icon: React.ReactNode;
};

type NavLink = NavItem & {
  type: "link";
  match: string[];
};

type NavGroup = {
  type: "group";
  label: string;
  items: NavItem[];
  match: string[];
};

type NavEntry = NavLink | NavGroup;

/* ================== DATA DE NAVEGACIÓN (grupos) ================== */

const NAV: NavEntry[] = [
  { type: "link", label: "Inicio", to: HOME_PATH, icon: <Home size={20} />, match: [HOME_PATH] },
  {
    type: "group",
    label: "Operación",
    items: [
      { label: "Solicitantes", to: SOLICITANTES_PATH, icon: <Users size={20} /> },
      { label: "Visitas", to: VISITAS_PATH, icon: <CalendarDays size={20} /> },
      { label: "Equipos", to: EQUIPOS_PATH, icon: <Laptop size={20} /> },
    ],
    match: [SOLICITANTES_PATH, VISITAS_PATH, EQUIPOS_PATH, ORDENESTALLER, COTIZACIONES],
  },
  {
    type: "group",
    label: "Gestión",
    items: [
      { label: "Órdenes de Taller", to: ORDENESTALLER, icon: <Factory size={20} /> },
      { label: "Cotizaciones", to: COTIZACIONES, icon: <Briefcase size={20} /> },
      { label: "Clientes", to: "/clientes", icon: <Users size={20} /> },
      { label: "Productos", to: "/productos", icon: <Package size={20} /> },
    ],
    match: [ORDENESTALLER, COTIZACIONES],
  },
  {
    type: "group",
    label: "Informes",
    items: [
      { label: "Empresas", to: EMPRESAS_PATH, icon: <Building2 size={20} /> },
      { label: "Reportes", to: REPORTES_PATH, icon: <BarChart3 size={20} /> },
    ],
    match: [EMPRESAS_PATH, REPORTES_PATH],
  },
  { type: "link", label: "Tickets", to: TICKETS_PATH, icon: <Ticket size={20} />, match: [TICKETS_PATH] },
  { type: "link", label: "Helpdesk", to: HELPDESK_PATH, icon: <FileText size={20} />, match: [HELPDESK_PATH] },
];

/* ================== HELPERS DE NAVEGACIÓN ================== */

function hintFor(path: string): string {
  switch (path) {
    case SOLICITANTES_PATH: return "Registros de personas";
    case VISITAS_PATH: return "Agenda y visitas";
    case EQUIPOS_PATH: return "Inventario de equipos";
    case EMPRESAS_PATH: return "Catálogo de empresas";
    case REPORTES_PATH: return "KPIs y reportes";
    case TICKETS_PATH: return "Mesa de ayuda";
    case ORDENESTALLER: return "Administración de taller";
    case COTIZACIONES: return "Generar cotizaciones";
    case HELPDESK_PATH: return "Mesa de ayuda y tickets";

    default: return "Abrir sección";
  }
}

/* ================== COMPONENTES (MOBILE) ================== */

const MobileLink: React.FC<
  React.PropsWithChildren<{ to: string; icon: React.ReactNode; onClick?: () => void }>
> = ({ to, icon, children, onClick }) => {
  const { pathname } = useLocation();
  const isActive = pathname.startsWith(to);
  const baseClasses = "flex items-center gap-3 rounded-xl px-3 py-3 transition";
  const activeClasses = isActive ? "bg-cyan-50" : "hover:bg-slate-50";

  return (
    <Link to={to} onClick={onClick} className={`${baseClasses} ${activeClasses}`}>
      <span
        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ring-1
          ${isActive ? "bg-cyan-100 text-cyan-800 ring-cyan-200" : "bg-cyan-50 text-cyan-700 ring-cyan-100"}`}
      >
        {icon}
      </span>
      <span className="text-base font-medium text-slate-900">{children}</span>
    </Link>
  );
};

const MobileGroup: React.FC<{ title: string; items: NavItem[]; onClickItem?: () => void; }> =
  ({ title, items, onClickItem }) => (
    <div className="my-1">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="grid grid-cols-1">
        {items.map((it) => (
          <MobileLink key={it.label} to={it.to} icon={it.icon} onClick={onClickItem}>
            {it.label}
          </MobileLink>
        ))}
      </div>
    </div>
  );

/* ================== HEADER ================== */

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  React.useEffect(() => {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
  }, [collapsed]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user"); // 👈 AQUÍ VA
      navigate("/login", { replace: true });
    }
  };

  // Usuario mock - puedes obtenerlo de un contexto o store
  const user = JSON.parse(localStorage.getItem("user") || "null");

  return (
    <>
      <aside
        className={`
    h-screen shrink-0 flex flex-col
    bg-slate-50 border-r border-slate-200 shadow-md
    transition-all duration-300 ease-in-out
    ${collapsed ? "w-20" : "w-64"}
  `}
      >
        {/* LOGO + TOGGLE */}
        <div className="h-20 flex items-center justify-between px-4 border-b border-slate-200">
          <Link to={HOME_PATH} className={collapsed ? "mx-auto" : ""}>
            <img
              src="/login/LOGO_RIDS.png"
              alt="RIDS.CL"
              className={`
                h-10 object-contain transition-all
                ${collapsed ? "w-10 h-10" : ""}
              `}
            />
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* NAVEGACIÓN */}
        <nav className="flex-1 overflow-y-auto px-2 py-6 space-y-4 scrollbar-thin scrollbar-thumb-slate-300 hover:scrollbar-thumb-slate-400">
          {NAV.map((entry) =>
            entry.type === "link" ? (
              <Link
                key={entry.label}
                to={entry.to}
                className={`
                  relative flex items-center gap-4 px-3 py-2.5 rounded-xl
                  transition-all duration-200 group
                  ${pathname.startsWith(entry.to)
                    ? "bg-cyan-50 text-cyan-700 font-medium before:absolute before:inset-y-2 before:-left-2 before:w-1 before:bg-cyan-500 before:rounded-r"
                    : "text-slate-700 hover:bg-slate-100"
                  }
                  ${collapsed ? "justify-center" : ""}
                `}
                title={collapsed ? entry.label : undefined}
              >
                <span className="shrink-0">{entry.icon}</span>
                {!collapsed && <span>{entry.label}</span>}
                {collapsed && (
                  <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                    {entry.label}
                  </span>
                )}
              </Link>
            ) : (
              <div key={entry.label} className="space-y-1">
                {!collapsed && (
                  <div className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {entry.label}
                  </div>
                )}
                {entry.items.map((it) => (
                  <Link
                    key={it.label}
                    to={it.to}
                    className={`
                      relative flex items-center gap-4 px-3 py-2.5 rounded-lg
                      transition-all duration-200 group
                      ${pathname.startsWith(it.to)
                        ? "bg-cyan-50 text-cyan-700 font-medium before:absolute before:inset-y-2 before:-left-2 before:w-1 before:bg-cyan-500 before:rounded-r"
                        : "text-slate-600 hover:bg-slate-100"
                      }
                      ${collapsed ? "justify-center" : "pl-6"}
                    `}
                    title={collapsed ? it.label : undefined}
                  >
                    <span className="shrink-0">{it.icon}</span>
                    {!collapsed && <span>{it.label}</span>}
                    {collapsed && (
                      <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                        {it.label}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )
          )}
        </nav>

        {/* FOOTER: PERFIL + LOGOUT */}
        <div className="border-t p-4 space-y-3">
          {!collapsed ? (
            <>
              <div className="flex items-center gap-3 px-2">
                <div className="w-9 h-9 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700">
                  <User size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">
                    {user?.nombre ?? "Usuario"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {user?.email ?? ""}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition text-sm font-medium"
              >
                <LogOut size={18} />
                <span>Salir</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center space-y-3">
              <div className="w-9 h-9 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700">
                <User size={20} />
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                title="Cerrar sesión"
              >
                <LogOut size={20} />
              </button>
            </div>
          )}
        </div>
      </aside>

    </>
  );
};

export default Header;