// src/components/modals-facturasBaseapi/receptores-cobranza/ReceptorCobranzaModal.tsx

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
    Copy,
    CreditCard,
    Edit3,
    Mail,
    Plus,
    RefreshCw,
    Save,
    Trash2,
    X,
} from "lucide-react";

import {
    actualizarContactoCobranza,
    actualizarReceptorCobranza,
    copiarContactosFacturacion,
    crearContactoCobranza,
    eliminarContactoCobranza,
    eliminarReceptorCobranza,
    getCobranzaReceptoresApiError,
    obtenerReceptorCobranza,
    type ActualizarReceptorCobranzaPayload,
    type ReceptorCobranza,
    type ReceptorCobranzaContacto,
} from "./cobranzaReceptoresApi";

import ReceptorCobranzaContactoModal, {
    type ContactoCobranzaForm,
} from "./ReceptorCobranzaContactoModal";

import ConfirmacionFacturacionModal
    from "../receptores-facturacion/ConfirmacionFacturacionModal";

/* =========================================================
   TYPES
========================================================= */

type Props = {
    open: boolean;

    receptorId:
    number |
    null;

    onClose: () => void;

    onUpdated:
    () =>
        Promise<void> |
        void;
};

type FormReceptor = {
    razonSocial: string;

    activo: boolean;
    recibeCobranza: boolean;

    diasCredito: string;
};

/* =========================================================
   DEFAULT
========================================================= */

const FORM_INICIAL:
    FormReceptor =
{
    razonSocial: "",

    activo: true,
    recibeCobranza: false,

    diasCredito: "",
};

/* =========================================================
   HELPERS
========================================================= */

