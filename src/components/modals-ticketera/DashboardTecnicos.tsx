// DashboardTecnicos.tsx
import { useEffect, useMemo, useState } from "react";
import { Card, Row, Col, Spin, message, Empty, Tag, Progress } from "antd";
import {
    TeamOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    ExclamationCircleOutlined,
} from "@ant-design/icons";
import { api } from "../../api/api";

type TecnicoMetric = {
    tecnicoId: number;
    nombre: string;
    email?: string;
    assignedTickets: number;
    openTickets: number;
    pendingTickets: number;
    resolvedTickets: number;
    closedTickets: number;
    reopenedTickets: number;
    avgFirstResponseMinutes: number | null;
    avgResolutionMinutes: number | null;
    firstResponse: {
        ok: number;
        breached: number;
        pending: number;
        total: number;
        compliance: number;
    };
    resolution: {
        ok: number;
        breached: number;
        pending: number;
        total: number;
        compliance: number;
    };
};

function formatMinutes(min: number | null | undefined): string {
    if (min == null) return "—";
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getStatusColor(value: number) {
    if (value >= 90) return "#52c41a";
    if (value >= 70) return "#faad14";
    return "#ff4d4f";
}

function getTagColor(value: number) {
    if (value >= 90) return "green";
    if (value >= 70) return "gold";
    return "red";
}

function MetricPill({
    label,
    value,
}: {
    label: string;
    value: string | number;
}) {
    return (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <div className="text-xs text-gray-500">{label}</div>
            <div className="text-base font-semibold text-gray-800">{value}</div>
        </div>
    );
}

// Componente para mostrar el dashboard de técnicos en el centro de soporte, con métricas de carga de trabajo y cumplimiento de SLA para cada técnico, y un resumen general al inicio. Utiliza Ant Design para el diseño y visualización de las métricas, y muestra indicadores de colores para facilitar la interpretación rápida del desempeño de cada técnico.
export default function HelpdeskDashboardPage() {
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<TecnicoMetric[]>([]);

    const loadMetrics = async () => {
        try {
            setLoading(true);
            const { data } = await api.get("/helpdesk/tickets/tecnicos/metrics");

            if (data?.ok) {
                setMetrics(data.data || []);
            } else {
                setMetrics([]);
            }
        } catch (error) {
            console.error("Error cargando dashboard helpdesk:", error);
            message.error("No se pudo cargar el dashboard");
            setMetrics([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMetrics();
    }, []);

    const summary = useMemo(() => {
        const totalTecnicos = metrics.length;
        const totalAsignados = metrics.reduce((acc, t) => acc + t.assignedTickets, 0);

        const avgFirstResponseCompliance =
            totalTecnicos > 0
                ? Math.round(
                    metrics.reduce((acc, t) => acc + t.firstResponse.compliance, 0) /
                    totalTecnicos
                )
                : 0;

        const avgResolutionCompliance =
            totalTecnicos > 0
                ? Math.round(
                    metrics.reduce((acc, t) => acc + t.resolution.compliance, 0) /
                    totalTecnicos
                )
                : 0;

        return {
            totalTecnicos,
            totalAsignados,
            avgFirstResponseCompliance,
            avgResolutionCompliance,
        };
    }, [metrics]);

    if (loading) {
        return (
            <div className="py-20 flex justify-center">
                <Spin size="large" />
            </div>
        );
    }

    if (!metrics.length) {
        return (
            <div className="py-16">
                <Empty description="No hay métricas disponibles" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* RESUMEN GENERAL */}
            <Row gutter={[16, 16]}>
                <Col xs={24} md={12} xl={6}>
                    <Card className="rounded-2xl shadow-sm border-l-4 border-l-blue-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm text-gray-500">Técnicos activos</div>
                                <div className="text-2xl font-bold text-gray-800">
                                    {summary.totalTecnicos}
                                </div>
                            </div>
                            <TeamOutlined className="text-xl text-blue-500" />
                        </div>
                    </Card>
                </Col>

                <Col xs={24} md={12} xl={6}>
                    <Card className="rounded-2xl shadow-sm border-l-4 border-l-cyan-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm text-gray-500">Tickets asignados</div>
                                <div className="text-2xl font-bold text-gray-800">
                                    {summary.totalAsignados}
                                </div>
                            </div>
                            <ExclamationCircleOutlined className="text-xl text-cyan-500" />
                        </div>
                    </Card>
                </Col>

                <Col xs={24} md={12} xl={6}>
                    <Card className="rounded-2xl shadow-sm border-l-4 border-l-green-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm text-gray-500">SLA 1ra respuesta</div>
                                <div className="text-2xl font-bold text-gray-800">
                                    {summary.avgFirstResponseCompliance}%
                                </div>
                            </div>
                            <ClockCircleOutlined className="text-xl text-green-500" />
                        </div>
                    </Card>
                </Col>

                <Col xs={24} md={12} xl={6}>
                    <Card className="rounded-2xl shadow-sm border-l-4 border-l-emerald-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm text-gray-500">SLA cierre</div>
                                <div className="text-2xl font-bold text-gray-800">
                                    {summary.avgResolutionCompliance}%
                                </div>
                            </div>
                            <CheckCircleOutlined className="text-xl text-emerald-500" />
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* CARDS POR TÉCNICO */}
            <Row gutter={[16, 16]}>
                {metrics.map((t) => {
                    const frColor = getStatusColor(t.firstResponse.compliance);
                    const rsColor = getStatusColor(t.resolution.compliance);

                    return (
                        <Col xs={24} md={12} xl={8} key={t.tecnicoId}>
                            <Card
                                className="rounded-2xl shadow-sm h-full"
                                styles={{ body: { padding: 20 } }}
                            >
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div>
                                        <div className="text-lg font-semibold text-gray-800">
                                            {t.nombre}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {t.email || "Sin email"}
                                        </div>
                                    </div>

                                    <Tag color={getTagColor(t.firstResponse.compliance)}>
                                        {t.firstResponse.compliance}% SLA
                                    </Tag>
                                </div>

                                {/* CARGA */}
                                <div className="mb-5">
                                    <div className="text-sm font-medium text-gray-700 mb-2">
                                        Carga de trabajo
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <MetricPill label="Asignados" value={t.assignedTickets} />
                                        <MetricPill label="Abiertos" value={t.openTickets} />
                                        <MetricPill label="Pendientes" value={t.pendingTickets} />
                                        <MetricPill label="Cerrados" value={t.closedTickets} />
                                    </div>
                                </div>

                                {/* SLA */}
                                <div className="mb-5 space-y-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-gray-700">
                                                SLA 1ra respuesta
                                            </span>
                                            <span
                                                className="text-sm font-semibold"
                                                style={{ color: frColor }}
                                            >
                                                {t.firstResponse.compliance}%
                                            </span>
                                        </div>
                                        <Progress
                                            percent={t.firstResponse.compliance}
                                            showInfo={false}
                                            strokeColor={frColor}
                                            trailColor="#f1f5f9"
                                        />
                                        <div className="text-xs text-gray-500 mt-1">
                                            {t.firstResponse.ok} cumplidos ·{" "}
                                            {t.firstResponse.breached} vencidos ·{" "}
                                            {t.firstResponse.pending} pendientes
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-sm font-medium text-gray-700">
                                                SLA cierre
                                            </span>
                                            <span
                                                className="text-sm font-semibold"
                                                style={{ color: rsColor }}
                                            >
                                                {t.resolution.compliance}%
                                            </span>
                                        </div>
                                        <Progress
                                            percent={t.resolution.compliance}
                                            showInfo={false}
                                            strokeColor={rsColor}
                                            trailColor="#f1f5f9"
                                        />
                                        <div className="text-xs text-gray-500 mt-1">
                                            {t.resolution.ok} cumplidos ·{" "}
                                            {t.resolution.breached} vencidos ·{" "}
                                            {t.resolution.pending} pendientes
                                        </div>
                                    </div>
                                </div>

                                {/* TIEMPOS */}
                                <div className="pt-4 border-t border-gray-100">
                                    <div className="text-sm font-medium text-gray-700 mb-2">
                                        Tiempos promedio
                                    </div>

                                    <div className="flex flex-col gap-2 text-sm">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">1ra respuesta</span>
                                            <span className="font-semibold text-gray-800">
                                                {formatMinutes(t.avgFirstResponseMinutes)}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">Cierre</span>
                                            <span className="font-semibold text-gray-800">
                                                {formatMinutes(t.avgResolutionMinutes)}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">Reabiertos</span>
                                            <span className="font-semibold text-gray-800">
                                                {t.reopenedTickets}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </Col>
                    );
                })}
            </Row>
        </div>
    );
}