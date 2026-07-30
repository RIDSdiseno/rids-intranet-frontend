// src/components/recordatorios/RecordatoriosCampana.tsx

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    Badge,
    Button,
    Empty,
    Popconfirm,
    Popover,
    Spin,
    Tooltip,
} from "antd";

import {
    BellOutlined,
    CheckOutlined,
    CloseOutlined,
    EyeOutlined,
    ReloadOutlined,
} from "@ant-design/icons";

import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

import { useNavigate } from "react-router-dom";

import { api } from "../../api/api";

import type {
    Recordatorio,
    RecordatoriosResponse,
} from "./recordatorios.types";

dayjs.extend(utc);
dayjs.extend(timezone);

const CHILE_TZ = "America/Santiago";

/* =====================================================
   HELPERS DE FECHA
===================================================== */

function formatearFechaRecordatorio(
    value: string
) {
    const fecha = dayjs(value);

    if (!fecha.isValid()) {
        return "Fecha no válida";
    }

    return fecha
        .tz(CHILE_TZ)
        .format("DD/MM/YYYY [a las] HH:mm");
}

function recordatorioVencido(
    recordatorio: Recordatorio
) {
    return dayjs(
        recordatorio.fechaProgramada
    ).isBefore(dayjs());
}

/* =====================================================
   RUTAS DE NAVEGACIÓN
===================================================== */

function obtenerRutaRecordatorio(
    recordatorio: Recordatorio
): string | null {
    /*
     * Ajusta estas rutas según las rutas reales
     * configuradas en tu aplicación.
     */

    if (recordatorio.ticketId) {
        return `/helpdesk/tickets/${recordatorio.ticketId}`;
    }

    if (recordatorio.bitacoraId) {
        return `/bitacora-tecnico?registro=${recordatorio.bitacoraId}`;
    }

    if (recordatorio.cotizacionId) {
        /*
         * La página actual de cotizaciones no declara una ruta /:id.
         * Se navega al listado enviando el ID como query.
         */
        return `/Cotizaciones?cotizacionId=${recordatorio.cotizacionId}`;
    }

    if (recordatorio.visitaId) {
        return `/agenda?visitaId=${recordatorio.visitaId}`;
    }

    if (recordatorio.equipoId) {
        return `/equipos?equipoId=${recordatorio.equipoId}`;
    }

    return null;
}

/* =====================================================
   LABEL DEL ORIGEN
===================================================== */

function obtenerLabelOrigen(
    origen: Recordatorio["origen"]
) {
    const labels: Record<
        Recordatorio["origen"],
        string
    > = {
        MANUAL: "Manual",
        BITACORA: "Bitácora",
        TICKET: "Ticket",
        COTIZACION: "Cotización",
        VISITA: "Visita",
        EQUIPO: "Equipo",
    };

    return labels[origen];
}

/* =====================================================
   LABEL DEL ESTADO DEL TICKET
===================================================== */

function obtenerLabelEstadoTicket(
    status?: string | null
) {
    const labels: Record<string, string> = {
        NEW: "Nuevo",
        OPEN: "Abierto",
        PENDING: "Pendiente",
        ON_HOLD: "En espera",
        RESOLVED: "Resuelto",
        CLOSED: "Cerrado",
    };

    if (!status) {
        return "Sin estado";
    }

    return labels[status] ?? status;
}

/* =====================================================
   NOTIFICACIÓN DEL NAVEGADOR
===================================================== */

function mostrarNotificacionNavegador(
    recordatorio: Recordatorio
) {
    if (
        !("Notification" in window) ||
        Notification.permission !== "granted"
    ) {
        return;
    }

    const notification =
        new Notification(
            recordatorio.titulo,
            {
                body:
                    recordatorio.mensaje ??
                    "Tienes un recordatorio pendiente.",

                icon: "/favicon.ico",

                /*
                 * tag evita duplicados visibles del mismo aviso.
                 */
                tag: `recordatorio-${recordatorio.id}`,
            }
        );

    /*
     * Al presionar la notificación,
     * se enfoca nuevamente el CRM.
     */
    notification.onclick = () => {
        window.focus();
        notification.close();
    };
}

/* =====================================================
   COMPONENTE
===================================================== */

