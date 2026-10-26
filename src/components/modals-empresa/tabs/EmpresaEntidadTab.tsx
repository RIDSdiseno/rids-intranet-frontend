import {
    useCallback,
    useEffect,
    useState,
} from "react";

import {
    Alert,
    Button,
    Empty,
    Popconfirm,
    Spin,
    Tag,
    Tooltip,
    message,
} from "antd";

import {
    ApartmentOutlined,
    LinkOutlined,
    ReloadOutlined,
    DisconnectOutlined,
    CheckCircleOutlined,
    ExclamationCircleOutlined,
    ThunderboltOutlined,
} from "@ant-design/icons";

import {
    desvincularEntidadEmpresa,
    getRelacionEmpresaEntidades,
    intentarRelacionAutomatica,
    vincularEntidadEmpresa,
} from "../relaciones-entidad/empresaEntidad.api";

import type {
    EmpresaEntidadRelacionResponse,
    EmpresaEntidadSugerencia,
} from "../relaciones-entidad/empresaEntidad.types";

import VincularEntidadModal from "../relaciones-entidad/VincularEntidadModal";


type RelacionData =
    EmpresaEntidadRelacionResponse["data"];


type Props = {
    empresaId:
    number;

    empresaNombre:
    string;

    canManage?:
    boolean;
};


