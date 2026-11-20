// src/components/modals-facturasBaseapi/finanzas/PagosDocumentoCxcModal.tsx
// Fase 4a: pagos y abonos de una factura (pestaña Facturas y ficha del cliente).
// Fuente: GET/POST /baseapi/finanzas/cxc/pagos · DELETE /baseapi/finanzas/cxc/pagos/:id
// Un pago menor a lo pendiente queda como abono; cuando los abonos completan el saldo, la factura queda pagada.

import React, { useCallback, useEffect, useState } from "react";

import { Tooltip } from "antd";
import { CheckCircle2, Trash2, Wallet, X } from "lucide-react";

import { api } from "../../../api/api";

import type { DocumentoCxc, EmpresaCxc, PagosDocumentoCxc } from "./cxc.types";

/* =========================================================
   HELPERS
========================================================= */

function formatCLP(value: number) {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value);
}

function formatFecha(value: string | null | undefined) {
    const m = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : "—";
}

function hoyChile() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function mensajeError(err: any, porDefecto: string) {
    return String(err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message ?? porDefecto);
}

/** "1.234.567" o "$1.234.567" → 1234567 */
function parseMonto(texto: string) {
    const limpio = texto.replace(/[^0-9]/g, "");
    return limpio ? Number(limpio) : 0;
}

export const FORMAS_PAGO = [
    { value: "TRANSFERENCIA", label: "Transferencia" },
    { value: "EFECTIVO", label: "Efectivo" },
    { value: "TARJETA", label: "Tarjeta" },
    { value: "CHEQUE", label: "Cheque" },
    { value: "CONTADO", label: "Contado" },
    { value: "CREDITO", label: "Crédito" },
    { value: "VALIDACION_MANUAL", label: "Validación manual" },
    { value: "OTRO", label: "Otro" },
];

const inputClase =
    "h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100";

/* =========================================================
   COMPONENTE
========================================================= */

/** Resultado del «Pago recibido» (backend: pago-recibido.service). */
type AvisoPago = { enviados: string[]; errores: Array<{ email: string; error: string }>; omitido: string | null };

function textoAviso(aviso: AvisoPago | null | undefined) {
    if (!aviso) return "";
    if (aviso.enviados.length > 0) return ` Aviso de pago enviado a ${aviso.enviados.join(", ")}.`;
    if (aviso.errores.length > 0) return ` No se pudo enviar el aviso de pago: ${aviso.errores[0]?.error ?? "error"}.`;
    return aviso.omitido ? ` Sin aviso de pago: ${aviso.omitido}` : "";
}

type Props = {
    empresa: EmpresaCxc;
    documento: DocumentoCxc;
    onClose: () => void;
    /** Se registró o eliminó un abono: hay que recargar la lista. */
    onCambio: (mensaje: string) => void;
};

