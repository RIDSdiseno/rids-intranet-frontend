// src/components/modals-bitacora/BitacoraTimelineEtapas.tsx
import type {
    Dispatch,
    SetStateAction,
} from "react";

import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloseCircleOutlined,
    LockOutlined,
    SafetyCertificateOutlined,
} from "@ant-design/icons";

import {
    Alert,
    Button,
    Input,
    Select,
    Switch,
    Tag,
} from "antd";

import type {
    BitacoraAprobacion,
    BitacoraEtapa,
    BitacoraEtapasFormState,
    BitacoraEvidencia,
    EtapaBitacora,
    EvidenciaPendiente,
    TecnicoOption,
} from "./bitacora.types";

import BitacoraEvidenciasTab
    from "./BitacoraEvidenciasTab";

type Props = {
    bitacoraId:
    number | null;

    etapas:
    BitacoraEtapa[];

    etapasForm:
    BitacoraEtapasFormState;

    setEtapasForm:
    Dispatch<
        SetStateAction<
            BitacoraEtapasFormState
        >
    >;

    puedeEditar:
    boolean;

    tecnicos:
    TecnicoOption[];

    tecnicoResponsableId:
    string;

    usuarioActualTecnicoId:
    number | null;

    evidenciasPendientes:
    EvidenciaPendiente[];

    evidenciasAEliminar:
    number[];

    loadingEvidencias:
    boolean;

    processingEtapaId:
    number | null;

    comentarioRespuesta:
    string;

    setComentarioRespuesta:
    (
        value:
            string
    ) => void;

    onAgregarEvidencia:
    (
        etapa:
            EtapaBitacora
    ) => void;

    onMarcarEliminarEvidencia:
    (
        evidencia:
            BitacoraEvidencia
    ) => void;

    onRestaurarEvidencia:
    (
        evidenciaId:
            number
    ) => void;

    onEliminarEvidenciaPendiente:
    (
        idTemporal:
            string
    ) => void;

    onGuardarEtapa:
    (
        etapa:
            BitacoraEtapa
    ) => Promise<void>;

    onCompletarEtapa:
    (
        etapa:
            BitacoraEtapa
    ) => Promise<void>;

    onSolicitarRevision:
    (
        etapa:
            BitacoraEtapa
    ) => Promise<void>;

    onResponderRevision:
    (
        etapa:
            BitacoraEtapa,
        aprobacion:
            BitacoraAprobacion,
        aprobar:
            boolean
    ) => Promise<void>;
};

const ORDEN_ETAPAS:
    EtapaBitacora[] = [
        "ANTES",
        "EN_PROCESO",
        "DESPUES",
    ];

