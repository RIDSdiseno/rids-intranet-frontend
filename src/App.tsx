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
const TicketeraRids = lazy(() => import("./host/TicketeraRids"));
const MantencionesRemotasPage = lazy(() => import("./host/MantencionesRemotasPage"));
const TecnicosPage = lazy(() => import("./host/TecnicosPage"));
const ForgotPasswordPage = lazy(() => import("./host/ForgotPassword"));
const ResetPasswordPage = lazy(() => import("./host/ResetPassword"));


const LoginPage = lazy(() => import("./host/login"));

/* =========================
   Auth
========================= */

function isAuthed(): boolean {
  return !!(
    localStorage.getItem("accessToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("jwt")
  );
}

function ProtectedRoute() {
  if (!isAuthed()) return <Navigate to="/login" replace />;
  return <Outlet />;
}

/* =========================
   Layout con Sidebar
========================= */

function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Header />
      <main className="flex-1 bg-white overflow-y-auto">
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

        {/* LOGIN */}
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

        {/* PROTEGIDO */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>

            <Route path="/" element={<Navigate to="/home" replace />} />

            <Route path="/home" element={<HomePage />} />
            <Route path="/solicitantes" element={<SolicitantesPage />} />
            <Route path="/visitas" element={<VisitasPage />} />
            <Route path="/mantenciones-remotas" element={<MantencionesRemotasPage />} />
            <Route path="/equipos" element={<EquiposPage />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/empresas" element={<EmpresasPage />} />
            <Route path="/reportes" element={<ReportesPage />} />
            <Route path="/documentos" element={<DocumentosPage />} />
            <Route path="/OrdenesTaller" element={<OrdenesTallerPage />} />
            <Route path="/Cotizaciones" element={<CotizacionesPage />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/productos" element={<ProductosPage />} />
            <Route path="/helpdesk" element={<TicketeraRids />} />
            <Route path="/tecnicos" element={<TecnicosPage />} />

          </Route>
        </Route>

        {/* fallback */}
        <Route path="*" element={<Navigate to={isAuthed() ? "/home" : "/login"} replace />} />

      </Routes>
    </BrowserRouter>
  );
}