// App.tsx
import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginRids from "./host/login";
import Home from "./host/Home";
import SolicitanesPage from "./host/Solicitantes";

import AppLayout from "./layouts/AppLayout";

// Lazy pages
const VisitasPage = lazy(() => import("./host/VisitasPage"));
const EquiposPage = lazy(() => import("./host/EquiposPage"));
const TicketsPage = lazy(() => import("./host/Ticket"));
const EmpresasPage = lazy(() => import("./host/EmpresasPage"));
const ReportesPage = lazy(() => import("./host/Reportes"));
const DocumentosPage = lazy(() => import("./host/DocumentosPage"));
const OrdenesTallerPage = lazy(() => import("./host/OrdenesTaller"));
const Cotizaciones = lazy(() => import("./host/Cotizaciones"));
const ClientesPage = lazy(() => import("./host/ClientesGestiooPage"));
const ProductosPage = lazy(() => import("./host/ProductosCotiPage"));
const TicketeraRids = lazy(() => import("./host/TicketeraRids"));

/* =========================
   PrivateRoute inteligente
========================= */
const PrivateRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: string[];
}> = ({ children, allowedRoles }) => {
  const token = localStorage.getItem("accessToken");
  const rawUser = localStorage.getItem("user");
  const user = rawUser ? JSON.parse(rawUser) : null;

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.rol)) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const hasSession = !!localStorage.getItem("accessToken");

  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: 16 }}>Cargando…</div>}>
        <Routes>

          {/* LOGIN */}
          <Route path="/login" element={<LoginRids />} />

          {/* RUTAS PRIVADAS CON LAYOUT */}
          <Route
            element={
              <PrivateRoute>
                <AppLayout />
              </PrivateRoute>
            }
          >

            {/* RUTAS DISPONIBLES A TODOS LOS AUTENTICADOS */}
            <Route path="/home" element={<Home />} />
            <Route path="/solicitantes" element={<SolicitanesPage />} />
            <Route path="/equipos" element={<EquiposPage />} />
            <Route path="/visitas" element={<VisitasPage />} />
            <Route path="/empresas" element={<EmpresasPage />} />

            {/* RUTAS SOLO ADMIN */}
            <Route
              path="/OrdenesTaller"
              element={
                <PrivateRoute allowedRoles={["TECNICO"]}>
                  <OrdenesTallerPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/Cotizaciones"
              element={
                <PrivateRoute allowedRoles={["TECNICO"]}>
                  <Cotizaciones />
                </PrivateRoute>
              }
            />

            <Route
              path="/clientes"
              element={
                <PrivateRoute allowedRoles={["TECNICO"]}>
                  <ClientesPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/productos"
              element={
                <PrivateRoute allowedRoles={["TECNICO"]}>
                  <ProductosPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/tickets"
              element={
                <PrivateRoute allowedRoles={["TECNICO"]}>
                  <TicketsPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/helpdesk"
              element={
                <PrivateRoute allowedRoles={["TECNICO"]}>
                  <TicketeraRids />
                </PrivateRoute>
              }
            />

            <Route
              path="/reportes"
              element={
                <PrivateRoute allowedRoles={["TECNICO"]}>
                  <ReportesPage />
                </PrivateRoute>
              }
            />

            <Route
              path="/documentos"
              element={
                <PrivateRoute allowedRoles={["TECNICO"]}>
                  <DocumentosPage />
                </PrivateRoute>
              }
            />

          </Route>

          {/* REDIRECCIONES */}
          <Route
            path="/"
            element={<Navigate to={hasSession ? "/home" : "/login"} replace />}
          />
          <Route
            path="*"
            element={<Navigate to={hasSession ? "/home" : "/login"} replace />}
          />

        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;