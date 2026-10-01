import React, {
    useMemo,
    useState,
} from "react";

import {
    AlertTriangle,
    Award,
    Search,
    ShieldCheck,
    Users,
} from "lucide-react";

import type {
    EstadoPuntualidadCliente,
    FinanzasClientePago,
    FinanzasClientesData,
} from "./finanzas.types";

type Props = {
    data:
    FinanzasClientesData;

    ano:
    number;
};

type SortKey =
    | "razonSocial"
    | "estado"
    | "score"
    | "conVencimientoRegistrado"
    | "aTiempo"
    | "atrasadas"
    | "porcentajeATiempo"
    | "promedioDiasAtraso"
    | "montoPagado"
    | "totalConciliadas"
    | "ultimaFechaPago";

type SortDirection =
    | "asc"
    | "desc";

function formatCLP(
    value:
        number
) {
    return new Intl.NumberFormat(
        "es-CL",
        {
            style:
                "currency",

            currency:
                "CLP",

            maximumFractionDigits:
                0,
        }
    ).format(
        value
    );
}

function formatFecha(
    value:
        string | null
) {
    if (
        !value
    ) {
        return "—";
    }

    const date =
        new Date(
            value
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "—";
    }

    return new Intl.DateTimeFormat(
        "es-CL",
        {
            timeZone:
                "America/Santiago",

            day:
                "2-digit",

            month:
                "2-digit",

            year:
                "numeric",
        }
    ).format(
        date
    );
}

function getEstadoLabel(
    estado:
        EstadoPuntualidadCliente
) {
    switch (
    estado
    ) {
        case "EXCELENTE":
            return "Excelente";

        case "BUEN_PAGADOR":
            return "Buen pagador";

        case "IRREGULAR":
            return "Pago irregular";

        case "RIESGO_MORA":
            return "Alto riesgo de atraso";

        default:
            return "Sin historial suficiente";
    }
}

function getEstadoClass(
    estado:
        EstadoPuntualidadCliente
) {
    switch (
    estado
    ) {
        case "EXCELENTE":
            return "border-emerald-200 bg-emerald-50 text-emerald-700";

        case "BUEN_PAGADOR":
            return "border-cyan-200 bg-cyan-50 text-cyan-700";

        case "IRREGULAR":
            return "border-amber-200 bg-amber-50 text-amber-700";

        case "RIESGO_MORA":
            return "border-red-200 bg-red-50 text-red-700";

        default:
            return "border-slate-200 bg-slate-50 text-slate-600";
    }
}

function SortHeader(
    props: {
        label:
        string;

        sortKey:
        SortKey;

        activeSortKey:
        SortKey;

        direction:
        SortDirection;

        onSort:
        (
            key:
                SortKey
        ) => void;

        align?:
        "left" |
        "center" |
        "right";
    }
) {
    const active =
        props.activeSortKey ===
        props.sortKey;

    const alignClass =
        props.align ===
            "right"
            ? "text-right"
            : props.align ===
                "center"
                ? "text-center"
                : "text-left";

    return (
        <th
            className={`px-4 py-3 ${alignClass}`}
        >
            <button
                type="button"
                onClick={() =>
                    props.onSort(
                        props.sortKey
                    )
                }
                className={`inline-flex items-center gap-1 font-bold transition hover:text-cyan-700 ${active
                    ? "text-cyan-700"
                    : ""
                    }`}
            >
                <span>
                    {props.label}
                </span>

                <span className="text-[10px]">
                    {active
                        ? props.direction ===
                            "asc"
                            ? "▲"
                            : "▼"
                        : "↕"}
                </span>
            </button>
        </th>
    );
}


