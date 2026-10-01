// src/components/modals-empresa/suscripciones/SuscripcionContratoDetalleModal.tsx



import {

    CalendarDays,

    CircleDollarSign,

    FileText,

    Mail,

    Phone,

    UserRound,

    X,

} from "lucide-react";



import type {

    SuscripcionContrato,

} from "./suscripciones.types";



type Props = {

    open: boolean;



    suscripcion:

    SuscripcionContrato | null;



    onClose: () => void;

};



function formatDate(

    value:

        string | null

) {

    if (

        !value

    ) {

        return "—";

    }



    return new Date(

        value

    ).toLocaleDateString(

        "es-CL",

        {

            timeZone:

                "UTC",

        }

    );

}



function formatCurrency(

    value:

        number | string | null,



    moneda:

        string

) {

    if (

        value === null

    ) {

        return "—";

    }



    const numero =

        Number(

            value

        );



    if (

        Number.isNaN(

            numero

        )

    ) {

        return "—";

    }



    if (

        moneda ===

        "CLP"

    ) {

        return new Intl

            .NumberFormat(

                "es-CL",

                {

                    style:

                        "currency",



                    currency:

                        "CLP",



                    maximumFractionDigits:

                        0,

                }

            )

            .format(

                numero

            );

    }



    if (

        moneda ===

        "USD" ||

        moneda ===

        "EUR"

    ) {

        return new Intl

            .NumberFormat(

                "es-CL",

                {

                    style:

                        "currency",



                    currency:

                        moneda,



                    maximumFractionDigits:

                        2,

                }

            )

            .format(

                numero

            );

    }



    return `${numero.toLocaleString("es-CL")} ${moneda}`;

}



