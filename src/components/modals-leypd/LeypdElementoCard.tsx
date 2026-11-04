// src/components/modals-leypd/LeypdElementoCard.tsx

import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    DownOutlined,
    EditOutlined,
    ExclamationCircleOutlined,
    ExportOutlined,
    FileOutlined,
    FolderOpenOutlined,
    FolderOutlined,
    LinkOutlined,
    SaveOutlined,
    UpOutlined,
} from "@ant-design/icons";

import {
    Button,
    Card,
    Divider,
    Input,
    Select,
    Space,
    Tag,
    Tooltip,
    message,
} from "antd";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    updateLeypdElemento,
} from "./leypd.api";

import {
    getLeypdEstadoColor,
    isLeypdElementoVencido,
    LEYPD_ESTADO_LABELS,
} from "./leypd.helpers";

import type {
    ActualizarElementoLeypdPayload,
    ElementoSharepointLeypd,
    EstadoLeypd,
    LeypdElemento,
} from "./leypd.types";

import LeypdConsentimientosPanel from "./LeypdConsentimientosPanel";

interface Props {
    empresaId: number;
    elemento: LeypdElemento;

    empresaNombre?: string;

    /**
     * Estado de la carpeta del elemento en SharePoint.
     * null = sin vincular o sin sincronizar.
     */
    sharepoint?:
    ElementoSharepointLeypd | null;


    onSaved?: () =>
        void | Promise<void>;
}

type DraftElemento = {
    estado: EstadoLeypd;
    responsable: string;
    fechaCompromiso: string;
    evidencia: string;
    observaciones: string;
};

function elementoToDraft(
    elemento: LeypdElemento
): DraftElemento {
    return {
        estado:
            elemento.estado,

        responsable:
            elemento.responsable ??
            "",

        fechaCompromiso:
            elemento.fechaCompromiso
                ? elemento.fechaCompromiso.slice(
                    0,
                    10
                )
                : "",

        evidencia:
            elemento.evidencia ??
            "",

        observaciones:
            elemento.observaciones ??
            "",
    };
}

