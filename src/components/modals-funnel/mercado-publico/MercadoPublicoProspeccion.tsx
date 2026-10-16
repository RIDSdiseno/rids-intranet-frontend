import {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    App,
    Empty,
    Input,
    Pagination,
    Select,
    Spin,
} from "antd";

import {
    BankOutlined,
    CalendarOutlined,
    CheckCircleOutlined,
    EyeOutlined,
    ReloadOutlined,
    SearchOutlined,
} from "@ant-design/icons";

import {
    actualizarEstadoMercadoPublico,
    convertirMercadoPublicoAFunnel,
    listarMercadoPublico,
    sincronizarMercadoPublico,
} from "./mercado-publico.api";

import type {
    EstadoOportunidadMercadoPublico,
    MercadoPublicoMeta,
    MercadoPublicoOportunidad,
} from "./mercado-publico.types";

import MercadoPublicoDetalleDrawer
    from "./MercadoPublicoDetalleDrawer";


type Props = {

    onConvertida?:
    (
        oportunidadVentaId:
            number
    ) =>
        Promise<void> |
        void;
};


const META_INICIAL:
    MercadoPublicoMeta = {

    page:
        1,

    limit:
        20,

    total:
        0,

    pages:
        1,
};


function formatCLP(
    value:
        string |
        number |
        null
) {

    const numero =
        Number(
            value ??
            0
        );


    if (
        !Number.isFinite(
            numero
        )
    ) {
        return "—";
    }


    return new Intl.NumberFormat(
        "es-CL",
        {
            style:
                "currency",

            currency:
                "CLP",

            maximumFractionDigits:
                0,
        }
    ).format(
        numero
    );
}


function formatFecha(
    value:
        string |
        null
) {

    if (
        !value
    ) {
        return "—";
    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "—";
    }


    return new Intl.DateTimeFormat(
        "es-CL",
        {
            timeZone:
                "America/Santiago",

            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric",
        }
    ).format(
        date
    );
}


function getScoreStyle(
    score:
        number
) {

    if (
        score >=
        85
    ) {

        return {
            badge:
                "border-emerald-200 bg-emerald-50 text-emerald-700",

            label:
                "Muy alta",
        };
    }


    if (
        score >=
        65
    ) {

        return {
            badge:
                "border-cyan-200 bg-cyan-50 text-cyan-700",

            label:
                "Alta",
        };
    }


    if (
        score >=
        40
    ) {

        return {
            badge:
                "border-amber-200 bg-amber-50 text-amber-700",

            label:
                "Media",
        };
    }


    return {
        badge:
            "border-slate-200 bg-slate-100 text-slate-600",

        label:
            "Baja",
    };
}


function getEstadoStyle(
    estado:
        EstadoOportunidadMercadoPublico
) {

    switch (
    estado
    ) {

        case "INTERESANTE":
            return "bg-cyan-50 text-cyan-700 border-cyan-200";

        case "DESCARTADA":
            return "bg-slate-100 text-slate-500 border-slate-200";

        case "CONVERTIDA":
            return "bg-emerald-50 text-emerald-700 border-emerald-200";

        case "NUEVA":
        default:
            return "bg-blue-50 text-blue-700 border-blue-200";
    }
}


