// src/components/modals-proteccion-datos/useAccionesCampaniaProteccionDatos.tsx

import {
    useRef,
    useState,
} from "react";

import axios from "axios";

import {
    Modal,
    message,
} from "antd";

import type {
    MenuProps,
} from "antd";

import {
    Ban,
    CheckCircle2,
    Eye,
    FileCheck2,
    Mail,
    Pencil,
    Users,
} from "lucide-react";

import {
    activarCampaniaProteccionDatos,
    cancelarCampaniaProteccionDatos,
    enviarCampaniaProteccionDatos,
    finalizarCampaniaProteccionDatos,
} from "./proteccion-datos.api";

import type {
    CampaniaProteccionDatos,
} from "./proteccion-datos.types";

import CampaniaFormModal, {
    type ContextoCampaniaFormulario,
} from "./CampaniaFormModal";

import CampaniaDetalleModal from "./CampaniaDetalleModal";

import DestinatariosCampaniaModal from "./DestinatariosCampaniaModal";

/* =========================================================
   TIPOS
   ========================================================= */

type ApiErrorResponse = {
    ok?: boolean;
    error?: string;
    message?: string;
};

type ResultadoAccion = {
    tipo: "success" | "warning";
    texto: string;
};

export type OpcionesAccionesCampania = {
    /**
     * Se ejecuta después de cualquier cambio
     * (crear, editar, activar, enviar, etc.).
     */
    onChanged:
    () => void | Promise<void>;

    /**
     * Contexto fijo para campañas nuevas
     * (por ejemplo, Ley PD).
     */
    contexto?:
    ContextoCampaniaFormulario |
    null;
};

/* =========================================================
   HOOK
   ========================================================= */

/**
 * Acciones y modales reutilizables de campañas de
 * Protección de Datos: menú contextual, transiciones
 * de estado y modales de formulario, detalle y destinatarios.
 *
 * Uso:
 *   const acciones = useAccionesCampaniaProteccionDatos({ onChanged });
 *   ...
 *   {acciones.contextHolder}
 */
