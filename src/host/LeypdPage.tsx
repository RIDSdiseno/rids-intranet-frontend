// src/host/LeypdPage.tsx

import {
    ReloadOutlined,
    SafetyCertificateOutlined,
} from "@ant-design/icons";

import {
    Alert,
    Button,
    message,
    Space,
    Typography,
} from "antd";

import {
    useCallback,
    useEffect,
    useState,
} from "react";

import LeypdStats from "../components/modals-leypd/LeypdStats";

import LeypdEmpresaTable from "../components/modals-leypd/LeypdEmpresaTable";

import LeypdEmpresaDrawer from "../components/modals-leypd/LeypdEmpresaDrawer";

import {
    getLeypd,
} from "../components/modals-leypd/leypd.api";

import type {
    LeypdEmpresaListado,
    LeypdListadoResponse,
} from "../components/modals-leypd/leypd.types";

const {
    Title,
    Text,
} =
    Typography;

export default function LeypdPage() {
    const [
        data,
        setData,
    ] =
        useState<LeypdListadoResponse | null>(
            null
        );

    const [
        loading,
        setLoading,
    ] =
        useState(
            true
        );

    const [
        refreshing,
        setRefreshing,
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
        selectedEmpresa,
        setSelectedEmpresa,
    ] =
        useState<LeypdEmpresaListado | null>(
            null
        );

    /* =====================================================
       CARGAR DASHBOARD
    ===================================================== */

    const loadData =
        useCallback(
            async (
                silent =
                    false
            ) => {
                if (
                    silent
                ) {
                    setRefreshing(
                        true
                    );
                } else {
                    setLoading(
                        true
                    );
                }

                setError(
                    null
                );

                try {
                    const result =
                        await getLeypd();

                    setData(
                        result
                    );
                } catch (
                err
                ) {
                    console.error(
                        "[LEYPD FRONT] Error cargando dashboard:",
                        err
                    );

                    setError(
                        "No se pudo cargar la información del módulo Ley PD."
                    );

                    if (
                        silent
                    ) {
                        message.error(
                            "No se pudo actualizar la información."
                        );
                    }
                } finally {
                    setLoading(
                        false
                    );

                    setRefreshing(
                        false
                    );
                }
            },
            []
        );

    useEffect(
        () => {
            void loadData();
        },
        [
            loadData,
        ]
    );

    /* =====================================================
       EMPRESA
    ===================================================== */

    const handleOpenEmpresa =
        (
            empresa:
                LeypdEmpresaListado
        ) => {
            setSelectedEmpresa(
                empresa
            );
        };

    const handleCloseEmpresa =
        () => {
            setSelectedEmpresa(
                null
            );
        };

    const handleEmpresaChanged =
        async () => {
            await loadData(
                true
            );
        };

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <>
            <div
                className="
                    mx-auto
                    w-full
                    max-w-[1600px]
                    space-y-5
                    px-3
                    py-4
                    sm:px-4
                    md:px-6
                    lg:px-8
                "
            >
                {/* =====================================================
                    HEADER
                ===================================================== */}

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
                        <Space
                            align="center"
                            size={
                                10
                            }
                        >
                            <div
                                className="
                                    flex
                                    h-10
                                    w-10
                                    items-center
                                    justify-center
                                    rounded-xl
                                    bg-slate-100
                                    text-lg
                                "
                            >
                                <SafetyCertificateOutlined />
                            </div>

                            <div>
                                <Title
                                    level={
                                        3
                                    }
                                    style={{
                                        margin:
                                            0,
                                    }}
                                >
                                    Ley PD por cliente
                                </Title>

                                <Text
                                    type="secondary"
                                >
                                    Seguimiento de cumplimiento, ficha del cliente y documentación asociada.
                                </Text>
                            </div>
                        </Space>
                    </div>

                    <Button
                        icon={
                            <ReloadOutlined />
                        }
                        loading={
                            refreshing
                        }
                        onClick={() =>
                            void loadData(
                                true
                            )
                        }
                    >
                        Actualizar
                    </Button>
                </div>

                {/* =====================================================
                    ERROR
                ===================================================== */}

                {error && (
                    <Alert
                        type="error"
                        showIcon
                        message="No fue posible cargar Ley PD"
                        description={
                            error
                        }
                        action={
                            <Button
                                size="small"
                                danger
                                onClick={() =>
                                    void loadData()
                                }
                            >
                                Reintentar
                            </Button>
                        }
                    />
                )}

                {/* =====================================================
                    KPIS
                ===================================================== */}

                <LeypdStats
                    data={
                        data
                    }
                    loading={
                        loading
                    }
                />

                {/* =====================================================
                    TABLA
                ===================================================== */}

                <LeypdEmpresaTable
                    empresas={
                        data?.empresas ??
                        []
                    }
                    loading={
                        loading
                    }
                    onOpenEmpresa={
                        handleOpenEmpresa
                    }
                />
            </div>

            {/* =====================================================
                DRAWER EMPRESA
            ===================================================== */}

            <LeypdEmpresaDrawer
                open={
                    Boolean(
                        selectedEmpresa
                    )
                }
                empresaId={
                    selectedEmpresa
                        ?.empresaId ??
                    null
                }
                empresaNombre={
                    selectedEmpresa
                        ?.empresaNombre ??
                    null
                }
                onClose={
                    handleCloseEmpresa
                }
                onChanged={
                    handleEmpresaChanged
                }
            />
        </>
    );
}