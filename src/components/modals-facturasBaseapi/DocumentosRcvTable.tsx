// src/components/modals-facturasBaseapi/DocumentosRcvTable.tsx
import React from "react";

import type { TabRCV } from "./types";
import { formatCLP, formatFechaVista, getValue } from "./utils";

import {
    EyeOutlined,
    SearchOutlined,
    FileTextOutlined,
    CheckCircleOutlined,
    ClockCircleOutlined,
    CloseCircleOutlined,
} from "@ant-design/icons";

type Props = {
    documentosFiltrados: any[];
    documentosLength: number;
    loading: boolean;
    activeTab: TabRCV;
    busqueda: string;
    onBusquedaChange: (value: string) => void;
    onSelectDocumento: (doc: any) => void;
    onSelectCliente?: (doc: any) => void;
    renderRowActions?: (doc: any) => React.ReactNode;
    // mode: 'rcv' -> mostrar estado tal cual viene del RCV (incluye 'Acusado')
    // mode: 'cobranza' -> mostrar estados normalizados: Pendiente/Vencida/Confirmada
    mode?: "rcv" | "facturacion" | "cobranza";
};

function getEstadoRcv(
    doc: any,
    mode:
        | "rcv"
        | "facturacion"
        | "cobranza" =
        "rcv"
) {
    // mode === 'rcv' -> mostrar estado reportado por RCV primero
    // mode === 'cobranza' -> priorizar estadoPago (Pendiente/Vencida/Confirmada)
    const estadoRaw = String(
        getValue(doc, ["Estado", "estado", "Estado Documento", "estadoDocumento"], "")
    ).trim();

    const estadoPago = getValue(doc, ["estadoPago", "EstadoPago", "estado_pago"], null);

    if (
        mode === "rcv" ||
        mode === "facturacion"
    ) {
        if (estadoRaw) {
            return estadoRaw;
        }

        if (estadoPago) {
            return String(
                estadoPago
            );
        }
    } else {
        if (estadoPago) {
            return String(
                estadoPago
            );
        }

        if (estadoRaw) {
            return estadoRaw;
        }
    }

    // Si aún no hay estado, derivar desde fecha de vencimiento si está disponible
    const fechaVenc = getValue(doc, ["FchVenc", "FchVencimiento", "fechaVencimiento", "vencimiento", "fecha_vencimiento", "Vencimiento"], null);
    if (fechaVenc) {
        try {
            const s = String(fechaVenc).trim();
            const d = s ? new Date(s.indexOf('T') === -1 && /\d{4}-\d{2}-\d{2}/.test(s) ? s + 'T00:00:00' : s) : null;
            if (d && !isNaN(d.getTime())) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (d < today) return 'VENCIDA';
                return 'PENDIENTE';
            }
        } catch (e) { /* ignore */ }
    }

    return 'REGISTRADO';
}

function getEstadoStyles(estado: string) {
    const normalizado = estado.toUpperCase();

    if (normalizado.includes("PENDIENTE")) {
        return {
            className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
            icon: <ClockCircleOutlined />,
        };
    }

    // Vencidas deben mostrarse en rojo
    if (normalizado.includes("VENC")) {
        return {
            className: "bg-red-50 text-red-700 ring-1 ring-red-200",
            icon: <CloseCircleOutlined />,
        };
    }

    if (normalizado.includes("RECLAMADO")) {
        return {
            className: "bg-red-50 text-red-700 ring-1 ring-red-200",
            icon: <CloseCircleOutlined />,
        };
    }

    // Tratar estados de confirmación/pago como confirmados (evitar mostrar "Acusado")
    if (normalizado.includes("CONFIRM") || normalizado.includes("PAG") || normalizado.includes("CONFIRMADA") || normalizado.includes("PAGADA") || normalizado.includes("PAGADO")) {
        return {
            className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
            icon: <CheckCircleOutlined />,
        };
    }

    return {
        className: "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200",
        icon: <FileTextOutlined />,
    };
}

