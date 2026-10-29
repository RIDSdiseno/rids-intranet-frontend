// src/components/modals-proteccion-datos/ConsentimientoRespuestaModal.tsx
import {
    CheckCircle2,
    CircleX,
    Clock3,
    Mail,
    ShieldCheck,
    Undo2,
} from "lucide-react";

import {
    Descriptions,
    Divider,
    Modal,
    Spin,
    Tag,
    Timeline,
} from "antd";

import type {
    ConfiguracionConsentimiento,
    DestinatarioConsentimiento,
    HistorialConsentimientoResponse,
    TipoEventoConsentimiento,
} from "./proteccion-datos.types";

import {
    getEstadoConsentimientoLabel,
    formatearFechaHora
} from "./proteccion-datos.helpers";

import {
    useEffect,
    useState,
} from "react";

import {
    listarEventosConsentimiento,
} from "./proteccion-datos.api";

type Props = {
    open:
    boolean;

    campaniaId:
    number |
    null;

    destinatario:
    DestinatarioConsentimiento |
    null;

    configuracion:
    ConfiguracionConsentimiento |
    null;

    onClose:
    () => void;
};

function renderValorRespuesta(
    value:
        string |
        boolean |
        undefined,

    opciones?:
        Array<{
            value:
            string;

            label:
            string;
        }>,
) {

    if (
        typeof value ===
        "boolean"
    ) {
        return value
            ? (
                <Tag
                    color="success"
                >
                    Confirmado
                </Tag>
            )
            : (
                <Tag>
                    No confirmado
                </Tag>
            );
    }

    if (
        typeof value ===
        "string"
    ) {

        const opcion =
            opciones?.find(
                (
                    item,
                ) =>
                    item.value ===
                    value,
            );

        return (
            <span className="text-sm font-medium text-slate-800">
                {
                    opcion?.label ??
                    value
                }
            </span>
        );
    }

    return (
        <Tag>
            Sin respuesta
        </Tag>
    );
}

