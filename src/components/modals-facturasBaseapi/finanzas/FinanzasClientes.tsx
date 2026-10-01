// src/host/FinanzasClientes.tsx

import React, {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    RefreshCw,
    Users,
} from "lucide-react";

import {
    api,
} from "../../../api/api";

import FinanzasClientesPanel from "./FinanzasClientesPanel";

import type {
    EmpresaFinanzas,
    FinanzasDashboardData,
    FinanzasDashboardResponse,
} from "./finanzas.types";

const FinanzasClientes:
    React.FC = () => {
        const now =
            new Date();

        const [
            empresa,
            setEmpresa,
        ] =
            useState<
                EmpresaFinanzas
            >(
                "econnet"
            );

        const [
            ano,
            setAno,
        ] =
            useState(
                now.getFullYear()
            );

        const [
            data,
            setData,
        ] =
            useState<
                FinanzasDashboardData |
                null
            >(
                null
            );

        const [
            loading,
            setLoading,
        ] =
            useState(
                false
            );

        const [
            error,
            setError,
        ] =
            useState(
                ""
            );

        const cargarDatos =
            useCallback(
                async () => {
                    setLoading(
                        true
                    );

                    setError(
                        ""
                    );

                    try {
                        const response =
                            await api.get<
                                FinanzasDashboardResponse
                            >(
                                "/baseapi/finanzas/dashboard",
                                {
                                    params: {
                                        empresa,
                                        ano,
                                    },
                                }
                            );

                        setData(
                            response
                                .data
                                .data
                        );
                    } catch (
                    err: any
                    ) {
                        console.error(
                            "Error cargando comportamiento de clientes:",
                            err
                        );

                        setError(
                            err
                                ?.response
                                ?.data
                                ?.error ??
                            err
                                ?.response
                                ?.data
                                ?.message ??
                            err
                                ?.message ??
                            "No se pudo cargar el análisis de clientes."
                        );
                    } finally {
                        setLoading(
                            false
                        );
                    }
                },
                [
                    empresa,
                    ano,
                ]
            );

        useEffect(
            () => {
                void cargarDatos();
            },
            [
                cargarDatos,
            ]
        );

        return (
            <div className="min-h-screen bg-slate-50 px-3 py-4 sm:px-5 lg:px-6">

                <div className="mx-auto w-full max-w-[1800px] space-y-4">

                    {/* HEADER */}

                    <div className="overflow-hidden rounded-3xl border border-cyan-200 bg-cyan-50/30 shadow-sm">

                        <div className="px-4 py-5 sm:px-6">

                            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">

                                <div className="min-w-0">

                                    <div className="flex items-center gap-3">

                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
                                            <Users
                                                size={22}
                                            />
                                        </div>

                                        <div>

                                            <div className="flex flex-wrap items-center gap-2">

                                                <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700 ring-1 ring-cyan-200">
                                                    Administración Finanzas
                                                </span>

                                                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                                                    Año {ano}
                                                </span>

                                            </div>

                                            <h1 className="mt-2 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                                                Comportamiento de clientes
                                            </h1>

                                            <p className="mt-1 max-w-3xl text-sm text-slate-600">
                                                Analiza puntualidad de pago, score histórico y riesgo de mora de clientes con actividad durante {ano}.
                                            </p>

                                        </div>

                                    </div>

                                </div>

                                {/* FILTROS */}

                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[180px_130px_auto]">

                                    <div>

                                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                            Empresa
                                        </label>

                                        <select
                                            value={
                                                empresa
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setEmpresa(
                                                    event
                                                        .target
                                                        .value as EmpresaFinanzas
                                                )
                                            }
                                            className="h-11 w-full rounded-xl border border-cyan-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                                        >
                                            <option value="econnet">
                                                ECONNET
                                            </option>

                                            <option value="rids">
                                                RIDS
                                            </option>
                                        </select>

                                    </div>

                                    <div>

                                        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                            Año
                                        </label>

                                        <input
                                            type="number"
                                            min={
                                                2020
                                            }
                                            max={
                                                2100
                                            }
                                            value={
                                                ano
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                setAno(
                                                    Number(
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                )
                                            }
                                            className="h-11 w-full rounded-xl border border-cyan-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                                        />

                                    </div>

                                    <div className="flex items-end">

                                        <button
                                            type="button"
                                            onClick={() =>
                                                void cargarDatos()
                                            }
                                            disabled={
                                                loading
                                            }
                                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 text-sm font-bold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                                        >

                                            <RefreshCw
                                                size={16}
                                                className={
                                                    loading
                                                        ? "animate-spin"
                                                        : ""
                                                }
                                            />

                                            {loading
                                                ? "Actualizando..."
                                                : "Actualizar"}

                                        </button>

                                    </div>

                                </div>

                            </div>
                        </div>
                    </div>

                    {/* ERROR */}

                    {error && (
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                            {error}
                        </div>
                    )}

                    {/* LOADING */}

                    {loading &&
                        !data && (
                            <div className="rounded-3xl border border-slate-200 bg-white py-20 text-center text-sm text-slate-400 shadow-sm">
                                Cargando comportamiento de clientes...
                            </div>
                        )}

                    {/* CLIENTES */}

                    {data?.clientes && (
                        <FinanzasClientesPanel
                            data={
                                data.clientes
                            }
                            ano={
                                ano
                            }
                        />
                    )}

                </div>
            </div>
        );
    };

export default FinanzasClientes;