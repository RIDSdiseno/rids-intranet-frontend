// src/components/modals-leypd/FichaLeypdForm.tsx

import {
    Input,
    Select,
    Tag,
} from "antd";

import type {
    CampoFichaLeypd,
    DatosFichaLeypd,
} from "./leypd.types";

import {
    esValorVacioLeypd,
    maxLengthCampoLeypd,
} from "./leypd.helpers";

const GRUPOS_FICHA = [
    {
        key: "DATOS_EMPRESA",
        numero: 1,
        titulo:
            "Datos de la empresa",
        descripcion:
            "Información legal y datos oficiales de contacto de la empresa.",
    },

    {
        key: "SITIO_WEB",
        numero: 2,
        titulo:
            "Sitio web",
        descripcion:
            "Información del sitio web, hosting y administración técnica.",
    },

    {
        key: "RESPONSABLES",
        numero: 3,
        titulo:
            "Responsables",
        descripcion:
            "Personas responsables de privacidad, seguridad y gestión de consentimientos.",
    },

    {
        key: "TRATAMIENTO_DATOS",
        numero: 4,
        titulo:
            "Qué datos se tratan y por cuánto tiempo",
        descripcion:
            "Origen de los datos personales, sistemas utilizados y períodos de conservación.",
    },

    {
        key: "APROBACIONES_FECHAS",
        numero: 5,
        titulo:
            "Aprobaciones y fechas",
        descripcion:
            "Fechas y responsables asociados a políticas y medidas de cumplimiento.",
    },
] as const;

interface Props {
    campos:
    CampoFichaLeypd[];

    datos:
    DatosFichaLeypd;

    values:
    Record<
        string,
        unknown
    >;

    disabled?:
    boolean;

    showMetadata?:
    boolean;

    /**
     * Errores por key de campo (frontend o 422 del backend).
     */
    errors?:
    Record<
        string,
        string
    >;
    onChange:
    (
        key: string,
        value: unknown
    ) => void;
}

