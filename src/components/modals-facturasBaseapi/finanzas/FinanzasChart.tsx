import React from "react";

import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

import type {
    FinanzasChartTab,
    FinanzasMes,
    FinanzasVentaMode,
} from "./finanzas.types";

type Props = {
    data: FinanzasMes[];

    activeTab:
    FinanzasChartTab;

    ventaMode:
    FinanzasVentaMode;
};

function formatCompact(
    value: number
) {
    return new Intl.NumberFormat(
        "es-CL",
        {
            notation:
                "compact",

            maximumFractionDigits:
                1,
        }
    ).format(
        value
    );
}

function formatCLP(
    value: number
) {
    return new Intl.NumberFormat(
        "es-CL",
        {
            style:
                "currency",

            currency:
                "CLP",

            maximumFractionDigits:
                0,
        }
    ).format(
        value
    );
}

const FinanzasChart:
    React.FC<Props> = ({
        data,
        activeTab,
        ventaMode,
    }) => {
        const chartData =
            data.map(
                (
                    item
                ) => ({
                    ...item,

                    mesCorto:
                        item
                            .label
                            .slice(
                                0,
                                3
                            ),
                })
            );

        return (
            <div className="h-[420px] w-full">
                <ResponsiveContainer
                    width="100%"
                    height="100%"
                >
                    <BarChart
                        data={
                            chartData
                        }
                        margin={{
                            top:
                                10,

                            right:
                                20,

                            left:
                                10,

                            bottom:
                                5,
                        }}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            vertical={
                                false
                            }
                        />

                        <XAxis
                            dataKey="mesCorto"
                        />

                        <YAxis
                            tickFormatter={
                                formatCompact
                            }
                        />

                        <Tooltip
                            formatter={(
                                value: any,
                                name: any
                            ) => {
                                if (
                                    activeTab ===
                                    "recordatorios"
                                ) {
                                    return [
                                        Number(
                                            value ??
                                            0
                                        ),
                                        name,
                                    ];
                                }

                                return [
                                    formatCLP(
                                        Number(
                                            value ??
                                            0
                                        )
                                    ),
                                    name,
                                ];
                            }}
                        />

                        {activeTab ===
                            "ventas" && (
                                <Bar
                                    dataKey={
                                        ventaMode ===
                                            "bruta"
                                            ? "facturadoBruto"
                                            : "facturadoNeto"
                                    }
                                    name={
                                        ventaMode ===
                                            "bruta"
                                            ? "Venta bruta"
                                            : "Venta neta"
                                    }
                                    fill="#0891b2"
                                    radius={[
                                        6,
                                        6,
                                        0,
                                        0,
                                    ]}
                                />
                            )}

                        {activeTab ===
                            "compras" && (
                                <Bar
                                    dataKey={
                                        ventaMode ===
                                            "bruta"
                                            ? "comprasBruto"
                                            : "comprasNeto"
                                    }
                                    name={
                                        ventaMode ===
                                            "bruta"
                                            ? "Compra bruta"
                                            : "Compra neta"
                                    }
                                    fill="#7c3aed"
                                    radius={[
                                        6,
                                        6,
                                        0,
                                        0,
                                    ]}
                                />
                            )}

                        {activeTab ===
                            "pagos" && (
                                <Bar
                                    dataKey="pagado"
                                    name="Pagado"
                                    fill="#059669"
                                    radius={[
                                        6,
                                        6,
                                        0,
                                        0,
                                    ]}
                                />
                            )}

                        {activeTab ===
                            "recordatorios" && (
                                <Bar
                                    dataKey="recordatorios"
                                    name="Recordatorios"
                                    fill="#4f46e5"
                                    radius={[
                                        6,
                                        6,
                                        0,
                                        0,
                                    ]}
                                />
                            )}

                        {activeTab ===
                            "vencimientos" && (
                                <>
                                    <Legend />

                                    <Bar
                                        dataKey="porVencer"
                                        name="Por vencer"
                                        fill="#d97706"
                                        radius={[
                                            6,
                                            6,
                                            0,
                                            0,
                                        ]}
                                    />

                                    <Bar
                                        dataKey="vencido"
                                        name="Vencido"
                                        fill="#dc2626"
                                        radius={[
                                            6,
                                            6,
                                            0,
                                            0,
                                        ]}
                                    />
                                </>
                            )}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

export default FinanzasChart;