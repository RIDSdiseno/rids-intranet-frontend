// src/components/modals-leypd/LeypdVincularSharepointModal.tsx

import {
    Input,
    Modal,
    message,
} from "antd";

import {
    useEffect,
    useState,
} from "react";

import {
    vincularLeypdSharepoint,
} from "./leypd.api";

import {
    obtenerMensajeApiLeypd,
} from "./leypd.helpers";

import type {
    LeypdSharepointResponse,
} from "./leypd.types";

interface Props {
    open: boolean;

    empresaId:
    number | null;

    empresaNombre?:
    string | null;

    /**
     * true si la empresa ya tiene una carpeta vinculada.
     */
    reemplazar?: boolean;

    onClose:
    () => void;

    onVinculado:
    (data: LeypdSharepointResponse) => void | Promise<void>;
}

/**
 * Modal para vincular (o cambiar) la carpeta LEYPD
 * de una empresa en SharePoint.
 *
 * Usado desde el panel del drawer y desde la tabla de empresas.
 */
export default function LeypdVincularSharepointModal({
    open,
    empresaId,
    empresaNombre = null,
    reemplazar = false,
    onClose,
    onVinculado,
}: Props) {
    const [
        url,
        setUrl,
    ] = useState("");

    const [
        vinculando,
        setVinculando,
    ] = useState(false);

    /*
     * Cada apertura parte limpia.
     */
    useEffect(
        () => {
            if (open) {
                setUrl("");
            }
        },
        [open]
    );

    const handleVincular =
        async () => {
            const limpio =
                url.trim();

            if (!empresaId) {
                return;
            }

            if (!limpio) {
                message.warning(
                    "Pega la URL de la carpeta LEYPD del cliente."
                );

                return;
            }

            setVinculando(true);

            try {
                const result =
                    await vincularLeypdSharepoint(
                        empresaId,
                        limpio
                    );

                message.success(
                    "Carpeta vinculada y sincronizada correctamente."
                );

                await onVinculado(result);

                onClose();
            } catch (err) {
                console.error(
                    "[LEYPD] Error vinculando SharePoint:",
                    err
                );

                message.error(
                    obtenerMensajeApiLeypd(
                        err,
                        "No se pudo vincular la carpeta."
                    )
                );
            } finally {
                setVinculando(false);
            }
        };

    return (
        <Modal
            open={open}
            title={
                reemplazar
                    ? "Cambiar carpeta LEYPD"
                    : "Vincular carpeta LEYPD"
            }
            okText="Vincular"
            cancelText="Cancelar"
            confirmLoading={vinculando}
            onOk={() =>
                void handleVincular()
            }
            onCancel={onClose}
            destroyOnHidden
        >
            {empresaNombre && (
                <p className="mb-2 text-sm font-semibold text-slate-700">
                    {empresaNombre}
                </p>
            )}

            <p className="text-sm text-slate-600">
                En SharePoint, abre la carpeta{" "}
                <strong>LEYPD</strong> del cliente
                (por ejemplo{" "}
                <em>
                    General › CLIENTES › 2026 › CLIENTES SOPORTE MENSUAL › ALIANZ › LEYPD
                </em>
                ) y copia la URL completa del navegador.
            </p>

            {reemplazar && (
                <p className="text-xs text-amber-600">
                    La carpeta actual se reemplazará y se volverá a sincronizar.
                </p>
            )}

            <Input.TextArea
                rows={4}
                value={url}
                placeholder="https://ridscl.sharepoint.com/sites/..."
                onChange={(event) =>
                    setUrl(
                        event.target.value
                    )
                }
            />
        </Modal>
    );
}