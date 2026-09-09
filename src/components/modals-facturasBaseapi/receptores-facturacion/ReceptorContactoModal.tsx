// src/components/modals-facturasBaseapi/receptores-facturacion/ReceptorContactoModal.tsx
import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Mail,
    Save,
    User,
    X,
} from "lucide-react";

import {
    getFacturaApiError,
    type ReceptorFacturacionContacto,
} from "./facturaReceptoresApi";

import ConfirmacionFacturacionModal
    from "./ConfirmacionFacturacionModal";

export type ContactoFacturacionForm = {
    nombre:
    string;

    email:
    string;

    principal:
    boolean;

    activo:
    boolean;

    recibeFacturas:
    boolean;
};

type Props = {
    open:
    boolean;

    contacto?:
    ReceptorFacturacionContacto | null;

    loading?:
    boolean;

    onClose:
    () => void;

    onSubmit:
    (
        data:
            ContactoFacturacionForm
    ) => Promise<void>;
};

const FORM_INICIAL:
    ContactoFacturacionForm =
{
    nombre:
        "",

    email:
        "",

    principal:
        false,

    activo:
        true,

    recibeFacturas:
        true,
};

function normalizarForm(
    form:
        ContactoFacturacionForm
) {
    return {
        nombre:
            form.nombre
                .trim(),

        email:
            form.email
                .trim()
                .toLowerCase(),

        principal:
            form.principal,

        activo:
            form.activo,

        recibeFacturas:
            form.recibeFacturas,
    };
}

