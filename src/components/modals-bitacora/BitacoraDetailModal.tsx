// src/components/modals-bitacora/BitacoraDetailModal.tsx

import {
    BellOutlined,
    CheckOutlined,
    EditOutlined,
    UndoOutlined,
} from "@ant-design/icons";

import {
    Button,
    Modal,
    Tabs,
} from "antd";

import type {
    BitacoraEvidencia,
    BitacoraTecnico,
    EtapaEvidenciaBitacora,
} from "./bitacora.types";

import {
    esNotaRapida,
    formatFechaChile,
    formatFechaHoraChile,
    formatRecordatorioChile,
    formatTituloBitacora,
    getRecordatorioBadgeClass,
    getRecordatorioLabel,
    obtenerEstadoRecordatorio,
    renderRelacionesResumen,
} from "./bitacora.helpers";

import BitacoraEvidenciasTab from "./BitacoraEvidenciasTab";

type Props = {
    open:
    boolean;

    bitacora:
    BitacoraTecnico | null;

    evidencias:
    BitacoraEvidencia[];

    loadingEvidencias:
    boolean;

    onClose:
    () => void;

    onEdit:
    (
        bitacora:
            BitacoraTecnico
    ) => void;

    onToggleRecordatorio:
    (
        bitacora:
            BitacoraTecnico
    ) => void;
};

export default function BitacoraDetailModal({
    open,
    bitacora,
    evidencias,
    loadingEvidencias,
    onClose,
    onEdit,
    onToggleRecordatorio,
}: Props) {
    const relaciones =
        bitacora
            ? renderRelacionesResumen(
                bitacora
            )
            : [];

    return (
        <Modal
            open={
                open
            }
            onCancel={
                onClose
            }
            width={
                1050
            }
            destroyOnClose
            footer={[
                <Button
                    key="cerrar"
                    onClick={
                        onClose
                    }
                >
                    Cerrar
                </Button>,

                bitacora ? (
                    <Button
                        key="editar"
                        type="primary"
                        icon={
                            <EditOutlined />
                        }
                        onClick={() =>
                            onEdit(
                                bitacora
                            )
                        }
                    >
                        Editar
                    </Button>
                ) : null,
            ]}
            title={
                <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                        Detalle de
                        bitácora
                    </h2>

                    <p className="mt-1 text-sm font-normal text-slate-500">
                        Visualización
                        completa del
                        registro técnico
                        seleccionado.
                    </p>
                </div>
            }
        >
            {bitacora && (
                <Tabs
                    defaultActiveKey="resumen"
                    items={[
                        {
                            key:
                                "resumen",

                            label:
                                "Resumen",

                            children: (
                                <div className="space-y-5">
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <InfoBox
                                            label="Fecha de actividad"
                                            value={formatFechaChile(
                                                bitacora.fecha
                                            )}
                                        />

                                        <InfoBox
                                            label="Creada"
                                            value={formatFechaHoraChile(
                                                bitacora.createdAt
                                            )}
                                        />

                                        <InfoBox
                                            label="Técnico"
                                            value={
                                                bitacora
                                                    .tecnico
                                                    ?.nombre ??
                                                "-"
                                            }
                                        />

                                        <InfoBox
                                            label="Empresa"
                                            value={
                                                bitacora
                                                    .empresa
                                                    ?.nombre ??
                                                "-"
                                            }
                                        />

                                        <InfoBox
                                            label="Tipo"
                                            value={
                                                bitacora.tipoActividad
                                            }
                                            valueClassName="text-blue-700"
                                        />

                                        <InfoBox
                                            label="Estado"
                                            value={
                                                bitacora.estado
                                            }
                                        />
                                    </div>

                                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Título
                                        </p>

                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <p className="font-semibold text-slate-900">
                                                {formatTituloBitacora(
                                                    bitacora.titulo
                                                )}
                                            </p>

                                            {esNotaRapida(
                                                bitacora
                                            ) && (
                                                    <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                                                        Rápida
                                                    </span>
                                                )}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Descripción
                                        </p>

                                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                            {
                                                bitacora.descripcion
                                            }
                                        </p>
                                    </div>

                                    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                                                    Recordatorio
                                                </p>

                                                {bitacora.recordatorioAt ? (
                                                    <p className="mt-2 font-semibold text-slate-900">
                                                        {formatRecordatorioChile(
                                                            bitacora.recordatorioAt
                                                        )}
                                                    </p>
                                                ) : (
                                                    <p className="mt-2 text-sm text-slate-500">
                                                        Sin
                                                        recordatorio
                                                        configurado
                                                    </p>
                                                )}
                                            </div>

                                            {bitacora.recordatorioAt && (
                                                <BellOutlined className="text-2xl text-amber-600" />
                                            )}
                                        </div>

                                        {bitacora.recordatorioAt && (
                                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                                <span
                                                    className={[
                                                        "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",

                                                        getRecordatorioBadgeClass(
                                                            obtenerEstadoRecordatorio(
                                                                bitacora
                                                            )
                                                        ),
                                                    ].join(
                                                        " "
                                                    )}
                                                >
                                                    {getRecordatorioLabel(
                                                        obtenerEstadoRecordatorio(
                                                            bitacora
                                                        )
                                                    )}
                                                </span>

                                                <Button
                                                    size="small"
                                                    type={
                                                        bitacora.recordatorioCompletado
                                                            ? "default"
                                                            : "primary"
                                                    }
                                                    icon={
                                                        bitacora.recordatorioCompletado
                                                            ? (
                                                                <UndoOutlined />
                                                            )
                                                            : (
                                                                <CheckOutlined />
                                                            )
                                                    }
                                                    onClick={() =>
                                                        onToggleRecordatorio(
                                                            bitacora
                                                        )
                                                    }
                                                >
                                                    {bitacora.recordatorioCompletado
                                                        ? "Reactivar"
                                                        : "Completar"}
                                                </Button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            Relaciones
                                            asociadas
                                        </p>

                                        {relaciones.length >
                                            0 ? (
                                            <div className="mt-3 flex flex-col gap-2">
                                                {relaciones.map(
                                                    (
                                                        relacion,
                                                        index
                                                    ) => (
                                                        <div
                                                            key={`${relacion}-${index}`}
                                                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800"
                                                        >
                                                            {
                                                                relacion
                                                            }
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        ) : (
                                            <p className="mt-2 text-sm font-semibold text-slate-800">
                                                Sin
                                                relaciones
                                                asociadas
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ),
                        },

                        {
                            key:
                                "evidencias",

                            label: (
                                <span>
                                    Evidencias

                                    {evidencias.length >
                                        0 && (
                                            <span className="ml-2 rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-semibold text-cyan-700">
                                                {
                                                    evidencias.length
                                                }
                                            </span>
                                        )}
                                </span>
                            ),

                            children: (
                                <BitacoraEvidenciasTab
                                    evidencias={
                                        evidencias
                                    }
                                    loading={
                                        loadingEvidencias
                                    }
                                    editable={
                                        false
                                    }
                                />
                            ),
                        },
                    ]}
                />
            )}
        </Modal>
    );
}

function InfoBox({
    label,
    value,
    valueClassName = "text-slate-900",
}: {
    label:
    string;

    value:
    string;

    valueClassName?:
    string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
            </p>

            <p
                className={`mt-1 font-semibold ${valueClassName}`}
            >
                {value}
            </p>
        </div>
    );
}