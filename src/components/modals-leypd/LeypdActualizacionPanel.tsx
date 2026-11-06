// src/components/modals-leypd/LeypdActualizacionPanel.tsx

import {
    CloudSyncOutlined,
    StopOutlined,
} from "@ant-design/icons";

import {
    Alert,
    Button,
    Modal,
    Progress,
    Space,
    Tag,
    message,
} from "antd";

import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";

import {
    cancelLeypdActualizacion,
    createLeypdActualizacion,
    getLeypdActualizacionUltima,
} from "./leypd.api";

import {
    formatLeypdDateTime,
    obtenerMensajeApiLeypd,
} from "./leypd.helpers";

import type {
    LeypdActualizacion,
} from "./leypd.types";

interface Props {
    /**
     * Solo ADMIN / ADMINISTRACION pueden lanzar o cancelar.
     */
    puedeGestionar: boolean;

    /**
     * Se llama una vez cuando un trabajo termina COMPLETADO.
     */
    onCompletado?:
    () => void | Promise<void>;

    /**
    * Cambia cuando se encola un trabajo desde otro lugar
    * (p. ej. el drawer de una empresa): recarga el panel.
    */
    version?: number;
}

const INTERVALO_MS = 5000;

/** Minutos en PENDIENTE para avisar que el worker no lo ha tomado. */
const MINUTOS_SIN_WORKER = 2;

function estaActiva(
    job: LeypdActualizacion | null
) {
    return (
        job?.estado === "PENDIENTE" ||
        job?.estado === "EJECUTANDO"
    );
}

