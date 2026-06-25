import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import ReactDOM from "react-dom";
import DocumentosRcvTable from "../components/modals-facturasBaseapi/DocumentosRcvTable";
import DetalleBaseApiModal from "../components/modals-facturasBaseapi/DetalleBaseApiModal";
import CobranzaDetalleModal from "../components/modals-cobranza/CobranzaDetalleModal";
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
import {
    FileTextOutlined,
    ClockCircleOutlined,
    ExclamationCircleOutlined,
    CheckCircleOutlined,
    DollarOutlined,
} from "@ant-design/icons";

const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:4000/api";

export default function Cobranza({ embedded = false }: { embedded?: boolean }) {
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
    const [prevCobranzaDoc, setPrevCobranzaDoc] = useState<any | null>(null);
    const [detalleDte, setDetalleDte] = useState<any | null>(null);
    const [detalleLoading, setDetalleLoading] = useState(false);
    const [detalleError, setDetalleError] = useState("");
    const [reminderModalOpen, setReminderModalOpen] = useState(false);
    const [reminderDoc, setReminderDoc] = useState<any | null>(null);
    const [cobranzaModalOpen, setCobranzaModalOpen] = useState(false);
    const [cobranzaSelectedDoc, setCobranzaSelectedDoc] = useState<any | null>(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editDoc, setEditDoc] = useState<any | null>(null);
    const [editFecha, setEditFecha] = useState<string>("");
    const [historialModalOpen, setHistorialModalOpen] = useState(false);
    const [historialDoc, setHistorialDoc] = useState<any | null>(null);

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

                    return tipo !== "61"; // excluir Notas de Crédito (61) solamente; incluir Notas de Débito (56)
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
        // Abrir modal específico de Cobranza (vista rápida y flags NC/ND)
        setCobranzaSelectedDoc(doc);
        setCobranzaModalOpen(true);
    };

    const openFullDetailFromCobranza = async (doc: any) => {
        // cerrar modal rápido y abrir detalle completo (DetalleBaseApiModal)
        try {
            // guardar referencia para volver
            setPrevCobranzaDoc(doc);
            setCobranzaModalOpen(false);
            setCobranzaSelectedDoc(null);
            setDocumentoSeleccionado(doc);
            if (activeTab === "ventas") {
                await fetchDetalleDte(doc, false);
            }
        } catch (e) {
            console.error('Error abriendo detalle completo desde Cobranza:', e);
        }
    };

    // listener to open full detail from HistorialModal (uses CustomEvent dispatched there)
    useEffect(() => {
        const handler = (ev: any) => {
            try {
                const doc = ev?.detail;
                if (doc) openFullDetailFromCobranza(doc);
            } catch (e) { }
        };
        window.addEventListener('openFullDetailFromCobranza', handler as EventListener);
        return () => window.removeEventListener('openFullDetailFromCobranza', handler as EventListener);
    }, [openFullDetailFromCobranza]);

    const handleBackToCobranzaModal = () => {
        if (!prevCobranzaDoc) return;
        setDocumentoSeleccionado(null);
        setCobranzaSelectedDoc(prevCobranzaDoc);
        setCobranzaModalOpen(true);
        setPrevCobranzaDoc(null);
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
        <div className={embedded ? "" : "p-6"}>
            {!embedded && (
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
            </div>
            )}

            {embedded && respuesta && (
                <div className="mb-4 rounded border border-emerald-200 bg-emerald-50 text-emerald-800 px-4 py-3 text-sm">Datos cargados desde cache si estaban disponibles</div>
            )}

            <div className="rounded-3xl border border-cyan-200 bg-white p-4 shadow-sm sm:p-5 overflow-visible">
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

            <div className="mt-6 grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="mb-2 flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 text-sm">
                            <FileTextOutlined />
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Documentos</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">{documentosFiltrados.length}</div>
                    <div className="text-xs text-slate-400 mt-1">Registros encontrados</div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="mb-2 flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 text-sm">
                            <ClockCircleOutlined />
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wide text-amber-600">Pendientes</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">{pendienteCount}</div>
                    <div className="text-xs text-slate-400 mt-1">Documentos pendientes</div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="mb-2 flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-600 text-sm">
                            <ExclamationCircleOutlined />
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wide text-red-500">Vencidas</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">{vencidaCount}</div>
                    <div className="text-xs text-slate-400 mt-1">Documentos vencidos</div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="mb-2 flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 text-sm">
                            <CheckCircleOutlined />
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-600">Confirmados</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">{pagadaCount}</div>
                    <div className="text-xs text-slate-400 mt-1">Confirmados / pagados</div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-900 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="mb-2 flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-white text-sm">
                            <DollarOutlined />
                        </span>
                        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-300">Total</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{formatCLP(totalImporte)}</div>
                    <div className="text-xs text-slate-400 mt-1">Suma bruta del periodo</div>
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
                mode="cobranza"
                renderRowActions={(doc) => {
                    const ActionMenu: React.FC = () => {
                        const [open, setOpen] = React.useState(false);
                        const btnRef = useRef<HTMLButtonElement | null>(null);
                        const [anchor, setAnchor] = React.useState<DOMRect | null>(null);

                        const toggle = (e?: any) => {
                            e && e.stopPropagation();
                            if (!open) {
                                const rect = btnRef.current?.getBoundingClientRect() ?? null;
                                setAnchor(rect);
                                setOpen(true);
                                // close on outside click
                                setTimeout(() => {
                                    const handler = (ev: any) => {
                                        if (!btnRef.current) return;
                                        if (btnRef.current.contains(ev.target)) return;
                                        setOpen(false);
                                        document.removeEventListener('click', handler);
                                    };
                                    document.addEventListener('click', handler);
                                }, 0);
                            } else {
                                setOpen(false);
                            }
                        };

                        const close = () => setOpen(false);

                        const initialFecha = String(getValue(doc, ["FchVenc", "FchVencimiento", "fechaVencimiento", "vencimiento", "fecha_vencimiento", "Vencimiento"], "")).slice(0,10);

                        // render menu as fixed portal so it escapes table clipping
                        const menu = open && anchor && typeof document !== 'undefined' ? ReactDOM.createPortal(
                            (() => {
                                const menuWidth = 192; // approx w-48
                                const viewportW = window.innerWidth;
                                const viewportH = window.innerHeight;
                                const spaceBelow = viewportH - anchor.bottom;
                                const maxMenuH = Math.min(viewportH * 0.45, 360);
                                const placeBelow = spaceBelow >= 160; // prefer below if enough space

                                // align right edge with button right edge
                                let left = anchor.left + (anchor.width || 0) - menuWidth;
                                if (left + menuWidth + 12 > viewportW) left = Math.max(8, viewportW - menuWidth - 12);
                                if (left < 8) left = 8;

                                // compute top anchor and use translateY to stick to button
                                const topBelow = anchor.top + window.scrollY + (anchor.height || 0);
                                const topAbove = anchor.top + window.scrollY;

                                const style: any = { position: 'fixed', left, zIndex: 9999 };
                                if (placeBelow) {
                                    style.top = topBelow;
                                    style.transform = 'translateY(0)';
                                } else {
                                    // position so that menu's bottom aligns with button top
                                    style.top = topAbove;
                                    style.transform = 'translateY(-100%)';
                                }

                                return (
                                    <div style={style}>
                                        <div className="mt-2 w-48 rounded-lg border border-slate-200 bg-white shadow-lg" style={{ maxHeight: maxMenuH, overflow: 'auto' }}>
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
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); close(); setHistorialDoc(doc); setHistorialModalOpen(true); }}
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
                                <button ref={btnRef} onClick={toggle} className="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                                    Acciones ▾
                                </button>

                                {menu}
                            </div>
                        );
                    };

                    return <ActionMenu />;
                }}
            />

            <div className="mt-4 flex justify-end">
                <Pagination current={page} pageSize={pageSize} total={documentosFiltrados.length} onChange={(p, ps) => { setPage(p); setPageSize(ps); }} showSizeChanger pageSizeOptions={[10,20,50,100]} />
            </div>

            {cobranzaModalOpen && cobranzaSelectedDoc && (
                (() => {
                    const all = getDocumentos(respuesta) || documentos;

                    // usar la empresa del documento seleccionado para filtrar
                    const ekThis = String(getValue(cobranzaSelectedDoc, ["empresaOrigen", "empresa", "empresaKey", "rutEmpresa"], "")).toLowerCase().trim();
                    const rutThis = String(getValue(cobranzaSelectedDoc, ['RUT Receptor','rutReceptor','rutCliente','rutProveedor'], '')).replace(/[^0-9kK]/g,'').toLowerCase();
                    const razonThis = String(getValue(cobranzaSelectedDoc, ['Razon Social','Razón Social','razonSocial','razonSocialReceptor','razonSocialProveedor'], '')).toLowerCase().trim();

                    const filtered = (all || []).filter((d: any) => {
                        try {
                            const ek = String(getValue(d, ["empresaOrigen", "empresa", "empresaKey", "rutEmpresa"], "")).toLowerCase().trim();
                            if (ekThis && ek && ek === ekThis) return true;

                            const rut = String(getValue(d, ['RUT Receptor','rutReceptor','rutCliente','rutProveedor'], '')).replace(/[^0-9kK]/g,'').toLowerCase();
                            if (rutThis && rut && rut === rutThis) return true;

                            const razon = String(getValue(d, ['Razon Social','Razón Social','razonSocial','razonSocialReceptor','razonSocialProveedor'], '')).toLowerCase().trim();
                            if (razonThis && razon && (razon.includes(razonThis) || razonThis.includes(razon))) return true;

                            return false;
                        } catch { return false; }
                    });

                    return (
                        <CobranzaDetalleModal
                            documento={cobranzaSelectedDoc}
                            documentosAll={filtered}
                            onClose={() => { setCobranzaModalOpen(false); setCobranzaSelectedDoc(null); }}
                            onOpenFullDetail={openFullDetailFromCobranza}
                        />
                    );
                })()
            )}


            <DetalleBaseApiModal
                documento={documentoSeleccionado}
                activeTab={activeTab === "ventas" ? "ventas" : "compras"}
                empresa={empresa}
                mes={mes}
                ano={ano}
                onClose={() => setDocumentoSeleccionado(null)}
                onBack={handleBackToCobranzaModal}
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
            {historialModalOpen && historialDoc && (
                <HistorialModal
                    documento={historialDoc}
                    onClose={() => { setHistorialModalOpen(false); setHistorialDoc(null); }}
                    documentosAll={getDocumentos(respuesta) || documentos}
                    fetchAuditLogs={async (empresaId: number) => {
                        try {
                            const token = localStorage.getItem('accessToken') ?? '';
                            const headers: any = { 'Content-Type': 'application/json' };
                            if (token) headers.Authorization = `Bearer ${token}`;
                            const res = await fetch(`${BASE_URL}/audit?empresaId=${empresaId}&limit=200`, { headers });
                            if (!res.ok) return [];
                            const json = await res.json();
                            return json?.data ?? [];
                        } catch (e) { return []; }
                    }}
                />
            )}
        </div>
    );
}

