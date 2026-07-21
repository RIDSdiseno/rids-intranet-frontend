import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom";
import {
    MailOutlined,
    UserOutlined,
    FileTextOutlined,
    ClockCircleOutlined,
    CheckCircleOutlined,
    CheckCircleFilled,
    CloseCircleOutlined,
    DownOutlined,
} from "@ant-design/icons";
import {
    getValue,
    formatFechaVista,
    formatCLP,
    getMontoTotalDoc,
    EMPRESAS_PDF,
    imageUrlToBase64,
    escapeHtml,
    MESES,
} from "../modals-facturasBaseapi/utils";
import { generarPdfDocumentoSeleccionado } from "../modals-facturasBaseapi/pdfDocumento";
import type { EmpresaKey, TabRCV } from "../modals-facturasBaseapi/types";
import { buscarCorreoPorRut } from "./buscarCorreoCliente";
import { fetchPuntualidadCliente, type PuntualidadCliente } from "../modals-facturasBaseapi/rcvConciliacion.api";

const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:4000/api";

function estadoFromDoc(doc: any) {
    const pago = getValue(doc, ["estadoPago", "EstadoPago", "estado_pago"], null);
    if (pago) return String(pago).toUpperCase();
    return String(getValue(doc, ["Estado", "estado", "Estado Documento", "estadoDocumento"], "")).toUpperCase();
}

function isPagada(doc: any) {
    const s = estadoFromDoc(doc);
    return s.includes("CONFIRM") || s.includes("PAG");
}

function estadoBadgeInfo(doc: any) {
    const s = estadoFromDoc(doc);
    if (s.includes("CONFIRM") || s.includes("PAG")) {
        return { label: "Pagada", className: "bg-emerald-100 text-emerald-700", icon: <CheckCircleOutlined /> };
    }
    if (s.includes("VENC")) {
        return { label: "Vencida", className: "bg-red-100 text-red-700", icon: <CloseCircleOutlined /> };
    }
    return { label: "Pendiente", className: "bg-amber-100 text-amber-700", icon: <ClockCircleOutlined /> };
}

const PUNTUALIDAD_INFO: Record<string, { label: string; className: string }> = {
    BUEN_PAGADOR: { label: "Buen pagador", className: "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200" },
    IRREGULAR: { label: "Pagador irregular", className: "bg-amber-100 text-amber-700 ring-1 ring-amber-200" },
    RIESGO_MORA: { label: "Riesgo de mora", className: "bg-rose-100 text-rose-700 ring-1 ring-rose-200" },
    SIN_HISTORIAL: { label: "Sin historial suficiente", className: "bg-slate-100 text-slate-500 ring-1 ring-slate-200" },
};

function periodoDeDoc(doc: any, fallbackMes: string, fallbackAno: string): string {
    const raw = String(getValue(doc, ["Fecha Docto", "fechaDocto", "fechaEmision"], "")).trim();
    const match = raw.match(/^(\d{4})-(\d{2})-\d{2}/);
    if (match) {
        const [, ano, mes] = match;
        const idx = Number(mes) - 1;
        if (idx >= 0 && idx < MESES.length) return `${MESES[idx]} ${ano}`;
    }
    const idxFallback = Number(fallbackMes) - 1;
    if (idxFallback >= 0 && idxFallback < MESES.length) return `${MESES[idxFallback]} ${fallbackAno}`;
    return "—";
}