export default function SuscripcionContratoDetalleModal({

    open,

    suscripcion,

    onClose,

}: Props) {

    if (

        !open ||

        !suscripcion

    ) {

        return null;

    }



    const datoClass =

        "rounded-xl border border-slate-200 bg-slate-50/50 p-4";



    const labelClass =

        "text-xs font-semibold uppercase tracking-wide text-slate-500";



    const valueClass =

        "mt-1 text-sm font-medium text-slate-900";



    return (

        <div

            className="

                fixed

                inset-0

                z-[105]

                flex

                items-center

                justify-center

                bg-black/50

                p-4

            "

            role="dialog"

            aria-modal="true"

            aria-labelledby="suscripcion-detalle-title"

        >

            <div

                className="

                    flex

                    max-h-[90vh]

                    w-full

                    max-w-4xl

                    flex-col

                    overflow-hidden

                    rounded-2xl

                    border

                    border-slate-200

                    bg-white

                    shadow-2xl

                "

            >

                {/* HEADER */}

                <div

                    className="

                        flex

                        shrink-0

                        items-center

                        justify-between

                        border-b

                        border-slate-200

                        bg-white

                        px-6

                        py-4

                    "

                >

                    <div>

                        <h2

                            id="suscripcion-detalle-title"

                            className="text-lg font-semibold text-slate-900"

                        >

                            Detalle de suscripción

                        </h2>



                        <p className="mt-0.5 break-words text-sm text-slate-500">

                            {

                                suscripcion.fabricante

                            }

                            {" · "}

                            {

                                suscripcion.productoPlan

                            }

                        </p>

                    </div>



                    <button

                        type="button"

                        onClick={

                            onClose

                        }

                        className="

                            rounded-lg

                            p-2

                            text-slate-500

                            transition

                            hover:bg-slate-100

                            hover:text-slate-900

                        "

                        title="Cerrar"

                    >

                        <X size={20} />

                    </button>

                </div>



                {/* BODY */}

                <div

                    className="

                        flex-1

                        overflow-y-auto

                        px-6

                        py-5

                    "

                >

                    <div className="space-y-5">

                        {/* SERVICIO */}

                        <section>

                            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">

                                Servicio

                            </h3>



                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">

                                <div className={datoClass}>

                                    <div className={labelClass}>

                                        Proveedor / partner

                                    </div>



                                    <div className={valueClass}>

                                        {

                                            suscripcion.proveedor ||

                                            "—"

                                        }

                                    </div>

                                </div>



                                <div className={datoClass}>

                                    <div className={labelClass}>

                                        Fabricante

                                    </div>



                                    <div className={valueClass}>

                                        {

                                            suscripcion.fabricante ||

                                            "—"

                                        }

                                    </div>

                                </div>



                                <div className={datoClass}>

                                    <div className={labelClass}>

                                        Producto / plan

                                    </div>



                                    <div className={valueClass}>

                                        {

                                            suscripcion.productoPlan ||

                                            "—"

                                        }

                                    </div>

                                </div>



                                <div className={datoClass}>

                                    <div className={labelClass}>

                                        Licencias

                                    </div>



                                    <div className={valueClass}>

                                        {

                                            suscripcion.cantidadLicencias

                                        }

                                    </div>

                                </div>



                                <div className={datoClass}>

                                    <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">

                                        <CircleDollarSign size={14} />



                                        Costo mensual

                                    </div>



                                    <div className={valueClass}>

                                        {

                                            formatCurrency(

                                                suscripcion.costoMensual,

                                                suscripcion.moneda

                                            )

                                        }

                                    </div>

                                </div>



                                <div className={datoClass}>

                                    <div className={labelClass}>

                                        Moneda

                                    </div>



                                    <div className={valueClass}>

                                        {

                                            suscripcion.moneda ||

                                            "—"

                                        }

                                    </div>

                                </div>

                            </div>

                        </section>



                        {/* VIGENCIA */}

                        <section>

                            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">

                                Vigencia

                            </h3>



                            <div className="grid gap-4 md:grid-cols-3">

                                <div className={datoClass}>

                                    <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">

                                        <CalendarDays size={14} />



                                        Fecha inicio

                                    </div>



                                    <div className={valueClass}>

                                        {

                                            formatDate(

                                                suscripcion.fechaInicio

                                            )

                                        }

                                    </div>

                                </div>



                                <div className={datoClass}>

                                    <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">

                                        <CalendarDays size={14} />



                                        Fecha término

                                    </div>



                                    <div className={valueClass}>

                                        {

                                            formatDate(

                                                suscripcion.fechaTermino

                                            )

                                        }

                                    </div>

                                </div>



                                <div className={datoClass}>

                                    <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">

                                        <CalendarDays size={14} />



                                        Renovación

                                    </div>



                                    <div className={valueClass}>

                                        {

                                            formatDate(

                                                suscripcion.fechaRenovacion

                                            )

                                        }

                                    </div>

                                </div>

                            </div>

                        </section>



                        {/* CONTRATO */}

                        <section>

                            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">

                                Contrato

                            </h3>



                            <div className="grid gap-4 md:grid-cols-2">

                                <div className={datoClass}>

                                    <div className={labelClass}>

                                        N° contrato

                                    </div>



                                    <div className={valueClass}>

                                        {

                                            suscripcion.numeroContrato ||

                                            "—"

                                        }

                                    </div>

                                </div>



                                <div className={datoClass}>

                                    <div className={labelClass}>

                                        N° oferta

                                    </div>



                                    <div className={valueClass}>

                                        {

                                            suscripcion.numeroOferta ||

                                            "—"

                                        }

                                    </div>

                                </div>

                            </div>



                            {

                                suscripcion.contratoNombre &&

                                (

                                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4">

                                        <div className="flex items-center gap-2">

                                            <FileText

                                                size={

                                                    18

                                                }

                                                className="text-slate-500"

                                            />



                                            <div>

                                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">

                                                    Archivo adjunto

                                                </div>



                                                <div className="mt-1 text-sm font-medium text-slate-900">

                                                    {

                                                        suscripcion.contratoNombre

                                                    }

                                                </div>

                                            </div>

                                        </div>

                                    </div>

                                )

                            }

                        </section>



                        {/* =================================================
    EJECUTIVOS COMERCIALES
================================================= */}

                        <section>
                            <div
                                className="
            mb-3
            flex
            items-center
            justify-between
            gap-3
        "
                            >
                                <h3
                                    className="
                text-sm
                font-semibold
                uppercase
                tracking-wide
                text-slate-700
            "
                                >
                                    Ejecutivos comerciales
                                </h3>

                                {
                                    suscripcion
                                        .ejecutivosComerciales
                                        .length >
                                    0 &&
                                    (
                                        <span
                                            className="
                        rounded-full
                        bg-slate-100
                        px-2.5
                        py-1
                        text-xs
                        font-medium
                        text-slate-600
                    "
                                        >
                                            {
                                                suscripcion
                                                    .ejecutivosComerciales
                                                    .length
                                            }
                                        </span>
                                    )
                                }
                            </div>

                            {
                                suscripcion
                                    .ejecutivosComerciales
                                    .length >
                                    0
                                    ? (
                                        <div className="space-y-3">
                                            {
                                                suscripcion
                                                    .ejecutivosComerciales
                                                    .map(
                                                        ejecutivo => (
                                                            <div
                                                                key={
                                                                    ejecutivo.id ??
                                                                    `${ejecutivo.nombre}-${ejecutivo.email ?? ""}`
                                                                }
                                                                className="
                                            rounded-xl
                                            border
                                            border-slate-200
                                            bg-slate-50/50
                                            p-4
                                        "
                                                            >
                                                                <div
                                                                    className="
                                                mb-3
                                                flex
                                                flex-col
                                                gap-2
                                                sm:flex-row
                                                sm:items-center
                                                sm:justify-between
                                            "
                                                                >
                                                                    <div
                                                                        className="
                                                    flex
                                                    min-w-0
                                                    items-center
                                                    gap-2
                                                "
                                                                    >
                                                                        <UserRound
                                                                            size={
                                                                                18
                                                                            }
                                                                            className="shrink-0 text-slate-500"
                                                                        />

                                                                        <span
                                                                            className="
                                                        break-words
                                                        text-sm
                                                        font-semibold
                                                        text-slate-900
                                                    "
                                                                        >
                                                                            {
                                                                                ejecutivo.nombre ||
                                                                                "Sin nombre"
                                                                            }
                                                                        </span>
                                                                    </div>

                                                                    {
                                                                        ejecutivo.principal &&
                                                                        (
                                                                            <span
                                                                                className="
                                                            inline-flex
                                                            w-fit
                                                            shrink-0
                                                            rounded-full
                                                            border
                                                            border-blue-200
                                                            bg-blue-50
                                                            px-2.5
                                                            py-1
                                                            text-xs
                                                            font-medium
                                                            text-blue-700
                                                        "
                                                                            >
                                                                                Principal
                                                                            </span>
                                                                        )
                                                                    }
                                                                </div>

                                                                <div
                                                                    className="
                                                grid
                                                gap-3
                                                md:grid-cols-2
                                            "
                                                                >
                                                                    <div>
                                                                        <div
                                                                            className="
                                                        flex
                                                        items-center
                                                        gap-1
                                                        text-xs
                                                        font-semibold
                                                        uppercase
                                                        tracking-wide
                                                        text-slate-500
                                                    "
                                                                        >
                                                                            <Mail
                                                                                size={
                                                                                    13
                                                                                }
                                                                            />

                                                                            Email
                                                                        </div>

                                                                        <div
                                                                            className="
                                                        mt-1
                                                        break-all
                                                        text-sm
                                                        text-slate-900
                                                    "
                                                                        >
                                                                            {
                                                                                ejecutivo.email ||
                                                                                "—"
                                                                            }
                                                                        </div>
                                                                    </div>

                                                                    <div>
                                                                        <div
                                                                            className="
                                                        flex
                                                        items-center
                                                        gap-1
                                                        text-xs
                                                        font-semibold
                                                        uppercase
                                                        tracking-wide
                                                        text-slate-500
                                                    "
                                                                        >
                                                                            <Phone
                                                                                size={
                                                                                    13
                                                                                }
                                                                            />

                                                                            Teléfono
                                                                        </div>

                                                                        <div
                                                                            className="
                                                        mt-1
                                                        text-sm
                                                        text-slate-900
                                                    "
                                                                        >
                                                                            {
                                                                                ejecutivo.telefono ||
                                                                                "—"
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    )
                                            }
                                        </div>
                                    )
                                    : (
                                        <div
                                            className="
                        rounded-xl
                        border
                        border-dashed
                        border-slate-300
                        bg-slate-50/50
                        px-4
                        py-6
                        text-center
                        text-sm
                        text-slate-500
                    "
                                        >
                                            No hay ejecutivos comerciales registrados.
                                        </div>
                                    )
                            }
                        </section>

                        {/* =================================================
    CONTACTOS DE SOPORTE
================================================= */}

                        <section>
                            <div
                                className="
            mb-3
            flex
            items-center
            justify-between
            gap-3
        "
                            >
                                <h3
                                    className="
                text-sm
                font-semibold
                uppercase
                tracking-wide
                text-slate-700
            "
                                >
                                    Contactos de soporte
                                </h3>

                                {
                                    suscripcion
                                        .contactosSoporte
                                        .length >
                                    0 &&
                                    (
                                        <span
                                            className="
                        rounded-full
                        bg-slate-100
                        px-2.5
                        py-1
                        text-xs
                        font-medium
                        text-slate-600
                    "
                                        >
                                            {
                                                suscripcion
                                                    .contactosSoporte
                                                    .length
                                            }
                                        </span>
                                    )
                                }
                            </div>

                            {
                                suscripcion
                                    .contactosSoporte
                                    .length >
                                    0
                                    ? (
                                        <div className="space-y-3">
                                            {
                                                suscripcion
                                                    .contactosSoporte
                                                    .map(
                                                        contacto => (
                                                            <div
                                                                key={
                                                                    contacto.id ??
                                                                    `${contacto.email ?? ""}-${contacto.telefono ?? ""}`
                                                                }
                                                                className="
                                            rounded-xl
                                            border
                                            border-slate-200
                                            bg-slate-50/50
                                            p-4
                                        "
                                                            >
                                                                <div
                                                                    className="
                                                mb-3
                                                flex
                                                flex-col
                                                gap-2
                                                sm:flex-row
                                                sm:items-center
                                                sm:justify-between
                                            "
                                                                >
                                                                    <div
                                                                        className="
                                                    flex
                                                    min-w-0
                                                    items-center
                                                    gap-2
                                                "
                                                                    >
                                                                        <UserRound
                                                                            size={
                                                                                18
                                                                            }
                                                                            className="shrink-0 text-slate-500"
                                                                        />

                                                                        <span
                                                                            className="
                                                        break-words
                                                        text-sm
                                                        font-semibold
                                                        text-slate-900
                                                    "
                                                                        >
                                                                            {
                                                                                contacto.nombre ||
                                                                                "Contacto de soporte"
                                                                            }
                                                                        </span>
                                                                    </div>

                                                                    {
                                                                        contacto.principal &&
                                                                        (
                                                                            <span
                                                                                className="
                                                            inline-flex
                                                            w-fit
                                                            shrink-0
                                                            rounded-full
                                                            border
                                                            border-blue-200
                                                            bg-blue-50
                                                            px-2.5
                                                            py-1
                                                            text-xs
                                                            font-medium
                                                            text-blue-700
                                                        "
                                                                            >
                                                                                Principal
                                                                            </span>
                                                                        )
                                                                    }
                                                                </div>

                                                                <div
                                                                    className="
                                                grid
                                                gap-3
                                                md:grid-cols-2
                                            "
                                                                >
                                                                    <div>
                                                                        <div
                                                                            className="
                                                        flex
                                                        items-center
                                                        gap-1
                                                        text-xs
                                                        font-semibold
                                                        uppercase
                                                        tracking-wide
                                                        text-slate-500
                                                    "
                                                                        >
                                                                            <Mail
                                                                                size={
                                                                                    13
                                                                                }
                                                                            />

                                                                            Email
                                                                        </div>

                                                                        <div
                                                                            className="
                                                        mt-1
                                                        break-all
                                                        text-sm
                                                        text-slate-900
                                                    "
                                                                        >
                                                                            {
                                                                                contacto.email ||
                                                                                "—"
                                                                            }
                                                                        </div>
                                                                    </div>

                                                                    <div>
                                                                        <div
                                                                            className="
                                                        flex
                                                        items-center
                                                        gap-1
                                                        text-xs
                                                        font-semibold
                                                        uppercase
                                                        tracking-wide
                                                        text-slate-500
                                                    "
                                                                        >
                                                                            <Phone
                                                                                size={
                                                                                    13
                                                                                }
                                                                            />

                                                                            Teléfono
                                                                        </div>

                                                                        <div
                                                                            className="
                                                        mt-1
                                                        text-sm
                                                        text-slate-900
                                                    "
                                                                        >
                                                                            {
                                                                                contacto.telefono ||
                                                                                "—"
                                                                            }
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )
                                                    )
                                            }
                                        </div>
                                    )
                                    : (
                                        <div
                                            className="
                        rounded-xl
                        border
                        border-dashed
                        border-slate-300
                        bg-slate-50/50
                        px-4
                        py-6
                        text-center
                        text-sm
                        text-slate-500
                    "
                                        >
                                            No hay contactos de soporte registrados.
                                        </div>
                                    )
                            }
                        </section>

                        {/* OBSERVACIONES */}

                        <section>

                            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">

                                Observaciones

                            </h3>



                            <div className={datoClass}>

                                <p className="whitespace-pre-wrap text-sm text-slate-700">

                                    {

                                        suscripcion.observaciones ||

                                        "Sin observaciones."

                                    }

                                </p>

                            </div>

                        </section>



                        {/* ESTADO */}

                        <section>

                            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-700">

                                Estado

                            </h3>



                            <div className={datoClass}>

                                <span

                                    className={

                                        suscripcion.activo

                                            ? `

                                                inline-flex

                                                rounded-full

                                                border

                                                border-emerald-200

                                                bg-emerald-50

                                                px-2.5

                                                py-1

                                                text-xs

                                                font-medium

                                                text-emerald-700

                                            `

                                            : `

                                                inline-flex

                                                rounded-full

                                                border

                                                border-slate-200

                                                bg-slate-100

                                                px-2.5

                                                py-1

                                                text-xs

                                                font-medium

                                                text-slate-600

                                            `

                                    }

                                >

                                    {

                                        suscripcion.activo

                                            ? "Activa"

                                            : "Inactiva"

                                    }

                                </span>

                            </div>

                        </section>

                    </div>

                </div>



                {/* FOOTER */}

                <div

                    className="

                        flex

                        shrink-0

                        justify-end

                        border-t

                        border-slate-200

                        bg-white

                        px-6

                        py-4

                    "

                >

                    <button

                        type="button"

                        onClick={

                            onClose

                        }

                        className="

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

                        "

                    >

                        Cerrar

                    </button>

                </div>

            </div>

        </div>

    );

}