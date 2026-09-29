import React, {
    useMemo,
    useRef,
    useState,
} from "react";

import {
    useNavigate,
} from "react-router-dom";

import {
    AuditOutlined,
    CloudSyncOutlined,
    ReloadOutlined,
} from "@ant-design/icons";

import RcvConciliacionPanel, {
    type RcvConciliacionPanelRef,
} from "../components/modals-facturasBaseapi/RcvConciliacionPanel";

import {
    MESES,
    safeParseUser,
} from "../components/modals-facturasBaseapi/utils";

import type {
    EmpresaKey,
    TipoRcv,
} from "../components/modals-facturasBaseapi/rcvConciliacion.api";

/* =========================================================
   COMPONENTE
========================================================= */

export default function ConciliacionRcv() {
    const now =
        new Date();

    const navigate =
        useNavigate();

    const user =
        useMemo(
            () =>
                safeParseUser(),
            []
        );

    const puedeVer =
        String(
            user?.rol ??
            ""
        )
            .toUpperCase()
            .trim() ===
        "ADMINISTRACION";

    /* =====================================================
       REF PANEL
    ===================================================== */

    const conciliacionPanelRef =
        useRef<
            RcvConciliacionPanelRef |
            null
        >(
            null
        );

    /* =====================================================
       FILTROS
    ===================================================== */

    const [
        empresa,
        setEmpresa,
    ] =
        useState<EmpresaKey>(
            "econnet"
        );

    const [
        activeTab,
        setActiveTab,
    ] =
        useState<TipoRcv>(
            "ventas"
        );

    const [
        mes,
        setMes,
    ] =
        useState(
            String(
                now.getMonth() +
                1
            ).padStart(
                2,
                "0"
            )
        );

    const [
        ano,
        setAno,
    ] =
        useState(
            String(
                now.getFullYear()
            )
        );

    /* =====================================================
       ESTADO ACCIONES
    ===================================================== */

    const [
        accionLoading,
        setAccionLoading,
    ] =
        useState<
            "actualizar" |
            "sii" |
            null
        >(
            null
        );

    /* =====================================================
       PERMISOS
    ===================================================== */

    React.useEffect(
        () => {
            if (
                !puedeVer
            ) {
                navigate(
                    "/facturas",
                    {
                        replace:
                            true,
                    }
                );
            }
        },
        [
            puedeVer,
            navigate,
        ]
    );

    /* =====================================================
       ACCIONES
    ===================================================== */

    const handleActualizar =
        async () => {
            if (
                !conciliacionPanelRef
                    .current ||
                accionLoading
            ) {
                return;
            }

            try {
                setAccionLoading(
                    "actualizar"
                );

                await conciliacionPanelRef
                    .current
                    .actualizar();
            } finally {
                setAccionLoading(
                    null
                );
            }
        };

    const handleConsultarSii =
        async () => {
            if (
                !conciliacionPanelRef
                    .current ||
                accionLoading
            ) {
                return;
            }

            try {
                setAccionLoading(
                    "sii"
                );

                await conciliacionPanelRef
                    .current
                    .consultarSii();
            } finally {
                setAccionLoading(
                    null
                );
            }
        };

    if (
        !puedeVer
    ) {
        return null;
    }

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <div className="
            mx-auto
            flex
            w-full
            max-w-[1550px]
            flex-col
            gap-4
            px-4
            py-5
            sm:px-6
        ">
            {/* =================================================
                HEADER
            ================================================= */}

            <div className="
                overflow-hidden
                rounded-3xl
                border
                border-cyan-200
                bg-white
                shadow-sm
            ">
                <div className="
                    flex
                    items-center
                    gap-3
                    px-5
                    py-4
                    sm:px-6
                ">
                    <div className="
                        flex
                        h-10
                        w-10
                        shrink-0
                        items-center
                        justify-center
                        rounded-2xl
                        bg-cyan-50
                        text-cyan-600
                    ">
                        <AuditOutlined
                            style={{
                                fontSize:
                                    18,
                            }}
                        />
                    </div>

                    <div className="min-w-0">
                        <h1 className="
                            text-lg
                            font-black
                            leading-tight
                            text-slate-900
                            sm:text-xl
                        ">
                            Conciliación
                        </h1>

                        <p className="
                            mt-0.5
                            text-xs
                            text-slate-400
                        ">
                            Control interno de conciliación de documentos reportados por el SII
                        </p>
                    </div>
                </div>
            </div>

            {/* =================================================
                FILTROS + ACCIONES
            ================================================= */}

            <div className="
                rounded-3xl
                border
                border-cyan-200
                bg-white
                p-4
                shadow-sm
                sm:p-5
            ">
                {/* Cabecera */}

                <div className="
                    mb-4
                    flex
                    flex-col
                    gap-3
                    lg:flex-row
                    lg:items-center
                    lg:justify-between
                ">
                    <div>
                        <h2 className="
                            text-sm
                            font-bold
                            text-slate-900
                        ">
                            Filtros de consulta
                        </h2>

                        <p className="
                            mt-0.5
                            text-xs
                            text-slate-500
                        ">
                            Define la empresa, el tipo de movimiento y el período a revisar.
                        </p>
                    </div>

                    {/* Acciones */}

                    <div className="
                        flex
                        flex-col
                        gap-2
                        sm:flex-row
                    ">
                        <button
                            type="button"
                            onClick={
                                handleActualizar
                            }
                            disabled={
                                accionLoading !==
                                null
                            }
                            className="
                                inline-flex
                                h-10
                                items-center
                                justify-center
                                gap-2
                                rounded-xl
                                border
                                border-cyan-300
                                bg-white
                                px-4
                                text-sm
                                font-bold
                                text-cyan-700
                                transition
                                hover:bg-cyan-50
                                disabled:cursor-not-allowed
                                disabled:opacity-60
                            "
                        >
                            <ReloadOutlined
                                className={
                                    accionLoading ===
                                        "actualizar"
                                        ? "animate-spin"
                                        : ""
                                }
                            />

                            {accionLoading ===
                                "actualizar"
                                ? "Actualizando..."
                                : "Actualizar vista"}
                        </button>

                        <button
                            type="button"
                            onClick={
                                handleConsultarSii
                            }
                            disabled={
                                accionLoading !==
                                null
                            }
                            className="
                                inline-flex
                                h-10
                                items-center
                                justify-center
                                gap-2
                                rounded-xl
                                border
                                border-cyan-300
                                bg-cyan-600
                                px-4
                                text-sm
                                font-bold
                                text-white
                                transition
                                hover:bg-cyan-500
                                disabled:cursor-not-allowed
                                disabled:opacity-60
                            "
                        >
                            <CloudSyncOutlined
                                className={
                                    accionLoading ===
                                        "sii"
                                        ? "animate-spin"
                                        : ""
                                }
                            />

                            {accionLoading ===
                                "sii"
                                ? "Consultando..."
                                : "Consultar SII"}
                        </button>
                    </div>
                </div>

                {/* Filtros */}

                <div className="
                    grid
                    grid-cols-1
                    gap-3
                    sm:grid-cols-2
                    lg:grid-cols-4
                ">
                    {/* Empresa */}

                    <div>
                        <label className="
                            mb-1
                            block
                            text-[11px]
                            font-bold
                            uppercase
                            tracking-wide
                            text-slate-500
                        ">
                            Empresa
                        </label>

                        <select
                            value={
                                empresa
                            }
                            onChange={(
                                e
                            ) =>
                                setEmpresa(
                                    e.target
                                        .value as EmpresaKey
                                )
                            }
                            disabled={
                                accionLoading !==
                                null
                            }
                            className="
                                h-10
                                w-full
                                rounded-xl
                                border
                                border-cyan-200
                                bg-white
                                px-3
                                text-sm
                                font-medium
                                text-slate-700
                                outline-none
                                transition
                                focus:border-cyan-500
                                focus:ring-2
                                focus:ring-cyan-100
                                disabled:cursor-not-allowed
                                disabled:opacity-60
                            "
                        >
                            <option value="econnet">
                                ECONNET
                            </option>

                            <option value="rids">
                                RIDS
                            </option>
                        </select>
                    </div>

                    {/* Tipo */}

                    <div>
                        <label className="
                            mb-1
                            block
                            text-[11px]
                            font-bold
                            uppercase
                            tracking-wide
                            text-slate-500
                        ">
                            Tipo
                        </label>

                        <select
                            value={
                                activeTab
                            }
                            onChange={(
                                e
                            ) =>
                                setActiveTab(
                                    e.target
                                        .value as TipoRcv
                                )
                            }
                            disabled={
                                accionLoading !==
                                null
                            }
                            className="
                                h-10
                                w-full
                                rounded-xl
                                border
                                border-cyan-200
                                bg-white
                                px-3
                                text-sm
                                font-medium
                                text-slate-700
                                outline-none
                                transition
                                focus:border-cyan-500
                                focus:ring-2
                                focus:ring-cyan-100
                                disabled:cursor-not-allowed
                                disabled:opacity-60
                            "
                        >
                            <option value="ventas">
                                Ventas
                            </option>

                            <option value="compras">
                                Compras
                            </option>
                        </select>
                    </div>

                    {/* Mes */}

                    <div>
                        <label className="
                            mb-1
                            block
                            text-[11px]
                            font-bold
                            uppercase
                            tracking-wide
                            text-slate-500
                        ">
                            Mes
                        </label>

                        <select
                            value={
                                mes
                            }
                            onChange={(
                                e
                            ) =>
                                setMes(
                                    e.target
                                        .value
                                )
                            }
                            disabled={
                                accionLoading !==
                                null
                            }
                            className="
                                h-10
                                w-full
                                rounded-xl
                                border
                                border-cyan-200
                                bg-white
                                px-3
                                text-sm
                                font-medium
                                text-slate-700
                                outline-none
                                transition
                                focus:border-cyan-500
                                focus:ring-2
                                focus:ring-cyan-100
                                disabled:cursor-not-allowed
                                disabled:opacity-60
                            "
                        >
                            {MESES.map(
                                (
                                    nombre,
                                    index
                                ) => {
                                    const value =
                                        String(
                                            index +
                                            1
                                        ).padStart(
                                            2,
                                            "0"
                                        );

                                    return (
                                        <option
                                            key={
                                                value
                                            }
                                            value={
                                                value
                                            }
                                        >
                                            {
                                                nombre
                                            }
                                        </option>
                                    );
                                }
                            )}
                        </select>
                    </div>

                    {/* Año */}

                    <div>
                        <label className="
                            mb-1
                            block
                            text-[11px]
                            font-bold
                            uppercase
                            tracking-wide
                            text-slate-500
                        ">
                            Año
                        </label>

                        <input
                            type="number"
                            min="2000"
                            max="2100"
                            value={
                                ano
                            }
                            onChange={(
                                e
                            ) =>
                                setAno(
                                    e.target
                                        .value
                                )
                            }
                            disabled={
                                accionLoading !==
                                null
                            }
                            className="
                                h-10
                                w-full
                                rounded-xl
                                border
                                border-cyan-200
                                bg-white
                                px-3
                                text-sm
                                font-medium
                                text-slate-700
                                outline-none
                                transition
                                focus:border-cyan-500
                                focus:ring-2
                                focus:ring-cyan-100
                                disabled:cursor-not-allowed
                                disabled:opacity-60
                            "
                        />
                    </div>
                </div>
            </div>

            {/* =================================================
                PANEL
            ================================================= */}

            <RcvConciliacionPanel
                ref={
                    conciliacionPanelRef
                }
                empresa={
                    empresa
                }
                activeTab={
                    activeTab
                }
                mes={
                    mes
                }
                ano={
                    ano
                }
            />
        </div>
    );
}