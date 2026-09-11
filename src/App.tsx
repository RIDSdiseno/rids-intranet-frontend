// src/App.tsx
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Header from "./components/Header";
import AccessibilityPanel from "./components/modals-accesibilidad/AccessibilityPanel";
import NotaRapidaGlobal from "./components/modals-accesibilidad/NotaRapidaGlobal";
import RecordatoriosCampana from "./components/modals-recordatorios/RecordatoriosCampana";
import PermisoNotificacionesModal from "./components/modals-recordatorios/PermisoNotificacionesModal";

import { canViewMapaTecnicos } from "./utils/canViewMapaTecnicos";

/* =========================
   Lazy Pages (HOST)
========================= */

const HomePage = lazy(() => import("./host/Home"));
const SolicitantesPage = lazy(() => import("./host/Solicitantes"));
const VisitasPage = lazy(() => import("./host/VisitasPage"));
const EquiposPage = lazy(() => import("./host/EquiposPage"));
const MantencionesGeneralesPage = lazy(() => import("./components/modals-equipos/mant-general-page/MantencionesGeneralesPage"));
const DashboardAgentesPage = lazy(() => import("./components/modals-equipos/dashboard-agentes/DashboardAgentesPage"));
const AdicionalesPage = lazy(() => import("./components/modals-equipos/adicionales/AdicionalesPage"));
const TicketsPage = lazy(() => import("./host/Ticket"));
const EmpresasPage = lazy(() => import("./host/EmpresasPage"));
const ReportesPage = lazy(() => import("./host/Reportes"));
const DocumentosPage = lazy(() => import("./host/DocumentosPage"));
const OrdenesTallerPage = lazy(() => import("./host/OrdenesTaller"));
const CotizacionesPage = lazy(() => import("./host/Cotizaciones"));
const FunnelPage = lazy(() => import("./host/Funnel"));
const CotizacionesEnviadasPage = lazy(() => import("./host/CotizacionesEnviadas"));
const MailerPage = lazy(() => import("./host/Mailer"));
const CobranzaPage = lazy(() => import("./host/Cobranza"));
const ClientesPage = lazy(() => import("./host/ClientesGestiooPage"));
const ProductosPage = lazy(() => import("./host/ProductosCotiPage"));

const HelpdeskLayout = lazy(() => import("../src/components/modals-ticketera/HelpdeskLayout"));
const TicketeraRids = lazy(() => import("./host/TicketeraRids"));
const DashboardTecnicosdPage = lazy(() => import("../src/components/modals-ticketera/DashboardTecnicos"));
const TicketEmailTemplatesPage = lazy(() => import("../src/components/modals-ticketera/config-ticktes/reply-templates/TicketEmailTemplate"));
const TicketeraDetalle = lazy(() => import("../src/components/modals-ticketera/TicketDetalle"));
const TicketsDashboardPage = lazy(() => import("./components/modals-ticketera/dashboard-tickets/ticketDashboard"));
const HelpdeskConfigPage = lazy(() => import("./components/modals-ticketera/config-ticktes/reply-templates/tickets-config"));

const MantencionesRemotasPage = lazy(() => import("./host/MantencionesRemotasPage"));
const AgendaPage = lazy(() => import("./host/AgendaPage"));
const TecnicosPage = lazy(() => import("./host/TecnicosPage"));

const LoginPage = lazy(() => import("./host/login"));
const ForgotPasswordPage = lazy(() => import("./host/ForgotPassword"));
const ResetPasswordPage = lazy(() => import("./host/ResetPassword"));

const ClientesExtPage = lazy(() => import("./host/ClientesExt"));

const FinanzasDashboardsPage = lazy(() => import("./host/FinanzasDashboard"));
const FacturasBaseapiPage = lazy(() => import("./host/facturasBaseapi"));
const ConciliacionRcvPage = lazy(() => import("./host/ConciliacionRcv"));
const ReceptoresFacturacionPage =
  lazy(
    () =>
      import(
        "./components/modals-facturasBaseapi/receptores-facturacion/ReceptoresFacturacionPage"
      )
  );

const ReceptoresCobranzaPage =
  lazy(
    () =>
      import(
        "./components/modals-facturasBaseapi/receptores-cobranza/ReceptoresCobranzaPage"
      )
  );

const BitacoraTecnicoPage = lazy(() => import("./host/BitacoraTecnico"));
const MapaTecnicosPage = lazy(() => import("./host/MapaTecnicosPage"));
const EntregasPage = lazy(() => import("./host/EntregasPage"));

/* =========================
   Auth helpers
========================= */

function isAuthed(): boolean {
  return !!(
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt")
  );
}

function getUserRol(): string | null {
  try {
    const raw = localStorage.getItem("user");
    return raw ? (JSON.parse(raw)?.rol ?? null) : null;
  } catch {
    return null;
  }
}

