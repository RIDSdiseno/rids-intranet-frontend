// src/host/ProteccionDatos.tsx
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import axios from "axios";

import {
    Button,
    Card,
    Dropdown,
    Empty,
    Input,
    Modal,
    Select,
    Table,
    Tag,
    message,
} from "antd";

import type {
    MenuProps,
} from "antd";

import {
    Ban,
    CheckCircle2,
    CirclePlus,
    Eye,
    FileCheck2,
    MoreHorizontal,
    Pencil,
    RefreshCw,
    ShieldCheck,
    Users,
    Mail
} from "lucide-react";

import {
    activarCampaniaProteccionDatos,
    cancelarCampaniaProteccionDatos,
    finalizarCampaniaProteccionDatos,
    listarCampaniasProteccionDatos,
    enviarCampaniaProteccionDatos
} from "../components/modals-proteccion-datos/proteccion-datos.api";

import {
    getEstadoCampaniaColor,
    getEstadoCampaniaLabel,
} from "../components/modals-proteccion-datos/proteccion-datos.helpers";

import type {
    CampaniaProteccionDatos,
    EstadoCampaniaProteccionDatos,
} from "../components/modals-proteccion-datos/proteccion-datos.types";

import CampaniaFormModal
    from "../components/modals-proteccion-datos/CampaniaFormModal";

import CampaniaDetalleModal
    from "../components/modals-proteccion-datos/CampaniaDetalleModal";

import DestinatariosCampaniaModal
    from "../components/modals-proteccion-datos/DestinatariosCampaniaModal";

