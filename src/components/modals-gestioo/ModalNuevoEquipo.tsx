// src/components/modals-gestioo/ModalNuevoEquipo.tsx
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
} from "antd";
import {
    LaptopOutlined,
    NumberOutlined,
    DashboardOutlined,
    HddOutlined,
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

import { http } from "../../service/http";

const { Option } = Select;

type RequiredEquipoFields = {
    procesador: boolean;
    ram: boolean;
    disco: boolean;
};

const REQUIRED_FIELDS_BY_TIPO: Record<string, RequiredEquipoFields> = {
    [TipoEquipo.NOTEBOOK]: {
        procesador: true,
        ram: true,
        disco: true,
    },
    [TipoEquipo.DESKTOP]: {
        procesador: true,
        ram: true,
        disco: true,
    },
    [TipoEquipo.CPU]: {
        procesador: true,
        ram: true,
        disco: true,
    },
    [TipoEquipo.EQUIPO_ARMADO]: {
        procesador: true,
        ram: true,
        disco: true,
    },

    [TipoEquipo.IMPRESORA]: {
        procesador: false,
        ram: false,
        disco: false,
    },
    [TipoEquipo.SCANNER]: {
        procesador: false,
        ram: false,
        disco: false,
    },
    [TipoEquipo.MONITOR]: {
        procesador: false,
        ram: false,
        disco: false,
    },
    [TipoEquipo.ROUTER]: {
        procesador: false,
        ram: false,
        disco: false,
    },
    [TipoEquipo.CARGADOR]: {
        procesador: false,
        ram: false,
        disco: false,
    },
    [TipoEquipo.INSUMOS_COMPUTACIONALES]: {
        procesador: false,
        ram: false,
        disco: false,
    },

    [TipoEquipo.NAS]: {
        procesador: false,
        ram: false,
        disco: true,
    },

    [TipoEquipo.DISCO_DURO_EXTERNO]: {
        procesador: false,
        ram: false,
        disco: true,
    },

    [TipoEquipo.OTRO]: {
        procesador: false,
        ram: false,
        disco: false,
    },

    [TipoEquipo.GENERICO]: {
        procesador: true,
        ram: true,
        disco: true,
    },
};

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

    const requiredFields =
        REQUIRED_FIELDS_BY_TIPO[tipo] ?? REQUIRED_FIELDS_BY_TIPO[TipoEquipo.GENERICO];

    const requiresProcesador = requiredFields.procesador;
    const requiresRam = requiredFields.ram;
    const requiresDisco = requiredFields.disco;

    // ===============================
    // Empresa / Solicitante
    // ===============================
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [empresaId, setEmpresaId] = useState<string>("");
    const [solicitantes, setSolicitantes] = useState<Solicitante[]>([]);
    const [idSolicitante, setIdSolicitante] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    type EquipoField =
        | "marca"
        | "modelo"
        | "serie"
        | "tipo"
        | "procesador"
        | "ram"
        | "disco"
        | "empresaId"
        | "idSolicitante";

    const [fieldErrors, setFieldErrors] = useState<Partial<Record<EquipoField, string>>>({});

    // ===============================
    // Efectos (sin cambios)
    // ===============================
    useEffect(() => {
        setErrorMsg(null);
    }, [marca, modelo, serie, empresaId, idSolicitante, procesador, ram, disco]);

    useEffect(() => {
        setModelo("");
    }, [marca]);

    useEffect(() => {
        const loadEmpresas = async () => {
            try {
                const { data } = await http.get("/empresas");

                const list = Array.isArray(data.data)
                    ? data.data
                    : data;
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
                const { data } = await http.get(
                    `/solicitantes/by-empresa`,
                    { params: { empresaId } }
                );

                setSolicitantes(data.items ?? []);
            } catch {
                setSolicitantes([]);
            }
        };

        loadSolicitantes();
    }, [empresaId]);

    useEffect(() => {
        const currentRequired =
            REQUIRED_FIELDS_BY_TIPO[tipo] ?? REQUIRED_FIELDS_BY_TIPO[TipoEquipo.GENERICO];

        if (!currentRequired.procesador) {
            setProcesador("");
            clearFieldError("procesador");
        }

        if (!currentRequired.ram) {
            setRam("");
            clearFieldError("ram");
        }

        if (!currentRequired.disco) {
            setDisco("");
            clearFieldError("disco");
        }
    }, [tipo]);

    const setFieldValueError = (field: EquipoField, message: string) => {
        setFieldErrors((prev) => ({
            ...prev,
            [field]: message,
        }));
    };

    const clearFieldError = (field: EquipoField) => {
        setFieldErrors((prev) => {
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const clearAllErrors = () => {
        setErrorMsg(null);
        setFieldErrors({});
    };

    const getApiErrorMessage = (err: any) => {
        const data = err?.response?.data;

        return (
            data?.message ||
            data?.error ||
            data?.detail ||
            data?.errors?.[0]?.message ||
            data?.errors?.[0]?.error ||
            err?.message ||
            "Error interno del sistema."
        );
    };

    const getEquipoCreateResponseError = (data: any): string | null => {
        if (!data) return null;

        const totalErrors = Number(data.totalErrors ?? 0);
        const errors = Array.isArray(data.errors) ? data.errors : [];

        if (totalErrors <= 0 && errors.length === 0) {
            return null;
        }

        const firstError = errors[0];

        return (
            firstError?.message ||
            firstError?.error ||
            data.message ||
            data.error ||
            "No se pudo crear el equipo."
        );
    };

    const isSerialDuplicado = (message: string) => {
        const lower = message.toLowerCase();

        return (
            lower.includes("serial") ||
            lower.includes("serie") ||
            lower.includes("duplicado") ||
            lower.includes("ya existe")
        );
    };

    // ===============================
    // Validaciones y guardado (sin cambios)
    // ===============================
    const handleSave = async () => {
        clearAllErrors();

        const nextErrors: Partial<Record<EquipoField, string>> = {};

        if (!marca) {
            nextErrors.marca = "Debe seleccionar una marca.";
        }

        if (!modelo) {
            nextErrors.modelo = "Debe seleccionar un modelo.";
        }

        if (!serie.trim()) {
            nextErrors.serie = "La serie del equipo es obligatoria.";
        }

        if (!tipo) {
            nextErrors.tipo = "Debe seleccionar el tipo de equipo.";
        }

        if (requiresProcesador && !procesador.trim()) {
            nextErrors.procesador = "Debe seleccionar o ingresar el procesador.";
        }

        if (requiresRam && !ram.trim()) {
            nextErrors.ram = "Debe seleccionar la memoria RAM.";
        }

        if (requiresDisco && !disco.trim()) {
            nextErrors.disco = "Debe seleccionar el disco.";
        }

        if (!empresaId) {
            nextErrors.empresaId = "Debe seleccionar una empresa.";
        }

        if (empresaId && !idSolicitante) {
            nextErrors.idSolicitante = "Debe seleccionar un solicitante para la empresa.";
        }

        const empresaSeleccionada = empresas.find(
            (e) => String(e.id_empresa) === empresaId
        );

        if (empresaId && !empresaSeleccionada) {
            nextErrors.empresaId = "Debe seleccionar una empresa válida.";
        }

        if (Object.keys(nextErrors).length > 0) {
            setFieldErrors(nextErrors);
            setErrorMsg("Faltan campos obligatorios. Revisa los campos marcados.");
            return;
        }

        const propiedad = empresaSeleccionada?.nombre ?? "";

        setLoading(true);

        try {
            const payload = {
                marca: String(marca).trim(),
                modelo: modelo.trim(),
                serial: serie.trim().toUpperCase(),
                tipo,

                // El backend actualmente exige estos campos.
                // Cuando el tipo no los usa, enviamos "N/A".
                procesador: requiresProcesador ? procesador.trim() : "N/A",
                ram: requiresRam ? ram.trim() : "N/A",
                disco: requiresDisco ? disco.trim() : "N/A",

                propiedad,
                idSolicitante: idSolicitante ? Number(idSolicitante) : null,
            };

            const res = await http.post("/equipos", payload);
            const data = res.data;

            const responseError = getEquipoCreateResponseError(data);

            if (responseError) {
                if (isSerialDuplicado(responseError)) {
                    const serialDuplicado =
                        data?.errors?.[0]?.serial ||
                        payload.serial;

                    const message = `Serial duplicado: ${serialDuplicado} ya está registrado en el sistema.`;

                    setFieldValueError("serie", message);
                    setErrorMsg(message);
                    return;
                }

                setErrorMsg(responseError);
                return;
            }

            const nuevoId =
                data.id ??
                data.id_equipo ??
                data.created?.[0]?.id ??
                data.created?.[0]?.id_equipo;

            if (!nuevoId) {
                setErrorMsg("El equipo pudo haberse creado, pero el servidor no devolvió el ID del equipo.");
                return;
            }

            onSaved(Number(nuevoId));
            onClose();
        } catch (err: any) {
            console.error(err);

            const status = err?.response?.status;
            const apiMessage = getApiErrorMessage(err);
            const field =
                err?.response?.data?.field ||
                err?.response?.data?.errors?.[0]?.field;

            if (status === 409 || isSerialDuplicado(apiMessage)) {
                const serialDuplicado =
                    err?.response?.data?.serial ||
                    err?.response?.data?.errors?.[0]?.serial ||
                    serie.trim().toUpperCase();

                const message =
                    apiMessage && apiMessage !== "Error interno del sistema."
                        ? apiMessage
                        : `Serial duplicado: ${serialDuplicado} ya está registrado en el sistema.`;

                setFieldValueError("serie", message);
                setErrorMsg(message);
                return;
            }

            if (status === 400) {
                if (field === "serial") {
                    setFieldValueError("serie", apiMessage);
                } else if (field === "marca") {
                    setFieldValueError("marca", apiMessage);
                } else if (field === "modelo") {
                    setFieldValueError("modelo", apiMessage);
                } else if (field === "procesador") {
                    setFieldValueError("procesador", apiMessage);
                } else if (field === "ram") {
                    setFieldValueError("ram", apiMessage);
                } else if (field === "disco") {
                    setFieldValueError("disco", apiMessage);
                } else if (field === "propiedad" || field === "empresaId") {
                    setFieldValueError("empresaId", apiMessage);
                } else if (field === "idSolicitante") {
                    setFieldValueError("idSolicitante", apiMessage);
                }

                setErrorMsg(apiMessage || "Hay datos inválidos. Revisa los campos marcados.");
                return;
            }

            if (status === 401) {
                setErrorMsg("Tu sesión expiró. Vuelve a iniciar sesión.");
                return;
            }

            if (status === 403) {
                setErrorMsg("No tienes permisos para crear equipos.");
                return;
            }

            setErrorMsg(apiMessage || "Error interno del sistema.");
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
                                            onChange={(value) => {
                                                setMarca(value);
                                                clearFieldError("marca");
                                            }}
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
                                        {fieldErrors.marca && (
                                            <p className="text-xs text-red-600 mt-1">{fieldErrors.marca}</p>
                                        )}
                                    </div>
                                </Col>
                                <Col span={8}>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">
                                            Modelo <span className="text-red-500">*</span>
                                        </label>
                                        <AutoComplete
                                            value={modelo}
                                            onChange={(value) => {
                                                setModelo(value);
                                                clearFieldError("modelo");
                                            }}
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
                                        {fieldErrors.modelo && (
                                            <p className="text-xs text-red-600 mt-1">{fieldErrors.modelo}</p>
                                        )}
                                    </div>
                                </Col>
                                <Col span={8}>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">
                                            Serie <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            value={serie}
                                            onChange={(e) => {
                                                setSerie(e.target.value.toUpperCase());
                                                clearFieldError("serie");
                                            }}
                                            placeholder="Número de serie"
                                            prefix={<NumberOutlined className="text-gray-400" />}
                                            className="w-full"
                                        />
                                        {fieldErrors.serie && (
                                            <p className="text-xs text-red-600 mt-1">{fieldErrors.serie}</p>
                                        )}
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
                                            onChange={(value) => {
                                                setTipo(value as TipoEquipoValue);
                                                clearFieldError("tipo");
                                                clearFieldError("procesador");
                                                clearFieldError("ram");
                                                clearFieldError("disco");
                                                setErrorMsg(null);
                                            }}
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
                                            Procesador {requiresProcesador && <span className="text-red-500">*</span>}
                                        </label>
                                        <AutoComplete
                                            value={procesador}
                                            onChange={(value) => {
                                                setProcesador(value);
                                                clearFieldError("procesador");
                                            }}
                                            options={PROCESADORES.map((p: string) => ({
                                                value: p,
                                                label: p,
                                            }))}
                                            placeholder={
                                                requiresProcesador
                                                    ? "Ej: Intel Core i5"
                                                    : "No aplica para este tipo de equipo"
                                            }
                                            disabled={!requiresProcesador}
                                            className="w-full"
                                        >
                                        </AutoComplete>
                                        {fieldErrors.procesador && (
                                            <p className="text-xs text-red-600 mt-1">{fieldErrors.procesador}</p>
                                        )}
                                    </div>
                                </Col>
                            </Row>
                            <Row gutter={16} className="mt-4">
                                <Col span={12}>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">
                                            RAM {requiresRam && <span className="text-red-500">*</span>}
                                        </label>
                                        <AutoComplete
                                            value={ram}
                                            onChange={(value) => {
                                                setRam(value);
                                                clearFieldError("ram");
                                            }}
                                            options={RAMS.map((r: string) => ({
                                                value: r,
                                                label: r,
                                            }))}
                                            placeholder={
                                                requiresRam
                                                    ? "Ej: 16GB DDR4"
                                                    : "No aplica para este tipo de equipo"
                                            }
                                            disabled={!requiresRam}
                                            className="w-full"
                                        >
                                        </AutoComplete>
                                        {fieldErrors.ram && (
                                            <p className="text-xs text-red-600 mt-1">{fieldErrors.ram}</p>
                                        )}
                                    </div>
                                </Col>
                                <Col span={12}>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">
                                            Disco {requiresDisco && <span className="text-red-500">*</span>}
                                        </label>
                                        <AutoComplete
                                            value={disco}
                                            onChange={(value) => {
                                                setDisco(value);
                                                clearFieldError("disco");
                                            }}
                                            options={DISCOS.map((d: string) => ({
                                                value: d,
                                                label: d,
                                            }))}
                                            placeholder={
                                                requiresDisco
                                                    ? "Ej: 512GB SSD"
                                                    : "No aplica para este tipo de equipo"
                                            }
                                            disabled={!requiresDisco}
                                            className="w-full"
                                        >
                                        </AutoComplete>
                                        {fieldErrors.disco && (
                                            <p className="text-xs text-red-600 mt-1">{fieldErrors.disco}</p>
                                        )}
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
                                            onChange={(value) => {
                                                setEmpresaId(value);
                                                setIdSolicitante("");
                                                clearFieldError("empresaId");
                                                clearFieldError("idSolicitante");
                                            }}
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
                                        {fieldErrors.empresaId && (
                                            <p className="text-xs text-red-600 mt-1">{fieldErrors.empresaId}</p>
                                        )}
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
                                                onChange={(value) => {
                                                    setIdSolicitante(value);
                                                    clearFieldError("idSolicitante");
                                                }}
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
                                            {fieldErrors.idSolicitante && (
                                                <p className="text-xs text-red-600 mt-1">{fieldErrors.idSolicitante}</p>
                                            )}
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