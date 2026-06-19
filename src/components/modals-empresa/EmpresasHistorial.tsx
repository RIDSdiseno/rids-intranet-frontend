// src/components/modals-empresa/EmpresasHistorial.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
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
    Card,
    Pagination,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { http } from "../../service/http";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

type AuditAction = "CREATE" | "UPDATE" | "DELETE";

interface AuditRow {
    id: number;
    entity: string;
    entityId: string;
    action: AuditAction;
    changes: any;
    createdAt: string;
    empresaId?: number | null;
    empresa?: {
        id_empresa: number;
        nombre: string;
    } | null;
    actor?: {
        id_tecnico: number;
        nombre: string;
        email: string;
    } | null;
}

interface Props {
    endpoint?: string;
    empresaIdInicial?: number | null;
}

const IGNORED_FIELDS = [
    "updatedAt",
    "actualizadaEn",
    "createdAt",
    "id_equipo",
    "empresaId",
    "empresa_id",
    "id",
];

const FIELD_LABELS: Record<string, string> = {
    id_solicitante: "ID Solicitante",
    nombreSolicitante: "Solicitante",
    rut: "RUT",
    email: "Email",
    telefono: "Teléfono",
    nombre: "Nombre",
    razonSocial: "Razón social",
    nombreFantasia: "Nombre fantasía",
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
    DetalleEquipo: "Detalle Equipo",
    Solicitante: "Solicitante",
    Visita: "Visita",
    Historial: "Historial",
    MantencionRemota: "Mantención Remota",
};

const formatFieldName = (field: string) => {
    if (FIELD_LABELS[field]) return FIELD_LABELS[field];

    return field
        .replace(/([A-Z])/g, " $1")
        .replace(/_/g, " ")
        .replace(/^./, (str) => str.toUpperCase());
};

const getActionColor = (action: string) => {
    if (action === "CREATE") return "green";
    if (action === "UPDATE") return "blue";
    if (action === "DELETE") return "red";
    return "default";
};

