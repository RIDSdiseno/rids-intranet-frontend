// src/components/modals-facturasBaseapi/finanzas/EnviarDocumentoCxcModal.tsx
// Fase 2b: reenviar factura y enviar recordatorio de pago desde la pestaña Facturas.
// Fuente: GET /baseapi/finanzas/cxc/envios/opciones · POST /baseapi/finanzas/cxc/envios/{factura|recordatorio}

import React, { useEffect, useMemo, useState } from "react";

import { AlertTriangle, CheckCircle2, FlaskConical, Mail, Plus, Send, ShieldAlert, X, XCircle } from "lucide-react";

import { api } from "../../../api/api";
import type { EmpresaKey } from "../types";

import type { DocumentoCxc, OpcionesEnvioCxc, ResultadoEnvioCxc, TipoEnvioCxc } from "./cxc.types";

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

/** ISO con hora → "18-11-2026 14:05" en hora de Chile. */
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

function mensajeError(err: any, porDefecto: string) {
    return String(err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message ?? porDefecto);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_DESTINATARIOS = 10;

const TEXTOS: Record<TipoEnvioCxc, { titulo: string; boton: string; receptor: string }> = {
    factura: { titulo: "Reenviar factura", boton: "Reenviar", receptor: "facturación" },
    recordatorio: { titulo: "Enviar recordatorio", boton: "Enviar recordatorio", receptor: "cobranza" },
};

/* =========================================================
   COMPONENTE
========================================================= */

type Props = {
    tipo: TipoEnvioCxc;
    empresa: EmpresaKey;
    documento: DocumentoCxc;
    onClose: () => void;
    /** Resumen para el aviso de la pestaña. */
    onEnviado: (resultado: ResultadoEnvioCxc) => void;
};

const EnviarDocumentoCxcModal: React.FC<Props> = ({ tipo, empresa, documento, onClose, onEnviado }) => {
    const [opciones, setOpciones] = useState<OpcionesEnvioCxc | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    const [seleccion, setSeleccion] = useState<string[]>([]);
    const [extras, setExtras] = useState<string[]>([]);
    const [nuevoEmail, setNuevoEmail] = useState("");
    const [errorEmail, setErrorEmail] = useState("");

    const [enviando, setEnviando] = useState(false);
    const [resultado, setResultado] = useState<ResultadoEnvioCxc | null>(null);

    const textos = TEXTOS[tipo];
    const claveDoc = {
        empresa,
        tipoDoc: documento.tipoDoc,
        folio: documento.folio,
        rutContraparte: documento.rutContraparte,
    };

    /* ---------- Carga ---------- */

    useEffect(() => {
        let activo = true;
        setCargando(true);
        setError("");

        api.get<{ ok: boolean; data: OpcionesEnvioCxc }>("/baseapi/finanzas/cxc/envios/opciones", { params: { tipo, ...claveDoc } })
            .then((response) => {
                if (!activo) return;
                const data = response.data.data;
                setOpciones(data);
                setSeleccion(data.contactos.filter((c) => c.habilitado).map((c) => c.email));
            })
            .catch((err) => activo && setError(mensajeError(err, "No se pudieron cargar los destinatarios.")))
            .finally(() => activo && setCargando(false));

        return () => {
            activo = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tipo, empresa, documento.key]);

    /* ---------- Destinatarios ---------- */

    const destinatarios = useMemo(() => [...seleccion, ...extras], [seleccion, extras]);
    const bloqueado = opciones?.modo.modo === "BLOQUEADO";

    const toggleContacto = (email: string) =>
        setSeleccion((actual) => (actual.includes(email) ? actual.filter((e) => e !== email) : [...actual, email]));

    const agregarExtra = () => {
        const email = nuevoEmail.trim().toLowerCase();
        if (!email) return;

        if (!EMAIL_RE.test(email)) {
            setErrorEmail("Correo inválido.");
            return;
        }

        if (destinatarios.includes(email)) {
            setErrorEmail("Ya está en la lista.");
            return;
        }

        const contacto = opciones?.contactos.find((c) => c.email === email);
        if (contacto) setSeleccion((actual) => [...actual, email]);
        else setExtras((actual) => [...actual, email]);

        setNuevoEmail("");
        setErrorEmail("");
    };

    /* ---------- Envío ---------- */

    const enviar = async () => {
        setEnviando(true);
        setError("");
        try {
            const response = await api.post<{ ok: boolean; data: ResultadoEnvioCxc }>(`/baseapi/finanzas/cxc/envios/${tipo}`, {
                ...claveDoc,
                emails: destinatarios,
            });
            setResultado(response.data.data);
            onEnviado(response.data.data);
        } catch (err: any) {
            setError(mensajeError(err, "No se pudo enviar."));
        } finally {
            setEnviando(false);
        }
    };

    /* ---------- Render ---------- */

    const inputClase =
        "h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100";

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 p-4" onClick={enviando ? undefined : onClose}>
            <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                {/* Cabecera */}
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <h3 className="text-sm font-black text-slate-900">
                        {textos.titulo} · {documento.tipoDoc}-{documento.folio}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={enviando}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-40"
                        aria-label="Cerrar"
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 text-sm">
                    {/* Documento */}
                    <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                        <div className="font-bold text-slate-800">{documento.razonSocial ?? "—"}</div>
                        {tipo === "factura" ? (
                            <div>
                                Emitida el {formatFecha(documento.fechaEmision)} · <strong className="text-slate-900">{formatCLP(documento.montoOriginal)}</strong>
                            </div>
                        ) : (
                            <div>
                                Saldo <strong className="text-slate-900">{formatCLP(documento.saldo)}</strong> · vence {formatFecha(documento.fechaVencimiento)}
                                {documento.diasDiferencia !== null && documento.diasDiferencia > 0 && (
                                    <span className="ml-1 font-bold text-red-600">({documento.diasDiferencia} días vencida)</span>
                                )}
                            </div>
                        )}
                        <div className="mt-1 text-[11px] text-slate-500">Se adjunta el PDF de la factura. Antes de enviar se valida el DTE en BaseAPI.</div>
                    </div>

                    {cargando && <div className="py-6 text-center text-xs text-slate-400">Cargando destinatarios...</div>}

                    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</div>}

                    {/* Resultado */}
                    {resultado && (
                        <div className="space-y-2">
                            <div
                                className={`rounded-xl border p-3 text-xs font-semibold ${resultado.errores === 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"
                                    }`}
                            >
                                {resultado.enviados} enviado{resultado.enviados === 1 ? "" : "s"}
                                {resultado.errores > 0 ? ` · ${resultado.errores} con error` : ""}
                                {resultado.modo === "PRUEBA" ? " (modo prueba: llegaron a la casilla de pruebas)" : ""}
                            </div>
                            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                                {resultado.resultados.map((r) => (
                                    <li key={r.email} className="flex items-start gap-2 px-3 py-2 text-xs">
                                        {r.ok ? <CheckCircle2 size={14} className="mt-0.5 text-emerald-600" /> : <XCircle size={14} className="mt-0.5 text-red-600" />}
                                        <div className="min-w-0 flex-1">
                                            <div className="font-semibold text-slate-800">{r.email}</div>
                                            {r.error && <div className="text-[11px] text-red-600">{r.error}</div>}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {opciones && !resultado && (
                        <>
                            {/* Modo */}
                            {opciones.modo.modo === "PRUEBA" && (
                                <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                                    <FlaskConical size={16} className="shrink-0" />
                                    <span>
                                        <strong>Modo prueba:</strong> los correos llegan a {opciones.modo.destinoPrueba}, no al cliente, y no quedan registrados.
                                    </span>
                                </div>
                            )}
                            {opciones.modo.modo === "REAL" && (
                                <div className="flex gap-2 rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-xs text-cyan-800">
                                    <Mail size={16} className="shrink-0" />
                                    <span>
                                        <strong>Envío real:</strong> el correo llega a los destinatarios marcados.
                                    </span>
                                </div>
                            )}
                            {bloqueado && (
                                <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                                    <ShieldAlert size={16} className="shrink-0" />
                                    <span>
                                        <strong>Envío bloqueado:</strong> falta configurar {opciones.modo.variables} en el servidor.
                                    </span>
                                </div>
                            )}

                            {/* Contactos */}
                            <div>
                                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Contactos de {textos.receptor}</div>

                                {!opciones.receptor.configurado || opciones.contactos.length === 0 ? (
                                    <div className="flex gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                                        <AlertTriangle size={14} className="shrink-0 text-amber-500" />
                                        El cliente no tiene contactos de {textos.receptor} activos. Agrega un correo abajo.
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {opciones.contactos.map((c) => (
                                            <label key={c.email} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50">
                                                <input type="checkbox" checked={seleccion.includes(c.email)} onChange={() => toggleContacto(c.email)} />
                                                <span className="min-w-0 flex-1">
                                                    <span className="font-semibold text-slate-800">{c.email}</span>
                                                    {c.nombre && <span className="ml-1 text-slate-400">· {c.nombre}</span>}
                                                </span>
                                                {c.principal && <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-bold text-cyan-700">principal</span>}
                                                {!c.habilitado && (
                                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">no recibe automáticos</span>
                                                )}
                                            </label>
                                        ))}
                                    </div>
                                )}

                                {opciones.receptor.configurado && !opciones.receptor.recibeAutomatico && (
                                    <div className="mt-1 text-[11px] text-slate-400">El cliente tiene desactivados los envíos automáticos de {textos.receptor}.</div>
                                )}
                            </div>

                            {/* Correo adicional */}
                            <div>
                                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">Correo adicional (solo este envío)</div>
                                <div className="flex gap-2">
                                    <input
                                        value={nuevoEmail}
                                        onChange={(e) => {
                                            setNuevoEmail(e.target.value);
                                            setErrorEmail("");
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                agregarExtra();
                                            }
                                        }}
                                        placeholder="correo@cliente.cl"
                                        className={inputClase}
                                    />
                                    <button
                                        type="button"
                                        onClick={agregarExtra}
                                        className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 hover:bg-slate-50"
                                    >
                                        <Plus size={14} /> Agregar
                                    </button>
                                </div>
                                {errorEmail && <div className="mt-1 text-[11px] font-semibold text-red-600">{errorEmail}</div>}
                                {extras.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {extras.map((email) => (
                                            <span key={email} className="inline-flex items-center gap-1 rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold text-cyan-800">
                                                {email}
                                                <button type="button" onClick={() => setExtras((a) => a.filter((e) => e !== email))} aria-label={`Quitar ${email}`}>
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Historial */}
                            <div>
                                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                    {tipo === "factura" ? "Envíos registrados" : "Recordatorios enviados"}
                                </div>
                                {opciones.historial.length === 0 ? (
                                    <div className="text-xs text-slate-400">Sin envíos registrados.</div>
                                ) : (
                                    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                                        {opciones.historial.map((h, i) => (
                                            <li key={`${h.email}-${i}`} className="flex items-center justify-between gap-2 px-3 py-1.5 text-[11px]">
                                                <span className="min-w-0 truncate font-semibold text-slate-700" title={h.error ?? undefined}>
                                                    {h.email}
                                                </span>
                                                <span className="shrink-0 text-slate-500">
                                                    {h.estado === "ENVIADO" ? formatFechaHora(h.enviadoAt) : h.estado.toLowerCase()} ·{" "}
                                                    {h.automatico ? "automático" : "manual"}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Pie */}
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
                    <span className="text-[11px] text-slate-400">
                        {!resultado && opciones ? `${destinatarios.length} destinatario${destinatarios.length === 1 ? "" : "s"}` : ""}
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={enviando}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-60"
                        >
                            {resultado ? "Cerrar" : "Cancelar"}
                        </button>
                        {!resultado && (
                            <button
                                type="button"
                                onClick={() => void enviar()}
                                disabled={enviando || cargando || !opciones || bloqueado || destinatarios.length === 0 || destinatarios.length > MAX_DESTINATARIOS}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500 disabled:opacity-60"
                            >
                                <Send size={14} />
                                {enviando ? "Enviando..." : textos.boton}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EnviarDocumentoCxcModal;