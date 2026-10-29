// src/components/modals-proteccion-datos/CampoConsentimientoModal.tsx

import {
    Button,
    Form,
    Input,
    Modal,
    Select,
    Space,
    Switch,
    message,
    Upload,
    Alert
} from "antd";

import {
    DeleteOutlined,
    FilePdfOutlined,
    UploadOutlined,
} from "@ant-design/icons";

import {
    MinusCircleOutlined,
    PlusOutlined,
} from "@ant-design/icons";

import {
    useEffect,
    useState
} from "react";

import {
    subirDocumentoProteccionDatos,
} from "./proteccion-datos.api";

import type {
    CampoConsentimiento,
    DocumentoCampoConsentimiento,
} from "./proteccion-datos.types";

import axios from "axios";

type Props = {
    open: boolean;

    value:
    CampoConsentimiento |
    null;

    onCancel:
    () => void;

    onSave:
    (
        value:
            CampoConsentimiento,
    ) => void;
};

type FormValues = {
    key:
    string;

    tipo:
    CampoConsentimiento["tipo"];

    label:
    string;

    descripcion?:
    string;

    obligatorio:
    boolean;

    placeholder?:
    string;

    opciones?:
    Array<{
        value: string;
        label: string;
    }>;
};

export default function CampoConsentimientoModal({
    open,
    value,
    onCancel,
    onSave,
}: Props) {

    const [
        documentos,
        setDocumentos,
    ] =
        useState<
            DocumentoCampoConsentimiento[]
        >(
            [],
        );

    const [
        uploadingDocumento,
        setUploadingDocumento,
    ] =
        useState(
            false,
        );

    const [
        form,
    ] =
        Form.useForm<
            FormValues
        >();

    const tipo =
        Form.useWatch(
            "tipo",
            form,
        );

    useEffect(
        () => {
            if (
                !open
            ) {
                return;
            }

            form.setFieldsValue({
                key:
                    value?.key ??
                    "",

                tipo:
                    value?.tipo ??
                    "TEXT",

                label:
                    value?.label ??
                    "",

                descripcion:
                    value?.descripcion ??
                    "",

                obligatorio:
                    value?.obligatorio ??
                    false,

                placeholder:
                    value?.placeholder ??
                    "",

                opciones:
                    value?.opciones ??
                    [
                        {
                            value:
                                "SI",

                            label:
                                "Sí, autorizo",
                        },

                        {
                            value:
                                "NO",

                            label:
                                "No autorizo",
                        },
                    ],

            });

            setDocumentos(
                value?.documentos ??
                [],
            );
        },
        [
            open,
            value,
            form,
        ],
    );

    async function guardar() {

        const values =
            await form
                .validateFields();

        if (
            values.tipo ===
            "CHECKBOX" &&
            documentos.some(
                (
                    documento,
                ) =>
                    !documento.titulo
                        .trim(),
            )
        ) {
            message.error(
                "Todos los documentos deben tener un título",
            );

            return;
        }

        onSave({
            key:
                values.key
                    .trim()
                    .toLowerCase(),

            tipo:
                values.tipo,

            label:
                values.label
                    .trim(),

            descripcion:
                values.descripcion
                    ?.trim() ||
                undefined,

            obligatorio:
                Boolean(
                    values.obligatorio,
                ),

            ...(values.tipo ===
                "TEXT"
                ? {
                    placeholder:
                        values.placeholder
                            ?.trim() ||
                        undefined,
                }
                : {}),

            ...(values.tipo ===
                "RADIO"
                ? {
                    opciones:
                        (
                            values.opciones ??
                            []
                        ).map(
                            (
                                opcion,
                            ) => ({
                                value:
                                    opcion.value
                                        .trim(),

                                label:
                                    opcion.label
                                        .trim(),
                            }),
                        ),
                }
                : {}),

            ...(values.tipo ===
                "CHECKBOX" &&
                documentos.length >
                0
                ? {
                    documentos:
                        documentos.map(
                            (
                                documento,
                            ) => ({
                                ...documento,

                                titulo:
                                    documento.titulo
                                        .trim(),
                            }),
                        ),
                }
                : {}),
        });
    }

    async function handleUploadDocumento(
        file:
            File,
    ) {

        if (
            file.type !==
            "application/pdf"
        ) {
            message.error(
                "Solo se permiten archivos PDF",
            );

            return;
        }

        const MAX_SIZE =
            15 *
            1024 *
            1024;

        if (
            file.size >
            MAX_SIZE
        ) {
            message.error(
                "El PDF no puede superar los 15 MB",
            );

            return;
        }

        try {

            setUploadingDocumento(
                true,
            );

            const documento =
                await subirDocumentoProteccionDatos(
                    file,
                );

            setDocumentos(
                (
                    current,
                ) => [
                        ...current,
                        documento,
                    ],
            );

            message.success(
                "Documento cargado correctamente",
            );

        } catch (
        error
        ) {

            if (
                axios.isAxiosError(
                    error,
                )
            ) {
                message.error(
                    error.response
                        ?.data
                        ?.error ??
                    "No se pudo subir el documento",
                );

                return;
            }

            message.error(
                "No se pudo subir el documento",
            );
        } finally {

            setUploadingDocumento(
                false,
            );
        }
    }

    function actualizarTituloDocumento(
        index:
            number,

        titulo:
            string,
    ) {

        setDocumentos(
            (
                current,
            ) =>
                current.map(
                    (
                        documento,
                        currentIndex,
                    ) =>
                        currentIndex ===
                            index
                            ? {
                                ...documento,

                                titulo,
                            }
                            : documento,
                ),
        );
    }

    function quitarDocumento(
        index:
            number,
    ) {

        setDocumentos(
            (
                current,
            ) =>
                current.filter(
                    (
                        _,
                        currentIndex,
                    ) =>
                        currentIndex !==
                        index,
                ),
        );
    }

    return (
        <Modal
            open={
                open
            }
            title={
                value
                    ? "Editar campo"
                    : "Nuevo campo"
            }
            onCancel={
                onCancel
            }
            onOk={() =>
                void guardar()
            }
            okText="Guardar"
            cancelText="Cancelar"
            destroyOnHidden
        >
            <Form
                form={
                    form
                }
                layout="vertical"
            >

                <Form.Item
                    label="Tipo de campo"
                    name="tipo"
                    rules={[
                        {
                            required:
                                true,
                        },
                    ]}
                >
                    <Select
                        options={[
                            {
                                value:
                                    "TEXT",

                                label:
                                    "Texto",
                            },

                            {
                                value:
                                    "CHECKBOX",

                                label:
                                    "Casilla de verificación",
                            },

                            {
                                value:
                                    "RADIO",

                                label:
                                    "Selección única",
                            },
                        ]}
                    />
                </Form.Item>

                <Form.Item
                    label="Identificador"
                    name="key"
                    extra="Ej.: area_cargo, uso_imagen"
                    rules={[
                        {
                            required:
                                true,

                            message:
                                "Ingresa un identificador",
                        },

                        {
                            pattern:
                                /^[a-z0-9_]+$/,

                            message:
                                "Solo letras minúsculas, números y guión bajo",
                        },
                    ]}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    label="Título"
                    name="label"
                    rules={[
                        {
                            required:
                                true,

                            message:
                                "Ingresa el título del campo",
                        },
                    ]}
                >
                    <Input />
                </Form.Item>

                <Form.Item
                    label="Descripción"
                    name="descripcion"
                >
                    <Input.TextArea
                        rows={
                            3
                        }
                    />
                </Form.Item>

                <Form.Item
                    label="Obligatorio"
                    name="obligatorio"
                    valuePropName="checked"
                >
                    <Switch />
                </Form.Item>

                {tipo ===
                    "CHECKBOX" && (
                        <div className="mb-6 rounded-xl border border-slate-200 p-4">

                            <div className="mb-1 font-medium text-slate-800">
                                Documentos asociados
                            </div>

                            <div className="mb-4 text-sm text-slate-500">
                                Puedes adjuntar documentos que el destinatario deberá revisar antes de confirmar esta declaración.
                            </div>

                            {documentos.length >
                                0 && (
                                    <div className="mb-4 space-y-3">

                                        {
                                            documentos.map(
                                                (
                                                    documento,
                                                    index,
                                                ) => (
                                                    <div
                                                        key={
                                                            documento.path
                                                        }
                                                        className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                                                    >

                                                        <div className="mb-3 flex items-start gap-3">

                                                            <FilePdfOutlined
                                                                className="mt-1 text-lg text-red-500"
                                                            />

                                                            <div className="min-w-0 flex-1">

                                                                <div className="truncate text-sm font-medium text-slate-800">
                                                                    {
                                                                        documento.nombre
                                                                    }
                                                                </div>

                                                                <div className="mt-1 text-xs text-slate-500">
                                                                    {
                                                                        (
                                                                            documento.size /
                                                                            1024
                                                                        ).toFixed(
                                                                            1,
                                                                        )
                                                                    } KB
                                                                </div>

                                                            </div>

                                                            <Button
                                                                danger
                                                                type="text"
                                                                icon={
                                                                    <DeleteOutlined />
                                                                }
                                                                onClick={() =>
                                                                    quitarDocumento(
                                                                        index,
                                                                    )
                                                                }
                                                            />

                                                        </div>

                                                        <div>
                                                            <label className="mb-1 block text-xs font-medium text-slate-600">
                                                                Título visible
                                                            </label>

                                                            <Input
                                                                value={
                                                                    documento.titulo
                                                                }
                                                                onChange={(
                                                                    event,
                                                                ) =>
                                                                    actualizarTituloDocumento(
                                                                        index,
                                                                        event.target.value,
                                                                    )
                                                                }
                                                                placeholder="Ej.: Política de tratamiento de datos personales"
                                                            />
                                                        </div>

                                                    </div>
                                                ),
                                            )
                                        }

                                    </div>
                                )}

                            <Upload
                                accept="application/pdf,.pdf"
                                multiple={false}
                                showUploadList={false}
                                beforeUpload={(
                                    file,
                                ) => {

                                    void handleUploadDocumento(
                                        file,
                                    );

                                    return false;
                                }}
                            >
                                <Button
                                    type="dashed"
                                    block
                                    loading={
                                        uploadingDocumento
                                    }
                                    icon={
                                        <UploadOutlined />
                                    }
                                >
                                    Subir documento PDF
                                </Button>
                            </Upload>

                            <Alert
                                className="mt-3"
                                type="info"
                                showIcon
                                message="Formato permitido: PDF"
                                description="Tamaño máximo por archivo: 15 MB."
                            />

                        </div>
                    )}

                {tipo ===
                    "TEXT" && (
                        <Form.Item
                            label="Placeholder"
                            name="placeholder"
                        >
                            <Input
                                placeholder="Ej.: Administración y finanzas"
                            />
                        </Form.Item>
                    )}

                {tipo ===
                    "RADIO" && (
                        <Form.List
                            name="opciones"
                        >
                            {(
                                fields,
                                {
                                    add,
                                    remove,
                                },
                            ) => (
                                <>
                                    <div className="mb-2 font-medium">
                                        Opciones
                                    </div>

                                    {fields.map(
                                        (
                                            field,
                                        ) => (
                                            <Space
                                                key={
                                                    field.key
                                                }
                                                align="baseline"
                                                className="mb-2 flex"
                                            >

                                                <Form.Item
                                                    {...field}
                                                    name={[
                                                        field.name,
                                                        "value",
                                                    ]}
                                                    rules={[
                                                        {
                                                            required:
                                                                true,

                                                            message:
                                                                "Valor requerido",
                                                        },
                                                    ]}
                                                >
                                                    <Input
                                                        placeholder="SI"
                                                    />
                                                </Form.Item>

                                                <Form.Item
                                                    {...field}
                                                    name={[
                                                        field.name,
                                                        "label",
                                                    ]}
                                                    rules={[
                                                        {
                                                            required:
                                                                true,

                                                            message:
                                                                "Etiqueta requerida",
                                                        },
                                                    ]}
                                                >
                                                    <Input
                                                        placeholder="Sí, autorizo"
                                                    />
                                                </Form.Item>

                                                <MinusCircleOutlined
                                                    onClick={() =>
                                                        remove(
                                                            field.name,
                                                        )
                                                    }
                                                />

                                            </Space>
                                        ),
                                    )}

                                    <Button
                                        type="dashed"
                                        block
                                        icon={
                                            <PlusOutlined />
                                        }
                                        onClick={() =>
                                            add({
                                                value:
                                                    "",

                                                label:
                                                    "",
                                            })
                                        }
                                    >
                                        Agregar opción
                                    </Button>

                                </>
                            )}
                        </Form.List>
                    )}

            </Form>
        </Modal>
    );
}