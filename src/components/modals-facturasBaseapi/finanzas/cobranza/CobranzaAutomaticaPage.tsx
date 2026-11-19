// src/components/modals-facturasBaseapi/finanzas/cobranza/CobranzaAutomaticaPage.tsx
// Fase 5c: pestaña «Cobranza automática» de Facturas.
// - Próximo envío: lo que sale hoy y los próximos 7 días (agrupado como el correo: cliente + destinatario), con exclusiones.
// - Historial: la cola RcvRecordatorioEnvio (enviados, pendientes, cancelados, errores).
// - Configuración: horas, etapas, envío automático, PDF.
// Ver: ADMINISTRACION y VENTAS. Preparar, enviar, cancelar y configurar: solo ADMINISTRACION.
// Fuente: /baseapi/finanzas/cxc/cobranza-auto/*

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { ConfigProvider, DatePicker, Pagination, Popconfirm, Switch, Tooltip } from "antd";
import esES from "antd/locale/es_ES";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { AlertTriangle, BellRing, CalendarDays, Check, History, Info, Mail, RefreshCw, Search, Send, Settings, UserX, X } from "lucide-react";

import { api } from "../../../../api/api";

import type { EmpresaCxc } from "../cxc.types";
import type {
    CalendarioCobranzaResponse,
    CandidatoCobranza,
    ColaCobranzaResponse,
    ConfigCobranzaAuto,
    ConfigCobranzaResponse,
    DiaCalendarioCobranza,
    RecordatorioCola,
    ReglasFijasCobranza,
    ResultadoEnviarResponse,
    ResultadoPrepararResponse,
} from "./cobranza-auto.types";

dayjs.locale("es");

const { RangePicker } = DatePicker;

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

function formatRut(rut: string | null) {
    const limpio = String(rut ?? "").replace(/[^0-9kK]/g, "").toUpperCase();
    if (limpio.length < 2) return limpio || "Sin RUT";
    return `${limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${limpio.slice(-1)}`;
}

function mensajeError(err: any, porDefecto: string) {
    return String(err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message ?? porDefecto);
}

function hoyChile() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** «POR_VENCER_7_DIAS» → «Faltan 7 días», «VENCIDA_45_DIAS» → «Vencida +45», etc. */
function etiquetaEtapa(tipo: string) {
    if (tipo === "VENCE_HOY") return "Vence hoy";
    if (tipo === "MANUAL") return "Manual";
    const porVencer = /^POR_VENCER_(\d+)_DIAS$/.exec(tipo);
    if (porVencer) return `Faltan ${porVencer[1]} días`;
    const vencida = /^VENCIDA_(\d+)_DIAS$/.exec(tipo);
    if (vencida) return `Vencida +${vencida[1]}`;
    return tipo;
}

function claseEtapa(tipo: string) {
    if (tipo.startsWith("VENCIDA_")) return "bg-red-50 text-red-700 ring-red-200";
    if (tipo === "VENCE_HOY") return "bg-amber-50 text-amber-700 ring-amber-200";
    if (tipo === "MANUAL") return "bg-slate-100 text-slate-600 ring-slate-200";
    return "bg-cyan-50 text-cyan-700 ring-cyan-200";
}

function etiquetaDia(dia: DiaCalendarioCobranza) {
    if (dia.desplazamiento === 0) return "Hoy";
    if (dia.desplazamiento === 1) return "Mañana";
    return dayjs(dia.fecha).format("ddd DD-MM");
}

