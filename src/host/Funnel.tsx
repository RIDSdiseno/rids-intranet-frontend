// src/host/Funnel.tsx
import { useEffect, useState } from "react";
import { App, Input, Select } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { useOportunidadesFunnel } from "../components/modals-funnel/useOportunidadesFunnel";
import {
  CierreOportunidadModal,
  CrearCotizacionModal,
  FunnelBoard,
  FunnelCalendar,
  FunnelDashboard,
  MercadoPublicoProspeccion,
  OportunidadDrawer,
  OportunidadFormModal,
} from "../components/modals-funnel";
import {
  PrioridadOportunidadVenta,
  type CambioEtapaPendiente,
  type EtapaOportunidadVenta,
  type OportunidadDetalle,
  type OportunidadFunnelItem,
} from "../components/modals-funnel/types";
import { getPrioridadLabel } from "../components/modals-funnel/utils";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

interface RetornoCotizacionesState {
  origen:
  "cotizaciones";

  oportunidadId:
  number;

  drawerTab?:
  "cotizaciones";
}

export default function Funnel() {

  const location =
    useLocation();

  const navigate =
    useNavigate();

  const {
    funnel,
    loadingFunnel,
    errorFunnel,
    filtros,
    setFiltros,
    fetchFunnel,
    detalle,
    loadingDetalle,
    fetchDetalle,
    limpiarDetalle,
    crearOportunidad,
    editarOportunidad,
    cambiarEtapa,
    reordenar,
    crearSeguimiento,
    vincularCotizacion,
    desvincularCotizacion,
    desactivarOportunidad,
    cambiarEstadoSeguimiento,
    enviarInformeOportunidad,
  } = useOportunidadesFunnel();

  const [vista, setVista] = useState<
    | "funnel"
    | "mercado-publico"
    | "calendario"
    | "dashboard"
  >("funnel");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<string | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);

  const [cierreOpen, setCierreOpen] = useState(false);
  const [cierreTipo, setCierreTipo] = useState<Extract<EtapaOportunidadVenta, "GANADA" | "PERDIDA" | "POSTERGADA"> | null>(null);
  const [oportunidadCierre, setOportunidadCierre] = useState<OportunidadFunnelItem | OportunidadDetalle | null>(null);

  const [
    cambioEtapaPendiente,
    setCambioEtapaPendiente,
  ] =
    useState<
      CambioEtapaPendiente |
      null
    >(
      null
    );


  const [
    notaCierrePendiente,
    setNotaCierrePendiente,
  ] =
    useState<
      string |
      null
    >(
      null
    );

  const [crearCotizacionOpen, setCrearCotizacionOpen] = useState(false);
  const [oportunidadParaCotizacion, setOportunidadParaCotizacion] = useState<OportunidadDetalle | null>(null);


  useEffect(() => {

    const state =
      location.state as
      | RetornoCotizacionesState
      | null;


    if (
      state?.origen !==
      "cotizaciones" ||
      !Number.isInteger(
        state.oportunidadId
      )
    ) {
      return;
    }


    const oportunidadId =
      state.oportunidadId;


    /*
     * Volvemos siempre al tablero Funnel.
     */
    setVista(
      "funnel"
    );


    /*
     * Abriremos el Drawer directamente
     * en la sección Cotizaciones.
     */
    setDrawerTab(
      state.drawerTab ??
      "cotizaciones"
    );


    setDrawerOpen(
      true
    );


    /*
     * Refrescamos el tablero porque la
     * cotización pudo cambiar monto,
     * estado, etc.
     */
    void fetchFunnel();


    /*
     * Volvemos a cargar la oportunidad
     * para obtener la cotización editada.
     */
    void fetchDetalle(
      oportunidadId
    );


    /*
     * Eliminamos el state de navegación.
     *
     * Esto evita que el Drawer vuelva a
     * abrirse si después el componente
     * vuelve a renderizar.
     */
    navigate(
      "/funnel",

      {
        replace:
          true,

        state:
          null,
      }
    );

  }, [
    location.state,
  ]);

  async function solicitarCambioEtapa(
    oportunidad:
      OportunidadFunnelItem |
      OportunidadDetalle,

    etapaNueva:
      EtapaOportunidadVenta
  ) {

    if (
      oportunidad.etapa ===
      etapaNueva
    ) {
      return;
    }


    setCambioEtapaPendiente({
      oportunidadId:
        oportunidad.id,

      etapaAnterior:
        oportunidad.etapa,

      etapaNueva,
    });


    setDrawerTab(
      undefined
    );


    setDrawerOpen(
      true
    );


    /*
     * Nos aseguramos de que el Drawer
     * tenga el detalle completo.
     */
    await fetchDetalle(
      oportunidad.id
    );
  }

  async function confirmarCambioEtapa(
    nota:
      string
  ) {

    const cambio =
      cambioEtapaPendiente;


    if (
      !cambio
    ) {
      return;
    }


    const notaLimpia =
      nota.trim();


    if (
      notaLimpia.length <
      3
    ) {
      throw new Error(
        "La nota del cambio de etapa es obligatoria."
      );
    }


    /* =====================================================
       GANADA / PERDIDA / POSTERGADA
  
       Primero recogimos la nota en el Drawer.
       Ahora abrimos el modal de cierre.
    ===================================================== */

    if (
      [
        "GANADA",
        "PERDIDA",
        "POSTERGADA",
      ].includes(
        cambio.etapaNueva
      )
    ) {

      const oportunidad =
        detalle?.id ===
          cambio.oportunidadId
          ? detalle
          : funnel.find(
            (
              item
            ) =>
              item.id ===
              cambio.oportunidadId
          ) ??
          null;


      if (
        !oportunidad
      ) {
        throw new Error(
          "No se encontró la oportunidad."
        );
      }


      setNotaCierrePendiente(
        notaLimpia
      );


      setOportunidadCierre(
        oportunidad
      );


      setCierreTipo(
        cambio.etapaNueva as
        Extract<
          EtapaOportunidadVenta,
          | "GANADA"
          | "PERDIDA"
          | "POSTERGADA"
        >
      );


      setCambioEtapaPendiente(
        null
      );


      setCierreOpen(
        true
      );


      return;
    }


    /* =====================================================
       CAMBIO NORMAL
    ===================================================== */

    await cambiarEtapa(
      cambio.oportunidadId,

      {
        etapa:
          cambio.etapaNueva,

        nota:
          notaLimpia,
      },

      {
        /*
         * No movemos la tarjeta antes
         * de confirmar con backend.
         */
        optimista:
          false,
      }
    );


    setCambioEtapaPendiente(
      null
    );
  }

  async function abrirDrawer(item: OportunidadFunnelItem, tab?: string) {
    setDrawerTab(tab);
    setDrawerOpen(true);
    await fetchDetalle(item.id);
  }

  function cerrarDrawer() {
    setDrawerOpen(
      false
    );

    setDrawerTab(
      undefined
    );

    setCambioEtapaPendiente(
      null
    );

    limpiarDetalle();
  }

  // Si el usuario elimina/edita una cotización desde otra pestaña (módulo
  // Cotizaciones) mientras el drawer sigue abierto, el detalle mostrado queda
  // desactualizado (cantidad de cotizaciones, estado, etc.). Se refresca al
  // recuperar el foco de la pestaña.
  useEffect(() => {
    function handleFocus() {
      if (drawerOpen && detalle && document.visibilityState === "visible") {
        fetchDetalle(detalle.id);
      }
    }
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [drawerOpen, detalle, fetchDetalle]);

  function abrirCreacion() {
    setFormOpen(true);
  }

  function abrirCierre(oportunidad: OportunidadFunnelItem | OportunidadDetalle, tipo: Extract<EtapaOportunidadVenta, "GANADA" | "PERDIDA" | "POSTERGADA">) {
    setOportunidadCierre(oportunidad);
    setCierreTipo(tipo);
    setCierreOpen(true);
  }

  // Cuando el backend rechaza el avance a NEGOCIACION por falta de cotización válida (409),
  // abrimos el drawer directamente en la pestaña de Cotizaciones para que el usuario lo resuelva.
  function abrirPorBloqueoCotizacion(oportunidad: OportunidadFunnelItem) {
    abrirDrawer(oportunidad, "cotizaciones");
  }

  function abrirCrearCotizacion(oportunidad: OportunidadDetalle) {
    setOportunidadParaCotizacion(oportunidad);
    setCrearCotizacionOpen(true);
  }

  return (
    <App>
      <div className="p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Funnel de oportunidades</h1>
            <p className="text-sm text-slate-500">
              Seguimiento comercial de oportunidades de venta, desde el primer contacto hasta el cierre.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex flex-wrap rounded-lg border border-slate-200 bg-slate-50 p-1">

              <button
                onClick={() => setVista("funnel")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${vista === "funnel"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
                  }`}
              >
                Funnel
              </button>


              <button
                onClick={() => setVista("mercado-publico")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${vista === "mercado-publico"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
                  }`}
              >
                Mercado Público
              </button>


              <button
                onClick={() => setVista("calendario")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${vista === "calendario"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
                  }`}
              >
                Calendario
              </button>


              <button
                onClick={() => setVista("dashboard")}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${vista === "dashboard"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
                  }`}
              >
                Dashboard
              </button>

            </div>
            {vista !== "mercado-publico" && (

              <button
                onClick={abrirCreacion}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
              >
                <PlusOutlined />

                Nueva oportunidad
              </button>

            )}
          </div>
        </div>

        {vista === "funnel" && (

          <div className="mb-4 flex flex-wrap items-center gap-2">

            <Input
              allowClear
              prefix={
                <SearchOutlined className="text-slate-400" />
              }
              placeholder="Buscar por título, cliente o código..."
              className="w-64"
              value={filtros.texto ?? ""}
              onChange={(e) =>
                setFiltros((f: any) => ({
                  ...f,
                  texto:
                    e.target.value ||
                    undefined,
                }))
              }
            />


            <Select
              allowClear
              placeholder="Prioridad"
              className="w-36"
              value={filtros.prioridad}
              onChange={(value) =>
                setFiltros((f: any) => ({
                  ...f,
                  prioridad:
                    value,
                }))
              }
              options={Object.values(
                PrioridadOportunidadVenta
              ).map((p) => ({
                value: p,
                label:
                  getPrioridadLabel(p),
              }))}
            />

          </div>

        )}

        {vista === "funnel" ? (

          <FunnelBoard
            funnel={
              funnel
            }

            loading={
              loadingFunnel
            }

            error={
              errorFunnel
            }

            onRetry={
              fetchFunnel
            }

            onSelectOportunidad={(
              item
            ) =>
              abrirDrawer(
                item
              )
            }

            onSolicitarCambioEtapa={
              solicitarCambioEtapa
            }

            onReordenar={
              reordenar
            }
          />

        ) : vista === "mercado-publico" ? (

          <MercadoPublicoProspeccion
            onConvertida={
              async (
                oportunidadVentaId
              ) => {

                /*
                 * Actualiza inmediatamente
                 * el Kanban.
                 */
                await fetchFunnel();


                /*
                 * Cambiamos automáticamente
                 * hacia el Funnel.
                 */
                setVista(
                  "funnel"
                );


                /*
                 * Abrimos el drawer de la
                 * oportunidad recién creada.
                 */
                setDrawerTab(
                  undefined
                );

                setDrawerOpen(
                  true
                );

                await fetchDetalle(
                  oportunidadVentaId
                );
              }
            }
          />

        ) : vista === "calendario" ? (

          <FunnelCalendar
            funnel={funnel}
            loading={loadingFunnel}
            onSelectOportunidad={(item) =>
              abrirDrawer(item)
            }
          />

        ) : (

          <FunnelDashboard />

        )}

        <OportunidadDrawer
          open={
            drawerOpen
          }

          loading={
            loadingDetalle
          }

          oportunidad={
            detalle
          }

          scrollTo={
            drawerTab
          }

          onClose={
            cerrarDrawer
          }

          onSubmitEditar={
            editarOportunidad
          }

          onCrearSeguimiento={
            crearSeguimiento
          }

          onVincularCotizacion={
            vincularCotizacion
          }

          onDesvincularCotizacion={
            desvincularCotizacion
          }

          onDesactivar={
            desactivarOportunidad
          }

          cambioEtapaPendiente={
            cambioEtapaPendiente
          }

          onSolicitarCambioEtapa={
            solicitarCambioEtapa
          }

          onConfirmarCambioEtapa={
            confirmarCambioEtapa
          }

          onCancelarCambioEtapa={() =>
            setCambioEtapaPendiente(
              null
            )
          }

          onEnviarInforme={
            enviarInformeOportunidad
          }

          onAbrirCrearCotizacion={
            abrirCrearCotizacion
          }

          onCambiarEstadoSeguimiento={
            cambiarEstadoSeguimiento
          }
        />

        <OportunidadFormModal
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSubmitCrear={crearOportunidad}
          onSuccess={(resultado) => {
            // El modal ya se cierra solo (ver OportunidadFormModal.tsx); aquí solo abrimos su detalle.
            setDrawerOpen(true);
            fetchDetalle(resultado.id);
          }}
        />

        <CierreOportunidadModal
          open={cierreOpen}
          tipo={cierreTipo}
          oportunidad={oportunidadCierre}
          onClose={() => {
            setCierreOpen(
              false
            );

            setNotaCierrePendiente(
              null
            );
          }}
          onConfirm={(
            id,
            payload
          ) => {

            if (
              !notaCierrePendiente
            ) {
              return Promise.reject(
                new Error(
                  "No existe una nota asociada al cambio de etapa."
                )
              );
            }


            return cambiarEtapa(
              id,

              {
                ...payload,

                nota:
                  notaCierrePendiente,
              },

              {
                optimista:
                  false,
              }
            );
          }}
          onSuccess={() => {

            setNotaCierrePendiente(
              null
            );


            if (
              detalle &&
              oportunidadCierre &&
              detalle.id ===
              oportunidadCierre.id
            ) {

              fetchDetalle(
                oportunidadCierre.id
              );
            }
          }}
        />

        <CrearCotizacionModal
          open={crearCotizacionOpen}
          oportunidad={oportunidadParaCotizacion}
          onClose={() => setCrearCotizacionOpen(false)}
          onCotizacionCreada={(cotizacionId) =>
            oportunidadParaCotizacion ? vincularCotizacion(oportunidadParaCotizacion.id, cotizacionId) : Promise.resolve()
          }
        />
      </div>
    </App>
  );
}
