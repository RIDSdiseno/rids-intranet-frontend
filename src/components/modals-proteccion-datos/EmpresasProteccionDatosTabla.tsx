// src/components/modals-proteccion-datos/EmpresasProteccionDatosTabla.tsx

/* =========================================================
   VISTA POR EMPRESA

   Una fila por empresa (según la empresa de cada destinatario),
   con el resumen de sus campañas. Al desplegarla se ven las
   campañas con los números de ESA empresa y sus acciones.
   ========================================================= */

import {
    useMemo,
    useState,
    type ReactNode,
} from "react";

import {
    Button,
    Empty,
    Progress,
    Table,
    Tag,
    Tooltip,
} from "antd";

import type {
    ColumnsType,
} from "antd/es/table";

import {
    Building2,
    Plus,
} from "lucide-react";

import {
    formatearFechaHora,
    getEstadoCampaniaColor,
    getEstadoCampaniaLabel,
} from "./proteccion-datos.helpers";

import type {
    ResumenCampaniaEmpresa,
    ResumenEmpresaProteccionDatos,
} from "./proteccion-datos.types";

/** Filtro de la vista: todas, solo con campañas o solo sin campañas. */
export type FiltroCampaniasEmpresa =
    | "TODAS"
    | "CON"
    | "SIN";

type Props = {
    items:
    ResumenEmpresaProteccionDatos[];

    filtro:
    FiltroCampaniasEmpresa;

    loading:
    boolean;

    /** Filtra por nombre de empresa o de campaña. */
    search:
    string;

    /** Crear una campaña ya asociada a la empresa de la fila. */
    onCrearCampania?:
    (
        empresaId: number,
    ) => void;

    /** Botón de acciones de cada campaña (lo arma la página). */
    renderAcciones:
    (
        campania:
            ResumenCampaniaEmpresa,
    ) => ReactNode;
};

/* ---------------------------------------------------------
   Helpers de presentación
   --------------------------------------------------------- */

function normalizar(
    texto: string,
): string {
    return texto
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase();
}

/** Porcentaje de respuestas sobre los enviados. */
function avance(
    fila: {
        enviados: number;
        aceptados: number;
        rechazados: number;
        revocados: number;
    },
): number {
    if (fila.enviados === 0) {
        return 0;
    }

    return Math.round(
        ((fila.aceptados + fila.rechazados + fila.revocados) /
            fila.enviados) *
        100,
    );
}

function Respuestas({
    fila,
}: {
    fila: {
        destinatarios: number;
        enviados: number;
        aceptados: number;
        rechazados: number;
        revocados: number;
        pendientes: number;
        errores: number;
    };
}) {
    if (fila.destinatarios === 0) {
        return (
            <span className="text-xs text-slate-400">
                Sin destinatarios
            </span>
        );
    }

    return (
        <div className="min-w-[180px]">
            <Progress
                percent={avance(fila)}
                size="small"
                showInfo
            />

            <div className="mt-1 flex flex-wrap gap-1">
                {fila.aceptados > 0 && (
                    <Tag color="success" className="m-0">
                        {fila.aceptados} aceptado{fila.aceptados === 1 ? "" : "s"}
                    </Tag>
                )}

                {fila.rechazados > 0 && (
                    <Tag color="error" className="m-0">
                        {fila.rechazados} rechazado{fila.rechazados === 1 ? "" : "s"}
                    </Tag>
                )}

                {fila.revocados > 0 && (
                    <Tag color="warning" className="m-0">
                        {fila.revocados} revocado{fila.revocados === 1 ? "" : "s"}
                    </Tag>
                )}

                {fila.pendientes > 0 && (
                    <Tag className="m-0">
                        {fila.pendientes} sin responder
                    </Tag>
                )}

                {fila.errores > 0 && (
                    <Tag color="red" className="m-0">
                        {fila.errores} con error
                    </Tag>
                )}
            </div>
        </div>
    );
}

function Envio({
    fila,
}: {
    fila: {
        destinatarios: number;
        enviados: number;
    };
}) {
    const sinEnviar =
        fila.destinatarios -
        fila.enviados;

    return (
        <div>
            <span className="font-semibold text-slate-800">
                {fila.enviados}
            </span>

            <span className="text-slate-400">
                {" / "}
                {fila.destinatarios}
            </span>

            {sinEnviar > 0 && fila.destinatarios > 0 && (
                <div className="text-xs text-amber-600">
                    {sinEnviar} sin enviar
                </div>
            )}
        </div>
    );
}

/* ---------------------------------------------------------
   Componente
   --------------------------------------------------------- */

