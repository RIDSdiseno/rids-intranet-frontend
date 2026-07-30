const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:4000/api";

export function normalizarRut(rut: string) {
    return String(rut ?? "").replace(/[^0-9kK]/g, "").toLowerCase();
}

function getAuthHeaders() {
    const token = localStorage.getItem("accessToken") ?? "";
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

/** Intenta encontrar un correo de contacto para el RUT del cliente, buscando en Empresas (DetalleEmpresa/Solicitantes) */
export async function buscarCorreoPorRut(rut: string): Promise<string> {
    try {
        const rutNorm = normalizarRut(rut);
        if (!rutNorm) return "";

        const cacheKey = "cobranza:empresas-full";
        let data: any[] | null = null;
        try {
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) data = JSON.parse(cached);
        } catch { /* ignore */ }

        if (!data) {
            const res = await fetch(`${BASE_URL}/empresas?full=1`, { headers: getAuthHeaders() });
            if (!res.ok) return "";
            const json = await res.json();
            data = Array.isArray(json?.data) ? json.data : [];
            try { sessionStorage.setItem(cacheKey, JSON.stringify(data)); } catch { /* ignore */ }
        }

        const match = (data ?? []).find((e: any) => normalizarRut(e?.detalleEmpresa?.rut ?? "") === rutNorm);
        if (!match) return "";

        if (match.detalleEmpresa?.email) return String(match.detalleEmpresa.email);

        const primerSolicitanteConEmail = (match.solicitantes ?? []).find((s: any) => s?.email);
        return primerSolicitanteConEmail?.email ?? "";
    } catch {
        return "";
    }
}
