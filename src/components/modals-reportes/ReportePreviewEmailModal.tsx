// src/components/modals-reportes/ReportePreviewEmailModal.tsx
import React, { useState, useEffect } from "react";
import {
    CloseOutlined,
    DownloadOutlined,
    MailOutlined,
    RobotOutlined,
    FileWordOutlined,
    FilePdfOutlined,
} from "@ant-design/icons";

type InformeEmailGenerado = {
    nombreArchivo: string;
    mimeType: string;
    fileBase64: string;
    previewUrl?: string;
    downloadUrl?: string;
    previewFileName?: string;
    previewMimeType?: string;
};

type ContenidoAdicionalInforme = {
    introduccion: string;
    observaciones: string;
    conclusion: string;
};

type Props = {
    show: boolean;
    reporte: InformeEmailGenerado | null;
    loading?: boolean;
    regenerandoDocumento?: boolean;

    contenidoInicial?: ContenidoAdicionalInforme;

    onClose: () => void;

    onRegenerarDocumento: (
        contenido: ContenidoAdicionalInforme
    ) => Promise<void>;

    onEnviarCorreo: (payload: {
        destinatarios: string[];
        cc: string[];
        asunto: string;
        mensaje: string;
        reporte: InformeEmailGenerado;
    }) => Promise<void>;
};

