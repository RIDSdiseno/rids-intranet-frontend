// src/components/modals-facturasBaseapi/finanzas/banco/CargarCartolaModal.tsx
// Fase 4b: carga de la «Consulta de pagos recibidos» de Itaú (Excel).
// 1. Elige archivo → vista previa (POST /banco/importar sin aplicar): pagos leídos, duplicados y descartes automáticos.
// 2. «Importar» → POST /banco/importar?aplicar=1 (+ omitirPosibles=1 si se marca «No importar los posibles duplicados»).

import React, { useState } from "react";

import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload, X } from "lucide-react";

import { api } from "../../../../api/api";

import type { EmpresaCxc } from "../cxc.types";
import type { ResultadoImportacion } from "./banco.types";

function formatCLP(value: number) {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value);
}

function formatFecha(value: string) {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : value;
}

function mensajeError(err: any, porDefecto: string) {
    return String(err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message ?? porDefecto);
}

type Props = {
    empresa: EmpresaCxc;
    onClose: () => void;
    onImportado: (resultado: ResultadoImportacion) => void;
};

const CargarCartolaModal: React.FC<Props> = ({ empresa, onClose, onImportado }) => {
    const [archivo, setArchivo] = useState<File | null>(null);
    const [vista, setVista] = useState<ResultadoImportacion | null>(null);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");
    const [omitirPosibles, setOmitirPosibles] = useState(true);

    const enviar = async (file: File, aplicar: boolean) => {
        const form = new FormData();
        form.append("archivo", file);
        const response = await api.post<{ ok: boolean; data: ResultadoImportacion }>("/baseapi/finanzas/banco/importar", form, {
            params: { empresa, ...(aplicar ? { aplicar: 1, ...(omitirPosibles ? { omitirPosibles: 1 } : {}) } : {}) },
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data.data;
    };

    const elegir = async (file: File | null) => {
        setArchivo(file);
        setVista(null);
        setError("");
        if (!file) return;

        setCargando(true);
        try {
            setVista(await enviar(file, false));
        } catch (err: any) {
            setError(mensajeError(err, "No se pudo leer el archivo."));
        } finally {
            setCargando(false);
        }
    };

    const importar = async () => {
        if (!archivo) return;
        setCargando(true);
        setError("");
        try {
            onImportado(await enviar(archivo, true));
        } catch (err: any) {
            setError(mensajeError(err, "No se pudo importar la cartola."));
        } finally {
            setCargando(false);
        }
    };

    const empresaLabel = empresa === "rids" ? "RIDS" : "ECONNET";
    const posibles = vista?.posiblesDuplicados ?? 0;
    const aImportar = vista ? vista.nuevos - (omitirPosibles ? posibles : 0) : 0;

    return (
        <div
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget && !cargando) onClose();
            }}
        >
            <div className="flex max-h-[90vh] w-full max-w-6xl flex-col rounded-3xl bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
                        <FileSpreadsheet size={16} className="text-cyan-600" /> Cargar pagos recibidos · {empresaLabel}
                    </h3>
                    <button type="button" onClick={onClose} disabled={cargando} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Cerrar">
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
                    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-cyan-200 bg-cyan-50/40 px-4 py-6 text-center text-xs text-slate-600 hover:bg-cyan-50">
                        <Upload size={20} className="text-cyan-600" />
                        <span className="font-bold text-slate-800">{archivo ? archivo.name : "Elegir el Excel de «Consulta de pagos recibidos» de Itaú"}</span>
                        <span>Sirve el PDF del portal convertido a Excel (aunque las celdas queden en varias filas) o un Excel con una fila por pago.</span>
                        <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => void elegir(e.target.files?.[0] ?? null)} />
                    </label>

                    {cargando && !vista && <div className="py-4 text-center text-xs text-slate-400">Leyendo archivo...</div>}
                    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</div>}

                    {vista && (
                        <>
                            {vista.titular && !vista.titular.toLowerCase().includes(empresa === "rids" ? "rids" : "econnet") && (
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                                    Ojo: el archivo dice «{vista.titular}» y estás cargando en {empresaLabel}. Revisa la empresa antes de importar.
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-xs sm:grid-cols-6">
                                <Dato label="Pagos leídos" valor={String(vista.leidos)} />
                                <Dato label="Nuevos" valor={String(vista.nuevos)} clase="text-cyan-700" />
                                <Dato label="Ya cargados" valor={String(vista.duplicados)} />
                                <Dato label="Posibles duplicados" valor={String(posibles)} clase={posibles > 0 ? "text-amber-700" : ""} />
                                <Dato label="Descarte automático" valor={String(vista.descartadosAuto)} />
                                <Dato label="Total pagado" valor={formatCLP(vista.total)} />
                            </div>
                            {vista.noPagados > 0 && <div className="text-[11px] text-slate-500">{vista.noPagados} pago(s) con estado distinto de «Pagado» se omiten.</div>}
                            {posibles > 0 && (
                                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                    <div className="space-y-1.5">
                                        <div>
                                            <b>{posibles}</b> pago(s) tienen el mismo día, pagador y monto que otro pago, aunque cambie la hora, la referencia o el nombre. Suele pasar al cargar
                                            otra exportación del mismo período. Si son pagos distintos de verdad (dos facturas iguales pagadas el mismo día), impórtalos.
                                        </div>
                                        <label className="flex cursor-pointer items-center gap-2 font-bold">
                                            <input type="checkbox" checked={omitirPosibles} onChange={(e) => setOmitirPosibles(e.target.checked)} className="accent-amber-600" />
                                            No importar los posibles duplicados
                                        </label>
                                        {!omitirPosibles && <div className="text-[11px]">Se importan marcados como «Posible duplicado» y quedan fuera de «Confirmar perfectos».</div>}
                                    </div>
                                </div>
                            )}
                            {vista.advertencias.map((a) => (
                                <div key={a} className="text-[11px] text-amber-700">
                                    {a}
                                </div>
                            ))}

                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full min-w-[900px] text-xs">
                                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Fecha</th>
                                            <th className="px-3 py-2 text-left">Pagador</th>
                                            <th className="px-3 py-2 text-left">Referencia</th>
                                            <th className="px-3 py-2 text-right">Monto</th>
                                            <th className="px-3 py-2 text-left">Carga</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {vista.filas.map((f) => (
                                            <tr
                                                key={`${f.fila}-${f.monto}`}
                                                className={f.duplicado ? "text-slate-400" : f.posibleDuplicado ? (omitirPosibles ? "bg-amber-50/60 text-slate-400" : "bg-amber-50/60") : ""}
                                            >
                                                <td className="whitespace-nowrap px-3 py-1.5">
                                                    {formatFecha(f.fecha)} {f.hora?.slice(0, 5)}
                                                </td>
                                                <td className="px-3 py-1.5">
                                                    <div className="font-semibold">{f.nombrePagador ?? "—"}</div>
                                                    <div className="text-[10px] text-slate-400">{f.rutPagador}</div>
                                                </td>
                                                <td className="px-3 py-1.5">{f.referencia ?? "—"}</td>
                                                <td className="px-3 py-1.5 text-right font-bold">{formatCLP(f.monto)}</td>
                                                <td className="whitespace-nowrap px-3 py-1.5">
                                                    {f.duplicado ? (
                                                        "Ya cargado"
                                                    ) : f.posibleDuplicado ? (
                                                        <span className="inline-flex flex-col text-amber-700">
                                                            <span className="inline-flex items-center gap-1 font-bold">
                                                                <AlertTriangle size={12} /> {omitirPosibles ? "Posible duplicado · se omite" : "Posible duplicado · se importa"}
                                                            </span>
                                                            <span className="whitespace-normal text-[10px] text-amber-600">{f.posibleDuplicado.detalle}</span>
                                                        </span>
                                                    ) : f.descarteAuto ? (
                                                        <span className="text-amber-700">Se descarta ({f.descarteAuto === "TRASPASO_EMPRESAS" ? "traspaso" : f.descarteAuto.toLowerCase()})</span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-cyan-700">
                                                            <CheckCircle2 size={12} /> Nuevo
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
                    <button type="button" onClick={onClose} disabled={cargando} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={() => void importar()}
                        disabled={cargando || !vista || aImportar === 0}
                        className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500 disabled:opacity-60"
                    >
                        {cargando && vista ? "Importando..." : vista ? `Importar ${aImportar} pago(s)` : "Importar"}
                    </button>
                </div>
            </div>
        </div>
    );
};

const Dato: React.FC<{ label: string; valor: string; clase?: string }> = ({ label, valor, clase = "" }) => (
    <div>
        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
        <div className={`text-sm font-black text-slate-900 ${clase}`}>{valor}</div>
    </div>
);

export default CargarCartolaModal;