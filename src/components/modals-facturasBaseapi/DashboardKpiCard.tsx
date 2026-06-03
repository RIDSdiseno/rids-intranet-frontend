import React from "react";

function DashboardKpiCard({
    title,
    value,
    delta,
}: {
    title: string;
    value: React.ReactNode;
    delta?: number | null;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">{title}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>

            {delta !== null && delta !== undefined && (
                <p className={`mt-1 text-xs font-semibold ${delta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}% vs. mes anterior
                </p>
            )}
        </div>
    );
}

export default DashboardKpiCard;