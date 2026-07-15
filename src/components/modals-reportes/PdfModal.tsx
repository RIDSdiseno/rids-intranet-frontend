// src/components/modals-reportes/PdfModal.tsx
import React from "react";
import {
    CloseOutlined,
    DownloadOutlined,
    FilePdfOutlined,
} from "@ant-design/icons";

type PdfModalProps = {
    pdfUrl: string | null;
    fileName?: string;
    onClose: () => void;
};

export const PdfModal: React.FC<PdfModalProps> = ({
    pdfUrl,
    fileName = "Informe.pdf",
    onClose,
}) => {
    if (!pdfUrl) return null;

    const previewPdfUrl = `${pdfUrl}#view=FitH&zoom=page-width`;

    const handleDescargar = () => {
        const link = document.createElement("a");
        link.href = pdfUrl;
        link.download = fileName;
        link.click();
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 px-3 py-4 sm:px-4 sm:py-6">
            <div className="flex h-[94vh] w-[96vw] max-w-[1500px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
                    <div className="min-w-0">
                        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800 sm:text-xl">
                            <FilePdfOutlined className="text-rose-600" />
                            Vista previa del reporte PDF
                        </h2>

                        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                            Revisa el informe generado antes de descargarlo o cerrarlo.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar vista previa"
                        className="shrink-0 rounded-full p-2 text-slate-500 hover:bg-slate-100"
                    >
                        <CloseOutlined />
                    </button>
                </div>

                {/* Preview */}
                <div className="min-h-0 flex-1 overflow-hidden bg-slate-100 p-3">
                    <iframe
                        title="Vista previa del reporte PDF"
                        src={previewPdfUrl}
                        className="h-full min-h-[74vh] w-full rounded-xl border border-slate-200 bg-white"
                    />
                </div>

                {/* Footer */}
                <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
                    >
                        Cerrar
                    </button>

                    <button
                        type="button"
                        onClick={handleDescargar}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-200 px-4 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-50 sm:w-auto"
                    >
                        <DownloadOutlined />
                        Descargar PDF
                    </button>
                </div>
            </div>
        </div>
    );
};