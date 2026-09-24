// src/components/modals-bitacora/BitacoraDetailModal.tsx

import {
    BellOutlined,
    CheckCircleOutlined,
    CheckOutlined,
    ClockCircleOutlined,
    CloseCircleOutlined,
    EditOutlined,
    FileImageOutlined,
    HistoryOutlined,
    LockOutlined,
    SafetyCertificateOutlined,
    UndoOutlined,
} from "@ant-design/icons";

import {
    Button,
    Empty,
    Modal,
    Tabs,
    Tag,
} from "antd";

import type {
    BitacoraAprobacion,
    BitacoraEtapa,
    BitacoraEvento,
    BitacoraTecnico,
    EtapaBitacora,
    EstadoEtapaBitacora,
} from "./bitacora.types";

import {
    esNotaRapida,
    formatFechaChile,
    formatFechaHoraChile,
    formatRecordatorioChile,
    formatTituloBitacora,
    getRecordatorioBadgeClass,
    getRecordatorioLabel,
    obtenerEstadoRecordatorio,
    renderRelacionesResumen,
} from "./bitacora.helpers";

import BitacoraEvidenciasTab
    from "./BitacoraEvidenciasTab";

/* =====================================================
   PROPS
===================================================== */

type Props = {
    open:
    boolean;

    bitacora:
    BitacoraTecnico | null;

    onClose:
    () => void;

    onEdit:
    (
        bitacora:
            BitacoraTecnico
    ) => void;

    onToggleRecordatorio:
    (
        bitacora:
            BitacoraTecnico
    ) => void;

    puedeEditar:
    boolean;

    puedeRevisar:
    boolean;

    puedeModificarRecordatorio:
    boolean;

    onReview:
    (
        bitacora:
            BitacoraTecnico
    ) => void;
};

/* =====================================================
   CONSTANTES
===================================================== */

const ORDEN_ETAPAS:
    EtapaBitacora[] = [
        "ANTES",
        "EN_PROCESO",
        "DESPUES",
    ];

/* =====================================================
   HELPERS ETAPAS
===================================================== */

function getEtapaLabel(
    etapa:
        EtapaBitacora
) {
    switch (
    etapa
    ) {
        case "ANTES":
            return "Antes";

        case "EN_PROCESO":
            return "En proceso";

        case "DESPUES":
            return "Después";
    }
}

function getEtapaDescripcion(
    etapa:
        EtapaBitacora
) {
    switch (
    etapa
    ) {
        case "ANTES":
            return "Situación inicial, diagnóstico o condición encontrada.";

        case "EN_PROCESO":
            return "Acciones, procedimientos y cambios realizados.";

        case "DESPUES":
            return "Resultado final, validaciones y estado de entrega.";
    }
}

function getEstadoEtapaTag(
    estado:
        EstadoEtapaBitacora
) {
    switch (
    estado
    ) {
        case "PENDIENTE":
            return (
                <Tag
                    icon={
                        <LockOutlined />
                    }
                >
                    Pendiente
                </Tag>
            );

        case "EN_PROCESO":
            return (
                <Tag
                    color="processing"
                    icon={
                        <ClockCircleOutlined />
                    }
                >
                    En proceso
                </Tag>
            );

        case "PENDIENTE_REVISION":
            return (
                <Tag
                    color="warning"
                    icon={
                        <SafetyCertificateOutlined />
                    }
                >
                    Pendiente revisión
                </Tag>
            );

        case "APROBADA":
            return (
                <Tag
                    color="success"
                    icon={
                        <CheckCircleOutlined />
                    }
                >
                    Aprobada
                </Tag>
            );

        case "RECHAZADA":
            return (
                <Tag
                    color="error"
                    icon={
                        <CloseCircleOutlined />
                    }
                >
                    Rechazada
                </Tag>
            );

        case "COMPLETADA":
            return (
                <Tag
                    color="success"
                    icon={
                        <CheckCircleOutlined />
                    }
                >
                    Completada
                </Tag>
            );
    }
}

