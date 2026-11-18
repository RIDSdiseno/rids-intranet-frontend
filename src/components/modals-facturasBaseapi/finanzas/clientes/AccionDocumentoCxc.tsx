// src/components/modals-facturasBaseapi/finanzas/clientes/AccionDocumentoCxc.tsx
// Fase 3a: acciones sobre una factura desde la ficha del cliente (mismas que la pestaña Facturas):
// ver detalle y PDF, pagos y abonos (Fase 4a), anular pago, reenviar factura y enviar recordatorio.
// Endpoints: /baseapi/dte/folio, /baseapi/finanzas/cxc/pagos, /baseapi/rcv/conciliacion/desconciliar
// y /baseapi/finanzas/cxc/envios/*.

import React, { useEffect, useState } from "react";

import { X } from "lucide-react";

import { api } from "../../../../api/api";

import DetalleBaseApiModal from "../../DetalleBaseApiModal";
import { generarPdfDocumentoSeleccionado } from "../../pdfDocumento";

import EnviarDocumentoCxcModal from "../EnviarDocumentoCxcModal";
import PagosDocumentoCxcModal from "../PagosDocumentoCxcModal";
import type { DocumentoCxc, EmpresaCxc } from "../cxc.types";

export type TipoAccionCxc = "detalle" | "pago" | "anular" | "factura" | "recordatorio";

export type AccionCxc = {
    tipo: TipoAccionCxc;
    empresa: EmpresaCxc;
    doc: DocumentoCxc;
};

type Props = {
    accion: AccionCxc;
    onClose: () => void;
    /** Pago registrado o anulado: hay que recargar. */
    onCambio: (mensaje: string) => void;
    onError: (mensaje: string) => void;
};

/* =========================================================
   HELPERS
========================================================= */

function formatFecha(value: string | null | undefined) {
    const m = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : "—";
}

function formatRut(rut: string) {
    const limpio = rut.replace(/[^0-9kK]/g, "").toUpperCase();
    return limpio.length > 1 ? `${limpio.slice(0, -1)}-${limpio.slice(-1)}` : limpio;
}

function mensajeError(err: any, porDefecto: string) {
    return String(err?.response?.data?.error ?? err?.response?.data?.message ?? err?.message ?? porDefecto);
}

function documentoRcv(doc: DocumentoCxc, empresa: EmpresaCxc) {
    return {
        "Tipo Doc": doc.tipoDoc,
        Folio: doc.folio,
        "Rut cliente": formatRut(doc.rutContraparte),
        "Razon Social": doc.razonSocial ?? "",
        "Fecha Docto": doc.fechaEmision ?? "",
        "Monto total": doc.montoOriginal,
        empresaOrigen: empresa,
    };
}

/* =========================================================
   COMPONENTE
========================================================= */

