// src/components/Header.tsx
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { pca } from "../auth/microsoftConfig";
import {
  LogOut,
  Home,
  CalendarDays,
  Ticket,
  Users,
  Building2,
  Laptop,
  BarChart3,
  Package,
  User,
  ChevronLeft,
  ChevronRight,
  CalendarRange,
  UserCog,
  MonitorCog,
  ClipboardList,
  ReceiptText,
  Headset,
  FileSpreadsheet,
} from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

const HOME_PATH = "/home";
const CALENDARIO_PATH = "/agenda";
const TECNICOS_PATH = "/tecnicos";
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
const COBRANZA_PATH = "/cobranza";

type NavItem = {
  label: string;
  to: string;
  icon: ReactNode;
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

// Usuarios con acceso exclusivo al módulo de Cobranza
const COBRANZA_EMAILS = ["carenas@rids.cl","dbravo@rids.cl", "igonzalez@rids.cl"];

const NAV: NavEntry[] = [
  {
    type: "link",
    label: "Inicio",
    to: HOME_PATH,
    icon: <Home size={20} />,
    match: [HOME_PATH],
  },
  {
    type: "group",
    label: "Técnicos y Visitas",
    items: [
      { label: "Técnicos", to: TECNICOS_PATH, icon: <UserCog size={20} /> },
      { label: "Calendario visitas", to: CALENDARIO_PATH, icon: <CalendarRange size={20} /> },
      { label: "Visitas", to: VISITAS_PATH, icon: <CalendarDays size={20} /> },
    ],
    match: [TECNICOS_PATH, CALENDARIO_PATH, VISITAS_PATH],
  },
  {
    type: "group",
    label: "RIDS",
    items: [
      { label: "Solicitantes", to: SOLICITANTES_PATH, icon: <Users size={20} /> },
      { label: "Equipos", to: EQUIPOS_PATH, icon: <Laptop size={20} /> },
      { label: "Órdenes de Taller", to: ORDENESTALLER, icon: <ClipboardList size={20} /> },
      { label: "Mantenciones remotas", to: MANTENCIONES_REMOTAS_PATH, icon: <MonitorCog size={20} /> },
      { label: "Empresas", to: EMPRESAS_PATH, icon: <Building2 size={20} /> },
      { label: "Tickets", to: HELPDESK_PATH, icon: <Headset size={20} /> },
    ],
    match: [SOLICITANTES_PATH, VISITAS_PATH, EQUIPOS_PATH, MANTENCIONES_REMOTAS_PATH, EMPRESAS_PATH, HELPDESK_PATH],
  },
  {
    type: "group",
    label: "ECONNET",
    items: [
      { label: "Cotizaciones", to: COTIZACIONES, icon: <ReceiptText size={20} /> },
      { label: "Clientes", to: "/clientes", icon: <Users size={20} /> },
      { label: "Productos", to: "/productos", icon: <Package size={20} /> },
      // Facturas SII removido de aquí — ahora solo en Cobranza (acceso restringido)
    ],
    match: [ORDENESTALLER, COTIZACIONES, "/clientes", "/productos", "/tecnicos"],
  },
  {
    type: "group",
    label: "Informes",
    items: [{ label: "Reportes", to: REPORTES_PATH, icon: <BarChart3 size={20} /> }],
    match: [REPORTES_PATH],
  },
  {
    type: "group",
    label: "Freshdesk",
    items: [
      { label: "Tickets (Histórico)", to: TICKETS_PATH, icon: <Ticket size={20} /> },
    ],
    match: [TICKETS_PATH],
  },
  {
    type: "group",
    label: "Cobranza",
    items: [
      { label: "Facturas SII", to: COBRANZA_PATH, icon: <FileSpreadsheet size={20} /> },
    ],
    match: [COBRANZA_PATH],
  },
];

function isActivePath(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
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

const Header = () => {
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (isMobile) setMobileOpen(false);
  }, [pathname, isMobile]);

  useEffect(() => {
    if (isMobile) {
      document.body.classList.remove("sidebar-collapsed");
      return;
    }
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    return () => document.body.classList.remove("sidebar-collapsed");
  }, [collapsed, isMobile]);

  useEffect(() => {
    if (!isMobile) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, mobileOpen]);

  const user = useMemo(() => safeParseUser(), []);
  const isCliente = user?.rol === "CLIENTE";
  const canAccessCobranza = COBRANZA_EMAILS.includes(user?.email ?? "");

  const filteredNav: NavEntry[] = useMemo(() => {
    // Filtrar Cobranza según email permitido
    const nav = NAV.filter((entry) => {
      if (entry.type === "group" && entry.label === "Cobranza") {
        return canAccessCobranza;
      }
      return true;
    });

    if (!isCliente) return nav;

    // CLIENTE solo ve su grupo reducido
    return [
      {
        type: "group" as const,
        label: "Mi Empresa",
        match: [EMPRESAS_PATH, EQUIPOS_PATH, VISITAS_PATH, SOLICITANTES_PATH, REPORTES_PATH],
        items: [
          { label: "Mi Empresa", to: EMPRESAS_PATH, icon: <Building2 size={20} /> },
          { label: "Mis Equipos", to: EQUIPOS_PATH, icon: <Laptop size={20} /> },
          { label: "Visitas", to: VISITAS_PATH, icon: <CalendarDays size={20} /> },
          { label: "Listado de Usuarios", to: SOLICITANTES_PATH, icon: <Users size={20} /> },
          { label: "Mantenciones remotas", to: MANTENCIONES_REMOTAS_PATH, icon: <MonitorCog size={20} /> },
          { label: "Informes Mensuales", to: REPORTES_PATH, icon: <BarChart3 size={20} /> },
        ],
      },
    ];
  }, [isCliente, canAccessCobranza]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignorar errores de red
    }

    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    sessionStorage.clear();

    await pca.logoutRedirect({
      account: pca.getActiveAccount() ?? undefined,
      postLogoutRedirectUri: `${window.location.origin}/login`,
    });
  };

  const sidebarCollapsed = !isMobile && collapsed;

  return (
    <>
      {isMobile && !mobileOpen && (
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed left-3 top-3 z-50 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-md"
          aria-label="Abrir menú"
          type="button"
        >
          <ChevronRight size={20} />
        </button>
      )}

      {isMobile && mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-slate-900/40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`
          ${isMobile ? "fixed inset-y-0 left-0 z-50" : "relative shrink-0"}
          flex h-screen flex-col
          border-r border-slate-200 bg-slate-50 shadow-md
          transition-all duration-300 ease-in-out will-change-transform
          ${isMobile
            ? `w-[280px] ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`
            : sidebarCollapsed
              ? "w-20"
              : "w-64"
          }
        `}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 sm:h-20">
          <Link to={isCliente ? "/empresas" : HOME_PATH} className={sidebarCollapsed ? "mx-auto" : ""}>
            <img
              src="/login/LOGO_RIDS.png"
              alt="RIDS.CL"
              className={`h-10 object-contain transition-all ${sidebarCollapsed ? "w-10 h-10" : ""}`}
            />
          </Link>

          {!isMobile ? (
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
              aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
              title={collapsed ? "Expandir" : "Colapsar"}
              type="button"
            >
              {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          ) : (
            <button
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100"
              aria-label="Cerrar menú"
              title="Cerrar"
              type="button"
            >
              <ChevronLeft size={20} />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4 sm:py-6 space-y-4 scrollbar-thin scrollbar-thumb-slate-300 hover:scrollbar-thumb-slate-400">
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
                  ${sidebarCollapsed ? "justify-center" : ""}
                `}
                title={sidebarCollapsed ? entry.label : undefined}
              >
                <span className="shrink-0">{entry.icon}</span>
                {!sidebarCollapsed && <span>{entry.label}</span>}
                {sidebarCollapsed && (
                  <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                    {entry.label}
                  </span>
                )}
              </Link>
            ) : (
              <div key={entry.label} className="space-y-1">
                {!sidebarCollapsed && (
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
                      ${sidebarCollapsed ? "justify-center" : "pl-6"}
                    `}
                    title={sidebarCollapsed ? it.label : undefined}
                  >
                    <span className="shrink-0">{it.icon}</span>
                    {!sidebarCollapsed && <span>{it.label}</span>}
                    {sidebarCollapsed && (
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

        <div className="border-t p-4 space-y-3">
          {!sidebarCollapsed ? (
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
                type="button"
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
                type="button"
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