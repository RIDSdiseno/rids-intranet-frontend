import {
    AlertTriangle,
    Info,
    Trash2,
    X,
} from "lucide-react";

type Variante =
    | "danger"
    | "warning"
    | "info";

type Props = {
    open:
    boolean;

    titulo:
    string;

    descripcion:
    string;

    textoConfirmar?:
    string;

    textoCancelar?:
    string;

    variante?:
    Variante;

    loading?:
    boolean;

    onConfirm:
    () => void | Promise<void>;

    onCancel:
    () => void;
};

export default function ConfirmacionFacturacionModal(
    {
        open,
        titulo,
        descripcion,
        textoConfirmar = "Confirmar",
        textoCancelar = "Cancelar",
        variante = "warning",
        loading = false,
        onConfirm,
        onCancel,
    }:
        Props
) {
    if (
        !open
    ) {
        return null;
    }

    const config = {
        danger: {
            iconContainer:
                "bg-rose-50 text-rose-600",

            button:
                "bg-rose-600 hover:bg-rose-700 focus:ring-rose-200",

            icon:
                <Trash2 size={22} />,
        },

        warning: {
            iconContainer:
                "bg-amber-50 text-amber-600",

            button:
                "bg-amber-600 hover:bg-amber-700 focus:ring-amber-200",

            icon:
                <AlertTriangle size={22} />,
        },

        info: {
            iconContainer:
                "bg-cyan-50 text-cyan-600",

            button:
                "bg-cyan-600 hover:bg-cyan-700 focus:ring-cyan-200",

            icon:
                <Info size={22} />,
        },
    }[
        variante
    ];

    return (
        <div
            className="
                fixed
                inset-0
                z-[180]
                flex
                items-center
                justify-center
                bg-slate-950/55
                p-3
                backdrop-blur-sm
                sm:p-5
            "
            role="dialog"
            aria-modal="true"
        >
            <div
                className="
                    w-full
                    max-w-md
                    overflow-hidden
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    shadow-2xl
                "
            >
                <div
                    className="
                        flex
                        items-start
                        gap-4
                        p-5
                        sm:p-6
                    "
                >
                    <div
                        className={`
                            flex
                            h-11
                            w-11
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            ${config.iconContainer}
                        `}
                    >
                        {config.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                        <h3
                            className="
                                text-base
                                font-bold
                                leading-6
                                text-slate-900
                                sm:text-lg
                            "
                        >
                            {titulo}
                        </h3>

                        <p
                            className="
                                mt-2
                                text-sm
                                leading-6
                                text-slate-600
                            "
                        >
                            {descripcion}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onCancel
                        }
                        disabled={
                            loading
                        }
                        aria-label="Cerrar"
                        className="
                            shrink-0
                            rounded-lg
                            p-2
                            text-slate-400
                            transition
                            hover:bg-slate-100
                            hover:text-slate-700
                            disabled:opacity-50
                        "
                    >
                        <X size={18} />
                    </button>
                </div>

                <div
                    className="
                        flex
                        flex-col-reverse
                        gap-2
                        border-t
                        border-slate-200
                        bg-slate-50
                        px-5
                        py-4
                        sm:flex-row
                        sm:justify-end
                    "
                >
                    <button
                        type="button"
                        onClick={
                            onCancel
                        }
                        disabled={
                            loading
                        }
                        className="
                            min-h-11
                            rounded-xl
                            border
                            border-slate-200
                            bg-white
                            px-4
                            py-2.5
                            text-sm
                            font-semibold
                            text-slate-700
                            transition
                            hover:bg-slate-100
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                        "
                    >
                        {textoCancelar}
                    </button>

                    <button
                        type="button"
                        onClick={
                            () => {
                                void onConfirm();
                            }
                        }
                        disabled={
                            loading
                        }
                        className={`
                            min-h-11
                            rounded-xl
                            px-4
                            py-2.5
                            text-sm
                            font-semibold
                            text-white
                            transition
                            focus:outline-none
                            focus:ring-4
                            disabled:cursor-not-allowed
                            disabled:opacity-60
                            ${config.button}
                        `}
                    >
                        {
                            loading
                                ? "Procesando..."
                                : textoConfirmar
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}