const AccionDocumentoCxc: React.FC<Props> = ({ accion, onClose, onCambio, onError }) => {
    const { tipo, empresa, doc } = accion;

    /* ---------- Detalle y PDF ---------- */

    const [detalleDte, setDetalleDte] = useState<any | null>(null);
    const [detalleLoading, setDetalleLoading] = useState(false);
    const [detalleError, setDetalleError] = useState("");
    const [pdfPreparando, setPdfPreparando] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfNombre, setPdfNombre] = useState("");

    const consultarDte = async (forceRefresh = false) => {
        setDetalleLoading(true);
        setDetalleError("");
        try {
            const response = await api.get(`/baseapi/dte/folio/${doc.folio}`, {
                params: { periodo: doc.periodo, empresa, tipoDTE: doc.tipoDoc, ...(forceRefresh ? { forceRefresh: true } : {}) },
            });
            setDetalleDte(response.data);
            return response.data;
        } catch (err: any) {
            setDetalleError(mensajeError(err, "No se pudo consultar el DTE."));
            return null;
        } finally {
            setDetalleLoading(false);
        }
    };

    useEffect(() => {
        if (tipo !== "detalle") return;
        let activo = true;
        let url: string | null = null;

        void (async () => {
            const detalle = await consultarDte();
            if (!detalle || !activo) return;

            setPdfPreparando(true);
            try {
                const [ano = "", mes = ""] = doc.periodo.split("-");
                const pdf = await generarPdfDocumentoSeleccionado({
                    documento: documentoRcv(doc, empresa),
                    detalleDte: detalle,
                    activeTab: "ventas",
                    empresa,
                    mes,
                    ano,
                    autoDownload: false,
                });
                url = pdf.url;
                if (activo) {
                    setPdfUrl(pdf.url);
                    setPdfNombre(pdf.fileName);
                }
            } catch (err) {
                console.error("Error preparando PDF", err);
            } finally {
                if (activo) setPdfPreparando(false);
            }
        })();

        return () => {
            activo = false;
            if (url) URL.revokeObjectURL(url);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tipo, doc.key, empresa]);

    /* ---------- Pagos ---------- */

    const [guardando, setGuardando] = useState(false);
    /** Último cambio hecho en el modal de pagos: se informa al cerrarlo. */
    const [cambioPagos, setCambioPagos] = useState<string | null>(null);

    const anularPago = async () => {
        setGuardando(true);
        try {
            await api.post("/baseapi/rcv/conciliacion/desconciliar", {
                empresa,
                tipoRcv: "ventas",
                tipoDoc: doc.tipoDoc,
                folio: doc.folio,
                rutContraparte: doc.rutContraparte,
            });
            onCambio(`Pago anulado: ${doc.tipoDoc}-${doc.folio} vuelve a quedar por cobrar.`);
        } catch (err: any) {
            onError(mensajeError(err, "No se pudo anular el pago."));
        } finally {
            setGuardando(false);
        }
    };

    /* ---------- Render ---------- */

    if (tipo === "detalle") {
        return (
            <DetalleBaseApiModal
                documento={documentoRcv(doc, empresa)}
                activeTab="ventas"
                empresa={empresa}
                mes={doc.periodo.split("-")[1] ?? ""}
                ano={doc.periodo.split("-")[0] ?? ""}
                onClose={onClose}
                onConsultarDte={(_doc, forceRefresh) => consultarDte(forceRefresh)}
                detalleDte={detalleDte}
                detalleLoading={detalleLoading}
                detalleError={detalleError}
                pdfPreparando={pdfPreparando}
                pdfPreparadoUrl={pdfUrl}
                pdfPreparadoNombre={pdfNombre}
            />
        );
    }

    if (tipo === "pago") {
        return (
            <PagosDocumentoCxcModal
                empresa={empresa}
                documento={doc}
                onCambio={setCambioPagos}
                // Al cerrar: si hubo pagos o abonos, la ficha recarga.
                onClose={() => (cambioPagos ? onCambio(cambioPagos) : onClose())}
            />
        );
    }

    if (tipo === "factura" || tipo === "recordatorio") {
        return (
            <EnviarDocumentoCxcModal
                tipo={tipo}
                empresa={empresa}
                documento={doc}
                onClose={onClose}
                onEnviado={() => undefined}
            />
        );
    }

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
            <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-black text-slate-900">
                        Anular pago · {doc.tipoDoc}-{doc.folio} ({empresa.toUpperCase()})
                    </h3>
                    <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Cerrar">
                        <X size={16} />
                    </button>
                </div>

                <div className="space-y-3 text-sm text-slate-600">
                    <p>
                        El pago de <strong>{doc.razonSocial}</strong> registrado el <strong>{formatFecha(doc.pagadoAt)}</strong>
                        {doc.formaPago ? ` (${doc.formaPago})` : ""} se quitará y la factura volverá a quedar por cobrar.
                    </p>
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => void anularPago()}
                            disabled={guardando}
                            className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-60"
                        >
                            {guardando ? "Anulando..." : "Anular pago"}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AccionDocumentoCxc;