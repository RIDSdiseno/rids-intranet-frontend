import { useEffect, useMemo, useState } from "react";
import {
    Table,
    Tag,
    Spin,
    Empty,
    Select,
    Input,
    DatePicker,
    Row,
    Col,
    Space,
    Button,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { http } from "../../../service/http"; 
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

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
    "actualizadaEn",
    "createdAt",
    "id_equipo",
    //"idSolicitante",
    "empresaId",
    "empresa_id",
    "id",
];
const FIELD_LABELS: Record<string, string> = {
    id_solicitante: "ID Solicitante",
    nombreSolicitante: "Solicitante", // <--- Para que se vea bonito
    // Puedes agregar más aquí si otros campos salen raros
};

const ACTION_LABELS: Record<string, string> = {
    CREATE: "CREADO",
    UPDATE: "ACTUALIZADO",
    DELETE: "ELIMINADO",
};

const ENTITY_LABELS: Record<string, string> = {
    Empresa: "Empresa",
    DetalleEmpresa: "Detalle Empresa",
    FichaEmpresa: "Ficha Empresa",
    FichaTecnicaEmpresa: "Ficha Técnica",
    ChecklistGestionEmpresa: "Checklist",
    Sucursal: "Sucursal",
    ResponsableSucursal: "Responsable Sucursal",
    ContactoEmpresa: "Contacto",
    EmpresaISP: "ISP / Conectividad",
    RedSucursal: "Red Sucursal",
    AccesoRouterSucursal: "Acceso Router",
    Servidor: "Servidor",
    ServidorUsuario: "Usuario Servidor",
    Equipo: "Equipo",
    Solicitante: "Solicitante",
    Visita: "Visita",
    Historial: "Historial",
    MantencionRemota: "Mantención Remota",
};

// 1. Formateador de nombres de campo (limpio)
const formatFieldName = (field: string) => {
    // Primero, revisamos si existe en nuestro diccionario de etiquetas
    if (FIELD_LABELS[field]) return FIELD_LABELS[field];

    // Si no está en el diccionario, aplicamos el formato automático
    return field
        .replace(/([A-Z])/g, " $1") // Separa CamelCase
        .replace(/_/g, " ")        // Reemplaza guiones bajos por espacios
        .replace(/^./, (str) => str.toUpperCase()); // Capitaliza la primera letra
};

// 2. Lógica común para mostrar cambios
const renderChangeValue = (key: string, value: any, action: string) => {
    const label = formatFieldName(key);
    
    // Caso especial: UPDATE con objeto {before, after}
    if (action === "UPDATE" && value && typeof value === "object" && "before" in value && "after" in value) {
        return (
            <div key={key}>
                <b>{label}</b>: {String(value.before ?? "-")} → {String(value.after ?? "-")}
            </div>
        );
    }
    
    // Caso estándar: CREATE, DELETE o valores simples
    return (
        <div key={key}>
            <b>{label}</b>: {String(value ?? "-")}
        </div>
    );
};

// 3. Función simplificada para la tabla
const formatChanges = (changes: any, action: string) => {
    if (!changes) return "-";
    const entries = Object.entries(changes).filter(([key]) => !IGNORED_FIELDS.includes(key));
    if (!entries.length) return "-";

    return <div>{entries.map(([key, val]) => renderChangeValue(key, val, action))}</div>;
};

// 4. Función simplificada para el detalle expandible
const renderFullDetails = (row: AuditRow) => {
    if (!row.changes) return "Sin detalles";
    
    // Si es DELETE, filtramos lo que venga en cambios
    const entries = Object.entries(row.changes).filter(([key]) => !IGNORED_FIELDS.includes(key));
    
    if (!entries.length) return "Sin cambios registrados";

    return (
        <div>
            <h4>Detalle de {ACTION_LABELS[row.action] ?? row.action}:</h4>
            {entries.map(([key, val]) => renderChangeValue(key, val, row.action))}
        </div>
    );
};

