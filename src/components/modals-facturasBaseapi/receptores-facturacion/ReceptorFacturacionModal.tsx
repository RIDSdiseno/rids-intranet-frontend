// src/components/modals-facturasBaseapi/receptores-facturacion/ReceptorFacturacionModal.tsx
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    AlertCircle,
    Building2,
    Edit3,
    Mail,
    Plus,
    RefreshCw,
    Save,
    Trash2,
    X,
} from "lucide-react";

import {
    actualizarContactoReceptor,
    actualizarReceptor,
    crearContactoReceptor,
    eliminarContactoReceptor,
    eliminarReceptor,
    getFacturaApiError,
    obtenerReceptor,
    type ReceptorFacturacion,
    type ReceptorFacturacionContacto,
} from "./facturaReceptoresApi";

import ReceptorContactoModal, {
    type ContactoFacturacionForm,
} from "./ReceptorContactoModal";

import ConfirmacionFacturacionModal
    from "./ConfirmacionFacturacionModal";

type Props = {
    open:
    boolean;

    receptorId:
    number | null;

    onClose:
    () => void;

    onUpdated:
    () => Promise<void> | void;
};

type FormReceptor = {
    razonSocial:
    string;

    activo:
    boolean;

    recibeFacturas:
    boolean;
};

const FORM_INICIAL:
    FormReceptor =
{
    razonSocial:
        "",

    activo:
        true,

    recibeFacturas:
        false,
};

function formatRut(
    value:
        string
) {
    const clean =
        String(
            value ?? ""
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

        recibeFacturas:
            form.recibeFacturas,
    };
}

