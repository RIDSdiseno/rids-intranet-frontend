// src/components/modals-facturasBaseapi/finanzas/clientes/ClienteFichaModal.tsx
// Fase 3a: ficha del cliente (una por RUT) con estado de cuenta de RIDS y ECONNET, contactos y configuración.
// Fuente: GET /baseapi/finanzas/cxc/clientes/:rut · PATCH …/config · PUT/DELETE …/contactos

import React, { useCallback, useEffect, useMemo, useState } from "react";

import { Pagination, Tooltip } from "antd";
import {
    AlertTriangle,
    BellRing,
    Building2,
    CheckCircle2,
    Clock3,
    FileText,
    Info,
    MinusCircle,
    MoreVertical,
    Pencil,
    Plus,
    Save,
    Send,
    Star,
    Trash2,
    Undo2,
    Wallet,
    X,
} from "lucide-react";

import { api } from "../../../../api/api";

import type { ContactoClienteCxc, DocumentoCxc, EmpresaCxc, EstadoCxc, FichaClienteCxc, FichaClienteCxcResponse } from "../cxc.types";
import AccionDocumentoCxc, { type AccionCxc, type TipoAccionCxc } from "./AccionDocumentoCxc";
import { ComportamientoPagoCliente, HistorialEnviosCliente } from "./ClienteActividadTabs";

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

