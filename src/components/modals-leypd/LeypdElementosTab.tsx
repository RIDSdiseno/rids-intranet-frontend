// src/components/modals-leypd/LeypdElementosTab.tsx

import {
    SearchOutlined,
} from "@ant-design/icons";

import {
    Empty,
    Input,
    Progress,
    Select,
    Space,
    Tag,
} from "antd";

import {
    useMemo,
    useState,
} from "react";

import LeypdElementoCard from "./LeypdElementoCard";

import type {
    ElementoSharepointLeypd,
    EstadoLeypd,
    LeypdEmpresaDetalle,
} from "./leypd.types";

interface Props {
    empresaId: number;

    detalle:
    LeypdEmpresaDetalle;

    /**
     * Estado de SharePoint por número de elemento.
     * Vacío si la carpeta no está vinculada o sincronizada.
     */
    sharepointPorNumero?:
    Map<number, ElementoSharepointLeypd>;

    onChanged:
    () => void | Promise<void>;
}

type FiltroEstado =
    | "TODOS"
    | EstadoLeypd;

export default function LeypdElementosTab({
    empresaId,
    detalle,
    sharepointPorNumero,
    onChanged,
}: Props) {
    const [
        search,
        setSearch,
    ] =
        useState("");

    const [
        estado,
        setEstado,
    ] =
        useState<FiltroEstado>(
            "TODOS"
        );

    const elementos =
        useMemo(
            () => {
                const text =
                    search
                        .trim()
                        .toLowerCase();

                return detalle.elementos.filter(
                    (
                        elemento
                    ) => {
                        const matchText =
                            !text ||
                            elemento.titulo
                                .toLowerCase()
                                .includes(
                                    text
                                ) ||
                            elemento.carpeta
                                .toLowerCase()
                                .includes(
                                    text
                                ) ||
                            elemento.codigo.includes(
                                text
                            );

                        const matchEstado =
                            estado ===
                            "TODOS" ||
                            elemento.estado ===
                            estado;

                        return (
                            matchText &&
                            matchEstado
                        );
                    }
                );
            },
            [
                detalle.elementos,
                search,
                estado,
            ]
        );

    return (
        <div className="space-y-4">
            {/* =====================================================
                RESUMEN
            ===================================================== */}

            <div
                className="
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    p-4
                "
            >
                <div
                    className="
                        flex
                        flex-col
                        gap-4
                        lg:flex-row
                        lg:items-center
                        lg:justify-between
                    "
                >
                    <div>
                        <div className="text-sm font-semibold text-slate-800">
                            Avance de cumplimiento
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                            {
                                detalle
                                    .resumen
                                    .completados
                            }{" "}
                            de{" "}
                            {
                                detalle
                                    .resumen
                                    .total
                            }{" "}
                            elementos listos.
                        </div>
                    </div>

                    <div className="w-full lg:max-w-sm">
                        <Progress
                            percent={
                                detalle
                                    .resumen
                                    .porcentaje
                            }
                            status={
                                detalle
                                    .resumen
                                    .porcentaje ===
                                    100
                                    ? "success"
                                    : "active"
                            }
                        />
                    </div>
                </div>

                <div
                    className="
                        mt-4
                        flex
                        flex-wrap
                        gap-2
                    "
                >
                    <Tag color="green">
                        Implementados:{" "}
                        {
                            detalle
                                .resumen
                                .implementados
                        }
                    </Tag>

                    <Tag color="blue">
                        En progreso:{" "}
                        {
                            detalle
                                .resumen
                                .enProgreso
                        }
                    </Tag>

                    <Tag>
                        No iniciados:{" "}
                        {
                            detalle
                                .resumen
                                .sinIniciar
                        }
                    </Tag>

                    <Tag>
                        No aplica:{" "}
                        {
                            detalle
                                .resumen
                                .noAplica
                        }
                    </Tag>

                    {detalle.resumen
                        .vencidos >
                        0 && (
                            <Tag color="red">
                                Vencidos:{" "}
                                {
                                    detalle
                                        .resumen
                                        .vencidos
                                }
                            </Tag>
                        )}
                </div>
            </div>

            {/* =====================================================
                FILTROS
            ===================================================== */}

            <div
                className="
                    flex
                    flex-col
                    gap-3
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                "
            >
                <Input
                    allowClear
                    prefix={
                        <SearchOutlined />
                    }
                    placeholder="Buscar elemento..."
                    value={
                        search
                    }
                    className="w-full sm:max-w-sm"
                    onChange={(
                        event
                    ) =>
                        setSearch(
                            event
                                .target
                                .value
                        )
                    }
                />

                <Space>
                    <Select<FiltroEstado>
                        value={
                            estado
                        }
                        className="w-44"
                        onChange={
                            setEstado
                        }
                        options={[
                            {
                                value:
                                    "TODOS",
                                label:
                                    "Todos",
                            },
                            {
                                value:
                                    "NO_INICIADO",
                                label:
                                    "No iniciado",
                            },
                            {
                                value:
                                    "EN_PROGRESO",
                                label:
                                    "En progreso",
                            },
                            {
                                value:
                                    "IMPLEMENTADO",
                                label:
                                    "Implementado",
                            },
                            {
                                value:
                                    "NO_APLICA",
                                label:
                                    "No aplica",
                            },
                        ]}
                    />
                </Space>
            </div>

            {/* =====================================================
                ELEMENTOS
            ===================================================== */}

            {elementos.length ===
                0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white py-12">
                    <Empty description="No existen elementos que coincidan con los filtros" />
                </div>
            ) : (
                <div className="space-y-3">
                    {elementos.map(
                        (
                            elemento
                        ) => (
                            <LeypdElementoCard
                                key={
                                    elemento.numero
                                }
                                empresaId={
                                    empresaId
                                }
                                elemento={
                                    elemento
                                }
                                empresaNombre={
                                    detalle.empresa
                                        .razonSocial ??
                                    detalle.empresa
                                        .nombre
                                }
                                sharepoint={
                                    sharepointPorNumero?.get(
                                        elemento.numero
                                    ) ??
                                    null
                                }
                                onSaved={
                                    onChanged
                                }
                            />
                        )
                    )}
                </div>
            )}
        </div>
    );
}