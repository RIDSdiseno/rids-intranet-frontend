// components/reportes/PdfModal.tsx
import React, { useRef } from "react";
import {
    CloseOutlined,
    DownloadOutlined,
    EyeOutlined,
    LoadingOutlined,
    PrinterOutlined,
} from "@ant-design/icons";

interface PdfModalProps {
    pdfUrl: string | null;
    onClose: () => void;
}

export const PdfModal: React.FC<PdfModalProps> = ({ pdfUrl, onClose }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const handlePrint = () => {
        const iframe = iframeRef.current;
        if (iframe?.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        }
    };

    const handleDownload = () => {
        if (!pdfUrl) return;
        const a = document.createElement("a");
        a.href = pdfUrl;
        a.download = `Reporte_${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    };

    return (
        <div className="fixed inset-0 z-[100]">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />

            {/* Dialog */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                            <EyeOutlined />
                            Vista previa PDF
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleDownload}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white"
                            >
                                <DownloadOutlined /> Descargar
                            </button>
                            <button
                                onClick={handlePrint}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <PrinterOutlined /> Imprimir
                            </button>
                            <button
                                onClick={onClose}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800"
                            >
                                <CloseOutlined />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="h-[80vh] bg-slate-50">
                        {pdfUrl ? (
                            <iframe
                                ref={iframeRef}
                                src={pdfUrl}
                                className="w-full h-full"
                                title="Vista previa PDF"
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-500">
                                <LoadingOutlined className="mr-2 animate-spin" /> Cargando PDF…
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};