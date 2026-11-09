// src/components/modals-leypd/LeypdEmpresaTable.tsx

import {
    CloudOutlined,
    ExportOutlined,
    EyeOutlined,
    LinkOutlined,
    SearchOutlined,
} from "@ant-design/icons";

import {
    Button,
    Card,
    Empty,
    Input,
    Progress,
    Select,
    Space,
    Table,
    Tag,
    Tooltip,
} from "antd";

import type {
    ColumnsType,
} from "antd/es/table";

import {
    useMemo,
    useState,
} from "react";

import type {
    LeypdEmpresaListado,
} from "./leypd.types";

import {
    formatLeypdDateTime,
} from "./leypd.helpers";

interface LeypdEmpresaTableProps {
    empresas:
    LeypdEmpresaListado[];

    loading?: boolean;

    /**
     * Si el usuario puede vincular carpetas
     * (ADMIN / ADMINISTRACION).
     */
    puedeVincular?: boolean;

    onOpenEmpresa:
    (
        empresa:
            LeypdEmpresaListado
    ) => void;

    onVincularSharepoint?:
    (
        empresa:
            LeypdEmpresaListado
    ) => void;
}

type EstadoFiltro =
    | "TODOS"
    | "COMPLETOS"
    | "EN_PROGRESO"
    | "SIN_INICIAR"
    | "VENCIDOS"
    | "SIN_SHAREPOINT"
    | "SHAREPOINT_FALTANTES";

/**
 * Estado SharePoint resumido para mostrar y ordenar.
 */
function estadoSharepoint(
    empresa: LeypdEmpresaListado
):
    | "NO_VINCULADA"
    | "ERROR"
    | "SIN_SINCRONIZAR"
    | "FALTANTES"
    | "COMPLETO" {
    const sp =
        empresa.sharepoint;

    if (!sp.vinculado) {
        return "NO_VINCULADA";
    }

    if (sp.ultimoError) {
        return "ERROR";
    }

    if (!sp.sincronizadoAt) {
        return "SIN_SINCRONIZAR";
    }

    if (
        sp.carpetasFaltantes > 0 ||
        sp.documentosFaltantes > 0
    ) {
        return "FALTANTES";
    }

    return "COMPLETO";
}

