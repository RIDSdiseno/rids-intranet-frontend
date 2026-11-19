// src/components/modals-facturasBaseapi/finanzas/banco/AsignarMovimientoModal.tsx
// Fase 4b: revisar o cambiar a qué facturas va un pago de la cartola antes de confirmarlo.
// Parte de la propuesta del motor; se pueden quitar facturas, cambiar montos o buscar otras.
// Facturas abiertas → abono · facturas ya pagadas → solo vínculo (no se crea otro pago).
// POST /baseapi/finanzas/banco/movimientos/:id/confirmar

import React, { useEffect, useMemo, useState } from "react";

import { Link2, Plus, Search, Trash2, X } from "lucide-react";

import { api } from "../../../../api/api";

import type { DocumentoCxc, DocumentosCxcResponse, EmpresaCxc } from "../cxc.types";
import type { MovimientoBanco } from "./banco.types";

function formatCLP(value: number) {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value);
}

function formatFecha(value: string | null | undefined) {
    const m = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : "—";
}

function formatRut(rut: string) {
    const limpio = rut.replace(/[^0-9kK]/g, "").toUpperCase();
    return limpio.length > 1 ? `${limpio.slice(0, -1)}-${limpio.slice(-1)}` : limpio;
}

function mensajeError(err: any, porDefecto: string) {
    return String(err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message ?? porDefecto);
}

function parseMonto(texto: string) {
    const limpio = texto.replace(/[^0-9]/g, "");
    return limpio ? Number(limpio) : 0;
}

type Linea = {
    tipoDoc: string;
    folio: string;
    rutContraparte: string;
    razonSocial: string | null;
    fechaEmision: string | null;
    estado: DocumentoCxc["estado"];
    saldo: number;
    monto: number;
};

const claveLinea = (l: { tipoDoc: string; folio: string; rutContraparte: string }) =>
    `${l.tipoDoc}|${l.folio}|${l.rutContraparte.replace(/[^0-9kK]/g, "").toUpperCase()}`;

type Props = {
    empresa: EmpresaCxc;
    movimiento: MovimientoBanco;
    onClose: () => void;
    onConfirmado: (mensaje: string) => void;
};

