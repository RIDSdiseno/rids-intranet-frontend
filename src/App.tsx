// App.tsx
import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginRids from "./host/login";
import Home from "./host/Home";
import SolicitanesPage from "./host/Solicitantes";

// Páginas lazy
const VisitasPage    = lazy(() => import("./host/VisitasPage"));
const EquiposPage    = lazy(() => import("./host/EquiposPage"));
const TicketsPage    = lazy(() => import("./host/Ticket"));
const EmpresasPage   = lazy(() => import("./host/EmpresasPage"));
const ReportesPage   = lazy(() => import("./host/Reportes"));
const DocumentosPage = lazy(() => import("./host/DocumentosPage")); // 👈 NUEVO
const OrdenesTallerPage = lazy(() => import("./host/OrdenesTaller"));
const Cotizaciones = lazy(() => import("./host/Cotizaciones"));


const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem("accessToken");
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  const hasSession = !!localStorage.getItem("accessToken");

  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: 16 }}>Cargando…</div>}>
        <Routes>
          <Route path="/login" element={<LoginRids />} />

          <Route
            path="/home"
            element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            }
          />

          <Route
            path="/solicitantes"
            element={
              <PrivateRoute>
                <SolicitanesPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/equipos"
            element={
              <PrivateRoute>
                <EquiposPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/OrdenesTaller"
            element={
              <PrivateRoute>
                <OrdenesTallerPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/Cotizaciones"
            element={
              <PrivateRoute>
                <Cotizaciones />
              </PrivateRoute>
            }
          />

          <Route
            path="/visitas"
            element={
              <PrivateRoute>
                <VisitasPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/tickets"
            element={
              <PrivateRoute>
                <TicketsPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/empresas"
            element={
              <PrivateRoute>
                <EmpresasPage />
              </PrivateRoute>
            }
          />

          <Route
            path="/reportes"
            element={
              <PrivateRoute>
                <ReportesPage />
              </PrivateRoute>
            }
          />

          {/* 👇 NUEVO: Documentos */}
          <Route
            path="/documentos"
            element={
              <PrivateRoute>
                <DocumentosPage />
              </PrivateRoute>
            }
          />

          <Route path="/" element={<Navigate to={hasSession ? "/home" : "/login"} replace />} />
          <Route path="*" element={<Navigate to={hasSession ? "/home" : "/login"} replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;
