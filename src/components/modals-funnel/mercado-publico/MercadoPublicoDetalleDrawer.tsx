import {
    Drawer,
    Tag,
} from "antd";

import {
    BankOutlined,
    CalendarOutlined,
    DollarOutlined,
    EnvironmentOutlined,
    MailOutlined,
    PhoneOutlined,
    ProjectOutlined,
    UserOutlined,
} from "@ant-design/icons";

import type {
    MercadoPublicoOportunidad,
} from "./mercado-publico.types";


type Props = {
    open: boolean;

    oportunidad:
    MercadoPublicoOportunidad |
    null;

    loadingConvertir?:
    boolean;

    onClose:
    () => void;

    onConvertir:
    (
        oportunidad:
            MercadoPublicoOportunidad
    ) => void;
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


    const fecha =
        new Date(
            value
        );


    if (
        Number.isNaN(
            fecha.getTime()
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

            hour:
                "2-digit",

            minute:
                "2-digit",

            hour12:
                false,
        }
    ).format(
        fecha
    );
}


function getScoreClass(
    score:
        number
) {

    if (
        score >=
        85
    ) {
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }


    if (
        score >=
        65
    ) {
        return "border-cyan-200 bg-cyan-50 text-cyan-700";
    }


    if (
        score >=
        40
    ) {
        return "border-amber-200 bg-amber-50 text-amber-700";
    }


    return "border-slate-200 bg-slate-50 text-slate-600";
}


