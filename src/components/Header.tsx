import React from "react";
import {
  LogOut,
  Globe,
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
  FileText, // <-- nuevo icono para Documentos
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
const EMPRESAS_PATH = "/empresas";
const REPORTES_PATH = "/reportes";
const TICKETS_PATH = "/tickets";
const DOCUMENTOS_PATH = "/documentos"; // <-- nueva ruta

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
    match: [SOLICITANTES_PATH, VISITAS_PATH, EQUIPOS_PATH],
  },
  {
    type: "group",
    label: "Gestión",
    items: [
      { label: "Empresas", to: EMPRESAS_PATH, icon: <Building2 size={20} /> },
      { label: "Reportes", to: REPORTES_PATH, icon: <BarChart3 size={20} /> },
    ],
    match: [EMPRESAS_PATH, REPORTES_PATH],
  },
  { type: "link", label: "Tickets", to: TICKETS_PATH, icon: <Ticket size={20} />, match: [TICKETS_PATH] },
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

  const [openIdx, setOpenIdx] = React.useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);

  const isActive = (paths: string[]) => paths.some((p) => pathname.startsWith(p));

  const baseBtn =
    "px-4 py-2 rounded-xl text-base font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition whitespace-nowrap";
  const activeBtn = "text-cyan-700 ring-1 ring-cyan-200 bg-cyan-50 hover:bg-cyan-50";

  React.useEffect(() => {
    const onClick = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpenIdx(null); };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpenIdx(null); setMobileOpen(false); } };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onClick); document.removeEventListener("keydown", onEsc); };
  }, []);

  React.useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleLogout = async () => {
    try { await api.post("/auth/logout"); } catch { /* ignore */ }
    finally { localStorage.removeItem("accessToken"); navigate("/login", { replace: true }); }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div ref={wrapRef} className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Fila principal */}
        <div className="flex h-20 items-center justify-between gap-3 md:gap-6">
          {/* Marca */}
          <Link to={HOME_PATH} className="flex items-center gap-3 group" aria-label="RIDS.CL - Inicio">
            <img src="/login/LOGO_RIDS.png" alt="RIDS.CL" className="h-12 w-auto object-contain transition group-hover:scale-[1.03]" />
          </Link>

          {/* Botón Mobile */}
          <button
            className="md:hidden inline-flex items-center justify-center rounded-xl p-3 hover:bg-slate-100 text-slate-700 hover:text-slate-900"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {mobileOpen ? <X size={26} /> : <Menu size={26} />}
          </button>

          {/* Nav (Desktop) */}
          <nav className="relative hidden md:flex items-center gap-2">
            {NAV.map((entry, idx) =>
              entry.type === "link" ? (
                <Link key={entry.label} to={entry.to} className={`${baseBtn} ${isActive(entry.match) ? activeBtn : ""}`}>
                  {entry.label}
                </Link>
              ) : (
                <div key={entry.label} className="relative">
                  <button
                    onClick={() => setOpenIdx((o) => (o === idx ? null : idx))}
                    onMouseEnter={() => setOpenIdx(idx)}
                    className={`${baseBtn} ${(isActive(entry.match) || openIdx === idx) ? activeBtn : ""}`}
                    aria-haspopup="true"
                    aria-expanded={openIdx === idx}
                  >
                    {entry.label}
                  </button>

                  {/* Panel Dropdown */}
                  <div
                    onMouseLeave={() => setOpenIdx(null)}
                    className={`absolute left-1/2 -translate-x-1/2 mt-3 w-[640px]
                      rounded-2xl border border-slate-200 bg-white shadow-2xl ring-1 ring-black/5
                      transition-all duration-200 origin-top
                      ${openIdx === idx ? "opacity-100 scale-100 translate-y-0 pointer-events-auto" : "opacity-0 scale-[0.98] -translate-y-1 pointer-events-none"}`}
                  >
                    <div className="grid grid-cols-3 gap-3 p-4">
                      {entry.items.map((it) => (
                        <Link
                          key={it.label}
                          to={it.to}
                          className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50 transition"
                          onClick={() => setOpenIdx(null)}
                        >
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100 group-hover:bg-cyan-100 group-hover:text-cyan-800 transition" aria-hidden>
                            {it.icon}
                          </span>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-sm font-semibold text-slate-900">{it.label}</span>
                            <span className="truncate text-xs text-slate-500">{hintFor(it.to)}</span>
                          </div>
                        </Link>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
                      <Factory size={16} />
                      <span>Plataforma operativa — RIDS.CL</span>
                    </div>
                  </div>
                </div>
              )
            )}
          </nav>

          {/* Acciones (derecha - Desktop) */}
          <div className="hidden md:flex items-center gap-5 text-slate-700">
            {/* Botón Documentos (antes era Ayuda) */}
            <Link
              to={DOCUMENTOS_PATH}
              className="p-2 hover:text-slate-900 transition rounded-xl hover:bg-slate-100"
              aria-label="Documentos"
              title="Documentos"
            >
              <FileText className="h-6 w-6" />
            </Link>

            {/* Idioma (placeholder) */}
            <button className="p-2 hover:text-slate-900 transition rounded-xl hover:bg-slate-100" aria-label="Idioma" title="Idioma">
              <Globe className="h-6 w-6" />
            </button>

            {/* Salir */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-base font-semibold text-red-600 hover:text-red-700 transition"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut className="h-6 w-6" />
              <span>Salir</span>
            </button>
          </div>
        </div>

        {/* Mobile panel */}
        <div className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-300 ${mobileOpen ? "max-h-[560px] opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xl mb-4">
            <div className="p-3">
              {NAV.map((entry) =>
                entry.type === "link" ? (
                  <MobileLink key={entry.label} to={entry.to} icon={entry.icon} onClick={() => setMobileOpen(false)}>
                    {entry.label}
                  </MobileLink>
                ) : (
                  <MobileGroup key={entry.label} title={entry.label} items={entry.items} onClickItem={() => setMobileOpen(false)} />
                )
              )}
              {/* Acceso directo a Documentos en mobile */}
              <MobileLink to={DOCUMENTOS_PATH} icon={<FileText size={20} />} onClick={() => setMobileOpen(false)}>
                Documentos
              </MobileLink>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
              <Link
                to={DOCUMENTOS_PATH}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 text-slate-600 hover:text-slate-800 transition"
              >
                <FileText size={20} className="opacity-80" />
                <span className="text-sm">Documentos</span>
              </Link>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 hover:text-red-700"
              >
                <LogOut size={20} /> Salir
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