const PagosDocumentoCxcModal: React.FC<Props> = ({ empresa, documento, onClose, onCambio }) => {
    const [pagos, setPagos] = useState<PagosDocumentoCxc | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    const [monto, setMonto] = useState("");
    const [fechaPago, setFechaPago] = useState(hoyChile());
    const [formaPago, setFormaPago] = useState("TRANSFERENCIA");
    const [observacion, setObservacion] = useState("");
    const [avisarCliente, setAvisarCliente] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [borrarId, setBorrarId] = useState<number | null>(null);

    const claveDoc = { empresa, tipoDoc: documento.tipoDoc, folio: documento.folio, rutContraparte: documento.rutContraparte };

    const cargar = useCallback(async () => {
        setCargando(true);
        setError("");
        try {
            const response = await api.get<{ ok: boolean; data: PagosDocumentoCxc }>("/baseapi/finanzas/cxc/pagos", { params: claveDoc });
            setPagos(response.data.data);
            setMonto(new Intl.NumberFormat("es-CL").format(response.data.data.pendiente));
        } catch (err: any) {
            setError(mensajeError(err, "No se pudieron cargar los pagos."));
        } finally {
            setCargando(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [empresa, documento.key]);

    useEffect(() => {
        void cargar();
    }, [cargar]);

    const montoNumero = parseMonto(monto);
    const esTotal = !!pagos && montoNumero === pagos.pendiente;

    const registrar = async () => {
        if (!pagos) return;
        setGuardando(true);
        setError("");
        try {
            const response = await api.post<{ ok: boolean; data: { pagos: PagosDocumentoCxc; conciliada: boolean; aviso?: AvisoPago | null } }>(
                "/baseapi/finanzas/cxc/pagos",
                {
                    ...claveDoc,
                    monto: montoNumero,
                    fechaPago,
                    formaPago,
                    observacion: observacion.trim() || null,
                    avisarCliente: esTotal && avisarCliente,
                },
            );
            const { pagos: nuevos, conciliada, aviso } = response.data.data;
            setPagos(nuevos);
            setMonto(new Intl.NumberFormat("es-CL").format(nuevos.pendiente));
            setObservacion("");
            onCambio(
                conciliada
                    ? `Pago registrado: ${documento.tipoDoc}-${documento.folio} queda pagada.${textoAviso(aviso)}`
                    : `Abono de ${formatCLP(montoNumero)} registrado en ${documento.tipoDoc}-${documento.folio}. Pendiente ${formatCLP(nuevos.pendiente)}.`,
            );
        } catch (err: any) {
            setError(mensajeError(err, "No se pudo registrar el pago."));
        } finally {
            setGuardando(false);
        }
    };

    const eliminar = async (id: number) => {
        setGuardando(true);
        setError("");
        try {
            const response = await api.delete<{ ok: boolean; data: { pagos: PagosDocumentoCxc; desconciliada: boolean } }>(
                `/baseapi/finanzas/cxc/pagos/${id}`,
                { params: claveDoc },
            );
            const { pagos: nuevos, desconciliada } = response.data.data;
            setPagos(nuevos);
            setMonto(new Intl.NumberFormat("es-CL").format(nuevos.pendiente));
            setBorrarId(null);
            onCambio(
                desconciliada
                    ? `Abono eliminado: ${documento.tipoDoc}-${documento.folio} vuelve a quedar por cobrar.`
                    : `Abono eliminado de ${documento.tipoDoc}-${documento.folio}.`,
            );
        } catch (err: any) {
            setError(mensajeError(err, "No se pudo eliminar el abono."));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/40 p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget && !guardando) onClose();
            }}
        >
            <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
                        <Wallet size={16} className="text-cyan-600" /> Pagos · {documento.tipoDoc}-{documento.folio}
                    </h3>
                    <button type="button" onClick={onClose} disabled={guardando} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Cerrar">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
                    <div className="text-xs font-bold text-slate-800">{documento.razonSocial ?? "—"}</div>

                    {cargando && !pagos && <div className="py-6 text-center text-xs text-slate-400">Cargando pagos...</div>}
                    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</div>}

                    {pagos && (
                        <>
                            {/* Montos */}
                            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs sm:grid-cols-4">
                                <Dato label="Monto" valor={formatCLP(pagos.montoOriginal)} />
                                <Dato label="Notas de crédito" valor={pagos.montoNotasCredito ? `− ${formatCLP(pagos.montoNotasCredito)}` : "—"} />
                                <Dato label="Abonado" valor={pagos.montoAbonado ? `− ${formatCLP(pagos.montoAbonado)}` : "—"} />
                                <Dato label="Pendiente" valor={formatCLP(pagos.pendiente)} clase={pagos.pendiente > 0 ? "text-red-600" : "text-emerald-600"} />
                            </div>

                            {pagos.conciliada && (
                                <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                                    <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                                    <span>
                                        Pagada el <strong>{formatFecha(pagos.conciliadoAt)}</strong>
                                        {pagos.formaPagoConciliacion ? ` (${pagos.formaPagoConciliacion})` : ""}.
                                        {pagos.conciliadaSinAbonos && " Se registró como pago total, sin abonos: para quitarlo usa «Anular pago»."}
                                    </span>
                                </div>
                            )}

                            {/* Abonos */}
                            <div>
                                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Abonos registrados</div>
                                {pagos.abonos.length === 0 ? (
                                    <div className="text-xs text-slate-400">Sin abonos.</div>
                                ) : (
                                    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                                        {pagos.abonos.map((a) => (
                                            <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                                                <div className="min-w-0">
                                                    <div className="font-bold text-slate-900">{formatCLP(a.monto)}</div>
                                                    <div className="text-[10px] text-slate-500">
                                                        {formatFecha(a.fechaPago)}
                                                        {a.formaPago ? ` · ${a.formaPago}` : ""}
                                                        {a.origen !== "MANUAL" ? ` · ${a.origen.toLowerCase()}` : ""}
                                                        {a.responsable ? ` · ${a.responsable}` : ""}
                                                    </div>
                                                    {a.observacion && <div className="truncate text-[10px] text-slate-400">{a.observacion}</div>}
                                                </div>
                                                {borrarId === a.id ? (
                                                    <span className="flex shrink-0 items-center gap-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => void eliminar(a.id)}
                                                            disabled={guardando}
                                                            className="rounded-lg bg-red-600 px-2 py-1 text-[10px] font-bold text-white disabled:opacity-60"
                                                        >
                                                            Eliminar
                                                        </button>
                                                        <button type="button" onClick={() => setBorrarId(null)} className="rounded-lg border px-2 py-1 text-[10px] font-bold text-slate-600">
                                                            No
                                                        </button>
                                                    </span>
                                                ) : (
                                                    <Tooltip title={pagos.conciliada ? "Eliminar este abono deja la factura por cobrar." : "Eliminar abono"}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setBorrarId(a.id)}
                                                            className="shrink-0 rounded-lg p-1 text-red-500 hover:bg-red-50"
                                                            aria-label="Eliminar abono"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </Tooltip>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* Registrar */}
                            {!pagos.conciliada && pagos.pendiente > 0 && (
                                <div className="space-y-3 rounded-xl border border-slate-200 p-3">
                                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Registrar pago</div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <label className="block">
                                            <span className="mb-1 block text-[10px] font-bold text-slate-500">Monto</span>
                                            <input
                                                inputMode="numeric"
                                                value={monto}
                                                onChange={(e) => {
                                                    const n = parseMonto(e.target.value);
                                                    setMonto(n ? new Intl.NumberFormat("es-CL").format(n) : "");
                                                }}
                                                className={inputClase}
                                            />
                                        </label>
                                        <label className="block">
                                            <span className="mb-1 block text-[10px] font-bold text-slate-500">Fecha de pago</span>
                                            <input type="date" value={fechaPago} max={hoyChile()} onChange={(e) => setFechaPago(e.target.value)} className={inputClase} />
                                        </label>
                                    </div>
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-bold text-slate-500">Forma de pago</span>
                                        <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)} className={inputClase}>
                                            {FORMAS_PAGO.map((f) => (
                                                <option key={f.value} value={f.value}>
                                                    {f.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-bold text-slate-500">Observación (opcional)</span>
                                        <input value={observacion} onChange={(e) => setObservacion(e.target.value)} className={inputClase} />
                                    </label>
                                    {esTotal && (
                                        <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                                            <input type="checkbox" checked={avisarCliente} onChange={(e) => setAvisarCliente(e.target.checked)} className="h-3.5 w-3.5 accent-emerald-600" />
                                            Avisar al cliente («Pago recibido» a sus contactos de Cobranza)
                                        </label>
                                    )}
                                    <div className="flex items-center justify-between gap-2">
                                        <span className={`text-[11px] ${montoNumero > pagos.pendiente ? "font-semibold text-red-600" : "text-slate-500"}`}>
                                            {montoNumero > pagos.pendiente
                                                ? "El monto supera lo pendiente."
                                                : esTotal
                                                    ? "Pago total: la factura queda pagada."
                                                    : montoNumero > 0
                                                        ? `Abono parcial: quedan ${formatCLP(pagos.pendiente - montoNumero)}.`
                                                        : ""}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => void registrar()}
                                            disabled={guardando || !fechaPago || montoNumero <= 0 || montoNumero > pagos.pendiente}
                                            className="shrink-0 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500 disabled:opacity-60"
                                        >
                                            {guardando ? "Guardando..." : esTotal ? "Registrar pago" : "Registrar abono"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const Dato: React.FC<{ label: string; valor: string; clase?: string }> = ({ label, valor, clase = "" }) => (
    <div>
        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
        <div className={`font-black text-slate-900 ${clase}`}>{valor}</div>
    </div>
);

export default PagosDocumentoCxcModal;