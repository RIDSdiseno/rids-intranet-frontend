// ./src/components/modals-empresa/tabs/TelefoniaTab.tsx
//
// Ficha de empresa → Telefonía: parlantes IP y usuarios de la app (Linkus).
// Solo se muestra a roles internos; el backend responde 403 al resto.

import React, {
    useEffect,
    useState,
} from "react";

import {
    Alert,
    Button,
    Card,
    Col,
    Form,
    Input,
    InputNumber,
    Modal,
    Popconfirm,
    Row,
    Space,
    Table,
    Tooltip,
    Typography,
    message,
    Switch
} from "antd";

import type { ColumnsType } from "antd/es/table";

import {
    DeleteOutlined,
    EditOutlined,
    EyeInvisibleOutlined,
    EyeOutlined,
    PhoneOutlined,
    PlusOutlined,
    SoundOutlined,
} from "@ant-design/icons";

import { http } from "../../../service/http";

import type {
    TelefoniaParlante,
    TelefoniaParlanteFormValues,
    TelefoniaUsuario,
    TelefoniaUsuarioFormValues,
} from "../types";

interface Props {
    empresaId: number;
    canEdit?: boolean;
}

type TelefoniaResponse = {
    parlantes: TelefoniaParlante[];
    usuarios: TelefoniaUsuario[];
};

type ModalState =
    | { tipo: "parlante"; registro: TelefoniaParlante | null }
    | { tipo: "usuario"; registro: TelefoniaUsuario | null }
    | null;

/* =========================================================
   HELPERS
========================================================= */

const errorDe = (err: any, porDefecto: string): string =>
    err?.response?.data?.error ?? porDefecto;

/** "" → null para que el backend guarde NULL. */
const limpiar = (values: object) =>
    Object.fromEntries(
        Object.entries(values).map(([k, v]) => [
            k,
            typeof v === "string" ? v.trim() || null : v ?? null,
        ])
    );

const ipPuerto = (
    ip?: string | null,
    puerto?: number | null
) =>
    ip
        ? `${ip}${puerto ? `:${puerto}` : ""}`
        : "—";

