// src/auth/msal.ts
import { PublicClientApplication } from "@azure/msal-browser";

export const pca = new PublicClientApplication({
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID!,
    authority: "https://login.microsoftonline.com/organizations",
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
});

export const loginRequest = {
  scopes: ["openid", "profile", "email", "User.Read"],
};