const FinanzasClientesPanel:
    React.FC<Props> = ({
        data,
        ano,
    }) => {
        const [
            search,
            setSearch,
        ] =
            useState(
                ""
            );

        const [
            estadoFiltro,
            setEstadoFiltro,
        ] =
            useState<
                EstadoPuntualidadCliente |
                "TODOS"
            >(
                "TODOS"
            );

        const [
            sortKey,
            setSortKey,
        ] =
            useState<SortKey>(
                "montoPagado"
            );

        const [
            sortDirection,
            setSortDirection,
        ] =
            useState<SortDirection>(
                "desc"
            );

        function handleSort(
            key:
                SortKey
        ) {
            if (
                sortKey ===
                key
            ) {
                setSortDirection(
                    current =>
                        current ===
                            "asc"
                            ? "desc"
                            : "asc"
                );

                return;
            }

            setSortKey(
                key
            );

            setSortDirection(
                "asc"
            );
        }

        const clientesFiltrados =
            useMemo(
                () => {
                    const query =
                        search
                            .trim()
                            .toLowerCase();

                    const filtrados =
                        data.clientes.filter(
                            cliente => {
                                const coincideTexto =
                                    !query ||
                                    cliente
                                        .razonSocial
                                        .toLowerCase()
                                        .includes(
                                            query
                                        ) ||
                                    cliente
                                        .rut
                                        .toLowerCase()
                                        .includes(
                                            query
                                        );

                                const coincideEstado =
                                    estadoFiltro ===
                                    "TODOS" ||
                                    cliente.estado ===
                                    estadoFiltro;

                                return (
                                    coincideTexto &&
                                    coincideEstado
                                );
                            }
                        );

                    return [
                        ...filtrados,
                    ].sort(
                        (
                            a,
                            b
                        ) => {
                            let resultado =
                                0;

                            switch (
                            sortKey
                            ) {
                                case "razonSocial":
                                    resultado =
                                        a.razonSocial.localeCompare(
                                            b.razonSocial,
                                            "es"
                                        );
                                    break;

                                case "estado":
                                    resultado =
                                        getEstadoLabel(
                                            a.estado
                                        ).localeCompare(
                                            getEstadoLabel(
                                                b.estado
                                            ),
                                            "es"
                                        );
                                    break;

                                case "score":
                                    resultado =
                                        (
                                            a.score ??
                                            -1
                                        ) -
                                        (
                                            b.score ??
                                            -1
                                        );
                                    break;

                                case "conVencimientoRegistrado":
                                    resultado =
                                        a.conVencimientoRegistrado -
                                        b.conVencimientoRegistrado;
                                    break;

                                case "aTiempo":
                                    resultado =
                                        a.aTiempo -
                                        b.aTiempo;
                                    break;

                                case "atrasadas":
                                    resultado =
                                        a.atrasadas -
                                        b.atrasadas;
                                    break;

                                case "porcentajeATiempo":
                                    resultado =
                                        a.porcentajeATiempo -
                                        b.porcentajeATiempo;
                                    break;

                                case "promedioDiasAtraso":
                                    resultado =
                                        a.promedioDiasAtraso -
                                        b.promedioDiasAtraso;
                                    break;

                                case "montoPagado":
                                    resultado =
                                        a.montoPagado -
                                        b.montoPagado;
                                    break;

                                case "totalConciliadas":
                                    resultado =
                                        a.totalConciliadas -
                                        b.totalConciliadas;
                                    break;

                                case "ultimaFechaPago": {
                                    const fechaA =
                                        a.ultimaFechaPago
                                            ? new Date(
                                                a.ultimaFechaPago
                                            ).getTime()
                                            : 0;

                                    const fechaB =
                                        b.ultimaFechaPago
                                            ? new Date(
                                                b.ultimaFechaPago
                                            ).getTime()
                                            : 0;

                                    resultado =
                                        fechaA -
                                        fechaB;

                                    break;
                                }
                            }

                            return sortDirection ===
                                "asc"
                                ? resultado
                                : -resultado;
                        }
                    );
                },
                [
                    data.clientes,
                    search,
                    estadoFiltro,
                    sortKey,
                    sortDirection,
                ]
            );

        return (
            <div className="space-y-4">

                {/* CABECERA */}

                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

                    <div className="border-b border-slate-100 p-4 sm:p-5">

                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

                            <div className="flex items-center gap-3">

                                <div>
                                    <h2 className="text-base font-black text-slate-900">
                                        Comportamiento de pago
                                    </h2>

                                    <p className="text-xs text-slate-500">
                                        Puntaje basado en el historial completo. Los montos corresponden a {ano}.
                                    </p>
                                </div>

                                <div className="mt-3 rounded-2xl border border-cyan-100 bg-cyan-50/50 px-4 py-3 text-xs text-slate-600">

                                    <p className="font-semibold text-slate-700">
                                        ¿Cómo se calcula el puntaje?
                                    </p>

                                    <p className="mt-1 leading-relaxed">
                                        Se utiliza el historial completo de pagos del cliente.
                                        Cada documento aporta entre 0 y 100 puntos según su atraso:
                                        pagos puntuales obtienen el máximo puntaje y los atrasos prolongados
                                        reducen progresivamente la puntuación. El puntaje final corresponde
                                        al promedio de los documentos evaluados.
                                    </p>

                                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">

                                        <span>
                                            A tiempo: <strong>100 pts</strong>
                                        </span>

                                        <span>
                                            1–7 días: <strong>90 pts</strong>
                                        </span>

                                        <span>
                                            8–14 días: <strong>80 pts</strong>
                                        </span>

                                        <span>
                                            15–30 días: <strong>65 pts</strong>
                                        </span>

                                        <span>
                                            31–60 días: <strong>45 pts</strong>
                                        </span>

                                        <span>
                                            61–90 días: <strong>25 pts</strong>
                                        </span>

                                        <span>
                                            Más de 90 días: <strong>0 pts</strong>
                                        </span>

                                    </div>

                                    <p className="mt-2 text-[11px] text-slate-500">
                                        Se requieren al menos 5 documentos históricos válidos para asignar una clasificación.
                                    </p>

                                </div>

                            </div>

                            <div className="text-sm font-bold text-slate-700">
                                {data.totalClientes} clientes con actividad
                            </div>

                        </div>
                    </div>

                    {/* RESUMEN */}

                    <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-5 sm:p-5">

                        <ResumenCard
                            label="Excelente"
                            value={
                                data
                                    .resumen
                                    .excelente
                            }
                            className="border-emerald-200 bg-emerald-50 text-emerald-700"
                        />

                        <ResumenCard
                            label="Buen pagador"
                            value={
                                data
                                    .resumen
                                    .buenPagador
                            }
                            className="border-cyan-200 bg-cyan-50 text-cyan-700"
                        />

                        <ResumenCard
                            label="Pago irregular"
                            value={
                                data
                                    .resumen
                                    .irregular
                            }
                            className="border-amber-200 bg-amber-50 text-amber-700"
                        />

                        <ResumenCard
                            label="Alto riesgo de atraso"
                            value={
                                data
                                    .resumen
                                    .riesgoMora
                            }
                            className="border-red-200 bg-red-50 text-red-700"
                        />

                        <ResumenCard
                            label="Sin historial"
                            value={
                                data
                                    .resumen
                                    .sinHistorial
                            }
                            className="border-slate-200 bg-slate-50 text-slate-600"
                        />

                    </div>
                </div>

                {/* RANKINGS */}

                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">

                    <RankingCard
                        title="Mejores pagadores"
                        icon={
                            <Award
                                size={18}
                            />
                        }
                        clientes={
                            data
                                .mejoresPagadores
                        }
                        emptyText="No hay clientes clasificados como excelentes o buenos pagadores."
                    />

                    <RankingCard
                        title="Mayor riesgo de atraso"
                        icon={
                            <AlertTriangle
                                size={18}
                            />
                        }
                        clientes={
                            data
                                .mayorRiesgo
                        }
                        emptyText="No hay clientes clasificados con alto riesgo de atraso."
                    />

                </div>

                {/* TABLA */}

                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

                    <div className="border-b border-slate-100 p-4 sm:p-5">

                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

                            <div>
                                <h3 className="font-black text-slate-900">
                                    Clientes del período
                                </h3>

                                <p className="text-xs text-slate-500">
                                    Puntaje histórico y actividad financiera de {ano}.
                                </p>
                            </div>

                            <div className="flex flex-col gap-2 sm:flex-row">

                                <div className="relative">

                                    <Search
                                        size={16}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                    />

                                    <input
                                        value={
                                            search
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setSearch(
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        placeholder="Buscar cliente o RUT"
                                        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 sm:w-64"
                                    />

                                </div>

                                <select
                                    value={
                                        estadoFiltro
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setEstadoFiltro(
                                            event
                                                .target
                                                .value as
                                            EstadoPuntualidadCliente |
                                            "TODOS"
                                        )
                                    }
                                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                                >
                                    <option value="TODOS">
                                        Todos
                                    </option>

                                    <option value="EXCELENTE">
                                        Excelente
                                    </option>

                                    <option value="BUEN_PAGADOR">
                                        Buen pagador
                                    </option>

                                    <option value="IRREGULAR">
                                        Pago irregular
                                    </option>

                                    <option value="RIESGO_MORA">
                                        Alto riesgo de atraso
                                    </option>

                                    <option value="SIN_HISTORIAL">
                                        Sin historial suficiente
                                    </option>
                                </select>

                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">

                        <table className="min-w-[1150px] w-full text-sm">

                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">

                                <tr>
                                    <SortHeader
                                        label="Cliente"
                                        sortKey="razonSocial"
                                        activeSortKey={
                                            sortKey
                                        }
                                        direction={
                                            sortDirection
                                        }
                                        onSort={
                                            handleSort
                                        }
                                        align="left"
                                    />

                                    <SortHeader
                                        label="Estado"
                                        sortKey="estado"
                                        activeSortKey={
                                            sortKey
                                        }
                                        direction={
                                            sortDirection
                                        }
                                        onSort={
                                            handleSort
                                        }
                                        align="center"
                                    />

                                    <SortHeader
                                        label="Puntaje"
                                        sortKey="score"
                                        activeSortKey={
                                            sortKey
                                        }
                                        direction={
                                            sortDirection
                                        }
                                        onSort={
                                            handleSort
                                        }
                                        align="center"
                                    />

                                    <SortHeader
                                        label="Docs evaluados"
                                        sortKey="conVencimientoRegistrado"
                                        activeSortKey={
                                            sortKey
                                        }
                                        direction={
                                            sortDirection
                                        }
                                        onSort={
                                            handleSort
                                        }
                                        align="center"
                                    />

                                    <SortHeader
                                        label="A tiempo"
                                        sortKey="aTiempo"
                                        activeSortKey={
                                            sortKey
                                        }
                                        direction={
                                            sortDirection
                                        }
                                        onSort={
                                            handleSort
                                        }
                                        align="center"
                                    />

                                    <SortHeader
                                        label="Atrasadas"
                                        sortKey="atrasadas"
                                        activeSortKey={
                                            sortKey
                                        }
                                        direction={
                                            sortDirection
                                        }
                                        onSort={
                                            handleSort
                                        }
                                        align="center"
                                    />

                                    <SortHeader
                                        label="% a tiempo"
                                        sortKey="porcentajeATiempo"
                                        activeSortKey={
                                            sortKey
                                        }
                                        direction={
                                            sortDirection
                                        }
                                        onSort={
                                            handleSort
                                        }
                                        align="center"
                                    />

                                    <SortHeader
                                        label="Prom. atraso"
                                        sortKey="promedioDiasAtraso"
                                        activeSortKey={
                                            sortKey
                                        }
                                        direction={
                                            sortDirection
                                        }
                                        onSort={
                                            handleSort
                                        }
                                        align="center"
                                    />

                                    <SortHeader
                                        label={`Pagado ${ano}`}
                                        sortKey="montoPagado"
                                        activeSortKey={
                                            sortKey
                                        }
                                        direction={
                                            sortDirection
                                        }
                                        onSort={
                                            handleSort
                                        }
                                        align="right"
                                    />

                                    <SortHeader
                                        label={`Docs ${ano}`}
                                        sortKey="totalConciliadas"
                                        activeSortKey={
                                            sortKey
                                        }
                                        direction={
                                            sortDirection
                                        }
                                        onSort={
                                            handleSort
                                        }
                                        align="center"
                                    />

                                    <SortHeader
                                        label="Último pago"
                                        sortKey="ultimaFechaPago"
                                        activeSortKey={
                                            sortKey
                                        }
                                        direction={
                                            sortDirection
                                        }
                                        onSort={
                                            handleSort
                                        }
                                        align="center"
                                    />
                                </tr>

                            </thead>

                            <tbody className="divide-y divide-slate-100">

                                {clientesFiltrados.map(
                                    cliente => (
                                        <ClienteRow
                                            key={
                                                cliente.rut
                                            }
                                            cliente={
                                                cliente
                                            }
                                        />
                                    )
                                )}

                                {clientesFiltrados.length ===
                                    0 && (
                                        <tr>
                                            <td
                                                colSpan={
                                                    11
                                                }
                                                className="px-4 py-12 text-center text-sm text-slate-400"
                                            >
                                                No hay clientes que coincidan con los filtros.
                                            </td>
                                        </tr>
                                    )}

                            </tbody>
                        </table>
                    </div>

                </div>

            </div>
        );
    };

function ResumenCard(
    props: {
        label:
        string;

        value:
        number;

        className:
        string;
    }
) {
    return (
        <div
            className={`rounded-2xl border p-4 ${props.className}`}
        >
            <div className="text-2xl font-black">
                {props.value}
            </div>

            <div className="mt-1 text-xs font-bold">
                {props.label}
            </div>
        </div>
    );
}

function RankingCard(
    props: {
        title:
        string;

        icon:
        React.ReactNode;

        clientes:
        FinanzasClientePago[];

        emptyText:
        string;
    }
) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">

            <div className="mb-4 flex items-center gap-2">

                <div className="text-cyan-700">
                    {props.icon}
                </div>

                <h3 className="font-black text-slate-900">
                    {props.title}
                </h3>

            </div>

            {props.clientes.length ===
                0 ? (
                <p className="text-sm text-slate-400">
                    {props.emptyText}
                </p>
            ) : (
                <div className="space-y-2">

                    {props.clientes
                        .slice(
                            0,
                            5
                        )
                        .map(
                            cliente => (
                                <div
                                    key={
                                        cliente.rut
                                    }
                                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3"
                                >
                                    <div className="min-w-0">

                                        <div className="truncate text-sm font-bold text-slate-800">
                                            {
                                                cliente.razonSocial
                                            }
                                        </div>

                                        <div className="text-xs text-slate-500">
                                            {cliente.rut}
                                        </div>

                                    </div>

                                    <div className="shrink-0 text-right">

                                        <div className="text-lg font-black text-slate-900">
                                            {cliente.score ?? "—"}
                                        </div>

                                        <div className="text-[10px] font-semibold text-slate-500">
                                            Puntaje
                                        </div>

                                    </div>
                                </div>
                            )
                        )}

                </div>
            )}
        </div>
    );
}

