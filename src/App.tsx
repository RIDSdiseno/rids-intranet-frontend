// src/App.tsx
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import Header from "./components/Header";

/* =========================
   Lazy Pages (HOST)
========================= */

const HomePage = lazy(() => import("./host/Home"));
const SolicitantesPage = lazy(() => import("./host/Solicitantes"));
const VisitasPage = lazy(() => import("./host/VisitasPage"));
const EquiposPage = lazy(() => import("./host/EquiposPage"));
const TicketsPage = lazy(() => import("./host/Ticket"));
const EmpresasPage = lazy(() => import("./host/EmpresasPage"));
const ReportesPage = lazy(() => import("./host/Reportes"));
const DocumentosPage = lazy(() => import("./host/DocumentosPage"));
const OrdenesTallerPage = lazy(() => import("./host/OrdenesTaller"));
const CotizacionesPage = lazy(() => import("./host/Cotizaciones"));
const CotizacionesEnviadasPage = lazy(() => import("./host/CotizacionesEnviadas"));
const MailerPage = lazy(() => import("./host/Mailer"));
const CobranzaPage = lazy(() => import("./host/Cobranza"));
const ClientesPage = lazy(() => import("./host/ClientesGestiooPage"));
const ProductosPage = lazy(() => import("./host/ProductosCotiPage"));
const FacturasDashboardPage = lazy(() => import("./host/FacturasDashboard"));
const ConciliacionPage = lazy(() => import("./host/Conciliacion"));
const ConciliacionEcconetPage = lazy(() => import("./host/ConciliacionEcconet"));

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

const FacturasBaseapiPage = lazy(() => import("./host/facturasBaseapi"));

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

function getUserEmail(): string | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;

    const email = JSON.parse(raw)?.email;

    return email ? String(email).toLowerCase().trim() : null;
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
    const fallback = rolNormalizado === "CLIENTE" ? "/helpdesk" : "/home";
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

  if (rol === "CLIENTE") return "/facturas-baseapi";
  if (rol === "ADMINISTRACION") return "/facturas-baseapi";
  if (rol === "VENTAS") return "/facturas-baseapi";

  return "/home";
}

/* =========================
   Layout con Sidebar
========================= */

function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Header />
      <main className="flex-1 min-w-0 bg-white overflow-y-auto">
        <Suspense fallback={<div className="p-6">Cargando...</div>}>
          <Outlet />
        </Suspense>
      </main>
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
            </Route>

            {/* ── Solo ADMIN y ADMINISTRACION ──────────────────────────── */}
            <Route element={<RoleRoute allowedRoles={["ADMIN", "ADMINISTRACION"]} />}>
              <Route path="/clientes-ext" element={<ClientesExtPage />} />
            </Route>

            {/* ── Internos + CLIENTE (backend filtra por empresa) ─────── */}
            <Route element={<RoleRoute allowedRoles={["ADMIN", "ADMINISTRACION", "TECNICO", "VENTAS", "CLIENTE"]} />}>
              <Route path="/empresas" element={<EmpresasPage />} />
              <Route path="/equipos" element={<EquiposPage />} />
              <Route path="/solicitantes" element={<SolicitantesPage />} />
              <Route path="/mantenciones-remotas" element={<MantencionesRemotasPage />} />
              <Route path="/visitas" element={<VisitasPage />} />
              <Route path="/reportes" element={<ReportesPage />} />
              <Route path="/OrdenesTaller" element={<OrdenesTallerPage />} />
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
              <Route path="/facturas-baseapi" element={<FacturasBaseapiPage />} />
            </Route>

            {/* ── Cobranza (acceso restringido) ───────────────────────────── */}
            <Route element={<RoleRoute allowedRoles={["ADMIN", "ADMINISTRACION", "VENTAS"]} />}>
              <Route path="/facturas/cobranza" element={<CobranzaPage />} />
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