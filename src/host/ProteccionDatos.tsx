// src/host/ProteccionDatos.tsx
import {
    useCallback,
    useEffect,
    useState,
} from "react";

import axios from "axios";

import {
    Button,
    Card,
    Dropdown,
    Input,
    Modal,
    Select,
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
    Mail,
    BellRing
} from "lucide-react";

import {
    activarCampaniaProteccionDatos,
    cancelarCampaniaProteccionDatos,
    finalizarCampaniaProteccionDatos,
    listarCampaniasProteccionDatos,
    enviarCampaniaProteccionDatos,
    enviarRecordatorioCampaniaProteccionDatos,
    obtenerCampaniaProteccionDatos,
    obtenerResumenEmpresasProteccionDatos,
} from "../components/modals-proteccion-datos/proteccion-datos.api";

import type {
    CampaniaProteccionDatos,
    EstadoCampaniaProteccionDatos,
    ResumenEmpresaProteccionDatos,
} from "../components/modals-proteccion-datos/proteccion-datos.types";

import EmpresasProteccionDatosTabla, {
    type FiltroCampaniasEmpresa,
} from "../components/modals-proteccion-datos/EmpresasProteccionDatosTabla";

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

    /* Vista por empresa (según la empresa de cada destinatario) */
    const [
        empresas,
        setEmpresas,
    ] =
        useState<
            ResumenEmpresaProteccionDatos[]
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

    /* Empresa preseleccionada al crear desde la fila de una empresa */
    const [
        empresaNueva,
        setEmpresaNueva,
    ] =
        useState<
            number |
            null
        >(
            null,
        );

    const [
        filtroCampanias,
        setFiltroCampanias,
    ] =
        useState<FiltroCampaniasEmpresa>(
            "TODAS",
        );

    const [
        metricas,
        setMetricas,
    ] =
        useState({
            total:
                0,

            borradores:
                0,

            activas:
                0,

            finalizadas:
                0,
        });

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

                    /* KPIs: totales de campañas por estado (solo se usa "total") */
                    const contar =
                        async (
                            estadoKpi?:
                                EstadoCampaniaProteccionDatos,
                        ) =>
                            (
                                await listarCampaniasProteccionDatos({
                                    take:
                                        1,

                                    ...(estadoKpi
                                        ? {
                                            estado:
                                                estadoKpi,
                                        }
                                        : {}),
                                })
                            ).total;

                    const [
                        resumen,
                        totalKpi,
                        borradores,
                        activas,
                        finalizadas,
                    ] =
                        await Promise.all([
                            obtenerResumenEmpresasProteccionDatos(
                                estado
                                    ? {
                                        estado,
                                    }
                                    : undefined,
                            ),

                            contar(),

                            contar(
                                "BORRADOR",
                            ),

                            contar(
                                "ACTIVA",
                            ),

                            contar(
                                "FINALIZADA",
                            ),
                        ]);

                    setEmpresas(
                        resumen,
                    );

                    setMetricas({
                        total:
                            totalKpi,

                        borradores,

                        activas,

                        finalizadas,
                    });
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

    function recordar(
        campania:
            CampaniaProteccionDatos,
    ) {
        modal.confirm({
            title:
                "Enviar recordatorio",

            content:
                `Se enviará un recordatorio a quienes recibieron "${campania.nombre}" y aún no responden. Cada persona recibe un enlace nuevo (el del correo anterior deja de funcionar). Para recordar solo a algunas personas, usa "Destinatarios".`,

            okText:
                "Enviar recordatorio",

            cancelText:
                "Volver",

            async onOk() {
                try {
                    const r =
                        await enviarRecordatorioCampaniaProteccionDatos(
                            campania.id,
                        );

                    const omitidos =
                        r.omitidos > 0
                            ? ` · ${r.omitidos} omitido(s): recibieron un correo hace poco`
                            : "";

                    if (
                        r.errores ===
                        0
                    ) {
                        messageApi.success({
                            content:
                                `${r.enviados} recordatorio(s) enviado(s)${omitidos}`,

                            duration:
                                5,
                        });
                    } else {
                        messageApi.warning({
                            content:
                                `${r.enviados} enviado(s) y ${r.errores} con error${omitidos}`,

                            duration:
                                5,
                        });
                    }

                    await cargar();
                } catch (
                error
                ) {
                    mostrarError(
                        error,
                        "No se pudo enviar el recordatorio",
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
            Pick<
                CampaniaProteccionDatos,
                "estado"
            >,
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
                        "recordatorio",

                    label:
                        "Enviar recordatorio",

                    icon:
                        <BellRing
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

            case "recordatorio": {
                recordar(
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

    /**
     * Acción desde la vista por empresa: la fila solo trae el resumen,
     * así que se carga la campaña completa antes de abrir el modal.
     */
    async function accionDesdeResumen(
        key: string,
        campaniaId: number,
    ) {
        try {
            const campania =
                await obtenerCampaniaProteccionDatos(
                    campaniaId,
                );

            handleMenuAction(
                key,
                campania,
            );
        } catch (
        error
        ) {
            mostrarError(
                error,
                "No se pudo abrir la campaña",
            );
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

                                setEmpresaNueva(
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
                        placeholder="Buscar empresa o campaña..."
                    />

                    <Select<FiltroCampaniasEmpresa>
                        value={
                            filtroCampanias
                        }
                        onChange={
                            setFiltroCampanias
                        }
                        options={[
                            {
                                value:
                                    "TODAS",

                                label:
                                    "Todas las empresas",
                            },

                            {
                                value:
                                    "CON",

                                label:
                                    "Con campañas",
                            },

                            {
                                value:
                                    "SIN",

                                label:
                                    "Sin campañas",
                            },
                        ]}
                    />

                    <Select
                        allowClear
                        placeholder="Todos los estados"
                        value={
                            estado
                        }
                        onChange={(
                            value?:
                                EstadoCampaniaProteccionDatos,
                        ) =>
                            setEstado(
                                value,
                            )
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
                EMPRESAS
                ================================================= */}

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

                    <EmpresasProteccionDatosTabla
                        items={
                            empresas
                        }
                        filtro={
                            filtroCampanias
                        }
                        onCrearCampania={(
                            empresaId,
                        ) => {
                            setSelected(
                                null,
                            );

                            setEmpresaNueva(
                                empresaId,
                            );

                            setFormOpen(
                                true,
                            );
                        }}
                        loading={
                            loading
                        }
                        search={
                            search
                        }
                        renderAcciones={(
                            campania,
                        ) => (
                            <Dropdown
                                trigger={[
                                    "click",
                                ]}
                                menu={{
                                    items:
                                        menuCampania(
                                            campania,
                                        ),

                                    onClick: ({
                                        key,
                                    }) => {
                                        void accionDesdeResumen(
                                            key,
                                            campania.id,
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
                        )}
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
                    empresaIdInicial={
                        empresaNueva
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