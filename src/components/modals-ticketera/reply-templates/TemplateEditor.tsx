import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button, Space } from "antd";
import { useEffect } from "react";

type Props = {
    value: string;
    onChange: (html: string) => void;
    insertToken?: string | null;
    onTokenInserted?: () => void;
};

export default function TicketTemplateEditor({
    value,
    onChange,
    insertToken,
    onTokenInserted,
}: Props) {
    const editor = useEditor({
        extensions: [StarterKit],
        content: value,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                spellcheck: "false",
                class: "template-editor-content",
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value || "<p></p>", {
                emitUpdate: false,
            });
        }
    }, [value, editor]);

    useEffect(() => {
        if (!editor || !insertToken) return;

        editor.chain().focus().insertContent(insertToken).run();
        onTokenInserted?.();
    }, [insertToken, editor, onTokenInserted]);

    if (!editor) return null;

    return (
        <>
            <style>
                {`
                  .ticket-template-editor {
                    border: 1px solid #d9d9d9;
                    border-radius: 8px;
                    overflow: hidden;
                    transition: border-color 0.2s ease, box-shadow 0.2s ease;
                    background: #fff;
                  }

                  .ticket-template-editor:focus-within {
                    border-color: #1677ff;
                    box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.12);
                  }

                  .ticket-template-editor .template-editor-content {
                    min-height: 280px;
                    padding: 12px;
                    outline: none;
                    border: none;
                    box-shadow: none;
                  }

                  .ticket-template-editor .template-editor-content:focus {
                    outline: none;
                    border: none;
                    box-shadow: none;
                  }

                  .ticket-template-editor .template-editor-content p {
                    margin: 0 0 12px;
                  }

                  .ticket-template-editor .template-editor-content p:last-child {
                    margin-bottom: 0;
                  }
                `}
            </style>

            <div className="ticket-template-editor">
                <div
                    style={{
                        padding: 8,
                        borderBottom: "1px solid #f0f0f0",
                        background: "#fafafa",
                    }}
                >
                    <Space wrap>
                        <Button
                            size="small"
                            type={editor.isActive("bold") ? "primary" : "default"}
                            onClick={() => editor.chain().focus().toggleBold().run()}
                        >
                            Negrita
                        </Button>

                        <Button
                            size="small"
                            type={editor.isActive("italic") ? "primary" : "default"}
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                        >
                            Cursiva
                        </Button>

                        <Button
                            size="small"
                            type={editor.isActive("bulletList") ? "primary" : "default"}
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                        >
                            Lista
                        </Button>

                        <Button
                            size="small"
                            type={editor.isActive("orderedList") ? "primary" : "default"}
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        >
                            Numeración
                        </Button>

                        <Button
                            size="small"
                            onClick={() => editor.chain().focus().setParagraph().run()}
                        >
                            Párrafo
                        </Button>
                    </Space>
                </div>

                <EditorContent editor={editor} />
            </div>
        </>
    );
}