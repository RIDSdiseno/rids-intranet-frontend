// src/components/modals-facturasBaseapi/receptores-cobranza/ReceptorCobranzaCrearModal.tsx

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Building2,
    CreditCard,
    Save,
    X,
} from "lucide-react";

import {
    crearReceptorCobranza,
    getCobranzaReceptoresApiError,
    type CrearReceptorCobranzaPayload,
    type ReceptorCobranza,
} from "./cobranzaReceptoresApi";

import ConfirmacionFacturacionModal
    from "../receptores-facturacion/ConfirmacionFacturacionModal";

/* =========================================================
   TYPES
========================================================= */

type Props = {
    open: boolean;

    onClose: () => void;

    onCreated:
    (
        receptor:
            ReceptorCobranza
    ) =>
        Promise<void> |
        void;
};

type FormCrear = {
    rut: string;
    razonSocial: string;
    diasCredito: string;
};

/* =========================================================
   FORM
========================================================= */

const FORM_INICIAL:
    FormCrear =
{
    rut: "",
    razonSocial: "",
    diasCredito: "30",
};

function normalizarRut(
    value: string
) {
    return String(
        value ??
        ""
    )
        .replace(
            /[^0-9kK]/g,
            ""
        )
        .toUpperCase();
}

function formatRut(
    value: string
) {
    const clean =
        normalizarRut(
            value
        );

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
    form: FormCrear
) {
    return {
        rut:
            normalizarRut(
                form.rut
            ),

        razonSocial:
            form.razonSocial
                .trim(),

        diasCredito:
            form.diasCredito
                .trim(),
    };
}

/* =========================================================
   COMPONENT
========================================================= */

export default function ReceptorCobranzaCrearModal(
    {
        open,
        onClose,
        onCreated,
    }:
        Props
) {
    const [
        form,
        setForm,
    ] =
        useState<FormCrear>(
            FORM_INICIAL
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
        confirmarSalida,
        setConfirmarSalida,
    ] =
        useState(
            false
        );

    /* =========================================================
       RESET
    ========================================================= */

    useEffect(
        () => {
            if (
                !open
            ) {
                return;
            }

            setForm({
                ...FORM_INICIAL,
            });

            setSaving(
                false
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
                        FORM_INICIAL
                    )
                ),
            [
                form,
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
                saving
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
            try {
                setError(
                    null
                );

                const rut =
                    normalizarRut(
                        form.rut
                    );

                const razonSocial =
                    form.razonSocial
                        .trim();

                if (
                    rut.length <
                    2
                ) {
                    setError(
                        "Debes ingresar un RUT válido."
                    );

                    return;
                }

                if (
                    !razonSocial
                ) {
                    setError(
                        "Debes ingresar la razón social."
                    );

                    return;
                }

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

                setSaving(
                    true
                );

                /*
                 * Construcción explícita para evitar problemas
                 * con exactOptionalPropertyTypes.
                 */
                const payload:
                    CrearReceptorCobranzaPayload =
                {
                    rut,

                    razonSocial,

                    activo:
                        true,

                    diasCredito,
                };

                const receptor =
                    await crearReceptorCobranza(
                        payload
                    );

                await onCreated(
                    receptor
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

    return (
        <>
            {/* BACKDROP */}
            <button
                type="button"
                aria-label="Cerrar creación"
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

            {/* MODAL */}
            <div
                className="
                    fixed
                    left-1/2
                    top-1/2
                    z-[110]
                    w-[calc(100%-2rem)]
                    max-w-xl
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
                        py-5
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
                            Nuevo receptor de cobranza
                        </h2>

                        <p
                            className="
                                mt-1
                                text-sm
                                leading-5
                                text-slate-500
                            "
                        >
                            Crea un cliente financiero y luego configura sus contactos de cobranza.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            solicitarCierre
                        }
                        disabled={
                            saving
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

                    {/* RUT */}
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
                            RUT
                        </label>

                        <input
                            value={
                                form.rut
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

                                            rut:
                                                event.target.value,
                                        })
                                    )
                            }
                            onBlur={
                                () => {
                                    const formatted =
                                        formatRut(
                                            form.rut
                                        );

                                    setForm(
                                        (
                                            current
                                        ) => ({
                                            ...current,

                                            rut:
                                                formatted,
                                        })
                                    );
                                }
                            }
                            placeholder="76.123.456-7"
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

                    {/* RAZÓN SOCIAL */}
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
                            Razón social
                        </label>

                        <div className="relative">
                            <Building2
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
                                placeholder="Razón social"
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

                    {/* DÍAS CRÉDITO */}
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
                                placeholder="30"
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
                            Se utilizará para calcular el vencimiento cuando no exista una fecha de vencimiento más específica.
                        </p>
                    </div>

                    {/* INFO */}
                    <div
                        className="
                            rounded-xl
                            border
                            border-cyan-200
                            bg-cyan-50
                            px-4
                            py-3
                            text-sm
                            leading-5
                            text-cyan-800
                        "
                    >
                        El receptor se creará sin cobranza habilitada. Después de crearlo podrás agregar contactos y activar el envío de recordatorios.
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
                            saving
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
                            saving
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
                            saving
                                ? "Creando..."
                                : "Crear receptor"
                        }
                    </button>
                </div>
            </div>

            <ConfirmacionFacturacionModal
                open={
                    confirmarSalida
                }
                titulo="¿Cancelar creación?"
                descripcion="Ya ingresaste información para el nuevo receptor. Si cierras ahora, esos datos se perderán."
                textoConfirmar="Descartar creación"
                textoCancelar="Seguir creando"
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