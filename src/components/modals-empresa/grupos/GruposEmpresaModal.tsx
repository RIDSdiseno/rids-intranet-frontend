// src/components/modals-empresa/grupos/GruposEmpresaModal.tsx
// Administración de grupos de empresas (solo ADMIN): crear, renombrar y eliminar.
// La asignación empresa → grupo se hace desde la ficha de la empresa.
import React, { useCallback, useEffect, useState } from "react";
import { Button, Form, Input, Modal, Popconfirm, Select, Table, Tag, Tooltip, message } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import {
    actualizarGrupoEmpresa,
    crearGrupoEmpresa,
    eliminarGrupoEmpresa,
    listarEmpresasParaGrupo,
    listarGruposEmpresa,
    mensajeErrorGrupo,
    type EmpresaOpcionGrupo,
    type GrupoEmpresa,
    type ResumenEmpresasGrupo,
} from "./gruposEmpresa.api";

interface Props {
    open: boolean;
    onClose: () => void;
    /** Se llama cuando algo cambió (para refrescar el listado de empresas). */
    onChanged?: () => void;
}

interface FormValues {
    nombre: string;
    descripcion?: string;
    empresaIds?: number[];
}

/** Confirmación antes de mover empresas que hoy están en otro grupo. */
function confirmarMovimiento(empresas: EmpresaOpcionGrupo[]): Promise<boolean> {
    return new Promise((resolve) => {
        Modal.confirm({
            title: `Se moverán ${empresas.length} empresa(s) desde otro grupo`,
            content: (
                <ul className="list-disc pl-5 text-sm">
                    {empresas.map((e) => (
                        <li key={e.id_empresa}>
                            {e.nombre} <span className="text-slate-500">(hoy en {e.grupo?.nombre})</span>
                        </li>
                    ))}
                </ul>
            ),
            okText: "Mover y guardar",
            cancelText: "Cancelar",
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
        });
    });
}

function textoResumen(r: ResumenEmpresasGrupo): string {
    const partes: string[] = [];
    if (r.agregadas) partes.push(`${r.agregadas} agregada(s)`);
    if (r.movidas) partes.push(`${r.movidas} movida(s) desde otro grupo`);
    if (r.quitadas) partes.push(`${r.quitadas} quitada(s)`);
    return partes.length ? ` · Empresas: ${partes.join(", ")}` : "";
}