const formatDateTime = (date: string) =>
    new Date(date).toLocaleString("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    });

const renderValueText = (value: any) => {
    if (value === null || value === undefined || value === "") return "-";

    if (typeof value === "object") {
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }

    return String(value);
};

const renderChangeValue = (key: string, value: any, action: string) => {
    const label = formatFieldName(key);

    if (
        action === "UPDATE" &&
        value &&
        typeof value === "object" &&
        "before" in value &&
        "after" in value
    ) {
        return (
            <div
                key={key}
                className="mb-1 break-words text-xs leading-5 text-slate-700 sm:text-sm"
            >
                <b>{label}</b>:{" "}
                <span className="text-slate-500">
                    {renderValueText(value.before)}
                </span>{" "}
                <span className="text-slate-400">→</span>{" "}
                <span className="text-slate-900">
                    {renderValueText(value.after)}
                </span>
            </div>
        );
    }

    return (
        <div
            key={key}
            className="mb-1 break-words text-xs leading-5 text-slate-700 sm:text-sm"
        >
            <b>{label}</b>: {renderValueText(value)}
        </div>
    );
};

const formatChanges = (changes: any, action: string) => {
    if (!changes) return <span className="text-slate-400">-</span>;

    const entries = Object.entries(changes).filter(
        ([key]) => !IGNORED_FIELDS.includes(key)
    );

    if (!entries.length) return <span className="text-slate-400">-</span>;

    return (
        <div className="max-w-full space-y-1 break-words">
            {entries.map(([key, val]) => renderChangeValue(key, val, action))}
        </div>
    );
};

const renderFullDetails = (row: AuditRow) => {
    if (!row.changes) return <span className="text-slate-500">Sin detalles</span>;

    const entries = Object.entries(row.changes).filter(
        ([key]) => !IGNORED_FIELDS.includes(key)
    );

    if (!entries.length) {
        return <span className="text-slate-500">Sin cambios registrados</span>;
    }

    return (
        <div className="max-w-full overflow-hidden">
            <h4 className="mb-3 text-sm font-semibold text-slate-800">
                Detalle de {ACTION_LABELS[row.action] ?? row.action}
            </h4>

            <div className="space-y-1">
                {entries.map(([key, val]) => renderChangeValue(key, val, row.action))}
            </div>
        </div>
    );
};

export default function EmpresasHistorial({
    endpoint = "/audit/empresas",
    empresaIdInicial = null,
}: Props) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<AuditRow[]>([]);
    const [total, setTotal] = useState(0);

    const [filters, setFilters] = useState({
        entity: undefined as string | undefined,
        action: undefined as string | undefined,
        search: "",
        from: undefined as string | undefined,
        to: undefined as string | undefined,
        empresaId: undefined as number | undefined,
        page: 1,
        limit: 50,
    });

    const [empresas, setEmpresas] = useState<
        Array<{ id_empresa: number; nombre: string }>
    >([]);

    useEffect(() => {
        setFilters((f) => ({
            ...f,
            empresaId: empresaIdInicial ?? undefined,
            page: 1,
        }));
    }, [empresaIdInicial]);

    const hasActiveFilters = useMemo(() => {
        return !!(
            filters.entity ||
            filters.action ||
            filters.empresaId ||
            (filters.search && filters.search.trim()) ||
            (filters.from && filters.to)
        );
    }, [filters]);

    const empresaOptions = useMemo(
        () =>
            empresas.map((empresa) => ({
                value: empresa.id_empresa,
                label: empresa.nombre,
            })),
        [empresas]
    );

    const entityOptions = useMemo(
        () =>
            Object.keys(ENTITY_LABELS).map((key) => ({
                value: key,
                label: ENTITY_LABELS[key],
            })),
        []
    );

    const actionOptions = useMemo(
        () => [
            { value: "CREATE", label: "Crear" },
            { value: "UPDATE", label: "Actualizar" },
            { value: "DELETE", label: "Eliminar" },
        ],
        []
    );

    const fetchEmpresas = useCallback(async () => {
        try {
            const res = await http.get("/empresas", {
                params: {
                    page: 1,
                    pageSize: 1000,
                },
            });

            setEmpresas(res.data.data ?? res.data.items ?? []);
        } catch (error) {
            console.error("Error cargando empresas:", error);
            setEmpresas([]);
        }
    }, []);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            const params: any = {
                ...filters,
                search: filters.search?.trim() || undefined,
                empresaId: filters.empresaId || undefined,
                entity: filters.entity || undefined,
                action: filters.action || undefined,
                from: filters.from || undefined,
                to: filters.to || undefined,
            };

            const res = await http.get(endpoint, {
                params,
                headers: { "Cache-Control": "no-cache" },
            });

            setData(res.data.data || []);
            setTotal(res.data.total || 0);
        } catch (error) {
            console.error("Error cargando historial de empresas:", error);
            setData([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [endpoint, filters]);

    useEffect(() => {
        void fetchEmpresas();
    }, [fetchEmpresas]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const clearAllFilters = () => {
        setFilters((f) => ({
            ...f,
            entity: undefined,
            action: undefined,
            search: "",
            from: undefined,
            to: undefined,
            empresaId: empresaIdInicial ?? undefined,
            page: 1,
        }));
    };

    const columns: ColumnsType<AuditRow> = [
        {
            title: "Fecha",
            dataIndex: "createdAt",
            render: (date: string) => formatDateTime(date),
            width: 190,
            fixed: "left",
        },
        {
            title: "Empresa",
            render: (_, row) =>
                row.empresa?.nombre ? (
                    <span className="break-words text-slate-700">
                        {row.empresa.nombre}
                    </span>
                ) : (
                    <Tag color="default">Sin empresa</Tag>
                ),
            width: 210,
        },
        {
            title: "Entidad",
            dataIndex: "entity",
            render: (entity: string) => <Tag>{ENTITY_LABELS[entity] ?? entity}</Tag>,
            width: 170,
        },
        {
            title: "Usuario",
            render: (_, row) =>
                row.actor?.nombre ? (
                    <span className="break-words">{row.actor.nombre}</span>
                ) : (
                    <Tag color="default">Sistema</Tag>
                ),
            width: 170,
        },
        {
            title: "Acción",
            dataIndex: "action",
            render: (action: string) => (
                <Tag color={getActionColor(action)}>
                    {ACTION_LABELS[action] ?? action}
                </Tag>
            ),
            width: 130,
        },
        {
            title: "Cambios",
            dataIndex: "changes",
            render: (changes: any, row) => formatChanges(changes, row.action),
            width: 420,
        },
    ];

    const empresaSeleccionadaNombre =
        empresas.find((e) => e.id_empresa === filters.empresaId)?.nombre ??
        filters.empresaId;

    return (
        <div className="w-full max-w-full overflow-hidden">
            <div className="mb-4">
                <h2 className="mb-1 text-base font-semibold text-slate-800 sm:text-lg">
                    Historial general
                </h2>

                <p className="m-0 text-xs leading-5 text-slate-500 sm:text-sm">
                    Revisa los cambios registrados sobre empresas, sucursales,
                    contactos, solicitantes, equipos y otros datos relacionados.
                </p>
            </div>

            <Card className="mb-3">
                <Row gutter={[12, 12]} align="middle">
                    <Col xs={24} sm={12} md={8} lg={6} xl={5}>
                        <Select
                            placeholder="Empresa"
                            allowClear
                            showSearch
                            value={filters.empresaId}
                            options={empresaOptions}
                            style={{ width: "100%" }}
                            optionFilterProp="label"
                            onChange={(value) =>
                                setFilters((f) => ({
                                    ...f,
                                    empresaId: value,
                                    page: 1,
                                }))
                            }
                        />
                    </Col>

                    <Col xs={24} sm={12} md={8} lg={5} xl={4}>
                        <Select
                            placeholder="Entidad"
                            allowClear
                            showSearch
                            value={filters.entity}
                            options={entityOptions}
                            style={{ width: "100%" }}
                            optionFilterProp="label"
                            onChange={(value) =>
                                setFilters((f) => ({
                                    ...f,
                                    entity: value,
                                    page: 1,
                                }))
                            }
                        />
                    </Col>

                    <Col xs={24} sm={12} md={8} lg={4} xl={3}>
                        <Select
                            placeholder="Acción"
                            allowClear
                            value={filters.action}
                            options={actionOptions}
                            style={{ width: "100%" }}
                            onChange={(value) =>
                                setFilters((f) => ({
                                    ...f,
                                    action: value,
                                    page: 1,
                                }))
                            }
                        />
                    </Col>

                    <Col xs={24} sm={12} md={12} lg={6} xl={5}>
                        <Input
                            placeholder="Buscar en cambios..."
                            allowClear
                            value={filters.search}
                            style={{ width: "100%" }}
                            onChange={(e) =>
                                setFilters((f) => ({
                                    ...f,
                                    search: e.target.value,
                                    page: 1,
                                }))
                            }
                        />
                    </Col>

                    <Col xs={24} sm={16} md={12} lg={7} xl={5}>
                        <RangePicker
                            style={{ width: "100%" }}
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

                    <Col xs={24} sm={8} md={6} lg={3} xl={2}>
                        <Button
                            disabled={!hasActiveFilters}
                            onClick={clearAllFilters}
                            block
                        >
                            Limpiar
                        </Button>
                    </Col>
                </Row>
            </Card>

            {hasActiveFilters && (
                <div className="mb-3 max-w-full overflow-hidden">
                    <Space size={[8, 8]} wrap>
                        {filters.empresaId && (
                            <Tag
                                closable
                                onClose={(e) => {
                                    e.preventDefault();
                                    setFilters((f) => ({
                                        ...f,
                                        empresaId: empresaIdInicial ?? undefined,
                                        page: 1,
                                    }));
                                }}
                            >
                                Empresa: {empresaSeleccionadaNombre}
                            </Tag>
                        )}

                        {filters.entity && (
                            <Tag
                                closable
                                onClose={(e) => {
                                    e.preventDefault();
                                    setFilters((f) => ({
                                        ...f,
                                        entity: undefined,
                                        page: 1,
                                    }));
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
                                    setFilters((f) => ({
                                        ...f,
                                        action: undefined,
                                        page: 1,
                                    }));
                                }}
                            >
                                Acción: {ACTION_LABELS[filters.action] ?? filters.action}
                            </Tag>
                        )}

                        {filters.search?.trim() && (
                            <Tag
                                closable
                                onClose={(e) => {
                                    e.preventDefault();
                                    setFilters((f) => ({
                                        ...f,
                                        search: "",
                                        page: 1,
                                    }));
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
                                    setFilters((f) => ({
                                        ...f,
                                        from: undefined,
                                        to: undefined,
                                        page: 1,
                                    }));
                                }}
                            >
                                Fecha: {dayjs(filters.from).format("DD-MM-YYYY")} →{" "}
                                {dayjs(filters.to).format("DD-MM-YYYY")}
                            </Tag>
                        )}
                    </Space>
                </div>
            )}

            {loading ? (
                <Card>
                    <div className="py-10 text-center">
                        <Spin />
                    </div>
                </Card>
            ) : !data.length ? (
                <Card>
                    <Empty description="Sin historial" />
                </Card>
            ) : (
                <>
                    <div className="hidden md:block">
                        <Table
                            rowKey="id"
                            columns={columns}
                            dataSource={data}
                            size="small"
                            scroll={{ x: 1290 }}
                            pagination={{
                                current: filters.page,
                                pageSize: filters.limit,
                                total,
                                showSizeChanger: true,
                                pageSizeOptions: [20, 50, 100, 200],
                                showTotal: (t) => `Total: ${t}`,
                                onChange: (page, pageSize) =>
                                    setFilters((f) => ({
                                        ...f,
                                        page,
                                        limit: pageSize ?? f.limit,
                                    })),
                            }}
                            expandable={{
                                expandedRowRender: (record) => (
                                    <div className="max-w-full overflow-hidden px-2 py-3">
                                        {renderFullDetails(record)}
                                    </div>
                                ),
                            }}
                        />
                    </div>

                    <div className="space-y-3 md:hidden">
                        {data.map((row) => (
                            <Card
                                key={row.id}
                                size="small"
                                className="w-full overflow-hidden"
                            >
                                <div className="space-y-3">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Tag color={getActionColor(row.action)}>
                                                {ACTION_LABELS[row.action] ?? row.action}
                                            </Tag>

                                            <Tag>
                                                {ENTITY_LABELS[row.entity] ?? row.entity}
                                            </Tag>
                                        </div>

                                        <div className="text-xs text-slate-500">
                                            {formatDateTime(row.createdAt)}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-2 text-xs text-slate-600">
                                        <div>
                                            <span className="font-semibold text-slate-800">
                                                Empresa:
                                            </span>{" "}
                                            {row.empresa?.nombre ?? "Sin empresa"}
                                        </div>

                                        <div>
                                            <span className="font-semibold text-slate-800">
                                                Usuario:
                                            </span>{" "}
                                            {row.actor?.nombre ?? "Sistema"}
                                        </div>
                                    </div>

                                    <div className="rounded-lg bg-slate-50 p-3">
                                        <div className="mb-2 text-xs font-semibold text-slate-700">
                                            Cambios
                                        </div>

                                        {formatChanges(row.changes, row.action)}
                                    </div>
                                </div>
                            </Card>
                        ))}

                        <Card size="small">
                            <div className="flex flex-col items-center gap-2">
                                <Pagination
                                    simple
                                    current={filters.page}
                                    pageSize={filters.limit}
                                    total={total}
                                    onChange={(page) =>
                                        setFilters((f) => ({
                                            ...f,
                                            page,
                                        }))
                                    }
                                />

                                <span className="text-xs text-slate-500">
                                    Total: {total}
                                </span>
                            </div>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}