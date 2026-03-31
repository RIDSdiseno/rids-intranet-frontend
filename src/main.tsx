import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

import { MsalProvider } from "@azure/msal-react";
import { pca } from "./auth/msal";

import { ConfigProvider } from "antd";
import esES from "antd/locale/es_ES";

import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

// Inicializar MSAL antes de renderizar
async function startApp() {
  try {
    await pca.initialize();

    // ✅ bandera global segura
    (window as any).msalReady = true;

  } catch (error) {
    console.error("❌ Error inicializando MSAL:", error);

    // evita que la app quede bloqueada
    (window as any).msalReady = false;
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <MsalProvider instance={pca}>
        <ConfigProvider locale={esES}>
          <App />
        </ConfigProvider>
      </MsalProvider>
    </React.StrictMode>
  );
}

startApp();