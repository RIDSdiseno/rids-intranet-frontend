// src/components/modals-empresa/suscripciones/SuscripcionContratoModal.tsx

import {
    useEffect,
    useState,
} from "react";

import {
    X,
} from "lucide-react";

import {
    actualizarSuscripcion,
    crearSuscripcion,
} from "./suscripciones.api";

import type {
    SuscripcionContrato,
    SuscripcionContratoPayload,
    SuscripcionEjecutivo,
    SuscripcionContactoSoporte
} from "./suscripciones.types";

import {
    DatePicker,
} from "antd";

import dayjs from "dayjs";

import esES from "antd/es/date-picker/locale/es_ES";

/* =========================================================
   TYPES
========================================================= */

type Props = {
    open: boolean;

    empresaId: number;

    suscripcion:
    SuscripcionContrato | null;

    onClose: () => void;

    onSaved: () => void |
        Promise<void>;
};

/* =========================================================
   FORM INICIAL
========================================================= */

const EMPTY_FORM:
    SuscripcionContratoPayload =
{
    proveedor:
        "",

    fabricante:
        "",

    productoPlan:
        "",

    cantidadLicencias:
        1,

    costoMensual:
        null,

    moneda:
        "CLP",

    fechaInicio:
        null,

    fechaTermino:
        null,

    fechaRenovacion:
        null,

    numeroContrato:
        null,

    numeroOferta:
        null,

    observaciones:
        null,

    activo:
        true,

    ejecutivosComerciales: [
        {
            nombre:
                "",

            email:
                null,

            telefono:
                null,

            principal:
                true,
        },
    ],

    contactosSoporte: [
        {
            nombre:
                null,

            email:
                null,

            telefono:
                null,

            principal:
                true,
        },
    ],
};

/* =========================================================
   HELPERS
========================================================= */

function fechaInput(
    value:
        string | null
) {
    if (
        !value
    ) {
        return "";
    }

    return value.slice(
        0,
        10
    );
}

function formatearMontoInput(
    value:
        number | null
) {
    if (
        value === null ||
        Number.isNaN(
            value
        )
    ) {
        return "";
    }

    return new Intl.NumberFormat(
        "es-CL",
        {
            maximumFractionDigits:
                2,
        }
    ).format(
        value
    );
}

function parsearMontoInput(
    value:
        string
): number | null {
    const limpio =
        value
            .replace(
                /\./g,
                ""
            )
            .replace(
                /,/g,
                "."
            )
            .replace(
                /[^\d.]/g,
                ""
            );

    if (
        !limpio
    ) {
        return null;
    }

    const numero =
        Number(
            limpio
        );

    return Number.isFinite(
        numero
    )
        ? numero
        : null;
}

/* =========================================================
   COMPONENTE
========================================================= */

