import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuditOutlined } from "@ant-design/icons";
import RcvConciliacionPanel from "../components/modals-facturasBaseapi/RcvConciliacionPanel";
import { MESES, safeParseUser } from "../components/modals-facturasBaseapi/utils";
import type { EmpresaKey, TipoRcv } from "../components/modals-facturasBaseapi/rcvConciliacion.api";

export default function ConciliacionRcv() {
    const now = new Date();
    const navigate = useNavigate();
    const user = useMemo(() => safeParseUser(), []);
    const puedeVer = String(user?.rol ?? "").toUpperCase().trim() === "ADMINISTRACION";

    const [empresa, setEmpresa] = useState<EmpresaKey>("econnet");
    const [activeTab, setActiveTab] = useState<TipoRcv>("ventas");
    const [mes, setMes] = useState(String(now.getMonth() + 1).padStart(2, "0"));
    const [ano, setAno] = useState(String(now.getFullYear()));

    React.useEffect(() => {
        if (!puedeVer) navigate("/facturas", { replace: true });
    }, [puedeVer, navigate]);

    if (!puedeVer) return null;

    return (
        <div className="mx-auto flex max-w-7xl flex-col gap-5 p-6">

            {/* Header */}
            <div className="rounded-3xl border border-cyan-200 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
                        <AuditOutlined style={{ fontSize: 18 }} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 leading-tight">Conciliación</h1>
                        <p className="text-xs text-slate-400">Control interno de conciliación de documentos reportados por el SII</p>
                    </div>
                </div>
            </div>

            <div className="rounded-3xl border border-cyan-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-4">
                    <h2 className="text-sm font-bold text-slate-900">Filtros de consulta</h2>
                    <p className="text-xs text-slate-500">Define la empresa, el tipo de movimiento y el período a revisar.</p>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Empresa</label>
                        <select
                            value={empresa}
                            onChange={(e) => setEmpresa(e.target.value as EmpresaKey)}
                            className="h-10 w-full rounded-xl border border-cyan-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                        >
                            <option value="econnet">ECONNET</option>
                            <option value="rids">RIDS</option>
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Tipo</label>
                        <select
                            value={activeTab}
                            onChange={(e) => setActiveTab(e.target.value as TipoRcv)}
                            className="h-10 w-full rounded-xl border border-cyan-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                        >
                            <option value="ventas">Ventas</option>
                            <option value="compras">Compras</option>
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Mes</label>
                        <select
                            value={mes}
                            onChange={(e) => setMes(e.target.value)}
                            className="h-10 w-full rounded-xl border border-cyan-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                        >
                            {MESES.map((nombre, index) => {
                                const value = String(index + 1).padStart(2, "0");
                                return <option key={value} value={value}>{nombre}</option>;
                            })}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Año</label>
                        <input
                            value={ano}
                            onChange={(e) => setAno(e.target.value)}
                            className="h-10 w-full rounded-xl border border-cyan-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                        />
                    </div>
                </div>
            </div>

            <RcvConciliacionPanel empresa={empresa} activeTab={activeTab} mes={mes} ano={ano} />
        </div>
    );
}