function getUser(): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/* =========================
   Guards
========================= */

function ProtectedRoute() {
  if (!isAuthed()) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RoleRoute({ allowedRoles }: { allowedRoles: string[] }) {
  const rol = getUserRol();
  const rolNormalizado = String(rol ?? "").toUpperCase().trim();

  if (!rolNormalizado || !allowedRoles.includes(rolNormalizado)) {
    const fallback = rolNormalizado === "CLIENTE" ? "/empresas" : "/home";
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}

function MapaTecnicosRoute() {
  if (!canViewMapaTecnicos(getUser())) {
    const rol = String(getUserRol() ?? "").toUpperCase().trim();
    const fallback = rol === "CLIENTE" ? "/empresas" : "/home";
    return <Navigate to={fallback} replace />;
  }

  return <Outlet />;
}

// Acceso exclusivo por email — módulo Cobranza
// const COBRANZA_EMAILS = ["carenas@rids.cl", "dbravo@rids.cl", "igonzalez@rids.cl"];

/*
const USUARIOS_GESTION_TECNICOS_CLIENTES = [
  "dbravo@rids.cl",
  "carenas@rids.cl",
  "igonzalez@rids.cl",
  "rcalsin@rids.cl",
  "mahumada@rids.cl",
]; */

/*
function GestionTecnicosClientesRoute() {
  const email = getUserEmail();

  const autorizado =
    !!email && USUARIOS_GESTION_TECNICOS_CLIENTES.includes(email);

  if (!autorizado) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
} */

function getRootRedirect(): string {
  const rol = String(getUserRol() ?? "").toUpperCase().trim();

  if (rol === "CLIENTE") return "/empresas";

  return "/home";
}

/* =========================
   Layout con Sidebar
========================= */

function AppLayout() {
  const rol = String(getUserRol() ?? "")
    .toUpperCase()
    .trim();

  /*
   * Las herramientas rápidas, recordatorios y
   * notificaciones pertenecen a usuarios internos.
   */
  const canUseHerramientasInternas = [
    "ADMIN",
    "ADMINISTRACION",
    "TECNICO",
    "VENTAS",
  ].includes(rol);

  return (
    <div className="flex h-screen overflow-hidden">
      <Header />

      {/* El contenido principal conserva su propio scroll. */}
      <div className="relative min-w-0 flex-1 overflow-y-auto bg-white">
        {canUseHerramientasInternas && (
          <div className="fixed right-5 top-5 z-[70] sm:right-7">
            <RecordatoriosCampana />
          </div>
        )}

        <main className="app-content-zoom">
          <Suspense
            fallback={
              <div className="p-6">
                Cargando...
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>

      {/* Panel de accesibilidad actual. */}
      <AccessibilityPanel />

      {canUseHerramientasInternas && (
        <>
          {/* Nota rápida disponible para usuarios internos. */}
          <NotaRapidaGlobal />

          {/*
           * Modal que se muestra al ingresar cuando
           * el permiso sigue en estado "default" o "denied".
           */}
          <PermisoNotificacionesModal />
        </>
      )}
    </div>
  );
}

/* =========================
   APP
========================= */

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ===== RUTAS PÚBLICAS ===== */}
        <Route path="/login" element={<Suspense fallback={<div>Cargando...</div>}><LoginPage /></Suspense>} />
        <Route path="/forgot-password" element={<Suspense fallback={<div>Cargando...</div>}><ForgotPasswordPage /></Suspense>} />
        <Route path="/reset-password" element={<Suspense fallback={<div>Cargando...</div>}><ResetPasswordPage /></Suspense>} />

        <Route path="/" element={<Navigate to={getRootRedirect()} replace />} />

        {/* ===== RUTAS PROTEGIDAS ===== */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>

            {/* ── Solo roles internos ──────────────────────────────────── */}
            <Route element={<RoleRoute allowedRoles={["ADMIN", "ADMINISTRACION", "TECNICO", "VENTAS"]} />}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/agenda" element={<AgendaPage />} />
              <Route path="/documentos" element={<DocumentosPage />} />
              <Route path="/tickets" element={<TicketsPage />} />
              <Route path="/clientes" element={<ClientesPage />} />
              <Route path="/productos" element={<ProductosPage />} />
              <Route path="/bitacora-tecnico" element={<BitacoraTecnicoPage />} />
            </Route>

            {/* ── Solo ADMIN y ADMINISTRACION ──────────────────────────── */}
            <Route element={<RoleRoute allowedRoles={["ADMIN", "ADMINISTRACION"]} />}>
              <Route path="/clientes-externos" element={<ClientesExtPage />} />
            </Route>

            {/* ── Supervisión Mapa Técnicos ────────────────────────────── */}
            <Route element={<MapaTecnicosRoute />}>
              <Route path="/mapa-tecnicos" element={<MapaTecnicosPage />} />
            </Route>

            {/* ── Entregas (comprobantes) · todos los roles ────────────── */}
            <Route path="/entregas" element={<EntregasPage />} />

            {/* ── Internos + CLIENTE (backend filtra por empresa) ─────── */}
            <Route element={<RoleRoute allowedRoles={["ADMIN", "ADMINISTRACION", "TECNICO", "VENTAS", "CLIENTE"]} />}>
              <Route path="/empresas" element={<EmpresasPage />} />
              <Route path="/equipos" element={<EquiposPage />} />
              <Route path="/equipos-adicionales" element={<AdicionalesPage />} />
              <Route path="/mantenciones-generales" element={<MantencionesGeneralesPage />} />
              <Route path="/dashboard-agentes" element={<DashboardAgentesPage />} />
              <Route path="/solicitantes" element={<SolicitantesPage />} />
              <Route path="/mantenciones-remotas" element={<MantencionesRemotasPage />} />
              <Route path="/visitas" element={<VisitasPage />} />
              <Route path="/reportes" element={<ReportesPage />} />
              <Route path="/ordenes-taller" element={<OrdenesTallerPage />} />
              <Route path="/Cotizaciones" element={<CotizacionesPage />} />
              <Route path="/rids/mailer" element={<MailerPage />} />
              <Route path="/Cotizaciones/enviadas" element={<CotizacionesEnviadasPage />} />
            </Route>

            {/* ── Técnicos ─────────────────────────────────────────────── */}
            <Route element={<RoleRoute allowedRoles={["ADMIN", "ADMINISTRACION", "TECNICO", "VENTAS"]} />}>
              <Route path="/tecnicos" element={<TecnicosPage />} />
            </Route>

            {/* ── Helpdesk — todos + CLIENTE ───────────────────────────── */}
            <Route element={<RoleRoute allowedRoles={["ADMIN", "ADMINISTRACION", "TECNICO", "VENTAS", "CLIENTE"]} />}>
              <Route path="/helpdesk" element={<HelpdeskLayout />}>
                <Route index element={<TicketeraRids />} />
                <Route path="tickets/:id" element={<TicketeraDetalle />} />
                {/* Dashboard y config solo para internos */}
                <Route element={<RoleRoute allowedRoles={["ADMIN", "ADMINISTRACION", "TECNICO", "VENTAS"]} />}>
                  <Route path="dashboard" element={<DashboardTecnicosdPage />} />
                  <Route path="tickets-dashboard" element={<TicketsDashboardPage />} />
                  <Route path="email-templates" element={<HelpdeskConfigPage />} />
                </Route>
              </Route>
            </Route>

            {/* ── Facturas ─────────────────────────────────────────────── */}
            <Route element={<RoleRoute allowedRoles={["ADMINISTRACION", "VENTAS", "CLIENTE"]} />}>
              <Route path="/finanzas" element={<FinanzasDashboardsPage />} />
              <Route path="/facturas" element={<FacturasBaseapiPage />} />
              <Route path="/facturas-baseapi" element={<Navigate to="/facturas" replace />} />
            </Route>

            {/* ── Cobranza (acceso restringido: solo Administración) ──────── */}
            {/* ── Finanzas / Cobranza (solo Administración) ─────────────── */}
            <Route
              element={
                <RoleRoute
                  allowedRoles={[
                    "ADMINISTRACION",
                  ]}
                />
              }
            >
              {/* Cobranza */}
              <Route
                path="/facturas/cobranza"
                element={
                  <CobranzaPage />
                }
              />

              {/* Receptores de facturación */}
              <Route
                path="/facturas/receptores"
                element={
                  <ReceptoresFacturacionPage />
                }
              />

              {/* Receptores de cobranza */}
              <Route
                path="/facturas/receptores-cobranza"
                element={
                  <ReceptoresCobranzaPage />
                }
              />
            </Route>

            {/* ── Conciliación RCV (solo Administración) ──────────────────── */}
            <Route element={<RoleRoute allowedRoles={["ADMINISTRACION"]} />}>
              <Route path="/conciliacion-rcv" element={<ConciliacionRcvPage />} />
            </Route>

            {/* ── Funnel comercial (mismos roles que el backend /api/oportunidades) ── */}
            <Route element={<RoleRoute allowedRoles={["ADMIN", "ADMINISTRACION", "VENTAS"]} />}>
              <Route path="/funnel" element={<FunnelPage />} />
            </Route>

          </Route>
        </Route>

        {/* Fallback */}
        <Route
          path="*"
          element={<Navigate to={isAuthed() ? getRootRedirect() : "/login"} replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}
