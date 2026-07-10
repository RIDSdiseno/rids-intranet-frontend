import React, { useState } from "react";
import {
    CloseOutlined,
    DownloadOutlined,
    MailOutlined,
} from "@ant-design/icons";

type InformeResumenGenerado = {
    nombreArchivo: string;
    mimeType: string;
    fileBase64: string;
    previewUrl: string;
};

type Props = {
    show: boolean;
    reporte: InformeResumenGenerado | null;
    loading?: boolean;
    onClose: () => void;
    onEnviarCorreo: (payload: {
        destinatario: string;
        asunto: string;
        mensaje: string;
        reporte: InformeResumenGenerado;
    }) => Promise<void>;
};

export default function ReportePreviewEmailModal({
    show,
    reporte,
    loading = false,
    onClose,
    onEnviarCorreo,
}: Props) {
    const [destinatario, setDestinatario] = useState("");
    const [asunto, setAsunto] = useState("Informe resumido RIDS");
    const [mensaje, setMensaje] = useState(
        "Estimado(a),\n\nSe adjunta el informe resumido del período seleccionado.\n\nSaludos cordiales."
    );
    const [errorLocal, setErrorLocal] = useState<string | null>(null);

    if (!show || !reporte) return null;

    const handleDescargar = () => {
        // Descarga el mismo PDF que se está visualizando.
        const link = document.createElement("a");
        link.href = reporte.previewUrl;
        link.download = reporte.nombreArchivo;
        link.click();
    };

    const handleEnviar = async () => {
        // Validaciones visibles dentro del modal.
        if (!destinatario.trim()) {
            setErrorLocal("Debes ingresar un correo destinatario.");
            return;
        }

        if (!asunto.trim()) {
            setErrorLocal("Debes ingresar un asunto.");
            return;
        }

        setErrorLocal(null);

        await onEnviarCorreo({
            destinatario,
            asunto,
            mensaje,
            reporte,
        });
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 px-3 py-4 sm:px-4 sm:py-6">
            <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
                            Vista previa del informe resumido
                        </h2>

                        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                            Revisa el PDF antes de enviarlo por correo.
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

                {/* Contenido responsive */}
                <div className="grid flex-1 overflow-y-auto md:grid-cols-[1.4fr_0.8fr]">
                    {/* Vista previa del PDF */}
                    <div className="min-h-[420px] border-b border-slate-200 bg-slate-100 p-3 md:border-b-0 md:border-r">
                        <iframe
                            title="Vista previa del informe resumido"
                            src={reporte.previewUrl}
                            className="h-[65vh] w-full rounded-xl border border-slate-200 bg-white"
                        />
                    </div>

                    {/* Formulario de envío */}
                    <div className="space-y-4 p-4 sm:p-6">
                        {errorLocal && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                                {errorLocal}
                            </div>
                        )}

                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">
                                Destinatario
                            </label>

                            <input
                                type="email"
                                value={destinatario}
                                onChange={(e) => {
                                    setErrorLocal(null);
                                    setDestinatario(e.target.value);
                                }}
                                placeholder="correo@empresa.cl"
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">
                                Asunto
                            </label>

                            <input
                                type="text"
                                value={asunto}
                                onChange={(e) => {
                                    setErrorLocal(null);
                                    setAsunto(e.target.value);
                                }}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">
                                Mensaje
                            </label>

                            <textarea
                                value={mensaje}
                                rows={8}
                                onChange={(e) => {
                                    setErrorLocal(null);
                                    setMensaje(e.target.value);
                                }}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                            />
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                            <p className="text-xs font-semibold uppercase text-slate-500">
                                Archivo adjunto
                            </p>

                            <p className="mt-1 break-words text-sm font-medium text-slate-700">
                                {reporte.nombreArchivo}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
                    >
                        Cancelar
                    </button>

                    <button
                        type="button"
                        onClick={handleDescargar}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-200 px-4 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-50 sm:w-auto"
                    >
                        <DownloadOutlined />
                        Descargar
                    </button>

                    <button
                        type="button"
                        onClick={handleEnviar}
                        disabled={loading}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    >
                        <MailOutlined />
                        {loading ? "Enviando..." : "Enviar por correo"}
                    </button>
                </div>
            </div>
        </div>
    );
}