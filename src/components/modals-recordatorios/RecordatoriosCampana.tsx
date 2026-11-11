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
    message,
    Tabs
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

/**
 * Días al vencimiento más urgente de una suscripción
 * (negativo = vencida). null si el recordatorio no es de suscripción.
 */
function diasVencimientoSuscripcion(
    recordatorio: Recordatorio
): number | null {
    const suscripcion =
        recordatorio.suscripcion;

    if (
        recordatorio.origen !==
        "SUSCRIPCION" ||
        !suscripcion
    ) {
        return null;
    }

    /*
     * Las fechas de suscripción se guardan como
     * medianoche UTC (YYYY-MM-DD). "Hoy" en Chile.
     */
    const hoy =
        dayjs.utc(
            dayjs()
                .tz(CHILE_TZ)
                .format("YYYY-MM-DD")
        );

    const dias =
        [
            suscripcion.fechaRenovacion,
            suscripcion.fechaTermino,
        ]
            .filter(
                (
                    fecha
                ): fecha is string =>
                    Boolean(fecha)
            )
            .map(
                (fecha) =>
                    dayjs
                        .utc(
                            fecha.slice(0, 10)
                        )
                        .diff(
                            hoy,
                            "day"
                        )
            );

    return dias.length > 0
        ? Math.min(...dias)
        : null;
}

/* =====================================================
   ÓRDENES DE TALLER Y SECCIONES
===================================================== */

/** Orden de taller abierta (calculada en vivo por /recordatorios/mios). */
interface OrdenTallerPendiente {
    id: number;
    numeroOrden: string | null;
    fecha: string;
    fechaIngreso: string | null;
    tipoTrabajo: string;
    descripcion: string | null;
    estado: string | null;
    prioridad: "BAJA" | "NORMAL" | "ALTA";
    tecnicoId: number | null;
    tecnico: { nombre: string } | null;
    entidad: { nombre: string } | null;
    equipo: {
        marca: string;
        modelo: string;
        serial: string | null;
    } | null;
}

type RespuestaCampana = RecordatoriosResponse & {
    taller?: OrdenTallerPendiente[];
    suscripciones?: SuscripcionCampana[];
    visitasVencidas?: VisitaVencidaCampana[];
    ticketsActivos?: {
        tickets: TicketActivoCampana[];
        total: number;
    };
    cotizacionesBorrador?: {
        cotizaciones: CotizacionBorradorCampana[];
        total: number;
    };
};

type SeccionCampana =
    | "todos"
    | "tickets"
    | "taller"
    | "visitas"
    | "cotizaciones"
    | "suscripciones"
    | "otros";

const SECCIONES_CAMPANA: {
    key: SeccionCampana;
    label: string;
}[] = [
        { key: "todos", label: "Todos" },
        { key: "tickets", label: "Tickets" },
        { key: "taller", label: "Taller" },
        { key: "visitas", label: "Visitas" },
        { key: "cotizaciones", label: "Cotizaciones" },
        { key: "suscripciones", label: "Suscripciones" },
        { key: "otros", label: "Otros" },
    ];

/** Suscripción vencida o por vencer (calculada en vivo por /recordatorios/mios). */
interface SuscripcionCampana {
    suscripcionId: number;
    empresaId: number;
    empresaNombre: string;
    productoPlan: string;
    fabricante: string;
    avisosActivos: boolean;
    /** Fecha más urgente: negativo = vencida hace N días. */
    dias: number;
    fechas: {
        tipoFecha: "RENOVACION" | "TERMINO";
        /** YYYY-MM-DD */
        fecha: string;
        dias: number;
    }[];
}

function textoDiasSuscripcion(
    dias: number
): string {
    if (dias < 0) {
        return dias === -1
            ? "Venció ayer"
            : `Vencida hace ${-dias} días`;
    }

    if (dias === 0) {
        return "Vence hoy";
    }

    return dias === 1
        ? "Vence mañana"
        : `Vence en ${dias} días`;
}

/** Jornada con visitas que siguen PENDIENTE más de 24 h (calculada en vivo por /recordatorios/mios). */
interface VisitaVencidaCampana {
    clave: string;
    empresaId: number;
    empresaNombre: string;
    tecnicoId: number;
    tecnicoNombre: string;
    /** YYYY-MM-DD (Chile) */
    fecha: string;
    inicio: string;
    dias: number;
    visitaIds: number[];
    solicitantes: string[];
}