export default function ConsentimientoRespuestaModal({
    open,
    campaniaId,
    destinatario,
    configuracion,
    onClose,
}: Props) {

    const [
        historial,
        setHistorial,
    ] =
        useState<
            HistorialConsentimientoResponse |
            null
        >(
            null,
        );

    const [
        loadingHistorial,
        setLoadingHistorial,
    ] =
        useState(
            false,
        );

    const respuesta =
        destinatario
            ?.respuestaJson ??
        null;

    useEffect(
        () => {

            if (
                !open ||
                !campaniaId ||
                !destinatario
            ) {
                setHistorial(
                    null,
                );

                return;
            }

            let activo =
                true;

            async function cargarHistorial() {

                try {

                    setLoadingHistorial(
                        true,
                    );

                    const response =
                        await listarEventosConsentimiento(
                            campaniaId!,
                            destinatario!.id,
                        );

                    if (
                        activo
                    ) {
                        setHistorial(
                            response,
                        );
                    }

                } catch {

                    if (
                        activo
                    ) {
                        setHistorial(
                            null,
                        );
                    }

                } finally {

                    if (
                        activo
                    ) {
                        setLoadingHistorial(
                            false,
                        );
                    }
                }
            }

            void cargarHistorial();

            return () => {
                activo =
                    false;
            };

        },
        [
            open,
            campaniaId,
            destinatario,
        ],
    );

    function getEventoLabel(
        tipo:
            TipoEventoConsentimiento,
    ): string {

        switch (
        tipo
        ) {

            case "CREADO":
                return "Consentimiento creado";

            case "ENVIADO":
                return "Consentimiento enviado";

            case "ERROR_ENVIO":
                return "Error durante el envío";

            case "FORMULARIO_ABIERTO":
                return "Formulario abierto";

            case "ACEPTADO":
                return "Consentimiento aceptado";

            case "RECHAZADO":
                return "Consentimiento rechazado";

            case "REVOCADO":
                return "Consentimiento revocado";

            case "REENVIADO":
                return "Consentimiento reenviado";

            default:
                return tipo;
        }
    }

    function getEventoColor(
        tipo:
            TipoEventoConsentimiento,
    ) {

        switch (
        tipo
        ) {

            case "ACEPTADO":
                return "green";

            case "RECHAZADO":
            case "ERROR_ENVIO":
                return "red";

            case "REVOCADO":
                return "orange";

            case "ENVIADO":
                return "blue";

            case "FORMULARIO_ABIERTO":
                return "cyan";

            default:
                return "gray";
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
                760
            }
            title="Detalle del consentimiento"
        >
            {destinatario && (
                <div className="space-y-5">

                    {/* ===============================
                        IDENTIFICACIÓN
                        =============================== */}

                    <Descriptions
                        bordered
                        size="small"
                        column={{
                            xs:
                                1,

                            sm:
                                2,
                        }}
                    >
                        <Descriptions.Item
                            label="Nombre"
                        >
                            {
                                destinatario.nombre ??
                                "—"
                            }
                        </Descriptions.Item>

                        <Descriptions.Item
                            label="Empresa"
                        >
                            {
                                destinatario.empresaNombre ??
                                "—"
                            }
                        </Descriptions.Item>

                        <Descriptions.Item
                            label="Correo"
                            span={
                                2
                            }
                        >
                            {
                                destinatario.email
                            }
                        </Descriptions.Item>

                        <Descriptions.Item
                            label="Estado"
                        >
                            <Tag>
                                {
                                    getEstadoConsentimientoLabel(
                                        destinatario.estado,
                                    )
                                }
                            </Tag>
                        </Descriptions.Item>

                        <Descriptions.Item
                            label="Versión"
                        >
                            {
                                destinatario.versionDocumento
                            }
                        </Descriptions.Item>
                    </Descriptions>

                    {/* ===============================
                        TRAZABILIDAD
                        =============================== */}

                    <div>
                        <h3 className="mb-3 text-base font-semibold text-slate-800">
                            Trazabilidad
                        </h3>

                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase text-slate-500">
                                    <Mail
                                        size={
                                            14
                                        }
                                    />
                                    Enviado
                                </div>

                                <div className="text-sm font-semibold text-slate-800">
                                    {
                                        formatearFechaHora(
                                            destinatario.fechaEnvio,
                                        )
                                    }
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase text-slate-500">
                                    <Clock3
                                        size={
                                            14
                                        }
                                    />
                                    Primera apertura
                                </div>

                                <div className="text-sm font-semibold text-slate-800">
                                    {
                                        formatearFechaHora(
                                            destinatario.fechaAperturaFormulario,
                                        )
                                    }
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase text-slate-500">
                                    <ShieldCheck
                                        size={
                                            14
                                        }
                                    />
                                    Respondido
                                </div>

                                <div className="text-sm font-semibold text-slate-800">
                                    {
                                        formatearFechaHora(
                                            destinatario.fechaRespuesta,
                                        )
                                    }
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase text-slate-500">
                                    <Undo2
                                        size={
                                            14
                                        }
                                    />
                                    Revocado
                                </div>

                                <div className="text-sm font-semibold text-slate-800">
                                    {
                                        formatearFechaHora(
                                            destinatario.fechaRevocacion,
                                        )
                                    }
                                </div>
                            </div>

                        </div>

                        <div className="mt-5">

                            <div className="mb-3 text-sm font-semibold text-slate-800">
                                Historial de estados
                            </div>

                            {loadingHistorial ? (

                                <div className="flex justify-center py-6">
                                    <Spin
                                        size="small"
                                    />
                                </div>

                            ) : !historial ||
                                historial.eventos.length ===
                                0 ? (

                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                                    No hay eventos registrados para este consentimiento.
                                </div>

                            ) : (

                                <div className="rounded-xl border border-slate-200 p-4">

                                    <Timeline
                                        items={
                                            historial.eventos.map(
                                                (
                                                    evento,
                                                ) => ({
                                                    color:
                                                        getEventoColor(
                                                            evento.tipo,
                                                        ),

                                                    children:
                                                        (
                                                            <div className="pb-2">

                                                                <div className="font-medium text-slate-800">
                                                                    {
                                                                        getEventoLabel(
                                                                            evento.tipo,
                                                                        )
                                                                    }
                                                                </div>

                                                                <div className="mt-1 text-xs text-slate-500">
                                                                    {
                                                                        formatearFechaHora(
                                                                            evento.createdAt,
                                                                        )
                                                                    }
                                                                </div>

                                                                {evento.tipo ===
                                                                    "REVOCADO" &&
                                                                    typeof evento
                                                                        .detalle
                                                                        ?.motivo ===
                                                                    "string" && (
                                                                        <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">

                                                                            <span className="font-medium">
                                                                                Motivo:
                                                                            </span>{" "}

                                                                            {
                                                                                evento
                                                                                    .detalle
                                                                                    .motivo
                                                                            }

                                                                        </div>
                                                                    )}

                                                            </div>
                                                        ),
                                                }),
                                            )
                                        }
                                    />

                                </div>
                            )}

                        </div>
                    </div>

                    <Divider />

                    {/* ===============================
                        RESPUESTA
                        =============================== */}

                    <div>
                        <h3 className="mb-3 text-base font-semibold text-slate-800">
                            Respuesta registrada
                        </h3>

                        {!respuesta ? (
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                                Este destinatario todavía no ha registrado una respuesta.
                            </div>
                        ) : (
                            <div className="space-y-4">

                                {/* DECISIÓN */}

                                <div
                                    className={`
                                        flex items-center gap-3
                                        rounded-xl border p-4
                                        ${respuesta.aceptado
                                            ? "border-emerald-200 bg-emerald-50"
                                            : "border-red-200 bg-red-50"
                                        }
                                    `}
                                >
                                    {
                                        respuesta.aceptado
                                            ? (
                                                <CheckCircle2
                                                    size={
                                                        22
                                                    }
                                                    className="text-emerald-600"
                                                />
                                            )
                                            : (
                                                <CircleX
                                                    size={
                                                        22
                                                    }
                                                    className="text-red-600"
                                                />
                                            )
                                    }

                                    <div>
                                        <div className="font-semibold text-slate-800">
                                            {
                                                respuesta.aceptado
                                                    ? destinatario.estado ===
                                                        "REVOCADO"
                                                        ? "Consentimiento aceptado originalmente"
                                                        : "Consentimiento aceptado"
                                                    : "Consentimiento rechazado"
                                            }
                                        </div>

                                        <div className="text-sm text-slate-500">

                                            {
                                                destinatario.estado ===
                                                    "REVOCADO"
                                                    ? "La aceptación fue registrada por el destinatario y posteriormente revocada."
                                                    : "Decisión registrada por el destinatario."
                                            }

                                        </div>
                                    </div>
                                </div>

                                {/* RESPUESTAS DEL FORMULARIO */}

                                <div className="rounded-xl border border-slate-200 p-4">

                                    <div className="mb-3 text-sm font-semibold text-slate-800">
                                        Respuestas del formulario
                                    </div>

                                    {!configuracion ||
                                        configuracion.campos.length ===
                                        0
                                        ? (
                                            <div className="text-sm text-slate-500">
                                                No se encontró la configuración del formulario.
                                            </div>
                                        )
                                        : (
                                            <div className="space-y-2">

                                                {
                                                    configuracion.campos.map(
                                                        (
                                                            campo,
                                                            index,
                                                        ) => {

                                                            const valor =
                                                                respuesta.respuestas[
                                                                campo.key
                                                                ];

                                                            return (
                                                                <div
                                                                    key={
                                                                        campo.key
                                                                    }
                                                                    className="
                                        rounded-lg
                                        border border-slate-100
                                        bg-slate-50
                                        px-4 py-3
                                    "
                                                                >

                                                                    <div className="flex items-start justify-between gap-4">

                                                                        <div className="min-w-0 flex-1">

                                                                            <div className="text-sm font-medium text-slate-800">
                                                                                {index + 1}.{" "}
                                                                                {
                                                                                    campo.label
                                                                                }
                                                                            </div>

                                                                            {campo.descripcion && (
                                                                                <div className="mt-1 text-xs text-slate-500">
                                                                                    {
                                                                                        campo.descripcion
                                                                                    }
                                                                                </div>
                                                                            )}

                                                                        </div>

                                                                        <div className="shrink-0">
                                                                            {
                                                                                renderValorRespuesta(
                                                                                    valor,
                                                                                    campo.opciones,
                                                                                )
                                                                            }
                                                                        </div>

                                                                    </div>

                                                                </div>
                                                            );
                                                        },
                                                    )
                                                }

                                            </div>
                                        )
                                    }

                                </div>

                            </div>
                        )}
                    </div>

                    {/* ===============================
                        HASH
                        =============================== */}

                    <Divider />

                    <div>
                        <div className="text-xs font-medium uppercase text-slate-500">
                            Hash del documento
                        </div>

                        <div className="mt-2 break-all rounded-lg bg-slate-50 p-3 font-mono text-xs text-slate-600">
                            {
                                destinatario.documentoHash
                            }
                        </div>
                    </div>

                </div>
            )}
        </Modal>
    );
}