const AsignarMovimientoModal: React.FC<Props> = ({ empresa, movimiento, onClose, onConfirmado }) => {
    const [lineas, setLineas] = useState<Linea[]>(
        (movimiento.propuesta?.asignaciones ?? []).map((a) => ({
            tipoDoc: a.tipoDoc,
            folio: a.folio,
            rutContraparte: a.rutContraparte,
            razonSocial: a.razonSocial,
            fechaEmision: a.fechaEmision,
            estado: a.estado,
            saldo: a.saldo,
            monto: a.monto,
        })),
    );
    const [docs, setDocs] = useState<DocumentoCxc[]>([]);
    const [busqueda, setBusqueda] = useState("");
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        api.get<DocumentosCxcResponse>("/baseapi/finanzas/cxc/documentos", { params: { empresa } })
            .then((r) => setDocs(r.data.data.documentos))
            .catch((err) => setError(mensajeError(err, "No se pudieron cargar las facturas.")));
    }, [empresa]);

    const suma = lineas.reduce((s, l) => s + l.monto, 0);
    const restante = movimiento.monto - suma;

    const resultados = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();
        if (texto.length < 2) return [];
        const digitos = texto.replace(/[^0-9k]/g, "");
        const usadas = new Set(lineas.map(claveLinea));

        return docs
            .filter((d) => d.estado !== "COMPENSADO" && ["33", "34", "56"].includes(d.tipoDoc) && !usadas.has(claveLinea(d)))
            .filter(
                (d) =>
                    d.folio === texto.replace(/\D/g, "") ||
                    (d.razonSocial ?? "").toLowerCase().includes(texto) ||
                    (digitos.length >= 6 && d.rutContraparte.toLowerCase().includes(digitos)),
            )
            .sort((a, b) => Number(b.estado !== "PAGADO") - Number(a.estado !== "PAGADO") || String(a.fechaEmision).localeCompare(String(b.fechaEmision)))
            .slice(0, 15);
    }, [busqueda, docs, lineas]);

    const agregar = (d: DocumentoCxc) => {
        const abierta = d.estado !== "PAGADO";
        const disponible = Math.max(0, restante);
        setLineas((ls) => [
            ...ls,
            {
                tipoDoc: d.tipoDoc,
                folio: d.folio,
                rutContraparte: d.rutContraparte,
                razonSocial: d.razonSocial,
                fechaEmision: d.fechaEmision,
                estado: d.estado,
                saldo: d.saldo,
                monto: abierta ? Math.min(d.saldo, disponible) : disponible,
            },
        ]);
        setBusqueda("");
    };

    const excedidas = lineas.filter((l) => l.estado !== "PAGADO" && l.monto > l.saldo);
    const valido = lineas.length > 0 && restante === 0 && excedidas.length === 0 && lineas.every((l) => l.monto > 0);

    const confirmar = async () => {
        setGuardando(true);
        setError("");
        try {
            await api.post(`/baseapi/finanzas/banco/movimientos/${movimiento.id}/confirmar`, {
                empresa,
                asignaciones: lineas.map((l) => ({ tipoDoc: l.tipoDoc, folio: l.folio, rutContraparte: l.rutContraparte, monto: l.monto })),
            });
            onConfirmado(
                `Pago de ${movimiento.nombrePagador ?? movimiento.rutPagador ?? ""} (${formatCLP(movimiento.monto)}) conciliado con ${lineas
                    .map((l) => `${l.tipoDoc}-${l.folio}`)
                    .join(", ")}.`,
            );
        } catch (err: any) {
            setError(mensajeError(err, "No se pudo confirmar."));
        } finally {
            setGuardando(false);
        }
    };

    const inputClase =
        "h-8 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100";

    return (
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget && !guardando) onClose();
            }}
        >
            <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-3xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <h3 className="text-sm font-black text-slate-900">Asignar pago a facturas</h3>
                    <button type="button" onClick={onClose} disabled={guardando} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Cerrar">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
                    {/* Pago */}
                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs sm:grid-cols-4">
                        <div className="col-span-2">
                            <div className="font-bold text-slate-800">{movimiento.nombrePagador ?? "—"}</div>
                            <div className="text-[10px] text-slate-500">
                                {movimiento.rutPagador ? formatRut(movimiento.rutPagador) : "Sin RUT"} · {formatFecha(movimiento.fecha)} {movimiento.hora?.slice(0, 5)}
                            </div>
                            {movimiento.referencia && <div className="mt-1 text-[11px] text-slate-600">«{movimiento.referencia}»</div>}
                        </div>
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Monto</div>
                            <div className="text-sm font-black text-slate-900">{formatCLP(movimiento.monto)}</div>
                        </div>
                        <div>
                            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Por asignar</div>
                            <div className={`text-sm font-black ${restante === 0 ? "text-emerald-600" : "text-red-600"}`}>{formatCLP(restante)}</div>
                        </div>
                    </div>

                    {movimiento.propuesta && movimiento.propuesta.tipo !== "SIN_MATCH" && (
                        <div className="text-[11px] text-slate-500">Propuesta del sistema: {movimiento.propuesta.motivo}</div>
                    )}

                    {/* Líneas */}
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                        <table className="w-full text-xs">
                            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-3 py-2 text-left">Factura</th>
                                    <th className="px-3 py-2 text-left">Cliente</th>
                                    <th className="px-3 py-2 text-right">Saldo</th>
                                    <th className="w-36 px-3 py-2 text-right">Asignar</th>
                                    <th className="w-8 px-3 py-2" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {lineas.map((l, i) => {
                                    const pagada = l.estado === "PAGADO";
                                    return (
                                        <tr key={claveLinea(l)}>
                                            <td className="px-3 py-2">
                                                <div className="font-bold text-slate-800">
                                                    {l.tipoDoc}-{l.folio}
                                                </div>
                                                <div className="text-[10px] text-slate-400">emitida {formatFecha(l.fechaEmision)}</div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="font-semibold text-slate-700">{l.razonSocial ?? "—"}</div>
                                                <div className="text-[10px] text-slate-400">{formatRut(l.rutContraparte)}</div>
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                {pagada ? (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                                        <Link2 size={11} /> ya pagada · solo vínculo
                                                    </span>
                                                ) : (
                                                    formatCLP(l.saldo)
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                <input
                                                    inputMode="numeric"
                                                    value={l.monto ? new Intl.NumberFormat("es-CL").format(l.monto) : ""}
                                                    onChange={(e) => {
                                                        const monto = parseMonto(e.target.value);
                                                        setLineas((ls) => ls.map((x, j) => (j === i ? { ...x, monto } : x)));
                                                    }}
                                                    className={`${inputClase} text-right ${!pagada && l.monto > l.saldo ? "border-red-300" : ""}`}
                                                />
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => setLineas((ls) => ls.filter((_, j) => j !== i))}
                                                    className="rounded-lg p-1 text-red-500 hover:bg-red-50"
                                                    aria-label="Quitar"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {lineas.length === 0 && <div className="px-3 py-6 text-center text-xs text-slate-400">Busca una factura para asignar este pago.</div>}
                    </div>

                    {excedidas.length > 0 && (
                        <div className="text-[11px] font-semibold text-red-600">
                            {excedidas.map((l) => `${l.tipoDoc}-${l.folio}`).join(", ")}: el monto supera el saldo de la factura.
                        </div>
                    )}

                    {/* Buscar */}
                    <div>
                        <div className="relative">
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Agregar factura: folio, cliente o RUT"
                                className={`${inputClase} h-9 pl-7`}
                            />
                        </div>
                        {resultados.length > 0 && (
                            <ul className="mt-1 max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                                {resultados.map((d) => (
                                    <li key={d.key}>
                                        <button
                                            type="button"
                                            onClick={() => agregar(d)}
                                            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs hover:bg-cyan-50"
                                        >
                                            <span className="min-w-0">
                                                <span className="font-bold text-slate-800">
                                                    {d.tipoDoc}-{d.folio}
                                                </span>{" "}
                                                <span className="text-slate-600">{d.razonSocial}</span>
                                                <span className="block text-[10px] text-slate-400">
                                                    emitida {formatFecha(d.fechaEmision)} · {d.estado === "PAGADO" ? `pagada ${formatFecha(d.pagadoAt)}` : d.estado.toLowerCase()}
                                                </span>
                                            </span>
                                            <span className="flex shrink-0 items-center gap-1 font-bold text-slate-900">
                                                {formatCLP(d.estado === "PAGADO" ? d.montoOriginal : d.saldo)} <Plus size={13} className="text-cyan-600" />
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</div>}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
                    <span className="text-[11px] text-slate-500">
                        Asignado {formatCLP(suma)} de {formatCLP(movimiento.monto)}. Las abiertas reciben un abono; las ya pagadas solo se vinculan.
                    </span>
                    <div className="flex shrink-0 gap-2">
                        <button type="button" onClick={onClose} disabled={guardando} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => void confirmar()}
                            disabled={!valido || guardando}
                            className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500 disabled:opacity-60"
                        >
                            {guardando ? "Confirmando..." : "Confirmar"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AsignarMovimientoModal;