function EstadoBadge({ estado }: { estado: string }) {
    const styles = getEstadoStyles(estado);

    function normalizeEstadoLabel(s: string) {
        if (!s) return "Pendiente";
        const up = String(s).toUpperCase();
        if (up.includes("PENDIENTE")) return "Pendiente";
        if (up.includes("VENC")) return "Vencida";
        if (up.includes("RECLAMADO")) return "Reclamado";
        if (up.includes("ACUSADO")) return "Confirmado";
        if (up.includes("CONFIRM") || up.includes("PAG") || up.includes("CONFIRMADA") || up.includes("PAGADA") || up.includes("PAGADO")) return "Confirmado";
        // Fallback: capitalizar la primera letra
        const raw = String(s).trim();
        return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
    }

    const label = normalizeEstadoLabel(estado);

    return (
        <span
            className={`inline-flex max-w-full items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${styles.className}`}
            title={estado}
        >
            {styles.icon}
            <span className="truncate">{label}</span>
        </span>
    );
}

function formatFechaHoraChile(
    value: string | Date | null | undefined
) {
    if (!value) {
        return "—";
    }

    try {
        const date =
            value instanceof Date
                ? value
                : new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "—";
        }

        return new Intl.DateTimeFormat(
            "es-CL",
            {
                timeZone:
                    "America/Santiago",

                day:
                    "2-digit",

                month:
                    "2-digit",

                year:
                    "numeric",

                hour:
                    "2-digit",

                minute:
                    "2-digit",

                hour12:
                    false,
            }
        ).format(date);
    } catch {
        return "—";
    }
}

function getSituacionCobranza(
    doc: any
) {
    const diasRaw =
        doc?.diasDiferenciaCobranza;

    if (
        diasRaw === null ||
        diasRaw === undefined
    ) {
        return {
            label:
                "Sin fecha",

            className:
                "text-slate-400",
        };
    }

    const dias =
        Number(
            diasRaw
        );

    if (
        !Number.isFinite(
            dias
        )
    ) {
        return {
            label:
                "Sin fecha",

            className:
                "text-slate-400",
        };
    }

    if (
        dias > 0
    ) {
        return {
            label:
                `${dias} día${dias !== 1 ? "s" : ""} vencida`,

            className:
                "text-red-600",
        };
    }

    if (
        dias === 0
    ) {
        return {
            label:
                "Vence hoy",

            className:
                "text-amber-600",
        };
    }

    const faltan =
        Math.abs(
            dias
        );

    return {
        label:
            `Vence en ${faltan} día${faltan !== 1 ? "s" : ""}`,

        className:
            "text-emerald-600",
    };
}

function getAutomatizacionStyles(
    estado: string
) {
    switch (
    String(
        estado ??
        ""
    ).toUpperCase()
    ) {
        case "ENVIADO":
            return {
                label:
                    "Enviado",

                className:
                    "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",

                icon:
                    <CheckCircleOutlined />,
            };

        case "PENDIENTE":
            return {
                label:
                    "Pendiente",

                className:
                    "bg-amber-50 text-amber-700 ring-1 ring-amber-200",

                icon:
                    <ClockCircleOutlined />,
            };

        case "PROCESANDO":
            return {
                label:
                    "Procesando",

                className:
                    "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200",

                icon:
                    <ClockCircleOutlined />,
            };

        case "ERROR":
            return {
                label:
                    "Error",

                className:
                    "bg-red-50 text-red-700 ring-1 ring-red-200",

                icon:
                    <CloseCircleOutlined />,
            };

        case "PARCIAL":
            return {
                label:
                    "Parcial",

                className:
                    "bg-orange-50 text-orange-700 ring-1 ring-orange-200",

                icon:
                    <ClockCircleOutlined />,
            };

        default:
            return {
                label:
                    "Sin recordatorios",

                className:
                    "bg-slate-100 text-slate-500 ring-1 ring-slate-200",

                icon:
                    <FileTextOutlined />,
            };
    }
}

