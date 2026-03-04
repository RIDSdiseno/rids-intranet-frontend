// components/reportes/KPICards.tsx
import React from "react";
import { motion } from "framer-motion";
import {
    CheckCircleOutlined,
    ToolOutlined,
    TeamOutlined,
    BuildOutlined,
    RiseOutlined,
    FallOutlined,
} from "@ant-design/icons";
import type { ReporteGeneralData } from "../modals-reportes/typesReportes";

export const KPICards: React.FC<{ data: ReporteGeneralData }> = ({ data }) => {
    const kpis = [
        {
            title: "Tickets Resueltos",
            value: data.tickets.length,
            color: "green",
            icon: <CheckCircleOutlined />,
            description: "Total del periodo",
            trend: "up" as const,
        },
        {
            title: "Visitas Realizadas",
            value: data.visitas.length,
            color: "blue",
            icon: <ToolOutlined />,
            description: "Actividades técnicas",
            trend: "up" as const,
        },
        {
            title: "Usuarios Atendidos",
            value: data.solicitantes.length,
            color: "purple",
            icon: <TeamOutlined />,
            description: "Clientes activos",
            trend: "up" as const,
        },
        {
            title: "Equipos Registrados",
            value: data.equipos.length,
            color: "orange",
            icon: <BuildOutlined />,
            description: "Inventario total",
            trend: "up" as const,
        },
    ];

    const colorMap: Record<string, string> = {
        green: "bg-green-100 text-green-600",
        blue: "bg-blue-100 text-blue-600",
        purple: "bg-purple-100 text-purple-600",
        orange: "bg-orange-100 text-orange-600",
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {kpis.map((kpi, index) => (
                <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className={`p-3 rounded-lg ${colorMap[kpi.color]}`}>
                            {kpi.icon}
                        </div>
                        <div
                            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${kpi.trend === "up"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                        >
                            {kpi.trend === "up" ? <RiseOutlined /> : <FallOutlined />}
                        </div>
                    </div>
                    <p className="text-slate-600 text-sm font-medium mb-1">{kpi.title}</p>
                    <p className="text-3xl font-bold text-slate-900 mb-1">
                        {kpi.value.toLocaleString()}
                    </p>
                    <p className="text-slate-500 text-xs">{kpi.description}</p>
                </motion.div>
            ))}
        </div>
    );
};