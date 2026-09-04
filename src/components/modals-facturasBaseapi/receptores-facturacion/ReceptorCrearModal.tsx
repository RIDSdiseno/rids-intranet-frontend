// src/components/modals-facturasBaseapi/receptores-facturacion/ReceptorCrearModal.tsx
import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Building2,
    FileText,
    Save,
    X,
} from "lucide-react";

import {
    crearReceptor,
    getFacturaApiError,
    type ReceptorFacturacion,
} from "./facturaReceptoresApi";

import ConfirmacionFacturacionModal
    from "./ConfirmacionFacturacionModal";

type Props = {
    open:
    boolean;

    onClose:
    () => void;

    onCreated:
    (
        receptor:
            ReceptorFacturacion
    ) => Promise<void> | void;
};

type FormReceptorNuevo = {
    rut:
    string;

    razonSocial:
    string;

    activo:
    boolean;
};

const FORM_INICIAL:
    FormReceptorNuevo =
{
    rut:
        "",

    razonSocial:
        "",

    activo:
        true,
};

function normalizarRutInput(
    value:
        string
) {
    return value
        .replace(
            /[^0-9kK.-]/g,
            ""
        )
        .toUpperCase();
}

function normalizarForm(
    form:
        FormReceptorNuevo
) {
    return {
        rut:
            form.rut
                .replace(
                    /[^0-9kK]/g,
                    ""
                )
                .toUpperCase(),

        razonSocial:
            form.razonSocial
                .trim(),

        activo:
            form.activo,
    };
}

export default function ReceptorCrearModal(
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
        useState<
            FormReceptorNuevo
        >(
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

            setForm({
                ...FORM_INICIAL,
            });

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
            () => {
                const normalizado =
                    normalizarForm(
                        form
                    );

                return (
                    normalizado.rut !==
                    "" ||
                    normalizado.razonSocial !==
                    "" ||
                    normalizado.activo !==
                    true
                );
            },
            [
                form,
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

    const guardar =
        async () => {
            try {
                setSaving(
                    true
                );

                setError(
                    null
                );

                const rut =
                    form.rut
                        .replace(
                            /[^0-9kK]/g,
                            ""
                        )
                        .toUpperCase();

                if (
                    !rut
                ) {
                    throw new Error(
                        "El RUT es obligatorio"
                    );
                }

                if (
                    rut.length <
                    2
                ) {
                    throw new Error(
                        "Ingresa un RUT válido"
                    );
                }

                const razonSocial =
                    form.razonSocial
                        .trim();

                if (
                    !razonSocial
                ) {
                    throw new Error(
                        "La razón social es obligatoria"
                    );
                }

                const response =
                    await crearReceptor({
                        rut,

                        razonSocial,

                        activo:
                            form.activo,
                    });

                await onCreated(
                    response.data
                );
            } catch (
            err
            ) {
                setError(
                    getFacturaApiError(
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
                        sm:max-w-xl
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
                                    "
                                >
                                    Nuevo receptor
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
                                        Creación en curso
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
                                Crea manualmente un receptor que aún no haya sido detectado desde el RCV.
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

                                <div className="relative">
                                    <FileText
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
                                                            normalizarRutInput(
                                                                event.target.value
                                                            ),
                                                    })
                                                )
                                        }
                                        placeholder="76.123.456-7"
                                        autoComplete="off"
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

                                <p
                                    className="
                                        mt-1.5
                                        text-xs
                                        text-slate-500
                                    "
                                >
                                    El sistema almacenará el RUT normalizado sin puntos ni guion.
                                </p>
                            </div>

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
                                        placeholder="EMPRESA EJEMPLO SPA"
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
                                    ${form.activo
                                        ? "border-cyan-200 bg-cyan-50/50"
                                        : "border-slate-200 bg-white"
                                    }
                                `}
                            >
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold text-slate-800">
                                        Receptor activo
                                    </div>

                                    <div
                                        className="
                                            mt-1
                                            text-xs
                                            leading-5
                                            text-slate-500
                                        "
                                    >
                                        El registro quedará disponible para su posterior configuración.
                                    </div>
                                </div>

                                <input
                                    type="checkbox"
                                    checked={
                                        form.activo
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

                                                    activo:
                                                        event.target.checked,
                                                })
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

                            <div
                                className="
                                    rounded-xl
                                    border
                                    border-cyan-200
                                    bg-cyan-50
                                    p-4
                                    text-sm
                                    leading-6
                                    text-cyan-800
                                "
                            >
                                El nuevo receptor se creará con
                                <strong>
                                    {" "}Recibe facturas deshabilitado
                                </strong>.
                                Después podrás agregar sus contactos y habilitar el envío desde
                                <strong>
                                    {" "}Gestionar
                                </strong>.
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