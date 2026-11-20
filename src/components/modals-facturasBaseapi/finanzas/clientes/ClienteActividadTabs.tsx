// src/components/modals-facturasBaseapi/finanzas/clientes/ClienteActividadTabs.tsx
// Fase 3b: pestañas «Historial de envíos» y «Comportamiento de pago» de la ficha del cliente.
// Los datos vienen en la ficha (GET /baseapi/finanzas/cxc/clientes/:rut → historial, comportamiento).

import React, { useEffect, useMemo, useState } from "react";

import { Pagination, Tooltip } from "antd";
import { AlertTriangle, BellRing, CheckCircle2, Info, Mail, XCircle } from "lucide-react";

import type { ComportamientoClienteCxc, ComportamientoGrupo, EmpresaCxc, EnvioClienteCxc, EstadoPuntualidad } from "../cxc.types";

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

function formatFechaHora(value: string | null) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("es-CL", {
        timeZone: "America/Santiago",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    })
        .format(new Date(value))
        .replace(/\//g, "-")
        .replace(",", "");
}

const EMPRESA_LABEL: Record<string, string> = { rids: "RIDS", econnet: "ECONNET" };
const EMPRESA_CLASE: Record<string, string> = { rids: "bg-teal-50 text-teal-700", econnet: "bg-blue-50 text-blue-700" };

/** Nombre legible del tipo de recordatorio automático. */
function etiquetaRecordatorio(tipo: string | null) {
    switch (tipo) {
        case "POR_VENCER_7_DIAS":
            return "7 días antes";
        case "POR_VENCER_3_DIAS":
            return "3 días antes";
        case "VENCE_HOY":
            return "Vence hoy";
        case "VENCIDA_3_DIAS":
            return "3 días vencida";
        case "VENCIDA_7_DIAS":
            return "7 días vencida";
        case "VENCIDA_15_DIAS":
            return "15 días vencida";
        case "VENCIDA_30_DIAS":
            return "30 días vencida";
        case "MANUAL":
            return "Manual";
        case "PAGO_RECIBIDO":
            return "Pago recibido";
        default:
            return tipo ?? "";
    }
}

const ESTADO_PUNTUALIDAD: Record<EstadoPuntualidad, { label: string; clase: string; ayuda: string }> = {
    EXCELENTE: { label: "Excelente", clase: "bg-emerald-50 text-emerald-700", ayuda: "Paga casi siempre dentro del plazo." },
    BUEN_PAGADOR: { label: "Buen pagador", clase: "bg-cyan-50 text-cyan-700", ayuda: "Atrasos ocasionales y cortos." },
    IRREGULAR: { label: "Irregular", clase: "bg-amber-50 text-amber-700", ayuda: "Atrasos frecuentes o de varias semanas." },
    RIESGO_MORA: { label: "Riesgo de mora", clase: "bg-red-50 text-red-700", ayuda: "Paga con atrasos largos." },
    SIN_HISTORIAL: { label: "Sin historial suficiente", clase: "bg-slate-100 text-slate-500", ayuda: "Menos de 5 facturas evaluadas: no se calcula el puntaje." },
};

/* =========================================================
   HISTORIAL DE ENVÍOS
========================================================= */