// Componente interno para el contenido del modal, separado para mantener Cobranza claro
function ReminderBody({ reminderDoc, onClose, fetchDetalleDte, activeTab, empresa, mes, ano }: { reminderDoc: any; onClose: () => void; fetchDetalleDte: (doc:any, force?:boolean)=>Promise<any>; activeTab: any; empresa: any; mes:string; ano:string }) {
    const [canal, setCanal] = React.useState<string>("email");
    const [tipo, setTipo] = React.useState<string>("");
    const [manualEmail, setManualEmail] = React.useState<string>("");
    const [manualNombre, setManualNombre] = React.useState<string>("");
    const [observacion, setObservacion] = React.useState<string>("");
    const [generando, setGenerando] = React.useState(false);
    const [showPreviewHtml, setShowPreviewHtml] = React.useState(false);
    const [previewHtml, setPreviewHtml] = React.useState<string>("");

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manualEmail.trim());

    return (
        <div className="mt-4">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                    <div className="mb-3 flex items-center gap-3">
                        <div className="rounded-full bg-cyan-600 px-3 py-1 text-white font-bold">1</div>
                        <h3 className="text-sm font-semibold">Recordatorio</h3>
                    </div>

                    <label className="block text-xs font-medium text-slate-600 mb-2">Canal</label>
                    <select value={canal} onChange={(e) => setCanal(e.target.value)} className="mb-3 h-10 w-full rounded border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-cyan-100">
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
                </div>

                <div>
                    <div className="mb-3 flex items-center gap-3">
                        <div className="rounded-full bg-slate-200 px-3 py-1 text-slate-700 font-bold">2</div>
                        <h3 className="text-sm font-semibold">Destinatario</h3>
                    </div>

                    <label className="block text-xs font-medium text-slate-600 mb-1">Nombre (opcional)</label>
                    <input
                        type="text"
                        value={manualNombre}
                        onChange={(e) => setManualNombre(e.target.value)}
                        placeholder="Ej: Juan Pérez"
                        className="mb-3 h-10 w-full rounded border border-slate-200 px-3 text-sm outline-none focus:ring-2 focus:ring-cyan-100"
                    />

                    <label className="block text-xs font-medium text-slate-600 mb-1">Correo de destino <span className="text-red-500">*</span></label>
                    <input
                        type="email"
                        value={manualEmail}
                        onChange={(e) => setManualEmail(e.target.value)}
                        placeholder="correo@ejemplo.com"
                        className={`h-10 w-full rounded border px-3 text-sm outline-none focus:ring-2 focus:ring-cyan-100 ${manualEmail && !emailValido ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                    />
                    {manualEmail && !emailValido && (
                        <p className="mt-1 text-xs text-red-500">Ingresa un correo válido</p>
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
                    if (!emailValido || !canal || !tipo) return;
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

                            const saludo = manualNombre.trim() ? `Estimado(a) ${manualNombre.trim()}:` : 'Estimado(a):';

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
                }} disabled={!emailValido || !canal || !tipo || generando} className={`rounded bg-cyan-600 px-4 py-2 text-sm text-white ${(!emailValido || !canal || !tipo) ? 'opacity-60 cursor-not-allowed' : ''}`}>
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
                                <button onClick={async ()=>{
                                    try {
                                        if (!emailValido) { alert('Ingresa un correo válido'); return; }
                                        setGenerando(true);

                                        const token = localStorage.getItem('accessToken') ?? '';
                                        const headers: any = { 'Content-Type': 'application/json' };
                                        if (token) headers.Authorization = `Bearer ${token}`;

                                        const targets = [{ email: manualEmail.trim(), nombre: manualNombre.trim() || manualEmail.trim() }];
                                        const folio = String(getValue(reminderDoc, ["Folio","folio","Nro","numero"], "—"));
                                        const subject = tipo === 'vencida' ? 'Factura Vencida' : tipo === 'por_vencer' ? 'Factura por vencer' : 'Recordatorio';
                                        const bodyHtml = previewHtml;

                                        const sendResp = await fetch(`${BASE_URL}/correo/enviar-masivo`, { method: 'POST', headers, body: JSON.stringify({ targets, subject, bodyHtml, ratePerMin: 30 }) });
                                        const sendJson = await sendResp.json().catch(() => ({}));
                                        if (!sendResp.ok || !sendJson?.ok) {
                                            const msg = sendJson?.message || sendJson?.error || `Error ${sendResp.status}`;
                                            throw new Error(String(msg));
                                        }

                                        // Registrar en audit logs que se envió un recordatorio
                                        try {
                                            const empresaId = Number(getValue(reminderDoc, ['empresaId','empresa_id','id_empresa'], '') ) || null;
                                            const folioAudit = String(getValue(reminderDoc, ['Folio','folio','Nro','numero'], '')).replace(/[^0-9]/g,'') || null;
                                            const auditBody = {
                                                entity: folioAudit ? 'Documento' : 'Recordatorio',
                                                entityId: folioAudit || null,
                                                empresaId: empresaId,
                                                action: 'REMINDER',
                                                description: `Recordatorio enviado a ${manualEmail.trim()} vía ${canal}`,
                                                changes: { canal, tipo, contacto: manualEmail.trim(), observacion }
                                            };

                                            await fetch(`${BASE_URL}/audit`, { method: 'POST', headers, body: JSON.stringify(auditBody) });
                                        } catch (e) { console.warn('No se pudo crear audit log:', e); }

                                        alert('Recordatorio encolado para envío correctamente');
                                        setShowPreviewHtml(false);
                                        onClose();
                                    } catch (e: any) {
                                        console.error('Error enviando recordatorio:', e);
                                        alert(String(e?.message ?? e));
                                    } finally { setGenerando(false); }
                                }} className="rounded bg-emerald-600 px-4 py-2 text-sm text-white">Enviar</button>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
}

// Historial modal component (simple timeline built from documento, related docs and audit logs)
function HistorialModal({ documento, onClose, documentosAll, fetchAuditLogs }: { documento: any; onClose: () => void; documentosAll: any[]; fetchAuditLogs: (empresaId:number)=>Promise<any[]> }) {
    const [loading, setLoading] = React.useState(false);
    const [items, setItems] = React.useState<any[]>([]);

    React.useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            try {
                const fol = String(getValue(documento, ["Folio","folio","Nro","numero"], "")).replace(/[^0-9]/g,"");
                const rawFecha = getValue(documento, ["FchEmis","Fecha Emisión","fechaEmision","fecha","fechaEmisionDocumento","FechaEmision","FecEmis"], "");
                const fechaEmi = formatFechaVista(rawFecha);
                const monto = formatCLP(getMontoTotalDoc(documento));

                const baseItems: any[] = [];
                // helper para mapear tipoDTE a etiqueta legible
                const tipoLabelFor = (doc: any) => {
                    try {
                        const explicit = getValue(doc, ['tipoDTEString','tipoDTEString','Tipo DTE','tipoDTEString','tipoDTEStr'], null);
                        if (explicit && explicit !== '—') return String(explicit);
                        const t = String(getValue(doc, ['Tipo Doc','tipoDoc','tipoDTE'], '')).trim();
                        const n = Number(t);
                        if (n === 33) return 'Factura';
                        if (n === 34) return 'Factura Exenta';
                        if (n === 56) return 'Nota de Débito';
                        if (n === 61) return 'Nota de Crédito';
                        if (t) return `DTE ${t}`;
                    } catch { }
                    return 'Documento';
                };

                // la entrada del documento seleccionado se añadirá al final para mostrar la cadena ancestros->...->seleccionado

                // buscar documentos relacionados transitivamente (BFS)
                const folNum = Number(fol || 0);
                const relatedWithDepth: Array<{doc:any, depth:number}> = [];

                // helper: extrae folios referenciados por un documento
                const getReferencedFoliosFromDoc = (d: any): number[] => {
                    const out: number[] = [];
                    try {
                        const raw = d?.raw ?? d ?? {};
                        const possibleKeys = ['folioDocReferencia','folioDocRef','folioRef','FolioRef','folioReferencia','folioDoc','folioReferenciado','referenciaFolio'];
                        for (const k of possibleKeys) {
                            const v = raw?.[k];
                            if (!v) continue;
                            const num = Number(String(v).replace(/[^0-9]/g,'')) || 0;
                            if (num) out.push(num);
                        }

                        if (Array.isArray(raw?.referencias)) {
                            for (const r of raw.referencias) {
                                const num = Number(r?.FolioRef ?? r?.folioRef ?? r?.folio ?? r?.Folio ?? 0) || 0;
                                if (num) out.push(num);
                            }
                        }

                        // buscar en string JSON/XML etiquetas <FolioRef>123</FolioRef> y números cercanos a palabras clave
                        const s = JSON.stringify(raw || '');
                        const xmlRe = /<FolioRef>\s*(\d{1,7})\s*<\/FolioRef>/gi;
                        for (const m of s.matchAll(xmlRe)) {
                            const num = Number(m[1]) || 0;
                            if (num) out.push(num);
                        }

                        // bounded numeric matches near keywords
                        const numReGlobal = /\b(\d{2,7})\b/g;
                        let m2;
                        while ((m2 = numReGlobal.exec(s)) !== null) {
                            const ctxStart = Math.max(0, m2.index - 60);
                            const ctx = s.slice(ctxStart, Math.min(s.length, m2.index + 60));
                            if (/folio|referen|referencia|FolioRef|Folio|Factura|Nota/i.test(ctx)) {
                                const num = Number(m2[1]) || 0;
                                if (num) out.push(num);
                            }
                        }
                    } catch (e) { /* ignore */ }
                    return Array.from(new Set(out));
                };

                // helper: intentar extraer una fecha de creación desde varias claves o desde el raw
                const getCreatedFromDoc = (d: any): string | null => {
                    try {
                        // Normalize helpers
                        const tryFormat = (val: any): string | null => {
                            if (val === null || val === undefined || val === '') return null;
                            // numeric timestamps (seconds or ms)
                            if (typeof val === 'number' || (/^\d{10,13}$/.test(String(val).trim()))) {
                                const n = typeof val === 'number' ? val : Number(String(val).trim());
                                if (!Number.isFinite(n)) return null;
                                // if 10 digits -> seconds
                                const ms = String(n).length === 10 ? n * 1000 : n;
                                const date = new Date(ms);
                                if (!Number.isNaN(date.getTime())) return formatFechaVista(date.toISOString());
                            }

                            // if it's a string like ISO or YYYY-MM-DD
                            const s = String(val).trim();
                            if (!s) return null;
                            // ISO
                            if (/^\d{4}-\d{2}-\d{2}T/.test(s) || /^\d{4}-\d{2}-\d{2}$/.test(s) || /^\d{2}\/\d{2}\/\d{4}/.test(s)) {
                                const formatted = formatFechaVista(s);
                                if (formatted && formatted !== '—') return formatted;
                            }

                            // try date parsing fallback
                            const date = new Date(s);
                            if (!Number.isNaN(date.getTime())) return formatFechaVista(date.toISOString());
                            return null;
                        };

                        // First: check common explicit keys
                        const explicit = ['createdAt','created_at','fechaCreacion','FchCreacion','fecha_creacion','created','createdOn','created_on','createdAtISO','fechaRegistro','fecha_registro','FchRegistro'];
                        for (const k of explicit) {
                            const v = d?.[k] ?? d?.raw?.[k] ?? d?.data?.[k] ?? d?.documento?.[k];
                            const out = tryFormat(v);
                            if (out) return out;
                        }

                        // Second: recursive search for keys containing crea/fecha/date
                        const seen = new Set<any>();
                        const recurse = (obj: any, depth = 0): string | null => {
                            if (!obj || depth > 4) return null;
                            if (seen.has(obj)) return null;
                            seen.add(obj);
                            try {
                                if (typeof obj === 'object') {
                                    for (const k of Object.keys(obj)) {
                                        const v = obj[k];
                                        if (/crea|fecha|date/i.test(k)) {
                                            const out = tryFormat(v);
                                            if (out) return out;
                                        }
                                    }
                                    for (const k of Object.keys(obj)) {
                                        const v = obj[k];
                                        if (v && typeof v === 'object') {
                                            const out = recurse(v, depth + 1);
                                            if (out) return out;
                                        }
                                    }
                                }
                            } catch (e) { /* ignore */ }
                            return null;
                        };

                        const byRecurse = recurse(d?.raw ?? d ?? d?.data ?? d?.documento ?? d, 0);
                        if (byRecurse) return byRecurse;

                        // Third: scan JSON for ISO or YYYY-MM-DD tokens
                        const sAll = JSON.stringify(d?.raw ?? d ?? {});
                        const isoRe = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)/g;
                        let m = isoRe.exec(sAll);
                        if (m && m[1]) return formatFechaVista(m[1]);
                        const dateRe = /(\d{4}-\d{2}-\d{2})/g;
                        m = dateRe.exec(sAll);
                        if (m && m[1]) return formatFechaVista(m[1]);
                    } catch (e) { /* ignore */ }
                    return null;
                };

                // helper: reunir posibles claves/valores de fecha del documento para mostrar candidatos
                const getDateCandidates = (d: any): string[] => {
                    const out: string[] = [];
                    try {
                        const keys = ['FchEmis','Fecha Emisión','fecha','fechaEmision','FechaEmision','FecEmis','createdAt','created_at','fechaCreacion','FchCreacion','fecha_creacion','created','createdOn','created_on','FechaRecepcion'];
                        for (const k of keys) {
                            const v = d?.[k] ?? d?.raw?.[k] ?? d?.data?.[k] ?? d?.documento?.[k];
                            if (v !== undefined && v !== null && String(v).trim() !== '') {
                                out.push(`${k}: ${String(v).slice(0,40)}`);
                            }
                        }

                        const s = JSON.stringify(d?.raw ?? d ?? {});
                        // buscar ISO y YYYY-MM-DD
                        const isoRe = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)/g;
                        let m; const seen = new Set<string>();
                        while ((m = isoRe.exec(s)) !== null) {
                            if (!seen.has(m[1])) { out.push(`iso: ${m[1]}`); seen.add(m[1]); }
                        }
                        const dateRe = /(\d{4}-\d{2}-\d{2})/g;
                        while ((m = dateRe.exec(s)) !== null) {
                            if (!seen.has(m[1])) { out.push(`date: ${m[1]}`); seen.add(m[1]); }
                        }
                    } catch (e) { /* ignore */ }
                    return Array.from(new Set(out));
                };

                try {
                    // primero, construir cadena de ancestros (documentos que este documento referencia),
                    // para poder mostrar la Factura original -> NC -> ND en orden
                    const findDocByFolio = (f: number) => {
                        return (documentosAll || []).find((dd: any) => {
                            const fol = Number(String(getValue(dd, ['Folio','folio','Nro','numero'], '')).replace(/[^0-9]/g,'')) || 0;
                            return fol === f;
                        }) || null;
                    };

                    const ancestors: any[] = [];
                    try {
                        let currentDoc: any = documento;
                        const seenFolios = new Set<number>();
                        let steps = 0;
                        while (steps < 8 && currentDoc) {
                            const refs = getReferencedFoliosFromDoc(currentDoc) || [];
                            if (!refs || refs.length === 0) break;
                            // preferir la primera referencia que corresponda a un doc en payload
                            let foundParent = null;
                            for (const rf of refs) {
                                if (seenFolios.has(rf)) continue;
                                const parentDoc = findDocByFolio(rf);
                                if (parentDoc) { foundParent = parentDoc; seenFolios.add(rf); break; }
                            }
                            if (!foundParent) break;
                            ancestors.push(foundParent);
                            currentDoc = foundParent;
                            steps++;
                        }
                    } catch (e) { /* ignore */ }

                    // push ancestros en orden desde el más antiguo al más cercano
                    if (ancestors.length > 0) {
                        const rev = ancestors.slice().reverse();
                        for (const r of rev) {
                            const tipoLbl = tipoLabelFor(r);
                            const title = tipoLbl ? `${tipoLbl} emitida` : 'Documento relacionado';
                            const rawRFecha = getValue(r, ['FchEmis','Fecha Emisión','fecha','fechaEmision','FechaEmision','FecEmis'], '');
                            const rFecha = formatFechaVista(rawRFecha);
                            const rCreated = getCreatedFromDoc(r);
                            baseItems.push({ type: 'ancestro', title, date: rFecha || null, created: rCreated || null, subtitle: `#${String(getValue(r,['Folio','folio','Nro','numero'],''))} → ${formatCLP(getMontoTotalDoc(r))}`, doc: r, candidates: getDateCandidates(r) });
                            try { console.debug('Historial: ancestro created check', { fol: getValue(r,['Folio','folio','Nro','numero'],''), rFecha, rCreated, keys: Object.keys(r || {}).slice(0,20), sampleRaw: JSON.stringify(r?.raw ?? r ?? {}).slice(0,200) }); } catch {};
                        }
                    }

                    // luego, buscar descendientes transitivos (BFS) empezando desde el folio original
                    const visitedDocs = new Set<any>();
                    const visitedFolios = new Set<number>();
                    if (folNum) visitedFolios.add(folNum);

                    const queue: Array<{folio:number, depth:number}> = folNum ? [{ folio: folNum, depth: 0 }] : [];

                    while (queue.length > 0) {
                        const { folio: parentFolio, depth } = queue.shift()!;
                        for (const d of documentosAll || []) {
                            if (!d) continue;
                            if (d === documento) continue;
                            if (visitedDocs.has(d)) continue;

                            const refs = getReferencedFoliosFromDoc(d);
                            if (refs.includes(parentFolio)) {
                                visitedDocs.add(d);
                                const dDepth = depth + 1;
                                relatedWithDepth.push({ doc: d, depth: dDepth });

                                const ownFol = Number(String(getValue(d, ['Folio','folio','Nro','numero'], '')).replace(/[^0-9]/g,'')) || 0;
                                if (ownFol && !visitedFolios.has(ownFol)) {
                                    visitedFolios.add(ownFol);
                                    queue.push({ folio: ownFol, depth: dDepth });
                                }
                            }
                        }
                    }
                } catch (e) { /* ignore BFS errors */ }

                // ordenar por profundidad asc y luego por fecha asc
                relatedWithDepth.sort((a,b) => a.depth - b.depth || (String(getValue(a.doc,['FchEmis','Fecha Emisión','fecha','fechaEmision'],'')).localeCompare(String(getValue(b.doc,['FchEmis','Fecha Emisión','fecha','fechaEmision'],'')))));

                for (const entry of relatedWithDepth) {
                    const r = entry.doc;
                    const tipoLbl = tipoLabelFor(r);
                    const tTitle = tipoLbl ? `${tipoLbl} emitida` : 'Documento relacionado';
                    const rawRFecha = getValue(r, ['FchEmis','Fecha Emisión','fecha','fechaEmision','FechaEmision','FecEmis'], '');
                    const rFecha = formatFechaVista(rawRFecha);
                    const rCreated = getCreatedFromDoc(r);
                    baseItems.push({ type: 'relacionado', title: tTitle, date: rFecha || null, created: rCreated || null, subtitle: `#${String(getValue(r,['Folio','folio','Nro','numero'],''))} → ${formatCLP(getMontoTotalDoc(r))}`, doc: r, depth: entry.depth, candidates: getDateCandidates(r) });
                    try { console.debug('Historial: relacionado created check', { fol: getValue(r,['Folio','folio','Nro','numero'],''), rFecha, rCreated, keys: Object.keys(r || {}).slice(0,20), sampleRaw: JSON.stringify(r?.raw ?? r ?? {}).slice(0,200) }); } catch {};
                }

                // finalmente, añadir el documento seleccionado (ND) al final de la cadena
                const createdSel = getCreatedFromDoc(documento);
                baseItems.push({ type: 'emitido', title: `${tipoLabelFor(documento)} emitida`, date: fechaEmi || null, created: createdSel || null, subtitle: `#${fol} → ${monto}`, doc: documento, candidates: getDateCandidates(documento) });
                try { console.debug('Historial: seleccionado created check', { fol, fechaEmi, createdSel, keys: Object.keys(documento || {}).slice(0,20), sampleRaw: JSON.stringify(documento?.raw ?? documento ?? {}).slice(0,200) }); } catch {};

                // intentar obtener audit logs si existe empresaId en documento
                let auditEntries: any[] = [];
                const empresaId = Number(getValue(documento, ['empresaId','empresa_id','id_empresa','empresa','empresaId'], '') ) || null;
                if (empresaId) {
                    try {
                        const logs = await fetchAuditLogs(empresaId);
                        // filtrar logs que mencionen el folio o contengan 'recordatorio'
                        auditEntries = (logs || []).filter((l: any) => {
                            try {
                                const s = JSON.stringify(l).toLowerCase();
                                return (fol && s.includes(String(fol))) || (l.description && String(l.description).toLowerCase().includes('recordatorio')) || (l.description && String(l.description).toLowerCase().includes('recordatorios'));
                            } catch { return false; }
                        }).slice(0, 30);
                    } catch (e) { /* ignore */ }
                }

                for (const a of auditEntries) {
                    const title = a.description || a.action || 'Acción';
                    const when = a.createdAt ? String(a.createdAt).slice(0,10) : null;
                    baseItems.push({ type: 'audit', title, date: when, created: when, subtitle: a.actor?.nombre ?? String(a.actorId ?? ''), raw: a });
                }

                // ordenar cronológicamente asc por fecha (nulls last)
                baseItems.sort((A,B) => {
                    const a = A.date || '9999-12-31';
                    const b = B.date || '9999-12-31';
                    return a < b ? -1 : a > b ? 1 : 0;
                });

                // Deduplicar entradas que puedan aparecer repetidas (mismo título + folio/subtitulo)
                const deduped: any[] = [];
                const seen = new Set<string>();
                for (const it of baseItems) {
                    try {
                        let key = '';
                        if (it.doc) {
                            const fol = String(getValue(it.doc, ['Folio','folio','Nro','numero'], '')).replace(/[^0-9]/g,'') || '';
                            key = `${String(it.title||'')}` + '::' + fol + '::' + String(it.subtitle||'');
                        } else if (it.raw && (it.raw.entityId || it.raw.id)) {
                            key = `${String(it.title||'')}` + '::' + String(it.raw.entityId ?? it.raw.id) + '::' + String(it.subtitle||'');
                        } else {
                            key = `${String(it.title||'')}` + '::' + String(it.subtitle||'') + '::' + String(it.date||it.created||'');
                        }

                        if (!seen.has(key)) {
                            seen.add(key);
                            deduped.push(it);
                        }
                    } catch (e) {
                        const fallback = JSON.stringify(it).slice(0,200);
                        if (!seen.has(fallback)) { seen.add(fallback); deduped.push(it); }
                    }
                }

                if (mounted) setItems(deduped);
            } catch (e) { console.error('Historial build error', e); }
            finally { if (mounted) setLoading(false); }
        })();
        return () => { mounted = false; };
    }, [documento, documentosAll, fetchAuditLogs]);

    return (
        <div className="fixed inset-0 z-60 flex items-start justify-center pt-12">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />

            <div className="relative w-full max-w-3xl rounded-lg bg-white p-6 shadow-lg">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Historial · Folio {String(getValue(documento, ['Folio','folio','Nro','numero'], '-'))}</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-700">✕</button>
                </div>

                <div className="mt-4 text-sm text-slate-600">Línea de tiempo con acciones relacionadas al documento.</div>

                <div className="mt-6">
                    {loading && <div className="text-sm text-slate-500">Cargando historial…</div>}
                    {!loading && items.length === 0 && <div className="text-sm text-slate-500">Sin historial registrado.</div>}

                    <div className="mt-4">
                        <div className="relative">
                            <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-200" />
                            <div className="space-y-6 pl-8">
                                {items.map((it, idx) => (
                                    <div key={idx} className="relative">
                                        <div className="absolute -left-1.5 top-1 w-3 h-3 rounded-full bg-white border border-slate-300" />
                                        <div className="rounded border border-slate-100 bg-slate-50 p-3">
                                            <div className="flex items-center justify-between">
                                                <div className="font-semibold text-sm">{it.title}</div>
                                                <div className="text-xs text-slate-500">
                                                    {it.date && it.date !== '—' ? it.date : ''}{(it.date && it.date !== '—' && it.created && it.created !== '—') ? ' · ' : ''}{it.created && it.created !== '—' ? `Creado ${it.created}` : ''}
                                                </div>
                                            </div>
                                            {it.subtitle && (
                                                <div className="mt-2 text-xs text-slate-500">{it.subtitle}</div>
                                            )}

                                            {/* Mostrar fecha de origen: emisión y/o creación */}
                                            {( (it.date && it.date !== '—') || (it.created && it.created !== '—') ) && (
                                                <div className="mt-2 text-xs text-slate-500">
                                                    {it.date && it.date !== '—' && (<div>Emitido: <span className="font-medium text-slate-700">{it.date}</span></div>)}
                                                    {it.created && it.created !== '—' && (<div>Creado: <span className="font-medium text-slate-700">{it.created}</span></div>)}
                                                </div>
                                            )}

                                            {/* Si no hay fechas explícitas, mostrar candidatos detectados */}
                                            {(!(it.date && it.date !== '—') && !(it.created && it.created !== '—') && it.candidates && it.candidates.length > 0) && (
                                                <div className="mt-2 text-xs text-amber-600">Fechas detectadas: {it.candidates.slice(0,3).join(' · ')}{it.candidates.length>3?` (+${it.candidates.length-3})`:''}</div>
                                            )}

                                            {it.doc && (
                                                <div className="mt-2 text-xs text-slate-700">
                                                    <a href="#" onClick={(e)=>{e.preventDefault(); onClose(); setTimeout(()=>{ const ev = new CustomEvent('openFullDetailFromCobranza', { detail: it.doc }); window.dispatchEvent(ev); }, 50); }} className="text-cyan-700 font-semibold">Ver detalle</a>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>

                <div className="mt-6 flex justify-end">
                    <button onClick={onClose} className="rounded border border-slate-200 bg-white px-4 py-2 text-sm">Cerrar</button>
                </div>
            </div>
        </div>
    );
}