export default function FichaLeypdForm({
    campos,
    datos,
    values,
    disabled = false,
    showMetadata = true,
    errors = {},
    onChange,
}: Props) {
    const renderControl =
        (
            campo:
                CampoFichaLeypd
        ) => {
            const value =
                values[
                campo.key
                ];

            switch (
            campo.tipo
            ) {
                case "boolean":
                    return (
                        <Select
                            allowClear
                            disabled={
                                disabled
                            }
                            className="w-full"
                            placeholder="Seleccionar..."
                            value={
                                typeof value ===
                                    "boolean"
                                    ? value
                                    : undefined
                            }
                            options={[
                                {
                                    value:
                                        true,
                                    label:
                                        "Sí",
                                },
                                {
                                    value:
                                        false,
                                    label:
                                        "No",
                                },
                            ]}
                            onChange={(
                                next
                            ) =>
                                onChange(
                                    campo.key,
                                    next
                                )
                            }
                        />
                    );

                case "date":
                    return (
                        <Input
                            type="date"
                            disabled={
                                disabled
                            }
                            value={
                                typeof value ===
                                    "string"
                                    ? value
                                    : ""
                            }
                            onChange={(
                                event
                            ) =>
                                onChange(
                                    campo.key,
                                    event
                                        .target
                                        .value
                                )
                            }
                        />
                    );

                case "select":
                    return (
                        <Select
                            allowClear
                            disabled={
                                disabled
                            }
                            className="w-full"
                            placeholder="Seleccionar..."
                            value={
                                typeof value ===
                                    "string" &&
                                    value
                                    ? value
                                    : undefined
                            }
                            options={
                                campo.opciones ??
                                []
                            }
                            onChange={(
                                next
                            ) =>
                                onChange(
                                    campo.key,
                                    next ??
                                    ""
                                )
                            }
                        />
                    );

                case "multiselect":
                    return (
                        <Select
                            mode="multiple"
                            allowClear
                            disabled={
                                disabled
                            }
                            className="w-full"
                            placeholder="Seleccionar..."
                            value={
                                Array.isArray(
                                    value
                                )
                                    ? value
                                    : []
                            }
                            options={
                                campo.opciones ??
                                []
                            }
                            onChange={(
                                next
                            ) =>
                                onChange(
                                    campo.key,
                                    next
                                )
                            }
                        />
                    );

                case "textarea":
                    return (
                        <Input.TextArea
                            rows={
                                4
                            }
                            maxLength={
                                maxLengthCampoLeypd(
                                    campo
                                )
                            }
                            disabled={
                                disabled
                            }
                            value={
                                typeof value ===
                                    "string"
                                    ? value
                                    : ""
                            }
                            placeholder={
                                campo.placeholder ??
                                "Ingrese información..."
                            }
                            onChange={(
                                event
                            ) =>
                                onChange(
                                    campo.key,
                                    event
                                        .target
                                        .value
                                )
                            }
                        />
                    );

                case "number":
                    return (
                        <Input
                            type="number"
                            disabled={
                                disabled
                            }
                            value={
                                typeof value ===
                                    "number" ||
                                    typeof value ===
                                    "string"
                                    ? value
                                    : ""
                            }
                            onChange={(
                                event
                            ) => {
                                const raw =
                                    event
                                        .target
                                        .value;

                                onChange(
                                    campo.key,
                                    raw ===
                                        ""
                                        ? ""
                                        : Number(
                                            raw
                                        )
                                );
                            }}
                        />
                    );

                case "email":
                    return (
                        <Input
                            type="email"
                            maxLength={
                                maxLengthCampoLeypd(
                                    campo
                                )
                            }
                            disabled={
                                disabled
                            }
                            value={
                                typeof value ===
                                    "string"
                                    ? value
                                    : ""
                            }
                            placeholder={
                                campo.placeholder ??
                                "correo@empresa.cl"
                            }
                            onChange={(
                                event
                            ) =>
                                onChange(
                                    campo.key,
                                    event
                                        .target
                                        .value
                                )
                            }
                        />
                    );

                case "text":
                default:
                    return (
                        <Input
                            maxLength={
                                maxLengthCampoLeypd(
                                    campo
                                )
                            }
                            disabled={
                                disabled
                            }
                            value={
                                typeof value ===
                                    "string"
                                    ? value
                                    : ""
                            }
                            placeholder={
                                campo.placeholder ??
                                "Ingrese información..."
                            }
                            onChange={(
                                event
                            ) =>
                                onChange(
                                    campo.key,
                                    event
                                        .target
                                        .value
                                )
                            }
                        />
                    );
            }
        };

    /*
 * Misma regla que el backend:
 * un texto con solo espacios cuenta como vacío.
 */
    const campoTieneValor =
        (
            value: unknown
        ) =>
            !esValorVacioLeypd(
                value
            );

    if (
        campos.length ===
        0
    ) {
        return (
            <div
                className="
                    rounded-2xl
                    border
                    border-dashed
                    border-slate-300
                    bg-slate-50
                    p-8
                    text-center
                    text-sm
                    text-slate-500
                "
            >
                No existen campos configurados para esta ficha.
            </div>
        );
    }

    return (
        <div
            className="
            space-y-5
        "
        >
            {GRUPOS_FICHA.map(
                (
                    grupo
                ) => {
                    const camposGrupo =
                        campos.filter(
                            (
                                campo
                            ) =>
                                campo.grupo ===
                                grupo.key
                        );

                    if (
                        camposGrupo.length ===
                        0
                    ) {
                        return null;
                    }

                    const completados =
                        camposGrupo.filter(
                            (
                                campo
                            ) =>
                                campoTieneValor(
                                    values[
                                    campo.key
                                    ]
                                )
                        ).length;

                    return (
                        <section
                            key={
                                grupo.key
                            }
                            className="
        leypd-form-section
        overflow-hidden
        rounded-2xl
        border
        border-slate-200
        bg-white
        shadow-sm
    "
                        >
                            {/* =====================================
                            CABECERA DEL GRUPO
                        ===================================== */}

                            <div
                                className="
        leypd-form-section-header
        border-b
        border-slate-200
        bg-slate-50/80
        px-5
        py-4
    "
                            >
                                <div
                                    className="
                                    flex
                                    flex-col
                                    gap-3
                                    sm:flex-row
                                    sm:items-center
                                    sm:justify-between
                                "
                                >
                                    <div
                                        className="
                                        flex
                                        items-start
                                        gap-3
                                    "
                                    >
                                        <div
                                            className="
                                             leypd-form-section-number
                                            flex
                                            h-9
                                            w-9
                                            shrink-0
                                            items-center
                                            justify-center
                                            rounded-xl
                                            border
                                            border-cyan-200
                                            bg-cyan-50
                                            text-sm
                                            font-semibold
                                            text-cyan-700
                                        "
                                        >
                                            {String(
                                                grupo.numero
                                            ).padStart(
                                                2,
                                                "0"
                                            )}
                                        </div>

                                        <div>
                                            <h3
                                                className="
                                                m-0
                                                text-sm
                                                font-semibold
                                                text-slate-800
                                                sm:text-base
                                            "
                                            >
                                                {
                                                    grupo.titulo
                                                }
                                            </h3>

                                            <p
                                                className="
                                                mb-0
                                                mt-1
                                                text-xs
                                                leading-5
                                                text-slate-500
                                            "
                                            >
                                                {
                                                    grupo.descripcion
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        className="
                                        flex
                                        shrink-0
                                        items-center
                                        gap-2
                                    "
                                    >
                                        <span
                                            className="
                                            leypd-form-section-count
                                            rounded-full
                                            border
                                            border-slate-200
                                            bg-white
                                            px-3
                                            py-1
                                            text-xs
                                            font-medium
                                            text-slate-600
                                        "
                                        >
                                            {
                                                completados
                                            }
                                            {" / "}
                                            {
                                                camposGrupo.length
                                            }
                                            {" completos"}
                                        </span>
                                    </div>
                                </div>

                                {/* =====================================
                                PROGRESO DEL GRUPO
                            ===================================== */}

                                <div
                                    className="
                                    leypd-form-section-progress
                                    mt-3
                                    h-1.5
                                    overflow-hidden
                                    rounded-full
                                    bg-slate-200
                                "
                                >
                                    <div
                                        className="
                                        leypd-form-section-progress-value
                                        h-full
                                        rounded-full
                                        bg-cyan-600
                                        transition-all
                                        duration-300
                                    "
                                        style={{
                                            width:
                                                `${camposGrupo.length >
                                                    0
                                                    ? Math.round(
                                                        (
                                                            completados /
                                                            camposGrupo.length
                                                        ) *
                                                        100
                                                    )
                                                    : 0
                                                }%`,
                                        }}
                                    />
                                </div>
                            </div>

                            {/* =====================================
                            CAMPOS DEL GRUPO
                        ===================================== */}

                            <div
                                className="
                                grid
                                grid-cols-1
                                gap-4
                                p-4
                                md:grid-cols-2
                            "
                            >
                                {camposGrupo.map(
                                    (
                                        campo
                                    ) => {
                                        const metadata =
                                            datos[
                                            campo.key
                                            ];

                                        const errorCampo =
                                            errors[
                                            campo.key
                                            ];

                                        return (
                                            <div
                                                key={
                                                    campo.key
                                                }
                                                className={`
                                                leypd-form-field
                                                rounded-xl
                                                border
                                                bg-white
                                                p-4
                                                transition
                                                ${errorCampo
                                                        ? "border-red-400"
                                                        : "border-slate-200 hover:border-slate-300"
                                                    }
                                            `}
                                            >
                                                {/* =========================
                                                LABEL + METADATA
                                            ========================= */}

                                                <div
                                                    className="
                                                    mb-2
                                                    flex
                                                    flex-wrap
                                                    items-center
                                                    gap-2
                                                "
                                                >
                                                    <span
                                                        className="
                                                        text-[11px]
                                                        font-medium
                                                        text-slate-400
                                                    "
                                                    >
                                                        {
                                                            campo.numero
                                                        }.
                                                    </span>

                                                    <label
                                                        className="
                                                        text-sm
                                                        font-semibold
                                                        text-slate-700
                                                    "
                                                    >
                                                        {
                                                            campo.label
                                                        }
                                                    </label>

                                                    {campo.obligatorio && (
                                                        <Tag
                                                            color="red"
                                                        >
                                                            Obligatorio
                                                        </Tag>
                                                    )}

                                                    {showMetadata &&
                                                        metadata
                                                            ?.fuente && (
                                                            <Tag>
                                                                {
                                                                    metadata.fuente
                                                                }
                                                            </Tag>
                                                        )}

                                                    {showMetadata &&
                                                        metadata
                                                            ?.confirmado && (
                                                            <Tag
                                                                color="green"
                                                            >
                                                                Confirmado
                                                            </Tag>
                                                        )}
                                                </div>

                                                {/* =========================
                                                DESCRIPCIÓN
                                            ========================= */}

                                                {campo.descripcion && (
                                                    <p
                                                        className="
                                                        mb-3
                                                        text-xs
                                                        leading-5
                                                        text-slate-500
                                                    "
                                                    >
                                                        {
                                                            campo.descripcion
                                                        }
                                                    </p>
                                                )}

                                                {/* =========================
                                                CONTROL
                                            ========================= */}

                                                {renderControl(
                                                    campo
                                                )}

                                                {errorCampo && (
                                                    <p
                                                        className="
                                                        mb-0
                                                        mt-2
                                                        text-xs
                                                        text-red-500
                                                    "
                                                    >
                                                        {
                                                            errorCampo
                                                        }
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        </section>
                    );
                }
            )}
        </div>
    );
}