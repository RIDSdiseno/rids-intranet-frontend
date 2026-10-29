// src/components/modals-proteccion-datos/CampaniaDetalleModal.tsx
import {
    CalendarOutlined,
    FileTextOutlined,
    MailOutlined,
    SafetyCertificateOutlined,
    TeamOutlined,
    UserOutlined,
} from "@ant-design/icons";

import {
    Card,
    Descriptions,
    Modal,
    Tabs,
    Tag,
} from "antd";

import {
    getEstadoCampaniaColor,
    getEstadoCampaniaLabel,
    formatearFechaHora
} from "./proteccion-datos.helpers";

import type {
    CampaniaProteccionDatos,
    CampoConsentimiento,
} from "./proteccion-datos.types";

/* =========================================================
   PROPS
   ========================================================= */

type Props = {
    open:
    boolean;

    campania:
    CampaniaProteccionDatos |
    null;

    onClose:
    () => void;
};

/* =========================================================
   TIPO DE CAMPO
   ========================================================= */

function getTipoCampoLabel(
    tipo:
        CampoConsentimiento["tipo"],
) {

    switch (
    tipo
    ) {

        case "TEXT":
            return "Texto";

        case "CHECKBOX":
            return "Checkbox";

        case "RADIO":
            return "Selección única";

        default:
            return tipo;
    }
}

/* =========================================================
   FORMATEAR TAMAÑO
   ========================================================= */

function formatearSize(
    size:
        number,
) {

    if (
        size >=
        1024 *
        1024
    ) {
        return `${(
            size /
            1024 /
            1024
        ).toFixed(
            2,
        )} MB`;
    }

    return `${(
        size /
        1024
    ).toFixed(
        1,
    )} KB`;
}

/* =========================================================
   COMPONENTE
   ========================================================= */