export const HistorialEnviosCliente: React.FC<{ historial: EnvioClienteCxc[] }> = ({ historial }) => {
    const [tipo, setTipo] = useState<"" | EnvioClienteCxc["tipo"]>("");
    const [origen, setOrigen] = useState<"" | "AUTO" | "MANUAL">("");
    const [pagina, setPagina] = useState(1);
    const [tamanoPagina, setTamanoPagina] = useState(20);

    const filas = useMemo(
        () =>
            historial
                .filter((h) => !tipo || h.tipo === tipo)
                .filter((h) => !origen || (origen === "AUTO" ? h.automatico : !h.automatico)),
        [historial, tipo, origen],
    );

    useEffect(() => setPagina(1), [tipo, origen]);

    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
                <div className="flex flex-wrap gap-2">
                    <select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} className="h-8 rounded-lg border border-slate-200 px-2 text-xs text-slate-700">
                        <option value="">Facturas y recordatorios</option>
                        <option value="FACTURA">Solo facturas</option>
                        <option value="RECORDATORIO">Solo recordatorios</option>
                    </select>
                    <select value={origen} onChange={(e) => setOrigen(e.target.value as typeof origen)} className="h-8 rounded-lg border border-slate-200 px-2 text-xs text-slate-700">
                        <option value="">Automáticos y manuales</option>
                        <option value="AUTO">Automáticos</option>
                        <option value="MANUAL">Manuales</option>
                    </select>
                </div>
                <Tooltip title="Envíos registrados en el CRM. Los envíos en modo prueba no se registran.">
                    <span className="inline-flex cursor-help items-center gap-1 text-[11px] text-slate-400">
                        Últimos {historial.length} registros <Info size={11} />
                    </span>
                </Tooltip>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                        <tr>
                            <th className="px-4 py-2 text-left">Fecha</th>
                            <th className="px-4 py-2 text-left">Tipo</th>
                            <th className="px-4 py-2 text-left">Documento</th>
                            <th className="px-4 py-2 text-left">Destinatario</th>
                            <th className="px-4 py-2 text-left">Estado</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filas.slice((pagina - 1) * tamanoPagina, pagina * tamanoPagina).map((h, i) => (
                            <tr key={`${h.tipo}-${h.empresaKey}-${h.documento}-${h.email}-${h.fecha}-${i}`}>
                                <td className="whitespace-nowrap px-4 py-2 text-slate-600">{formatFechaHora(h.fecha)}</td>
                                <td className="px-4 py-2">
                                    <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                                        {h.tipo === "FACTURA" ? <Mail size={13} /> : <BellRing size={13} />}
                                        {h.tipo === "FACTURA" ? "Factura" : "Recordatorio"}
                                    </span>
                                    <div className="text-[10px] text-slate-400">
                                        {h.automatico ? "automático" : "manual"}
                                        {h.tipo === "RECORDATORIO" && h.tipoRecordatorio ? ` · ${etiquetaRecordatorio(h.tipoRecordatorio)}` : ""}
                                    </div>
                                </td>
                                <td className="px-4 py-2">
                                    <span className={`mr-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${EMPRESA_CLASE[h.empresaKey] ?? "bg-slate-100 text-slate-500"}`}>
                                        {EMPRESA_LABEL[h.empresaKey] ?? h.empresaKey}
                                    </span>
                                    <span className="font-semibold text-slate-800">{h.documento}</span>
                                </td>
                                <td className="px-4 py-2 text-slate-700">{h.email}</td>
                                <td className="px-4 py-2">
                                    {h.estado === "ENVIADO" ? (
                                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                                            <CheckCircle2 size={13} /> Enviado
                                        </span>
                                    ) : h.estado === "ERROR" || h.estado === "CANCELADO" ? (
                                        <Tooltip title={h.error ?? undefined}>
                                            <span className="inline-flex cursor-help items-center gap-1 font-semibold text-red-600">
                                                <XCircle size={13} /> {h.estado === "ERROR" ? "Error" : "Cancelado"}
                                            </span>
                                        </Tooltip>
                                    ) : (
                                        <span className="font-semibold text-amber-600">{h.estado.charAt(0) + h.estado.slice(1).toLowerCase()}</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filas.length === 0 && <div className="px-4 py-8 text-center text-xs text-slate-400">Sin envíos registrados para este filtro.</div>}
            </div>

            {filas.length > 0 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
                    <span>
                        {(pagina - 1) * tamanoPagina + 1}–{Math.min(pagina * tamanoPagina, filas.length)} de {filas.length}
                    </span>
                    <Pagination
                        size="small"
                        current={pagina}
                        pageSize={tamanoPagina}
                        total={filas.length}
                        showSizeChanger
                        pageSizeOptions={[10, 20, 50, 100]}
                        onChange={(p, ps) => {
                            if (ps !== tamanoPagina) {
                                setTamanoPagina(ps);
                                setPagina(1);
                            } else {
                                setPagina(p);
                            }
                        }}
                    />
                </div>
            )}
        </div>
    );
};

/* =========================================================
   COMPORTAMIENTO DE PAGO
========================================================= */

const TarjetaGrupo: React.FC<{ titulo: string; grupo: ComportamientoGrupo | null; clase?: string }> = ({ titulo, grupo, clase = "" }) => {
    if (!grupo) {
        return (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-2 text-[10px] font-black uppercase tracking-wide text-slate-500">{titulo}</div>
                <div className="py-3 text-xs text-slate-400">Sin facturas pagadas en el período.</div>
            </div>
        );
    }

    const estado = ESTADO_PUNTUALIDAD[grupo.estado];

    return (
        <div className={`rounded-2xl border border-slate-200 bg-white p-4 ${clase}`}>
            <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">{titulo}</span>
                <Tooltip title={estado.ayuda}>
                    <span className={`cursor-help rounded-full px-2 py-0.5 text-[10px] font-bold ${estado.clase}`}>
                        {estado.label}
                        {grupo.score !== null ? ` · ${grupo.score}` : ""}
                    </span>
                </Tooltip>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metrica label="A tiempo" valor={`${grupo.porcentajeATiempo}%`} detalle={`${grupo.aTiempo} de ${grupo.totalEvaluados}`} />
                <Metrica
                    label="Atraso promedio"
                    valor={grupo.atrasadas > 0 ? `${grupo.promedioDiasAtraso} días` : "—"}
                    detalle={`${grupo.atrasadas} atrasada(s)`}
                    ayuda="Promedio de días de atraso, solo entre las facturas pagadas después del vencimiento."
                />
                <Metrica
                    label="Paga en"
                    valor={grupo.promedioDiasPago !== null ? `${grupo.promedioDiasPago} días` : "—"}
                    detalle="desde la emisión"
                    ayuda="Promedio de días entre la emisión de la factura y su pago."
                />
                <Metrica label="Pagado" valor={formatCLP(grupo.montoPagado)} detalle="en el período" />
            </div>
        </div>
    );
};

