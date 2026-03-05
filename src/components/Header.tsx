import React, { useMemo, useState } from "react";
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
  FileText,
  Briefcase,
  Package,
  User,
  ChevronLeft,
  ChevronRight,
  Wrench // 👈 ESTE
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
const MANTENCIONES_REMOTAS_PATH = "/mantenciones-remotas";
const SOLICITANTES_PATH = "/solicitantes";
const EQUIPOS_PATH = "/equipos";
const ORDENESTALLER = "/OrdenesTaller";
const COTIZACIONES = "/Cotizaciones";

const EMPRESAS_PATH = "/empresas";
const REPORTES_PATH = "/reportes";
const TICKETS_PATH = "/tickets";
const HELPDESK_PATH = "/helpdesk";

/* ================== TIPOS ================== */

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

type StoredUser = {
  nombre?: string;
  email?: string;
  rol?: string;
};

/* ================== DATA NAVEGACIÓN ================== */

const NAV: NavEntry[] = [
  { type: "link", label: "Inicio", to: HOME_PATH, icon: <Home size={20} />, match: [HOME_PATH] },
  {
    type: "group",
    label: "Operación",
    items: [
      { label: "Solicitantes", to: SOLICITANTES_PATH, icon: <Users size={20} /> },
      { label: "Visitas", to: VISITAS_PATH, icon: <CalendarDays size={20} /> },
      { label: "Equipos", to: EQUIPOS_PATH, icon: <Laptop size={20} /> },
      { label: "Mantenciones remotas", to: MANTENCIONES_REMOTAS_PATH, icon: <Wrench size={20} /> },
      { label: "Empresas", to: EMPRESAS_PATH, icon: <Building2 size={20} /> },
    ],
    match: [SOLICITANTES_PATH, VISITAS_PATH, EQUIPOS_PATH, MANTENCIONES_REMOTAS_PATH],
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
    match: [ORDENESTALLER, COTIZACIONES, "/clientes", "/productos"],
  },
  {
    type: "group",
    label: "Informes",
    items: [
      { label: "Reportes", to: REPORTES_PATH, icon: <BarChart3 size={20} /> },
    ],
    match: [EMPRESAS_PATH, REPORTES_PATH],
  },
  {
    type: "group",
    label: "Ticketera",
    items: [
      {
        label: "Tickets",
        to: TICKETS_PATH,
        icon: <Ticket size={18} />,
      },
      {
        label: "Helpdesk",
        to: HELPDESK_PATH,
        icon: <FileText size={18} />,
      },
    ],
    match: [TICKETS_PATH, HELPDESK_PATH]
  }
];

/* ================== HELPERS ================== */

function isActivePath(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`) || pathname.startsWith(to);
}

function safeParseUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

function nonNull<T>(v: T | null): v is T {
  return v !== null;
}

/* ================== COMPONENTE ================== */

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  React.useEffect(() => {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    return () => document.body.classList.remove("sidebar-collapsed");
  }, [collapsed]);

  const user = useMemo(() => safeParseUser(), []);
  const isCliente = user?.rol === "CLIENTE";

  const filteredNav: NavEntry[] = useMemo(() => {
    const next = NAV.map((entry): NavEntry | null => {
      if (!isCliente) return entry; // ADMIN ve todo

      // CLIENTE
      if (entry.type === "link") {
        // Solo Inicio + links sueltos (si quieres permitir otros, agrégalos aquí)
        if (entry.to === HOME_PATH) return entry;
        return null;
      }

      // Groups
      if (entry.label === "Operación") {
        return entry; // completo
      }

      if (entry.label === "Informes") {
        const onlyEmpresas = entry.items.filter((it) => it.to === EMPRESAS_PATH);
        if (onlyEmpresas.length === 0) return null;
        return { ...entry, items: onlyEmpresas, match: [EMPRESAS_PATH] };
      }

      // Oculta Gestión
      return null;
    }).filter(nonNull);

    return next;
  }, [isCliente]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      navigate("/login", { replace: true });
    }
  };

  return (
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
            className={`h-10 object-contain transition-all ${collapsed ? "w-10 h-10" : ""}`}
          />
        </Link>

        <button
          onClick={() => setCollapsed((v) => !v)}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"
          aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
          title={collapsed ? "Expandir" : "Colapsar"}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* NAVEGACIÓN */}
      <nav className="flex-1 overflow-y-auto px-2 py-6 space-y-4 scrollbar-thin scrollbar-thumb-slate-300 hover:scrollbar-thumb-slate-400">
        {filteredNav.map((entry) =>
          entry.type === "link" ? (
            <Link
              key={entry.label}
              to={entry.to}
              className={`
                relative flex items-center gap-4 px-3 py-2.5 rounded-xl
                transition-all duration-200 group
                ${isActivePath(pathname, entry.to)
                  ? "bg-cyan-50 text-cyan-700 font-medium before:absolute before:inset-y-2 before:-left-2 before:w-1 before:bg-cyan-500 before:rounded-r"
                  : "text-slate-700 hover:bg-slate-100"
                }
                ${collapsed ? "justify-center" : ""}
              `}
              title={collapsed ? entry.label : undefined}
            >
              <span className="shrink-0">{entry.icon}</span>
              {!collapsed && <span>{entry.label}</span>}

              {/* tooltip colapsado */}
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
                    ${isActivePath(pathname, it.to)
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
                <p className="text-xs text-slate-500 truncate">{user?.email ?? ""}</p>
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
              aria-label="Cerrar sesión"
            >
              <LogOut size={20} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Header;