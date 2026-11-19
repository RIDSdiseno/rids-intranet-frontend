// src/components/modals-facturasBaseapi/finanzas/banco/ConciliarFacturaModal.tsx
// Fase 4b: «Conciliar con banco» desde el menú de una factura (pestaña Facturas y ficha del cliente).
// Muestra los pagos pendientes de la cartola ordenados por cuánto se parecen a esta factura
// (propuesto por el sistema, mismo RUT, folio en la referencia, monto igual al saldo) y permite asignar uno.
// Si el pago es mayor que el saldo, abre el editor de asignación para repartirlo entre más facturas.

import React, { useEffect, useMemo, useState } from "react";

import { Landmark, Search, Sparkles, X } from "lucide-react";

import { api } from "../../../../api/api";

import type { DocumentoCxc, EmpresaCxc } from "../cxc.types";
import AsignarMovimientoModal from "./AsignarMovimientoModal";
import type { MovimientoBanco, MovimientosResponse } from "./banco.types";

function formatCLP(value: number) {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value);
}

function formatFecha(value: string | null | undefined) {
    const m = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : "—";
}

function formatRut(rut: string | null) {
    const limpio = String(rut ?? "").replace(/[^0-9kK]/g, "").toUpperCase();
    return limpio.length > 1 ? `${limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${limpio.slice(-1)}` : "Sin RUT";
}

function mensajeError(err: any, porDefecto: string) {
    return String(err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message ?? porDefecto);
}

const normalizarRut = (v: string | null) => String(v ?? "").replace(/[^0-9kK]/g, "").toUpperCase();

type Candidato = { mov: MovimientoBanco; puntos: number; razones: string[] };

type Props = {
    empresa: EmpresaCxc;
    documento: DocumentoCxc;
    onClose: () => void;
    onConciliado: (mensaje: string) => void;
};

