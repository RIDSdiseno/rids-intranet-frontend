import {
    Download,
    ExternalLink,
    FileText,
    X,
} from "lucide-react";

type Props = {
    open: boolean;
    url: string | null;
    nombre: string | null;
    onClose: () => void;
};

export default function ContratoPdfModal({
    open,
    url,
    nombre,
    onClose,
}: Props) {
    if (
        !open ||
        !url
    ) {
        return null;
    }

    return (
        <div
            className="
                fixed
                inset-0
                z-[110]
                flex
                items-end
                justify-center
                bg-black/60
                p-0
                sm:items-center
                sm:p-4
            "
            role="dialog"
            aria-modal="true"
            aria-labelledby="contrato-pdf-title"
        >
            <div
                className="
                    flex
                    h-[100dvh]
                    w-full
                    flex-col
                    overflow-hidden
                    border
                    border-slate-200
                    bg-white
                    shadow-2xl
                    sm:h-[94vh]
                    sm:max-w-7xl
                    sm:rounded-2xl
                "
            >
                <div
                    className="
                        flex
                        shrink-0
                        items-center
                        justify-between
                        gap-2
                        border-b
                        border-slate-200
                        bg-white
                        px-3
                        py-3
                        sm:px-5
                        sm:py-3.5
                    "
                >
                    <div className="flex min-w-0 items-center gap-3">
                        <div
                            className="
                                hidden
                                h-10
                                w-10
                                shrink-0
                                items-center
                                justify-center
                                rounded-xl
                                bg-slate-100
                                text-slate-600
                                sm:flex
                            "
                        >
                            <FileText size={20} />
                        </div>

                        <div className="min-w-0">
                            <h3
                                id="contrato-pdf-title"
                                className="text-sm font-semibold text-slate-900 sm:text-base"
                            >
                                Contrato
                            </h3>

                            <p
                                className="mt-0.5 max-w-[45vw] truncate text-xs text-slate-500 sm:max-w-none sm:text-sm"
                                title={
                                    nombre ??
                                    "Documento PDF"
                                }
                            >
                                {
                                    nombre ??
                                    "Documento PDF"
                                }
                            </p>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                        <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="
                                inline-flex
                                h-9
                                w-9
                                items-center
                                justify-center
                                rounded-lg
                                border
                                border-slate-300
                                bg-white
                                text-slate-600
                                transition
                                hover:bg-slate-50
                                hover:text-slate-900
                            "
                            title="Abrir en nueva pestaña"
                            aria-label="Abrir contrato en nueva pestaña"
                        >
                            <ExternalLink size={18} />
                        </a>

                        <a
                            href={url}
                            download={
                                nombre ??
                                "contrato.pdf"
                            }
                            className="
                                inline-flex
                                h-9
                                w-9
                                items-center
                                justify-center
                                rounded-lg
                                border
                                border-slate-300
                                bg-white
                                text-slate-600
                                transition
                                hover:bg-slate-50
                                hover:text-slate-900
                            "
                            title="Descargar contrato"
                            aria-label="Descargar contrato"
                        >
                            <Download size={18} />
                        </a>

                        <button
                            type="button"
                            onClick={onClose}
                            className="
                                inline-flex
                                h-9
                                w-9
                                items-center
                                justify-center
                                rounded-lg
                                text-slate-500
                                transition
                                hover:bg-slate-100
                                hover:text-slate-900
                            "
                            title="Cerrar"
                            aria-label="Cerrar visor"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="min-h-0 flex-1 bg-slate-100">
                    <iframe
                        src={url}
                        title={
                            nombre ??
                            "Contrato"
                        }
                        className="h-full w-full border-0"
                    />
                </div>
            </div>
        </div>
    );
}
