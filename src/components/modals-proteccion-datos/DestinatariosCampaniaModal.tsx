// src/components/modals-proteccion-datos/DestinatariosCampaniaModal.tsx
import {
    useCallback,
    useEffect,
    useState,
    useMemo
} from "react";

import axios from "axios";

import {
    Alert,
    Button,
    Card,
    Input,
    Modal,
    Popconfirm,
    Select,
    Table,
    Tag,
    message,
} from "antd";

import {
    Trash2,
    UserPlus,
    Eye
} from "lucide-react";

import SelectorSolicitantesConsentimiento
    from "./SelectorSolicitantesConsentimiento";

import {
    agregarDestinatariosCampania,
    listarDestinatariosCampania,
    quitarDestinatarioCampania,
} from "./proteccion-datos.api";

import {
    getEstadoConsentimientoLabel,
} from "./proteccion-datos.helpers";

import type {
    CampaniaProteccionDatos,
    DestinatarioConsentimiento,
    EstadoConsentimientoDatos
} from "./proteccion-datos.types";

import ConsentimientoRespuestaModal
    from "./ConsentimientoRespuestaModal";

type Props = {
    open: boolean;

    campania:
    CampaniaProteccionDatos |
    null;

    onClose:
    () => void;

    onChanged:
    () => void;
};

