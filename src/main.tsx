// src/main.tsx  (o src/index.tsx si así se llama en tu proyecto)
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import 'antd/dist/reset.css';

import { MsalProvider } from "@azure/msal-react";
import { pca } from "./auth/msal"; // <-- crea src/auth/msal.ts como te indiqué

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MsalProvider instance={pca}>
      <App />
    </MsalProvider>
  </React.StrictMode>
);
