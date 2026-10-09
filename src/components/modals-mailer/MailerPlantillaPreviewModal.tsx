// src/components/modals-mailer/MailerPlantillaPreviewModal.tsx

import type {
    PlantillaCorreoDetalle,
} from "./mailer.types";

type Props = {
    open: boolean;

    plantilla:
    PlantillaCorreoDetalle |
    null;

    onClose:
    () => void;
};

export default function MailerPlantillaPreviewModal({
    open,
    plantilla,
    onClose,
}: Props) {

    if (
        !open ||
        !plantilla
    ) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4">

            <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">

                    <div>

                        <h3 className="font-black text-slate-900">
                            {plantilla.nombre}
                        </h3>

                        <p className="text-xs text-slate-400">
                            {plantilla.tipo}
                            {plantilla.nombreArchivo
                                ? ` · ${plantilla.nombreArchivo}`
                                : ""}
                        </p>

                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50"
                    >
                        Cerrar
                    </button>

                </div>


                <div className="flex-1 overflow-auto bg-slate-100 p-8">

                    {plantilla.tipo ===
                        "IMAGEN" ? (

                        plantilla.previewUrl
                            ? (
                                <img
                                    src={
                                        plantilla.previewUrl
                                    }
                                    alt={
                                        plantilla.nombre
                                    }
                                    className="mx-auto block h-auto max-w-full rounded-xl bg-white shadow-sm"
                                />
                            )
                            : (
                                <p className="py-16 text-center text-sm text-slate-400">
                                    No existe vista previa disponible.
                                </p>
                            )

                    ) : plantilla.htmlProcesado ? (

                        <div className="mx-auto max-w-[700px] rounded-xl bg-white p-4 shadow-sm">

                            <div
                                dangerouslySetInnerHTML={{
                                    __html:
                                        plantilla.htmlProcesado,
                                }}
                            />

                        </div>

                    ) : (

                        <p className="py-16 text-center text-sm text-slate-400">
                            La plantilla no posee contenido previsualizable.
                        </p>

                    )}

                </div>

            </div>

        </div>
    );
}