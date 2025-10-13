import React from "react";
import {
  LogOut,
  HelpCircle,
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
} from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";

/* ================== API ================== */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
});

/* ================== RUTAS ================== */
const HOME_PATH = "/home";
const VISITAS_PATH = "/visitas";
const SOLICITANTES_PATH = "/solicitantes";
const EQUIPOS_PATH = "/equipos";
const EMPRESAS_PATH = "/empresas";
const REPORTES_PATH = "/reportes";
const TICKETS_PATH = "/tickets";

/* ================== DATA (grupos) ================== */
const NAV = [
  // Inicio (solo link)
  {
    type: "link" as const,
    label: "Inicio",
    to: HOME_PATH,
    icon: <Home size={18} />,
    match: [HOME_PATH],
  },
  // Operación
  {
    type: "group" as const,
    label: "Operación",
    items: [
      { label: "Solicitantes", to: SOLICITANTES_PATH, icon: <Users size={18} /> },
      { label: "Visitas", to: VISITAS_PATH, icon: <CalendarDays size={18} /> },
      { label: "Equipos", to: EQUIPOS_PATH, icon: <Laptop size={18} /> },
    ],
    match: [SOLICITANTES_PATH, VISITAS_PATH, EQUIPOS_PATH],
  },
  // Gestión
  {
    type: "group" as const,
    label: "Gestión",
    items: [
      { label: "Empresas", to: EMPRESAS_PATH, icon: <Building2 size={18} /> },
      { label: "Reportes", to: REPORTES_PATH, icon: <BarChart3 size={18} /> },
    ],
    match: [EMPRESAS_PATH, REPORTES_PATH],
  },
  // Tickets (solo link)
  {
    type: "link" as const,
    label: "Tickets",
    to: TICKETS_PATH,
    icon: <Ticket size={18} />,
    match: [TICKETS_PATH],
  },
];

