// src/components/modals-facturasBaseapi/receptores-cobranza/ReceptorCobranzaContactoModal.tsx

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
    getCobranzaReceptoresApiError,
    type ReceptorCobranzaContacto,
} from "./cobranzaReceptoresApi";

import ConfirmacionFacturacionModal
    from "../receptores-facturacion/ConfirmacionFacturacionModal";

/* =========================================================
   TYPES
========================================================= */

export type ContactoCobranzaForm = {
    nombre: string;
    email: string;

    principal: boolean;
    activo: boolean;
    recibeCobranza: boolean;
};

type Props = {
    open: boolean;

    contacto?:
    ReceptorCobranzaContacto |
    null;

    loading?: boolean;

    onClose: () => void;

    onSubmit: (
        data: ContactoCobranzaForm
    ) => Promise<void>;
};

/* =========================================================
   FORM
========================================================= */

const FORM_INICIAL:
    ContactoCobranzaForm =
{
    nombre: "",
    email: "",

    principal: false,
    activo: true,
    recibeCobranza: true,
};

function normalizarForm(
    form: ContactoCobranzaForm
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

        recibeCobranza:
            form.recibeCobranza,
    };
}

/* =========================================================
   COMPONENT
========================================================= */

export default function ReceptorCobranzaContactoModal(
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
        useState<ContactoCobranzaForm>(
            FORM_INICIAL
        );

    const [
        formInicial,
        setFormInicial,
    ] =
        useState<ContactoCobranzaForm>(
            FORM_INICIAL
        );

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null
        );

    const [
        confirmarSalida,
        setConfirmarSalida,
    ] =
        useState(
            false
        );

    /* =========================================================
       CARGAR FORM
    ========================================================= */

    useEffect(
        () => {
            if (
                !open
            ) {
                return;
            }

            const nuevoForm:
                ContactoCobranzaForm =
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

                        recibeCobranza:
                            contacto.recibeCobranza,
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

    /* =========================================================
       GUARDAR
    ========================================================= */

    const guardar =
        async () => {
            setError(
                null
            );

            const nombre =
                form.nombre
                    .trim();

            const email =
                form.email
                    .trim()
                    .toLowerCase();

            if (
                !email
            ) {
                setError(
                    "Debes ingresar un correo electrónico."
                );

                return;
            }

            const emailRegex =
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            if (
                !emailRegex.test(
                    email
                )
            ) {
                setError(
                    "El correo electrónico ingresado no es válido."
                );

                return;
            }

            try {
                await onSubmit({
                    nombre,
                    email,

                    principal:
                        form.principal,

                    activo:
                        form.activo,

                    recibeCobranza:
                        form.recibeCobranza,
                });
            } catch (
            err
            ) {
                setError(
                    getCobranzaReceptoresApiError(
                        err
                    )
                );
            }
        };

    return (
        <>
            {/* BACKDROP */}
            <button
                type="button"
                aria-label="Cerrar contacto"
                onClick={
                    solicitarCierre
                }
                className="
                    fixed
                    inset-0
                    z-[120]
                    cursor-default
                    bg-slate-950/45
                    backdrop-blur-[2px]
                "
            />

            {/* MODAL */}
            <div
                className="
                    fixed
                    left-1/2
                    top-1/2
                    z-[130]
                    w-[calc(100%-2rem)]
                    max-w-lg
                    -translate-x-1/2
                    -translate-y-1/2
                    overflow-hidden
                    rounded-2xl
                    bg-white
                    shadow-2xl
                "
                role="dialog"
                aria-modal="true"
            >
                {/* HEADER */}
                <div
                    className="
                        flex
                        items-start
                        justify-between
                        gap-4
                        border-b
                        border-slate-200
                        px-5
                        py-4
                    "
                >
                    <div>
                        <h2
                            className="
                                text-lg
                                font-bold
                                text-slate-900
                            "
                        >
                            {
                                contacto
                                    ? "Editar contacto"
                                    : "Agregar contacto"
                            }
                        </h2>

                        <p
                            className="
                                mt-1
                                text-sm
                                text-slate-500
                            "
                        >
                            Configura el destinatario utilizado para los recordatorios de cobranza.
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
                        className="
                            shrink-0
                            rounded-lg
                            p-2
                            text-slate-400
                            transition
                            hover:bg-slate-100
                            hover:text-slate-700
                            disabled:opacity-50
                        "
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* CONTENT */}
                <div
                    className="
                        space-y-5
                        px-5
                        py-5
                    "
                >
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
                                text-rose-700
                            "
                        >
                            {error}
                        </div>
                    )}

                    {/* NOMBRE */}
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

                    {/* EMAIL */}
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
                            Correo electrónico
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

                    {/* OPCIONES */}
                    <div className="space-y-3">

                        <OpcionContacto
                            titulo="Contacto activo"
                            descripcion="Permite utilizar este contacto en los procesos de cobranza."
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

                        <OpcionContacto
                            titulo="Recibe cobranza"
                            descripcion="Autoriza el envío de recordatorios de cobranza a este correo."
                            checked={
                                form.recibeCobranza
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

                        <OpcionContacto
                            titulo="Contacto principal"
                            descripcion="Marca este contacto como destinatario principal del receptor."
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

                {/* FOOTER */}
                <div
                    className="
                        flex
                        items-center
                        justify-end
                        gap-2
                        border-t
                        border-slate-200
                        bg-slate-50
                        px-5
                        py-4
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
                            disabled:opacity-50
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
                            loading
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
                            disabled:opacity-60
                        "
                    >
                        <Save size={17} />

                        {
                            loading
                                ? "Guardando..."
                                : contacto
                                    ? "Guardar cambios"
                                    : "Agregar contacto"
                        }
                    </button>
                </div>
            </div>

            {/* CONFIRMACIÓN SALIDA */}
            <ConfirmacionFacturacionModal
                open={
                    confirmarSalida
                }
                titulo="¿Descartar cambios?"
                descripcion="Hay cambios sin guardar en el contacto. Si cierras ahora, se perderán."
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

function OpcionContacto(
    {
        titulo,
        descripcion,
        checked,
        onChange,
    }:
        {
            titulo: string;
            descripcion: string;

            checked: boolean;

            onChange:
            (
                value: boolean
            ) => void;
        }
) {
    return (
        <label
            className="
                flex
                cursor-pointer
                items-start
                justify-between
                gap-4
                rounded-xl
                border
                border-slate-200
                p-4
                transition
                hover:bg-slate-50
            "
        >
            <div className="min-w-0">
                <div
                    className="
                        text-sm
                        font-semibold
                        text-slate-800
                    "
                >
                    {titulo}
                </div>

                <div
                    className="
                        mt-1
                        text-xs
                        leading-5
                        text-slate-500
                    "
                >
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