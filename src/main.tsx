import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

import { MsalProvider } from "@azure/msal-react";
import { pca, initializeMsal } from "./auth/microsoftConfig";

import { ConfigProvider } from "antd";
import esES from "antd/locale/es_ES";

import dayjs from "dayjs";
import "dayjs/locale/es";

dayjs.locale("es");

async function startApp() {
  try {
    await initializeMsal();
    console.log("✅ MSAL inicializado correctamente");
  } catch (error) {
    console.error("❌ Error inicializando MSAL:", error);
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