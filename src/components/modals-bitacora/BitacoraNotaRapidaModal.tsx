// src/components/modals-bitacora/BitacoraNotaRapidaModal.tsx

import type {
    Dispatch,
    SetStateAction,
} from "react";

import {
    BellOutlined,
    FormOutlined,
} from "@ant-design/icons";

import {
    Button,
    DatePicker,
    Input,
    Modal,
    Select,
} from "antd";

import dayjs from "dayjs";

import {
    LABEL_BASE,
    OPCIONES_RAPIDAS_RECORDATORIO,
} from "./bitacora.constants";

import {
    formatRecordatorioChile,
} from "./bitacora.helpers";

import type {
    NotaRapidaState,
    TecnicoOption,
    TipoBitacoraTecnico,
} from "./bitacora.types";

type Props = {
    open:
    boolean;

    saving:
    boolean;

    nota:
    NotaRapidaState;

    setNota:
    Dispatch<
        SetStateAction<
            NotaRapidaState
        >
    >;

    tecnicos:
    TecnicoOption[];

    onAplicarRecordatorio:
    (
        minutos:
            number
    ) => void;

    onSave:
    () => void;

    onClose:
    () => void;
};

export default function BitacoraNotaRapidaModal({
    open,
    saving,
    nota,
    setNota,
    tecnicos,
    onAplicarRecordatorio,
    onSave,
    onClose,
}: Props) {
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
                620
            }
            rootClassName="nota-rapida-modal"
            centered
            destroyOnClose
            maskClosable={
                !saving
            }
            closable={
                !saving
            }
            styles={{
                body: {
                    maxHeight:
                        "calc(100vh - 180px)",

                    overflowY:
                        "auto",
                },
            }}
            title={
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                        Nota rápida
                    </h2>

                    <p className="mt-1 text-sm font-normal text-slate-500">
                        Registra una
                        actividad breve
                        sin relaciones
                        avanzadas.
                    </p>
                </div>
            }
        >
            <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label
                            className={
                                LABEL_BASE
                            }
                        >
                            Técnico{" "}
                            <span className="text-red-500">
                                *
                            </span>
                        </label>

                        <Select
                            value={
                                nota.tecnicoId ||
                                undefined
                            }
                            disabled
                            placeholder="Técnico autenticado"
                            className="w-full"
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

                        {!nota.tecnicoId && (
                            <p className="mt-1 text-xs font-medium text-amber-600">
                                No fue
                                posible
                                identificar
                                al técnico
                                autenticado.
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            className={
                                LABEL_BASE
                            }
                        >
                            Tipo
                        </label>

                        <Select
                            value={
                                nota.tipoActividad
                            }
                            onChange={(
                                value
                            ) =>
                                setNota(
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
                            options={[
                                {
                                    value:
                                        "INTERNO",

                                    label:
                                        "Interno",
                                },

                                {
                                    value:
                                        "SOPORTE",

                                    label:
                                        "Soporte",
                                },

                                {
                                    value:
                                        "REMOTO",

                                    label:
                                        "Remoto",
                                },

                                {
                                    value:
                                        "ADMINISTRATIVO",

                                    label:
                                        "Administrativo",
                                },

                                {
                                    value:
                                        "REUNION",

                                    label:
                                        "Reunión",
                                },

                                {
                                    value:
                                        "OTRO",

                                    label:
                                        "Otro",
                                },
                            ]}
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
                            nota.titulo
                        }
                        onChange={(
                            event
                        ) =>
                            setNota(
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
                        maxLength={
                            120
                        }
                        placeholder="Opcional. Ej: Revisión de correo"
                    />
                </div>

                <div>
                    <label
                        className={
                            LABEL_BASE
                        }
                    >
                        Recordatorio
                    </label>

                    <DatePicker
                        showTime={{
                            format:
                                "HH:mm",

                            minuteStep:
                                5,
                        }}
                        format="DD/MM/YYYY HH:mm"
                        value={
                            nota.recordatorioAt
                                ? dayjs(
                                    nota.recordatorioAt
                                )
                                : null
                        }
                        onChange={(
                            value
                        ) => {
                            setNota(
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
                        className="w-full"
                    />

                    <div className="mt-2">
                        <p className="mb-2 text-xs font-medium text-slate-500">
                            Programar desde
                            ahora
                        </p>

                        <div className="flex flex-wrap gap-2">
                            {OPCIONES_RAPIDAS_RECORDATORIO.map(
                                (
                                    opcion
                                ) => (
                                    <Button
                                        key={
                                            opcion.minutos
                                        }
                                        size="small"
                                        onClick={() =>
                                            onAplicarRecordatorio(
                                                opcion.minutos
                                            )
                                        }
                                        className="
                                            !rounded-full
                                            !border-amber-200
                                            !bg-amber-50
                                            !text-amber-700
                                            hover:!border-amber-400
                                            hover:!bg-amber-100
                                        "
                                    >
                                        +{" "}
                                        {
                                            opcion.label
                                        }
                                    </Button>
                                )
                            )}
                        </div>
                    </div>

                    {nota.recordatorioAt && (
                        <p className="mt-2 text-xs font-medium text-amber-700">
                            <BellOutlined className="mr-1" />

                            Se recordará el{" "}
                            {formatRecordatorioChile(
                                nota.recordatorioAt
                            )}
                        </p>
                    )}
                </div>

                <div>
                    <label
                        className={
                            LABEL_BASE
                        }
                    >
                        Nota{" "}
                        <span className="text-red-500">
                            *
                        </span>
                    </label>

                    <Input.TextArea
                        value={
                            nota.descripcion
                        }
                        onChange={(
                            event
                        ) =>
                            setNota(
                                (
                                    prev
                                ) => ({
                                    ...prev,

                                    descripcion:
                                        event
                                            .target
                                            .value,
                                })
                            )
                        }
                        rows={
                            4
                        }
                        maxLength={
                            1000
                        }
                        autoFocus
                        placeholder="Escribe brevemente lo realizado, pendiente o acordado..."
                        className="w-full"
                    />

                    <div className="mt-1 flex justify-end">
                        <span className="text-xs text-slate-400">
                            {
                                nota
                                    .descripcion
                                    .length
                            }{" "}
                            / 1000
                        </span>
                    </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                    Se guardará con la
                    fecha actual, estado
                    REGISTRADA y sin
                    relaciones asociadas.
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                        onClick={
                            onClose
                        }
                        disabled={
                            saving
                        }
                    >
                        Cancelar
                    </Button>

                    <Button
                        type="primary"
                        icon={
                            <FormOutlined />
                        }
                        loading={
                            saving
                        }
                        disabled={
                            saving ||
                            !nota.tecnicoId ||
                            !nota.descripcion.trim()
                        }
                        onClick={
                            onSave
                        }
                    >
                        Guardar nota
                    </Button>
                </div>
            </div>
        </Modal>
    );
}