export default function EmpresaEntidadTab({
    empresaId,
    empresaNombre,
    canManage = false,
}: Props) {

    const [
        data,
        setData,
    ] =
        useState<
            RelacionData |
            null
        >(
            null
        );


    const [
        loading,
        setLoading,
    ] =
        useState(
            true
        );


    const [
        manualOpen,
        setManualOpen,
    ] =
        useState(
            false
        );


    const [
        automaticLoading,
        setAutomaticLoading,
    ] =
        useState(
            false
        );


    const [
        actionId,
        setActionId,
    ] =
        useState<
            number |
            null
        >(
            null
        );


    const cargar =
        useCallback(
            async () => {

                try {

                    setLoading(
                        true
                    );


                    const result =
                        await getRelacionEmpresaEntidades(
                            empresaId
                        );


                    setData(
                        result
                    );

                } catch (
                error:
                    any
                ) {

                    message.error(
                        error
                            ?.response
                            ?.data
                            ?.error ||
                        "No se pudo obtener la relación comercial"
                    );

                } finally {

                    setLoading(
                        false
                    );
                }

            },
            [
                empresaId,
            ]
        );


    useEffect(
        () => {

            void cargar();

        },
        [
            cargar,
        ]
    );


    async function handleRelacionAutomatica() {

        try {

            setAutomaticLoading(
                true
            );


            const result =
                await intentarRelacionAutomatica(
                    empresaId
                );


            switch (
            result.motivo
            ) {

                case "RUT_EXACTO":

                    message.success(
                        "Entidad relacionada automáticamente por coincidencia exacta de RUT"
                    );

                    break;


                case "YA_VINCULADA":

                    message.info(
                        "La entidad ya se encontraba relacionada"
                    );

                    break;


                case "EMPRESA_SIN_RUT":

                    message.warning(
                        "La empresa no tiene un RUT registrado"
                    );

                    break;


                case "SIN_COINCIDENCIA_RUT":

                    message.info(
                        "No se encontró una entidad con el mismo RUT"
                    );

                    break;


                case "MULTIPLES_COINCIDENCIAS":

                    message.warning(
                        "Se encontraron múltiples coincidencias. Debes seleccionar una manualmente."
                    );

                    break;


                case "EMPRESA_INACTIVA":

                    message.warning(
                        "No se puede relacionar automáticamente una empresa inactiva"
                    );

                    break;


                default:

                    message.info(
                        "No fue posible crear una relación automática"
                    );
            }


            await cargar();

        } catch (
        error:
            any
        ) {

            message.error(
                error
                    ?.response
                    ?.data
                    ?.error ||
                "No se pudo ejecutar la relación automática"
            );

        } finally {

            setAutomaticLoading(
                false
            );
        }
    }


    async function handleVincularSugerencia(
        sugerencia:
            EmpresaEntidadSugerencia
    ) {

        try {

            setActionId(
                sugerencia.id
            );


            await vincularEntidadEmpresa(
                empresaId,
                sugerencia.id
            );


            message.success(
                "Entidad vinculada correctamente"
            );


            await cargar();

        } catch (
        error:
            any
        ) {

            message.error(
                error
                    ?.response
                    ?.data
                    ?.error ||
                "No se pudo vincular la entidad"
            );

        } finally {

            setActionId(
                null
            );
        }
    }


    async function handleDesvincular(
        entidadId:
            number
    ) {

        try {

            setActionId(
                entidadId
            );


            await desvincularEntidadEmpresa(
                empresaId,
                entidadId
            );


            message.success(
                "Entidad desvinculada correctamente"
            );


            await cargar();

        } catch (
        error:
            any
        ) {

            message.error(
                error
                    ?.response
                    ?.data
                    ?.error ||
                "No se pudo desvincular la entidad"
            );

        } finally {

            setActionId(
                null
            );
        }
    }


    if (
        loading
    ) {

        return (
            <div className="flex min-h-[220px] items-center justify-center">
                <Spin />
            </div>
        );
    }


    if (
        !data
    ) {

        return (
            <Empty
                description="No se pudo cargar la relación comercial"
            />
        );
    }


    const relacionadas =
        data.entidadesRelacionadas ??
        [];


    const sugerencias =
        data.sugerencias ??
        [];


    return (
        <div className="space-y-5">

            {/* ================================
                ENCABEZADO
            ================================= */}

            <div
                className="
                    flex
                    flex-col
                    gap-3
                    rounded-2xl
                    border
                    border-slate-200
                    bg-white
                    p-4
                    sm:flex-row
                    sm:items-center
                    sm:justify-between
                "
            >

                <div>

                    <div className="flex items-center gap-2">

                        <ApartmentOutlined className="text-cyan-700" />

                        <h3 className="m-0 text-base font-semibold text-slate-800">
                            Relación comercial
                        </h3>

                    </div>


                    <p className="mt-1 mb-0 text-sm text-slate-500">
                        Relaciona esta empresa con las entidades utilizadas en cotizaciones, órdenes de trabajo y Funnel.
                    </p>

                </div>


                <div className="flex flex-wrap gap-2">

                    <Button
                        icon={
                            <ReloadOutlined />
                        }

                        onClick={
                            () =>
                                void cargar()
                        }
                    >
                        Actualizar
                    </Button>


                    {
                        canManage &&
                        (
                            <>
                                <Tooltip
                                    title="Busca automáticamente una entidad con el mismo RUT"
                                >
                                    <Button
                                        icon={
                                            <ThunderboltOutlined />
                                        }

                                        loading={
                                            automaticLoading
                                        }

                                        onClick={
                                            () =>
                                                void handleRelacionAutomatica()
                                        }
                                    >
                                        Buscar automáticamente
                                    </Button>
                                </Tooltip>


                                <Button
                                    type="primary"

                                    icon={
                                        <LinkOutlined />
                                    }

                                    onClick={
                                        () =>
                                            setManualOpen(
                                                true
                                            )
                                    }
                                >
                                    Relacionar entidad
                                </Button>
                            </>
                        )
                    }

                </div>

            </div>


            {/* ================================
                ESTADO
            ================================= */}

            {
                relacionadas.length >
                    0
                    ? (
                        <Alert
                            type="success"
                            showIcon

                            message={
                                `${relacionadas.length} entidad${relacionadas.length === 1 ? "" : "es"} vinculada${relacionadas.length === 1 ? "" : "s"}`
                            }

                            description="Las cotizaciones, órdenes de trabajo y otros registros asociados a estas entidades podrán relacionarse correctamente con esta empresa."
                        />
                    )
                    : (
                        <Alert
                            type="warning"
                            showIcon

                            message="Empresa sin entidad relacionada"

                            description="Mientras no exista una relación, algunos registros comerciales pueden no ser visibles para usuarios cliente de esta empresa."
                        />
                    )
            }


            {/* ================================
                ENTIDADES ACTUALES
            ================================= */}

            <div>

                <h4 className="mb-3 text-sm font-semibold text-slate-700">
                    Entidades relacionadas
                </h4>


                {
                    relacionadas.length ===
                        0
                        ? (
                            <Empty
                                image={
                                    Empty.PRESENTED_IMAGE_SIMPLE
                                }

                                description="No existen entidades vinculadas"
                            />
                        )
                        : (
                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">

                                {
                                    relacionadas.map(
                                        (
                                            entidad
                                        ) => (

                                            <div
                                                key={
                                                    entidad.id
                                                }

                                                className="
                                                    rounded-2xl
                                                    border
                                                    border-emerald-200
                                                    bg-emerald-50/40
                                                    p-4
                                                "
                                            >

                                                <div className="flex items-start justify-between gap-3">

                                                    <div>

                                                        <div className="flex items-center gap-2">

                                                            <CheckCircleOutlined className="text-emerald-600" />

                                                            <span className="font-semibold text-slate-800">
                                                                {
                                                                    entidad.nombre
                                                                }
                                                            </span>

                                                        </div>


                                                        <div className="mt-2 text-xs text-slate-500">

                                                            RUT:{" "}

                                                            <span className="font-medium text-slate-700">
                                                                {
                                                                    entidad.rut ||
                                                                    "Sin RUT"
                                                                }
                                                            </span>

                                                        </div>


                                                        <div className="mt-2">

                                                            <Tag color="green">
                                                                Vinculada
                                                            </Tag>

                                                            <Tag>
                                                                {
                                                                    entidad.origen
                                                                }
                                                            </Tag>

                                                        </div>

                                                    </div>


                                                    {
                                                        canManage &&
                                                        (
                                                            <Popconfirm
                                                                title="Desvincular entidad"
                                                                description="La entidad dejará de estar asociada a esta empresa. Los registros históricos no se eliminarán."
                                                                okText="Desvincular"
                                                                cancelText="Cancelar"
                                                                okButtonProps={{
                                                                    danger:
                                                                        true,
                                                                }}

                                                                onConfirm={
                                                                    () =>
                                                                        void handleDesvincular(
                                                                            entidad.id
                                                                        )
                                                                }
                                                            >
                                                                <Button
                                                                    danger
                                                                    size="small"

                                                                    loading={
                                                                        actionId ===
                                                                        entidad.id
                                                                    }

                                                                    icon={
                                                                        <DisconnectOutlined />
                                                                    }
                                                                >
                                                                    Desvincular
                                                                </Button>
                                                            </Popconfirm>
                                                        )
                                                    }

                                                </div>

                                            </div>
                                        )
                                    )
                                }

                            </div>
                        )
                }

            </div>


            {/* ================================
                SUGERENCIAS
            ================================= */}

            {
                sugerencias.length >
                0 &&
                (
                    <div>

                        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">

                            <ExclamationCircleOutlined className="text-amber-500" />

                            Sugerencias encontradas

                        </h4>


                        <div className="space-y-2">

                            {
                                sugerencias.map(
                                    (
                                        sugerencia
                                    ) => (

                                        <div
                                            key={
                                                sugerencia.id
                                            }

                                            className="
                                                flex
                                                flex-col
                                                gap-3
                                                rounded-xl
                                                border
                                                border-amber-200
                                                bg-amber-50/40
                                                p-4
                                                sm:flex-row
                                                sm:items-center
                                                sm:justify-between
                                            "
                                        >

                                            <div>

                                                <div className="font-semibold text-slate-800">
                                                    {
                                                        sugerencia.nombre
                                                    }
                                                </div>


                                                <div className="mt-1 text-xs text-slate-500">
                                                    RUT:{" "}
                                                    {
                                                        sugerencia.rut ||
                                                        "Sin RUT"
                                                    }
                                                </div>


                                                <div className="mt-2">

                                                    <Tag
                                                        color={
                                                            sugerencia.coincidencia ===
                                                                "RUT_EXACTO"
                                                                ? "green"
                                                                : "gold"
                                                        }
                                                    >
                                                        {
                                                            sugerencia.coincidencia ===
                                                                "RUT_EXACTO"
                                                                ? "Coincidencia exacta de RUT"
                                                                : "Coincidencia exacta de nombre"
                                                        }
                                                    </Tag>

                                                </div>

                                            </div>


                                            {
                                                canManage &&
                                                (
                                                    <Button
                                                        type={
                                                            sugerencia.coincidencia ===
                                                                "RUT_EXACTO"
                                                                ? "primary"
                                                                : "default"
                                                        }

                                                        loading={
                                                            actionId ===
                                                            sugerencia.id
                                                        }

                                                        onClick={
                                                            () =>
                                                                void handleVincularSugerencia(
                                                                    sugerencia
                                                                )
                                                        }
                                                    >
                                                        Vincular
                                                    </Button>
                                                )
                                            }

                                        </div>
                                    )
                                )
                            }

                        </div>

                    </div>
                )
            }


            <VincularEntidadModal
                open={
                    manualOpen
                }

                empresaId={
                    empresaId
                }

                empresaNombre={
                    empresaNombre
                }

                onClose={
                    () =>
                        setManualOpen(
                            false
                        )
                }

                onSuccess={
                    () =>
                        void cargar()
                }
            />

        </div>
    );
}