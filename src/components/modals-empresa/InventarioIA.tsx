import { useState } from "react";
import { Card, Button, Spin, Alert } from "antd";
import { RobotOutlined } from "@ant-design/icons";
import { http } from "../../service/http";

export default function InventarioIA({ empresaId }: { empresaId: number }) {
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<any>(null);

    const analizar = async () => {
        setLoading(true);

        try {
            const res = await http.get(`/ia-inventario/${empresaId}`);
            setData(res.data.analisis);
        } catch {
            alert("Error analizando inventario");
        }

        setLoading(false);
    };

    return (
        <div className="space-y-4">
            <Button type="primary" icon={<RobotOutlined />} onClick={analizar}>
                Analizar inventario con IA
            </Button>

            {loading && <Spin />}

            {data && (
                <>
                    <Card title="Resumen">{data.resumen}</Card>

                    <Card title="Hallazgos">
                        {data.hallazgos.map((h: any, i: number) => (
                            <Alert
                                key={i}
                                type={
                                    h.severidad === "ALTA"
                                        ? "error"
                                        : h.severidad === "MEDIA"
                                            ? "warning"
                                            : "info"
                                }
                                message={h.descripcion}
                                showIcon
                                style={{ marginBottom: 8 }}
                            />
                        ))}
                    </Card>

                    <Card title="Recomendaciones">
                        <ul>
                            {data.recomendaciones.map((r: string, i: number) => (
                                <li key={i}>{r}</li>
                            ))}
                        </ul>
                    </Card>
                </>
            )}
        </div>
    );
}