function getAuthHeaders() {
    const token = localStorage.getItem("accessToken") ?? "";
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

async function fetchDetalleDteStandalone(doc: any, opts: { empresa: string; mes: string; ano: string }) {
    try {
        const folio = getValue(doc, ["Folio", "folio", "Nro", "numero"], "");
        const tipoDTE = getValue(doc, ["Tipo Doc", "tipoDoc", "tipoDTE"], "33");
        if (!folio) return null;

        const empresaDocumento = String(getValue(doc, ["empresaOrigen", "empresa", "empresaKey"], opts.empresa)).toLowerCase();
        const params = new URLSearchParams({ periodo: `${opts.ano}-${opts.mes}`, empresa: empresaDocumento, tipoDTE: String(tipoDTE) });

        const res = await fetch(`${BASE_URL}/baseapi/dte/folio/${folio}?${params.toString()}`, { headers: getAuthHeaders() });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string | null;
            if (!result) return resolve("");
            const comma = result.indexOf(",");
            resolve(comma >= 0 ? result.slice(comma + 1) : result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

type Props = {
    documentos: any[];
    nombre: string;
    rut: string;
    empresa: EmpresaKey;
    activeTab: TabRCV;
    mes: string;
    ano: string;
    onClose: () => void;
    onOpenFullDetail: (doc: any) => void;
    onDescargar?: (doc: any) => void | Promise<void>;
    onRecordatorio?: (doc: any) => void;
    onEditarVencimiento?: (doc: any) => void;
    onHistorial?: (doc: any) => void;
};

const RowActionsMenu: React.FC<{
    doc: any;
    onOpenFullDetail: (doc: any) => void;
    onDescargar?: (doc: any) => void | Promise<void>;
    onRecordatorio?: (doc: any) => void;
    onEditarVencimiento?: (doc: any) => void;
    onHistorial?: (doc: any) => void;
}> = ({ doc, onOpenFullDetail, onDescargar, onRecordatorio, onEditarVencimiento, onHistorial }) => {
    const [open, setOpen] = useState(false);
    const btnRef = useRef<HTMLButtonElement | null>(null);
    const [anchor, setAnchor] = useState<DOMRect | null>(null);

    const toggle = (e?: any) => {
        e && e.stopPropagation();
        if (!open) {
            const rect = btnRef.current?.getBoundingClientRect() ?? null;
            setAnchor(rect);
            setOpen(true);
            setTimeout(() => {
                const handler = (ev: any) => {
                    if (!btnRef.current) return;
                    if (btnRef.current.contains(ev.target)) return;
                    setOpen(false);
                    document.removeEventListener("click", handler);
                };
                document.addEventListener("click", handler);
            }, 0);
        } else {
            setOpen(false);
        }
    };

    const close = () => setOpen(false);

    const menu = open && anchor && typeof document !== "undefined" ? ReactDOM.createPortal(
        (() => {
            const menuWidth = 192;
            const viewportW = window.innerWidth;
            const viewportH = window.innerHeight;
            const spaceBelow = viewportH - anchor.bottom;
            const maxMenuH = Math.min(viewportH * 0.45, 360);
            const placeBelow = spaceBelow >= 200;

            let left = anchor.left + (anchor.width || 0) - menuWidth;
            if (left + menuWidth + 12 > viewportW) left = Math.max(8, viewportW - menuWidth - 12);
            if (left < 8) left = 8;

            const topBelow = anchor.top + window.scrollY + (anchor.height || 0);
            const topAbove = anchor.top + window.scrollY;

            const style: any = { position: "fixed", left, zIndex: 9999 };
            if (placeBelow) {
                style.top = topBelow;
                style.transform = "translateY(0)";
            } else {
                style.top = topAbove;
                style.transform = "translateY(-100%)";
            }

            return (
                <div style={style}>
                    <div className="mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg" style={{ maxHeight: maxMenuH, overflow: "auto" }}>
                        <div className="flex flex-col p-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); close(); onOpenFullDetail(doc); }}
                                className="w-full text-left rounded px-2 py-2 text-sm hover:bg-slate-100"
                            >
                                Ver detalle
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); close(); onDescargar?.(doc); }}
                                className="w-full text-left rounded px-2 py-2 text-sm hover:bg-slate-100"
                            >
                                Descargar
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); close(); onRecordatorio?.(doc); }}
                                className="w-full text-left rounded px-2 py-2 text-sm hover:bg-slate-100"
                            >
                                Recordatorios
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); close(); onEditarVencimiento?.(doc); }}
                                className="w-full text-left rounded px-2 py-2 text-sm hover:bg-slate-100"
                            >
                                Editar vencimiento
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); close(); onHistorial?.(doc); }}
                                className="w-full text-left rounded px-2 py-2 text-sm hover:bg-slate-100"
                            >
                                Historial
                            </button>
                        </div>
                    </div>
                </div>
            );
        })(),
        document.body
    ) : null;

    return (
        <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
            <button ref={btnRef} onClick={toggle} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                Acciones <DownOutlined style={{ fontSize: 9 }} />
            </button>
            {menu}
        </div>
    );
};