export default function SuscripcionContratoModal({
    open,

    empresaId,

    suscripcion,

    onClose,

    onSaved,
}: Props) {
    const [
        form,
        setForm,
    ] =
        useState<
            SuscripcionContratoPayload
        >(
            EMPTY_FORM
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

    /* =====================================================
       CARGAR DATOS EN EDICIÓN
    ===================================================== */

    useEffect(
        () => {
            if (
                !open
            ) {
                return;
            }

            setError(
                null
            );

            if (
                !suscripcion
            ) {
                setForm({
                    ...EMPTY_FORM,
                });

                return;
            }

            setForm({
                proveedor:
                    suscripcion.proveedor,

                fabricante:
                    suscripcion.fabricante,

                productoPlan:
                    suscripcion.productoPlan,

                cantidadLicencias:
                    suscripcion.cantidadLicencias,

                costoMensual:
                    suscripcion.costoMensual !==
                        null
                        ? Number(
                            suscripcion.costoMensual
                        )
                        : null,

                moneda:
                    suscripcion.moneda ||
                    "CLP",

                fechaInicio:
                    fechaInput(
                        suscripcion.fechaInicio
                    ) ||
                    null,

                fechaTermino:
                    fechaInput(
                        suscripcion.fechaTermino
                    ) ||
                    null,

                fechaRenovacion:
                    fechaInput(
                        suscripcion.fechaRenovacion
                    ) ||
                    null,

                numeroContrato:
                    suscripcion.numeroContrato,

                numeroOferta:
                    suscripcion.numeroOferta,

                observaciones:
                    suscripcion.observaciones,

                activo:
                    suscripcion.activo,

                ejecutivosComerciales:
                    suscripcion
                        .ejecutivosComerciales
                        ?.length
                        ? suscripcion
                            .ejecutivosComerciales
                            .map(
                                ejecutivo => ({
                                    id:
                                        ejecutivo.id,

                                    nombre:
                                        ejecutivo.nombre,

                                    email:
                                        ejecutivo.email,

                                    telefono:
                                        ejecutivo.telefono,

                                    principal:
                                        ejecutivo.principal,
                                })
                            )
                        : [
                            {
                                nombre:
                                    "",

                                email:
                                    null,

                                telefono:
                                    null,

                                principal:
                                    true,
                            },
                        ],

                contactosSoporte:
                    suscripcion
                        .contactosSoporte
                        ?.length
                        ? suscripcion
                            .contactosSoporte
                            .map(
                                contacto => ({
                                    id:
                                        contacto.id,

                                    nombre:
                                        contacto.nombre,

                                    email:
                                        contacto.email,

                                    telefono:
                                        contacto.telefono,

                                    principal:
                                        contacto.principal,
                                })
                            )
                        : [
                            {
                                nombre:
                                    null,

                                email:
                                    null,

                                telefono:
                                    null,

                                principal:
                                    true,
                            },
                        ],
            });
        },
        [
            open,
            suscripcion,
        ]
    );

    function marcarEjecutivoPrincipal(
        index:
            number
    ) {
        setForm(
            previous => ({
                ...previous,

                ejecutivosComerciales:
                    previous
                        .ejecutivosComerciales
                        .map(
                            (
                                ejecutivo,
                                i
                            ) => ({
                                ...ejecutivo,

                                principal:
                                    i ===
                                    index,
                            })
                        ),
            })
        );
    }

    function marcarSoportePrincipal(
        index:
            number
    ) {
        setForm(
            previous => ({
                ...previous,

                contactosSoporte:
                    previous
                        .contactosSoporte
                        .map(
                            (
                                contacto,
                                i
                            ) => ({
                                ...contacto,

                                principal:
                                    i ===
                                    index,
                            })
                        ),
            })
        );
    }

    function agregarEjecutivo() {
        setForm(
            previous => ({
                ...previous,

                ejecutivosComerciales: [
                    ...previous.ejecutivosComerciales,

                    {
                        nombre: "",
                        email: null,
                        telefono: null,
                        principal: false,
                    },
                ],
            })
        );
    }

    function actualizarEjecutivo(
        index: number,
        field: keyof SuscripcionEjecutivo,
        value:
            string |
            boolean |
            null
    ) {
        setForm(
            previous => ({
                ...previous,

                ejecutivosComerciales:
                    previous.ejecutivosComerciales.map(
                        (
                            ejecutivo,
                            i
                        ) =>
                            i ===
                                index
                                ? {
                                    ...ejecutivo,

                                    [field]:
                                        value,
                                }
                                : ejecutivo
                    ),
            })
        );
    }

    function eliminarEjecutivo(
        index:
            number
    ) {
        setForm(
            previous => ({
                ...previous,

                ejecutivosComerciales:
                    previous.ejecutivosComerciales.filter(
                        (
                            _,
                            i
                        ) =>
                            i !==
                            index
                    ),
            })
        );
    }

    function agregarContactoSoporte() {
        setForm(
            previous => ({
                ...previous,

                contactosSoporte: [
                    ...previous.contactosSoporte,

                    {
                        nombre: null,
                        email: null,
                        telefono: null,
                        principal: false,
                    },
                ],
            })
        );
    }

    function actualizarContactoSoporte(
        index: number,
        field:
            keyof SuscripcionContactoSoporte,
        value:
            string |
            boolean |
            null
    ) {
        setForm(
            previous => ({
                ...previous,

                contactosSoporte:
                    previous.contactosSoporte.map(
                        (
                            contacto,
                            i
                        ) =>
                            i ===
                                index
                                ? {
                                    ...contacto,

                                    [field]:
                                        value,
                                }
                                : contacto
                    ),
            })
        );
    }

    function eliminarContactoSoporte(
        index:
            number
    ) {
        setForm(
            previous => ({
                ...previous,

                contactosSoporte:
                    previous.contactosSoporte.filter(
                        (
                            _,
                            i
                        ) =>
                            i !==
                            index
                    ),
            })
        );
    }

    /* =====================================================
       UPDATE GENÉRICO
    ===================================================== */

    const update =
        <
            K extends keyof
            SuscripcionContratoPayload
        >(
            key:
                K,

            value:
                SuscripcionContratoPayload[K]
        ) => {
            setForm(
                previous => ({
                    ...previous,

                    [key]:
                        value,
                })
            );
        };

    /* =====================================================
       GUARDAR
    ===================================================== */

    async function handleSubmit(
        event:
            React.FormEvent
    ) {
        event.preventDefault();

        setError(
            null
        );

        const proveedor =
            form.proveedor.trim();

        const fabricante =
            form.fabricante.trim();

        const productoPlan =
            form.productoPlan.trim();

        if (
            !proveedor ||
            !fabricante ||
            !productoPlan
        ) {
            setError(
                "Proveedor, fabricante y producto/plan son obligatorios."
            );

            return;
        }

        if (
            form.cantidadLicencias <
            1
        ) {
            setError(
                "La cantidad de licencias debe ser al menos 1."
            );

            return;
        }

        if (
            form.costoMensual !==
            null &&
            form.costoMensual <
            0
        ) {
            setError(
                "El costo mensual no puede ser negativo."
            );

            return;
        }

        if (
            form.fechaInicio &&
            form.fechaTermino
        ) {
            const inicio =
                new Date(
                    `${form.fechaInicio}T00:00:00`
                );

            const termino =
                new Date(
                    `${form.fechaTermino}T00:00:00`
                );

            if (
                termino <
                inicio
            ) {
                setError(
                    "La fecha de término no puede ser anterior a la fecha de inicio."
                );

                return;
            }
        }

        try {
            setSaving(
                true
            );

            const payload:
                SuscripcionContratoPayload =
            {
                ...form,

                proveedor,

                fabricante,

                productoPlan,
            };

            if (
                suscripcion
            ) {
                await actualizarSuscripcion(
                    empresaId,
                    suscripcion.id,
                    payload
                );
            } else {
                await crearSuscripcion(
                    empresaId,
                    payload
                );
            }

            await onSaved();

            onClose();
        } catch (
        error
        ) {
            console.error(
                "Error guardando suscripción:",
                error
            );

            setError(
                suscripcion
                    ? "No fue posible actualizar la suscripción."
                    : "No fue posible crear la suscripción."
            );
        } finally {
            setSaving(
                false
            );
        }
    }

    /* =====================================================
       NO RENDER
    ===================================================== */

    if (
        !open
    ) {
        return null;
    }

    /* =====================================================
       CLASES
    ===================================================== */

    const inputClass =
        [
            "w-full",
            "rounded-lg",
            "border",
            "border-slate-300",
            "bg-white",
            "px-3",
            "py-2.5",
            "text-sm",
            "text-slate-900",
            "outline-none",
            "transition",
            "placeholder:text-slate-400",
            "focus:border-cyan-500",
            "focus:ring-2",
            "focus:ring-cyan-500/20",
            "disabled:cursor-not-allowed",
            "disabled:bg-slate-100",
        ].join(
            " "
        );

    const labelClass =
        [
            "mb-1.5",
            "block",
            "text-sm",
            "font-medium",
            "text-slate-700",
        ].join(
            " "
        );

    const sectionClass =
        [
            "rounded-xl",
            "border",
            "border-slate-200",
            "bg-slate-50/50",
            "p-4",
        ].join(
            " "
        );

    const sectionTitleClass =
        [
            "mb-4",
            "text-sm",
            "font-semibold",
            "uppercase",
            "tracking-wide",
            "text-slate-700",
        ].join(
            " "
        );

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <div
            className="
                fixed
                inset-0
                z-[100]
                flex
                items-end
                justify-center
                bg-black/50
                p-0
                sm:items-center
                sm:p-4
            "
            role="dialog"
            aria-modal="true"
            aria-labelledby="suscripcion-contrato-title"
        >
            <div
                className="
                    flex
                    h-[100dvh]
                    w-full
                    flex-col
                    overflow-hidden
                    border
                    border-slate-200
                    bg-white
                    shadow-2xl
                    sm:h-[90vh]
                    sm:max-w-5xl
                    sm:rounded-2xl
                "
            >
                {/* =================================================
                    HEADER
                ================================================= */}

                <div
                    className="
                        flex
                        shrink-0
                        items-start
                        justify-between
                        gap-3
                        border-b
                        border-slate-200
                        bg-white
                        px-4
                        py-3
                        sm:items-center
                        sm:px-6
                        sm:py-4
                    "
                >
                    <div>
                        <h2
                            id="suscripcion-contrato-title"
                            className="
                                text-lg
                                font-semibold
                                text-slate-900
                            "
                        >
                            {
                                suscripcion
                                    ? "Editar suscripción"
                                    : "Nueva suscripción"
                            }
                        </h2>

                        <p
                            className="
                                mt-0.5
                                text-sm
                                text-slate-500
                            "
                        >
                            Licencias, servicios y contratos asociados a la empresa.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        disabled={
                            saving
                        }
                        className="
                            rounded-lg
                            p-2
                            text-slate-500
                            transition
                            hover:bg-slate-100
                            hover:text-slate-900
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                        "
                        title="Cerrar"
                        aria-label="Cerrar modal"
                    >
                        <X
                            size={
                                20
                            }
                        />
                    </button>
                </div>

                {/* =================================================
                    FORM
                ================================================= */}

                <form
                    onSubmit={
                        handleSubmit
                    }
                    className="
                        flex
                        min-h-0
                        flex-1
                        flex-col
                    "
                >
                    {/* =============================================
                        CONTENIDO CON SCROLL
                    ============================================= */}

                    <div
                        className="
                            flex-1
                            overflow-y-auto
                            px-4
                            py-4
                            sm:px-6
                            sm:py-5
                        "
                    >
                        <div className="space-y-5">
                            {/* =====================================
                                SERVICIO
                            ===================================== */}

                            <section
                                className={
                                    sectionClass
                                }
                            >
                                <h3
                                    className={
                                        sectionTitleClass
                                    }
                                >
                                    Servicio
                                </h3>

                                <div
                                    className="
                                        grid
                                        gap-4
                                        md:grid-cols-2
                                        lg:grid-cols-3
                                    "
                                >
                                    <div>
                                        <label
                                            className={
                                                labelClass
                                            }
                                        >
                                            Proveedor / partner *
                                        </label>

                                        <input
                                            type="text"
                                            className={
                                                inputClass
                                            }
                                            value={
                                                form.proveedor
                                            }
                                            onChange={
                                                e =>
                                                    update(
                                                        "proveedor",
                                                        e.target.value
                                                    )
                                            }
                                            disabled={
                                                saving
                                            }
                                            autoComplete="off"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            className={
                                                labelClass
                                            }
                                        >
                                            Fabricante *
                                        </label>

                                        <input
                                            type="text"
                                            className={
                                                inputClass
                                            }
                                            value={
                                                form.fabricante
                                            }
                                            onChange={
                                                e =>
                                                    update(
                                                        "fabricante",
                                                        e.target.value
                                                    )
                                            }
                                            disabled={
                                                saving
                                            }
                                            autoComplete="off"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            className={
                                                labelClass
                                            }
                                        >
                                            Producto / plan *
                                        </label>

                                        <input
                                            type="text"
                                            className={
                                                inputClass
                                            }
                                            value={
                                                form.productoPlan
                                            }
                                            onChange={
                                                e =>
                                                    update(
                                                        "productoPlan",
                                                        e.target.value
                                                    )
                                            }
                                            disabled={
                                                saving
                                            }
                                            autoComplete="off"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            className={
                                                labelClass
                                            }
                                        >
                                            Cantidad licencias
                                        </label>

                                        <input
                                            type="number"
                                            min={
                                                1
                                            }
                                            step={
                                                1
                                            }
                                            className={
                                                inputClass
                                            }
                                            value={
                                                form.cantidadLicencias
                                            }
                                            onChange={
                                                e =>
                                                    update(
                                                        "cantidadLicencias",
                                                        Math.max(
                                                            1,
                                                            Number(
                                                                e.target.value ||
                                                                1
                                                            )
                                                        )
                                                    )
                                            }
                                            disabled={
                                                saving
                                            }
                                        />
                                    </div>

                                    <div>
                                        <label
                                            className={
                                                labelClass
                                            }
                                        >
                                            Costo mensual
                                        </label>

                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            className={
                                                inputClass
                                            }
                                            value={
                                                formatearMontoInput(
                                                    form.costoMensual
                                                )
                                            }
                                            onChange={
                                                e => {
                                                    const valor =
                                                        parsearMontoInput(
                                                            e.target.value
                                                        );

                                                    update(
                                                        "costoMensual",
                                                        valor
                                                    );
                                                }
                                            }
                                            disabled={
                                                saving
                                            }
                                            placeholder="0"
                                        />
                                    </div>

                                    <div>
                                        <label
                                            className={
                                                labelClass
                                            }
                                        >
                                            Moneda
                                        </label>

                                        <select
                                            className={
                                                inputClass
                                            }
                                            value={
                                                form.moneda
                                            }
                                            onChange={
                                                e =>
                                                    update(
                                                        "moneda",
                                                        e.target.value
                                                    )
                                            }
                                            disabled={
                                                saving
                                            }
                                        >
                                            <option value="CLP">
                                                CLP
                                            </option>

                                            <option value="USD">
                                                USD
                                            </option>

                                            <option value="EUR">
                                                EUR
                                            </option>

                                            <option value="UF">
                                                UF
                                            </option>
                                        </select>
                                    </div>
                                </div>
                            </section>

                            {/* =====================================
    VIGENCIA
===================================== */}

                            <section
                                className={
                                    sectionClass
                                }
                            >
                                <h3
                                    className={
                                        sectionTitleClass
                                    }
                                >
                                    Vigencia
                                </h3>

                                <div
                                    className="
            grid
            gap-4
            md:grid-cols-3
        "
                                >
                                    {/* =========================
            FECHA INICIO
        ========================= */}

                                    <div>
                                        <label
                                            className={
                                                labelClass
                                            }
                                        >
                                            Fecha inicio
                                        </label>

                                        <DatePicker
                                            locale={
                                                esES
                                            }
                                            value={
                                                form.fechaInicio
                                                    ? dayjs(
                                                        form.fechaInicio,
                                                        "YYYY-MM-DD"
                                                    )
                                                    : null
                                            }
                                            onChange={
                                                date => {
                                                    update(
                                                        "fechaInicio",
                                                        date
                                                            ? date.format(
                                                                "YYYY-MM-DD"
                                                            )
                                                            : null
                                                    );
                                                }
                                            }
                                            format="DD-MM-YYYY"
                                            placeholder="Seleccionar fecha"
                                            allowClear
                                            disabled={
                                                saving
                                            }
                                            className="w-full"
                                            size="large"
                                        />
                                    </div>

                                    {/* =========================
            FECHA TÉRMINO
        ========================= */}

                                    <div>
                                        <label
                                            className={
                                                labelClass
                                            }
                                        >
                                            Fecha término
                                        </label>

                                        <DatePicker
                                            locale={
                                                esES
                                            }
                                            value={
                                                form.fechaTermino
                                                    ? dayjs(
                                                        form.fechaTermino,
                                                        "YYYY-MM-DD"
                                                    )
                                                    : null
                                            }
                                            onChange={
                                                date => {
                                                    update(
                                                        "fechaTermino",
                                                        date
                                                            ? date.format(
                                                                "YYYY-MM-DD"
                                                            )
                                                            : null
                                                    );
                                                }
                                            }
                                            disabledDate={
                                                current => {
                                                    if (
                                                        !form.fechaInicio
                                                    ) {
                                                        return false;
                                                    }

                                                    return current.isBefore(
                                                        dayjs(
                                                            form.fechaInicio,
                                                            "YYYY-MM-DD"
                                                        ),
                                                        "day"
                                                    );
                                                }
                                            }
                                            format="DD-MM-YYYY"
                                            placeholder="Seleccionar fecha"
                                            allowClear
                                            disabled={
                                                saving
                                            }
                                            className="w-full"
                                            size="large"
                                        />
                                    </div>

                                    {/* =========================
            FECHA RENOVACIÓN
        ========================= */}

                                    <div>
                                        <label
                                            className={
                                                labelClass
                                            }
                                        >
                                            Fecha renovación
                                        </label>

                                        <DatePicker
                                            locale={
                                                esES
                                            }
                                            value={
                                                form.fechaRenovacion
                                                    ? dayjs(
                                                        form.fechaRenovacion,
                                                        "YYYY-MM-DD"
                                                    )
                                                    : null
                                            }
                                            onChange={
                                                date => {
                                                    update(
                                                        "fechaRenovacion",
                                                        date
                                                            ? date.format(
                                                                "YYYY-MM-DD"
                                                            )
                                                            : null
                                                    );
                                                }
                                            }
                                            disabledDate={
                                                current => {
                                                    if (
                                                        !form.fechaInicio
                                                    ) {
                                                        return false;
                                                    }

                                                    return current.isBefore(
                                                        dayjs(
                                                            form.fechaInicio,
                                                            "YYYY-MM-DD"
                                                        ),
                                                        "day"
                                                    );
                                                }
                                            }
                                            format="DD-MM-YYYY"
                                            placeholder="Seleccionar fecha"
                                            allowClear
                                            disabled={
                                                saving
                                            }
                                            className="w-full"
                                            size="large"
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* =====================================
                                CONTRATO
                            ===================================== */}

                            <section
                                className={
                                    sectionClass
                                }
                            >
                                <h3
                                    className={
                                        sectionTitleClass
                                    }
                                >
                                    Contrato
                                </h3>

                                <div
                                    className="
                                        grid
                                        gap-4
                                        md:grid-cols-2
                                    "
                                >
                                    <div>
                                        <label
                                            className={
                                                labelClass
                                            }
                                        >
                                            N° contrato
                                        </label>

                                        <input
                                            type="text"
                                            className={
                                                inputClass
                                            }
                                            value={
                                                form.numeroContrato ??
                                                ""
                                            }
                                            onChange={
                                                e =>
                                                    update(
                                                        "numeroContrato",
                                                        e.target.value ||
                                                        null
                                                    )
                                            }
                                            disabled={
                                                saving
                                            }
                                        />
                                    </div>

                                    <div>
                                        <label
                                            className={
                                                labelClass
                                            }
                                        >
                                            N° oferta
                                        </label>

                                        <input
                                            type="text"
                                            className={
                                                inputClass
                                            }
                                            value={
                                                form.numeroOferta ??
                                                ""
                                            }
                                            onChange={
                                                e =>
                                                    update(
                                                        "numeroOferta",
                                                        e.target.value ||
                                                        null
                                                    )
                                            }
                                            disabled={
                                                saving
                                            }
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* =====================================
                                EJECUTIVO COMERCIAL
                            ===================================== */}

                            <section
                                className={
                                    sectionClass
                                }
                            >
                                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <h3
                                        className={
                                            sectionTitleClass
                                        }
                                    >
                                        Ejecutivo comercial
                                    </h3>

                                    <button
                                        type="button"
                                        onClick={
                                            agregarEjecutivo
                                        }
                                        className="
                                            w-full
                                            rounded-lg
                                            border
                                            border-slate-300
                                            bg-white
                                            px-3
                                            py-2
                                            text-xs
                                            font-medium
                                            text-slate-700
                                            hover:bg-slate-50
                                            sm:w-auto
                                        "
                                    >
                                        + Agregar ejecutivo
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {
                                        form.ejecutivosComerciales.map(
                                            (
                                                ejecutivo,
                                                index
                                            ) => (
                                                <div
                                                    key={
                                                        index
                                                    }
                                                    className="
                            rounded-xl
                            border
                            border-slate-200
                            bg-white
                            p-4
                        "
                                                >
                                                    <div
                                                        className="
                                grid
                                gap-4
                                md:grid-cols-3
                            "
                                                    >
                                                        <div>
                                                            <label className={labelClass}>
                                                                Nombre
                                                            </label>

                                                            <input
                                                                type="text"
                                                                className={inputClass}
                                                                value={
                                                                    ejecutivo.nombre
                                                                }
                                                                onChange={
                                                                    e =>
                                                                        actualizarEjecutivo(
                                                                            index,
                                                                            "nombre",
                                                                            e.target.value
                                                                        )
                                                                }
                                                                placeholder="Nombre del ejecutivo"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className={labelClass}>
                                                                Email
                                                            </label>

                                                            <input
                                                                type="email"
                                                                className={inputClass}
                                                                value={
                                                                    ejecutivo.email ??
                                                                    ""
                                                                }
                                                                onChange={
                                                                    e =>
                                                                        actualizarEjecutivo(
                                                                            index,
                                                                            "email",
                                                                            e.target.value ||
                                                                            null
                                                                        )
                                                                }
                                                                placeholder="ejecutivo@partner.cl"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className={labelClass}>
                                                                Teléfono
                                                            </label>

                                                            <input
                                                                type="tel"
                                                                className={inputClass}
                                                                value={
                                                                    ejecutivo.telefono ??
                                                                    ""
                                                                }
                                                                onChange={
                                                                    e =>
                                                                        actualizarEjecutivo(
                                                                            index,
                                                                            "telefono",
                                                                            e.target.value ||
                                                                            null
                                                                        )
                                                                }
                                                                placeholder="+56 9..."
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 flex items-center justify-between">
                                                        <label className="flex items-center gap-2 text-sm text-slate-700">
                                                            <input
                                                                type="radio"
                                                                name="ejecutivo-principal"
                                                                checked={
                                                                    ejecutivo.principal
                                                                }
                                                                onChange={
                                                                    () =>
                                                                        marcarEjecutivoPrincipal(
                                                                            index
                                                                        )
                                                                }
                                                                disabled={
                                                                    saving
                                                                }
                                                            />

                                                            Contacto principal
                                                        </label>

                                                        {
                                                            form.ejecutivosComerciales.length >
                                                            1 &&
                                                            (
                                                                <button
                                                                    type="button"
                                                                    onClick={
                                                                        () =>
                                                                            eliminarEjecutivo(
                                                                                index
                                                                            )
                                                                    }
                                                                    className="
                                            text-sm
                                            font-medium
                                            text-red-600
                                            hover:text-red-700
                                        "
                                                                >
                                                                    Eliminar
                                                                </button>
                                                            )
                                                        }
                                                    </div>
                                                </div>
                                            )
                                        )
                                    }
                                </div>
                            </section>

                            <section
                                className={
                                    sectionClass
                                }
                            >
                                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <h3
                                        className={
                                            sectionTitleClass
                                        }
                                    >
                                        Soporte
                                    </h3>

                                    <button
                                        type="button"
                                        onClick={
                                            agregarContactoSoporte
                                        }
                                        className="
                                            w-full
                                            rounded-lg
                                            border
                                            border-slate-300
                                            bg-white
                                            px-3
                                            py-2
                                            text-xs
                                            font-medium
                                            text-slate-700
                                            hover:bg-slate-50
                                            sm:w-auto
                                        "
                                    >
                                        + Agregar contacto
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {
                                        form.contactosSoporte.map(
                                            (
                                                contacto,
                                                index
                                            ) => (
                                                <div
                                                    key={
                                                        index
                                                    }
                                                    className="
                            rounded-xl
                            border
                            border-slate-200
                            bg-white
                            p-4
                        "
                                                >
                                                    <div
                                                        className="
                                grid
                                gap-4
                                md:grid-cols-3
                            "
                                                    >
                                                        <div>
                                                            <label className={labelClass}>
                                                                Nombre
                                                            </label>

                                                            <input
                                                                type="text"
                                                                className={inputClass}
                                                                value={
                                                                    contacto.nombre ??
                                                                    ""
                                                                }
                                                                onChange={
                                                                    e =>
                                                                        actualizarContactoSoporte(
                                                                            index,
                                                                            "nombre",
                                                                            e.target.value ||
                                                                            null
                                                                        )
                                                                }
                                                                placeholder="Nombre contacto soporte"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className={labelClass}>
                                                                Email
                                                            </label>

                                                            <input
                                                                type="email"
                                                                className={inputClass}
                                                                value={
                                                                    contacto.email ??
                                                                    ""
                                                                }
                                                                onChange={
                                                                    e =>
                                                                        actualizarContactoSoporte(
                                                                            index,
                                                                            "email",
                                                                            e.target.value ||
                                                                            null
                                                                        )
                                                                }
                                                                placeholder="soporte@partner.cl"
                                                            />
                                                        </div>

                                                        <div>
                                                            <label className={labelClass}>
                                                                Teléfono
                                                            </label>

                                                            <input
                                                                type="tel"
                                                                className={inputClass}
                                                                value={
                                                                    contacto.telefono ??
                                                                    ""
                                                                }
                                                                onChange={
                                                                    e =>
                                                                        actualizarContactoSoporte(
                                                                            index,
                                                                            "telefono",
                                                                            e.target.value ||
                                                                            null
                                                                        )
                                                                }
                                                                placeholder="+56 2..."
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="mt-3 flex items-center justify-between">
                                                        <label className="flex items-center gap-2 text-sm text-slate-700">
                                                            <input
                                                                type="radio"
                                                                name="soporte-principal"
                                                                checked={
                                                                    contacto.principal
                                                                }
                                                                onChange={
                                                                    () =>
                                                                        marcarSoportePrincipal(
                                                                            index
                                                                        )
                                                                }
                                                                disabled={
                                                                    saving
                                                                }
                                                            />

                                                            Contacto principal
                                                        </label>

                                                        {
                                                            form.contactosSoporte.length >
                                                            1 &&
                                                            (
                                                                <button
                                                                    type="button"
                                                                    onClick={
                                                                        () =>
                                                                            eliminarContactoSoporte(
                                                                                index
                                                                            )
                                                                    }
                                                                    className="
                                            text-sm
                                            font-medium
                                            text-red-600
                                        "
                                                                >
                                                                    Eliminar
                                                                </button>
                                                            )
                                                        }
                                                    </div>
                                                </div>
                                            )
                                        )
                                    }
                                </div>
                            </section>

                            {/* =====================================
                                OBSERVACIONES
                            ===================================== */}

                            <section
                                className={
                                    sectionClass
                                }
                            >
                                <h3
                                    className={
                                        sectionTitleClass
                                    }
                                >
                                    Observaciones
                                </h3>

                                <textarea
                                    rows={
                                        4
                                    }
                                    className={
                                        inputClass
                                    }
                                    placeholder="Información adicional sobre la suscripción o contrato..."
                                    value={
                                        form.observaciones ??
                                        ""
                                    }
                                    onChange={
                                        e =>
                                            update(
                                                "observaciones",
                                                e.target.value ||
                                                null
                                            )
                                    }
                                    disabled={
                                        saving
                                    }
                                />
                            </section>

                            {/* =====================================
                                ESTADO
                            ===================================== */}

                            <section
                                className={
                                    sectionClass
                                }
                            >
                                <label
                                    className="
                                        flex
                                        cursor-pointer
                                        items-center
                                        gap-3
                                    "
                                >
                                    <input
                                        type="checkbox"
                                        checked={
                                            form.activo
                                        }
                                        onChange={
                                            e =>
                                                update(
                                                    "activo",
                                                    e.target.checked
                                                )
                                        }
                                        disabled={
                                            saving
                                        }
                                        className="
                                            h-4
                                            w-4
                                            rounded
                                        "
                                    />

                                    <div>
                                        <div
                                            className="
                                                text-sm
                                                font-medium
                                                text-slate-900
                                            "
                                        >
                                            Suscripción activa
                                        </div>

                                        <div
                                            className="
                                                mt-0.5
                                                text-xs
                                                text-slate-500
                                            "
                                        >
                                            Desactiva esta opción cuando el servicio ya no esté vigente.
                                        </div>
                                    </div>
                                </label>
                            </section>

                            {/* =====================================
                                ERROR
                            ===================================== */}

                            {
                                error &&
                                (
                                    <div
                                        className="
                                            rounded-lg
                                            border
                                            border-red-200
                                            bg-red-50
                                            px-4
                                            py-3
                                            text-sm
                                            text-red-700
                                        "
                                    >
                                        {
                                            error
                                        }
                                    </div>
                                )
                            }
                        </div>
                    </div>

                    {/* =============================================
                        FOOTER FIJO
                    ============================================= */}

                    <div
                        className="
                            flex
                            shrink-0
                            flex-col-reverse
                            gap-2
                            border-t
                            border-slate-200
                            bg-white
                            px-4
                            py-3
                            sm:flex-row
                            sm:items-center
                            sm:justify-end
                            sm:gap-3
                            sm:px-6
                            sm:py-4
                        "
                    >
                        <button
                            type="button"
                            onClick={
                                onClose
                            }
                            disabled={
                                saving
                            }
                            className="
                                w-full
                                rounded-lg
                                border
                                border-slate-300
                                bg-white
                                px-4
                                py-2
                                text-sm
                                font-medium
                                text-slate-700
                                transition
                                hover:bg-slate-50
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                                sm:w-auto
                            "
                        >
                            Cancelar
                        </button>

                        <button
                            type="submit"
                            disabled={
                                saving
                            }
                            className="
                                w-full
                                rounded-lg
                                bg-blue-600
                                px-5
                                py-2
                                text-sm
                                font-medium
                                text-white
                                transition
                                hover:bg-blue-700
                                disabled:cursor-not-allowed
                                disabled:opacity-50
                                sm:w-auto
                            "
                        >
                            {
                                saving
                                    ? "Guardando..."
                                    : suscripcion
                                        ? "Guardar cambios"
                                        : "Crear suscripción"
                            }
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}