export default function RecordatoriosBell() {
    const navigate =
        useNavigate();

    const [recordatorios, setRecordatorios] =
        useState<Recordatorio[]>([]);

    const [
        pendientesNoLeidos,
        setPendientesNoLeidos,
    ] = useState(0);

    const [loading, setLoading] =
        useState(false);

    const [open, setOpen] =
        useState(false);

    /*
     * Evita notificar varias veces el mismo recordatorio
     * durante una misma sesión del navegador.
     */
    const notificadosEnSesion =
        useRef<Set<number>>(new Set());

    /* =====================================================
       CARGAR RECORDATORIOS
    ===================================================== */

    const cargarRecordatorios =
        useCallback(async () => {
            try {
                setLoading(true);

                const response =
                    await api.get<RecordatoriosResponse>(
                        "/recordatorios/mios"
                    );

                const lista =
                    Array.isArray(
                        response.data?.data
                    )
                        ? response.data.data
                        : [];

                setRecordatorios(lista);

                setPendientesNoLeidos(
                    Number(
                        response.data
                            ?.pendientesNoLeidos ??
                        0
                    )
                );

                /*
                 * Generar notificación solamente si:
                 * - sigue pendiente;
                 * - no está leído;
                 * - ya llegó la fecha;
                 * - no fue notificado antes en esta sesión.
                 */
                lista.forEach(
                    (recordatorio) => {
                        const esRecordatorioTicketPendiente =
                            recordatorio.origen === "TICKET" &&
                            recordatorio.ticket?.status === "PENDING";

                        const debeNotificar =
                            recordatorio.estado === "PENDIENTE" &&
                            !recordatorio.leidoAt &&
                            (
                                recordatorioVencido(recordatorio) ||
                                esRecordatorioTicketPendiente
                            ) &&
                            !notificadosEnSesion.current.has(
                                recordatorio.id
                            );

                        if (debeNotificar) {
                            mostrarNotificacionNavegador(
                                recordatorio
                            );

                            notificadosEnSesion.current.add(
                                recordatorio.id
                            );
                        }
                    }
                );
            } catch (error) {
                console.error(
                    "Error cargando recordatorios:",
                    error
                );
            } finally {
                setLoading(false);
            }
        }, []);

    /* =====================================================
       CONSULTA AUTOMÁTICA
    ===================================================== */

    useEffect(() => {
        /*
         * Carga inicial al entrar al CRM.
         */
        void cargarRecordatorios();

        /*
         * Consultar cada 60 segundos.
         * Más adelante puede cambiarse por Socket.IO.
         */
        const intervalId =
            window.setInterval(() => {
                void cargarRecordatorios();
            }, 60_000);

        return () => {
            window.clearInterval(
                intervalId
            );
        };
    }, [cargarRecordatorios]);

    useEffect(() => {
        /*
         * Otros componentes emiten este evento después
         * de crear, editar o reactivar un recordatorio.
         *
         * Esto evita esperar hasta la siguiente consulta
         * automática de 60 segundos.
         */
        function actualizarCampana() {
            void cargarRecordatorios();
        }

        window.addEventListener(
            "recordatorios:actualizar",
            actualizarCampana
        );

        return () => {
            window.removeEventListener(
                "recordatorios:actualizar",
                actualizarCampana
            );
        };
    }, [cargarRecordatorios]);

    /* =====================================================
       ORDENAR RECORDATORIOS
    ===================================================== */

    const recordatoriosOrdenados =
        useMemo(() => {
            return [...recordatorios].sort(
                (a, b) => {
                    return (
                        dayjs(
                            a.fechaProgramada
                        ).valueOf() -
                        dayjs(
                            b.fechaProgramada
                        ).valueOf()
                    );
                }
            );
        }, [recordatorios]);

    /* =====================================================
       MARCAR COMO LEÍDO
    ===================================================== */

    async function marcarComoLeido(
        recordatorio: Recordatorio
    ) {
        if (recordatorio.leidoAt) {
            return;
        }

        try {
            await api.patch(
                `/recordatorios/${recordatorio.id}/leido`
            );

            setRecordatorios((prev) =>
                prev.map((item) =>
                    item.id ===
                        recordatorio.id
                        ? {
                            ...item,
                            leidoAt:
                                new Date().toISOString(),
                        }
                        : item
                )
            );

            /*
             * El contador solo considera recordatorios
             * cuya fecha ya llegó.
             */
            const cuentaEnBadge =
                recordatorioVencido(recordatorio) ||
                (
                    recordatorio.origen === "TICKET" &&
                    recordatorio.ticket?.status === "PENDING"
                );

            if (cuentaEnBadge) {
                setPendientesNoLeidos(
                    (prev) =>
                        Math.max(
                            0,
                            prev - 1
                        )
                );
            }
        } catch (error) {
            console.error(
                "Error marcando recordatorio como leído:",
                error
            );
        }
    }

    /* =====================================================
       COMPLETAR
    ===================================================== */

    async function completarRecordatorio(
        recordatorio: Recordatorio
    ) {
        try {
            await api.patch(
                `/recordatorios/${recordatorio.id}/completar`
            );

            /*
 * Si el recordatorio pertenece a una bitácora,
 * se informa a la página para que refresque su estado.
 */
            if (recordatorio.bitacoraId) {
                window.dispatchEvent(
                    new Event("bitacora:actualizar")
                );
            }

            /*
             * El endpoint /mios normalmente devuelve pendientes.
             * Al completar, lo quitamos visualmente de inmediato.
             */
            setRecordatorios((prev) =>
                prev.filter(
                    (item) =>
                        item.id !==
                        recordatorio.id
                )
            );

            if (
                !recordatorio.leidoAt &&
                recordatorioVencido(
                    recordatorio
                )
            ) {
                setPendientesNoLeidos(
                    (prev) =>
                        Math.max(
                            0,
                            prev - 1
                        )
                );
            }
        } catch (error) {
            console.error(
                "Error completando recordatorio:",
                error
            );
        }
    }

    /* =====================================================
       CANCELAR
    ===================================================== */

    async function cancelarRecordatorio(
        recordatorio: Recordatorio
    ) {
        try {
            await api.patch(
                `/recordatorios/${recordatorio.id}/cancelar`
            );

            /*
        * Actualizar también la página de bitácora
        * cuando el origen sea BITACORA.
        */
            if (recordatorio.bitacoraId) {
                window.dispatchEvent(
                    new Event("bitacora:actualizar")
                );
            }

            setRecordatorios((prev) =>
                prev.filter(
                    (item) =>
                        item.id !==
                        recordatorio.id
                )
            );

            if (
                !recordatorio.leidoAt &&
                recordatorioVencido(
                    recordatorio
                )
            ) {
                setPendientesNoLeidos(
                    (prev) =>
                        Math.max(
                            0,
                            prev - 1
                        )
                );
            }
        } catch (error) {
            console.error(
                "Error cancelando recordatorio:",
                error
            );
        }
    }

    /* =====================================================
       ABRIR REGISTRO DE ORIGEN
    ===================================================== */

    async function abrirOrigen(
        recordatorio: Recordatorio
    ) {
        if (!recordatorio.leidoAt) {
            await marcarComoLeido(
                recordatorio
            );
        }

        const ruta =
            obtenerRutaRecordatorio(
                recordatorio
            );

        if (!ruta) {
            return;
        }

        setOpen(false);
        navigate(ruta);
    }

    /* =====================================================
       CONTENIDO DEL POPOVER
    ===================================================== */

    const contenido = (
        <div className="w-[380px] max-w-[calc(100vw-32px)]">
            {/* =====================================================
            ENCABEZADO DE LA CAMPANA
        ===================================================== */}
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <h3 className="font-semibold text-slate-900">
                        Recordatorios
                    </h3>

                    <p className="mt-0.5 text-xs text-slate-500">
                        Pendientes y próximos 30 días
                    </p>
                </div>

                <div className="flex items-center gap-1">
                    {/*
                 * Solicitar permiso únicamente mediante
                 * una acción explícita del usuario.
                 */}
                    {"Notification" in window &&
                        Notification.permission !==
                        "granted" && (
                            <Tooltip title="Activar notificaciones del navegador">
                                <Button
                                    size="small"
                                    icon={<BellOutlined />}
                                    onClick={async () => {
                                        const permiso =
                                            await Notification.requestPermission();

                                        if (
                                            permiso ===
                                            "granted"
                                        ) {
                                            void cargarRecordatorios();
                                        }
                                    }}
                                />
                            </Tooltip>
                        )}

                    <Tooltip title="Actualizar">
                        <Button
                            size="small"
                            icon={<ReloadOutlined />}
                            loading={loading}
                            onClick={() =>
                                void cargarRecordatorios()
                            }
                        />
                    </Tooltip>
                </div>
            </div>

            {loading &&
                recordatoriosOrdenados.length ===
                0 ? (
                <div className="flex justify-center py-8">
                    <Spin />
                </div>
            ) : recordatoriosOrdenados.length ===
                0 ? (
                <Empty
                    image={
                        Empty.PRESENTED_IMAGE_SIMPLE
                    }
                    description="Sin recordatorios pendientes"
                />
            ) : (
                <div className="max-h-[450px] space-y-2 overflow-y-auto pr-1">
                    {recordatoriosOrdenados.map(
                        (recordatorio) => {
                            const vencido =
                                recordatorioVencido(
                                    recordatorio
                                );

                            return (
                                <article
                                    key={
                                        recordatorio.id
                                    }
                                    className={[
                                        "rounded-xl border p-3 transition",
                                        vencido
                                            ? "border-red-200 bg-red-50"
                                            : "border-amber-200 bg-amber-50",
                                        recordatorio.leidoAt
                                            ? "opacity-75"
                                            : "shadow-sm",
                                    ].join(
                                        " "
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="truncate font-semibold text-slate-900">
                                                    {
                                                        recordatorio.titulo
                                                    }
                                                </p>

                                                {!recordatorio.leidoAt && (
                                                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                                                )}
                                            </div>

                                            <p className="mt-1 text-xs font-medium text-slate-600">
                                                {formatearFechaRecordatorio(
                                                    recordatorio.fechaProgramada
                                                )}
                                            </p>
                                        </div>

                                        <span
                                            className={[
                                                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                                vencido
                                                    ? "bg-red-100 text-red-700"
                                                    : "bg-amber-100 text-amber-700",
                                            ].join(
                                                " "
                                            )}
                                        >
                                            {vencido
                                                ? "Vencido"
                                                : "Próximo"}
                                        </span>
                                    </div>

                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                            {obtenerLabelOrigen(
                                                recordatorio.origen
                                            )}
                                        </span>
                                    </div>

                                    {recordatorio.mensaje && (
                                        <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-600">
                                            {
                                                recordatorio.mensaje
                                            }
                                        </p>
                                    )}

                                    {recordatorio.ticket && (
                                        <div className="mt-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600">
                                            <span className="font-semibold">Ticket:</span>{" "}
                                            #{recordatorio.ticket.id}
                                            {recordatorio.ticket.subject && (
                                                <>
                                                    {" · "}
                                                    <span>{recordatorio.ticket.subject}</span>
                                                </>
                                            )}
                                            {recordatorio.ticket.status && (
                                                <>
                                                    {" · "}
                                                    <span className="font-semibold">
                                                        {obtenerLabelEstadoTicket(
                                                            recordatorio.ticket.status
                                                        )}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    )}

                                    <div className="mt-3 flex justify-end gap-1">
                                        {obtenerRutaRecordatorio(
                                            recordatorio
                                        ) && (
                                                <Tooltip title="Abrir registro">
                                                    <Button
                                                        size="small"
                                                        icon={
                                                            <EyeOutlined />
                                                        }
                                                        onClick={() =>
                                                            void abrirOrigen(
                                                                recordatorio
                                                            )
                                                        }
                                                    />
                                                </Tooltip>
                                            )}

                                        <Tooltip title="Completar">
                                            <Button
                                                size="small"
                                                type="primary"
                                                icon={
                                                    <CheckOutlined />
                                                }
                                                onClick={() =>
                                                    void completarRecordatorio(
                                                        recordatorio
                                                    )
                                                }
                                            />
                                        </Tooltip>

                                        <Popconfirm
                                            title="Cancelar recordatorio"
                                            description="¿Quieres cancelar este recordatorio?"
                                            okText="Sí"
                                            cancelText="No"
                                            onConfirm={() =>
                                                void cancelarRecordatorio(
                                                    recordatorio
                                                )
                                            }
                                        >
                                            <Tooltip title="Cancelar">
                                                <Button
                                                    size="small"
                                                    danger
                                                    icon={
                                                        <CloseOutlined />
                                                    }
                                                />
                                            </Tooltip>
                                        </Popconfirm>
                                    </div>
                                </article>
                            );
                        }
                    )}
                </div>
            )}
        </div>
    );

    return (
        <Popover
            trigger="click"
            placement="bottomRight"
            open={open}
            onOpenChange={(visible) => {
                setOpen(visible);

                /*
                 * Al abrir, refrescar los datos
                 * para mostrar el estado más reciente.
                 */
                if (visible) {
                    void cargarRecordatorios();
                }
            }}
            content={contenido}
        >
            <Tooltip title="Recordatorios">
                <Badge
                    count={
                        pendientesNoLeidos
                    }
                    overflowCount={99}
                    size="small"
                >
                    <button
                        type="button"
                        aria-label="Abrir recordatorios"
                        className="
        inline-flex h-11 w-11
        items-center justify-center
        rounded-full border
        border-slate-200
        bg-white text-slate-700
        shadow-md transition
        hover:border-cyan-300
        hover:bg-cyan-50
        hover:text-cyan-700
        focus:outline-none
        focus:ring-4
        focus:ring-cyan-100
    "
                    >
                        <BellOutlined className="text-2xl" />
                    </button>
                </Badge>
            </Tooltip>
        </Popover>
    );
}