function AutomatizacionCobranzaCell({
    doc,
}: {
    doc: any;
}) {
    const automatizacion =
        doc?.cobranzaAutomatica;

    if (
        !automatizacion ||
        !automatizacion.tieneHistorial
    ) {
        return (
            <span className="text-xs text-slate-400">
                Sin recordatorios
            </span>
        );
    }

    const styles =
        getAutomatizacionStyles(
            automatizacion.estado
        );

    const destinatariosActuales =
        Array.isArray(
            automatizacion.destinatarios
        )
            ? automatizacion.destinatarios
            : [];

    const enviadosActuales =
        destinatariosActuales.filter(
            (item: any) =>
                item.estado === "ENVIADO" ||
                Boolean(item.enviadoAt)
        ).length;

    const pendientesActuales =
        destinatariosActuales.filter(
            (item: any) =>
                item.estado === "PENDIENTE"
        ).length;

    const procesandoActuales =
        destinatariosActuales.filter(
            (item: any) =>
                item.estado === "PROCESANDO"
        ).length;

    const erroresActuales =
        destinatariosActuales.filter(
            (item: any) =>
                item.estado === "ERROR"
        ).length;

    return (
        <div className="min-w-0">
            <span
                className={`
                    inline-flex
                    items-center
                    gap-1
                    rounded-full
                    px-2.5
                    py-1
                    text-[10px]
                    font-bold
                    ${styles.className}
                `}
            >
                {styles.icon}

                {styles.label}
            </span>

            <div className="mt-1.5 text-[11px] text-slate-500">
                {enviadosActuales} enviado
                {enviadosActuales !== 1
                    ? "s"
                    : ""}

                {" · "}

                {pendientesActuales} pendiente
                {pendientesActuales !== 1
                    ? "s"
                    : ""}

                {procesandoActuales > 0 && (
                    <>
                        {" · "}
                        {procesandoActuales} procesando
                    </>
                )}

                {erroresActuales > 0 && (
                    <>
                        {" · "}

                        <span className="font-semibold text-red-600">
                            {erroresActuales} error
                            {erroresActuales !== 1
                                ? "es"
                                : ""}
                        </span>
                    </>
                )}
            </div>

            {automatizacion.ultimoEnvioAt && (
                <div className="mt-1 text-[10px] text-slate-400">
                    Último:{" "}
                    <span className="font-semibold text-slate-600">
                        {formatFechaHoraChile(
                            automatizacion.ultimoEnvioAt
                        )}
                    </span>
                </div>
            )}

            {automatizacion.ultimoTipoRecordatorio && (
                <div
                    className="mt-0.5 max-w-[180px] truncate text-[10px] font-medium text-cyan-700"
                    title={
                        automatizacion.ultimoTipoRecordatorio
                    }
                >
                    {automatizacion.ultimoTipoRecordatorio}
                </div>
            )}
        </div>
    );
}