export default function LeypdEmpresaTable({
    empresas,
    loading = false,
    puedeVincular = false,
    onOpenEmpresa,
    onVincularSharepoint,
}: LeypdEmpresaTableProps) {
    const [
        search,
        setSearch,
    ] = useState("");

    const [
        estado,
        setEstado,
    ] = useState<EstadoFiltro>(
        "TODOS"
    );

    /* Paginación controlada: el tamaño elegido se respeta */
    const [
        page,
        setPage,
    ] = useState(1);

    const [
        pageSize,
        setPageSize,
    ] = useState(10);

    const totalVinculadas =
        useMemo(
            () =>
                empresas.filter(
                    (empresa) =>
                        empresa.sharepoint.vinculado
                ).length,
            [empresas]
        );

    const filtradas =
        useMemo(
            () => {
                const text =
                    search
                        .trim()
                        .toLowerCase();

                return empresas.filter(
                    (empresa) => {
                        const coincideTexto =
                            !text ||
                            empresa.empresaNombre
                                .toLowerCase()
                                .includes(text) ||
                            (empresa.razonSocial ?? "")
                                .toLowerCase()
                                .includes(text);

                        if (!coincideTexto) {
                            return false;
                        }

                        switch (estado) {
                            case "COMPLETOS":
                                return empresa.porcentaje === 100;

                            case "EN_PROGRESO":
                                return (
                                    empresa.porcentaje > 0 &&
                                    empresa.porcentaje < 100
                                );

                            case "SIN_INICIAR":
                                return (
                                    empresa.sinIniciar ===
                                    empresa.total
                                );

                            case "VENCIDOS":
                                return empresa.vencidos > 0;

                            case "SIN_SHAREPOINT":
                                return !empresa.sharepoint.vinculado;

                            case "SHAREPOINT_FALTANTES": {
                                const sp =
                                    estadoSharepoint(empresa);

                                return (
                                    sp === "FALTANTES" ||
                                    sp === "ERROR"
                                );
                            }

                            case "TODOS":
                            default:
                                return true;
                        }
                    }
                );
            },
            [
                empresas,
                search,
                estado,
            ]
        );

    const columns: ColumnsType<LeypdEmpresaListado> = [
        {
            title: "Empresa",
            key: "empresa",
            fixed: "left",
            width: 240,

            render: (_, empresa) => (
                <div>
                    <div className="font-semibold text-slate-800">
                        {empresa.empresaNombre}
                    </div>

                    {empresa.razonSocial &&
                        empresa.razonSocial !==
                        empresa.empresaNombre && (
                            <div className="mt-0.5 text-xs text-slate-500">
                                {empresa.razonSocial}
                            </div>
                        )}
                </div>
            ),
        },

        {
            title: "Avance",
            key: "avance",
            width: 210,

            sorter: (a, b) =>
                a.porcentaje - b.porcentaje,

            render: (_, empresa) => (
                <div className="min-w-[160px]">
                    <Progress
                        percent={empresa.porcentaje}
                        size="small"
                        status={
                            empresa.porcentaje === 100
                                ? "success"
                                : "active"
                        }
                    />

                    <div className="mt-1 text-xs text-slate-500">
                        {empresa.completados} de{" "}
                        {empresa.total} listos
                    </div>
                </div>
            ),
        },

        {
            title: "Estado",
            key: "estado",
            width: 140,

            render: (_, empresa) => {
                if (empresa.porcentaje === 100) {
                    return (
                        <Tag color="green">
                            Completo
                        </Tag>
                    );
                }

                if (
                    empresa.sinIniciar ===
                    empresa.total
                ) {
                    return (
                        <Tag>
                            Sin iniciar
                        </Tag>
                    );
                }

                return (
                    <Tag color="blue">
                        En progreso
                    </Tag>
                );
            },
        },

        {
            title: "Ficha",
            key: "ficha",
            width: 140,

            render: (_, empresa) => {
                if (empresa.ficha.respondida) {
                    return (
                        <Tag color="green">
                            Respondida
                        </Tag>
                    );
                }

                if (empresa.ficha.existe) {
                    return (
                        <Tag color="blue">
                            En preparación
                        </Tag>
                    );
                }

                return (
                    <Tag>
                        Sin ficha
                    </Tag>
                );
            },
        },

        /* =====================================================
           SHAREPOINT
        ===================================================== */

        {
            title: "SharePoint",
            key: "sharepoint",
            width: 200,

            sorter: (a, b) =>
                Number(a.sharepoint.vinculado) -
                Number(b.sharepoint.vinculado),

            render: (_, empresa) => {
                const sp =
                    empresa.sharepoint;

                const estadoSp =
                    estadoSharepoint(empresa);

                if (estadoSp === "NO_VINCULADA") {
                    return puedeVincular &&
                        onVincularSharepoint ? (
                        <Button
                            size="small"
                            icon={<LinkOutlined />}
                            onClick={() =>
                                onVincularSharepoint(
                                    empresa
                                )
                            }
                        >
                            Vincular
                        </Button>
                    ) : (
                        <Tag>
                            No vinculada
                        </Tag>
                    );
                }

                const tag =
                    estadoSp === "ERROR" ? (
                        <Tooltip
                            title={
                                sp.ultimoError ??
                                "Error de sincronización"
                            }
                        >
                            <Tag color="red">
                                Error
                            </Tag>
                        </Tooltip>
                    ) : estadoSp === "SIN_SINCRONIZAR" ? (
                        <Tag>
                            Sin sincronizar
                        </Tag>
                    ) : estadoSp === "FALTANTES" ? (
                        <Tooltip
                            title={`${sp.documentosFaltantes} documento(s) y ${sp.carpetasFaltantes} carpeta(s) faltantes. Sincronizado: ${formatLeypdDateTime(sp.sincronizadoAt)}`}
                        >
                            <Tag color="orange">
                                {sp.documentosFaltantes +
                                    sp.carpetasFaltantes}{" "}
                                faltante
                                {sp.documentosFaltantes +
                                    sp.carpetasFaltantes ===
                                    1
                                    ? ""
                                    : "s"}
                            </Tag>
                        </Tooltip>
                    ) : (
                        <Tooltip
                            title={`Sincronizado: ${formatLeypdDateTime(sp.sincronizadoAt)}`}
                        >
                            <Tag color="green">
                                Completo
                            </Tag>
                        </Tooltip>
                    );

                return (
                    <div className="flex items-center gap-1">
                        {tag}

                        {sp.carpetaWebUrl && (
                            <Tooltip title="Abrir carpeta LEYPD">
                                <Button
                                    size="small"
                                    type="text"
                                    icon={<ExportOutlined />}
                                    href={sp.carpetaWebUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                />
                            </Tooltip>
                        )}
                    </div>
                );
            },
        },

        {
            title: "Vencidos",
            dataIndex: "vencidos",
            key: "vencidos",
            width: 110,
            align: "center",

            sorter: (a, b) =>
                a.vencidos - b.vencidos,

            render: (vencidos: number) =>
                vencidos > 0 ? (
                    <Tag color="red">
                        {vencidos}
                    </Tag>
                ) : (
                    <span className="text-slate-400">
                        0
                    </span>
                ),
        },

        {
            title: "Última actualización",
            dataIndex: "ultimaActualizacion",
            key: "ultimaActualizacion",
            width: 190,

            sorter: (a, b) => {
                const aTime =
                    a.ultimaActualizacion
                        ? new Date(a.ultimaActualizacion).getTime()
                        : 0;

                const bTime =
                    b.ultimaActualizacion
                        ? new Date(b.ultimaActualizacion).getTime()
                        : 0;

                return aTime - bTime;
            },

            render: (value: string | null) => (
                <span className="text-sm text-slate-600">
                    {formatLeypdDateTime(value)}
                </span>
            ),
        },

        {
            title: "Acción",
            key: "acciones",
            width: 120,
            fixed: "right",
            align: "center",

            render: (_, empresa) => (
                <Tooltip title="Ver detalle Ley PD">
                    <Button
                        type="primary"
                        ghost
                        icon={<EyeOutlined />}
                        onClick={() =>
                            onOpenEmpresa(empresa)
                        }
                    >
                        Ver
                    </Button>
                </Tooltip>
            ),
        },
    ];

    return (
        <Card
            className="
                rounded-2xl
                border
                border-slate-200
                shadow-sm
            "
            styles={{
                body: {
                    padding: 0,
                },
            }}
        >
            <div
                className="
                    flex
                    flex-col
                    gap-3
                    border-b
                    border-slate-200
                    p-4
                    lg:flex-row
                    lg:items-center
                    lg:justify-between
                "
            >
                <div>
                    <div className="text-base font-semibold text-slate-800">
                        Empresas
                    </div>

                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-slate-500">
                        <span>
                            Seguimiento de los 13 elementos Ley PD por cliente.
                        </span>

                        {empresas.length > 0 && (
                            <span>
                                <CloudOutlined /> SharePoint vinculadas:{" "}
                                <strong>
                                    {totalVinculadas}
                                </strong>{" "}
                                de {empresas.length}
                            </span>
                        )}
                    </div>
                </div>

                <Space
                    wrap
                    className="w-full lg:w-auto"
                >
                    <Input
                        allowClear
                        prefix={<SearchOutlined />}
                        placeholder="Buscar empresa..."
                        value={search}
                        onChange={(event) => {
                            setSearch(
                                event.target.value
                            );

                            setPage(1);
                        }}
                        className="w-full sm:w-64"
                    />

                    <Select<EstadoFiltro>
                        value={estado}
                        onChange={(value) => {
                            setEstado(value);

                            setPage(1);
                        }}
                        className="w-52"
                        options={[
                            {
                                value: "TODOS",
                                label: "Todos",
                            },
                            {
                                value: "COMPLETOS",
                                label: "Completos",
                            },
                            {
                                value: "EN_PROGRESO",
                                label: "En progreso",
                            },
                            {
                                value: "SIN_INICIAR",
                                label: "Sin iniciar",
                            },
                            {
                                value: "VENCIDOS",
                                label: "Con vencidos",
                            },
                            {
                                value: "SIN_SHAREPOINT",
                                label: "Sin SharePoint",
                            },
                            {
                                value: "SHAREPOINT_FALTANTES",
                                label: "SharePoint con faltantes",
                            },
                        ]}
                    />
                </Space>
            </div>

            <Table<LeypdEmpresaListado>
                rowKey="empresaId"
                loading={loading}
                columns={columns}
                dataSource={filtradas}
                pagination={{
                    /*
                     * Si al recargar quedan menos empresas, no se queda
                     * en una página que ya no existe.
                     */
                    current: Math.min(
                        page,
                        Math.max(
                            1,
                            Math.ceil(
                                filtradas.length / pageSize
                            )
                        )
                    ),
                    pageSize,
                    showSizeChanger: true,
                    pageSizeOptions: [10, 20, 50, 100],

                    showTotal: (total, [desde, hasta]) =>
                        `${desde}-${hasta} de ${total} empresa${total === 1 ? "" : "s"}`,

                    onChange: (nuevaPagina, nuevoTamano) => {
                        if (nuevoTamano !== pageSize) {
                            setPageSize(nuevoTamano);
                            setPage(1);
                            return;
                        }

                        setPage(nuevaPagina);
                    },
                }}
                scroll={{
                    x: 1350,
                }}
                locale={{
                    emptyText: (
                        <Empty description="No se encontraron empresas" />
                    ),
                }}
            />
        </Card>
    );
}