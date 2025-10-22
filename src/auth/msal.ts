// src/auth/msal.ts
import { PublicClientApplication } from "@azure/msal-browser";

export const pca = new PublicClientApplication({
  auth: {
    clientId: import.meta.env.VITE_AAD_CLIENT_ID!,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AAD_TENANT_ID}`,
    redirectUri: window.location.origin,
  },
  cache: { cacheLocation: "localStorage" },
});

export const loginRequest = { scopes: ["User.Read", "Sites.Read.All", "Files.Read.All"] };

