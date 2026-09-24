// src/host/BitacoraTecnico.tsx

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import type {
    FormEvent,
} from "react";

import type {
    UploadFile,
} from "antd/es/upload/interface";

import {
    EditOutlined,
    DeleteOutlined,
    FileTextOutlined,
    CalendarOutlined,
    PlusOutlined,
    EyeOutlined,
    FormOutlined,
    BellOutlined,
    UndoOutlined,
    CheckOutlined,
} from "@ant-design/icons";

import {
    DatePicker,
    Select,
    Input,
    Button,
    Tooltip,
    Popconfirm,
} from "antd";

import {
    useSearchParams,
} from "react-router-dom";

import dayjs from "dayjs";
import "dayjs/locale/es";

import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

import {
    api,
} from "../api/api";

/* =====================================================
   COMPONENTES BITÁCORA
===================================================== */

import BitacoraFormModal from "../components/modals-bitacora/BitacoraFormModal";

import BitacoraDetailModal from "../components/modals-bitacora/BitacoraDetailModal";

import BitacoraNotaRapidaModal from "../components/modals-bitacora/BitacoraNotaRapidaModal";

import BitacoraEvidenciaUploadModal from "../components/modals-bitacora/BitacoraEvidenciaUploadModal";

/* =====================================================
   API BITÁCORA
===================================================== */

import {
    actualizarBitacoraTecnico,
    actualizarEstadoRecordatorio,
    actualizarEtapaBitacora,
    completarEtapaBitacora,
    crearBitacoraTecnico,
    eliminarBitacoraTecnico,
    eliminarEvidenciaBitacora,
    obtenerBitacoraTecnicoPorId,
    obtenerBitacorasTecnico,
    obtenerEtapasBitacora,
    responderRevisionEtapa,
    solicitarRevisionEtapa,
    subirEvidenciaBitacora,
} from "../components/modals-bitacora/bitacora.api";

/* =====================================================
   CONSTANTES
===================================================== */

import {
    CHILE_TZ,
    ESTADOS,
    LABEL_BASE,
    RELACIONES_CONFIG,
    TIPOS_ACTIVIDAD,
} from "../components/modals-bitacora/bitacora.constants";

/* =====================================================
   HELPERS
===================================================== */

import {
    esNotaRapida,
    formatFechaChile,
    formatFechaHoraChile,
    formatHoraChile,
    formatRecordatorioChile,
    formatTituloBitacora,
    getAxiosErrorMessage,
    getRecordatorioBadgeClass,
    getRecordatorioLabel,
    incluyeBusqueda,
    mapRelacionOption,
    obtenerEstadoRecordatorio,
    renderRelacionResumen,
    toNumberOrNull,
    todayInputDate,
} from "../components/modals-bitacora/bitacora.helpers";

/* =====================================================
   TYPES
===================================================== */

import type {
    ActualizarBitacoraTecnicoPayload,
    BitacoraEvidencia,
    BitacoraFormState,
    BitacoraTecnico,
    CrearBitacoraTecnicoPayload,
    EmpresaOption,
    EstadoBitacoraTecnico,
    EvidenciaPendiente,
    FormErrors,
    NotaRapidaState,
    OpcionRelacion,
    RelacionKey,
    TecnicoOption,
    TipoBitacoraTecnico,
    BitacoraAprobacion,
    BitacoraEtapa,
    BitacoraEtapasFormState,
    EtapaBitacora,
} from "../components/modals-bitacora/bitacora.types";

/* =====================================================
   DAYJS
===================================================== */

dayjs.extend(
    utc
);

dayjs.extend(
    timezone
);

dayjs.locale(
    "es"
);

/* =====================================================
   TYPES LOCALES
===================================================== */

type UiMessageType =
    | "success"
    | "error"
    | "warning"
    | "info";

type VistaBitacora =
    "resumen-diario";

type ModoFormularioBitacora =
    | "CREAR"
    | "EDITAR"
    | "REVISAR";

interface UiMessage {
    type:
    UiMessageType;

    text:
    string;
}

interface UsuarioAutenticado {
    id_tecnico?:
    number | null;

    idTecnico?:
    number | null;

    tecnicoId?:
    number | null;

    nombre?:
    string | null;

    email?:
    string | null;

    rol?:
    string | null;
}

/* =====================================================
   HELPERS LOCALES
===================================================== */

function getUsuarioAutenticado():
    UsuarioAutenticado |
    null {
    try {
        const raw =
            localStorage.getItem(
                "user"
            );

        if (!raw) {
            return null;
        }

        return JSON.parse(
            raw
        ) as UsuarioAutenticado;
    } catch {
        return null;
    }
}

function normalizarEmail(
    value?: string | null
) {
    return String(
        value ?? ""
    )
        .trim()
        .toLowerCase();
}

/* =====================================================
   COMPONENTE
===================================================== */

