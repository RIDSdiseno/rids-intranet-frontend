import { useEffect, useState } from "react";
import { Card, InputNumber, Button, message, Tag, Spin } from "antd";
import { api } from "../../../../api/api";

type SlaRow = {
    id: number;
    priority: string;
    firstResponseMinutes: number;
    resolutionMinutes: number;
};

const PRIORITY_LABELS: Record<string, string> = {
    LOW: "Baja",
    NORMAL: "Media",
    HIGH: "Alta",
    URGENT: "Urgente",
};

const PRIORITY_COLORS: Record<string, string> = {
    LOW: "green",
    NORMAL: "blue",
    HIGH: "orange",
    URGENT: "red",
};

function minutesToLabel(min: number): string {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function SlaConfigEditor() {
    const [configs, setConfigs] = useState<SlaRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    // Form local por prioridad
    const [form, setForm] = useState<Record<string, {
        firstResponseMinutes: number;
        resolutionMinutes: number;
    }>>({});

    async function load() {
        setLoading(true);
        try {
            const { data } = await api.get("/helpdesk/tickets/sla-config");
            if (data?.ok) {
                setConfigs(data.data);
                // Inicializar form con valores actuales
                const initial: typeof form = {};
                data.data.forEach((r: SlaRow) => {
                    initial[r.priority] = {
                        firstResponseMinutes: r.firstResponseMinutes,
                        resolutionMinutes: r.resolutionMinutes,
                    };
                });
                setForm(initial);
            }
        } catch {
            message.error("No se pudo cargar la configuración SLA");
        } finally {
            setLoading(false);
        }
    }

    async function save(priority: string) {
        const values = form[priority];
        if (!values) return;

        if (values.firstResponseMinutes > values.resolutionMinutes) {
            message.warning("El tiempo de 1ra respuesta no puede ser mayor al de resolución");
            return;
        }

        setSaving(priority);
        try {
            await api.patch(`/helpdesk/tickets/sla-config/${priority}`, values);
            message.success(`SLA ${PRIORITY_LABELS[priority]} actualizado`);
            await load();
        } catch (e: any) {
            message.error(e?.response?.data?.error || "Error al guardar");
        } finally {
            setSaving(null);
        }
    }

    useEffect(() => { void load(); }, []);

    if (loading) {
        return (
            <div className="py-12 flex justify-center">
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-semibold text-gray-800">
                    Configuración de SLA
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                    Define los tiempos máximos de primera respuesta y resolución por prioridad.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {configs.map((row) => {
                    const values = form[row.priority];
                    const changed =
                        values?.firstResponseMinutes !== row.firstResponseMinutes ||
                        values?.resolutionMinutes !== row.resolutionMinutes;

                    return (
                        <Card
                            key={row.priority}
                            className="rounded-2xl shadow-sm"
                            styles={{ body: { padding: 20 } }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Tag color={PRIORITY_COLORS[row.priority]}>
                                        {PRIORITY_LABELS[row.priority]}
                                    </Tag>
                                    {changed && (
                                        <span className="text-xs text-amber-500 font-medium">
                                            Sin guardar
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                {/* Primera respuesta */}
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">
                                        Tiempo de 1ra respuesta
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <InputNumber
                                            min={1}
                                            max={1440}
                                            value={values?.firstResponseMinutes}
                                            onChange={(v) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    [row.priority]: {
                                                        ...prev[row.priority],
                                                        firstResponseMinutes: v ?? 1,
                                                    },
                                                }))
                                            }
                                            addonAfter="min"
                                            style={{ width: 140 }}
                                        />
                                        <span className="text-xs text-gray-400">
                                            = {minutesToLabel(values?.firstResponseMinutes ?? 0)}
                                        </span>
                                    </div>
                                </div>

                                {/* Resolución */}
                                <div>
                                    <label className="text-xs text-gray-500 block mb-1">
                                        Tiempo de resolución
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <InputNumber
                                            min={1}
                                            max={10080}
                                            value={values?.resolutionMinutes}
                                            onChange={(v) =>
                                                setForm((prev) => ({
                                                    ...prev,
                                                    [row.priority]: {
                                                        ...prev[row.priority],
                                                        resolutionMinutes: v ?? 1,
                                                    },
                                                }))
                                            }
                                            addonAfter="min"
                                            style={{ width: 140 }}
                                        />
                                        <span className="text-xs text-gray-400">
                                            = {minutesToLabel(values?.resolutionMinutes ?? 0)}
                                        </span>
                                    </div>
                                </div>

                                {/* Validación visual */}
                                {values?.firstResponseMinutes > values?.resolutionMinutes && (
                                    <div className="text-xs text-red-500">
                                        ⚠ La 1ra respuesta no puede ser mayor a la resolución
                                    </div>
                                )}

                                <Button
                                    type="primary"
                                    loading={saving === row.priority}
                                    disabled={
                                        !changed ||
                                        values?.firstResponseMinutes > values?.resolutionMinutes
                                    }
                                    onClick={() => save(row.priority)}
                                    block
                                >
                                    Guardar cambios
                                </Button>
                            </div>
                        </Card>
                    );
                })}
            </div>

            <Card className="rounded-xl" styles={{ body: { padding: "12px 16px" } }}>
                <p className="text-xs text-gray-400 m-0">
                    Los cambios aplican a tickets nuevos. Los tickets existentes mantienen
                    los tiempos SLA calculados al momento de su creación.
                </p>
            </Card>
        </div>
    );
}