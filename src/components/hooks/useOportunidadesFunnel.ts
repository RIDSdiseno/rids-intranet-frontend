// src/components/hooks/useOportunidadesFunnel.ts
import { useCallback, useEffect, useRef, useState } from "react";
import { http } from "../../service/http";
import type {
  ApiEnvelope,
  CambiarEtapaPayload,
  CrearOportunidadPayload,
  CrearSeguimientoPayload,
  EditarOportunidadPayload,
  EtapaOportunidadVenta,
  FiltrosOportunidad,
  OportunidadDetalle,
  OportunidadFunnelItem,
} from "../modals-funnel/types";
import { getOportunidadErrorMessage } from "../modals-funnel/utils";

export function useOportunidadesFunnel() {
  const [funnel, setFunnel] = useState<OportunidadFunnelItem[]>([]);
  const [loadingFunnel, setLoadingFunnel] = useState(false);
  const [errorFunnel, setErrorFunnel] = useState<string | null>(null);

  const [filtros, setFiltros] = useState<FiltrosOportunidad>({});

  const [detalle, setDetalle] = useState<OportunidadDetalle | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);

  // Se mantiene sincronizado con `detalle` para poder consultarlo desde callbacks
  // (cambiarEtapa) sin depender de él y sin arrastrar closures desactualizadas.
  const detalleIdRef = useRef<number | null>(null);
  useEffect(() => {
    detalleIdRef.current = detalle?.id ?? null;
  }, [detalle]);

  const [guardando, setGuardando] = useState(false);

  const fetchFunnel = useCallback(async () => {
    setLoadingFunnel(true);
    setErrorFunnel(null);
    try {
      const params: Record<string, string | number> = {};
      if (filtros.texto) params.texto = filtros.texto;
      if (filtros.responsableId) params.responsableId = filtros.responsableId;
      if (filtros.prioridad) params.prioridad = filtros.prioridad;
      if (filtros.entidadId) params.entidadId = filtros.entidadId;
      if (filtros.etapa) params.etapa = filtros.etapa;

      const res = await http.get<ApiEnvelope<OportunidadFunnelItem[]>>("/oportunidades/funnel", { params });
      setFunnel(res.data.data ?? []);
    } catch (err) {
      setErrorFunnel(getOportunidadErrorMessage(err, "No se pudo cargar el funnel de oportunidades."));
    } finally {
      setLoadingFunnel(false);
    }
  }, [filtros.texto, filtros.responsableId, filtros.prioridad, filtros.entidadId, filtros.etapa]);

  // Debounce (mismo patrón que Cotizaciones.tsx) para no disparar una request por cada tecla.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchFunnel();
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.texto, filtros.responsableId, filtros.prioridad, filtros.entidadId, filtros.etapa]);

  // El funnel puede quedar desactualizado si el usuario modifica cotizaciones
  // desde otra pestaña/módulo (ej. eliminar una cotización en Cotizaciones.tsx).
  // Se refresca al recuperar el foco/visibilidad de la pestaña, mismo patrón que
  // usan librerías de data-fetching (refetch-on-window-focus).
  useEffect(() => {
    function handleFocus() {
      if (document.visibilityState === "visible") fetchFunnel();
    }
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [fetchFunnel]);

  const fetchDetalle = useCallback(async (id: number) => {
    setLoadingDetalle(true);
    setErrorDetalle(null);
    try {
      const res = await http.get<ApiEnvelope<OportunidadDetalle>>(`/oportunidades/${id}`);
      setDetalle(res.data.data);
      return res.data.data;
    } catch (err) {
      setErrorDetalle(getOportunidadErrorMessage(err, "No se pudo cargar el detalle de la oportunidad."));
      return null;
    } finally {
      setLoadingDetalle(false);
    }
  }, []);

  const crearOportunidad = useCallback(async (payload: CrearOportunidadPayload) => {
    setGuardando(true);
    try {
      const res = await http.post<ApiEnvelope<OportunidadDetalle>>("/oportunidades", payload);
      await fetchFunnel();
      return res.data.data;
    } finally {
      setGuardando(false);
    }
  }, [fetchFunnel]);

  const editarOportunidad = useCallback(async (id: number, payload: EditarOportunidadPayload) => {
    setGuardando(true);
    try {
      const res = await http.patch<ApiEnvelope<OportunidadDetalle>>(`/oportunidades/${id}`, payload);
      // El PATCH devuelve la oportunidad "plana" (sin cotizaciones/seguimientos/historial).
      // Se recarga el detalle completo por GET para no perder esas relaciones en el estado.
      await Promise.all([fetchDetalle(id), fetchFunnel()]);
      return res.data.data;
    } finally {
      setGuardando(false);
    }
  }, [fetchDetalle, fetchFunnel]);

  const limpiarDetalle = useCallback(() => {
    setDetalle(null);
    setErrorDetalle(null);
  }, []);

  /* =========================================================
     Movimiento optimista entre columnas / reordenamiento
     Guarda un snapshot del funnel antes de mutar localmente,
     para poder revertir si el backend responde con error.
  ========================================================= */
  const snapshotRef = useRef<OportunidadFunnelItem[] | null>(null);

  const guardarSnapshot = useCallback(() => {
    snapshotRef.current = funnel;
  }, [funnel]);

  const revertirSnapshot = useCallback(() => {
    if (snapshotRef.current) setFunnel(snapshotRef.current);
    snapshotRef.current = null;
  }, []);

  // Mueve localmente una oportunidad a otra etapa (al final de la columna destino)
  const moverLocalAEtapa = useCallback((id: number, etapaDestino: EtapaOportunidadVenta) => {
    setFunnel((prev) => {
      const maxOrdenDestino = Math.max(
        -1,
        ...prev.filter((o) => o.etapa === etapaDestino && o.id !== id).map((o) => o.orden)
      );
      return prev.map((o) => (o.id === id ? { ...o, etapa: etapaDestino, orden: maxOrdenDestino + 1 } : o));
    });
  }, []);

  // Reordena localmente dentro de la misma columna, insertando en la posición dada
  const reordenarLocal = useCallback((id: number, nuevoIndice: number) => {
    setFunnel((prev) => {
      const item = prev.find((o) => o.id === id);
      if (!item) return prev;
      const columna = prev.filter((o) => o.etapa === item.etapa && o.id !== id).sort((a, b) => a.orden - b.orden);
      const posicion = Math.max(0, Math.min(nuevoIndice, columna.length));
      columna.splice(posicion, 0, item);
      const ordenPorId = new Map(columna.map((o, idx) => [o.id, idx]));
      return prev.map((o) => (o.etapa === item.etapa ? { ...o, orden: ordenPorId.get(o.id) ?? o.orden } : o));
    });
  }, []);

  // Cambia de etapa: optimista + llamada real + revert en error. Lanza el error para que
  // el llamador (FunnelBoard/Funnel.tsx) pueda mostrar el mensaje exacto de negocio (409, etc).
  const cambiarEtapa = useCallback(
    async (id: number, payload: CambiarEtapaPayload, opts?: { optimista?: boolean }) => {
      const optimista = opts?.optimista ?? true;
      if (optimista) {
        guardarSnapshot();
        moverLocalAEtapa(id, payload.etapa);
      }
      try {
        const res = await http.patch<ApiEnvelope<OportunidadDetalle>>(`/oportunidades/${id}/etapa`, payload);
        snapshotRef.current = null;
        // El PATCH devuelve la oportunidad "plana" (sin cotizaciones/seguimientos/historial).
        // Si el detalle abierto es justamente esta oportunidad, se recarga completo por GET
        // para no perder esas relaciones en el estado (evita crashear el detalle abierto).
        await Promise.all([fetchFunnel(), detalleIdRef.current === id ? fetchDetalle(id) : Promise.resolve()]);
        return res.data.data;
      } catch (err) {
        if (optimista) revertirSnapshot();
        throw err;
      }
    },
    [fetchFunnel, fetchDetalle, guardarSnapshot, moverLocalAEtapa, revertirSnapshot]
  );

  // Reordena dentro de la misma columna: optimista + llamada real + revert en error.
  const reordenar = useCallback(
    async (id: number, nuevoIndice: number) => {
      guardarSnapshot();
      reordenarLocal(id, nuevoIndice);
      try {
        await http.patch<ApiEnvelope<OportunidadFunnelItem>>(`/oportunidades/${id}/orden`, { orden: nuevoIndice });
        snapshotRef.current = null;
      } catch (err) {
        revertirSnapshot();
        throw err;
      }
    },
    [guardarSnapshot, reordenarLocal, revertirSnapshot]
  );

  /* =========================================================
     Seguimientos comerciales
  ========================================================= */
  const crearSeguimiento = useCallback(
    async (id: number, payload: CrearSeguimientoPayload) => {
      const res = await http.post<ApiEnvelope<unknown>>(`/oportunidades/${id}/seguimientos`, payload);
      await Promise.all([fetchDetalle(id), fetchFunnel()]);
      return res.data.data;
    },
    [fetchDetalle, fetchFunnel]
  );

  /* =========================================================
     Cotizaciones vinculadas
  ========================================================= */
  const vincularCotizacion = useCallback(
    async (id: number, cotizacionId: number) => {
      await http.post<ApiEnvelope<unknown>>(`/oportunidades/${id}/cotizaciones/${cotizacionId}`);
      await Promise.all([fetchDetalle(id), fetchFunnel()]);
    },
    [fetchDetalle, fetchFunnel]
  );

  const desvincularCotizacion = useCallback(
    async (id: number, cotizacionId: number) => {
      await http.delete<ApiEnvelope<unknown>>(`/oportunidades/${id}/cotizaciones/${cotizacionId}`);
      await Promise.all([fetchDetalle(id), fetchFunnel()]);
    },
    [fetchDetalle, fetchFunnel]
  );

  /* =========================================================
     Soft delete
  ========================================================= */
  const desactivarOportunidad = useCallback(
    async (id: number) => {
      await http.delete(`/oportunidades/${id}`);
      setFunnel((prev) => prev.filter((o) => o.id !== id));
      setDetalle(null);
    },
    []
  );

  return {
    funnel,
    loadingFunnel,
    errorFunnel,
    filtros,
    setFiltros,
    fetchFunnel,

    detalle,
    loadingDetalle,
    errorDetalle,
    fetchDetalle,
    limpiarDetalle,

    guardando,
    crearOportunidad,
    editarOportunidad,

    cambiarEtapa,
    reordenar,

    crearSeguimiento,
    vincularCotizacion,
    desvincularCotizacion,
    desactivarOportunidad,
  };
}