function EnvioFacturaCell({
    doc,
}: {
    doc: any;
}) {
    const envio =
        doc?.facturaEnvio;

    if (
        !envio ||
        !envio.tieneRegistro
    ) {
        return (
            <span className="text-xs text-slate-400">
                Sin envío
            </span>
        );
    }

    const estado =
        String(
            envio.estado ??
            ""
        ).toUpperCase();

    let className =
        "bg-slate-100 text-slate-600 ring-1 ring-slate-200";

    let icon:
        React.ReactNode =
        <FileTextOutlined />;

    let label =
        "Sin envío";

    if (
        estado === "ENVIADO"
    ) {
        className =
            "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";

        icon =
            <CheckCircleOutlined />;

        label =
            "Enviado";
    } else if (
        estado === "PENDIENTE"
    ) {
        className =
            "bg-amber-50 text-amber-700 ring-1 ring-amber-200";

        icon =
            <ClockCircleOutlined />;

        label =
            "Pendiente";
    } else if (
        estado === "PROCESANDO"
    ) {
        className =
            "bg-cyan-50 text-cyan-700 ring-1 ring-cyan-200";

        icon =
            <ClockCircleOutlined />;

        label =
            "Procesando";
    } else if (
        estado === "ERROR"
    ) {
        className =
            "bg-red-50 text-red-700 ring-1 ring-red-200";

        icon =
            <CloseCircleOutlined />;

        label =
            "Error";
    } else if (
        estado === "CANCELADO"
    ) {
        className =
            "bg-slate-100 text-slate-600 ring-1 ring-slate-200";

        icon =
            <CloseCircleOutlined />;

        label =
            "Cancelado";
    } else if (
        estado === "PARCIAL"
    ) {
        className =
            "bg-orange-50 text-orange-700 ring-1 ring-orange-200";

        icon =
            <ClockCircleOutlined />;

        label =
            "Parcial";
    }

    return (
        <div className="min-w-0">
            <span
                className={`
                    inline-flex
                    items-center
                    gap-1
                    rounded-full
                    px-2.5
                    py-1
                    text-[10px]
                    font-bold
                    ${className}
                `}
            >
                {icon}

                {label}
            </span>

            <div className="mt-1.5 text-[11px] text-slate-500">
                {envio.enviados ?? 0} enviado
                {(envio.enviados ?? 0) !== 1
                    ? "s"
                    : ""}

                {" · "}

                {envio.totalDestinatarios ?? 0} destinatario
                {(envio.totalDestinatarios ?? 0) !== 1
                    ? "s"
                    : ""}
            </div>

            {envio.ultimoEnvioAt && (
                <div className="mt-1 text-[10px] text-slate-400">
                    Último:{" "}
                    <span className="font-semibold text-slate-600">
                        {formatFechaHoraChile(
                            envio.ultimoEnvioAt
                        )}
                    </span>
                </div>
            )}

            {Array.isArray(
                envio.destinatarios
            ) &&
                envio.destinatarios.length >
                0 && (
                    <div
                        className="mt-1 break-words text-[10px] leading-4 text-cyan-700"
                        title={
                            envio
                                .destinatarios
                                .map(
                                    (item: any) =>
                                        `${item.nombre ?? ""} <${item.email}>`
                                )
                                .join(", ")
                        }
                    >
                        {envio
                            .destinatarios
                            .map(
                                (item: any) =>
                                    item.email
                            )
                            .join(", ")
                        }
                    </div>
                )}

            {(envio.errores ?? 0) >
                0 && (
                    <div className="mt-1 text-[10px] font-semibold text-red-600">
                        {envio.errores} error
                        {envio.errores !== 1
                            ? "es"
                            : ""}
                    </div>
                )}
        </div>
    );
}