export default function EntityAuditTab({ endpoint }: Props) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AuditRow[]>([]);
    const [total, setTotal] = useState(0);

    const [filters, setFilters] = useState({
        entity: undefined as string | undefined,
        action: undefined as string | undefined,
        search: "",
        from: undefined as string | undefined,
        to: undefined as string | undefined,
        page: 1,
        limit: 50,
    });

    const hasActiveFilters = useMemo(() => {
        return !!(
            filters.entity ||
            filters.action ||
            (filters.search && filters.search.trim()) ||
            (filters.from && filters.to)
        );
    }, [filters]);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [endpoint, filters]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // ⚠️ IMPORTANTE: no enviar strings vacíos
            const params: any = {
                ...filters,
                search: filters.search?.trim() || undefined,
            };

            const res = await http.get(endpoint, {
                params,
                headers: { "Cache-Control": "no-cache" },
            });

            setData(res.data.data || []);
            setTotal(res.data.total || 0);
        } catch (error) {
            console.error("Error cargando historial:", error);
        } finally {
            setLoading(false);
        }
    };

    const clearAllFilters = () => {
        setFilters((f) => ({
            ...f,
            entity: undefined,
            action: undefined,
            search: "",
            from: undefined,
            to: undefined,
            page: 1,
        }));
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
            render: (entity: string) => <Tag>{ENTITY_LABELS[entity] ?? entity}</Tag>,
            width: 150,
        },
        {
            title: "Usuario",
            render: (_, row) => row.actor?.nombre || <Tag color="default">Sistema</Tag>,
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

                return (
                    <Tag color={color}>
                        {ACTION_LABELS[action] ?? action}
                    </Tag>
                );
            },
            width: 120,
        },
        {
            title: "Cambios",
            dataIndex: "changes",
            render: (changes: any, row) => formatChanges(changes, row.action),
        },
    ];

    if (loading) return <Spin />;

    return (
        <>
            {/* 🔎 FILTROS */}
            <Row gutter={12} style={{ marginBottom: 10 }}>
                <Col>
                    <Select
                        placeholder="Entidad"
                        allowClear
                        value={filters.entity}
                        style={{ width: 180 }}
                        onChange={(value) => setFilters((f) => ({ ...f, entity: value, page: 1 }))}
                    >
                        {Object.keys(ENTITY_LABELS).map((key) => (
                            <Select.Option key={key} value={key}>
                                {ENTITY_LABELS[key]}
                            </Select.Option>
                        ))}
                    </Select>
                </Col>

                <Col>
                    <Select
                        placeholder="Acción"
                        allowClear
                        value={filters.action}
                        style={{ width: 150 }}
                        onChange={(value) => setFilters((f) => ({ ...f, action: value, page: 1 }))}
                    >
                        <Select.Option value="CREATE">Crear</Select.Option>
                        <Select.Option value="UPDATE">Actualizar</Select.Option>
                        <Select.Option value="DELETE">Eliminar</Select.Option>
                    </Select>
                </Col>

                <Col>
                    <Input
                        placeholder="Buscar en cambios..."
                        allowClear
                        value={filters.search}
                        style={{ width: 250 }}
                        onChange={(e) =>
                            setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))
                        }
                        onPressEnter={(e) => {
                            const v = (e.target as HTMLInputElement).value;
                            setFilters((f) => ({ ...f, search: v, page: 1 }));
                        }}
                    />
                </Col>

                <Col>
                    <RangePicker
                        value={
                            filters.from && filters.to
                                ? [dayjs(filters.from), dayjs(filters.to)]
                                : undefined
                        }
                        onChange={(dates) =>
                            setFilters((f) => ({
                                ...f,
                                from: dates?.[0]?.toISOString(),
                                to: dates?.[1]?.toISOString(),
                                page: 1,
                            }))
                        }
                    />
                </Col>

                <Col>
                    <Button disabled={!hasActiveFilters} onClick={clearAllFilters}>
                        Limpiar todo
                    </Button>
                </Col>
            </Row>

            {/* 🏷️ CHIPS FILTROS ACTIVOS */}
            {hasActiveFilters && (
                <div style={{ marginBottom: 12 }}>
                    <Space size={[8, 8]} wrap>
                        {filters.entity && (
                            <Tag
                                closable
                                onClose={(e) => {
                                    e.preventDefault();
                                    setFilters((f) => ({ ...f, entity: undefined, page: 1 }));
                                }}
                            >
                                Entidad: {ENTITY_LABELS[filters.entity] ?? filters.entity}
                            </Tag>
                        )}

                        {filters.action && (
                            <Tag
                                closable
                                onClose={(e) => {
                                    e.preventDefault();
                                    setFilters((f) => ({ ...f, action: undefined, page: 1 }));
                                }}
                            >
                                Acción: {filters.action}
                            </Tag>
                        )}

                        {filters.search?.trim() && (
                            <Tag
                                closable
                                onClose={(e) => {
                                    e.preventDefault();
                                    setFilters((f) => ({ ...f, search: "", page: 1 }));
                                }}
                            >
                                Buscar: {filters.search.trim()}
                            </Tag>
                        )}

                        {filters.from && filters.to && (
                            <Tag
                                closable
                                onClose={(e) => {
                                    e.preventDefault();
                                    setFilters((f) => ({ ...f, from: undefined, to: undefined, page: 1 }));
                                }}
                            >
                                Fecha: {dayjs(filters.from).format("DD-MM-YYYY")} →{" "}
                                {dayjs(filters.to).format("DD-MM-YYYY")}
                            </Tag>
                        )}
                    </Space>
                </div>
            )}

            {/* 📄 TABLA */}
            {!data.length ? (
                <Empty description="Sin historial" />
            ) : (
                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={data}
                    size="small"
                    pagination={{
                        current: filters.page,
                        pageSize: filters.limit,
                        total,
                        showSizeChanger: true,
                        pageSizeOptions: [20, 50, 100, 200],
                        onChange: (page, pageSize) =>
                            setFilters((f) => ({
                                ...f,
                                page,
                                limit: pageSize ?? f.limit,
                            })),
                    }}
                    expandable={{
                        expandedRowRender: (record) => (
                            <div style={{ padding: "12px 24px" }}>{renderFullDetails(record)}</div>
                        ),
                    }}
                />
            )}
        </>
    );
}