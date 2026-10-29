// src/components/modals-proteccion-datos/CampaniaFormModal.tsx
import {
    useEffect,
    useState,
} from "react";

import axios from "axios";

import {
    Alert,
    Button,
    Checkbox,
    Form,
    Input,
    Modal,
    Switch,
    Tabs,
    message,
} from "antd";

import {
    actualizarCampaniaProteccionDatos,
    crearCampaniaProteccionDatos,
} from "./proteccion-datos.api";

import type {
    CampaniaProteccionDatos,
    ConfiguracionConsentimiento,
} from "./proteccion-datos.types";

import FormularioConsentimientoBuilder
    from "./FormularioConsentimientoBuilder";

import CorreoCampaniaEditor
    from "./CorreoCampaniaEditor";

import DocumentoCampaniaEditor
    from "./DocumentoCampaniaEditor";

const CONFIGURACION_DEFAULT:
    ConfiguracionConsentimiento = {

    schemaVersion:
        2,

    tituloFormulario:
        "Lectura y aceptación de la Política de datos personales",

    descripcionFormulario:
        "Tu respuesta quedará registrada junto con la fecha y hora.",

    textoBoton:
        "Firmar y enviar",

    campos: [
        {
            key:
                "area_cargo",

            tipo:
                "TEXT",

            label:
                "Área o cargo",

            descripcion:
                "",

            obligatorio:
                true,

            placeholder:
                "Ej.: Administración y finanzas",
        },

        {
            key:
                "lectura_politica",

            tipo:
                "CHECKBOX",

            label:
                "Lectura de la política",

            descripcion:
                "Declaro haber recibido, leído y comprendido la política.",

            obligatorio:
                true,
        },

        {
            key:
                "compromiso_cumplimiento",

            tipo:
                "CHECKBOX",

            label:
                "Compromiso de cumplimiento",

            descripcion:
                "Me comprometo a cumplir las obligaciones de seguridad y confidencialidad.",

            obligatorio:
                true,
        },

        {
            key:
                "uso_imagen",

            tipo:
                "RADIO",

            label:
                "Uso de mi imagen en comunicaciones y redes sociales",

            descripcion:
                "Es voluntario y puede revocarse posteriormente.",

            obligatorio:
                false,

            opciones: [
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
        },

        {
            key:
                "contacto_posterior",

            tipo:
                "RADIO",

            label:
                "Contacto después del término de mi relación",

            descripcion:
                "Autorización opcional para contacto posterior.",

            obligatorio:
                false,

            opciones: [
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
        },
    ],
};

const {
    TextArea,
} =
    Input;

type Props = {
    open: boolean;

    campania:
    CampaniaProteccionDatos |
    null;

    onClose:
    () => void;

    onSaved:
    () => void;
};

type FormValues = {
    nombre:
    string;

    descripcion?:
    string;

    tituloDocumento:
    string;

    versionDocumento:
    string;

    contenidoHtml:
    string;

    asuntoCorreo:
    string;

    cuerpoCorreoHtml:
    string;
};

export default function CampaniaFormModal({
    open,
    campania,
    onClose,
    onSaved,
}: Props) {

    const [
        configuracion,
        setConfiguracion,
    ] =
        useState<
            ConfiguracionConsentimiento
        >(
            CONFIGURACION_DEFAULT,
        );

    const [
        form,
    ] =
        Form.useForm<
            FormValues
        >();

    const cuerpoCorreoHtml =
        Form.useWatch(
            "cuerpoCorreoHtml",
            form,
        ) ??
        "";

    const [
        saving,
        setSaving,
    ] =
        useState(
            false,
        );

    const isEdit =
        Boolean(
            campania,
        );

    const editable =
        !campania ||
        campania.estado ===
        "BORRADOR";

    useEffect(
        () => {

            if (
                !open
            ) {
                return;
            }

            form.setFieldsValue({
                nombre:
                    campania
                        ?.nombre ??
                    "",

                descripcion:
                    campania
                        ?.descripcion ??
                    "",

                tituloDocumento:
                    campania
                        ?.tituloDocumento ??
                    "Información sobre tratamiento de datos personales",

                versionDocumento:
                    campania
                        ?.versionDocumento ??
                    "1.0",

                contenidoHtml:
                    campania
                        ?.contenidoHtml ??
                    `
        <h2>
            Tratamiento de datos personales
        </h2>

        <p>
            Ingrese aquí la información que será presentada
            al destinatario.
        </p>
    `,

                asuntoCorreo:
                    campania
                        ?.asuntoCorreo ??
                    "Información sobre tratamiento de datos personales",

                cuerpoCorreoHtml:
                    campania
                        ?.cuerpoCorreoHtml ??
                    `
        <p>
            Estimado/a {{NOMBRE}},
        </p>

        <p>
            Te invitamos a revisar la información relacionada
            con el tratamiento de datos personales.
        </p>

        <p>
            Para revisar la documentación y registrar tu respuesta,
            utiliza el siguiente acceso:
        </p>

        <p>
            <a href="{{LINK_CONSENTIMIENTO}}">
                Revisar información y responder
            </a>
        </p>

        <p>
            Saludos cordiales.
        </p>
    `,
            });

            setConfiguracion(
                campania
                    ?.configuracionConsentimiento ??
                CONFIGURACION_DEFAULT,
            );

        },
        [
            open,
            campania,
            form,
        ],
    );

    async function handleSubmit() {

        try {

            const values =
                await form
                    .validateFields();

            if (
                !configuracion
                    .tituloFormulario
                    .trim()
            ) {
                message.error(
                    "El título del formulario es obligatorio",
                );

                return;
            }

            if (
                !configuracion
                    .textoBoton
                    .trim()
            ) {
                message.error(
                    "El texto del botón es obligatorio",
                );

                return;
            }

            if (
                configuracion
                    .campos
                    .length ===
                0
            ) {
                message.error(
                    "Debes agregar al menos un campo al formulario",
                );

                return;
            }

            setSaving(
                true,
            );

            if (
                campania
            ) {

                await actualizarCampaniaProteccionDatos(
                    campania.id,
                    {
                        nombre:
                            values.nombre,

                        descripcion:
                            values.descripcion
                                ?.trim() ||
                            null,

                        tituloDocumento:
                            values.tituloDocumento,

                        versionDocumento:
                            values.versionDocumento,

                        contenidoHtml:
                            values.contenidoHtml,

                        configuracionConsentimiento:
                            configuracion,

                        asuntoCorreo:
                            values.asuntoCorreo,

                        cuerpoCorreoHtml:
                            values.cuerpoCorreoHtml,
                    },
                );

                message.success(
                    "Campaña actualizada correctamente",
                );

            } else {

                await crearCampaniaProteccionDatos({
                    nombre:
                        values.nombre,

                    descripcion:
                        values.descripcion
                            ?.trim() ||
                        null,

                    tituloDocumento:
                        values.tituloDocumento,

                    versionDocumento:
                        values.versionDocumento,

                    contenidoHtml:
                        values.contenidoHtml,

                    configuracionConsentimiento:
                        configuracion,

                    asuntoCorreo:
                        values.asuntoCorreo,

                    cuerpoCorreoHtml:
                        values.cuerpoCorreoHtml,
                });

                message.success(
                    "Campaña creada correctamente",
                );
            }

            form.resetFields();

            setConfiguracion(
                CONFIGURACION_DEFAULT,
            );

            onSaved();

        } catch (
        error
        ) {

            if (
                axios.isAxiosError(
                    error,
                )
            ) {

                const backendMessage =
                    error.response
                        ?.data
                        ?.error ??
                    error.response
                        ?.data
                        ?.message ??
                    "No se pudo guardar la campaña";

                message.error(
                    backendMessage,
                );

                return;
            }

            if (
                typeof error ===
                "object" &&
                error &&
                "errorFields" in
                error
            ) {
                return;
            }

            message.error(
                "No se pudo guardar la campaña",
            );

        } finally {

            setSaving(
                false,
            );
        }
    }

    return (
        <Modal
            open={
                open
            }
            onCancel={
                onClose
            }
            width={
                920
            }
            destroyOnHidden
            title={
                campania
                    ? "Editar campaña"
                    : "Nueva campaña de protección de datos"
            }
            footer={[
                <Button
                    key="cancel"
                    onClick={
                        onClose
                    }
                >
                    Cancelar
                </Button>,

                <Button
                    key="save"
                    type="primary"
                    loading={
                        saving
                    }
                    disabled={
                        !editable
                    }
                    onClick={
                        handleSubmit
                    }
                >
                    {
                        campania
                            ? "Guardar cambios"
                            : "Crear campaña"
                    }
                </Button>,
            ]}
        >

            {!editable && (
                <Alert
                    className="mb-4"
                    type="info"
                    showIcon
                    message="La campaña ya no está en borrador"
                    description="El documento y la configuración legal ya no pueden modificarse."
                />
            )}

            <Form
                form={
                    form
                }
                layout="vertical"
                disabled={
                    !editable
                }
            >

                <Tabs
                    items={[
                        {
                            key:
                                "general",

                            label:
                                "General",

                            children:
                                <div className="grid grid-cols-1 gap-x-4 md:grid-cols-2">

                                    <Form.Item
                                        className="md:col-span-2"
                                        label="Nombre de la campaña"
                                        name="nombre"
                                        rules={[
                                            {
                                                required:
                                                    true,

                                                message:
                                                    "Ingresa el nombre de la campaña",
                                            },
                                        ]}
                                    >
                                        <Input
                                            placeholder="Ej. Protección de Datos Clientes 2026"
                                        />
                                    </Form.Item>

                                    <Form.Item
                                        className="md:col-span-2"
                                        label="Descripción"
                                        name="descripcion"
                                    >
                                        <TextArea
                                            rows={
                                                3
                                            }
                                        />
                                    </Form.Item>

                                    <Form.Item
                                        label="Título del documento"
                                        name="tituloDocumento"
                                        rules={[
                                            {
                                                required:
                                                    true,
                                            },
                                        ]}
                                    >
                                        <Input />
                                    </Form.Item>

                                    <Form.Item
                                        label="Versión"
                                        name="versionDocumento"
                                        rules={[
                                            {
                                                required:
                                                    true,
                                            },
                                        ]}
                                    >
                                        <Input />
                                    </Form.Item>

                                </div>,
                        },

                        {
                            key:
                                "documento",

                            label:
                                "Documento",

                            forceRender:
                                true,

                            children:
                                (
                                    <div>

                                        <Form.Item
                                            label="Contenido del documento"
                                            name="contenidoHtml"
                                            rules={[
                                                {
                                                    required:
                                                        true,

                                                    message:
                                                        "Ingresa el contenido del documento",
                                                },
                                            ]}
                                        >
                                            <DocumentoCampaniaEditor
                                                disabled={
                                                    !editable
                                                }
                                            />
                                        </Form.Item>

                                    </div>
                                ),
                        },

                        {
                            key:
                                "formulario",

                            label:
                                "Formulario",

                            children:
                                (
                                    <FormularioConsentimientoBuilder
                                        value={
                                            configuracion
                                        }
                                        onChange={
                                            setConfiguracion
                                        }
                                        disabled={
                                            !editable
                                        }
                                    />
                                ),
                        },

                        {
                            key:
                                "correo",

                            label:
                                "Correo",

                            forceRender:
                                true,

                            children:
                                (
                                    <div className="space-y-4">

                                        {/* =========================================
                    ASUNTO
                    ========================================= */}

                                        <Form.Item
                                            label="Asunto del correo"
                                            name="asuntoCorreo"
                                            rules={[
                                                {
                                                    required:
                                                        true,

                                                    message:
                                                        "Ingresa el asunto del correo",
                                                },
                                            ]}
                                        >
                                            <Input
                                                placeholder="Ej.: Información sobre tratamiento de datos personales"
                                            />
                                        </Form.Item>

                                        {/* =========================================
                    CONTENIDO
                    ========================================= */}

                                        <Form.Item
                                            label="Mensaje"
                                            name="cuerpoCorreoHtml"
                                            rules={[
                                                {
                                                    required:
                                                        true,

                                                    message:
                                                        "Ingresa el contenido del correo",
                                                },
                                            ]}
                                        >
                                            <CorreoCampaniaEditor
                                                disabled={
                                                    !editable
                                                }
                                            />
                                        </Form.Item>

                                    </div>
                                ),
                        }
                    ]}
                />

            </Form>

        </Modal>
    );
}