export default function ReceptorFacturacionModal(
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
            ReceptorFacturacion | null
        >(
            null
        );

    const [
        form,
        setForm,
    ] =
        useState<
            FormReceptor
        >(
            FORM_INICIAL
        );

    const [
        formInicial,
        setFormInicial,
    ] =
        useState<
            FormReceptor
        >(
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
        useState<
            string | null
        >(
            null
        );

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
            ReceptorFacturacionContacto | null
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
            ReceptorFacturacionContacto | null
        >(
            null
        );

    const [
        eliminando,
        setEliminando,
    ] =
        useState(
            false
        );

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
                        await obtenerReceptor(
                            receptorId
                        );

                    const nuevoForm:
                        FormReceptor =
                    {
                        razonSocial:
                            response.data
                                .razonSocial ??
                            "",

                        activo:
                            response.data
                                .activo,

                        recibeFacturas:
                            response.data
                                .recibeFacturas,
                    };

                    setReceptor(
                        response.data
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
                        getFacturaApiError(
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
                            contacto.recibeFacturas
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
                eliminando
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
                setSaving(
                    true
                );

                setError(
                    null
                );

                await actualizarReceptor(
                    receptorId,
                    {
                        razonSocial:
                            form.razonSocial
                                .trim() ||
                            null,

                        activo:
                            form.activo,

                        recibeFacturas:
                            form.recibeFacturas,
                    }
                );

                await cargar();

                await onUpdated();
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

    /* =========================================================
       GUARDAR CONTACTO
    ========================================================= */

    const guardarContacto =
        async (
            data:
                ContactoFacturacionForm
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

                if (
                    contactoEditando
                ) {
                    await actualizarContactoReceptor(
                        receptorId,
                        contactoEditando.id,
                        data
                    );
                } else {
                    await crearContactoReceptor(
                        receptorId,
                        data
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
            } catch (
            err
            ) {
                /*
                 * Lanzamos de nuevo el error.
                 *
                 * ReceptorContactoModal lo captura y
                 * muestra el mensaje del backend.
                 */
                throw new Error(
                    getFacturaApiError(
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
                setEliminando(
                    true
                );

                setError(
                    null
                );

                await eliminarContactoReceptor(
                    receptorId,
                    contactoEliminar.id
                );

                setContactoEliminar(
                    null
                );

                await cargar();

                await onUpdated();
            } catch (
            err
            ) {
                setContactoEliminar(
                    null
                );

                setError(
                    getFacturaApiError(
                        err
                    )
                );
            } finally {
                setEliminando(
                    false
                );
            }
        };

    // =========================================================
    // ELIMINAR RECEPTOR
    // =========================================================

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

                await eliminarReceptor(
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
                    getFacturaApiError(
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
        sm:max-w-2xl
        lg:max-w-3xl
        xl:max-w-4xl
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
                                Gestionar receptor
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
                                    {receptor.origen ===
                                        "RCV"
                                        ? "Externo RCV"
                                        : receptor.origen}
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
                                        Configuración utilizada por la automatización de facturas.
                                    </p>
                                </div>

                                <div className="space-y-5">
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

                                    <OpcionReceptor
                                        titulo="Receptor activo"
                                        descripcion="Permite que este receptor participe en la automatización."
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

                                    <OpcionReceptor
                                        titulo="Recibe facturas"
                                        descripcion={
                                            contactosValidos >
                                                0
                                                ? `Autoriza el envío a ${contactosValidos} contacto(s) válido(s).`
                                                : "Primero debes agregar al menos un contacto válido."
                                        }
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
                                        sm:items-center
                                        sm:justify-between
                                    "
                                >
                                    <div>
                                        <h3 className="font-bold text-slate-900">
                                            Contactos de facturación
                                        </h3>

                                        <p className="mt-1 text-sm text-slate-500">
                                            Destinatarios autorizados para recibir los documentos.
                                        </p>
                                    </div>

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
                                            w-full
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
                                            sm:w-auto
                                        "
                                    >
                                        <Plus size={16} />

                                        Agregar contacto
                                    </button>
                                </div>

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

                                        <div className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                                            Agrega al menos un contacto activo antes de habilitar este receptor.
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {receptor.contactos.map(
                                            (
                                                contacto
                                            ) => (
                                                <ContactoCard
                                                    key={
                                                        contacto.id
                                                    }
                                                    contacto={
                                                        contacto
                                                    }
                                                    onEditar={
                                                        () => {
                                                            setContactoEditando(
                                                                contacto
                                                            );

                                                            setContactoModalOpen(
                                                                true
                                                            );
                                                        }
                                                    }
                                                    onEliminar={
                                                        () =>
                                                            setContactoEliminar(
                                                                contacto
                                                            )
                                                    }
                                                />
                                            )
                                        )}
                                    </div>
                                )}
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
        flex-col
        gap-3
        border-t
        border-slate-200
        bg-slate-50
        px-4
        py-4
        sm:flex-row
        sm:items-center
        sm:justify-between
        sm:px-6
    "
                    >
                        <button
                            type="button"
                            onClick={
                                () =>
                                    setConfirmarEliminarReceptor(
                                        true
                                    )
                            }
                            disabled={
                                saving ||
                                eliminandoReceptor ||
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
            border-rose-200
            bg-white
            px-4
            py-2.5
            text-sm
            font-semibold
            text-rose-600
            transition
            hover:bg-rose-50
            disabled:cursor-not-allowed
            disabled:opacity-50
            sm:w-auto
        "
                        >
                            <Trash2 size={17} />

                            Eliminar receptor
                        </button>

                        <div
                            className="
            flex
            flex-col-reverse
            gap-2
            sm:flex-row
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
                    </div>
                )}
            </div>

            {/* CONTACTO */}
            <ReceptorContactoModal
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

            {/* ELIMINAR */}
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
                    eliminando
                }
                onCancel={
                    () => {
                        if (
                            eliminando
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

            <ConfirmacionFacturacionModal
                open={
                    confirmarEliminarReceptor
                }
                titulo="Eliminar receptor"
                descripcion={
                    receptor
                        ? `¿Seguro que deseas eliminar ${receptor.razonSocial ?? formatRut(receptor.rut)}? Solo será posible si no tiene contactos ni historial de envíos asociado.`
                        : "¿Seguro que deseas eliminar este receptor?"
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

            {/* SALIR CON CAMBIOS */}
            <ConfirmacionFacturacionModal
                open={
                    confirmarSalida
                }
                titulo="¿Descartar cambios?"
                descripcion="Has modificado la configuración del receptor y todavía no has guardado los cambios."
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
   COMPONENTES
========================================================= */

function InfoItem(
    {
        label,
        value,
        icon,
    }:
        {
            label:
            string;

            value:
            string;

            icon?:
            React.ReactNode;
        }
) {
    return (
        <div
            className="
                rounded-xl
                border
                border-slate-200
                bg-slate-50
                p-4
            "
        >
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {label}
            </div>

            <div
                className="
                    mt-2
                    flex
                    items-center
                    gap-2
                    text-sm
                    font-medium
                    text-slate-700
                "
            >
                {icon}

                <span className="min-w-0 break-words">
                    {value}
                </span>
            </div>
        </div>
    );
}

function OpcionReceptor(
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
                    : "border-slate-200 hover:bg-slate-50"
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

function ContactoCard(
    {
        contacto,
        onEditar,
        onEliminar,
    }:
        {
            contacto:
            ReceptorFacturacionContacto;

            onEditar:
            () => void;

            onEliminar:
            () => void;
        }
) {
    return (
        <div
            className="
                rounded-xl
                border
                border-slate-200
                p-4
                transition
                hover:border-slate-300
            "
        >
            <div
                className="
                    flex
                    flex-col
                    gap-4
                    sm:flex-row
                    sm:items-center
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
                        <span className="font-semibold text-slate-900">
                            {
                                contacto.nombre ??
                                "Sin nombre"
                            }
                        </span>

                        {contacto.principal && (
                            <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-semibold text-cyan-700">
                                Principal
                            </span>
                        )}

                        {!contacto.activo && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                                Inactivo
                            </span>
                        )}

                        {contacto.activo &&
                            contacto.recibeFacturas && (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                    Habilitado
                                </span>
                            )}

                        {contacto.activo &&
                            !contacto.recibeFacturas && (
                                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                                    No recibe facturas
                                </span>
                            )}
                    </div>

                    <div
                        className="
                            mt-1.5
                            flex
                            min-w-0
                            items-center
                            gap-2
                            text-sm
                            text-slate-500
                        "
                    >
                        <Mail
                            size={14}
                            className="shrink-0"
                        />

                        <span className="break-all">
                            {contacto.email}
                        </span>
                    </div>
                </div>

                <div
                    className="
                        grid
                        grid-cols-2
                        gap-2
                        sm:flex
                        sm:shrink-0
                    "
                >
                    <button
                        type="button"
                        onClick={
                            onEditar
                        }
                        className="
                            inline-flex
                            min-h-10
                            items-center
                            justify-center
                            gap-2
                            rounded-lg
                            border
                            border-slate-200
                            px-3
                            text-sm
                            font-semibold
                            text-slate-600
                            transition
                            hover:bg-slate-50
                        "
                    >
                        <Edit3 size={15} />

                        <span className="sm:hidden">
                            Editar
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={
                            onEliminar
                        }
                        className="
                            inline-flex
                            min-h-10
                            items-center
                            justify-center
                            gap-2
                            rounded-lg
                            border
                            border-rose-200
                            px-3
                            text-sm
                            font-semibold
                            text-rose-600
                            transition
                            hover:bg-rose-50
                        "
                    >
                        <Trash2 size={15} />

                        <span className="sm:hidden">
                            Eliminar
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}