/** Contraseña oculta con botón para mostrar y copiar. */
const Secreto: React.FC<{ valor?: string | null }> = ({ valor }) => {
    const [visible, setVisible] = useState(false);

    if (!valor) {
        return <span style={{ color: "#bfbfbf" }}>—</span>;
    }

    return (
        <Space size={4}>
            <Typography.Text
                code
                copyable={{ text: valor, tooltips: ["Copiar", "Copiada"] }}
            >
                {visible ? valor : "••••••••"}
            </Typography.Text>

            <Tooltip title={visible ? "Ocultar" : "Mostrar"}>
                <Button
                    type="text"
                    size="small"
                    icon={visible ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                    onClick={() => setVisible((v) => !v)}
                />
            </Tooltip>
        </Space>
    );
};

/* =========================================================
   COMPONENTE
========================================================= */

const TelefoniaTab: React.FC<Props> = ({
    empresaId,
    canEdit = true,
}) => {
    const [parlantes, setParlantes] = useState<TelefoniaParlante[]>([]);
    const [usuarios, setUsuarios] = useState<TelefoniaUsuario[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [modal, setModal] = useState<ModalState>(null);
    const [saving, setSaving] = useState(false);

    /* ¿Cuenta telefonía en la completitud de la ficha? */
    const [telefoniaAplica, setTelefoniaAplica] = useState(false);
    const [guardandoAplica, setGuardandoAplica] = useState(false);

    const [formParlante] = Form.useForm<TelefoniaParlanteFormValues>();
    const [formUsuario] = Form.useForm<TelefoniaUsuarioFormValues>();

    const load = async () => {
        setLoading(true);
        setError(null);

        try {
            const [{ data }, { data: config }] = await Promise.all([
                http.get<TelefoniaResponse>(
                    `/ficha-empresa/${empresaId}/telefonia`
                ),
                http.get<{ data?: { telefoniaAplica?: boolean } }>(
                    `/ficha-empresa/${empresaId}/telefonia-config`
                ),
            ]);

            setParlantes(data.parlantes ?? []);
            setUsuarios(data.usuarios ?? []);
            setTelefoniaAplica(config.data?.telefoniaAplica ?? false);
        } catch (err: any) {
            setError(
                err?.response?.status === 403
                    ? "No tienes permisos para ver la telefonía de esta empresa."
                    : errorDe(err, "Error cargando la telefonía.")
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [empresaId]);

    /* ---------- Abrir modales ---------- */

    const abrirParlante = (registro: TelefoniaParlante | null) => {
        formParlante.resetFields();

        if (registro) {
            formParlante.setFieldsValue({
                ubicacion: registro.ubicacion ?? "",
                marcaModelo: registro.marcaModelo ?? "",
                anexo: registro.anexo ?? "",
                macAddress: registro.macAddress ?? "",
                contrasenaAdmin: registro.contrasenaAdmin ?? "",
                observaciones: registro.observaciones ?? "",
            });
        }

        setModal({ tipo: "parlante", registro });
    };

    const abrirUsuario = (registro: TelefoniaUsuario | null) => {
        formUsuario.resetFields();

        if (registro) {
            formUsuario.setFieldsValue({
                nombre: registro.nombre,
                anexo: registro.anexo ?? "",
                contrasena: registro.contrasena ?? "",
                ipPrivada: registro.ipPrivada ?? "",
                puertoPrivado: registro.puertoPrivado ?? null,
                ipPublica: registro.ipPublica ?? "",
                puertoPublico: registro.puertoPublico ?? null,
            });
        }

        setModal({ tipo: "usuario", registro });
    };

    /* ---------- Guardar ---------- */

    const guardar = async () => {
        if (!modal || !canEdit) return;

        try {
            const values =
                modal.tipo === "parlante"
                    ? await formParlante.validateFields()
                    : await formUsuario.validateFields();

            setSaving(true);

            const payload = limpiar(values);
            const recurso = modal.tipo === "parlante" ? "parlantes" : "usuarios";

            if (modal.registro) {
                await http.put(
                    `/ficha-empresa/telefonia/${recurso}/${modal.registro.id}`,
                    payload
                );
            } else {
                await http.post(
                    `/ficha-empresa/${empresaId}/telefonia/${recurso}`,
                    payload
                );
            }

            message.success(
                modal.tipo === "parlante" ? "Parlante guardado" : "Usuario guardado"
            );

            setModal(null);
            await load();
        } catch (err: any) {
            /* Errores de validación del formulario: antd ya los muestra */
            if (err?.errorFields) return;

            message.error(errorDe(err, "No se pudo guardar"));
        } finally {
            setSaving(false);
        }
    };

    const eliminar = async (
        tipo: "parlantes" | "usuarios",
        id: number
    ) => {
        try {
            await http.delete(`/ficha-empresa/telefonia/${tipo}/${id}`);
            message.success("Eliminado");
            await load();
        } catch (err: any) {
            message.error(errorDe(err, "No se pudo eliminar"));
        }
    };

    /* ---------- ¿Aplica telefonía? ---------- */

    const cambiarAplica = async (valor: boolean) => {
        if (!canEdit) return;

        setGuardandoAplica(true);

        try {
            await http.patch(
                `/ficha-empresa/${empresaId}/telefonia-config`,
                { telefoniaAplica: valor }
            );

            setTelefoniaAplica(valor);

            message.success(
                valor
                    ? "Telefonía cuenta en la completitud de la ficha"
                    : "Telefonía ya no cuenta en la completitud"
            );
        } catch (err: any) {
            message.error(errorDe(err, "No se pudo actualizar la configuración"));
        } finally {
            setGuardandoAplica(false);
        }
    };

    /* ---------- Columnas ---------- */

    const accion = <T extends { id: number }>(
        onEdit: (r: T) => void,
        tipo: "parlantes" | "usuarios"
    ): ColumnsType<T> =>
        canEdit
            ? [
                {
                    title: "",
                    key: "acciones",
                    width: 90,
                    align: "right",
                    render: (_: unknown, r: T) => (
                        <Space size={4}>
                            <Button
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => onEdit(r)}
                            />

                            <Popconfirm
                                title="¿Eliminar este registro?"
                                okText="Eliminar"
                                cancelText="Cancelar"
                                okButtonProps={{ danger: true }}
                                onConfirm={() => eliminar(tipo, r.id)}
                            >
                                <Button
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined />}
                                />
                            </Popconfirm>
                        </Space>
                    ),
                },
            ]
            : [];

    const columnasParlantes: ColumnsType<TelefoniaParlante> = [
        { title: "Ubicación", dataIndex: "ubicacion", render: (v) => v || "—" },
        { title: "Marca / Modelo", dataIndex: "marcaModelo", render: (v) => v || "—" },
        { title: "Anexo", dataIndex: "anexo", width: 90, render: (v) => v || "—" },
        {
            title: "MAC",
            dataIndex: "macAddress",
            render: (v) =>
                v ? <Typography.Text code copyable>{v}</Typography.Text> : "—",
        },
        {
            title: "Contraseña admin",
            dataIndex: "contrasenaAdmin",
            render: (v) => <Secreto valor={v} />,
        },
        { title: "Observaciones", dataIndex: "observaciones", render: (v) => v || "—" },
        ...accion<TelefoniaParlante>(abrirParlante, "parlantes"),
    ];

    const columnasUsuarios: ColumnsType<TelefoniaUsuario> = [
        { title: "Nombre", dataIndex: "nombre" },
        { title: "Anexo / Usuario", dataIndex: "anexo", width: 130, render: (v) => v || "—" },
        {
            title: "Contraseña",
            dataIndex: "contrasena",
            render: (v) => <Secreto valor={v} />,
        },
        {
            title: "IP privada : puerto",
            key: "privada",
            render: (_, r) => ipPuerto(r.ipPrivada, r.puertoPrivado),
        },
        {
            title: "IP pública : puerto",
            key: "publica",
            render: (_, r) => ipPuerto(r.ipPublica, r.puertoPublico),
        },
        ...accion<TelefoniaUsuario>(abrirUsuario, "usuarios"),
    ];

    if (error) {
        return <Alert type="warning" showIcon message={error} />;
    }

    return (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>

            <Card size="small" loading={loading}>
                <Space align="start" size={12}>
                    <Switch
                        checked={telefoniaAplica}
                        loading={guardandoAplica}
                        disabled={!canEdit}
                        onChange={(valor) => void cambiarAplica(valor)}
                    />

                    <div>
                        <div style={{ fontWeight: 600 }}>
                            {telefoniaAplica
                                ? "Telefonía aplica a esta empresa"
                                : "Telefonía no aplica a esta empresa"}
                        </div>

                        <div style={{ fontSize: 12, color: "#8c8c8c" }}>
                            {telefoniaAplica
                                ? "Cuenta en la completitud de la ficha: se exige al menos un parlante o usuario con sus datos."
                                : "No cuenta en la completitud. Actívalo si RIDS gestiona la telefonía de esta empresa."}
                        </div>
                    </div>
                </Space>
            </Card>

            {/* ===================== PARLANTES ===================== */}
            <Card
                loading={loading}
                title={
                    <Space>
                        <SoundOutlined />
                        Parlantes / altavoces
                    </Space>
                }
                extra={
                    canEdit ? (
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => abrirParlante(null)}
                        >
                            Nuevo parlante
                        </Button>
                    ) : null
                }
            >
                <Table
                    rowKey="id"
                    size="small"
                    pagination={false}
                    scroll={{ x: 900 }}
                    dataSource={parlantes}
                    columns={columnasParlantes}
                    locale={{ emptyText: "Sin parlantes registrados" }}
                />
            </Card>

            {/* ===================== USUARIOS APP ===================== */}
            <Card
                loading={loading}
                title={
                    <Space>
                        <PhoneOutlined />
                        Usuarios app de telefonía (Linkus)
                    </Space>
                }
                extra={
                    canEdit ? (
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => abrirUsuario(null)}
                        >
                            Nuevo usuario
                        </Button>
                    ) : null
                }
            >
                <Table
                    rowKey="id"
                    size="small"
                    pagination={false}
                    scroll={{ x: 900 }}
                    dataSource={usuarios}
                    columns={columnasUsuarios}
                    locale={{ emptyText: "Sin usuarios registrados" }}
                />
            </Card>

            {/* ===================== MODAL ===================== */}
            {canEdit && (
                <Modal
                    open={modal !== null}
                    onCancel={() => setModal(null)}
                    onOk={guardar}
                    confirmLoading={saving}
                    okText="Guardar"
                    cancelText="Cancelar"
                    destroyOnClose
                    title={
                        modal?.tipo === "parlante"
                            ? modal.registro ? "Editar parlante" : "Nuevo parlante"
                            : modal?.registro ? "Editar usuario" : "Nuevo usuario"
                    }
                >
                    {modal?.tipo === "parlante" && (
                        <Form form={formParlante} layout="vertical">
                            <Form.Item
                                name="ubicacion"
                                label="Ubicación"
                                tooltip="Dónde está instalado (ej.: Sala de espera piso 2, Cafetería)."
                            >
                                <Input maxLength={200} />
                            </Form.Item>

                            <Form.Item
                                name="marcaModelo"
                                label="Marca / Modelo"
                                tooltip="Ej.: GRANDSTREAM GSC3505."
                            >
                                <Input maxLength={200} />
                            </Form.Item>

                            <Row gutter={12}>
                                <Col span={10}>
                                    <Form.Item
                                        name="anexo"
                                        label="Anexo"
                                        tooltip="Anexo de la central asignado al parlante."
                                    >
                                        <Input maxLength={50} />
                                    </Form.Item>
                                </Col>

                                <Col span={14}>
                                    <Form.Item
                                        name="macAddress"
                                        label="MAC"
                                        tooltip="Dirección MAC del parlante. Se guarda en mayúsculas."
                                    >
                                        <Input
                                            maxLength={50}
                                            placeholder="C0:74:AD:00:00:00"
                                            style={{ fontFamily: "monospace" }}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item
                                name="contrasenaAdmin"
                                label="Contraseña admin"
                                tooltip="Contraseña del panel web de administración del parlante."
                            >
                                <Input.Password maxLength={200} autoComplete="new-password" />
                            </Form.Item>

                            <Form.Item
                                name="observaciones"
                                label="Observaciones"
                                tooltip="Ej.: grupo de anexos al que pertenece (Anexo 20 / Anexo 30)."
                            >
                                <Input.TextArea rows={2} maxLength={1000} />
                            </Form.Item>
                        </Form>
                    )}

                    {modal?.tipo === "usuario" && (
                        <Form form={formUsuario} layout="vertical">
                            <Form.Item
                                name="nombre"
                                label="Nombre y apellido"
                                tooltip="Persona o puesto que usa el anexo (ej.: Recepción Alameda)."
                                rules={[{ required: true, whitespace: true, message: "Ingresa el nombre" }]}
                            >
                                <Input maxLength={200} />
                            </Form.Item>

                            <Row gutter={12}>
                                <Col span={10}>
                                    <Form.Item
                                        name="anexo"
                                        label="Anexo / Usuario"
                                        tooltip="Número de anexo, que también es el usuario de Linkus."
                                    >
                                        <Input maxLength={50} />
                                    </Form.Item>
                                </Col>

                                <Col span={14}>
                                    <Form.Item
                                        name="contrasena"
                                        label="Contraseña"
                                        tooltip="Contraseña del usuario en la app Linkus."
                                    >
                                        <Input.Password maxLength={200} autoComplete="new-password" />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={12}>
                                <Col span={14}>
                                    <Form.Item
                                        name="ipPrivada"
                                        label="IP privada"
                                        tooltip="IP de la central dentro de la red de la empresa."
                                    >
                                        <Input maxLength={100} placeholder="10.0.0.10" />
                                    </Form.Item>
                                </Col>

                                <Col span={10}>
                                    <Form.Item
                                        name="puertoPrivado"
                                        label="Puerto"
                                        tooltip="Puerto de la central en la red interna."
                                    >
                                        <InputNumber min={1} max={65535} style={{ width: "100%" }} />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={12}>
                                <Col span={14}>
                                    <Form.Item
                                        name="ipPublica"
                                        label="IP pública"
                                        tooltip="IP para conectarse desde fuera de la oficina."
                                    >
                                        <Input maxLength={100} />
                                    </Form.Item>
                                </Col>

                                <Col span={10}>
                                    <Form.Item
                                        name="puertoPublico"
                                        label="Puerto público"
                                        tooltip="Puerto externo (en la planilla, «Puerto2»)."
                                    >
                                        <InputNumber min={1} max={65535} style={{ width: "100%" }} />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Form>
                    )}
                </Modal>
            )}
        </Space>
    );
};

export default TelefoniaTab;