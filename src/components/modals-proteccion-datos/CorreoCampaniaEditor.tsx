// src/components/modals-proteccion-datos/CorreoCampaniaEditor.tsx

import {
    BoldOutlined,
    EyeOutlined,
    ItalicOutlined,
    LinkOutlined,
    UnorderedListOutlined,
} from "@ant-design/icons";

import {
    Alert,
    Button,
    Input,
    Modal,
    Space,
    Tag,
} from "antd";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    EditorContent,
    useEditor,
} from "@tiptap/react";

import StarterKit
    from "@tiptap/starter-kit";

import Link
    from "@tiptap/extension-link";

/* =========================================================
   VARIABLES
   ========================================================= */

const VARIABLES_CORREO = [
    {
        key:
            "NOMBRE",

        label:
            "Nombre",

        token:
            "{{NOMBRE}}",

        ejemplo:
            "Diego Bravo",
    },

    {
        key:
            "EMPRESA",

        label:
            "Empresa",

        token:
            "{{EMPRESA}}",

        ejemplo:
            "RIDS",
    },

    {
        key:
            "EMAIL",

        label:
            "Correo",

        token:
            "{{EMAIL}}",

        ejemplo:
            "usuario@empresa.cl",
    },

    {
        key:
            "VERSION_DOCUMENTO",

        label:
            "Versión",

        token:
            "{{VERSION_DOCUMENTO}}",

        ejemplo:
            "1.0",
    },

    {
        key:
            "LINK_CONSENTIMIENTO",

        label:
            "Enlace para responder",

        token:
            "{{LINK_CONSENTIMIENTO}}",

        ejemplo:
            "https://rids.cl/proteccion-datos/responder/demo",
    },
];

/* =========================================================
   PROPS
   ========================================================= */

type Props = {
    value?:
    string;

    onChange?:
    (
        value:
            string,
    ) => void;

    disabled?:
    boolean;
};
/* =========================================================
   PREVIEW
   ========================================================= */

function construirPreviewCorreo(
    html:
        string,
) {

    return html
        .replaceAll(
            "{{NOMBRE}}",
            "Diego Bravo",
        )
        .replaceAll(
            "{{EMPRESA}}",
            "RIDS",
        )
        .replaceAll(
            "{{EMAIL}}",
            "usuario@empresa.cl",
        )
        .replaceAll(
            "{{VERSION_DOCUMENTO}}",
            "1.0",
        )
        .replaceAll(
            "{{LINK_CONSENTIMIENTO}}",
            "https://rids.cl/proteccion-datos/responder/demo",
        );
}

/* =========================================================
   COMPONENTE
   ========================================================= */

