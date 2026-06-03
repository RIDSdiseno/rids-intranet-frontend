// src/main.tsx
// ─── Mejoras respecto al original ───────────────────────────────────────────
//
//  1. `ConfigProvider` recibe el tema Ant Design dinámicamente basado en
//     `resolvedTheme` del contexto → los componentes antd (Drawer, Modal,
//     Table, Select…) usan el token system oficial, no sobreescrituras CSS.
//  2. El wrapper `AntdThemeSync` lee el contexto y actualiza antd en tiempo
//     real cuando el usuario cambia el tema.

import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

import { MsalProvider } from "@azure/msal-react";
import { pca, initializeMsal } from "./auth/microsoftConfig";

import { ConfigProvider, theme as antdTheme } from "antd";
import esES from "antd/locale/es_ES";

import dayjs from "dayjs";
import "dayjs/locale/es";

import {
  AccessibilityProvider,
  useAccessibility,
  getResolvedTheme,
  readInitialSettings,           // re-exportado desde el contexto
  applyAccessibilityClasses,
} from "./context/AccessibilityContext";

dayjs.locale("es");

// ── Wrapper que sincroniza el tema de Ant Design con el contexto de a11y ─────
//
// IMPORTANTE: este componente debe estar DENTRO de AccessibilityProvider
// para poder usar el hook.

function AntdThemeSync({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useAccessibility();

  return (
    <ConfigProvider
      locale={esES}
      theme={{
        algorithm:
          resolvedTheme === "dark"
            ? antdTheme.darkAlgorithm
            : antdTheme.defaultAlgorithm,
        token: {
          // Tokens de color base coherentes con la paleta de la app
          colorPrimary: "#0891b2",  // cyan-600 — igual que en EmpresasPage
          colorSuccess: "#059669",  // emerald-600
          colorWarning: "#d97706",  // amber-600
          colorError: "#dc2626",  // red-600
          colorInfo: "#2563eb",  // blue-600
          borderRadius: 10,
          fontFamily: "inherit",  // respetar la fuente del resto de la app
        },
        components: {
          // Drawer y Modal con radio redondeado coherente
          Drawer: { paddingLG: 20 },
          Modal: { borderRadiusLG: 16 },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Bootstrap
// ────────────────────────────────────────────────────────────────────────────

async function startApp() {
  // Aplicar clases de a11y de forma síncrona antes de montar React
  // (el provider también lo hace, pero esto cubre el gap antes de que
  // React monte si hay algún delay en el hydration)
  applyAccessibilityClasses(readInitialSettings());

  try {
    await initializeMsal();
    console.log("✅ MSAL inicializado correctamente");
  } catch (error) {
    console.error("❌ Error inicializando MSAL:", error);
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <MsalProvider instance={pca}>
        <AccessibilityProvider>
          {/*
            AntdThemeSync debe ir DENTRO de AccessibilityProvider
            para poder leer el contexto y pasarlo a ConfigProvider
          */}
          <AntdThemeSync>
            <App />
          </AntdThemeSync>
        </AccessibilityProvider>
      </MsalProvider>
    </React.StrictMode>
  );
}

startApp();