export default function DestinatariosCampaniaModal({
    open,
    campania,
    onClose,
    onChanged,
}: Props) {

    const [
        search,
        setSearch,
    ] =
        useState(
            "",
        );

    const [
        estadoFiltro,
        setEstadoFiltro,
    ] =
        useState<
            EstadoConsentimientoDatos |
            "TODOS"
        >(
            "TODOS",
        );

    const [
        respuestaOpen,
        setRespuestaOpen,
    ] =
        useState(
            false,
        );

    const [
        destinatarioSeleccionado,
        setDestinatarioSeleccionado,
    ] =
        useState<
            DestinatarioConsentimiento |
            null
        >(
            null,
        );

    const [
        destinatarios,
        setDestinatarios,
    ] =
        useState<
            DestinatarioConsentimiento[]
        >(
            [],
        );

    const [
        selectedIds,
        setSelectedIds,
    ] =
        useState<
            number[]
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
        adding,
        setAdding,
    ] =
        useState(
            false,
        );

    const editable =
        campania?.estado ===
        "BORRADOR";

    const metricas =
        useMemo(
            () => ({
                total:
                    destinatarios.length,

                pendientes:
                    destinatarios.filter(
                        (
                            item,
                        ) =>
                            item.estado ===
                            "PENDIENTE",
                    ).length,

                enviados:
                    destinatarios.filter(
                        (
                            item,
                        ) =>
                            item.estado ===
                            "ENVIADO",
                    ).length,

                aceptados:
                    destinatarios.filter(
                        (
                            item,
                        ) =>
                            item.estado ===
                            "ACEPTADO",
                    ).length,

                rechazados:
                    destinatarios.filter(
                        (
                            item,
                        ) =>
                            item.estado ===
                            "RECHAZADO",
                    ).length,

                revocados:
                    destinatarios.filter(
                        (
                            item,
                        ) =>
                            item.estado ===
                            "REVOCADO",
                    ).length,

                errores:
                    destinatarios.filter(
                        (
                            item,
                        ) =>
                            item.estado ===
                            "ERROR_ENVIO",
                    ).length,
            }),
            [
                destinatarios,
            ],
        );

    const destinatariosFiltrados =
        useMemo(
            () => {

                const q =
                    search
                        .trim()
                        .toLowerCase();

                return destinatarios.filter(
                    (
                        item,
                    ) => {

                        if (
                            estadoFiltro !==
                            "TODOS" &&
                            item.estado !==
                            estadoFiltro
                        ) {
                            return false;
                        }

                        if (
                            !q
                        ) {
                            return true;
                        }

                        return [
                            item.nombre ?? "",
                            item.email,
                            item.empresaNombre ?? "",
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
                destinatarios,
                search,
                estadoFiltro,
            ],
        );

    const cargar =
        useCallback(
            async () => {
                if (
                    !campania
                ) {
                    return;
                }

                try {
                    setLoading(
                        true,
                    );

                    const data =
                        await listarDestinatariosCampania(
                            campania.id,
                        );

                    setDestinatarios(
                        data.destinatarios,
                    );
                } catch (
                error
                ) {
                    console.error(
                        error,
                    );

                    message.error(
                        "No se pudieron cargar los destinatarios",
                    );
                } finally {
                    setLoading(
                        false,
                    );
                }
            },
            [
                campania,
            ],
        );

    useEffect(
        () => {
            if (
                open
            ) {
                void cargar();
            }
        },
        [
            open,
            cargar,
        ],
    );

    async function handleAgregar() {
        if (
            !campania ||
            selectedIds.length ===
            0
        ) {
            return;
        }

        try {
            setAdding(
                true,
            );

            const result =
                await agregarDestinatariosCampania(
                    campania.id,
                    selectedIds,
                );

            if (
                result.agregados >
                0
            ) {
                message.success(
                    result.agregados ===
                        1
                        ? "1 destinatario agregado"
                        : `${result.agregados} destinatarios agregados`,
                );
            }

            if (
                result.omitidos.length >
                0
            ) {
                Modal.warning({
                    title:
                        "Algunos destinatarios fueron omitidos",

                    width:
                        620,

                    content:
                        <div className="mt-3 max-h-72 overflow-y-auto">
                            {
                                result.omitidos.map(
                                    (
                                        item,
                                    ) => (
                                        <div
                                            key={
                                                `${item.solicitanteId}-${item.motivo}`
                                            }
                                            className="border-b border-slate-100 py-2 text-sm"
                                        >
                                            <strong>
                                                ID {
                                                    item.solicitanteId
                                                }:
                                            </strong>{" "}
                                            {
                                                item.motivo
                                            }
                                        </div>
                                    ),
                                )
                            }
                        </div>,
                });
            }

            setSelectedIds(
                [],
            );

            await cargar();

            onChanged();
        } catch (
        error
        ) {
            if (
                axios.isAxiosError(
                    error,
                )
            ) {
                message.error(
                    error.response
                        ?.data
                        ?.error ??
                    "No se pudieron agregar los destinatarios",
                );

                return;
            }

            message.error(
                "No se pudieron agregar los destinatarios",
            );
        } finally {
            setAdding(
                false,
            );
        }
    }

    async function handleEliminar(
        consentimientoId: number,
    ) {
        if (
            !campania
        ) {
            return;
        }

        try {
            await quitarDestinatarioCampania(
                campania.id,
                consentimientoId,
            );

            message.success(
                "Destinatario eliminado",
            );

            await cargar();

            onChanged();
        } catch (
        error
        ) {
            if (
                axios.isAxiosError(
                    error,
                )
            ) {
                message.error(
                    error.response
                        ?.data
                        ?.error ??
                    "No se pudo eliminar el destinatario",
                );

                return;
            }

            message.error(
                "No se pudo eliminar el destinatario",
            );
        }
    }

    return (
        <Modal
            open={
                open
            }
            onCancel={
                onClose
            }
            footer={
                null
            }
            width={
                1100
            }
            title={
                campania
                    ? `Destinatarios · ${campania.nombre}`
                    : "Destinatarios"
            }
        >

            {!editable && (
                <Alert
                    className="mb-5"
                    type="info"
                    showIcon
                    message="Audiencia bloqueada"
                    description="Los destinatarios solo pueden modificarse mientras la campaña está en borrador."
                />
            )}

            {editable && (
                <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">

                    <div className="mb-4">
                        <div className="flex items-center gap-2 font-semibold text-slate-800">
                            <UserPlus
                                size={
                                    18
                                }
                            />
                            Agregar solicitantes
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                            Solo se envían al backend los IDs seleccionados.
                        </p>
                    </div>

                    <SelectorSolicitantesConsentimiento
                        value={
                            selectedIds
                        }
                        onChange={
                            setSelectedIds
                        }
                        disabled={
                            adding
                        }
                    />

                    <div className="mt-4 flex justify-end">
                        <Button
                            type="primary"
                            icon={
                                <UserPlus
                                    size={
                                        16
                                    }
                                />
                            }
                            loading={
                                adding
                            }
                            disabled={
                                selectedIds.length ===
                                0
                            }
                            onClick={
                                handleAgregar
                            }
                        >
                            Agregar {
                                selectedIds.length
                            } seleccionados
                        </Button>
                    </div>

                </div>
            )}

            <div>

                {/* =====================================================
        HEADER LISTADO
        ===================================================== */}

                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-slate-800">
                            Destinatarios actuales
                        </h3>

                        <p className="text-sm text-slate-500">
                            {
                                destinatarios.length
                            } registros en la campaña
                        </p>
                    </div>
                </div>

                {/* =====================================================
        MÉTRICAS
        ===================================================== */}

                <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">

                    <Card size="small">
                        <div className="text-xs text-slate-500">
                            Total
                        </div>

                        <div className="text-xl font-bold text-slate-800">
                            {
                                metricas.total
                            }
                        </div>
                    </Card>

                    <Card size="small">
                        <div className="text-xs text-slate-500">
                            Pendientes
                        </div>

                        <div className="text-xl font-bold text-slate-800">
                            {
                                metricas.pendientes
                            }
                        </div>
                    </Card>

                    <Card size="small">
                        <div className="text-xs text-slate-500">
                            Enviados
                        </div>

                        <div className="text-xl font-bold text-slate-800">
                            {
                                metricas.enviados
                            }
                        </div>
                    </Card>

                    <Card size="small">
                        <div className="text-xs text-slate-500">
                            Aceptados
                        </div>

                        <div className="text-xl font-bold text-slate-800">
                            {
                                metricas.aceptados
                            }
                        </div>
                    </Card>

                    <Card size="small">
                        <div className="text-xs text-slate-500">
                            Rechazados
                        </div>

                        <div className="text-xl font-bold text-slate-800">
                            {
                                metricas.rechazados
                            }
                        </div>
                    </Card>

                    <Card size="small">
                        <div className="text-xs text-slate-500">
                            Revocados
                        </div>

                        <div className="text-xl font-bold text-slate-800">
                            {
                                metricas.revocados
                            }
                        </div>
                    </Card>

                    <Card size="small">
                        <div className="text-xs text-slate-500">
                            Error envío
                        </div>

                        <div className="text-xl font-bold text-slate-800">
                            {
                                metricas.errores
                            }
                        </div>
                    </Card>

                </div>

                {/* =====================================================
        FILTROS
        ===================================================== */}

                <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">

                    <Input.Search
                        allowClear
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
                        placeholder="Buscar por nombre, correo o empresa..."
                    />

                    <Select
                        value={
                            estadoFiltro
                        }
                        onChange={
                            setEstadoFiltro
                        }
                        options={[
                            {
                                value:
                                    "TODOS",

                                label:
                                    "Todos los estados",
                            },

                            {
                                value:
                                    "PENDIENTE",

                                label:
                                    "Pendiente",
                            },

                            {
                                value:
                                    "ENVIADO",

                                label:
                                    "Enviado",
                            },

                            {
                                value:
                                    "ACEPTADO",

                                label:
                                    "Aceptado",
                            },

                            {
                                value:
                                    "RECHAZADO",

                                label:
                                    "Rechazado",
                            },

                            {
                                value:
                                    "REVOCADO",

                                label:
                                    "Revocado",
                            },

                            {
                                value:
                                    "ERROR_ENVIO",

                                label:
                                    "Error de envío",
                            },

                            {
                                value:
                                    "EXPIRADO",

                                label:
                                    "Expirado",
                            },
                        ]}
                    />

                </div>

                {/* =====================================================
        TABLA
        ===================================================== */}


                <Table
                    rowKey="id"
                    loading={
                        loading
                    }
                    dataSource={
                        destinatariosFiltrados
                    }
                    scroll={{
                        x:
                            850,
                    }}
                    pagination={{
                        defaultPageSize:
                            10,

                        showSizeChanger:
                            true,

                        pageSizeOptions: [
                            10,
                            25,
                            50,
                            100,
                        ],

                        showTotal: (
                            total,
                        ) =>
                            `${total} destinatarios`,
                    }}
                    columns={[
                        {
                            title:
                                "Destinatario",

                            key:
                                "destinatario",

                            render: (
                                _,
                                row,
                            ) => (
                                <div>
                                    <div className="font-medium text-slate-800">
                                        {
                                            row.nombre ??
                                            "Sin nombre"
                                        }
                                    </div>

                                    <div className="text-xs text-slate-500">
                                        {
                                            row.email
                                        }
                                    </div>
                                </div>
                            ),
                        },

                        {
                            title:
                                "Empresa",

                            dataIndex:
                                "empresaNombre",

                            key:
                                "empresaNombre",
                        },

                        {
                            title:
                                "Estado",

                            dataIndex:
                                "estado",

                            key:
                                "estado",

                            render: (
                                estado,
                            ) => (
                                <Tag>
                                    {
                                        getEstadoConsentimientoLabel(
                                            estado,
                                        )
                                    }
                                </Tag>
                            ),
                        },

                        {
                            title:
                                "Enviado",

                            dataIndex:
                                "fechaEnvio",

                            key:
                                "fechaEnvio",

                            render: (
                                value:
                                    string |
                                    null,
                            ) =>
                                value
                                    ? new Intl.DateTimeFormat(
                                        "es-CL",
                                        {
                                            dateStyle:
                                                "short",

                                            timeStyle:
                                                "short",
                                        },
                                    ).format(
                                        new Date(
                                            value,
                                        ),
                                    )
                                    : "—",
                        },

                        {
                            title:
                                "Respuesta",

                            dataIndex:
                                "fechaRespuesta",

                            key:
                                "fechaRespuesta",

                            render: (
                                value:
                                    string |
                                    null,
                            ) =>
                                value
                                    ? new Intl.DateTimeFormat(
                                        "es-CL",
                                        {
                                            dateStyle:
                                                "short",

                                            timeStyle:
                                                "short",
                                        },
                                    ).format(
                                        new Date(
                                            value,
                                        ),
                                    )
                                    : "—",
                        },

                        {
                            title:
                                "Versión",

                            dataIndex:
                                "versionDocumento",

                            key:
                                "versionDocumento",

                            width:
                                90,
                        },

                        {
                            title:
                                "Acciones",

                            key:
                                "acciones",

                            width:
                                130,

                            render: (
                                _,
                                row,
                            ) => (
                                <div className="flex items-center gap-1">

                                    {/* VER DETALLE */}

                                    <Button
                                        type="text"
                                        title="Ver detalle"
                                        icon={
                                            <Eye
                                                size={
                                                    16
                                                }
                                            />
                                        }
                                        onClick={() => {
                                            setDestinatarioSeleccionado(
                                                row,
                                            );

                                            setRespuestaOpen(
                                                true,
                                            );
                                        }}
                                    />

                                    {/* ELIMINAR SOLO EN BORRADOR */}

                                    {editable && (
                                        <Popconfirm
                                            title="Quitar destinatario"
                                            description="¿Quieres quitar este destinatario de la campaña?"
                                            okText="Quitar"
                                            cancelText="Cancelar"
                                            onConfirm={() =>
                                                handleEliminar(
                                                    row.id,
                                                )
                                            }
                                        >
                                            <Button
                                                danger
                                                type="text"
                                                title="Quitar destinatario"
                                                icon={
                                                    <Trash2
                                                        size={
                                                            16
                                                        }
                                                    />
                                                }
                                            />
                                        </Popconfirm>
                                    )}

                                </div>
                            ),
                        },
                    ]}
                />
            </div>

            <ConsentimientoRespuestaModal
                open={
                    respuestaOpen
                }
                campaniaId={
                    campania?.id ??
                    null
                }
                destinatario={
                    destinatarioSeleccionado
                }
                configuracion={
                    campania
                        ?.configuracionConsentimiento ??
                    null
                }
                onClose={() => {

                    setRespuestaOpen(
                        false,
                    );

                    setDestinatarioSeleccionado(
                        null,
                    );
                }}
            />

        </Modal>
    );
}