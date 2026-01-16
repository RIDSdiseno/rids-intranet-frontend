import React, { useEffect, useState } from "react";
import { Card, Checkbox, Button, message } from "antd";
import { checklistConfig } from "../../../config/checklistConfig";
import type { ChecklistKey, ChecklistState } from "../../../config/checklistTypes";

import type {
    ChecklistTabProps,
} from "../types";


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

const ChecklistTab: React.FC<ChecklistTabProps> = ({
    empresaId,
    checklist,
}) => {
    const [state, setState] = useState<ChecklistState>(DEFAULT_CHECKLIST);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setState({
            ...DEFAULT_CHECKLIST,
            ...(checklist ?? {})
        });
    }, [checklist, empresaId]);

    const toggle = (key: ChecklistKey, value: boolean) => {
        setState((prev) => ({
            ...prev,
            [key]: value
        }));
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

            message.success("Checklist actualizado correctamente");
        } catch {
            message.error("No se pudo guardar el checklist");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {checklistConfig.map((section) => (
                <Card
                    key={section.section}
                    title={section.section}
                    size="small"
                >
                    {section.items.map((item) => (
                        <div key={item.key} className="mb-2">
                            <Checkbox
                                checked={state[item.key]}
                                onChange={(e) =>
                                    toggle(item.key, e.target.checked)
                                }
                            >
                                {item.label}
                            </Checkbox>
                        </div>
                    ))}
                </Card>
            ))}

            <div className="flex justify-end">
                <Button
                    type="primary"
                    loading={saving}
                    onClick={onSave}
                >
                    Guardar checklist
                </Button>
            </div>
        </div>
    );
};

export default ChecklistTab;
