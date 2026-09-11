// src/components/modals-cobranza/buscarCorreoCliente.ts

const BASE_URL =
    (import.meta as any).env?.VITE_API_URL ??
    "http://localhost:4000/api";

/* =========================================================
   TYPES
========================================================= */

export type ContactoCobranza = {
    id: number;
    receptorId: number;
    nombre: string | null;
    email: string;
    activo: boolean;
    recibeCobranza: boolean;
    principal: boolean;
    origen: string;
    createdAt?: string;
    updatedAt?: string;
};

export type EmpresaReceptorCobranza = {
    id_empresa: number;
    nombre: string;
    razonSocial?: string | null;
    isActive?: boolean;
};

export type ReceptorCobranza = {
    id: number;
    rut: string;
    razonSocial: string | null;
    activo: boolean;
    recibeCobranza: boolean;
    diasCredito: number | null;
    empresaId: number | null;
    origen: string;
    createdAt?: string;
    updatedAt?: string;

    empresa?: EmpresaReceptorCobranza | null;

    contactos: ContactoCobranza[];
};

/* =========================================================
   HELPERS
========================================================= */

export function normalizarRut(
    rut: string
) {
    return String(
        rut ??
        ""
    )
        .replace(
            /[^0-9kK]/g,
            ""
        )
        .toUpperCase();
}

function normalizarEmail(
    email: string
) {
    return String(
        email ??
        ""
    )
        .trim()
        .toLowerCase();
}

function getAuthHeaders() {
    const token =
        localStorage.getItem(
            "accessToken"
        ) ??
        "";

    return {
        "Content-Type":
            "application/json",

        ...(token
            ? {
                Authorization:
                    `Bearer ${token}`,
            }
            : {}),
    };
}

/* =========================================================
   BUSCAR RECEPTOR POR RUT
========================================================= */

export async function buscarReceptorCobranzaPorRut(
    rut: string
): Promise<ReceptorCobranza | null> {
    try {
        const rutNorm =
            normalizarRut(
                rut
            );

        if (
            !rutNorm
        ) {
            return null;
        }

        const response =
            await fetch(
                `${BASE_URL}/baseapi/cobranza/receptores/rut/${encodeURIComponent(
                    rutNorm
                )}`,
                {
                    method:
                        "GET",

                    headers:
                        getAuthHeaders(),
                }
            );

        /*
         * Si no existe configuración de cobranza
         * para este RUT, no lo consideramos error
         * funcional del frontend.
         */
        if (
            response.status ===
            404
        ) {
            return null;
        }

        if (
            !response.ok
        ) {
            const body =
                await response
                    .json()
                    .catch(
                        () =>
                            null
                    );

            console.warn(
                "[COBRANZA FRONT] No se pudo obtener receptor",
                {
                    rut:
                        rutNorm,

                    status:
                        response.status,

                    error:
                        body?.error ??
                        body?.message ??
                        null,
                }
            );

            return null;
        }

        const json =
            await response.json();

        const raw =
            json?.data ??
            json?.receptor ??
            json;

        if (
            !raw ||
            typeof raw !==
            "object"
        ) {
            return null;
        }

        const contactos:
            ContactoCobranza[] =
            Array.isArray(
                raw.contactos
            )
                ? raw.contactos.map(
                    (
                        contacto:
                            any
                    ) => ({
                        id:
                            Number(
                                contacto.id
                            ),

                        receptorId:
                            Number(
                                contacto.receptorId ??
                                raw.id
                            ),

                        nombre:
                            contacto.nombre ??
                            null,

                        email:
                            normalizarEmail(
                                contacto.email
                            ),

                        activo:
                            Boolean(
                                contacto.activo
                            ),

                        recibeCobranza:
                            Boolean(
                                contacto.recibeCobranza
                            ),

                        principal:
                            Boolean(
                                contacto.principal
                            ),

                        origen:
                            String(
                                contacto.origen ??
                                "MANUAL"
                            ),

                        createdAt:
                            contacto.createdAt,

                        updatedAt:
                            contacto.updatedAt,
                    })
                )
                : [];

        return {
            id:
                Number(
                    raw.id
                ),

            rut:
                normalizarRut(
                    raw.rut
                ),

            razonSocial:
                raw.razonSocial ??
                null,

            activo:
                Boolean(
                    raw.activo
                ),

            recibeCobranza:
                Boolean(
                    raw.recibeCobranza
                ),

            diasCredito:
                raw.diasCredito ===
                    null ||
                    raw.diasCredito ===
                    undefined
                    ? null
                    : Number(
                        raw.diasCredito
                    ),

            empresaId:
                raw.empresaId ===
                    null ||
                    raw.empresaId ===
                    undefined
                    ? null
                    : Number(
                        raw.empresaId
                    ),

            origen:
                String(
                    raw.origen ??
                    "RCV"
                ),

            createdAt:
                raw.createdAt,

            updatedAt:
                raw.updatedAt,

            empresa:
                raw.empresa ??
                null,

            contactos,
        };
    } catch (
    error
    ) {
        console.error(
            "[COBRANZA FRONT] Error buscando receptor por RUT",
            error
        );

        return null;
    }
}

/* =========================================================
   OBTENER CONTACTOS HABILITADOS
========================================================= */

export async function buscarContactosCobranzaPorRut(
    rut: string
): Promise<ContactoCobranza[]> {
    const receptor =
        await buscarReceptorCobranzaPorRut(
            rut
        );

    if (
        !receptor ||
        !receptor.activo ||
        !receptor.recibeCobranza
    ) {
        return [];
    }

    return receptor.contactos
        .filter(
            (
                contacto
            ) =>
                contacto.activo &&
                contacto.recibeCobranza &&
                Boolean(
                    contacto.email
                        ?.trim()
                )
        )
        .sort(
            (
                a,
                b
            ) => {
                if (
                    a.principal !==
                    b.principal
                ) {
                    return Number(
                        b.principal
                    ) -
                        Number(
                            a.principal
                        );
                }

                return a.email.localeCompare(
                    b.email
                );
            }
        );
}

/* =========================================================
   COMPATIBILIDAD LEGACY
========================================================= */

/*
 * Puedes mantener temporalmente esta función porque
 * otro componente antiguo podría seguir importándola.
 *
 * Ahora igualmente usa ReceptorCobranza como fuente.
 */
export async function buscarCorreoPorRut(
    rut: string
): Promise<string> {
    const contactos =
        await buscarContactosCobranzaPorRut(
            rut
        );

    return contactos[0]
        ?.email ??
        "";
}