export function useAccionesCampaniaProteccionDatos({
    onChanged,
    contexto = null,
}: OpcionesAccionesCampania) {

    const [
        messageApi,
        messageContextHolder,
    ] = message.useMessage();

    const [
        modal,
        modalContextHolder,
    ] = Modal.useModal();

    /*
     * Ref para usar siempre la versión más reciente
     * de onChanged sin recrear las acciones.
     */
    const onChangedRef =
        useRef(onChanged);

    onChangedRef.current =
        onChanged;

    const notificarCambio =
        async () => {
            await onChangedRef.current();
        };

    const [
        selected,
        setSelected,
    ] = useState<CampaniaProteccionDatos | null>(
        null
    );

    const [
        formOpen,
        setFormOpen,
    ] = useState(false);

    const [
        detailOpen,
        setDetailOpen,
    ] = useState(false);

    const [
        destinatariosOpen,
        setDestinatariosOpen,
    ] = useState(false);

    /* =====================================================
       ERRORES
       ===================================================== */

    function obtenerMensajeError(
        error: unknown,
        fallback: string,
    ): string {
        if (
            axios.isAxiosError<ApiErrorResponse>(
                error,
            )
        ) {
            return (
                error.response?.data?.error ??
                error.response?.data?.message ??
                error.message ??
                fallback
            );
        }

        if (
            error instanceof Error &&
            error.message
        ) {
            return error.message;
        }

        return fallback;
    }

    function mostrarError(
        error: unknown,
        fallback: string,
    ) {
        console.error(
            "[ProteccionDatos]",
            error,
        );

        messageApi.error({
            content:
                obtenerMensajeError(
                    error,
                    fallback,
                ),

            duration: 5,
        });
    }

    /* =====================================================
       CONFIRMACIÓN GENÉRICA
       ===================================================== */

    function confirmarAccion(
        opciones: {
            title: string;
            content: string;
            okText: string;
            danger?: boolean;
            errorFallback: string;
            ejecutar: () => Promise<ResultadoAccion>;
        },
    ) {
        modal.confirm({
            title:
                opciones.title,

            content:
                opciones.content,

            okText:
                opciones.okText,

            cancelText:
                "Volver",

            ...(opciones.danger
                ? {
                    okButtonProps: {
                        danger: true,
                    },
                }
                : {}),

            async onOk() {
                try {
                    const resultado =
                        await opciones.ejecutar();

                    if (
                        resultado.tipo ===
                        "warning"
                    ) {
                        messageApi.warning({
                            content:
                                resultado.texto,
                            duration: 5,
                        });
                    } else {
                        messageApi.success({
                            content:
                                resultado.texto,
                            duration: 3,
                        });
                    }

                    await notificarCambio();
                } catch (error) {
                    mostrarError(
                        error,
                        opciones.errorFallback,
                    );

                    /*
                     * Rechazamos para que el modal
                     * de confirmación siga abierto.
                     */
                    return Promise.reject(
                        error,
                    );
                }
            },
        });
    }

    /* =====================================================
       ACCIONES DE ESTADO
       ===================================================== */

    function activar(
        campania: CampaniaProteccionDatos,
    ) {
        confirmarAccion({
            title:
                "Activar campaña",

            content:
                `La campaña tiene ${campania._count?.destinatarios ?? 0} destinatarios. Una vez activada, el documento y la audiencia quedarán bloqueados.`,

            okText:
                "Activar",

            errorFallback:
                "No se pudo activar la campaña",

            ejecutar: async () => {
                await activarCampaniaProteccionDatos(
                    campania.id,
                );

                return {
                    tipo: "success",
                    texto:
                        "Campaña activada correctamente",
                };
            },
        });
    }

    function enviar(
        campania: CampaniaProteccionDatos,
    ) {
        confirmarAccion({
            title:
                "Enviar campaña",

            content:
                `Se enviará un correo personalizado a los destinatarios pendientes de "${campania.nombre}". Cada persona recibirá un enlace único de consentimiento.`,

            okText:
                "Enviar correos",

            errorFallback:
                "No se pudo enviar la campaña",

            ejecutar: async () => {
                const resultado =
                    await enviarCampaniaProteccionDatos(
                        campania.id,
                    );

                return resultado.errores === 0
                    ? {
                        tipo: "success",
                        texto:
                            `${resultado.enviados} correos enviados correctamente`,
                    }
                    : {
                        tipo: "warning",
                        texto:
                            `${resultado.enviados} enviados y ${resultado.errores} con error`,
                    };
            },
        });
    }

    function finalizar(
        campania: CampaniaProteccionDatos,
    ) {
        confirmarAccion({
            title:
                "Finalizar campaña",

            content:
                "La campaña pasará a estado FINALIZADA y no podrá volver a activarse.",

            okText:
                "Finalizar",

            errorFallback:
                "No se pudo finalizar la campaña",

            ejecutar: async () => {
                await finalizarCampaniaProteccionDatos(
                    campania.id,
                );

                return {
                    tipo: "success",
                    texto:
                        "Campaña finalizada correctamente",
                };
            },
        });
    }

    function cancelar(
        campania: CampaniaProteccionDatos,
    ) {
        confirmarAccion({
            title:
                "Cancelar campaña",

            content:
                "La campaña pasará a estado CANCELADA y no podrá continuar.",

            okText:
                "Cancelar campaña",

            danger: true,

            errorFallback:
                "No se pudo cancelar la campaña",

            ejecutar: async () => {
                await cancelarCampaniaProteccionDatos(
                    campania.id,
                );

                return {
                    tipo: "success",
                    texto:
                        "Campaña cancelada correctamente",
                };
            },
        });
    }

    /* =====================================================
       MENÚ
       ===================================================== */

    function menuCampania(
        campania: CampaniaProteccionDatos,
    ): MenuProps["items"] {

        const items: MenuProps["items"] = [
            {
                key: "ver",
                label: "Ver detalle",
                icon: <Eye size={16} />,
            },
            {
                key: "destinatarios",
                label: "Destinatarios",
                icon: <Users size={16} />,
            },
        ];

        if (
            campania.estado ===
            "BORRADOR"
        ) {
            items.push(
                {
                    key: "editar",
                    label: "Editar",
                    icon: <Pencil size={16} />,
                },
                {
                    type: "divider",
                },
                {
                    key: "activar",
                    label: "Activar",
                    icon: <CheckCircle2 size={16} />,
                },
            );
        }

        if (
            campania.estado ===
            "ACTIVA"
        ) {
            items.push(
                {
                    key: "enviar",
                    label: "Enviar campaña",
                    icon: <Mail size={16} />,
                },
                {
                    key: "finalizar",
                    label: "Finalizar",
                    icon: <FileCheck2 size={16} />,
                },
            );
        }

        if (
            campania.estado === "BORRADOR" ||
            campania.estado === "ACTIVA"
        ) {
            items.push(
                {
                    type: "divider",
                },
                {
                    key: "cancelar",
                    danger: true,
                    label: "Cancelar campaña",
                    icon: <Ban size={16} />,
                },
            );
        }

        return items;
    }

    function handleMenuAction(
        key: string,
        campania: CampaniaProteccionDatos,
    ) {
        switch (key) {
            case "ver":
                setSelected(campania);
                setDetailOpen(true);
                return;

            case "destinatarios":
                setSelected(campania);
                setDestinatariosOpen(true);
                return;

            case "editar":
                setSelected(campania);
                setFormOpen(true);
                return;

            case "activar":
                activar(campania);
                return;

            case "enviar":
                enviar(campania);
                return;

            case "finalizar":
                finalizar(campania);
                return;

            case "cancelar":
                cancelar(campania);
                return;

            default:
                return;
        }
    }

    function abrirNueva() {
        setSelected(null);
        setFormOpen(true);
    }

    /* =====================================================
       MODALES
       ===================================================== */

    const contextHolder = (
        <>
            {messageContextHolder}

            {modalContextHolder}

            <CampaniaFormModal
                open={formOpen}
                campania={selected}
                contexto={
                    selected
                        ? null
                        : contexto
                }
                onClose={() => {
                    setFormOpen(false);
                    setSelected(null);
                }}
                onSaved={() => {
                    setFormOpen(false);
                    setSelected(null);
                    void notificarCambio();
                }}
            />

            <CampaniaDetalleModal
                open={detailOpen}
                campania={selected}
                onClose={() => {
                    setDetailOpen(false);
                    setSelected(null);
                }}
            />

            <DestinatariosCampaniaModal
                open={destinatariosOpen}
                campania={selected}
                onClose={() => {
                    setDestinatariosOpen(false);
                    setSelected(null);
                }}
                onChanged={() => {
                    void notificarCambio();
                }}
            />
        </>
    );

    return {
        contextHolder,
        menuCampania,
        handleMenuAction,
        abrirNueva,
        mostrarError,
    };
}