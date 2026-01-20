import React, { useEffect, useState } from "react";
import {
    Card,
    Checkbox,
    Button,
    message,
    Divider,
    Tooltip,
    Row,
    Col
} from "antd";
import {
    SaveOutlined,
    CheckCircleOutlined,
    LaptopOutlined,
    ToolOutlined,
    FileTextOutlined,
    HistoryOutlined,
    LockOutlined,
    RiseOutlined
} from "@ant-design/icons";
import type { ChecklistKey, ChecklistState } from "../../../config/checklistTypes";
import type { ChecklistTabProps } from "../types";

const DEFAULT_CHECKLIST: ChecklistState = {
    levantamientoEquipos: false,
    inventarioSoftware: false,
    soporteComputacional: false,
    sitiosWeb: false,
    visitasPresenciales: false,
    contratoFirmado: false,
    facturasArchivadas: false,
    historialIncidencias: false,
    reunionesRevision: false,
    registroAccesos: false,
    metasDigitales: false,
    planAccion: false
};

const API_URL =
    (import.meta as ImportMeta).env?.VITE_API_URL ||
    "http://localhost:4000/api";

// Definición completa de todas las secciones y ítems
const CHECKLIST_SECTIONS = [
    {
        title: "Infraestructura tecnológica",
        icon: <LaptopOutlined />,
        items: [
            {
                key: "levantamientoEquipos" as ChecklistKey,
                label: "Levantamiento de equipos"
            },
            {
                key: "inventarioSoftware" as ChecklistKey,
                label: "Inventario de software con licencias"
            }
        ]
    },
    {
        title: "Servicios contratados con RIDS",
        icon: <ToolOutlined />,
        items: [
            {
                key: "soporteComputacional" as ChecklistKey,
                label: "Soporte computacional"
            },
            {
                key: "sitiosWeb" as ChecklistKey,
                label: "Sitios web / hosting / dominio"
            },
            {
                key: "visitasPresenciales" as ChecklistKey,
                label: "Visitas presenciales"
            }
        ]
    },
    {
        title: "Documentación",
        icon: <FileTextOutlined />,
        items: [
            {
                key: "contratoFirmado" as ChecklistKey,
                label: "Contrato firmado"
            },
            {
                key: "facturasArchivadas" as ChecklistKey,
                label: "Facturas y cotizaciones archivadas"
            }
        ]
    },
    {
        title: "Soporte y seguimiento",
        icon: <HistoryOutlined />,
        items: [
            {
                key: "historialIncidencias" as ChecklistKey,
                label: "Registrar historial de incidencias"
            },
            {
                key: "reunionesRevision" as ChecklistKey,
                label: "Periodicidad de reuniones"
            }
        ]
    },
    {
        title: "Accesos y credenciales",
        icon: <LockOutlined />,
        items: [
            {
                key: "registroAccesos" as ChecklistKey,
                label: "Registro seguro de accesos"
            }
        ]
    },
    {
        title: "Planificación y mejoras",
        icon: <RiseOutlined />,
        items: [
            {
                key: "metasDigitales" as ChecklistKey,
                label: "Definir metas digitales"
            },
            {
                key: "planAccion" as ChecklistKey,
                label: "Plan de acción trimestral/semestral"
            }
        ]
    }
];

const ChecklistTab: React.FC<ChecklistTabProps> = ({
    empresaId,
    checklist,
    onUpdated
}) => {
    const [state, setState] = useState<ChecklistState>(DEFAULT_CHECKLIST);
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        setState({
            ...DEFAULT_CHECKLIST,
            ...(checklist ?? {})
        });
        setHasChanges(false);
    }, [checklist, empresaId]);

    const toggle = (key: ChecklistKey, value: boolean) => {
        setState((prev) => ({
            ...prev,
            [key]: value
        }));
        setHasChanges(true);
    };

    const onSave = async () => {
        try {
            setSaving(true);

            const res = await fetch(
                `${API_URL}/ficha-empresa/${empresaId}/checklist`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(state),
                }
            );

            if (!res.ok) {
                throw new Error();
            }

            message.success("Checklist guardado correctamente");
            setHasChanges(false);

            onUpdated?.(); // 🔥 CLAVE
        } catch {
            message.error("No se pudo guardar el checklist");
        } finally {
            setSaving(false);
        }
    };

    // Calcular estadísticas simples
    const totalItems = Object.keys(state).length;
    const completedItems = Object.values(state).filter(Boolean).length;

    // Función para renderizar una sección completa
    const renderSection = (section: typeof CHECKLIST_SECTIONS[0]) => {
        return (
            <div key={section.title} className="mb-6">
                <Divider orientation="left" className="text-sm font-medium">
                    <div className="flex items-center">
                        {section.icon}
                        <span className="ml-2">{section.title}</span>
                    </div>
                </Divider>
                <div className="space-y-2 ml-4">
                    {section.items.map(item => {
                        const isChecked = state[item.key];

                        return (
                            <div
                                key={item.key}
                                className={`flex items-start p-2 rounded transition-colors ${isChecked ? 'bg-green-50' : 'hover:bg-gray-50'
                                    }`}
                            >
                                <Checkbox
                                    checked={isChecked}
                                    onChange={(e) => toggle(item.key, e.target.checked)}
                                    className={`w-full ${isChecked ? 'text-green-700' : 'text-gray-700'}`}
                                >
                                    {item.label}
                                </Checkbox>
                                {isChecked && (
                                    <CheckCircleOutlined className="text-green-500 ml-2" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <Card
            title="Checklist de Empresa"
            className="shadow-sm"
        >
            {/* Renderizar todas las secciones */}
            {CHECKLIST_SECTIONS.map(renderSection)}

            {/* Botón Guardar */}
            <div className="mt-8 pt-4 border-t">
                <Row gutter={16} align="middle">
                    <Col flex="auto">
                        <div className="text-gray-500 text-sm">
                            {hasChanges ? (
                                <span className="text-orange-500">Tienes cambios sin guardar</span>
                            ) : completedItems === totalItems ? (
                                <span className="text-green-500">✓ Checklist completo</span>
                            ) : (
                                <span>
                                    {completedItems} de {totalItems} tareas completadas
                                </span>
                            )}
                        </div>
                    </Col>
                    <Col>
                        <Tooltip title={hasChanges ? "Guardar cambios realizados" : "No hay cambios para guardar"}>
                            <Button
                                type="primary"
                                icon={<SaveOutlined />}
                                loading={saving}
                                onClick={onSave}
                                size="large"
                                disabled={!hasChanges}
                                className={hasChanges ? "bg-blue-500 hover:bg-blue-600" : ""}
                            >
                                Guardar checklist
                            </Button>
                        </Tooltip>
                    </Col>
                </Row>
            </div>
        </Card>
    );
};

export default ChecklistTab;