// src/components/modals-bitacora/BitacoraEvidenciasTab.tsx

import {
    DeleteOutlined,
    PictureOutlined,
    PlayCircleOutlined,
    ReloadOutlined,
    UploadOutlined,
} from "@ant-design/icons";

import {
    Button,
    Empty,
    Image,
    Popconfirm,
    Spin,
    Tooltip,
} from "antd";

import type {
    BitacoraEvidencia,
    EtapaEvidenciaBitacora,
    EvidenciaPendiente,
} from "./bitacora.types";

import {
    formatBytes,
    formatFechaHoraChile,
} from "./bitacora.helpers";

type Props = {
    evidencias:
    BitacoraEvidencia[];

    pendientes?:
    EvidenciaPendiente[];

    loading:
    boolean;

    editable?:
    boolean;

    /*
     * IDs de evidencias existentes que serán
     * eliminadas recién cuando se guarde el formulario.
     */
    eliminadasIds?:
    number[];

    /*
     * Permite que Crear muestre solamente ANTES
     * y Editar muestre todas las etapas.
     */
    etapasVisibles?:
    EtapaEvidenciaBitacora[];

    onAgregar?:
    (
        etapa:
            EtapaEvidenciaBitacora
    ) => void;

    onMarcarEliminar?:
    (
        evidencia:
            BitacoraEvidencia
    ) => void;

    onRestaurar?:
    (
        evidenciaId:
            number
    ) => void;

    onEliminarPendiente?:
    (
        idTemporal:
            string
    ) => void;
};

const ETAPAS:
    Array<{
        value:
        EtapaEvidenciaBitacora;

        label:
        string;

        descripcion:
        string;
    }> = [
        {
            value:
                "ANTES",

            label:
                "Antes",

            descripcion:
                "Estado previo a realizar la intervención.",
        },

        {
            value:
                "EN_PROCESO",

            label:
                "En proceso",

            descripcion:
                "Registro visual mientras se realiza el trabajo.",
        },

        {
            value:
                "DESPUES",

            label:
                "Después",

            descripcion:
                "Resultado final después de la intervención.",
        },
    ];