/** Ruta de la página de visitas. Ajusta si en tu router es distinta. */
const RUTA_VISITAS = "/visitas";

/** Desde estos días pendiente, la tarjeta se marca en rojo. */
const DIAS_VISITA_CRITICA = 3;

/** Ticket NEW, OPEN o PENDING (calculado en vivo por /recordatorios/mios). */
interface TicketActivoCampana {
    id: number;
    subject: string;
    status: string;
    priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
    createdAt: string;
    lastActivityAt: string;
    empresa: { nombre: string } | null;
    requester: { nombre: string } | null;
    assignee: { nombre: string } | null;
}

function haceCuanto(
    fecha: string
): string {
    const minutos =
        Math.max(
            0,
            dayjs().diff(
                dayjs(fecha),
                "minute"
            )
        );

    if (minutos < 60) {
        return `hace ${minutos} min`;
    }

    const horas =
        Math.floor(minutos / 60);

    if (horas < 24) {
        return `hace ${horas} h`;
    }

    const dias =
        Math.floor(horas / 24);

    return dias === 1
        ? "hace 1 día"
        : `hace ${dias} días`;
}

/** Cotización en BORRADOR de los últimos 30 días (calculada en vivo por /recordatorios/mios). */
interface CotizacionBorradorCampana {
    id: number;
    fecha: string;
    tipo: "CLIENTE" | "INTERNA" | "PROVEEDOR";
    total: number;
    moneda: "CLP" | "USD";
    personaResponsable: string | null;
    entidad: { nombre: string } | null;
    tecnico: { nombre: string } | null;
}

function formatearMonto(
    valor: number,
    moneda: string
): string {
    return new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: moneda === "USD" ? "USD" : "CLP",
        maximumFractionDigits: moneda === "USD" ? 2 : 0,
    }).format(valor);
}

/** Desde estos días en borrador, la tarjeta se marca en ámbar. */
const DIAS_COTIZACION_ANTIGUA = 20;

/** Días que una orden lleva en el taller a partir de la cual se marca en rojo. */
const DIAS_ORDEN_TALLER_ATRASADA = 7;

function seccionRecordatorio(
    recordatorio: Recordatorio
): Exclude<SeccionCampana, "todos" | "taller"> {
    if (recordatorio.origen === "TICKET") {
        return "tickets";
    }

    if (recordatorio.origen === "SUSCRIPCION") {
        return "suscripciones";
    }

    if (recordatorio.origen === "VISITA") {
        return "visitas";
    }

    if (recordatorio.origen === "COTIZACION") {
        return "cotizaciones";
    }

    return "otros";
}