export default function CampaniaDetalleModal({
    open,
    campania,
    onClose,
}: Props) {

    if (
        !campania
    ) {
        return (
            <Modal
                open={
                    open
                }
                onCancel={
                    onClose
                }
                footer={
                    null
                }
            />
        );
    }

    const configuracion =
        campania
            .configuracionConsentimiento;

    const destinatarios =
        campania
            ._count
            ?.destinatarios ??
        0;

    return (
        <Modal
            open={
                open
            }
            onCancel={
                onClose
            }
            footer={
                null
            }
            width={
                980
            }
            destroyOnHidden
            title={
                <div className="pr-8">

                    <div className="text-lg font-semibold text-slate-900">
                        Detalle de campaña
                    </div>

                    <div className="mt-1 text-sm font-normal text-slate-500">
                        Revisa la configuración, documento y contenido enviado a los destinatarios.
                    </div>

                </div>
            }
        >

            <div className="space-y-5">

                {/* =====================================================
                    CABECERA
                    ===================================================== */}

                <Card
                    size="small"
                    className="overflow-hidden"
                >

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">

                        <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-2">

                                <h2 className="m-0 text-xl font-semibold text-slate-900">
                                    {
                                        campania.nombre
                                    }
                                </h2>

                                <Tag
                                    color={
                                        getEstadoCampaniaColor(
                                            campania.estado,
                                        )
                                    }
                                >
                                    {
                                        getEstadoCampaniaLabel(
                                            campania.estado,
                                        )
                                    }
                                </Tag>

                            </div>

                            {campania.descripcion && (
                                <p className="mb-0 mt-2 max-w-3xl text-sm text-slate-500">
                                    {
                                        campania.descripcion
                                    }
                                </p>
                            )}

                        </div>

                        <div className="flex flex-wrap gap-2">

                            <Tag>
                                Versión{" "}
                                {
                                    campania.versionDocumento
                                }
                            </Tag>

                            <Tag
                                icon={
                                    <TeamOutlined />
                                }
                            >
                                {
                                    destinatarios
                                }{" "}
                                destinatario{
                                    destinatarios ===
                                        1
                                        ? ""
                                        : "s"
                                }
                            </Tag>

                        </div>

                    </div>

                </Card>

                {/* =====================================================
                    KPIs
                    ===================================================== */}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

                    <Card
                        size="small"
                    >
                        <div className="flex items-start gap-3">

                            <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                                <FileTextOutlined />
                            </div>

                            <div>

                                <div className="text-xs text-slate-500">
                                    Documento
                                </div>

                                <div className="mt-1 line-clamp-2 text-sm font-semibold text-slate-800">
                                    {
                                        campania.tituloDocumento
                                    }
                                </div>

                            </div>

                        </div>
                    </Card>

                    <Card
                        size="small"
                    >
                        <div className="flex items-start gap-3">

                            <div className="rounded-lg bg-cyan-50 p-2 text-cyan-700">
                                <SafetyCertificateOutlined />
                            </div>

                            <div>

                                <div className="text-xs text-slate-500">
                                    Versión
                                </div>

                                <div className="mt-1 text-sm font-semibold text-slate-800">
                                    {
                                        campania.versionDocumento
                                    }
                                </div>

                            </div>

                        </div>
                    </Card>

                    <Card
                        size="small"
                    >
                        <div className="flex items-start gap-3">

                            <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
                                <TeamOutlined />
                            </div>

                            <div>

                                <div className="text-xs text-slate-500">
                                    Destinatarios
                                </div>

                                <div className="mt-1 text-sm font-semibold text-slate-800">
                                    {
                                        destinatarios
                                    }
                                </div>

                            </div>

                        </div>
                    </Card>

                    <Card
                        size="small"
                    >
                        <div className="flex items-start gap-3">

                            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                                <CalendarOutlined />
                            </div>

                            <div>

                                <div className="text-xs text-slate-500">
                                    Creada
                                </div>

                                <div className="mt-1 text-sm font-semibold text-slate-800">
                                    {
                                        formatearFechaHora(
                                            campania.createdAt,
                                        )
                                    }
                                </div>

                            </div>

                        </div>
                    </Card>

                </div>

                {/* =====================================================
                    TABS
                    ===================================================== */}

                <Tabs
                    items={[
                        /* =================================================
                           RESUMEN
                           ================================================= */

                        {
                            key:
                                "resumen",

                            label:
                                "Resumen",

                            children:
                                (
                                    <div className="space-y-4">

                                        <Descriptions
                                            bordered
                                            size="small"
                                            column={{
                                                xs:
                                                    1,

                                                sm:
                                                    2,
                                            }}
                                        >

                                            <Descriptions.Item
                                                label="Estado"
                                            >
                                                <Tag
                                                    color={
                                                        getEstadoCampaniaColor(
                                                            campania.estado,
                                                        )
                                                    }
                                                >
                                                    {
                                                        getEstadoCampaniaLabel(
                                                            campania.estado,
                                                        )
                                                    }
                                                </Tag>
                                            </Descriptions.Item>

                                            <Descriptions.Item
                                                label="Versión"
                                            >
                                                {
                                                    campania.versionDocumento
                                                }
                                            </Descriptions.Item>

                                            <Descriptions.Item
                                                label="Creada"
                                            >
                                                {
                                                    formatearFechaHora(
                                                        campania.createdAt,
                                                    )
                                                }
                                            </Descriptions.Item>

                                            <Descriptions.Item
                                                label="Actualizada"
                                            >
                                                {
                                                    formatearFechaHora(
                                                        campania.updatedAt,
                                                    )
                                                }
                                            </Descriptions.Item>

                                            <Descriptions.Item
                                                label="Creada por"
                                            >

                                                <div className="flex items-center gap-2">

                                                    <UserOutlined />

                                                    <span>
                                                        {
                                                            campania.creadoPor
                                                                ?.nombre ??
                                                            "Sistema"
                                                        }
                                                    </span>

                                                </div>

                                            </Descriptions.Item>

                                            <Descriptions.Item
                                                label="Correo creador"
                                            >
                                                {
                                                    campania.creadoPor
                                                        ?.email ??
                                                    "—"
                                                }
                                            </Descriptions.Item>

                                            <Descriptions.Item
                                                label="Fecha inicio"
                                            >
                                                {
                                                    formatearFechaHora(
                                                        campania.fechaInicio,
                                                    )
                                                }
                                            </Descriptions.Item>

                                            <Descriptions.Item
                                                label="Fecha fin"
                                            >
                                                {
                                                    formatearFechaHora(
                                                        campania.fechaFin,
                                                    )
                                                }
                                            </Descriptions.Item>

                                            <Descriptions.Item
                                                label="Primer envío"
                                            >
                                                {
                                                    formatearFechaHora(
                                                        campania.fechaEnvioInicial,
                                                    )
                                                }
                                            </Descriptions.Item>

                                            <Descriptions.Item
                                                label="Destinatarios"
                                            >
                                                {
                                                    destinatarios
                                                }
                                            </Descriptions.Item>

                                            <Descriptions.Item
                                                label="Hash del documento"
                                                span={
                                                    2
                                                }
                                            >
                                                <div className="rounded-lg bg-slate-50 p-3">
                                                    <code className="break-all text-xs text-slate-600">
                                                        {
                                                            campania.documentoHash
                                                        }
                                                    </code>
                                                </div>
                                            </Descriptions.Item>

                                        </Descriptions>

                                    </div>
                                ),
                        },

                        /* =================================================
                           DOCUMENTO
                           ================================================= */

                        {
                            key:
                                "documento",

                            label:
                                "Documento",

                            children:
                                (
                                    <div>

                                        <div className="mb-3">

                                            <div className="text-sm font-semibold text-slate-800">
                                                {
                                                    campania.tituloDocumento
                                                }
                                            </div>

                                            <div className="mt-1 text-xs text-slate-500">
                                                Versión{" "}
                                                {
                                                    campania.versionDocumento
                                                }
                                            </div>

                                        </div>

                                        <div
                                            className="
                                                max-h-[520px]
                                                overflow-y-auto
                                                rounded-xl
                                                border
                                                border-slate-200
                                                bg-white
                                                p-6

                                                [&_h1]:mb-4
                                                [&_h1]:text-2xl
                                                [&_h1]:font-semibold

                                                [&_h2]:mb-3
                                                [&_h2]:mt-5
                                                [&_h2]:text-xl
                                                [&_h2]:font-semibold

                                                [&_h3]:mb-2
                                                [&_h3]:mt-4
                                                [&_h3]:text-lg
                                                [&_h3]:font-semibold

                                                [&_p]:my-2
                                                [&_p]:leading-7

                                                [&_ul]:ml-6
                                                [&_ul]:list-disc

                                                [&_ol]:ml-6
                                                [&_ol]:list-decimal

                                                [&_a]:text-cyan-700
                                                [&_a]:underline
                                            "
                                            dangerouslySetInnerHTML={{
                                                __html:
                                                    campania.contenidoHtml,
                                            }}
                                        />

                                    </div>
                                ),
                        },

                        /* =================================================
                           FORMULARIO
                           ================================================= */

                        {
                            key:
                                "formulario",

                            label:
                                "Formulario",

                            children:
                                (
                                    <div className="space-y-4">

                                        {!configuracion ? (

                                            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                                                Esta campaña no tiene configuración de formulario.
                                            </div>

                                        ) : (
                                            <>

                                                <Card
                                                    size="small"
                                                >

                                                    <div className="font-semibold text-slate-800">
                                                        {
                                                            configuracion.tituloFormulario
                                                        }
                                                    </div>

                                                    {configuracion.descripcionFormulario && (
                                                        <div className="mt-1 text-sm text-slate-500">
                                                            {
                                                                configuracion.descripcionFormulario
                                                            }
                                                        </div>
                                                    )}

                                                    <div className="mt-3">
                                                        <Tag>
                                                            Botón:{" "}
                                                            {
                                                                configuracion.textoBoton
                                                            }
                                                        </Tag>
                                                    </div>

                                                </Card>

                                                <div className="space-y-3">

                                                    {
                                                        configuracion.campos.map(
                                                            (
                                                                campo,
                                                                index,
                                                            ) => (
                                                                <Card
                                                                    key={
                                                                        campo.key
                                                                    }
                                                                    size="small"
                                                                >

                                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

                                                                        <div className="min-w-0">

                                                                            <div className="flex flex-wrap items-center gap-2">

                                                                                <span className="font-semibold text-slate-800">
                                                                                    {
                                                                                        index +
                                                                                        1
                                                                                    }.{" "}
                                                                                    {
                                                                                        campo.label
                                                                                    }
                                                                                </span>

                                                                                <Tag>
                                                                                    {
                                                                                        getTipoCampoLabel(
                                                                                            campo.tipo,
                                                                                        )
                                                                                    }
                                                                                </Tag>

                                                                                <Tag
                                                                                    color={
                                                                                        campo.obligatorio
                                                                                            ? "red"
                                                                                            : "default"
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        campo.obligatorio
                                                                                            ? "Obligatorio"
                                                                                            : "Opcional"
                                                                                    }
                                                                                </Tag>

                                                                            </div>

                                                                            {campo.descripcion && (
                                                                                <div className="mt-2 text-sm text-slate-500">
                                                                                    {
                                                                                        campo.descripcion
                                                                                    }
                                                                                </div>
                                                                            )}

                                                                            {campo.placeholder && (
                                                                                <div className="mt-2 text-xs text-slate-400">
                                                                                    Placeholder:{" "}
                                                                                    {
                                                                                        campo.placeholder
                                                                                    }
                                                                                </div>
                                                                            )}

                                                                            {campo.opciones &&
                                                                                campo.opciones.length >
                                                                                0 && (
                                                                                    <div className="mt-3 flex flex-wrap gap-2">

                                                                                        {
                                                                                            campo.opciones.map(
                                                                                                (
                                                                                                    opcion,
                                                                                                ) => (
                                                                                                    <Tag
                                                                                                        key={
                                                                                                            opcion.value
                                                                                                        }
                                                                                                    >
                                                                                                        {
                                                                                                            opcion.label
                                                                                                        }
                                                                                                    </Tag>
                                                                                                ),
                                                                                            )
                                                                                        }

                                                                                    </div>
                                                                                )}

                                                                            {campo.documentos &&
                                                                                campo.documentos.length >
                                                                                0 && (
                                                                                    <div className="mt-4">

                                                                                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                                                            Documentos asociados
                                                                                        </div>

                                                                                        <div className="space-y-2">

                                                                                            {
                                                                                                campo.documentos.map(
                                                                                                    (
                                                                                                        documento,
                                                                                                    ) => (
                                                                                                        <div
                                                                                                            key={
                                                                                                                documento.path
                                                                                                            }
                                                                                                            className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                                                                                                        >

                                                                                                            <div className="text-sm font-medium text-slate-800">
                                                                                                                {
                                                                                                                    documento.titulo
                                                                                                                }
                                                                                                            </div>

                                                                                                            <div className="mt-1 text-xs text-slate-500">
                                                                                                                {
                                                                                                                    documento.nombre
                                                                                                                }
                                                                                                                {" · "}
                                                                                                                {
                                                                                                                    formatearSize(
                                                                                                                        documento.size,
                                                                                                                    )
                                                                                                                }
                                                                                                            </div>

                                                                                                            <div className="mt-2 break-all font-mono text-[10px] text-slate-400">
                                                                                                                SHA-256:{" "}
                                                                                                                {
                                                                                                                    documento.sha256
                                                                                                                }
                                                                                                            </div>

                                                                                                        </div>
                                                                                                    ),
                                                                                                )
                                                                                            }

                                                                                        </div>

                                                                                    </div>
                                                                                )}

                                                                        </div>

                                                                        <code className="shrink-0 text-xs text-slate-400">
                                                                            {
                                                                                campo.key
                                                                            }
                                                                        </code>

                                                                    </div>

                                                                </Card>
                                                            ),
                                                        )
                                                    }

                                                </div>

                                            </>
                                        )}

                                    </div>
                                ),
                        },

                        /* =================================================
                           CORREO
                           ================================================= */

                        {
                            key:
                                "correo",

                            label:
                                "Correo",

                            children:
                                (
                                    <div className="space-y-4">

                                        <Card
                                            size="small"
                                        >
                                            <div className="flex items-start gap-3">

                                                <div className="rounded-lg bg-cyan-50 p-2 text-cyan-700">
                                                    <MailOutlined />
                                                </div>

                                                <div>

                                                    <div className="text-xs text-slate-500">
                                                        Asunto
                                                    </div>

                                                    <div className="mt-1 font-semibold text-slate-800">
                                                        {
                                                            campania.asuntoCorreo
                                                        }
                                                    </div>

                                                </div>

                                            </div>
                                        </Card>

                                        <div>

                                            <div className="mb-2 text-sm font-semibold text-slate-800">
                                                Vista previa del mensaje
                                            </div>

                                            <div
                                                className="
                                                    max-h-[480px]
                                                    overflow-y-auto
                                                    rounded-xl
                                                    border
                                                    border-slate-200
                                                    bg-white
                                                    p-6

                                                    [&_p]:my-2
                                                    [&_p]:leading-7

                                                    [&_ul]:ml-6
                                                    [&_ul]:list-disc

                                                    [&_ol]:ml-6
                                                    [&_ol]:list-decimal

                                                    [&_a]:text-cyan-700
                                                    [&_a]:underline
                                                "
                                                dangerouslySetInnerHTML={{
                                                    __html:
                                                        campania.cuerpoCorreoHtml,
                                                }}
                                            />

                                        </div>

                                    </div>
                                ),
                        },
                    ]}
                />

            </div>

        </Modal>
    );
}