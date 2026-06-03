import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
    ReloadOutlined,
    CloudSyncOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    WarningOutlined,
} from "@ant-design/icons";

import {
    conciliarRcv,
    desconciliarRcv,
    fetchConciliacionRcv,
    observarRcv,
    type EmpresaKey,
    type TipoRcv,
} from "../../api/rcvConciliacion.api";

import RcvConciliacionTable, {
    type RcvConciliacionRow,
} from "./RcvConciliacionTable";

type Props = {
    empresa: EmpresaKey;
    activeTab: TipoRcv;
    mes: string;
    ano: string;
};

function mapBackendRow(row: any): RcvConciliacionRow {
    return {
        id: [
            row.empresaKey,
            row.tipoRcv,
            row.tipoDoc,
            row.rutContraparte,
            row.folio,
        ].join("-"),

        empresaKey: row.empresaKey,
        tipoRcv: row.tipoRcv,
        tipoDoc: String(row.tipoDoc ?? ""),
        folio: String(row.folio ?? ""),
        rutContraparte: String(row.rutContraparte ?? ""),
        razonSocial: String(row.razonSocial ?? ""),
        fechaDocto: row.fechaDocto ?? null,
        montoNeto: Number(row.montoNeto ?? 0),
        montoIva: Number(row.montoIva ?? 0),
        montoTotal: Number(row.montoTotal ?? 0),
        estadoRcv: row.estadoRcv ?? null,
        origenRcv: row.origenRcv ?? null,
        estadoConciliacion: row.estadoConciliacion ?? "NO_CONCILIADA",
        formaPago: row.formaPago ?? null,
        observacion: row.observacion ?? null,
        responsable: row.responsable ?? null,
        conciliadoAt: row.conciliadoAt ?? null,
    };
}