/* ================== HEADER ================== */
const Header: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [openIdx, setOpenIdx] = React.useState<number | null>(null);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);

  const isActive = (paths: string[]) => paths.some((p) => pathname.startsWith(p));

  // Cerrar al hacer click fuera
  React.useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) {
        setOpenIdx(null);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenIdx(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

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

  const baseBtn =
    "px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition";
  const activeBtn =
    "text-cyan-700 ring-1 ring-cyan-200 bg-cyan-50 hover:bg-cyan-50";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div ref={wrapRef} className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Row */}
        <div className="flex h-14 items-center justify-between gap-3">
          {/* Marca */}
          <Link
            to={HOME_PATH}
            className="flex items-center gap-2 group"
            aria-label="RIDS.CL - Inicio"
          >
            <img
              src="/login/LOGO_RIDS_WEB1.png"
              alt="RIDS.CL"
              className="h-7 w-auto object-contain transition group-hover:scale-[1.02]"
            />
            <span className="hidden sm:block font-extrabold tracking-[0.18em] text-slate-900">
              RIDS.CL
            </span>
          </Link>

          {/* Botón Mobile */}
          <button
            className="md:hidden inline-flex items-center justify-center rounded-lg p-2 hover:bg-slate-100"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Abrir menú"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Nav (Desktop) */}
          <nav className="relative hidden md:flex items-center gap-2">
            {NAV.map((entry, idx) =>
              entry.type === "link" ? (
                <Link
                  key={entry.label}
                  to={entry.to}
                  className={`${baseBtn} ${
                    isActive(entry.match) ? activeBtn : ""
                  }`}
                >
                  {entry.label}
                </Link>
              ) : (
                <div key={entry.label} className="relative">
                  <button
                    onClick={() => setOpenIdx((o) => (o === idx ? null : idx))}
                    onMouseEnter={() => setOpenIdx(idx)}
                    className={`${baseBtn} ${
                      isActive(entry.match) || openIdx === idx ? activeBtn : ""
                    }`}
                    aria-haspopup="true"
                    aria-expanded={openIdx === idx}
                  >
                    {entry.label}
                  </button>

                  {/* Panel */}
                  <div
                    onMouseLeave={() => setOpenIdx(null)}
                    className={`absolute left-1/2 -translate-x-1/2 mt-2 w-[520px] 
                      rounded-2xl border border-slate-200 bg-white shadow-xl
                      transition-all duration-200 origin-top
                      ${
                        openIdx === idx
                          ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                          : "opacity-0 scale-[0.98] -translate-y-1 pointer-events-none"
                      }`}
                  >
                    <div className="grid grid-cols-3 gap-2 p-3">
                      {entry.items.map((it) => (
                        <Link
                          key={it.label}
                          to={it.to}
                          className="group flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-slate-50"
                          onClick={() => setOpenIdx(null)}
                        >
                          <span
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 
                                       ring-1 ring-cyan-100 group-hover:bg-cyan-100 group-hover:text-cyan-800 transition"
                            aria-hidden
                          >
                            {it.icon}
                          </span>
                          <div className="flex min-w-0 flex-col">
                            <span className="truncate text-sm font-medium text-slate-900">
                              {it.label}
                            </span>
                            <span className="truncate text-xs text-slate-500">
                              {hintFor(it.to)}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>

                    {/* Foot note estilo Tesla */}
                    <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-2 text-xs text-slate-500">
                      <Factory size={14} />
                      <span>Plataforma operativa — RIDS.CL</span>
                    </div>
                  </div>
                </div>
              )
            )}
          </nav>

          {/* Acciones (derecha) */}
          <div className="hidden md:flex items-center gap-4 text-slate-700">
            <Link
              to="/ayuda"
              className="hover:text-slate-900 transition"
              aria-label="Ayuda"
              title="Ayuda"
            >
              <HelpCircle className="h-5 w-5" />
            </Link>
            <button
              className="hover:text-slate-900 transition"
              aria-label="Idioma"
              title="Idioma"
            >
              <Globe className="h-5 w-5" />
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 transition"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut className="h-5 w-5" />
              <span>Salir</span>
            </button>
          </div>
        </div>

        {/* Mobile panel */}
        <div
          className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-300
            ${mobileOpen ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0"}`}
        >
          <div className="rounded-2xl border border-slate-200 bg-white shadow-lg mb-3">
            <div className="p-2">
              {/* Inicio */}
              <MobileLink to={HOME_PATH} icon={<Home size={18} />} onClick={() => setMobileOpen(false)}>
                Inicio
              </MobileLink>

              {/* Operación */}
              <MobileGroup title="Operación" items={[
                { label: "Solicitantes", to: SOLICITANTES_PATH, icon: <Users size={18} /> },
                { label: "Visitas", to: VISITAS_PATH, icon: <CalendarDays size={18} /> },
                { label: "Equipos", to: EQUIPOS_PATH, icon: <Laptop size={18} /> },
              ]} onClickItem={() => setMobileOpen(false)} />

              {/* Gestión */}
              <MobileGroup title="Gestión" items={[
                { label: "Empresas", to: EMPRESAS_PATH, icon: <Building2 size={18} /> },
                { label: "Reportes", to: REPORTES_PATH, icon: <BarChart3 size={18} /> },
              ]} onClickItem={() => setMobileOpen(false)} />

              {/* Tickets */}
              <MobileLink to={TICKETS_PATH} icon={<Ticket size={18} />} onClick={() => setMobileOpen(false)}>
                Tickets
              </MobileLink>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2">
              <div className="flex items-center gap-3 text-slate-600">
                <HelpCircle size={18} className="opacity-80" />
                <span className="text-sm">Centro de ayuda</span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700"
              >
                <LogOut size={18} /> Salir
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

/* ================== Helpers UI ================== */
function hintFor(path: string) {
  switch (path) {
    case SOLICITANTES_PATH:
      return "Registros de personas";
    case VISITAS_PATH:
      return "Agenda y visitas";
    case EQUIPOS_PATH:
      return "Inventario de equipos";
    case EMPRESAS_PATH:
      return "Catálogo de empresas";
    case REPORTES_PATH:
      return "KPIs y reportes";
    case TICKETS_PATH:
      return "Mesa de ayuda";
    default:
      return "Abrir";
  }
}

const MobileLink: React.FC<
  React.PropsWithChildren<{ to: string; icon: React.ReactNode; onClick?: () => void }>
> = ({ to, icon, children, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-slate-50"
  >
    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
      {icon}
    </span>
    <span className="text-sm font-medium text-slate-900">{children}</span>
  </Link>
);

const MobileGroup: React.FC<{
  title: string;
  items: { label: string; to: string; icon: React.ReactNode }[];
  onClickItem?: () => void;
}> = ({ title, items, onClickItem }) => (
  <div className="my-1">
    <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
    <div className="grid grid-cols-1">
      {items.map((it) => (
        <MobileLink key={it.label} to={it.to} icon={it.icon} onClick={onClickItem}>
          {it.label}
        </MobileLink>
      ))}
    </div>
  </div>
);

export default Header;