export default function LeypdElementoCard({
    empresaId,
    elemento,
    empresaNombre,
    sharepoint = null,
    onSaved,
}: Props) {
    const [
        mostrarDocumentos,
        setMostrarDocumentos,
    ] =
        useState(false);

    const [
        editing,
        setEditing,
    ] =
        useState(false);

    const [
        saving,
        setSaving,
    ] =
        useState(false);

    const [
        draft,
        setDraft,
    ] =
        useState<DraftElemento>(
            () =>
                elementoToDraft(
                    elemento
                )
        );

    useEffect(
        () => {
            if (
                !editing
            ) {
                setDraft(
                    elementoToDraft(
                        elemento
                    )
                );
            }
        },
        [
            elemento,
            editing,
        ]
    );

    const vencido =
        useMemo(
            () =>
                isLeypdElementoVencido(
                    elemento
                ),
            [
                elemento,
            ]
        );

    const handleCancel =
        () => {
            setDraft(
                elementoToDraft(
                    elemento
                )
            );

            setEditing(
                false
            );
        };

    const handleSave =
        async () => {
            const payload:
                ActualizarElementoLeypdPayload =
            {
                estado:
                    draft.estado,

                responsable:
                    draft.responsable.trim() ||
                    null,

                fechaCompromiso:
                    draft.fechaCompromiso ||
                    null,

                evidencia:
                    draft.evidencia.trim() ||
                    null,

                observaciones:
                    draft.observaciones.trim() ||
                    null,
            };

            setSaving(
                true
            );

            try {
                await updateLeypdElemento(
                    empresaId,
                    elemento.numero,
                    payload
                );

                message.success(
                    `Elemento ${elemento.codigo} actualizado correctamente.`
                );

                setEditing(
                    false
                );

                await onSaved?.();
            } catch (
            error
            ) {
                console.error(
                    "[LEYPD] Error actualizando elemento:",
                    error
                );

                message.error(
                    "No se pudo actualizar el elemento."
                );
            } finally {
                setSaving(
                    false
                );
            }
        };

    return (
        <Card
            className="
                rounded-2xl
                border
                border-slate-200
                shadow-sm
            "
            styles={{
                body: {
                    padding:
                        18,
                },
            }}
        >
            {/* =====================================================
                HEADER
            ===================================================== */}

            <div
                className="
                    flex
                    flex-col
                    gap-3
                    lg:flex-row
                    lg:items-start
                    lg:justify-between
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
                        <span
                            className="
                                inline-flex
                                h-7
                                min-w-7
                                items-center
                                justify-center
                                rounded-lg
                                bg-slate-100
                                px-2
                                text-xs
                                font-bold
                                text-slate-600
                            "
                        >
                            {
                                elemento.codigo
                            }
                        </span>

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
                                elemento.titulo
                            }
                        </h3>

                        <Tag
                            color={
                                getLeypdEstadoColor(
                                    elemento.estado
                                )
                            }
                        >
                            {
                                LEYPD_ESTADO_LABELS[
                                elemento
                                    .estado
                                ]
                            }
                        </Tag>

                        {vencido && (
                            <Tooltip title="La fecha de compromiso se encuentra vencida">
                                <Tag
                                    color="red"
                                    icon={
                                        <ExclamationCircleOutlined />
                                    }
                                >
                                    Vencido
                                </Tag>
                            </Tooltip>
                        )}

                        {elemento.aplicabilidad ===
                            "CONDICIONAL" && (
                                <Tag>
                                    Condicional
                                </Tag>
                            )}
                    </div>

                    <p
                        className="
                            mb-0
                            mt-2
                            max-w-4xl
                            text-sm
                            leading-6
                            text-slate-500
                        "
                    >
                        {
                            elemento.descripcion
                        }
                    </p>
                </div>

                {!editing && (
                    <Button
                        icon={
                            <EditOutlined />
                        }
                        onClick={() =>
                            setEditing(
                                true
                            )
                        }
                    >
                        Editar
                    </Button>
                )}
            </div>

            {/* =====================================================
                RESUMEN
            ===================================================== */}

            {!editing && (
                <>
                    <Divider
                        className="my-4"
                    />

                    <div
                        className="
                            grid
                            grid-cols-1
                            gap-3
                            sm:grid-cols-2
                            xl:grid-cols-4
                        "
                    >
                        <div>
                            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                Responsable
                            </div>

                            <div className="mt-1 text-sm text-slate-700">
                                {elemento.responsable ??
                                    "—"}
                            </div>
                        </div>

                        <div>
                            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                Fecha compromiso
                            </div>

                            <div className="mt-1 flex items-center gap-2 text-sm text-slate-700">
                                <ClockCircleOutlined />

                                {elemento.fechaCompromiso
                                    ? new Date(
                                        elemento.fechaCompromiso
                                    ).toLocaleDateString(
                                        "es-CL"
                                    )
                                    : "—"}
                            </div>
                        </div>

                        <div>
                            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                Evidencia
                            </div>

                            <div className="mt-1 text-sm text-slate-700">
                                {elemento.evidencia ??
                                    "—"}
                            </div>
                        </div>

                        <div>
                            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                Carpeta
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-700">
                                <FolderOpenOutlined />

                                {sharepoint?.existe &&
                                    sharepoint.webUrl ? (
                                    <a
                                        href={sharepoint.webUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {elemento.carpeta}{" "}
                                        <ExportOutlined />
                                    </a>
                                ) : (
                                    elemento.carpeta
                                )}

                                {sharepoint &&
                                    !sharepoint.existe && (
                                        <Tag color="red">
                                            No encontrada
                                        </Tag>
                                    )}
                            </div>
                        </div>
                    </div>

                    {/* =================================================
                        DOCUMENTOS SHAREPOINT
                    ================================================= */}

                    {sharepoint?.existe && (
                        <div
                            className="
                                leypd-sharepoint-docs
                                mt-4
                                rounded-xl
                                border
                                border-slate-200
                                p-3
                            "
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                        Documentos en SharePoint
                                    </span>

                                    <Tag>
                                        {sharepoint.documentos.length}
                                    </Tag>

                                    {sharepoint.faltantes.length === 0 ? (
                                        <Tag color="green">
                                            Completo
                                        </Tag>
                                    ) : (
                                        <Tag color="orange">
                                            {sharepoint.faltantes.length} faltante
                                            {sharepoint.faltantes.length === 1 ? "" : "s"}
                                        </Tag>
                                    )}
                                </div>

                                <Button
                                    size="small"
                                    type="text"
                                    icon={
                                        mostrarDocumentos
                                            ? <UpOutlined />
                                            : <DownOutlined />
                                    }
                                    onClick={() =>
                                        setMostrarDocumentos(
                                            (actual) => !actual
                                        )
                                    }
                                >
                                    {mostrarDocumentos
                                        ? "Ocultar"
                                        : "Ver documentos"}
                                </Button>
                            </div>

                            {sharepoint.faltantes.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {sharepoint.faltantes.map(
                                        (nombre) => (
                                            <Tag
                                                key={nombre}
                                                color="orange"
                                            >
                                                Falta: {nombre}
                                            </Tag>
                                        )
                                    )}
                                </div>
                            )}

                            {mostrarDocumentos && (
                                <div className="mt-3 divide-y divide-slate-100">
                                    {sharepoint.documentos.length === 0 ? (
                                        <div className="py-2 text-xs text-slate-500">
                                            La carpeta está vacía.
                                        </div>
                                    ) : (
                                        sharepoint.documentos.map(
                                            (documento) => (
                                                <div
                                                    key={documento.webUrl}
                                                    className="flex items-center justify-between gap-3 py-1.5 text-sm"
                                                >
                                                    <a
                                                        href={documento.webUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="min-w-0 truncate"
                                                    >
                                                        {documento.esCarpeta
                                                            ? <FolderOutlined />
                                                            : <FileOutlined />}{" "}
                                                        {documento.nombre}
                                                    </a>

                                                    <span className="shrink-0 text-xs text-slate-400">
                                                        {documento.modificadoAt
                                                            ? new Date(
                                                                documento.modificadoAt
                                                            ).toLocaleDateString(
                                                                "es-CL"
                                                            )
                                                            : ""}
                                                    </span>
                                                </div>
                                            )
                                        )
                                    )}

                                    {sharepoint.opcionalesFaltantes.length > 0 && (
                                        <div className="pt-2 text-xs text-slate-400">
                                            Opcionales no encontrados:{" "}
                                            {sharepoint.opcionalesFaltantes.join(", ")}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {elemento.observaciones && (
                        <div
                            className="
                                mt-4
                                rounded-xl
                                bg-slate-50
                                p-3
                            "
                        >
                            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                                Observaciones
                            </div>

                            <p className="mb-0 mt-1 whitespace-pre-wrap text-sm text-slate-600">
                                {
                                    elemento.observaciones
                                }
                            </p>
                        </div>
                    )}

                    {elemento.estado ===
                        "IMPLEMENTADO" && (
                            <div
                                className="
                                mt-4
                                flex
                                items-center
                                gap-2
                                text-xs
                                font-medium
                                text-emerald-600
                            "
                            >
                                <CheckCircleOutlined />

                                Elemento implementado
                            </div>
                        )}

                    {/*
                     * Elemento 04: resumen y gestión de campañas
                     * de consentimiento (módulo Protección de Datos).
                     * No modifica el estado del elemento.
                     */}
                    {elemento.numero === 4 && (
                        <LeypdConsentimientosPanel
                            empresaId={empresaId}
                            {...(empresaNombre
                                ? {
                                    empresaNombre,
                                }
                                : {})}
                        />
                    )}
                </>
            )}

            {/* =====================================================
                EDICIÓN
            ===================================================== */}

            {editing && (
                <>
                    <Divider
                        className="my-4"
                    />

                    <div
                        className="
                            grid
                            grid-cols-1
                            gap-4
                            lg:grid-cols-2
                        "
                    >
                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                                Estado
                            </label>

                            <Select<EstadoLeypd>
                                value={
                                    draft.estado
                                }
                                className="w-full"
                                onChange={(
                                    value
                                ) =>
                                    setDraft(
                                        (
                                            current
                                        ) => ({
                                            ...current,
                                            estado:
                                                value,
                                        })
                                    )
                                }
                                options={[
                                    {
                                        value:
                                            "NO_INICIADO",
                                        label:
                                            "No iniciado",
                                    },
                                    {
                                        value:
                                            "EN_PROGRESO",
                                        label:
                                            "En progreso",
                                    },
                                    {
                                        value:
                                            "IMPLEMENTADO",
                                        label:
                                            "Implementado",
                                    },
                                    {
                                        value:
                                            "NO_APLICA",
                                        label:
                                            "No aplica",
                                    },
                                ]}
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                                Responsable
                            </label>

                            <Input
                                value={
                                    draft.responsable
                                }
                                maxLength={
                                    120
                                }
                                placeholder="Responsable del elemento"
                                onChange={(
                                    event
                                ) =>
                                    setDraft(
                                        (
                                            current
                                        ) => ({
                                            ...current,
                                            responsable:
                                                event
                                                    .target
                                                    .value,
                                        })
                                    )
                                }
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                                Fecha compromiso
                            </label>

                            <Input
                                type="date"
                                value={
                                    draft.fechaCompromiso
                                }
                                onChange={(
                                    event
                                ) =>
                                    setDraft(
                                        (
                                            current
                                        ) => ({
                                            ...current,
                                            fechaCompromiso:
                                                event
                                                    .target
                                                    .value,
                                        })
                                    )
                                }
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                                Evidencia
                            </label>

                            <Input
                                value={
                                    draft.evidencia
                                }
                                maxLength={
                                    1000
                                }
                                placeholder="Documento, enlace o referencia"
                                prefix={
                                    <LinkOutlined />
                                }
                                onChange={(
                                    event
                                ) =>
                                    setDraft(
                                        (
                                            current
                                        ) => ({
                                            ...current,
                                            evidencia:
                                                event
                                                    .target
                                                    .value,
                                        })
                                    )
                                }
                            />
                        </div>
                    </div>

                    <div className="mt-4">
                        <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                            Observaciones
                        </label>

                        <Input.TextArea
                            rows={
                                3
                            }
                            value={
                                draft.observaciones
                            }
                            maxLength={
                                2000
                            }
                            showCount
                            placeholder="Observaciones internas..."
                            onChange={(
                                event
                            ) =>
                                setDraft(
                                    (
                                        current
                                    ) => ({
                                        ...current,
                                        observaciones:
                                            event
                                                .target
                                                .value,
                                    })
                                )
                            }
                        />
                    </div>

                    <div
                        className="
                            mt-5
                            flex
                            justify-end
                        "
                    >
                        <Space>
                            <Button
                                disabled={
                                    saving
                                }
                                onClick={
                                    handleCancel
                                }
                            >
                                Cancelar
                            </Button>

                            <Button
                                type="primary"
                                icon={
                                    <SaveOutlined />
                                }
                                loading={
                                    saving
                                }
                                onClick={() =>
                                    void handleSave()
                                }
                            >
                                Guardar
                            </Button>
                        </Space>
                    </div>
                </>
            )}
        </Card>
    );
}