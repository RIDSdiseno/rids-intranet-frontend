// src/components/modals-facturasBaseapi/receptores-cobranza/ReceptoresCobranzaPage.tsx

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    AlertCircle,
    Building2,
    CheckCircle2,
    Contact,
    CreditCard,
    Plus,
    RefreshCw,
    Search,
    Settings2,
} from "lucide-react";

import {
    getCobranzaReceptoresApiError,
    listarReceptoresCobranza,
    type ReceptorCobranza,
} from "./cobranzaReceptoresApi";

import ReceptorCobranzaModal
    from "./ReceptorCobranzaModal";

import ReceptorCobranzaCrearModal
    from "./ReceptorCobranzaCrearModal";

/* =========================================================
   HELPERS
========================================================= */

function formatRut(
    rut:
        string
) {
    const clean =
        String(
            rut ??
            ""
        )
            .replace(
                /[^0-9kK]/g,
                ""
            )
            .toUpperCase();

    if (
        clean.length <
        2
    ) {
        return clean;
    }

    const cuerpo =
        clean.slice(
            0,
            -1
        );

    const dv =
        clean.slice(
            -1
        );

    const cuerpoFormateado =
        cuerpo.replace(
            /\B(?=(\d{3})+(?!\d))/g,
            "."
        );

    return `${cuerpoFormateado}-${dv}`;
}

function Badge(
    {
        children,
        variant =
        "neutral",
    }:
        {
            children:
            React.ReactNode;

            variant?:
            | "neutral"
            | "success"
            | "warning"
            | "info"
            | "danger";
        }
) {
    const classes = {
        neutral:
            "border-slate-200 bg-slate-50 text-slate-600",

        success:
            "border-emerald-200 bg-emerald-50 text-emerald-700",

        warning:
            "border-amber-200 bg-amber-50 text-amber-700",

        info:
            "border-cyan-200 bg-cyan-50 text-cyan-700",

        danger:
            "border-rose-200 bg-rose-50 text-rose-700",
    };

    return (
        <span
            className={`
                inline-flex
                items-center
                rounded-full
                border
                px-2.5
                py-1
                text-xs
                font-semibold
                ${classes[
                variant
                ]}
            `}
        >
            {children}
        </span>
    );
}

/* =========================================================
   PAGE
========================================================= */