function formatRut(
    value: string
) {
    const clean =
        String(
            value ??
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

    return `${cuerpo.replace(
        /\B(?=(\d{3})+(?!\d))/g,
        "."
    )}-${dv}`;
}

function normalizarForm(
    form:
        FormReceptor
) {
    return {
        razonSocial:
            form.razonSocial
                .trim(),

        activo:
            form.activo,

        recibeCobranza:
            form.recibeCobranza,

        diasCredito:
            form.diasCredito
                .trim(),
    };
}

/* =========================================================
   COMPONENT
========================================================= */

export default function ReceptorCobranzaModal(
    {
        open,
        receptorId,
        onClose,
        onUpdated,
    }:
        Props
) {
    const [
        receptor,
        setReceptor,
    ] =
        useState<
            ReceptorCobranza |
            null
        >(
            null
        );

    const [
        form,
        setForm,
    ] =
        useState<FormReceptor>(
            FORM_INICIAL
        );

    const [
        formInicial,
        setFormInicial,
    ] =
        useState<FormReceptor>(
            FORM_INICIAL
        );

    const [
        loading,
        setLoading,
    ] =
        useState(
            false
        );

    const [
        saving,
        setSaving,
    ] =
        useState(
            false
        );

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null
        );

    const [
        mensaje,
        setMensaje,
    ] =
        useState<string | null>(
            null
        );

    /* =========================================================
       CONTACTO
    ========================================================= */

    const [
        contactoModalOpen,
        setContactoModalOpen,
    ] =
        useState(
            false
        );

    const [
        contactoEditando,
        setContactoEditando,
    ] =
        useState<
            ReceptorCobranzaContacto |
            null
        >(
            null
        );

    const [
        contactoLoading,
        setContactoLoading,
    ] =
        useState(
            false
        );

    const [
        contactoEliminar,
        setContactoEliminar,
    ] =
        useState<
            ReceptorCobranzaContacto |
            null
        >(
            null
        );

    const [
        eliminandoContacto,
        setEliminandoContacto,
    ] =
        useState(
            false
        );

    /* =========================================================
       COPIAR FACTURACIÓN
    ========================================================= */

    const [
        copiandoContactos,
        setCopiandoContactos,
    ] =
        useState(
            false
        );

    const [
        confirmarCopiar,
        setConfirmarCopiar,
    ] =
        useState(
            false
        );

    /* =========================================================
       RECEPTOR
    ========================================================= */

    const [
        confirmarSalida,
        setConfirmarSalida,
    ] =
        useState(
            false
        );

    const [
        confirmarEliminarReceptor,
        setConfirmarEliminarReceptor,
    ] =
        useState(
            false
        );

    const [
        eliminandoReceptor,
        setEliminandoReceptor,
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
                if (
                    !receptorId
                ) {
                    return;
                }

                try {
                    setLoading(
                        true
                    );

                    setError(
                        null
                    );

                    const response =
                        await obtenerReceptorCobranza(
                            receptorId
                        );

                    const nuevoForm:
                        FormReceptor =
                    {
                        razonSocial:
                            response.razonSocial ??
                            "",

                        activo:
                            response.activo,

                        recibeCobranza:
                            response.recibeCobranza,

                        diasCredito:
                            response.diasCredito ===
                                null
                                ? ""
                                : String(
                                    response.diasCredito
                                ),
                    };

                    setReceptor(
                        response
                    );

                    setForm(
                        nuevoForm
                    );

                    setFormInicial(
                        nuevoForm
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
                receptorId,
            ]
        );

    useEffect(
        () => {
            if (
                open &&
                receptorId
            ) {
                setMensaje(
                    null
                );

                void cargar();
            }
        },
        [
            open,
            receptorId,
            cargar,
        ]
    );

    /* =========================================================
       CAMBIOS
    ========================================================= */

    const hayCambios =
        useMemo(
            () =>
                JSON.stringify(
                    normalizarForm(
                        form
                    )
                ) !==
                JSON.stringify(
                    normalizarForm(
                        formInicial
                    )
                ),
            [
                form,
                formInicial,
            ]
        );

    const contactosValidos =
        useMemo(
            () =>
                receptor
                    ?.contactos
                    .filter(
                        (
                            contacto
                        ) =>
                            contacto.activo &&
                            contacto.recibeCobranza
                    )
                    .length ??
                0,
            [
                receptor,
            ]
        );

    if (
        !open
    ) {
        return null;
    }

    /* =========================================================
       CERRAR
    ========================================================= */

    const solicitarCierre =
        () => {
            if (
                saving ||
                contactoLoading ||
                eliminandoContacto ||
                eliminandoReceptor ||
                copiandoContactos
            ) {
                return;
            }

            if (
                hayCambios
            ) {
                setConfirmarSalida(
                    true
                );

                return;
            }

            onClose();
        };

    /* =========================================================
       GUARDAR RECEPTOR
    ========================================================= */

    const guardarReceptor =
        async () => {
            if (
                !receptorId
            ) {
                return;
            }

            try {
                setError(
                    null
                );

                setMensaje(
                    null
                );

                let diasCredito:
                    number |
                    null =
                    null;

                if (
                    form.diasCredito
                        .trim() !==
                    ""
                ) {
                    const parsed =
                        Number(
                            form.diasCredito
                        );

                    if (
                        !Number.isInteger(
                            parsed
                        ) ||
                        parsed <
                        0 ||
                        parsed >
                        365
                    ) {
                        setError(
                            "Los días de crédito deben ser un número entero entre 0 y 365."
                        );

                        return;
                    }

                    diasCredito =
                        parsed;
                }

                /*
                 * El backend también valida que no pueda
                 * habilitarse cobranza sin contactos válidos.
                 */
                if (
                    form.recibeCobranza &&
                    contactosValidos ===
                    0
                ) {
                    setError(
                        "Primero debes agregar al menos un contacto activo habilitado para cobranza."
                    );

                    return;
                }

                setSaving(
                    true
                );

                const payload:
                    ActualizarReceptorCobranzaPayload =
                {
                    razonSocial:
                        form.razonSocial
                            .trim() ||
                        null,

                    activo:
                        form.activo,

                    recibeCobranza:
                        form.recibeCobranza,

                    diasCredito,
                };

                await actualizarReceptorCobranza(
                    receptorId,
                    payload
                );

                await cargar();

                await onUpdated();

                setMensaje(
                    "Cambios guardados correctamente."
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
                setSaving(
                    false
                );
            }
        };

    /* =========================================================
       GUARDAR CONTACTO
    ========================================================= */

    const guardarContacto =
        async (
            data:
                ContactoCobranzaForm
        ) => {
            if (
                !receptorId
            ) {
                return;
            }

            try {
                setContactoLoading(
                    true
                );

                setError(
                    null
                );

                setMensaje(
                    null
                );

                if (
                    contactoEditando
                ) {
                    await actualizarContactoCobranza(
                        receptorId,
                        contactoEditando.id,
                        {
                            nombre:
                                data.nombre
                                    .trim() ||
                                null,

                            email:
                                data.email
                                    .trim()
                                    .toLowerCase(),

                            principal:
                                data.principal,

                            activo:
                                data.activo,

                            recibeCobranza:
                                data.recibeCobranza,
                        }
                    );
                } else {
                    await crearContactoCobranza(
                        receptorId,
                        {
                            nombre:
                                data.nombre
                                    .trim() ||
                                null,

                            email:
                                data.email
                                    .trim()
                                    .toLowerCase(),

                            principal:
                                data.principal,

                            activo:
                                data.activo,

                            recibeCobranza:
                                data.recibeCobranza,
                        }
                    );
                }

                setContactoModalOpen(
                    false
                );

                setContactoEditando(
                    null
                );

                await cargar();

                await onUpdated();

                setMensaje(
                    contactoEditando
                        ? "Contacto actualizado correctamente."
                        : "Contacto agregado correctamente."
                );
            } catch (
            err
            ) {
                /*
                 * Lo captura el modal hijo.
                 */
                throw new Error(
                    getCobranzaReceptoresApiError(
                        err
                    )
                );
            } finally {
                setContactoLoading(
                    false
                );
            }
        };

    /* =========================================================
       ELIMINAR CONTACTO
    ========================================================= */

    const confirmarEliminarContacto =
        async () => {
            if (
                !receptorId ||
                !contactoEliminar
            ) {
                return;
            }

            try {
                setEliminandoContacto(
                    true
                );

                setError(
                    null
                );

                setMensaje(
                    null
                );

                await eliminarContactoCobranza(
                    receptorId,
                    contactoEliminar.id
                );

                setContactoEliminar(
                    null
                );

                await cargar();

                await onUpdated();

                setMensaje(
                    "Contacto eliminado correctamente."
                );
            } catch (
            err
            ) {
                setContactoEliminar(
                    null
                );

                setError(
                    getCobranzaReceptoresApiError(
                        err
                    )
                );
            } finally {
                setEliminandoContacto(
                    false
                );
            }
        };

    /* =========================================================
       COPIAR DESDE FACTURACIÓN
    ========================================================= */

    const ejecutarCopiarContactos =
        async () => {
            if (
                !receptorId
            ) {
                return;
            }

            try {
                setConfirmarCopiar(
                    false
                );

                setCopiandoContactos(
                    true
                );

                setError(
                    null
                );

                setMensaje(
                    null
                );

                const result =
                    await copiarContactosFacturacion(
                        receptorId
                    );

                await cargar();

                await onUpdated();

                setMensaje(
                    `Contactos sincronizados desde facturación: ${result.creados} creado(s), ${result.actualizados} actualizado(s).`
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
                setCopiandoContactos(
                    false
                );
            }
        };

    /* =========================================================
       ELIMINAR RECEPTOR
    ========================================================= */

    const ejecutarEliminarReceptor =
        async () => {
            if (
                !receptorId
            ) {
                return;
            }

            try {
                setEliminandoReceptor(
                    true
                );

                setError(
                    null
                );

                await eliminarReceptorCobranza(
                    receptorId
                );

                setConfirmarEliminarReceptor(
                    false
                );

                await onUpdated();

                onClose();
            } catch (
            err
            ) {
                setConfirmarEliminarReceptor(
                    false
                );

                setError(
                    getCobranzaReceptoresApiError(
                        err
                    )
                );
            } finally {
                setEliminandoReceptor(
                    false
                );
            }
        };

    return (
        <>
            {/* BACKDROP */}
            <button
                type="button"
                aria-label="Cerrar receptor"
                onClick={
                    solicitarCierre
                }
                className="
                    fixed
                    inset-0
                    z-[100]
                    cursor-default
                    bg-slate-950/45
                    backdrop-blur-[2px]
                "
            />

            {/* DRAWER */}
            <div
                className="
                    fixed
                    inset-y-0
                    right-0
                    z-[110]
                    flex
                    w-full
                    flex-col
                    bg-white
                    shadow-2xl
                    sm:max-w-xl
                    lg:max-w-2xl
                "
                role="dialog"
                aria-modal="true"
            >
                {/* HEADER */}
                <div
                    className="
                        flex
                        shrink-0
                        items-start
                        justify-between
                        gap-4
                        border-b
                        border-slate-200
                        px-4
                        py-4
                        sm:px-6
                        sm:py-5
                    "
                >
                    <div className="min-w-0">
                        <div
                            className="
                                flex
                                flex-wrap
                                items-center
                                gap-2
                            "
                        >
                            <h2
                                className="
                                    text-lg
                                    font-bold
                                    text-slate-900
                                    sm:text-xl
                                "
                            >
                                Gestionar receptor de cobranza
                            </h2>

                            {hayCambios && (
                                <span
                                    className="
                                        rounded-full
                                        border
                                        border-amber-200
                                        bg-amber-50
                                        px-2.5
                                        py-1
                                        text-[11px]
                                        font-semibold
                                        text-amber-700
                                    "
                                >
                                    Cambios sin guardar
                                </span>
                            )}
                        </div>

                        {receptor && (
                            <div
                                className="
                                    mt-1
                                    flex
                                    flex-wrap
                                    items-center
                                    gap-x-3
                                    gap-y-1
                                    text-sm
                                    text-slate-500
                                "
                            >
                                <span>
                                    {formatRut(
                                        receptor.rut
                                    )}
                                </span>

                                <span>
                                    {
                                        receptor.origen ===
                                            "RCV"
                                            ? "Externo RCV"
                                            : receptor.origen
                                    }
                                </span>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={
                            solicitarCierre
                        }
                        aria-label="Cerrar"
                        className="
                            shrink-0
                            rounded-lg
                            p-2
                            text-slate-400
                            transition
                            hover:bg-slate-100
                            hover:text-slate-700
                        "
                    >
                        <X size={21} />
                    </button>
                </div>

                {/* CONTENT */}
                <div
                    className="
                        flex-1
                        overflow-y-auto
                        overscroll-contain
                    "
                >
                    {loading ? (
                        <div
                            className="
                                flex
                                min-h-[400px]
                                items-center
                                justify-center
                                p-6
                                text-sm
                                text-slate-500
                            "
                        >
                            <RefreshCw
                                size={18}
                                className="mr-2 animate-spin"
                            />

                            Cargando receptor...
                        </div>
                    ) : receptor ? (
                        <div
                            className="
                                space-y-5
                                p-4
                                sm:p-6
                            "
                        >
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
                                        leading-5
                                        text-rose-700
                                    "
                                >
                                    <AlertCircle
                                        size={18}
                                        className="mt-0.5 shrink-0"
                                    />

                                    <span>
                                        {error}
                                    </span>
                                </div>
                            )}

                            {/* SUCCESS */}
                            {mensaje && (
                                <div
                                    className="
                                        flex
                                        items-start
                                        gap-3
                                        rounded-xl
                                        border
                                        border-emerald-200
                                        bg-emerald-50
                                        p-4
                                        text-sm
                                        text-emerald-700
                                    "
                                >
                                    <CheckCircle2
                                        size={18}
                                        className="mt-0.5 shrink-0"
                                    />

                                    {mensaje}
                                </div>
                            )}

                            {/* DATOS */}
                            <section
                                className="
                                    rounded-2xl
                                    border
                                    border-slate-200
                                    bg-white
                                    p-4
                                    sm:p-5
                                "
                            >
                                <div className="mb-5">
                                    <h3 className="font-bold text-slate-900">
                                        Datos del receptor
                                    </h3>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Configuración utilizada para calcular vencimientos y determinar si el cliente recibe cobranza.
                                    </p>
                                </div>

                                <div className="space-y-5">

                                    {/* RAZÓN SOCIAL */}
                                    <div>
                                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                            Razón social
                                        </label>

                                        <input
                                            value={
                                                form.razonSocial
                                            }
                                            onChange={
                                                (
                                                    event
                                                ) =>
                                                    setForm(
                                                        (
                                                            current
                                                        ) => ({
                                                            ...current,

                                                            razonSocial:
                                                                event.target.value,
                                                        })
                                                    )
                                            }
                                            className="
                                                h-11
                                                w-full
                                                rounded-xl
                                                border
                                                border-slate-200
                                                px-3
                                                text-sm
                                                outline-none
                                                transition
                                                focus:border-cyan-400
                                                focus:ring-4
                                                focus:ring-cyan-100
                                            "
                                        />
                                    </div>

                                    {/* INFORMACIÓN */}
                                    <div
                                        className="
                                            grid
                                            grid-cols-1
                                            gap-3
                                            sm:grid-cols-2
                                        "
                                    >
                                        <InfoItem
                                            label="Origen"
                                            value={
                                                receptor.origen ===
                                                    "RCV"
                                                    ? "Externo RCV"
                                                    : receptor.origen
                                            }
                                        />

                                        <InfoItem
                                            label="Empresa CRM"
                                            value={
                                                receptor.empresa
                                                    ?.nombre ??
                                                "Sin vínculo CRM"
                                            }
                                            icon={
                                                <Building2 size={16} />
                                            }
                                        />
                                    </div>

                                    {/* CRÉDITO */}
                                    <div>
                                        <label
                                            className="
                                                mb-1.5
                                                block
                                                text-sm
                                                font-semibold
                                                text-slate-700
                                            "
                                        >
                                            Días de crédito
                                        </label>

                                        <div className="relative">
                                            <CreditCard
                                                size={17}
                                                className="
                                                    absolute
                                                    left-3
                                                    top-1/2
                                                    -translate-y-1/2
                                                    text-slate-400
                                                "
                                            />

                                            <input
                                                type="number"
                                                min={0}
                                                max={365}
                                                step={1}
                                                value={
                                                    form.diasCredito
                                                }
                                                onChange={
                                                    (
                                                        event
                                                    ) =>
                                                        setForm(
                                                            (
                                                                current
                                                            ) => ({
                                                                ...current,

                                                                diasCredito:
                                                                    event.target.value,
                                                            })
                                                        )
                                                }
                                                className="
                                                    h-11
                                                    w-full
                                                    rounded-xl
                                                    border
                                                    border-slate-200
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
                                        <p
                                            className="
        mt-1.5
        text-xs
        leading-5
        text-slate-500
    "
                                        >
                                            Corresponde a la cantidad de días otorgados al cliente para pagar una factura desde su fecha de emisión. Este valor se utiliza para calcular el vencimiento cuando no existe una fecha de vencimiento específica.
                                        </p>
                                    </div>

                                    {/* ACTIVO */}
                                    <OpcionReceptor
                                        titulo="Receptor activo"
                                        descripcion="Permite utilizar este receptor dentro del flujo de cobranza."
                                        checked={
                                            form.activo
                                        }
                                        onChange={
                                            (
                                                value
                                            ) =>
                                                setForm(
                                                    (
                                                        current
                                                    ) => ({
                                                        ...current,

                                                        activo:
                                                            value,
                                                    })
                                                )
                                        }
                                    />

                                    {/* COBRANZA */}
                                    <OpcionReceptor
                                        titulo="Recibe cobranza"
                                        descripcion={
                                            contactosValidos >
                                                0
                                                ? `Autoriza el envío de recordatorios a ${contactosValidos} contacto(s) válido(s).`
                                                : "Primero debes agregar al menos un contacto activo habilitado para cobranza."
                                        }
                                        checked={
                                            form.recibeCobranza
                                        }
                                        disabled={
                                            contactosValidos ===
                                            0
                                        }
                                        onChange={
                                            (
                                                value
                                            ) =>
                                                setForm(
                                                    (
                                                        current
                                                    ) => ({
                                                        ...current,

                                                        recibeCobranza:
                                                            value,
                                                    })
                                                )
                                        }
                                    />
                                </div>
                            </section>

                            {/* CONTACTOS */}
                            <section
                                className="
                                    rounded-2xl
                                    border
                                    border-slate-200
                                    bg-white
                                    p-4
                                    sm:p-5
                                "
                            >
                                <div
                                    className="
                                        mb-5
                                        flex
                                        flex-col
                                        gap-3
                                        sm:flex-row
                                        sm:items-start
                                        sm:justify-between
                                    "
                                >
                                    <div>
                                        <h3 className="font-bold text-slate-900">
                                            Contactos de cobranza
                                        </h3>

                                        <p className="mt-1 text-sm text-slate-500">
                                            Destinatarios autorizados para recibir recordatorios.
                                        </p>
                                    </div>

                                    <div
                                        className="
                                            flex
                                            flex-col
                                            gap-2
                                            sm:flex-row
                                        "
                                    >
                                        <button
                                            type="button"
                                            onClick={
                                                () =>
                                                    setConfirmarCopiar(
                                                        true
                                                    )
                                            }
                                            disabled={
                                                copiandoContactos
                                            }
                                            className="
                                                inline-flex
                                                min-h-10
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
                                                disabled:opacity-50
                                            "
                                        >
                                            <Copy size={16} />

                                            {
                                                copiandoContactos
                                                    ? "Copiando..."
                                                    : "Copiar facturación"
                                            }
                                        </button>

                                        <button
                                            type="button"
                                            onClick={
                                                () => {
                                                    setContactoEditando(
                                                        null
                                                    );

                                                    setContactoModalOpen(
                                                        true
                                                    );
                                                }
                                            }
                                            className="
                                                inline-flex
                                                min-h-10
                                                items-center
                                                justify-center
                                                gap-2
                                                rounded-xl
                                                bg-slate-900
                                                px-3
                                                py-2
                                                text-sm
                                                font-semibold
                                                text-white
                                                transition
                                                hover:bg-slate-800
                                            "
                                        >
                                            <Plus size={16} />

                                            Agregar contacto
                                        </button>
                                    </div>
                                </div>

                                {/* SIN CONTACTOS */}
                                {receptor.contactos.length ===
                                    0 ? (
                                    <div
                                        className="
                                            rounded-xl
                                            border
                                            border-dashed
                                            border-slate-300
                                            px-4
                                            py-10
                                            text-center
                                        "
                                    >
                                        <Mail
                                            size={28}
                                            className="mx-auto text-slate-300"
                                        />

                                        <div className="mt-3 font-semibold text-slate-700">
                                            Sin contactos
                                        </div>

                                        <div className="mt-1 text-sm text-slate-500">
                                            Agrega un contacto manualmente o cópialo desde facturación.
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {receptor.contactos.map(
                                            (
                                                contacto
                                            ) => (
                                                <div
                                                    key={
                                                        contacto.id
                                                    }
                                                    className="
                                                        rounded-xl
                                                        border
                                                        border-slate-200
                                                        p-4
                                                    "
                                                >
                                                    <div
                                                        className="
                                                            flex
                                                            flex-col
                                                            gap-3
                                                            sm:flex-row
                                                            sm:items-start
                                                            sm:justify-between
                                                        "
                                                    >
                                                        <div className="min-w-0">
                                                            <div
                                                                className="
                                                                    flex
                                                                    flex-wrap
                                                                    items-center
                                                                    gap-2
                                                                "
                                                            >
                                                                <span className="font-semibold text-slate-800">
                                                                    {
                                                                        contacto.nombre ??
                                                                        "Sin nombre"
                                                                    }
                                                                </span>

                                                                {contacto.principal && (
                                                                    <Badge variant="info">
                                                                        Principal
                                                                    </Badge>
                                                                )}

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

                                                            <div
                                                                className="
                                                                    mt-1
                                                                    break-all
                                                                    text-sm
                                                                    text-slate-500
                                                                "
                                                            >
                                                                {
                                                                    contacto.email
                                                                }
                                                            </div>

                                                            <div
                                                                className="
                                                                    mt-1
                                                                    text-xs
                                                                    text-slate-400
                                                                "
                                                            >
                                                                Origen: {
                                                                    contacto.origen
                                                                }
                                                            </div>
                                                        </div>

                                                        <div
                                                            className="
                                                                flex
                                                                shrink-0
                                                                gap-2
                                                            "
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={
                                                                    () => {
                                                                        setContactoEditando(
                                                                            contacto
                                                                        );

                                                                        setContactoModalOpen(
                                                                            true
                                                                        );
                                                                    }
                                                                }
                                                                className="
                                                                    inline-flex
                                                                    h-9
                                                                    w-9
                                                                    items-center
                                                                    justify-center
                                                                    rounded-lg
                                                                    border
                                                                    border-slate-200
                                                                    text-slate-500
                                                                    transition
                                                                    hover:border-cyan-300
                                                                    hover:bg-cyan-50
                                                                    hover:text-cyan-700
                                                                "
                                                                title="Editar contacto"
                                                            >
                                                                <Edit3 size={15} />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={
                                                                    () =>
                                                                        setContactoEliminar(
                                                                            contacto
                                                                        )
                                                                }
                                                                className="
                                                                    inline-flex
                                                                    h-9
                                                                    w-9
                                                                    items-center
                                                                    justify-center
                                                                    rounded-lg
                                                                    border
                                                                    border-rose-200
                                                                    text-rose-500
                                                                    transition
                                                                    hover:bg-rose-50
                                                                    hover:text-rose-700
                                                                "
                                                                title="Eliminar contacto"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}
                            </section>

                            {/* ELIMINAR RECEPTOR */}
                            <section
                                className="
                                    rounded-2xl
                                    border
                                    border-rose-200
                                    bg-rose-50/50
                                    p-4
                                    sm:p-5
                                "
                            >
                                <h3 className="font-bold text-rose-800">
                                    Eliminar receptor
                                </h3>

                                <p className="mt-1 text-sm leading-5 text-rose-700">
                                    Solo podrá eliminarse si no tiene contactos asociados ni historial de cobranza que deba conservarse.
                                </p>

                                <button
                                    type="button"
                                    onClick={
                                        () =>
                                            setConfirmarEliminarReceptor(
                                                true
                                            )
                                    }
                                    className="
                                        mt-4
                                        inline-flex
                                        min-h-10
                                        items-center
                                        justify-center
                                        gap-2
                                        rounded-xl
                                        border
                                        border-rose-200
                                        bg-white
                                        px-3
                                        py-2
                                        text-sm
                                        font-semibold
                                        text-rose-700
                                        transition
                                        hover:bg-rose-100
                                    "
                                >
                                    <Trash2 size={16} />

                                    Eliminar receptor
                                </button>
                            </section>
                        </div>
                    ) : (
                        <div className="p-6 text-sm text-slate-500">
                            No fue posible cargar el receptor.
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                {receptor && (
                    <div
                        className="
                            flex
                            shrink-0
                            items-center
                            justify-end
                            gap-2
                            border-t
                            border-slate-200
                            bg-white
                            px-4
                            py-4
                            sm:px-6
                        "
                    >
                        <button
                            type="button"
                            onClick={
                                solicitarCierre
                            }
                            className="
                                min-h-11
                                rounded-xl
                                border
                                border-slate-200
                                bg-white
                                px-4
                                py-2.5
                                text-sm
                                font-semibold
                                text-slate-700
                                transition
                                hover:bg-slate-100
                            "
                        >
                            Cerrar
                        </button>

                        <button
                            type="button"
                            onClick={
                                () => {
                                    void guardarReceptor();
                                }
                            }
                            disabled={
                                saving ||
                                !hayCambios
                            }
                            className="
                                inline-flex
                                min-h-11
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
                                transition
                                hover:bg-cyan-700
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                            "
                        >
                            <Save size={17} />

                            {
                                saving
                                    ? "Guardando..."
                                    : "Guardar cambios"
                            }
                        </button>
                    </div>
                )}
            </div>

            {/* CONTACTO */}
            <ReceptorCobranzaContactoModal
                open={
                    contactoModalOpen
                }
                contacto={
                    contactoEditando
                }
                loading={
                    contactoLoading
                }
                onClose={
                    () => {
                        if (
                            contactoLoading
                        ) {
                            return;
                        }

                        setContactoModalOpen(
                            false
                        );

                        setContactoEditando(
                            null
                        );
                    }
                }
                onSubmit={
                    guardarContacto
                }
            />

            {/* ELIMINAR CONTACTO */}
            <ConfirmacionFacturacionModal
                open={
                    contactoEliminar !==
                    null
                }
                titulo="Eliminar contacto"
                descripcion={
                    contactoEliminar
                        ? `¿Seguro que deseas eliminar ${contactoEliminar.email}? Esta acción no se puede deshacer.`
                        : ""
                }
                textoConfirmar="Eliminar contacto"
                textoCancelar="Cancelar"
                variante="danger"
                loading={
                    eliminandoContacto
                }
                onCancel={
                    () => {
                        if (
                            eliminandoContacto
                        ) {
                            return;
                        }

                        setContactoEliminar(
                            null
                        );
                    }
                }
                onConfirm={
                    confirmarEliminarContacto
                }
            />

            {/* COPIAR FACTURACIÓN */}
            <ConfirmacionFacturacionModal
                open={
                    confirmarCopiar
                }
                titulo="Copiar contactos desde facturación"
                descripcion="Se copiarán los contactos activos habilitados para facturación que tengan el mismo RUT. Los contactos existentes se actualizarán según las reglas del backend."
                textoConfirmar="Copiar contactos"
                textoCancelar="Cancelar"
                variante="warning"
                loading={
                    copiandoContactos
                }
                onCancel={
                    () =>
                        setConfirmarCopiar(
                            false
                        )
                }
                onConfirm={
                    ejecutarCopiarContactos
                }
            />

            {/* ELIMINAR RECEPTOR */}
            <ConfirmacionFacturacionModal
                open={
                    confirmarEliminarReceptor
                }
                titulo="Eliminar receptor"
                descripcion={
                    receptor
                        ? `¿Seguro que deseas eliminar ${receptor.razonSocial ?? formatRut(receptor.rut)}? Esta acción solo será permitida si no existen contactos ni historial de cobranza asociado.`
                        : ""
                }
                textoConfirmar="Eliminar receptor"
                textoCancelar="Cancelar"
                variante="danger"
                loading={
                    eliminandoReceptor
                }
                onCancel={
                    () => {
                        if (
                            eliminandoReceptor
                        ) {
                            return;
                        }

                        setConfirmarEliminarReceptor(
                            false
                        );
                    }
                }
                onConfirm={
                    ejecutarEliminarReceptor
                }
            />

            {/* SALIDA SIN GUARDAR */}
            <ConfirmacionFacturacionModal
                open={
                    confirmarSalida
                }
                titulo="¿Descartar cambios?"
                descripcion="Hay cambios sin guardar en la configuración del receptor."
                textoConfirmar="Descartar cambios"
                textoCancelar="Seguir editando"
                variante="warning"
                onCancel={
                    () =>
                        setConfirmarSalida(
                            false
                        )
                }
                onConfirm={
                    () => {
                        setConfirmarSalida(
                            false
                        );

                        onClose();
                    }
                }
            />
        </>
    );
}

/* =========================================================
   INFO ITEM
========================================================= */

function InfoItem(
    {
        label,
        value,
        icon,
    }:
        {
            label: string;
            value: string;
            icon?: React.ReactNode;
        }
) {
    return (
        <div
            className="
                rounded-xl
                border
                border-slate-200
                bg-slate-50
                p-3
            "
        >
            <div
                className="
                    text-[11px]
                    font-semibold
                    uppercase
                    tracking-wide
                    text-slate-400
                "
            >
                {label}
            </div>

            <div
                className="
                    mt-1
                    flex
                    items-center
                    gap-2
                    text-sm
                    font-semibold
                    text-slate-700
                "
            >
                {icon}

                {value}
            </div>
        </div>
    );
}

/* =========================================================
   OPCIÓN RECEPTOR
========================================================= */

function OpcionReceptor(
    {
        titulo,
        descripcion,
        checked,
        disabled = false,
        onChange,
    }:
        {
            titulo: string;
            descripcion: string;

            checked: boolean;
            disabled?: boolean;

            onChange:
            (
                value:
                    boolean
            ) => void;
        }
) {
    return (
        <label
            className={`
                flex
                items-start
                justify-between
                gap-4
                rounded-xl
                border
                border-slate-200
                p-4
                transition
                ${disabled
                    ? "cursor-not-allowed bg-slate-50 opacity-60"
                    : "cursor-pointer hover:bg-slate-50"
                }
            `}
        >
            <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800">
                    {titulo}
                </div>

                <div className="mt-1 text-xs leading-5 text-slate-500">
                    {descripcion}
                </div>
            </div>

            <input
                type="checkbox"
                checked={
                    checked
                }
                disabled={
                    disabled
                }
                onChange={
                    (
                        event
                    ) =>
                        onChange(
                            event.target.checked
                        )
                }
                className="
                    mt-1
                    h-4
                    w-4
                    shrink-0
                    accent-cyan-600
                "
            />
        </label>
    );
}

/* =========================================================
   BADGE
========================================================= */

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
            | "info";
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
    };

    return (
        <span
            className={`
                inline-flex
                items-center
                rounded-full
                border
                px-2
                py-0.5
                text-[11px]
                font-semibold
                ${classes[variant]}
            `}
        >
            {children}
        </span>
    );
}