const ClienteDetalleModal: React.FC<Props> = ({ documentos, nombre, rut, empresa, activeTab, mes, ano, onClose, onOpenFullDetail, onDescargar, onRecordatorio, onEditarVencimiento, onHistorial }) => {
    const [email, setEmail] = useState("");
    const [emailAutocompletado, setEmailAutocompletado] = useState(false);
    const [buscandoCorreo, setBuscandoCorreo] = useState(true);
    const [observacion, setObservacion] = useState("");
    const [enviando, setEnviando] = useState(false);
    const [progreso, setProgreso] = useState<string>("");
    const [resultado, setResultado] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [puntualidad, setPuntualidad] = useState<PuntualidadCliente | null>(null);
    const [puntualidadLoading, setPuntualidadLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        setBuscandoCorreo(true);
        buscarCorreoPorRut(rut).then((found) => {
            if (mounted && found) { setEmail(found); setEmailAutocompletado(true); }
            if (mounted) setBuscandoCorreo(false);
        });
        return () => { mounted = false; };
    }, [rut]);

    useEffect(() => {
        let mounted = true;
        setPuntualidadLoading(true);
        fetchPuntualidadCliente({ empresa, rut }).then((data) => {
            if (mounted) { setPuntualidad(data); setPuntualidadLoading(false); }
        });
        return () => { mounted = false; };
    }, [rut, empresa]);

    const ordenados = useMemo(() => {
        return [...documentos].sort((a, b) => {
            const fa = String(getValue(a, ["Fecha Docto", "fechaDocto", "fechaEmision"], ""));
            const fb = String(getValue(b, ["Fecha Docto", "fechaDocto", "fechaEmision"], ""));
            return fb.localeCompare(fa);
        });
    }, [documentos]);

    const pendientes = useMemo(() => ordenados.filter((d) => !isPagada(d)), [ordenados]);
    const pagadas = useMemo(() => ordenados.filter((d) => isPagada(d)), [ordenados]);

    const totalPendiente = useMemo(() => pendientes.reduce((s, d) => s + Number(getMontoTotalDoc(d) || 0), 0), [pendientes]);
    const totalPagado = useMemo(() => pagadas.reduce((s, d) => s + Number(getMontoTotalDoc(d) || 0), 0), [pagadas]);

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

    async function handleEnviarConsolidado() {
        if (!emailValido || pendientes.length === 0) return;
        setEnviando(true);
        setResultado(null);
        try {
            const empresaKey = String(empresa || "econnet").toLowerCase();
            const empresaPdf = EMPRESAS_PDF[empresaKey] ?? EMPRESAS_PDF["econnet"];
            const logoBase64 = empresaPdf.logo ? await imageUrlToBase64(empresaPdf.logo) : "";

            const attachments: Array<{ name: string; contentType: string; contentBytes: string; size: number }> = [];
            const filas: string[] = [];

            for (let i = 0; i < pendientes.length; i++) {
                const doc = pendientes[i];
                const folio = String(getValue(doc, ["Folio", "folio", "Nro", "numero"], "—"));
                setProgreso(`Generando PDF ${i + 1} de ${pendientes.length} (folio ${folio})...`);

                const fechaVenc = getValue(doc, ["FchVenc", "FchVencimiento", "fechaVencimiento", "vencimiento", "fecha_vencimiento", "Vencimiento"], "—");
                const fechaEmision = getValue(doc, ["Fecha Docto", "fechaDocto", "fechaEmision"], "—");
                const total = getMontoTotalDoc(doc);

                filas.push(`
                  <tr>
                    <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb;">#${escapeHtml(folio)}</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb;">${formatFechaVista(fechaEmision)}</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb;">${formatFechaVista(fechaVenc)}</td>
                    <td style="padding:10px 12px; border-bottom:1px solid #e5e7eb; text-align:right; font-weight:700;">${formatCLP(total)}</td>
                  </tr>
                `);

                try {
                    const detalle = await fetchDetalleDteStandalone(doc, { empresa: empresaKey, mes, ano });
                    const pdfResult = await generarPdfDocumentoSeleccionado({
                        documento: doc,
                        detalleDte: detalle,
                        activeTab,
                        empresa: empresaKey as EmpresaKey,
                        mes,
                        ano,
                        autoDownload: false,
                        observacion,
                    });
                    const base64 = await blobToBase64(pdfResult.blob);
                    attachments.push({ name: pdfResult.fileName, contentType: "application/pdf", contentBytes: base64, size: pdfResult.blob.size });
                } catch (e) {
                    console.warn(`No se pudo generar el PDF de la factura #${folio}:`, e);
                }
            }

            setProgreso("Enviando correo...");

            const totalGeneral = formatCLP(totalPendiente);
            const esUna = pendientes.length === 1;
            const tituloCorreo = esUna ? "Recordatorio de factura pendiente" : "Recordatorio de facturas pendientes";

            const periodosUnicos = Array.from(new Set(pendientes.map((d) => periodoDeDoc(d, mes, ano))));
            const periodoTexto = periodosUnicos.length === 1
                ? `del período de <strong>${escapeHtml(periodosUnicos[0])}</strong>`
                : `correspondientes a los períodos <strong>${escapeHtml(periodosUnicos.join(", "))}</strong>`;

            const fraseCantidad = esUna
                ? `mantiene <strong>1</strong> factura pendiente de pago ${periodoTexto}, por un total de <strong>${totalGeneral}</strong>`
                : `mantiene <strong>${pendientes.length}</strong> facturas pendientes de pago ${periodoTexto}, por un total de <strong>${totalGeneral}</strong>`;
            const fraseAdjunto = esUna ? "La factura en PDF se encuentra adjunta a este correo." : "Las facturas en PDF se encuentran adjuntas a este correo.";

            const bodyHtml = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${tituloCorreo}</title></head>
<body style="margin:0; padding:0; background-color:#f0f6f9; font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f6f9;">
  <tr>
    <td align="center" style="padding:28px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:14px; overflow:hidden; border:1px solid #e2f0f5;">
        <tr>
          <td align="center" style="padding:26px 28px 18px; border-bottom:1px solid #eef2f5;">
            <img src="${logoBase64}" alt="${escapeHtml(empresaPdf.nombre)}" style="max-height:52px; object-fit:contain;" />
          </td>
        </tr>
        <tr>
          <td style="background-color:#0891b2; color:#ffffff; padding:16px 28px; font-size:16px; font-weight:700;">
            ${tituloCorreo}
          </td>
        </tr>
        <tr>
          <td style="padding:26px 28px 6px; color:#1f2937; font-size:14px; line-height:1.7;">
            <p style="margin:0 0 14px;">Estimado(a) ${escapeHtml(nombre)}:</p>
            <p style="margin:0 0 14px;">Junto con saludar, le recordamos que ${fraseCantidad}.</p>
            <p style="margin:0 0 14px;">Le pedimos por favor cancelar a la brevedad posible la deuda indicada en este correo.</p>
            ${observacion ? `<p style="margin:0 0 14px;"><strong>Observación:</strong> ${escapeHtml(observacion)}</p>` : ""}
          </td>
        </tr>
        <tr>
          <td style="padding:4px 28px 20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e5e7eb; border-radius:10px; overflow:hidden; font-size:13px;">
              <tr style="background-color:#f8fafc;">
                <td style="padding:10px 12px; font-weight:700; color:#334155;">Folio</td>
                <td style="padding:10px 12px; font-weight:700; color:#334155;">Emisión</td>
                <td style="padding:10px 12px; font-weight:700; color:#334155;">Vencimiento</td>
                <td style="padding:10px 12px; font-weight:700; color:#334155; text-align:right;">Monto</td>
              </tr>
              ${filas.join("")}
              <tr>
                <td colspan="3" style="padding:10px 12px; font-weight:700; color:#0f172a;">Total pendiente</td>
                <td style="padding:10px 12px; font-weight:700; color:#0891b2; text-align:right;">${totalGeneral}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ecfeff; border:1px solid #cffafe; border-radius:10px;">
              <tr><td align="center" style="padding:12px 16px; font-size:12.5px; color:#0e7490;">${fraseAdjunto}</td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="border-top:1px solid #eef2f5; background-color:#f8fbfd; padding:16px 28px; font-size:11px; color:#94a3b8;">
            <div style="font-weight:700; color:#475569; margin-bottom:2px;">${escapeHtml(empresaPdf.nombre)}</div>
            <div>${escapeHtml(empresaPdf.direccion)} · RUT ${escapeHtml(empresaPdf.rut)}</div>
            <div>${escapeHtml(empresaPdf.correo)}${empresaPdf.telefono ? ` · ${escapeHtml(empresaPdf.telefono)}` : ""}</div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
            `;

            const headers = getAuthHeaders();
            const sendResp = await fetch(`${BASE_URL}/correo/enviar-masivo`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    targets: [{ email: email.trim(), nombre }],
                    subject: esUna ? tituloCorreo : `${tituloCorreo} (${pendientes.length})`,
                    bodyHtml,
                    attachments,
                    ratePerMin: 30,
                }),
            });
            const sendJson = await sendResp.json().catch(() => ({}));
            if (!sendResp.ok || !sendJson?.ok) {
                const msg = sendJson?.message || sendJson?.error || `Error ${sendResp.status}`;
                throw new Error(String(msg));
            }

            setProgreso("Registrando historial...");

            // Un log de auditoría por cada factura incluida, para que aparezca en el Historial de cada una
            for (const doc of pendientes) {
                try {
                    const folioAudit = String(getValue(doc, ["Folio", "folio", "Nro", "numero"], "")).replace(/[^0-9]/g, "") || null;
                    await fetch(`${BASE_URL}/audit`, {
                        method: "POST",
                        headers,
                        body: JSON.stringify({
                            entity: "Documento",
                            entityId: folioAudit,
                            action: "CREATE",
                            description: esUna ? `Recordatorio (${tituloCorreo})` : `Recordatorio consolidado (${pendientes.length} facturas pendientes)`,
                            changes: { canal: "email", contacto: email.trim(), observacion, totalFacturas: pendientes.length },
                        }),
                    });
                } catch (e) { console.warn("No se pudo crear audit log para folio:", e); }
            }

            setResultado({ type: "success", text: esUna ? `Recordatorio enviado a ${email.trim()} con la factura adjunta.` : `Recordatorio enviado a ${email.trim()} con ${pendientes.length} facturas adjuntas.` });
        } catch (e: any) {
            console.error("Error enviando recordatorio consolidado:", e);
            setResultado({ type: "error", text: String(e?.message ?? e) });
        } finally {
            setProgreso("");
            setEnviando(false);
        }
    }

    const initials = String(nombre || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
            <div className="flex w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl max-h-[92vh]">

                {/* Header */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-sm font-black text-cyan-700">
                            {initials || <UserOutlined />}
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="truncate text-lg font-black text-slate-900">{nombre}</h2>
                                {puntualidadLoading ? (
                                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-400 animate-pulse">
                                        Evaluando puntualidad...
                                    </span>
                                ) : puntualidad ? (
                                    <span
                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${PUNTUALIDAD_INFO[puntualidad.estado].className}`}
                                        title={
                                            puntualidad.estado === "SIN_HISTORIAL"
                                                ? "Se necesitan al menos 3 facturas pagadas con vencimiento registrado para evaluar puntualidad."
                                                : `${puntualidad.aTiempo} a tiempo, ${puntualidad.atrasadas} atrasada(s) de ${puntualidad.conVencimientoRegistrado} con vencimiento registrado${puntualidad.promedioDiasAtraso ? ` · promedio ${puntualidad.promedioDiasAtraso} día(s) de atraso` : ""}`
                                        }
                                    >
                                        {PUNTUALIDAD_INFO[puntualidad.estado].label}
                                        {puntualidad.score !== null ? ` · ${puntualidad.score}` : ""}
                                    </span>
                                ) : null}
                            </div>
                            <p className="text-xs text-slate-400">RUT {rut || "—"}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50 transition shrink-0">
                        Cerrar
                    </button>
                </div>

                {/* Body (scrollable) */}
                <div className="flex-1 overflow-auto px-6 py-5 flex flex-col gap-5">

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="mb-2 flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 text-sm">
                                    <FileTextOutlined />
                                </span>
                                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Documentos</span>
                            </div>
                            <p className="text-2xl font-black text-slate-900">{ordenados.length}</p>
                        </div>
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                            <div className="mb-2 flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-600 text-sm">
                                    <ClockCircleOutlined />
                                </span>
                                <span className="text-[11px] font-bold uppercase tracking-wide text-amber-600">Pendiente</span>
                            </div>
                            <p className="text-2xl font-black text-amber-700">{formatCLP(totalPendiente)}</p>
                            <p className="mt-0.5 text-xs text-amber-600">{pendientes.length} factura{pendientes.length !== 1 ? "s" : ""}</p>
                        </div>
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                            <div className="mb-2 flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 text-sm">
                                    <CheckCircleOutlined />
                                </span>
                                <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-600">Pagado</span>
                            </div>
                            <p className="text-2xl font-black text-emerald-700">{formatCLP(totalPagado)}</p>
                            <p className="mt-0.5 text-xs text-emerald-600">{pagadas.length} factura{pagadas.length !== 1 ? "s" : ""}</p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
                            <p className="text-sm font-bold text-slate-800">Historial de facturas</p>
                            <p className="text-xs text-slate-400">{ordenados.length} documento{ordenados.length !== 1 ? "s" : ""} de este cliente</p>
                        </div>
                        <div className="max-h-64 overflow-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="sticky top-0 bg-white text-[10px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-2.5">Folio</th>
                                        <th className="px-4 py-2.5">Fecha</th>
                                        <th className="px-4 py-2.5">Estado</th>
                                        <th className="px-4 py-2.5 text-right">Total</th>
                                        <th className="px-4 py-2.5 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {ordenados.length === 0 && (
                                        <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">Sin documentos para este cliente.</td></tr>
                                    )}
                                    {ordenados.map((doc, idx) => {
                                        const folio = getValue(doc, ["Folio", "folio", "Nro", "numero"], "—");
                                        const fecha = formatFechaVista(getValue(doc, ["Fecha Docto", "fechaDocto", "fechaEmision"], ""));
                                        const badge = estadoBadgeInfo(doc);
                                        return (
                                            <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                                <td className="px-4 py-2.5 font-semibold text-slate-700">#{folio}</td>
                                                <td className="px-4 py-2.5 text-slate-500">{fecha}</td>
                                                <td className="px-4 py-2.5">
                                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${badge.className}`}>
                                                        {badge.icon}
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-right font-bold text-slate-700">{formatCLP(getMontoTotalDoc(doc))}</td>
                                                <td className="px-4 py-2.5 text-right">
                                                    <RowActionsMenu
                                                        doc={doc}
                                                        onOpenFullDetail={onOpenFullDetail}
                                                        onDescargar={onDescargar}
                                                        onRecordatorio={onRecordatorio}
                                                        onEditarVencimiento={onEditarVencimiento}
                                                        onHistorial={onHistorial}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-cyan-100 bg-cyan-50/40 p-4">
                        <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600 text-sm shrink-0">
                                <MailOutlined />
                            </span>
                            <div>
                                <h3 className="text-sm font-bold text-slate-800">
                                    {pendientes.length === 1 ? "Enviar recordatorio de la factura pendiente" : "Enviar recordatorio de todas las pendientes"}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    {pendientes.length === 1
                                        ? "Se enviará un correo con la factura pendiente y su PDF adjunto."
                                        : `Se enviará un solo correo con un resumen de las ${pendientes.length} facturas pendientes y todas las facturas en PDF adjuntas.`}
                                </p>
                            </div>
                        </div>

                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div>
                                <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                    Correo de destino
                                    {emailAutocompletado && email && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                                            <CheckCircleFilled /> autocompletado
                                        </span>
                                    )}
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setEmailAutocompletado(false); }}
                                    placeholder={buscandoCorreo ? "Buscando correo..." : "correo@ejemplo.com"}
                                    className={`h-10 w-full rounded-lg border px-3 text-sm outline-none focus:ring-2 focus:ring-cyan-100 ${email && !emailValido ? "border-red-300 bg-red-50" : "border-slate-200"}`}
                                />
                                {email && !emailValido && <p className="mt-1 text-xs text-red-500">Ingresa un correo válido</p>}
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-slate-600">Observación (opcional)</label>
                                <input
                                    value={observacion}
                                    onChange={(e) => setObservacion(e.target.value)}
                                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-cyan-100"
                                />
                            </div>
                        </div>

                        {resultado && (
                            <div className={`mt-3 rounded-lg px-3 py-2 text-sm ${resultado.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                                {resultado.text}
                            </div>
                        )}

                        <div className="mt-3 flex items-center justify-between gap-3">
                            <p className="text-xs text-slate-500">{progreso}</p>
                            <button
                                onClick={handleEnviarConsolidado}
                                disabled={!emailValido || pendientes.length === 0 || enviando}
                                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <MailOutlined />
                                {enviando
                                    ? "Enviando..."
                                    : pendientes.length === 1
                                        ? "Enviar recordatorio"
                                        : `Enviar recordatorio de todas las pendientes (${pendientes.length})`}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClienteDetalleModal;