export function formatRut(rut: string) {
    const limpio = rut.replace(/[^0-9kK]/g, "").toUpperCase();
    if (limpio.length < 2) return limpio;
    const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${cuerpo}-${limpio.slice(-1)}`;
}

function mensajeError(err: any, porDefecto: string) {
    return String(err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message ?? porDefecto);
}

const EMPRESA_LABEL: Record<EmpresaCxc, string> = { rids: "RIDS", econnet: "ECONNET" };
const EMPRESA_CLASE: Record<EmpresaCxc, string> = { rids: "bg-teal-50 text-teal-700", econnet: "bg-blue-50 text-blue-700" };

const ESTADO_INFO: Record<EstadoCxc, { label: string; icon: React.ReactNode; clase: string }> = {
    VENCIDO: { label: "Vencido", icon: <AlertTriangle size={14} />, clase: "text-red-600" },
    PENDIENTE: { label: "Por vencer", icon: <Clock3 size={14} />, clase: "text-amber-600" },
    PAGADO: { label: "Pagado", icon: <CheckCircle2 size={14} />, clase: "text-emerald-600" },
    COMPENSADO: { label: "Anulado con NC", icon: <MinusCircle size={14} />, clase: "text-slate-400" },
};

const inputClase =
    "h-9 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100";

type DocFicha = FichaClienteCxc["documentos"][number];

type FormContacto = {
    emailOriginal: string | null;
    email: string;
    nombre: string;
    facturas: boolean;
    cobranza: boolean;
    principalFacturas: boolean;
    principalCobranza: boolean;
};

/* =========================================================
   COMPONENTE
========================================================= */

type Props = {
    rut: string;
    onClose: () => void;
    /** Algo cambió (pago, configuración o contactos): el listado debe recargar al cerrar. */
    onCambio: () => void;
    tabInicial?: "cuenta" | "contactos" | "historial" | "comportamiento";
};

const ClienteFichaModal: React.FC<Props> = ({ rut, onClose, onCambio, tabInicial = "cuenta" }) => {
    const [ficha, setFicha] = useState<FichaClienteCxc | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");
    const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

    const [tab, setTab] = useState<"cuenta" | "contactos" | "historial" | "comportamiento">(tabInicial);

    const cargar = useCallback(async () => {
        setCargando(true);
        setError("");
        try {
            const response = await api.get<FichaClienteCxcResponse>(`/baseapi/finanzas/cxc/clientes/${encodeURIComponent(rut)}`);
            setFicha(response.data.data);
        } catch (err: any) {
            setError(mensajeError(err, "No se pudo cargar la ficha."));
        } finally {
            setCargando(false);
        }
    }, [rut]);

    useEffect(() => {
        void cargar();
    }, [cargar]);

    /* ---------- Estado de cuenta ---------- */

    const [filtroDocs, setFiltroDocs] = useState<"abiertos" | "todos">("abiertos");
    const [filtroEmpresa, setFiltroEmpresa] = useState<EmpresaCxc | "">("");
    const [pagina, setPagina] = useState(1);
    const [tamanoPagina, setTamanoPagina] = useState(20);
    const [menuAbierto, setMenuAbierto] = useState<string | null>(null);
    const [accion, setAccion] = useState<AccionCxc | null>(null);

    const documentos = useMemo(
        () =>
            (ficha?.documentos ?? [])
                .filter((d) => filtroDocs === "todos" || d.estado === "VENCIDO" || d.estado === "PENDIENTE")
                .filter((d) => !filtroEmpresa || d.empresaKey === filtroEmpresa),
        [ficha, filtroDocs, filtroEmpresa],
    );

    useEffect(() => setPagina(1), [filtroDocs, filtroEmpresa]);

    const abrirAccion = (tipo: TipoAccionCxc, doc: DocFicha) => {
        setMenuAbierto(null);
        setAccion({ tipo, empresa: doc.empresaKey, doc: doc as DocumentoCxc });
    };

    /* ---------- Configuración ---------- */

    const [config, setConfig] = useState({ razonSocial: "", diasCredito: "", recibeFacturas: false, recibeCobranza: false });
    const [guardandoConfig, setGuardandoConfig] = useState(false);

    useEffect(() => {
        if (!ficha) return;
        setConfig({
            razonSocial: ficha.razonSocial ?? "",
            diasCredito: ficha.diasCredito === null ? "" : String(ficha.diasCredito),
            recibeFacturas: ficha.facturacion.recibe,
            recibeCobranza: ficha.cobranza.recibe,
        });
    }, [ficha]);

    const configCambiada =
        !!ficha &&
        (config.razonSocial.trim() !== (ficha.razonSocial ?? "") ||
            config.diasCredito.trim() !== (ficha.diasCredito === null ? "" : String(ficha.diasCredito)) ||
            config.recibeFacturas !== ficha.facturacion.recibe ||
            config.recibeCobranza !== ficha.cobranza.recibe);

    const guardarConfig = async () => {
        if (!ficha) return;
        setGuardandoConfig(true);
        setAviso(null);
        try {
            const body: Record<string, unknown> = {};
            if (config.razonSocial.trim() !== (ficha.razonSocial ?? "")) body.razonSocial = config.razonSocial.trim() || null;
            if (config.diasCredito.trim() !== (ficha.diasCredito === null ? "" : String(ficha.diasCredito))) {
                body.diasCredito = config.diasCredito.trim() === "" ? null : Number(config.diasCredito);
            }
            if (config.recibeFacturas !== ficha.facturacion.recibe) body.recibeFacturas = config.recibeFacturas;
            if (config.recibeCobranza !== ficha.cobranza.recibe) body.recibeCobranza = config.recibeCobranza;

            const response = await api.patch<FichaClienteCxcResponse>(`/baseapi/finanzas/cxc/clientes/${encodeURIComponent(rut)}/config`, body);
            setFicha(response.data.data);
            setAviso({ tipo: "ok", texto: "Configuración guardada." });
            onCambio();
        } catch (err: any) {
            setAviso({ tipo: "error", texto: mensajeError(err, "No se pudo guardar la configuración.") });
        } finally {
            setGuardandoConfig(false);
        }
    };

    /* ---------- Contactos ---------- */

    const [form, setForm] = useState<FormContacto | null>(null);
    const [guardandoContacto, setGuardandoContacto] = useState(false);
    const [borrar, setBorrar] = useState<ContactoClienteCxc | null>(null);

    const abrirForm = (c: ContactoClienteCxc | null) =>
        setForm(
            c
                ? {
                    emailOriginal: c.email,
                    email: c.email,
                    nombre: c.nombre ?? "",
                    facturas: Boolean(c.facturas?.recibe),
                    cobranza: Boolean(c.cobranza?.recibe),
                    principalFacturas: Boolean(c.facturas?.principal),
                    principalCobranza: Boolean(c.cobranza?.principal),
                }
                : { emailOriginal: null, email: "", nombre: "", facturas: true, cobranza: true, principalFacturas: false, principalCobranza: false },
        );

    const guardarContacto = async () => {
        if (!form) return;
        setGuardandoContacto(true);
        setAviso(null);
        try {
            const response = await api.put<FichaClienteCxcResponse>(`/baseapi/finanzas/cxc/clientes/${encodeURIComponent(rut)}/contactos`, {
                emailOriginal: form.emailOriginal,
                email: form.email.trim(),
                nombre: form.nombre.trim() || null,
                facturas: form.facturas,
                cobranza: form.cobranza,
                principalFacturas: form.facturas && form.principalFacturas,
                principalCobranza: form.cobranza && form.principalCobranza,
            });
            setFicha(response.data.data);
            setForm(null);
            setAviso({ tipo: "ok", texto: "Contacto guardado." });
            onCambio();
        } catch (err: any) {
            setAviso({ tipo: "error", texto: mensajeError(err, "No se pudo guardar el contacto.") });
        } finally {
            setGuardandoContacto(false);
        }
    };

    const eliminarContacto = async () => {
        if (!borrar) return;
        setGuardandoContacto(true);
        setAviso(null);
        try {
            const response = await api.delete<FichaClienteCxcResponse>(`/baseapi/finanzas/cxc/clientes/${encodeURIComponent(rut)}/contactos`, {
                params: { email: borrar.email },
            });
            setFicha(response.data.data);
            setBorrar(null);
            setAviso({ tipo: "ok", texto: "Contacto eliminado." });
            onCambio();
        } catch (err: any) {
            setBorrar(null);
            setAviso({ tipo: "error", texto: mensajeError(err, "No se pudo eliminar el contacto.") });
        } finally {
            setGuardandoContacto(false);
        }
    };

    /* ---------- Render ---------- */

    return (
        <div
            className="fixed inset-0 z-[900] flex items-center justify-center bg-slate-900/40 p-2 sm:p-4"
            // Solo el fondo propio cierra la ficha (no los modales que se abren encima).
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="flex max-h-[94vh] w-full max-w-6xl flex-col rounded-3xl bg-slate-50 shadow-xl" onClick={(e) => e.stopPropagation()}>
                {/* Cabecera */}
                <div className="flex items-start justify-between gap-3 rounded-t-3xl border-b border-cyan-100 bg-white px-5 py-4">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-lg font-black text-slate-900">{ficha?.razonSocial ?? (cargando ? "Cargando..." : "Cliente")}</h2>
                            {ficha?.empresa && (
                                <Tooltip title="Empresa del CRM vinculada al receptor">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                                        <Building2 size={12} /> {ficha.empresa.nombre}
                                    </span>
                                </Tooltip>
                            )}
                        </div>
                        <div className="text-xs text-slate-500">RUT {formatRut(rut)}</div>
                    </div>
                    <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Cerrar">
                        <X size={18} />
                    </button>
                </div>

                {/* Pestañas */}
                <div className="flex gap-1 border-b border-slate-200 bg-white px-5">
                    {(
                        [
                            { id: "cuenta", label: "Estado de cuenta" },
                            { id: "contactos", label: "Contactos y configuración" },
                            { id: "historial", label: "Historial de envíos" },
                            { id: "comportamiento", label: "Comportamiento de pago" },
                        ] as const
                    ).map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => setTab(t.id)}
                            className={`border-b-2 px-3 py-2 text-xs font-bold transition ${tab === t.id ? "border-cyan-600 text-cyan-700" : "border-transparent text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
                    {aviso && (
                        <div
                            className={`flex items-center justify-between rounded-2xl border px-4 py-2.5 text-xs font-semibold ${aviso.tipo === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"
                                }`}
                        >
                            {aviso.texto}
                            <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso">
                                <X size={14} />
                            </button>
                        </div>
                    )}
                    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
                    {cargando && !ficha && <div className="py-16 text-center text-sm text-slate-400">Cargando ficha...</div>}

                    {ficha && tab === "cuenta" && (
                        <>
                            {/* Resumen por empresa */}
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {(["rids", "econnet"] as const).map((empresa) => {
                                    const r = ficha.porEmpresa[empresa];
                                    return (
                                        <div key={empresa} className="rounded-2xl border border-slate-200 bg-white p-4">
                                            <div className="mb-2 flex items-center justify-between">
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${EMPRESA_CLASE[empresa]}`}>{EMPRESA_LABEL[empresa]}</span>
                                                <Tooltip title="Plazo con el que se calcula el vencimiento de las facturas sin fecha propia.">
                                                    <span className="inline-flex cursor-help items-center gap-1 text-[11px] text-slate-500">
                                                        {ficha.plazos[empresa]} <Info size={11} />
                                                    </span>
                                                </Tooltip>
                                            </div>
                                            {r ? (
                                                <>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <Dato label="Por cobrar" valor={formatCLP(r.porCobrar)} detalle={`${r.abiertos} doc.`} />
                                                        <Dato label="Vencido" valor={formatCLP(r.vencido)} detalle={`${r.vencidos} doc.`} clase={r.vencido > 0 ? "text-red-600" : ""} />
                                                        <Dato label="Por vencer" valor={formatCLP(r.porVencer)} detalle={`${r.abiertos - r.vencidos} doc.`} />
                                                    </div>
                                                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                                                        <span>{r.facturas} facturas</span>
                                                        <span>Última emisión {formatFecha(r.ultimaEmision)}</span>
                                                        <span>Último pago {formatFecha(r.ultimoPago)}</span>
                                                        {r.maxDiasVencido > 0 && <span className="font-bold text-red-600">Mayor atraso {r.maxDiasVencido} días</span>}
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="py-3 text-xs text-slate-400">Sin facturas de {EMPRESA_LABEL[empresa]}.</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Facturas */}
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-2.5">
                                    <div className="flex rounded-xl bg-slate-100 p-1">
                                        {(
                                            [
                                                { id: "abiertos", label: "Por cobrar" },
                                                { id: "todos", label: "Todas" },
                                            ] as const
                                        ).map((f) => (
                                            <button
                                                key={f.id}
                                                type="button"
                                                onClick={() => setFiltroDocs(f.id)}
                                                className={`rounded-lg px-3 py-1 text-xs font-bold ${filtroDocs === f.id ? "bg-white text-cyan-700 shadow-sm" : "text-slate-500"}`}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                    <select
                                        value={filtroEmpresa}
                                        onChange={(e) => setFiltroEmpresa(e.target.value as EmpresaCxc | "")}
                                        className="h-8 rounded-lg border border-slate-200 px-2 text-xs text-slate-700"
                                    >
                                        <option value="">RIDS y ECONNET</option>
                                        <option value="rids">Solo RIDS</option>
                                        <option value="econnet">Solo ECONNET</option>
                                    </select>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[760px] text-xs">
                                        <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                                            <tr>
                                                <th className="w-8 px-3 py-2" />
                                                <th className="px-3 py-2 text-left">Empresa</th>
                                                <th className="px-3 py-2 text-left">Documento</th>
                                                <th className="px-3 py-2 text-left">Emisión → Vencimiento</th>
                                                <th className="px-3 py-2 text-right">Días</th>
                                                <th className="px-3 py-2 text-right">Monto</th>
                                                <th className="w-10 px-3 py-2" />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {documentos.slice((pagina - 1) * tamanoPagina, pagina * tamanoPagina).map((doc) => {
                                                const info = ESTADO_INFO[doc.estado];
                                                const abierto = doc.estado === "VENCIDO" || doc.estado === "PENDIENTE";
                                                const clave = `${doc.empresaKey}-${doc.key}`;
                                                return (
                                                    <tr key={clave} className="hover:bg-slate-50">
                                                        <td className={`px-3 py-2 ${info.clase}`}>
                                                            <Tooltip title={info.label}>
                                                                <span className="inline-flex cursor-help">{info.icon}</span>
                                                            </Tooltip>
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${EMPRESA_CLASE[doc.empresaKey]}`}>
                                                                {EMPRESA_LABEL[doc.empresaKey]}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <button type="button" onClick={() => abrirAccion("detalle", doc)} className="font-bold text-cyan-700 hover:underline">
                                                                {doc.tipoDoc}-{doc.folio}
                                                            </button>
                                                        </td>
                                                        <td className="px-3 py-2 text-slate-600">
                                                            {formatFecha(doc.fechaEmision)} → {abierto ? formatFecha(doc.fechaVencimiento) : "—"}
                                                            {doc.estado === "PAGADO" && (
                                                                <div className="text-[10px] text-emerald-700">
                                                                    Pagado {formatFecha(doc.pagadoAt)} {doc.formaPago ? `· ${doc.formaPago}` : ""}
                                                                </div>
                                                            )}
                                                            {doc.estado === "COMPENSADO" && (
                                                                <div className="text-[10px] text-slate-400">Anulada por {doc.notasCredito.join(", ")}</div>
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-right">
                                                            {abierto && doc.diasDiferencia !== null ? (
                                                                doc.diasDiferencia > 0 ? (
                                                                    <span className="rounded-full bg-red-50 px-2 py-0.5 font-bold text-red-700">{doc.diasDiferencia} vencido</span>
                                                                ) : (
                                                                    <span className="rounded-full bg-amber-50 px-2 py-0.5 font-bold text-amber-700">
                                                                        {doc.diasDiferencia === 0 ? "vence hoy" : `en ${-doc.diasDiferencia}`}
                                                                    </span>
                                                                )
                                                            ) : (
                                                                "—"
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2 text-right font-bold text-slate-900">
                                                            {formatCLP(abierto ? doc.saldo : doc.montoOriginal)}
                                                            {abierto && (doc.montoAbonado ?? 0) > 0 && (
                                                                <div className="text-[10px] font-semibold text-cyan-700">abonado {formatCLP(doc.montoAbonado ?? 0)}</div>
                                                            )}
                                                        </td>
                                                        <td className="relative px-3 py-2 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => setMenuAbierto((m) => (m === clave ? null : clave))}
                                                                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                                                                aria-label="Acciones"
                                                            >
                                                                <MoreVertical size={16} />
                                                            </button>
                                                            {menuAbierto === clave && (
                                                                <div className="absolute right-3 top-9 z-20 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-lg">
                                                                    <Opcion icon={<FileText size={14} />} onClick={() => abrirAccion("detalle", doc)}>
                                                                        Ver detalle y PDF
                                                                    </Opcion>
                                                                    {(abierto || (doc.estado === "PAGADO" && (doc.abonos ?? 0) > 0)) && (
                                                                        <Opcion icon={<Wallet size={14} />} onClick={() => abrirAccion("pago", doc)}>
                                                                            {abierto ? "Registrar pago o abono" : "Ver pagos"}
                                                                        </Opcion>
                                                                    )}
                                                                    {doc.estado === "PAGADO" && (doc.abonos ?? 0) === 0 && (
                                                                        <Opcion icon={<Undo2 size={14} />} onClick={() => abrirAccion("anular", doc)}>
                                                                            Anular pago
                                                                        </Opcion>
                                                                    )}
                                                                    {doc.estado !== "COMPENSADO" && (
                                                                        <Opcion icon={<Send size={14} />} onClick={() => abrirAccion("factura", doc)}>
                                                                            Reenviar factura
                                                                        </Opcion>
                                                                    )}
                                                                    {abierto && doc.fechaVencimiento && (
                                                                        <Opcion icon={<BellRing size={14} />} onClick={() => abrirAccion("recordatorio", doc)}>
                                                                            Enviar recordatorio
                                                                        </Opcion>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    {documentos.length === 0 && <div className="px-3 py-8 text-center text-xs text-slate-400">Sin facturas para este filtro.</div>}
                                </div>

                                {documentos.length > 0 && (
                                    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
                                        <span>
                                            {(pagina - 1) * tamanoPagina + 1}–{Math.min(pagina * tamanoPagina, documentos.length)} de {documentos.length}
                                        </span>
                                        <Pagination
                                            size="small"
                                            current={pagina}
                                            pageSize={tamanoPagina}
                                            total={documentos.length}
                                            showSizeChanger
                                            pageSizeOptions={[10, 20, 50, 100]}
                                            onChange={(p, ps) => {
                                                setMenuAbierto(null);
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
                        </>
                    )}

                    {ficha && tab === "contactos" && (
                        <>
                            {/* Configuración */}
                            <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                <h3 className="mb-3 text-xs font-black uppercase tracking-wide text-slate-600">Configuración</h3>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <label className="block">
                                        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Razón social</span>
                                        <input value={config.razonSocial} onChange={(e) => setConfig((c) => ({ ...c, razonSocial: e.target.value }))} className={inputClase} />
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                            Días de crédito (RIDS)
                                            <Tooltip title="Solo aplica a las facturas de RIDS. Vacío = 30 días por defecto. ECONNET siempre vence el día 1 del mes siguiente.">
                                                <Info size={11} className="cursor-help text-slate-400" />
                                            </Tooltip>
                                        </span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={365}
                                            value={config.diasCredito}
                                            placeholder="30 (por defecto)"
                                            onChange={(e) => setConfig((c) => ({ ...c, diasCredito: e.target.value }))}
                                            className={inputClase}
                                        />
                                    </label>
                                    <Interruptor
                                        activo={config.recibeFacturas}
                                        onChange={(v) => setConfig((c) => ({ ...c, recibeFacturas: v }))}
                                        titulo="Envío automático de facturas"
                                        detalle={`${ficha.facturacion.contactos} contacto(s) marcados para facturas`}
                                    />
                                    <Interruptor
                                        activo={config.recibeCobranza}
                                        onChange={(v) => setConfig((c) => ({ ...c, recibeCobranza: v }))}
                                        titulo="Recordatorios automáticos de cobranza"
                                        detalle={`${ficha.cobranza.contactos} contacto(s) marcados para cobranza`}
                                    />
                                </div>
                                <div className="mt-3 flex items-center justify-between gap-2">
                                    <span className="text-[11px] text-slate-400">
                                        Para activar un envío automático, el cliente necesita al menos un contacto marcado para ese tipo.
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => void guardarConfig()}
                                        disabled={!configCambiada || guardandoConfig}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500 disabled:opacity-50"
                                    >
                                        <Save size={14} /> {guardandoConfig ? "Guardando..." : "Guardar"}
                                    </button>
                                </div>
                            </div>

                            {/* Contactos */}
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
                                    <h3 className="text-xs font-black uppercase tracking-wide text-slate-600">Contactos</h3>
                                    <button
                                        type="button"
                                        onClick={() => abrirForm(null)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
                                    >
                                        <Plus size={14} /> Agregar contacto
                                    </button>
                                </div>
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                                        <tr>
                                            <th className="px-4 py-2 text-left">Correo</th>
                                            <th className="px-4 py-2 text-left">Nombre</th>
                                            <th className="px-4 py-2 text-center">
                                                <Tooltip title="Recibe las facturas (envío automático y reenvíos).">
                                                    <span className="cursor-help">Facturas</span>
                                                </Tooltip>
                                            </th>
                                            <th className="px-4 py-2 text-center">
                                                <Tooltip title="Recibe los recordatorios de pago.">
                                                    <span className="cursor-help">Cobranza</span>
                                                </Tooltip>
                                            </th>
                                            <th className="w-20 px-4 py-2" />
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {ficha.contactos.map((c) => (
                                            <tr key={c.email}>
                                                <td className="px-4 py-2 font-semibold text-slate-800">{c.email}</td>
                                                <td className="px-4 py-2 text-slate-600">{c.nombre ?? "—"}</td>
                                                <td className="px-4 py-2 text-center">
                                                    <Marca modulo={c.facturas} />
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    <Marca modulo={c.cobranza} />
                                                </td>
                                                <td className="px-4 py-2 text-right">
                                                    <div className="inline-flex gap-1">
                                                        <button type="button" onClick={() => abrirForm(c)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" aria-label="Editar">
                                                            <Pencil size={14} />
                                                        </button>
                                                        <button type="button" onClick={() => setBorrar(c)} className="rounded-lg p-1 text-red-500 hover:bg-red-50" aria-label="Eliminar">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {ficha.contactos.length === 0 && <div className="px-4 py-8 text-center text-xs text-slate-400">Sin contactos.</div>}
                            </div>
                        </>
                    )}

                    {ficha && tab === "historial" && <HistorialEnviosCliente historial={ficha.historial} />}

                    {ficha && tab === "comportamiento" && <ComportamientoPagoCliente comportamiento={ficha.comportamiento} />}
                </div>
            </div>

            {/* Formulario de contacto */}
            {form && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setForm(null)}>
                    <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-sm font-black text-slate-900">{form.emailOriginal ? "Editar contacto" : "Agregar contacto"}</h3>
                            <button type="button" onClick={() => setForm(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Cerrar">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Correo</span>
                                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClase} placeholder="correo@cliente.cl" />
                            </label>
                            <label className="block">
                                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Nombre (opcional)</span>
                                <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className={inputClase} />
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <MarcaForm
                                    titulo="Facturas"
                                    activo={form.facturas}
                                    principal={form.principalFacturas}
                                    onActivo={(v) => setForm({ ...form, facturas: v })}
                                    onPrincipal={(v) => setForm({ ...form, principalFacturas: v })}
                                />
                                <MarcaForm
                                    titulo="Cobranza"
                                    activo={form.cobranza}
                                    principal={form.principalCobranza}
                                    onActivo={(v) => setForm({ ...form, cobranza: v })}
                                    onPrincipal={(v) => setForm({ ...form, principalCobranza: v })}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-1">
                                <button type="button" onClick={() => setForm(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => void guardarContacto()}
                                    disabled={guardandoContacto || !form.email.trim() || (!form.emailOriginal && !form.facturas && !form.cobranza)}
                                    className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500 disabled:opacity-60"
                                >
                                    {guardandoContacto ? "Guardando..." : "Guardar"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmar eliminación */}
            {borrar && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 p-4" onClick={() => setBorrar(null)}>
                    <div className="w-full max-w-sm rounded-3xl bg-white p-5 text-sm text-slate-600 shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <p>
                            Se eliminará <strong>{borrar.email}</strong> de los contactos de facturación y de cobranza de este cliente.
                        </p>
                        <div className="mt-4 flex justify-end gap-2">
                            <button type="button" onClick={() => setBorrar(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => void eliminarContacto()}
                                disabled={guardandoContacto}
                                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-60"
                            >
                                {guardandoContacto ? "Eliminando..." : "Eliminar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Acciones sobre facturas */}
            {accion && (
                <div>
                    <AccionDocumentoCxc
                        accion={accion}
                        onClose={() => setAccion(null)}
                        onCambio={(mensaje) => {
                            setAccion(null);
                            setAviso({ tipo: "ok", texto: mensaje });
                            onCambio();
                            void (async () => {
                                // El pago cambia el núcleo: se recalcula antes de recargar la ficha.
                                await api.get("/baseapi/finanzas/cxc/documentos", { params: { empresa: accion.empresa, refrescar: 1 } }).catch(() => undefined);
                                await cargar();
                            })();
                        }}
                        onError={(mensaje) => setAviso({ tipo: "error", texto: mensaje })}
                    />
                </div>
            )}
        </div>
    );
};

/* =========================================================
   AUXILIARES
========================================================= */

const Dato: React.FC<{ label: string; valor: string; detalle: string; clase?: string }> = ({ label, valor, detalle, clase = "" }) => (
    <div>
        <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
        <div className={`text-sm font-black text-slate-900 ${clase}`}>{valor}</div>
        <div className="text-[10px] text-slate-400">{detalle}</div>
    </div>
);

const Opcion: React.FC<{ icon: React.ReactNode; onClick: () => void; children: React.ReactNode }> = ({ icon, onClick, children }) => (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">
        {icon}
        <span className="flex-1">{children}</span>
    </button>
);

const Marca: React.FC<{ modulo: ContactoClienteCxc["facturas"] }> = ({ modulo }) => {
    if (!modulo || !modulo.recibe) return <span className="text-slate-300">—</span>;
    return (
        <span className="inline-flex items-center gap-1 text-emerald-600">
            <CheckCircle2 size={14} />
            {modulo.principal && (
                <Tooltip title="Contacto principal">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                </Tooltip>
            )}
        </span>
    );
};

const MarcaForm: React.FC<{
    titulo: string;
    activo: boolean;
    principal: boolean;
    onActivo: (v: boolean) => void;
    onPrincipal: (v: boolean) => void;
}> = ({ titulo, activo, principal, onActivo, onPrincipal }) => (
    <div className={`rounded-xl border p-3 ${activo ? "border-cyan-200 bg-cyan-50/50" : "border-slate-200"}`}>
        <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-700">
            <input type="checkbox" checked={activo} onChange={(e) => onActivo(e.target.checked)} />
            {titulo}
        </label>
        <label className={`mt-2 flex items-center gap-2 text-[11px] ${activo ? "cursor-pointer text-slate-600" : "text-slate-300"}`}>
            <input type="checkbox" checked={activo && principal} disabled={!activo} onChange={(e) => onPrincipal(e.target.checked)} />
            Principal
        </label>
    </div>
);

const Interruptor: React.FC<{ activo: boolean; onChange: (v: boolean) => void; titulo: string; detalle: string }> = ({ activo, onChange, titulo, detalle }) => (
    <button
        type="button"
        onClick={() => onChange(!activo)}
        className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left ${activo ? "border-cyan-200 bg-cyan-50/50" : "border-slate-200"}`}
    >
        <span>
            <span className="block text-xs font-bold text-slate-800">{titulo}</span>
            <span className="block text-[11px] text-slate-500">{detalle}</span>
        </span>
        <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${activo ? "bg-cyan-600" : "bg-slate-300"}`}>
            <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition ${activo ? "left-[18px]" : "left-0.5"}`} />
        </span>
    </button>
);

export default ClienteFichaModal;