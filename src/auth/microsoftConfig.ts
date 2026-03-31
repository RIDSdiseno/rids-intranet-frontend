import {
  PublicClientApplication,
  LogLevel,
  type Configuration,
} from "@azure/msal-browser";

/* =========================
   Variables de entorno
========================= */
const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID as string | undefined;
const tenantId = import.meta.env.VITE_MICROSOFT_TENANT_ID as string | undefined;

/* =========================
   Validación obligatoria
========================= */
if (!clientId || !tenantId) {
  const missingVars = [
    !clientId ? "VITE_MICROSOFT_CLIENT_ID" : null,
    !tenantId ? "VITE_MICROSOFT_TENANT_ID" : null,
  ]
    .filter(Boolean)
    .join(", ");

  throw new Error(`❌ Faltan variables de entorno de Microsoft: ${missingVars}`);
}

/* =========================
   Configuración MSAL
========================= */
const msalConfig: Configuration = {
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
          default:
            break;
        }
      },
      piiLoggingEnabled: false,
      logLevel: LogLevel.Info,
    },
  },
};

/* =========================
   Instancia única
========================= */
export const pca = new PublicClientApplication(msalConfig);

/* Compatibilidad si aún tienes imports viejos */
export const msalInstance = pca;

/* =========================
   Inicialización única
========================= */
let msalInitialized = false;

export const initializeMsal = async (): Promise<void> => {
  if (msalInitialized) return;

  await pca.initialize();
  msalInitialized = true;

  const response = await pca.handleRedirectPromise();

  if (response?.account) {
    pca.setActiveAccount(response.account);
    return;
  }

  const active = pca.getActiveAccount();
  if (active) return;

  const accounts = pca.getAllAccounts();
  if (accounts.length > 0) {
    pca.setActiveAccount(accounts[0]);
  }
};

/* =========================
   Login request
========================= */
export const loginRequest = {
  scopes: ["openid", "profile", "email", "User.Read"],
};

export const getActiveMsalAccount = () => pca.getActiveAccount();

export const logoutMicrosoft = async () => {
  await initializeMsal();

  await pca.logoutPopup({
    account: pca.getActiveAccount() ?? undefined,
    postLogoutRedirectUri: window.location.origin,
    mainWindowRedirectUri: window.location.origin,
  });
};