export default function BitacoraTecnicoPage() {
    const [
        searchParams,
        setSearchParams,
    ] =
        useSearchParams();

    /* =====================================================
       USUARIO
    ===================================================== */

    const usuarioAutenticado =
        useMemo(
            () =>
                getUsuarioAutenticado(),
            []
        );

    /* =====================================================
       DATA GENERAL
    ===================================================== */

    const [
        bitacoras,
        setBitacoras,
    ] =
        useState<
            BitacoraTecnico[]
        >([]);

    const [
        tecnicos,
        setTecnicos,
    ] =
        useState<
            TecnicoOption[]
        >([]);

    const [
        empresas,
        setEmpresas,
    ] =
        useState<
            EmpresaOption[]
        >([]);

    const [
        loading,
        setLoading,
    ] =
        useState(false);

    /* =====================================================
       MENSAJES
    ===================================================== */

    const [
        uiMessage,
        setUiMessage,
    ] =
        useState<
            UiMessage | null
        >(null);

    function showMessage(
        type:
            UiMessageType,
        text:
            string
    ) {
        setUiMessage({
            type,
            text,
        });

        window.setTimeout(
            () => {
                setUiMessage(
                    null
                );
            },
            5000
        );
    }

    /* =====================================================
       VISTA
    ===================================================== */

    const [
        vistaActiva,
        setVistaActiva,
    ] =
        useState<VistaBitacora>(
            "resumen-diario"
        );

    /* =====================================================
       FILTROS
    ===================================================== */

    const [
        filtros,
        setFiltros,
    ] =
        useState({
            fecha:
                todayInputDate(),

            search:
                "",

            tecnicoId:
                "",

            empresaId:
                "",

            tipoActividad:
                "",

            estado:
                "",
        });

    /* =====================================================
       MODAL CREAR / EDITAR
    ===================================================== */

    const [
        editId,
        setEditId,
    ] =
        useState<
            number | null
        >(null);

    const [
        modalBitacoraOpen,
        setModalBitacoraOpen,
    ] =
        useState(false);

    const [
        modoFormulario,
        setModoFormulario,
    ] =
        useState<ModoFormularioBitacora>(
            "CREAR"
        );

    const [
        saving,
        setSaving,
    ] =
        useState(false);

    const [
        formErrors,
        setFormErrors,
    ] =
        useState<FormErrors>(
            {}
        );

    const [
        form,
        setForm,
    ] =
        useState<BitacoraFormState>({
            fecha:
                todayInputDate(),

            titulo:
                "",

            descripcion:
                "",

            tipoActividad:
                "SOPORTE",

            estado:
                "REGISTRADA",

            tecnicoId:
                "",

            empresaId:
                "",

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

            recordatorioAt:
                "",
        });

    /* =====================================================
       RELACIONES
    ===================================================== */

    const [
        opcionesPorRelacion,
        setOpcionesPorRelacion,
    ] =
        useState<
            Partial<
                Record<
                    RelacionKey,
                    OpcionRelacion[]
                >
            >
        >({});

    const [
        loadingPorRelacion,
        setLoadingPorRelacion,
    ] =
        useState<
            Partial<
                Record<
                    RelacionKey,
                    boolean
                >
            >
        >({});

    /* =====================================================
       DETALLE
    ===================================================== */

    const [
        modalVisualizarOpen,
        setModalVisualizarOpen,
    ] =
        useState(false);

    const [
        bitacoraSeleccionada,
        setBitacoraSeleccionada,
    ] =
        useState<
            BitacoraTecnico |
            null
        >(null);

    /* =====================================================
       NOTA RÁPIDA
    ===================================================== */

    const [
        modalNotaRapidaOpen,
        setModalNotaRapidaOpen,
    ] =
        useState(false);

    const [
        savingNotaRapida,
        setSavingNotaRapida,
    ] =
        useState(false);

    const [
        notaRapida,
        setNotaRapida,
    ] =
        useState<NotaRapidaState>({
            tecnicoId:
                "",

            titulo:
                "",

            descripcion:
                "",

            tipoActividad:
                "INTERNO",

            recordatorioAt:
                "",
        });

    /* =====================================================
       EVIDENCIAS
    ===================================================== */

    const [
        evidenciasBitacora,
        setEvidenciasBitacora,
    ] =
        useState<
            BitacoraEvidencia[]
        >([]);

    const [
        evidenciasPendientes,
        setEvidenciasPendientes,
    ] =
        useState<
            EvidenciaPendiente[]
        >([]);

    const [
        evidenciasAEliminar,
        setEvidenciasAEliminar,
    ] =
        useState<number[]>(
            []
        );

    const [
        loadingEvidencias,
        setLoadingEvidencias,
    ] =
        useState(false);

    const [
        modalEvidenciaOpen,
        setModalEvidenciaOpen,
    ] =
        useState(false);

    const [
        etapaEvidenciaSeleccionada,
        setEtapaEvidenciaSeleccionada,
    ] =
        useState<
            EtapaBitacora | null
        >(null);

    const ETAPAS_FORM_INICIAL:
        BitacoraEtapasFormState = {
        ANTES: {
            descripcion:
                "",

            requiereRevision:
                false,

            aprobadorId:
                "",

            comentarioSolicitud:
                "",
        },

        EN_PROCESO: {
            descripcion:
                "",

            requiereRevision:
                false,

            aprobadorId:
                "",

            comentarioSolicitud:
                "",
        },

        DESPUES: {
            descripcion:
                "",

            requiereRevision:
                false,

            aprobadorId:
                "",

            comentarioSolicitud:
                "",
        },
    };

    const [
        etapasBitacora,
        setEtapasBitacora,
    ] =
        useState<
            BitacoraEtapa[]
        >([]);

    const [
        etapasForm,
        setEtapasForm,
    ] =
        useState<
            BitacoraEtapasFormState
        >(
            ETAPAS_FORM_INICIAL
        );

    const [
        processingEtapaId,
        setProcessingEtapaId,
    ] =
        useState<
            number | null
        >(
            null
        );

    const [
        comentarioRespuesta,
        setComentarioRespuesta,
    ] =
        useState("");

    const [
        archivosEvidencia,
        setArchivosEvidencia,
    ] =
        useState<
            File[]
        >([]);

    const [
        archivosUpload,
        setArchivosUpload,
    ] =
        useState<
            UploadFile[]
        >([]);

    const [
        descripcionEvidencia,
        setDescripcionEvidencia,
    ] =
        useState("");

    /* =====================================================
       ESTILOS
    ===================================================== */

    const tabActivo =
        "rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition";

    const tabInactivo =
        "rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100";

    const cardBase =
        "rounded-2xl border border-slate-200 bg-white shadow-sm";

    /* =====================================================
       RESUMEN
    ===================================================== */

    const resumenPorTipo =
        useMemo(
            () => {
                return bitacoras.reduce<
                    Record<
                        string,
                        number
                    >
                >(
                    (
                        acc,
                        item
                    ) => {
                        acc[
                            item.tipoActividad
                        ] =
                            (
                                acc[
                                item
                                    .tipoActividad
                                ] ??
                                0
                            ) +
                            1;

                        return acc;
                    },
                    {}
                );
            },
            [
                bitacoras,
            ]
        );

    const resumenPorTecnico =
        useMemo(
            () => {
                return bitacoras.reduce<
                    Record<
                        string,
                        number
                    >
                >(
                    (
                        acc,
                        item
                    ) => {
                        const nombre =
                            item
                                .tecnico
                                ?.nombre ??
                            "Sin técnico";

                        acc[
                            nombre
                        ] =
                            (
                                acc[
                                nombre
                                ] ??
                                0
                            ) +
                            1;

                        return acc;
                    },
                    {}
                );
            },
            [
                bitacoras,
            ]
        );

    const tipoMasFrecuente =
        useMemo(
            () => {
                return (
                    Object.entries(
                        resumenPorTipo
                    ).sort(
                        (
                            a,
                            b
                        ) =>
                            b[1] -
                            a[1]
                    )[0]?.[0] ??
                    "-"
                );
            },
            [
                resumenPorTipo,
            ]
        );

    /* =====================================================
       TÉCNICO AUTENTICADO
    ===================================================== */

    function obtenerTecnicoAutenticadoId(
        listaTecnicos:
            TecnicoOption[] =
            tecnicos
    ): string {
        const idDirecto =
            usuarioAutenticado
                ?.id_tecnico ??
            usuarioAutenticado
                ?.idTecnico ??
            usuarioAutenticado
                ?.tecnicoId;

        if (
            typeof idDirecto ===
            "number" &&
            Number.isInteger(
                idDirecto
            ) &&
            idDirecto >
            0
        ) {
            const existe =
                listaTecnicos.some(
                    (
                        tecnico
                    ) =>
                        tecnico.id_tecnico ===
                        idDirecto
                );

            if (
                existe
            ) {
                return String(
                    idDirecto
                );
            }
        }

        const emailUsuario =
            normalizarEmail(
                usuarioAutenticado
                    ?.email
            );

        if (
            !emailUsuario
        ) {
            return "";
        }

        const encontrado =
            listaTecnicos.find(
                (
                    tecnico
                ) =>
                    normalizarEmail(
                        tecnico.email
                    ) ===
                    emailUsuario
            );

        return encontrado
            ? String(
                encontrado.id_tecnico
            )
            : "";
    }

    function getTecnicoActualId():
        number | null {
        const value =
            Number(
                obtenerTecnicoAutenticadoId()
            );

        return (
            Number.isInteger(
                value
            ) &&
            value > 0
        )
            ? value
            : null;
    }

    function esUsuarioAdmin() {
        return (
            usuarioAutenticado?.rol ===
            "ADMIN"
        );
    }

    function puedeModificarBitacoraFront(
        bitacora:
            BitacoraTecnico
    ) {
        const tecnicoActualId =
            getTecnicoActualId();

        return (
            esUsuarioAdmin() ||
            (
                tecnicoActualId !==
                null &&
                tecnicoActualId ===
                bitacora.tecnicoId
            )
        );
    }

    function tieneRevisionPendienteAsignada(
        bitacora:
            BitacoraTecnico
    ) {
        const tecnicoActualId =
            getTecnicoActualId();

        if (
            !tecnicoActualId
        ) {
            return false;
        }

        return Boolean(
            bitacora.etapas?.some(
                etapa =>
                    etapa.aprobaciones?.some(
                        aprobacion =>
                            aprobacion.estado ===
                            "PENDIENTE" &&
                            aprobacion.aprobadorId ===
                            tecnicoActualId
                    )
            )
        );
    }

    /* =====================================================
       RESET FORM
    ===================================================== */

    function resetForm() {
        setEditId(
            null
        );

        setFormErrors(
            {}
        );

        setOpcionesPorRelacion(
            {}
        );

        setLoadingPorRelacion(
            {}
        );

        setForm({
            fecha:
                todayInputDate(),

            titulo:
                "",

            descripcion:
                "",

            tipoActividad:
                "SOPORTE",

            estado:
                "REGISTRADA",

            tecnicoId:
                obtenerTecnicoAutenticadoId(),

            empresaId:
                "",

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

            recordatorioAt:
                "",
        });
    }

    function resetNotaRapida() {
        setNotaRapida({
            tecnicoId:
                obtenerTecnicoAutenticadoId(),

            titulo:
                "",

            descripcion:
                "",

            tipoActividad:
                "INTERNO",

            recordatorioAt:
                "",
        });
    }

    function resetEvidenciasFormulario() {
        /*
         * Liberar URLs blob creadas para previews locales.
         */
        evidenciasPendientes.forEach(
            (
                evidencia
            ) => {
                URL.revokeObjectURL(
                    evidencia.previewUrl
                );
            }
        );

        setEvidenciasPendientes(
            []
        );

        setEvidenciasAEliminar(
            []
        );

        setEvidenciasBitacora(
            []
        );

        setArchivosEvidencia(
            []
        );

        setArchivosUpload(
            []
        );

        setDescripcionEvidencia(
            ""
        );

        setEtapaEvidenciaSeleccionada(
            null
        );

        setModalEvidenciaOpen(
            false
        );
    }

    /* =====================================================
       VALIDACIÓN FORM
    ===================================================== */

    function validateForm() {
        const errors:
            FormErrors = {};

        if (
            !form.tecnicoId
        ) {
            errors.tecnicoId =
                "Debes seleccionar un técnico.";
        }

        if (
            !form.descripcion.trim()
        ) {
            errors.descripcion =
                "La descripción es obligatoria.";
        }

        setFormErrors(
            errors
        );

        return (
            Object.keys(
                errors
            ).length ===
            0
        );
    }

    /* =====================================================
       MODAL CREAR
    ===================================================== */

    function abrirModalCrear() {
        setUiMessage(
            null
        );

        setModoFormulario(
            "CREAR"
        );

        resetForm();

        resetEvidenciasFormulario();

        resetEtapasFormulario();

        setVistaActiva(
            "resumen-diario"
        );

        setModalBitacoraOpen(
            true
        );
    }

    function cerrarModalBitacora() {
        if (
            saving
        ) {
            return;
        }

        setModalBitacoraOpen(
            false
        );

        setUiMessage(
            null
        );

        resetForm();

        resetEvidenciasFormulario();

        resetEtapasFormulario();
    }

    /* =====================================================
       NOTA RÁPIDA
    ===================================================== */

    function abrirModalNotaRapida() {
        resetNotaRapida();

        setModalNotaRapidaOpen(
            true
        );
    }

    function cerrarModalNotaRapida() {
        if (
            savingNotaRapida
        ) {
            return;
        }

        setModalNotaRapidaOpen(
            false
        );

        resetNotaRapida();
    }

    function aplicarRecordatorioRapidoNota(
        minutos:
            number
    ) {
        const fechaProgramada =
            dayjs()
                .tz(
                    CHILE_TZ
                )
                .add(
                    minutos,
                    "minute"
                )
                .second(
                    0
                )
                .millisecond(
                    0
                );

        setNotaRapida(
            (
                prev
            ) => ({
                ...prev,

                recordatorioAt:
                    fechaProgramada.toISOString(),
            })
        );
    }

    /* =====================================================
       ETAPAS
    ===================================================== */

    async function cargarEtapasBitacora(
        bitacoraId:
            number
    ) {
        try {
            setLoadingEvidencias(
                true
            );

            const response =
                await obtenerEtapasBitacora(
                    bitacoraId
                );

            const etapas =
                response.data ??
                [];

            setEtapasBitacora(
                etapas
            );

            /*
             * Mantener una lista plana también permite
             * reutilizar componentes antiguos si fuera necesario.
             */
            setEvidenciasBitacora(
                etapas.flatMap(
                    etapa =>
                        etapa.evidencias ??
                        []
                )
            );

            const obtener =
                (
                    tipo:
                        EtapaBitacora
                ) =>
                    etapas.find(
                        etapa =>
                            etapa.etapa ===
                            tipo
                    );

            const antes =
                obtener(
                    "ANTES"
                );

            const enProceso =
                obtener(
                    "EN_PROCESO"
                );

            const despues =
                obtener(
                    "DESPUES"
                );

            setEtapasForm({
                ANTES: {
                    descripcion:
                        antes
                            ?.descripcion ??
                        "",

                    requiereRevision:
                        antes
                            ?.requiereRevision ??
                        false,

                    aprobadorId:
                        antes
                            ?.aprobaciones
                            ?.find(
                                item =>
                                    item.estado ===
                                    "PENDIENTE"
                            )
                            ?.aprobadorId
                            ?.toString() ??
                        "",

                    comentarioSolicitud:
                        antes
                            ?.aprobaciones
                            ?.find(
                                item =>
                                    item.estado ===
                                    "PENDIENTE"
                            )
                            ?.comentarioSolicitud ??
                        "",
                },

                EN_PROCESO: {
                    descripcion:
                        enProceso
                            ?.descripcion ??
                        "",

                    requiereRevision:
                        enProceso
                            ?.requiereRevision ??
                        false,

                    aprobadorId:
                        enProceso
                            ?.aprobaciones
                            ?.find(
                                item =>
                                    item.estado ===
                                    "PENDIENTE"
                            )
                            ?.aprobadorId
                            ?.toString() ??
                        "",

                    comentarioSolicitud:
                        enProceso
                            ?.aprobaciones
                            ?.find(
                                item =>
                                    item.estado ===
                                    "PENDIENTE"
                            )
                            ?.comentarioSolicitud ??
                        "",
                },

                DESPUES: {
                    descripcion:
                        despues
                            ?.descripcion ??
                        "",

                    requiereRevision:
                        despues
                            ?.requiereRevision ??
                        false,

                    aprobadorId:
                        despues
                            ?.aprobaciones
                            ?.find(
                                item =>
                                    item.estado ===
                                    "PENDIENTE"
                            )
                            ?.aprobadorId
                            ?.toString() ??
                        "",

                    comentarioSolicitud:
                        despues
                            ?.aprobaciones
                            ?.find(
                                item =>
                                    item.estado ===
                                    "PENDIENTE"
                            )
                            ?.comentarioSolicitud ??
                        "",
                },
            });
        } catch (
        error
        ) {
            console.error(
                "Error cargando etapas:",
                error
            );

            setEtapasBitacora(
                []
            );

            showMessage(
                "error",
                getAxiosErrorMessage(
                    error
                )
            );
        } finally {
            setLoadingEvidencias(
                false
            );
        }
    }

    function abrirModalEvidencia(
        etapa:
            EtapaBitacora
    ) {
        setEtapaEvidenciaSeleccionada(
            etapa
        );

        setArchivosEvidencia(
            []
        );

        setArchivosUpload(
            []
        );

        setDescripcionEvidencia(
            ""
        );

        setModalEvidenciaOpen(
            true
        );
    }

    function cerrarModalEvidencia() {
        setModalEvidenciaOpen(
            false
        );

        setEtapaEvidenciaSeleccionada(
            null
        );

        setArchivosEvidencia(
            []
        );

        setArchivosUpload(
            []
        );

        setDescripcionEvidencia(
            ""
        );
    }

    function resetEtapasFormulario() {
        setEtapasBitacora(
            []
        );

        setEtapasForm(
            ETAPAS_FORM_INICIAL
        );

        setProcessingEtapaId(
            null
        );

        setComentarioRespuesta(
            ""
        );
    }

    function handleAgregarEvidenciaPendiente() {
        if (
            modoFormulario ===
            "REVISAR"
        ) {
            showMessage(
                "warning",
                "El modo revisión no permite modificar evidencias."
            );

            return;
        }

        if (
            !etapaEvidenciaSeleccionada
        ) {
            showMessage(
                "warning",
                "No se pudo determinar la etapa de la evidencia."
            );

            return;
        }

        if (
            archivosEvidencia.length ===
            0
        ) {
            showMessage(
                "warning",
                "Debes seleccionar al menos una imagen o video."
            );

            return;
        }

        const etapa =
            etapaEvidenciaSeleccionada;

        /*
         * Evidencias ya existentes de la etapa,
         * descontando las marcadas para eliminar.
         */
        const existentesActivas =
            evidenciasBitacora.filter(
                evidencia =>
                    evidencia.etapa ===
                    etapa &&
                    !evidenciasAEliminar.includes(
                        evidencia.id
                    )
            ).length;

        /*
         * Evidencias pendientes ya agregadas
         * previamente a esta etapa.
         */
        const pendientesActuales =
            evidenciasPendientes.filter(
                evidencia =>
                    evidencia.etapa ===
                    etapa
            ).length;

        const totalFinal =
            existentesActivas +
            pendientesActuales +
            archivosEvidencia.length;

        if (
            totalFinal >
            10
        ) {
            const disponibles =
                Math.max(
                    0,
                    10 -
                    existentesActivas -
                    pendientesActuales
                );

            showMessage(
                "warning",
                `Esta etapa admite un máximo de 10 evidencias. Puedes agregar ${disponibles} más.`
            );

            return;
        }

        const nuevas:
            EvidenciaPendiente[] =
            archivosEvidencia.map(
                (
                    archivo,
                    index
                ) => ({
                    idTemporal:
                        `${Date.now()}-${index}-${Math.random()
                            .toString(36)
                            .slice(2, 10)}`,

                    etapa,

                    archivo,

                    descripcion:
                        descripcionEvidencia.trim(),

                    previewUrl:
                        URL.createObjectURL(
                            archivo
                        ),
                })
            );

        setEvidenciasPendientes(
            prev => [
                ...prev,
                ...nuevas,
            ]
        );

        setModalEvidenciaOpen(
            false
        );

        setEtapaEvidenciaSeleccionada(
            null
        );

        setArchivosEvidencia(
            []
        );

        setArchivosUpload(
            []
        );

        setDescripcionEvidencia(
            ""
        );
    }

    function handleEliminarEvidenciaPendiente(
        idTemporal:
            string
    ) {
        setEvidenciasPendientes(
            (
                prev
            ) => {
                const encontrada =
                    prev.find(
                        (
                            evidencia
                        ) =>
                            evidencia.idTemporal ===
                            idTemporal
                    );

                if (
                    encontrada
                ) {
                    URL.revokeObjectURL(
                        encontrada.previewUrl
                    );
                }

                return prev.filter(
                    (
                        evidencia
                    ) =>
                        evidencia.idTemporal !==
                        idTemporal
                );
            }
        );
    }

    function handleMarcarEliminarEvidencia(
        evidencia:
            BitacoraEvidencia
    ) {
        setEvidenciasAEliminar(
            (
                prev
            ) => {
                if (
                    prev.includes(
                        evidencia.id
                    )
                ) {
                    return prev;
                }

                return [
                    ...prev,
                    evidencia.id,
                ];
            }
        );
    }

    function handleRestaurarEvidencia(
        evidenciaId:
            number
    ) {
        setEvidenciasAEliminar(
            (
                prev
            ) =>
                prev.filter(
                    (
                        id
                    ) =>
                        id !==
                        evidenciaId
                )
        );
    }

    async function guardarCambiosEvidencias(
        bitacoraId:
            number,
        etapaFiltro?:
            EtapaBitacora
    ) {
        let errores =
            0;

        const evidenciasExistentesEtapa =
            etapaFiltro
                ? evidenciasBitacora.filter(
                    item =>
                        item.etapa ===
                        etapaFiltro
                )
                : evidenciasBitacora;

        const idsPermitidos =
            new Set(
                evidenciasExistentesEtapa.map(
                    item =>
                        item.id
                )
            );

        const eliminar =
            etapaFiltro
                ? evidenciasAEliminar.filter(
                    id =>
                        idsPermitidos.has(
                            id
                        )
                )
                : evidenciasAEliminar;

        const subir =
            etapaFiltro
                ? evidenciasPendientes.filter(
                    evidencia =>
                        evidencia.etapa ===
                        etapaFiltro
                )
                : evidenciasPendientes;

        for (
            const evidenciaId
            of eliminar
        ) {
            try {
                await eliminarEvidenciaBitacora(
                    bitacoraId,
                    evidenciaId
                );
            } catch (
            error
            ) {
                errores++;

                console.error(
                    `Error eliminando evidencia ${evidenciaId}:`,
                    error
                );
            }
        }

        for (
            const evidencia
            of subir
        ) {
            try {
                await subirEvidenciaBitacora(
                    bitacoraId,
                    evidencia.etapa,
                    evidencia.archivo,
                    evidencia.descripcion
                );
            } catch (
            error
            ) {
                errores++;

                console.error(
                    `Error subiendo evidencia ${evidencia.archivo.name}:`,
                    error
                );
            }
        }

        return {
            errores,
        };
    }

    function limpiarCambiosEvidenciaEtapa(
        etapa:
            EtapaBitacora
    ) {
        setEvidenciasPendientes(
            prev => {
                prev
                    .filter(
                        item =>
                            item.etapa ===
                            etapa
                    )
                    .forEach(
                        item =>
                            URL.revokeObjectURL(
                                item.previewUrl
                            )
                    );

                return prev.filter(
                    item =>
                        item.etapa !==
                        etapa
                );
            }
        );

        const idsEtapa =
            new Set(
                evidenciasBitacora
                    .filter(
                        item =>
                            item.etapa ===
                            etapa
                    )
                    .map(
                        item =>
                            item.id
                    )
            );

        setEvidenciasAEliminar(
            prev =>
                prev.filter(
                    id =>
                        !idsEtapa.has(
                            id
                        )
                )
        );
    }

    async function handleGuardarEtapa(
        etapa:
            BitacoraEtapa
    ) {
        if (
            !editId
        ) {
            return;
        }

        const formEtapa =
            etapasForm[
            etapa.etapa
            ];

        if (
            !formEtapa
                .descripcion
                .trim()
        ) {
            showMessage(
                "warning",
                "Debes ingresar una descripción para esta etapa."
            );

            return;
        }

        try {
            setProcessingEtapaId(
                etapa.id
            );

            await actualizarEtapaBitacora(
                editId,
                etapa.id,
                {
                    descripcion:
                        formEtapa
                            .descripcion
                            .trim(),

                    requiereRevision:
                        formEtapa
                            .requiereRevision,
                }
            );

            const resultado =
                await guardarCambiosEvidencias(
                    editId,
                    etapa.etapa
                );

            await cargarEtapasBitacora(
                editId
            );

            if (
                resultado.errores >
                0
            ) {
                showMessage(
                    "warning",
                    `La etapa fue guardada, pero ${resultado.errores} operación(es) de evidencia fallaron.`
                );

                return;
            }

            limpiarCambiosEvidenciaEtapa(
                etapa.etapa
            );

            showMessage(
                "success",
                "Etapa guardada correctamente."
            );

        } catch (
        error
        ) {
            showMessage(
                "error",
                getAxiosErrorMessage(
                    error
                )
            );
        } finally {
            setProcessingEtapaId(
                null
            );
        }
    }

    async function handleCompletarEtapa(
        etapa:
            BitacoraEtapa
    ) {
        if (
            !editId
        ) {
            return;
        }

        const formEtapa =
            etapasForm[
            etapa.etapa
            ];

        if (
            !formEtapa
                .descripcion
                .trim()
        ) {
            showMessage(
                "warning",
                "Debes ingresar una descripción antes de completar la etapa."
            );

            return;
        }

        /*
         * Una etapa aprobada ya es inmutable.
         * No debemos volver a hacer PATCH ni cambiar
         * requiereRevision antes de completarla.
         */
        const esEtapaAprobada =
            etapa.estado ===
            "APROBADA";

        /*
         * La finalización directa solo es válida
         * para EN_PROCESO sin revisión.
         */
        const esEtapaSinRevision =
            etapa.estado ===
            "EN_PROCESO" &&
            !formEtapa.requiereRevision;

        if (
            !esEtapaAprobada &&
            !esEtapaSinRevision
        ) {
            showMessage(
                "warning",
                "La etapa no se encuentra disponible para ser completada."
            );

            return;
        }

        try {
            setProcessingEtapaId(
                etapa.id
            );

            /*
             * Si está EN_PROCESO y no requiere revisión,
             * todavía permitimos guardar descripción
             * y evidencias antes de completar.
             */
            if (
                esEtapaSinRevision
            ) {
                await actualizarEtapaBitacora(
                    editId,
                    etapa.id,
                    {
                        descripcion:
                            formEtapa
                                .descripcion
                                .trim(),

                        requiereRevision:
                            false,
                    }
                );

                const resultadoEvidencias =
                    await guardarCambiosEvidencias(
                        editId,
                        etapa.etapa
                    );

                if (
                    resultadoEvidencias.errores >
                    0
                ) {
                    showMessage(
                        "error",
                        "No se completó la etapa porque algunas evidencias no pudieron guardarse."
                    );

                    await cargarEtapasBitacora(
                        editId
                    );

                    return;
                }

                limpiarCambiosEvidenciaEtapa(
                    etapa.etapa
                );
            }

            /*
             * Si está APROBADA, llegamos directamente aquí.
             * La etapa no se vuelve a modificar.
             */
            await completarEtapaBitacora(
                editId,
                etapa.id
            );

            await cargarEtapasBitacora(
                editId
            );

            await cargarBitacoras();

            showMessage(
                "success",
                "Etapa completada correctamente."
            );
        } catch (
        error
        ) {
            showMessage(
                "error",
                getAxiosErrorMessage(
                    error
                )
            );
        } finally {
            setProcessingEtapaId(
                null
            );
        }
    }

    async function handleSolicitarRevision(
        etapa:
            BitacoraEtapa
    ) {
        if (
            !editId
        ) {
            return;
        }

        const formEtapa =
            etapasForm[
            etapa.etapa
            ];

        if (
            !formEtapa
                .descripcion
                .trim()
        ) {
            showMessage(
                "warning",
                "Debes ingresar una descripción antes de solicitar revisión."
            );

            return;
        }

        const aprobadorId =
            Number(
                formEtapa.aprobadorId
            );

        if (
            !Number.isInteger(
                aprobadorId
            ) ||
            aprobadorId <= 0
        ) {
            showMessage(
                "warning",
                "Debes seleccionar un usuario revisor."
            );

            return;
        }

        try {
            setProcessingEtapaId(
                etapa.id
            );

            await actualizarEtapaBitacora(
                editId,
                etapa.id,
                {
                    descripcion:
                        formEtapa
                            .descripcion
                            .trim(),

                    requiereRevision:
                        true,
                }
            );

            const resultadoEvidencias =
                await guardarCambiosEvidencias(
                    editId,
                    etapa.etapa
                );

            if (
                resultadoEvidencias.errores >
                0
            ) {
                showMessage(
                    "error",
                    "No se solicitó la revisión porque algunas evidencias no pudieron guardarse."
                );

                await cargarEtapasBitacora(
                    editId
                );

                return;
            }

            await solicitarRevisionEtapa(
                editId,
                etapa.id,
                {
                    aprobadorId,

                    comentarioSolicitud:
                        formEtapa
                            .comentarioSolicitud
                            .trim() ||
                        undefined,
                }
            );

            limpiarCambiosEvidenciaEtapa(
                etapa.etapa
            );

            await cargarEtapasBitacora(
                editId
            );

            showMessage(
                "success",
                "Revisión solicitada correctamente."
            );
        } catch (
        error
        ) {
            showMessage(
                "error",
                getAxiosErrorMessage(
                    error
                )
            );
        } finally {
            setProcessingEtapaId(
                null
            );
        }
    }

    async function handleResponderRevision(
        etapa:
            BitacoraEtapa,
        aprobacion:
            BitacoraAprobacion,
        aprobar:
            boolean
    ) {
        if (
            !editId
        ) {
            return;
        }

        try {
            setProcessingEtapaId(
                etapa.id
            );

            await responderRevisionEtapa(
                editId,
                etapa.id,
                aprobacion.id,
                {
                    aprobar,

                    comentarioRespuesta:
                        comentarioRespuesta
                            .trim() ||
                        undefined,
                }
            );

            setComentarioRespuesta(
                ""
            );

            await cargarEtapasBitacora(
                editId
            );

            await cargarBitacoras();

            showMessage(
                "success",
                aprobar
                    ? "Revisión aprobada correctamente."
                    : "Revisión rechazada correctamente."
            );
        } catch (
        error
        ) {
            showMessage(
                "error",
                getAxiosErrorMessage(
                    error
                )
            );
        } finally {
            setProcessingEtapaId(
                null
            );
        }
    }

    /* =====================================================
       MODAL DETALLE
    ===================================================== */

    async function abrirModalVisualizar(
        bitacora:
            BitacoraTecnico
    ) {
        try {
            setBitacoraSeleccionada(
                bitacora
            );

            setModalVisualizarOpen(
                true
            );

            setLoadingEvidencias(
                true
            );

            const response =
                await obtenerBitacoraTecnicoPorId(
                    bitacora.id
                );

            setBitacoraSeleccionada(
                response.data
            );
        } catch (
        error
        ) {
            console.error(
                "Error cargando detalle de bitácora:",
                error
            );

            showMessage(
                "error",
                getAxiosErrorMessage(
                    error
                )
            );
        } finally {
            setLoadingEvidencias(
                false
            );
        }
    }

    function cerrarModalVisualizar() {
        setModalVisualizarOpen(
            false
        );

        setBitacoraSeleccionada(
            null
        );
    }

    /* =====================================================
       CARGAS GENERALES
    ===================================================== */

    async function cargarTecnicos() {
        try {
            const res =
                await api.get(
                    "/tecnicos"
                );

            const data =
                Array.isArray(
                    res.data
                )
                    ? res.data
                    : Array.isArray(
                        res.data
                            ?.data
                    )
                        ? res.data
                            .data
                        : Array.isArray(
                            res.data
                                ?.tecnicos
                        )
                            ? res.data
                                .tecnicos
                            : [];

            const cargados =
                data as
                TecnicoOption[];

            setTecnicos(
                cargados
            );

            const tecnicoId =
                obtenerTecnicoAutenticadoId(
                    cargados
                );

            if (
                tecnicoId
            ) {
                setForm(
                    (
                        prev
                    ) => ({
                        ...prev,

                        tecnicoId:
                            prev.tecnicoId ||
                            tecnicoId,
                    })
                );

                setNotaRapida(
                    (
                        prev
                    ) => ({
                        ...prev,

                        tecnicoId:
                            prev.tecnicoId ||
                            tecnicoId,
                    })
                );
            }
        } catch (
        error
        ) {
            console.error(
                "Error al cargar técnicos:",
                error
            );

            setTecnicos(
                []
            );

            showMessage(
                "error",
                "No se pudieron cargar los técnicos."
            );
        }
    }

    async function cargarEmpresas() {
        try {
            const res =
                await api.get(
                    "/empresas"
                );

            const data =
                Array.isArray(
                    res.data
                )
                    ? res.data
                    : Array.isArray(
                        res.data
                            ?.data
                    )
                        ? res.data
                            .data
                        : Array.isArray(
                            res.data
                                ?.empresas
                        )
                            ? res.data
                                .empresas
                            : [];

            setEmpresas(
                data
            );
        } catch (
        error
        ) {
            console.error(
                "Error al cargar empresas:",
                error
            );

            setEmpresas(
                []
            );

            showMessage(
                "error",
                "No se pudieron cargar las empresas."
            );
        }
    }

    async function cargarBitacoras() {
        try {
            setLoading(
                true
            );

            const response =
                await obtenerBitacorasTecnico({
                    fecha:
                        filtros.fecha ||
                        undefined,

                    search:
                        filtros.search ||
                        undefined,

                    tecnicoId:
                        filtros.tecnicoId
                            ? Number(
                                filtros.tecnicoId
                            )
                            : undefined,

                    empresaId:
                        filtros.empresaId
                            ? Number(
                                filtros.empresaId
                            )
                            : undefined,

                    tipoActividad:
                        filtros.tipoActividad
                            ? filtros.tipoActividad as TipoBitacoraTecnico
                            : undefined,

                    estado:
                        filtros.estado
                            ? filtros.estado as EstadoBitacoraTecnico
                            : undefined,
                });

            setBitacoras(
                response.data ??
                []
            );
        } catch (
        error
        ) {
            console.error(
                "Error al cargar bitácoras:",
                error
            );

            showMessage(
                "error",
                getAxiosErrorMessage(
                    error
                )
            );
        } finally {
            setLoading(
                false
            );
        }
    }

    /* =====================================================
       RELACIONES
    ===================================================== */

    async function cargarOpcionesRelacion(
        tipo:
            RelacionKey,
        empresaIdValue:
            string
    ) {
        const empresaId =
            Number(
                empresaIdValue
            );

        if (
            !Number.isInteger(
                empresaId
            ) ||
            empresaId <=
            0
        ) {
            showMessage(
                "warning",
                "Primero debes seleccionar una empresa."
            );

            return;
        }

        try {
            setLoadingPorRelacion(
                (
                    prev
                ) => ({
                    ...prev,

                    [tipo]:
                        true,
                })
            );

            const res =
                await api.get(
                    "/bitacora-tecnico/opciones-relacion",
                    {
                        params: {
                            empresaId,
                            tipo,
                        },
                    }
                );

            const data =
                Array.isArray(
                    res.data
                        ?.data
                )
                    ? res.data
                        .data
                    : [];

            const mapped =
                data
                    .map(
                        (
                            item:
                                unknown
                        ) =>
                            mapRelacionOption(
                                tipo,
                                item
                            )
                    )
                    .filter(
                        Boolean
                    ) as
                OpcionRelacion[];

            setOpcionesPorRelacion(
                (
                    prev
                ) => ({
                    ...prev,

                    [tipo]:
                        mapped,
                })
            );
        } catch (
        error
        ) {
            console.error(
                "Error al cargar opciones de relación:",
                error
            );

            showMessage(
                "error",
                getAxiosErrorMessage(
                    error
                )
            );

            setOpcionesPorRelacion(
                (
                    prev
                ) => ({
                    ...prev,

                    [tipo]:
                        [],
                })
            );
        } finally {
            setLoadingPorRelacion(
                (
                    prev
                ) => ({
                    ...prev,

                    [tipo]:
                        false,
                })
            );
        }
    }

    /* =====================================================
       CREAR / EDITAR BITÁCORA
    ===================================================== */

    async function handleSubmit(
        event:
            FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (
            modoFormulario ===
            "REVISAR"
        ) {
            showMessage(
                "warning",
                "El modo revisión no permite modificar la bitácora."
            );

            return;
        }

        if (
            !validateForm()
        ) {
            showMessage(
                "error",
                "Revisa los campos marcados antes de guardar."
            );

            return;
        }

        const tecnicoId =
            toNumberOrNull(
                form.tecnicoId
            );

        if (
            !tecnicoId
        ) {
            showMessage(
                "error",
                "Debes seleccionar un técnico."
            );

            return;
        }

        if (
            form.recordatorioAt &&
            !dayjs(
                form.recordatorioAt
            ).isAfter(
                dayjs()
            )
        ) {
            showMessage(
                "warning",
                "El recordatorio debe programarse para una fecha futura."
            );

            return;
        }

        /*
     * Validar workflow inicial ANTES
     * de crear el registro en BD.
     */
        if (
            !editId
        ) {
            const antesForm =
                etapasForm.ANTES;

            if (
                !antesForm
                    .descripcion
                    .trim()
            ) {
                showMessage(
                    "warning",
                    "Debes registrar el diagnóstico o situación inicial."
                );

                return;
            }

            if (
                antesForm
                    .requiereRevision
            ) {
                const aprobadorId =
                    Number(
                        antesForm
                            .aprobadorId
                    );

                if (
                    !Number.isInteger(
                        aprobadorId
                    ) ||
                    aprobadorId <= 0
                ) {
                    showMessage(
                        "warning",
                        "Debes seleccionar un revisor para la etapa Antes."
                    );

                    return;
                }
            }
        }

        try {
            setSaving(
                true
            );

            const payload:
                CrearBitacoraTecnicoPayload = {
                fecha:
                    form.fecha,

                descripcion:
                    form.descripcion.trim(),

                tipoActividad:
                    form.tipoActividad,

                tecnicoId,

                empresaId:
                    toNumberOrNull(
                        form.empresaId
                    ),

                solicitanteId:
                    toNumberOrNull(
                        form.solicitanteId
                    ),

                ticketId:
                    toNumberOrNull(
                        form.ticketId
                    ),

                trabajoId:
                    toNumberOrNull(
                        form.trabajoId
                    ),

                visitaId:
                    toNumberOrNull(
                        form.visitaId
                    ),

                mantencionId:
                    toNumberOrNull(
                        form.mantencionId
                    ),

                equipoId:
                    toNumberOrNull(
                        form.equipoId
                    ),

                cotizacionId:
                    toNumberOrNull(
                        form.cotizacionId
                    ),

                recordatorioAt:
                    form.recordatorioAt ||
                    null,
            };

            if (
                form.titulo.trim()
            ) {
                payload.titulo =
                    form.titulo.trim();
            }

            let bitacoraIdGuardada:
                number;

            if (
                editId
            ) {
                const updatePayload:
                    ActualizarBitacoraTecnicoPayload = {
                    ...payload,
                };

                const response =
                    await actualizarBitacoraTecnico(
                        editId,
                        updatePayload
                    );

                bitacoraIdGuardada =
                    response.data.id;
            } else {
                const response =
                    await crearBitacoraTecnico(
                        payload
                    );

                bitacoraIdGuardada =
                    response.data.id;

                const responseEtapas =
                    await obtenerEtapasBitacora(
                        bitacoraIdGuardada
                    );

                const etapaAntes =
                    responseEtapas
                        .data
                        ?.find(
                            etapa =>
                                etapa.etapa ===
                                "ANTES"
                        );

                if (
                    !etapaAntes
                ) {
                    throw new Error(
                        "No fue posible obtener la etapa inicial de la bitácora."
                    );
                }

                const antesForm =
                    etapasForm.ANTES;


                await actualizarEtapaBitacora(
                    bitacoraIdGuardada,
                    etapaAntes.id,
                    {
                        descripcion:
                            antesForm
                                .descripcion
                                .trim(),

                        requiereRevision:
                            antesForm
                                .requiereRevision,
                    }
                );

                const resultadoEvidencias =
                    await guardarCambiosEvidencias(
                        bitacoraIdGuardada,
                        "ANTES"
                    );

                if (
                    resultadoEvidencias.errores >
                    0
                ) {
                    throw new Error(
                        "La bitácora fue creada, pero una o más evidencias iniciales no pudieron guardarse."
                    );
                }

                if (
                    antesForm
                        .requiereRevision
                ) {
                    const aprobadorId =
                        Number(
                            antesForm
                                .aprobadorId
                        );

                    await solicitarRevisionEtapa(
                        bitacoraIdGuardada,
                        etapaAntes.id,
                        {
                            aprobadorId,

                            comentarioSolicitud:
                                antesForm
                                    .comentarioSolicitud
                                    .trim() ||
                                undefined,
                        }
                    );
                }
            }

            showMessage(
                "success",
                editId
                    ? "Bitácora actualizada correctamente."
                    : "Bitácora registrada correctamente."
            );

            window.dispatchEvent(
                new Event(
                    "recordatorios:actualizar"
                )
            );

            setModalBitacoraOpen(
                false
            );

            resetForm();

            resetEvidenciasFormulario();

            resetEtapasFormulario();

            await cargarBitacoras();
        } catch (
        error
        ) {
            console.error(
                "Error al guardar bitácora:",
                error
            );

            showMessage(
                "error",
                getAxiosErrorMessage(
                    error
                )
            );
        } finally {
            setSaving(
                false
            );
        }
    }

    /* =====================================================
       NOTA RÁPIDA
    ===================================================== */

    async function handleGuardarNotaRapida() {
        if (
            savingNotaRapida
        ) {
            return;
        }

        const tecnicoId =
            toNumberOrNull(
                notaRapida.tecnicoId
            );

        if (
            !tecnicoId
        ) {
            showMessage(
                "warning",
                "Debes seleccionar un técnico."
            );

            return;
        }

        if (
            !notaRapida.descripcion.trim()
        ) {
            showMessage(
                "warning",
                "Debes escribir el contenido de la nota."
            );

            return;
        }

        if (
            notaRapida.recordatorioAt &&
            !dayjs(
                notaRapida.recordatorioAt
            ).isAfter(
                dayjs()
            )
        ) {
            showMessage(
                "warning",
                "El recordatorio debe programarse para una fecha futura."
            );

            return;
        }

        try {
            setSavingNotaRapida(
                true
            );

            const payload:
                CrearBitacoraTecnicoPayload = {
                fecha:
                    todayInputDate(),

                tecnicoId,

                descripcion:
                    notaRapida.descripcion.trim(),

                tipoActividad:
                    notaRapida.tipoActividad,

                recordatorioAt:
                    notaRapida.recordatorioAt ||
                    null,
            };

            const titulo =
                notaRapida.titulo.trim();

            payload.titulo =
                titulo
                    ? `Nota rápida · ${titulo}`
                    : "Nota rápida";

            await crearBitacoraTecnico(
                payload
            );

            window.dispatchEvent(
                new Event(
                    "recordatorios:actualizar"
                )
            );

            showMessage(
                "success",
                "Nota rápida registrada correctamente."
            );

            setModalNotaRapidaOpen(
                false
            );

            resetNotaRapida();

            await cargarBitacoras();
        } catch (
        error
        ) {
            console.error(
                "Error al guardar nota rápida:",
                error
            );

            showMessage(
                "error",
                getAxiosErrorMessage(
                    error
                )
            );
        } finally {
            setSavingNotaRapida(
                false
            );
        }
    }

    /* =====================================================
       RECORDATORIOS
    ===================================================== */

    async function handleCambiarEstadoRecordatorio(
        bitacora:
            BitacoraTecnico
    ) {
        try {
            const nuevoEstado =
                !Boolean(
                    bitacora.recordatorioCompletado
                );

            const respuesta =
                await actualizarEstadoRecordatorio(
                    bitacora.id,
                    nuevoEstado
                );

            window.dispatchEvent(
                new Event(
                    "recordatorios:actualizar"
                )
            );

            if (
                bitacoraSeleccionada
                    ?.id ===
                bitacora.id
            ) {
                setBitacoraSeleccionada(
                    respuesta.data
                );
            }

            showMessage(
                "success",
                nuevoEstado
                    ? "Recordatorio marcado como completado."
                    : "Recordatorio reactivado correctamente."
            );

            await cargarBitacoras();
        } catch (
        error
        ) {
            console.error(
                "Error actualizando recordatorio:",
                error
            );

            showMessage(
                "error",
                getAxiosErrorMessage(
                    error
                )
            );
        }
    }

    /* =====================================================
       EDITAR
    ===================================================== */

    function cargarFormularioEditar(
        bitacora:
            BitacoraTecnico
    ) {
        setEditId(
            bitacora.id
        );

        setForm({
            fecha:
                bitacora.fecha.slice(
                    0,
                    10
                ),

            titulo:
                bitacora.titulo ??
                "",

            descripcion:
                bitacora.descripcion,

            tipoActividad:
                bitacora.tipoActividad,

            estado:
                bitacora.estado,

            tecnicoId:
                String(
                    bitacora.tecnicoId
                ),

            empresaId:
                bitacora.empresaId
                    ? String(
                        bitacora.empresaId
                    )
                    : "",

            solicitanteId:
                bitacora.solicitanteId
                    ? String(
                        bitacora.solicitanteId
                    )
                    : "",

            ticketId:
                bitacora.ticketId
                    ? String(
                        bitacora.ticketId
                    )
                    : "",

            trabajoId:
                bitacora.trabajoId
                    ? String(
                        bitacora.trabajoId
                    )
                    : "",

            visitaId:
                bitacora.visitaId
                    ? String(
                        bitacora.visitaId
                    )
                    : "",

            mantencionId:
                bitacora.mantencionId
                    ? String(
                        bitacora.mantencionId
                    )
                    : "",

            equipoId:
                bitacora.equipoId
                    ? String(
                        bitacora.equipoId
                    )
                    : "",

            cotizacionId:
                bitacora.cotizacionId
                    ? String(
                        bitacora.cotizacionId
                    )
                    : "",

            recordatorioAt:
                bitacora.recordatorioAt ??
                "",
        });

        setFormErrors(
            {}
        );

        setOpcionesPorRelacion(
            {}
        );

        setLoadingPorRelacion(
            {}
        );

        if (
            bitacora.empresaId
        ) {
            const empresaId =
                String(
                    bitacora.empresaId
                );

            const relacionesConValor =
                RELACIONES_CONFIG.filter(
                    (
                        config
                    ) => {
                        const valor =
                            bitacora[
                            config.formKey as keyof BitacoraTecnico
                            ];

                        return Boolean(
                            valor
                        );
                    }
                );

            relacionesConValor.forEach(
                (
                    config
                ) => {
                    void cargarOpcionesRelacion(
                        config.tipo,
                        empresaId
                    );
                }
            );
        }
    }

    function abrirModalEditar(
        bitacora:
            BitacoraTecnico
    ) {
        if (
            !puedeModificarBitacoraFront(
                bitacora
            )
        ) {
            showMessage(
                "warning",
                "No tienes permisos para modificar esta bitácora."
            );

            return;
        }

        setUiMessage(
            null
        );

        setModoFormulario(
            "EDITAR"
        );

        resetEvidenciasFormulario();

        resetEtapasFormulario();

        cargarFormularioEditar(
            bitacora
        );

        setModalBitacoraOpen(
            true
        );

        void cargarEtapasBitacora(
            bitacora.id
        );
    }

    function abrirModalRevisar(
        bitacora:
            BitacoraTecnico
    ) {
        if (
            !tieneRevisionPendienteAsignada(
                bitacora
            )
        ) {
            showMessage(
                "warning",
                "No tienes una revisión pendiente asignada en esta bitácora."
            );

            return;
        }

        setUiMessage(
            null
        );

        setModoFormulario(
            "REVISAR"
        );

        resetEvidenciasFormulario();

        resetEtapasFormulario();

        cargarFormularioEditar(
            bitacora
        );

        setModalBitacoraOpen(
            true
        );

        void cargarEtapasBitacora(
            bitacora.id
        );
    }

    function editarDesdeDetalle(
        bitacora:
            BitacoraTecnico
    ) {
        cerrarModalVisualizar();

        abrirModalEditar(
            bitacora
        );
    }

    /* =====================================================
       DELETE
    ===================================================== */

    async function handleDelete(
        id:
            number
    ) {
        try {
            await eliminarBitacoraTecnico(
                id
            );

            showMessage(
                "success",
                "Bitácora eliminada correctamente."
            );

            await cargarBitacoras();
        } catch (
        error
        ) {
            console.error(
                "Error al eliminar bitácora:",
                error
            );

            showMessage(
                "error",
                getAxiosErrorMessage(
                    error
                )
            );
        }
    }

    /* =====================================================
       EFFECTS
    ===================================================== */

    useEffect(
        () => {
            void cargarTecnicos();
            void cargarEmpresas();
            void cargarBitacoras();

            // eslint-disable-next-line react-hooks/exhaustive-deps
        },
        []
    );

    useEffect(
        () => {
            void cargarBitacoras();

            // eslint-disable-next-line react-hooks/exhaustive-deps
        },
        [
            filtros.fecha,
            filtros.search,
            filtros.tecnicoId,
            filtros.empresaId,
            filtros.tipoActividad,
            filtros.estado,
        ]
    );

    useEffect(
        () => {
            function actualizarDesdeCampana() {
                void cargarBitacoras();
            }

            window.addEventListener(
                "bitacora:actualizar",
                actualizarDesdeCampana
            );

            return () => {
                window.removeEventListener(
                    "bitacora:actualizar",
                    actualizarDesdeCampana
                );
            };
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        []
    );

    /* =====================================================
       ABRIR DESDE RECORDATORIO
    ===================================================== */

    useEffect(
        () => {
            const registroId =
                Number(
                    searchParams.get(
                        "registro"
                    )
                );

            if (
                !Number.isInteger(
                    registroId
                ) ||
                registroId <=
                0
            ) {
                return;
            }

            let cancelado =
                false;

            async function abrirRegistroDesdeRecordatorio() {
                try {
                    const encontrada =
                        bitacoras.find(
                            (
                                item
                            ) =>
                                item.id ===
                                registroId
                        );

                    if (
                        encontrada
                    ) {
                        await abrirModalVisualizar(
                            encontrada
                        );

                        return;
                    }

                    const response =
                        await obtenerBitacoraTecnicoPorId(
                            registroId
                        );

                    if (
                        !cancelado &&
                        response.data
                    ) {
                        setBitacoraSeleccionada(
                            response.data
                        );

                        setModalVisualizarOpen(
                            true
                        );
                    }
                } catch (
                error
                ) {
                    console.error(
                        "Error abriendo bitácora desde recordatorio:",
                        error
                    );

                    showMessage(
                        "error",
                        getAxiosErrorMessage(
                            error
                        )
                    );
                } finally {
                    if (
                        !cancelado
                    ) {
                        setSearchParams(
                            {},
                            {
                                replace:
                                    true,
                            }
                        );
                    }
                }
            }

            void abrirRegistroDesdeRecordatorio();

            return () => {
                cancelado =
                    true;
            };
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [
            bitacoras,
            searchParams,
            setSearchParams,
        ]
    );

    /* =====================================================
       JSX
    ===================================================== */

    return (
        <div className="min-h-screen bg-slate-50 px-3 py-4 sm:px-5 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-6">
                {/* =====================================================
                    HEADER
                ===================================================== */}

                <header className="overflow-hidden rounded-3xl border border-cyan-200 bg-cyan-50/60 shadow-sm">
                    <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                <span className="rounded-full border border-cyan-300 bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-800">
                                    Registro técnico
                                </span>

                                <span className="rounded-full border border-indigo-200 bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                                    Bitácora diaria
                                </span>
                            </div>

                            <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                                Bitácora técnica
                            </h1>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                                Registro diario
                                de actividades
                                realizadas por
                                los técnicos,
                                con relación
                                opcional a
                                empresas,
                                tickets,
                                equipos,
                                cotizaciones,
                                visitas y
                                trabajos.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap lg:justify-end">
                            <div className="rounded-2xl border border-cyan-200 bg-white px-4 py-3 shadow-sm">
                                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-cyan-700">
                                    <FileTextOutlined />

                                    Registros
                                </div>

                                <div className="mt-1 text-lg font-black text-slate-950">
                                    {
                                        bitacoras.length
                                    }
                                </div>
                            </div>

                            <div className="rounded-2xl border border-cyan-200 bg-white px-4 py-3 shadow-sm">
                                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-cyan-700">
                                    <CalendarOutlined />

                                    Periodo
                                </div>

                                <div className="mt-1 text-sm font-black text-slate-950">
                                    {filtros.fecha
                                        ? dayjs
                                            .tz(
                                                filtros.fecha,
                                                CHILE_TZ
                                            )
                                            .format(
                                                "DD MMM YYYY"
                                            )
                                        : "Todos"}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-cyan-200 bg-white/80 px-4 py-3 sm:px-6">
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={
                                    abrirModalCrear
                                }
                                className={
                                    tabInactivo
                                }
                            >
                                <PlusOutlined className="mr-1" />

                                Bitácora avanzada
                            </button>

                            <button
                                type="button"
                                onClick={
                                    abrirModalNotaRapida
                                }
                                className="rounded-xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                            >
                                <FormOutlined className="mr-1" />

                                Nota rápida
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    setVistaActiva(
                                        "resumen-diario"
                                    )
                                }
                                className={
                                    vistaActiva ===
                                        "resumen-diario"
                                        ? tabActivo
                                        : tabInactivo
                                }
                            >
                                Listado diario
                            </button>
                        </div>
                    </div>
                </header>

                {/* =====================================================
                    MENSAJE
                ===================================================== */}

                {uiMessage &&
                    !modalBitacoraOpen && (
                        <div
                            className={[
                                "rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm",

                                uiMessage.type ===
                                    "success"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                    : uiMessage.type ===
                                        "error"
                                        ? "border-red-200 bg-red-50 text-red-800"
                                        : uiMessage.type ===
                                            "warning"
                                            ? "border-amber-200 bg-amber-50 text-amber-800"
                                            : "border-blue-200 bg-blue-50 text-blue-800",
                            ].join(
                                " "
                            )}
                        >
                            {uiMessage.text}
                        </div>
                    )}

                {/* =====================================================
                    MODALES EXTERNOS
                ===================================================== */}

                <BitacoraFormModal
                    open={
                        modalBitacoraOpen
                    }

                    editId={
                        editId
                    }

                    modo={
                        modoFormulario
                    }

                    esAdmin={
                        esUsuarioAdmin()
                    }

                    puedeEditar={
                        modoFormulario !==
                        "REVISAR"
                    }

                    saving={
                        saving
                    }

                    uiMessage={
                        uiMessage
                    }

                    form={
                        form
                    }

                    setForm={
                        setForm
                    }

                    tecnicos={
                        tecnicos
                    }

                    empresas={
                        empresas
                    }

                    formErrors={
                        formErrors
                    }

                    setFormErrors={
                        setFormErrors
                    }

                    opcionesPorRelacion={
                        opcionesPorRelacion
                    }

                    setOpcionesPorRelacion={
                        setOpcionesPorRelacion
                    }

                    loadingPorRelacion={
                        loadingPorRelacion
                    }

                    setLoadingPorRelacion={
                        setLoadingPorRelacion
                    }

                    onLoadRelacion={
                        cargarOpcionesRelacion
                    }

                    onSubmit={
                        handleSubmit
                    }

                    onCancel={
                        cerrarModalBitacora
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

                    onAgregarEvidencia={
                        abrirModalEvidencia
                    }

                    onMarcarEliminarEvidencia={
                        handleMarcarEliminarEvidencia
                    }

                    onRestaurarEvidencia={
                        handleRestaurarEvidencia
                    }

                    onEliminarEvidenciaPendiente={
                        handleEliminarEvidenciaPendiente
                    }

                    etapas={
                        etapasBitacora
                    }

                    etapasForm={
                        etapasForm
                    }

                    setEtapasForm={
                        setEtapasForm
                    }

                    usuarioActualTecnicoId={
                        Number(
                            obtenerTecnicoAutenticadoId()
                        ) ||
                        null
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

                    onGuardarEtapa={
                        handleGuardarEtapa
                    }

                    onCompletarEtapa={
                        handleCompletarEtapa
                    }

                    onSolicitarRevision={
                        handleSolicitarRevision
                    }

                    onResponderRevision={
                        handleResponderRevision
                    }
                />

                <BitacoraDetailModal
                    open={
                        modalVisualizarOpen
                    }

                    bitacora={
                        bitacoraSeleccionada
                    }

                    puedeEditar={
                        bitacoraSeleccionada
                            ? puedeModificarBitacoraFront(
                                bitacoraSeleccionada
                            )
                            : false
                    }

                    puedeRevisar={
                        bitacoraSeleccionada
                            ? tieneRevisionPendienteAsignada(
                                bitacoraSeleccionada
                            )
                            : false
                    }

                    puedeModificarRecordatorio={
                        bitacoraSeleccionada
                            ? puedeModificarBitacoraFront(
                                bitacoraSeleccionada
                            )
                            : false
                    }

                    onClose={
                        cerrarModalVisualizar
                    }

                    onEdit={
                        editarDesdeDetalle
                    }

                    onReview={(
                        bitacora
                    ) => {
                        cerrarModalVisualizar();

                        abrirModalRevisar(
                            bitacora
                        );
                    }}

                    onToggleRecordatorio={(
                        bitacora
                    ) =>
                        void handleCambiarEstadoRecordatorio(
                            bitacora
                        )
                    }
                />

                <BitacoraNotaRapidaModal
                    open={
                        modalNotaRapidaOpen
                    }
                    saving={
                        savingNotaRapida
                    }
                    nota={
                        notaRapida
                    }
                    setNota={
                        setNotaRapida
                    }
                    tecnicos={
                        tecnicos
                    }
                    onAplicarRecordatorio={
                        aplicarRecordatorioRapidoNota
                    }
                    onSave={() =>
                        void handleGuardarNotaRapida()
                    }
                    onClose={
                        cerrarModalNotaRapida
                    }
                />

                <BitacoraEvidenciaUploadModal
                    open={
                        modalEvidenciaOpen
                    }

                    etapa={
                        etapaEvidenciaSeleccionada
                    }

                    saving={
                        false
                    }

                    archivos={
                        archivosEvidencia
                    }

                    fileList={
                        archivosUpload
                    }

                    descripcion={
                        descripcionEvidencia
                    }

                    onArchivosChange={
                        setArchivosEvidencia
                    }

                    onFileListChange={
                        setArchivosUpload
                    }

                    onDescripcionChange={
                        setDescripcionEvidencia
                    }

                    onSave={
                        handleAgregarEvidenciaPendiente
                    }

                    onClose={
                        cerrarModalEvidencia
                    }

                    onMessage={
                        showMessage
                    }
                />

                {/* =====================================================
                    LISTADO DIARIO
                ===================================================== */}

                {vistaActiva ===
                    "resumen-diario" && (
                        <section
                            className={`${cardBase} p-4 sm:p-6`}
                        >
                            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        Listado
                                        diario
                                    </h2>

                                    <p className="text-sm text-slate-500">
                                        Filtra por
                                        fecha,
                                        técnico,
                                        tipo de
                                        actividad o
                                        texto.
                                    </p>
                                </div>

                                <Button
                                    onClick={() =>
                                        void cargarBitacoras()
                                    }
                                    loading={
                                        loading
                                    }
                                >
                                    Actualizar
                                </Button>
                            </div>

                            {/* =====================================================
                            KPI
                        ===================================================== */}

                            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Total
                                        actividades
                                    </p>

                                    <p className="mt-2 text-2xl font-black text-slate-900">
                                        {
                                            bitacoras.length
                                        }
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Técnicos con
                                        actividad
                                    </p>

                                    <p className="mt-2 text-2xl font-black text-slate-900">
                                        {
                                            Object.keys(
                                                resumenPorTecnico
                                            ).length
                                        }
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Tipo más
                                        frecuente
                                    </p>

                                    <p className="mt-2 text-lg font-black text-slate-900">
                                        {
                                            tipoMasFrecuente
                                        }
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                        Fecha
                                        consultada
                                    </p>

                                    <p className="mt-2 text-lg font-black text-slate-900">
                                        {filtros.fecha
                                            ? dayjs
                                                .tz(
                                                    filtros.fecha,
                                                    CHILE_TZ
                                                )
                                                .format(
                                                    "DD/MM/YYYY"
                                                )
                                            : "Todas"}
                                    </p>
                                </div>
                            </div>

                            {/* =====================================================
                            FILTROS
                        ===================================================== */}

                            <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
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
                                            filtros.fecha
                                                ? dayjs.tz(
                                                    filtros.fecha,
                                                    CHILE_TZ
                                                )
                                                : null
                                        }
                                        onChange={(
                                            date
                                        ) =>
                                            setFiltros(
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
                                            )
                                        }
                                        format="DD/MM/YYYY"
                                        placeholder="Filtrar por fecha"
                                        className="w-full rounded-xl"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <label
                                        className={
                                            LABEL_BASE
                                        }
                                    >
                                        Buscar
                                    </label>

                                    <Input
                                        value={
                                            filtros.search
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            setFiltros(
                                                (
                                                    prev
                                                ) => ({
                                                    ...prev,

                                                    search:
                                                        event
                                                            .target
                                                            .value,
                                                })
                                            )
                                        }
                                        allowClear
                                        placeholder="Buscar por descripción, técnico, empresa, equipo..."
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
                                            filtros.tecnicoId ||
                                            undefined
                                        }
                                        onChange={(
                                            value
                                        ) =>
                                            setFiltros(
                                                (
                                                    prev
                                                ) => ({
                                                    ...prev,

                                                    tecnicoId:
                                                        value
                                                            ? String(
                                                                value
                                                            )
                                                            : "",
                                                })
                                            )
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
                                        placeholder="Todos"
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
                                            filtros.tipoActividad ||
                                            undefined
                                        }
                                        onChange={(
                                            value
                                        ) =>
                                            setFiltros(
                                                (
                                                    prev
                                                ) => ({
                                                    ...prev,

                                                    tipoActividad:
                                                        value
                                                            ? String(
                                                                value
                                                            )
                                                            : "",
                                                })
                                            )
                                        }
                                        allowClear
                                        placeholder="Todos"
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

                                <div>
                                    <label
                                        className={
                                            LABEL_BASE
                                        }
                                    >
                                        Estado
                                    </label>

                                    <Select
                                        value={
                                            filtros.estado ||
                                            undefined
                                        }
                                        onChange={(
                                            value
                                        ) =>
                                            setFiltros(
                                                (
                                                    prev
                                                ) => ({
                                                    ...prev,

                                                    estado:
                                                        value
                                                            ? String(
                                                                value
                                                            )
                                                            : "",
                                                })
                                            )
                                        }
                                        allowClear
                                        placeholder="Todos"
                                        className="w-full"
                                        options={
                                            ESTADOS.map(
                                                (
                                                    estado
                                                ) => ({
                                                    value:
                                                        estado,

                                                    label:
                                                        estado,
                                                })
                                            )
                                        }
                                    />
                                </div>
                            </div>

                            {/* =====================================================
                            RESULTADOS
                        ===================================================== */}

                            {loading ? (
                                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                                    Cargando
                                    bitácoras...
                                </div>
                            ) : bitacoras.length ===
                                0 ? (
                                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                                    <p className="font-semibold text-slate-700">
                                        No hay
                                        bitácoras
                                        registradas
                                    </p>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Cambia los
                                        filtros o
                                        registra una
                                        nueva
                                        actividad
                                        técnica.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* =====================================================
                                    MOBILE
                                ===================================================== */}

                                    <div className="space-y-3 lg:hidden">
                                        {bitacoras.map(
                                            (
                                                bitacora
                                            ) => (
                                                <article
                                                    key={
                                                        bitacora.id
                                                    }
                                                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-xs font-semibold text-blue-600">
                                                                {
                                                                    bitacora.tipoActividad
                                                                }
                                                            </p>

                                                            <h3 className="mt-1 flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                                                                <span>
                                                                    {formatTituloBitacora(
                                                                        bitacora.titulo
                                                                    )}
                                                                </span>

                                                                {esNotaRapida(
                                                                    bitacora
                                                                ) && (
                                                                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                                                                            Rápida
                                                                        </span>
                                                                    )}

                                                                {bitacora.recordatorioAt && (
                                                                    <Tooltip
                                                                        title={`${getRecordatorioLabel(
                                                                            obtenerEstadoRecordatorio(
                                                                                bitacora
                                                                            )
                                                                        )}: ${formatRecordatorioChile(
                                                                            bitacora.recordatorioAt
                                                                        )}`}
                                                                    >
                                                                        <span
                                                                            className={[
                                                                                "inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs",

                                                                                getRecordatorioBadgeClass(
                                                                                    obtenerEstadoRecordatorio(
                                                                                        bitacora
                                                                                    )
                                                                                ),
                                                                            ].join(
                                                                                " "
                                                                            )}
                                                                        >
                                                                            <BellOutlined />
                                                                        </span>
                                                                    </Tooltip>
                                                                )}
                                                            </h3>

                                                            <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                                                                <p>
                                                                    Actividad:{" "}
                                                                    {formatFechaChile(
                                                                        bitacora.fecha
                                                                    )}
                                                                </p>

                                                                <p>
                                                                    Creada:{" "}
                                                                    {formatHoraChile(
                                                                        bitacora.createdAt
                                                                    )}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                                            {
                                                                bitacora.estado
                                                            }
                                                        </span>
                                                    </div>

                                                    <p className="mt-3 text-sm leading-6 text-slate-700">
                                                        {
                                                            bitacora.descripcion
                                                        }
                                                    </p>

                                                    <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-600">
                                                        <div>
                                                            <span className="font-semibold">
                                                                Técnico:
                                                            </span>{" "}
                                                            {
                                                                bitacora
                                                                    .tecnico
                                                                    ?.nombre ??
                                                                "-"
                                                            }
                                                        </div>

                                                        <div>
                                                            <span className="font-semibold">
                                                                Empresa:
                                                            </span>{" "}
                                                            {
                                                                bitacora
                                                                    .empresa
                                                                    ?.nombre ??
                                                                "-"
                                                            }
                                                        </div>

                                                        <div>
                                                            <span className="font-semibold">
                                                                Relación:
                                                            </span>{" "}
                                                            {renderRelacionResumen(
                                                                bitacora
                                                            )}
                                                        </div>

                                                        <div>
                                                            <span className="font-semibold">
                                                                Creación
                                                                completa:
                                                            </span>{" "}
                                                            {formatFechaHoraChile(
                                                                bitacora.createdAt
                                                            )}
                                                        </div>
                                                    </div>

                                                    {bitacora.recordatorioAt && (
                                                        <div className="mt-3 flex flex-wrap items-center gap-2">
                                                            <span
                                                                className={[
                                                                    "rounded-full border px-2.5 py-1 text-xs font-semibold",

                                                                    getRecordatorioBadgeClass(
                                                                        obtenerEstadoRecordatorio(
                                                                            bitacora
                                                                        )
                                                                    ),
                                                                ].join(
                                                                    " "
                                                                )}
                                                            >
                                                                <BellOutlined className="mr-1" />

                                                                {formatRecordatorioChile(
                                                                    bitacora.recordatorioAt
                                                                )}
                                                            </span>

                                                            {puedeModificarBitacoraFront(
                                                                bitacora
                                                            ) && (
                                                                    <Button
                                                                        size="small"
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
                                                                            void handleCambiarEstadoRecordatorio(
                                                                                bitacora
                                                                            )
                                                                        }
                                                                    >
                                                                        {bitacora.recordatorioCompletado
                                                                            ? "Reactivar"
                                                                            : "Completar"}
                                                                    </Button>
                                                                )}
                                                        </div>
                                                    )}

                                                    <div className="flex justify-end gap-1">
                                                        <Tooltip title="Visualizar">
                                                            <Button
                                                                type="text"
                                                                icon={
                                                                    <EyeOutlined />
                                                                }
                                                                onClick={() =>
                                                                    void abrirModalVisualizar(
                                                                        bitacora
                                                                    )
                                                                }
                                                            />
                                                        </Tooltip>

                                                        {puedeModificarBitacoraFront(
                                                            bitacora
                                                        ) && (
                                                                <>
                                                                    <Tooltip title="Editar">
                                                                        <Button
                                                                            type="text"
                                                                            icon={
                                                                                <EditOutlined />
                                                                            }
                                                                            onClick={() =>
                                                                                abrirModalEditar(
                                                                                    bitacora
                                                                                )
                                                                            }
                                                                        />
                                                                    </Tooltip>

                                                                    <Popconfirm
                                                                        title="Eliminar bitácora"
                                                                        description="¿Seguro que deseas eliminar esta bitácora?"
                                                                        okText="Sí"
                                                                        cancelText="No"
                                                                        onConfirm={() =>
                                                                            void handleDelete(
                                                                                bitacora.id
                                                                            )
                                                                        }
                                                                    >
                                                                        <Tooltip title="Eliminar">
                                                                            <Button
                                                                                type="text"
                                                                                danger
                                                                                icon={
                                                                                    <DeleteOutlined />
                                                                                }
                                                                            />
                                                                        </Tooltip>
                                                                    </Popconfirm>
                                                                </>
                                                            )}
                                                    </div>
                                                </article>
                                            )
                                        )}
                                    </div>

                                    {/* =====================================================
                                    DESKTOP
                                ===================================================== */}

                                    <div className="hidden overflow-hidden rounded-2xl border border-slate-200 lg:block">
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                                                <thead className="bg-slate-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">
                                                            Actividad
                                                        </th>

                                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">
                                                            Creada
                                                        </th>

                                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">
                                                            Técnico
                                                        </th>

                                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">
                                                            Tipo
                                                        </th>

                                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">
                                                            Detalle
                                                        </th>

                                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">
                                                            Empresa
                                                        </th>

                                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">
                                                            Relación
                                                        </th>

                                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">
                                                            Recordatorio
                                                        </th>

                                                        <th className="px-4 py-3 text-left font-semibold text-slate-600">
                                                            Estado
                                                        </th>

                                                        <th className="px-4 py-3 text-right font-semibold text-slate-600">
                                                            Acciones
                                                        </th>
                                                    </tr>
                                                </thead>

                                                <tbody className="divide-y divide-slate-100 bg-white">
                                                    {bitacoras.map(
                                                        (
                                                            bitacora
                                                        ) => (
                                                            <tr
                                                                key={
                                                                    bitacora.id
                                                                }
                                                                className="hover:bg-slate-50"
                                                            >
                                                                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                                                                    {formatFechaChile(
                                                                        bitacora.fecha
                                                                    )}
                                                                </td>

                                                                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                                                                    <Tooltip
                                                                        title={formatFechaHoraChile(
                                                                            bitacora.createdAt
                                                                        )}
                                                                    >
                                                                        <span>
                                                                            {formatHoraChile(
                                                                                bitacora.createdAt
                                                                            )}
                                                                        </span>
                                                                    </Tooltip>
                                                                </td>

                                                                <td className="px-4 py-3 text-slate-700">
                                                                    {
                                                                        bitacora
                                                                            .tecnico
                                                                            ?.nombre ??
                                                                        "-"
                                                                    }
                                                                </td>

                                                                <td className="px-4 py-3">
                                                                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                                                        {
                                                                            bitacora.tipoActividad
                                                                        }
                                                                    </span>
                                                                </td>

                                                                <td className="max-w-md px-4 py-3">
                                                                    <div className="flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                                                                        <span>
                                                                            {formatTituloBitacora(
                                                                                bitacora.titulo
                                                                            )}
                                                                        </span>

                                                                        {esNotaRapida(
                                                                            bitacora
                                                                        ) && (
                                                                                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                                                                                    Rápida
                                                                                </span>
                                                                            )}
                                                                    </div>

                                                                    <div className="line-clamp-2 text-slate-500">
                                                                        {
                                                                            bitacora.descripcion
                                                                        }
                                                                    </div>
                                                                </td>

                                                                <td className="px-4 py-3 text-slate-700">
                                                                    {
                                                                        bitacora
                                                                            .empresa
                                                                            ?.nombre ??
                                                                        "-"
                                                                    }
                                                                </td>

                                                                <td className="px-4 py-3 text-slate-600">
                                                                    {renderRelacionResumen(
                                                                        bitacora
                                                                    )}
                                                                </td>

                                                                <td className="whitespace-nowrap px-4 py-3">
                                                                    {bitacora.recordatorioAt ? (
                                                                        <div className="space-y-1">
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
                                                                                <BellOutlined className="mr-1" />

                                                                                {getRecordatorioLabel(
                                                                                    obtenerEstadoRecordatorio(
                                                                                        bitacora
                                                                                    )
                                                                                )}
                                                                            </span>

                                                                            <p className="text-xs text-slate-500">
                                                                                {formatRecordatorioChile(
                                                                                    bitacora.recordatorioAt
                                                                                )}
                                                                            </p>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-xs text-slate-400">
                                                                            Sin
                                                                            recordatorio
                                                                        </span>
                                                                    )}
                                                                </td>

                                                                <td className="px-4 py-3">
                                                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                                                        {
                                                                            bitacora.estado
                                                                        }
                                                                    </span>
                                                                </td>

                                                                <td className="px-4 py-3">
                                                                    <div className="flex justify-end gap-2">
                                                                        {bitacora.recordatorioAt &&
                                                                            puedeModificarBitacoraFront(
                                                                                bitacora
                                                                            ) && (
                                                                                <Tooltip
                                                                                    title={
                                                                                        bitacora.recordatorioCompletado
                                                                                            ? "Reactivar recordatorio"
                                                                                            : "Marcar recordatorio como completado"
                                                                                    }
                                                                                >
                                                                                    <Button
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
                                                                                            void handleCambiarEstadoRecordatorio(
                                                                                                bitacora
                                                                                            )
                                                                                        }
                                                                                    />
                                                                                </Tooltip>
                                                                            )}

                                                                        <Tooltip title="Visualizar">
                                                                            <Button
                                                                                type="text"
                                                                                icon={
                                                                                    <EyeOutlined />
                                                                                }
                                                                                onClick={() =>
                                                                                    void abrirModalVisualizar(
                                                                                        bitacora
                                                                                    )
                                                                                }
                                                                            />
                                                                        </Tooltip>

                                                                        {puedeModificarBitacoraFront(
                                                                            bitacora
                                                                        ) && (
                                                                                <>
                                                                                    <Tooltip title="Editar">
                                                                                        <Button
                                                                                            type="text"
                                                                                            icon={
                                                                                                <EditOutlined />
                                                                                            }
                                                                                            onClick={() =>
                                                                                                abrirModalEditar(
                                                                                                    bitacora
                                                                                                )
                                                                                            }
                                                                                        />
                                                                                    </Tooltip>

                                                                                    <Popconfirm
                                                                                        title="Eliminar bitácora"
                                                                                        description="¿Seguro que deseas eliminar esta bitácora?"
                                                                                        okText="Sí"
                                                                                        cancelText="No"
                                                                                        onConfirm={() =>
                                                                                            void handleDelete(
                                                                                                bitacora.id
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        <Tooltip title="Eliminar">
                                                                                            <Button
                                                                                                type="text"
                                                                                                danger
                                                                                                icon={
                                                                                                    <DeleteOutlined />
                                                                                                }
                                                                                            />
                                                                                        </Tooltip>
                                                                                    </Popconfirm>
                                                                                </>
                                                                            )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            )}
                        </section>
                    )}
            </div>
        </div>
    );
}