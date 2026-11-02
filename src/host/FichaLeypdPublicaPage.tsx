// src/host/FichaLeypdPublicaPage.tsx

import {
    Alert,
} from "antd";

import {
    useParams,
} from "react-router-dom";

import FichaLeypdPublica from "../components/modals-leypd/FichaLeypdPublica";

export default function FichaLeypdPublicaPage() {
    const {
        token,
    } =
        useParams<{
            token:
            string;
        }>();

    return (
        <div
            className="
                min-h-screen
                bg-slate-50
                px-3
                py-6
                sm:px-5
                md:py-10
            "
        >
            <div
                className="
                    mx-auto
                    w-full
                    max-w-5xl
                "
            >
                {/* =====================================================
                    MARCA
                ===================================================== */}

                <div
                    className="
                        mb-6
                        flex
                        items-center
                        justify-center
                    "
                >
                    <div className="text-center">
                        <div
                            className="
                                text-lg
                                font-bold
                                tracking-[0.25em]
                                text-slate-800
                            "
                        >
                            RIDS
                        </div>

                        <div
                            className="
                                mt-1
                                text-xs
                                text-slate-500
                            "
                        >
                            Gestión de cumplimiento y protección de datos
                        </div>
                    </div>
                </div>

                {/* =====================================================
                    TOKEN
                ===================================================== */}

                {!token ? (
                    <Alert
                        type="error"
                        showIcon
                        message="Enlace inválido"
                        description="No se encontró un token válido para acceder a la ficha."
                    />
                ) : (
                    <FichaLeypdPublica
                        token={
                            token
                        }
                    />
                )}

                {/* =====================================================
                    FOOTER
                ===================================================== */}

                <div
                    className="
                        mt-8
                        text-center
                        text-xs
                        text-slate-400
                    "
                >
                    RIDS · Información proporcionada exclusivamente para el proceso de levantamiento y cumplimiento.
                </div>
            </div>
        </div>
    );
}