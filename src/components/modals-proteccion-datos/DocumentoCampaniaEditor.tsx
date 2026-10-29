import {
    BoldOutlined,
    ItalicOutlined,
    LinkOutlined,
    OrderedListOutlined,
    UnorderedListOutlined,
} from "@ant-design/icons";

import {
    Button,
} from "antd";

import {
    useEffect,
} from "react";

import {
    EditorContent,
    useEditor,
} from "@tiptap/react";

import StarterKit
    from "@tiptap/starter-kit";

import Link
    from "@tiptap/extension-link";

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

export default function DocumentoCampaniaEditor({
    value = "",
    onChange = () => undefined,
    disabled = false,
}: Props) {

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
       EDITABLE
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

    /* =====================================================
       SINCRONIZAR CONTENIDO
       ===================================================== */

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
       LINK
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

    return (
        <div className="rounded-xl border border-slate-200">

            {/* TOOLBAR */}

            <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 p-2">

                <Button
                    type={
                        editor?.isActive(
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
                        editor?.isActive(
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
                        editor?.isActive(
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
                    type={
                        editor?.isActive(
                            "orderedList",
                        )
                            ? "primary"
                            : "text"
                    }
                    disabled={
                        disabled
                    }
                    icon={
                        <OrderedListOutlined />
                    }
                    onClick={() =>
                        editor
                            ?.chain()
                            .focus()
                            .toggleOrderedList()
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

                <Button
                    type={
                        editor?.isActive(
                            "heading",
                            {
                                level:
                                    2,
                            },
                        )
                            ? "primary"
                            : "text"
                    }
                    disabled={
                        disabled
                    }
                    onClick={() =>
                        editor
                            ?.chain()
                            .focus()
                            .toggleHeading({
                                level:
                                    2,
                            })
                            .run()
                    }
                >
                    H2
                </Button>

                <Button
                    type={
                        editor?.isActive(
                            "heading",
                            {
                                level:
                                    3,
                            },
                        )
                            ? "primary"
                            : "text"
                    }
                    disabled={
                        disabled
                    }
                    onClick={() =>
                        editor
                            ?.chain()
                            .focus()
                            .toggleHeading({
                                level:
                                    3,
                            })
                            .run()
                    }
                >
                    H3
                </Button>

            </div>

            {/* EDITOR */}

            <div
                className="
                    min-h-[340px]
                    px-5
                    py-4
                    [&_.ProseMirror]:min-h-[310px]
                    [&_.ProseMirror]:outline-none
                    [&_.ProseMirror_h2]:mb-3
                    [&_.ProseMirror_h2]:mt-5
                    [&_.ProseMirror_h2]:text-xl
                    [&_.ProseMirror_h2]:font-semibold
                    [&_.ProseMirror_h3]:mb-2
                    [&_.ProseMirror_h3]:mt-4
                    [&_.ProseMirror_h3]:text-lg
                    [&_.ProseMirror_h3]:font-semibold
                    [&_.ProseMirror_p]:my-2
                    [&_.ProseMirror_ul]:ml-6
                    [&_.ProseMirror_ul]:list-disc
                    [&_.ProseMirror_ol]:ml-6
                    [&_.ProseMirror_ol]:list-decimal
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
    );
}