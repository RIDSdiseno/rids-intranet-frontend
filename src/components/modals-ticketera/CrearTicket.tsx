import { useRef } from "react";
import { Drawer, Button, Input, Select, Row, Col, Tag } from "antd";
import { PaperClipOutlined } from "@ant-design/icons";

interface Empresa { id_empresa: number; nombre: string; }

interface SolicitanteOption { value: number; label: string; email?: string | null }

interface Tecnico {
    id_tecnico: number;
    nombre: string;
    cargo?: string;      // 🆕
    email?: string;      // 🆕
}

interface TicketForm {
    empresaId: number | undefined;
    requesterId: number | undefined;
    fromEmail: string;
    subject: string;
    message: string;
    priority: string;
    assigneeId: number | undefined;
}

interface Props {
    open: boolean;
    form: TicketForm;
    empresas: Empresa[];
    solicitantes: SolicitanteOption[];
    tecnicos: Tecnico[];
    creating: boolean;
    onClose: () => void;
    onSubmit: () => void;
    onFormChange: (form: TicketForm) => void;
    onEmpresaChange: (empresaId: number) => void;
    files: File[];
    onFilesChange: React.Dispatch<React.SetStateAction<File[]>>;
}

const buildMensajeInicial = (tecnico?: { nombre?: string; cargo?: string; email?: string; telefono?: string }) => {
    const firma = tecnico
        ? [
            tecnico.nombre,
            tecnico.cargo,
            tecnico.email,
            tecnico.telefono,
        ]
            .filter(Boolean)
            .join("\n")
        : "";

    return [
        "Estimado(a),",
        "",
        "Gracias por contactarnos.",
        "",
        "Quedamos atentos a su respuesta.",
        "",
        "Saludos cordiales",
        firma,
    ]
        .filter((line, index, arr) => {
            if (line !== "") return true;
            return !(arr[index - 1] === "" && arr[index + 1] === "");
        })
        .join("\n");
};

export function CrearTicketDrawer({
    open,
    form,
    empresas,
    solicitantes,
    tecnicos,
    creating,
    onClose,
    onSubmit,
    onFormChange,
    onEmpresaChange,
    files,
    onFilesChange,
}: Props) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    return (
        <Drawer
            title="Crear Nuevo Ticket"
            open={open}
            onClose={creating ? undefined : onClose}
            maskClosable={!creating}
            closable={!creating}
            keyboard={!creating}
            width={700}
            footer={
                <div className="flex justify-end gap-2">
                    <Button onClick={onClose} disabled={creating}>
                        Cancelar
                    </Button>
                    <Button
                        type="primary"
                        onClick={onSubmit}
                        loading={creating}
                        disabled={creating}
                    >
                        Crear Ticket
                    </Button>
                </div>
            }
        >
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Empresa *</label>
                    <Select
                        placeholder="Seleccionar empresa"
                        className="w-full"
                        size="large"
                        options={empresas.map(e => ({ value: e.id_empresa, label: e.nombre }))}
                        onChange={(v) => {
                            onFormChange({
                                ...form,
                                empresaId: v,
                                requesterId: undefined,
                                fromEmail: "",
                            });
                            onEmpresaChange(v);
                        }}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Contacto *</label>
                    <Select
                        placeholder="Seleccionar contacto"
                        className="w-full"
                        size="large"
                        disabled={!form.empresaId}
                        options={solicitantes}
                        value={form.requesterId}
                        onChange={(v) =>
                            onFormChange({ ...form, requesterId: v, fromEmail: "" })
                        }
                    />
                    <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Correo manual
                        </label>
                        <Input
                            placeholder="correo@cliente.com"
                            value={form.fromEmail}
                            disabled={!!form.requesterId}
                            onChange={(e) =>
                                onFormChange({
                                    ...form,
                                    fromEmail: e.target.value,
                                })
                            }
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Asunto *</label>
                    <Input
                        placeholder="Breve descripción del problema"
                        size="large"
                        value={form.subject}
                        onChange={(e) => onFormChange({ ...form, subject: e.target.value })}
                    />
                </div>

                <Row gutter={16}>
                    <Col span={12}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Prioridad</label>
                        <Select
                            className="w-full"
                            value={form.priority}
                            options={[
                                { value: "LOW", label: "Baja" },
                                { value: "NORMAL", label: "Media" },
                                { value: "HIGH", label: "Alta" },
                                { value: "URGENT", label: "Urgente" },
                            ]}
                            onChange={(v) => onFormChange({ ...form, priority: v })}
                        />
                    </Col>
                    <Col span={12}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Asignar a</label>
                        <Select
                            placeholder="Auto-asignar"
                            className="w-full"
                            options={tecnicos.map(t => ({ value: t.id_tecnico, label: t.nombre }))}
                            onChange={(v) => {
                                const tecnicoSeleccionado = tecnicos.find((t) => t.id_tecnico === v);

                                onFormChange({
                                    ...form,
                                    assigneeId: v,
                                    message: buildMensajeInicial(tecnicoSeleccionado),
                                });
                            }}
                        />
                    </Col>
                </Row>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                    <Input.TextArea
                        rows={6}
                        placeholder="Describe el problema en detalle..."
                        value={form.message}
                        onChange={(e) => onFormChange({ ...form, message: e.target.value })}
                        className="resize-none"
                    />
                    <div className="mt-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            hidden
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
                            onChange={(e) => {
                                const selectedFiles = e.target.files;
                                if (!selectedFiles?.length) return;

                                onFilesChange((prev) => [
                                    ...prev,
                                    ...Array.from(selectedFiles),
                                ]);

                                e.target.value = "";
                            }}
                        />

                        <div className="flex justify-between items-center">
                            <Button
                                icon={<PaperClipOutlined />}
                                size="small"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={creating}
                            >
                                Adjuntar archivo
                            </Button>

                            <span className="text-sm text-gray-500">
                                {form.message.length}/5000 caracteres
                            </span>
                        </div>

                        {files.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {files.map((file, index) => (
                                    <Tag
                                        key={`${file.name}-${file.lastModified}-${index}`}
                                        closable={!creating}
                                        onClose={() => {
                                            onFilesChange((prev) =>
                                                prev.filter((_, i) => i !== index)
                                            );
                                        }}
                                    >
                                        {file.name}
                                    </Tag>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Drawer>
    );
}