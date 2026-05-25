import React, { useCallback, useEffect, useMemo, useState } from "react";
import DocumentosRcvTable from "../components/modals-facturasBaseapi/DocumentosRcvTable";
import DetalleBaseApiModal from "../components/modals-facturasBaseapi/DetalleBaseApiModal";
import {
    MESES,
    getDocumentos,
    getResumenPorTipo,
    getValue,
    getMontoTotalDoc,
    safeParseUser,
    formatCLP,
    formatFechaVista,
    EMPRESAS_PDF,
} from "../components/modals-facturasBaseapi/utils";
import { generarPdfDocumentoSeleccionado } from "../components/modals-facturasBaseapi/pdfDocumento";
import { Pagination } from "antd";

const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:4000/api";

export default function Cobranza() {
    const now = new Date();
    const user = useMemo(() => safeParseUser(), []);
    const isCliente = user?.rol === "CLIENTE";

    const [mes, setMes] = useState(String(now.getMonth() + 1).padStart(2, "0"));
    const [ano, setAno] = useState(String(now.getFullYear()));
    const [activeTab, setActiveTab] = useState<"ventas" | "compras">("ventas");
    const [empresa, setEmpresa] = useState<string>("econnet");

    const [loading, setLoading] = useState(false);
    const [respuesta, setRespuesta] = useState<any | null>(null);
    const [documentos, setDocumentos] = useState<any[]>([]);
    const [excluidosPorNC, setExcluidosPorNC] = useState<number[]>([]);
    const [resumenPorTipo, setResumenPorTipo] = useState<any[]>([]);
    const [busqueda, setBusqueda] = useState("");
    const [documentoSeleccionado, setDocumentoSeleccionado] = useState<any | null>(null);
    const [detalleDte, setDetalleDte] = useState<any | null>(null);
    const [detalleLoading, setDetalleLoading] = useState(false);
    const [detalleError, setDetalleError] = useState("");
    const [reminderModalOpen, setReminderModalOpen] = useState(false);
    const [reminderDoc, setReminderDoc] = useState<any | null>(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editDoc, setEditDoc] = useState<any | null>(null);
    const [editFecha, setEditFecha] = useState<string>("");

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [downloadingFolio, setDownloadingFolio] = useState<string | null>(null);

    const getAuthHeaders = () => {
        const token = localStorage.getItem("accessToken") ?? "";
        return {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    };

    const fetchDatos = useCallback(async (forceRefresh = false) => {
        setLoading(true);
        setRespuesta(null);
        setDocumentoSeleccionado(null);

        try {
            if (isCliente && activeTab === "compras") {
                setActiveTab("ventas");
                return;
            }
            
            
            const params = new URLSearchParams({ mes, ano });
            if (!isCliente) params.set("empresa", empresa);
            if (forceRefresh) params.set("forceRefresh", "true");

            const cacheKey = `${activeTab}|${empresa}|${mes}|${ano}`;

            // simple in-memory cache + sessionStorage persistence
            if (!(fetchDatos as any)._cacheRef) (fetchDatos as any)._cacheRef = new Map<string, any>();
            const cacheRef: Map<string, any> = (fetchDatos as any)._cacheRef;

            let json: any = null;

            // try sessionStorage first when not forcing refresh
            if (!forceRefresh) {
                try {
                    const sess = sessionStorage.getItem(`cobranza:${cacheKey}`);
                    if (sess) {
                        json = JSON.parse(sess);
                        console.log("Cobranza: using session cache for:", cacheKey);
                    }
                } catch { /* ignore parse errors */ }
            }

            // fallback to in-memory cache
            if (!json && !forceRefresh) {
                const mem = cacheRef.get(cacheKey);
                if (mem) {
                    json = mem;
                    try { console.log("Cobranza: using memory cache for:", cacheKey); } catch {}
                }
            }

            if (!json) {
                const endpoint =
                    activeTab === "ventas"
                        ? `${BASE_URL}/baseapi/rcv/ventas?${params.toString()}`
                        : `${BASE_URL}/baseapi/rcv/compras?${params.toString()}`;

                const res = await fetch(endpoint, { headers: getAuthHeaders() });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err?.error ?? err?.message ?? `Error ${res.status}`);
                }

                json = await res.json();
                setRespuesta(json);

                // store in caches
                try {
                    cacheRef.set(cacheKey, json);
                    sessionStorage.setItem(`cobranza:${cacheKey}`, JSON.stringify(json));
                } catch (e) { /* ignore storage errors */ }
            } else {
                // we already have json from cache - reflect in UI state
                setRespuesta(json);
            }

            const rawDocs = getDocumentos(json);

            // Detectar folios referenciados por Notas de Crédito (tipo 61)
            const referencedByNC = new Set<number>();

            // Helper: extrae folios numéricos desde un objeto/array/string recursivamente
            function extractFoliosFromObject(obj: any, ownFol: number | null) {
                try {
                    if (obj === null || obj === undefined) return;

                    if (typeof obj === 'number') {
                        const n = Number(obj);
                        if (Number.isFinite(n) && n > 0 && (!ownFol || n !== ownFol)) referencedByNC.add(n);
                        return;
                    }

                    if (typeof obj === 'string') {
                        // Buscar patrones <FolioRef>123</FolioRef> y números aislados de 2-6 dígitos
                        const xmlRe = /<FolioRef>(\d+)<\/FolioRef>/gi;
                        for (const m of obj.matchAll(xmlRe)) {
                            const num = Number(m[1]);
                            if (num && (!ownFol || num !== ownFol)) referencedByNC.add(num);
                        }

                        const numRe = /\b(\d{2,6})\b/g;
                        for (const m of obj.matchAll(numRe)) {
                            const num = Number(m[1]);
                            if (num && (!ownFol || num !== ownFol)) referencedByNC.add(num);
                        }

                        return;
                    }

                    if (Array.isArray(obj)) {
                        for (const it of obj) extractFoliosFromObject(it, ownFol);
                        return;
                    }

                    if (typeof obj === 'object') {
                        for (const k of Object.keys(obj)) {
                            const v = obj[k];
                            // si la clave sugiere referencia, intentar parsear valor directo
                            if (/folio|Folio|FolioRef|folioRef|folioDocRef|folioDocReferencia/i.test(k)) {
                                const num = Number(v ?? 0);
                                if (Number.isFinite(num) && num > 0 && (!ownFol || num !== ownFol)) referencedByNC.add(num);
                            }
                            extractFoliosFromObject(v, ownFol);
                        }
                    }
                } catch { /* ignore */ }
            }

            rawDocs.forEach((doc: any) => {
                try {
                    const tipo = String(getValue(doc, ["Tipo Doc", "tipoDoc", "tipoDTE"], "")).trim();
                    const raw = doc?.raw ?? doc;

                    if (String(tipo) === "61") {
                        const ownFol = Number(String(getValue(doc, ["Folio", "folio", "Nro", "numero"], "")).replace(/[^0-9]/g, "") || 0);
                        // 1) campos JSON explícitos comunes
                        const possibleKeys = ['folioDocReferencia', 'folioDocRef', 'folioRef', 'FolioRef', 'folioReferencia', 'folioDoc', 'folioReferenciado'];
                        for (const key of possibleKeys) {
                            const val = raw?.[key];
                            const num = Number(val ?? 0);
                            if (!Number.isFinite(num) || num <= 0) continue;
                            if (ownFol && num === ownFol) continue;
                            referencedByNC.add(num);
                        }

                        // Extracción recursiva adicional para capturar referencias en rutas anidadas
                        extractFoliosFromObject(raw, ownFol);
                        extractFoliosFromObject(raw?.data, ownFol);
                        extractFoliosFromObject(raw?.documento, ownFol);
                        extractFoliosFromObject(raw?.data?.documento, ownFol);

                        // 2) array de referencias en raw
                        if (Array.isArray(raw?.referencias)) {
                            for (const r of raw.referencias) {
                                const fol = Number(r?.FolioRef ?? r?.folioRef ?? r?.folio ?? r?.Folio ?? 0);
                                if (!fol) continue;
                                if (ownFol && fol === ownFol) continue;
                                referencedByNC.add(fol);
                            }
                        }

                        // 3) buscar en XML/texto embebido etiquetas <FolioRef>123</FolioRef>
                        try {
                            const rawStr = JSON.stringify(raw || '');
                            const xmlMatches = rawStr.matchAll(/<FolioRef>(\d+)<\/FolioRef>/gi);
                            for (const m of xmlMatches) {
                                const num = Number(m[1]);
                                if (!num) continue;
                                if (ownFol && num === ownFol) continue;
                                referencedByNC.add(num);
                            }

                            // 4) buscar claves JSON tipo "FolioRef":"123"
                            const jsonMatches = rawStr.matchAll(/\"(?:FolioRef|folioDocReferencia|folioDocRef|folioRef|folioDocReferencia)\"\s*:\s*\"?(\d+)\"?/gi);
                            for (const m of jsonMatches) {
                                const num = Number(m[1]);
                                if (!num) continue;
                                if (ownFol && num === ownFol) continue;
                                referencedByNC.add(num);
                            }
                        } catch { /* ignore */ }
                    }
                } catch { /* ignore per doc */ }
            });

            // Construir lista de folios existentes y cuáles serán excluidos
            const existingFolios = rawDocs.map((d: any) => Number(String(getValue(d, ["Folio", "folio", "Nro", "numero"], "")).replace(/[^0-9]/g, "") || 0)).filter((n: number) => Number.isFinite(n) && n > 0);
            const excludedList = Array.from(referencedByNC).filter((n) => existingFolios.includes(n));
            try { console.log('Cobranza: folios referenciados por NC encontrados:', Array.from(referencedByNC).sort((a,b)=>a-b)); } catch { }
            setExcluidosPorNC(excludedList);

            const docs = rawDocs
                .filter((d: any) => {
                    const tipo = String(getValue(d, ["Tipo Doc", "tipoDoc", "tipoDTE"], "")).trim();


                    // excluir si viene marcado por backend como `hasNC` o `_excludedByNC`
                    try {
                        if (d?.hasNC === true || d?._excludedByNC === true) return false;
                    } catch { }

                    // excluir si está explícitamente referenciada por una NC encontrada (por folio)
                    const fol = Number(String(getValue(d, ["Folio", "folio", "Nro", "numero"], "")).replace(/[^0-9]/g, "") || 0);
                    if (fol && referencedByNC.has(fol)) return false;

                    return tipo !== "61" && tipo !== "056"; // excluir Notas de Crédito (61)
                });

            setDocumentos(docs);
            console.log('Cobranza: excluded folios intersecting with payload:', excludedList);
            setResumenPorTipo(getResumenPorTipo(json));
        } catch (err: any) {
            console.error("Cobranza fetch error:", err);
            setDocumentos([]);
        } finally {
            setLoading(false);
        }
    }, [mes, ano, activeTab, empresa, isCliente]);

    useEffect(() => {
        fetchDatos();
    }, [fetchDatos]);

    const documentosFiltrados = useMemo(() => {
        const q = String(busqueda ?? "").trim().toLowerCase();
        let list = documentos.slice();
        if (q) {
            list = list.filter((doc) => {
                const folio = String(getValue(doc, ["Folio", "folio", "Nro", "numero"], "")).toLowerCase();
                const nombre = String(getValue(doc, ["Razon Social", "razonSocial", "empresa", "empresaKey"], "")).toLowerCase();
                const rut = String(getValue(doc, ["RUT Receptor", "rutReceptor", "rutCliente", "rutProveedor"], "")).toLowerCase();

                return folio.includes(q) || nombre.includes(q) || rut.includes(q);
            });
        }
        return list;
    }, [documentos, busqueda]);

    const totalNeto = useMemo(() => documentosFiltrados.reduce((s, d) => s + Number(getValue(d, ["Monto Neto", "montoNeto", "montoTotal"], 0) || 0), 0), [documentosFiltrados]);

    const paged = useMemo(() => {
        const start = (page - 1) * pageSize;
        return documentosFiltrados.slice(start, start + pageSize);
    }, [documentosFiltrados, page, pageSize]);

    const iva = Math.round(totalNeto * 0.19);
    const total = totalNeto + iva;

    // Extraer valor numérico robusto por documento buscando múltiples claves y patrones
    function getNumericFromDoc(doc: any) {
        try {
            const candidates = [
                "Monto Neto", "montoNeto", "montoTotal", "monto", "total", "Total", "Total Neto", "monto_bruto", "montoBruto", "Monto",
            ];

            for (const key of candidates) {
                const val = getValue(doc, [key], null);
                if (val !== null && val !== undefined) {
                    const n = Number(String(val).replace(/[^0-9\-\.]/g, ""));
                    if (!Number.isNaN(n) && Number.isFinite(n)) return n;
                }
            }

            // buscar en raw como string el número más grande (heurística)
            const rawStr = JSON.stringify(doc?.raw ?? doc ?? "");
            const numRe = /([0-9]{1,3}(?:[\.,][0-9]{3})*(?:[\.,][0-9]{2})?)/g;
            let match; let max = 0;
            while ((match = numRe.exec(rawStr)) !== null) {
                const cleaned = match[1].replace(/\./g,"").replace(/,/g,"");
                const n = Number(cleaned);
                if (!Number.isNaN(n) && Number.isFinite(n) && n > max) max = n;
            }
            if (max > 0) return max;
        } catch (e) { /* ignore */ }
        return 0;
    }

    const totalImporte = useMemo(() => {
        try {
            // Preferir valores normalizados: getMontoTotalDoc transforma formatos CLP.
            const sum = documentosFiltrados.reduce((s, d) => s + Number(getMontoTotalDoc(d) || 0), 0);
            if (sum && sum > 0) return sum;

            // fallback: intentar desde resumenPorTipo
            if (Array.isArray(resumenPorTipo) && resumenPorTipo.length > 0) {
                try {
                    const fromResumen = resumenPorTipo.reduce((s: number, it: any) => s + Number(it?.montoTotal || 0), 0);
                    if (fromResumen && fromResumen > 0) {
                        console.log('Cobranza: totalImporte calculado desde resumenPorTipo fallback:', fromResumen);
                        return fromResumen;
                    }
                } catch { }
            }

            // último recurso: sumar con heurística getNumericFromDoc
            const perDoc = documentosFiltrados.map((d) => ({ folio: getValue(d, ["Folio", "folio", "Nro", "numero"], "-"), value: getNumericFromDoc(d) }));
            try { console.log('Cobranza: valores detectados por doc para totalImporte (heurística):', perDoc); } catch {}
            return perDoc.reduce((s, it) => s + (Number(it.value) || 0), 0);
        } catch { return 0; }
    }, [documentosFiltrados, resumenPorTipo]);

    function estadoFromDoc(doc: any) {
        // Priorizar campo estadoPago (CONFIRMADA|VENCIDA|PENDIENTE) si existe, sino fallback al Estado original
        const pago = getValue(doc, ["estadoPago", "EstadoPago", "estado_pago"], null);
        if (pago) return String(pago).toUpperCase();
        return String(getValue(doc, ["Estado", "estado", "Estado Documento", "estadoDocumento"], "")).toUpperCase();
    }

    const pendienteCount = useMemo(() => documentos.filter(d => String(estadoFromDoc(d)).toUpperCase().includes("PENDIENTE")).length, [documentos]);
    const vencidaCount = useMemo(() => documentos.filter(d => { const s=String(estadoFromDoc(d)).toUpperCase(); return s.includes("VENC") || s.includes("VENCIDA"); }).length, [documentos]);
    const pagadaCount = useMemo(() => documentos.filter(d => { const s=String(estadoFromDoc(d)).toUpperCase(); return s.includes("CONFIRM") || s.includes("PAG") || s.includes("PAGADA") || s.includes("PAGADO"); }).length, [documentos]);

    const handleSeleccionarDocumento = (doc: any) => {
        setDocumentoSeleccionado(doc);
        // intentar cargar detalle DTE automáticamente
        void (async () => {
            if (activeTab !== "ventas") return;
            await fetchDetalleDte(doc, false);
        })();
    };

    const fetchDetalleDte = async (doc: any, forceRefresh = false) => {
        setDetalleLoading(true);
        setDetalleError("");
        setDetalleDte(null);

        try {
            if (activeTab !== "ventas") {
                throw new Error("Este endpoint de DTE/XML corresponde a documentos emitidos.");
            }
            const folio = getValue(doc, ["Folio", "folio", "Nro", "numero"], "");
            const tipoDTE = getValue(doc, ["Tipo Doc", "tipoDoc", "tipoDTE"], "33");
            if (!folio) throw new Error("No se pudo obtener el folio del documento");

            const empresaDocumento = String(
                getValue(doc, ["empresaOrigen", "empresa", "empresaKey"], empresa)
            ).toLowerCase();

            const params = new URLSearchParams({ periodo: `${ano}-${mes}`, empresa: empresaDocumento, tipoDTE: String(tipoDTE), ...(forceRefresh ? { forceRefresh: "true" } : {}) });

            const token = localStorage.getItem("accessToken") ?? "";
            const headers: any = { "Content-Type": "application/json" };
            if (token) headers.Authorization = `Bearer ${token}`;

            const res = await fetch(`${BASE_URL}/baseapi/dte/folio/${folio}?${params.toString()}`, { headers });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error ?? err?.message ?? `Error ${res.status}`);
            }

            const json = await res.json();

            setDetalleDte(json);

            return json;
        } catch (error: any) {
            const message = error?.message ?? "No se pudo consultar el DTE";
            setDetalleError(message);
            return null;
        } finally {
            setDetalleLoading(false);
        }
    };

    const handleEnviarEmail = (doc: any) => {
        const folio = getValue(doc, ["Folio", "folio"], "");
        const tipo = getValue(doc, ["Tipo Doc", "tipoDoc", "tipoDTE"], "");
        const params = new URLSearchParams({ tipo: String(tipo), folio: String(folio), empresa: empresa });
        // Abrir Mailer con query params (Mailer puede adaptarse para leerlos)
        window.location.href = `/rids/mailer?${params.toString()}`;
    };

    const handleDescargarFactura = async (doc: any) => {
        try {
            if (activeTab !== "ventas") {
                alert("Descarga disponible solo para documentos emitidos (ventas).");
                return;
            }

            const folio = String(getValue(doc, ["Folio", "folio", "Nro", "numero"], "")).replace(/[^0-9]/g, "");
            const tipo = String(getValue(doc, ["Tipo Doc", "tipoDoc", "tipoDTE"], "33"));
            if (!folio) {
                alert("No se pudo determinar el folio del documento");
                return;
            }

            setDownloadingFolio(folio);

            // Determinar clave de empresa usada por BaseAPI (como en facturasBaseapi)
            const empresaDocumento = String(
                getValue(doc, ["empresaOrigen", "empresa", "empresaKey"], empresa)
            ).toLowerCase();

            const params = new URLSearchParams({ periodo: `${ano}-${mes}`, empresa: empresaDocumento, tipoDTE: String(tipo) });

            const token = localStorage.getItem("accessToken") ?? "";
            const headers: any = { "Content-Type": "application/json" };
            if (token) headers.Authorization = `Bearer ${token}`;

            // Reusar fetchDetalleDte para mantener consistencia y caché
            const detalle = await fetchDetalleDte(doc, false);
            if (!detalle) throw new Error('No se pudo obtener detalle del DTE');

            const pdfResult = await generarPdfDocumentoSeleccionado({
                documento: doc,
                detalleDte: detalle,
                activeTab: activeTab === "ventas" ? "ventas" : "compras",
                empresa,
                mes,
                ano,
                autoDownload: false,
            });

            // Forzar descarga
            const a = document.createElement("a");
            a.href = pdfResult.url;
            a.download = pdfResult.fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();

            // Liberar URL cuando ya no se use
            try { URL.revokeObjectURL(pdfResult.url); } catch { }
        } catch (error: any) {
            console.error("Error descargando factura:", error);
            alert(error?.message ?? "Error al descargar factura");
        } finally {
            setDownloadingFolio(null);
        }
    };

    const handleSaveDueDate = async () => {
        if (!editDoc) return;
        try {
            // fecha en formato YYYY-MM-DD
            const newDate = String(editFecha || "").trim();
            // optimist update local
            setDocumentos((prev) => {
                return prev.map((d) => {
                    const folD = String(getValue(d, ["Folio", "folio", "Nro", "numero"], "")).replace(/[^0-9]/g, "");
                    const folE = String(getValue(editDoc, ["Folio", "folio", "Nro", "numero"], "")).replace(/[^0-9]/g, "");
                    if (folD && folD === folE) {
                        const copy = { ...d };
                        // actualizar varias claves comunes
                        const keys = ["FchVenc", "FchVencimiento", "fechaVencimiento", "vencimiento", "fecha_vencimiento", "Vencimiento"];
                        for (const k of keys) copy[k] = newDate;

                        try {
                            // Si el documento ya está confirmado/pagado, no sobrescribir estado
                            const current = estadoFromDoc(d).toUpperCase();
                            if (!(current.includes("CONFIRM") || current.includes("PAG"))) {
                                // Determinar si la nueva fecha ya venció
                                let status = "PENDIENTE";
                                if (newDate) {
                                    const nd = new Date(newDate + 'T00:00:00');
                                    const today = new Date();
                                    today.setHours(0,0,0,0);
                                    if (!isNaN(nd.getTime()) && nd < today) status = "VENCIDA";
                                }

                                copy["estadoPago"] = status;
                                copy["Estado"] = status;
                            }
                        } catch (e) { /* ignore */ }

                        return copy;
                    }
                    return d;
                });
            });

            // Persistir override en backend
            try {
                const tipo = getValue(editDoc, ["Tipo Doc", "tipoDoc", "tipoDTE"], "33");
                const folio = String(getValue(editDoc, ["Folio", "folio", "Nro", "numero"], "")).replace(/[^0-9]/g, "");
                const empresaDocumento = String(getValue(editDoc, ["empresaOrigen", "empresa", "empresaKey"], empresa)).toLowerCase();

                const res = await fetch(`${BASE_URL}/baseapi/rcv/vencimiento`, {
                    method: 'PATCH',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ empresaKey: empresaDocumento, tipoDoc: String(tipo), folio, fechaVencimiento: newDate || null }),
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    const msg = err?.error ?? err?.message ?? `Error ${res.status}`;
                    alert('No se pudo persistir la fecha en el servidor: ' + String(msg));
                    // refrescar datos desde API para sincronizar estado
                    await fetchDatos(true);
                } else {
                    alert('Fecha de vencimiento guardada');
                    // refrescar desde servidor para actualizar cache y mantener persistencia
                    await fetchDatos(true);
                }
            } catch (e) {
                console.error('Error persistiendo vencimiento en backend:', e);
                alert('Error al persistir la fecha en el servidor');
                await fetchDatos(true);
            }

            // cerrar modal
            setEditModalOpen(false);
            setEditDoc(null);
            setEditFecha("");
        } catch (e) {
            console.error('Error guardando fecha de vencimiento (local):', e);
            alert('No se pudo actualizar la fecha localmente');
        }
    };

    return (
        <div className="p-6">
            <div className="rounded-2xl border border-cyan-100 bg-white p-4 mb-4 shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-semibold">Cobranza</h2>
                        </div>
                        <p className="text-slate-600 text-sm mt-1">Resumen de cobranza — facturas y notas por gestionar.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-2">
                            <div className="rounded-full bg-white px-3 py-1 text-xs text-cyan-700 border">{empresa?.toUpperCase()}</div>
                            <div className="rounded-full bg-white px-3 py-1 text-xs text-cyan-700 border">Periodo {MESES[Number(mes) - 1]} {ano}</div>
                        </div>
                        <button onClick={() => fetchDatos(true)} className={`inline-flex items-center gap-2 rounded bg-cyan-700 px-4 py-2 text-white text-sm ${loading ? 'opacity-60' : ''}`}>{loading ? 'Actualizando...' : 'Actualizar'}</button>
                    </div>
                </div>

                {respuesta && (
                    <div className="mt-4 rounded border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-3 text-sm">Datos cargados desde cache si estaban disponibles</div>
                )}

                <div className="rounded-3xl border border-cyan-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="text-sm font-bold text-slate-900">Filtros de consulta</h2>
                            <p className="text-xs text-slate-500">Define el periodo, empresa y tipo de movimiento para Cobranza.</p>
                        </div>

                        <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{activeTab === 'ventas' ? 'Ventas' : 'Compras'} · {MESES[Number(mes) - 1]} {ano}</span>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {!isCliente && (
                            <div>
                                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Empresa</label>

                                <select
                                    value={empresa}
                                    onChange={(e) => setEmpresa(e.target.value)}
                                    className="h-10 w-full rounded-xl border border-cyan-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                                >
                                    <option value="econnet">ECONNET</option>
                                    <option value="rids">RIDS</option>
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Mes</label>

                            <select
                                value={mes}
                                onChange={(e) => setMes(e.target.value)}
                                className="h-10 w-full rounded-xl border border-cyan-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                            >
                                {MESES.map((nombre, index) => {
                                    const value = String(index + 1).padStart(2, "0");
                                    return (
                                        <option key={value} value={value}>{nombre}</option>
                                    );
                                })}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">Año</label>

                            <input
                                value={ano}
                                onChange={(e) => setAno(e.target.value)}
                                className="h-10 w-full rounded-xl border border-cyan-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                            />
                        </div>

                        <div className="flex items-end gap-2">
                            <button
                                type="button"
                                onClick={() => fetchDatos(false)}
                                disabled={loading}
                                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-cyan-300 bg-white px-4 text-sm font-bold text-cyan-700 transition hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? "Consultando..." : "Consultar"}
                            </button>

                            <button
                                type="button"
                                onClick={() => fetchDatos(true)}
                                disabled={loading}
                                title="Forzar actualización desde SII/BaseAPI"
                                className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-300 bg-cyan-600 text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                ⟳
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-4">
                <div className="rounded-2xl border border-cyan-200 p-5 md:p-6 bg-white min-h-24 flex flex-col justify-center shadow-sm">
                    <div className="text-xs uppercase text-cyan-800 tracking-wide">DOCUMENTOS</div>
                    <div className="mt-1 text-3xl md:text-4xl font-semibold">{documentosFiltrados.length}</div>
                    <div className="text-xs text-slate-500 mt-1">Registros encontrados</div>
                </div>

                <div className="rounded-2xl border border-cyan-200 p-5 md:p-6 bg-white min-h-24 flex flex-col justify-center shadow-sm">
                    <div className="text-xs uppercase text-amber-600 tracking-wide">PENDIENTES</div>
                    <div className="mt-1 text-3xl md:text-4xl font-semibold">{pendienteCount}</div>
                    <div className="text-xs text-slate-500 mt-1">Documentos pendientes</div>
                </div>

                <div className="rounded-2xl border border-cyan-200 p-5 md:p-6 bg-white min-h-24 flex flex-col justify-center shadow-sm">
                    <div className="text-xs uppercase text-rose-500 tracking-wide">VENCIDAS</div>
                    <div className="mt-1 text-3xl md:text-4xl font-semibold">{vencidaCount}</div>
                    <div className="text-xs text-slate-500 mt-1">Documentos vencidos</div>
                </div>

                <div className="rounded-2xl border border-cyan-200 p-5 md:p-6 bg-white min-h-24 flex flex-col justify-center shadow-sm">
                    <div className="text-xs uppercase text-emerald-600 tracking-wide">CONFIRMADOS</div>
                    <div className="mt-1 text-3xl md:text-4xl font-semibold">{pagadaCount}</div>
                    <div className="text-xs text-slate-500 mt-1">Documentos confirmados/ pagados</div>
                </div>

                <div className="rounded-2xl border border-cyan-200 p-5 md:p-6 bg-white min-h-24 relative flex flex-col justify-center shadow-sm">
                    <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-cyan-900 flex items-center justify-center text-white text-sm">⋯</div>
                    <div className="text-xs uppercase text-slate-500 tracking-wide">TOTAL</div>
                    <div className="mt-1 text-3xl md:text-4xl font-semibold">{formatCLP(totalImporte)}</div>
                    <div className="text-xs text-slate-500 mt-1">Suma bruta del periodo</div>
                </div>
            </div>

            <DocumentosRcvTable
                documentosFiltrados={paged}
                documentosLength={documentos.length}
                loading={loading}
                activeTab={activeTab === "ventas" ? "ventas" : "compras"}
                busqueda={busqueda}
                onBusquedaChange={(v) => { setBusqueda(v); setPage(1); }}
                onSelectDocumento={handleSeleccionarDocumento}
                renderRowActions={(doc) => {
                    const ActionMenu: React.FC = () => {
                        const [open, setOpen] = React.useState(false);
                        const toggle = (e?: any) => { e && e.stopPropagation(); setOpen(!open); };
                        const close = () => setOpen(false);

                        const initialFecha = String(getValue(doc, ["FchVenc", "FchVencimiento", "fechaVencimiento", "vencimiento", "fecha_vencimiento", "Vencimiento"], "")).slice(0,10);

                        return (
                            <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                                <button onClick={toggle} className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                                    Acciones ▾
                                </button>

                                {open && (
                                    <div className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg">
                                        <div className="flex flex-col p-2">
                                            <button
                                                onClick={async (e) => { e.stopPropagation(); close(); const fol = String(getValue(doc, ["Folio","folio"], "")).replace(/[^0-9]/g,""); if (fol) { await handleDescargarFactura(doc); } else { alert('Folio no disponible'); } }}
                                                className="w-full text-left rounded px-2 py-2 text-sm hover:bg-slate-100"
                                            >
                                                Descargar
                                            </button>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); close(); setReminderDoc(doc); setReminderModalOpen(true); }}
                                                className="w-full text-left rounded px-2 py-2 text-sm hover:bg-slate-100"
                                            >
                                                Recordatorios
                                            </button>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); close(); setEditDoc(doc); setEditFecha(initialFecha || ""); setEditModalOpen(true); }}
                                                className="w-full text-left rounded px-2 py-2 text-sm hover:bg-slate-100"
                                            >
                                                Editar vencimiento
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    };

                    return <ActionMenu />;
                }}
            />

            <div className="mt-4 flex justify-end">
                <Pagination current={page} pageSize={pageSize} total={documentosFiltrados.length} onChange={(p, ps) => { setPage(p); setPageSize(ps); }} showSizeChanger pageSizeOptions={[10,20,50,100]} />
            </div>

            <DetalleBaseApiModal
                documento={documentoSeleccionado}
                activeTab={activeTab === "ventas" ? "ventas" : "compras"}
                empresa={empresa}
                mes={mes}
                ano={ano}
                onClose={() => setDocumentoSeleccionado(null)}
                onConsultarDte={fetchDetalleDte}
                detalleDte={detalleDte}
                detalleLoading={detalleLoading}
                detalleError={detalleError}
                pdfPreparando={false}
                pdfPreparadoUrl={null}
                pdfPreparadoNombre={""}
            />

            {reminderModalOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-10">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setReminderModalOpen(false)} />

                    <div className="relative w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Recordatorio manual</h2>
                            <button onClick={() => setReminderModalOpen(false)} className="text-slate-500 hover:text-slate-700">✕</button>
                        </div>

                        {/* Aviso si no hay contactos */}
                        <ReminderBody
                            reminderDoc={reminderDoc}
                            onClose={() => setReminderModalOpen(false)}
                            fetchDetalleDte={fetchDetalleDte}
                            activeTab={activeTab}
                            empresa={empresa}
                            mes={mes}
                            ano={ano}
                        />
                    </div>
                </div>
            )}
            {editModalOpen && editDoc && (
                <div className="fixed inset-0 z-60 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => { setEditModalOpen(false); setEditDoc(null); setEditFecha(""); }} />

                    <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold">Editar fecha de vencimiento</h2>
                            <button onClick={() => { setEditModalOpen(false); setEditDoc(null); setEditFecha(""); }} className="text-slate-500 hover:text-slate-700">✕</button>
                        </div>

                        <div className="mt-4">
                            <div className="text-sm text-slate-600">Documento</div>
                            <div className="mt-1 font-semibold">{String(getValue(editDoc, ["Razon Social","razonSocial","empresa"], "-"))} · Folio {String(getValue(editDoc, ["Folio","folio","Nro","numero"], "-"))}</div>
                        </div>

                        <div className="mt-4">
                            <label className="block text-xs font-medium text-slate-600 mb-2">Fecha de vencimiento</label>
                            <input type="date" value={editFecha} onChange={(e) => setEditFecha(e.target.value)} className="w-full rounded border border-slate-200 px-3 py-2" />
                        </div>

                        <div className="mt-6 flex justify-end gap-2">
                            <button onClick={() => { setEditModalOpen(false); setEditDoc(null); setEditFecha(""); }} className="rounded border border-slate-200 bg-white px-4 py-2 text-sm">Cancelar</button>
                            <button onClick={() => handleSaveDueDate()} className="rounded bg-cyan-600 px-4 py-2 text-sm font-semibold text-white">Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Componente interno para el contenido del modal, separado para mantener Cobranza claro
function ReminderBody({ reminderDoc, onClose, fetchDetalleDte, activeTab, empresa, mes, ano }: { reminderDoc: any; onClose: () => void; fetchDetalleDte: (doc:any, force?:boolean)=>Promise<any>; activeTab: any; empresa: any; mes:string; ano:string }) {
    const [canal, setCanal] = React.useState<string>("");
    const [tipo, setTipo] = React.useState<string>("");
    const [contactos, setContactos] = React.useState<any[]>([]);
    const [selectedContacto, setSelectedContacto] = React.useState<any | null>(null);
    const [observacion, setObservacion] = React.useState<string>("");
    const [generando, setGenerando] = React.useState(false);
    const [showPreviewHtml, setShowPreviewHtml] = React.useState(false);
    const [previewHtml, setPreviewHtml] = React.useState<string>("");

    React.useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                // Helper para normalizar contactos y extraer emails/teléfonos
                const normalizeContact = (c: any) => {
                    const nombre = c?.nombre || c?.name || c?.nombreContacto || c?.fullName || c?.contacto || c?.razonSocial || c?.razon || "Contacto";
                    const email = c?.email || c?.correo || c?.mail || c?.eMail || c?.contactoEmail || null;
                    const cargo = c?.cargo || c?.position || c?.puesto || c?.role || null;
                    const phones: string[] = [];
                    const phoneCandidates = [
                        'telefono', 'telefonoFijo', 'telefono1', 'telefono_celular', 'celular', 'movil', 'fono', 'phone', 'tel', 'telefono2', 'telefono_movil'
                    ];
                    for (const k of phoneCandidates) {
                        const v = c?.[k];
                        if (v && String(v).trim()) phones.push(String(v).trim());
                    }
                    // también buscar en keys dinámicas
                    for (const k of Object.keys(c || {})) {
                        if (/tel|fono|movil|cel|phone/i.test(k) && !phoneCandidates.includes(k)) {
                            const v = c?.[k];
                            if (v && String(v).trim()) phones.push(String(v).trim());
                        }
                    }

                    return { raw: c, nombre, email, cargo, telefonos: Array.from(new Set(phones)) };
                };

                // Intentar extraer contactos desde el documento abierto (heurística)
                const maybe = reminderDoc?.contactos ?? reminderDoc?.empresa?.contactos ?? reminderDoc?.contactosEmpresa ?? reminderDoc?.data?.contactos ?? [];
                if (Array.isArray(maybe) && maybe.length > 0) {
                    const norm = maybe.map(normalizeContact);
                    if (!mounted) return;
                    setContactos(norm);
                    setSelectedContacto(norm[0]);
                    return;
                }

                // Si no hay contactos en el payload, intentar buscar un email simple en campos comunes
                const possibleEmail = reminderDoc ? (
                    reminderDoc?.email || reminderDoc?.correo || reminderDoc?.contacto?.email || reminderDoc?.raw?.correo || reminderDoc?.raw?.email
                ) : null;
                // También intentar extraer posibles teléfonos en campos comunes
                const possiblePhone = reminderDoc ? (
                    reminderDoc?.telefono || reminderDoc?.fono || reminderDoc?.phone || reminderDoc?.celular || reminderDoc?.movil || reminderDoc?.raw?.telefono
                ) : null;
                if (possibleEmail || possiblePhone) {
                    if (!mounted) return;
                    const cObj: any = { nombre: reminderDoc?.razonSocial || "Contacto", email: possibleEmail };
                    if (possiblePhone) cObj.telefono = possiblePhone;
                    const norm = [normalizeContact(cObj)];
                    setContactos(norm);
                    setSelectedContacto(norm[0]);
                    return;
                }

                // Intentar obtener contactos desde backend usando id de empresa o claves varias
                const empresaObj = reminderDoc?.empresa ?? reminderDoc?.empresaData ?? reminderDoc?.empresaInfo ?? reminderDoc?.empresa_origen ?? null;
                let empresaId: number | null = null;
                if (empresaObj && typeof empresaObj === 'object') {
                    empresaId = Number(empresaObj?.id_empresa ?? empresaObj?.empresaId ?? empresaObj?.empresa_id ?? empresaObj?.id ?? null) || null;
                }
                if (!empresaId) {
                    empresaId = Number(reminderDoc?.empresaId || reminderDoc?.id_empresa || reminderDoc?.empresa_id || reminderDoc?.empresa || null) || null;
                }

                const tryFetchFicha = async (keyOrId: string | number) => {
                    try {
                        const token = localStorage.getItem('accessToken') ?? '';
                        const headers: any = { 'Content-Type': 'application/json' };
                        if (token) headers.Authorization = `Bearer ${token}`;

                        console.debug('ReminderBody: intentando fetch ficha-empresa por', keyOrId);
                        const resp = await fetch(`${BASE_URL}/ficha-empresa/${keyOrId}/completa`, { headers });
                        if (resp.ok) {
                            const json = await resp.json();
                            console.debug('ReminderBody: respuesta ficha-empresa:', json);
                            const remoteContacts = Array.isArray(json?.contactos) ? json.contactos : Array.isArray(json?.data?.contactos) ? json.data.contactos : Array.isArray(json?.empresa?.contactos) ? json.empresa.contactos : [];
                            if (remoteContacts.length > 0) {
                                if (!mounted) return true;
                                const norm = remoteContacts.map(normalizeContact);
                                setContactos(norm);
                                setSelectedContacto(norm[0]);
                                return true;
                            }
                        }
                    } catch (e) { /* ignore */ }
                    return false;
                };

                if (empresaId) {
                    const ok = await tryFetchFicha(empresaId);
                    if (ok) return;
                }

                // Si no hay empresaId, intentar por clave/slug/empresaKey u otros campos
                const empresaKey = reminderDoc?.empresa?.empresaKey || reminderDoc?.empresaKey || reminderDoc?.empresa_slug || reminderDoc?.empresa || reminderDoc?.empresa_data || null;
                if (empresaKey) {
                    const ok2 = await tryFetchFicha(empresaKey);
                    if (ok2) return;
                }

                // Si aún no hay coincidencias, intentar buscar en /empresas por RUT o razón social
                try {
                    const token = localStorage.getItem('accessToken') ?? '';
                    const headers: any = { 'Content-Type': 'application/json' };
                    if (token) headers.Authorization = `Bearer ${token}`;

                    const possibleRut = String(getValue(reminderDoc, ['Rut cliente', 'RUT Cliente', 'rutCliente', 'rutReceptor', 'RUT Proveedor', 'Rut Proveedor', 'rutProveedor'], '')).replace(/\s+/g, '');
                    const possibleName = String(getValue(reminderDoc, ['Razon Social', 'Razón Social', 'razonSocial', 'razonSocialReceptor', 'razonSocialProveedor'], '')).trim();

                    if (possibleRut || possibleName) {
                        console.debug('ReminderBody: buscando empresa por rut/nombre', possibleRut, possibleName);
                        // obtener lista de empresas (cached)
                        const resp = await fetch(`${BASE_URL}/empresas`, { headers });
                        if (resp.ok) {
                            const json = await resp.json();
                            const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
                            let found: any = null;
                            if (possibleRut) {
                                found = list.find((e: any) => String(e.rut ?? '').replace(/\s+/g, '') === possibleRut.replace(/\s+/g, ''));
                            }
                            if (!found && possibleName) {
                                const lower = possibleName.toLowerCase();
                                found = list.find((e: any) => String(e.nombre ?? '').toLowerCase().includes(lower));
                            }

                            if (found && found.id_empresa) {
                                const ok3 = await tryFetchFicha(found.id_empresa);
                                if (ok3) return;
                            }
                        }
                    }
                } catch (e) { /* ignore */ }
            } catch (e) { /* ignore */ }
        })();

        return () => { mounted = false; };
    }, [reminderDoc]);

    const hasContacts = contactos && contactos.length > 0;

    return (
        <div className="mt-4">
            {!hasContacts && (
                <div className="rounded border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-900 mb-4 flex items-center justify-between">
                    <div>⚠️ Cliente sin contactos. Crea al menos uno para continuar</div>
                    <a href="/empresas" className="text-sm font-semibold text-cyan-700">Ir a contactos</a>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                    <div className="mb-3 flex items-center gap-3">
                        <div className="rounded-full bg-cyan-600 px-3 py-1 text-white font-bold">1</div>
                        <h3 className="text-sm font-semibold">Recordatorio</h3>
                    </div>

                    <label className="block text-xs font-medium text-slate-600 mb-2">Canal</label>
                    <select value={canal} onChange={(e) => setCanal(e.target.value)} className="mb-3 h-10 w-full rounded border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-cyan-100">
                        <option value="">Seleccionar canal</option>
                        <option value="email">Correo electrónico</option>
                        <option value="sms">Mensaje SMS</option>
                        <option value="whatsapp">Mensaje WhatsApp</option>
                    </select>

                    <label className="block text-xs font-medium text-slate-600 mb-2">Tipo de recordatorio</label>
                    <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="mb-3 h-10 w-full rounded border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-cyan-100">
                        <option value="">Seleccionar tipo de recordatorio</option>
                        <option value="factura_emitida">Factura Emitida</option>
                        <option value="por_vencer">Factura Por Vencer</option>
                        <option value="vencida">Factura Vencida</option>
                        <option value="pago_recibido">Pago Recibido</option>
                        <option value="nuevo_doc_nc">Nuevo Documento Nota Crédito/Débito</option>
                    </select>

                    <div className="mt-2 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                        <div className="flex items-start gap-2">
                            <div className="text-cyan-700 font-semibold">Tipos de recordatorios disponibles</div>
                        </div>
                        <div className="mt-2 text-xs text-slate-500">Solo se muestran los recordatorios ya configurados. Si no encuentras el que necesitas, puedes crear uno nuevo en la sección Recordatorios. <a href="/recordatorios" className="font-semibold text-cyan-700">Ir a recordatorios</a></div>
                    </div>
                </div>

                <div>
                    <div className="mb-3 flex items-center gap-3">
                        <div className="rounded-full bg-slate-200 px-3 py-1 text-slate-700 font-bold">2</div>
                        <h3 className="text-sm font-semibold">Contactos</h3>
                    </div>

                    {hasContacts ? (
                        <div className="space-y-2">
                            {contactos.map((c, idx) => (
                                <label key={idx} className={`flex items-start gap-3 rounded border p-3 ${selectedContacto === c ? 'border-cyan-300 bg-cyan-50' : 'border-slate-100 bg-white'}`}>
                                    <input className="mt-1" type="radio" name="contacto" checked={selectedContacto === c} onChange={() => setSelectedContacto(c)} />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <div className="font-semibold text-sm">{c.nombre}</div>
                                            {c.cargo && <div className="text-xs text-slate-500">{c.cargo}</div>}
                                        </div>

                                        <div className="mt-1 text-xs text-slate-500">
                                            {c.email ? (<div><strong>Email:</strong> <span className="ml-1">{c.email}</span></div>) : null}
                                            {c.telefonos && c.telefonos.length > 0 ? (
                                                <div className="mt-1"><strong>Teléfono{c.telefonos.length>1? 's':''}:</strong> <span className="ml-1">{c.telefonos.join(' · ')}</span></div>
                                            ) : null}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-slate-500">No hay contactos disponibles para este cliente.</div>
                    )}
                </div>
            </div>

            <div className="mt-4">
                <label className="block text-xs font-medium text-slate-600 mb-2">Observación (se incluirá en el PDF)</label>
                <textarea value={observacion} onChange={(e)=>setObservacion(e.target.value)} className="w-full rounded border border-slate-200 p-2 text-sm" rows={3} />
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
                <button onClick={onClose} className="rounded border px-4 py-2 text-sm">Cerrar</button>
                <button onClick={async ()=>{
                    if (!hasContacts || !canal || !tipo || !selectedContacto) return;
                    try {
                            setGenerando(true);
                            // obtener detalle DTE si es necesario
                            const detalle = await fetchDetalleDte(reminderDoc, false);

                            // Construir HTML de previsualización similar al Mailer
                            const empresaKey = String(empresa || 'econnet').toLowerCase();
                            const empresaPdf = EMPRESAS_PDF[empresaKey] ?? EMPRESAS_PDF['econnet'];

                            const folio = String(getValue(reminderDoc, ["Folio","folio","Nro","numero"], "—"));
                            const fechaVenc = String(getValue(reminderDoc, ["FchVenc", "FchVencimiento", "fechaVencimiento", "vencimiento", "fecha_vencimiento", "Vencimiento"], getValue(detalle, ["fechaVencimiento","FchVenc","vencimiento"], "—")));
                            const total = formatCLP(getMontoTotalDoc(reminderDoc));
                            const montoPagar = formatCLP(getMontoTotalDoc(reminderDoc));
                            const titulo = tipo === 'vencida' ? 'Factura Vencida' : tipo === 'por_vencer' ? 'Factura por vencer' : 'Recordatorio';

                            const saludo = selectedContacto?.nombre ? `Estimado(a) ${selectedContacto.nombre}:` : 'Estimado(a):';

                            const html = `
                            <div style="font-family: Arial, Helvetica, sans-serif; color:#111; padding:18px;">
                              <div style="text-align:center; margin-bottom:18px;"><img src="${empresaPdf.logo}" style="max-height:64px; object-fit:contain;"/></div>
                              <div style="background:#b91c1c; color:#fff; padding:14px; border-radius:6px; font-weight:700; margin-bottom:16px;">${titulo}</div>
                              <div style="font-size:14px; line-height:1.5;">
                                <p>${saludo}</p>
                                <p>Junto con saludar le recordamos que al día de hoy nuestro sistema indica que usted mantiene un saldo de <strong>${montoPagar}</strong> pendiente de pago por la factura <strong>#${folio}</strong> que venció el <strong>${formatFechaVista(fechaVenc)}</strong>.</p>
                                <p>Le pedimos por favor cancelar a la brevedad posible la deuda indicada en este correo.</p>
                                ${observacion ? `<p><strong>Observación:</strong> ${observacion}</p>` : ''}
                              </div>

                              <div style="margin-top:18px; background:#f7f7f7; padding:12px; border-radius:6px;">
                                <div style="font-weight:600; color:#444; margin-bottom:8px;">Documento #${folio}</div>
                                <div style="display:flex; gap:18px; font-size:13px; color:#444;">
                                  <div><div style="color:#888">Fecha de vencimiento</div><div>${formatFechaVista(fechaVenc)}</div></div>
                                  <div><div style="color:#888">Total</div><div>${total}</div></div>
                                  <div><div style="color:#888">Monto por pagar</div><div>${montoPagar}</div></div>
                                </div>
                              </div>

                              <div style="margin-top:18px; text-align:center;">
                                <a href="#" style="display:inline-block; background:#b91c1c; color:#fff; padding:10px 18px; border-radius:6px; text-decoration:none;">Ir al Portal</a>
                              </div>

                              <div style="margin-top:12px; display:flex; gap:10px; justify-content:center;">
                                <button id="downloadPdfBtn" style="background:#fff; border:1px solid #eee; padding:8px 12px; border-radius:6px;">Descargar en PDF</button>
                                <button id="downloadXmlBtn" style="background:#fff; border:1px solid #eee; padding:8px 12px; border-radius:6px;">Descargar en XML</button>
                              </div>
                            </div>
                            `;

                            setPreviewHtml(html);
                            setShowPreviewHtml(true);
                        } catch (e) {
                            console.error(e);
                            alert('Error generando previsualización');
                        } finally { setGenerando(false); }
                }} disabled={!hasContacts || !canal || !tipo || !selectedContacto || generando} className={`rounded bg-cyan-600 px-4 py-2 text-sm text-white ${(!hasContacts || !canal || !tipo || !selectedContacto) ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    {generando ? 'Generando...' : 'Previsualizar'}
                </button>
            </div>

                {showPreviewHtml && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                        <div className="w-full max-w-2xl rounded-lg bg-white p-4 shadow-lg max-h-[80vh] overflow-auto">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-bold">Previsualización</h3>
                                <button onClick={()=>setShowPreviewHtml(false)} className="text-slate-600">✕</button>
                            </div>

                            <div className="border rounded p-3" dangerouslySetInnerHTML={{ __html: previewHtml }} />

                            <div className="mt-3 flex justify-end gap-2">
                                <button onClick={()=>setShowPreviewHtml(false)} className="rounded border px-4 py-2 text-sm">Cerrar</button>
                                <button onClick={async ()=>{
                                    try {
                                        setGenerando(true);
                                        const detalle = await fetchDetalleDte(reminderDoc, false);
                                        const pdfResult = await generarPdfDocumentoSeleccionado({ documento: reminderDoc, detalleDte: detalle, activeTab, empresa, mes, ano, autoDownload: false, observacion });
                                        const a = document.createElement('a'); a.href = pdfResult.url; a.download = pdfResult.fileName; document.body.appendChild(a); a.click(); a.remove();
                                    } catch (e) { console.error(e); alert('Error descargando PDF'); }
                                    finally { setGenerando(false); }
                                }} className="rounded bg-cyan-600 px-4 py-2 text-sm text-white">Descargar en PDF</button>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
}
