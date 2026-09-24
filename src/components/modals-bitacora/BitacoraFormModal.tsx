// src/components/modals-bitacora/BitacoraFormModal.tsx

import type {
    Dispatch,
    FormEvent,
    SetStateAction,
} from "react";

import {
    BellOutlined,
} from "@ant-design/icons";

import {
    Button,
    DatePicker,
    Input,
    Modal,
    Select,
    Alert
} from "antd";

import dayjs from "dayjs";

import {
    CHILE_TZ,
    LABEL_BASE,
    RELACIONES_CONFIG,
    TIPOS_ACTIVIDAD,
} from "./bitacora.constants";

import {
    formatRecordatorioChile,
    incluyeBusqueda,
} from "./bitacora.helpers";

import type {
    BitacoraAprobacion,
    BitacoraEtapa,
    BitacoraEtapasFormState,
    BitacoraEvidencia,
    BitacoraFormState,
    EmpresaOption,
    EtapaBitacora,
    EvidenciaPendiente,
    FormErrors,
    OpcionRelacion,
    RelacionConfig,
    RelacionKey,
    TecnicoOption,
    TipoBitacoraTecnico,
} from "./bitacora.types";


import BitacoraTimelineEtapas
    from "./BitacoraTimelineEtapas";

type UiMessage = {
    type:
    | "success"
    | "error"
    | "warning"
    | "info";

    text:
    string;
};

type Props = {
    open: boolean;

    editId:
    number | null;

    modo:
    | "CREAR"
    | "EDITAR"
    | "REVISAR";

    esAdmin:
    boolean;

    puedeEditar:
    boolean;

    saving:
    boolean;

    uiMessage:
    UiMessage | null;

    form:
    BitacoraFormState;

    setForm:
    Dispatch<
        SetStateAction<
            BitacoraFormState
        >
    >;

    tecnicos:
    TecnicoOption[];

    empresas:
    EmpresaOption[];

    formErrors:
    FormErrors;

    setFormErrors:
    Dispatch<
        SetStateAction<
            FormErrors
        >
    >;

    opcionesPorRelacion:
    Partial<
        Record<
            RelacionKey,
            OpcionRelacion[]
        >
    >;

    setOpcionesPorRelacion:
    Dispatch<
        SetStateAction<
            Partial<
                Record<
                    RelacionKey,
                    OpcionRelacion[]
                >
            >
        >
    >;

    loadingPorRelacion:
    Partial<
        Record<
            RelacionKey,
            boolean
        >
    >;

    setLoadingPorRelacion:
    Dispatch<
        SetStateAction<
            Partial<
                Record<
                    RelacionKey,
                    boolean
                >
            >
        >
    >;

    onLoadRelacion:
    (
        tipo:
            RelacionKey,
        empresaId:
            string
    ) => void;

    onSubmit:
    (
        event:
            FormEvent<HTMLFormElement>
    ) => void;

    onCancel:
    () => void;

    evidenciasPendientes:
    EvidenciaPendiente[];

    evidenciasAEliminar:
    number[];

    loadingEvidencias:
    boolean;

    onAgregarEvidencia:
    (
        etapa:
            EtapaBitacora
    ) => void;

    onMarcarEliminarEvidencia:
    (
        evidencia:
            BitacoraEvidencia
    ) => void;

    onRestaurarEvidencia:
    (
        evidenciaId:
            number
    ) => void;

    onEliminarEvidenciaPendiente:
    (
        idTemporal:
            string
    ) => void;

    etapas:
    BitacoraEtapa[];

    etapasForm:
    BitacoraEtapasFormState;

    setEtapasForm:
    Dispatch<
        SetStateAction<
            BitacoraEtapasFormState
        >
    >;

    usuarioActualTecnicoId:
    number | null;

    processingEtapaId:
    number | null;

    comentarioRespuesta:
    string;

    setComentarioRespuesta:
    (
        value:
            string
    ) => void;

    onGuardarEtapa:
    (
        etapa:
            BitacoraEtapa
    ) => Promise<void>;

    onCompletarEtapa:
    (
        etapa:
            BitacoraEtapa
    ) => Promise<void>;

    onSolicitarRevision:
    (
        etapa:
            BitacoraEtapa
    ) => Promise<void>;

    onResponderRevision:
    (
        etapa:
            BitacoraEtapa,
        aprobacion:
            BitacoraAprobacion,
        aprobar:
            boolean
    ) => Promise<void>;
};