function getLabelEtapa(
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

function getDescripcionEtapa(
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

function EstadoTag({
    estado,
}: {
    estado:
    BitacoraEtapa["estado"];
}) {
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

export default function BitacoraTimelineEtapas({
    bitacoraId,
    etapas,
    etapasForm,
    setEtapasForm,
    tecnicos,
    tecnicoResponsableId,
    usuarioActualTecnicoId,
    puedeEditar,

    evidenciasPendientes,
    evidenciasAEliminar,
    loadingEvidencias,

    processingEtapaId,

    comentarioRespuesta,
    setComentarioRespuesta,

    onAgregarEvidencia,
    onMarcarEliminarEvidencia,
    onRestaurarEvidencia,
    onEliminarEvidenciaPendiente,

    onGuardarEtapa,
    onCompletarEtapa,
    onSolicitarRevision,
    onResponderRevision,
}: Props) {
    const esCreacion =
        bitacoraId ===
        null;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="mb-6">
                <h3 className="text-base font-semibold text-slate-900">
                    Desarrollo de la actividad
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                    Registra el trabajo de forma cronológica:
                    situación inicial, acciones ejecutadas
                    y resultado final.
                </p>
            </div>

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

                        /*
                         * Al crear aún no existen IDs de
                         * BitacoraEtapa. Solo ANTES está
                         * disponible localmente.
                         */
                        const bloqueadaCreacion =
                            esCreacion &&
                            etapaTipo !==
                            "ANTES";

                        const bloqueadaBackend =
                            Boolean(
                                etapa &&
                                etapa.estado ===
                                "PENDIENTE"
                            );

                        const bloqueada =
                            bloqueadaCreacion ||
                            bloqueadaBackend;

                        const editable =
                            puedeEditar &&
                            (
                                esCreacion
                                    ? etapaTipo ===
                                    "ANTES"
                                    : Boolean(
                                        etapa &&
                                        (
                                            etapa.estado ===
                                            "EN_PROCESO" ||
                                            etapa.estado ===
                                            "RECHAZADA"
                                        )
                                    )
                            );

                        const formEtapa =
                            etapasForm[
                            etapaTipo
                            ];

                        const evidenciasEtapa =
                            etapa
                                ?.evidencias ??
                            [];

                        const pendientesEtapa =
                            evidenciasPendientes.filter(
                                item =>
                                    item.etapa ===
                                    etapaTipo
                            );

                        const revisionesPendientes =
                            etapa
                                ?.aprobaciones
                                ?.filter(
                                    aprobacion =>
                                        aprobacion.estado ===
                                        "PENDIENTE"
                                ) ??
                            [];

                        const revisionPendienteUsuario =
                            revisionesPendientes.find(
                                aprobacion =>
                                    Boolean(
                                        usuarioActualTecnicoId
                                    ) &&
                                    aprobacion.aprobadorId ===
                                    usuarioActualTecnicoId
                            );

                        const esRevisorActual =
                            Boolean(
                                revisionPendienteUsuario
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

                                        bloqueada
                                            ? "border-slate-200 bg-slate-100 text-slate-400"
                                            : etapa?.estado ===
                                                "RECHAZADA"
                                                ? "border-red-200 bg-red-50 text-red-700"
                                                : "border-cyan-200 bg-cyan-50 text-cyan-700",
                                    ].join(
                                        " "
                                    )}
                                >
                                    {index +
                                        1}
                                </div>

                                <section
                                    className={[
                                        "rounded-2xl border p-4",

                                        bloqueada
                                            ? "border-slate-200 bg-slate-50/80"
                                            : "border-slate-200 bg-white shadow-sm",
                                    ].join(
                                        " "
                                    )}
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div>
                                            <h4 className="text-sm font-semibold text-slate-900">
                                                {getLabelEtapa(
                                                    etapaTipo
                                                )}
                                            </h4>

                                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                                {getDescripcionEtapa(
                                                    etapaTipo
                                                )}
                                            </p>
                                        </div>

                                        {etapa ? (
                                            <EstadoTag
                                                estado={
                                                    etapa.estado
                                                }
                                            />
                                        ) : bloqueadaCreacion ? (
                                            <Tag
                                                icon={
                                                    <LockOutlined />
                                                }
                                            >
                                                Bloqueada
                                            </Tag>
                                        ) : (
                                            <Tag
                                                color="processing"
                                            >
                                                En preparación
                                            </Tag>
                                        )}
                                    </div>

                                    {bloqueada ? (
                                        <Alert
                                            className="mt-4"
                                            type="info"
                                            showIcon
                                            message={
                                                etapaTipo ===
                                                    "EN_PROCESO"
                                                    ? "Se habilitará cuando la etapa Antes sea completada."
                                                    : "Se habilitará cuando la etapa En proceso sea completada."
                                            }
                                        />
                                    ) : (
                                        <div className="mt-5 space-y-5">
                                            <div>
                                                <label className="mb-1 block text-xs font-semibold text-slate-700">
                                                    {etapaTipo ===
                                                        "ANTES"
                                                        ? "Diagnóstico / situación inicial"
                                                        : etapaTipo ===
                                                            "EN_PROCESO"
                                                            ? "Acciones realizadas"
                                                            : "Resultado final"}
                                                </label>

                                                <Input.TextArea
                                                    value={
                                                        formEtapa.descripcion
                                                    }
                                                    disabled={
                                                        !editable
                                                    }
                                                    rows={
                                                        4
                                                    }
                                                    placeholder={
                                                        getDescripcionEtapa(
                                                            etapaTipo
                                                        )
                                                    }
                                                    onChange={(
                                                        event
                                                    ) =>
                                                        setEtapasForm(
                                                            prev => ({
                                                                ...prev,

                                                                [etapaTipo]:
                                                                {
                                                                    ...prev[
                                                                    etapaTipo
                                                                    ],

                                                                    descripcion:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                },
                                                            })
                                                        )
                                                    }
                                                />
                                            </div>

                                            <div>
                                                <p className="mb-2 text-xs font-semibold text-slate-700">
                                                    Evidencias de la etapa
                                                </p>

                                                <BitacoraEvidenciasTab
                                                    evidencias={
                                                        evidenciasEtapa
                                                    }
                                                    pendientes={
                                                        pendientesEtapa
                                                    }
                                                    eliminadasIds={
                                                        evidenciasAEliminar
                                                    }
                                                    loading={
                                                        loadingEvidencias
                                                    }
                                                    editable={
                                                        editable
                                                    }
                                                    etapasVisibles={[
                                                        etapaTipo,
                                                    ]}
                                                    onAgregar={
                                                        editable
                                                            ? onAgregarEvidencia
                                                            : undefined
                                                    }
                                                    onMarcarEliminar={
                                                        editable
                                                            ? onMarcarEliminarEvidencia
                                                            : undefined
                                                    }
                                                    onRestaurar={
                                                        editable
                                                            ? onRestaurarEvidencia
                                                            : undefined
                                                    }
                                                    onEliminarPendiente={
                                                        editable
                                                            ? onEliminarEvidenciaPendiente
                                                            : undefined
                                                    }
                                                />
                                            </div>

                                            {editable && (
                                                <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-800">
                                                                Revisión por otro usuario
                                                            </p>

                                                            <p className="mt-1 text-xs leading-5 text-slate-500">
                                                                Actívala si esta etapa debe ser validada antes de continuar.
                                                            </p>
                                                        </div>

                                                        <Switch
                                                            checked={
                                                                formEtapa
                                                                    .requiereRevision
                                                            }
                                                            onChange={(
                                                                checked
                                                            ) =>
                                                                setEtapasForm(
                                                                    prev => ({
                                                                        ...prev,

                                                                        [etapaTipo]: {
                                                                            ...prev[
                                                                            etapaTipo
                                                                            ],

                                                                            requiereRevision:
                                                                                checked,

                                                                            aprobadoresIds:
                                                                                checked
                                                                                    ? prev[
                                                                                        etapaTipo
                                                                                    ]
                                                                                        .aprobadoresIds
                                                                                    : [],

                                                                            comentarioSolicitud:
                                                                                checked
                                                                                    ? prev[
                                                                                        etapaTipo
                                                                                    ]
                                                                                        .comentarioSolicitud
                                                                                    : "",
                                                                        },
                                                                    })
                                                                )
                                                            }
                                                        />
                                                    </div>

                                                    {formEtapa
                                                        .requiereRevision && (
                                                            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                                                                <div>
                                                                    <Select
                                                                        mode="multiple"
                                                                        value={
                                                                            formEtapa
                                                                                .aprobadoresIds
                                                                        }
                                                                        placeholder="Seleccionar hasta 4 revisores"
                                                                        className="w-full"
                                                                        showSearch
                                                                        allowClear
                                                                        optionFilterProp="label"
                                                                        maxTagCount={
                                                                            4
                                                                        }
                                                                        options={
                                                                            tecnicos
                                                                                .filter(
                                                                                    tecnico => {
                                                                                        const tecnicoId =
                                                                                            String(
                                                                                                tecnico.id_tecnico
                                                                                            );

                                                                                        const responsableId =
                                                                                            String(
                                                                                                tecnicoResponsableId ??
                                                                                                ""
                                                                                            );

                                                                                        const usuarioActualId =
                                                                                            String(
                                                                                                usuarioActualTecnicoId ??
                                                                                                ""
                                                                                            );

                                                                                        return (
                                                                                            tecnicoId !==
                                                                                            responsableId &&
                                                                                            tecnicoId !==
                                                                                            usuarioActualId
                                                                                        );
                                                                                    }
                                                                                )
                                                                                .map(
                                                                                    tecnico => ({
                                                                                        value:
                                                                                            String(
                                                                                                tecnico.id_tecnico
                                                                                            ),

                                                                                        label:
                                                                                            tecnico.nombre,

                                                                                        disabled:
                                                                                            formEtapa
                                                                                                .aprobadoresIds
                                                                                                .length >=
                                                                                            4 &&
                                                                                            !formEtapa
                                                                                                .aprobadoresIds
                                                                                                .includes(
                                                                                                    String(
                                                                                                        tecnico.id_tecnico
                                                                                                    )
                                                                                                ),
                                                                                    })
                                                                                )
                                                                        }
                                                                        onChange={(
                                                                            values:
                                                                                string[]
                                                                        ) => {
                                                                            if (
                                                                                values.length >
                                                                                4
                                                                            ) {
                                                                                return;
                                                                            }

                                                                            setEtapasForm(
                                                                                prev => ({
                                                                                    ...prev,

                                                                                    [etapaTipo]: {
                                                                                        ...prev[
                                                                                        etapaTipo
                                                                                        ],

                                                                                        aprobadoresIds:
                                                                                            values,
                                                                                    },
                                                                                })
                                                                            );
                                                                        }}
                                                                    />

                                                                    <p className="mt-1 text-xs text-slate-500">
                                                                        {
                                                                            formEtapa
                                                                                .aprobadoresIds
                                                                                .length
                                                                        }{" "}
                                                                        / 4 revisores seleccionados
                                                                    </p>
                                                                </div>

                                                                <Input
                                                                    value={
                                                                        formEtapa
                                                                            .comentarioSolicitud
                                                                    }
                                                                    placeholder="Comentario para el revisor"
                                                                    onChange={(
                                                                        event
                                                                    ) =>
                                                                        setEtapasForm(
                                                                            prev => ({
                                                                                ...prev,

                                                                                [etapaTipo]:
                                                                                {
                                                                                    ...prev[
                                                                                    etapaTipo
                                                                                    ],

                                                                                    comentarioSolicitud:
                                                                                        event
                                                                                            .target
                                                                                            .value,
                                                                                },
                                                                            })
                                                                        )
                                                                    }
                                                                />
                                                            </div>
                                                        )}
                                                </div>
                                            )}

                                            {etapa?.estado ===
                                                "PENDIENTE_REVISION" &&
                                                revisionesPendientes.length >
                                                0 && (
                                                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                                                        <div>
                                                            <p className="text-sm font-semibold text-amber-900">
                                                                Revisión pendiente
                                                            </p>

                                                            <p className="mt-1 text-xs text-amber-800">
                                                                {
                                                                    revisionesPendientes.length
                                                                }{" "}
                                                                revisor
                                                                {
                                                                    revisionesPendientes.length ===
                                                                        1
                                                                        ? ""
                                                                        : "es"
                                                                }{" "}
                                                                pendiente
                                                                {
                                                                    revisionesPendientes.length ===
                                                                        1
                                                                        ? ""
                                                                        : "s"
                                                                }
                                                            </p>
                                                        </div>

                                                        <div className="mt-3 space-y-2">
                                                            {
                                                                etapa.aprobaciones
                                                                    ?.filter(
                                                                        aprobacion => {
                                                                            const solicitudActual =
                                                                                revisionesPendientes[
                                                                                    0
                                                                                ]
                                                                                    ?.solicitudRevisionId;

                                                                            if (
                                                                                solicitudActual
                                                                            ) {
                                                                                return (
                                                                                    aprobacion
                                                                                        .solicitudRevisionId ===
                                                                                    solicitudActual
                                                                                );
                                                                            }

                                                                            /*
                                                                             * Compatibilidad con revisiones
                                                                             * antiguas sin solicitudRevisionId.
                                                                             */
                                                                            return (
                                                                                aprobacion.estado ===
                                                                                "PENDIENTE"
                                                                            );
                                                                        }
                                                                    )
                                                                    .map(
                                                                        aprobacion => (
                                                                            <div
                                                                                key={
                                                                                    aprobacion.id
                                                                                }
                                                                                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-100 bg-white/70 px-3 py-2"
                                                                            >
                                                                                <span className="text-sm font-medium text-slate-700">
                                                                                    {
                                                                                        aprobacion
                                                                                            .aprobador
                                                                                            ?.nombre ??
                                                                                        `#${aprobacion.aprobadorId}`
                                                                                    }
                                                                                </span>

                                                                                <Tag
                                                                                    color={
                                                                                        aprobacion.estado ===
                                                                                            "APROBADA"
                                                                                            ? "success"
                                                                                            : aprobacion.estado ===
                                                                                                "RECHAZADA"
                                                                                                ? "error"
                                                                                                : aprobacion.estado ===
                                                                                                    "CANCELADA"
                                                                                                    ? "default"
                                                                                                    : "warning"
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        aprobacion.estado ===
                                                                                            "APROBADA"
                                                                                            ? "Aprobada"
                                                                                            : aprobacion.estado ===
                                                                                                "RECHAZADA"
                                                                                                ? "Rechazada"
                                                                                                : aprobacion.estado ===
                                                                                                    "CANCELADA"
                                                                                                    ? "Cancelada"
                                                                                                    : "Pendiente"
                                                                                    }
                                                                                </Tag>
                                                                            </div>
                                                                        )
                                                                    )
                                                            }
                                                        </div>

                                                        {
                                                            revisionesPendientes[
                                                                0
                                                            ]?.comentarioSolicitud && (
                                                                <p className="mt-3 rounded-lg bg-white/60 px-3 py-2 text-sm text-slate-700">
                                                                    {
                                                                        revisionesPendientes[
                                                                            0
                                                                        ]
                                                                            .comentarioSolicitud
                                                                    }
                                                                </p>
                                                            )
                                                        }

                                                        {esRevisorActual &&
                                                            revisionPendienteUsuario && (
                                                                <div className="mt-4 space-y-3 border-t border-amber-200 pt-4">
                                                                    <p className="text-xs font-semibold text-amber-900">
                                                                        Tienes una revisión pendiente
                                                                    </p>

                                                                    <Input.TextArea
                                                                        value={
                                                                            comentarioRespuesta
                                                                        }
                                                                        rows={
                                                                            3
                                                                        }
                                                                        placeholder="Comentario de la revisión..."
                                                                        onChange={(
                                                                            event
                                                                        ) =>
                                                                            setComentarioRespuesta(
                                                                                event
                                                                                    .target
                                                                                    .value
                                                                            )
                                                                        }
                                                                    />

                                                                    <div className="flex flex-wrap justify-end gap-2 pt-2">
                                                                        <Button
                                                                            danger
                                                                            loading={
                                                                                processingEtapaId ===
                                                                                etapa.id
                                                                            }
                                                                            onClick={() =>
                                                                                void onResponderRevision(
                                                                                    etapa,
                                                                                    revisionPendienteUsuario,
                                                                                    false
                                                                                )
                                                                            }
                                                                        >
                                                                            Rechazar
                                                                        </Button>

                                                                        <Button
                                                                            type="primary"
                                                                            loading={
                                                                                processingEtapaId ===
                                                                                etapa.id
                                                                            }
                                                                            onClick={() =>
                                                                                void onResponderRevision(
                                                                                    etapa,
                                                                                    revisionPendienteUsuario,
                                                                                    true
                                                                                )
                                                                            }
                                                                        >
                                                                            Aprobar
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                    </div>
                                                )}

                                            {etapa?.estado ===
                                                "RECHAZADA" && (
                                                    <Alert
                                                        type="error"
                                                        showIcon
                                                        message="La revisión fue rechazada"
                                                        description={
                                                            etapa.aprobaciones?.find(
                                                                item =>
                                                                    item.estado ===
                                                                    "RECHAZADA"
                                                            )
                                                                ?.comentarioRespuesta ??
                                                            "Debes corregir la información y volver a solicitar revisión."
                                                        }
                                                    />
                                                )}

                                            {bitacoraId &&
                                                etapa && (
                                                    <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                                                        {/* ==========================================
                ETAPA EDITABLE
            ========================================== */}

                                                        {editable && (
                                                            <Button
                                                                loading={
                                                                    processingEtapaId ===
                                                                    etapa.id
                                                                }
                                                                onClick={() =>
                                                                    void onGuardarEtapa(
                                                                        etapa
                                                                    )
                                                                }
                                                            >
                                                                Guardar etapa
                                                            </Button>
                                                        )}

                                                        {/* ==========================================
                SOLICITAR REVISIÓN
            ========================================== */}

                                                        {editable &&
                                                            formEtapa
                                                                .requiereRevision && (
                                                                <Button
                                                                    type="primary"
                                                                    icon={
                                                                        <SafetyCertificateOutlined />
                                                                    }
                                                                    loading={
                                                                        processingEtapaId ===
                                                                        etapa.id
                                                                    }
                                                                    onClick={() =>
                                                                        void onSolicitarRevision(
                                                                            etapa
                                                                        )
                                                                    }
                                                                >
                                                                    Solicitar revisión
                                                                </Button>
                                                            )}

                                                        {/* ==========================================
                COMPLETAR SIN REVISIÓN
            ========================================== */}

                                                        {puedeEditar &&
                                                            etapa.estado ===
                                                            "EN_PROCESO" &&
                                                            !formEtapa
                                                                .requiereRevision && (
                                                                <Button
                                                                    type="primary"
                                                                    loading={
                                                                        processingEtapaId ===
                                                                        etapa.id
                                                                    }
                                                                    onClick={() =>
                                                                        void onCompletarEtapa(
                                                                            etapa
                                                                        )
                                                                    }
                                                                >
                                                                    Completar etapa
                                                                </Button>
                                                            )}

                                                        {/* ==========================================
                COMPLETAR DESPUÉS DE APROBACIÓN
            ========================================== */}

                                                        {puedeEditar &&
                                                            etapa.estado ===
                                                            "APROBADA" && (
                                                                <Button
                                                                    type="primary"
                                                                    icon={
                                                                        <CheckCircleOutlined />
                                                                    }
                                                                    loading={
                                                                        processingEtapaId ===
                                                                        etapa.id
                                                                    }
                                                                    onClick={() =>
                                                                        void onCompletarEtapa(
                                                                            etapa
                                                                        )
                                                                    }
                                                                >
                                                                    Completar etapa
                                                                </Button>
                                                            )}
                                                    </div>
                                                )}
                                        </div>
                                    )}
                                </section>
                            </div>
                        );
                    }
                )}
            </div>
        </div>
    );
}