// src/components/modals-leypd/LeypdSharepointPanel.tsx

import {
    CloudOutlined,
    ExportOutlined,
    FileExcelOutlined,
    LinkOutlined,
    SyncOutlined,
} from "@ant-design/icons";

import {
    Alert,
    Button,
    Skeleton,
    Space,
    Tag,
    message,
} from "antd";

import {
    useState,
} from "react";

import {
    sincronizarLeypdSharepoint,
} from "./leypd.api";

import {
    formatLeypdDateTime,
    obtenerMensajeApiLeypd,
} from "./leypd.helpers";

import type {
    LeypdSharepointResponse,
} from "./leypd.types";

import LeypdVincularSharepointModal from "./LeypdVincularSharepointModal";

interface Props {
    empresaId: number;

    empresaNombre?: string;

    data:
    LeypdSharepointResponse | null;

    loading: boolean;

    error: boolean;

    onUpdated:
    (data: LeypdSharepointResponse) => void;

    onReload:
    () => void | Promise<void>;
}

export default function LeypdSharepointPanel({
    empresaId,
    empresaNombre,
    data,
    loading,
    error,
    onUpdated,
    onReload,
}: Props) {
    const [
        sincronizando,
        setSincronizando,
    ] = useState(false);

    const [
        modalOpen,
        setModalOpen,
    ] = useState(false);

    /* =====================================================
       ACCIONES
    ===================================================== */

    const handleSincronizar =
        async () => {
            setSincronizando(true);

            try {
                const result =
                    await sincronizarLeypdSharepoint(
                        empresaId
                    );

                onUpdated(result);

                message.success(
                    "Carpeta sincronizada correctamente."
                );
            } catch (err) {
                console.error(
                    "[LEYPD] Error sincronizando SharePoint:",
                    err
                );

                message.error(
                    obtenerMensajeApiLeypd(
                        err,
                        "No se pudo sincronizar con SharePoint."
                    )
                );

                /*
                 * Recargamos para mostrar ultimoError.
                 */
                await onReload();
            } finally {
                setSincronizando(false);
            }
        };

    /* =====================================================
       RESUMEN
    ===================================================== */

    const sincronizado =
        Boolean(
            data?.sincronizadoAt
        );

    const carpetasFaltantes =
        sincronizado
            ? (data?.elementos ?? []).filter(
                (e) => !e.existe
            ).length
            : 0;

    const documentosFaltantes =
        sincronizado
            ? (data?.elementos ?? []).reduce(
                (total, e) =>
                    total +
                    e.faltantes.length,
                0
            )
            : 0;

    const modalVincular = (
        <LeypdVincularSharepointModal
            open={modalOpen}
            empresaId={empresaId}
            empresaNombre={empresaNombre ?? null}
            reemplazar={Boolean(data?.vinculado)}
            onClose={() =>
                setModalOpen(false)
            }
            onVinculado={onUpdated}
        />
    );

    /* =====================================================
       RENDER
    ===================================================== */

    if (
        loading &&
        !data
    ) {
        return (
            <div className="leypd-sharepoint-panel rounded-2xl border border-slate-200 p-4">
                <Skeleton
                    active
                    paragraph={{ rows: 1 }}
                />
            </div>
        );
    }

    if (error) {
        return (
            <Alert
                type="warning"
                showIcon
                message="No se pudo consultar la información de SharePoint"
                description="Los elementos y la ficha siguen disponibles."
                action={
                    <Button
                        size="small"
                        onClick={() =>
                            void onReload()
                        }
                    >
                        Reintentar
                    </Button>
                }
            />
        );
    }

    if (
        !data ||
        !data.vinculado
    ) {
        return (
            <>
                {modalVincular}

                <Alert
                    type="info"
                    showIcon
                    icon={<CloudOutlined />}
                    message="Carpeta SharePoint no vinculada"
                    description="Vincula la carpeta LEYPD del cliente para ver sus documentos desde cada elemento."
                    action={
                        <Button
                            type="primary"
                            size="small"
                            icon={<LinkOutlined />}
                            onClick={() =>
                                setModalOpen(true)
                            }
                        >
                            Vincular carpeta
                        </Button>
                    }
                />
            </>
        );
    }

    return (
        <div
            className="
                leypd-sharepoint-panel
                rounded-2xl
                border
                border-slate-200
                p-4
            "
        >
            {modalVincular}

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
                <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
                        <CloudOutlined />

                        SharePoint

                        {sincronizado &&
                            carpetasFaltantes === 0 &&
                            documentosFaltantes === 0 && (
                                <Tag color="green">
                                    Completo
                                </Tag>
                            )}

                        {carpetasFaltantes > 0 && (
                            <Tag color="red">
                                {carpetasFaltantes} carpeta
                                {carpetasFaltantes === 1 ? "" : "s"} no encontrada
                                {carpetasFaltantes === 1 ? "" : "s"}
                            </Tag>
                        )}

                        {documentosFaltantes > 0 && (
                            <Tag color="orange">
                                {documentosFaltantes} documento
                                {documentosFaltantes === 1 ? "" : "s"} faltante
                                {documentosFaltantes === 1 ? "" : "s"}
                            </Tag>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                        {data.carpeta && (
                            <a
                                href={data.carpeta.webUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <ExportOutlined /> Abrir carpeta LEYPD
                            </a>
                        )}

                        {data.checklist ? (
                            <a
                                href={data.checklist.webUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <FileExcelOutlined />{" "}
                                {data.checklist.nombre ?? "Checklist"}
                            </a>
                        ) : sincronizado ? (
                            <span className="text-amber-600">
                                Checklist no encontrado
                            </span>
                        ) : null}

                        <span className="text-slate-500">
                            Sincronizado:{" "}
                            {formatLeypdDateTime(
                                data.sincronizadoAt
                            )}
                        </span>
                    </div>
                </div>

                <Space wrap>
                    <Button
                        icon={<SyncOutlined />}
                        loading={sincronizando}
                        onClick={() =>
                            void handleSincronizar()
                        }
                    >
                        Sincronizar
                    </Button>

                    <Button
                        icon={<LinkOutlined />}
                        onClick={() =>
                            setModalOpen(true)
                        }
                    >
                        Cambiar carpeta
                    </Button>
                </Space>
            </div>

            {data.ultimoError && (
                <Alert
                    className="mt-3"
                    type="warning"
                    showIcon
                    message="El último intento de sincronización falló"
                    description={data.ultimoError}
                />
            )}
        </div>
    );
}