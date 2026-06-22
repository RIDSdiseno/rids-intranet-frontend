// src/components/modals/facturasBaseapi/RcvConcilacionPanel.tsx
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
} from "./rcvConciliacion.api";

import RcvConciliacionTable, {
    type RcvConciliacionRow,
} from "./RcvConciliacionTable";

import { DatePicker } from "antd";
import dayjs, { Dayjs } from "dayjs";
import "dayjs/locale/es";
import locale from "antd/es/date-picker/locale/es_ES";
dayjs.locale("es");

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

    const [conciliacionModalOpen, setConciliacionModalOpen] = useState(false);
    const [conciliacionRow, setConciliacionRow] = useState<RcvConciliacionRow | null>(null);
    const [conciliacionFormaPago, setConciliacionFormaPago] = useState("TRANSFERENCIA");
    const [conciliacionFecha, setConciliacionFecha] = useState<Dayjs | null>(
        dayjs()
    );
    const [conciliacionObservacion, setConciliacionObservacion] = useState("");
    const [conciliacionSaving, setConciliacionSaving] = useState(false);

    const [conciliacionEnviarCorreo, setConciliacionEnviarCorreo] = useState(false);
    const [conciliacionCorreoInput, setConciliacionCorreoInput] = useState("");
    const [conciliacionCorreosDestino, setConciliacionCorreosDestino] = useState<string[]>([]);

    const [uiMessage, setUiMessage] = useState<{
        type: "success" | "error" | "warning";
        text: string;
    } | null>(null);

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

    const showUiMessage = (
        type: "success" | "error" | "warning",
        text: string
    ) => {
        setUiMessage({ type, text });

        window.setTimeout(() => {
            setUiMessage(null);
        }, 5000);
    };

    const getErrorMessage = (error: any, fallback: string) => {
        return (
            error?.response?.data?.error ||
            error?.response?.data?.message ||
            error?.response?.data?.detail ||
            error?.message ||
            fallback
        );
    };

    const handleConciliar = (row: RcvConciliacionRow) => {
        setConciliacionRow(row);
        setConciliacionFormaPago(row.formaPago ?? "TRANSFERENCIA");
        setConciliacionFecha(dayjs());
        setConciliacionObservacion(row.observacion ?? "");

        setConciliacionEnviarCorreo(false);
        setConciliacionCorreoInput("");
        setConciliacionCorreosDestino([]);

        setConciliacionModalOpen(true);
    };

    const isValidEmail = (value: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
    };

    const handleAgregarCorreoDestino = () => {
        const email = conciliacionCorreoInput.trim().toLowerCase();

        if (!email) {
            showUiMessage("warning", "Debes ingresar un correo destino.");
            return;
        }

        if (!isValidEmail(email)) {
            showUiMessage("warning", "Debes ingresar un correo válido.");
            return;
        }

        if (conciliacionCorreosDestino.includes(email)) {
            showUiMessage("warning", "Este correo ya fue agregado.");
            return;
        }

        setConciliacionCorreosDestino((prev) => [...prev, email]);
        setConciliacionCorreoInput("");
    };

    const handleQuitarCorreoDestino = (email: string) => {
        setConciliacionCorreosDestino((prev) =>
            prev.filter((item) => item !== email)
        );
    };

    const resetConciliacionModal = () => {
        setConciliacionModalOpen(false);
        setConciliacionRow(null);
        setConciliacionFormaPago("TRANSFERENCIA");
        setConciliacionFecha(dayjs());
        setConciliacionObservacion("");
        setConciliacionEnviarCorreo(false);
        setConciliacionCorreoInput("");
        setConciliacionCorreosDestino([]);
    };

    const handleGuardarConciliacion = async () => {
        if (!conciliacionRow) return;

        const formaPago = conciliacionFormaPago.trim();

        if (!formaPago) {
            showUiMessage("warning", "Debes seleccionar una forma de pago o validación.");
            return;
        }

        if (!conciliacionFecha || !conciliacionFecha.isValid()) {
            showUiMessage("warning", "Debes seleccionar la fecha de conciliación.");
            return;
        }

        if (conciliacionEnviarCorreo && conciliacionCorreosDestino.length === 0) {
            showUiMessage("warning", "Debes agregar al menos un correo destino.");
            return;
        }

        try {
            setConciliacionSaving(true);

            await conciliarRcv({
                empresa: conciliacionRow.empresaKey,
                tipoRcv: conciliacionRow.tipoRcv,
                tipoDoc: conciliacionRow.tipoDoc,
                folio: conciliacionRow.folio,
                rutContraparte: conciliacionRow.rutContraparte,
                razonSocial: conciliacionRow.razonSocial,
                fechaDocto: conciliacionRow.fechaDocto,
                montoNeto: conciliacionRow.montoNeto,
                montoIva: conciliacionRow.montoIva,
                montoTotal: conciliacionRow.montoTotal,
                estadoRcv: conciliacionRow.estadoRcv,
                origenRcv: conciliacionRow.origenRcv,
                formaPago,
                observacion: conciliacionObservacion.trim() || null,
                conciliadoAt: conciliacionFecha
                    .hour(12)
                    .minute(0)
                    .second(0)
                    .millisecond(0)
                    .toISOString(),
                enviarCorreo: conciliacionEnviarCorreo,
                correoDestino: conciliacionEnviarCorreo ? conciliacionCorreosDestino : [],
            });

            resetConciliacionModal();

            await cargarConciliacion(false);

            showUiMessage("success", "Documento conciliado correctamente.");
        } catch (error: any) {
            console.error("Error conciliando documento", {
                status: error?.response?.status,
                data: error?.response?.data,
                message: error?.message,
            });

            showUiMessage(
                "error",
                getErrorMessage(error, "No se pudo conciliar el documento.")
            );
        } finally {
            setConciliacionSaving(false);
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
            showUiMessage("success", "Documento desconciliado correctamente.");
        } catch (error) {
            console.error("Error desconciliando documento", error);
            showUiMessage(
                "error",
                getErrorMessage(error, "No se pudo desconciliar el documento.")
            );
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
            showUiMessage("warning", "Debes ingresar una observación.");
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

            showUiMessage("success", "Observación guardada correctamente.");
        } catch (error) {
            console.error("Error observando documento", error);
            showUiMessage("error",
                getErrorMessage(error, "No se pudo guardar la observación.")
            );
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
            {conciliacionModalOpen && conciliacionRow && (
                <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
                    <div className="conciliacion-modal w-full overflow-visible rounded-t-3xl border border-emerald-200 bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl">
                        <div className="border-b border-emerald-100 bg-emerald-50/80 px-5 py-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900">
                                        Conciliar documento
                                    </h3>

                                    <p className="mt-1 text-sm text-slate-600">
                                        Folio {conciliacionRow.folio} · {conciliacionRow.razonSocial || "Sin razón social"}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (conciliacionSaving) return;

                                        resetConciliacionModal();
                                    }}
                                    disabled={conciliacionSaving}
                                    className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
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
                                        {conciliacionRow.tipoDoc}
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
                                        }).format(conciliacionRow.montoTotal ?? 0)}
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-bold text-slate-700">
                                    Forma de pago / validación
                                </label>

                                <select
                                    value={conciliacionFormaPago}
                                    onChange={(e) => setConciliacionFormaPago(e.target.value)}
                                    disabled={conciliacionSaving}
                                    className="h-11 w-full rounded-2xl border border-emerald-200 bg-emerald-50/30 px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    <option value="TRANSFERENCIA">Transferencia</option>
                                    <option value="EFECTIVO">Efectivo</option>
                                    <option value="TARJETA">Tarjeta</option>
                                    <option value="CHEQUE">Cheque</option>
                                    <option value="CONTADO">Contado</option>
                                    <option value="CREDITO">Crédito</option>
                                    <option value="VALIDACION_MANUAL">Validación manual</option>
                                    <option value="OTRO">Otro</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-bold text-slate-700">
                                    Fecha de conciliación
                                </label>

                                <DatePicker
                                    value={conciliacionFecha}
                                    onChange={(date) => setConciliacionFecha(date)}
                                    disabled={conciliacionSaving}
                                    locale={locale}
                                    format="DD-MM-YYYY"
                                    placeholder="Selecciona la fecha de conciliación"
                                    allowClear={false}
                                    getPopupContainer={(triggerNode) =>
                                        triggerNode.closest(".conciliacion-modal") as HTMLElement
                                    }
                                    className="h-11 w-full rounded-2xl border border-emerald-200 bg-emerald-50/30 px-4 text-sm font-semibold text-slate-800"
                                />

                                <p className="mt-2 text-xs text-slate-400">
                                    Esta será la fecha registrada como fecha de conciliación interna.
                                </p>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-bold text-slate-700">
                                    Observación opcional
                                </label>

                                <textarea
                                    value={conciliacionObservacion}
                                    onChange={(e) => setConciliacionObservacion(e.target.value)}
                                    rows={4}
                                    disabled={conciliacionSaving}
                                    placeholder="Ej: Pago verificado contra cartola bancaria, validado por transferencia, conciliación manual..."
                                    className="w-full resize-none rounded-2xl border border-emerald-200 bg-emerald-50/30 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                                />
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                <label className="flex cursor-pointer items-start gap-3">
                                    <input
                                        type="checkbox"
                                        checked={conciliacionEnviarCorreo}
                                        onChange={(e) => {
                                            const checked = e.target.checked;

                                            setConciliacionEnviarCorreo(checked);

                                            if (!checked) {
                                                setConciliacionCorreoInput("");
                                                setConciliacionCorreosDestino([]);
                                            }
                                        }}
                                        disabled={conciliacionSaving}
                                        className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                    />

                                    <div>
                                        <p className="text-sm font-bold text-slate-700">
                                            Enviar documento conciliado por correo
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-400">
                                            Puedes agregar uno o más destinatarios de forma manual.
                                        </p>
                                    </div>
                                </label>

                                {conciliacionEnviarCorreo && (
                                    <div className="mt-4 space-y-3">
                                        <div>
                                            <label className="mb-2 block text-sm font-bold text-slate-700">
                                                Nuevo destinatario
                                            </label>

                                            <div className="flex flex-col gap-2 sm:flex-row">
                                                <input
                                                    type="email"
                                                    value={conciliacionCorreoInput}
                                                    onChange={(e) => setConciliacionCorreoInput(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            e.preventDefault();
                                                            handleAgregarCorreoDestino();
                                                        }
                                                    }}
                                                    disabled={conciliacionSaving}
                                                    placeholder="correo@dominio.cl"
                                                    className="h-11 flex-1 rounded-2xl border border-emerald-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                                                />

                                                <button
                                                    type="button"
                                                    onClick={handleAgregarCorreoDestino}
                                                    disabled={conciliacionSaving}
                                                    className="h-11 rounded-2xl border border-emerald-300 bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
                                                >
                                                    Agregar
                                                </button>
                                            </div>

                                            <p className="mt-2 text-xs text-slate-400">
                                                Escribe un correo y presiona “Agregar” o Enter.
                                            </p>
                                        </div>

                                        {conciliacionCorreosDestino.length > 0 ? (
                                            <div className="rounded-2xl border border-emerald-100 bg-white p-3">
                                                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                                                    Destinatarios agregados
                                                </p>

                                                <div className="flex flex-wrap gap-2">
                                                    {conciliacionCorreosDestino.map((email) => (
                                                        <span
                                                            key={email}
                                                            className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                                                        >
                                                            {email}

                                                            <button
                                                                type="button"
                                                                onClick={() => handleQuitarCorreoDestino(email)}
                                                                disabled={conciliacionSaving}
                                                                className="rounded-full text-emerald-700 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                                                                title="Quitar destinatario"
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                                                Aún no has agregado destinatarios.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                disabled={conciliacionSaving}
                                onClick={() => {
                                    resetConciliacionModal();
                                }}
                                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                disabled={conciliacionSaving}
                                onClick={handleGuardarConciliacion}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {conciliacionSaving ? (
                                    <>
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Conciliando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircleOutlined />
                                        Conciliar documento
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
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
            {uiMessage && (
                <div
                    className={`fixed right-5 top-5 z-[10000] max-w-md rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-xl ${uiMessage.type === "success"
                        ? "bg-emerald-600"
                        : uiMessage.type === "warning"
                            ? "bg-amber-600"
                            : "bg-rose-600"
                        }`}
                >
                    <div className="flex items-start gap-2">
                        {uiMessage.type === "success" ? (
                            <CheckCircleOutlined className="mt-0.5" />
                        ) : uiMessage.type === "warning" ? (
                            <WarningOutlined className="mt-0.5" />
                        ) : (
                            <CloseCircleOutlined className="mt-0.5" />
                        )}

                        <span>{uiMessage.text}</span>

                        <button
                            type="button"
                            onClick={() => setUiMessage(null)}
                            className="ml-2 text-white/80 hover:text-white"
                        >
                            ×
                        </button>
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