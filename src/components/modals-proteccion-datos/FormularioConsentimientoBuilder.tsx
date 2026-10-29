// src/components/modals-proteccion-datos/FormularioConsentimientoBuilder.tsx

import {
    Button,
    Card,
    Empty,
    Input,
    Popconfirm,
    Tag,
} from "antd";

import {
    Pencil,
    Plus,
    Trash2,
} from "lucide-react";

import {
    useState,
} from "react";

import CampoConsentimientoModal
    from "./CampoConsentimientoModal";

import type {
    CampoConsentimiento,
    ConfiguracionConsentimiento,
} from "./proteccion-datos.types";

type Props = {
    value:
    ConfiguracionConsentimiento;

    onChange:
    (
        value:
            ConfiguracionConsentimiento,
    ) => void;

    disabled?:
    boolean;
};

function getTipoLabel(
    tipo:
        CampoConsentimiento["tipo"],
) {

    switch (
    tipo
    ) {
        case "TEXT":
            return "Texto";

        case "CHECKBOX":
            return "Checkbox";

        case "RADIO":
            return "Selección";
    }
}

export default function FormularioConsentimientoBuilder({
    value,
    onChange,
    disabled = false,
}: Props) {

    const [
        campoOpen,
        setCampoOpen,
    ] =
        useState(
            false,
        );

    const [
        editIndex,
        setEditIndex,
    ] =
        useState<
            number |
            null
        >(
            null,
        );

    function abrirNuevo() {

        setEditIndex(
            null,
        );

        setCampoOpen(
            true,
        );
    }

    function guardarCampo(
        campo:
            CampoConsentimiento,
    ) {

        const campos =
            [
                ...value.campos,
            ];

        /*
         * Validación simple en front.
         */
        const keyDuplicada =
            campos.some(
                (
                    item,
                    index,
                ) =>
                    item.key ===
                    campo.key &&
                    index !==
                    editIndex,
            );

        if (
            keyDuplicada
        ) {
            return;
        }

        if (
            editIndex ===
            null
        ) {
            campos.push(
                campo,
            );
        } else {
            campos[
                editIndex
            ] =
                campo;
        }

        onChange({
            ...value,
            campos,
        });

        setCampoOpen(
            false,
        );

        setEditIndex(
            null,
        );
    }

    function eliminarCampo(
        index:
            number,
    ) {

        onChange({
            ...value,

            campos:
                value.campos.filter(
                    (
                        _,
                        current,
                    ) =>
                        current !==
                        index,
                ),
        });
    }

    return (
        <div className="space-y-5">

            {/* CONFIGURACIÓN GENERAL */}

            <Card
                size="small"
                title="Configuración del formulario"
            >
                <div className="grid gap-4">

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Título del formulario
                        </label>

                        <Input
                            disabled={
                                disabled
                            }
                            value={
                                value.tituloFormulario
                            }
                            onChange={(
                                event,
                            ) =>
                                onChange({
                                    ...value,

                                    tituloFormulario:
                                        event.target.value,
                                })
                            }
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Descripción
                        </label>

                        <Input.TextArea
                            disabled={
                                disabled
                            }
                            rows={
                                3
                            }
                            value={
                                value.descripcionFormulario ??
                                ""
                            }
                            onChange={(
                                event,
                            ) =>
                                onChange({
                                    ...value,

                                    descripcionFormulario:
                                        event.target.value,
                                })
                            }
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                            Texto del botón
                        </label>

                        <Input
                            disabled={
                                disabled
                            }
                            value={
                                value.textoBoton
                            }
                            onChange={(
                                event,
                            ) =>
                                onChange({
                                    ...value,

                                    textoBoton:
                                        event.target.value,
                                })
                            }
                        />
                    </div>

                </div>
            </Card>

            {/* CAMPOS */}

            <div className="flex items-center justify-between">

                <div>
                    <div className="font-semibold text-slate-800">
                        Campos del formulario
                    </div>

                    <div className="text-sm text-slate-500">
                        Define qué información deberá completar el destinatario.
                    </div>
                </div>

                <Button
                    type="primary"
                    disabled={
                        disabled
                    }
                    icon={
                        <Plus
                            size={
                                16
                            }
                        />
                    }
                    onClick={
                        abrirNuevo
                    }
                >
                    Agregar campo
                </Button>

            </div>

            {value.campos.length ===
                0
                ? (
                    <Empty
                        description="No hay campos configurados"
                    />
                )
                : (
                    <div className="space-y-3">

                        {value.campos.map(
                            (
                                campo,
                                index,
                            ) => (
                                <Card
                                    key={
                                        `${campo.key}-${index}`
                                    }
                                    size="small"
                                >

                                    <div className="flex items-center gap-4">

                                        <div className="flex-1">

                                            <div className="flex flex-wrap items-center gap-2">

                                                <span className="font-medium text-slate-800">
                                                    {index + 1}.{" "}
                                                    {
                                                        campo.label
                                                    }
                                                </span>

                                                <Tag>
                                                    {
                                                        getTipoLabel(
                                                            campo.tipo,
                                                        )
                                                    }
                                                </Tag>

                                                <Tag
                                                    color={
                                                        campo.obligatorio
                                                            ? "red"
                                                            : "default"
                                                    }
                                                >
                                                    {
                                                        campo.obligatorio
                                                            ? "Obligatorio"
                                                            : "Opcional"
                                                    }
                                                </Tag>

                                            </div>

                                            {campo.descripcion && (
                                                <div className="mt-1 text-sm text-slate-500">
                                                    {
                                                        campo.descripcion
                                                    }
                                                </div>
                                            )}

                                            {/* =====================================================
    DOCUMENTOS ASOCIADOS
    ===================================================== */}

                                            {campo.documentos &&
                                                campo.documentos.length >
                                                0 && (
                                                    <div className="mt-3">

                                                        <div className="mb-2 text-xs font-medium text-slate-500">
                                                            Documentos asociados
                                                        </div>

                                                        <div className="flex flex-wrap gap-2">

                                                            {
                                                                campo.documentos.map(
                                                                    (
                                                                        documento,
                                                                    ) => (
                                                                        <Tag
                                                                            key={
                                                                                documento.path
                                                                            }
                                                                        >
                                                                            {
                                                                                documento.titulo
                                                                            }
                                                                        </Tag>
                                                                    ),
                                                                )
                                                            }

                                                        </div>

                                                    </div>
                                                )}

                                            <div className="mt-2 font-mono text-xs text-slate-400">
                                                {
                                                    campo.key
                                                }
                                            </div>

                                            {campo.tipo ===
                                                "RADIO" &&
                                                campo.opciones &&
                                                (
                                                    <div className="mt-2 flex flex-wrap gap-2">

                                                        {
                                                            campo.opciones.map(
                                                                (
                                                                    opcion,
                                                                ) => (
                                                                    <Tag
                                                                        key={
                                                                            opcion.value
                                                                        }
                                                                    >
                                                                        {
                                                                            opcion.label
                                                                        }
                                                                    </Tag>
                                                                ),
                                                            )
                                                        }

                                                    </div>
                                                )
                                            }

                                        </div>

                                        <Button
                                            type="text"
                                            disabled={
                                                disabled
                                            }
                                            icon={
                                                <Pencil
                                                    size={
                                                        16
                                                    }
                                                />
                                            }
                                            onClick={() => {

                                                setEditIndex(
                                                    index,
                                                );

                                                setCampoOpen(
                                                    true,
                                                );
                                            }}
                                        />

                                        <Popconfirm
                                            title="Eliminar campo"
                                            description="¿Quieres eliminar este campo?"
                                            okText="Eliminar"
                                            cancelText="Cancelar"
                                            disabled={
                                                disabled
                                            }
                                            onConfirm={() =>
                                                eliminarCampo(
                                                    index,
                                                )
                                            }
                                        >
                                            <Button
                                                danger
                                                type="text"
                                                disabled={
                                                    disabled
                                                }
                                                icon={
                                                    <Trash2
                                                        size={
                                                            16
                                                        }
                                                    />
                                                }
                                            />
                                        </Popconfirm>

                                    </div>

                                </Card>
                            ),
                        )}

                    </div>
                )
            }

            <CampoConsentimientoModal
                open={
                    campoOpen
                }
                value={
                    editIndex !==
                        null
                        ? value.campos[
                        editIndex
                        ]
                        : null
                }
                onCancel={() => {

                    setCampoOpen(
                        false,
                    );

                    setEditIndex(
                        null,
                    );
                }}
                onSave={
                    guardarCampo
                }
            />

        </div>
    );
}