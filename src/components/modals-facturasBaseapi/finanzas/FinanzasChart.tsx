// src/components/models-facturasBaseapi/finanzas/FinanzasChart.tsx
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
    Cell,
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

    selectedMonth:
    number |
    null;

    onMonthSelect:
    (
        month: number
    ) => void;
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
        selectedMonth,
        onMonthSelect,
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

        function handleBarClick(
            entry: any
        ) {
            const month =
                Number(
                    entry
                        ?.payload
                        ?.mes
                );

            if (
                Number.isFinite(
                    month
                )
            ) {
                onMonthSelect(
                    month
                );
            }
        }

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
                            tick={(
                                props: any
                            ) => {
                                const {
                                    x,
                                    y,
                                    payload,
                                    index,
                                } = props;

                                const item =
                                    chartData[
                                    index
                                    ];

                                const active =
                                    item
                                        ?.mes ===
                                    selectedMonth;

                                return (
                                    <text
                                        x={
                                            x
                                        }
                                        y={
                                            y +
                                            16
                                        }
                                        textAnchor="middle"
                                        fill={
                                            active
                                                ? "#0891b2"
                                                : "#64748b"
                                        }
                                        fontSize={
                                            12
                                        }
                                        fontWeight={
                                            active
                                                ? 700
                                                : 400
                                        }
                                    >
                                        {
                                            payload
                                                .value
                                        }
                                    </text>
                                );
                            }}
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
                                    cursor="pointer"
                                    onClick={
                                        handleBarClick
                                    }
                                >
                                    {chartData.map(
                                        (
                                            entry
                                        ) => (
                                            <Cell
                                                key={
                                                    `ventas-${entry.mes}`
                                                }
                                                fillOpacity={
                                                    selectedMonth ===
                                                        null
                                                        ? 1
                                                        : entry.mes ===
                                                            selectedMonth
                                                            ? 1
                                                            : 0.35
                                                }
                                            />
                                        )
                                    )}
                                </Bar>
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
                                    cursor="pointer"
                                    onClick={
                                        handleBarClick
                                    }
                                >
                                    {chartData.map(
                                        (
                                            entry
                                        ) => (
                                            <Cell
                                                key={
                                                    `compras-${entry.mes}`
                                                }
                                                fillOpacity={
                                                    selectedMonth ===
                                                        null
                                                        ? 1
                                                        : entry.mes ===
                                                            selectedMonth
                                                            ? 1
                                                            : 0.35
                                                }
                                            />
                                        )
                                    )}
                                </Bar>
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
                                    cursor="pointer"
                                    onClick={handleBarClick}

                                >
                                    {chartData.map(
                                        (
                                            entry
                                        ) => (
                                            <Cell
                                                key={
                                                    `pagos-${entry.mes}`
                                                }
                                                fillOpacity={
                                                    selectedMonth ===
                                                        null
                                                        ? 1
                                                        : entry.mes ===
                                                            selectedMonth
                                                            ? 1
                                                            : 0.35
                                                }
                                            />
                                        )
                                    )}

                                </Bar>

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
                                    cursor="pointer"
                                    onClick={handleBarClick}
                                >
                                    {chartData.map(
                                        (
                                            entry
                                        ) => (
                                            <Cell
                                                key={
                                                    `recordatorios-${entry.mes}`
                                                }
                                                fillOpacity={
                                                    selectedMonth ===
                                                        null
                                                        ? 1
                                                        : entry.mes ===
                                                            selectedMonth
                                                            ? 1
                                                            : 0.35
                                                }
                                            />
                                        )
                                    )}
                                </Bar>
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
                                        cursor="pointer"
                                        onClick={handleBarClick}
                                    >

                                        {chartData.map(
                                            (
                                                entry
                                            ) => (
                                                <Cell
                                                    key={
                                                        `por-vencer-${entry.mes}`
                                                    }
                                                    fillOpacity={
                                                        selectedMonth ===
                                                            null
                                                            ? 1
                                                            : entry.mes ===
                                                                selectedMonth
                                                                ? 1
                                                                : 0.35
                                                    }
                                                />
                                            )
                                        )}
                                    </Bar>

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
                                        cursor="pointer"
                                        onClick={handleBarClick}
                                    >
                                        {chartData.map(
                                            (
                                                entry
                                            ) => (
                                                <Cell
                                                    key={
                                                        `vencido-${entry.mes}`
                                                    }
                                                    fillOpacity={
                                                        selectedMonth ===
                                                            null
                                                            ? 1
                                                            : entry.mes ===
                                                                selectedMonth
                                                                ? 1
                                                                : 0.35
                                                    }
                                                />
                                            )
                                        )}
                                    </Bar>
                                </>
                            )}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

export default FinanzasChart;