const DocumentosRcvTable: React.FC<Props> = ({
    documentosFiltrados,
    documentosLength,
    loading,
    activeTab,
    busqueda,
    onBusquedaChange,
    onSelectDocumento,
    onSelectCliente,
    renderRowActions,
    mode = "rcv",
}) => {
    const totalColumnas =
        9 +
        (mode === "cobranza"
            ? 3
            : 0) +
        (mode === "facturacion"
            ? 1
            : 0) +
        (renderRowActions
            ? 1
            : 0);
    return (
        <div className="overflow-hidden rounded-3xl border border-cyan-200 bg-white shadow-sm">
            <div className="border-b border-cyan-100 bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
                                <FileTextOutlined />
                            </div>

                            <div>
                                <h2 className="text-base font-black text-slate-900 sm:text-lg">
                                    Documentos RCV
                                </h2>

                                <p className="text-xs text-slate-500 sm:text-sm">
                                    Mostrando {documentosFiltrados.length} de {documentosLength} documentos.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="relative w-full lg:w-96">
                        <SearchOutlined className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />

                        <input
                            value={busqueda}
                            onChange={(e) => onBusquedaChange(e.target.value)}
                            placeholder="Buscar folio, RUT o razón social..."
                            className="h-11 w-full rounded-2xl border border-cyan-200 bg-cyan-50/30 pl-9 pr-3 text-sm outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-100"
                        />
                    </div>
                </div>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-slate-100 md:hidden">
                {documentosFiltrados.map((doc, index) => {
                    const nombre = getValue(doc, [
                        "Razon Social",
                        "Razón Social",
                        "Razon Social Receptor",
                        "Razón Social Receptor",
                        "Razon Social Proveedor",
                        "Razón Social Proveedor",
                        "razonSocial",
                        "razonSocialProveedor",
                        "razonSocialReceptor",
                    ]);

                    const rut = getValue(doc, [
                        "Rut cliente",
                        "RUT Cliente",
                        "RUT Receptor",
                        "Rut Receptor",
                        "RUT Proveedor",
                        "Rut Proveedor",
                        "rutCliente",
                        "rutProveedor",
                        "rutReceptor",
                    ]);

                    const folio = getValue(doc, ["Folio", "folio"]);
                    const tipoDoc = getValue(doc, ["Tipo Doc", "tipoDoc", "tipoDTE"]);
                    const fecha = formatFechaVista(
                        getValue(doc, [
                            "Fecha Docto",
                            "Fecha Recepcion",
                            "fechaDocto",
                            "fechaEmision",
                            "fechaRecepcion",
                        ])
                    );

                    return (
                        <button
                            key={`${folio}-${index}`}
                            type="button"
                            onClick={() => onSelectDocumento(doc)}
                            className="block w-full p-4 text-left transition hover:bg-cyan-50"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                                            DTE {tipoDoc}
                                        </span>

                                        <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[11px] font-bold text-cyan-700 ring-1 ring-cyan-100">
                                            Folio {folio}
                                        </span>

                                        <EstadoBadge estado={getEstadoRcv(doc, mode)} />
                                    </div>

                                    <p className="mt-2 truncate text-sm font-bold text-slate-900">
                                        {onSelectCliente ? (
                                            <span
                                                role="button"
                                                onClick={(e) => { e.stopPropagation(); onSelectCliente(doc); }}
                                                className="text-cyan-700 hover:underline"
                                            >
                                                {nombre}
                                            </span>
                                        ) : (
                                            nombre
                                        )}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                        {rut} · {fecha}
                                    </p>

                                    {mode === "facturacion" && (
                                        <div className="mt-3 rounded-xl border border-cyan-100 bg-cyan-50/40 p-3">
                                            <p className="mb-2 text-[9px] font-bold uppercase tracking-wide text-cyan-700">
                                                Envío de factura
                                            </p>

                                            <EnvioFacturaCell
                                                doc={
                                                    doc
                                                }
                                            />
                                        </div>
                                    )}

                                    {mode === "cobranza" && (
                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                                                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                                                    Vencimiento
                                                </p>

                                                <p className="mt-1 text-xs font-bold text-slate-700">
                                                    {doc?.fechaVencimientoCobranza
                                                        ? formatFechaVista(
                                                            doc.fechaVencimientoCobranza
                                                        )
                                                        : "Sin fecha"}
                                                </p>

                                                <p
                                                    className={`mt-0.5 text-[10px] font-semibold ${getSituacionCobranza(
                                                        doc
                                                    ).className
                                                        }`}
                                                >
                                                    {
                                                        getSituacionCobranza(
                                                            doc
                                                        ).label
                                                    }
                                                </p>
                                            </div>

                                            <div className="rounded-xl border border-slate-100 bg-white p-2.5">
                                                <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                                                    Cobranza
                                                </p>

                                                <div className="mt-1">
                                                    <AutomatizacionCobranzaCell
                                                        doc={doc}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="shrink-0 text-right">
                                    <p className="text-[10px] font-bold uppercase text-slate-400">
                                        Total
                                    </p>

                                    <p className="text-[10px] font-bold uppercase text-slate-400">
                                        {formatCLP(getValue(doc, ["Monto total", "Monto Total", "montoTotal"], 0))}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-3 grid grid-cols-3 gap-2">
                                <div className="rounded-xl bg-slate-50 p-2">
                                    <p className="text-[10px] font-bold uppercase text-slate-400">
                                        Neto
                                    </p>
                                    <p className="truncate text-xs font-bold text-slate-700">
                                        {formatCLP(getValue(doc, ["Monto Neto", "montoNeto"], 0))}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-indigo-50 p-2">
                                    <p className="text-[10px] font-bold uppercase text-indigo-500">
                                        IVA
                                    </p>
                                    <p className="truncate text-xs font-bold text-slate-700">
                                        {formatCLP(getValue(doc, [
                                            "Monto IVA",
                                            "Monto Iva",
                                            "Monto IVA Recuperable",
                                            "montoIva",
                                            "montoIVA",
                                        ], 0))}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-slate-900 p-2">
                                    <p className="text-[10px] font-bold uppercase text-slate-300">
                                        Acción
                                    </p>

                                    <p className="flex items-center gap-1 text-xs font-bold text-white">
                                        <EyeOutlined />
                                        Ver detalle
                                    </p>
                                    {renderRowActions && (
                                        <div className="mt-2">
                                            {renderRowActions(doc)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}

                {!loading && documentosFiltrados.length === 0 && (
                    <div className="p-8 text-center text-sm text-slate-400">
                        No hay documentos para mostrar.
                    </div>
                )}

                {loading && (
                    <div className="p-8 text-center text-sm text-slate-400">
                        Cargando documentos...
                    </div>
                )}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1350px] table-fixed text-left text-[11px]">
                    <thead className="border-y border-cyan-100 bg-cyan-50/70 text-[9px] uppercase tracking-wide text-slate-500">
                        <tr>
                            <th className="w-[4%] px-2 py-3">
                                Tipo
                            </th>

                            <th className="w-[20%] px-2 py-3">
                                {activeTab === "ventas"
                                    ? "Cliente"
                                    : "Proveedor"}
                            </th>

                            <th className="w-[9%] px-2 py-3">
                                RUT
                            </th>

                            <th className="w-[6%] px-2 py-3">
                                Folio
                            </th>

                            <th className="w-[8%] px-2 py-3">
                                Fecha
                            </th>

                            <th className="w-[8%] px-2 py-3">
                                Estado
                            </th>

                            {mode === "facturacion" && (
                                <th className="w-[22%] px-2 py-3">
                                    Envío factura
                                </th>
                            )}

                            {mode === "cobranza" && (
                                <>
                                    <th className="w-[9%] px-2 py-3">
                                        Vencimiento
                                    </th>

                                    <th className="w-[9%] px-2 py-3">
                                        Situación
                                    </th>

                                    <th className="w-[14%] px-2 py-3">
                                        Recordatorio
                                    </th>
                                </>
                            )}

                            <th className="w-[8%] px-2 py-3 text-center">
                                Neto
                            </th>

                            <th className="w-[7%] px-2 py-3 text-center">
                                IVA
                            </th>

                            <th className="w-[8%] px-2 py-3 text-center">
                                Total
                            </th>

                            {renderRowActions && (
                                <th className="w-[7%] px-2 py-3 text-center">
                                    Acciones
                                </th>
                            )}
                        </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100 bg-white">
                        {documentosFiltrados.map((doc, index) => {
                            const nombre = getValue(doc, [
                                "Razon Social",
                                "Razón Social",
                                "Razon Social Receptor",
                                "Razón Social Receptor",
                                "Razon Social Proveedor",
                                "Razón Social Proveedor",
                                "razonSocial",
                                "razonSocialProveedor",
                                "razonSocialReceptor",
                            ]);

                            const rut = getValue(doc, [
                                "Rut cliente",
                                "RUT Cliente",
                                "RUT Receptor",
                                "Rut Receptor",
                                "RUT Proveedor",
                                "Rut Proveedor",
                                "rutCliente",
                                "rutProveedor",
                                "rutReceptor",
                            ]);

                            const folio = getValue(doc, ["Folio", "folio"]);
                            const tipoDoc = getValue(doc, ["Tipo Doc", "tipoDoc", "tipoDTE"]);
                            const estado = getEstadoRcv(doc, mode);

                            const fechaVencimiento =
                                doc?.fechaVencimientoCobranza ??
                                getValue(
                                    doc,
                                    [
                                        "FchVenc",
                                        "FchVencimiento",
                                        "fechaVencimiento",
                                        "vencimiento",
                                    ],
                                    null
                                );

                            const situacionCobranza =
                                getSituacionCobranza(
                                    doc
                                );

                            return (
                                <tr
                                    key={`${folio}-${index}`}
                                    onClick={() => onSelectDocumento(doc)}
                                    className="group cursor-pointer transition hover:bg-cyan-50/70"
                                >
                                    <td className="px-2 py-3">
                                        <span className="inline-flex rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-700 group-hover:bg-white">
                                            {tipoDoc}
                                        </span>
                                    </td>

                                    <td
                                        className="px-3 py-3 font-semibold text-slate-800"
                                        title={String(nombre)}
                                    >
                                        {onSelectCliente ? (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelectCliente(doc);
                                                }}
                                                className="line-clamp-2 text-left leading-4 text-cyan-700 hover:underline"
                                                title={`Ver ficha de ${nombre}`}
                                            >
                                                {nombre}
                                            </button>
                                        ) : (
                                            <div className="line-clamp-2 leading-4">
                                                {nombre}
                                            </div>
                                        )}
                                    </td>

                                    <td className="truncate px-4 py-3 text-slate-500">
                                        {rut}
                                    </td>

                                    <td className="truncate px-4 py-3 font-bold text-slate-700">
                                        {folio}
                                    </td>

                                    <td className="truncate px-4 py-3 text-slate-500">
                                        {formatFechaVista(
                                            getValue(doc, [
                                                "Fecha Docto",
                                                "Fecha Recepcion",
                                                "fechaDocto",
                                                "fechaEmision",
                                                "fechaRecepcion",
                                            ])
                                        )}
                                    </td>

                                    <td className="truncate px-4 py-3">
                                        <EstadoBadge estado={estado} />
                                    </td>

                                    {mode === "facturacion" && (
                                        <td className="px-3 py-3">
                                            <EnvioFacturaCell
                                                doc={
                                                    doc
                                                }
                                            />
                                        </td>
                                    )}

                                    {mode === "cobranza" && (
                                        <>
                                            <td className="whitespace-nowrap px-3 py-3">
                                                {fechaVencimiento ? (
                                                    <div>
                                                        <div className="font-semibold text-slate-700">
                                                            {formatFechaVista(
                                                                fechaVencimiento
                                                            )}
                                                        </div>

                                                        <div className="mt-0.5 text-[10px] text-slate-400">
                                                            {doc?.origenVencimiento ===
                                                                "OVERRIDE"
                                                                ? "Fecha manual"
                                                                : doc?.origenVencimiento ===
                                                                    "DOCUMENTO"
                                                                    ? "Documento"
                                                                    : ""}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">
                                                        —
                                                    </span>
                                                )}
                                            </td>

                                            <td className="whitespace-nowrap px-3 py-3">
                                                <span
                                                    className={`
                    text-xs
                    font-bold
                    ${situacionCobranza.className}
                `}
                                                >
                                                    {situacionCobranza.label}
                                                </span>
                                            </td>

                                            <td className="px-3 py-3">
                                                <AutomatizacionCobranzaCell
                                                    doc={doc}
                                                />
                                            </td>
                                        </>
                                    )}

                                    <td className="whitespace-nowrap px-3 py-3 text-center text-slate-600">
                                        {formatCLP(
                                            getValue(
                                                doc,
                                                ["Monto Neto", "montoNeto"],
                                                0
                                            )
                                        )}
                                    </td>

                                    <td className="whitespace-nowrap px-3 py-3 text-center text-slate-600">
                                        {formatCLP(
                                            getValue(
                                                doc,
                                                [
                                                    "Monto IVA",
                                                    "Monto Iva",
                                                    "Monto IVA Recuperable",
                                                    "montoIva",
                                                    "montoIVA",
                                                ],
                                                0
                                            )
                                        )}
                                    </td>

                                    <td className="whitespace-nowrap px-3 py-3 text-center font-bold text-slate-700">
                                        {formatCLP(
                                            getValue(
                                                doc,
                                                [
                                                    "Monto total",
                                                    "Monto Total",
                                                    "montoTotal",
                                                ],
                                                0
                                            )
                                        )}
                                    </td>
                                    {renderRowActions && (
                                        <td className="px-4 py-3 text-center">{renderRowActions(doc)}</td>
                                    )}
                                </tr>
                            );
                        })}

                        {!loading && documentosFiltrados.length === 0 && (
                            <tr>
                                <td colSpan={totalColumnas} className="px-3 py-12 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-400">
                                        <FileTextOutlined className="text-3xl" />
                                        <p className="mt-2 text-sm font-semibold">
                                            No hay documentos para mostrar.
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {loading && (
                            <tr>
                                <td colSpan={totalColumnas} className="px-3 py-12 text-center text-slate-400">
                                    Cargando documentos...
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DocumentosRcvTable;