function FieldError({
    message,
}: {
    message?: string;
}) {
    if (!message) {
        return null;
    }

    return (
        <p className="mt-1 text-xs font-medium text-red-600">
            {message}
        </p>
    );
}

export default function BitacoraFormModal({
    open,
    editId,
    modo,
    esAdmin,
    puedeEditar,
    saving,
    uiMessage,
    form,
    setForm,
    tecnicos,
    empresas,
    formErrors,
    setFormErrors,
    opcionesPorRelacion,
    setOpcionesPorRelacion,
    loadingPorRelacion,
    setLoadingPorRelacion,
    onLoadRelacion,
    onSubmit,
    onCancel,

    evidenciasPendientes,
    evidenciasAEliminar,
    loadingEvidencias,
    onAgregarEvidencia,
    onMarcarEliminarEvidencia,
    onRestaurarEvidencia,
    onEliminarEvidenciaPendiente,
    etapas,
    etapasForm,
    setEtapasForm,

    usuarioActualTecnicoId,

    processingEtapaId,

    comentarioRespuesta,
    setComentarioRespuesta,

    onGuardarEtapa,
    onCompletarEtapa,
    onSolicitarRevision,
    onResponderRevision,
}: Props) {
    const titulo =
        modo ===
            "REVISAR"
            ? "Revisar bitácora"
            : modo ===
                "EDITAR"
                ? "Editar bitácora"
                : "Nueva bitácora";

    function renderRelacionSelect(
        config:
            RelacionConfig
    ) {
        const opciones =
            opcionesPorRelacion[
            config.tipo
            ] ?? [];

        const loading =
            Boolean(
                loadingPorRelacion[
                config.tipo
                ]
            );

        const value =
            form[
            config.formKey
            ] ||
            undefined;

        const empresaSeleccionada =
            Boolean(
                form.empresaId
            );

        return (
            <div
                key={
                    config.tipo
                }
            >
                <label
                    className={
                        LABEL_BASE
                    }
                >
                    {config.label}
                </label>

                <Select
                    value={
                        value
                    }
                    disabled={
                        !puedeEditar ||
                        !empresaSeleccionada
                    }
                    loading={
                        loading
                    }
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    filterOption={(
                        input,
                        option
                    ) =>
                        incluyeBusqueda(
                            option?.label,
                            input
                        )
                    }
                    placeholder={
                        !empresaSeleccionada
                            ? "Selecciona empresa primero"
                            : loading
                                ? "Cargando..."
                                : `Seleccionar ${config.label.toLowerCase()}`
                    }
                    className="w-full"
                    options={
                        opciones.map(
                            (
                                opcion
                            ) => ({
                                value:
                                    String(
                                        opcion.id
                                    ),

                                label:
                                    opcion.label,
                            })
                        )
                    }
                    onDropdownVisibleChange={(
                        visible
                    ) => {
                        if (
                            visible &&
                            empresaSeleccionada &&
                            !loading &&
                            opciones.length ===
                            0
                        ) {
                            onLoadRelacion(
                                config.tipo,
                                form.empresaId
                            );
                        }
                    }}
                    onFocus={() => {
                        if (
                            empresaSeleccionada &&
                            !loading &&
                            opciones.length ===
                            0
                        ) {
                            onLoadRelacion(
                                config.tipo,
                                form.empresaId
                            );
                        }
                    }}
                    onChange={(
                        selectedValue
                    ) => {
                        setForm(
                            (
                                prev
                            ) => ({
                                ...prev,

                                [config.formKey]:
                                    selectedValue
                                        ? String(
                                            selectedValue
                                        )
                                        : "",
                            })
                        );

                        setFormErrors(
                            (
                                prev
                            ) => ({
                                ...prev,

                                relacion:
                                    undefined,
                            })
                        );
                    }}
                />
            </div>
        );
    }

    return (
        <Modal
            open={
                open
            }
            onCancel={
                onCancel
            }
            footer={
                null
            }
            width={
                980
            }
            destroyOnClose
            maskClosable={
                !saving
            }
            closable={
                !saving
            }
            title={
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                        {titulo}
                    </h2>

                    <p className="mt-1 text-sm font-normal text-slate-500">
                        Completa los
                        datos principales
                        y, si aplica,
                        relaciona la
                        actividad con una
                        empresa, ticket,
                        equipo u orden.
                    </p>
                </div>
            }
        >
            <form
                onSubmit={
                    onSubmit
                }
                className="mt-4 space-y-5"
            >
                {uiMessage && (
                    <Alert
                        type={
                            uiMessage.type
                        }
                        showIcon
                        message={
                            uiMessage.text
                        }
                        className="rounded-xl"
                    />
                )}
                {modo ===
                    "REVISAR" && (
                        <Alert
                            type="info"
                            showIcon
                            message="Modo revisión"
                            description="Puedes revisar la información y responder la solicitud asignada. El contenido de la bitácora no puede modificarse."
                            className="rounded-xl"
                        />
                    )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div>
                        <label
                            className={
                                LABEL_BASE
                            }
                        >
                            Fecha
                        </label>

                        <DatePicker
                            value={
                                form.fecha
                                    ? dayjs.tz(
                                        form.fecha,
                                        CHILE_TZ
                                    )
                                    : null
                            }
                            disabled={
                                !puedeEditar
                            }
                            onChange={(
                                date
                            ) => {
                                setForm(
                                    (
                                        prev
                                    ) => ({
                                        ...prev,

                                        fecha:
                                            date
                                                ? date
                                                    .tz(
                                                        CHILE_TZ
                                                    )
                                                    .format(
                                                        "YYYY-MM-DD"
                                                    )
                                                : "",
                                    })
                                );
                            }}
                            format="DD/MM/YYYY"
                            placeholder="Selecciona fecha"
                            className="w-full rounded-xl"
                        />
                    </div>

                    <div>
                        <label
                            className={
                                LABEL_BASE
                            }
                        >
                            Técnico
                        </label>

                        <Select
                            value={
                                form.tecnicoId ||
                                undefined
                            }

                            disabled={
                                !puedeEditar ||
                                !esAdmin
                            }

                            onChange={(
                                value
                            ) => {
                                setForm(
                                    prev => ({
                                        ...prev,

                                        tecnicoId:
                                            String(
                                                value
                                            ),
                                    })
                                );

                                setFormErrors(
                                    prev => ({
                                        ...prev,

                                        tecnicoId:
                                            undefined,
                                    })
                                );
                            }}

                            placeholder={
                                esAdmin
                                    ? "Seleccionar técnico"
                                    : "Técnico autenticado"
                            }

                            showSearch
                            optionFilterProp="label"
                            className="w-full"

                            status={
                                formErrors.tecnicoId
                                    ? "error"
                                    : undefined
                            }
                            options={
                                tecnicos.map(
                                    (
                                        tecnico
                                    ) => ({
                                        value:
                                            String(
                                                tecnico.id_tecnico
                                            ),

                                        label:
                                            tecnico.nombre,
                                    })
                                )
                            }
                        />

                        <FieldError
                            message={
                                formErrors.tecnicoId
                            }
                        />

                        {!form.tecnicoId && (
                            <p className="mt-1 text-xs font-medium text-amber-600">
                                No fue
                                posible
                                relacionar el
                                usuario
                                autenticado
                                con un
                                técnico.
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            className={
                                LABEL_BASE
                            }
                        >
                            Empresa
                        </label>

                        <Select
                            value={
                                form.empresaId ||
                                undefined
                            }
                            disabled={
                                !puedeEditar
                            }
                            onChange={(
                                value
                            ) => {
                                const empresaId =
                                    value
                                        ? String(
                                            value
                                        )
                                        : "";

                                setForm(
                                    (
                                        prev
                                    ) => ({
                                        ...prev,

                                        empresaId,

                                        solicitanteId:
                                            "",

                                        ticketId:
                                            "",

                                        trabajoId:
                                            "",

                                        visitaId:
                                            "",

                                        mantencionId:
                                            "",

                                        equipoId:
                                            "",

                                        cotizacionId:
                                            "",
                                    })
                                );

                                setOpcionesPorRelacion(
                                    {}
                                );

                                setLoadingPorRelacion(
                                    {}
                                );

                                setFormErrors(
                                    (
                                        prev
                                    ) => ({
                                        ...prev,

                                        empresaId:
                                            undefined,

                                        relacion:
                                            undefined,
                                    })
                                );
                            }}
                            allowClear
                            placeholder="Sin empresa"
                            showSearch
                            optionFilterProp="label"
                            filterOption={(
                                input,
                                option
                            ) =>
                                incluyeBusqueda(
                                    option?.label,
                                    input
                                )
                            }
                            className="w-full"
                            status={
                                formErrors.empresaId
                                    ? "error"
                                    : undefined
                            }
                            options={
                                empresas.map(
                                    (
                                        empresa
                                    ) => ({
                                        value:
                                            String(
                                                empresa.id_empresa
                                            ),

                                        label:
                                            empresa.nombre,
                                    })
                                )
                            }
                        />

                        <FieldError
                            message={
                                formErrors.empresaId
                            }
                        />
                    </div>

                    <div>
                        <label
                            className={
                                LABEL_BASE
                            }
                        >
                            Tipo actividad
                        </label>

                        <Select
                            value={
                                form.tipoActividad
                            }
                            disabled={
                                !puedeEditar
                            }
                            onChange={(
                                value
                            ) =>
                                setForm(
                                    (
                                        prev
                                    ) => ({
                                        ...prev,

                                        tipoActividad:
                                            value as TipoBitacoraTecnico,
                                    })
                                )
                            }
                            className="w-full"
                            options={
                                TIPOS_ACTIVIDAD.map(
                                    (
                                        tipo
                                    ) => ({
                                        value:
                                            tipo,

                                        label:
                                            tipo,
                                    })
                                )
                            }
                        />
                    </div>
                </div>

                <div>
                    <label
                        className={
                            LABEL_BASE
                        }
                    >
                        Título
                    </label>

                    <Input
                        value={
                            form.titulo
                        }
                        disabled={
                            !puedeEditar
                        }
                        onChange={(
                            event
                        ) =>
                            setForm(
                                (
                                    prev
                                ) => ({
                                    ...prev,

                                    titulo:
                                        event
                                            .target
                                            .value,
                                })
                            )
                        }
                        placeholder="Ej: Soporte remoto cliente RIDS"
                    />
                </div>

                <div>
                    <label
                        className={
                            LABEL_BASE
                        }
                    >
                        Resumen General
                    </label>

                    <Input.TextArea
                        value={
                            form.descripcion
                        }
                        disabled={
                            !puedeEditar
                        }
                        onChange={(
                            event
                        ) => {
                            setForm(
                                (
                                    prev
                                ) => ({
                                    ...prev,

                                    descripcion:
                                        event
                                            .target
                                            .value,
                                })
                            );

                            setFormErrors(
                                (
                                    prev
                                ) => ({
                                    ...prev,

                                    descripcion:
                                        undefined,
                                })
                            );
                        }}
                        rows={
                            5
                        }
                        placeholder="Describe brevemente el objetivo o contexto general de esta actividad..."
                        status={
                            formErrors.descripcion
                                ? "error"
                                : undefined
                        }
                    />

                    <div className="mt-1 flex items-center justify-between">
                        <FieldError
                            message={
                                formErrors.descripcion
                            }
                        />

                        <span className="ml-auto text-xs text-slate-400">
                            {
                                form
                                    .descripcion
                                    .length
                            }{" "}
                            caracteres
                        </span>
                    </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                    <div className="mb-3">
                        <div className="flex items-center gap-2">
                            <BellOutlined className="text-amber-600" />

                            <h3 className="text-sm font-semibold text-slate-800">
                                Recordatorio
                                opcional
                            </h3>
                        </div>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                            Selecciona una
                            fecha y hora
                            para recordar
                            esta actividad.
                        </p>
                    </div>

                    <DatePicker
                        showTime={{
                            format:
                                "HH:mm",

                            minuteStep:
                                1,
                        }}
                        format="DD/MM/YYYY HH:mm"
                        value={
                            form.recordatorioAt
                                ? dayjs(
                                    form.recordatorioAt
                                )
                                : null
                        }
                        disabled={
                            !puedeEditar
                        }
                        onChange={(
                            value
                        ) => {
                            setForm(
                                (
                                    prev
                                ) => ({
                                    ...prev,

                                    recordatorioAt:
                                        value
                                            ? value.toISOString()
                                            : "",
                                })
                            );
                        }}
                        disabledDate={(
                            current
                        ) =>
                            Boolean(
                                current &&
                                current
                                    .endOf(
                                        "day"
                                    )
                                    .isBefore(
                                        dayjs().startOf(
                                            "day"
                                        )
                                    )
                            )
                        }
                        disabledTime={(
                            current
                        ) => {
                            if (
                                !current ||
                                !current.isSame(
                                    dayjs(),
                                    "day"
                                )
                            ) {
                                return {};
                            }

                            const ahora =
                                dayjs();

                            return {
                                disabledHours:
                                    () =>
                                        Array.from(
                                            {
                                                length:
                                                    ahora.hour(),
                                            },
                                            (
                                                _,
                                                index
                                            ) =>
                                                index
                                        ),

                                disabledMinutes:
                                    (
                                        selectedHour:
                                            number
                                    ) =>
                                        selectedHour ===
                                            ahora.hour()
                                            ? Array.from(
                                                {
                                                    length:
                                                        ahora.minute() +
                                                        1,
                                                },
                                                (
                                                    _,
                                                    index
                                                ) =>
                                                    index
                                            )
                                            : [],
                            };
                        }}
                        placeholder="Sin recordatorio"
                        allowClear
                        className="w-full sm:max-w-sm"
                    />

                    {form.recordatorioAt && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs font-semibold text-amber-700">
                                <BellOutlined className="mr-1" />

                                {formatRecordatorioChile(
                                    form.recordatorioAt
                                )}
                            </span>

                            <Button
                                size="small"
                                danger
                                type="text"
                                onClick={() =>
                                    setForm(
                                        (
                                            prev
                                        ) => ({
                                            ...prev,

                                            recordatorioAt:
                                                "",
                                        })
                                    )
                                }
                            >
                                Quitar
                            </Button>
                        </div>
                    )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-4">
                        <h3 className="text-sm font-semibold text-slate-800">
                            Relaciones
                            opcionales
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                            Puedes asociar
                            una o más
                            relaciones a
                            esta bitácora.
                            Primero
                            selecciona una
                            empresa y luego
                            los registros
                            relacionados.
                        </p>
                    </div>

                    {!form.empresaId && (
                        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                            Para cargar
                            solicitantes,
                            tickets,
                            órdenes,
                            visitas,
                            mantenciones,
                            equipos o
                            cotizaciones,
                            primero
                            selecciona una
                            empresa.
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {RELACIONES_CONFIG.map(
                            (
                                config
                            ) =>
                                renderRelacionSelect(
                                    config
                                )
                        )}
                    </div>

                    {formErrors.relacion && (
                        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                            {
                                formErrors.relacion
                            }
                        </div>
                    )}
                </div>

                <BitacoraTimelineEtapas
                    bitacoraId={
                        editId
                    }

                    puedeEditar={
                        puedeEditar
                    }

                    etapas={
                        etapas
                    }

                    etapasForm={
                        etapasForm
                    }

                    setEtapasForm={
                        setEtapasForm
                    }

                    tecnicos={
                        tecnicos
                    }

                    tecnicoResponsableId={
                        form.tecnicoId
                    }

                    usuarioActualTecnicoId={
                        usuarioActualTecnicoId
                    }

                    evidenciasPendientes={
                        evidenciasPendientes
                    }

                    evidenciasAEliminar={
                        evidenciasAEliminar
                    }

                    loadingEvidencias={
                        loadingEvidencias
                    }

                    processingEtapaId={
                        processingEtapaId
                    }

                    comentarioRespuesta={
                        comentarioRespuesta
                    }

                    setComentarioRespuesta={
                        setComentarioRespuesta
                    }

                    onAgregarEvidencia={
                        onAgregarEvidencia
                    }

                    onMarcarEliminarEvidencia={
                        onMarcarEliminarEvidencia
                    }

                    onRestaurarEvidencia={
                        onRestaurarEvidencia
                    }

                    onEliminarEvidenciaPendiente={
                        onEliminarEvidenciaPendiente
                    }

                    onGuardarEtapa={
                        onGuardarEtapa
                    }

                    onCompletarEtapa={
                        onCompletarEtapa
                    }

                    onSolicitarRevision={
                        onSolicitarRevision
                    }

                    onResponderRevision={
                        onResponderRevision
                    }
                />

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                        onClick={
                            onCancel
                        }
                        disabled={
                            saving
                        }
                    >
                        {modo ===
                            "REVISAR"
                            ? "Cerrar"
                            : "Cancelar"}
                    </Button>

                    {puedeEditar && (
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={
                                saving
                            }
                        >
                            {modo ===
                                "EDITAR"
                                ? "Actualizar bitácora"
                                : "Guardar bitácora"}
                        </Button>
                    )}
                </div>
            </form>
        </Modal>
    );
}