// src/components/modals-empresa/grupos/GrupoEmpresaSelector.tsx
// Bloque «Grupo de empresas» de la ficha. ADMIN puede asignar/quitar; el resto solo ve.
import React, { useCallback, useEffect, useState } from "react";
import { Button, Popconfirm, Select, Tag, message } from "antd";
import { ApartmentOutlined } from "@ant-design/icons";

import {
    asignarGrupoEmpresa,
    listarGruposEmpresa,
    mensajeErrorGrupo,
    obtenerGrupoDeEmpresa,
    type GrupoEmpresa,
} from "./gruposEmpresa.api";

interface Props {
    empresaId: number;
    canEdit: boolean;
    /** Se llama después de asignar o quitar el grupo (para refrescar el listado). */
    onChanged?: () => void;
}

const GrupoEmpresaSelector: React.FC<Props> = ({ empresaId, canEdit, onChanged }) => {
    const [grupoActual, setGrupoActual] = useState<{ id: number; nombre: string } | null>(null);
    const [grupos, setGrupos] = useState<GrupoEmpresa[]>([]);
    const [seleccion, setSeleccion] = useState<number | null>(null);
    const [editando, setEditando] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const [actual, lista] = await Promise.all([
                obtenerGrupoDeEmpresa(empresaId),
                canEdit ? listarGruposEmpresa() : Promise.resolve<GrupoEmpresa[]>([]),
            ]);
            setGrupoActual(actual);
            setSeleccion(actual?.id ?? null);
            setGrupos(lista);
        } catch (error) {
            message.error(mensajeErrorGrupo(error, "No se pudo cargar el grupo de la empresa"));
        } finally {
            setLoading(false);
        }
    }, [empresaId, canEdit]);

    useEffect(() => {
        void cargar();
    }, [cargar]);

    const guardar = async (grupoId: number | null = seleccion) => {
        setSaving(true);
        try {
            await asignarGrupoEmpresa(empresaId, grupoId);
            message.success(grupoId === null ? "Empresa quitada del grupo" : "Grupo asignado");
            setEditando(false);
            await cargar();
            onChanged?.();
        } catch (error) {
            message.error(mensajeErrorGrupo(error, "No se pudo asignar el grupo"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-4 bg-gray-50 rounded md:col-span-2">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                    <ApartmentOutlined className="text-gray-400 mr-2" />
                    <span className="text-sm font-medium text-gray-600">Grupo de empresas</span>
                </div>
                {canEdit && !editando && !loading && (
                    <div className="flex gap-2">
                        <Button size="small" onClick={() => setEditando(true)}>
                            {grupoActual ? "Cambiar" : "Asignar"}
                        </Button>
                        {grupoActual && (
                            <Popconfirm
                                title="Quitar del grupo"
                                description={`¿Desvincular la empresa de "${grupoActual.nombre}"?`}
                                okText="Quitar"
                                cancelText="Cancelar"
                                okButtonProps={{ danger: true, loading: saving }}
                                onConfirm={() => guardar(null)}
                            >
                                <Button size="small" danger>
                                    Quitar del grupo
                                </Button>
                            </Popconfirm>
                        )}
                    </div>
                )}
            </div>

            {loading ? (
                <p className="text-sm text-slate-400">Cargando…</p>
            ) : editando ? (
                <div className="flex flex-wrap items-center gap-2">
                    <Select<number>
                        className="min-w-[260px]"
                        placeholder="Sin grupo"
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        value={seleccion ?? undefined}
                        onChange={(v) => setSeleccion(v ?? null)}
                        onClear={() => setSeleccion(null)}
                        options={grupos.map((g) => ({
                            value: g.id,
                            label: `${g.nombre} (${g.totalEmpresas})`,
                        }))}
                        notFoundContent="No hay grupos. Créalos con el botón «Grupos» del listado."
                    />
                    <Button
                        onClick={() => {
                            setSeleccion(grupoActual?.id ?? null);
                            setEditando(false);
                        }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="primary"
                        loading={saving}
                        disabled={seleccion === (grupoActual?.id ?? null)}
                        onClick={() => void guardar(seleccion)}
                    >
                        Guardar
                    </Button>
                </div>
            ) : grupoActual ? (
                <Tag color="purple">{grupoActual.nombre}</Tag>
            ) : (
                <p className="text-base font-semibold">—</p>
            )}
        </div>
    );
};

export default GrupoEmpresaSelector;