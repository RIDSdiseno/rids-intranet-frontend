// src/host/ClientesExt.tsx
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
    UserOutlined,
    TeamOutlined,
    SafetyCertificateOutlined,
    BankOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { api } from "../api/api";

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
    console.error("❌ Error capturado en ClientesExt:", error);

    if (axios.isAxiosError(error)) {
        const status = error.response?.status;

        const backendMessage =
            error.response?.data?.error ||
            error.response?.data?.message ||
            error.response?.data?.details;

        if (backendMessage) return backendMessage;

        if (status === 400) return "Solicitud inválida";
        if (status === 401) return "No tienes sesión activa";
        if (status === 403) return "No tienes permisos para realizar esta acción";
        if (status === 404) return "Registro no encontrado";
        if (status === 409) return "Conflicto con los datos enviados";

        return error.message || "Error inesperado";
    }

    if (error instanceof Error) {
        return error.message;
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

    const [disableModalOpen, setDisableModalOpen] = useState(false);
    const [clienteToDisable, setClienteToDisable] = useState<ClienteRow | null>(null);
    const [disabling, setDisabling] = useState(false);

    const [form] = Form.useForm<ClienteFormValues>();

    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
    });

    const totalClientes = clientes.length;

    const clientesActivos = useMemo(() => {
        return clientes.filter((c) => c.status).length;
    }, [clientes]);

    const totalEmpresasVinculadas = useMemo(() => {
        const ids = new Set<number>();

        clientes.forEach((cliente) => {
            if (cliente.empresaId) {
                ids.add(cliente.empresaId);
            }
        });

        return ids.size;
    }, [clientes]);

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

    const handleDisable = (row: ClienteRow) => {

        setClienteToDisable(row);
        setDisableModalOpen(true);
    };

    const confirmDisableCliente = async () => {
        if (!clienteToDisable) return;

        try {
            setDisabling(true);

            const { data } = await api.delete(
                `/clientes-ext/${clienteToDisable.id_tecnico}`
            );

            message.success(data?.message || "Cliente desactivado correctamente");

            setDisableModalOpen(false);
            setClienteToDisable(null);

            await fetchClientes();
        } catch (error) {
            console.error("❌ Error al desactivar cliente:", error);
            message.error(getErrorMessage(error));
        } finally {
            setDisabling(false);
        }
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

    const HeaderClientesExternos = (
        <section className="mb-6 overflow-hidden rounded-[28px] border border-cyan-200 bg-white/90 shadow-sm">
            <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-sky-50" />

                <div className="relative px-6 py-5">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-700">
                                    Clientes externos
                                </span>

                                <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                                    Portal cliente
                                </span>
                            </div>

                            <h1 className="text-2xl font-black tracking-tight text-slate-950">
                                Clientes externos
                            </h1>

                            <p className="mt-1 max-w-2xl text-sm text-slate-600">
                                Gestión de accesos externos asociados a empresas clientes de la intranet.
                            </p>
                        </div>

                        <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:min-w-[360px]">
                                <div className="rounded-2xl border border-cyan-200 bg-white px-4 py-3 shadow-sm">
                                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-cyan-700">
                                        <UserOutlined />
                                        Total
                                    </div>
                                    <div className="mt-1 text-sm font-black text-slate-950">
                                        {totalClientes}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-cyan-200 bg-white px-4 py-3 shadow-sm">
                                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-cyan-700">
                                        <SafetyCertificateOutlined />
                                        Activos
                                    </div>
                                    <div className="mt-1 text-sm font-black text-slate-950">
                                        {clientesActivos}
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-cyan-200 bg-white px-4 py-3 shadow-sm">
                                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-cyan-700">
                                        <BankOutlined />
                                        Empresas
                                    </div>
                                    <div className="mt-1 text-sm font-black text-slate-950">
                                        {totalEmpresasVinculadas}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    icon={<ReloadOutlined />}
                                    onClick={fetchClientes}
                                    loading={loading}
                                    className="h-11 rounded-2xl border-cyan-200"
                                />

                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={openCreate}
                                    className="h-11 rounded-2xl bg-cyan-600 px-5 font-semibold"
                                >
                                    Nuevo cliente
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative border-t border-cyan-100 bg-white/80 px-6 py-3">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <h2 className="text-xs text-slate-500">
                            Busca, crea, edita o desactiva accesos externos.
                        </h2>
                    </div>
                </div>
            </div>
        </section>
    );

    return (
        <div className="p-4 md:p-6">
            {HeaderClientesExternos}

            <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <Input.Search
                        allowClear
                        placeholder="Buscar por nombre, email o empresa"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPagination((prev) => ({
                                ...prev,
                                current: 1,
                            }));
                        }}
                        className="w-full md:max-w-[420px]"
                    />

                    <div className="text-xs text-slate-500">
                        {filteredClientes.length} cliente(s) encontrados
                    </div>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                <Table
                    rowKey="id_tecnico"
                    columns={columns}
                    dataSource={filteredClientes}
                    loading={loading}
                    scroll={{ x: 900 }}
                    pagination={{
                        current: pagination.current,
                        pageSize: pagination.pageSize,
                        showSizeChanger: true,
                        pageSizeOptions: ["5", "10", "20", "50", "100"],
                        showTotal: (total, range) =>
                            `${range[0]}-${range[1]} de ${total} clientes`,
                        onChange: (page, pageSize) => {
                            setPagination({
                                current: page,
                                pageSize,
                            });
                        },
                        onShowSizeChange: (_current, size) => {
                            setPagination({
                                current: 1,
                                pageSize: size,
                            });
                        },
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
            <Modal
                title="Desactivar cliente"
                open={disableModalOpen}
                onCancel={() => {
                    if (disabling) return;
                    setDisableModalOpen(false);
                    setClienteToDisable(null);
                }}
                onOk={confirmDisableCliente}
                okText="Desactivar"
                cancelText="Cancelar"
                confirmLoading={disabling}
                okButtonProps={{
                    danger: true,
                }}
                destroyOnHidden
            >
                <p>
                    ¿Seguro que deseas desactivar a{" "}
                    <strong>{clienteToDisable?.nombre}</strong>?
                </p>

                <p className="text-sm text-slate-500">
                    El cliente no podrá seguir accediendo al portal mientras esté inactivo.
                </p>
            </Modal>
        </div>
    );
};

export default Clientes;