export default function LeypdActualizacionPanel({
    puedeGestionar,
    onCompletado,
    version = 0,
}: Props) {
    const [
        modal,
        modalContextHolder,
    ] = Modal.useModal();

    const [
        job,
        setJob,
    ] = useState<LeypdActualizacion | null>(
        null
    );

    const [
        lanzando,
        setLanzando,
    ] = useState(false);

    const [
        cancelando,
        setCancelando,
    ] = useState(false);

    /*
     * Evita notificar dos veces el mismo trabajo completado
     * y no notifica uno que ya estaba completado al abrir la página.
     */
    const notificadoRef =
        useRef<number | null>(null);

    const vistoActivoRef =
        useRef<number | null>(null);

    const onCompletadoRef =
        useRef(onCompletado);

    onCompletadoRef.current =
        onCompletado;

    /* =====================================================
       CARGA Y POLLING
    ===================================================== */

    const cargar =
        useCallback(
            async () => {
                try {
                    const ultimo =
                        await getLeypdActualizacionUltima();

                    setJob(ultimo);

                    if (
                        ultimo &&
                        estaActiva(ultimo)
                    ) {
                        vistoActivoRef.current =
                            ultimo.id;
                    }

                    if (
                        ultimo?.estado === "COMPLETADO" &&
                        vistoActivoRef.current === ultimo.id &&
                        notificadoRef.current !== ultimo.id
                    ) {
                        notificadoRef.current =
                            ultimo.id;

                        message.success(
                            "Documentación actualizada."
                        );

                        await onCompletadoRef.current?.();
                    }
                } catch (err) {
                    console.error(
                        "[LEYPD] Error consultando actualización:",
                        err
                    );
                }
            },
            []
        );

    useEffect(
        () => {
            void cargar();
        },
        [cargar,
            version,
        ]
    );

    const activa =
        estaActiva(job);

    useEffect(
        () => {
            if (!activa) {
                return;
            }

            const timer =
                window.setInterval(
                    () => {
                        void cargar();
                    },
                    INTERVALO_MS
                );

            return () =>
                window.clearInterval(timer);
        },
        [
            activa,
            cargar,
        ]
    );

    /* =====================================================
       ACCIONES
    ===================================================== */

    const lanzar =
        () => {
            modal.confirm({
                title:
                    "Actualizar documentación Ley PD",

                content:
                    "Se regenerarán los documentos de todos los clientes y se subirán a SharePoint. Los documentos editados por el equipo no se reemplazan. El proceso puede tardar varios minutos.",

                okText:
                    "Actualizar",

                cancelText:
                    "Cancelar",

                onOk: async () => {
                    setLanzando(true);

                    try {
                        const creado =
                            await createLeypdActualizacion();

                        vistoActivoRef.current =
                            creado.id;

                        setJob(creado);

                        message.info(
                            "Actualización encolada."
                        );
                    } catch (err) {
                        message.error(
                            obtenerMensajeApiLeypd(
                                err,
                                "No se pudo iniciar la actualización."
                            )
                        );

                        await cargar();
                    } finally {
                        setLanzando(false);
                    }
                },
            });
        };

    const ejecutarCancelacion =
        async (
            id: number
        ) => {
            setCancelando(true);

            try {
                await cancelLeypdActualizacion(
                    id
                );

                message.info(
                    "Actualización cancelada."
                );
            } catch (err) {
                message.error(
                    obtenerMensajeApiLeypd(
                        err,
                        "No se pudo cancelar."
                    )
                );
            } finally {
                await cargar();

                setCancelando(false);
            }
        };

    const cancelar =
        () => {
            if (!job) {
                return;
            }

            if (job.estado !== "EJECUTANDO") {
                void ejecutarCancelacion(
                    job.id
                );

                return;
            }

            modal.confirm({
                title:
                    "Cancelar la actualización en curso",

                content:
                    "El worker terminará la empresa que está procesando y se detendrá. Lo ya subido a SharePoint se mantiene.",

                okText:
                    "Cancelar actualización",

                cancelText:
                    "Volver",

                onOk: () =>
                    ejecutarCancelacion(
                        job.id
                    ),
            });
        };

    const verDetalleError =
        () => {
            modal.error({
                title:
                    "Detalle de errores",

                width: 760,

                content: (
                    <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap text-xs">
                        {job?.error ??
                            "Sin detalle."}
                    </pre>
                ),
            });
        };

    /* =====================================================
       RENDER
    ===================================================== */

    const sinWorker =
        job?.estado === "PENDIENTE" &&
        Date.now() -
        new Date(job.createdAt).getTime() >
        MINUTOS_SIN_WORKER * 60 * 1000;

    return (
        <div
            className="
                leypd-actualizacion-panel
                rounded-2xl
                border
                border-slate-200
                bg-white
                p-4
            "
        >
            {modalContextHolder}

            <div
                className="
                    flex
                    flex-col
                    gap-3
                    lg:flex-row
                    lg:items-center
                    lg:justify-between
                "
            >
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
                        <CloudSyncOutlined />

                        Documentación automática

                        {job?.estado === "COMPLETADO" && (
                            job.error ? (
                                <Tag color="orange">
                                    Completada con errores
                                </Tag>
                            ) : (
                                <Tag color="green">
                                    Completada
                                </Tag>
                            )
                        )}

                        {job?.estado === "ERROR" && (
                            <Tag color="red">
                                Error
                            </Tag>
                        )}

                        {job?.estado === "CANCELADO" && (
                            <Tag>
                                Cancelada
                            </Tag>
                        )}

                        {job?.estado === "PENDIENTE" && (
                            <Tag color="gold">
                                En cola
                            </Tag>
                        )}

                        {job?.estado === "EJECUTANDO" && (
                            <Tag color="blue">
                                En ejecución
                            </Tag>
                        )}

                        {job && (
                            <Tag>
                                {job.empresa?.nombre ??
                                    "Todas las empresas"}
                            </Tag>
                        )}
                    </div>

                    {activa && job ? (
                        <div className="mt-2 max-w-xl">
                            <Progress
                                percent={job.progreso}
                                status="active"
                                size="small"
                            />

                            <div className="max-h-40 overflow-auto whitespace-pre-line text-xs text-slate-500">
                                {job.mensaje ??
                                    "Esperando al worker…"}
                            </div>
                        </div>
                    ) : (
                        <div className="mt-1 text-xs text-slate-500">
                            <div>
                                {job
                                    ? `Última: ${formatLeypdDateTime(
                                        job.terminadoAt ?? job.createdAt
                                    )}${job.iniciadoPor
                                        ? ` · ${job.iniciadoPor.nombre}`
                                        : ""
                                    }`
                                    : "Aún no se ha ejecutado desde el CRM."}
                            </div>

                            {job?.mensaje && (
                                <div className="mt-1 max-h-40 overflow-auto whitespace-pre-line">
                                    {job.mensaje}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <Space wrap>
                    {job?.error && !activa && (
                        <Button
                            danger
                            onClick={verDetalleError}
                        >
                            Ver detalle
                        </Button>
                    )}

                    {puedeGestionar &&
                        activa && (
                            <Button
                                icon={<StopOutlined />}
                                loading={cancelando}
                                onClick={cancelar}
                            >
                                Cancelar
                            </Button>
                        )}

                    {puedeGestionar && (
                        <Button
                            type="primary"
                            icon={<CloudSyncOutlined />}
                            loading={lanzando}
                            disabled={activa}
                            onClick={lanzar}
                        >
                            Actualizar documentación
                        </Button>
                    )}
                </Space>
            </div>

            {sinWorker && (
                <Alert
                    className="mt-3"
                    type="warning"
                    showIcon
                    message="El worker aún no toma la actualización"
                    description="Revisa que el servicio rids-leypd-worker esté activo en Railway. Puedes cancelarla y lanzarla de nuevo más tarde."
                />
            )}
        </div>
    );
}