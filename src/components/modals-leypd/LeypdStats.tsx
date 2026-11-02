// src/components/modals-leypd/LeypdStats.tsx

import {
    CheckCircleOutlined,
    ClockCircleOutlined,
    ExclamationCircleOutlined,
    FileDoneOutlined,
    TeamOutlined,
} from "@ant-design/icons";

import {
    Card,
    Progress,
    Statistic,
    Tooltip,
} from "antd";

import type {
    LeypdListadoResponse,
} from "./leypd.types";

interface LeypdStatsProps {
    data:
    LeypdListadoResponse | null;

    loading?: boolean;
}

interface StatCardProps {
    title: string;
    value: number;
    icon: React.ReactNode;
    suffix?: React.ReactNode;
    description?: string;
}

function StatCard({
    title,
    value,
    icon,
    suffix,
    description,
}: StatCardProps) {
    return (
        <Card
            loading={false}
            className="
                h-full
                rounded-2xl
                border
                border-slate-200
                shadow-sm
            "
            styles={{
                body: {
                    padding: 18,
                },
            }}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <Statistic
                        title={
                            <Tooltip
                                title={
                                    description
                                }
                            >
                                <span className="text-sm font-medium text-slate-500">
                                    {title}
                                </span>
                            </Tooltip>
                        }
                        value={value}
                        suffix={suffix}
                        valueStyle={{
                            fontSize: 28,
                            fontWeight: 700,
                        }}
                    />
                </div>

                <div
                    className="
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        bg-slate-100
                        text-lg
                    "
                >
                    {icon}
                </div>
            </div>
        </Card>
    );
}

export default function LeypdStats({
    data,
    loading = false,
}: LeypdStatsProps) {
    const resumen =
        data?.resumen;

    const totalEmpresas =
        resumen?.totalEmpresas ??
        0;

    const clientesCompletos =
        resumen?.clientesCompletos ??
        0;

    const clientesSinIniciar =
        resumen?.clientesSinIniciar ??
        0;

    const compromisosVencidos =
        resumen?.compromisosVencidos ??
        0;

    const elementosImplementados =
        resumen?.elementosImplementados ??
        0;

    const porcentajeClientesCompletos =
        totalEmpresas >
            0
            ? Math.round(
                (
                    clientesCompletos /
                    totalEmpresas
                ) *
                100
            )
            : 0;

    if (loading) {
        return (
            <div
                className="
                    grid
                    grid-cols-1
                    gap-3
                    sm:grid-cols-2
                    xl:grid-cols-5
                "
            >
                {Array.from({
                    length: 5,
                }).map(
                    (
                        _,
                        index
                    ) => (
                        <Card
                            key={
                                index
                            }
                            loading
                            className="rounded-2xl"
                        />
                    )
                )}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div
                className="
                    grid
                    grid-cols-1
                    gap-3
                    sm:grid-cols-2
                    xl:grid-cols-5
                "
            >
                <StatCard
                    title="Empresas"
                    value={
                        totalEmpresas
                    }
                    icon={
                        <TeamOutlined />
                    }
                    description="Total de empresas activas consideradas en el módulo Ley PD."
                />

                <StatCard
                    title="Clientes 100%"
                    value={
                        clientesCompletos
                    }
                    icon={
                        <CheckCircleOutlined />
                    }
                    description="Empresas cuyos 13 elementos están implementados o marcados como no aplica."
                />

                <StatCard
                    title="Sin iniciar"
                    value={
                        clientesSinIniciar
                    }
                    icon={
                        <ClockCircleOutlined />
                    }
                    description="Empresas que todavía mantienen todos sus elementos como no iniciados."
                />

                <StatCard
                    title="Compromisos vencidos"
                    value={
                        compromisosVencidos
                    }
                    icon={
                        <ExclamationCircleOutlined />
                    }
                    description="Elementos con fecha de compromiso vencida y que aún no están implementados ni marcados como no aplica."
                />

                <StatCard
                    title="Elementos implementados"
                    value={
                        elementosImplementados
                    }
                    icon={
                        <FileDoneOutlined />
                    }
                    description="Cantidad total de elementos Ley PD marcados como implementados."
                />
            </div>

            <Card
                className="
                    rounded-2xl
                    border
                    border-slate-200
                    shadow-sm
                "
                styles={{
                    body: {
                        padding: 16,
                    },
                }}
            >
                <div
                    className="
                        flex
                        flex-col
                        gap-3
                        md:flex-row
                        md:items-center
                        md:justify-between
                    "
                >
                    <div>
                        <div className="text-sm font-semibold text-slate-700">
                            Avance global de clientes
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                            Porcentaje de empresas que ya alcanzaron el 100% de cumplimiento dentro del checklist operativo.
                        </div>
                    </div>

                    <div className="w-full md:max-w-md">
                        <Progress
                            percent={
                                porcentajeClientesCompletos
                            }
                            status={
                                porcentajeClientesCompletos ===
                                    100
                                    ? "success"
                                    : "active"
                            }
                        />
                    </div>
                </div>
            </Card>
        </div>
    );
}