export default function MercadoPublicoProspeccion({
    onConvertida,
}: Props) {

    const {
        message,
        modal,
    } =
        App.useApp();


    const [
        oportunidades,
        setOportunidades,
    ] =
        useState<
            MercadoPublicoOportunidad[]
        >(
            []
        );


    const [
        meta,
        setMeta,
    ] =
        useState<
            MercadoPublicoMeta
        >(
            META_INICIAL
        );


    const [
        loading,
        setLoading,
    ] =
        useState(
            false
        );


    const [
        sincronizando,
        setSincronizando,
    ] =
        useState(
            false
        );


    const [
        convirtiendoId,
        setConvirtiendoId,
    ] =
        useState<
            number |
            null
        >(
            null
        );


    const [
        textoInput,
        setTextoInput,
    ] =
        useState(
            ""
        );


    const [
        texto,
        setTexto,
    ] =
        useState(
            ""
        );


    const [
        estado,
        setEstado,
    ] =
        useState<
            EstadoOportunidadMercadoPublico |
            undefined
        >(
            undefined
        );


    const [
        scoreMin,
        setScoreMin,
    ] =
        useState<
            number |
            undefined
        >(
            40
        );


    const [
        region,
        setRegion,
    ] =
        useState(
            ""
        );


    const [
        page,
        setPage,
    ] =
        useState(
            1
        );


    const [
        limit,
        setLimit,
    ] =
        useState(
            20
        );


    const [
        detalleOpen,
        setDetalleOpen,
    ] =
        useState(
            false
        );


    const [
        seleccionada,
        setSeleccionada,
    ] =
        useState<
            MercadoPublicoOportunidad |
            null
        >(
            null
        );


    /*
     * Debounce de búsqueda.
     */
    useEffect(
        () => {

            const timeout =
                window.setTimeout(
                    () => {

                        setTexto(
                            textoInput
                                .trim()
                        );

                        setPage(
                            1
                        );
                    },
                    400
                );


            return () =>
                window.clearTimeout(
                    timeout
                );

        },
        [
            textoInput,
        ]
    );


    const cargar =
        useCallback(
            async () => {

                setLoading(
                    true
                );


                try {

                    const response =
                        await listarMercadoPublico({

                            ...(texto
                                ? {
                                    texto,
                                }
                                : {}),

                            ...(estado
                                ? {
                                    estado,
                                }
                                : {}),

                            ...(scoreMin !==
                                undefined
                                ? {
                                    scoreMin,
                                }
                                : {}),

                            ...(region.trim()
                                ? {
                                    region:
                                        region.trim(),
                                }
                                : {}),

                            page,

                            limit,
                        });


                    setOportunidades(
                        response.data
                    );


                    setMeta(
                        response.meta
                    );

                } catch (
                error:
                    any
                ) {

                    console.error(
                        "[MERCADO PUBLICO] Error listando:",
                        error
                    );


                    message.error(
                        error
                            ?.response
                            ?.data
                            ?.message ??
                        "No fue posible cargar las oportunidades de Mercado Público."
                    );

                } finally {

                    setLoading(
                        false
                    );
                }
            },
            [
                texto,
                estado,
                scoreMin,
                region,
                page,
                limit,
                message,
            ]
        );


    useEffect(
        () => {

            void cargar();

        },
        [
            cargar,
        ]
    );


    async function handleSincronizar() {

        setSincronizando(
            true
        );


        try {

            const response =
                await sincronizarMercadoPublico();


            const resultado =
                response.data;


            message.success(
                `Sincronización completada: ${resultado.nuevas} nuevas, ${resultado.actualizadas} actualizadas, ${resultado.omitidasExistentes} ya existentes y ${resultado.detallesConsultados} detalles consultados.`
            );


            setPage(
                1
            );


            await cargar();

        } catch (
        error:
            any
        ) {

            console.error(
                "[MERCADO PUBLICO] Error sincronizando:",
                error
            );


            message.error(
                error
                    ?.response
                    ?.data
                    ?.message ??
                "No fue posible sincronizar Mercado Público."
            );

        } finally {

            setSincronizando(
                false
            );
        }
    }


    async function cambiarEstado(
        oportunidad:
            MercadoPublicoOportunidad,
        nuevoEstado:
            EstadoOportunidadMercadoPublico
    ) {

        try {

            await actualizarEstadoMercadoPublico(
                oportunidad.id,
                nuevoEstado
            );


            message.success(
                "Estado actualizado."
            );


            await cargar();

        } catch (
        error:
            any
        ) {

            message.error(
                error
                    ?.response
                    ?.data
                    ?.message ??
                "No fue posible actualizar el estado."
            );
        }
    }


    function solicitarConversion(
        oportunidad:
            MercadoPublicoOportunidad
    ) {

        modal.confirm({

            title:
                "Convertir al Funnel",

            content:
                `Se creará una oportunidad comercial para "${oportunidad.organismoNombre}" y quedará en la etapa Nueva.`,

            okText:
                "Convertir",

            cancelText:
                "Cancelar",

            okButtonProps: {
                className:
                    "bg-cyan-600",
            },

            onOk:
                async () => {

                    await ejecutarConversion(
                        oportunidad
                    );
                },
        });
    }


    async function ejecutarConversion(
        oportunidad:
            MercadoPublicoOportunidad
    ) {

        setConvirtiendoId(
            oportunidad.id
        );


        try {

            const response =
                await convertirMercadoPublicoAFunnel(
                    oportunidad.id
                );


            const oportunidadVenta =
                response.data
                    .oportunidad;


            message.success(
                `Oportunidad ${oportunidadVenta.codigo} creada en el Funnel.`
            );


            setDetalleOpen(
                false
            );


            setSeleccionada(
                null
            );


            await cargar();


            await onConvertida?.(
                oportunidadVenta.id
            );

        } catch (
        error:
            any
        ) {

            console.error(
                "[MERCADO PUBLICO] Error convirtiendo:",
                error
            );


            message.error(
                error
                    ?.response
                    ?.data
                    ?.message ??
                "No fue posible convertir la oportunidad al Funnel."
            );

        } finally {

            setConvirtiendoId(
                null
            );
        }
    }


    function abrirDetalle(
        oportunidad:
            MercadoPublicoOportunidad
    ) {

        setSeleccionada(
            oportunidad
        );

        setDetalleOpen(
            true
        );
    }


    return (
        <div className="space-y-4">

            {/* =====================================================
                HEADER
            ===================================================== */}

            <section
                className="
                    overflow-hidden
                    rounded-2xl
                    border
                    border-cyan-100
                    bg-gradient-to-r
                    from-cyan-50
                    to-white
                    p-4
                    sm:p-5
                "
            >

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

                    <div>

                        <div className="flex items-center gap-2 text-cyan-700">

                            <BankOutlined />

                            <span className="text-[11px] font-black uppercase tracking-wider">
                                Prospección comercial
                            </span>

                        </div>


                        <h2 className="mt-1 text-xl font-black text-slate-900">
                            Mercado Público
                        </h2>


                        <p className="mt-1 max-w-3xl text-sm text-slate-500">
                            Licitaciones detectadas automáticamente que pueden convertirse en oportunidades comerciales del Funnel.
                        </p>

                    </div>


                    <button
                        type="button"
                        disabled={
                            sincronizando
                        }
                        onClick={
                            () =>
                                void handleSincronizar()
                        }
                        className="
                            inline-flex
                            shrink-0
                            items-center
                            justify-center
                            gap-2
                            rounded-xl
                            bg-cyan-600
                            px-4
                            py-2.5
                            text-sm
                            font-bold
                            text-white
                            transition
                            hover:bg-cyan-700
                            disabled:cursor-not-allowed
                            disabled:opacity-60
                        "
                    >

                        <ReloadOutlined
                            spin={
                                sincronizando
                            }
                        />

                        {sincronizando
                            ? "Sincronizando..."
                            : "Actualizar Mercado Público"}

                    </button>

                </div>

            </section>


            {/* =====================================================
                RESUMEN
            ===================================================== */}

            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">

                <Kpi
                    label="Resultados"
                    value={
                        meta.total
                    }
                    icon={
                        <BankOutlined />
                    }
                />


                <Kpi
                    label="Mostradas"
                    value={
                        oportunidades.length
                    }
                    icon={
                        <SearchOutlined />
                    }
                />


                <Kpi
                    label="Alta afinidad"
                    value={
                        oportunidades.filter(
                            (
                                item
                            ) =>
                                item.score >=
                                65
                        ).length
                    }
                    icon={
                        <CheckCircleOutlined />
                    }
                    helper="En esta página"
                />


                <Kpi
                    label="Convertidas"
                    value={
                        oportunidades.filter(
                            (
                                item
                            ) =>
                                item.estado ===
                                "CONVERTIDA"
                        ).length
                    }
                    icon={
                        <CheckCircleOutlined />
                    }
                    helper="En esta página"
                />

            </section>


            {/* =====================================================
                FILTROS
            ===================================================== */}

            <section
                className="
                    flex
                    flex-col
                    gap-2
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    p-3
                    sm:flex-row
                    sm:flex-wrap
                    sm:items-center
                "
            >

                <Input
                    allowClear
                    prefix={
                        <SearchOutlined className="text-slate-400" />
                    }
                    placeholder="Buscar licitación, organismo o código..."
                    className="w-full sm:w-80"
                    value={
                        textoInput
                    }
                    onChange={
                        (
                            event
                        ) =>
                            setTextoInput(
                                event
                                    .target
                                    .value
                            )
                    }
                />


                <Select
                    allowClear
                    placeholder="Estado"
                    className="w-full sm:w-40"
                    value={
                        estado
                    }
                    onChange={
                        (
                            value
                        ) => {

                            setEstado(
                                value
                            );

                            setPage(
                                1
                            );
                        }
                    }
                    options={[
                        {
                            value:
                                "NUEVA",
                            label:
                                "Nueva",
                        },
                        {
                            value:
                                "INTERESANTE",
                            label:
                                "Interesante",
                        },
                        {
                            value:
                                "DESCARTADA",
                            label:
                                "Descartada",
                        },
                        {
                            value:
                                "CONVERTIDA",
                            label:
                                "Convertida",
                        },
                    ]}
                />


                <Select
                    allowClear
                    placeholder="Afinidad"
                    className="w-full sm:w-44"
                    value={
                        scoreMin
                    }
                    onChange={
                        (
                            value
                        ) => {

                            setScoreMin(
                                value
                            );

                            setPage(
                                1
                            );
                        }
                    }
                    options={[
                        {
                            value:
                                85,
                            label:
                                "Muy alta · 85+",
                        },
                        {
                            value:
                                65,
                            label:
                                "Alta · 65+",
                        },
                        {
                            value:
                                40,
                            label:
                                "Media · 40+",
                        },
                        {
                            value:
                                0,
                            label:
                                "Todas",
                        },
                    ]}
                />


                <Input
                    allowClear
                    placeholder="Región..."
                    className="w-full sm:w-52"
                    value={
                        region
                    }
                    onChange={
                        (
                            event
                        ) => {

                            setRegion(
                                event
                                    .target
                                    .value
                            );

                            setPage(
                                1
                            );
                        }
                    }
                />

            </section>


            {/* =====================================================
                LISTADO
            ===================================================== */}

            <section className="relative min-h-40">

                {loading && (

                    <div className="flex min-h-52 items-center justify-center rounded-2xl border border-slate-200 bg-white">

                        <Spin />

                    </div>

                )}


                {!loading &&
                    oportunidades.length ===
                    0 && (

                        <div className="rounded-2xl border border-slate-200 bg-white py-14">

                            <Empty
                                description="No se encontraron oportunidades de Mercado Público"
                            />

                        </div>

                    )}


                {!loading &&
                    oportunidades.length >
                    0 && (

                        <div className="grid grid-cols-1 gap-3">

                            {oportunidades.map(
                                (
                                    oportunidad
                                ) => {

                                    const scoreStyle =
                                        getScoreStyle(
                                            oportunidad
                                                .score
                                        );


                                    const convertida =
                                        oportunidad
                                            .estado ===
                                        "CONVERTIDA" ||
                                        Boolean(
                                            oportunidad
                                                .oportunidadVenta
                                        );


                                    return (
                                        <article
                                            key={
                                                oportunidad.id
                                            }
                                            className="
                                            rounded-2xl
                                            border
                                            border-slate-200
                                            bg-white
                                            p-4
                                            shadow-sm
                                            transition
                                            hover:border-cyan-200
                                            hover:shadow-md
                                        "
                                        >

                                            <div
                                                className="
                                                flex
                                                flex-col
                                                gap-4
                                                xl:flex-row
                                                xl:items-start
                                                xl:justify-between
                                            "
                                            >

                                                <div className="min-w-0 flex-1">

                                                    {/* BADGES */}

                                                    <div className="flex flex-wrap items-center gap-2">

                                                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                                                            {
                                                                oportunidad
                                                                    .codigoExterno
                                                            }
                                                        </span>


                                                        <span
                                                            className={`
                                                            rounded-full
                                                            border
                                                            px-2.5
                                                            py-1
                                                            text-[10px]
                                                            font-black
                                                            ${scoreStyle.badge}
                                                        `}
                                                        >
                                                            {
                                                                scoreStyle.label
                                                            }{" "}
                                                            ·{" "}
                                                            {
                                                                oportunidad
                                                                    .score
                                                            }%
                                                        </span>


                                                        <span
                                                            className={`
                                                            rounded-full
                                                            border
                                                            px-2.5
                                                            py-1
                                                            text-[10px]
                                                            font-bold
                                                            ${getEstadoStyle(
                                                                oportunidad
                                                                    .estado
                                                            )}
                                                        `}
                                                        >
                                                            {
                                                                oportunidad
                                                                    .estado
                                                            }
                                                        </span>

                                                    </div>


                                                    {/* TITULO */}

                                                    <button
                                                        type="button"
                                                        onClick={
                                                            () =>
                                                                abrirDetalle(
                                                                    oportunidad
                                                                )
                                                        }
                                                        className="mt-3 block text-left"
                                                    >

                                                        <h3 className="line-clamp-2 text-base font-black leading-snug text-slate-900 hover:text-cyan-700">
                                                            {
                                                                oportunidad
                                                                    .nombre
                                                            }
                                                        </h3>

                                                    </button>


                                                    <p className="mt-1 text-sm font-bold text-cyan-700">
                                                        {
                                                            oportunidad
                                                                .organismoNombre
                                                        }
                                                    </p>


                                                    {oportunidad
                                                        .descripcion && (

                                                            <p className="mt-2 line-clamp-2 max-w-5xl text-sm leading-5 text-slate-500">
                                                                {
                                                                    oportunidad
                                                                        .descripcion
                                                                }
                                                            </p>

                                                        )}


                                                    {/* DATOS */}

                                                    <div
                                                        className="
                                                        mt-4
                                                        grid
                                                        grid-cols-2
                                                        gap-x-5
                                                        gap-y-3
                                                        sm:grid-cols-3
                                                        xl:grid-cols-5
                                                    "
                                                    >

                                                        <MiniDato
                                                            label="Región"
                                                            value={
                                                                oportunidad
                                                                    .unidadRegion ??
                                                                "—"
                                                            }
                                                        />


                                                        <MiniDato
                                                            label="Comuna"
                                                            value={
                                                                oportunidad
                                                                    .unidadComuna ??
                                                                "—"
                                                            }
                                                        />


                                                        <MiniDato
                                                            label="Cierre"
                                                            value={
                                                                formatFecha(
                                                                    oportunidad
                                                                        .fechaCierre
                                                                )
                                                            }
                                                            icon={
                                                                <CalendarOutlined />
                                                            }
                                                        />


                                                        <MiniDato
                                                            label="Monto"
                                                            value={
                                                                formatCLP(
                                                                    oportunidad
                                                                        .montoEstimado
                                                                )
                                                            }
                                                        />


                                                        <MiniDato
                                                            label="Unidad"
                                                            value={
                                                                oportunidad
                                                                    .unidadNombre ??
                                                                "—"
                                                            }
                                                        />

                                                    </div>


                                                    {/* COINCIDENCIAS */}

                                                    {oportunidad
                                                        .coincidencias
                                                        .length >
                                                        0 && (

                                                            <div className="mt-3 flex flex-wrap gap-1.5">

                                                                {oportunidad
                                                                    .coincidencias
                                                                    .slice(
                                                                        0,
                                                                        5
                                                                    )
                                                                    .map(
                                                                        (
                                                                            coincidencia
                                                                        ) => (

                                                                            <span
                                                                                key={
                                                                                    coincidencia
                                                                                }
                                                                                className="rounded-md bg-cyan-50 px-2 py-1 text-[10px] font-semibold text-cyan-700"
                                                                            >
                                                                                {
                                                                                    coincidencia
                                                                                }
                                                                            </span>

                                                                        )
                                                                    )}

                                                            </div>

                                                        )}

                                                </div>


                                                {/* ACCIONES */}

                                                <div
                                                    className="
                                                    flex
                                                    shrink-0
                                                    flex-wrap
                                                    items-center
                                                    gap-2
                                                    xl:w-44
                                                    xl:flex-col
                                                    xl:items-stretch
                                                "
                                                >

                                                    <button
                                                        type="button"
                                                        onClick={
                                                            () =>
                                                                abrirDetalle(
                                                                    oportunidad
                                                                )
                                                        }
                                                        className="
                                                        inline-flex
                                                        items-center
                                                        justify-center
                                                        gap-2
                                                        rounded-xl
                                                        border
                                                        border-slate-200
                                                        bg-white
                                                        px-3
                                                        py-2
                                                        text-xs
                                                        font-bold
                                                        text-slate-700
                                                        hover:bg-slate-50
                                                    "
                                                    >
                                                        <EyeOutlined />

                                                        Ver detalle
                                                    </button>


                                                    {!convertida &&
                                                        oportunidad
                                                            .estado !==
                                                        "INTERESANTE" && (

                                                            <button
                                                                type="button"
                                                                onClick={
                                                                    () =>
                                                                        void cambiarEstado(
                                                                            oportunidad,
                                                                            "INTERESANTE"
                                                                        )
                                                                }
                                                                className="
                                                            rounded-xl
                                                            border
                                                            border-cyan-200
                                                            bg-cyan-50
                                                            px-3
                                                            py-2
                                                            text-xs
                                                            font-bold
                                                            text-cyan-700
                                                            hover:bg-cyan-100
                                                        "
                                                            >
                                                                Marcar interesante
                                                            </button>

                                                        )}


                                                    {!convertida &&
                                                        oportunidad
                                                            .estado !==
                                                        "DESCARTADA" && (

                                                            <button
                                                                type="button"
                                                                onClick={
                                                                    () =>
                                                                        void cambiarEstado(
                                                                            oportunidad,
                                                                            "DESCARTADA"
                                                                        )
                                                                }
                                                                className="
                                                            rounded-xl
                                                            border
                                                            border-slate-200
                                                            bg-white
                                                            px-3
                                                            py-2
                                                            text-xs
                                                            font-bold
                                                            text-slate-500
                                                            hover:bg-slate-50
                                                        "
                                                            >
                                                                Descartar
                                                            </button>

                                                        )}

                                                    {oportunidad.estado === "DESCARTADA" && (

                                                        <button
                                                            type="button"
                                                            onClick={
                                                                () =>
                                                                    void cambiarEstado(
                                                                        oportunidad,
                                                                        "NUEVA"
                                                                    )
                                                            }
                                                            className="
            rounded-xl
            border
            border-emerald-200
            bg-emerald-50
            px-3
            py-2
            text-xs
            font-bold
            text-emerald-700
            hover:bg-emerald-100
        "
                                                        >
                                                            Restaurar
                                                        </button>

                                                    )}


                                                    {!convertida &&
                                                        oportunidad.estado !==
                                                        "DESCARTADA" && (

                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    convirtiendoId ===
                                                                    oportunidad.id
                                                                }
                                                                onClick={
                                                                    () =>
                                                                        solicitarConversion(
                                                                            oportunidad
                                                                        )
                                                                }
                                                                className="
            rounded-xl
            bg-cyan-600
            px-3
            py-2
            text-xs
            font-bold
            text-white
            hover:bg-cyan-700
            disabled:opacity-60
        "
                                                            >
                                                                {convirtiendoId ===
                                                                    oportunidad.id
                                                                    ? "Convirtiendo..."
                                                                    : "Convertir al Funnel"}
                                                            </button>

                                                        )}

                                                    {convertida &&
                                                        oportunidad
                                                            .oportunidadVenta && (

                                                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-center">

                                                                <p className="text-[9px] font-bold uppercase text-emerald-600">
                                                                    Funnel
                                                                </p>

                                                                <p className="text-xs font-black text-emerald-800">
                                                                    {
                                                                        oportunidad
                                                                            .oportunidadVenta
                                                                            .codigo
                                                                    }
                                                                </p>

                                                            </div>

                                                        )}

                                                </div>

                                            </div>

                                        </article>
                                    );
                                }
                            )}

                        </div>

                    )}

            </section>


            {/* =====================================================
                PAGINACIÓN
            ===================================================== */}

            {meta.total >
                0 && (

                    <div className="flex justify-end rounded-2xl border border-slate-200 bg-white px-4 py-3">

                        <Pagination
                            current={
                                meta.page
                            }
                            pageSize={
                                meta.limit
                            }
                            total={
                                meta.total
                            }
                            showSizeChanger
                            pageSizeOptions={[
                                10,
                                20,
                                30,
                                50,
                                100,
                            ]}
                            onChange={
                                (
                                    nextPage,
                                    nextLimit
                                ) => {

                                    if (
                                        nextLimit !==
                                        limit
                                    ) {

                                        setLimit(
                                            nextLimit
                                        );

                                        setPage(
                                            1
                                        );

                                        return;
                                    }


                                    setPage(
                                        nextPage
                                    );
                                }
                            }
                        />

                    </div>

                )}


            {/* =====================================================
                DRAWER
            ===================================================== */}

            <MercadoPublicoDetalleDrawer
                open={
                    detalleOpen
                }
                oportunidad={
                    seleccionada
                }
                loadingConvertir={
                    seleccionada
                        ? convirtiendoId ===
                        seleccionada.id
                        : false
                }
                onClose={
                    () => {

                        setDetalleOpen(
                            false
                        );

                        setSeleccionada(
                            null
                        );
                    }
                }
                onConvertir={
                    solicitarConversion
                }
            />

        </div>
    );
}


function Kpi({
    label,
    value,
    icon,
    helper,
}: {
    label:
    string;

    value:
    number;

    icon:
    React.ReactNode;

    helper?:
    string;
}) {

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

            <div className="flex items-center justify-between gap-2">

                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {label}
                </p>

                <span className="text-cyan-600">
                    {icon}
                </span>

            </div>


            <p className="mt-1 text-2xl font-black text-slate-900">
                {value}
            </p>


            {helper && (

                <p className="mt-1 text-[10px] text-slate-400">
                    {helper}
                </p>

            )}

        </div>
    );
}


function MiniDato({
    label,
    value,
    icon,
}: {
    label:
    string;

    value:
    string;

    icon?:
    React.ReactNode;
}) {

    return (
        <div className="min-w-0">

            <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                {label}
            </p>


            <div className="mt-1 flex items-center gap-1.5">

                {icon && (

                    <span className="shrink-0 text-cyan-600">
                        {icon}
                    </span>

                )}

                <p
                    className="truncate text-xs font-semibold text-slate-700"
                    title={
                        value
                    }
                >
                    {value}
                </p>

            </div>

        </div>
    );
}