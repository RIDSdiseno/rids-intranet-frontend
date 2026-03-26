import { PublicClientApplication, LogLevel } from "@azure/msal-browser";

// 🔥 Validaciones de entorno
const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
const tenantId = import.meta.env.VITE_MICROSOFT_TENANT_ID;

if (!clientId) {
  console.error("❌ Falta VITE_MICROSOFT_CLIENT_ID");
}

if (!tenantId) {
  console.error("❌ Falta VITE_MICROSOFT_TENANT_ID");
}

// 🔥 Crear UNA sola instancia global
export const pca = new PublicClientApplication({
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: window.location.origin, // ✅ clave para prod
    navigateToLoginRequestUrl: false, // 🔥 evita loops raros
  },

  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },

  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;

        switch (level) {
          case LogLevel.Error:
            console.error("MSAL ERROR:", message);
            break;
          case LogLevel.Info:
            console.info("MSAL INFO:", message);
            break;
          case LogLevel.Verbose:
            console.debug("MSAL DEBUG:", message);
            break;
          case LogLevel.Warning:
            console.warn("MSAL WARNING:", message);
            break;
        }
      },
    },
  },
});

// 🔥 MUY IMPORTANTE: manejar respuesta redirect (aunque uses popup)
pca.handleRedirectPromise().then((response) => {
  if (response) {
    console.log("✅ Redirect response recibida:", response);
  }
}).catch((error) => {
  console.error("❌ Error en redirect:", error);
});

// 🔥 Scopes correctos
export const loginRequest = {
  scopes: ["openid", "profile", "email", "User.Read"],
};