const GruposEmpresaModal: React.FC<Props> = ({ open, onClose, onChanged }) => {
    const [grupos, setGrupos] = useState<GrupoEmpresa[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editando, setEditando] = useState<GrupoEmpresa | "nuevo" | null>(null);
    const [form] = Form.useForm<FormValues>();
    const [empresasOpciones, setEmpresasOpciones] = useState<EmpresaOpcionGrupo[]>([]);

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const [listaGrupos, listaEmpresas] = await Promise.all([
                listarGruposEmpresa(),
                listarEmpresasParaGrupo(),
            ]);
            setGrupos(listaGrupos);
            setEmpresasOpciones(listaEmpresas);
        } catch (error) {
            message.error(mensajeErrorGrupo(error, "No se pudieron cargar los grupos"));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open) void cargar();
    }, [open, cargar]);

    /*
  * Los valores se cargan con `initialValues` del Form: con destroyOnHidden el Form
  * se monta recién al abrir el modal, así que un setFieldsValue previo se perdía.
  */
    const abrirNuevo = () => setEditando("nuevo");

    const abrirEditar = (grupo: GrupoEmpresa) => setEditando(grupo);

    const valoresIniciales: FormValues =
        editando && editando !== "nuevo"
            ? {
                nombre: editando.nombre,
                descripcion: editando.descripcion ?? "",
                /* Solo activas: las inactivas del grupo se mantienen y no se tocan al guardar */
                empresaIds: editando.empresas.filter((e) => e.isActive).map((e) => e.id_empresa),
            }
            : { nombre: "", descripcion: "", empresaIds: [] };

    const grupoEditandoId = editando && editando !== "nuevo" ? editando.id : null;

    const inactivasDelGrupo =
        editando && editando !== "nuevo" ? editando.empresas.filter((e) => !e.isActive) : [];

    const guardar = async () => {
        let values: FormValues;
        try {
            values = await form.validateFields();
        } catch {
            return;
        }

        const empresaIds = values.empresaIds ?? [];

        const input = {
            nombre: values.nombre.trim(),
            descripcion: values.descripcion?.trim() ? values.descripcion.trim() : null,
            empresaIds,
        };

        const seleccion = new Set(empresaIds);
        const aMover = empresasOpciones.filter(
            (e) => seleccion.has(e.id_empresa) && e.grupo !== null && e.grupo.id !== grupoEditandoId
        );
        if (aMover.length > 0 && !(await confirmarMovimiento(aMover))) {
            return;
        }

        setSaving(true);
        try {
            if (editando === "nuevo") {
                const resumen = await crearGrupoEmpresa(input);
                message.success(`Grupo creado${textoResumen(resumen)}`);
            } else if (editando) {
                const resumen = await actualizarGrupoEmpresa(editando.id, input);
                message.success(`Grupo actualizado${textoResumen(resumen)}`);
            }
            setEditando(null);
            await cargar();
            onChanged?.();
        } catch (error) {
            message.error(mensajeErrorGrupo(error, "No se pudo guardar el grupo"));
        } finally {
            setSaving(false);
        }
    };

    const eliminar = async (grupo: GrupoEmpresa) => {
        try {
            await eliminarGrupoEmpresa(grupo.id);
            message.success("Grupo eliminado");
            await cargar();
            onChanged?.();
        } catch (error) {
            message.error(mensajeErrorGrupo(error, "No se pudo eliminar el grupo"));
        }
    };

    const columns: ColumnsType<GrupoEmpresa> = [
        {
            title: "Grupo",
            dataIndex: "nombre",
            key: "nombre",
            render: (_: unknown, g) => (
                <div>
                    <div className="font-semibold text-slate-800">{g.nombre}</div>
                    {g.descripcion && <div className="text-xs text-slate-500">{g.descripcion}</div>}
                </div>
            ),
        },
        {
            title: "Empresas",
            key: "empresas",
            render: (_: unknown, g) =>
                g.empresas.length === 0 ? (
                    <span className="text-xs text-slate-400">Sin empresas</span>
                ) : (
                    <div className="flex flex-wrap gap-1">
                        {g.empresas.map((e) => (
                            <Tag key={e.id_empresa} color={e.isActive ? "blue" : "default"}>
                                {e.nombre}
                                {!e.isActive && " (inactiva)"}
                            </Tag>
                        ))}
                    </div>
                ),
        },
        {
            title: "",
            key: "acciones",
            width: 96,
            render: (_: unknown, g) => (
                <div className="flex gap-1 justify-end">
                    <Tooltip title="Editar">
                        <Button size="small" icon={<EditOutlined />} onClick={() => abrirEditar(g)} />
                    </Tooltip>
                    {g.totalEmpresas > 0 ? (
                        <Tooltip title={`Tiene ${g.totalEmpresas} empresa(s). Desasígnalas desde su ficha para poder eliminarlo.`}>
                            <Button size="small" danger icon={<DeleteOutlined />} disabled />
                        </Tooltip>
                    ) : (
                        <Popconfirm
                            title="Eliminar grupo"
                            description={`¿Eliminar "${g.nombre}"?`}
                            okText="Eliminar"
                            cancelText="Cancelar"
                            okButtonProps={{ danger: true }}
                            onConfirm={() => eliminar(g)}
                        >
                            <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    )}
                </div>
            ),
        },
    ];

    return (
        <>
            <Modal
                open={open}
                onCancel={onClose}
                title="Grupos de empresas"
                width={820}
                footer={<Button onClick={onClose}>Cerrar</Button>}
                destroyOnHidden
            >
                <div className="flex justify-between items-center mb-3">
                    <span className="text-xs text-slate-500">
                        Una empresa pertenece a un solo grupo. La asignación se hace en la ficha de cada empresa.
                    </span>
                    <div className="flex gap-2">
                        <Button icon={<ReloadOutlined />} onClick={() => void cargar()} loading={loading} />
                        <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
                            Nuevo grupo
                        </Button>
                    </div>
                </div>

                <Table<GrupoEmpresa>
                    rowKey="id"
                    size="small"
                    loading={loading}
                    columns={columns}
                    dataSource={grupos}
                    pagination={false}
                    locale={{ emptyText: "Aún no hay grupos" }}
                />
            </Modal>

            <Modal
                open={editando !== null}
                onCancel={() => setEditando(null)}
                onOk={() => void guardar()}
                confirmLoading={saving}
                okText="Guardar"
                cancelText="Cancelar"
                title={editando === "nuevo" ? "Nuevo grupo" : "Editar grupo"}
                destroyOnHidden
            >
                <Form
                    key={editando === "nuevo" ? "nuevo" : editando?.id ?? "cerrado"}
                    form={form}
                    layout="vertical"
                    preserve={false}
                    initialValues={valoresIniciales}
                >
                    <Form.Item
                        name="nombre"
                        label="Nombre"
                        rules={[
                            { required: true, whitespace: true, message: "Ingresa el nombre del grupo" },
                            { min: 2, message: "Mínimo 2 caracteres" },
                            { max: 120, message: "Máximo 120 caracteres" },
                        ]}
                    >
                        <Input placeholder="Ej: Grupo Pini" autoFocus />
                    </Form.Item>
                    <Form.Item
                        name="descripcion"
                        label="Descripción (opcional)"
                        rules={[{ max: 500, message: "Máximo 500 caracteres" }]}
                    >
                        <Input.TextArea rows={3} />
                    </Form.Item>
                    <Form.Item
                        name="empresaIds"
                        label="Empresas del grupo"
                        tooltip="Solo empresas activas. Si eliges una que está en otro grupo, se moverá a este al guardar."
                        extra={
                            inactivasDelGrupo.length > 0
                                ? `Además tiene ${inactivasDelGrupo.length} empresa(s) inactiva(s) que se mantienen: ${inactivasDelGrupo.map((e) => e.nombre).join(", ")}`
                                : undefined
                        }
                    >
                        <Select<number[]>
                            mode="multiple"
                            allowClear
                            showSearch
                            optionFilterProp="label"
                            placeholder="Busca y agrega empresas"
                            maxTagCount="responsive"
                            options={empresasOpciones.map((e) => ({
                                value: e.id_empresa,
                                label:
                                    e.grupo && e.grupo.id !== grupoEditandoId
                                        ? `${e.nombre} (en ${e.grupo.nombre})`
                                        : e.nombre,
                            }))}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default GruposEmpresaModal;