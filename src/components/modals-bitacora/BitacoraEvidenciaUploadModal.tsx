// src/components/modals-bitacora/BitacoraEvidenciaUploadModal.tsx

import {
    UploadOutlined,
} from "@ant-design/icons";

import {
    Button,
    Input,
    Modal,
    Upload,
} from "antd";

import type {
    UploadFile,
} from "antd/es/upload/interface";

import {
    LABEL_BASE,
} from "./bitacora.constants";

import type {
    EtapaEvidenciaBitacora,
} from "./bitacora.types";

type Props = {
    open:
    boolean;

    etapa:
    EtapaEvidenciaBitacora |
    null;

    saving:
    boolean;

    archivos:
    File[];

    fileList:
    UploadFile[];

    descripcion:
    string;

    onArchivosChange:
    (
        files:
            File[]
    ) => void;

    onFileListChange:
    (
        files:
            UploadFile[]
    ) => void;

    onDescripcionChange:
    (
        value:
            string
    ) => void;

    onSave:
    () => void;

    onClose:
    () => void;

    onMessage:
    (
        type:
            "success" |
            "error" |
            "warning" |
            "info",
        text:
            string
    ) => void;
};

function getEtapaLabel(
    etapa:
        EtapaEvidenciaBitacora |
        null
) {
    switch (etapa) {
        case "ANTES":
            return "Antes";

        case "EN_PROCESO":
            return "En proceso";

        case "DESPUES":
            return "Después";

        default:
            return "-";
    }
}

export default function BitacoraEvidenciaUploadModal({
    open,
    etapa,
    saving,
    archivos,
    fileList,
    descripcion,
    onArchivosChange,
    onFileListChange,
    onDescripcionChange,
    onSave,
    onClose,
    onMessage,
}: Props) {
    return (
        <Modal
            open={
                open
            }
            onCancel={
                onClose
            }
            footer={
                null
            }
            width={
                620
            }
            centered
            destroyOnClose
            maskClosable={
                !saving
            }
            closable={
                !saving
            }
            title={
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                        Agregar
                        evidencia
                    </h2>

                    <p className="mt-1 text-sm font-normal text-slate-500">
                        Etapa:{" "}
                        {getEtapaLabel(
                            etapa
                        )}
                    </p>
                </div>
            }
        >
            <div className="mt-4 space-y-5">
                <div>
                    <label
                        className={
                            LABEL_BASE
                        }
                    >
                        Imagen o video
                    </label>

                    <Upload.Dragger
                        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                        maxCount={
                            10
                        }
                        multiple
                        fileList={
                            fileList
                        }
                        beforeUpload={(
                            file
                        ) => {
                            const imagen =
                                file.type.startsWith(
                                    "image/"
                                );

                            const video =
                                file.type.startsWith(
                                    "video/"
                                );

                            if (
                                !imagen &&
                                !video
                            ) {
                                onMessage(
                                    "warning",
                                    "Solo se permiten imágenes y videos."
                                );

                                return Upload.LIST_IGNORE;
                            }

                            const maxBytes =
                                imagen
                                    ? 15 *
                                    1024 *
                                    1024
                                    : 150 *
                                    1024 *
                                    1024;

                            if (
                                file.size >
                                maxBytes
                            ) {
                                onMessage(
                                    "warning",
                                    imagen
                                        ? "La imagen no puede superar los 15 MB."
                                        : "El video no puede superar los 150 MB."
                                );

                                return Upload.LIST_IGNORE;
                            }

                            return false;
                        }}
                        onChange={(
                            info
                        ) => {
                            const nuevaLista =
                                info.fileList.slice(
                                    0,
                                    10
                                );

                            onFileListChange(
                                nuevaLista
                            );

                            const nuevosArchivos =
                                nuevaLista
                                    .map(
                                        item =>
                                            item.originFileObj
                                    )
                                    .filter(
                                        (
                                            file
                                        ): file is NonNullable<
                                            typeof file
                                        > =>
                                            Boolean(
                                                file
                                            )
                                    )
                                    .map(
                                        file =>
                                            file as File
                                    );

                            onArchivosChange(
                                nuevosArchivos
                            );
                        }}
                        onRemove={(
                            file
                        ) => {
                            const nuevaLista =
                                fileList.filter(
                                    item =>
                                        item.uid !==
                                        file.uid
                                );

                            onFileListChange(
                                nuevaLista
                            );

                            const nuevosArchivos =
                                nuevaLista
                                    .map(
                                        item =>
                                            item.originFileObj
                                    )
                                    .filter(
                                        (
                                            archivo
                                        ): archivo is NonNullable<
                                            typeof archivo
                                        > =>
                                            Boolean(
                                                archivo
                                            )
                                    )
                                    .map(
                                        archivo =>
                                            archivo as File
                                    );

                            onArchivosChange(
                                nuevosArchivos
                            );

                            return true;
                        }}
                    >
                        <p className="ant-upload-drag-icon">
                            <UploadOutlined />
                        </p>

                        <p className="ant-upload-text">
                            Selecciona o arrastra
                            hasta 10 imágenes o videos
                        </p>

                        <p className="ant-upload-hint">
                            JPG, PNG, WEBP, MP4,
                            WEBM o MOV. Máximo 10 archivos.
                        </p>
                    </Upload.Dragger>
                </div>

                <div>
                    <label
                        className={
                            LABEL_BASE
                        }
                    >
                        Descripción
                    </label>

                    <Input.TextArea
                        value={
                            descripcion
                        }
                        onChange={(
                            event
                        ) =>
                            onDescripcionChange(
                                event
                                    .target
                                    .value
                            )
                        }
                        rows={
                            4
                        }
                        maxLength={
                            500
                        }
                        placeholder="Ej: Estado inicial antes de comenzar el trabajo."
                    />

                    <div className="mt-1 text-right text-xs text-slate-400">
                        {
                            descripcion.length
                        }{" "}
                        / 500
                    </div>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-700">
                    La evidencia
                    quedará asociada
                    automáticamente a{" "}
                    <strong>
                        {getEtapaLabel(
                            etapa
                        )}
                    </strong>
                    .
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                        onClick={
                            onClose
                        }
                        disabled={
                            saving
                        }
                    >
                        Cancelar
                    </Button>

                    <Button
                        type="primary"
                        icon={
                            <UploadOutlined />
                        }
                        loading={
                            saving
                        }
                        disabled={
                            archivos.length ===
                            0 ||
                            !etapa ||
                            saving
                        }
                        onClick={
                            onSave
                        }
                    >
                        Agregar Evidencias
                    </Button>
                </div>
            </div>
        </Modal>
    );
}