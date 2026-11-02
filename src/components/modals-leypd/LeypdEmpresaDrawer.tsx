// src/components/modals-leypd/LeypdEmpresaDrawer.tsx

import {
    FileTextOutlined,
    ReloadOutlined,
    SafetyCertificateOutlined,
} from "@ant-design/icons";

import {
    Alert,
    Button,
    Drawer,
    Progress,
    Skeleton,
    Tabs,
    Tag,
    message,
} from "antd";

import {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    getLeypdEmpresa,
} from "./leypd.api";

import LeypdElementosTab from "./LeypdElementosTab";
import LeypdFichaTab from "./LeypdFichaTab";

import type {
    LeypdEmpresaDetalle,
} from "./leypd.types";

interface Props {
    open: boolean;

    empresaId:
    number | null;

    empresaNombre?:
    string | null;

    onClose: () => void;

    onChanged?:
    () => void | Promise<void>;
}

export default function LeypdEmpresaDrawer({
    open,
    empresaId,
    empresaNombre,
    onClose,
    onChanged,
}: Props) {
    const [
        detalle,
        setDetalle,
    ] =
        useState<LeypdEmpresaDetalle | null>(
            null
        );

    const [
        loading,
        setLoading,
    ] =
        useState(
            false
        );

    const [
        error,
        setError,
    ] =
        useState<
            string | null
        >(
            null
        );

    const [
        activeTab,
        setActiveTab,
    ] =
        useState(
            "elementos"
        );

    /* =====================================================
       LOAD
    ===================================================== */

    const loadDetalle =
        useCallback(
            async () => {
                if (
                    !empresaId
                ) {
                    return;
                }

                setLoading(
                    true
                );

                setError(
                    null
                );

                try {
                    const result =
                        await getLeypdEmpresa(
                            empresaId
                        );

                    setDetalle(
                        result
                    );
                } catch (
                err
                ) {
                    console.error(
                        "[LEYPD] Error cargando detalle:",
                        err
                    );

                    setError(
                        "No se pudo cargar el detalle Ley PD de la empresa."
                    );

                    message.error(
                        "No se pudo cargar la empresa."
                    );
                } finally {
                    setLoading(
                        false
                    );
                }
            },
            [
                empresaId,
            ]
        );

    useEffect(
        () => {
            if (
                open &&
                empresaId
            ) {
                setActiveTab(
                    "elementos"
                );

                void loadDetalle();
            }

            if (
                !open
            ) {
                setDetalle(
                    null
                );

                setError(
                    null
                );
            }
        },
        [
            open,
            empresaId,
            loadDetalle,
        ]
    );

    /* =====================================================
       REFRESH AFTER CHANGE
    ===================================================== */

    const handleChanged =
        async () => {
            await loadDetalle();

            await onChanged?.();
        };

    /* =====================================================
       TITLE
    ===================================================== */

    const title =
        detalle?.empresa
            .nombre ??
        empresaNombre ??
        "Empresa";

    return (
        <Drawer
            open={
                open
            }
            onClose={
                onClose
            }
            width="min(1000px, 94vw)"
            destroyOnClose
            title={
                <div
                    className="
                        flex
                        min-w-0
                        items-center
                        gap-3
                    "
                >
                    <div
                        className="
                            flex
                            h-9
                            w-9
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            bg-cyan-50
                            text-cyan-700
                        "
                    >
                        <SafetyCertificateOutlined />
                    </div>

                    <div className="min-w-0">
                        <div className="truncate font-semibold">
                            {
                                title
                            }
                        </div>

                        <div className="text-xs font-normal text-slate-500">
                            Cumplimiento Ley PD
                        </div>
                    </div>
                </div>
            }
            extra={
                <Button
                    icon={
                        <ReloadOutlined />
                    }
                    loading={
                        loading
                    }
                    disabled={
                        !empresaId
                    }
                    onClick={() =>
                        void loadDetalle()
                    }
                >
                    Actualizar
                </Button>
            }
        >
            {loading &&
                !detalle ? (
                <Skeleton
                    active
                    paragraph={{
                        rows:
                            10,
                    }}
                />
            ) : error ? (
                <Alert
                    type="error"
                    showIcon
                    message="No se pudo cargar el detalle"
                    description={
                        error
                    }
                    action={
                        <Button
                            size="small"
                            danger
                            onClick={() =>
                                void loadDetalle()
                            }
                        >
                            Reintentar
                        </Button>
                    }
                />
            ) : detalle ? (
                <div className="space-y-4">
                    {/* =====================================================
                        CABECERA EMPRESA
                    ===================================================== */}

                    <div
                        className="
                            rounded-2xl
                            border
                            border-slate-200
                            bg-slate-50/70
                            p-4
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
                                <div className="text-base font-semibold text-slate-800">
                                    {
                                        detalle
                                            .empresa
                                            .nombre
                                    }
                                </div>

                                {detalle
                                    .empresa
                                    .razonSocial &&
                                    detalle
                                        .empresa
                                        .razonSocial !==
                                    detalle
                                        .empresa
                                        .nombre && (
                                        <div className="mt-1 text-xs text-slate-500">
                                            {
                                                detalle
                                                    .empresa
                                                    .razonSocial
                                            }
                                        </div>
                                    )}

                                <div className="mt-2 flex flex-wrap gap-2">
                                    {detalle
                                        .resumen
                                        .porcentaje ===
                                        100 ? (
                                        <Tag color="green">
                                            Cumplimiento completo
                                        </Tag>
                                    ) : detalle
                                        .resumen
                                        .sinIniciar ===
                                        detalle
                                            .resumen
                                            .total ? (
                                        <Tag>
                                            Sin iniciar
                                        </Tag>
                                    ) : (
                                        <Tag color="blue">
                                            En progreso
                                        </Tag>
                                    )}

                                    {detalle
                                        .resumen
                                        .vencidos >
                                        0 && (
                                            <Tag color="red">
                                                {
                                                    detalle
                                                        .resumen
                                                        .vencidos
                                                }{" "}
                                                vencido
                                                {detalle
                                                    .resumen
                                                    .vencidos ===
                                                    1
                                                    ? ""
                                                    : "s"}
                                            </Tag>
                                        )}
                                </div>
                            </div>

                            <div className="w-full lg:max-w-xs">
                                <div className="mb-1 flex justify-between text-xs text-slate-500">
                                    <span>
                                        Avance
                                    </span>

                                    <span>
                                        {
                                            detalle
                                                .resumen
                                                .completados
                                        }
                                        /
                                        {
                                            detalle
                                                .resumen
                                                .total
                                        }
                                    </span>
                                </div>

                                <Progress
                                    percent={
                                        detalle
                                            .resumen
                                            .porcentaje
                                    }
                                    status={
                                        detalle
                                            .resumen
                                            .porcentaje ===
                                            100
                                            ? "success"
                                            : "active"
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    {/* =====================================================
                        TABS
                    ===================================================== */}

                    <Tabs
                        activeKey={
                            activeTab
                        }
                        onChange={
                            setActiveTab
                        }
                        items={[
                            {
                                key:
                                    "elementos",

                                label: (
                                    <span>
                                        <SafetyCertificateOutlined />{" "}
                                        Elementos
                                    </span>
                                ),

                                children: (
                                    <LeypdElementosTab
                                        empresaId={
                                            detalle
                                                .empresa
                                                .id_empresa
                                        }
                                        detalle={
                                            detalle
                                        }
                                        onChanged={
                                            handleChanged
                                        }
                                    />
                                ),
                            },

                            {
                                key:
                                    "ficha",

                                label: (
                                    <span>
                                        <FileTextOutlined />{" "}
                                        Datos del cliente
                                    </span>
                                ),

                                children: (
                                    <LeypdFichaTab
                                        empresaId={
                                            detalle
                                                .empresa
                                                .id_empresa
                                        }
                                        onChanged={
                                            handleChanged
                                        }
                                    />
                                ),
                            },
                        ]}
                    />
                </div>
            ) : null}
        </Drawer>
    );
}