function ClienteRow(
    {
        cliente,
    }: {
        cliente:
        FinanzasClientePago;
    }
) {
    return (
        <tr className="transition hover:bg-slate-50">

            <td className="px-4 py-3">

                <div className="max-w-[260px]">

                    <div
                        className="truncate font-bold text-slate-800"
                        title={
                            cliente.razonSocial
                        }
                    >
                        {
                            cliente.razonSocial
                        }
                    </div>

                    <div className="text-xs text-slate-500">
                        {cliente.rut}
                    </div>

                </div>

            </td>

            <td className="px-4 py-3 text-center">

                <span
                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getEstadoClass(
                        cliente.estado
                    )}`}
                >
                    {getEstadoLabel(
                        cliente.estado
                    )}
                </span>

            </td>

            <td className="px-4 py-3 text-center">

                {cliente.score ===
                    null ? (
                    <span className="text-slate-400">
                        —
                    </span>
                ) : (
                    <div className="inline-flex items-center gap-1 font-black text-slate-900">

                        <ShieldCheck
                            size={15}
                            className="text-cyan-600"
                        />

                        {cliente.score}

                    </div>
                )}

            </td>

            <td className="px-4 py-3 text-center font-semibold text-slate-700">
                {
                    cliente.conVencimientoRegistrado
                }
            </td>

            <td className="px-4 py-3 text-center text-emerald-700">
                {
                    cliente.aTiempo
                }
            </td>

            <td className="px-4 py-3 text-center text-red-600">
                {
                    cliente.atrasadas
                }
            </td>

            <td className="px-4 py-3 text-center font-semibold text-slate-700">
                {
                    cliente.porcentajeATiempo
                }%
            </td>

            <td className="px-4 py-3 text-center text-slate-700">
                {
                    cliente.promedioDiasAtraso
                } días
            </td>

            <td className="px-4 py-3 text-right font-bold text-slate-800">
                {formatCLP(
                    cliente.montoPagado
                )}
            </td>

            <td className="px-4 py-3 text-center text-slate-700">
                {
                    cliente.totalConciliadas
                }
            </td>

            <td className="px-4 py-3 text-center text-slate-600">
                {formatFecha(
                    cliente.ultimaFechaPago
                )}
            </td>

        </tr>
    );
}

export default FinanzasClientesPanel;