export default function ReceptoresCobranzaPage() {
    const [
        receptores,
        setReceptores,
    ] =
        useState<
            ReceptorCobranza[]
        >([]);

    const [
        loading,
        setLoading,
    ] =
        useState(
            true
        );

    const [
        error,
        setError,
    ] =
        useState<
            string |
            null
        >(
            null
        );

    const [
        search,
        setSearch,
    ] =
        useState(
            ""
        );

    const [
        origen,
        setOrigen,
    ] =
        useState(
            ""
        );

    const [
        estado,
        setEstado,
    ] =
        useState(
            ""
        );

    const [
        receptorSeleccionadoId,
        setReceptorSeleccionadoId,
    ] =
        useState<
            number |
            null
        >(
            null
        );

    const [
        crearModalOpen,
        setCrearModalOpen,
    ] =
        useState(
            false
        );

    /* =========================================================
       CARGAR
    ========================================================= */

    const cargar =
        useCallback(
            async () => {
                try {
                    setLoading(
                        true
                    );

                    setError(
                        null
                    );

                    const response =
                        await listarReceptoresCobranza({
                            ...(search.trim()
                                ? {
                                    search:
                                        search.trim(),
                                }
                                : {}),

                            ...(origen
                                ? {
                                    origen,
                                }
                                : {}),

                            ...(estado ===
                                "HABILITADO"
                                ? {
                                    recibeCobranza:
                                        true,
                                }
                                : {}),

                            ...(estado ===
                                "NO_HABILITADO"
                                ? {
                                    recibeCobranza:
                                        false,
                                }
                                : {}),

                            ...(estado ===
                                "SIN_CONTACTOS"
                                ? {
                                    sinContactos:
                                        true,
                                }
                                : {}),

                            ...(estado ===
                                "INACTIVO"
                                ? {
                                    activo:
                                        false,
                                }
                                : {}),
                        });

                    setReceptores(
                        response.data
                    );
                } catch (
                err
                ) {
                    setError(
                        getCobranzaReceptoresApiError(
                            err
                        )
                    );
                } finally {
                    setLoading(
                        false
                    );
                }
            },
            [
                search,
                origen,
                estado,
            ]
        );

    useEffect(
        () => {
            const timer =
                window.setTimeout(
                    () => {
                        void cargar();
                    },
                    300
                );

            return () =>
                window.clearTimeout(
                    timer
                );
        },
        [
            cargar,
        ]
    );

    /* =========================================================
       RESUMEN
    ========================================================= */

    const resumen =
        useMemo(
            () => {
                const habilitados =
                    receptores.filter(
                        (
                            item
                        ) =>
                            item.activo &&
                            item.recibeCobranza
                    ).length;

                const externos =
                    receptores.filter(
                        (
                            item
                        ) =>
                            item.origen ===
                            "RCV"
                    ).length;

                const sinContactos =
                    receptores.filter(
                        (
                            item
                        ) =>
                            item.contactos.length ===
                            0
                    ).length;

                const sinCredito =
                    receptores.filter(
                        (
                            item
                        ) =>
                            item.diasCredito ===
                            null
                    ).length;

                return {
                    total:
                        receptores.length,

                    habilitados,

                    externos,

                    sinContactos,

                    sinCredito,
                };
            },
            [
                receptores,
            ]
        );

    /* =========================================================
       UI
    ========================================================= */

    return (
        <>
            <div
                className="
                    min-h-full
                    bg-slate-50
                    p-3
                    sm:p-5
                    lg:p-7
                "
            >
                <div
                    className="
                        mx-auto
                        max-w-[1600px]
                        space-y-5
                        sm:space-y-6
                    "
                >
                    {/* HEADER */}

                    <div
                        className="
                            flex
                            flex-col
                            gap-4
                            lg:flex-row
                            lg:items-center
                            lg:justify-between
                        "
                    >
                        <div className="min-w-0">

                            <h1
                                className="
                                    text-xl
                                    font-bold
                                    text-slate-900
                                    sm:text-2xl
                                "
                            >
                                Receptores de cobranza
                            </h1>

                            <p
                                className="
                                    mt-1
                                    max-w-3xl
                                    text-sm
                                    leading-5
                                    text-slate-500
                                "
                            >
                                Administra los clientes, condiciones de crédito y contactos autorizados para recibir recordatorios de cobranza.
                            </p>
                        </div>

                        <div
                            className="
                                flex
                                w-full
                                flex-col
                                gap-2
                                sm:w-auto
                                sm:flex-row
                            "
                        >
                            <button
                                type="button"
                                onClick={
                                    () =>
                                        setCrearModalOpen(
                                            true
                                        )
                                }
                                className="
                                    inline-flex
                                    min-h-11
                                    w-full
                                    items-center
                                    justify-center
                                    gap-2
                                    rounded-xl
                                    bg-cyan-600
                                    px-4
                                    py-2.5
                                    text-sm
                                    font-semibold
                                    text-white
                                    shadow-sm
                                    transition
                                    hover:bg-cyan-700
                                    sm:w-auto
                                "
                            >
                                <Plus
                                    size={
                                        17
                                    }
                                />

                                Nuevo receptor
                            </button>

                            <button
                                type="button"
                                onClick={
                                    () => {
                                        void cargar();
                                    }
                                }
                                disabled={
                                    loading
                                }
                                className="
                                    inline-flex
                                    min-h-11
                                    w-full
                                    items-center
                                    justify-center
                                    gap-2
                                    rounded-xl
                                    border
                                    border-slate-200
                                    bg-white
                                    px-4
                                    py-2.5
                                    text-sm
                                    font-semibold
                                    text-slate-700
                                    shadow-sm
                                    transition
                                    hover:bg-slate-50
                                    disabled:opacity-60
                                    sm:w-auto
                                "
                            >
                                <RefreshCw
                                    size={
                                        17
                                    }
                                    className={
                                        loading
                                            ? "animate-spin"
                                            : ""
                                    }
                                />

                                Actualizar
                            </button>
                        </div>
                    </div>

                    {/* MÉTRICAS */}

                    <div
                        className="
                            grid
                            grid-cols-2
                            gap-3
                            xl:grid-cols-5
                            lg:gap-4
                        "
                    >
                        <ResumenCard
                            label="Total"
                            value={
                                resumen.total
                            }
                        />

                        <ResumenCard
                            label="Habilitados"
                            value={
                                resumen.habilitados
                            }
                            valueClass="text-emerald-700"
                        />

                        <ResumenCard
                            label="Externos RCV"
                            value={
                                resumen.externos
                            }
                            valueClass="text-cyan-700"
                        />

                        <ResumenCard
                            label="Sin contactos"
                            value={
                                resumen.sinContactos
                            }
                            valueClass="text-amber-700"
                        />

                        <ResumenCard
                            label="Sin crédito definido"
                            value={
                                resumen.sinCredito
                            }
                            valueClass="text-rose-700"
                        />
                    </div>

                    {/* FILTROS */}

                    <div
                        className="
                            rounded-2xl
                            border
                            border-slate-200
                            bg-white
                            p-3
                            shadow-sm
                            sm:p-4
                        "
                    >
                        <div
                            className="
                                grid
                                grid-cols-1
                                gap-3
                                md:grid-cols-2
                                lg:grid-cols-[minmax(280px,1fr)_220px_220px]
                            "
                        >
                            <div
                                className="
                                    relative
                                    md:col-span-2
                                    lg:col-span-1
                                "
                            >
                                <Search
                                    size={
                                        18
                                    }
                                    className="
                                        absolute
                                        left-3
                                        top-1/2
                                        -translate-y-1/2
                                        text-slate-400
                                    "
                                />

                                <input
                                    value={
                                        search
                                    }
                                    onChange={
                                        (
                                            event
                                        ) =>
                                            setSearch(
                                                event.target.value
                                            )
                                    }
                                    placeholder="Buscar por razón social o RUT..."
                                    className="
                                        h-11
                                        w-full
                                        rounded-xl
                                        border
                                        border-slate-200
                                        bg-white
                                        pl-10
                                        pr-3
                                        text-sm
                                        outline-none
                                        transition
                                        focus:border-cyan-400
                                        focus:ring-4
                                        focus:ring-cyan-100
                                    "
                                />
                            </div>

                            <select
                                value={
                                    origen
                                }
                                onChange={
                                    (
                                        event
                                    ) =>
                                        setOrigen(
                                            event.target.value
                                        )
                                }
                                className="
                                    h-11
                                    w-full
                                    rounded-xl
                                    border
                                    border-slate-200
                                    bg-white
                                    px-3
                                    text-sm
                                    outline-none
                                    focus:border-cyan-400
                                    focus:ring-4
                                    focus:ring-cyan-100
                                "
                            >
                                <option value="">
                                    Todos los orígenes
                                </option>

                                <option value="CRM">
                                    CRM
                                </option>

                                <option value="RCV">
                                    Externo RCV
                                </option>

                                <option value="MANUAL">
                                    Manual
                                </option>

                                <option value="FACTURACION">
                                    Facturación
                                </option>
                            </select>

                            <select
                                value={
                                    estado
                                }
                                onChange={
                                    (
                                        event
                                    ) =>
                                        setEstado(
                                            event.target.value
                                        )
                                }
                                className="
                                    h-11
                                    w-full
                                    rounded-xl
                                    border
                                    border-slate-200
                                    bg-white
                                    px-3
                                    text-sm
                                    outline-none
                                    focus:border-cyan-400
                                    focus:ring-4
                                    focus:ring-cyan-100
                                "
                            >
                                <option value="">
                                    Todos los estados
                                </option>

                                <option value="HABILITADO">
                                    Habilitados
                                </option>

                                <option value="NO_HABILITADO">
                                    No habilitados
                                </option>

                                <option value="SIN_CONTACTOS">
                                    Sin contactos
                                </option>

                                <option value="INACTIVO">
                                    Inactivos
                                </option>
                            </select>
                        </div>
                    </div>

                    {/* ERROR */}

                    {error && (
                        <div
                            className="
                                flex
                                items-start
                                gap-3
                                rounded-xl
                                border
                                border-rose-200
                                bg-rose-50
                                p-4
                                text-sm
                                text-rose-700
                            "
                        >
                            <AlertCircle
                                size={
                                    18
                                }
                                className="mt-0.5 shrink-0"
                            />

                            {error}
                        </div>
                    )}

                    {/* MOBILE */}

                    <div className="space-y-3 md:hidden">

                        {loading ? (
                            <EstadoVacio
                                text="Cargando receptores..."
                            />
                        ) : receptores.length ===
                            0 ? (
                            <EstadoVacio
                                text="No se encontraron receptores."
                            />
                        ) : (
                            receptores.map(
                                (
                                    receptor
                                ) => (
                                    <ReceptorMobileCard
                                        key={
                                            receptor.id
                                        }

                                        receptor={
                                            receptor
                                        }

                                        onGestionar={
                                            () =>
                                                setReceptorSeleccionadoId(
                                                    receptor.id
                                                )
                                        }
                                    />
                                )
                            )
                        )}
                    </div>

                    {/* DESKTOP */}

                    <div
                        className="
                            hidden
                            overflow-hidden
                            rounded-2xl
                            border
                            border-slate-200
                            bg-white
                            shadow-sm
                            md:block
                        "
                    >
                        <div className="overflow-x-auto">

                            <table className="min-w-full">

                                <thead className="bg-slate-50">

                                    <tr className="border-b border-slate-200">

                                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Receptor
                                        </th>

                                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Origen
                                        </th>

                                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Empresa CRM
                                        </th>

                                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Crédito
                                        </th>

                                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Contactos
                                        </th>

                                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Estado
                                        </th>

                                        <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">

                                    {loading ? (
                                        <tr>
                                            <td
                                                colSpan={
                                                    7
                                                }
                                                className="px-5 py-16 text-center text-sm text-slate-500"
                                            >
                                                Cargando receptores...
                                            </td>
                                        </tr>
                                    ) : receptores.length ===
                                        0 ? (
                                        <tr>
                                            <td
                                                colSpan={
                                                    7
                                                }
                                                className="px-5 py-16 text-center text-sm text-slate-500"
                                            >
                                                No se encontraron receptores.
                                            </td>
                                        </tr>
                                    ) : (
                                        receptores.map(
                                            (
                                                receptor
                                            ) => (
                                                <ReceptorDesktopRow
                                                    key={
                                                        receptor.id
                                                    }

                                                    receptor={
                                                        receptor
                                                    }

                                                    onGestionar={
                                                        () =>
                                                            setReceptorSeleccionadoId(
                                                                receptor.id
                                                            )
                                                    }
                                                />
                                            )
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* CREAR */}

            <ReceptorCobranzaCrearModal
                open={
                    crearModalOpen
                }

                onClose={
                    () =>
                        setCrearModalOpen(
                            false
                        )
                }

                onCreated={
                    async (
                        receptor: ReceptorCobranza
                    ) => {
                        setCrearModalOpen(
                            false
                        );

                        await cargar();

                        setReceptorSeleccionadoId(
                            receptor.id
                        );
                    }
                }
            />

            {/* GESTIONAR */}

            <ReceptorCobranzaModal
                open={
                    receptorSeleccionadoId !==
                    null
                }

                receptorId={
                    receptorSeleccionadoId
                }

                onClose={
                    () =>
                        setReceptorSeleccionadoId(
                            null
                        )
                }

                onUpdated={
                    async () => {
                        await cargar();
                    }
                }
            />
        </>
    );
}

/* =========================================================
   RESUMEN CARD
========================================================= */

function ResumenCard(
    {
        label,
        value,
        valueClass =
        "text-slate-900",
    }:
        {
            label:
            string;

            value:
            number;

            valueClass?:
            string;
        }
) {
    return (
        <div
            className="
                rounded-2xl
                border
                border-slate-200
                bg-white
                p-4
                shadow-sm
                sm:p-5
            "
        >
            <div className="text-xs font-medium text-slate-500 sm:text-sm">
                {label}
            </div>

            <div
                className={`
                    mt-2
                    text-2xl
                    font-bold
                    sm:text-3xl
                    ${valueClass}
                `}
            >
                {value}
            </div>
        </div>
    );
}

/* =========================================================
   ESTADO VACÍO
========================================================= */

function EstadoVacio(
    {
        text,
    }:
        {
            text:
            string;
        }
) {
    return (
        <div
            className="
                rounded-2xl
                border
                border-slate-200
                bg-white
                p-10
                text-center
                text-sm
                text-slate-500
                shadow-sm
            "
        >
            {text}
        </div>
    );
}

/* =========================================================
   DESKTOP ROW
========================================================= */

function ReceptorDesktopRow(
    {
        receptor,
        onGestionar,
    }:
        {
            receptor:
            ReceptorCobranza;

            onGestionar:
            () => void;
        }
) {
    const contactosValidos =
        receptor.contactos.filter(
            (
                contacto
            ) =>
                contacto.activo &&
                contacto.recibeCobranza
        ).length;

    return (
        <tr className="transition hover:bg-slate-50/70">

            {/* RECEPTOR */}

            <td className="px-5 py-4">

                <div className="font-semibold uppercase text-slate-900">
                    {
                        receptor.razonSocial ??
                        "Sin razón social"
                    }
                </div>

                <div className="mt-1 text-xs text-slate-500">
                    {formatRut(
                        receptor.rut
                    )}
                </div>
            </td>

            {/* ORIGEN */}

            <td className="px-5 py-4">

                <OrigenBadge
                    receptor={
                        receptor
                    }
                />
            </td>

            {/* EMPRESA */}

            <td className="px-5 py-4">

                {receptor.empresa ? (
                    <div className="flex items-center gap-2 text-sm text-slate-700">

                        <Building2
                            size={
                                16
                            }
                            className="shrink-0 text-slate-400"
                        />

                        {
                            receptor.empresa.nombre
                        }
                    </div>
                ) : (
                    <span className="text-sm text-slate-400">
                        Sin vínculo CRM
                    </span>
                )}
            </td>

            {/* CRÉDITO */}

            <td className="px-5 py-4">

                {receptor.diasCredito !==
                    null ? (
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">

                        <CreditCard
                            size={
                                16
                            }
                            className="text-slate-400"
                        />

                        {
                            receptor.diasCredito
                        }{" "}
                        días
                    </div>
                ) : (
                    <Badge variant="warning">
                        Sin definir
                    </Badge>
                )}
            </td>

            {/* CONTACTOS */}

            <td className="px-5 py-4">

                {receptor.contactos.length ===
                    0 ? (
                    <div className="flex items-center gap-2 text-sm text-slate-400">

                        <Contact
                            size={
                                16
                            }
                        />

                        Sin contactos
                    </div>
                ) : (
                    <div className="space-y-2">

                        <div className="flex items-center gap-2 text-xs text-slate-500">

                            <Contact
                                size={
                                    15
                                }
                                className="text-slate-400"
                            />

                            <span>
                                {
                                    receptor.contactos.length
                                }{" "}
                                contacto
                                {receptor.contactos.length !==
                                    1
                                    ? "s"
                                    : ""}
                            </span>

                            {contactosValidos >
                                0 && (
                                    <span className="font-medium text-emerald-600">
                                        · {contactosValidos} válido
                                        {contactosValidos !==
                                            1
                                            ? "s"
                                            : ""}
                                    </span>
                                )}
                        </div>

                        <div className="space-y-1.5">

                            {receptor.contactos
                                .slice(
                                    0,
                                    3
                                )
                                .map(
                                    (
                                        contacto
                                    ) => (
                                        <div
                                            key={
                                                contacto.id
                                            }
                                            className="
                                                min-w-0
                                                rounded-lg
                                                border
                                                border-slate-100
                                                bg-slate-50
                                                px-2
                                                py-1.5
                                            "
                                        >
                                            <div className="flex min-w-0 items-center gap-2">

                                                <span className="truncate text-xs font-semibold text-slate-700">

                                                    {
                                                        contacto.nombre ||
                                                        "Sin nombre"
                                                    }
                                                </span>

                                                {contacto.principal && (
                                                    <Badge variant="info">
                                                        Principal
                                                    </Badge>
                                                )}
                                            </div>

                                            <div
                                                className="mt-0.5 truncate text-xs text-slate-500"
                                                title={
                                                    contacto.email
                                                }
                                            >
                                                {
                                                    contacto.email
                                                }
                                            </div>

                                            <div className="mt-1 flex flex-wrap gap-1">

                                                {!contacto.activo && (
                                                    <Badge variant="neutral">
                                                        Inactivo
                                                    </Badge>
                                                )}

                                                {contacto.activo &&
                                                    contacto.recibeCobranza && (
                                                        <Badge variant="success">
                                                            Recibe cobranza
                                                        </Badge>
                                                    )}

                                                {contacto.activo &&
                                                    !contacto.recibeCobranza && (
                                                        <Badge variant="warning">
                                                            No recibe
                                                        </Badge>
                                                    )}
                                            </div>
                                        </div>
                                    )
                                )}

                            {receptor.contactos.length >
                                3 && (
                                    <div className="px-1 text-xs font-medium text-slate-500">
                                        +
                                        {
                                            receptor.contactos.length -
                                            3
                                        }{" "}
                                        más
                                    </div>
                                )}
                        </div>
                    </div>
                )}
            </td>

            {/* ESTADO */}

            <td className="px-5 py-4">

                <EstadoBadge
                    receptor={
                        receptor
                    }
                />
            </td>

            {/* ACCIONES */}

            <td className="px-5 py-4 text-right">

                <button
                    type="button"
                    onClick={
                        onGestionar
                    }
                    className="
                        inline-flex
                        items-center
                        gap-2
                        rounded-lg
                        border
                        border-slate-200
                        bg-white
                        px-3
                        py-2
                        text-sm
                        font-semibold
                        text-slate-700
                        transition
                        hover:border-cyan-300
                        hover:bg-cyan-50
                        hover:text-cyan-700
                    "
                >
                    <Settings2
                        size={
                            16
                        }
                    />

                    Gestionar
                </button>
            </td>
        </tr>
    );
}

/* =========================================================
   MOBILE CARD
========================================================= */

function ReceptorMobileCard(
    {
        receptor,
        onGestionar,
    }:
        {
            receptor:
            ReceptorCobranza;

            onGestionar:
            () => void;
        }
) {
    const validos =
        receptor.contactos.filter(
            (
                contacto
            ) =>
                contacto.activo &&
                contacto.recibeCobranza
        ).length;

    return (
        <article
            className="
                rounded-2xl
                border
                border-slate-200
                bg-white
                p-4
                shadow-sm
            "
        >
            <div className="flex items-start justify-between gap-3">

                <div className="min-w-0">

                    <div className="break-words font-semibold uppercase text-slate-900">
                        {
                            receptor.razonSocial ??
                            "Sin razón social"
                        }
                    </div>

                    <div className="mt-1 text-xs text-slate-500">

                        {formatRut(
                            receptor.rut
                        )}
                    </div>
                </div>

                <EstadoBadge
                    receptor={
                        receptor
                    }
                />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">

                <div>

                    <div className="mb-1 text-[11px] font-semibold uppercase text-slate-400">
                        Origen
                    </div>

                    <OrigenBadge
                        receptor={
                            receptor
                        }
                    />
                </div>

                <div>

                    <div className="mb-1 text-[11px] font-semibold uppercase text-slate-400">
                        Crédito
                    </div>

                    <div className="text-sm text-slate-700">

                        {receptor.diasCredito !==
                            null
                            ? `${receptor.diasCredito} días`
                            : "Sin definir"}
                    </div>
                </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">

                <div>

                    <div className="mb-1 text-[11px] font-semibold uppercase text-slate-400">
                        Contactos
                    </div>

                    <div className="text-sm text-slate-700">

                        {
                            receptor.contactos.length
                        }

                        {validos >
                            0 &&
                            ` (${validos} válidos)`}
                    </div>
                </div>

                <div>

                    <div className="mb-1 text-[11px] font-semibold uppercase text-slate-400">
                        Empresa CRM
                    </div>

                    <div className="text-sm text-slate-700">

                        {
                            receptor.empresa?.nombre ??
                            "Sin vínculo"
                        }
                    </div>
                </div>
            </div>

            <button
                type="button"
                onClick={
                    onGestionar
                }
                className="
                    mt-4
                    inline-flex
                    min-h-11
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    border
                    border-slate-200
                    bg-white
                    px-3
                    py-2
                    text-sm
                    font-semibold
                    text-slate-700
                    transition
                    hover:border-cyan-300
                    hover:bg-cyan-50
                    hover:text-cyan-700
                "
            >
                <Settings2
                    size={
                        16
                    }
                />

                Gestionar
            </button>
        </article>
    );
}

/* =========================================================
   ORIGEN
========================================================= */

function OrigenBadge(
    {
        receptor,
    }:
        {
            receptor:
            ReceptorCobranza;
        }
) {
    if (
        receptor.origen ===
        "RCV"
    ) {
        return (
            <Badge variant="info">
                Externo RCV
            </Badge>
        );
    }

    if (
        receptor.origen ===
        "FACTURACION"
    ) {
        return (
            <Badge variant="success">
                Facturación
            </Badge>
        );
    }

    return (
        <Badge variant="neutral">
            {
                receptor.origen
            }
        </Badge>
    );
}

/* =========================================================
   ESTADO
========================================================= */

function EstadoBadge(
    {
        receptor,
    }:
        {
            receptor:
            ReceptorCobranza;
        }
) {
    if (
        !receptor.activo
    ) {
        return (
            <Badge variant="danger">
                Inactivo
            </Badge>
        );
    }

    if (
        receptor.recibeCobranza
    ) {
        return (
            <Badge variant="success">

                <CheckCircle2
                    size={
                        13
                    }
                    className="mr-1"
                />

                Habilitado
            </Badge>
        );
    }

    if (
        receptor.contactos.length ===
        0
    ) {
        return (
            <Badge variant="warning">
                Sin configurar
            </Badge>
        );
    }

    return (
        <Badge variant="neutral">
            No habilitado
        </Badge>
    );
}