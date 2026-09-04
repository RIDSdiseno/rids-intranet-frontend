// src/components/Header.tsx
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { pca } from "../auth/microsoftConfig";
import {
  LogOut,
  Home,
  CalendarDays,
  Users,
  Building2,
  Laptop,
  BarChart3,
  Package,
  User,
  ChevronLeft,
  ChevronRight,
  UserCog,
  MonitorCog,
  ClipboardList,
  ReceiptText,
  Headset,
  Handshake,
  FileText,
  FileSpreadsheet,
  MapPin,
  Wrench,
  ChevronDown,
  LaptopMinimalCheck,
  CalendarCheck2,
  Calendar1,
  Mails,
  Receipt,
  BriefcaseBusiness,
  ChartNetwork,
  Funnel,
  Cog,
  Star,
  MonitorSpeaker,
  Contact,
  MailCheck
} from "lucide-react";
import { useLocation, Link } from "react-router-dom";
import axios from "axios";
import { canViewMapaTecnicos } from "../utils/canViewMapaTecnicos";

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
const MANTENCIONES_GENERALES_PATH = "/mantenciones-generales";
const DASHBOARD_AGENTES_PATH = "/dashboard-agentes";
const ADICIONALES_PATH = "/equipos-adicionales";
const ORDENESTALLER = "/ordenes-taller";
const COTIZACIONES = "/Cotizaciones";
const MAILER_PATH = "/rids/mailer";
const EMPRESAS_PATH = "/empresas";
const REPORTES_PATH = "/reportes";
//const TICKETS_PATH = "/tickets";
const HELPDESK_PATH = "/helpdesk";

const COBRANZA_PATH = "/facturas/cobranza";
const FACTURAS_BASEAPI_PATH = "/facturas";
const CONCILIACION_PATH = "/conciliacion-rcv";
const RECEPTORES_FACTURACION_PATH = "/facturas/receptores";

const CLIENTES_EXT_PATH = "/clientes-externos";
const BITACORA_TECNICO_PATH = "/bitacora-tecnico";
const MAPA_TECNICOS_PATH = "/mapa-tecnicos";
const ENTREGAS_PATH = "/entregas";

type NavLinkItem = {
  type?: "link";
  label: string;
  to: string;
  icon: ReactNode;
};

type NavSubmenuItem = {
  type: "submenu";
  id: string;
  label: string;
  icon: ReactNode;
  match: string[];
  children: NavLinkItem[];
};

type NavItem = NavLinkItem | NavSubmenuItem;

