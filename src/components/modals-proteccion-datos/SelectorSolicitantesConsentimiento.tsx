import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Alert,
    Button,
    Checkbox,
    Empty,
    Input,
    Select,
    Spin,
} from "antd";

import {
    Search,
    Users,
} from "lucide-react";

import {
    listarEmpresasProteccionDatos,
    listarSolicitantesProteccionDatos,
} from "./proteccion-datos.api";

import type {
    EmpresaProteccionDatos,
    SolicitanteProteccionDatos,
} from "./proteccion-datos.types";

type Props = {
    value: number[];

    onChange:
    (ids: number[]) => void;

    disabled?: boolean;
};

export default function SelectorSolicitantesConsentimiento({
    value,
    onChange,
    disabled = false,
}: Props) {

    const [
        empresas,
        setEmpresas,
    ] =
        useState<
            EmpresaProteccionDatos[]
        >(
            [],
        );

    const [
        solicitantes,
        setSolicitantes,
    ] =
        useState<
            SolicitanteProteccionDatos[]
        >(
            [],
        );

    const [
        empresaId,
        setEmpresaId,
    ] =
        useState<
            number | null
        >(
            null,
        );

    const [
        search,
        setSearch,
    ] =
        useState(
            "",
        );

    const [
        loading,
        setLoading,
    ] =
        useState(
            false,
        );

    const [
        error,
        setError,
    ] =
        useState<
            string | null
        >(
            null,
        );

    /* =====================================================
       EMPRESAS
       ===================================================== */

    useEffect(
        () => {
            void (
                async () => {
                    try {
                        const items =
                            await listarEmpresasProteccionDatos();

                        setEmpresas(
                            items,
                        );
                    } catch (
                    error
                    ) {
                        console.error(
                            "[ProteccionDatos] Error cargando empresas:",
                            error,
                        );

                        setError(
                            "No se pudieron cargar las empresas.",
                        );
                    }
                }
            )();
        },
        [],
    );

    /* =====================================================
       SOLICITANTES
       ===================================================== */

    useEffect(
        () => {
            void (
                async () => {
                    try {
                        setLoading(
                            true,
                        );

                        setError(
                            null,
                        );

                        const items =
                            await listarSolicitantesProteccionDatos(
                                empresaId,
                            );

                        setSolicitantes(
                            items,
                        );
                    } catch (
                    error
                    ) {
                        console.error(
                            "[ProteccionDatos] Error cargando solicitantes:",
                            error,
                        );

                        setError(
                            "No se pudieron cargar los solicitantes.",
                        );
                    } finally {
                        setLoading(
                            false,
                        );
                    }
                }
            )();
        },
        [
            empresaId,
        ],
    );

    /* =====================================================
       FILTRO LOCAL
       ===================================================== */

    const visibles =
        useMemo(
            () => {
                const q =
                    search
                        .trim()
                        .toLowerCase();

                return solicitantes.filter(
                    (
                        solicitante,
                    ) => {
                        if (
                            !solicitante.email
                        ) {
                            return false;
                        }

                        if (
                            !q
                        ) {
                            return true;
                        }

                        return [
                            solicitante.nombre,
                            solicitante.email,
                            solicitante
                                .empresa
                                ?.nombre ??
                            "",
                        ]
                            .join(
                                " ",
                            )
                            .toLowerCase()
                            .includes(
                                q,
                            );
                    },
                );
            },
            [
                solicitantes,
                search,
            ],
        );

    const visiblesIds =
        visibles.map(
            (
                solicitante,
            ) =>
                solicitante.id_solicitante,
        );

    const todosVisiblesSeleccionados =
        visiblesIds.length >
        0 &&
        visiblesIds.every(
            (
                id,
            ) =>
                value.includes(
                    id,
                ),
        );

    const algunosVisiblesSeleccionados =
        visiblesIds.some(
            (
                id,
            ) =>
                value.includes(
                    id,
                ),
        );

    function toggleSolicitante(
        id: number,
        checked: boolean,
    ) {
        if (
            checked
        ) {
            onChange(
                Array.from(
                    new Set([
                        ...value,
                        id,
                    ]),
                ),
            );

            return;
        }

        onChange(
            value.filter(
                (
                    currentId,
                ) =>
                    currentId !==
                    id,
            ),
        );
    }

    function toggleTodosVisibles(
        checked: boolean,
    ) {
        if (
            checked
        ) {
            onChange(
                Array.from(
                    new Set([
                        ...value,
                        ...visiblesIds,
                    ]),
                ),
            );

            return;
        }

        const visibleSet =
            new Set(
                visiblesIds,
            );

        onChange(
            value.filter(
                (
                    id,
                ) =>
                    !visibleSet.has(
                        id,
                    ),
            ),
        );
    }

    return (
        <div className="space-y-4">

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

                <Select
                    allowClear
                    showSearch
                    disabled={
                        disabled
                    }
                    placeholder="Todas las empresas"
                    value={
                        empresaId ??
                        undefined
                    }
                    optionFilterProp="label"
                    onChange={(
                        value,
                    ) => {
                        setEmpresaId(
                            value ??
                            null,
                        );
                    }}
                    options={
                        empresas.map(
                            (
                                empresa,
                            ) => ({
                                value:
                                    empresa.id_empresa,

                                label:
                                    empresa.nombre,
                            }),
                        )
                    }
                />

                <Input
                    allowClear
                    disabled={
                        disabled
                    }
                    value={
                        search
                    }
                    onChange={(
                        event,
                    ) => {
                        setSearch(
                            event.target.value,
                        );
                    }}
                    prefix={
                        <Search
                            size={
                                16
                            }
                        />
                    }
                    placeholder="Buscar por nombre, correo o empresa"
                />

            </div>

            {error && (
                <Alert
                    type="error"
                    showIcon
                    message={
                        error
                    }
                />
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">

                <Checkbox
                    disabled={
                        disabled ||
                        visibles.length ===
                        0
                    }
                    checked={
                        todosVisiblesSeleccionados
                    }
                    indeterminate={
                        !todosVisiblesSeleccionados &&
                        algunosVisiblesSeleccionados
                    }
                    onChange={(
                        event,
                    ) => {
                        toggleTodosVisibles(
                            event.target.checked,
                        );
                    }}
                >
                    Seleccionar todos los visibles
                </Checkbox>

                <span className="text-sm font-medium text-slate-600">
                    {
                        value.length
                    } seleccionados
                </span>

            </div>

            <div className="max-h-[360px] overflow-y-auto rounded-xl border border-slate-200">

                {loading ? (
                    <div className="flex min-h-48 items-center justify-center">
                        <Spin />
                    </div>
                ) : visibles.length ===
                    0 ? (
                    <div className="py-10">
                        <Empty
                            description="No hay solicitantes disponibles"
                        />
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {visibles.map(
                            (
                                solicitante,
                            ) => {

                                const checked =
                                    value.includes(
                                        solicitante.id_solicitante,
                                    );

                                return (
                                    <label
                                        key={
                                            solicitante.id_solicitante
                                        }
                                        className="
                                            flex cursor-pointer
                                            items-start gap-3
                                            px-4 py-3
                                            transition
                                            hover:bg-slate-50
                                        "
                                    >
                                        <Checkbox
                                            disabled={
                                                disabled
                                            }
                                            checked={
                                                checked
                                            }
                                            onChange={(
                                                event,
                                            ) => {
                                                toggleSolicitante(
                                                    solicitante.id_solicitante,
                                                    event.target.checked,
                                                );
                                            }}
                                        />

                                        <div className="min-w-0 flex-1">

                                            <div className="flex items-center gap-2">
                                                <Users
                                                    size={
                                                        15
                                                    }
                                                    className="shrink-0 text-slate-400"
                                                />

                                                <span className="truncate font-medium text-slate-800">
                                                    {
                                                        solicitante.nombre
                                                    }
                                                </span>
                                            </div>

                                            <div className="mt-1 truncate text-sm text-slate-500">
                                                {
                                                    solicitante.email
                                                }
                                            </div>

                                            <div className="mt-0.5 truncate text-xs text-slate-400">
                                                {
                                                    solicitante
                                                        .empresa
                                                        ?.nombre ??
                                                    "Sin empresa"
                                                }
                                            </div>

                                        </div>
                                    </label>
                                );
                            },
                        )}
                    </div>
                )}

            </div>

            {value.length >
                0 && (
                    <div className="flex justify-end">
                        <Button
                            disabled={
                                disabled
                            }
                            onClick={() =>
                                onChange(
                                    [],
                                )
                            }
                        >
                            Limpiar selección
                        </Button>
                    </div>
                )}

        </div>
    );
}