// src/components/portal-cliente/empresaCliente.ts
// Grupos de empresas · G2a: empresa elegida por un usuario CLIENTE con «Ver todo el grupo».
//
// La selección vive en el mismo objeto `user` de localStorage:
//   - user.empresaIdPropia → empresa del login (se guarda al elegir otra por primera vez)
//   - user.empresaId       → empresa que se está viendo
// Así, el código que arma URLs con user.empresaId sigue funcionando, y el login
// (que reescribe `user`) vuelve siempre a la empresa propia.

type UsuarioLocal = Record<string, unknown> & {
    rol?: unknown;
    empresaId?: unknown;
    empresaIdPropia?: unknown;
};

function leerUsuario(): UsuarioLocal | null {
    try {
        const raw = localStorage.getItem("user");
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        return parsed && typeof parsed === "object" ? (parsed as UsuarioLocal) : null;
    } catch {
        return null;
    }
}

function guardarUsuario(user: UsuarioLocal): void {
    localStorage.setItem("user", JSON.stringify(user));
}

function esCliente(user: UsuarioLocal | null): user is UsuarioLocal {
    return String(user?.rol ?? "").toUpperCase().trim() === "CLIENTE";
}

/** Valor del header X-Empresa-Id (null = su propia empresa, no se envía header). */
export function empresaClienteParaHeader(): number | null {
    const user = leerUsuario();
    if (!esCliente(user)) return null;
    const actual = user.empresaId;
    const propia = user.empresaIdPropia;
    if (typeof actual !== "number" || typeof propia !== "number") return null;
    return actual !== propia ? actual : null;
}

/** Empresa que el cliente está viendo ahora (o null si no es cliente). */
export function empresaClienteActual(): number | null {
    const user = leerUsuario();
    if (!esCliente(user)) return null;
    return typeof user.empresaId === "number" ? user.empresaId : null;
}

/** Cambia la empresa que se está viendo. No recarga la página. */
export function seleccionarEmpresaCliente(empresaId: number): void {
    const user = leerUsuario();
    if (!esCliente(user)) return;
    const propia = typeof user.empresaIdPropia === "number" ? user.empresaIdPropia : user.empresaId;
    guardarUsuario({ ...user, empresaIdPropia: propia, empresaId });
}

/** Vuelve a la empresa propia. Devuelve true si había otra empresa elegida. */
export function restablecerEmpresaCliente(): boolean {
    const user = leerUsuario();
    if (!esCliente(user) || typeof user.empresaIdPropia !== "number") return false;
    const cambio = user.empresaId !== user.empresaIdPropia;
    const { empresaIdPropia, ...resto } = user;
    guardarUsuario({ ...resto, empresaId: empresaIdPropia });
    return cambio;
}