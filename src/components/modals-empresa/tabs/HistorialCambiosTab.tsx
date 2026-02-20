import { useEffect, useState } from "react";
import { Table, Tag, Spin, Empty } from "antd";
import type { ColumnsType } from "antd/es/table";
import { api } from "../../../api/api";

interface AuditRow {
    id: number;
    entity: string;
    entityId: string;
    action: "CREATE" | "UPDATE" | "DELETE";
    changes: any;
    createdAt: string;
    actor?: {
        id_tecnico: number;
        nombre: string;
        email: string;
    };
}

interface Props {
    endpoint: string;
}

const IGNORED_FIELDS = [
    "updatedAt",
    "createdAt",
    "id_equipo",
    "idSolicitante",
    "id",
];

const formatFieldName = (field: string) => {
    return field
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase());
};

const formatChanges = (changes: any, action: string) => {
    if (!changes) return "-";

    const entries = Object.entries(changes).filter(
        ([key]) => !IGNORED_FIELDS.includes(key)
    );

    if (!entries.length) return "-";

    if (action === "CREATE") {
        return (
            <div>
                {entries
                    .filter(([_, value]: any) => typeof value !== "object")
                    .map(([key, value]: any) => (
                        <div key={key}>
                            <b>{formatFieldName(key)}</b>: {String(value)}
                        </div>
                    ))}
            </div>
        );
    }

    if (action === "UPDATE") {
        return (
            <div>
                {entries
                    .filter(
                        ([_, value]: any) =>
                            value &&
                            typeof value === "object" &&
                            "before" in value &&
                            "after" in value
                    )
                    .map(([key, value]: any) => (
                        <div key={key}>
                            <b>{formatFieldName(key)}</b>:{" "}
                            {String(value.before ?? "-")} →{" "}
                            {String(value.after ?? "-")}
                        </div>
                    ))}
            </div>
        );
    }

    if (action === "DELETE") {
        return <Tag color="red">Registro eliminado</Tag>;
    }

    return "-";
};

const renderFullDetails = (row: AuditRow) => {
    if (!row.changes) return "Sin detalles";

    const entries = Object.entries(row.changes);

    if (!entries.length) return "Sin cambios registrados";

    if (row.action === "DELETE") {
        return (
            <div>
                <h4>Datos antes de eliminar:</h4>
                {entries.map(([key, value]: any) => (
                    <div key={key}>
                        <b>{formatFieldName(key)}</b>: {String(value)}
                    </div>
                ))}
            </div>
        );
    }

    if (row.action === "UPDATE") {
        return (
            <div>
                <h4>Campos modificados:</h4>
                {entries.map(([key, value]: any) => (
                    <div key={key}>
                        <b>{formatFieldName(key)}</b>:{" "}
                        {String(value.before ?? "-")} →{" "}
                        {String(value.after ?? "-")}
                    </div>
                ))}
            </div>
        );
    }

    if (row.action === "CREATE") {
        return (
            <div>
                <h4>Datos creados:</h4>
                {entries.map(([key, value]: any) => (
                    <div key={key}>
                        <b>{formatFieldName(key)}</b>: {String(value)}
                    </div>
                ))}
            </div>
        );
    }

    return null;
};

export default function EntityAuditTab({ endpoint }: Props) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AuditRow[]>([]);

    useEffect(() => {
        fetchData();
    }, [endpoint]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get(endpoint);
            setData(res.data.data || []);
        } catch (error) {
            console.error("Error cargando historial:", error);
        } finally {
            setLoading(false);
        }
    };

    const columns: ColumnsType<AuditRow> = [
        {
            title: "Fecha",
            dataIndex: "createdAt",
            render: (date: string) =>
                new Date(date).toLocaleString("es-CL", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: false,
                }),
            width: 200,
        },
        {
            title: "Entidad",
            dataIndex: "entity",
            render: (entity: string) => <Tag>{entity}</Tag>,
            width: 120,
        },
        {
            title: "Usuario",
            render: (_, row) =>
                row.actor?.nombre || (
                    <Tag color="default">Sistema</Tag>
                ),
            width: 160,
        },
        {
            title: "Acción",
            dataIndex: "action",
            render: (action: string) => {
                const color =
                    action === "CREATE"
                        ? "green"
                        : action === "UPDATE"
                            ? "blue"
                            : "red";
                return <Tag color={color}>{action}</Tag>;
            },
            width: 120,
        },
        {
            title: "Cambios",
            dataIndex: "changes",
            render: (changes: any, row) =>
                formatChanges(changes, row.action),
        },
    ];

    if (loading) return <Spin />;

    if (!data.length)
        return <Empty description="Sin historial" />;

    return (
        <Table
            rowKey="id"
            columns={columns}
            dataSource={data}
            pagination={false}
            size="small"
            expandable={{
                expandedRowRender: (record) => (
                    <div style={{ padding: "12px 24px" }}>
                        {renderFullDetails(record)}
                    </div>
                ),
            }}
        />
    );
}