function getEventoLabel(
    tipo:
        BitacoraEvento["tipo"]
) {
    switch (
    tipo
    ) {
        case "CREADA":
            return "Bitácora creada";

        case "ETAPA_INICIADA":
            return "Etapa iniciada";

        case "ETAPA_ACTUALIZADA":
            return "Etapa actualizada";

        case "ETAPA_COMPLETADA":
            return "Etapa completada";

        case "EVIDENCIA_AGREGADA":
            return "Evidencia agregada";

        case "EVIDENCIA_ELIMINADA":
            return "Evidencia eliminada";

        case "REVISION_SOLICITADA":
            return "Revisión solicitada";

        case "REVISION_APROBADA":
            return "Revisión aprobada";

        case "REVISION_RECHAZADA":
            return "Revisión rechazada";

        case "REVISION_CANCELADA":
            return "Revisión cancelada";

        case "BITACORA_CERRADA":
            return "Bitácora cerrada";

        case "BITACORA_ANULADA":
            return "Bitácora anulada";

        default:
            return tipo;
    }
}

/* =====================================================
   COMPONENTE
===================================================== */

export default function BitacoraDetailModal({
    open,
    bitacora,
    puedeEditar,
    puedeRevisar,
    puedeModificarRecordatorio,
    onClose,
    onEdit,
    onReview,
    onToggleRecordatorio,
}: Props) {
    const relaciones =
        bitacora
            ? renderRelacionesResumen(
                bitacora
            )
            : [];

    const etapas =
        bitacora
            ?.etapas ??
        [];

    const eventos =
        bitacora
            ?.eventos ??
        [];

    const totalEvidencias =
        etapas.reduce(
            (
                total,
                etapa
            ) =>
                total +
                (
                    etapa.evidencias
                        ?.length ??
                    0
                ),
            0
        );

    return (
        <Modal
            open={
                open
            }

            onCancel={
                onClose
            }

            width={
                1100
            }

            destroyOnClose

            footer={[
                <Button
                    key="cerrar"
                    onClick={
                        onClose
                    }
                >
                    Cerrar
                </Button>,

                bitacora &&
                    puedeRevisar ? (
                    <Button
                        key="revisar"
                        type="primary"
                        icon={
                            <SafetyCertificateOutlined />
                        }
                        onClick={() =>
                            onReview(
                                bitacora
                            )
                        }
                    >
                        Revisar
                    </Button>
                ) : null,

                bitacora &&
                    puedeEditar ? (
                    <Button
                        key="editar"
                        type={
                            puedeRevisar
                                ? "default"
                                : "primary"
                        }
                        icon={
                            <EditOutlined />
                        }
                        onClick={() =>
                            onEdit(
                                bitacora
                            )
                        }
                    >
                        Editar
                    </Button>
                ) : null,
            ]}

            title={
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                        Detalle de bitácora
                    </h2>

                    <p className="mt-1 text-sm font-normal text-slate-500">
                        Visualización completa del registro,
                        desarrollo técnico y trazabilidad.
                    </p>
                </div>
            }
        >
            {bitacora && (
                <Tabs
                    defaultActiveKey="resumen"

                    items={[
                        /* =====================================================
                           RESUMEN
                        ===================================================== */

                        {
                            key:
                                "resumen",

                            label:
                                "Resumen",

                            children: (
                                <div className="space-y-5">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <InfoBox
                                            label="Fecha de actividad"
                                            value={
                                                formatFechaChile(
                                                    bitacora.fecha
                                                )
                                            }
                                        />

                                        <InfoBox
                                            label="Creada"
                                            value={
                                                formatFechaHoraChile(
                                                    bitacora.createdAt
                                                )
                                            }
                                        />

                                        <InfoBox
                                            label="Técnico"
                                            value={
                                                bitacora
                                                    .tecnico
                                                    ?.nombre ??
                                                "-"
                                            }
                                        />

                                        <InfoBox
                                            label="Empresa"
                                            value={
                                                bitacora
                                                    .empresa
                                                    ?.nombre ??
                                                "-"
                                            }
                                        />

                                        <InfoBox
                                            label="Tipo"
                                            value={
                                                bitacora.tipoActividad
                                            }
                                            valueClassName="text-blue-700"
                                        />

                                        <InfoBox
                                            label="Estado"
                                            value={
                                                bitacora.estado
                                            }
                                        />
                                    </div>

                                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Título
                                        </p>

                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <p className="font-semibold text-slate-900">
                                                {formatTituloBitacora(
                                                    bitacora.titulo
                                                )}
                                            </p>

                                            {esNotaRapida(
                                                bitacora
                                            ) && (
                                                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                                                        Rápida
                                                    </span>
                                                )}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Resumen general
                                        </p>

                                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                            {
                                                bitacora.descripcion
                                            }
                                        </p>
                                    </div>

                                    {/* RECORDATORIO */}

                                    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                                                    Recordatorio
                                                </p>

                                                {bitacora.recordatorioAt ? (
                                                    <p className="mt-2 font-semibold text-slate-900">
                                                        {formatRecordatorioChile(
                                                            bitacora.recordatorioAt
                                                        )}
                                                    </p>
                                                ) : (
                                                    <p className="mt-2 text-sm text-slate-500">
                                                        Sin recordatorio configurado
                                                    </p>
                                                )}
                                            </div>

                                            {bitacora.recordatorioAt && (
                                                <BellOutlined className="text-2xl text-amber-600" />
                                            )}
                                        </div>

                                        {bitacora.recordatorioAt &&
                                            puedeModificarRecordatorio && (
                                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                                    <span
                                                        className={[
                                                            "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",

                                                            getRecordatorioBadgeClass(
                                                                obtenerEstadoRecordatorio(
                                                                    bitacora
                                                                )
                                                            ),
                                                        ].join(
                                                            " "
                                                        )}
                                                    >
                                                        {getRecordatorioLabel(
                                                            obtenerEstadoRecordatorio(
                                                                bitacora
                                                            )
                                                        )}
                                                    </span>

                                                    <Button
                                                        size="small"

                                                        type={
                                                            bitacora.recordatorioCompletado
                                                                ? "default"
                                                                : "primary"
                                                        }

                                                        icon={
                                                            bitacora.recordatorioCompletado
                                                                ? (
                                                                    <UndoOutlined />
                                                                )
                                                                : (
                                                                    <CheckOutlined />
                                                                )
                                                        }

                                                        onClick={() =>
                                                            onToggleRecordatorio(
                                                                bitacora
                                                            )
                                                        }
                                                    >
                                                        {bitacora.recordatorioCompletado
                                                            ? "Reactivar"
                                                            : "Completar"}
                                                    </Button>
                                                </div>
                                            )}
                                    </div>

                                    {/* RELACIONES */}

                                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Relaciones asociadas
                                        </p>

                                        {relaciones.length >
                                            0 ? (
                                            <div className="mt-3 flex flex-col gap-2">
                                                {relaciones.map(
                                                    (
                                                        relacion,
                                                        index
                                                    ) => (
                                                        <div
                                                            key={`${relacion}-${index}`}
                                                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800"
                                                        >
                                                            {
                                                                relacion
                                                            }
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        ) : (
                                            <p className="mt-2 text-sm font-semibold text-slate-800">
                                                Sin relaciones asociadas
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ),
                        },

                        /* =====================================================
                           DESARROLLO
                        ===================================================== */

                        {
                            key:
                                "desarrollo",

                            label: (
                                <span>
                                    Desarrollo

                                    {totalEvidencias >
                                        0 && (
                                            <span className="ml-2 rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-semibold text-cyan-700">
                                                {
                                                    totalEvidencias
                                                }
                                            </span>
                                        )}
                                </span>
                            ),

                            children: (
                                <DesarrolloBitacora
                                    etapas={
                                        etapas
                                    }
                                />
                            ),
                        },

                        /* =====================================================
                           HISTORIAL
                        ===================================================== */

                        {
                            key:
                                "historial",

                            label: (
                                <span>
                                    <HistoryOutlined className="mr-1" />

                                    Historial

                                    {eventos.length >
                                        0 && (
                                            <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                                                {
                                                    eventos.length
                                                }
                                            </span>
                                        )}
                                </span>
                            ),

                            children: (
                                <HistorialBitacora
                                    eventos={
                                        eventos
                                    }
                                />
                            ),
                        },
                    ]}
                />
            )}
        </Modal>
    );
}

/* =====================================================
   DESARROLLO BITÁCORA
===================================================== */

function DesarrolloBitacora({
    etapas,
}: {
    etapas:
    BitacoraEtapa[];
}) {
    if (
        etapas.length ===
        0
    ) {
        return (
            <Empty
                description="Esta bitácora no posee información de etapas."
            />
        );
    }

    return (
        <div className="space-y-5">
            {ORDEN_ETAPAS.map(
                (
                    etapaTipo,
                    index
                ) => {
                    const etapa =
                        etapas.find(
                            item =>
                                item.etapa ===
                                etapaTipo
                        );

                    return (
                        <div
                            key={
                                etapaTipo
                            }
                            className="relative pl-11"
                        >
                            {index <
                                ORDEN_ETAPAS.length -
                                1 && (
                                    <div className="absolute bottom-[-22px] left-[18px] top-9 w-px bg-slate-200" />
                                )}

                            <div
                                className={[
                                    "absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold",

                                    etapa?.estado ===
                                        "RECHAZADA"
                                        ? "border-red-200 bg-red-50 text-red-700"
                                        : etapa?.estado ===
                                            "PENDIENTE"
                                            ? "border-slate-200 bg-slate-100 text-slate-400"
                                            : "border-cyan-200 bg-cyan-50 text-cyan-700",
                                ].join(
                                    " "
                                )}
                            >
                                {
                                    index +
                                    1
                                }
                            </div>

                            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h3 className="font-semibold text-slate-900">
                                            {getEtapaLabel(
                                                etapaTipo
                                            )}
                                        </h3>

                                        <p className="mt-1 text-xs leading-5 text-slate-500">
                                            {getEtapaDescripcion(
                                                etapaTipo
                                            )}
                                        </p>
                                    </div>

                                    {etapa &&
                                        getEstadoEtapaTag(
                                            etapa.estado
                                        )}
                                </div>

                                {!etapa ? (
                                    <p className="mt-4 text-sm text-slate-500">
                                        Sin información registrada.
                                    </p>
                                ) : (
                                    <div className="mt-5 space-y-5">
                                        {/* DESCRIPCIÓN */}

                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                {etapaTipo ===
                                                    "ANTES"
                                                    ? "Diagnóstico / situación inicial"
                                                    : etapaTipo ===
                                                        "EN_PROCESO"
                                                        ? "Acciones realizadas"
                                                        : "Resultado final"}
                                            </p>

                                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                                {
                                                    etapa.descripcion?.trim() ||
                                                    "Sin descripción registrada."
                                                }
                                            </p>
                                        </div>

                                        {/* EVIDENCIAS */}

                                        <div>
                                            <div className="mb-2 flex items-center gap-2">
                                                <FileImageOutlined className="text-slate-500" />

                                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                    Evidencias
                                                </p>
                                            </div>

                                            <BitacoraEvidenciasTab
                                                evidencias={
                                                    etapa.evidencias ??
                                                    []
                                                }

                                                loading={
                                                    false
                                                }

                                                editable={
                                                    false
                                                }

                                                etapasVisibles={[
                                                    etapaTipo,
                                                ]}
                                            />
                                        </div>

                                        {/* REVISIONES */}

                                        <RevisionesEtapa
                                            etapa={
                                                etapa
                                            }
                                        />

                                        {/* FECHAS */}

                                        <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                                            <InfoMini
                                                label="Iniciada"
                                                value={
                                                    etapa.iniciadoAt
                                                        ? formatFechaHoraChile(
                                                            etapa.iniciadoAt
                                                        )
                                                        : "-"
                                                }
                                            />

                                            <InfoMini
                                                label="Completada"
                                                value={
                                                    etapa.completadoAt
                                                        ? formatFechaHoraChile(
                                                            etapa.completadoAt
                                                        )
                                                        : "-"
                                                }
                                            />
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>
                    );
                }
            )}
        </div>
    );
}

/* =====================================================
   REVISIONES DE ETAPA
===================================================== */

function RevisionesEtapa({
    etapa,
}: {
    etapa:
    BitacoraEtapa;
}) {
    const aprobaciones =
        etapa.aprobaciones ??
        [];

    if (
        !etapa.requiereRevision &&
        aprobaciones.length ===
        0
    ) {
        return (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                Esta etapa no requiere revisión adicional.
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
            <div className="flex items-center gap-2">
                <SafetyCertificateOutlined className="text-indigo-600" />

                <p className="text-sm font-semibold text-slate-800">
                    Revisión
                </p>
            </div>

            {aprobaciones.length ===
                0 ? (
                <p className="mt-2 text-sm text-slate-600">
                    La etapa requiere revisión, pero aún no existe una solicitud registrada.
                </p>
            ) : (
                <div className="mt-3 space-y-3">
                    {aprobaciones.map(
                        (
                            aprobacion
                        ) => (
                            <RevisionItem
                                key={
                                    aprobacion.id
                                }
                                aprobacion={
                                    aprobacion
                                }
                            />
                        )
                    )}
                </div>
            )}
        </div>
    );
}

function RevisionItem({
    aprobacion,
}: {
    aprobacion:
    BitacoraAprobacion;
}) {
    return (
        <div className="rounded-xl border border-indigo-100 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <p className="text-sm font-semibold text-slate-800">
                        {
                            aprobacion
                                .aprobador
                                ?.nombre ??
                            `Usuario #${aprobacion.aprobadorId}`
                        }
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                        Solicitada{" "}
                        {formatFechaHoraChile(
                            aprobacion.solicitadoAt
                        )}
                    </p>
                </div>

                <Tag
                    color={
                        aprobacion.estado ===
                            "APROBADA"
                            ? "success"
                            : aprobacion.estado ===
                                "RECHAZADA"
                                ? "error"
                                : aprobacion.estado ===
                                    "PENDIENTE"
                                    ? "warning"
                                    : "default"
                    }
                >
                    {
                        aprobacion.estado
                    }
                </Tag>
            </div>

            {aprobacion.comentarioSolicitud && (
                <div className="mt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Solicitud
                    </p>

                    <p className="mt-1 text-sm text-slate-700">
                        {
                            aprobacion.comentarioSolicitud
                        }
                    </p>
                </div>
            )}

            {aprobacion.comentarioRespuesta && (
                <div className="mt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Respuesta
                    </p>

                    <p className="mt-1 text-sm text-slate-700">
                        {
                            aprobacion.comentarioRespuesta
                        }
                    </p>
                </div>
            )}

            {aprobacion.respondidoAt && (
                <p className="mt-3 text-xs text-slate-400">
                    Respondida{" "}
                    {formatFechaHoraChile(
                        aprobacion.respondidoAt
                    )}
                </p>
            )}
        </div>
    );
}

/* =====================================================
   HISTORIAL
===================================================== */

function HistorialBitacora({
    eventos,
}: {
    eventos:
    BitacoraEvento[];
}) {
    if (
        eventos.length ===
        0
    ) {
        return (
            <Empty
                description="No existen eventos registrados."
            />
        );
    }

    return (
        <div className="space-y-3">
            {eventos.map(
                (
                    evento
                ) => (
                    <div
                        key={
                            evento.id
                        }
                        className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4"
                    >
                        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                            <HistoryOutlined />
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">
                                        {getEventoLabel(
                                            evento.tipo
                                        )}
                                    </p>

                                    {evento.descripcion && (
                                        <p className="mt-1 text-sm text-slate-600">
                                            {
                                                evento.descripcion
                                            }
                                        </p>
                                    )}
                                </div>

                                <span className="text-xs text-slate-400">
                                    {formatFechaHoraChile(
                                        evento.createdAt
                                    )}
                                </span>
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                                {evento.actor && (
                                    <span>
                                        Por{" "}
                                        <strong>
                                            {
                                                evento.actor.nombre
                                            }
                                        </strong>
                                    </span>
                                )}

                                {evento.etapa && (
                                    <Tag>
                                        {getEtapaLabel(
                                            evento.etapa.etapa
                                        )}
                                    </Tag>
                                )}
                            </div>
                        </div>
                    </div>
                )
            )}
        </div>
    );
}

/* =====================================================
   INFO BOX
===================================================== */

function InfoBox({
    label,
    value,
    valueClassName = "text-slate-900",
}: {
    label:
    string;

    value:
    string;

    valueClassName?:
    string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {
                    label
                }
            </p>

            <p
                className={`mt-1 font-semibold ${valueClassName}`}
            >
                {
                    value
                }
            </p>
        </div>
    );
}

function InfoMini({
    label,
    value,
}: {
    label:
    string;

    value:
    string;
}) {
    return (
        <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {
                    label
                }
            </p>

            <p className="mt-1 text-sm font-medium text-slate-700">
                {
                    value
                }
            </p>
        </div>
    );
}