function diasEnTaller(
    orden: OrdenTallerPendiente
): number {
    return Math.max(
        0,
        dayjs().diff(
            dayjs(orden.fechaIngreso ?? orden.fecha),
            "day"
        )
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

    if (recordatorio.suscripcion) {
        /*
         * Abre la ficha de la empresa en la página de empresas.
         * Ajusta "/empresas" si tu ruta es distinta.
         */
        return `/empresas?fichaEmpresaId=${recordatorio.suscripcion.empresaId}&fichaTab=suscripciones`;
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
        SUSCRIPCION: "Suscripción",
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
                "/sounds/ticket_alert4.mp3"
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

    const [taller, setTaller] =
        useState<OrdenTallerPendiente[]>([]);

    const [suscripcionesVenc, setSuscripcionesVenc] =
        useState<SuscripcionCampana[]>([]);

    const [visitasVencidas, setVisitasVencidas] =
        useState<VisitaVencidaCampana[]>([]);

    /* Jornadas vencidas ya vistas: una nueva abre la campana */
    const visitasVistasRef =
        useRef<Set<string>>(new Set());

    const [ticketsActivos, setTicketsActivos] =
        useState<TicketActivoCampana[]>([]);

    /* Total real (la lista llega con un máximo de 100) */
    const [ticketsActivosTotal, setTicketsActivosTotal] =
        useState(0);

    const [cotizacionesBorrador, setCotizacionesBorrador] =
        useState<CotizacionBorradorCampana[]>([]);

    const [cotizacionesTotal, setCotizacionesTotal] =
        useState(0);

    const [tabActiva, setTabActiva] =
        useState<SeccionCampana>("todos");

    /*
     * Apertura automática:
     * - primera carga: se abre si hay algo pendiente;
     * - después: solo si llega algo nuevo.
     */
    const primeraCargaRef =
        useRef(true);

    const tallerVistosRef =
        useRef<Set<number>>(new Set());

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
                    await api.get<RespuestaCampana>(
                        "/recordatorios/mios"
                    );

                const tallerLista =
                    Array.isArray(
                        response.data?.taller
                    )
                        ? response.data.taller
                        : [];

                setTaller(
                    tallerLista
                );

                const visitasLista =
                    Array.isArray(
                        response.data?.visitasVencidas
                    )
                        ? response.data.visitasVencidas
                        : [];

                setVisitasVencidas(
                    visitasLista
                );

                const ticketsRespuesta =
                    response.data?.ticketsActivos;

                setTicketsActivos(
                    Array.isArray(ticketsRespuesta?.tickets)
                        ? ticketsRespuesta.tickets
                        : []
                );

                setTicketsActivosTotal(
                    Number(ticketsRespuesta?.total ?? 0)
                );

                const cotizacionesRespuesta =
                    response.data?.cotizacionesBorrador;

                setCotizacionesBorrador(
                    Array.isArray(cotizacionesRespuesta?.cotizaciones)
                        ? cotizacionesRespuesta.cotizaciones
                        : []
                );

                setCotizacionesTotal(
                    Number(cotizacionesRespuesta?.total ?? 0)
                );

                setSuscripcionesVenc(
                    Array.isArray(
                        response.data?.suscripciones
                    )
                        ? response.data.suscripciones
                        : []
                );

                let hayNuevos =
                    false;

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

                            hayNuevos =
                                true;
                        }
                    }
                );

                const tallerNuevas =
                    tallerLista.filter(
                        (orden) =>
                            !tallerVistosRef.current.has(
                                orden.id
                            )
                    );

                tallerNuevas.forEach(
                    (orden) =>
                        tallerVistosRef.current.add(
                            orden.id
                        )
                );

                const visitasNuevas =
                    visitasLista.filter(
                        (jornada) =>
                            !visitasVistasRef.current.has(
                                jornada.clave
                            )
                    );

                visitasNuevas.forEach(
                    (jornada) =>
                        visitasVistasRef.current.add(
                            jornada.clave
                        )
                );

                const abrirPanel =
                    primeraCargaRef.current
                        ? lista.length > 0 ||
                        tallerLista.length > 0 ||
                        visitasLista.length > 0
                        : hayNuevos ||
                        tallerNuevas.length > 0 ||
                        visitasNuevas.length > 0;

                primeraCargaRef.current =
                    false;

                if (abrirPanel) {
                    setTabActiva(
                        "todos"
                    );

                    setOpen(
                        true
                    );
                }
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
   SECCIONES (PESTAÑAS)
===================================================== */

    /*
     * Recordatorio pendiente de cada suscripción (el que creó el job).
     * Su tarjeta se reemplaza por la tarjeta "en vivo" de la suscripción,
     * que muestra el estado actual; el recordatorio aporta el punto azul
     * y el botón Completar.
     */
    const recordatorioPorSuscripcion =
        useMemo(() => {
            const mapa =
                new Map<number, Recordatorio>();

            recordatoriosOrdenados.forEach(
                (recordatorio) => {
                    if (
                        recordatorio.origen ===
                        "SUSCRIPCION" &&
                        recordatorio.suscripcionId
                    ) {
                        mapa.set(
                            recordatorio.suscripcionId,
                            recordatorio
                        );
                    }
                }
            );

            return mapa;
        }, [recordatoriosOrdenados]);

    const idsSuscripcionesEnVivo =
        useMemo(
            () =>
                new Set(
                    suscripcionesVenc.map(
                        (item) =>
                            item.suscripcionId
                    )
                ),
            [suscripcionesVenc]
        );

    /*
  * Recordatorio pendiente de cada ticket activo (ticket nuevo, respuesta,
  * SLA…). La tarjeta en vivo del ticket lo reemplaza; el recordatorio
  * aporta el punto azul y el botón para marcarlo como revisado.
  */
    const recordatorioPorTicket =
        useMemo(() => {
            const mapa =
                new Map<number, Recordatorio>();

            recordatoriosOrdenados.forEach(
                (recordatorio) => {
                    if (
                        recordatorio.origen !==
                        "TICKET" ||
                        !recordatorio.ticketId
                    ) {
                        return;
                    }

                    const actual =
                        mapa.get(
                            recordatorio.ticketId
                        );

                    /* Si hay varios, se prefiere uno sin leer */
                    if (
                        !actual ||
                        (actual.leidoAt && !recordatorio.leidoAt)
                    ) {
                        mapa.set(
                            recordatorio.ticketId,
                            recordatorio
                        );
                    }
                }
            );

            return mapa;
        }, [recordatoriosOrdenados]);

    const idsTicketsEnVivo =
        useMemo(
            () =>
                new Set(
                    ticketsActivos.map(
                        (ticket) =>
                            ticket.id
                    )
                ),
            [ticketsActivos]
        );

    /* Recordatorios sin los de suscripciones y tickets que ya salen en vivo */
    const recordatoriosLista =
        useMemo(
            () =>
                recordatoriosOrdenados.filter(
                    (recordatorio) =>
                        !(
                            recordatorio.origen ===
                            "SUSCRIPCION" &&
                            recordatorio.suscripcionId &&
                            idsSuscripcionesEnVivo.has(
                                recordatorio.suscripcionId
                            )
                        ) &&
                        !(
                            recordatorio.origen ===
                            "TICKET" &&
                            recordatorio.ticketId &&
                            idsTicketsEnVivo.has(
                                recordatorio.ticketId
                            )
                        )
                ),
            [recordatoriosOrdenados, idsSuscripcionesEnVivo, idsTicketsEnVivo]
        );

    const conteosSeccion =
        useMemo(() => {
            const conteos: Record<SeccionCampana, number> = {
                todos:
                    recordatoriosLista.length +
                    suscripcionesVenc.length +
                    taller.length +
                    visitasVencidas.length +
                    ticketsActivosTotal,
                tickets:
                    ticketsActivosTotal,
                cotizaciones:
                    cotizacionesTotal,
                taller:
                    taller.length,
                suscripciones:
                    suscripcionesVenc.length,
                visitas:
                    visitasVencidas.length,
                otros: 0,
            };

            recordatoriosLista.forEach(
                (recordatorio) => {
                    conteos[
                        seccionRecordatorio(
                            recordatorio
                        )
                    ] += 1;
                }
            );

            return conteos;
        }, [recordatoriosLista, suscripcionesVenc, taller, visitasVencidas, ticketsActivosTotal, cotizacionesTotal]);

    const recordatoriosVisibles =
        useMemo(() => {
            if (tabActiva === "todos") {
                return recordatoriosLista;
            }

            if (tabActiva === "taller") {
                return [];
            }

            return recordatoriosLista.filter(
                (recordatorio) =>
                    seccionRecordatorio(
                        recordatorio
                    ) === tabActiva
            );
        }, [recordatoriosLista, tabActiva]);

    const suscripcionesVisibles =
        tabActiva === "todos" ||
            tabActiva === "suscripciones"
            ? suscripcionesVenc
            : [];

    const tallerVisible =
        tabActiva === "todos" ||
            tabActiva === "taller"
            ? taller
            : [];

    const visitasVisibles =
        tabActiva === "todos" ||
            tabActiva === "visitas"
            ? visitasVencidas
            : [];

    const ticketsVisibles =
        tabActiva === "todos" ||
            tabActiva === "tickets"
            ? ticketsActivos
            : [];

    const cotizacionesVisibles =
        tabActiva === "todos" ||
            tabActiva === "cotizaciones"
            ? cotizacionesBorrador
            : [];

    const totalVisible =
        recordatoriosVisibles.length +
        suscripcionesVisibles.length +
        tallerVisible.length +
        visitasVisibles.length +
        ticketsVisibles.length +
        cotizacionesVisibles.length;

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
        <div className="w-[460px] max-w-[calc(100vw-32px)]">
            {/* =====================================================
            ENCABEZADO DE LA CAMPANA
        ===================================================== */}
            <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                    <h3 className="font-semibold text-slate-900">
                        Pendientes y Recordatorios
                    </h3>

                    <p className="mt-0.5 text-xs text-slate-500">
                        Recordatorios y Pendientes a realizar, incluyendo tickets, visitas y suscripciones.
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

            <Tabs
                size="small"
                activeKey={tabActiva}
                onChange={(key) =>
                    setTabActiva(
                        key as SeccionCampana
                    )
                }
                items={SECCIONES_CAMPANA.map(
                    (seccion) => ({
                        key: seccion.key,
                        label: (
                            <span>
                                {seccion.label}
                                {conteosSeccion[seccion.key] > 0 && (
                                    <span className="ml-1 rounded-full bg-slate-100 px-1.5 text-[10px] font-semibold text-slate-600">
                                        {conteosSeccion[seccion.key]}
                                    </span>
                                )}
                            </span>
                        ),
                    })
                )}
            />

            {loading &&
                totalVisible ===
                0 ? (
                <div className="flex justify-center py-8">
                    <Spin />
                </div>
            ) : totalVisible ===
                0 ? (
                <Empty
                    image={
                        Empty.PRESENTED_IMAGE_SIMPLE
                    }
                    description={
                        tabActiva === "todos"
                            ? "Sin recordatorios pendientes"
                            : "Nada pendiente en esta sección"
                    }
                />
            ) : (
                <div className="max-h-[450px] space-y-2 overflow-y-auto pr-1">
                    {recordatoriosVisibles.map(
                        (recordatorio) => {
                            const diasSuscripcion =
                                diasVencimientoSuscripcion(
                                    recordatorio
                                );

                            const vencido =
                                diasSuscripcion !== null
                                    ? diasSuscripcion <= 0
                                    : recordatorioVencido(
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
                                            {diasSuscripcion !== null
                                                ? diasSuscripcion < 0
                                                    ? "Vencida"
                                                    : diasSuscripcion === 0
                                                        ? "Vence hoy"
                                                        : "Por vencer"
                                                : vencido
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

                    {ticketsVisibles.map(
                        (ticket) => {
                            const recordatorioAsociado =
                                recordatorioPorTicket.get(
                                    ticket.id
                                );

                            const estado =
                                ticket.status.toUpperCase();

                            return (
                                <article
                                    key={`ticket-${ticket.id}`}
                                    className={[
                                        "rounded-xl border p-3 shadow-sm",
                                        estado === "NEW"
                                            ? "border-sky-200 bg-sky-50"
                                            : estado === "PENDING"
                                                ? "border-slate-200 bg-slate-50"
                                                : "border-amber-200 bg-amber-50",
                                    ].join(" ")}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="truncate font-semibold text-slate-900">
                                                    #{ticket.id} · {ticket.subject}
                                                </p>

                                                {recordatorioAsociado &&
                                                    !recordatorioAsociado.leidoAt && (
                                                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                                                    )}
                                            </div>

                                            <p className="mt-1 truncate text-xs font-medium text-slate-600">
                                                {ticket.empresa?.nombre ?? "Sin empresa"}
                                                {ticket.requester?.nombre && (
                                                    <> · {ticket.requester.nombre}</>
                                                )}
                                            </p>
                                        </div>

                                        <span
                                            className={[
                                                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                                estado === "NEW"
                                                    ? "bg-sky-100 text-sky-700"
                                                    : estado === "PENDING"
                                                        ? "bg-slate-200 text-slate-700"
                                                        : "bg-amber-100 text-amber-700",
                                            ].join(" ")}
                                        >
                                            {obtenerLabelEstadoTicket(
                                                ticket.status
                                            )}
                                        </span>
                                    </div>

                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                            Ticket
                                        </span>

                                        {(ticket.priority === "URGENT" ||
                                            ticket.priority === "HIGH") && (
                                                <span
                                                    className={[
                                                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                                        ticket.priority === "URGENT"
                                                            ? "bg-red-100 text-red-700"
                                                            : "bg-orange-100 text-orange-700",
                                                    ].join(" ")}
                                                >
                                                    {ticket.priority === "URGENT"
                                                        ? "Urgente"
                                                        : "Prioridad alta"}
                                                </span>
                                            )}

                                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                            {ticket.assignee?.nombre ??
                                                "Sin asignar"}
                                        </span>
                                    </div>

                                    <p className="mt-2 text-[11px] text-slate-500">
                                        Creado {haceCuanto(ticket.createdAt)}
                                        {" · "}
                                        última actividad {haceCuanto(ticket.lastActivityAt)}
                                    </p>

                                    <div className="mt-3 flex justify-end gap-1">
                                        <Tooltip title="Abrir ticket">
                                            <Button
                                                size="small"
                                                icon={
                                                    <EyeOutlined />
                                                }
                                                onClick={() => {
                                                    if (recordatorioAsociado) {
                                                        void abrirOrigen(
                                                            recordatorioAsociado
                                                        );
                                                        return;
                                                    }

                                                    setOpen(false);
                                                    navigate(
                                                        `/helpdesk/tickets/${ticket.id}`
                                                    );
                                                }}
                                            />
                                        </Tooltip>

                                        {recordatorioAsociado && (
                                            <Tooltip title="Marcar aviso como revisado">
                                                <Button
                                                    size="small"
                                                    type="primary"
                                                    icon={
                                                        <CheckOutlined />
                                                    }
                                                    onClick={() =>
                                                        void completarRecordatorio(
                                                            recordatorioAsociado
                                                        )
                                                    }
                                                />
                                            </Tooltip>
                                        )}
                                    </div>
                                </article>
                            );
                        }
                    )}

                    {tabActiva === "tickets" &&
                        ticketsActivosTotal > ticketsActivos.length && (
                            <p className="py-1 text-center text-xs text-slate-500">
                                Mostrando {ticketsActivos.length} de {ticketsActivosTotal} tickets activos.
                                Revisa el resto en Helpdesk.
                            </p>
                        )}

                    {cotizacionesVisibles.map(
                        (cotizacion) => {
                            const dias =
                                Math.max(
                                    0,
                                    dayjs().diff(
                                        dayjs(cotizacion.fecha),
                                        "day"
                                    )
                                );

                            const antigua =
                                dias >=
                                DIAS_COTIZACION_ANTIGUA;

                            return (
                                <article
                                    key={`cotizacion-${cotizacion.id}`}
                                    className={[
                                        "rounded-xl border p-3 shadow-sm",
                                        antigua
                                            ? "border-amber-200 bg-amber-50"
                                            : "border-violet-200 bg-violet-50",
                                    ].join(" ")}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-slate-900">
                                                #{cotizacion.id}
                                                {" · "}
                                                {cotizacion.entidad?.nombre ??
                                                    "Sin cliente"}
                                            </p>

                                            <p className="mt-1 text-xs font-medium text-slate-600">
                                                {formatearMonto(
                                                    cotizacion.total,
                                                    cotizacion.moneda
                                                )}
                                                {" · "}
                                                {cotizacion.tecnico?.nombre ??
                                                    cotizacion.personaResponsable ??
                                                    "Sin responsable"}
                                            </p>
                                        </div>

                                        <span
                                            className={[
                                                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                                antigua
                                                    ? "bg-amber-100 text-amber-700"
                                                    : "bg-violet-100 text-violet-700",
                                            ].join(" ")}
                                        >
                                            {dias === 0
                                                ? "Borrador de hoy"
                                                : dias === 1
                                                    ? "Borrador hace 1 día"
                                                    : `Borrador hace ${dias} días`}
                                        </span>
                                    </div>

                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                            Cotización
                                        </span>

                                        {cotizacion.tipo !== "CLIENTE" && (
                                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                                {cotizacion.tipo === "INTERNA"
                                                    ? "Interna"
                                                    : "Proveedor"}
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-3 flex justify-end gap-1">
                                        <Tooltip title="Abrir cotización">
                                            <Button
                                                size="small"
                                                icon={
                                                    <EyeOutlined />
                                                }
                                                onClick={() => {
                                                    setOpen(false);
                                                    navigate(
                                                        `/Cotizaciones?cotizacionId=${cotizacion.id}`
                                                    );
                                                }}
                                            />
                                        </Tooltip>
                                    </div>
                                </article>
                            );
                        }
                    )}

                    {tabActiva === "cotizaciones" &&
                        cotizacionesTotal > cotizacionesBorrador.length && (
                            <p className="py-1 text-center text-xs text-slate-500">
                                Mostrando {cotizacionesBorrador.length} de {cotizacionesTotal} cotizaciones en borrador.
                            </p>
                        )}

                    {visitasVisibles.map(
                        (jornada) => {
                            const critica =
                                jornada.dias >=
                                DIAS_VISITA_CRITICA;

                            const masSolicitantes =
                                jornada.solicitantes.length - 3;

                            return (
                                <article
                                    key={`visita-${jornada.clave}`}
                                    className={[
                                        "rounded-xl border p-3 shadow-sm",
                                        critica
                                            ? "border-red-200 bg-red-50"
                                            : "border-amber-200 bg-amber-50",
                                    ].join(" ")}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-slate-900">
                                                {jornada.empresaNombre}
                                            </p>

                                            <p className="mt-1 text-xs font-medium capitalize text-slate-600">
                                                {dayjs(jornada.fecha).format("dddd DD/MM/YYYY")}
                                                {" · "}
                                                {jornada.tecnicoNombre}
                                            </p>
                                        </div>

                                        <span
                                            className={[
                                                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                                critica
                                                    ? "bg-red-100 text-red-700"
                                                    : "bg-amber-100 text-amber-700",
                                            ].join(" ")}
                                        >
                                            {jornada.dias === 1
                                                ? "Pendiente hace 1 día"
                                                : `Pendiente hace ${jornada.dias} días`}
                                        </span>
                                    </div>

                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                            Visita
                                        </span>

                                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                            {jornada.visitaIds.length === 1
                                                ? "1 atención sin cerrar"
                                                : `${jornada.visitaIds.length} atenciones sin cerrar`}
                                        </span>
                                    </div>

                                    {jornada.solicitantes.length > 0 && (
                                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">
                                            {jornada.solicitantes.slice(0, 3).join(", ")}
                                            {masSolicitantes > 0 && ` y ${masSolicitantes} más`}
                                        </p>
                                    )}

                                    <div className="mt-3 flex justify-end gap-1">
                                        <Tooltip title="Ir a visitas">
                                            <Button
                                                size="small"
                                                icon={
                                                    <EyeOutlined />
                                                }
                                                onClick={() => {
                                                    setOpen(false);
                                                    navigate(RUTA_VISITAS);
                                                }}
                                            />
                                        </Tooltip>
                                    </div>
                                </article>
                            );
                        }
                    )}

                    {suscripcionesVisibles.map(
                        (item) => {
                            const recordatorioAsociado =
                                recordatorioPorSuscripcion.get(
                                    item.suscripcionId
                                );

                            const tono =
                                item.dias <= 0
                                    ? "rojo"
                                    : item.dias <= 7
                                        ? "ambar"
                                        : "azul";

                            return (
                                <article
                                    key={`suscripcion-${item.suscripcionId}`}
                                    className={[
                                        "rounded-xl border p-3 shadow-sm",
                                        tono === "rojo"
                                            ? "border-red-200 bg-red-50"
                                            : tono === "ambar"
                                                ? "border-amber-200 bg-amber-50"
                                                : "border-sky-200 bg-sky-50",
                                    ].join(" ")}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="truncate font-semibold text-slate-900">
                                                    {item.productoPlan}
                                                </p>

                                                {recordatorioAsociado &&
                                                    !recordatorioAsociado.leidoAt && (
                                                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                                                    )}
                                            </div>

                                            <p className="mt-1 truncate text-xs font-medium text-slate-600">
                                                {item.empresaNombre}
                                                {item.fabricante && (
                                                    <> · {item.fabricante}</>
                                                )}
                                            </p>
                                        </div>

                                        <span
                                            className={[
                                                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                                tono === "rojo"
                                                    ? "bg-red-100 text-red-700"
                                                    : tono === "ambar"
                                                        ? "bg-amber-100 text-amber-700"
                                                        : "bg-sky-100 text-sky-700",
                                            ].join(" ")}
                                        >
                                            {textoDiasSuscripcion(
                                                item.dias
                                            )}
                                        </span>
                                    </div>

                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                            Suscripción
                                        </span>

                                        {!item.avisosActivos && (
                                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                                                Sin aviso por correo
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600">
                                        {item.fechas.map(
                                            (fecha, indice) => (
                                                <span key={fecha.tipoFecha}>
                                                    {indice > 0 && " · "}
                                                    <span className="font-semibold">
                                                        {fecha.tipoFecha === "RENOVACION"
                                                            ? "Renovación"
                                                            : "Término"}
                                                    </span>{" "}
                                                    {dayjs
                                                        .utc(fecha.fecha)
                                                        .format("DD-MM-YYYY")}
                                                </span>
                                            )
                                        )}
                                    </div>

                                    <div className="mt-3 flex justify-end gap-1">
                                        <Tooltip title="Abrir suscripciones de la empresa">
                                            <Button
                                                size="small"
                                                icon={
                                                    <EyeOutlined />
                                                }
                                                onClick={() => {
                                                    if (recordatorioAsociado) {
                                                        void abrirOrigen(
                                                            recordatorioAsociado
                                                        );
                                                        return;
                                                    }

                                                    setOpen(false);
                                                    navigate(
                                                        `/empresas?fichaEmpresaId=${item.empresaId}&fichaTab=suscripciones`
                                                    );
                                                }}
                                            />
                                        </Tooltip>

                                        {recordatorioAsociado && (
                                            <Tooltip title="Marcar aviso como revisado">
                                                <Button
                                                    size="small"
                                                    type="primary"
                                                    icon={
                                                        <CheckOutlined />
                                                    }
                                                    onClick={() =>
                                                        void completarRecordatorio(
                                                            recordatorioAsociado
                                                        )
                                                    }
                                                />
                                            </Tooltip>
                                        )}
                                    </div>
                                </article>
                            );
                        }
                    )}

                    {tallerVisible.map(
                        (orden) => {
                            const dias =
                                diasEnTaller(orden);

                            const atrasada =
                                dias >=
                                DIAS_ORDEN_TALLER_ATRASADA;

                            return (
                                <article
                                    key={`taller-${orden.id}`}
                                    className={[
                                        "rounded-xl border p-3 shadow-sm",
                                        atrasada
                                            ? "border-red-200 bg-red-50"
                                            : "border-sky-200 bg-sky-50",
                                    ].join(" ")}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-slate-900">
                                                #{orden.id}
                                                {orden.numeroOrden && (
                                                    <span className="font-normal text-slate-500">
                                                        {" · "}
                                                        {orden.numeroOrden}
                                                    </span>
                                                )}
                                                {orden.entidad?.nombre && (
                                                    <span className="font-normal text-slate-600">
                                                        {" · "}
                                                        {orden.entidad.nombre}
                                                    </span>
                                                )}
                                            </p>

                                            <p className="mt-1 text-xs font-medium text-slate-600">
                                                Ingresó el{" "}
                                                {formatearFechaRecordatorio(
                                                    orden.fechaIngreso ??
                                                    orden.fecha
                                                )}
                                            </p>
                                        </div>

                                        <span
                                            className={[
                                                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                                atrasada
                                                    ? "bg-red-100 text-red-700"
                                                    : "bg-sky-100 text-sky-700",
                                            ].join(" ")}
                                        >
                                            {dias === 0
                                                ? "Ingresó hoy"
                                                : dias === 1
                                                    ? "1 día en taller"
                                                    : `${dias} días en taller`}
                                        </span>
                                    </div>

                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                            Taller
                                        </span>

                                        {orden.estado && (
                                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                                {orden.estado}
                                            </span>
                                        )}

                                        {orden.prioridad === "ALTA" && (
                                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                                                Prioridad alta
                                            </span>
                                        )}
                                    </div>

                                    <div className="mt-2 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600">
                                        <span className="font-semibold">
                                            {orden.tipoTrabajo}
                                        </span>
                                        {orden.equipo && (
                                            <>
                                                {" · "}
                                                {orden.equipo.marca}{" "}
                                                {orden.equipo.modelo}
                                                {orden.equipo.serial && (
                                                    <> ({orden.equipo.serial})</>
                                                )}
                                            </>
                                        )}
                                        {" · "}
                                        {orden.tecnico?.nombre ??
                                            "Sin técnico asignado"}
                                    </div>

                                    {orden.descripcion && (
                                        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">
                                            {orden.descripcion}
                                        </p>
                                    )}
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
            <Tooltip
                title={
                    pendientesNoLeidos > 0
                        ? `${conteosSeccion.todos} pendientes · ${pendientesNoLeidos} avisos sin leer`
                        : `${conteosSeccion.todos} pendientes`
                }
            >
                <Badge
                    count={
                        conteosSeccion.todos
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