type NavLink = NavLinkItem & {
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

/*
 * Permite que TypeScript distinga correctamente entre
 * un enlace normal y un elemento que contiene un submenú.
 */
function isNavLinkItem(
  item: NavItem
): item is NavLinkItem {
  return item.type !== "submenu";
}

type StoredUser = {
  nombre?: string;
  email?: string;
  rol?: string;
};

/* =========================================================
   FAVORITOS DEL SIDEBAR
========================================================= */

/*
 * Prefijo utilizado para almacenar los favoritos.
 * Se agrega el correo del usuario para que cada persona
 * mantenga una configuración independiente.
 */
const SIDEBAR_FAVORITES_PREFIX =
  "rids-sidebar-favorites";

/**
 * Obtiene la llave de localStorage correspondiente
 * al usuario autenticado.
 */
function getFavoritesStorageKey(
  user: StoredUser | null
) {
  const userIdentifier = String(
    user?.email ?? "usuario"
  )
    .trim()
    .toLowerCase();

  return `${SIDEBAR_FAVORITES_PREFIX}:${userIdentifier}`;
}

/**
 * Recupera las rutas favoritas guardadas.
 */
function readStoredFavorites(
  storageKey: string
): string[] {
  try {
    const raw = localStorage.getItem(storageKey);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    /*
     * Solo se conservan strings y se eliminan
     * posibles rutas duplicadas.
     */
    return Array.from(
      new Set(
        parsed.filter(
          (value): value is string =>
            typeof value === "string" &&
            value.trim() !== ""
        )
      )
    );
  } catch {
    return [];
  }
}

/*
const USUARIOS_GESTION_TECNICOS_CLIENTES = [
  "dbravo@rids.cl",
  "carenas@rids.cl",
  "igonzalez@rids.cl",
  "rcalsin@rids.cl",
  "mahumada@rids.cl",
]; */

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
      {
        type: "submenu",
        id: "gestion-tecnica",
        label: "Gestión Técnicos",
        icon: <Cog size={20} />,
        match: [
          TECNICOS_PATH,
          CLIENTES_EXT_PATH,
          BITACORA_TECNICO_PATH,
          MAPA_TECNICOS_PATH,
        ],
        children: [
          {
            label: "Clientes externos",
            to: CLIENTES_EXT_PATH,
            icon: <Contact size={18} />,
          },
          {
            label: "Listado Técnicos",
            to: TECNICOS_PATH,
            icon: <UserCog size={18} />,
          },
          {
            label: "Bitácora Técnico",
            to: BITACORA_TECNICO_PATH,
            icon: <FileText size={18} />,
          },
          {
            label: "Mapa técnicos",
            to: MAPA_TECNICOS_PATH,
            icon: <MapPin size={18} />,
          },
        ],
      },
      {
        type: "submenu",
        id: "visitas",
        label: "Visitas",
        icon: <CalendarDays size={20} />,
        match: [
          CALENDARIO_PATH,
          VISITAS_PATH,
        ],
        children: [
          {
            label: "Calendario",
            to: CALENDARIO_PATH,
            icon: <Calendar1 size={18} />,
          },
          {
            label: "Atenciones",
            to: VISITAS_PATH,
            icon: <CalendarCheck2 size={18} />,
          },
        ],
      },
      { label: "PickUP", to: ENTREGAS_PATH, icon: <Package size={20} /> },
    ],
    match: [TECNICOS_PATH, CLIENTES_EXT_PATH, CALENDARIO_PATH, VISITAS_PATH, BITACORA_TECNICO_PATH, MAPA_TECNICOS_PATH, ENTREGAS_PATH],
  },
  {
    type: "group",
    label: "RIDS",
    items: [
      { label: "Empresas", to: EMPRESAS_PATH, icon: <Building2 size={20} /> },
      { label: "Solicitantes", to: SOLICITANTES_PATH, icon: <Users size={20} /> },
      {
        type: "submenu",
        id: "inventario",
        label: "Inventario",
        icon: <LaptopMinimalCheck size={20} />,
        match: [
          EQUIPOS_PATH,
          MANTENCIONES_GENERALES_PATH,
          DASHBOARD_AGENTES_PATH,
          ADICIONALES_PATH
        ],
        children: [
          {
            label: "Equipos",
            to: EQUIPOS_PATH,
            icon: <Laptop size={18} />,
          },
          {
            label: "Adicionales y Periféricos",
            to: ADICIONALES_PATH,
            icon: <MonitorSpeaker size={18} />,
          },
          {
            label: "Mantenciones",
            to: MANTENCIONES_GENERALES_PATH,
            icon: <Wrench size={18} />,
          },
          {
            label: "Dashboard Script",
            to: DASHBOARD_AGENTES_PATH,
            icon: <ChartNetwork size={18} />,
          },
        ],
      },
      { label: "Órdenes de Taller", to: ORDENESTALLER, icon: <ClipboardList size={20} /> },
      { label: "Tickets", to: HELPDESK_PATH, icon: <Headset size={20} /> },
      { label: "Mantenciones remotas", to: MANTENCIONES_REMOTAS_PATH, icon: <MonitorCog size={20} /> },
      { label: "Mailer Masivo", to: MAILER_PATH, icon: <Mails size={20} /> },
    ],
    match: [SOLICITANTES_PATH, VISITAS_PATH, EQUIPOS_PATH, ADICIONALES_PATH, MANTENCIONES_GENERALES_PATH, DASHBOARD_AGENTES_PATH, MANTENCIONES_REMOTAS_PATH, EMPRESAS_PATH, MAILER_PATH, HELPDESK_PATH],
  },
  {
    type: "group",
    label: "ECONNET",
    items: [
      { label: "Cotizaciones", to: COTIZACIONES, icon: <Receipt size={20} /> },
      { label: "Clientes", to: "/clientes", icon: <BriefcaseBusiness size={20} /> },
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
    label: "Administración Finanzas",
    items: [
      {
        label:
          "Facturas",
        to:
          FACTURAS_BASEAPI_PATH,
        icon:
          <FileText size={20} />,
      },

      {
        label:
          "Receptores",
        to:
          RECEPTORES_FACTURACION_PATH,
        icon:
          <MailCheck size={20} />,
      },

      {
        label:
          "Conciliación",
        to:
          CONCILIACION_PATH,
        icon:
          <Handshake size={20} />,
      },

      {
        label:
          "Cobranza",
        to:
          COBRANZA_PATH,
        icon:
          <FileSpreadsheet size={20} />,
      },
    ],
    match: [FACTURAS_BASEAPI_PATH, CONCILIACION_PATH, COBRANZA_PATH, RECEPTORES_FACTURACION_PATH],
  },
  {
    type: "group",
    label: "Administración Oportunidades",
    items: [{ label: "Funnel", to: "/funnel", icon: <Funnel size={20} /> }],
    match: ["/funnel"],
  },
  /*
  {
    type: "group",
    label: "Freshdesk",
    items: [
      { label: "Tickets (Histórico)", to: TICKETS_PATH, icon: <Ticket size={20} /> },
    ],
    match: [TICKETS_PATH],
  },*/
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

  const user = useMemo(() => safeParseUser(), []);
  const favoritesStorageKey = useMemo(
    () => getFavoritesStorageKey(user),
    [user]
  );

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  /*
 * Rutas marcadas como favoritas por el usuario.
 */
  const [favoritePaths, setFavoritePaths] =
    useState<string[]>(() =>
      readStoredFavorites(
        favoritesStorageKey
      )
    );

  /*
   * Permite abrir o cerrar la sección Favoritos
   * cuando el sidebar está expandido.
   */
  const [favoritesOpen, setFavoritesOpen] =
    useState(true);

  /*
 * Controla qué grupos principales del sidebar están desplegados.
 * Por defecto, todos permanecen cerrados excepto el grupo
 * correspondiente a la ruta actual.
 */
  const [openGroups, setOpenGroups] = useState<
    Record<string, boolean>
  >({});

  const [openSubmenus, setOpenSubmenus] =
    useState<Record<string, boolean>>({
      inventario:
        isActivePath(
          pathname,
          EQUIPOS_PATH
        ) ||
        isActivePath(
          pathname,
          ADICIONALES_PATH
        ) ||
        isActivePath(
          pathname,
          MANTENCIONES_GENERALES_PATH
        ) ||
        isActivePath(
          pathname,
          DASHBOARD_AGENTES_PATH
        ),

      visitas:
        isActivePath(
          pathname,
          CALENDARIO_PATH
        ) ||
        isActivePath(
          pathname,
          VISITAS_PATH
        ),
    });

  useEffect(() => {
    setOpenSubmenus((current) => ({
      ...current,

      inventario:
        current.inventario ||
        isActivePath(
          pathname,
          EQUIPOS_PATH
        ) ||
        isActivePath(
          pathname,
          ADICIONALES_PATH
        ) ||
        isActivePath(
          pathname,
          MANTENCIONES_GENERALES_PATH
        ) ||
        isActivePath(
          pathname,
          DASHBOARD_AGENTES_PATH
        ),

      visitas:
        current.visitas ||
        isActivePath(pathname, CALENDARIO_PATH) ||
        isActivePath(pathname, VISITAS_PATH),
    }));
  }, [pathname]);

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

  /*
 * Volver a cargar favoritos si cambia el usuario.
 * Normalmente esto ocurrirá después de cerrar sesión
 * e ingresar con otra cuenta.
 */
  useEffect(() => {
    setFavoritePaths(
      readStoredFavorites(
        favoritesStorageKey
      )
    );
  }, [favoritesStorageKey]);

  /*
   * Guardar automáticamente los favoritos cada vez
   * que el usuario agregue o elimine una ruta.
   */
  useEffect(() => {
    localStorage.setItem(
      favoritesStorageKey,
      JSON.stringify(favoritePaths)
    );
  }, [
    favoritePaths,
    favoritesStorageKey,
  ]);

  const isCliente = user?.rol === "CLIENTE";

  const userRole = String(user?.rol ?? "").toUpperCase().trim();
  const canAccessFacturas =
    userRole === "ADMINISTRACION" || userRole === "VENTAS" || userRole === "CLIENTE";

  const canAccessTecnicos =
    userRole === "ADMIN" ||
    userRole === "ADMINISTRACION" ||
    userRole === "TECNICO" ||
    userRole === "VENTAS";

  const canAccessGestionTecnicosClientes =
    userRole === "ADMIN" || userRole === "ADMINISTRACION";

  const canAccessMapaTecnicos = canViewMapaTecnicos(user);

  const canAccessCobranza =
    userRole === "ADMIN" || userRole === "ADMINISTRACION";

  const canAccessConciliacion = userRole === "ADMINISTRACION";

  const canAccessReceptoresFacturacion = userRole === "ADMINISTRACION";

  const canAccessFunnel =
    userRole === "ADMIN" || userRole === "ADMINISTRACION" || userRole === "VENTAS";

  /*
  const canAccessGestionTecnicosClientes =
    USUARIOS_GESTION_TECNICOS_CLIENTES.includes(userEmail) */

  const filteredNav: NavEntry[] = useMemo(() => {
    const nav = NAV
      .map((entry): NavEntry | null => {
        if (
          entry.type === "group" &&
          entry.label === "Administración Finanzas"
        ) {
          /*
           * Finanzas contiene solamente enlaces normales.
           * El predicado también informa a TypeScript que
           * el resultado será NavLinkItem[].
           */
          const items = entry.items.filter(
            (item): item is NavLinkItem => {
              if (
                !isNavLinkItem(
                  item
                )
              ) {
                return false;
              }

              if (
                item.to ===
                FACTURAS_BASEAPI_PATH
              ) {
                return canAccessFacturas;
              }

              if (
                item.to ===
                RECEPTORES_FACTURACION_PATH
              ) {
                return canAccessReceptoresFacturacion;
              }

              if (
                item.to ===
                CONCILIACION_PATH
              ) {
                return canAccessConciliacion;
              }

              if (
                item.to ===
                COBRANZA_PATH
              ) {
                return canAccessCobranza;
              }

              return false;
            }
          );

          if (items.length === 0) {
            return null;
          }

          return {
            ...entry,
            items,
            match: items.map((item) => item.to),
          };
        }

        if (
          entry.type === "group" &&
          entry.label === "Técnicos y Visitas"
        ) {
          const items = entry.items
            .map((item): NavItem | null => {
              /*
               * Filtrar enlaces directos del grupo.
               */
              if (isNavLinkItem(item)) {
                if (
                  item.to === TECNICOS_PATH &&
                  !canAccessTecnicos
                ) {
                  return null;
                }

                if (
                  item.to === CLIENTES_EXT_PATH &&
                  !canAccessGestionTecnicosClientes
                ) {
                  return null;
                }

                if (
                  item.to === MAPA_TECNICOS_PATH &&
                  !canAccessMapaTecnicos
                ) {
                  return null;
                }

                return item;
              }

              /*
               * Filtrar también los enlaces que están
               * dentro de un submenú.
               */
              const children = item.children.filter(
                (child) => {
                  if (
                    child.to === TECNICOS_PATH &&
                    !canAccessTecnicos
                  ) {
                    return false;
                  }

                  if (
                    child.to === CLIENTES_EXT_PATH &&
                    !canAccessGestionTecnicosClientes
                  ) {
                    return false;
                  }

                  if (
                    child.to === MAPA_TECNICOS_PATH &&
                    !canAccessMapaTecnicos
                  ) {
                    return false;
                  }

                  return true;
                }
              );

              /*
               * Eliminar el submenú si ya no contiene páginas.
               */
              if (children.length === 0) {
                return null;
              }

              return {
                ...item,
                children,
                match: children.map(
                  (child) => child.to
                ),
              };
            })
            .filter(
              (item): item is NavItem =>
                item !== null
            );

          if (items.length === 0) {
            return null;
          }

          return {
            ...entry,
            items,
            match: items.flatMap((item) =>
              isNavLinkItem(item)
                ? [item.to]
                : item.match
            ),
          };
        }

        if (
          entry.type === "group" &&
          entry.label === "Administración Oportunidades"
        ) {
          const items = entry.items.filter(
            (item): item is NavLinkItem => {
              /*
               * Administración contiene enlaces directos.
               * Se descartan posibles submenús para que TypeScript
               * sepa que todos los elementos restantes tienen "to".
               */
              if (!isNavLinkItem(item)) {
                return false;
              }

              if (item.to === "/funnel") {
                return canAccessFunnel;
              }

              return true;
            }
          );

          if (items.length === 0) {
            return null;
          }

          return {
            ...entry,
            items,
            match: items.map((item) => item.to),
          };
        }

        return entry;
      })
      .filter((entry): entry is NavEntry => {
        if (!entry) return false;

        if (entry.type === "group") {
          return entry.items.length > 0;
        }

        return true;
      });

    if (!isCliente) return nav;

    return [
      {
        type: "group" as const,
        label: "Mi Empresa",
        match: [
          HELPDESK_PATH,
          ORDENESTALLER,
          COTIZACIONES,
          EMPRESAS_PATH,
          EQUIPOS_PATH,
          VISITAS_PATH,
          SOLICITANTES_PATH,
          MANTENCIONES_REMOTAS_PATH,
          REPORTES_PATH,
          FACTURAS_BASEAPI_PATH,
        ],
        items: [
          { label: "Mi Empresa", to: EMPRESAS_PATH, icon: <Building2 size={20} /> },
          { label: "Mis Equipos", to: EQUIPOS_PATH, icon: <Laptop size={20} /> },
          { label: "Listado de Usuarios", to: SOLICITANTES_PATH, icon: <Users size={20} /> },
          { label: "Atenciones y Visitas", to: VISITAS_PATH, icon: <CalendarDays size={20} /> },
          { label: "Órdenes de Taller", to: ORDENESTALLER, icon: <ClipboardList size={20} /> },
          { label: "Mantenciones remotas", to: MANTENCIONES_REMOTAS_PATH, icon: <MonitorCog size={20} /> },
          { label: "Tickets de Soporte", to: HELPDESK_PATH, icon: <Headset size={20} /> },
          { label: "Cotizaciones", to: COTIZACIONES, icon: <ReceiptText size={20} /> },
          { label: "Informes Mensuales", to: REPORTES_PATH, icon: <BarChart3 size={20} /> },
          { label: "Facturas", to: FACTURAS_BASEAPI_PATH, icon: <FileText size={20} /> },
        ],
      },
    ];
  }, [
    isCliente,
    canAccessFacturas,
    canAccessTecnicos,
    canAccessGestionTecnicosClientes,
    canAccessMapaTecnicos,
    canAccessCobranza,
    canAccessConciliacion,
    canAccessFunnel,
  ]);

  /*
 * Obtiene todos los enlaces finales disponibles después
 * de aplicar permisos por rol.
 *
 * Incluye:
 * - enlaces principales;
 * - enlaces normales dentro de grupos;
 * - hijos de submenús.
 */
  const availableNavLinks =
    useMemo<NavLinkItem[]>(() => {
      const links: NavLinkItem[] = [];

      filteredNav.forEach((entry) => {
        if (entry.type === "link") {
          links.push(entry);
          return;
        }

        entry.items.forEach((item) => {
          if (isNavLinkItem(item)) {
            links.push(item);
            return;
          }

          item.children.forEach(
            (child) => {
              links.push(child);
            }
          );
        });
      });

      /*
       * Eliminar rutas repetidas por seguridad.
       */
      const uniqueLinks = new Map<
        string,
        NavLinkItem
      >();

      links.forEach((link) => {
        uniqueLinks.set(link.to, link);
      });

      return Array.from(
        uniqueLinks.values()
      );
    }, [filteredNav]);

  /*
   * Convierte las rutas almacenadas en objetos navegables.
   * Mantiene el mismo orden en el que el usuario los agregó.
   */
  const favoriteItems =
    useMemo<NavLinkItem[]>(() => {
      return favoritePaths
        .map((path) =>
          availableNavLinks.find(
            (item) => item.to === path
          )
        )
        .filter(
          (
            item
          ): item is NavLinkItem =>
            Boolean(item)
        );
    }, [
      favoritePaths,
      availableNavLinks,
    ]);

  /*
   * Elimina favoritos que ya no estén disponibles
   * para el rol del usuario actual.
   */
  useEffect(() => {
    setFavoritePaths((current) => {
      const validPaths = current.filter(
        (path) =>
          availableNavLinks.some(
            (item) => item.to === path
          )
      );

      /*
       * Evitar un cambio de estado innecesario
       * cuando ambas listas son iguales.
       */
      if (
        validPaths.length ===
        current.length &&
        validPaths.every(
          (path, index) =>
            path === current[index]
        )
      ) {
        return current;
      }

      return validPaths;
    });
  }, [availableNavLinks]);

  /*
 * Cuando cambia la ruta, abre automáticamente el grupo
 * que contiene la página actual.
 */
  useEffect(() => {
    setOpenGroups((current) => {
      const next = { ...current };

      filteredNav.forEach((entry) => {
        if (entry.type !== "group") {
          return;
        }

        const isGroupActive = entry.match.some((path) =>
          isActivePath(pathname, path)
        );

        if (isGroupActive) {
          next[entry.label] = true;
        }
      });

      return next;
    });
  }, [pathname, filteredNav]);

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

  /**
 * Comprueba si una ruta está marcada como favorita.
 */
  function isFavorite(path: string) {
    return favoritePaths.includes(path);
  }

  /**
   * Agrega o elimina una ruta de los favoritos.
   */
  function toggleFavorite(path: string) {
    setFavoritePaths((current) => {
      if (current.includes(path)) {
        return current.filter(
          (favoritePath) =>
            favoritePath !== path
        );
      }

      return [...current, path];
    });
  }

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

        <nav className="flex-1 space-y-2 overflow-y-auto px-2 py-4 scrollbar-thin scrollbar-thumb-slate-300 hover:scrollbar-thumb-slate-400 sm:py-6">
          {/* =====================================================
      MENÚ DE FAVORITOS
  ===================================================== */}
          {favoriteItems.length > 0 && (
            <div className="space-y-1 border-b border-slate-200 pb-3">
              {/* Encabezado visible cuando el sidebar está expandido */}
              {!sidebarCollapsed && (
                <button
                  type="button"
                  onClick={() =>
                    setFavoritesOpen(
                      (current) => !current
                    )
                  }
                  className="
  flex w-full items-center
  justify-between gap-3
  rounded-xl px-3 py-2
  text-left text-slate-500
  transition-colors
  hover:bg-slate-100
  hover:text-slate-700
"
                  aria-expanded={favoritesOpen}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Star
                      size={15}
                      className="shrink-0 fill-cyan-500 text-cyan-500"
                    />

                    <span className="truncate text-xs font-semibold uppercase tracking-wider">
                      Favoritos
                    </span>

                    <span className="rounded-full bg-cyan-100 px-1.5 py-0.5 text-[10px] font-bold text-cyan-700">
                      {favoriteItems.length}
                    </span>
                  </span>

                  <ChevronDown
                    size={15}
                    className={`
              shrink-0 transition-transform
              duration-200
              ${favoritesOpen
                        ? "rotate-180"
                        : ""
                      }
            `}
                  />
                </button>
              )}

              {/*
       * Cuando está colapsado se muestran directamente
       * los iconos favoritos.
       */}
              {(sidebarCollapsed ||
                favoritesOpen) && (
                  <div className="space-y-1">
                    {favoriteItems.map(
                      (favoriteItem) => {
                        const active =
                          isActivePath(
                            pathname,
                            favoriteItem.to
                          );

                        return (
                          <div
                            key={
                              favoriteItem.to
                            }
                            className="group/favorite relative flex min-w-0 items-center"
                          >
                            <Link
                              to={
                                favoriteItem.to
                              }
                              className={`
                      group relative flex
                      min-w-0 flex-1
                      items-center gap-3
                      rounded-lg px-3 py-2.5
                      transition-all duration-200
                      ${active
                                  ? "bg-cyan-50 font-medium text-cyan-700 before:absolute before:inset-y-2 before:-left-2 before:w-1 before:rounded-r before:bg-cyan-500"
                                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-700"
                                }
                      ${sidebarCollapsed
                                  ? "justify-center"
                                  : "pr-10"
                                }
                    `}
                              title={
                                sidebarCollapsed
                                  ? favoriteItem.label
                                  : undefined
                              }
                            >
                              <span className="shrink-0">
                                {
                                  favoriteItem.icon
                                }
                              </span>

                              {!sidebarCollapsed && (
                                <span className="min-w-0 truncate text-sm">
                                  {
                                    favoriteItem.label
                                  }
                                </span>
                              )}

                              {sidebarCollapsed && (
                                <span className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100">
                                  {
                                    favoriteItem.label
                                  }
                                </span>
                              )}
                            </Link>

                            {!sidebarCollapsed && (
                              <button
                                type="button"
                                onClick={() =>
                                  toggleFavorite(
                                    favoriteItem.to
                                  )
                                }
                                className="
  absolute right-2
  inline-flex h-7 w-7
  items-center justify-center
  rounded-lg
  text-cyan-600
  transition
  hover:bg-cyan-50
  hover:text-cyan-700
"
                                title="Quitar de favoritos"
                                aria-label={`Quitar ${favoriteItem.label} de favoritos`}
                              >
                                <Star
                                  size={15}
                                  className="fill-current"
                                />
                              </button>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
            </div>
          )}

          {/* =====================================================
      NAVEGACIÓN GENERAL
  ===================================================== */}
          {filteredNav.map((entry) => {
            /*
             * Enlace principal independiente, como Inicio.
             */
            if (entry.type === "link") {
              const active = isActivePath(
                pathname,
                entry.to
              );

              return (
                <div
                  key={entry.label}
                  className="group/sidebar-item relative flex min-w-0 items-center"
                >
                  <Link
                    to={entry.to}
                    className={`
        group relative flex
        min-w-0 flex-1
        items-center gap-4
        rounded-xl px-3 py-2.5
        transition-all duration-200
        ${active
                        ? "bg-cyan-50 font-medium text-cyan-700 before:absolute before:inset-y-2 before:-left-2 before:w-1 before:rounded-r before:bg-cyan-500"
                        : "text-slate-700 hover:bg-slate-100"
                      }
        ${sidebarCollapsed
                        ? "justify-center"
                        : "pr-10"
                      }
      `}
                    title={
                      sidebarCollapsed
                        ? entry.label
                        : undefined
                    }
                  >
                    <span className="shrink-0">
                      {entry.icon}
                    </span>

                    {!sidebarCollapsed && (
                      <span className="min-w-0 truncate">
                        {entry.label}
                      </span>
                    )}

                    {sidebarCollapsed && (
                      <span className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100">
                        {entry.label}
                      </span>
                    )}
                  </Link>

                  {/* Estrella visible con el sidebar expandido */}
                  {!sidebarCollapsed && (
                    <button
                      type="button"
                      onClick={() =>
                        toggleFavorite(entry.to)
                      }
                      className={`
          absolute right-2
          inline-flex h-7 w-7
          items-center justify-center
          rounded-lg transition
          ${isFavorite(entry.to)
                          ? "text-cyan-600 hover:bg-cyan-50 hover:text-cyan-700"
                          : "text-slate-300 opacity-0 hover:bg-slate-100 hover:text-cyan-600 group-hover/sidebar-item:opacity-100"
                        }
        `}
                      title={
                        isFavorite(entry.to)
                          ? "Quitar de favoritos"
                          : "Agregar a favoritos"
                      }
                      aria-label={
                        isFavorite(entry.to)
                          ? `Quitar ${entry.label} de favoritos`
                          : `Agregar ${entry.label} a favoritos`
                      }
                    >
                      <Star
                        size={15}
                        className={
                          isFavorite(entry.to)
                            ? "fill-current"
                            : ""
                        }
                      />
                    </button>
                  )}
                </div>
              );
            }

            /*
             * Grupo principal del sidebar.
             */
            const groupActive = entry.match.some(
              (path) =>
                isActivePath(pathname, path)
            );

            const groupOpen =
              openGroups[entry.label] ??
              groupActive;

            /*
             * Cuando el sidebar está colapsado, los enlaces se mantienen
             * visibles mediante sus iconos. Cuando está expandido,
             * dependen del estado desplegado/cerrado del grupo.
             */
            const showGroupItems =
              sidebarCollapsed || groupOpen;

            return (
              <div
                key={entry.label}
                className="space-y-1"
              >
                {/* Encabezado desplegable del grupo */}
                {!sidebarCollapsed && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenGroups((current) => ({
                        ...current,
                        [entry.label]:
                          !(current[entry.label] ??
                            groupActive),
                      }));
                    }}
                    className={`
              flex w-full items-center justify-between gap-3 rounded-xl
              px-3 py-2 text-left transition-colors
             ${groupActive
                        ? `
      bg-cyan-100/80
      text-cyan-900
      font-bold
      ring-1 ring-inset ring-cyan-300
      shadow-sm
    `
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      }
            `}
                    aria-expanded={groupOpen}
                  >
                    <span className="min-w-0 truncate text-xs font-semibold uppercase tracking-wider">
                      {entry.label}
                    </span>

                    <ChevronDown
                      size={15}
                      className={`
                shrink-0 transition-transform duration-200
                ${groupOpen ? "rotate-180" : ""}
              `}
                    />
                  </button>
                )}

                {/* Elementos internos del grupo */}
                {showGroupItems && (
                  <div
                    className={`
              space-y-1
              ${!sidebarCollapsed
                        ? "animate-in fade-in slide-in-from-top-1 duration-200"
                        : ""
                      }
            `}
                  >
                    {entry.items.map((it) => {
                      /*
                       * Submenú interno, como Inventario o Visitas.
                       */
                      if (it.type === "submenu") {
                        const submenuActive =
                          it.match.some((path) =>
                            isActivePath(
                              pathname,
                              path
                            )
                          );

                        const submenuOpen =
                          openSubmenus[it.id] ??
                          submenuActive;

                        return (
                          <div
                            key={it.id}
                            className="space-y-1"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                /*
                                 * Cuando el sidebar está colapsado,
                                 * lo expande primero para poder mostrar
                                 * correctamente los hijos.
                                 */
                                if (sidebarCollapsed) {
                                  setCollapsed(false);

                                  setOpenGroups(
                                    (current) => ({
                                      ...current,
                                      [entry.label]:
                                        true,
                                    })
                                  );

                                  setOpenSubmenus(
                                    (current) => ({
                                      ...current,
                                      [it.id]: true,
                                    })
                                  );

                                  return;
                                }

                                setOpenSubmenus(
                                  (current) => ({
                                    ...current,
                                    [it.id]:
                                      !(
                                        current[
                                        it.id
                                        ] ??
                                        submenuActive
                                      ),
                                  })
                                );
                              }}
                              className={`
                        group relative flex w-full items-center gap-4 rounded-lg
                        px-3 py-2.5 transition-all duration-200
                        ${submenuActive
                                  ? "font-medium text-cyan-700"
                                  : "text-slate-600 hover:bg-slate-100"
                                }
                        ${sidebarCollapsed
                                  ? "justify-center"
                                  : "pl-6"
                                }
                      `}
                              title={
                                sidebarCollapsed
                                  ? it.label
                                  : undefined
                              }
                              aria-expanded={
                                submenuOpen
                              }
                            >
                              <span className="shrink-0">
                                {it.icon}
                              </span>

                              {!sidebarCollapsed && (
                                <>
                                  <span className="min-w-0 flex-1 truncate text-left">
                                    {it.label}
                                  </span>

                                  <ChevronDown
                                    size={16}
                                    className={`
                              shrink-0 transition-transform duration-200
                              ${submenuOpen
                                        ? "rotate-180"
                                        : ""
                                      }
                            `}
                                  />
                                </>
                              )}

                              {sidebarCollapsed && (
                                <span className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100">
                                  {it.label}
                                </span>
                              )}
                            </button>

                            {!sidebarCollapsed &&
                              submenuOpen && (
                                <div className="ml-8 space-y-1 border-l border-slate-200 pl-2">
                                  {it.children.map(
                                    (child) => {
                                      const childActive =
                                        isActivePath(
                                          pathname,
                                          child.to
                                        );

                                      return (
                                        <div
                                          key={child.to}
                                          className="group/sidebar-child relative flex min-w-0 items-center"
                                        >
                                          <Link
                                            to={child.to}
                                            className={`
        flex min-w-0 flex-1
        items-center gap-2.5
        rounded-lg px-2.5 py-2
        pr-9 text-sm
        transition-all duration-200
        ${childActive
                                                ? "bg-cyan-50 font-semibold text-cyan-700 ring-1 ring-inset ring-cyan-100"
                                                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                              }
      `}
                                          >
                                            <span className="shrink-0">
                                              {child.icon}
                                            </span>

                                            <span className="min-w-0 truncate leading-5">
                                              {child.label}
                                            </span>
                                          </Link>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              toggleFavorite(
                                                child.to
                                              )
                                            }
                                            className={`
        absolute right-1
        inline-flex h-7 w-7
        items-center justify-center
        rounded-lg transition
        ${isFavorite(child.to)
                                                ? "text-cyan-600 hover:bg-cyan-50 hover:text-cyan-700"
                                                : "text-slate-300 opacity-0 hover:bg-slate-100 hover:text-cyan-600 group-hover/sidebar-child:opacity-100"
                                              }
      `}
                                            title={
                                              isFavorite(child.to)
                                                ? "Quitar de favoritos"
                                                : "Agregar a favoritos"
                                            }
                                            aria-label={
                                              isFavorite(child.to)
                                                ? `Quitar ${child.label} de favoritos`
                                                : `Agregar ${child.label} a favoritos`
                                            }
                                          >
                                            <Star
                                              size={14}
                                              className={
                                                isFavorite(child.to)
                                                  ? "fill-current"
                                                  : ""
                                              }
                                            />
                                          </button>
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              )}
                          </div>
                        );
                      }

                      /*
                       * Enlace normal dentro de un grupo.
                       */
                      const itemActive =
                        isActivePath(
                          pathname,
                          it.to
                        );

                      return (
                        <div
                          key={it.to}
                          className="group/sidebar-item relative flex min-w-0 items-center"
                        >
                          <Link
                            to={it.to}
                            className={`
        group relative flex
        min-w-0 flex-1
        items-center gap-4
        rounded-lg px-3 py-2.5
        transition-all duration-200
        ${itemActive
                                ? "bg-cyan-50 font-medium text-cyan-700 before:absolute before:inset-y-2 before:-left-2 before:w-1 before:rounded-r before:bg-cyan-500"
                                : "text-slate-600 hover:bg-slate-100"
                              }
        ${sidebarCollapsed
                                ? "justify-center"
                                : "pl-6 pr-10"
                              }
      `}
                            title={
                              sidebarCollapsed
                                ? it.label
                                : undefined
                            }
                          >
                            <span className="shrink-0">
                              {it.icon}
                            </span>

                            {!sidebarCollapsed && (
                              <span className="min-w-0 truncate">
                                {it.label}
                              </span>
                            )}

                            {sidebarCollapsed && (
                              <span className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100">
                                {it.label}
                              </span>
                            )}
                          </Link>

                          {!sidebarCollapsed && (
                            <button
                              type="button"
                              onClick={() =>
                                toggleFavorite(it.to)
                              }
                              className={`
          absolute right-2
          inline-flex h-7 w-7
          items-center justify-center
          rounded-lg transition
          ${isFavorite(it.to)
                                  ? "text-cyan-600 hover:bg-cyan-50 hover:text-cyan-700"
                                  : "text-slate-300 opacity-0 hover:bg-slate-100 hover:text-cyan-600 group-hover/sidebar-item:opacity-100"
                                }
        `}
                              title={
                                isFavorite(it.to)
                                  ? "Quitar de favoritos"
                                  : "Agregar a favoritos"
                              }
                              aria-label={
                                isFavorite(it.to)
                                  ? `Quitar ${it.label} de favoritos`
                                  : `Agregar ${it.label} a favoritos`
                              }
                            >
                              <Star
                                size={15}
                                className={
                                  isFavorite(it.to)
                                    ? "fill-current"
                                    : ""
                                }
                              />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
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