export default function ReportePreviewEmailModal({
    show,
    reporte,
    loading = false,
    regenerandoDocumento = false,
    contenidoInicial,
    onClose,
    onRegenerarDocumento,
    onEnviarCorreo,
}: Props) {
    const [destinatario, setDestinatario] = useState("");
    const [asunto, setAsunto] = useState("Informe mensual Soporte TI RIDS");
    const [mensaje, setMensaje] = useState(
        "Estimado(a),\n\nSe adjunta el informe correspondiente al período transcurrido.\n\nSaludos cordiales."
    );
    const [errorLocal, setErrorLocal] = useState<string | null>(null);

    const [cc, setCc] = useState("");

    const [introduccion, setIntroduccion] = useState(
        contenidoInicial?.introduccion ?? ""
    );

    const [observaciones, setObservaciones] = useState(
        contenidoInicial?.observaciones ?? ""
    );

    const [conclusion, setConclusion] = useState(
        contenidoInicial?.conclusion ?? ""
    );

    const [documentoModificado, setDocumentoModificado] =
        useState(false);

    useEffect(() => {
        if (!show) return;

        setIntroduccion(
            contenidoInicial?.introduccion ?? ""
        );

        setObservaciones(
            contenidoInicial?.observaciones ?? ""
        );

        setConclusion(
            contenidoInicial?.conclusion ?? ""
        );

        setDocumentoModificado(false);
    }, [
        show,
        contenidoInicial?.introduccion,
        contenidoInicial?.observaciones,
        contenidoInicial?.conclusion,
    ]);

    const parseEmailList = (value: string): string[] => {
        return value
            .split(/[,;\n\r]+/g)
            .map((email) => email.trim().toLowerCase())
            .filter(Boolean);
    };

    const validarEmails = (emails: string[]) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emails.filter((email) => !emailRegex.test(email));
    };

    const isValidEmail = (email: string): boolean => {
        /*
          Valida visualmente cada correo mostrado como chip.
          La validación final se mantiene en handleEnviar.
        */
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const renderEmailChips = (value: string, emptyText: string) => {
        const emails = parseEmailList(value);

        if (emails.length === 0) {
            return (
                <p className="mt-2 text-xs text-slate-400">
                    {emptyText}
                </p>
            );
        }

        return (
            <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 px-2.5 py-2">
                <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Correos detectados
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {emails.map((email) => {
                        const valid = isValidEmail(email);

                        return (
                            <span
                                key={email}
                                title={email}
                                className={[
                                    "inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                                    valid
                                        ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                                        : "border-rose-200 bg-rose-50 text-rose-700",
                                ].join(" ")}
                            >
                                <span className="max-w-[230px] truncate">
                                    {email}
                                </span>
                            </span>
                        );
                    })}
                </div>
            </div>
        );
    };

    if (!show || !reporte) return null;

    const isPdf = reporte.mimeType === "application/pdf";

    const isDocx =
        reporte.mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    const handleDescargar = () => {
        const urlDescarga = reporte.downloadUrl || reporte.previewUrl;

        if (!urlDescarga) {
            setErrorLocal("No se pudo preparar la descarga del archivo.");
            return;
        }

        const link = document.createElement("a");
        link.href = urlDescarga;
        link.download = reporte.nombreArchivo;
        link.click();
    };

    const handleEnviar = async () => {
        if (documentoModificado) {
            setErrorLocal(
                "Tienes cambios pendientes. Presiona “Aplicar cambios al documento” antes de enviar."
            );
            return;
        }

        const destinatarios = parseEmailList(destinatario);
        const ccList = parseEmailList(cc);

        if (destinatarios.length === 0) {
            setErrorLocal("Debes ingresar al menos un correo destinatario.");
            return;
        }

        const destinatariosInvalidos = validarEmails(destinatarios);

        if (destinatariosInvalidos.length > 0) {
            setErrorLocal(
                `Destinatarios inválidos: ${destinatariosInvalidos.join(", ")}`
            );
            return;
        }

        const ccInvalidos = validarEmails(ccList);

        if (ccInvalidos.length > 0) {
            setErrorLocal(`Correos CC inválidos: ${ccInvalidos.join(", ")}`);
            return;
        }

        if (!asunto.trim()) {
            setErrorLocal("Debes ingresar un asunto.");
            return;
        }

        setErrorLocal(null);

        await onEnviarCorreo({
            destinatarios,
            cc: ccList,
            asunto: asunto.trim(),
            mensaje,
            reporte,
        });
    };

    const previewPdfUrl = reporte.previewUrl
        ? `${reporte.previewUrl}#view=FitH&zoom=page-width`
        : undefined;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 px-3 py-4 sm:px-4 sm:py-6">
            <div className="flex h-[94vh] w-[96vw] max-w-[1500px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
                    <div className="min-w-0">
                        <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
                            {isDocx
                                ? "Enviar informe mensual"
                                : "Vista previa del informe"}
                        </h2>

                        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                            {isDocx
                                ? "El informe se adjuntará como archivo Word (.docx)."
                                : "Revisa el PDF antes de enviarlo por correo."}
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
                <div className="grid min-h-0 flex-1 overflow-hidden md:grid-cols-[minmax(0,1fr)_340px]">
                    {/* Vista previa / Información del archivo */}
                    <div className="min-h-[420px] border-b border-slate-200 bg-slate-100 p-3 md:border-b-0 md:border-r">
                        {reporte.previewUrl ? (
                            <iframe
                                title="Vista previa del informe"
                                src={previewPdfUrl}
                                className="h-full min-h-[74vh] w-full rounded-xl border border-slate-200 bg-white"
                            />
                        ) : (
                            <div className="flex h-full min-h-[74vh] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-8 text-center">
                                {isDocx ? (
                                    <FileWordOutlined className="mb-4 text-5xl text-fuchsia-600" />
                                ) : (
                                    <RobotOutlined className="mb-4 text-5xl text-cyan-600" />
                                )}

                                <h2 className="text-lg font-bold text-slate-800 sm:text-xl">
                                    {reporte.previewUrl ? "Previsualizar y enviar informe mensual" : "Enviar informe mensual"}
                                </h2>

                                <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                                    {reporte.previewUrl
                                        ? "La vista previa se muestra en PDF. El correo enviará el archivo Word original (.docx)."
                                        : "El informe se adjuntará como archivo Word (.docx)."}
                                </p>
                                <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left">
                                    <p className="text-xs font-semibold uppercase text-slate-500">
                                        Archivo generado
                                    </p>

                                    <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                                        {reporte.nombreArchivo}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                        {isDocx
                                            ? "Tipo: Microsoft Word (.docx)"
                                            : `Tipo: ${reporte.mimeType}`}
                                    </p>
                                </div>

                                {reporte.previewUrl && (
                                    <button
                                        type="button"
                                        onClick={handleDescargar}
                                        className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-fuchsia-600 px-4 py-2 text-sm font-semibold text-white hover:bg-fuchsia-700"
                                    >
                                        <DownloadOutlined />
                                        Descargar para revisar
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Formulario de envío */}
                    <div className="space-y-4 overflow-y-auto p-4 sm:p-6">
                        {errorLocal && (
                            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                                {errorLocal}
                            </div>
                        )}

                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">
                                Destinatarios
                            </label>

                            <textarea
                                value={destinatario}
                                rows={2}
                                onChange={(e) => {
                                    setErrorLocal(null);
                                    setDestinatario(e.target.value);
                                }}
                                placeholder="correo1@empresa.cl, correo2@empresa.cl"
                                className="min-h-[46px] w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm leading-5 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                            />

                            <p className="mt-1 text-xs text-slate-500">
                                Puedes ingresar varios correos separados por coma, punto y coma o salto de línea.
                            </p>

                            {renderEmailChips(
                                destinatario,
                                "Aún no hay destinatarios ingresados."
                            )}
                        </div>

                        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
                            <div className="mb-3 flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800">
                                        Contenido adicional del informe
                                    </h3>

                                    <p className="mt-1 text-xs text-slate-500">
                                        Estos textos se incorporarán al archivo Word y a la
                                        vista previa PDF.
                                    </p>
                                </div>

                                {documentoModificado && (
                                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
                                        Cambios sin aplicar
                                    </span>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="mb-1 block text-xs font-semibold text-slate-600">
                                        Conclusión
                                    </label>

                                    <textarea
                                        value={conclusion}
                                        rows={4}
                                        onChange={(event) => {
                                            setConclusion(event.target.value);
                                            setDocumentoModificado(true);
                                            setErrorLocal(null);
                                        }}
                                        placeholder="Agrega una conclusión para el informe..."
                                        className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                                    />
                                </div>

                                <button
                                    type="button"
                                    disabled={
                                        regenerandoDocumento ||
                                        !documentoModificado
                                    }
                                    onClick={async () => {
                                        setErrorLocal(null);

                                        try {
                                            await onRegenerarDocumento({
                                                introduccion: introduccion.trim(),
                                                observaciones: observaciones.trim(),
                                                conclusion: conclusion.trim(),
                                            });

                                            setDocumentoModificado(false);
                                        } catch (error: any) {
                                            setErrorLocal(
                                                error?.message ??
                                                "No fue posible actualizar el documento."
                                            );
                                        }
                                    }}
                                    className="
        inline-flex w-full items-center justify-center gap-2
        rounded-xl bg-indigo-600 px-4 py-2
        text-sm font-semibold text-white
        hover:bg-indigo-700
        disabled:cursor-not-allowed disabled:opacity-50
      "
                                >
                                    <FileWordOutlined />

                                    {regenerandoDocumento
                                        ? "Actualizando documento..."
                                        : "Aplicar cambios al documento"}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-semibold text-slate-700">
                                CC
                            </label>

                            <textarea
                                value={cc}
                                rows={2}
                                onChange={(e) => {
                                    setErrorLocal(null);
                                    setCc(e.target.value);
                                }}
                                placeholder="cc1@empresa.cl, cc2@empresa.cl"
                                className="min-h-[46px] w-full resize-y rounded-xl border border-slate-200 px-3 py-2 text-sm leading-5 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                            />

                            <p className="mt-1 text-xs text-slate-500">
                                Opcional. Puedes ingresar varios correos separados por coma, punto y coma o salto de línea.
                            </p>

                            {renderEmailChips(
                                cc,
                                "Sin correos en copia."
                            )}
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
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 text-xl text-slate-500">
                                    {isPdf ? <FilePdfOutlined /> : <FileWordOutlined />}
                                </div>

                                <div className="min-w-0">
                                    <p className="text-xs font-semibold uppercase text-slate-500">
                                        Archivo adjunto
                                    </p>

                                    <p className="mt-1 break-words text-sm font-medium text-slate-700">
                                        {reporte.nombreArchivo}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                        {isDocx
                                            ? "Se enviará como documento Word."
                                            : "Se enviará como archivo adjunto."}
                                    </p>
                                </div>
                            </div>
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
                        disabled={!reporte.downloadUrl && !reporte.previewUrl}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-200 px-4 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                        <DownloadOutlined />
                        Descargar
                    </button>

                    <button
                        type="button"
                        onClick={handleEnviar}
                        disabled={
                            loading ||
                            regenerandoDocumento ||
                            documentoModificado
                        }
                        className="
    inline-flex w-full items-center justify-center gap-2
    rounded-xl bg-cyan-600 px-4 py-2
    text-sm font-semibold text-white
    hover:bg-cyan-700
    disabled:cursor-not-allowed disabled:opacity-60
    sm:w-auto
  "
                    >
                        <MailOutlined />

                        {loading
                            ? "Enviando..."
                            : regenerandoDocumento
                                ? "Actualizando documento..."
                                : documentoModificado
                                    ? "Aplica los cambios primero"
                                    : "Enviar por correo"}
                    </button>
                </div>
            </div>
        </div>
    );
}