export default function BitacoraEvidenciasTab({
    evidencias,
    pendientes = [],
    loading,
    editable = false,
    eliminadasIds = [],
    etapasVisibles = [
        "ANTES",
        "EN_PROCESO",
        "DESPUES",
    ],
    onAgregar,
    onMarcarEliminar,
    onRestaurar,
    onEliminarPendiente,
}: Props) {
    if (loading) {
        return (
            <div className="flex min-h-52 items-center justify-center">
                <Spin />
            </div>
        );
    }

    const etapas =
        ETAPAS.filter(
            (
                etapa
            ) =>
                etapasVisibles.includes(
                    etapa.value
                )
        );

    return (
        <div className="space-y-5">
            {etapas.map(
                (
                    etapa
                ) => {
                    const existentes =
                        evidencias.filter(
                            (
                                evidencia
                            ) =>
                                evidencia.etapa ===
                                etapa.value
                        );

                    const nuevas =
                        pendientes.filter(
                            (
                                evidencia
                            ) =>
                                evidencia.etapa ===
                                etapa.value
                        );

                    const total =
                        existentes.filter(
                            (
                                evidencia
                            ) =>
                                !eliminadasIds.includes(
                                    evidencia.id
                                )
                        ).length +
                        nuevas.length;

                    return (
                        <section
                            key={
                                etapa.value
                            }
                            className="rounded-2xl border border-slate-200 bg-white p-4"
                        >
                            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-slate-900">
                                            {
                                                etapa.label
                                            }
                                        </h3>

                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                            {
                                                total
                                            }
                                        </span>
                                    </div>

                                    <p className="mt-1 text-xs text-slate-500">
                                        {
                                            etapa.descripcion
                                        }
                                    </p>
                                </div>

                                {editable &&
                                    onAgregar && (
                                        <Button
                                            type="primary"
                                            icon={
                                                <UploadOutlined />
                                            }
                                            onClick={() =>
                                                onAgregar(
                                                    etapa.value
                                                )
                                            }
                                        >
                                            Agregar evidencia
                                        </Button>
                                    )}
                            </div>

                            {existentes.length ===
                                0 &&
                                nuevas.length ===
                                0 ? (
                                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 py-4">
                                    <Empty
                                        image={
                                            Empty.PRESENTED_IMAGE_SIMPLE
                                        }
                                        imageStyle={{
                                            height: 36,
                                        }}
                                        description={
                                            <span className="text-xs text-slate-500">
                                                Sin evidencias
                                            </span>
                                        }
                                    />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                                    {/* =========================
                                        EXISTENTES
                                    ========================= */}

                                    {existentes.map(
                                        (
                                            evidencia
                                        ) => {
                                            const marcadaEliminar =
                                                eliminadasIds.includes(
                                                    evidencia.id
                                                );

                                            return (
                                                <article
                                                    key={`existente-${evidencia.id}`}
                                                    className={[
                                                        "overflow-hidden rounded-2xl border bg-white shadow-sm transition",

                                                        marcadaEliminar
                                                            ? "border-red-200 opacity-60"
                                                            : "border-slate-200",
                                                    ].join(
                                                        " "
                                                    )}
                                                >
                                                    <div className="relative aspect-video overflow-hidden bg-slate-950">
                                                        {evidencia.tipo ===
                                                            "IMAGEN" ? (
                                                            <Image
                                                                src={
                                                                    evidencia.url ??
                                                                    undefined
                                                                }
                                                                alt={
                                                                    evidencia.nombre
                                                                }
                                                                width="100%"
                                                                height="100%"
                                                                className="h-full w-full object-cover"
                                                                preview={
                                                                    !marcadaEliminar
                                                                }
                                                            />
                                                        ) : (
                                                            <video
                                                                src={
                                                                    evidencia.url ??
                                                                    undefined
                                                                }
                                                                controls={
                                                                    !marcadaEliminar
                                                                }
                                                                preload="metadata"
                                                                className="h-full w-full object-contain"
                                                            />
                                                        )}

                                                        {marcadaEliminar && (
                                                            <div className="absolute inset-0 flex items-center justify-center bg-red-950/50">
                                                                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-red-700">
                                                                    Se eliminará al guardar
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="space-y-3 p-3">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-700">
                                                                    {evidencia.tipo ===
                                                                        "IMAGEN" ? (
                                                                        <PictureOutlined />
                                                                    ) : (
                                                                        <PlayCircleOutlined />
                                                                    )}

                                                                    {
                                                                        evidencia.tipo
                                                                    }
                                                                </div>

                                                                <p
                                                                    title={
                                                                        evidencia.nombre
                                                                    }
                                                                    className="mt-1 truncate text-sm font-semibold text-slate-900"
                                                                >
                                                                    {
                                                                        evidencia.nombre
                                                                    }
                                                                </p>
                                                            </div>

                                                            {editable && (
                                                                <>
                                                                    {marcadaEliminar ? (
                                                                        <Tooltip title="Restaurar evidencia">
                                                                            <Button
                                                                                type="text"
                                                                                icon={
                                                                                    <ReloadOutlined />
                                                                                }
                                                                                onClick={() =>
                                                                                    onRestaurar?.(
                                                                                        evidencia.id
                                                                                    )
                                                                                }
                                                                            />
                                                                        </Tooltip>
                                                                    ) : (
                                                                        <Popconfirm
                                                                            title="Eliminar evidencia"
                                                                            description="La evidencia se eliminará cuando guardes los cambios."
                                                                            okText="Marcar para eliminar"
                                                                            cancelText="Cancelar"
                                                                            okButtonProps={{
                                                                                danger:
                                                                                    true,
                                                                            }}
                                                                            onConfirm={() =>
                                                                                onMarcarEliminar?.(
                                                                                    evidencia
                                                                                )
                                                                            }
                                                                        >
                                                                            <Tooltip title="Eliminar">
                                                                                <Button
                                                                                    danger
                                                                                    type="text"
                                                                                    icon={
                                                                                        <DeleteOutlined />
                                                                                    }
                                                                                />
                                                                            </Tooltip>
                                                                        </Popconfirm>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>

                                                        {evidencia.descripcion && (
                                                            <p className="text-sm leading-5 text-slate-600">
                                                                {
                                                                    evidencia.descripcion
                                                                }
                                                            </p>
                                                        )}

                                                        <div className="border-t border-slate-100 pt-2 text-xs leading-5 text-slate-500">
                                                            <p>
                                                                {formatBytes(
                                                                    evidencia.bytes
                                                                )}
                                                            </p>

                                                            <p>
                                                                Subido por{" "}
                                                                <span className="font-medium text-slate-700">
                                                                    {evidencia
                                                                        .subidoPor
                                                                        ?.nombre ??
                                                                        "-"}
                                                                </span>
                                                            </p>

                                                            <p>
                                                                {formatFechaHoraChile(
                                                                    evidencia.createdAt
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </article>
                                            );
                                        }
                                    )}

                                    {/* =========================
                                        PENDIENTES
                                    ========================= */}

                                    {nuevas.map(
                                        (
                                            evidencia
                                        ) => {
                                            const esImagen =
                                                evidencia.archivo.type.startsWith(
                                                    "image/"
                                                );

                                            return (
                                                <article
                                                    key={
                                                        evidencia.idTemporal
                                                    }
                                                    className="overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-sm"
                                                >
                                                    <div className="relative aspect-video overflow-hidden bg-slate-950">
                                                        {esImagen ? (
                                                            <Image
                                                                src={
                                                                    evidencia.previewUrl
                                                                }
                                                                alt={
                                                                    evidencia.archivo.name
                                                                }
                                                                width="100%"
                                                                height="100%"
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <video
                                                                src={
                                                                    evidencia.previewUrl
                                                                }
                                                                controls
                                                                preload="metadata"
                                                                className="h-full w-full object-contain"
                                                            />
                                                        )}

                                                        <div className="absolute left-2 top-2">
                                                            <span className="rounded-full border border-cyan-200 bg-white/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-cyan-700">
                                                                Pendiente de guardar
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3 p-3">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-700">
                                                                    {esImagen ? (
                                                                        <PictureOutlined />
                                                                    ) : (
                                                                        <PlayCircleOutlined />
                                                                    )}

                                                                    {esImagen
                                                                        ? "IMAGEN"
                                                                        : "VIDEO"}
                                                                </div>

                                                                <p
                                                                    title={
                                                                        evidencia.archivo.name
                                                                    }
                                                                    className="mt-1 truncate text-sm font-semibold text-slate-900"
                                                                >
                                                                    {
                                                                        evidencia.archivo.name
                                                                    }
                                                                </p>
                                                            </div>

                                                            {editable && (
                                                                <Tooltip title="Quitar del formulario">
                                                                    <Button
                                                                        danger
                                                                        type="text"
                                                                        icon={
                                                                            <DeleteOutlined />
                                                                        }
                                                                        onClick={() =>
                                                                            onEliminarPendiente?.(
                                                                                evidencia.idTemporal
                                                                            )
                                                                        }
                                                                    />
                                                                </Tooltip>
                                                            )}
                                                        </div>

                                                        {evidencia.descripcion && (
                                                            <p className="text-sm leading-5 text-slate-600">
                                                                {
                                                                    evidencia.descripcion
                                                                }
                                                            </p>
                                                        )}

                                                        <div className="border-t border-slate-100 pt-2 text-xs text-slate-500">
                                                            {formatBytes(
                                                                evidencia.archivo.size
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
                    );
                }
            )}
        </div>
    );
}