export default function ProteccionDatos() {

    const [
        messageApi,
        messageContextHolder,
    ] =
        message.useMessage();

    const [
        modal,
        modalContextHolder,
    ] =
        Modal.useModal();

    const [
        campanias,
        setCampanias,
    ] =
        useState<
            CampaniaProteccionDatos[]
        >(
            [],
        );

    const [
        loading,
        setLoading,
    ] =
        useState(
            false,
        );

    const [
        search,
        setSearch,
    ] =
        useState(
            "",
        );

    const [
        estado,
        setEstado,
    ] =
        useState<
            EstadoCampaniaProteccionDatos |
            undefined
        >(
            undefined,
        );

    const [
        selected,
        setSelected,
    ] =
        useState<
            CampaniaProteccionDatos |
            null
        >(
            null,
        );

    const [
        formOpen,
        setFormOpen,
    ] =
        useState(
            false,
        );

    const [
        detailOpen,
        setDetailOpen,
    ] =
        useState(
            false,
        );

    const [
        destinatariosOpen,
        setDestinatariosOpen,
    ] =
        useState(
            false,
        );

    /* =====================================================
       CARGAR
       ===================================================== */

    const cargar =
        useCallback(
            async () => {
                try {
                    setLoading(
                        true,
                    );

                    const params: {
                        estado?:
                        EstadoCampaniaProteccionDatos;

                        search?:
                        string;

                        skip?:
                        number;

                        take?:
                        number;
                    } = {
                        skip:
                            0,

                        take:
                            100,
                    };

                    if (
                        estado
                    ) {
                        params.estado =
                            estado;
                    }

                    if (
                        search.trim()
                    ) {
                        params.search =
                            search.trim();
                    }

                    const data =
                        await listarCampaniasProteccionDatos(
                            params,
                        );

                    setCampanias(
                        data.items,
                    );
                } catch (
                error
                ) {
                    mostrarError(
                        error,
                        "No se pudieron cargar las campañas",
                    );
                } finally {
                    setLoading(
                        false,
                    );
                }
            },
            [
                estado,
                search,
            ],
        );

    useEffect(
        () => {
            const timer =
                window.setTimeout(
                    () => {
                        void cargar();
                    },
                    300,
                );

            return () =>
                window.clearTimeout(
                    timer,
                );
        },
        [
            cargar,
        ],
    );

    /* =====================================================
       KPIs
       ===================================================== */

    const metricas =
        useMemo(
            () => ({
                total:
                    campanias.length,

                borradores:
                    campanias.filter(
                        (
                            item,
                        ) =>
                            item.estado ===
                            "BORRADOR",
                    ).length,

                activas:
                    campanias.filter(
                        (
                            item,
                        ) =>
                            item.estado ===
                            "ACTIVA",
                    ).length,

                finalizadas:
                    campanias.filter(
                        (
                            item,
                        ) =>
                            item.estado ===
                            "FINALIZADA",
                    ).length,
            }),
            [
                campanias,
            ],
        );

    /* =====================================================
       ESTADOS
       ===================================================== */

    type ApiErrorResponse = {
        ok?: boolean;

        error?: string;

        message?: string;
    };

    function obtenerMensajeError(
        error: unknown,
        fallback: string,
    ): string {

        if (
            axios.isAxiosError<ApiErrorResponse>(
                error,
            )
        ) {
            return (
                error.response
                    ?.data
                    ?.error ??
                error.response
                    ?.data
                    ?.message ??
                error.message ??
                fallback
            );
        }

        if (
            error instanceof Error &&
            error.message
        ) {
            return error.message;
        }

        return fallback;
    }

    function mostrarError(
        error: unknown,
        fallback: string,
    ) {

        const mensaje =
            obtenerMensajeError(
                error,
                fallback,
            );

        console.error(
            "[ProteccionDatos]",
            error,
        );

        messageApi.error({
            content:
                mensaje,

            duration:
                5,
        });
    }

    function activar(
        campania:
            CampaniaProteccionDatos,
    ) {
        modal.confirm({
            title:
                "Activar campaña",

            content:
                `La campaña tiene ${campania._count?.destinatarios ?? 0} destinatarios. Una vez activada, el documento y la audiencia quedarán bloqueados.`,

            okText:
                "Activar",

            cancelText:
                "Cancelar",

            async onOk() {
                try {

                    await activarCampaniaProteccionDatos(
                        campania.id,
                    );

                    messageApi.success({
                        content:
                            "Campaña activada correctamente",

                        duration:
                            3,
                    });

                    await cargar();

                } catch (
                error
                ) {

                    mostrarError(
                        error,
                        "No se pudo activar la campaña",
                    );

                    /*
                     * Rechazamos para que el modal de
                     * confirmación permanezca abierto.
                     */
                    return Promise.reject(
                        error,
                    );
                }
            },
        });
    }

    function enviar(
        campania:
            CampaniaProteccionDatos,
    ) {

        modal.confirm({
            title:
                "Enviar campaña",

            content:
                `Se enviará un correo personalizado a los destinatarios pendientes de "${campania.nombre}". Cada persona recibirá un enlace único de consentimiento.`,

            okText:
                "Enviar correos",

            cancelText:
                "Volver",

            async onOk() {

                try {

                    const resultado =
                        await enviarCampaniaProteccionDatos(
                            campania.id,
                        );

                    if (
                        resultado.errores ===
                        0
                    ) {
                        message.success(
                            `${resultado.enviados} correos enviados correctamente`,
                        );
                    } else {
                        message.warning(
                            `${resultado.enviados} enviados y ${resultado.errores} con error`,
                        );
                    }

                    await cargar();

                } catch (
                error
                ) {

                    mostrarError(
                        error,
                        "No se pudo enviar la campaña",
                    );

                    throw error;
                }
            },
        });
    }

    function finalizar(
        campania:
            CampaniaProteccionDatos,
    ) {
        modal.confirm({
            title:
                "Finalizar campaña",

            content:
                "La campaña pasará a estado FINALIZADA y no podrá volver a activarse.",

            okText:
                "Finalizar",

            cancelText:
                "Volver",

            async onOk() {
                try {

                    await finalizarCampaniaProteccionDatos(
                        campania.id,
                    );

                    messageApi.success({
                        content:
                            "Campaña finalizada correctamente",

                        duration:
                            3,
                    });

                    await cargar();

                } catch (
                error
                ) {

                    mostrarError(
                        error,
                        "No se pudo finalizar la campaña",
                    );

                    return Promise.reject(
                        error,
                    );
                }
            },
        });
    }

    function cancelar(
        campania:
            CampaniaProteccionDatos,
    ) {
        modal.confirm({
            title:
                "Cancelar campaña",

            content:
                "La campaña pasará a estado CANCELADA y no podrá continuar.",

            okText:
                "Cancelar campaña",

            cancelText:
                "Volver",

            okButtonProps: {
                danger:
                    true,
            },

            async onOk() {
                try {

                    await cancelarCampaniaProteccionDatos(
                        campania.id,
                    );

                    messageApi.success({
                        content:
                            "Campaña cancelada correctamente",

                        duration:
                            3,
                    });

                    await cargar();

                } catch (
                error
                ) {

                    mostrarError(
                        error,
                        "No se pudo cancelar la campaña",
                    );

                    return Promise.reject(
                        error,
                    );
                }
            },
        });
    }

    /* =====================================================
       ACCIONES
       ===================================================== */

    function menuCampania(
        campania:
            CampaniaProteccionDatos,
    ): MenuProps["items"] {

        const items:
            MenuProps["items"] = [
                {
                    key:
                        "ver",

                    label:
                        "Ver detalle",

                    icon:
                        <Eye
                            size={
                                16
                            }
                        />,
                },

                {
                    key:
                        "destinatarios",

                    label:
                        "Destinatarios",

                    icon:
                        <Users
                            size={
                                16
                            }
                        />,
                },
            ];

        if (
            campania.estado ===
            "BORRADOR"
        ) {
            items.push(
                {
                    key:
                        "editar",

                    label:
                        "Editar",

                    icon:
                        <Pencil
                            size={
                                16
                            }
                        />,
                },

                {
                    type:
                        "divider",
                },

                {
                    key:
                        "activar",

                    label:
                        "Activar",

                    icon:
                        <CheckCircle2
                            size={
                                16
                            }
                        />,
                },
            );
        }

        if (
            campania.estado ===
            "ACTIVA"
        ) {
            items.push(
                {
                    key:
                        "enviar",

                    label:
                        "Enviar campaña",

                    icon:
                        <Mail
                            size={
                                16
                            }
                        />,
                },

                {
                    key:
                        "finalizar",

                    label:
                        "Finalizar",

                    icon:
                        <FileCheck2
                            size={
                                16
                            }
                        />,
                },
            );
        }

        if (
            campania.estado ===
            "BORRADOR" ||
            campania.estado ===
            "ACTIVA"
        ) {
            items.push(
                {
                    type:
                        "divider",
                },

                {
                    key:
                        "cancelar",

                    danger:
                        true,

                    label:
                        "Cancelar campaña",

                    icon:
                        <Ban
                            size={
                                16
                            }
                        />,
                },
            );
        }

        return items;
    }

    function handleMenuAction(
        key: string,
        campania:
            CampaniaProteccionDatos,
    ) {
        switch (
        key
        ) {
            case "ver": {
                setSelected(
                    campania,
                );

                setDetailOpen(
                    true,
                );

                return;
            }

            case "destinatarios": {
                setSelected(
                    campania,
                );

                setDestinatariosOpen(
                    true,
                );

                return;
            }

            case "editar": {
                setSelected(
                    campania,
                );

                setFormOpen(
                    true,
                );

                return;
            }

            case "activar": {
                activar(
                    campania,
                );

                return;
            }

            case "enviar": {
                enviar(
                    campania,
                );

                return;
            }

            case "finalizar": {
                finalizar(
                    campania,
                );

                return;
            }

            case "cancelar": {
                cancelar(
                    campania,
                );

                return;
            }

            default:
                return;
        }
    }

    return (
        <>
            {messageContextHolder}

            {modalContextHolder}

            <div className="mx-auto w-full max-w-[1500px] p-4 sm:p-6 lg:p-8">

                {/* =================================================
                HEADER
                ================================================= */}

                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div>
                        <div className="flex items-center gap-3">

                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                                <ShieldCheck
                                    size={
                                        24
                                    }
                                />
                            </div>

                            <div>
                                <h1 className="text-2xl font-bold text-slate-900">
                                    Protección de datos
                                </h1>

                                <p className="text-sm text-slate-500">
                                    Gestión de campañas, destinatarios y consentimientos.
                                </p>
                            </div>

                        </div>
                    </div>

                    <div className="flex gap-2">

                        <Button
                            icon={
                                <RefreshCw
                                    size={
                                        16
                                    }
                                />
                            }
                            onClick={() =>
                                void cargar()
                            }
                        >
                            Actualizar
                        </Button>

                        <Button
                            type="primary"
                            icon={
                                <CirclePlus
                                    size={
                                        16
                                    }
                                />
                            }
                            onClick={() => {
                                setSelected(
                                    null,
                                );

                                setFormOpen(
                                    true,
                                );
                            }}
                        >
                            Nueva campaña
                        </Button>

                    </div>

                </div>

                {/* =================================================
                KPIs
                ================================================= */}

                <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">

                    <Card size="small">
                        <div className="text-sm text-slate-500">
                            Total
                        </div>

                        <div className="mt-1 text-2xl font-bold text-slate-900">
                            {
                                metricas.total
                            }
                        </div>
                    </Card>

                    <Card size="small">
                        <div className="text-sm text-slate-500">
                            Borradores
                        </div>

                        <div className="mt-1 text-2xl font-bold text-slate-900">
                            {
                                metricas.borradores
                            }
                        </div>
                    </Card>

                    <Card size="small">
                        <div className="text-sm text-slate-500">
                            Activas
                        </div>

                        <div className="mt-1 text-2xl font-bold text-slate-900">
                            {
                                metricas.activas
                            }
                        </div>
                    </Card>

                    <Card size="small">
                        <div className="text-sm text-slate-500">
                            Finalizadas
                        </div>

                        <div className="mt-1 text-2xl font-bold text-slate-900">
                            {
                                metricas.finalizadas
                            }
                        </div>
                    </Card>

                </div>

                {/* =================================================
                FILTROS
                ================================================= */}

                <div className="mb-4 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_220px]">

                    <Input.Search
                        allowClear
                        value={
                            search
                        }
                        onChange={(
                            event,
                        ) =>
                            setSearch(
                                event.target.value,
                            )
                        }
                        placeholder="Buscar campaña..."
                    />

                    <Select
                        allowClear
                        placeholder="Todos los estados"
                        value={
                            estado
                        }
                        onChange={
                            setEstado
                        }
                        options={[
                            {
                                value:
                                    "BORRADOR",

                                label:
                                    "Borrador",
                            },

                            {
                                value:
                                    "ACTIVA",

                                label:
                                    "Activa",
                            },

                            {
                                value:
                                    "FINALIZADA",

                                label:
                                    "Finalizada",
                            },

                            {
                                value:
                                    "CANCELADA",

                                label:
                                    "Cancelada",
                            },
                        ]}
                    />

                </div>

                {/* =================================================
                TABLA
                ================================================= */}

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

                    <Table
                        rowKey="id"
                        loading={
                            loading
                        }
                        dataSource={
                            campanias
                        }
                        locale={{
                            emptyText:
                                <Empty
                                    description="No hay campañas"
                                />,
                        }}
                        scroll={{
                            x:
                                900,
                        }}
                        columns={[
                            {
                                title:
                                    "Campaña",

                                key:
                                    "nombre",

                                render: (
                                    _,
                                    row,
                                ) => (
                                    <div>
                                        <div className="font-semibold text-slate-800">
                                            {
                                                row.nombre
                                            }
                                        </div>

                                        <div className="mt-0.5 text-xs text-slate-500">
                                            {
                                                row.tituloDocumento
                                            }
                                        </div>
                                    </div>
                                ),
                            },

                            {
                                title:
                                    "Versión",

                                dataIndex:
                                    "versionDocumento",

                                key:
                                    "versionDocumento",

                                width:
                                    100,
                            },

                            {
                                title:
                                    "Estado",

                                dataIndex:
                                    "estado",

                                key:
                                    "estado",

                                width:
                                    130,

                                render: (
                                    value,
                                ) => (
                                    <Tag
                                        color={
                                            getEstadoCampaniaColor(
                                                value,
                                            )
                                        }
                                    >
                                        {
                                            getEstadoCampaniaLabel(
                                                value,
                                            )
                                        }
                                    </Tag>
                                ),
                            },

                            {
                                title:
                                    "Destinatarios",

                                key:
                                    "destinatarios",

                                width:
                                    130,

                                render: (
                                    _,
                                    row,
                                ) =>
                                    row
                                        ._count
                                        ?.destinatarios ??
                                    0,
                            },

                            {
                                title:
                                    "Creada",

                                dataIndex:
                                    "createdAt",

                                key:
                                    "createdAt",

                                width:
                                    150,

                                render: (
                                    value:
                                        string,
                                ) =>
                                    new Intl.DateTimeFormat(
                                        "es-CL",
                                        {
                                            dateStyle:
                                                "medium",
                                        },
                                    ).format(
                                        new Date(
                                            value,
                                        ),
                                    ),
                            },

                            {
                                title:
                                    "",

                                key:
                                    "acciones",

                                width:
                                    60,

                                fixed:
                                    "right",

                                render: (
                                    _,
                                    row,
                                ) => (
                                    <Dropdown
                                        trigger={[
                                            "click",
                                        ]}
                                        menu={{
                                            items:
                                                menuCampania(
                                                    row,
                                                ),

                                            onClick: ({
                                                key,
                                            }) => {
                                                handleMenuAction(
                                                    key,
                                                    row,
                                                );
                                            },
                                        }}
                                    >
                                        <Button
                                            type="text"
                                            icon={
                                                <MoreHorizontal
                                                    size={
                                                        18
                                                    }
                                                />
                                            }
                                        />
                                    </Dropdown>
                                ),
                            },
                        ]}
                    />

                </div>

                {/* =================================================
                MODALES
                ================================================= */}

                <CampaniaFormModal
                    open={
                        formOpen
                    }
                    campania={
                        selected
                    }
                    onClose={() => {
                        setFormOpen(
                            false,
                        );

                        setSelected(
                            null,
                        );
                    }}
                    onSaved={() => {
                        setFormOpen(
                            false,
                        );

                        setSelected(
                            null,
                        );

                        void cargar();
                    }}
                />

                <CampaniaDetalleModal
                    open={
                        detailOpen
                    }
                    campania={
                        selected
                    }
                    onClose={() => {
                        setDetailOpen(
                            false,
                        );

                        setSelected(
                            null,
                        );
                    }}
                />

                <DestinatariosCampaniaModal
                    open={
                        destinatariosOpen
                    }
                    campania={
                        selected
                    }
                    onClose={() => {
                        setDestinatariosOpen(
                            false,
                        );

                        setSelected(
                            null,
                        );
                    }}
                    onChanged={() => {
                        void cargar();
                    }}
                />

            </div>
        </>
    );
}