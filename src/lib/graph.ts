import { Client } from "@microsoft/microsoft-graph-client";
import { pca, loginRequest } from "../auth/msal";

export async function getGraph() {
  const accounts = pca.getAllAccounts();
  if (!accounts.length) await pca.loginPopup(loginRequest);
  const account = pca.getAllAccounts()[0];
  const token = await pca.acquireTokenSilent({ ...loginRequest, account })
    .catch(() => pca.acquireTokenPopup(loginRequest));

  return Client.init({
    authProvider: (done) => done(null, token.accessToken),
  });
}
