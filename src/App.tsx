// App.tsx
import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import LoginRids from "./host/login";
import Home from "./host/Home";
import SolicitanesPage from "./host/Solicitantes";

import AppLayout from "./layouts/AppLayout";

// Páginas lazy
const VisitasPage = lazy(() => import("./host/VisitasPage"));
const EquiposPage = lazy(() => import("./host/EquiposPage"));
const TicketsPage = lazy(() => import("./host/Ticket"));
const EmpresasPage = lazy(() => import("./host/EmpresasPage"));
const ReportesPage = lazy(() => import("./host/Reportes"));
const DocumentosPage = lazy(() => import("./host/DocumentosPage")); // 👈 NUEVO
const OrdenesTallerPage = lazy(() => import("./host/OrdenesTaller"));
const Cotizaciones = lazy(() => import("./host/Cotizaciones"));

const ClientesPage = lazy(() => import("./host/ClientesGestiooPage"));
const ProductosPage = lazy(() => import("./host/ProductosCotiPage"));

const TicketeraRids = lazy(() => import("./host/TicketeraRids"));

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
            <Route path="/home" element={<Home />} />
            <Route path="/solicitantes" element={<SolicitanesPage />} />
            <Route path="/equipos" element={<EquiposPage />} />
            <Route path="/OrdenesTaller" element={<OrdenesTallerPage />} />
            <Route path="/Cotizaciones" element={<Cotizaciones />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/productos" element={<ProductosPage />} />
            <Route path="/visitas" element={<VisitasPage />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/helpdesk" element={<TicketeraRids />} />
            <Route path="/empresas" element={<EmpresasPage />} />
            <Route path="/reportes" element={<ReportesPage />} />
            <Route path="/documentos" element={<DocumentosPage />} />
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