const ESTADOS: Record<string, { label: string; clase: string }> = {
    ENVIADO: { label: "Enviado", clase: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
    PENDIENTE: { label: "Pendiente", clase: "bg-cyan-50 text-cyan-700 ring-cyan-200" },
    PROCESANDO: { label: "Procesando", clase: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
    ERROR: { label: "Error", clase: "bg-red-50 text-red-700 ring-red-200" },
    CANCELADO: { label: "Cancelado", clase: "bg-slate-100 text-slate-600 ring-slate-200" },
};

function Badge({ clase, children }: { clase: string; children: React.ReactNode }) {
    return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${clase}`}>{children}</span>;
}

/* =========================================================
   AGRUPACIÓN (igual que el envío: empresa + RUT + correo)
========================================================= */

type GrupoCorreo = {
    clave: string;
    rut: string;
    razonSocial: string | null;
    email: string | null;
    nombre: string | null;
    facturas: CandidatoCobranza[];
    total: number;
};

function agruparCandidatos(candidatos: CandidatoCobranza[]) {
    const conContacto = new Map<string, GrupoCorreo>();
    const sinContacto = new Map<string, GrupoCorreo>();

    for (const c of candidatos) {
        const rut = c.rutContraparte;

        if (c.destinatarios.length === 0) {
            const g = sinContacto.get(rut) ?? { clave: rut, rut, razonSocial: c.razonSocial, email: null, nombre: null, facturas: [], total: 0 };
            g.facturas.push(c);
            g.total += c.montoPendiente;
            sinContacto.set(rut, g);
            continue;
        }

        for (const d of c.destinatarios) {
            const email = d.email.trim().toLowerCase();
            const clave = `${rut}|${email}`;
            const g = conContacto.get(clave) ?? { clave, rut, razonSocial: c.razonSocial, email, nombre: d.nombre || null, facturas: [], total: 0 };
            g.facturas.push(c);
            g.total += c.montoPendiente;
            conContacto.set(clave, g);
        }
    }

    const ordenar = (a: GrupoCorreo, b: GrupoCorreo) => (a.razonSocial ?? a.rut).localeCompare(b.razonSocial ?? b.rut);

    return { correos: [...conContacto.values()].sort(ordenar), sinContacto: [...sinContacto.values()].sort(ordenar) };
}

/* =========================================================
   COMPONENTE PRINCIPAL
========================================================= */

type Vista = "proximo" | "historial" | "config";

type Props = {
    empresa: EmpresaCxc;
    onEmpresaChange: (empresa: EmpresaCxc) => void;
    /** ADMINISTRACION: preparar, enviar, cancelar y configurar. */
    puedeEditar: boolean;
};

const CobranzaAutomaticaPage: React.FC<Props> = ({ empresa, onEmpresaChange, puedeEditar }) => {
    const [vista, setVista] = useState<Vista>("proximo");
    const [configs, setConfigs] = useState<ConfigCobranzaAuto[]>([]);
    const [reglas, setReglas] = useState<ReglasFijasCobranza | null>(null);
    const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
    const [ocupado, setOcupado] = useState<"preparar" | "enviar" | null>(null);
    /** Cambia para que las vistas recarguen después de una acción. */
    const [version, setVersion] = useState(0);

    const cargarConfig = useCallback(async () => {
        try {
            const r = await api.get<ConfigCobranzaResponse>("/baseapi/finanzas/cxc/cobranza-auto/config");
            setConfigs(r.data.data.empresas);
            setReglas(r.data.data.reglas);
        } catch (err: any) {
            setAviso({ tipo: "error", texto: mensajeError(err, "No se pudo cargar la configuración de cobranza.") });
        }
    }, []);

    useEffect(() => {
        void cargarConfig();
    }, [cargarConfig]);

    const config = configs.find((c) => c.empresaKey === empresa) ?? null;
    const nombreEmpresa = empresa === "rids" ? "RIDS" : "ECONNET";

    const preparar = async () => {
        setOcupado("preparar");
        setAviso(null);
        try {
            const r = await api.post<ResultadoPrepararResponse>("/baseapi/finanzas/cxc/cobranza-auto/preparar", { empresa });
            const d = r.data.data;
            setAviso({
                tipo: "ok",
                texto: d.activa
                    ? `Preparado ${nombreEmpresa}: ${d.candidatos} factura(s) en etapa hoy, ${d.conDestinatario} con contacto, ${d.pendientesEnvio} por enviar y ${d.yaEnviados} ya enviada(s).`
                    : `La preparación de ${nombreEmpresa} está desactivada en la configuración.`,
            });
            setVersion((v) => v + 1);
        } catch (err: any) {
            setAviso({ tipo: "error", texto: mensajeError(err, "No se pudo preparar.") });
        } finally {
            setOcupado(null);
        }
    };

    const enviar = async () => {
        setOcupado("enviar");
        setAviso(null);
        try {
            const r = await api.post<ResultadoEnviarResponse>("/baseapi/finanzas/cxc/cobranza-auto/enviar", { empresa });
            const d = r.data.data;
            setAviso({
                tipo: d.errores > 0 ? "error" : "ok",
                texto: `Envío ${nombreEmpresa}: ${d.enviados} recordatorio(s) enviados, ${d.omitidos} cancelados u omitidos, ${d.errores} con error (de ${d.procesados} procesados).`,
            });
            setVersion((v) => v + 1);
        } catch (err: any) {
            setAviso({ tipo: "error", texto: mensajeError(err, "No se pudo enviar.") });
        } finally {
            setOcupado(null);
        }
    };

    return (
        <ConfigProvider locale={esES}>
            <div className="space-y-4">
                {/* Barra superior */}
                <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                    <select
                        value={empresa}
                        onChange={(e) => onEmpresaChange(e.target.value as EmpresaCxc)}
                        className="h-10 rounded-xl border border-cyan-200 bg-white px-3 text-sm font-bold text-slate-700"
                    >
                        <option value="rids">RIDS</option>
                        <option value="econnet">ECONNET</option>
                    </select>

                    {config && (
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <Badge clase={config.envioAutomatico && config.activo ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200"}>
                                {config.activo ? (config.envioAutomatico ? "Envío automático encendido" : "Solo prepara (envío apagado)") : "Cobranza automática apagada"}
                            </Badge>
                            <span className="text-slate-500">
                                Prepara {config.horaConsultaSii} · envía {config.horaCobranza}
                            </span>
                        </div>
                    )}

                    {puedeEditar && (
                        <div className="ml-auto flex flex-wrap items-center gap-2">
                            <Popconfirm
                                title="¿Preparar ahora?"
                                description="Registra los recordatorios de hoy (lo mismo que hace el scheduler). No envía nada."
                                okText="Preparar"
                                cancelText="Cancelar"
                                onConfirm={() => void preparar()}
                            >
                                <Tooltip
                                    title={
                                        <span>
                                            Revisa las facturas de hoy y deja <strong>en cola</strong> los recordatorios que tocan (lo mismo que hace el sistema
                                            {config ? ` a las ${config.horaConsultaSii}` : " cada mañana"}). <strong>No envía correos.</strong> Lo que ya está en
                                            cola o enviado no se duplica.
                                        </span>
                                    }
                                >
                                    <button
                                        type="button"
                                        disabled={ocupado !== null}
                                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-cyan-300 bg-white px-3 text-sm font-bold text-cyan-700 hover:bg-cyan-50 disabled:opacity-60"
                                    >
                                        <BellRing size={16} className={ocupado === "preparar" ? "animate-pulse" : ""} />
                                        {ocupado === "preparar" ? "Preparando..." : "Preparar ahora"}
                                    </button>
                                </Tooltip>
                            </Popconfirm>
                            <Popconfirm
                                title="¿Enviar los pendientes ahora?"
                                description={`Se envían por correo REAL a los clientes de ${nombreEmpresa} los recordatorios pendientes de hoy.`}
                                okText="Enviar"
                                okButtonProps={{ danger: true }}
                                cancelText="Cancelar"
                                onConfirm={() => void enviar()}
                            >
                                <Tooltip
                                    title={
                                        <span>
                                            Envía <strong>por correo real</strong> los recordatorios en cola de hoy (lo mismo que hace el sistema
                                            {config ? ` a las ${config.horaCobranza}` : " cada mañana"}). Antes revisa cada factura: si se pagó o quedó bajo el
                                            mínimo, se cancela. Sale un correo por cliente y destinatario. Si no hay nada preparado, no envía nada.
                                        </span>
                                    }
                                >
                                    <button
                                        type="button"
                                        disabled={ocupado !== null}
                                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-600 px-3 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-60"
                                    >
                                        <Send size={16} className={ocupado === "enviar" ? "animate-pulse" : ""} />
                                        {ocupado === "enviar" ? "Enviando..." : "Enviar pendientes ahora"}
                                    </button>
                                </Tooltip>
                            </Popconfirm>
                        </div>
                    )}

                    <div className="flex basis-full rounded-xl bg-slate-100 p-1 sm:basis-auto">
                        {(
                            [
                                { id: "proximo", label: "Próximo envío", icon: <CalendarDays size={14} /> },
                                { id: "historial", label: "Historial", icon: <History size={14} /> },
                                { id: "config", label: "Configuración", icon: <Settings size={14} /> },
                            ] as const
                        ).map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setVista(t.id)}
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold ${vista === t.id ? "bg-white text-cyan-700 shadow-sm" : "text-slate-500"}`}
                            >
                                {t.icon} {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {aviso && (
                    <div
                        className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${aviso.tipo === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"
                            }`}
                    >
                        {aviso.texto}
                        <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso">
                            <X size={16} />
                        </button>
                    </div>
                )}

                {vista === "proximo" && <ProximoEnvio empresa={empresa} reglas={reglas} version={version} />}
                {vista === "historial" && <HistorialCola empresa={empresa} puedeEditar={puedeEditar} version={version} />}
                {vista === "config" && (
                    <ConfiguracionCobranza
                        config={config}
                        reglas={reglas}
                        puedeEditar={puedeEditar}
                        onGuardado={(nueva) => {
                            setConfigs((prev) => prev.map((c) => (c.empresaKey === nueva.empresaKey ? nueva : c)));
                            setAviso({ tipo: "ok", texto: `Configuración de ${nombreEmpresa} guardada.` });
                        }}
                    />
                )}
            </div>
        </ConfigProvider>
    );
};

export default CobranzaAutomaticaPage;

/* =========================================================
   PRÓXIMO ENVÍO (hoy + 7 días)
========================================================= */

const MOTIVO_EXCLUSION: Record<string, string> = {
    BAJO_MINIMO: "Saldo bajo el mínimo",
    SOBRE_TOPE: "Más días de vencida que el tope",
};

function ProximoEnvio({ empresa, reglas, version }: { empresa: EmpresaCxc; reglas: ReglasFijasCobranza | null; version: number }) {
    const [dias, setDias] = useState<DiaCalendarioCobranza[]>([]);
    const [seleccionado, setSeleccionado] = useState(0);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");
    const [verExcluidos, setVerExcluidos] = useState(false);

    const cargar = useCallback(async () => {
        setCargando(true);
        setError("");
        try {
            const r = await api.get<CalendarioCobranzaResponse>("/baseapi/finanzas/cxc/cobranza-auto/calendario", { params: { empresa, dias: 7 } });
            setDias(r.data.data.dias);
        } catch (err: any) {
            setError(mensajeError(err, "No se pudo calcular el próximo envío."));
        } finally {
            setCargando(false);
        }
    }, [empresa]);

    useEffect(() => {
        void cargar();
    }, [cargar, version]);

    const dia = dias.find((d) => d.desplazamiento === seleccionado) ?? dias[0] ?? null;
    const grupos = useMemo(() => agruparCandidatos(dia?.candidatos ?? []), [dia]);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                {dias.map((d) => {
                    const { correos } = agruparCandidatos(d.candidatos);
                    const activo = d.desplazamiento === (dia?.desplazamiento ?? 0);
                    return (
                        <button
                            key={d.fecha}
                            type="button"
                            onClick={() => setSeleccionado(d.desplazamiento)}
                            className={`rounded-xl border px-3 py-2 text-left text-xs transition ${activo ? "border-cyan-500 bg-cyan-50 text-cyan-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                        >
                            <div className="font-bold capitalize">{etiquetaDia(d)}</div>
                            <div className="text-[11px]">
                                {correos.length} correo{correos.length === 1 ? "" : "s"} · {d.candidatos.length} factura{d.candidatos.length === 1 ? "" : "s"}
                            </div>
                        </button>
                    );
                })}
                <button
                    type="button"
                    onClick={() => void cargar()}
                    disabled={cargando}
                    className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                    <RefreshCw size={14} className={cargando ? "animate-spin" : ""} /> {cargando ? "Calculando..." : "Recalcular"}
                </button>
                {reglas && (
                    <p className="basis-full text-[11px] text-slate-400">
                        Hoy usa las mismas reglas que la preparación (recupera etapas de hasta {reglas.diasRecuperacion} días atrás). Los días siguientes muestran solo
                        las etapas exactas de ese día. Saldo mínimo {formatCLP(reglas.saldoMinimo)} · tope {reglas.topeDiasVencida} días de vencida · después de la
                        última etapa, cada {reglas.repetirCadaDias} días. Las facturas que se paguen antes no saldrán.
                    </p>
                )}
            </div>

            {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

            {dia && (
                <>
                    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-800">
                            <Mail size={16} className="text-cyan-600" /> Correos que salen {dia.desplazamiento === 0 ? "hoy" : `el ${formatFecha(dia.fecha)}`} ({grupos.correos.length})
                        </div>
                        {grupos.correos.length === 0 ? (
                            <div className="px-4 py-8 text-center text-sm text-slate-400">No hay recordatorios con contacto para este día.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                                        <tr>
                                            <th className="px-4 py-2">Cliente</th>
                                            <th className="px-4 py-2">Para</th>
                                            <th className="px-4 py-2">Facturas</th>
                                            <th className="px-4 py-2 text-right">Total del aviso</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {grupos.correos.map((g) => {
                                            const enviado = dia.desplazamiento === 0 && g.facturas.every((f) => f.yaEnviado);
                                            return (
                                                <tr key={g.clave} className="border-t border-slate-100 align-top">
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-slate-900">{g.razonSocial ?? "Sin razón social"}</div>
                                                        <div className="text-slate-400">{formatRut(g.rut)}</div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-slate-700">{g.nombre ?? "—"}</div>
                                                        <div className="text-slate-400">{g.email}</div>
                                                        <div className="mt-1 flex flex-wrap gap-1">
                                                            {g.facturas.length > 1 && <Badge clase="bg-indigo-50 text-indigo-700 ring-indigo-200">Consolidado</Badge>}
                                                            {enviado && <Badge clase={ESTADOS.ENVIADO!.clase}>Ya enviado</Badge>}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col gap-1">
                                                            {g.facturas.map((f) => (
                                                                <div key={`${f.tipoDoc}-${f.folio}`} className="flex flex-wrap items-center gap-1.5">
                                                                    <span className="font-semibold text-slate-800">
                                                                        {f.tipoDoc}-{f.folio}
                                                                    </span>
                                                                    <Badge clase={claseEtapa(f.tipoRecordatorio)}>{etiquetaEtapa(f.tipoRecordatorio)}</Badge>
                                                                    <span className="text-slate-400">vence {formatFecha(f.fechaVencimiento)}</span>
                                                                    <span className="font-semibold text-slate-700">{formatCLP(f.montoPendiente)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-black text-slate-900">{formatCLP(g.total)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {grupos.sinContacto.length > 0 && (
                        <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
                            <div className="flex items-center gap-2 text-sm font-bold text-amber-800">
                                <UserX size={16} /> Sin contacto de cobranza ({grupos.sinContacto.length}): no se les envía
                            </div>
                            <p className="mt-1 text-[11px] text-amber-700">Agrega un contacto con la marca «Cobranza» en Clientes para que les llegue.</p>
                            <div className="mt-2 flex flex-col gap-1 text-xs">
                                {grupos.sinContacto.map((g) => (
                                    <div key={g.clave} className="flex flex-wrap items-center gap-2">
                                        <span className="font-semibold text-slate-800">{g.razonSocial ?? formatRut(g.rut)}</span>
                                        <span className="text-slate-500">{g.facturas.map((f) => `${f.tipoDoc}-${f.folio} (${etiquetaEtapa(f.tipoRecordatorio)})`).join(", ")}</span>
                                        <span className="font-semibold text-slate-700">{formatCLP(g.total)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {dia.excluidos.length > 0 && (
                        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                            <button
                                type="button"
                                onClick={() => setVerExcluidos((v) => !v)}
                                className="flex items-center gap-2 text-sm font-bold text-slate-700"
                            >
                                <Info size={16} className="text-slate-400" /> Excluidos por las reglas ({dia.excluidos.length}) {verExcluidos ? "▲" : "▼"}
                            </button>
                            {verExcluidos && (
                                <div className="mt-2 flex flex-col gap-1 text-xs">
                                    {dia.excluidos.map((x) => (
                                        <div key={`${x.tipoDoc}-${x.folio}`} className="flex flex-wrap items-center gap-2">
                                            <span className="font-semibold text-slate-800">
                                                {x.tipoDoc}-{x.folio}
                                            </span>
                                            <span className="text-slate-500">{x.razonSocial ?? formatRut(x.rutContraparte)}</span>
                                            <Badge clase={claseEtapa(x.tipoRecordatorio)}>{etiquetaEtapa(x.tipoRecordatorio)}</Badge>
                                            <span className="font-semibold text-slate-700">{formatCLP(x.saldo)}</span>
                                            <Badge clase="bg-slate-100 text-slate-600 ring-slate-200">{MOTIVO_EXCLUSION[x.motivo] ?? x.motivo}</Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

/* =========================================================
   HISTORIAL DE LA COLA
========================================================= */

type GrupoCola = {
    clave: string;
    fecha: string;
    hora: string;
    horaEnvio: string | null;
    rut: string;
    razonSocial: string | null;
    email: string;
    nombre: string | null;
    estado: string;
    automatico: boolean;
    asunto: string | null;
    error: string | null;
    filas: RecordatorioCola[];
    total: number;
};

function agruparCola(filas: RecordatorioCola[]): GrupoCola[] {
    const grupos = new Map<string, GrupoCola>();

    for (const f of filas) {
        const clave = [f.fecha, f.rutContraparte, f.emailDestino.toLowerCase(), f.estado, f.asunto ?? "", f.horaEnvio ?? "", f.automatico ? "A" : "M"].join("|");
        const g = grupos.get(clave) ?? {
            clave,
            fecha: f.fecha,
            hora: f.hora,
            horaEnvio: f.horaEnvio,
            rut: f.rutContraparte,
            razonSocial: f.razonSocial,
            email: f.emailDestino,
            nombre: f.nombreDestino,
            estado: f.estado,
            automatico: f.automatico,
            asunto: f.asunto,
            error: f.error,
            filas: [],
            total: 0,
        };
        g.filas.push(f);
        g.total += f.montoTotal;
        grupos.set(clave, g);
    }

    return [...grupos.values()];
}

function HistorialCola({ empresa, puedeEditar, version }: { empresa: EmpresaCxc; puedeEditar: boolean; version: number }) {
    const [desde, setDesde] = useState(() => dayjs(hoyChile()).subtract(6, "day").format("YYYY-MM-DD"));
    const [hasta, setHasta] = useState(() => hoyChile());
    const [estado, setEstado] = useState("");
    const [busqueda, setBusqueda] = useState("");
    const [filas, setFilas] = useState<RecordatorioCola[]>([]);
    const [porEstado, setPorEstado] = useState<Record<string, number>>({});
    const [truncado, setTruncado] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");
    const [cancelando, setCancelando] = useState<string | null>(null);
    const [pagina, setPagina] = useState(1);
    const [tamanoPagina, setTamanoPagina] = useState(25);

    const cargar = useCallback(async () => {
        setCargando(true);
        setError("");
        try {
            const r = await api.get<ColaCobranzaResponse>("/baseapi/finanzas/cxc/cobranza-auto/cola", {
                params: { empresa, desde, hasta, ...(estado ? { estado } : {}) },
            });
            setFilas(r.data.data.filas);
            setPorEstado(r.data.data.porEstado);
            setTruncado(r.data.data.truncado);
        } catch (err: any) {
            setError(mensajeError(err, "No se pudo cargar el historial."));
        } finally {
            setCargando(false);
        }
    }, [empresa, desde, hasta, estado]);

    useEffect(() => {
        void cargar();
    }, [cargar, version]);

    useEffect(() => setPagina(1), [empresa, desde, hasta, estado, busqueda]);

    const grupos = useMemo(() => {
        const texto = busqueda.trim().toLowerCase();
        const digitos = texto.replace(/[^0-9k]/g, "");
        return agruparCola(filas).filter(
            (g) =>
                !texto ||
                (g.razonSocial ?? "").toLowerCase().includes(texto) ||
                g.email.toLowerCase().includes(texto) ||
                (digitos.length >= 3 && g.rut.toLowerCase().includes(digitos)) ||
                g.filas.some((f) => f.folio === texto || `${f.tipoDoc}-${f.folio}` === texto),
        );
    }, [filas, busqueda]);

    const cancelar = async (g: GrupoCola) => {
        setCancelando(g.clave);
        setError("");
        try {
            for (const f of g.filas) {
                await api.post(`/baseapi/finanzas/cxc/cobranza-auto/cola/${f.id}/cancelar`);
            }
            await cargar();
        } catch (err: any) {
            setError(mensajeError(err, "No se pudo cancelar."));
            await cargar();
        } finally {
            setCancelando(null);
        }
    };

    const desdeIdx = (pagina - 1) * tamanoPagina;

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <RangePicker
                    allowClear={false}
                    format="DD-MM-YYYY"
                    value={[dayjs(desde), dayjs(hasta)]}
                    presets={[
                        { label: "Hoy", value: [dayjs(hoyChile()), dayjs(hoyChile())] },
                        { label: "Últimos 7 días", value: [dayjs(hoyChile()).subtract(6, "day"), dayjs(hoyChile())] },
                        { label: "Últimos 30 días", value: [dayjs(hoyChile()).subtract(29, "day"), dayjs(hoyChile())] },
                        { label: "Este mes", value: [dayjs(hoyChile()).startOf("month"), dayjs(hoyChile())] },
                    ]}
                    onChange={(valores) => {
                        const [a, b] = valores ?? [];
                        if (a && b) {
                            setDesde(a.format("YYYY-MM-DD"));
                            setHasta(b.format("YYYY-MM-DD"));
                        }
                    }}
                />
                <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700"
                >
                    <option value="">Todos los estados</option>
                    {Object.entries(ESTADOS).map(([id, e]) => (
                        <option key={id} value={id}>
                            {e.label}
                        </option>
                    ))}
                </select>
                <div className="relative w-full sm:w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Cliente, RUT, correo o folio"
                        className="h-8 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-xs outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                    />
                </div>
                <button
                    type="button"
                    onClick={() => void cargar()}
                    disabled={cargando}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                    <RefreshCw size={14} className={cargando ? "animate-spin" : ""} /> Actualizar
                </button>
                <div className="ml-auto flex flex-wrap gap-1.5 text-[11px]">
                    {Object.entries(porEstado).map(([id, n]) => (
                        <Badge key={id} clase={ESTADOS[id]?.clase ?? "bg-slate-100 text-slate-600 ring-slate-200"}>
                            {ESTADOS[id]?.label ?? id}: {n}
                        </Badge>
                    ))}
                </div>
                {truncado && (
                    <p className="basis-full text-[11px] text-amber-700">
                        <AlertTriangle size={12} className="mr-1 inline" /> Hay más registros de los que se muestran: acota el rango de fechas.
                    </p>
                )}
            </div>

            {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="px-4 py-2">Fecha</th>
                                <th className="px-4 py-2">Cliente</th>
                                <th className="px-4 py-2">Para</th>
                                <th className="px-4 py-2">Documentos</th>
                                <th className="px-4 py-2 text-right">Monto</th>
                                <th className="px-4 py-2">Estado</th>
                                {puedeEditar && <th className="px-4 py-2" />}
                            </tr>
                        </thead>
                        <tbody>
                            {grupos.length === 0 && (
                                <tr>
                                    <td colSpan={puedeEditar ? 7 : 6} className="px-4 py-8 text-center text-slate-400">
                                        {cargando ? "Cargando..." : "Sin recordatorios en el rango."}
                                    </td>
                                </tr>
                            )}
                            {grupos.slice(desdeIdx, desdeIdx + tamanoPagina).map((g) => {
                                const est = ESTADOS[g.estado];
                                const cancelable = g.estado === "PENDIENTE" || g.estado === "ERROR";
                                return (
                                    <tr key={g.clave} className="border-t border-slate-100 align-top">
                                        <td className="whitespace-nowrap px-4 py-3">
                                            <div className="font-semibold text-slate-800">{formatFecha(g.fecha)}</div>
                                            <div className="text-slate-400">{g.horaEnvio ? `enviado ${g.horaEnvio}` : `preparado ${g.hora}`}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-slate-900">{g.razonSocial ?? "Sin razón social"}</div>
                                            <div className="text-slate-400">{formatRut(g.rut)}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-slate-700">{g.nombre ?? "—"}</div>
                                            <div className="text-slate-400">{g.email}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1">
                                                {g.filas.map((f) => (
                                                    <div key={f.id} className="flex flex-wrap items-center gap-1.5">
                                                        <span className="font-semibold text-slate-800">
                                                            {f.tipoDoc}-{f.folio}
                                                        </span>
                                                        <Badge clase={claseEtapa(f.tipoRecordatorio)}>{etiquetaEtapa(f.tipoRecordatorio)}</Badge>
                                                        <span className="text-slate-500">{formatCLP(f.montoTotal)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            {g.asunto && <div className="mt-1 text-[11px] text-slate-400">{g.asunto}</div>}
                                        </td>
                                        <td className="px-4 py-3 text-right font-black text-slate-900">{formatCLP(g.total)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap gap-1">
                                                <Badge clase={est?.clase ?? "bg-slate-100 text-slate-600 ring-slate-200"}>{est?.label ?? g.estado}</Badge>
                                                {!g.automatico && <Badge clase="bg-slate-100 text-slate-600 ring-slate-200">Manual</Badge>}
                                                {g.filas.length > 1 && g.estado === "ENVIADO" && <Badge clase="bg-indigo-50 text-indigo-700 ring-indigo-200">1 correo</Badge>}
                                            </div>
                                            {g.error && <div className="mt-1 max-w-xs text-[11px] text-slate-500">{g.error}</div>}
                                        </td>
                                        {puedeEditar && (
                                            <td className="px-4 py-3 text-right">
                                                {cancelable && (
                                                    <Popconfirm
                                                        title="¿Cancelar este recordatorio?"
                                                        description="No se enviará. Esa etapa no se vuelve a preparar; la siguiente sí."
                                                        okText="Cancelar recordatorio"
                                                        cancelText="Volver"
                                                        onConfirm={() => void cancelar(g)}
                                                    >
                                                        <button
                                                            type="button"
                                                            disabled={cancelando !== null}
                                                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                                                        >
                                                            <X size={12} /> {cancelando === g.clave ? "Cancelando..." : "Cancelar"}
                                                        </button>
                                                    </Popconfirm>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {grupos.length > tamanoPagina && (
                    <div className="flex justify-end border-t border-slate-100 px-4 py-3">
                        <Pagination
                            size="small"
                            current={pagina}
                            pageSize={tamanoPagina}
                            total={grupos.length}
                            showSizeChanger
                            pageSizeOptions={[25, 50, 100]}
                            onChange={(p, s) => {
                                setPagina(p);
                                setTamanoPagina(s);
                            }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

/* =========================================================
   CONFIGURACIÓN
========================================================= */

function textoDias(dias: number[]) {
    return dias.join(", ");
}

function parseDias(texto: string): number[] | null {
    const partes = texto
        .split(/[,;\s]+/)
        .map((p) => p.trim().replace("−", "-"))
        .filter(Boolean);
    const numeros = partes.map(Number);
    return numeros.every((n) => Number.isInteger(n)) ? numeros : null;
}

function ConfiguracionCobranza({
    config,
    reglas,
    puedeEditar,
    onGuardado,
}: {
    config: ConfigCobranzaAuto | null;
    reglas: ReglasFijasCobranza | null;
    puedeEditar: boolean;
    onGuardado: (config: ConfigCobranzaAuto) => void;
}) {
    const [form, setForm] = useState({
        activo: false,
        envioAutomatico: false,
        adjuntarPdf: true,
        horaConsultaSii: "",
        horaCobranza: "",
        diasPorVencer: "",
        diasVencidos: "",
    });
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!config) return;
        setForm({
            activo: config.activo,
            envioAutomatico: config.envioAutomatico,
            adjuntarPdf: config.adjuntarPdf,
            horaConsultaSii: config.horaConsultaSii,
            horaCobranza: config.horaCobranza,
            diasPorVencer: textoDias(config.diasPorVencer),
            diasVencidos: textoDias(config.diasVencidos),
        });
        setError("");
    }, [config]);

    if (!config) {
        return <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-400 shadow-sm">Cargando configuración...</div>;
    }

    const guardar = async () => {
        const diasPorVencer = parseDias(form.diasPorVencer);
        const diasVencidos = parseDias(form.diasVencidos);

        if (!diasPorVencer || !diasVencidos) {
            setError("Las etapas deben ser números enteros separados por coma (por ejemplo: -7, -3).");
            return;
        }

        setGuardando(true);
        setError("");
        try {
            const r = await api.patch<{ ok: boolean; data: ConfigCobranzaAuto }>(`/baseapi/finanzas/cxc/cobranza-auto/config/${config.empresaKey}`, {
                activo: form.activo,
                envioAutomatico: form.envioAutomatico,
                adjuntarPdf: form.adjuntarPdf,
                horaConsultaSii: form.horaConsultaSii,
                horaCobranza: form.horaCobranza,
                diasPorVencer,
                diasVencidos,
            });
            onGuardado(r.data.data);
        } catch (err: any) {
            setError(mensajeError(err, "No se pudo guardar la configuración."));
        } finally {
            setGuardando(false);
        }
    };

    const campo = "h-9 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-50";

    return (
        <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-black text-slate-900">Cobranza automática · {config.empresaKey === "rids" ? "RIDS" : "ECONNET"}</h3>

                <div className="space-y-3">
                    {(
                        [
                            { id: "activo", label: "Preparación activa", ayuda: "Cada día, a la hora de preparación, registra los recordatorios que tocan." },
                            {
                                id: "envioAutomatico",
                                label: "Envío automático",
                                ayuda: "A la hora de envío, manda los preparados. Mientras Duemint siga cobrando, los clientes reciben ambos correos.",
                            },
                            { id: "adjuntarPdf", label: "Adjuntar PDF de las facturas", ayuda: "En los correos consolidados, hasta 10 PDF o 2,5 MB." },
                        ] as const
                    ).map((s) => (
                        <div key={s.id} className="flex items-start gap-3">
                            <Switch checked={form[s.id]} disabled={!puedeEditar} onChange={(v) => setForm((f) => ({ ...f, [s.id]: v }))} />
                            <div>
                                <div className="text-sm font-semibold text-slate-800">{s.label}</div>
                                <div className="text-[11px] text-slate-500">{s.ayuda}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <label className="text-xs font-semibold text-slate-600">
                        Hora de preparación
                        <input type="time" value={form.horaConsultaSii} disabled={!puedeEditar} onChange={(e) => setForm((f) => ({ ...f, horaConsultaSii: e.target.value }))} className={campo} />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                        Hora de envío
                        <input type="time" value={form.horaCobranza} disabled={!puedeEditar} onChange={(e) => setForm((f) => ({ ...f, horaCobranza: e.target.value }))} className={campo} />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                        <Tooltip title="Días antes del vencimiento, en negativo. Ej.: -7, -3">
                            <span>Etapas por vencer</span>
                        </Tooltip>
                        <input value={form.diasPorVencer} disabled={!puedeEditar} onChange={(e) => setForm((f) => ({ ...f, diasPorVencer: e.target.value }))} className={campo} />
                    </label>
                    <label className="text-xs font-semibold text-slate-600">
                        <Tooltip title="0 = el día del vencimiento; luego días de vencida. Ej.: 0, 3, 7, 15, 30">
                            <span>Etapas vencidas</span>
                        </Tooltip>
                        <input value={form.diasVencidos} disabled={!puedeEditar} onChange={(e) => setForm((f) => ({ ...f, diasVencidos: e.target.value }))} className={campo} />
                    </label>
                </div>

                {error && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</div>}

                {puedeEditar ? (
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => void guardar()}
                            disabled={guardando}
                            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-cyan-600 px-4 text-sm font-bold text-white hover:bg-cyan-500 disabled:opacity-60"
                        >
                            <Check size={16} /> {guardando ? "Guardando..." : "Guardar"}
                        </button>
                    </div>
                ) : (
                    <p className="text-[11px] text-slate-400">Solo Administración puede cambiar la configuración.</p>
                )}
            </div>

            {reglas && (
                <div className="space-y-2 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-xs text-slate-600 shadow-sm">
                    <h3 className="text-sm font-black text-slate-900">Reglas fijas</h3>
                    <p>
                        Saldo mínimo: <strong>{formatCLP(reglas.saldoMinimo)}</strong>
                    </p>
                    <p>
                        Tope: <strong>{reglas.topeDiasVencida} días</strong> de vencida (después, solo cobranza manual).
                    </p>
                    <p>
                        Después de la última etapa vencida, se repite <strong>cada {reglas.repetirCadaDias} días</strong>.
                    </p>
                    <p>
                        Recuperación: una etapa se prepara hasta <strong>{reglas.diasRecuperacion} días</strong> después de su fecha.
                    </p>
                    <p>Un correo por cliente y destinatario con todas las facturas del día. Antes de enviar se revisa el saldo: si se pagó, no sale.</p>
                </div>
            )}
        </div>
    );
}