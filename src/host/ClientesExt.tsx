import React, { useEffect, useMemo, useState } from "react";
import {
    Button,
    Form,
    Input,
    Modal,
    Select,
    Space,
    Switch,
    Table,
    Tag,
    message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
    PlusOutlined,
    ReloadOutlined,
    EditOutlined,
    StopOutlined,
} from "@ant-design/icons";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken");

    if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

type EmpresaOption = {
    id_empresa: number;
    nombre: string;
    detalleEmpresa?: {
        rut?: string | null;
    } | null;
};

type ClienteRow = {
    id_tecnico: number;
    nombre: string;
    email: string;
    rol: string;
    status: boolean;
    empresaId?: number | null;
    empresa?: {
        id_empresa: number;
        nombre: string;
        detalleEmpresa?: {
            rut?: string | null;
        } | null;
    } | null;
};

type ClienteFormValues = {
    nombre: string;
    email: string;
    password?: string;
    empresaId: number;
    status: boolean;
};

function getErrorMessage(error: unknown) {
    if (axios.isAxiosError(error)) {
        return (
            error.response?.data?.error ||
            error.response?.data?.message ||
            error.message ||
            "Error inesperado"
        );
    }

    return "Error inesperado";
}

const Clientes: React.FC = () => {
    const [clientes, setClientes] = useState<ClienteRow[]>([]);
    const [empresas, setEmpresas] = useState<EmpresaOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [search, setSearch] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<ClienteRow | null>(null);

    const [form] = Form.useForm<ClienteFormValues>();

    const filteredClientes = useMemo(() => {
        const q = search.trim().toLowerCase();

        if (!q) return clientes;

        return clientes.filter((c) => {
            return (
                c.nombre.toLowerCase().includes(q) ||
                c.email.toLowerCase().includes(q) ||
                c.empresa?.nombre?.toLowerCase().includes(q)
            );
        });
    }, [clientes, search]);

    const fetchClientes = async () => {
        try {
            setLoading(true);

            const { data } = await api.get("/clientes-ext");

            setClientes(data?.data ?? []);
        } catch (error) {
            message.error(getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const fetchEmpresas = async () => {
        try {
            const { data } = await api.get("/empresas", {
                params: {
                    page: 1,
                    pageSize: 1000,
                },
            });

            const rows = Array.isArray(data?.data)
                ? data.data
                : Array.isArray(data?.items)
                    ? data.items
                    : Array.isArray(data?.empresas)
                        ? data.empresas
                        : [];

            setEmpresas(rows);
        } catch (error) {
            message.error("Error al cargar empresas");
        }
    };

    useEffect(() => {
        fetchClientes();
        fetchEmpresas();
    }, []);

    const openCreate = () => {
        setEditing(null);
        form.resetFields();

        form.setFieldsValue({
            status: true,
        });

        setModalOpen(true);
    };

    const openEdit = (row: ClienteRow) => {
        setEditing(row);

        form.setFieldsValue({
            nombre: row.nombre,
            email: row.email,
            empresaId: row.empresaId ?? undefined,
            status: row.status,
            password: "",
        });

        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditing(null);
        form.resetFields();
    };

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();

            setSaving(true);

            if (editing) {
                await api.put(`/clientes-ext/${editing.id_tecnico}`, {
                    nombre: values.nombre,
                    email: values.email,
                    empresaId: values.empresaId,
                    status: values.status,
                    ...(values.password ? { password: values.password } : {}),
                });

                message.success("Cliente actualizado correctamente");
            } else {
                await api.post("/clientes-ext", {
                    nombre: values.nombre,
                    email: values.email,
                    password: values.password,
                    empresaId: values.empresaId,
                });

                message.success("Cliente creado correctamente");
            }

            closeModal();
            fetchClientes();
        } catch (error) {
            if (error instanceof Error && error.message.includes("validation")) {
                return;
            }

            message.error(getErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const handleDisable = async (row: ClienteRow) => {
        Modal.confirm({
            title: "Desactivar cliente",
            content: `¿Seguro que deseas desactivar a ${row.nombre}?`,
            okText: "Desactivar",
            cancelText: "Cancelar",
            okButtonProps: {
                danger: true,
            },
            async onOk() {
                try {
                    await api.delete(`/clientes-ext/${row.id_tecnico}`);

                    message.success("Cliente desactivado correctamente");
                    fetchClientes();
                } catch (error) {
                    message.error(getErrorMessage(error));
                }
            },
        });
    };

    const columns: ColumnsType<ClienteRow> = [
        {
            title: "Cliente",
            dataIndex: "nombre",
            key: "nombre",
            render: (_, row) => (
                <div>
                    <div className="font-semibold text-slate-800">{row.nombre}</div>
                    <div className="text-xs text-slate-500">{row.email}</div>
                </div>
            ),
        },
        {
            title: "Empresa",
            key: "empresa",
            render: (_, row) => (
                <div>
                    <div className="font-medium text-slate-700">
                        {row.empresa?.nombre ?? "Sin empresa"}
                    </div>
                    <div className="text-xs text-slate-500">
                        RUT: {row.empresa?.detalleEmpresa?.rut ?? "Sin RUT"}
                    </div>
                </div>
            ),
        },
        {
            title: "Rol",
            dataIndex: "rol",
            key: "rol",
            render: () => <Tag color="blue">CLIENTE</Tag>,
        },
        {
            title: "Estado",
            dataIndex: "status",
            key: "status",
            render: (status: boolean) =>
                status ? <Tag color="green">Activo</Tag> : <Tag color="red">Inactivo</Tag>,
        },
        {
            title: "Acciones",
            key: "acciones",
            align: "right",
            render: (_, row) => (
                <Space>
                    <Button icon={<EditOutlined />} onClick={() => openEdit(row)}>
                        Editar
                    </Button>

                    <Button
                        danger
                        icon={<StopOutlined />}
                        disabled={!row.status}
                        onClick={() => handleDisable(row)}
                    >
                        Desactivar
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <div className="p-4 md:p-6">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
                    <p className="text-sm text-slate-500">
                        Usuarios cliente con acceso limitado al portal.
                    </p>
                </div>

                <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchClientes}>
                        Refrescar
                    </Button>

                    <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
                        Nuevo cliente
                    </Button>
                </Space>
            </div>

            <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <Input.Search
                    allowClear
                    placeholder="Buscar por nombre, email o empresa"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ maxWidth: 420 }}
                />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                <Table
                    rowKey="id_tecnico"
                    columns={columns}
                    dataSource={filteredClientes}
                    loading={loading}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                    }}
                />
            </div>

            <Modal
                title={editing ? "Editar cliente" : "Nuevo cliente"}
                open={modalOpen}
                onCancel={closeModal}
                onOk={handleSubmit}
                confirmLoading={saving}
                okText={editing ? "Guardar cambios" : "Crear cliente"}
                cancelText="Cancelar"
                destroyOnClose
            >
                <Form form={form} layout="vertical">
                    <Form.Item
                        label="Nombre"
                        name="nombre"
                        rules={[
                            {
                                required: true,
                                message: "Ingresa el nombre del cliente",
                            },
                        ]}
                    >
                        <Input placeholder="Ej: Cliente Empresa Demo" />
                    </Form.Item>

                    <Form.Item
                        label="Email"
                        name="email"
                        rules={[
                            {
                                required: true,
                                message: "Ingresa el email",
                            },
                            {
                                type: "email",
                                message: "Ingresa un email válido",
                            },
                        ]}
                    >
                        <Input placeholder="cliente@empresa.cl" />
                    </Form.Item>

                    <Form.Item
                        label="Empresa asociada"
                        name="empresaId"
                        rules={[
                            {
                                required: true,
                                message: "Selecciona una empresa",
                            },
                        ]}
                    >
                        <Select
                            showSearch
                            placeholder="Selecciona empresa"
                            optionFilterProp="label"
                            options={empresas.map((e) => ({
                                value: e.id_empresa,
                                label: `${e.nombre}${e.detalleEmpresa?.rut ? ` - ${e.detalleEmpresa.rut}` : ""
                                    }`,
                            }))}
                        />
                    </Form.Item>

                    <Form.Item
                        label={editing ? "Nueva contraseña" : "Contraseña"}
                        name="password"
                        rules={
                            editing
                                ? [
                                    {
                                        min: 6,
                                        message: "Debe tener al menos 6 caracteres",
                                    },
                                ]
                                : [
                                    {
                                        required: true,
                                        message: "Ingresa una contraseña",
                                    },
                                    {
                                        min: 6,
                                        message: "Debe tener al menos 6 caracteres",
                                    },
                                ]
                        }
                        extra={
                            editing
                                ? "Déjalo vacío si no quieres cambiar la contraseña."
                                : undefined
                        }
                    >
                        <Input.Password placeholder="Contraseña de acceso" />
                    </Form.Item>

                    {editing && (
                        <Form.Item
                            label="Activo"
                            name="status"
                            valuePropName="checked"
                        >
                            <Switch checkedChildren="Activo" unCheckedChildren="Inactivo" />
                        </Form.Item>
                    )}
                </Form>
            </Modal>
        </div>
    );
};

export default Clientes;