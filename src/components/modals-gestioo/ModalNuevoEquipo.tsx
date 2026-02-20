import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    Select,
    Input,
    AutoComplete,
    Row,
    Col,
    Spin,
    Alert,
    ConfigProvider,
} from "antd";
import {
    LaptopOutlined,
    NumberOutlined,
    DesktopOutlined,
    DashboardOutlined,
    HddOutlined,
    BuildOutlined,
    GlobalOutlined,
    SaveOutlined,
    CloseOutlined,
    InfoCircleOutlined,
} from "@ant-design/icons";

// TYPES
import type {
    Empresa,
    Solicitante,
    MarcaEquipo,
    TipoEquipoValue,
} from "./types";

import {
    MARCAS_EQUIPO,
    MODELOS_POR_MARCA,
    PROCESADORES,
    RAMS,
    DISCOS,
    TipoEquipo,
    TipoEquipoLabel,
} from "./types";

import { api } from "../../api/api";

const { Option } = Select;

export interface ModalNuevoEquipoProps {
    onClose: () => void;
    onSaved: (nuevoId: number) => void;
}

export const ModalNuevoEquipo: React.FC<ModalNuevoEquipoProps> = ({
    onClose,
    onSaved,
}) => {
    // ===============================
    // Estados principales (sin cambios)
    // ===============================
    const [marca, setMarca] = useState<MarcaEquipo | string>("");
    const [modelo, setModelo] = useState<string>("");
    const [serie, setSerie] = useState<string>("");
    const [tipo, setTipo] = useState<TipoEquipoValue>(TipoEquipo.GENERICO);
    const [procesador, setProcesador] = useState<string>("");
    const [ram, setRam] = useState<string>("");
    const [disco, setDisco] = useState<string>("");

    // ===============================
    // Empresa / Solicitante
    // ===============================
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [empresaId, setEmpresaId] = useState<string>("");
    const [solicitantes, setSolicitantes] = useState<Solicitante[]>([]);
    const [idSolicitante, setIdSolicitante] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // ===============================
    // Efectos (sin cambios)
    // ===============================
    useEffect(() => {
        setErrorMsg(null);
    }, [marca, modelo, serie, empresaId, idSolicitante]);

    useEffect(() => {
        setModelo("");
    }, [marca]);

    useEffect(() => {
        const loadEmpresas = async () => {
            try {
                const res = await api.get("/empresas");
                const list = Array.isArray(res.data.data)
                    ? res.data.data
                    : res.data;
                setEmpresas(list);
            } catch {
                setEmpresas([]);
            }
        };

        loadEmpresas();
    }, []);

    useEffect(() => {
        if (!empresaId) {
            setSolicitantes([]);
            setIdSolicitante("");
            return;
        }

        const loadSolicitantes = async () => {
            try {
                const res = await api.get(
                    `/solicitantes/by-empresa?empresaId=${empresaId}`
                );
                setSolicitantes(res.data.items ?? []);
            } catch {
                setSolicitantes([]);
            }
        };

        loadSolicitantes();
    }, [empresaId]);

    // ===============================
    // Validaciones y guardado (sin cambios)
    // ===============================
    const handleSave = async () => {
        if (!marca) {
            setErrorMsg("Debe seleccionar una marca.");
            return;
        }

        if (!modelo) {
            setErrorMsg("Debe seleccionar un modelo.");
            return;
        }

        if (!serie.trim()) {
            setErrorMsg("La serie del equipo es obligatoria.");
            return;
        }

        if (empresaId && !idSolicitante) {
            setErrorMsg("Debe seleccionar un solicitante para la empresa.");
            return;
        }

        const empresaSeleccionada = empresas.find(
            (e) => String(e.id_empresa) === empresaId
        );

        if (!empresaSeleccionada) {
            setErrorMsg("Debe seleccionar una empresa válida.");
            return;
        }

        const propiedad = empresaSeleccionada.nombre;

        setLoading(true);
        try {
            const payload = {
                marca,
                modelo,
                serial: serie.trim(),
                tipo,
                procesador: procesador || null,
                ram: ram || null,
                disco: disco || null,
                propiedad,
                idSolicitante: idSolicitante ? Number(idSolicitante) : null,
            };

            const res = await api.post("/equipos", payload);
            const data = res.data;

            onSaved(data.id ?? data.id_equipo);
            onClose();
        } catch (err: any) {
            console.error(err);

            if (err.response?.status === 409) {
                setErrorMsg("Ya existe un equipo registrado con esta serie.");
            } else if (err.response?.status === 401) {
                setErrorMsg("Tu sesión expiró. Vuelve a iniciar sesión.");
            } else if (err.response?.status === 403) {
                setErrorMsg("No tienes permisos para crear equipos.");
            } else if (err.response?.status === 400) {
                setErrorMsg(err.response?.data?.error || "Datos inválidos.");
            } else {
                setErrorMsg("Error interno del sistema.");
            }
        } finally {
            setLoading(false);
        }
    };

    const modelosSugeridos =
        MARCAS_EQUIPO.includes(marca as MarcaEquipo)
            ? MODELOS_POR_MARCA[marca as MarcaEquipo]
            : [];

    // ===============================
    // Render con diseño mejorado y placeholders corregidos
    // ===============================
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl relative overflow-hidden"
            >
                {/* Header con gradiente */}
                <div className="bg-white border-b border-slate-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <LaptopOutlined className="text-cyan-600 text-xl" />
                            <h3 className="text-lg font-semibold text-slate-800 m-0">
                                Nuevo Equipo
                            </h3>
                        </div>

                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600"
                        >
                            <CloseOutlined />
                        </button>
                    </div>
                </div>

                {/* Contenido */}
                <div className="p-6 max-h-[80vh] overflow-y-auto">
                    <Spin spinning={loading} tip="Guardando...">
                        {/* Información Básica */}
                        <div className="mb-6">
                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <InfoCircleOutlined />
                                INFORMACIÓN BÁSICA
                            </h4>
                            <Row gutter={16}>
                                <Col span={8}>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">
                                            Marca <span className="text-red-500">*</span>
                                        </label>
                                        <AutoComplete
                                            value={marca}
                                            onChange={setMarca}
                                            options={MARCAS_EQUIPO.map((m: string) => ({
                                                value: m,
                                                label: m,
                                            }))}
                                            placeholder="Seleccione marca"
                                            filterOption={(input, option) =>
                                                String(option?.value ?? "")
                                                    .toUpperCase()
                                                    .includes(input.toUpperCase())
                                            }
                                            className="w-full"
                                        >
                                            {/* El Input con prefix ahora está dentro de AutoComplete correctamente */}
                                            <Input
                                                className="ant-input-affix-wrapper-status-error"
                                            />
                                        </AutoComplete>
                                    </div>
                                </Col>
                                <Col span={8}>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">
                                            Modelo <span className="text-red-500">*</span>
                                        </label>
                                        <AutoComplete
                                            value={modelo}
                                            onChange={setModelo}
                                            options={modelosSugeridos.map((m: string) => ({
                                                value: m,
                                                label: m,
                                            }))}
                                            placeholder="Seleccione modelo"
                                            disabled={!marca}
                                            className="w-full"
                                        >
                                            <Input
                                            />
                                        </AutoComplete>
                                    </div>
                                </Col>
                                <Col span={8}>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">
                                            Serie <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            value={serie}
                                            onChange={(e) => setSerie(e.target.value)}
                                            placeholder="Número de serie"
                                            prefix={<NumberOutlined className="text-gray-400" />}
                                            className="w-full"
                                        />
                                    </div>
                                </Col>
                            </Row>
                        </div>

                        {/* Especificaciones Técnicas */}
                        <div className="mb-6">
                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <DashboardOutlined />
                                ESPECIFICACIONES TÉCNICAS
                            </h4>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">
                                            Tipo
                                        </label>
                                        <Select
                                            value={tipo}
                                            onChange={(value) => setTipo(value as TipoEquipoValue)}
                                            className="w-full"
                                            placeholder="Seleccione tipo"
                                        >
                                            {Object.values(TipoEquipo).map((t) => (
                                                <Option key={t} value={t}>
                                                    {TipoEquipoLabel[t]}
                                                </Option>
                                            ))}
                                        </Select>
                                    </div>
                                </Col>
                                <Col span={12}>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">
                                            Procesador
                                        </label>
                                        <AutoComplete
                                            value={procesador}
                                            onChange={setProcesador}
                                            options={PROCESADORES.map((p: string) => ({
                                                value: p,
                                                label: p,
                                            }))}
                                            placeholder="Ej: Intel Core i5"
                                            className="w-full"
                                        >
                                            <Input
                                                prefix={<DashboardOutlined className="text-gray-400" />}
                                            />
                                        </AutoComplete>
                                    </div>
                                </Col>
                            </Row>
                            <Row gutter={16} className="mt-4">
                                <Col span={12}>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">
                                            RAM
                                        </label>
                                        <AutoComplete
                                            value={ram}
                                            onChange={setRam}
                                            options={RAMS.map((r: string) => ({
                                                value: r,
                                                label: r,
                                            }))}
                                            placeholder="Ej: 16GB DDR4"
                                            className="w-full"
                                        >
                                            <Input
                                                prefix={<DashboardOutlined className="text-gray-400" />}
                                            />
                                        </AutoComplete>
                                    </div>
                                </Col>
                                <Col span={12}>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">
                                            Disco
                                        </label>
                                        <AutoComplete
                                            value={disco}
                                            onChange={setDisco}
                                            options={DISCOS.map((d: string) => ({
                                                value: d,
                                                label: d,
                                            }))}
                                            placeholder="Ej: 512GB SSD"
                                            className="w-full"
                                        >
                                            <Input
                                                prefix={<HddOutlined className="text-gray-400" />}
                                            />
                                        </AutoComplete>
                                    </div>
                                </Col>
                            </Row>
                        </div>

                        {/* Asignación */}
                        <div className="mb-6">
                            <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <GlobalOutlined />
                                ASIGNACIÓN
                            </h4>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">
                                            Empresa
                                        </label>
                                        <Select
                                            value={empresaId}
                                            onChange={setEmpresaId}
                                            className="w-full"
                                            placeholder="— Seleccione empresa —"
                                            showSearch
                                            optionFilterProp="children"
                                        >
                                            <Option value="">— Seleccione empresa —</Option>
                                            {empresas.map((emp) => (
                                                <Option key={emp.id_empresa} value={String(emp.id_empresa)}>
                                                    {emp.nombre}
                                                </Option>
                                            ))}
                                        </Select>
                                    </div>
                                </Col>
                                <Col span={12}>
                                    {empresaId && (
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">
                                                Solicitante
                                            </label>
                                            <Select
                                                value={idSolicitante}
                                                onChange={setIdSolicitante}
                                                className="w-full"
                                                placeholder="— Seleccione solicitante —"
                                                showSearch
                                                optionFilterProp="children"
                                            >
                                                <Option value="">— Seleccione solicitante —</Option>
                                                {solicitantes.map((s) => (
                                                    <Option key={s.id} value={String(s.id)}>
                                                        {s.nombre}
                                                    </Option>
                                                ))}
                                            </Select>
                                        </div>
                                    )}
                                </Col>
                            </Row>
                        </div>

                        {/* Mensaje de campos obligatorios */}
                        <div className="text-xs text-gray-400 mb-4">
                            Los campos marcados con <span className="text-red-500">*</span> son obligatorios
                        </div>

                        {/* Mensaje de Error */}
                        {errorMsg && (
                            <Alert
                                message="Error"
                                description={errorMsg}
                                type="error"
                                showIcon
                                className="mb-4"
                                closable
                                onClose={() => setErrorMsg(null)}
                            />
                        )}
                    </Spin>
                </div>

                {/* Footer */}
                <div className="border-t px-6 py-4 bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                        disabled={loading}
                    >
                        <CloseOutlined />
                        Cancelar
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-700 hover:to-blue-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Spin size="small" /> : <SaveOutlined />}
                        {loading ? "Guardando..." : "Guardar Equipo"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};