const RcvConciliacionPanel: React.FC<Props> = ({
    empresa,
    activeTab,
    mes,
    ano,
}) => {
    const [rows, setRows] = useState<RcvConciliacionRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [meta, setMeta] = useState<any | null>(null);
    const [busqueda, setBusqueda] = useState("");
    const [estadoFiltro, setEstadoFiltro] = useState<string>("todos");

    const [observacionModalOpen, setObservacionModalOpen] = useState(false);
    const [observacionRow, setObservacionRow] = useState<RcvConciliacionRow | null>(null);
    const [observacionTexto, setObservacionTexto] = useState("");
    const [observacionSaving, setObservacionSaving] = useState(false);

    const cargarConciliacion = useCallback(
        async (forceRefresh = false) => {
            setLoading(true);

            try {
                const json = await fetchConciliacionRcv({
                    empresa,
                    tipo: activeTab,
                    mes,
                    ano,
                    forceRefresh,
                });

                const data = Array.isArray(json?.data)
                    ? json.data.map(mapBackendRow)
                    : [];

                setRows(data);
                setMeta(json?.meta ?? null);
            } catch (error) {
                console.error("Error cargando conciliación RCV", error);
                alert("No se pudo cargar la conciliación RCV");
            } finally {
                setLoading(false);
            }
        },
        [empresa, activeTab, mes, ano]
    );

    useEffect(() => {
        void cargarConciliacion(false);
    }, [cargarConciliacion]);

    const rowsFiltradas = useMemo(() => {
        const q = busqueda.trim().toLowerCase();

        return rows.filter((row) => {
            const matchBusqueda =
                !q ||
                row.folio.toLowerCase().includes(q) ||
                row.rutContraparte.toLowerCase().includes(q) ||
                row.razonSocial.toLowerCase().includes(q);

            const matchEstado =
                estadoFiltro === "todos" ||
                row.estadoConciliacion === estadoFiltro;

            return matchBusqueda && matchEstado;
        });
    }, [rows, busqueda, estadoFiltro]);

    const stats = useMemo(() => {
        const total = rows.length;
        const conciliadas = rows.filter((r) => r.estadoConciliacion === "CONCILIADA").length;
        const observadas = rows.filter((r) => r.estadoConciliacion === "OBSERVADA").length;
        const noConciliadas = rows.filter((r) => r.estadoConciliacion === "NO_CONCILIADA").length;

        return {
            total,
            conciliadas,
            observadas,
            noConciliadas,
        };
    }, [rows]);

    const handleConciliar = async (row: RcvConciliacionRow) => {
        const formaPago = window.prompt(
            "Forma de pago / validación",
            row.formaPago ?? "TRANSFERENCIA"
        );

        if (formaPago === null) return;

        const observacion = window.prompt(
            "Observación opcional",
            row.observacion ?? ""
        );

        try {
            await conciliarRcv({
                empresa: row.empresaKey,
                tipoRcv: row.tipoRcv,
                tipoDoc: row.tipoDoc,
                folio: row.folio,
                rutContraparte: row.rutContraparte,
                razonSocial: row.razonSocial,
                fechaDocto: row.fechaDocto,
                montoNeto: row.montoNeto,
                montoIva: row.montoIva,
                montoTotal: row.montoTotal,
                estadoRcv: row.estadoRcv,
                origenRcv: row.origenRcv,
                formaPago,
                observacion: observacion ?? null,
            });

            await cargarConciliacion(false);
        } catch (error) {
            console.error("Error conciliando documento", error);
            alert("No se pudo conciliar el documento");
        }
    };

    const handleDesconciliar = async (row: RcvConciliacionRow) => {
        const ok = window.confirm(
            `¿Desconciliar el documento folio ${row.folio}?`
        );

        if (!ok) return;

        try {
            await desconciliarRcv({
                empresa: row.empresaKey,
                tipoRcv: row.tipoRcv,
                tipoDoc: row.tipoDoc,
                folio: row.folio,
                rutContraparte: row.rutContraparte,
            });

            await cargarConciliacion(false);
        } catch (error) {
            console.error("Error desconciliando documento", error);
            alert("No se pudo desconciliar el documento");
        }
    };

    const handleObservar = (row: RcvConciliacionRow) => {
        setObservacionRow(row);
        setObservacionTexto(row.observacion ?? "");
        setObservacionModalOpen(true);
    };

    const handleGuardarObservacion = async () => {
        if (!observacionRow) return;

        const texto = observacionTexto.trim();

        if (!texto) {
            alert("Debes ingresar una observación.");
            return;
        }

        setObservacionSaving(true);

        try {
            await observarRcv({
                empresa: observacionRow.empresaKey,
                tipoRcv: observacionRow.tipoRcv,
                tipoDoc: observacionRow.tipoDoc,
                folio: observacionRow.folio,
                rutContraparte: observacionRow.rutContraparte,
                observacion: texto,
            });

            setObservacionModalOpen(false);
            setObservacionRow(null);
            setObservacionTexto("");

            await cargarConciliacion(false);
        } catch (error) {
            console.error("Error observando documento", error);
            alert("No se pudo guardar la observación");
        } finally {
            setObservacionSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="rounded-3xl border border-cyan-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-lg font-black text-slate-900">
                            Conciliación RCV
                        </h2>
                        <p className="text-sm text-slate-500">
                            Control interno de conciliación para documentos de {activeTab === "ventas" ? "ventas" : "compras"}.
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                            type="button"
                            onClick={() => cargarConciliacion(false)}
                            disabled={loading}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-cyan-300 bg-white px-4 text-sm font-bold text-cyan-700 transition hover:bg-cyan-50 disabled:opacity-60"
                        >
                            <ReloadOutlined className={loading ? "animate-spin" : ""} />
                            Actualizar vista
                        </button>

                        <button
                            type="button"
                            onClick={() => cargarConciliacion(true)}
                            disabled={loading}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-cyan-300 bg-cyan-600 px-4 text-sm font-bold text-white transition hover:bg-cyan-500 disabled:opacity-60"
                        >
                            <CloudSyncOutlined />
                            Consultar SII
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                    title="Total"
                    value={meta?.total ?? stats.total}
                    icon={<CloudSyncOutlined />}
                    tone="cyan"
                />
                <KpiCard
                    title="Conciliadas"
                    value={meta?.conciliadas ?? stats.conciliadas}
                    icon={<CheckCircleOutlined />}
                    tone="emerald"
                />
                <KpiCard
                    title="No conciliadas"
                    value={meta?.noConciliadas ?? stats.noConciliadas}
                    icon={<CloseCircleOutlined />}
                    tone="slate"
                />
                <KpiCard
                    title="Observadas"
                    value={meta?.observadas ?? stats.observadas}
                    icon={<WarningOutlined />}
                    tone="amber"
                />
            </div>

            <div className="rounded-3xl border border-cyan-200 bg-white p-4 shadow-sm">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">
                    <input
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar por folio, RUT o razón social..."
                        className="h-10 rounded-xl border border-cyan-200 bg-cyan-50/30 px-3 text-sm outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
                    />

                    <select
                        value={estadoFiltro}
                        onChange={(e) => setEstadoFiltro(e.target.value)}
                        className="h-10 rounded-xl border border-cyan-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    >
                        <option value="todos">Todos los estados</option>
                        <option value="NO_CONCILIADA">No conciliadas</option>
                        <option value="CONCILIADA">Conciliadas</option>
                        <option value="OBSERVADA">Observadas</option>
                    </select>
                </div>
            </div>

            <RcvConciliacionTable
                rows={rowsFiltradas}
                loading={loading}
                tipoRcv={activeTab}
                onConciliar={handleConciliar}
                onDesconciliar={handleDesconciliar}
                onObservar={handleObservar}
            />
            {observacionModalOpen && observacionRow && (
                <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
                    <div className="w-full overflow-hidden rounded-t-3xl border border-cyan-200 bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl">
                        <div className="border-b border-cyan-100 bg-cyan-50/70 px-5 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">
                                        Agregar observación
                                    </h3>

                                    <p className="mt-1 text-sm text-slate-600">
                                        Folio {observacionRow.folio} · {observacionRow.razonSocial || "Sin razón social"}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (observacionSaving) return;
                                        setObservacionModalOpen(false);
                                        setObservacionRow(null);
                                        setObservacionTexto("");
                                    }}
                                    className="flex h-9 w-9 items-center justify-center rounded-full border border-cyan-200 bg-white text-cyan-700 transition hover:bg-cyan-50"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 px-5 py-5">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-2xl bg-slate-50 p-3">
                                    <p className="text-[11px] font-bold uppercase text-slate-400">
                                        Tipo DTE
                                    </p>
                                    <p className="mt-1 text-sm font-bold text-slate-800">
                                        {observacionRow.tipoDoc}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-slate-50 p-3">
                                    <p className="text-[11px] font-bold uppercase text-slate-400">
                                        Total
                                    </p>
                                    <p className="mt-1 text-sm font-bold text-slate-800">
                                        {new Intl.NumberFormat("es-CL", {
                                            style: "currency",
                                            currency: "CLP",
                                            maximumFractionDigits: 0,
                                        }).format(observacionRow.montoTotal ?? 0)}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-bold text-slate-700">
                                    Observación
                                </label>

                                <textarea
                                    value={observacionTexto}
                                    onChange={(e) => setObservacionTexto(e.target.value)}
                                    rows={5}
                                    autoFocus
                                    placeholder="Ej: Documento pendiente de revisión, diferencia de monto, respaldo incompleto..."
                                    className="w-full resize-none rounded-2xl border border-cyan-200 bg-cyan-50/30 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
                                />

                                <p className="mt-2 text-xs text-slate-400">
                                    Esta observación quedará guardada en la conciliación del documento.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                disabled={observacionSaving}
                                onClick={() => {
                                    setObservacionModalOpen(false);
                                    setObservacionRow(null);
                                    setObservacionTexto("");
                                }}
                                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                disabled={observacionSaving}
                                onClick={handleGuardarObservacion}
                                className="h-10 rounded-xl border border-amber-300 bg-amber-50 px-4 text-sm font-bold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {observacionSaving ? "Guardando..." : "Guardar observación"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

function KpiCard({
    title,
    value,
    icon,
    tone,
}: {
    title: string;
    value: React.ReactNode;
    icon: React.ReactNode;
    tone: "cyan" | "emerald" | "slate" | "amber";
}) {
    const toneClasses = {
        cyan: "bg-cyan-50 text-cyan-700 ring-cyan-100",
        emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
        slate: "bg-slate-50 text-slate-700 ring-slate-100",
        amber: "bg-amber-50 text-amber-700 ring-amber-100",
    };

    return (
        <div className="rounded-3xl border border-cyan-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        {title}
                    </p>
                    <p className="mt-2 text-2xl font-black text-slate-900">
                        {value}
                    </p>
                </div>

                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ${toneClasses[tone]}`}>
                    {icon}
                </div>
            </div>
        </div>
    );
}

export default RcvConciliacionPanel;