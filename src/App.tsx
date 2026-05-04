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
const ClientesPage = lazy(() => import("./host/ClientesGestiooPage"));
const ProductosPage = lazy(() => import("./host/ProductosCotiPage"));
const FacturasDashboardPage = lazy(() => import("./host/FacturasDashboard"));

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

  if (!rol || !allowedRoles.includes(rol)) {
    return <Navigate to={rol === "CLIENTE" ? "/empresas" : "/home"} replace />;
  }

  return <Outlet />;
}

// Acceso exclusivo por email — módulo Cobranza
const COBRANZA_EMAILS = ["carenas@rids.cl", "dbravo@rids.cl", "igonzalez@rids.cl"];

const USUARIOS_GESTION_TECNICOS_CLIENTES = [
  "dbravo@rids.cl",
  "carenas@rids.cl",
  "igonzalez@rids.cl",
  "rcalsin@rids.cl",
  "mahumada@rids.cl",
];

function CobranzaRoute() {
  const email = getUserEmail();
  const rol = getUserRol();

  const isCliente = rol === "CLIENTE";
  const isEmailPermitido = !!email && COBRANZA_EMAILS.includes(email);

  if (!isCliente && !isEmailPermitido) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}

function GestionTecnicosClientesRoute() {
  const email = getUserEmail();

  const autorizado =
    !!email && USUARIOS_GESTION_TECNICOS_CLIENTES.includes(email);

  if (!autorizado) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}

function getRootRedirect(): string {
  const rol = getUserRol();
  if (rol === "CLIENTE") return "/empresas";
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
        <Route
          path="/login"
          element={
            <Suspense fallback={<div>Cargando...</div>}>
              <LoginPage />
            </Suspense>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <Suspense fallback={<div>Cargando...</div>}>
              <ForgotPasswordPage />
            </Suspense>
          }
        />
        <Route
          path="/reset-password"
          element={
            <Suspense fallback={<div>Cargando...</div>}>
              <ResetPasswordPage />
            </Suspense>
          }
        />

        <Route path="/" element={<Navigate to={getRootRedirect()} replace />} />

        {/* ===== RUTAS PROTEGIDAS (requieren login) ===== */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>

            <Route path="/" element={<Navigate to="/home" replace />} />

            {/* Accesibles por TODOS los roles */}
            <Route path="/empresas" element={<EmpresasPage />} />
            <Route path="/solicitantes" element={<SolicitantesPage />} />
            <Route path="/equipos" element={<EquiposPage />} />
            <Route path="/visitas" element={<VisitasPage />} />
            <Route path="/reportes" element={<ReportesPage />} />
            <Route path="/mantenciones-remotas" element={<MantencionesRemotasPage />} />

            {/* Solo TECNICO y ADMIN */}
            <Route element={<RoleRoute allowedRoles={["TECNICO", "ADMIN"]} />}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/agenda" element={<AgendaPage />} />
              <Route path="/OrdenesTaller" element={<OrdenesTallerPage />} />
              <Route path="/Cotizaciones" element={<CotizacionesPage />} />
              <Route path="/clientes" element={<ClientesPage />} />
              <Route path="/productos" element={<ProductosPage />} />
              <Route path="/documentos" element={<DocumentosPage />} />
              <Route path="/tickets" element={<TicketsPage />} />

              {/* Helpdesk completo solo para TECNICO/ADMIN */}
              <Route path="/helpdesk" element={<HelpdeskLayout />}>
                <Route index element={<TicketeraRids />} />
                <Route path="dashboard" element={<DashboardTecnicosdPage />} />
                <Route path="tickets-dashboard" element={<TicketsDashboardPage />} />
                <Route path="tickets/:id" element={<TicketeraDetalle />} />
                <Route path="email-templates" element={<HelpdeskConfigPage />} />
              </Route>
            </Route>

            {/* Técnicos y Clientes Externos — solo emails permitidos */}
            <Route element={<RoleRoute allowedRoles={["TECNICO", "ADMIN"]} />}>
              <Route element={<GestionTecnicosClientesRoute />}>
                <Route path="/tecnicos" element={<TecnicosPage />} />
                <Route path="/clientes-ext" element={<ClientesExtPage />} />
              </Route>
            </Route>

            {/* Cobranza — solo emails permitidos (independiente del rol) */}
            <Route element={<CobranzaRoute />}>
              <Route path="/facturas" element={<FacturasDashboardPage />} />
              <Route path="/cobranza" element={<FacturasDashboardPage />} />
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