const ConciliarFacturaModal: React.FC<Props> = ({ empresa, documento, onClose, onConciliado }) => {
    const [pendientes, setPendientes] = useState<MovimientoBanco[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [guardando, setGuardando] = useState<number | null>(null);
    const [repartir, setRepartir] = useState<MovimientoBanco | null>(null);

    const pagada = documento.estado === "PAGADO";
    /** Lo que se puede asignar a esta factura: el saldo si está abierta, el monto − NC si ya está pagada (vínculo). */
    const objetivo = pagada ? documento.montoOriginal - documento.montoNotasCredito : documento.saldo;

    useEffect(() => {
        api.get<MovimientosResponse>("/baseapi/finanzas/banco/movimientos", { params: { empresa } })
            .then((r) => setPendientes(r.data.data.movimientos.filter((m) => m.estado === "PENDIENTE")))
            .catch((err) => setError(mensajeError(err, "No se pudieron cargar los pagos de la cartola.")))
            .finally(() => setCargando(false));
    }, [empresa]);

    const candidatos = useMemo<Candidato[]>(() => {
        const rutDoc = normalizarRut(documento.rutContraparte);
        const folioRe = new RegExp(`(^|\\D)${documento.folio}(\\D|$)`);
        const texto = busqueda.trim().toLowerCase();

        return pendientes
            .map((mov) => {
                const razones: string[] = [];
                let puntos = 0;

                if (
                    mov.propuesta?.asignaciones.some(
                        (a) => a.tipoDoc === documento.tipoDoc && a.folio === documento.folio && normalizarRut(a.rutContraparte) === rutDoc,
                    )
                ) {
                    puntos += 8;
                    razones.push("Propuesto por el sistema");
                }
                if (normalizarRut(mov.rutPagador) === rutDoc) {
                    puntos += 4;
                    razones.push("Mismo RUT");
                }
                if (folioRe.test(mov.referencia ?? "")) {
                    puntos += 4;
                    razones.push("Folio en la referencia");
                }
                if (mov.monto === objetivo) {
                    puntos += 3;
                    razones.push("Monto exacto");
                }

                return { mov, puntos, razones };
            })
            .filter(
                ({ mov, puntos }) =>
                (texto
                    ? (mov.nombrePagador ?? "").toLowerCase().includes(texto) ||
                    (mov.referencia ?? "").toLowerCase().includes(texto) ||
                    String(mov.monto).includes(texto.replace(/\D/g, "") || "x") ||
                    normalizarRut(mov.rutPagador).includes(texto.replace(/[^0-9k]/gi, "").toUpperCase() || "x")
                    : puntos > 0),
            )
            .sort((a, b) => b.puntos - a.puntos || b.mov.fecha.localeCompare(a.mov.fecha))
            .slice(0, 30);
    }, [pendientes, documento, objetivo, busqueda]);

    const asignar = async (mov: MovimientoBanco) => {
        // El pago cubre más que esta factura: se reparte en el editor.
        if (mov.monto > objetivo && !pagada) {
            setRepartir({
                ...mov,
                propuesta: {
                    tipo: "SUGERIDO",
                    motivo: `El pago (${formatCLP(mov.monto)}) es mayor que el saldo de ${documento.tipoDoc}-${documento.folio}: agrega las otras facturas que paga.`,
                    asignaciones: [
                        {
                            tipoDoc: documento.tipoDoc,
                            folio: documento.folio,
                            rutContraparte: documento.rutContraparte,
                            razonSocial: documento.razonSocial,
                            fechaEmision: documento.fechaEmision,
                            estado: documento.estado,
                            saldo: documento.saldo,
                            monto: documento.saldo,
                            accion: "ABONO",
                        },
                    ],
                },
            });
            return;
        }

        setGuardando(mov.id);
        setError("");
        try {
            await api.post(`/baseapi/finanzas/banco/movimientos/${mov.id}/confirmar`, {
                empresa,
                asignaciones: [{ tipoDoc: documento.tipoDoc, folio: documento.folio, rutContraparte: documento.rutContraparte, monto: mov.monto }],
            });
            onConciliado(
                pagada
                    ? `${documento.tipoDoc}-${documento.folio} vinculada al pago de ${mov.nombrePagador ?? formatRut(mov.rutPagador)} del ${formatFecha(mov.fecha)}.`
                    : `${documento.tipoDoc}-${documento.folio}: abono de ${formatCLP(mov.monto)} desde la cartola (${formatFecha(mov.fecha)}).`,
            );
        } catch (err: any) {
            setError(mensajeError(err, "No se pudo conciliar."));
        } finally {
            setGuardando(null);
        }
    };

    if (repartir) {
        return (
            <AsignarMovimientoModal
                empresa={empresa}
                movimiento={repartir}
                onClose={() => setRepartir(null)}
                onConfirmado={onConciliado}
            />
        );
    }

    return (
        <div
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/40 p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget && guardando === null) onClose();
            }}
        >
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
                        <Landmark size={16} className="text-cyan-600" /> Conciliar con banco · {documento.tipoDoc}-{documento.folio}
                    </h3>
                    <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Cerrar">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 text-sm">
                    <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                        <div className="font-bold text-slate-800">{documento.razonSocial}</div>
                        <div>
                            {formatRut(documento.rutContraparte)} · emitida {formatFecha(documento.fechaEmision)} ·{" "}
                            {pagada ? (
                                <>ya pagada: el pago se vincula como respaldo, sin crear otro abono.</>
                            ) : (
                                <>
                                    saldo <strong className="text-slate-900">{formatCLP(documento.saldo)}</strong>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="relative">
                        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar otro pago: pagador, RUT, referencia o monto"
                            className="h-9 w-full rounded-xl border border-slate-200 pl-7 pr-3 text-xs outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                        />
                    </div>

                    {cargando && <div className="py-6 text-center text-xs text-slate-400">Cargando pagos de la cartola...</div>}
                    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</div>}

                    {!cargando && candidatos.length === 0 && (
                        <div className="rounded-xl border border-slate-200 p-4 text-center text-xs text-slate-500">
                            {pendientes.length === 0
                                ? "No hay pagos pendientes de la cartola. Cárgala en la pestaña «Conciliación bancaria», o usa «Registrar pago o abono» si el pago no pasó por el banco."
                                : busqueda
                                    ? "Ningún pago pendiente coincide con la búsqueda."
                                    : "Ningún pago pendiente se parece a esta factura. Búscalo por pagador, referencia o monto."}
                        </div>
                    )}

                    {candidatos.length > 0 && (
                        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                            {candidatos.map(({ mov, razones }) => (
                                <li key={mov.id} className="flex items-start justify-between gap-3 px-3 py-2.5 text-xs">
                                    <div className="min-w-0">
                                        <div className="font-bold text-slate-800">
                                            {mov.nombrePagador ?? "—"} <span className="font-normal text-slate-400">· {formatRut(mov.rutPagador)}</span>
                                        </div>
                                        <div className="text-[11px] text-slate-500">
                                            {formatFecha(mov.fecha)} {mov.hora?.slice(0, 5)}
                                            {mov.referencia ? ` · «${mov.referencia}»` : ""}
                                        </div>
                                        {razones.length > 0 && (
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {razones.map((r) => (
                                                    <span key={r} className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                                                        {r === "Propuesto por el sistema" && <Sparkles size={9} />} {r}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-1">
                                        <span className="text-sm font-black text-slate-900">{formatCLP(mov.monto)}</span>
                                        <button
                                            type="button"
                                            onClick={() => void asignar(mov)}
                                            disabled={guardando !== null}
                                            className="rounded-lg bg-cyan-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-cyan-500 disabled:opacity-60"
                                        >
                                            {guardando === mov.id ? "Conciliando..." : mov.monto > objetivo && !pagada ? "Repartir…" : pagada ? "Vincular" : "Conciliar"}
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    {!pagada && (
                        <div className="text-[11px] text-slate-400">
                            Si el pago es menor que el saldo queda como abono parcial. Si es mayor, se abre el editor para repartirlo entre varias facturas.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConciliarFacturaModal;