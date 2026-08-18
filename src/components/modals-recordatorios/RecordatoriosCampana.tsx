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
    message
} from "antd";

import {
    BellOutlined,
    CheckOutlined,
    CloseOutlined,
    EyeOutlined,
    ReloadOutlined,
    DeleteOutlined
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

import { socket } from "../../lib/socket";

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

function recordatorioCuentaEnBadge(
    recordatorio: Recordatorio
) {
    /*
     * El badge debe contar:
     * - recordatorios vencidos de cualquier origen;
     * - recordatorios de tickets, aunque sean próximos.
     *
     * Esto cubre:
     * - Nuevo ticket recibido.
     * - Solicitante respondió.
     * - Ticket pendiente.
     */
    return (
        recordatorioVencido(recordatorio) ||
        recordatorio.origen === "TICKET"
    );
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
   SONIDO DE ALERTA PERSONALIZADO
===================================================== */

let audioNotificacionGlobal: HTMLAudioElement | null = null;

/**
 * Inicializa el audio después de una interacción del usuario.
 * Los navegadores bloquean sonidos automáticos si no hubo interacción previa.
 */
function prepararAudioNotificaciones() {
    try {
        if (!audioNotificacionGlobal) {
            audioNotificacionGlobal = new Audio(
                "/sounds/ticket_alert2.mp3"
            );

            /*
             * Volumen del sonido.
             * 0.0 = silencio
             * 1.0 = volumen completo
             */
            audioNotificacionGlobal.volume = 0.70;

            /*
             * Precarga el archivo para que suene más rápido
             * cuando llegue el evento.
             */
            audioNotificacionGlobal.preload = "auto";
        }

        /*
         * Intento silencioso de preparación.
         * Puede fallar si el navegador aún no permite audio,
         * por eso se captura el error.
         */
        audioNotificacionGlobal.load();
    } catch (error) {
        console.warn(
            "No se pudo preparar el audio de notificaciones:",
            error
        );
    }
}

/**
 * Reproduce el sonido personalizado para:
 * - nuevo ticket;
 * - respuesta del solicitante.
 */
function reproducirSonidoRecordatorioTicket() {
    try {
        prepararAudioNotificaciones();

        if (!audioNotificacionGlobal) {
            return;
        }

        /*
         * Reinicia el sonido desde el comienzo.
         * Esto permite que suene aunque llegue otro evento
         * mientras el audio anterior aún se estaba reproduciendo.
         */
        audioNotificacionGlobal.currentTime = 0;

        void audioNotificacionGlobal.play().catch((error) => {
            console.warn(
                "El navegador bloqueó el sonido hasta que el usuario interactúe con la página:",
                error
            );
        });
    } catch (error) {
        console.warn(
            "No se pudo reproducir el sonido de recordatorio:",
            error
        );
    }
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

    /*
 * Estado independiente para mostrar carga
 * en la acción masiva de eliminación.
 */
    const [
        eliminandoTodos,
        setEliminandoTodos,
    ] = useState(false);

    const [open, setOpen] =
        useState(false);

    /*
     * Evita notificar varias veces el mismo recordatorio
     * durante una misma sesión del navegador.
     */
    const notificadosEnSesion =
        useRef<Set<number>>(new Set());

    const cargandoRecordatoriosRef =
        useRef(false);

    /* =====================================================
       CARGAR RECORDATORIOS
    ===================================================== */

    const cargarRecordatorios =
        useCallback(async () => {
            if (
                cargandoRecordatoriosRef.current
            ) {
                return;
            }

            try {
                cargandoRecordatoriosRef.current =
                    true;

                setLoading(
                    true
                );

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

                setRecordatorios(
                    lista
                );

                setPendientesNoLeidos(
                    Number(
                        response.data
                            ?.pendientesNoLeidos ??
                        0
                    )
                );

                lista.forEach(
                    (
                        recordatorio
                    ) => {
                        const debeNotificar =
                            recordatorio.estado ===
                            "PENDIENTE" &&
                            !recordatorio.leidoAt &&
                            recordatorioCuentaEnBadge(
                                recordatorio
                            ) &&
                            !notificadosEnSesion.current.has(
                                recordatorio.id
                            );

                        if (
                            debeNotificar
                        ) {
                            if (
                                recordatorio.origen ===
                                "TICKET" &&
                                !socket.connected
                            ) {
                                reproducirSonidoRecordatorioTicket();
                            }

                            mostrarNotificacionNavegador(
                                recordatorio
                            );

                            notificadosEnSesion.current.add(
                                recordatorio.id
                            );
                        }
                    }
                );
            } catch (
            error
            ) {
                console.error(
                    "Error cargando recordatorios:",
                    error
                );
            } finally {
                cargandoRecordatoriosRef.current =
                    false;

                setLoading(
                    false
                );
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
         * La campana está montada globalmente en AppLayout.
         * Como socket.ts tiene autoConnect: false, conectamos aquí
         * para que los recordatorios se actualicen aunque el usuario
         * esté en /home, /equipos, /agenda, etc.
         */
        if (!socket.connected) {
            socket.connect();
        }

        /*
         * Nuevo ticket recibido:
         * - reproduce sonido;
         * - refresca la campana.
         */
        const onTicketCreated = () => {
            reproducirSonidoRecordatorioTicket();
            void cargarRecordatorios();
        };

        /*
         * Respuesta del solicitante:
         * - reproduce sonido;
         * - refresca la campana.
         */
        const onCustomerReplied = () => {
            reproducirSonidoRecordatorioTicket();
            void cargarRecordatorios();
        };

        /*
         * Otros eventos de ticket solo refrescan la campana,
         * pero no emiten sonido para evitar alertas innecesarias.
         */
        const actualizarSinSonido = () => {
            void cargarRecordatorios();
        };

        const onTicketSlaAlert = () => {
            reproducirSonidoRecordatorioTicket();
            void cargarRecordatorios();
        };

        socket.on("ticket.created", onTicketCreated);
        socket.on("ticket.customer_replied", onCustomerReplied);
        socket.on("ticket.status_changed", actualizarSinSonido);
        socket.on("ticket.updated", actualizarSinSonido);
        socket.on("ticket.bulk_status_changed", actualizarSinSonido);

        socket.on("ticket.sla_alert", onTicketSlaAlert);

        return () => {
            /*
             * Solo quitamos los listeners de la campana.
             * No hacemos socket.disconnect(), porque otros módulos
             * también pueden estar usando el mismo socket global.
             */
            socket.off("ticket.created", onTicketCreated);
            socket.off("ticket.customer_replied", onCustomerReplied);
            socket.off("ticket.status_changed", actualizarSinSonido);
            socket.off("ticket.updated", actualizarSinSonido);
            socket.off("ticket.bulk_status_changed", actualizarSinSonido);

            socket.off("ticket.sla_alert", onTicketSlaAlert);
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
            if (recordatorioCuentaEnBadge(recordatorio)) {
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
                recordatorioCuentaEnBadge(recordatorio)
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
                recordatorioCuentaEnBadge(recordatorio)
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
   ELIMINAR TODOS LOS RECORDATORIOS
===================================================== */

    async function eliminarTodosRecordatorios() {
        try {
            setEliminandoTodos(true);

            const response =
                await api.patch<{
                    message?: string;
                    cantidad?: number;
                }>(
                    "/recordatorios/mios/cancelar-todos"
                );

            setRecordatorios([]);
            setPendientesNoLeidos(0);

            notificadosEnSesion.current.clear();

            window.dispatchEvent(
                new Event(
                    "bitacora:actualizar"
                )
            );

            message.success(
                response.data?.message ??
                "Recordatorios eliminados correctamente."
            );
        } catch (error) {
            console.error(
                "Error eliminando todos los recordatorios:",
                error
            );

            message.error(
                "No fue posible eliminar todos los recordatorios."
            );
        } finally {
            setEliminandoTodos(false);
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
                        Notification.permission !== "granted" && (
                            <Tooltip
                                title={
                                    Notification.permission === "denied"
                                        ? "Notificaciones bloqueadas en el navegador"
                                        : "Activar notificaciones del navegador"
                                }
                            >
                                <Button
                                    size="small"
                                    danger={
                                        Notification.permission ===
                                        "denied"
                                    }
                                    icon={<BellOutlined />}
                                    onClick={async () => {
                                        /*
                                         * Cuando ya está bloqueado, requestPermission()
                                         * normalmente no mostrará nuevamente el diálogo.
                                         */
                                        if (
                                            Notification.permission ===
                                            "denied"
                                        ) {
                                            window.alert(
                                                "Las notificaciones están bloqueadas. Presiona el candado junto a la URL y habilita Notificaciones."
                                            );
                                            return;
                                        }

                                        /*
 * Esta acción del usuario también habilita el audio.
 * Los navegadores suelen bloquear sonidos automáticos
 * hasta que el usuario interactúa con la página.
 */
                                        prepararAudioNotificaciones();

                                        const permiso =
                                            await Notification.requestPermission();

                                        if (
                                            permiso === "granted"
                                        ) {
                                            void cargarRecordatorios();
                                        }
                                    }}
                                />
                            </Tooltip>
                        )}

                    {recordatoriosOrdenados.length > 0 && (
                        <Popconfirm
                            title="Eliminar todos los recordatorios"
                            description={
                                <>
                                    Se eliminarán{" "}
                                    <strong>
                                        {
                                            recordatoriosOrdenados.length
                                        }
                                    </strong>{" "}
                                    recordatorio(s) pendiente(s).
                                    ¿Deseas continuar?
                                </>
                            }
                            okText="Eliminar todos"
                            cancelText="Cancelar"
                            okButtonProps={{
                                danger: true,
                                loading:
                                    eliminandoTodos,
                            }}
                            onConfirm={() =>
                                void eliminarTodosRecordatorios()
                            }
                        >
                            <Tooltip title="Eliminar todos">
                                <Button
                                    size="small"
                                    danger
                                    icon={
                                        <DeleteOutlined />
                                    }
                                    loading={
                                        eliminandoTodos
                                    }
                                    aria-label="Eliminar todos los recordatorios"
                                />
                            </Tooltip>
                        </Popconfirm>
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
                 * Al abrir la campana, habilitamos el audio.
                 * Esto ayuda a evitar el bloqueo de autoplay del navegador.
                 */
                if (visible) {
                    prepararAudioNotificaciones();
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