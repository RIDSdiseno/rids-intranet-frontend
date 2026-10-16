// src/components/modals-funnel/OportunidadDrawer.tsx
// A pesar del nombre del archivo (histórico), el contenedor es un modal centrado
// — igual en forma y tamaño al de OportunidadFormModal — no un panel lateral.
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { motion } from "framer-motion";
import {
  App,
  Tag,
  Select,
  DatePicker,
  InputNumber,
  Input,
  Timeline,
  Modal as AntdModal,
} from "antd";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  LinkOutlined,
  MessageOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  SwapOutlined,
  UserSwitchOutlined,
  BankOutlined,
  EyeOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import { http } from "../../service/http";
import type {
  CrearSeguimientoPayload,
  EditarOportunidadPayload,
  EtapaOportunidadVenta,
  EstadoDesarrolloPropuesta,
  TipoServicioOportunidad,
  RiesgoTecnicoOportunidad,
  OportunidadDetalle,
  ResponsableResumen,
  CambioEtapaPendiente,
  MonedaOportunidad,
  EstadoSeguimientoOportunidad,
  EnviarInformeOportunidadPayload,
  EnviarInformeOportunidadResultado,
} from "./types";
import OportunidadForm from "./OportunidadForm";
import EnviarInformeFunnelModal
  from "./EnviarInformeFunnelModal";
import {
  ETAPAS_SELECCIONABLES,
  formatFecha,
  formatFechaHora,
  formatMonto,
  getEtapaBadgeClass,
  getEtapaLabel,
  getEstadoDesarrolloPropuestaLabel,
  getTipoServicioOportunidadLabel,
  getRiesgoTecnicoLabel,
  getOportunidadErrorMessage,
  getPrioridadLabel,
  getPrioridadTagColor,
  formatMontoInput,
  parseMontoInput,
} from "./utils";

import {
  PROXIMAS_ACCIONES,
  getProximaAccionLabel,
} from "./proximasAcciones";

import {
  useNavigate,
} from "react-router-dom";

interface OportunidadDrawerProps {
  open: boolean;
  loading: boolean;
  oportunidad: OportunidadDetalle | null;
  onClose: () => void;
  onSubmitEditar: (id: number, payload: EditarOportunidadPayload) => Promise<OportunidadDetalle | undefined>;
  onCrearSeguimiento: (id: number, payload: CrearSeguimientoPayload) => Promise<unknown>;
  onCambiarEstadoSeguimiento:
  (
    oportunidadId:
      number,

    seguimientoId:
      number,

    estado:
      EstadoSeguimientoOportunidad,

    notaEstado:
      string
  ) =>
    Promise<unknown>;
  onEnviarInforme:
  (
    oportunidadId:
      number,

    payload:
      EnviarInformeOportunidadPayload
  ) =>
    Promise<
      EnviarInformeOportunidadResultado
    >;
  onVincularCotizacion: (id: number, cotizacionId: number) => Promise<unknown>;
  onDesvincularCotizacion: (id: number, cotizacionId: number) => Promise<unknown>;
  onDesactivar: (id: number) => Promise<unknown>;
  onAbrirCrearCotizacion: (oportunidad: OportunidadDetalle) => void;
  scrollTo?: string;
  cambioEtapaPendiente:
  CambioEtapaPendiente |
  null;

  onSolicitarCambioEtapa:
  (
    oportunidad:
      OportunidadDetalle,

    etapa:
      EtapaOportunidadVenta
  ) =>
    void;

  onConfirmarCambioEtapa:
  (
    nota:
      string
  ) =>
    Promise<void>;

  onCancelarCambioEtapa:
  () =>
    void;
}

type ModoDrawer = "lectura" | "edicion";

const ETAPAS_CIERRE = new Set<EtapaOportunidadVenta>(["GANADA", "PERDIDA", "POSTERGADA"]);

// Qué grupo de campos tiene sentido pedir según la etapa actual, al usar
// "Rellenar campos de etapa". En NUEVA todavía falta afinar el contacto; en
// COTIZACION_PREPARACION lo relevante es el desarrollo de la propuesta/cotización;
// en COTIZACION_ENVIADA lo relevante es el seguimiento post-envío (monto propuesto,
// vigencia, respuesta del cliente); en NEGOCIACION, la negociación propiamente
// tal (versión de la propuesta, contrapropuestas, ajustes solicitados).
function gruposCamposPorEtapa(etapa: EtapaOportunidadVenta): Array<"contacto" | "propuesta" | "envio" | "negociacion"> {
  switch (etapa) {
    case "NUEVA":
      return ["contacto"];
    case "COTIZACION_PREPARACION":
      return ["propuesta"];
    case "COTIZACION_ENVIADA":
      return ["envio"];
    case "NEGOCIACION":
      return ["negociacion"];
    default:
      return ["contacto", "propuesta", "envio", "negociacion"];
  }
}

// Filas secundarias mostradas solo dentro del modal "Ver más detalles" (no en
// la tabla resumen siempre visible). Se comparten entre TablaResumen y el modal
// para no duplicar la lista de campos.
function filasDetalleAvanzado(
  oportunidad: OportunidadDetalle
): [string, string | number | null | undefined][] {
  return [
    [
      "Estado desarrollo propuesta",
      oportunidad.estadoDesarrolloPropuesta
        ? getEstadoDesarrolloPropuestaLabel(oportunidad.estadoDesarrolloPropuesta)
        : undefined,
    ],
    [
      "Tipo de servicio",
      oportunidad.tipoServicio
        ? oportunidad.tipoServicio === "OTRO" && oportunidad.tipoServicioOtro
          ? `${getTipoServicioOportunidadLabel(oportunidad.tipoServicio)}: ${oportunidad.tipoServicioOtro}`
          : getTipoServicioOportunidadLabel(oportunidad.tipoServicio)
        : undefined,
    ],
    ["Riesgo técnico", oportunidad.riesgoTecnico ? getRiesgoTecnicoLabel(oportunidad.riesgoTecnico) : undefined],
    [
      "Fecha comprometida envío",
      oportunidad.fechaComprometidaEnvio ? formatFecha(oportunidad.fechaComprometidaEnvio) : undefined,
    ],
    [
      "Monto propuesto",
      oportunidad.montoPropuesto != null ? formatMonto(oportunidad.montoPropuesto, oportunidad.moneda) : undefined,
    ],
    ["Fecha de envío", oportunidad.fechaEnvioPropuesta ? formatFecha(oportunidad.fechaEnvioPropuesta) : undefined],
    [
      "Vigencia propuesta",
      oportunidad.fechaVencimientoPropuesta ? formatFecha(oportunidad.fechaVencimientoPropuesta) : undefined,
    ],
    ["Versión propuesta", oportunidad.versionPropuesta],
    ["Última actividad", oportunidad.fechaUltimoContacto ? formatFecha(oportunidad.fechaUltimoContacto) : undefined],
    ["Monto final", oportunidad.montoFinal != null ? formatMonto(oportunidad.montoFinal, oportunidad.moneda) : undefined],
    ["Fecha de cierre", oportunidad.fechaCierre ? formatFecha(oportunidad.fechaCierre) : undefined],
  ];
}

function estadoCamposDesdeOportunidad(oportunidad: OportunidadDetalle) {
  return {
    entidadId: oportunidad.entidadId ?? undefined,
    contactoNombre: oportunidad.contactoNombre ?? "",
    contactoTelefono: oportunidad.contactoTelefono ?? "",
    contactoEmail: oportunidad.contactoEmail ?? "",
    proyecto: oportunidad.proyecto ?? "",
    montoEstimado: oportunidad.montoEstimado != null ? Number(oportunidad.montoEstimado) : undefined,
    moneda: oportunidad.moneda,
    probabilidadCierre: oportunidad.probabilidadCierre ?? undefined,
    fechaProbableCierre: oportunidad.fechaProbableCierre ? dayjs(oportunidad.fechaProbableCierre) : null,
    proximaAccion: oportunidad.proximaAccion ?? "",
    fechaProximaAccion: oportunidad.fechaProximaAccion ? dayjs(oportunidad.fechaProximaAccion) : null,
    estadoDesarrolloPropuesta: oportunidad.estadoDesarrolloPropuesta ?? undefined,
    tipoServicio: oportunidad.tipoServicio ?? undefined,
    tipoServicioOtro: oportunidad.tipoServicioOtro ?? "",
    informacionPendiente: oportunidad.informacionPendiente ?? "",
    riesgoTecnico: oportunidad.riesgoTecnico ?? undefined,
    condicionesEspeciales: oportunidad.condicionesEspeciales ?? "",
    fechaComprometidaEnvio: oportunidad.fechaComprometidaEnvio ? dayjs(oportunidad.fechaComprometidaEnvio) : null,
    comentariosInternos: oportunidad.comentariosInternos ?? "",
    montoPropuesto: oportunidad.montoPropuesto != null ? Number(oportunidad.montoPropuesto) : undefined,
    // Si aún no se registró una fecha de envío explícita, se hereda la fecha
    // comprometida de envío definida en la etapa Cotización en preparación.
    fechaEnvioPropuesta: oportunidad.fechaEnvioPropuesta
      ? dayjs(oportunidad.fechaEnvioPropuesta)
      : oportunidad.fechaComprometidaEnvio
        ? dayjs(oportunidad.fechaComprometidaEnvio)
        : null,
    fechaVencimientoPropuesta: oportunidad.fechaVencimientoPropuesta
      ? dayjs(oportunidad.fechaVencimientoPropuesta)
      : null,
    comentariosCliente: oportunidad.comentariosCliente ?? "",
    objeciones: oportunidad.objeciones ?? "",
    versionPropuesta: oportunidad.versionPropuesta ?? "",
    contrapropuestas: oportunidad.contrapropuestas ?? "",
    ajustesSolicitados: oportunidad.ajustesSolicitados ?? "",
  };
}

