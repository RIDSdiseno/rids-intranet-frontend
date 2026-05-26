import React, { useMemo } from "react";
import { FileDoneOutlined, CloseOutlined, ExclamationCircleOutlined } from "@ant-design/icons";
import { getValue, formatFechaVista, formatCLP } from "../modals-facturasBaseapi/utils";

const CobranzaDetalleModal: React.FC<{
    documento: any | null;
    documentosAll: any[];
    onClose: () => void;
    onOpenFullDetail: (doc: any) => void;
}> = ({ documento, documentosAll, onClose, onOpenFullDetail }) => {
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

    return (
        <div className="fixed inset-0 z-60 flex items-start justify-center pt-10">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />

            <div className="relative w-full max-w-3xl rounded-lg bg-white p-6 shadow-lg">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-lg font-semibold flex items-center gap-2">{`Documento #${folio}`}</h2>
                        <p className="text-sm text-slate-500">Vista rápida (Cobranza)</p>
                    </div>

                    <div className="flex items-center gap-2">
                        {hasNC && (
                            <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-100">
                                <ExclamationCircleOutlined /> Nota de Crédito adjunta
                            </span>
                        )}

                        {hasND && (
                            <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-100">
                                <ExclamationCircleOutlined /> Nota de Débito adjunta
                            </span>
                        )}

                        <button onClick={onClose} className="text-slate-500 hover:text-slate-700"> <CloseOutlined /> </button>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3">
                    <div className="rounded-lg border border-cyan-100 bg-cyan-50/30 p-3">
                        <div className="text-sm text-slate-700 font-semibold">Resumen</div>
                        <div className="mt-2 text-sm text-slate-600">Tipo: {getValue(documento, ["Tipo Doc", "tipoDoc", "tipoDTE"], "—")} · Folio: {getValue(documento, ["Folio", "folio"], '—')}</div>
                        <div className="mt-1 text-sm text-slate-600">Total: {formatCLP(getValue(documento, ["Monto total", "Monto Total", "montoTotal"], 0))}</div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between">
                            <div className="text-sm font-bold text-slate-800">Documentos que referencian este folio</div>
                            <div className="text-xs text-slate-500">{referencing.length} encontrados</div>
                        </div>

                        <div className="mt-3">
                            {referencing.length === 0 && (
                                <div className="text-sm text-slate-500">No se encontraron NC/ND que referencien este folio en el payload actual.</div>
                            )}

                            {referencing.map((r, idx) => (
                                <div key={idx} className="mt-2 flex items-center justify-between rounded-lg border border-slate-100 p-2">
                                    <div>
                                        <div className="text-sm font-semibold">{r.razon || '—'}</div>
                                        <div className="text-xs text-slate-500">Tipo {r.tipo} · Folio {r.folio} · {r.fecha}</div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="text-sm font-bold">{formatCLP(r.total || 0)}</div>
                                        <button className="ml-2 rounded bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700" onClick={() => onOpenFullDetail(r.raw)}>Abrir detalle</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <button onClick={() => onOpenFullDetail(documento)} className="inline-flex items-center gap-2 rounded-2xl border border-cyan-300 bg-cyan-600 px-4 py-2 text-sm font-bold text-white">Ver detalle completo</button>
                        <button onClick={onClose} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">Cerrar</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CobranzaDetalleModal;
