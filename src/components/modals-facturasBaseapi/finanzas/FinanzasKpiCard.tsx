import React from "react";

type Props = {
    label: string;
    value: string;
    helper: string;
    icon: React.ReactNode;

    tone:
    | "cyan"
    | "amber"
    | "red"
    | "emerald";
};

const toneClasses = {
    cyan:
        "bg-cyan-50 text-cyan-700 ring-cyan-100",

    amber:
        "bg-amber-50 text-amber-700 ring-amber-100",

    red:
        "bg-red-50 text-red-700 ring-red-100",

    emerald:
        "bg-emerald-50 text-emerald-700 ring-emerald-100",
};

const FinanzasKpiCard:
    React.FC<Props> = ({
        label,
        value,
        helper,
        icon,
        tone,
    }) => {
        return (
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                            {label}
                        </p>

                        <p
                            className="mt-2 truncate text-2xl font-black text-slate-900"
                            title={
                                value
                            }
                        >
                            {value}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                            {helper}
                        </p>
                    </div>

                    <div
                        className={`
                            flex h-11 w-11 shrink-0
                            items-center justify-center
                            rounded-2xl ring-1
                            ${toneClasses[tone]}
                        `}
                    >
                        {icon}
                    </div>
                </div>
            </div>
        );
    };

export default FinanzasKpiCard;