export default function MercadoPublicoDetalleDrawer({
    open,
    oportunidad,
    loadingConvertir = false,
    onClose,
    onConvertir,
}: Props) {

    if (
        !oportunidad
    ) {

        return (
            <Drawer
                open={open}
                onClose={onClose}
                title="Mercado Público"
                width={720}
            />
        );
    }


    const convertida =
        oportunidad.estado ===
        "CONVERTIDA" ||
        Boolean(
            oportunidad
                .oportunidadVenta
        );


    return (
        <Drawer
            open={open}
            onClose={onClose}
            width={760}
            destroyOnClose
            title={

                <div className="min-w-0">

                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-cyan-600">

                        <BankOutlined />

                        Mercado Público

                    </div>

                    <div className="mt-1 truncate text-base font-black text-slate-900">
                        {
                            oportunidad
                                .codigoExterno
                        }
                    </div>

                </div>
            }
        >

            <div className="space-y-4">

                {/* CABECERA */}

                <div className="rounded-2xl border border-slate-200 bg-white p-4">

                    <div className="flex flex-wrap items-start justify-between gap-3">

                        <div className="min-w-0 flex-1">

                            <h2 className="text-lg font-black leading-snug text-slate-900">
                                {
                                    oportunidad
                                        .nombre
                                }
                            </h2>

                            <p className="mt-1 text-sm font-semibold text-cyan-700">
                                {
                                    oportunidad
                                        .organismoNombre
                                }
                            </p>

                        </div>


                        <div
                            className={`
                                shrink-0
                                rounded-xl
                                border
                                px-3
                                py-2
                                text-center
                                ${getScoreClass(
                                oportunidad.score
                            )}
                            `}
                        >

                            <p className="text-[9px] font-bold uppercase tracking-wide opacity-70">
                                Afinidad
                            </p>

                            <p className="text-xl font-black">
                                {
                                    oportunidad
                                        .score
                                }%
                            </p>

                        </div>

                    </div>


                    {oportunidad
                        .descripcion && (

                            <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">
                                {
                                    oportunidad
                                        .descripcion
                                }
                            </p>

                        )}

                </div>


                {/* DATOS PRINCIPALES */}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                    <InfoCard
                        icon={
                            <ProjectOutlined />
                        }
                        label="Código licitación"
                        value={
                            oportunidad
                                .codigoExterno
                        }
                    />


                    <InfoCard
                        icon={
                            <DollarOutlined />
                        }
                        label="Monto estimado"
                        value={
                            formatCLP(
                                oportunidad
                                    .montoEstimado
                            )
                        }
                    />


                    <InfoCard
                        icon={
                            <CalendarOutlined />
                        }
                        label="Publicación"
                        value={
                            formatFecha(
                                oportunidad
                                    .fechaPublicacion
                            )
                        }
                    />


                    <InfoCard
                        icon={
                            <CalendarOutlined />
                        }
                        label="Cierre"
                        value={
                            formatFecha(
                                oportunidad
                                    .fechaCierre
                            )
                        }
                    />

                </div>


                {/* ORGANISMO */}

                <div className="rounded-2xl border border-slate-200 bg-white p-4">

                    <div className="mb-3 flex items-center gap-2">

                        <BankOutlined className="text-cyan-600" />

                        <h3 className="font-bold text-slate-800">
                            Organismo comprador
                        </h3>

                    </div>


                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                        <Dato
                            label="Organismo"
                            value={
                                oportunidad
                                    .organismoNombre
                            }
                        />

                        <Dato
                            label="RUT"
                            value={
                                oportunidad
                                    .organismoRut
                            }
                        />

                        <Dato
                            label="Unidad"
                            value={
                                oportunidad
                                    .unidadNombre
                            }
                        />

                        <Dato
                            label="Región"
                            value={
                                oportunidad
                                    .unidadRegion
                            }
                        />

                        <Dato
                            label="Comuna"
                            value={
                                oportunidad
                                    .unidadComuna
                            }
                        />

                        <Dato
                            label="Dirección"
                            value={
                                oportunidad
                                    .unidadDireccion
                            }
                        />

                    </div>

                </div>


                {/* CONTACTO */}

                <div className="rounded-2xl border border-slate-200 bg-white p-4">

                    <div className="mb-3 flex items-center gap-2">

                        <UserOutlined className="text-cyan-600" />

                        <h3 className="font-bold text-slate-800">
                            Contacto
                        </h3>

                    </div>


                    <div className="space-y-2">

                        <ContactoRow
                            icon={
                                <UserOutlined />
                            }
                            value={
                                oportunidad
                                    .contactoNombre
                            }
                        />

                        <ContactoRow
                            icon={
                                <MailOutlined />
                            }
                            value={
                                oportunidad
                                    .contactoEmail
                            }
                        />

                        <ContactoRow
                            icon={
                                <PhoneOutlined />
                            }
                            value={
                                oportunidad
                                    .contactoTelefono
                            }
                        />

                        <ContactoRow
                            icon={
                                <EnvironmentOutlined />
                            }
                            value={
                                [
                                    oportunidad
                                        .unidadComuna,
                                    oportunidad
                                        .unidadRegion,
                                ]
                                    .filter(
                                        Boolean
                                    )
                                    .join(
                                        ", "
                                    ) ||
                                null
                            }
                        />

                    </div>

                </div>


                {/* COINCIDENCIAS */}

                <div className="rounded-2xl border border-slate-200 bg-white p-4">

                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                        Motivos de afinidad
                    </p>


                    <div className="flex flex-wrap gap-2">

                        {oportunidad
                            .coincidencias
                            .length >
                            0 ? (

                            oportunidad
                                .coincidencias
                                .map(
                                    (
                                        item
                                    ) => (

                                        <Tag
                                            key={
                                                item
                                            }
                                            color="cyan"
                                        >
                                            {
                                                item
                                            }
                                        </Tag>

                                    )
                                )

                        ) : (

                            <span className="text-sm text-slate-400">
                                Sin coincidencias registradas.
                            </span>

                        )}

                    </div>

                </div>


                {/* ESTADO DE CONVERSIÓN */}

                {convertida &&
                    oportunidad
                        .oportunidadVenta && (

                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">

                            <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
                                Convertida al Funnel
                            </p>

                            <p className="mt-1 font-black text-emerald-800">
                                {
                                    oportunidad
                                        .oportunidadVenta
                                        .codigo
                                }
                            </p>

                            <p className="mt-1 text-sm text-emerald-700">
                                {
                                    oportunidad
                                        .oportunidadVenta
                                        .titulo
                                }
                            </p>

                        </div>

                    )}


                {/* BOTÓN */}

                {!convertida && (

                    <button
                        type="button"
                        disabled={
                            loadingConvertir
                        }
                        onClick={
                            () =>
                                onConvertir(
                                    oportunidad
                                )
                        }
                        className="
                            w-full
                            rounded-xl
                            bg-cyan-600
                            px-4
                            py-3
                            text-sm
                            font-bold
                            text-white
                            transition
                            hover:bg-cyan-700
                            disabled:cursor-not-allowed
                            disabled:opacity-60
                        "
                    >
                        {loadingConvertir
                            ? "Convirtiendo..."
                            : "Convertir en oportunidad del Funnel"}
                    </button>

                )}

            </div>

        </Drawer>
    );
}


function InfoCard({
    icon,
    label,
    value,
}: {
    icon:
    React.ReactNode;

    label:
    string;

    value:
    React.ReactNode;
}) {

    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">

            <div className="flex items-center gap-2 text-cyan-600">
                {icon}

                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {label}
                </span>
            </div>

            <div className="mt-2 text-sm font-bold text-slate-800">
                {value || "—"}
            </div>

        </div>
    );
}


function Dato({
    label,
    value,
}: {
    label:
    string;

    value:
    string |
    null;
}) {

    return (
        <div>

            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {label}
            </p>

            <p className="mt-1 text-sm font-medium text-slate-700">
                {value || "—"}
            </p>

        </div>
    );
}


function ContactoRow({
    icon,
    value,
}: {
    icon:
    React.ReactNode;

    value:
    string |
    null;
}) {

    return (
        <div className="flex items-center gap-2 text-sm text-slate-600">

            <span className="text-cyan-600">
                {icon}
            </span>

            <span className="break-all">
                {value || "—"}
            </span>

        </div>
    );
}