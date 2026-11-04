// src/components/modals-leypd/LeypdConsentimientosPanel.tsx

import {
    PlusOutlined,
    ReloadOutlined,
    UnorderedListOutlined,
} from "@ant-design/icons";

import {
    Alert,
    Button,
    Dropdown,
    Empty,
    Spin,
    Table,
    Tag,
} from "antd";

import {
    MoreHorizontal,
} from "lucide-react";

import {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    getLeypdConsentimientos,
} from "./leypd.api";

import type {
    ResumenConsentimientosLeypd,
} from "./leypd.types";

import {
    listarCampaniasProteccionDatos,
} from "../modals-proteccion-datos/proteccion-datos.api";

import {
    getEstadoCampaniaColor,
    getEstadoCampaniaLabel,
} from "../modals-proteccion-datos/proteccion-datos.helpers";

import type {
    CampaniaProteccionDatos,
} from "../modals-proteccion-datos/proteccion-datos.types";

import {
    useAccionesCampaniaProteccionDatos,
} from "../modals-proteccion-datos/useAccionesCampaniaProteccionDatos";

interface Props {
    empresaId: number;

    empresaNombre?: string;
}

const ELEMENTO_CONSENTIMIENTO = 4;

export default function LeypdConsentimientosPanel({
    empresaId,
    empresaNombre,
}: Props) {
    const [
        resumen,
        setResumen,
    ] = useState<ResumenConsentimientosLeypd | null>(
        null
    );

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        errorResumen,
        setErrorResumen,
    ] = useState(false);

    const [
        campanias,
        setCampanias,
    ] = useState<CampaniaProteccionDatos[]>(
        []
    );

    const [
        loadingLista,
        setLoadingLista,
    ] = useState(false);

    const [
        mostrarLista,
        setMostrarLista,
    ] = useState(false);

    /* =====================================================
       CARGA
    ===================================================== */

    const cargarResumen =
        useCallback(
            async () => {
                setLoading(true);
                setErrorResumen(false);

                try {
                    setResumen(
                        await getLeypdConsentimientos(
                            empresaId
                        )
                    );
                } catch (error) {
                    console.error(
                        "[LEYPD] Error cargando consentimientos:",
                        error
                    );

                    setErrorResumen(true);
                } finally {
                    setLoading(false);
                }
            },
            [empresaId]
        );

    const cargarCampanias =
        useCallback(
            async () => {
                setLoadingLista(true);

                try {
                    const data =
                        await listarCampaniasProteccionDatos({
                            empresaId,
                            origen:
                                "LEYPD",
                            leypdElementoNumero:
                                ELEMENTO_CONSENTIMIENTO,
                            take:
                                100,
                        });

                    setCampanias(
                        data.items
                    );
                } catch (error) {
                    console.error(
                        "[LEYPD] Error cargando campañas:",
                        error
                    );
                } finally {
                    setLoadingLista(false);
                }
            },
            [empresaId]
        );

    const recargar =
        async () => {
            await cargarResumen();

            if (mostrarLista) {
                await cargarCampanias();
            }
        };

    const acciones =
        useAccionesCampaniaProteccionDatos({
            onChanged: () =>
                recargar(),

            contexto: {
                empresaId,
                origen:
                    "LEYPD",
                leypdElementoNumero:
                    ELEMENTO_CONSENTIMIENTO,
                ...(empresaNombre
                    ? {
                        empresaNombre,
                    }
                    : {}),
            },
        });

    useEffect(
        () => {
            void cargarResumen();
        },
        [cargarResumen]
    );

    const toggleLista =
        () => {
            const next =
                !mostrarLista;

            setMostrarLista(next);

            if (next) {
                void cargarCampanias();
            }
        };

    /* =====================================================
       RENDER
    ===================================================== */

    const totales =
        resumen?.totales;

    const stats = [
        {
            label: "Campañas",
            value: totales?.campanias ?? 0,
        },
        {
            label: "Activas",
            value: totales?.activas ?? 0,
        },
        {
            label: "Destinatarios",
            value: totales?.destinatarios ?? 0,
        },
        {
            label: "Respondidos",
            value: totales?.respondidos ?? 0,
        },
        {
            label: "Pendientes",
            value: totales?.pendientes ?? 0,
        },
    ];

    return (
        <div
            className="
                leypd-consent-panel
                mt-4
                rounded-xl
                border
                border-slate-200
                p-4
            "
        >
            {acciones.contextHolder}

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Consentimientos · Protección de Datos
                </div>

                <Button
                    size="small"
                    type="text"
                    icon={<ReloadOutlined />}
                    onClick={() =>
                        void recargar()
                    }
                >
                    Actualizar
                </Button>
            </div>

            {loading ? (
                <div className="flex min-h-[80px] items-center justify-center">
                    <Spin />
                </div>
            ) : errorResumen ? (
                <Alert
                    type="error"
                    showIcon
                    message="No se pudo cargar el resumen de consentimientos."
                />
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                        {stats.map(
                            (stat) => (
                                <div
                                    key={stat.label}
                                    className="
                                        leypd-consent-stat
                                        rounded-lg
                                        border
                                        border-slate-200
                                        bg-slate-50
                                        px-3
                                        py-2
                                    "
                                >
                                    <div className="text-[11px] text-slate-500">
                                        {stat.label}
                                    </div>

                                    <div className="text-lg font-semibold text-slate-800">
                                        {stat.value}
                                    </div>
                                </div>
                            )
                        )}
                    </div>

                    {totales &&
                        totales.respondidos > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                <Tag color="green">
                                    Aceptados: {totales.aceptados}
                                </Tag>

                                {totales.rechazados > 0 && (
                                    <Tag color="orange">
                                        Rechazados: {totales.rechazados}
                                    </Tag>
                                )}

                                {totales.revocados > 0 && (
                                    <Tag>
                                        Revocados: {totales.revocados}
                                    </Tag>
                                )}
                            </div>
                        )}

                    {totales &&
                        totales.erroresEnvio > 0 && (
                            <Tag
                                color="red"
                                className="mt-2"
                            >
                                Errores de envío: {totales.erroresEnvio}
                            </Tag>
                        )}
                </>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
                <Button
                    icon={<UnorderedListOutlined />}
                    onClick={toggleLista}
                >
                    {mostrarLista
                        ? "Ocultar campañas"
                        : "Ver campañas"}
                </Button>

                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={
                        acciones.abrirNueva
                    }
                >
                    Nueva campaña
                </Button>
            </div>

            {mostrarLista && (
                <div className="mt-3">
                    <Table<CampaniaProteccionDatos>
                        size="small"
                        rowKey="id"
                        loading={loadingLista}
                        dataSource={campanias}
                        pagination={false}
                        scroll={{ x: 640 }}
                        locale={{
                            emptyText: (
                                <Empty description="Aún no hay campañas Ley PD para esta empresa" />
                            ),
                        }}
                        columns={[
                            {
                                title: "Campaña",
                                key: "nombre",
                                render: (_, row) => (
                                    <div>
                                        <div className="font-medium text-slate-800">
                                            {row.nombre}
                                        </div>

                                        <div className="text-xs text-slate-500">
                                            Versión {row.versionDocumento}
                                        </div>
                                    </div>
                                ),
                            },
                            {
                                title: "Estado",
                                dataIndex: "estado",
                                key: "estado",
                                width: 120,
                                render: (value) => (
                                    <Tag
                                        color={getEstadoCampaniaColor(
                                            value
                                        )}
                                    >
                                        {getEstadoCampaniaLabel(
                                            value
                                        )}
                                    </Tag>
                                ),
                            },
                            {
                                title: "Destinatarios",
                                key: "destinatarios",
                                width: 110,
                                render: (_, row) =>
                                    row._count?.destinatarios ?? 0,
                            },
                            {
                                title: "Creada",
                                dataIndex: "createdAt",
                                key: "createdAt",
                                width: 120,
                                render: (value: string) =>
                                    new Date(
                                        value
                                    ).toLocaleDateString(
                                        "es-CL"
                                    ),
                            },
                            {
                                title: "",
                                key: "acciones",
                                width: 50,
                                render: (_, row) => (
                                    <Dropdown
                                        trigger={["click"]}
                                        menu={{
                                            items:
                                                acciones.menuCampania(
                                                    row
                                                ),

                                            onClick: ({
                                                key,
                                            }) =>
                                                acciones.handleMenuAction(
                                                    key,
                                                    row
                                                ),
                                        }}
                                    >
                                        <Button
                                            type="text"
                                            icon={
                                                <MoreHorizontal size={18} />
                                            }
                                        />
                                    </Dropdown>
                                ),
                            },
                        ]}
                    />
                </div>
            )}
        </div>
    );
}