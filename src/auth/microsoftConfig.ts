import { PublicClientApplication, LogLevel } from "@azure/msal-browser";

// 🔥 Validaciones básicas de env
const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
const tenantId = import.meta.env.VITE_MICROSOFT_TENANT_ID;

if (!clientId) {
  console.error("❌ Falta VITE_MICROSOFT_CLIENT_ID");
}

if (!tenantId) {
  console.error("❌ Falta VITE_MICROSOFT_TENANT_ID");
}

export const pca = new PublicClientApplication({
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: window.location.origin, // 🔥 dinámico (clave para prod)
  },

  cache: {
    cacheLocation: "localStorage", // ✅ mantiene sesión
    storeAuthStateInCookie: false, // ⚠️ solo true si hay problemas en Safari/IE
  },

  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        if (level === LogLevel.Error) console.error(message);
        if (level === LogLevel.Info) console.info(message);
        if (level === LogLevel.Verbose) console.debug(message);
        if (level === LogLevel.Warning) console.warn(message);
      },
    },
  },
});

// 🔥 scopes mínimos + compatibilidad Microsoft
export const loginRequest = {
  scopes: ["openid", "profile", "email", "User.Read"],
};