const Metrica: React.FC<{ label: string; valor: string; detalle: string; ayuda?: string }> = ({ label, valor, detalle, ayuda }) => (
    <div>
        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {label}
            {ayuda && (
                <Tooltip title={ayuda}>
                    <Info size={10} className="cursor-help" />
                </Tooltip>
            )}
        </div>
        <div className="text-sm font-black text-slate-900">{valor}</div>
        <div className="text-[10px] text-slate-400">{detalle}</div>
    </div>
);

export const ComportamientoPagoCliente: React.FC<{ comportamiento: ComportamientoClienteCxc }> = ({ comportamiento }) => {
    const [empresa, setEmpresa] = useState<EmpresaCxc | "">("");
    const [pagina, setPagina] = useState(1);
    const tamanoPagina = 20;

    const docs = useMemo(() => comportamiento.documentos.filter((d) => !empresa || d.empresaKey === empresa), [comportamiento, empresa]);

    useEffect(() => setPagina(1), [empresa]);

    return (
        <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] text-slate-500">
                <Info size={14} className="mt-0.5 shrink-0 text-slate-400" />
                <span>
                    Facturas pagadas entre el {formatFecha(comportamiento.desde)} y el {formatFecha(comportamiento.hasta)}. Se compara la fecha de pago con el
                    vencimiento calculado con las mismas reglas que las facturas abiertas. En los pagos registrados a mano, la fecha de pago es la fecha en que se
                    registró.
                    {comportamiento.excluidos > 0 && ` No se evalúan ${comportamiento.excluidos} factura(s) cerradas como AJUSTE o sin vencimiento.`}
                </span>
            </div>

            <TarjetaGrupo titulo="Total" grupo={comportamiento.total} />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <TarjetaGrupo titulo="RIDS" grupo={comportamiento.porEmpresa.rids} />
                <TarjetaGrupo titulo="ECONNET" grupo={comportamiento.porEmpresa.econnet} />
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                    <h3 className="text-xs font-black uppercase tracking-wide text-slate-600">Facturas evaluadas</h3>
                    <select
                        value={empresa}
                        onChange={(e) => setEmpresa(e.target.value as EmpresaCxc | "")}
                        className="h-8 rounded-lg border border-slate-200 px-2 text-xs text-slate-700"
                    >
                        <option value="">RIDS y ECONNET</option>
                        <option value="rids">Solo RIDS</option>
                        <option value="econnet">Solo ECONNET</option>
                    </select>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-xs">
                        <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-2 text-left">Documento</th>
                                <th className="px-4 py-2 text-left">Emisión</th>
                                <th className="px-4 py-2 text-left">Vencimiento</th>
                                <th className="px-4 py-2 text-left">Pago</th>
                                <th className="px-4 py-2 text-right">Días</th>
                                <th className="px-4 py-2 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {docs.slice((pagina - 1) * tamanoPagina, pagina * tamanoPagina).map((d) => (
                                <tr key={`${d.empresaKey}-${d.tipoDoc}-${d.folio}`}>
                                    <td className="px-4 py-2">
                                        <span className={`mr-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${EMPRESA_CLASE[d.empresaKey]}`}>
                                            {EMPRESA_LABEL[d.empresaKey]}
                                        </span>
                                        <span className="font-semibold text-slate-800">
                                            {d.tipoDoc}-{d.folio}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-slate-600">{formatFecha(d.fechaEmision)}</td>
                                    <td className="px-4 py-2 text-slate-600">{formatFecha(d.vencimiento)}</td>
                                    <td className="px-4 py-2 text-slate-600">
                                        {formatFecha(d.pagadoAt)}
                                        {d.formaPago && <span className="ml-1 text-[10px] text-slate-400">· {d.formaPago}</span>}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        {d.diasAtraso > 0 ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 font-bold text-red-700">
                                                <AlertTriangle size={11} /> {d.diasAtraso} tarde
                                            </span>
                                        ) : (
                                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700">
                                                {d.diasAtraso === 0 ? "el día" : `${-d.diasAtraso} antes`}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-right font-bold text-slate-900">{formatCLP(d.monto)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {docs.length === 0 && <div className="px-4 py-8 text-center text-xs text-slate-400">Sin facturas pagadas en el período.</div>}
                </div>
                {docs.length > tamanoPagina && (
                    <div className="flex justify-end border-t border-slate-100 px-4 py-2">
                        <Pagination size="small" current={pagina} pageSize={tamanoPagina} total={docs.length} onChange={setPagina} />
                    </div>
                )}
            </div>
        </div>
    );
};