export default function ReceptorContactoModal(
    {
        open,
        contacto,
        loading = false,
        onClose,
        onSubmit,
    }:
        Props
) {
    const [
        form,
        setForm,
    ] =
        useState<
            ContactoFacturacionForm
        >(
            FORM_INICIAL
        );

    const [
        formInicial,
        setFormInicial,
    ] =
        useState<
            ContactoFacturacionForm
        >(
            FORM_INICIAL
        );

    const [
        error,
        setError,
    ] =
        useState<
            string | null
        >(
            null
        );

    const [
        confirmarSalida,
        setConfirmarSalida,
    ] =
        useState(
            false
        );

    useEffect(
        () => {
            if (
                !open
            ) {
                return;
            }

            const nuevoForm:
                ContactoFacturacionForm =
                contacto
                    ? {
                        nombre:
                            contacto.nombre ??
                            "",

                        email:
                            contacto.email,

                        principal:
                            contacto.principal,

                        activo:
                            contacto.activo,

                        recibeFacturas:
                            contacto.recibeFacturas,
                    }
                    : {
                        ...FORM_INICIAL,
                    };

            setForm(
                nuevoForm
            );

            setFormInicial(
                nuevoForm
            );

            setError(
                null
            );

            setConfirmarSalida(
                false
            );
        },
        [
            open,
            contacto,
        ]
    );

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

    if (
        !open
    ) {
        return null;
    }

    const solicitarCierre =
        () => {
            if (
                loading
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

    const guardar =
        async () => {
            try {
                setError(
                    null
                );

                const email =
                    form.email
                        .trim()
                        .toLowerCase();

                if (
                    !email
                ) {
                    throw new Error(
                        "El email es obligatorio"
                    );
                }

                if (
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                        email
                    )
                ) {
                    throw new Error(
                        "Ingresa un email válido"
                    );
                }

                await onSubmit({
                    ...form,

                    nombre:
                        form.nombre
                            .trim(),

                    email,
                });
            } catch (
            err
            ) {
                setError(
                    getFacturaApiError(
                        err
                    )
                );
            }
        };

    return (
        <>
            <div
                className="
                    fixed
                    inset-0
                    z-[140]
                    flex
                    items-end
                    justify-center
                    bg-slate-950/50
                    p-0
                    backdrop-blur-sm
                    sm:items-center
                    sm:p-4
                "
                role="dialog"
                aria-modal="true"
            >
                <div
                    className="
                        flex
                        max-h-[94dvh]
                        w-full
                        flex-col
                        overflow-hidden
                        rounded-t-3xl
                        bg-white
                        shadow-2xl
                        sm:max-w-lg
                        sm:rounded-2xl
                    "
                >
                    {/* HEADER */}
                    <div
                        className="
                            flex
                            shrink-0
                            items-start
                            justify-between
                            gap-3
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
                                <h2 className="text-lg font-bold text-slate-900">
                                    {
                                        contacto
                                            ? "Editar contacto"
                                            : "Nuevo contacto"
                                    }
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

                            <p
                                className="
                                    mt-1
                                    text-sm
                                    leading-5
                                    text-slate-500
                                "
                            >
                                Configura el destinatario autorizado para facturación.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={
                                solicitarCierre
                            }
                            disabled={
                                loading
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
                            <X size={20} />
                        </button>
                    </div>

                    {/* BODY */}
                    <div
                        className="
                            flex-1
                            overflow-y-auto
                            overscroll-contain
                            px-4
                            py-5
                            sm:px-6
                        "
                    >
                        <div className="space-y-5">
                            {error && (
                                <div
                                    className="
                                        rounded-xl
                                        border
                                        border-rose-200
                                        bg-rose-50
                                        px-4
                                        py-3
                                        text-sm
                                        leading-5
                                        text-rose-700
                                    "
                                >
                                    {error}
                                </div>
                            )}

                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                    Nombre
                                </label>

                                <div className="relative">
                                    <User
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
                                        value={
                                            form.nombre
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

                                                        nombre:
                                                            event.target.value,
                                                    })
                                                )
                                        }
                                        placeholder="Nombre del contacto"
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
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                    Email
                                </label>

                                <div className="relative">
                                    <Mail
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
                                        type="email"
                                        value={
                                            form.email
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

                                                        email:
                                                            event.target.value,
                                                    })
                                                )
                                        }
                                        placeholder="correo@empresa.cl"
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
                            </div>

                            <div className="space-y-3">
                                <Opcion
                                    titulo="Contacto activo"
                                    descripcion="Permite utilizar este contacto dentro de la automatización."
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

                                <Opcion
                                    titulo="Recibe facturas"
                                    descripcion="Autoriza este email como destinatario de facturas electrónicas."
                                    checked={
                                        form.recibeFacturas
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

                                                    recibeFacturas:
                                                        value,
                                                })
                                            )
                                    }
                                />

                                <Opcion
                                    titulo="Contacto principal"
                                    descripcion="Si lo activas, los demás contactos dejarán de ser principales."
                                    checked={
                                        form.principal
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

                                                    principal:
                                                        value,
                                                })
                                            )
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    {/* FOOTER */}
                    <div
                        className="
                            flex
                            shrink-0
                            flex-col-reverse
                            gap-2
                            border-t
                            border-slate-200
                            bg-slate-50
                            px-4
                            py-4
                            sm:flex-row
                            sm:justify-end
                            sm:px-6
                        "
                    >
                        <button
                            type="button"
                            onClick={
                                solicitarCierre
                            }
                            disabled={
                                loading
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
                            Cancelar
                        </button>

                        <button
                            type="button"
                            onClick={
                                () => {
                                    void guardar();
                                }
                            }
                            disabled={
                                loading ||
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
                                loading
                                    ? "Guardando..."
                                    : contacto
                                        ? "Guardar cambios"
                                        : "Crear contacto"
                            }
                        </button>
                    </div>
                </div>
            </div>

            <ConfirmacionFacturacionModal
                open={
                    confirmarSalida
                }
                titulo="¿Descartar cambios?"
                descripcion="Hay modificaciones en este contacto que todavía no han sido guardadas."
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
   OPCIÓN
========================================================= */

function Opcion(
    {
        titulo,
        descripcion,
        checked,
        onChange,
    }:
        {
            titulo:
            string;

            descripcion:
            string;

            checked:
            boolean;

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
                cursor-pointer
                items-start
                justify-between
                gap-4
                rounded-xl
                border
                p-4
                transition
                ${checked
                    ? "border-cyan-200 bg-cyan-50/50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
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
                onChange={
                    (
                        event
                    ) =>
                        onChange(
                            event.target.checked
                        )
                }
                className="
                    mt-0.5
                    h-5
                    w-5
                    shrink-0
                    accent-cyan-600
                "
            />
        </label>
    );
}