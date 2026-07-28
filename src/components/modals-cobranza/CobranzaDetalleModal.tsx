import React, { useMemo } from "react";
import {
    FileTextOutlined,
    ExclamationCircleOutlined,
    UserOutlined,
    EyeOutlined,
    DollarOutlined,
} from "@ant-design/icons";
import { getValue, formatFechaVista, formatCLP } from "../modals-facturasBaseapi/utils";

function estadoFromDoc(doc: any) {
    const pago = getValue(doc, ["estadoPago", "EstadoPago", "estado_pago"], null);
    if (pago) return String(pago).toUpperCase();
    return String(getValue(doc, ["Estado", "estado", "Estado Documento", "estadoDocumento"], "")).toUpperCase();
}

function esPagada(doc: any) {
    const s = estadoFromDoc(doc);
    return s.includes("CONFIRM") || s.includes("PAG");
}

const CobranzaDetalleModal: React.FC<{
    documento: any | null;
    documentosAll: any[];
    onClose: () => void;
    onOpenFullDetail: (doc: any) => void;
    onOpenCliente?: (doc: any) => void;
}> = ({ documento, documentosAll, onClose, onOpenFullDetail, onOpenCliente }) => {
    if (!documento) return null;

    const folio = Number(String(getValue(documento, ["Folio", "folio", "Nro", "numero"], "")).replace(/[^0-9]/g, "") || 0);

    // buscar documentos que referencian este folio (NC/ND que lo nombran en raw/json/XML)
    const referencing = useMemo(() => {
        try {
            if (!folio) return [];

            const empresaKeyThis = String(getValue(documento, ["empresaOrigen", "empresa", "empresaKey", "rutEmpresa"], "")).toLowerCase().trim();
            const rutThis = String(getValue(documento, ['RUT Receptor','rutReceptor','rutCliente','rutProveedor'], '')).replace(/[^0-9kK]/g,'').toLowerCase();
            const razonThis = String(getValue(documento, ['Razon Social','Razón Social','razonSocial','razonSocialReceptor','razonSocialProveedor'], '')).toLowerCase().trim();

            function getEmpresaKeyFrom(d: any) {
                return String(getValue(d, ["empresaOrigen", "empresa", "empresaKey", "rutEmpresa"], "")).toLowerCase().trim();
            }

            function explicitReferenceFound(d: any) {
                try {
                    const raw = d.raw ?? d ?? {};

                    // 1) campos JSON explícitos comunes
                    const possibleKeys = ['folioDocReferencia','folioDocRef','folioRef','FolioRef','folioReferencia','folioDoc','folioReferenciado','referencia','folioRelacionado'];
                    for (const key of possibleKeys) {
                        const val = raw?.[key];
                        const num = Number(val ?? 0);
                        if (Number.isFinite(num) && num > 0 && num === folio) return true;
                    }

                    // 2) array de referencias en raw
                    if (Array.isArray(raw?.referencias)) {
                        for (const r of raw.referencias) {
                            const fol = Number(r?.FolioRef ?? r?.folioRef ?? r?.folio ?? r?.Folio ?? 0);
                            if (fol === folio) return true;
                        }
                    }

                    // 3) buscar en rutas anidadas y XML/JSON dentro de raw
                    const candidates = [raw, raw.documento, raw.data, raw.data?.documento, d.documento, d.data, d.documento?.data];
                    for (const c of candidates) {
                        try {
                            if (!c) continue;
                            const s = JSON.stringify(c || '');
                            const xmlRe = new RegExp(`<FolioRef>\\s*${folio}\\s*<\\/FolioRef>`, 'i');
                            if (xmlRe.test(s)) return true;
                            // match numeric value as whole token, avoid matching inside larger numbers
                            const jsonKeyRe = new RegExp(`"?(?:FolioRef|folioDocReferencia|folioDocRef|folioRef|folioDocReferencia)"?\\s*[:=]\\s*\"?(?:^|\\D)${folio}(?:\\D|$)\"?`, 'i');
                            if (jsonKeyRe.test(s)) return true;
                        } catch { }
                    }

                    // 4) fallback contextual: número cercano a palabras clave (folio, referencia)
                    try {
                        // contextual match: require whole-number boundaries around folio and proximity to keywords
                        try {
                            const rawStr = JSON.stringify(raw || '').toLowerCase();
                            const bounded = `(^|\\D)${folio}(?=\\D|$)`;
                            const ctxRe = new RegExp(`(folio|folioref|referenc|folioDoc|referencia)(?:\\W{0,40})${bounded}`, 'i');
                            const ctxRe2 = new RegExp(`${bounded}(?:\\W{0,40})(folio|folioref|referenc|folioDoc|referencia)`, 'i');
                            if (ctxRe.test(rawStr) || ctxRe2.test(rawStr)) {
                                // exigir coincidencia de empresa/RUT para contextual matches
                                const ek = getEmpresaKeyFrom(d);
                                if (empresaKeyThis && ek && ek !== empresaKeyThis) {
                                    const rutThis = String(getValue(documento, ['RUT Receptor','rutReceptor','rutCliente','rutProveedor'], '')).replace(/[^0-9kK]/g,'');
                                    const rutOther = String(getValue(d, ['RUT Receptor','rutReceptor','rutCliente','rutProveedor'], '')).replace(/[^0-9kK]/g,'');
                                    if (rutThis && rutOther && rutThis === rutOther) return true;
                                    return false;
                                }
                                return true;
                            }
                        } catch { }
                    } catch { }

                    // 5) patrones tipo 'N° 124', 'Nº124', 'No.124' y cercanía con palabras FACTURA/NOTA
                    try {
                        const up = JSON.stringify(raw || '').toUpperCase();
                        const simpleNumRe = new RegExp(`(?:N°|Nº|No\\.|Nro\\.|N\°)\\s*${folio}`);
                        if (simpleNumRe.test(up)) {
                            const ctxWordsRe = new RegExp(`(?:FACTURA|NOTA|NOTA DE CREDITO|NOTA DE DEBITO|CREDITO|DEBITO).{0,40}${folio}`);
                            const ctxWordsRe2 = new RegExp(`${folio}.{0,40}(?:FACTURA|NOTA|NOTA DE CREDITO|NOTA DE DEBITO|CREDITO|DEBITO)`);
                            // exigir contexto o coincidencia de empresa/RUT para evitar falsos positivos
                            const ekOther = getEmpresaKeyFrom(d);
                            const rutThis = String(getValue(documento, ['RUT Receptor','rutReceptor','rutCliente','rutProveedor'], '')).replace(/[^0-9kK]/g,'');
                            const rutOther = String(getValue(d, ['RUT Receptor','rutReceptor','rutCliente','rutProveedor'], '')).replace(/[^0-9kK]/g,'');
                            const sameCompany = Boolean(ekOther && empresaKeyThis && ekOther === empresaKeyThis) || (rutThis && rutOther && rutThis === rutOther);
                            if (ctxWordsRe.test(up) || ctxWordsRe2.test(up) || sameCompany) return true;
                        }
                    } catch { }

                    return false;
                } catch (e) {
                    // debug temporal
                    try { console.debug('explicitReferenceFound error', e, { folio, sample: String(JSON.stringify(d.raw ?? d ?? '')).slice(0,200) }); } catch { }
                    return false;
                }
            }

            // Encuentra referencias explícitas iniciales, luego expande por transitive linking (ej. ND -> NC -> Factura)
            try {
                const candidates = documentosAll.filter((d) => {
                    try {
                        if (!d) return false;
                        const folD = Number(String(getValue(d, ["Folio", "folio", "Nro", "numero"], "")).replace(/[^0-9]/g, "") || 0);
                        if (folD === folio) return false; // mismo documento

                        // preferir detecciones explícitas
                        if (!explicitReferenceFound(d)) return false;

                        // comprobación estricta de misma empresa: empresaKey o RUT o razón social deben coincidir
                        const ek = getEmpresaKeyFrom(d);
                        const rutOther = String(getValue(d, ['RUT Receptor','rutReceptor','rutCliente','rutProveedor'], '')).replace(/[^0-9kK]/g,'').toLowerCase();
                        const razonOther = String(getValue(d, ['Razon Social','Razón Social','razonSocial','razonSocialReceptor','razonSocialProveedor'], '')).toLowerCase().trim();

                        const sameCompany = Boolean(
                            (empresaKeyThis && ek && ek === empresaKeyThis) ||
                            (rutThis && rutOther && rutThis === rutOther) ||
                            (razonThis && razonOther && (razonOther.includes(razonThis) || razonThis.includes(razonOther)))
                        );

                        if (!sameCompany) {
                            try { console.debug('Cobranza: reject by company', { folio, candidateFolio: folD, empresaKeyThis, ek, rutThis, rutOther, razonThis, razonOther }); } catch {}
                            return false;
                        }

                        try { console.debug('Cobranza: accept candidate', { folio, candidateFolio: folD, empresaKeyThis, ek, rutThis, rutOther, razonThis, razonOther }); } catch {}
                        return true;
                    } catch { return false; }
                });

                // helper: comprueba si doc `a` referencia explícitamente el folio `target`
                function explicitRefTo(a: any, target: number) {
                    try {
                        if (!a) return false;
                        const raw = a.raw ?? a ?? {};

                        const possibleKeys = ['folioDocReferencia','folioDocRef','folioRef','FolioRef','folioReferencia','folioDoc','folioReferenciado','referencia','folioRelacionado'];
                        for (const key of possibleKeys) {
                            const val = raw?.[key];
                            const num = Number(val ?? 0);
                            if (Number.isFinite(num) && num > 0 && num === target) return true;
                        }

                        if (Array.isArray(raw?.referencias)) {
                            for (const r of raw.referencias) {
                                const fol = Number(r?.FolioRef ?? r?.folioRef ?? r?.folio ?? r?.Folio ?? 0);
                                if (fol === target) return true;
                            }
                        }

                        const candidates = [raw, raw.documento, raw.data, raw.data?.documento, a.documento, a.data, a.documento?.data];
                        for (const c of candidates) {
                            try {
                                if (!c) continue;
                                const s = JSON.stringify(c || '');
                                const xmlRe = new RegExp(`<FolioRef>\\s*${target}\\s*<\\/FolioRef>`, 'i');
                                if (xmlRe.test(s)) return true;
                                const jsonKeyRe = new RegExp(`"?(?:FolioRef|folioDocReferencia|folioDocRef|folioRef|folioDocReferencia)"?\\s*[:=]\\s*\"?(?:^|\\D)${target}(?:\\D|$)\"?`, 'i');
                                if (jsonKeyRe.test(s)) return true;
                            } catch { }
                        }

                        try {
                            const rawStr = JSON.stringify(raw || '').toLowerCase();
                            const bounded = `(^|\\D)${target}(?=\\D|$)`;
                            const ctxRe = new RegExp(`(folio|folioref|referenc|folioDoc|referencia)(?:\\W{0,40})${bounded}`, 'i');
                            const ctxRe2 = new RegExp(`${bounded}(?:\\W{0,40})(folio|folioref|referenc|folioDoc|referencia)`, 'i');
                            if (ctxRe.test(rawStr) || ctxRe2.test(rawStr)) return true;
                        } catch { }

                        // detectar 'N° 123' y contexto FACTURA/NOTA en rawStr — exigir contexto o coincidencia empresa/RUT
                        try {
                            const up = JSON.stringify(raw || '').toUpperCase();
                            const simpleNumRe = new RegExp(`(?:N°|Nº|No\\.|Nro\\.|N\°)\\s*${target}`);
                            if (simpleNumRe.test(up)) {
                                const ctxWordsRe = new RegExp(`(?:FACTURA|NOTA|NOTA DE CREDITO|NOTA DE DEBITO|CREDITO|DEBITO).{0,40}${target}`);
                                const ctxWordsRe2 = new RegExp(`${target}.{0,40}(?:FACTURA|NOTA|NOTA DE CREDITO|NOTA DE DEBITO|CREDITO|DEBITO)`);
                                const ekOther = getEmpresaKeyFrom(a);
                                const rutThis = String(getValue(documento, ['RUT Receptor','rutReceptor','rutCliente','rutProveedor'], '')).replace(/[^0-9kK]/g,'');
                                const rutOther = String(getValue(a, ['RUT Receptor','rutReceptor','rutCliente','rutProveedor'], '')).replace(/[^0-9kK]/g,'');
                                const sameCompany = Boolean(ekOther && empresaKeyThis && ekOther === empresaKeyThis) || (rutThis && rutOther && rutThis === rutOther);
                                if (ctxWordsRe.test(up) || ctxWordsRe2.test(up) || sameCompany) return true;
                            }
                        } catch { }

                        return false;
                    } catch { return false; }
                }

                // Expandir transitive closure
                const included = new Map<string, any>();
                const queue: any[] = [];

                function keyOf(d: any) {
                    const fol = String(getValue(d, ["Folio", "folio", "Nro", "numero"], "") || '');
                    const ek = getEmpresaKeyFrom(d) || '';
                    return `${ek}|${fol}`;
                }

                // semilla (excluir el documento seleccionado por clave exacta)
                const selectedKey = keyOf(documento);
                for (const c of candidates) {
                    const k = keyOf(c);
                    if (k === selectedKey) continue;
                    if (!included.has(k)) { included.set(k, c); queue.push(c); }
                }

                // bfs limitado (profundidad implícita por queue)
                while (queue.length > 0) {
                    const cur = queue.shift();
                    const curFol = Number(String(getValue(cur, ["Folio", "folio", "Nro", "numero"], "")).replace(/[^0-9]/g, "") || 0);
                    if (!curFol) continue;

                    // buscar documentos que referencian curFol
                    for (const other of documentosAll) {
                        try {
                            const otherFol = Number(String(getValue(other, ["Folio", "folio", "Nro", "numero"], "")).replace(/[^0-9]/g, "") || 0);
                            if (otherFol === curFol) continue; // mismo folio

                            // evitar añadir el documento seleccionado
                            const otherKey = keyOf(other);
                            if (otherKey === selectedKey) continue;

                            // debe ser explícita la referencia
                            if (!explicitRefTo(other, curFol)) continue;

                            // empresa check: exigir coincidencia por empresaKey, RUT o razón social
                            const ek = getEmpresaKeyFrom(other);
                            const rutOther = String(getValue(other, ['RUT Receptor','rutReceptor','rutCliente','rutProveedor'], '')).replace(/[^0-9kK]/g,'').toLowerCase();
                            const razonOther = String(getValue(other, ['Razon Social','Razón Social','razonSocial','razonSocialReceptor','razonSocialProveedor'], '')).toLowerCase().trim();
                            const sameCompany = Boolean(
                                (empresaKeyThis && ek && ek === empresaKeyThis) ||
                                (rutThis && rutOther && rutThis === rutOther) ||
                                (razonThis && razonOther && (razonOther.includes(razonThis) || razonThis.includes(razonOther)))
                            );
                            if (!sameCompany) continue;

                            const k = keyOf(other);
                            if (!included.has(k)) { included.set(k, other); queue.push(other); }
                        } catch { }
                    }
                }

                // mapear a estructura para UI
                const out = Array.from(included.values()).map((d) => ({
                    tipo: getValue(d, ["Tipo Doc", "tipoDoc", "tipoDTE"], ""),
                    folio: getValue(d, ["Folio", "folio", "Nro", "numero"], ""),
                    fecha: formatFechaVista(getValue(d, ["Fecha Docto", "fechaDocto", "fechaEmision", "fechaRecepcion"], "")),
                    razon: getValue(d, ["Razon Social", "Razón Social", "razonSocial", "razonSocialReceptor", "razonSocialProveedor"], ""),
                    rut: getValue(d, ["RUT Receptor", "RUT Cliente", "Rut cliente", "rutReceptor", "rutCliente", "rutProveedor"], ""),
                    total: getValue(d, ["Monto total", "Monto Total", "montoTotal"], 0),
                    raw: d,
                }));

                return out;
            } catch { return []; }
        } catch { return []; }
    }, [documento, documentosAll, folio]);

    const hasNC = Boolean(documento?.hasNC || documento?.hasNC === true);
    const hasND = Boolean(documento?.hasND || documento?.hasND === true);

    const nombreCliente = String(getValue(documento, ["Razon Social", "Razón Social", "razonSocial", "razonSocialReceptor", "razonSocialProveedor"], "—"));
    const total = formatCLP(getValue(documento, ["Monto total", "Monto Total", "montoTotal"], 0));
    const pagada = esPagada(documento);

    return (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
            <div className="flex w-full max-w-3xl flex-col rounded-3xl bg-white shadow-2xl max-h-[92vh]">

                {/* Header */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
                            <FileTextOutlined style={{ fontSize: 18 }} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="truncate text-lg font-black text-slate-900">Documento #{folio}</h2>
                            <p className="text-xs text-slate-400">Vista rápida · {nombreCliente}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50 transition shrink-0">
                        Cerrar
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto px-6 py-5 flex flex-col gap-4">

                    {(hasNC || hasND) && (
                        <div className="flex flex-wrap gap-2">
                            {hasNC && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-100">
                                    <ExclamationCircleOutlined /> Nota de Crédito adjunta
                                </span>
                            )}
                            {hasND && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-100">
                                    <ExclamationCircleOutlined /> Nota de Débito adjunta
                                </span>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="mb-2 flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 text-sm">
                                    <FileTextOutlined />
                                </span>
                                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Tipo · Folio</span>
                            </div>
                            <p className="text-lg font-black text-slate-900">{getValue(documento, ["Tipo Doc", "tipoDoc", "tipoDTE"], "—")} · #{folio}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                            <div className="mb-2 flex items-center gap-2">
                                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 text-sm">
                                    <DollarOutlined />
                                </span>
                                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Total</span>
                            </div>
                            <p className="text-lg font-black text-slate-900">{total}</p>
                        </div>
                        <div className={`rounded-2xl border p-4 ${pagada ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                            <div className="mb-2 flex items-center gap-2">
                                <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm ${pagada ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
                                    <ExclamationCircleOutlined />
                                </span>
                                <span className={`text-[11px] font-bold uppercase tracking-wide ${pagada ? "text-emerald-600" : "text-amber-600"}`}>Estado</span>
                            </div>
                            <p className={`text-lg font-black ${pagada ? "text-emerald-700" : "text-amber-700"}`}>{pagada ? "Pagada" : "Pendiente"}</p>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 overflow-hidden">
                        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3 flex items-center justify-between">
                            <p className="text-sm font-bold text-slate-800">Documentos que referencian este folio</p>
                            <span className="text-xs text-slate-400">{referencing.length} encontrado{referencing.length !== 1 ? "s" : ""}</span>
                        </div>

                        <div className="p-4">
                            {referencing.length === 0 && (
                                <div className="text-sm text-slate-400">No se encontraron NC/ND que referencien este folio en el payload actual.</div>
                            )}

                            <div className="flex flex-col gap-2">
                                {referencing.map((r, idx) => (
                                    <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-3">
                                        <div>
                                            <div className="text-sm font-semibold text-slate-800">{r.razon || '—'}</div>
                                            <div className="text-xs text-slate-500">Tipo {r.tipo} · Folio {r.folio} · {r.fecha}</div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="text-sm font-bold text-slate-700">{formatCLP(r.total || 0)}</div>
                                            <button className="rounded-lg bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-100 transition" onClick={() => onOpenFullDetail(r.raw)}>Abrir detalle</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
                    {onOpenCliente && (
                        <button
                            onClick={() => onOpenCliente(documento)}
                            className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-bold text-cyan-700 hover:bg-cyan-100 transition"
                        >
                            <UserOutlined /> Ver ficha del cliente
                        </button>
                    )}
                    <button onClick={() => onOpenFullDetail(documento)} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500 transition">
                        <EyeOutlined /> Ver detalle completo
                    </button>
                    <button onClick={onClose} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition">Cerrar</button>
                </div>
            </div>
        </div>
    );
};

export default CobranzaDetalleModal;
