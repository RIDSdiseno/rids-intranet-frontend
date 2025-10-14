import React, { useEffect, useState } from "react";
import Header from "../components/Header"; // ✅ tu header actual
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";

const ReportesPage: React.FC = () => {
    const [data, setData] = useState<any[]>([]);

    useEffect(() => {
        fetch("/api/tickets")
            .then((res) => res.json())
            .then((json) => {
                const agrupado = Object.values(
                    json.rows.reduce((acc: any, t: any) => {
                        const empresa = t.empresa || "Sin empresa";
                        acc[empresa] = acc[empresa] || { empresa, tickets: 0 };
                        acc[empresa].tickets += 1;
                        return acc;
                    }, {})
                );
                setData(agrupado);
            })
            .catch((err) => console.error("Error cargando tickets:", err));
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* ✅ Header global arriba */}
            <Header />

            {/* ✅ Contenido principal */}
            <main className="flex-1 p-6 space-y-6">
                <div className="bg-white shadow-md rounded-2xl p-6 border border-gray-200">
                    <h2 className="text-lg font-semibold mb-4">
                        Tickets Totales por Empresa
                    </h2>

                    {data.length === 0 ? (
                        <p className="text-gray-500 text-sm">Cargando datos...</p>
                    ) : (
                        <div className="h-96">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={data.sort((a, b) => b.tickets - a.tickets)}
                                    layout="vertical"
                                    margin={{ left: 50, right: 20, top: 10, bottom: 10 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis dataKey="empresa" type="category" />
                                    <Tooltip
                                        content={({ active, payload }) =>
                                            active && payload && payload.length ? (
                                                <div className="bg-white p-2 shadow rounded border text-sm">
                                                    <strong>{payload[0].payload.empresa}</strong>
                                                    <br />
                                                    Tickets: {payload[0].value}
                                                </div>
                                            ) : null
                                        }
                                    />
                                    <Bar dataKey="tickets" fill="#2563eb" radius={[4, 4, 4, 4]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ReportesPage;