export default function EmpresasProteccionDatosTabla({
    items,
    filtro,
    loading,
    search,
    renderAcciones,
    onCrearCampania
}: Props) {

    const [
        page,
        setPage,
    ] =
        useState(1);

    const [
        pageSize,
        setPageSize,
    ] =
        useState(10);

    /*
     * Si el texto calza con la empresa, se muestran todas sus campañas;
     * si calza solo con campañas, se muestran solo esas.
     */
    const filtradas =
        useMemo(
            () => {
                const texto =
                    normalizar(
                        search.trim(),
                    );

                const base =
                    items.filter(
                        (empresa) =>
                            filtro === "TODAS" ||
                            (filtro === "CON"
                                ? empresa.campanias > 0
                                : empresa.campanias === 0),
                    );

                if (!texto) {
                    return base;
                }

                return base.flatMap(
                    (empresa) => {
                        if (
                            normalizar(
                                empresa.empresaNombre,
                            ).includes(texto)
                        ) {
                            return [empresa];
                        }

                        const campanias =
                            empresa.campaniasDetalle.filter(
                                (c) =>
                                    normalizar(
                                        `${c.nombre} ${c.tituloDocumento}`,
                                    ).includes(texto),
                            );

                        return campanias.length > 0
                            ? [
                                {
                                    ...empresa,
                                    campaniasDetalle:
                                        campanias,
                                },
                            ]
                            : [];
                    },
                );
            },
            [
                items,
                filtro,
                search,
            ],
        );

    const columnasCampanias: ColumnsType<ResumenCampaniaEmpresa> = [
        {
            title: "Campaña",
            key: "nombre",
            render: (_, c) => (
                <div>
                    <div className="font-medium text-slate-800">
                        {c.nombre}
                    </div>

                    <div className="text-xs text-slate-500">
                        {c.tituloDocumento}
                    </div>
                </div>
            ),
        },
        {
            title: "Versión",
            dataIndex: "versionDocumento",
            key: "versionDocumento",
            width: 90,
        },
        {
            title: "Estado",
            dataIndex: "estado",
            key: "estado",
            width: 120,
            render: (value: ResumenCampaniaEmpresa["estado"]) => (
                <Tag color={getEstadoCampaniaColor(value)}>
                    {getEstadoCampaniaLabel(value)}
                </Tag>
            ),
        },
        {
            title: "Enviados",
            key: "enviados",
            width: 120,
            render: (_, c) => <Envio fila={c} />,
        },
        {
            title: "Respuestas",
            key: "respuestas",
            render: (_, c) => <Respuestas fila={c} />,
        },
        {
            title: "Último envío",
            key: "ultimoEnvio",
            width: 160,
            render: (_, c) =>
                c.ultimoEnvio
                    ? formatearFechaHora(c.ultimoEnvio)
                    : <span className="text-xs text-slate-400">No enviada</span>,
        },
        {
            title: "",
            key: "acciones",
            width: 60,
            render: (_, c) => renderAcciones(c),
        },
    ];

    const columnas: ColumnsType<ResumenEmpresaProteccionDatos> = [
        {
            title: "Empresa",
            key: "empresa",
            render: (_, e) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                        <Building2 size={18} />
                    </div>

                    <div>
                        <div className="font-semibold text-slate-800">
                            {e.empresaNombre}
                        </div>

                        <div className="text-xs text-slate-500">
                            {e.campanias === 0
                                ? "Sin campañas"
                                : <>
                                    {e.campanias} campaña{e.campanias === 1 ? "" : "s"}
                                    {" · "}
                                    {e.campaniasEnviadas} enviada{e.campaniasEnviadas === 1 ? "" : "s"}
                                </>}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            title: "Última campaña",
            key: "ultima",
            render: (_, e) => {
                const ultima =
                    e.campaniasDetalle[0];

                if (!ultima) {
                    return (
                        <Tag className="m-0">
                            Sin campañas
                        </Tag>
                    );
                }

                return (
                    <div>
                        <div className="text-slate-800">
                            {ultima.nombre}
                        </div>

                        <div className="mt-1 flex items-center gap-2">
                            <Tag
                                color={getEstadoCampaniaColor(ultima.estado)}
                                className="m-0"
                            >
                                {getEstadoCampaniaLabel(ultima.estado)}
                            </Tag>

                            <span className="text-xs text-slate-500">
                                v{ultima.versionDocumento}
                            </span>
                        </div>
                    </div>
                );
            },
        },
        {
            title: (
                <Tooltip title="Enviados / destinatarios de esta empresa, en todas sus campañas">
                    Enviados
                </Tooltip>
            ),
            key: "enviados",
            width: 130,
            render: (_, e) =>
                e.campanias === 0
                    ? <span className="text-slate-400">—</span>
                    : <Envio fila={e} />,
        },
        {
            title: "Respuestas",
            key: "respuestas",
            render: (_, e) =>
                e.campanias === 0
                    ? <span className="text-slate-400">—</span>
                    : <Respuestas fila={e} />,
        },
        {
            title: "Último envío",
            key: "ultimoEnvio",
            width: 160,
            render: (_, e) =>
                e.ultimoEnvio
                    ? formatearFechaHora(e.ultimoEnvio)
                    : <span className="text-xs text-slate-400">Sin envíos</span>,
        },
        ...(onCrearCampania
            ? [
                {
                    title: "",
                    key: "crear",
                    width: 130,
                    render: (_: unknown, e: ResumenEmpresaProteccionDatos) =>
                        e.empresaId !== null && (
                            <Button
                                size="small"
                                icon={<Plus size={14} />}
                                onClick={(evento) => {
                                    /* No desplegar la fila al hacer clic */
                                    evento.stopPropagation();
                                    onCrearCampania(e.empresaId as number);
                                }}
                            >
                                Campaña
                            </Button>
                        ),
                },
            ]
            : []),
    ];

    return (
        <Table<ResumenEmpresaProteccionDatos>
            rowKey={(e) => String(e.empresaId ?? "sin-empresa")}
            loading={loading}
            dataSource={filtradas}
            columns={columnas}
            scroll={{ x: 1000 }}
            locale={{
                emptyText: (
                    <Empty description="No hay campañas para mostrar" />
                ),
            }}
            expandable={{
                expandRowByClick: true,
                rowExpandable: (e) =>
                    e.campanias > 0,
                expandedRowRender: (e) => (
                    <Table<ResumenCampaniaEmpresa>
                        rowKey="id"
                        size="small"
                        pagination={false}
                        dataSource={e.campaniasDetalle}
                        columns={columnasCampanias}
                        scroll={{ x: 900 }}
                    />
                ),
            }}
            pagination={{
                current: Math.min(
                    page,
                    Math.max(1, Math.ceil(filtradas.length / pageSize)),
                ),
                pageSize,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50],
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
        />
    );
}