export default function CorreoCampaniaEditor({
    value = "",
    onChange = () => undefined,
    disabled = false,
}: Props) {

    const [
        previewOpen,
        setPreviewOpen,
    ] =
        useState(
            false,
        );

    const editor =
        useEditor({
            extensions: [
                StarterKit,

                Link.configure({
                    openOnClick:
                        false,

                    autolink:
                        true,

                    linkOnPaste:
                        true,
                }),
            ],

            content:
                value,

            editable:
                !disabled,

            immediatelyRender:
                false,

            onUpdate: ({
                editor,
            }) => {

                onChange(
                    editor.getHTML(),
                );
            },
        });

    /* =====================================================
       SINCRONIZAR VALOR EXTERNO
       ===================================================== */

    useEffect(
        () => {

            if (
                !editor
            ) {
                return;
            }

            editor.setEditable(
                !disabled,
            );

        },
        [
            editor,
            disabled,
        ],
    );

    useEffect(
        () => {

            if (
                !editor
            ) {
                return;
            }

            const htmlActual =
                editor.getHTML();

            if (
                htmlActual !==
                value
            ) {
                editor.commands
                    .setContent(
                        value ||
                        "",
                        {
                            emitUpdate:
                                false,
                        },
                    );
            }

        },
        [
            editor,
            value,
        ],
    );

    /* =====================================================
       INSERTAR VARIABLE
       ===================================================== */

    function insertarVariable(
        token:
            string,
    ) {

        if (
            !editor ||
            disabled
        ) {
            return;
        }

        editor
            .chain()
            .focus()
            .insertContent(
                token,
            )
            .run();
    }

    /* =====================================================
       INSERTAR BOTÓN DE RESPUESTA
       ===================================================== */

    function insertarBotonRespuesta() {

        if (
            !editor ||
            disabled
        ) {
            return;
        }

        editor
            .chain()
            .focus()
            .insertContent(`
                <p>
                    <a
                        href="{{LINK_CONSENTIMIENTO}}"
                    >
                        Revisar información y responder
                    </a>
                </p>
            `)
            .run();
    }

    /* =====================================================
       LINK MANUAL
       ===================================================== */

    function agregarLink() {

        if (
            !editor ||
            disabled
        ) {
            return;
        }

        const previousUrl =
            editor
                .getAttributes(
                    "link",
                )
                .href;

        const url =
            window.prompt(
                "Ingresa la URL",
                previousUrl ||
                "https://",
            );

        if (
            url ===
            null
        ) {
            return;
        }

        if (
            !url.trim()
        ) {

            editor
                .chain()
                .focus()
                .extendMarkRange(
                    "link",
                )
                .unsetLink()
                .run();

            return;
        }

        editor
            .chain()
            .focus()
            .extendMarkRange(
                "link",
            )
            .setLink({
                href:
                    url.trim(),
            })
            .run();
    }

    /* =====================================================
       PREVIEW
       ===================================================== */

    const previewHtml =
        useMemo(
            () =>
                construirPreviewCorreo(
                    value ||
                    "",
                ),
            [
                value,
            ],
        );

    return (
        <div className="space-y-4">

            {/* =================================================
                TOOLBAR
                ================================================= */}

            <div className="rounded-xl border border-slate-200">

                <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-2">

                    <Button
                        type={
                            editor
                                ?.isActive(
                                    "bold",
                                )
                                ? "primary"
                                : "text"
                        }
                        disabled={
                            disabled
                        }
                        icon={
                            <BoldOutlined />
                        }
                        onClick={() =>
                            editor
                                ?.chain()
                                .focus()
                                .toggleBold()
                                .run()
                        }
                    />

                    <Button
                        type={
                            editor
                                ?.isActive(
                                    "italic",
                                )
                                ? "primary"
                                : "text"
                        }
                        disabled={
                            disabled
                        }
                        icon={
                            <ItalicOutlined />
                        }
                        onClick={() =>
                            editor
                                ?.chain()
                                .focus()
                                .toggleItalic()
                                .run()
                        }
                    />

                    <Button
                        type={
                            editor
                                ?.isActive(
                                    "bulletList",
                                )
                                ? "primary"
                                : "text"
                        }
                        disabled={
                            disabled
                        }
                        icon={
                            <UnorderedListOutlined />
                        }
                        onClick={() =>
                            editor
                                ?.chain()
                                .focus()
                                .toggleBulletList()
                                .run()
                        }
                    />

                    <Button
                        type="text"
                        disabled={
                            disabled
                        }
                        icon={
                            <LinkOutlined />
                        }
                        onClick={
                            agregarLink
                        }
                    />

                </div>

                {/* =================================================
                    EDITOR
                    ================================================= */}

                <div
                    className="
                        min-h-[260px]
                        px-4
                        py-3
                        [&_.ProseMirror]:min-h-[230px]
                        [&_.ProseMirror]:outline-none
                        [&_.ProseMirror_p]:my-2
                        [&_.ProseMirror_ul]:ml-6
                        [&_.ProseMirror_ul]:list-disc
                        [&_.ProseMirror_a]:text-cyan-700
                        [&_.ProseMirror_a]:underline
                    "
                >
                    <EditorContent
                        editor={
                            editor
                        }
                    />
                </div>

            </div>

            {/* =================================================
                VARIABLES
                ================================================= */}

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                <div className="mb-1 text-sm font-semibold text-slate-800">
                    Insertar información del destinatario
                </div>

                <div className="mb-3 text-xs text-slate-500">
                    Selecciona una variable y se insertará en la posición actual del mensaje.
                </div>

                <div className="flex flex-wrap gap-2">

                    {VARIABLES_CORREO
                        .filter(
                            (
                                variable,
                            ) =>
                                variable.key !==
                                "LINK_CONSENTIMIENTO",
                        )
                        .map(
                            (
                                variable,
                            ) => (
                                <Button
                                    key={
                                        variable.key
                                    }
                                    size="small"
                                    disabled={
                                        disabled
                                    }
                                    onClick={() =>
                                        insertarVariable(
                                            variable.token,
                                        )
                                    }
                                >
                                    {
                                        variable.label
                                    }
                                </Button>
                            ),
                        )}

                    <Button
                        size="small"
                        type="primary"
                        ghost
                        disabled={
                            disabled
                        }
                        onClick={
                            insertarBotonRespuesta
                        }
                    >
                        Insertar botón de respuesta
                    </Button>

                </div>

                <Alert
                    className="mt-3"
                    type="info"
                    showIcon
                    message="Las variables se reemplazan automáticamente"
                    description="Cada destinatario recibirá sus propios datos al momento del envío."
                />

            </div>

            {/* =================================================
                PREVIEW
                ================================================= */}

            <div className="flex justify-end">

                <Button
                    icon={
                        <EyeOutlined />
                    }
                    onClick={() =>
                        setPreviewOpen(
                            true,
                        )
                    }
                >
                    Vista previa
                </Button>

            </div>

            <Modal
                open={
                    previewOpen
                }
                onCancel={() =>
                    setPreviewOpen(
                        false,
                    )
                }
                footer={
                    null
                }
                width={
                    760
                }
                title="Vista previa del correo"
            >

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">

                    <div className="mx-auto max-w-2xl rounded-xl bg-white p-6 shadow-sm">

                        <div
                            dangerouslySetInnerHTML={{
                                __html:
                                    previewHtml,
                            }}
                        />

                    </div>

                </div>

            </Modal>

        </div>
    );
}