export default function OportunidadDrawer({
  open,
  loading,
  oportunidad,
  onClose,
  onSubmitEditar,
  onCrearSeguimiento,
  onVincularCotizacion,
  onDesvincularCotizacion,
  onDesactivar,
  cambioEtapaPendiente,
  onSolicitarCambioEtapa,
  onConfirmarCambioEtapa,
  onCancelarCambioEtapa,
  onAbrirCrearCotizacion,
  scrollTo,
  onCambiarEstadoSeguimiento,
  onEnviarInforme,
}: OportunidadDrawerProps) {
  const {
    notification,
    modal,
  } = App.useApp();
  const [modo, setModo] = useState<ModoDrawer>("lectura");
  const [hayCambiosSinGuardar, setHayCambiosSinGuardar] = useState(false);
  const [detalleAbierto, setDetalleAbierto] = useState(false);

  const [
    informeOpen,
    setInformeOpen,
  ] =
    useState(
      false
    );

  const [
    notaCambioEtapa,
    setNotaCambioEtapa,
  ] =
    useState("");


  const [
    guardandoCambioEtapa,
    setGuardandoCambioEtapa,
  ] =
    useState(false);

  const cotizacionesRef = useRef<HTMLDivElement>(null);
  const seguimientoTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setModo("lectura");
      setInformeOpen(false);
      setHayCambiosSinGuardar(false);
      setDetalleAbierto(false);
      if (scrollTo === "cotizaciones") {
        // Pequeño delay para que el Drawer termine su animación de apertura antes de hacer scroll.
        setTimeout(() => cotizacionesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
      }
    }
  }, [open, oportunidad?.id, scrollTo]);

  useEffect(
    () => {

      if (
        cambioEtapaPendiente
      ) {
        setNotaCambioEtapa(
          ""
        );
      }

    },
    [
      cambioEtapaPendiente
        ?.oportunidadId,

      cambioEtapaPendiente
        ?.etapaNueva,
    ]
  );

  function solicitarCierre() {

    if (
      modo === "edicion" &&
      hayCambiosSinGuardar
    ) {

      modal.confirm({

        title:
          "Descartar cambios",

        content:
          "Tienes cambios sin guardar en esta oportunidad. ¿Deseas descartarlos y cerrar?",

        okText:
          "Descartar y cerrar",

        okButtonProps: {
          danger:
            true,
        },

        cancelText:
          "Seguir editando",

        onOk:
          () => {

            setModo(
              "lectura"
            );

            setHayCambiosSinGuardar(
              false
            );

            onClose();
          },
      });

      return;
    }


    onClose();
  }

  function cancelarEdicion() {
    setModo("lectura");
    setHayCambiosSinGuardar(false);
  }

  function irACotizaciones() {
    cotizacionesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function irASeguimientos() {
    seguimientoTextareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    seguimientoTextareaRef.current?.focus();
  }

  function handleDesactivar() {

    if (
      !oportunidad
    ) {
      return;
    }


    const oportunidadActual =
      oportunidad;


    modal.confirm({

      title:
        "Desactivar oportunidad",

      content:
        `¿Confirmas desactivar "${oportunidadActual.codigo} · ${oportunidadActual.titulo}"? Podrás seguir consultándola, pero dejará de aparecer en el funnel.`,

      okText:
        "Desactivar",

      cancelText:
        "Cancelar",

      okButtonProps: {
        danger:
          true,
      },

      onOk:
        async () => {

          try {

            await onDesactivar(
              oportunidadActual.id
            );


            notification.success({
              message:
                "Oportunidad desactivada",

              description:
                oportunidadActual.codigo,
            });


            onClose();

          } catch (
          err
          ) {

            notification.error({
              message:
                "No se pudo desactivar la oportunidad",

              description:
                getOportunidadErrorMessage(
                  err,
                  "Ocurrió un error inesperado."
                ),
            });


            throw err;
          }
        },
    });
  }

  async function confirmarCambioPendiente() {

    const nota =
      notaCambioEtapa
        .trim();


    if (
      nota.length <
      3
    ) {

      notification.warning({
        message:
          "Nota obligatoria",

        description:
          "Explica brevemente por qué se cambia la etapa.",
      });

      return;
    }


    setGuardandoCambioEtapa(
      true
    );


    try {

      await onConfirmarCambioEtapa(
        nota
      );


      setNotaCambioEtapa(
        ""
      );

    } catch (
    err
    ) {

      notification.error({
        message:
          "No se pudo cambiar la etapa",

        description:
          getOportunidadErrorMessage(
            err,
            "Ocurrió un error al cambiar la etapa."
          ),
      });

    } finally {

      setGuardandoCambioEtapa(
        false
      );
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl relative max-h-[90vh] overflow-y-auto"
        >
          <div className="p-6">
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              {oportunidad ? `${oportunidad.codigo} · ${oportunidad.titulo}` : "Oportunidad"}
            </h2>

            <button
              onClick={solicitarCierre}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl"
              aria-label="Cerrar"
            >
              ✕
            </button>

            {loading || !oportunidad ? (
              <div className="p-6 text-slate-500">Cargando detalle…</div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${getEtapaBadgeClass(oportunidad.etapa)}`}>
                    {getEtapaLabel(oportunidad.etapa)}
                  </span>
                  <Tag color={getPrioridadTagColor(oportunidad.prioridad)}>{getPrioridadLabel(oportunidad.prioridad)}</Tag>
                  {!oportunidad.activo && <Tag color="default">Inactiva</Tag>}
                  {modo === "edicion" && <Tag color="processing">Editando</Tag>}
                </div>

                {cambioEtapaPendiente &&
                  cambioEtapaPendiente
                    .oportunidadId ===
                  oportunidad.id && (

                    <div
                      className="
      rounded-xl
      border
      border-cyan-200
      bg-cyan-50
      p-4
      "
                    >

                      <div
                        className="
        text-sm
        font-semibold
        text-cyan-800
      "
                      >
                        Confirmar cambio de etapa
                      </div>


                      <div
                        className="
        mt-1
        text-xs
        text-cyan-700
      "
                      >
                        {getEtapaLabel(
                          cambioEtapaPendiente
                            .etapaAnterior
                        )}

                        {" → "}

                        <strong>
                          {getEtapaLabel(
                            cambioEtapaPendiente
                              .etapaNueva
                          )}
                        </strong>
                      </div>


                      <div>
                        <Input.TextArea
                          rows={3}
                          maxLength={1000}

                          value={
                            notaCambioEtapa
                          }

                          onChange={(event) =>
                            setNotaCambioEtapa(
                              event.target.value
                            )
                          }

                          placeholder="Ej: El cliente confirmó interés y solicitó avanzar con la propuesta formal."

                          className="resize-none"
                        />

                        <div
                          className="
      mt-1
      flex
      justify-end
      text-[10px]
      text-slate-400
      "
                        >
                          {notaCambioEtapa.length} / 1000
                        </div>
                      </div>

                      <div
                        className="
       mt-3
      flex
      justify-end
      gap-2
      "
                      >

                        <button
                          type="button"

                          disabled={
                            guardandoCambioEtapa
                          }

                          onClick={() => {
                            setNotaCambioEtapa(
                              ""
                            );

                            onCancelarCambioEtapa();
                          }}

                          className="
          rounded-lg
          px-3
          py-2
          text-xs
          text-slate-600
          hover:bg-white
          disabled:opacity-50
        "
                        >
                          Cancelar
                        </button>


                        <button
                          type="button"

                          disabled={
                            guardandoCambioEtapa ||
                            notaCambioEtapa
                              .trim()
                              .length <
                            3
                          }

                          onClick={
                            confirmarCambioPendiente
                          }

                          className="
          rounded-lg
          bg-cyan-600
          px-3
          py-2
          text-xs
          font-medium
          text-white
          hover:bg-cyan-700
          disabled:cursor-not-allowed
          disabled:opacity-50
        "
                        >
                          {guardandoCambioEtapa
                            ? "Guardando..."
                            : "Confirmar cambio"}
                        </button>

                      </div>

                    </div>
                  )}

                <MercadoPublicoOrigenCard
                  oportunidad={
                    oportunidad
                  }
                />

                {modo === "edicion" ? (
                  <OportunidadForm
                    oportunidad={oportunidad}
                    onSubmitEditar={onSubmitEditar}
                    onSuccess={() => {
                      setModo("lectura");
                      setHayCambiosSinGuardar(false);
                    }}
                    onCancel={cancelarEdicion}
                    onDirtyChange={setHayCambiosSinGuardar}
                  />
                ) : (
                  <>
                    {oportunidad.etapa === "PERDIDA" && oportunidad.motivoPerdida && (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                        <div className="font-semibold">Motivo de perdida</div>
                        <div className="mt-1">{oportunidad.motivoPerdida}</div>
                      </div>
                    )}

                    {oportunidad.etapa === "POSTERGADA" && (oportunidad.motivoPostergacion || oportunidad.fechaReactivacion) && (
                      <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                        <div className="font-semibold">Oportunidad postergada</div>
                        {oportunidad.motivoPostergacion && <div className="mt-1">{oportunidad.motivoPostergacion}</div>}
                        {oportunidad.fechaReactivacion && <div className="mt-1 text-xs">Reactivar: {formatFecha(oportunidad.fechaReactivacion)}</div>}
                      </div>
                    )}

                    {/* Detalle: tabla compacta de 2 columnas por fila (estilo Beck), no cajas espaciosas.
                  Solo lo esencial va siempre visible; el resto queda detrás de "Ver más detalles". */}
                    <TablaResumen
                      ocultarProximaAccion={["NEGOCIACION", "GANADA", "PERDIDA", "POSTERGADA"].includes(oportunidad.etapa)}
                      onVerDetalle={() => setDetalleAbierto(true)}
                      filasEsenciales={[
                        ["Empresa / Entidad", oportunidad.entidad?.nombre],
                        ["Valor estimado", formatMonto(oportunidad.montoEstimado, oportunidad.moneda)],
                        ["Responsable", oportunidad.responsable?.nombre],
                        ["Proyecto", oportunidad.proyecto],
                        ["Nombre de contacto", oportunidad.contactoNombre],
                        ["Correo", oportunidad.contactoEmail],
                        ["Teléfono", oportunidad.contactoTelefono],
                        [
                          "Probabilidad de cierre",
                          oportunidad.probabilidadCierre != null ? `${oportunidad.probabilidadCierre}%` : undefined,
                        ],
                        [
                          "Fecha probable de cierre",
                          oportunidad.fechaProbableCierre ? formatFecha(oportunidad.fechaProbableCierre) : undefined,
                        ],
                        [
                          "Próxima acción",
                          oportunidad.proximaAccion
                            ? getProximaAccionLabel(
                              oportunidad.proximaAccion
                            )
                            : undefined,
                        ],
                      ]}
                      filasDetalle={filasDetalleAvanzado(oportunidad)}
                    />

                    {detalleAbierto && (
                      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative max-h-[90vh] overflow-y-auto"
                        >
                          <div className="p-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-1">Más detalles</h3>
                            <p className="text-xs text-slate-500 mb-4">
                              {oportunidad.codigo} · {oportunidad.titulo}
                            </p>
                            <button
                              onClick={() => setDetalleAbierto(false)}
                              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl"
                              aria-label="Cerrar"
                            >
                              ✕
                            </button>

                            <TablaResumen
                              ocultarProximaAccion={false}
                              onVerDetalle={() => { }}
                              filasEsenciales={filasDetalleAvanzado(oportunidad)}
                              filasDetalle={[]}
                            />

                            {oportunidad.objeciones && (
                              <div className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                                <span className="font-medium text-slate-600">Objeciones: </span>
                                <span className="whitespace-pre-line text-slate-700">{oportunidad.objeciones}</span>
                              </div>
                            )}

                            {oportunidad.contrapropuestas && (
                              <div className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                                <span className="font-medium text-slate-600">Contrapropuestas: </span>
                                <span className="whitespace-pre-line text-slate-700">{oportunidad.contrapropuestas}</span>
                              </div>
                            )}

                            {oportunidad.ajustesSolicitados && (
                              <div className="mt-3 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                                <span className="font-medium text-slate-600">Ajustes solicitados: </span>
                                <span className="whitespace-pre-line text-slate-700">{oportunidad.ajustesSolicitados}</span>
                              </div>
                            )}

                            <div className="mt-6 flex justify-end">
                              <button
                                onClick={() => setDetalleAbierto(false)}
                                className="px-4 py-2 rounded-lg text-sm bg-cyan-600 text-white hover:bg-cyan-700 transition"
                              >
                                Cerrar
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    )}

                    {oportunidad.observaciones && (
                      <div className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                        <span className="font-medium text-slate-600">Observaciones: </span>
                        <span className="whitespace-pre-line text-slate-700">{oportunidad.observaciones}</span>
                      </div>
                    )}

                    {oportunidad.notas && (
                      <div
                        className="
      rounded-lg
      border
      border-slate-200
      px-3
      py-2
      text-sm
     "
                      >
                        <span
                          className="
        font-medium
        text-slate-600
      "
                        >
                          Notas:{" "}
                        </span>

                        <span
                          className="
        whitespace-pre-line
        text-slate-700
      "
                        >
                          {oportunidad.notas}
                        </span>
                      </div>
                    )}

                    {oportunidad.informacionPendiente && (
                      <div className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                        <span className="font-medium text-slate-600">Información pendiente: </span>
                        <span className="whitespace-pre-line text-slate-700">{oportunidad.informacionPendiente}</span>
                      </div>
                    )}

                    {oportunidad.condicionesEspeciales && (
                      <div className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                        <span className="font-medium text-slate-600">Condiciones especiales: </span>
                        <span className="whitespace-pre-line text-slate-700">{oportunidad.condicionesEspeciales}</span>
                      </div>
                    )}

                    {oportunidad.comentariosInternos && (
                      <div className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                        <span className="font-medium text-slate-600">Comentarios internos: </span>
                        <span className="whitespace-pre-line text-slate-700">{oportunidad.comentariosInternos}</span>
                      </div>
                    )}

                    {oportunidad.comentariosCliente && (
                      <div className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                        <span className="font-medium text-slate-600">Comentarios del cliente: </span>
                        <span className="whitespace-pre-line text-slate-700">{oportunidad.comentariosCliente}</span>
                      </div>
                    )}

                    {/* Acciones — visibles inmediatamente debajo de la tabla */}
                    <AccionesSection
                      oportunidad={
                        oportunidad
                      }

                      onEditar={() =>
                        setModo(
                          "edicion"
                        )
                      }

                      onDesactivar={
                        handleDesactivar
                      }

                      onIrACotizaciones={
                        irACotizaciones
                      }

                      onIrASeguimientos={
                        irASeguimientos
                      }

                      onEnviarInforme={() =>
                        setInformeOpen(
                          true
                        )
                      }

                      onSubmitEditar={
                        onSubmitEditar
                      }

                      onSolicitarCambioEtapa={
                        onSolicitarCambioEtapa
                      }
                    />

                    {/* 1. Cotizaciones vinculadas */}
                    <div ref={cotizacionesRef}>
                      <CotizacionesSection
                        oportunidad={oportunidad}
                        onVincular={onVincularCotizacion}
                        onDesvincular={onDesvincularCotizacion}
                        onCrearCotizacion={() => onAbrirCrearCotizacion(oportunidad)}
                      />
                    </div>

                    {/* 2. Seguimientos */}
                    <SeguimientosSection
                      oportunidad={
                        oportunidad
                      }

                      onCrearSeguimiento={
                        onCrearSeguimiento
                      }

                      onCambiarEstadoSeguimiento={
                        onCambiarEstadoSeguimiento
                      }

                      textareaRef={
                        seguimientoTextareaRef
                      }
                    />

                    {/* 3. Historial de etapas */}
                    <HistorialSection oportunidad={oportunidad} />
                  </>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
      <EnviarInformeFunnelModal
        open={
          informeOpen
        }

        oportunidad={
          oportunidad
        }

        onClose={() =>
          setInformeOpen(
            false
          )
        }

        onEnviar={
          onEnviarInforme
        }
      />
    </>
  );
}

function MercadoPublicoOrigenCard({
  oportunidad,
}: {
  oportunidad: OportunidadDetalle;
}) {

  const origen =
    oportunidad.mercadoPublicoOrigen;


  if (
    !origen
  ) {
    return null;
  }


  function getAfinidadClass(
    nivel:
      "BAJA" |
      "MEDIA" |
      "ALTA" |
      "MUY_ALTA"
  ) {

    switch (
    nivel
    ) {

      case "MUY_ALTA":
        return "border-emerald-200 bg-emerald-50 text-emerald-700";

      case "ALTA":
        return "border-cyan-200 bg-cyan-50 text-cyan-700";

      case "MEDIA":
        return "border-amber-200 bg-amber-50 text-amber-700";

      case "BAJA":
      default:
        return "border-slate-200 bg-slate-50 text-slate-600";
    }
  }


  return (
    <section
      className="
        overflow-hidden
        rounded-xl
        border
        border-cyan-200
        bg-cyan-50/40
      "
    >

      <div
        className="
          flex
          flex-col
          gap-3
          px-4
          py-3
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >

        <div className="min-w-0">

          <div className="flex flex-wrap items-center gap-2">

            <span
              className="
                inline-flex
                items-center
                gap-1.5
                text-[10px]
                font-black
                uppercase
                tracking-wide
                text-cyan-700
              "
            >
              <BankOutlined />

              Origen Mercado Público
            </span>


            <span
              className={`
                rounded-full
                border
                px-2
                py-0.5
                text-[10px]
                font-bold
                ${getAfinidadClass(
                origen.nivelAfinidad
              )}
              `}
            >
              Afinidad {origen.score}%
            </span>

          </div>


          <div className="mt-2">

            <p className="text-sm font-bold text-slate-800">
              Licitación {origen.codigoExterno}
            </p>


            <p className="mt-0.5 text-xs font-medium text-slate-600">
              {origen.organismoNombre}
            </p>


            {(origen.unidadComuna ||
              origen.unidadRegion) && (

                <p className="mt-0.5 text-[11px] text-slate-400">

                  {[
                    origen.unidadComuna,
                    origen.unidadRegion,
                  ]
                    .filter(Boolean)
                    .join(" · ")}

                </p>

              )}

          </div>

        </div>


        <div className="flex shrink-0 items-center gap-2">

          <span
            className="
              rounded-lg
              border
              border-white
              bg-white
              px-2.5
              py-1.5
              text-xs
              font-semibold
              text-slate-600
              shadow-sm
            "
          >
            {origen.nivelAfinidad.replace(
              "_",
              " "
            )}
          </span>

        </div>

      </div>


      <div
        className="
          grid
          grid-cols-1
          gap-px
          border-t
          border-cyan-100
          bg-cyan-100
          sm:grid-cols-3
        "
      >

        <MercadoPublicoMiniDato
          label="Publicación"
          value={
            origen.fechaPublicacion
              ? formatFecha(
                origen.fechaPublicacion
              )
              : "—"
          }
        />


        <MercadoPublicoMiniDato
          label="Cierre licitación"
          value={
            origen.fechaCierre
              ? formatFecha(
                origen.fechaCierre
              )
              : "—"
          }
        />


        <MercadoPublicoMiniDato
          label="Monto Mercado Público"
          value={
            origen.montoEstimado !==
              null
              ? formatMonto(
                origen.montoEstimado,
                "CLP"
              )
              : "—"
          }
        />

      </div>

    </section>
  );
}


function MercadoPublicoMiniDato({
  label,
  value,
}: {
  label: string;

  value:
  string | number;
}) {

  return (
    <div className="bg-white/80 px-4 py-2.5">

      <p
        className="
          text-[9px]
          font-bold
          uppercase
          tracking-wide
          text-slate-400
        "
      >
        {label}
      </p>


      <p className="mt-0.5 text-xs font-semibold text-slate-700">
        {value}
      </p>

    </div>
  );
}

/* =========================================================
   Tabla de resumen — compacta, 2 pares label/valor por fila
   (estilo Beck: filas angostas, sin cajas espaciosas).
========================================================= */
function TablaResumen({
  filasEsenciales,
  filasDetalle,
  ocultarProximaAccion = false,
  onVerDetalle,
}: {
  filasEsenciales: [string, string | number | null | undefined][];
  filasDetalle: [string, string | number | null | undefined][];
  ocultarProximaAccion?: boolean;
  onVerDetalle: () => void;
}) {
  function filtrar(filas: [string, string | number | null | undefined][]) {
    return ocultarProximaAccion ? filas.filter(([label]) => !label.toLowerCase().includes("xima acci")) : filas;
  }

  const filas = filtrar(filasEsenciales);
  const hayDetalle = filtrar(filasDetalle).length > 0;
  const pares: [string, string | number | null | undefined][][] = [];
  for (let i = 0; i < filas.length; i += 2) {
    pares.push(filas.slice(i, i + 2));
  }

  return (
    <div>
      <table className="w-full table-fixed border-collapse overflow-hidden rounded-lg border border-slate-200 text-sm">
        <tbody>
          {pares.map((par, i) => (
            <tr key={i} className="border-b border-slate-200 last:border-b-0">
              {par.map(([label, valor], j) => (
                <FilaCelda key={j} label={label} valor={valor} />
              ))}
              {par.length === 1 && <td colSpan={2} className="bg-white" />}
            </tr>
          ))}
        </tbody>
      </table>
      {hayDetalle && (
        <button onClick={onVerDetalle} className="mt-1.5 text-xs font-medium text-cyan-700 hover:underline">
          Ver más detalles
        </button>
      )}
    </div>
  );
}

function FilaCelda({ label, valor }: { label: string; valor?: string | number | null }) {
  return (
    <>
      <td className="w-1/4 border-r border-slate-200 bg-slate-50 px-3 py-1.5 align-top text-xs font-medium text-slate-500">
        {label}
      </td>
      <td className="w-1/4 border-r border-slate-200 px-3 py-1.5 align-top text-slate-700 last:border-r-0">
        {valor || "—"}
      </td>
    </>
  );
}

/* =========================================================
   Acciones — fila de botones + paneles rápidos inline
   (cambiar responsable / cambiar etapa), debajo de la tabla.
========================================================= */
function AccionButton({
  icon,
  label,
  onClick,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  tone?: "default" | "danger" | "success" | "warning";
}) {
  const clases =
    tone === "danger"
      ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
      : tone === "success"
        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        : tone === "warning"
          ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200";

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${clases}`}
    >
      {icon} {label}
    </button>
  );
}

function AccionesSection({
  oportunidad,
  onEditar,
  onDesactivar,
  onIrACotizaciones,
  onIrASeguimientos,
  onEnviarInforme,
  onSubmitEditar,
  onSolicitarCambioEtapa,
}: {
  oportunidad:
  OportunidadDetalle;

  onEditar:
  () =>
    void;

  onDesactivar:
  () =>
    void;

  onIrACotizaciones:
  () =>
    void;

  onIrASeguimientos:
  () =>
    void;

  onEnviarInforme:
  () =>
    void;

  onSubmitEditar:
  (
    id:
      number,

    payload:
      EditarOportunidadPayload
  ) =>
    Promise<
      OportunidadDetalle |
      undefined
    >;

  onSolicitarCambioEtapa:
  (
    oportunidad:
      OportunidadDetalle,

    etapa:
      EtapaOportunidadVenta
  ) =>
    void;
}) {
  const { notification } = App.useApp();
  const [panel, setPanel] = useState<"responsable" | "etapa" | "campos" | null>(null);
  const [responsables, setResponsables] = useState<ResponsableResumen[]>([]);
  const [nuevoResponsable, setNuevoResponsable] = useState<number | undefined>(oportunidad.responsableId);
  const [nuevaEtapa, setNuevaEtapa] = useState<EtapaOportunidadVenta>(oportunidad.etapa);
  const [guardando, setGuardando] = useState(false);

  const [entidadesCampos, setEntidadesCampos] = useState<{ id: number; nombre: string }[]>([]);
  const [camposEtapa, setCamposEtapa] = useState(() => estadoCamposDesdeOportunidad(oportunidad));

  useEffect(() => {
    if (panel === "responsable" && responsables.length === 0) {
      http
        .get("/tecnicos")
        .then((res) => setResponsables(res.data?.data ?? res.data?.items ?? res.data ?? []))
        .catch(() => setResponsables([]));
    }
    if (panel === "campos" && entidadesCampos.length === 0) {
      http
        .get("/entidades")
        .then((res) => setEntidadesCampos(res.data?.data ?? []))
        .catch(() => setEntidadesCampos([]));
    }
  }, [panel, responsables.length, entidadesCampos.length]);

  useEffect(() => {
    setNuevoResponsable(oportunidad.responsableId);
    setNuevaEtapa(oportunidad.etapa);
    setCamposEtapa(estadoCamposDesdeOportunidad(oportunidad));
    setPanel(null);
    // Se sincroniza deliberadamente solo con el id: al cambiar de oportunidad se
    // reinician los valores locales; mientras se sigue viendo la misma no queremos
    // pisar la selección en curso del usuario en los paneles rápidos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oportunidad.id]);

  // Desde POSTERGADA se puede seguir marcando Ganada/Perdida (es un estado intermedio,
  // no un cierre); solo GANADA/PERDIDA son terminales de verdad. "Marcar postergada"
  // no tiene sentido si ya está postergada.
  const puedeMarcarGanadaPerdida =
    oportunidad.activo && oportunidad.etapa !== "GANADA" && oportunidad.etapa !== "PERDIDA";
  const puedeMarcarPostergada = puedeMarcarGanadaPerdida && oportunidad.etapa !== "POSTERGADA";
  const puedeReactivar =
    oportunidad.activo && (oportunidad.etapa === "POSTERGADA" || oportunidad.etapa === "PERDIDA");
  const gruposCampos = gruposCamposPorEtapa(oportunidad.etapa);

  function reactivar() {

    onSolicitarCambioEtapa(
      oportunidad,
      "NEGOCIACION"
    );
  }

  async function guardarResponsable() {
    if (!nuevoResponsable || nuevoResponsable === oportunidad.responsableId) {
      setPanel(null);
      return;
    }
    setGuardando(true);
    try {
      await onSubmitEditar(oportunidad.id, { responsableId: nuevoResponsable });
      notification.success({ message: "Responsable actualizado" });
      setPanel(null);
    } catch (err) {
      notification.error({
        message: "No se pudo cambiar el responsable",
        description: getOportunidadErrorMessage(err, "Ocurrió un error inesperado."),
      });
    } finally {
      setGuardando(false);
    }
  }

  function guardarEtapa() {

    if (
      nuevaEtapa ===
      oportunidad.etapa
    ) {

      setPanel(
        null
      );

      return;
    }


    setPanel(
      null
    );


    onSolicitarCambioEtapa(
      oportunidad,
      nuevaEtapa
    );
  }

  async function guardarCamposEtapa() {
    setGuardando(true);
    try {
      await onSubmitEditar(oportunidad.id, {
        entidadId: camposEtapa.entidadId ?? null,
        contactoNombre: camposEtapa.contactoNombre.trim() || null,
        contactoTelefono: camposEtapa.contactoTelefono.trim() || null,
        contactoEmail: camposEtapa.contactoEmail.trim() || null,
        proyecto: camposEtapa.proyecto.trim() || null,
        montoEstimado: camposEtapa.montoEstimado ?? null,
        moneda: camposEtapa.moneda,
        probabilidadCierre: camposEtapa.probabilidadCierre ?? null,
        fechaProbableCierre: camposEtapa.fechaProbableCierre ? camposEtapa.fechaProbableCierre.toISOString() : null,
        proximaAccion: camposEtapa.proximaAccion.trim() || null,
        fechaProximaAccion: camposEtapa.fechaProximaAccion ? camposEtapa.fechaProximaAccion.toISOString() : null,
        estadoDesarrolloPropuesta: camposEtapa.estadoDesarrolloPropuesta ?? null,
        tipoServicio: camposEtapa.tipoServicio ?? null,
        tipoServicioOtro: camposEtapa.tipoServicioOtro.trim() || null,
        informacionPendiente: camposEtapa.informacionPendiente.trim() || null,
        riesgoTecnico: camposEtapa.riesgoTecnico ?? null,
        condicionesEspeciales: camposEtapa.condicionesEspeciales.trim() || null,
        fechaComprometidaEnvio: camposEtapa.fechaComprometidaEnvio
          ? camposEtapa.fechaComprometidaEnvio.toISOString()
          : null,
        comentariosInternos: camposEtapa.comentariosInternos.trim() || null,
        montoPropuesto: camposEtapa.montoPropuesto ?? null,
        fechaEnvioPropuesta: camposEtapa.fechaEnvioPropuesta ? camposEtapa.fechaEnvioPropuesta.toISOString() : null,
        fechaVencimientoPropuesta: camposEtapa.fechaVencimientoPropuesta
          ? camposEtapa.fechaVencimientoPropuesta.toISOString()
          : null,
        comentariosCliente: camposEtapa.comentariosCliente.trim() || null,
        objeciones: camposEtapa.objeciones.trim() || null,
        versionPropuesta: camposEtapa.versionPropuesta.trim() || null,
        contrapropuestas: camposEtapa.contrapropuestas.trim() || null,
        ajustesSolicitados: camposEtapa.ajustesSolicitados.trim() || null,
      });
      notification.success({ message: "Campos actualizados" });
      setPanel(null);
    } catch (err) {
      notification.error({
        message: "No se pudieron guardar los campos",
        description: getOportunidadErrorMessage(err, "Ocurrió un error inesperado."),
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <AccionButton icon={<EditOutlined />} label="Editar" onClick={onEditar} />
        <AccionButton
          tone="warning"
          icon={<EditOutlined />}
          label="Rellenar campos de etapa"
          onClick={() => setPanel((p) => (p === "campos" ? null : "campos"))}
        />
        <AccionButton
          icon={<UserSwitchOutlined />}
          label="Cambiar responsable"
          onClick={() => setPanel((p) => (p === "responsable" ? null : "responsable"))}
        />
        <AccionButton
          icon={<SwapOutlined />}
          label="Cambiar etapa"
          onClick={() => setPanel((p) => (p === "etapa" ? null : "etapa"))}
        />
        <AccionButton icon={<MessageOutlined />} label="Crear seguimiento" onClick={onIrASeguimientos} />
        <AccionButton icon={<LinkOutlined />} label="Vincular cotización" onClick={onIrACotizaciones} />
        <AccionButton
          icon={
            <FilePdfOutlined />
          }

          label="Enviar informe"

          onClick={
            onEnviarInforme
          }
        />
        {puedeReactivar && (
          <AccionButton
            tone="success"
            icon={<PlayCircleOutlined />}
            label="Reactivar"
            onClick={reactivar}
          />
        )}
        {puedeMarcarGanadaPerdida && (
          <>
            <AccionButton
              tone="success"
              icon={<CheckCircleOutlined />}
              label="Marcar ganada"
              onClick={() =>
                onSolicitarCambioEtapa(
                  oportunidad,
                  "GANADA"
                )
              }
            />
            <AccionButton
              tone="danger"
              icon={<CloseCircleOutlined />}
              label="Marcar perdida"
              onClick={() =>
                onSolicitarCambioEtapa(
                  oportunidad,
                  "PERDIDA"
                )
              }
            />
          </>
        )}
        {puedeMarcarPostergada && (
          <AccionButton
            tone="warning"
            icon={<PauseCircleOutlined />}
            label="Marcar postergada"
            onClick={() =>
              onSolicitarCambioEtapa(
                oportunidad,
                "POSTERGADA"
              )
            }
          />
        )}
        {oportunidad.activo && (
          <AccionButton tone="danger" icon={<DeleteOutlined />} label="Desactivar" onClick={onDesactivar} />
        )}
      </div>

      {panel === "responsable" && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 p-3">
          <Select
            showSearch
            className="flex-1"
            placeholder="Seleccione un responsable…"
            value={nuevoResponsable}
            optionFilterProp="label"
            onChange={setNuevoResponsable}
            options={responsables.map((r) => ({ value: r.id_tecnico, label: r.nombre }))}
          />
          <button
            onClick={guardarResponsable}
            disabled={guardando}
            className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs text-white hover:bg-cyan-700 transition disabled:opacity-60"
          >
            Guardar
          </button>
          <button onClick={() => setPanel(null)} className="text-xs text-slate-500 hover:underline">
            Cancelar
          </button>
        </div>
      )}

      {panel === "etapa" && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 p-3">
          <Select
            className="flex-1"
            value={nuevaEtapa}
            onChange={setNuevaEtapa}
            options={ETAPAS_SELECCIONABLES.map((e) => ({ value: e, label: getEtapaLabel(e) }))}
          />
          <button
            onClick={guardarEtapa}
            disabled={guardando}
            className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs text-white hover:bg-cyan-700 transition disabled:opacity-60"
          >
            Confirmar
          </button>
          <button onClick={() => setPanel(null)} className="text-xs text-slate-500 hover:underline">
            Cancelar
          </button>
        </div>
      )}

      {panel === "campos" && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-800 mb-1">Rellenar campos de etapa</h3>
              <p className="text-xs text-slate-500 mb-4">
                Campos relevantes para <strong>{getEtapaLabel(oportunidad.etapa)}</strong>.
              </p>
              <button
                onClick={() => setPanel(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl"
                aria-label="Cerrar"
              >
                ✕
              </button>

              <div className="grid grid-cols-2 gap-3">
                {gruposCampos.includes("contacto") && (
                  <>
                    <div className="col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">Cliente / Entidad</label>
                      <Select
                        showSearch
                        allowClear
                        className="w-full"
                        placeholder="Seleccione una entidad…"
                        value={camposEtapa.entidadId}
                        optionFilterProp="label"
                        onChange={(value) => setCamposEtapa((c) => ({ ...c, entidadId: value }))}
                        options={entidadesCampos.map((e) => ({ value: e.id, label: e.nombre }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Nombre de contacto</label>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                        value={camposEtapa.contactoNombre}
                        onChange={(e) => setCamposEtapa((c) => ({ ...c, contactoNombre: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Teléfono</label>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                        value={camposEtapa.contactoTelefono}
                        onChange={(e) => setCamposEtapa((c) => ({ ...c, contactoTelefono: e.target.value }))}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">Correo</label>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                        value={camposEtapa.contactoEmail}
                        onChange={(e) => setCamposEtapa((c) => ({ ...c, contactoEmail: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Probabilidad de cierre (%)</label>
                      <InputNumber
                        className="w-full"
                        min={0}
                        max={100}
                        value={camposEtapa.probabilidadCierre}
                        onChange={(value) => setCamposEtapa((c) => ({ ...c, probabilidadCierre: value ?? undefined }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Fecha probable de cierre</label>
                      <DatePicker
                        className="w-full"
                        format="DD-MM-YYYY"
                        value={camposEtapa.fechaProbableCierre}
                        onChange={(value) => setCamposEtapa((c) => ({ ...c, fechaProbableCierre: value }))}
                      />
                    </div>
                  </>
                )}

                {gruposCampos.includes("propuesta") && (
                  <>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Estado desarrollo propuesta</label>
                      <Select
                        allowClear
                        className="w-full"
                        placeholder="Seleccione un estado…"
                        value={camposEtapa.estadoDesarrolloPropuesta}
                        onChange={(value) => setCamposEtapa((c) => ({ ...c, estadoDesarrolloPropuesta: value }))}
                        options={(
                          ["PENDIENTE", "EN_PREPARACION", "ESPERANDO_ANTECEDENTES", "REVISION_INTERNA", "LISTA_PARA_COTIZAR"] as EstadoDesarrolloPropuesta[]
                        ).map((v) => ({ value: v, label: getEstadoDesarrolloPropuestaLabel(v) }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Tipo de servicio</label>
                      <Select
                        allowClear
                        className="w-full"
                        placeholder="Seleccione un tipo…"
                        value={camposEtapa.tipoServicio}
                        onChange={(value) => setCamposEtapa((c) => ({ ...c, tipoServicio: value }))}
                        options={(
                          ["SOPORTE_TI", "DESARROLLO_WEB", "VENTA_PRODUCTOS", "OTRO"] as TipoServicioOportunidad[]
                        ).map((v) => ({ value: v, label: getTipoServicioOportunidadLabel(v) }))}
                      />
                    </div>
                    {camposEtapa.tipoServicio === "OTRO" && (
                      <div className="col-span-2">
                        <label className="block text-xs text-slate-500 mb-1">Especifique el tipo de servicio</label>
                        <input
                          className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                          value={camposEtapa.tipoServicioOtro}
                          onChange={(e) => setCamposEtapa((c) => ({ ...c, tipoServicioOtro: e.target.value }))}
                        />
                      </div>
                    )}
                    <div className="col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">Información pendiente</label>
                      <Input.TextArea
                        rows={2}
                        value={camposEtapa.informacionPendiente}
                        onChange={(e) => setCamposEtapa((c) => ({ ...c, informacionPendiente: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Riesgo técnico</label>
                      <Select
                        allowClear
                        className="w-full"
                        placeholder="Seleccione un riesgo…"
                        value={camposEtapa.riesgoTecnico}
                        onChange={(value) => setCamposEtapa((c) => ({ ...c, riesgoTecnico: value }))}
                        options={(["BAJO", "MEDIO", "ALTO"] as RiesgoTecnicoOportunidad[]).map((v) => ({
                          value: v,
                          label: getRiesgoTecnicoLabel(v),
                        }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Fecha comprometida de envío</label>
                      <DatePicker
                        className="w-full"
                        format="DD-MM-YYYY"
                        value={camposEtapa.fechaComprometidaEnvio}
                        onChange={(value) => setCamposEtapa((c) => ({ ...c, fechaComprometidaEnvio: value }))}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">Condiciones especiales</label>
                      <Input.TextArea
                        rows={2}
                        value={camposEtapa.condicionesEspeciales}
                        onChange={(e) => setCamposEtapa((c) => ({ ...c, condicionesEspeciales: e.target.value }))}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">Comentarios internos</label>
                      <Input.TextArea
                        rows={2}
                        value={camposEtapa.comentariosInternos}
                        onChange={(e) => setCamposEtapa((c) => ({ ...c, comentariosInternos: e.target.value }))}
                      />
                    </div>
                  </>
                )}

                {gruposCampos.includes("envio") && (
                  <>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Monto propuesto</label>
                      <div className="flex gap-2">
                        <Select
                          className="w-20"
                          value={camposEtapa.moneda}
                          onChange={(value) => setCamposEtapa((c) => ({ ...c, moneda: value }))}
                          options={[
                            { value: "CLP", label: "CLP" },
                            { value: "USD", label: "USD" },
                          ]}
                        />
                        <InputNumber
                          className="w-full"

                          min={0}

                          value={
                            camposEtapa.montoPropuesto
                          }

                          precision={
                            camposEtapa.moneda ===
                              "CLP"
                              ? 0
                              : 2
                          }

                          formatter={(value) =>
                            formatMontoInput(
                              value,
                              camposEtapa.moneda
                            )
                          }

                          parser={(value) =>
                            parseMontoInput(
                              value,
                              camposEtapa.moneda
                            )
                          }

                          onChange={(value) =>
                            setCamposEtapa(
                              (c) => ({
                                ...c,

                                montoPropuesto:
                                  value !== null
                                    ? Number(value)
                                    : undefined,
                              })
                            )
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Fecha de envío</label>
                      <DatePicker
                        className="w-full"
                        format="DD-MM-YYYY"
                        value={camposEtapa.fechaEnvioPropuesta}
                        onChange={(value) => setCamposEtapa((c) => ({ ...c, fechaEnvioPropuesta: value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Fecha de vencimiento / vigencia</label>
                      <DatePicker
                        className="w-full"
                        format="DD-MM-YYYY"
                        value={camposEtapa.fechaVencimientoPropuesta}
                        onChange={(value) => setCamposEtapa((c) => ({ ...c, fechaVencimientoPropuesta: value }))}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">Comentarios del cliente</label>
                      <Input.TextArea
                        rows={2}
                        value={camposEtapa.comentariosCliente}
                        onChange={(e) => setCamposEtapa((c) => ({ ...c, comentariosCliente: e.target.value }))}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">Objeciones</label>
                      <Input.TextArea
                        rows={2}
                        value={camposEtapa.objeciones}
                        onChange={(e) => setCamposEtapa((c) => ({ ...c, objeciones: e.target.value }))}
                      />
                    </div>
                  </>
                )}

                {gruposCampos.includes("negociacion") && (
                  <>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Fecha envío propuesta</label>
                      <DatePicker
                        className="w-full"
                        format="DD-MM-YYYY"
                        value={camposEtapa.fechaEnvioPropuesta}
                        onChange={(value) => setCamposEtapa((c) => ({ ...c, fechaEnvioPropuesta: value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Versión propuesta</label>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                        value={camposEtapa.versionPropuesta}
                        onChange={(e) => setCamposEtapa((c) => ({ ...c, versionPropuesta: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Monto propuesto</label>
                      <div className="flex gap-2">
                        <Select
                          className="w-20"
                          value={camposEtapa.moneda}
                          onChange={(value) => setCamposEtapa((c) => ({ ...c, moneda: value }))}
                          options={[
                            { value: "CLP", label: "CLP" },
                            { value: "USD", label: "USD" },
                          ]}
                        />
                        <InputNumber
                          className="w-full"

                          min={0}

                          value={
                            camposEtapa.montoPropuesto
                          }

                          precision={
                            camposEtapa.moneda ===
                              "CLP"
                              ? 0
                              : 2
                          }

                          formatter={(value) =>
                            formatMontoInput(
                              value,
                              camposEtapa.moneda
                            )
                          }

                          parser={(value) =>
                            parseMontoInput(
                              value,
                              camposEtapa.moneda
                            )
                          }

                          onChange={(value) =>
                            setCamposEtapa(
                              (c) => ({
                                ...c,

                                montoPropuesto:
                                  value !== null
                                    ? Number(value)
                                    : undefined,
                              })
                            )
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Probabilidad de cierre (%)</label>
                      <InputNumber
                        className="w-full"
                        min={0}
                        max={100}
                        value={camposEtapa.probabilidadCierre}
                        onChange={(value) => setCamposEtapa((c) => ({ ...c, probabilidadCierre: value ?? undefined }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Fecha probable de cierre</label>
                      <DatePicker
                        className="w-full"
                        format="DD-MM-YYYY"
                        value={camposEtapa.fechaProbableCierre}
                        onChange={(value) => setCamposEtapa((c) => ({ ...c, fechaProbableCierre: value }))}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">Objeciones</label>
                      <Input.TextArea
                        rows={2}
                        value={camposEtapa.objeciones}
                        onChange={(e) => setCamposEtapa((c) => ({ ...c, objeciones: e.target.value }))}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">Contrapropuestas</label>
                      <Input.TextArea
                        rows={2}
                        value={camposEtapa.contrapropuestas}
                        onChange={(e) => setCamposEtapa((c) => ({ ...c, contrapropuestas: e.target.value }))}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-slate-500 mb-1">Ajustes solicitados</label>
                      <Input.TextArea
                        rows={2}
                        value={camposEtapa.ajustesSolicitados}
                        onChange={(e) => setCamposEtapa((c) => ({ ...c, ajustesSolicitados: e.target.value }))}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button onClick={() => setPanel(null)} className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100 transition">
                  Cancelar
                </button>
                <button
                  onClick={guardarCamposEtapa}
                  disabled={guardando}
                  className="px-4 py-2 rounded-lg text-sm bg-cyan-600 text-white hover:bg-cyan-700 transition disabled:opacity-60"
                >
                  {guardando ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   1. Cotizaciones vinculadas
========================================================= */
interface CotizacionBusquedaRow {
  id: number;

  estado: string;

  total: number;

  moneda:
  MonedaOportunidad;

  oportunidadVentaId:
  number |
  null;

  entidad:
  {
    nombre:
    string;
  } |
  null;
}
function CotizacionesSection({
  oportunidad,
  onVincular,
  onDesvincular,
  onCrearCotizacion,
}: {
  oportunidad: OportunidadDetalle;
  onVincular: (id: number, cotizacionId: number) => Promise<unknown>;
  onDesvincular: (id: number, cotizacionId: number) => Promise<unknown>;
  onCrearCotizacion: () => void;
}) {

  const navigate =
    useNavigate();

  const {
    notification,
    modal,
  } = App.useApp();
  const [buscando, setBuscando] = useState(false);
  const [opciones, setOpciones] = useState<{ value: number; label: string }[]>([]);
  const [seleccionada, setSeleccionada] = useState<number | undefined>(undefined);
  const [vinculando, setVinculando] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function buscarCotizaciones(texto: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!texto || texto.trim().length < 2) {
      setOpciones([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await http.get<{ data: CotizacionBusquedaRow[] }>("/cotizaciones/paginacion", {
          params: { search: texto, page: 1, limit: 20 },
        });
        const rows: CotizacionBusquedaRow[] = res.data?.data ?? [];
        setOpciones(
          rows
            .filter((c) => !c.oportunidadVentaId || c.oportunidadVentaId === oportunidad.id)
            .map((c) => ({
              value: c.id,
              label: `#${c.id} · ${c.entidad?.nombre ?? "Sin cliente"} · ${c.estado} · ${formatMonto(c.total, c.moneda)}`,
            }))
        );
      } catch {
        setOpciones([]);
      } finally {
        setBuscando(false);
      }
    }, 400);
  }

  function abrirCotizacion(
    cotizacionId:
      number,

    accion:
      "ver" |
      "editar"
  ) {
    navigate(
      `/Cotizaciones?cotizacionId=${cotizacionId}&accion=${accion}`,

      {
        state: {
          origen:
            "funnel",

          oportunidadId:
            oportunidad.id,

          drawerTab:
            "cotizaciones",
        },
      }
    );
  }

  async function handleVincular() {
    if (!seleccionada) return;
    setVinculando(true);
    try {
      await onVincular(oportunidad.id, seleccionada);
      setSeleccionada(undefined);
      setOpciones([]);
      notification.success({ message: "Cotización vinculada" });
    } catch (err) {
      notification.error({
        message: "No se pudo vincular la cotización",
        description: getOportunidadErrorMessage(err, "Ocurrió un error inesperado."),
      });
    } finally {
      setVinculando(false);
    }
  }

  function handleDesvincular(
    cotizacionId:
      number
  ) {

    modal.confirm({

      title:
        "Desvincular cotización",

      content:
        `¿Confirmas desvincular la cotización #${cotizacionId} de esta oportunidad?`,

      okText:
        "Desvincular",

      cancelText:
        "Cancelar",

      okButtonProps: {
        danger:
          true,
      },

      onOk:
        async () => {

          try {

            await onDesvincular(
              oportunidad.id,
              cotizacionId
            );


            notification.success({
              message:
                "Cotización desvinculada",
            });

          } catch (
          err
          ) {

            notification.error({
              message:
                "No se pudo desvincular la cotización",

              description:
                getOportunidadErrorMessage(
                  err,
                  "Ocurrió un error inesperado."
                ),
            });


            throw err;
          }
        },
    });
  }

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700">
          Cotizaciones vinculadas (
          {oportunidad.cotizaciones.length}
          )
        </h4>

        <div className="flex items-center gap-2">

          <button
            type="button"

            onClick={() =>
              navigate(
                "/Cotizaciones",

                {
                  state: {
                    origen:
                      "funnel",

                    oportunidadId:
                      oportunidad.id,

                    drawerTab:
                      "cotizaciones",
                  },
                }
              )
            }

            className="
        rounded-lg
        bg-slate-100
        px-2.5
        py-1
        text-xs
        font-medium
        text-slate-600
        hover:bg-slate-200
      "
          >
            Ir a Cotizaciones
          </button>


          <button
            onClick={
              onCrearCotizacion
            }

            className="
        inline-flex
        items-center
        gap-1
        rounded-lg
        bg-emerald-50
        px-2.5
        py-1
        text-xs
        text-emerald-700
        hover:bg-emerald-100
        transition
      "
          >
            <PlusOutlined />

            Crear cotización
          </button>

        </div>
      </div>

      <div className="mb-3 flex gap-2">
        <Select
          showSearch
          className="flex-1"
          placeholder="Buscar por código, cliente o estado…"
          filterOption={false}
          loading={buscando}
          value={seleccionada}
          onSearch={buscarCotizaciones}
          onChange={setSeleccionada}
          options={opciones}
          notFoundContent={buscando ? "Buscando..." : "Escribe al menos 2 caracteres"}
        />
        <button
          onClick={handleVincular}
          disabled={!seleccionada || vinculando}
          className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs text-white hover:bg-cyan-700 transition disabled:opacity-60"
        >
          <LinkOutlined /> Vincular
        </button>
      </div>

      <div className="space-y-2">
        {oportunidad.cotizaciones.map(
          (c) => (

            <div
              key={
                c.id
              }

              className="
        rounded-lg
        border
        border-slate-200
        p-3
        text-sm
      "
            >

              <div
                className="
          flex
          items-start
          justify-between
          gap-3
        "
              >

                <div
                  className="
            min-w-0
            flex-1
          "
                >

                  <div
                    className="
              font-medium
              text-slate-700
            "
                  >
                    #{c.id} ·{" "}
                    {c.entidad?.nombre ??
                      "Sin cliente"}
                  </div>


                  <div
                    className="
              mt-0.5
              text-xs
              text-slate-500
            "
                  >
                    {c.estado}

                    {" · "}

                    {formatMonto(
                      c.total,
                      c.moneda
                    )}

                    {" · "}

                    {formatFecha(
                      c.createdAt
                    )}
                  </div>

                </div>


                <div
                  className="
            flex
            shrink-0
            items-center
            gap-2
          "
                >

                  <button
                    type="button"

                    onClick={() =>
                      abrirCotizacion(
                        c.id,
                        "ver"
                      )
                    }

                    className="
              rounded-lg
              bg-blue-50
              px-2.5
              py-1.5
              text-xs
              font-medium
              text-blue-700
              hover:bg-blue-100
            "
                  >
                    Ver
                  </button>


                  <button
                    type="button"

                    onClick={() =>
                      abrirCotizacion(
                        c.id,
                        "editar"
                      )
                    }

                    className="
              rounded-lg
              bg-emerald-50
              px-2.5
              py-1.5
              text-xs
              font-medium
              text-emerald-700
              hover:bg-emerald-100
            "
                  >
                    Editar
                  </button>


                  <button
                    type="button"

                    onClick={() =>
                      handleDesvincular(
                        c.id
                      )
                    }

                    className="
              rounded-lg
              bg-rose-50
              px-2.5
              py-1.5
              text-xs
              font-medium
              text-rose-600
              hover:bg-rose-100
            "
                  >
                    Desvincular
                  </button>

                </div>

              </div>

            </div>
          )
        )}
      </div>
    </section>
  );
}

/* =========================================================
   2. Seguimientos
========================================================= */
function SeguimientosSection({
  oportunidad,
  onCrearSeguimiento,
  onCambiarEstadoSeguimiento,
  textareaRef,
}: {
  oportunidad:
  OportunidadDetalle;

  onCrearSeguimiento:
  (
    id:
      number,

    payload:
      CrearSeguimientoPayload
  ) =>
    Promise<unknown>;

  onCambiarEstadoSeguimiento:
  (
    oportunidadId:
      number,

    seguimientoId:
      number,

    estado:
      EstadoSeguimientoOportunidad,

    notaEstado:
      string
  ) =>
    Promise<unknown>;

  textareaRef:
  RefObject<
    HTMLTextAreaElement |
    null
  >;
}) {
  const { notification } = App.useApp();
  const [comentario, setComentario] = useState("");
  const [fechaContacto, setFechaContacto] = useState<Dayjs | null>(dayjs());
  const [proximaAccion, setProximaAccion] = useState("");
  const [fechaProximaAccion, setFechaProximaAccion] = useState<Dayjs | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [
    actualizandoSeguimientoId,
    setActualizandoSeguimientoId,
  ] =
    useState<
      number |
      null
    >(
      null
    );

  const [
    cambioEstadoPendiente,
    setCambioEstadoPendiente,
  ] =
    useState<{
      seguimientoId:
      number;

      estado:
      EstadoSeguimientoOportunidad;
    } | null>(
      null
    );

  const [
    notaEstado,
    setNotaEstado,
  ] =
    useState(
      ""
    );

  const tareasPendientes =
    oportunidad.seguimientos.filter(
      (
        seguimiento
      ) =>
        seguimiento.estado ===
        "PENDIENTE"
    );

  function solicitarCambioEstado(
    seguimientoId:
      number,

    estado:
      EstadoSeguimientoOportunidad
  ) {
    setCambioEstadoPendiente({
      seguimientoId,
      estado,
    });

    setNotaEstado(
      ""
    );
  }

  async function confirmarCambioEstado() {

    if (
      !cambioEstadoPendiente
    ) {
      return;
    }


    const nota =
      notaEstado.trim();


    if (
      nota.length <
      3
    ) {
      notification.warning({
        message:
          "Nota obligatoria",

        description:
          "Indica qué ocurrió o por qué se cambia el estado de la tarea.",
      });

      return;
    }


    setActualizandoSeguimientoId(
      cambioEstadoPendiente
        .seguimientoId
    );


    try {

      await onCambiarEstadoSeguimiento(
        oportunidad.id,

        cambioEstadoPendiente
          .seguimientoId,

        cambioEstadoPendiente
          .estado,

        nota
      );


      notification.success({
        message:
          cambioEstadoPendiente
            .estado ===
            "COMPLETADA"
            ? "Tarea completada"
            : "Tarea cancelada",
      });


      setCambioEstadoPendiente(
        null
      );

      setNotaEstado(
        ""
      );

    } catch (
    err
    ) {

      notification.error({
        message:
          "No se pudo actualizar la tarea",

        description:
          getOportunidadErrorMessage(
            err,
            "Ocurrió un error inesperado."
          ),
      });

    } finally {

      setActualizandoSeguimientoId(
        null
      );
    }
  }

  async function handleAgregar() {
    if (
      !comentario.trim()
    ) {
      setError(
        "El detalle de la próxima tarea es obligatorio."
      );

      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await onCrearSeguimiento(oportunidad.id, {
        comentario: comentario.trim(),
        fechaContacto: fechaContacto ? fechaContacto.toISOString() : undefined,
        proximaAccion: proximaAccion.trim() || undefined,
        fechaProximaAccion: fechaProximaAccion ? fechaProximaAccion.toISOString() : undefined,
      });
      setComentario("");
      setProximaAccion("");
      setFechaProximaAccion(null);
      setFechaContacto(dayjs());
      notification.success({ message: "Seguimiento agregado" });
    } catch (err) {
      setError(getOportunidadErrorMessage(err, "No se pudo agregar el seguimiento."));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section>
      <h4 className="mb-2 text-sm font-semibold text-slate-700">Seguimientos ({oportunidad.seguimientos.length})</h4>

      {tareasPendientes.length >
        0 && (

          <div
            className="
      mb-3
      rounded-lg
      border
      border-amber-200
      bg-amber-50
      px-3
      py-2
      text-xs
      text-amber-700
    "
          >

            <strong>
              {tareasPendientes.length}
            </strong>

            {" "}

            {tareasPendientes.length ===
              1
              ? "tarea pendiente."
              : "tareas pendientes."}

            {" "}

            Puedes registrar otra tarea
            si corresponde.

          </div>
        )}

      <div className="mb-3 rounded-xl border border-slate-200 p-3">

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">

          {/* =====================================================
        PRÓXIMA ACCIÓN
    ===================================================== */}

          <div>
            <label
              className="
          mb-1
          block
          text-xs
          font-medium
          text-slate-500
        "
            >
              Próxima acción
            </label>

            <Select
              className="w-full"

              placeholder="Seleccionar próxima acción"

              value={
                proximaAccion ||
                undefined
              }

              onChange={(value) =>
                setProximaAccion(
                  value
                )
              }

              allowClear

              showSearch

              optionFilterProp="label"

              options={
                PROXIMAS_ACCIONES
              }
            />
          </div>


          {/* =====================================================
        FECHA PRÓXIMA TAREA
    ===================================================== */}

          <div>
            <label
              className="
          mb-1
          block
          text-xs
          font-medium
          text-slate-500
        "
            >
              Fecha de próxima tarea
            </label>

            <DatePicker
              className="w-full"

              format="DD-MM-YYYY"

              placeholder="Seleccionar fecha"

              value={
                fechaProximaAccion
              }

              onChange={
                setFechaProximaAccion
              }
            />
          </div>

        </div>


        {/* =====================================================
      DETALLE DE LA TAREA
  ===================================================== */}

        <div className="mt-3">

          <label
            className="
            mb-1
            block
            text-xs
            font-medium
            text-slate-500
             "
          >
            Detalle de la próxima tarea
          </label>

          <Input.TextArea
            ref={
              textareaRef
            }

            rows={3}

            maxLength={
              1000
            }

            placeholder="Ej: Llamar al cliente para confirmar recepción de la propuesta y consultar fecha estimada de decisión."

            value={
              comentario
            }

            onChange={(event) =>
              setComentario(
                event.target.value
              )
            }

            className="resize-none"
          />

        </div>


        {error && (
          <p className="mt-2 text-xs text-rose-500">
            {error}
          </p>
        )}


        <div className="mt-2 flex justify-end">

          <button
            type="button"

            onClick={
              handleAgregar
            }

            disabled={
              enviando
            }

            className="
        inline-flex
        items-center
        gap-1
        rounded-lg
        bg-cyan-600
        px-3
        py-1.5
        text-xs
        text-white
        transition
        hover:bg-cyan-700
        disabled:opacity-60
      "
          >
            <PlusOutlined />

            {enviando
              ? "Guardando…"
              : "Registrar próxima tarea"}
          </button>

        </div>

      </div>


      {/* =====================================================
          HISTORIAL DE SEGUIMIENTOS / PRÓXIMAS TAREAS
      ===================================================== */}

      <div className="space-y-2">

        {oportunidad.seguimientos.length === 0 ? (

          <p className="text-sm text-slate-400">
            Sin seguimientos registrados.
          </p>

        ) : (

          oportunidad.seguimientos.map(
            (
              s
            ) => {

              const actualizando =
                actualizandoSeguimientoId ===
                s.id;


              const esPendiente =
                s.estado ===
                "PENDIENTE";


              return (

                <div
                  key={
                    s.id
                  }

                  className={`
          rounded-lg
          border
          p-3
          text-sm

          ${s.estado ===
                      "COMPLETADA"
                      ? "border-emerald-200 bg-emerald-50/30"
                      : s.estado ===
                        "CANCELADA"
                        ? "border-slate-200 bg-slate-50/50"
                        : "border-amber-200 bg-white"
                    }
        `}
                >

                  {/* =========================================
            CABECERA
        ========================================= */}

                  <div
                    className="
            flex
            flex-wrap
            items-center
            justify-between
            gap-2
          "
                  >

                    <div
                      className="
              text-xs
              text-slate-400
            "
                    >

                      <span>
                        {s.autor?.nombre ??
                          "—"}
                      </span>

                      {" · "}

                      <span>
                        {formatFechaHora(
                          s.createdAt
                        )}
                      </span>

                    </div>


                    {/* =====================================
              ESTADO
          ===================================== */}

                    <span
                      className={`
              inline-flex
              items-center
              rounded-full
              px-2
              py-0.5
              text-[10px]
              font-semibold

              ${s.estado ===
                          "COMPLETADA"
                          ? "bg-emerald-100 text-emerald-700"
                          : s.estado ===
                            "CANCELADA"
                            ? "bg-slate-200 text-slate-600"
                            : "bg-amber-100 text-amber-700"
                        }
            `}
                    >

                      {s.estado ===
                        "COMPLETADA"
                        ? "Completada"
                        : s.estado ===
                          "CANCELADA"
                          ? "Cancelada"
                          : "Pendiente"}

                    </span>

                  </div>


                  {/* =========================================
            PRÓXIMA TAREA
        ========================================= */}

                  {(s.proximaAccion ||
                    s.fechaProximaAccion) && (

                      <div
                        className="
              mt-2
              flex
              flex-wrap
              items-center
              gap-1
            "
                      >

                        <span
                          className="
                text-xs
                font-semibold
                text-slate-600
              "
                        >
                          Acción:
                        </span>


                        <span
                          className="
                text-xs
                text-slate-600
              "
                        >

                          {s.proximaAccion
                            ? getProximaAccionLabel(
                              s.proximaAccion
                            )
                            : "Sin acción definida"}

                          {s.fechaProximaAccion
                            ? ` · ${formatFecha(
                              s.fechaProximaAccion
                            )}`
                            : ""}

                        </span>

                      </div>
                    )}


                  {/* =========================================
            DETALLE
        ========================================= */}

                  <div
                    className="
            mt-2
            rounded-lg
            bg-slate-50
            px-3
            py-2
          "
                  >

                    <div
                      className="
              mb-1
              text-[10px]
              font-semibold
              uppercase
              tracking-wide
              text-slate-400
            "
                    >
                      Detalle de la tarea
                    </div>


                    <p
                      className="
              whitespace-pre-line
              text-sm
              text-slate-700
            "
                    >
                      {s.comentario}
                    </p>

                  </div>

                  {/* =========================================
    NOTA DEL CAMBIO DE ESTADO
========================================= */}

                  {s.notaEstado && (

                    <div
                      className={`
      mt-2
      rounded-lg
      border
      px-3
      py-2

      ${s.estado ===
                          "COMPLETADA"
                          ? "border-emerald-200 bg-emerald-50"
                          : s.estado ===
                            "CANCELADA"
                            ? "border-rose-200 bg-rose-50"
                            : "border-slate-200 bg-slate-50"
                        }
    `}
                    >

                      <div
                        className={`
        mb-1
        text-[10px]
        font-semibold
        uppercase
        tracking-wide

        ${s.estado ===
                            "COMPLETADA"
                            ? "text-emerald-600"
                            : s.estado ===
                              "CANCELADA"
                              ? "text-rose-600"
                              : "text-slate-400"
                          }
      `}
                      >

                        {s.estado ===
                          "COMPLETADA"
                          ? "Nota de la tarea"
                          : s.estado ===
                            "CANCELADA"
                            ? "Motivo de cancelación"
                            : "Nota del estado"}

                      </div>


                      <p
                        className="
        whitespace-pre-line
        text-sm
        text-slate-700
      "
                      >
                        {s.notaEstado}
                      </p>

                    </div>
                  )}

                  {/* =========================================
            COMPLETADO AT
        ========================================= */}

                  {s.estado ===
                    "COMPLETADA" &&
                    s.completadoAt && (

                      <div
                        className="
              mt-2
              text-[10px]
              text-emerald-600
            "
                      >
                        Completada el{" "}
                        {formatFechaHora(
                          s.completadoAt
                        )}
                      </div>
                    )}


                  {/* =========================================
            ACCIONES DE TAREA PENDIENTE
        ========================================= */}

                  {esPendiente && (

                    <div
                      className="
              mt-3
              flex
              flex-wrap
              justify-end
              gap-2
            "
                    >

                      <button
                        type="button"

                        disabled={
                          actualizando
                        }

                        onClick={() =>
                          solicitarCambioEstado(
                            s.id,
                            "CANCELADA"
                          )
                        }

                        className="
                rounded-lg
                bg-slate-100
                px-2.5
                py-1.5
                text-xs
                font-medium
                text-slate-600
                transition
                hover:bg-slate-200
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
                      >
                        Cancelar
                      </button>


                      <button
                        type="button"

                        disabled={
                          actualizando
                        }

                        onClick={() =>
                          solicitarCambioEstado(
                            s.id,
                            "COMPLETADA"
                          )
                        }

                        className="
                inline-flex
                items-center
                gap-1
                rounded-lg
                bg-emerald-50
                px-2.5
                py-1.5
                text-xs
                font-medium
                text-emerald-700
                transition
                hover:bg-emerald-100
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
                      >

                        <CheckCircleOutlined />

                        {actualizando
                          ? "Guardando..."
                          : "Marcar completada"}

                      </button>

                    </div>
                  )}

                </div>
              );
            }
          )
        )}

        <AntdModal
          open={
            cambioEstadoPendiente !==
            null
          }

          title={
            cambioEstadoPendiente
              ?.estado ===
              "COMPLETADA"
              ? "Completar tarea"
              : "Cancelar tarea"
          }

          okText={
            cambioEstadoPendiente
              ?.estado ===
              "COMPLETADA"
              ? "Marcar completada"
              : "Cancelar tarea"
          }

          cancelText="Volver"

          confirmLoading={
            actualizandoSeguimientoId !==
            null
          }

          okButtonProps={{
            disabled:
              notaEstado
                .trim()
                .length <
              3,

            danger:
              cambioEstadoPendiente
                ?.estado ===
              "CANCELADA",
          }}

          onCancel={() => {
            if (
              actualizandoSeguimientoId !==
              null
            ) {
              return;
            }

            setCambioEstadoPendiente(
              null
            );

            setNotaEstado(
              ""
            );
          }}

          onOk={
            confirmarCambioEstado
          }
        >

          <p className="mb-2 text-sm text-slate-600">
            {cambioEstadoPendiente
              ?.estado ===
              "COMPLETADA"
              ? "Describe qué se realizó o cuál fue el resultado de esta tarea."
              : "Indica por qué esta tarea fue cancelada."}
          </p>


          <Input.TextArea
            rows={
              4
            }

            maxLength={
              1000
            }

            value={
              notaEstado
            }

            onChange={(event) =>
              setNotaEstado(
                event.target.value
              )
            }

            placeholder={
              cambioEstadoPendiente
                ?.estado ===
                "COMPLETADA"
                ? "Ej: Se llamó al cliente. Confirmó recepción de la cotización y pidió retomar contacto el lunes."
                : "Ej: La visita se canceló porque el cliente solicitó reagendar para la próxima semana."
            }
          />


          <div
            className="
      mt-1
      text-right
      text-[10px]
      text-slate-400
    "
          >
            {notaEstado.length} / 1000
          </div>

        </AntdModal>

      </div>

    </section>
  );
}

/* =========================================================
   3. Historial de etapas — Timeline (estilo Beck)
========================================================= */
function HistorialSection({ oportunidad }: { oportunidad: OportunidadDetalle }) {
  const eventos = [...oportunidad.historialEtapas].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <section>
      <h4 className="mb-2 text-sm font-semibold text-slate-700">Historial de etapas</h4>
      {eventos.length === 0 ? (
        <p className="text-sm text-slate-400">Sin historial de cambios de etapa.</p>
      ) : (
        <Timeline
          items={eventos.map((e) => ({
            key: e.id,
            color: e.etapaNueva === "GANADA" ? "green" : e.etapaNueva === "PERDIDA" ? "red" : e.etapaNueva === "POSTERGADA" ? "orange" : "blue",
            children: (
              <div>

                <div
                  className="
        text-sm
        text-slate-700
      "
                >
                  {e.etapaAnterior
                    ? getEtapaLabel(
                      e.etapaAnterior
                    )
                    : "Creación"}

                  {" → "}

                  <strong>
                    {getEtapaLabel(
                      e.etapaNueva
                    )}
                  </strong>
                </div>


                {e.nota && (
                  <div
                    className="
          mt-1.5
          rounded-lg
          border
          border-slate-200
          bg-slate-50
          px-3
          py-2
          text-xs
          text-slate-600
          whitespace-pre-line
        "
                  >
                    {e.nota}
                  </div>
                )}


                <div
                  className="
        mt-1
        text-xs
        text-slate-400
      "
                >
                  {e.actor?.nombre ??
                    "Sistema"}

                  {" · "}

                  {formatFechaHora(
                    e.createdAt
                  )}
                </div>

              </div>
            ),
          }))}
        />
      )}
    </section>
  );
}
