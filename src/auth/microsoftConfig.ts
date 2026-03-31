import { PublicClientApplication, LogLevel } from "@azure/msal-browser";

// ENV
const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
const tenantId = import.meta.env.VITE_MICROSOFT_TENANT_ID;

if (!clientId) console.error("❌ Falta VITE_MICROSOFT_CLIENT_ID");
if (!tenantId) console.error("❌ Falta VITE_MICROSOFT_TENANT_ID");

// Instancia única
export const msalInstance = new PublicClientApplication({
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: window.location.origin,
    navigateToLoginRequestUrl: false,
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
          case LogLevel.Warning:
            console.warn("MSAL WARNING:", message);
            break;
          case LogLevel.Info:
            console.info("MSAL INFO:", message);
            break;
          case LogLevel.Verbose:
            console.debug("MSAL DEBUG:", message);
            break;
        }
      },
    },
  },
});

// scopes
export const loginRequest = {
  scopes: ["openid", "profile", "email", "User.Read"],
};