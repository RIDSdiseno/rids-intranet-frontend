import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AlertCircle,
  Building2,
  Clock,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvent } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { api } from "../api/api";

type UbicacionTecnico = {
  tecnicoId: number;
  tecnicoNombre: string;
  tecnicoEmail?: string | null;
  agendaId?: number | null;
  empresa?: string | null;
  direccion?: string | null;
  fechaProgramada?: string | null;
  horaProgramada?: string | null;
  fechaInicioRuta?: string | null;
  fechaInicioVisita?: string | null;
  estadoAgenda?: string | null;
  latitud: number;
  longitud: number;
  precision?: number | null;
  velocidad?: number | null;
  estadoTracking: string;
  createdAt: string;
};

type DestinoTipo =
  | "EMPRESA_PRINCIPAL"
  | "SUCURSAL_UNICA"
  | "SIN_COORDENADAS"
  | "MULTIPLES_SUCURSALES";

type DestinoAgenda = {
  tipo: DestinoTipo;
  sucursalId: number | null;
  nombre: string | null;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  coordenadasDisponibles: boolean;
  tieneMultiplesSucursales: boolean;
};

type AgendaMapa = {
  agendaId: number;
  fecha: string;
  estado: string;
  horaInicio?: string | null;
  horaFin?: string | null;
  empresa: { id: number; nombre: string } | null;
  empresaExternaNombre?: string | null;
  destino: DestinoAgenda | null;
  tecnicos: { id: number; nombre: string }[];
};

const POLLING_MS = 45_000;
const MINUTO_MS = 60_000;

type EstadoSenal = "ACTIVO" | "RECIENTE" | "SIN_SEÑAL";

function getDiffMinutes(value?: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / MINUTO_MS));
}

function getEstadoSenal(value?: string | null): EstadoSenal {
  const minutes = getDiffMinutes(value);

  if (minutes <= 5) return "ACTIVO";
  if (minutes <= 15) return "RECIENTE";
  return "SIN_SEÑAL";
}

function getSenalLabel(value?: string | null) {
  return getEstadoSenal(value).replace("_", " ");
}

function getSenalColor(value?: string | null) {
  const estado = getEstadoSenal(value);

  if (estado === "ACTIVO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (estado === "RECIENTE") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
}

function formatFechaHora(value?: string | null) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(date);
}

function formatHora(value?: string | null) {
  if (!value) return "--:--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--:--";

  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatRelativo(value?: string | null) {
  const minutes = getDiffMinutes(value);

  if (!Number.isFinite(minutes)) return "sin información";
  if (minutes < 1) return "hace menos de 1 min";
  if (minutes === 1) return "hace 1 min";
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "hace 1 hora";
  if (hours < 24) return `hace ${hours} horas`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "hace 1 día";
  return `hace ${days} días`;
}

function formatVelocidad(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "Sin dato";
  const kmh = value * 3.6;
  return `${kmh.toFixed(kmh >= 10 ? 0 : 1)} km/h`;
}

function formatPrecision(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "Sin dato";
  return `${Math.round(value)} m`;
}

function formatEstado(value?: string | null) {
  return String(value ?? "SIN_ESTADO").replace(/_/g, " ");
}

function getEstadoOperativo(item: UbicacionTecnico) {
  return item.estadoAgenda ?? item.estadoTracking;
}

function getEstadoColor(value?: string | null) {
  const estado = String(value ?? "").toUpperCase();

  if (estado.includes("INICIADA")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (estado.includes("EN_RUTA")) {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }

  if (estado.includes("VISITA") || estado.includes("JORNADA")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }

  if (estado.includes("DETENIDO") || estado.includes("FINALIZ")) {
    return "bg-slate-50 text-slate-600 border-slate-200";
  }

  return "bg-amber-50 text-amber-700 border-amber-200";
}

const SENAL_COLORS: Record<EstadoSenal, string> = {
  ACTIVO: "#059669",
  RECIENTE: "#d97706",
  SIN_SEÑAL: "#e11d48",
};

// Colores de "estado de agenda" para destinos: deliberadamente distintos de SENAL_COLORS
// (verde/ámbar/rojo de señal GPS) para no confundir ambos sistemas en el mismo mapa.
const DESTINO_COLORS: Record<string, string> = {
  PROGRAMADA: "#64748b",
  NOTIFICADA: "#64748b",
  EN_RUTA: "#2563eb",
  INICIADA: "#9333ea",
  COMPLETADA: "#15803d",
  CANCELADA: "#cbd5e1",
};

function getDestinoColor(estado: string) {
  return DESTINO_COLORS[estado] ?? "#64748b";
}

// Prioridad para decidir el color/estado representativo del marcador agrupado
// cuando conviven varias agendas/técnicos en el mismo destino físico.
// Solo afecta el color del marcador: el popup siempre muestra el estado real
// de cada agenda individual, sin alterarlo.
// INICIADA primero porque significa que la atención ya comenzó (más urgente
// que EN_RUTA, donde el técnico todavía va en camino).
const ESTADO_PRIORIDAD: Record<string, number> = {
  INICIADA: 0,
  EN_RUTA: 1,
  NOTIFICADA: 2,
  PROGRAMADA: 3,
  COMPLETADA: 4,
  CANCELADA: 5,
};

function getEstadoMasPrioritario(estados: string[]): string {
  return (
    [...estados].sort(
      (a, b) => (ESTADO_PRIORIDAD[a] ?? 9) - (ESTADO_PRIORIDAD[b] ?? 9)
    )[0] ?? "PROGRAMADA"
  );
}

type DestinoGrupo = {
  key: string;
  latitud: number;
  longitud: number;
  nombre: string | null;
  direccion: string | null;
  tieneMultiplesSucursales: boolean;
  estadoPrincipal: string;
  agendas: AgendaMapa[];
};

function esParCoordenadasValido(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

// Normaliza el texto de una dirección SOLO para construir la clave de
// agrupación (nunca se usa ni se muestra este valor normalizado al usuario).
function normalizarDireccionParaClave(direccion: string): string {
  return direccion
    .toLowerCase()
    .trim()
    .replace(/[.,;:]/g, "")
    .replace(/\s+/g, " ");
}

// Clave de agrupación: un mismo destino físico comparte un único marcador,
// aunque tenga varias agendas o técnicos distintos ese día. Prioridad:
//   1. SUCURSAL:{sucursalId}              — máxima confianza (misma fila).
//   2. EMPRESA:{empresaId}:PRINCIPAL      — misma "ubicación principal".
//   3. COORD:{lat6}:{lng6}                — coordenada redondeada a 6 decimales
//      (respaldo si no hay sucursal ni tipo EMPRESA_PRINCIPAL claro).
//   4. EMPRESA:{empresaId}:DIRECCION:...  — dirección de texto normalizada,
//      último respaldo para casos sin coordenada utilizable.
// Nunca se agrupa solo por nombre de empresa.
function getDestinoGroupKey(agenda: AgendaMapa): string | null {
  const destino = agenda.destino;
  if (!destino?.coordenadasDisponibles) return null;

  if (destino.sucursalId != null) {
    return `SUCURSAL:${destino.sucursalId}`;
  }

  if (agenda.empresa && destino.tipo === "EMPRESA_PRINCIPAL") {
    return `EMPRESA:${agenda.empresa.id}:PRINCIPAL`;
  }

  if (esParCoordenadasValido(destino.latitud, destino.longitud)) {
    const latKey = Number(destino.latitud).toFixed(6);
    const lngKey = Number(destino.longitud).toFixed(6);
    return `COORD:${latKey}:${lngKey}`;
  }

  if (agenda.empresa && destino.direccion) {
    return `EMPRESA:${agenda.empresa.id}:DIRECCION:${normalizarDireccionParaClave(destino.direccion)}`;
  }

  return null;
}

function agruparAgendasPorDestino(agendas: AgendaMapa[]): DestinoGrupo[] {
  const grupos = new Map<string, DestinoGrupo>();

  for (const agenda of agendas) {
    const key = getDestinoGroupKey(agenda);
    if (!key || !agenda.destino || agenda.destino.latitud == null || agenda.destino.longitud == null) {
      continue;
    }

    const existente = grupos.get(key);
    if (existente) {
      existente.agendas.push(agenda);
    } else {
      grupos.set(key, {
        key,
        latitud: agenda.destino.latitud,
        longitud: agenda.destino.longitud,
        nombre: agenda.destino.nombre,
        direccion: agenda.destino.direccion,
        tieneMultiplesSucursales: agenda.destino.tieneMultiplesSucursales,
        estadoPrincipal: agenda.estado,
        agendas: [agenda],
      });
    }
  }

  for (const grupo of grupos.values()) {
    grupo.estadoPrincipal = getEstadoMasPrioritario(grupo.agendas.map((a) => a.estado));
  }

  return Array.from(grupos.values());
}

function getFechaLocalHoy() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildTecnicoIcon(senal: EstadoSenal, selected: boolean) {
  const color = SENAL_COLORS[senal];
  const size = selected ? 40 : 32;

  const html = renderToStaticMarkup(
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "9999px",
        background: "#ffffff",
        border: selected ? "3px solid #06b6d4" : "2px solid #ffffff",
        boxShadow: selected
          ? "0 0 0 4px rgba(6,182,212,0.25), 0 4px 10px rgba(15,23,42,0.35)"
          : "0 2px 6px rgba(15,23,42,0.35)",
      }}
    >
      <MapPin size={selected ? 22 : 18} color={color} fill={color} />
    </div>
  );

  return L.divIcon({
    html,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

// Ícono de destino (empresa/sucursal agendada): forma cuadrada + Building2, deliberadamente
// distinto del círculo con MapPin de los técnicos para diferenciarlos de un vistazo.
function buildDestinoIcon(estado: string, selected: boolean) {
  const color = getDestinoColor(estado);
  const size = selected ? 38 : 30;

  const html = renderToStaticMarkup(
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "8px",
        background: "#ffffff",
        border: selected ? `3px solid ${color}` : `2px solid ${color}`,
        boxShadow: selected
          ? `0 0 0 4px ${color}33, 0 4px 10px rgba(15,23,42,0.35)`
          : "0 2px 6px rgba(15,23,42,0.35)",
      }}
    >
      <Building2 size={selected ? 20 : 16} color={color} />
    </div>
  );

  return L.divIcon({
    html,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

const TECNICO_ICON_CACHE: Record<string, L.DivIcon> = (() => {
  const cache: Record<string, L.DivIcon> = {};

  (Object.keys(SENAL_COLORS) as EstadoSenal[]).forEach((senal) => {
    cache[`${senal}_normal`] = buildTecnicoIcon(senal, false);
    cache[`${senal}_selected`] = buildTecnicoIcon(senal, true);
  });

  return cache;
})();

function getTecnicoIcon(senal: EstadoSenal, selected: boolean) {
  return TECNICO_ICON_CACHE[`${senal}_${selected ? "selected" : "normal"}`];
}

const DESTINO_ICON_CACHE: Record<string, L.DivIcon> = (() => {
  const cache: Record<string, L.DivIcon> = {};

  Object.keys(DESTINO_COLORS).forEach((estado) => {
    cache[`${estado}_normal`] = buildDestinoIcon(estado, false);
    cache[`${estado}_selected`] = buildDestinoIcon(estado, true);
  });

  return cache;
})();

function getDestinoIcon(estado: string, selected: boolean) {
  const key = `${estado}_${selected ? "selected" : "normal"}`;
  return DESTINO_ICON_CACHE[key] ?? buildDestinoIcon(estado, selected);
}

function MapFitBounds({
  positions,
  refitKey,
  userInteractedRef,
}: {
  positions: [number, number][];
  refitKey: string;
  userInteractedRef: React.MutableRefObject<boolean>;
}) {
  const map = useMap();
  const didFitOnce = useRef(false);
  const lastRefitKey = useRef(refitKey);

  useEffect(() => {
    const keyChanged = lastRefitKey.current !== refitKey;
    lastRefitKey.current = refitKey;

    if (positions.length === 0) return;

    const shouldFit = !didFitOnce.current || (keyChanged && !userInteractedRef.current);
    if (!shouldFit) return;

    didFitOnce.current = true;

    if (positions.length === 1) {
      map.setView(positions[0], 13);
      return;
    }

    map.fitBounds(L.latLngBounds(positions), { padding: [48, 48] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions, refitKey, map]);

  return null;
}

function MapFlyToSelected({
  selectedId,
  getPosition,
}: {
  selectedId: number | null;
  getPosition: (tecnicoId: number) => [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedId == null) return;
    const position = getPosition(selectedId);
    if (!position) return;

    map.flyTo(position, Math.max(map.getZoom(), 14), { duration: 0.6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return null;
}

function MapInteractionTracker({ onInteract }: { onInteract: () => void }) {
  useMapEvent("dragstart", onInteract);
  useMapEvent("zoomstart", onInteract);
  return null;
}

function MapRefBridge({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;
    return () => {
      if (mapRef.current === map) {
        mapRef.current = null;
      }
    };
  }, [map, mapRef]);

  return null;
}

function ordenarPorSenalYFecha(items: UbicacionTecnico[]) {
  const pesoSenal: Record<EstadoSenal, number> = {
    ACTIVO: 0,
    RECIENTE: 1,
    SIN_SEÑAL: 2,
  };

  return [...items].sort((a, b) => {
    const senalA = pesoSenal[getEstadoSenal(a.createdAt)];
    const senalB = pesoSenal[getEstadoSenal(b.createdAt)];

    if (senalA !== senalB) return senalA - senalB;

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export default function MapaTecnicosPage() {
  const [ubicaciones, setUbicaciones] = useState<UbicacionTecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("TODOS");
  const [selectedTecnicoId, setSelectedTecnicoId] = useState<number | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const [fechaSeleccionada, setFechaSeleccionada] = useState(getFechaLocalHoy);
  const [agendas, setAgendas] = useState<AgendaMapa[]>([]);
  const [agendasLoading, setAgendasLoading] = useState(true);
  const [agendasError, setAgendasError] = useState<string | null>(null);
  const [selectedDestinoKey, setSelectedDestinoKey] = useState<string | null>(null);

  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const agendasAbortRef = useRef<AbortController | null>(null);
  const agendasRequestIdRef = useRef(0);
  const userInteractedRef = useRef(false);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const cargarUbicaciones = useCallback(async (silent = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);
      const { data } = await api.get<UbicacionTecnico[]>("/ubicaciones/tecnicos", {
        signal: controller.signal,
      });
      const lista = Array.isArray(data) ? data : [];
      setUbicaciones(lista);
      setLastRefresh(new Date());

      const primerTecnicoId = lista[0]?.tecnicoId ?? null;
      setSelectedTecnicoId((current) => current ?? primerTecnicoId);
    } catch (err: any) {
      if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") {
        return;
      }

      const status = err?.response?.status;
      const message = status === 403
        ? "No tienes permisos para ver el mapa de técnicos. Este módulo es solo para ADMINISTRACION."
        : err?.response?.data?.message ??
          err?.response?.data?.error ??
          "No se pudieron cargar las ubicaciones de tecnicos";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    cargarUbicaciones(false);
  }, [cargarUbicaciones]);

  useEffect(() => {
    let intervalId: number | null = null;

    const startPolling = () => {
      if (intervalId != null) return;
      intervalId = window.setInterval(() => {
        cargarUbicaciones(true);
      }, POLLING_MS);
    };

    const stopPolling = () => {
      if (intervalId != null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
        return;
      }

      cargarUbicaciones(true);
      stopPolling();
      startPolling();
    };

    if (!document.hidden) {
      startPolling();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopPolling();
      abortControllerRef.current?.abort();
    };
  }, [cargarUbicaciones]);

  // Carga de agendas del mapa: endpoint y ciclo de vida totalmente separados del
  // polling GPS de arriba (no comparte intervalo, no se dispara cada 45s).
  const cargarAgendas = useCallback(async (fecha: string) => {
    agendasAbortRef.current?.abort();
    const controller = new AbortController();
    agendasAbortRef.current = controller;
    const requestId = ++agendasRequestIdRef.current;

    setAgendasLoading(true);
    setAgendasError(null);

    try {
      const { data } = await api.get<AgendaMapa[]>("/mapa/agendas", {
        params: { fecha },
        signal: controller.signal,
      });

      if (requestId !== agendasRequestIdRef.current) return;
      setAgendas(Array.isArray(data) ? data : []);
    } catch (err: any) {
      if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") return;
      if (requestId !== agendasRequestIdRef.current) return;

      const status = err?.response?.status;
      const message = status === 403
        ? "No tienes permisos para ver las agendas del mapa."
        : err?.response?.data?.message ?? "No se pudieron cargar las agendas del mapa";
      setAgendasError(message);
      setAgendas([]);
    } finally {
      if (requestId === agendasRequestIdRef.current) {
        setAgendasLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    cargarAgendas(fechaSeleccionada);
  }, [fechaSeleccionada, cargarAgendas]);

  useEffect(() => {
    return () => {
      agendasAbortRef.current?.abort();
    };
  }, []);

  const markInteracted = useCallback(() => {
    userInteractedRef.current = true;
  }, []);

  const estadosDisponibles = useMemo(() => {
    const estados = new Set(
      ubicaciones
        .flatMap((item) => [item.estadoTracking, item.estadoAgenda])
        .filter(Boolean)
    );
    return Array.from(estados).sort();
  }, [ubicaciones]);

  const filtradas = useMemo(() => {
    const text = search.trim().toLowerCase();

    const result = ubicaciones.filter((item) => {
      const matchText =
        !text ||
        item.tecnicoNombre.toLowerCase().includes(text) ||
        String(item.empresa ?? "").toLowerCase().includes(text) ||
        String(item.direccion ?? "").toLowerCase().includes(text);

      const matchEstado =
        estado === "TODOS" ||
        item.estadoTracking === estado ||
        item.estadoAgenda === estado;

      return matchText && matchEstado;
    });

    return ordenarPorSenalYFecha(result);
  }, [ubicaciones, search, estado]);

  const selected =
    filtradas.find((item) => item.tecnicoId === selectedTecnicoId) ??
    filtradas[0] ??
    null;

  const positions = useMemo<[number, number][]>(
    () => filtradas.map((item) => [item.latitud, item.longitud]),
    [filtradas]
  );

  const filtradasRef = useRef<UbicacionTecnico[]>([]);
  useEffect(() => {
    filtradasRef.current = filtradas;
  }, [filtradas]);

  const destinosConCoordenadas = useMemo(
    () =>
      agendas.filter(
        (a): a is AgendaMapa & { destino: DestinoAgenda & { latitud: number; longitud: number } } =>
          Boolean(a.destino?.coordenadasDisponibles) &&
          a.destino?.latitud != null &&
          a.destino?.longitud != null
      ),
    [agendas]
  );

  const agendasSinCoordenadas = useMemo(
    () => agendas.filter((a) => !a.destino || !a.destino.coordenadasDisponibles),
    [agendas]
  );

  const agendasMultiplesSucursalesSinDestino = useMemo(
    () => agendas.filter((a) => a.destino?.tipo === "MULTIPLES_SUCURSALES"),
    [agendas]
  );

  // Un marcador por destino físico: varias agendas/técnicos en la misma sede
  // (misma sucursal, o la misma "ubicación principal" de una empresa) comparten uno solo.
  const destinoGrupos = useMemo(() => agruparAgendasPorDestino(agendas), [agendas]);

  const destinoPositions = useMemo<[number, number][]>(
    () => destinoGrupos.map((g) => [g.latitud, g.longitud]),
    [destinoGrupos]
  );

  const combinedPositions = useMemo<[number, number][]>(
    () => [...positions, ...destinoPositions],
    [positions, destinoPositions]
  );

  const handleVerTodos = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || combinedPositions.length === 0) return;

    if (combinedPositions.length === 1) {
      map.setView(combinedPositions[0], 13);
      return;
    }

    map.fitBounds(L.latLngBounds(combinedPositions), { padding: [48, 48] });
  }, [combinedPositions]);

  const totalEnRuta = ubicaciones.filter((item) => {
    const estadoOperativo = String(getEstadoOperativo(item) ?? "").toUpperCase();
    return estadoOperativo.includes("EN_RUTA");
  }).length;

  const totalActivos = ubicaciones.filter((item) => getEstadoSenal(item.createdAt) === "ACTIVO").length;
  const totalSinSenal = ubicaciones.filter((item) => getEstadoSenal(item.createdAt) === "SIN_SEÑAL").length;
  const sinDatos = ubicaciones.length === 0;
  const sinResultados = ubicaciones.length > 0 && filtradas.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-cyan-100 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-cyan-600">
                Supervisión en terreno
              </p>
              <h1 className="mt-1 text-3xl font-black text-slate-900 sm:text-4xl">
                Mapa de técnicos
              </h1>
              <p className="mt-2 max-w-3xl text-slate-600">
                Última ubicación conocida enviada por la app móvil en ruta o jornada.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-slate-500">Con ubicación</p>
                <p className="text-2xl font-black text-slate-900">{ubicaciones.length}</p>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-blue-600">En ruta</p>
                <p className="text-2xl font-black text-blue-700">{totalEnRuta}</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-emerald-600">Activos</p>
                <p className="text-2xl font-black text-emerald-700">{totalActivos}</p>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase text-rose-600">Sin señal reciente</p>
                <p className="text-2xl font-black text-rose-700">{totalSinSenal}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[1fr_200px_170px_auto]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-slate-800 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                placeholder="Buscar técnico, empresa o dirección"
                type="search"
              />
            </label>

            <select
              value={estado}
              onChange={(event) => setEstado(event.target.value)}
              className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-slate-800 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
            >
              <option value="TODOS">Todos los estados</option>
              {estadosDisponibles.map((item) => (
                <option key={item} value={item}>
                  {formatEstado(item)}
                </option>
              ))}
            </select>

            <label className="flex flex-col justify-center gap-1">
              <span className="text-xs font-semibold uppercase text-slate-500">Fecha de agendas</span>
              <input
                type="date"
                value={fechaSeleccionada}
                onChange={(event) => setFechaSeleccionada(event.target.value)}
                className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-slate-800 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
              />
            </label>

            <button
              onClick={() => {
                cargarUbicaciones(true);
                cargarAgendas(fechaSeleccionada);
              }}
              disabled={refreshing}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 font-semibold text-white shadow-sm transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-70"
              type="button"
            >
              {refreshing ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              Actualizar ahora
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Clock size={15} />
              Técnicos: actualización automática cada 45 segundos
            </span>
            {lastRefresh && <span>Última actualización del panel: {formatHora(lastRefresh.toISOString())}</span>}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
            <span className="font-semibold text-slate-700">Agendas del {fechaSeleccionada}:</span>
            <span>{agendas.length} totales</span>
            <span className="text-emerald-700">{destinosConCoordenadas.length} con destino visible</span>
            <span className="text-amber-700">{agendasSinCoordenadas.length} sin coordenadas</span>
            {agendasMultiplesSucursalesSinDestino.length > 0 && (
              <span className="text-rose-700">
                {agendasMultiplesSucursalesSinDestino.length} con varias sucursales sin destino único
              </span>
            )}
            {agendasLoading && <Loader2 className="animate-spin text-cyan-600" size={16} />}

            <button
              type="button"
              onClick={handleVerTodos}
              disabled={combinedPositions.length === 0}
              className="ml-auto rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-cyan-300 hover:text-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Ver todos
            </button>
          </div>

          {agendasError && <p className="mt-2 text-sm text-red-700">{agendasError}</p>}

          {agendasSinCoordenadas.length > 0 && (
            <details className="mt-3 text-sm text-slate-600">
              <summary className="cursor-pointer font-semibold text-slate-700">
                Ver agendas sin destino en el mapa
              </summary>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {agendasSinCoordenadas.map((item) => (
                  <li key={item.agendaId}>
                    {item.empresa?.nombre ?? item.empresaExternaNombre ?? "Sin empresa asociada"}
                    {" — "}
                    {formatEstado(item.estado)}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle className="mt-0.5 shrink-0" size={20} />
            <div>
              <p className="font-bold">Error al cargar ubicaciones</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-3 text-slate-600">
              <Loader2 className="animate-spin text-cyan-600" size={24} />
              Cargando ubicaciones...
            </div>
          </div>
        ) : filtradas.length === 0 ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <div>
              <LocateFixed className="mx-auto text-slate-400" size={42} />
              <h2 className="mt-4 text-xl font-bold text-slate-900">
                {sinDatos ? "Sin ubicaciones registradas" : "Sin resultados para los filtros"}
              </h2>
              <p className="mt-2 max-w-md text-slate-500">
                {sinResultados
                  ? "Prueba limpiar el buscador o cambia el estado seleccionado."
                  : "Aún no hay técnicos compartiendo ubicación desde la app móvil."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="text-lg font-bold text-slate-900">Ubicaciones activas</h2>
                <p className="text-sm text-slate-500">
                  {filtradas.length} técnico{filtradas.length === 1 ? "" : "s"} · {destinosConCoordenadas.length} destino{destinosConCoordenadas.length === 1 ? "" : "s"} agendado{destinosConCoordenadas.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="relative h-[460px] overflow-hidden bg-slate-100">
                <MapContainer
                  center={[-33.4489, -70.6693]}
                  zoom={11}
                  scrollWheelZoom
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <MapRefBridge mapRef={mapInstanceRef} />
                  <MapInteractionTracker onInteract={markInteracted} />
                  <MapFitBounds
                    positions={combinedPositions}
                    refitKey={fechaSeleccionada}
                    userInteractedRef={userInteractedRef}
                  />
                  <MapFlyToSelected
                    selectedId={selectedTecnicoId}
                    getPosition={(tecnicoId) => {
                      const item = filtradasRef.current.find((it) => it.tecnicoId === tecnicoId);
                      return item ? [item.latitud, item.longitud] : null;
                    }}
                  />

                  <MarkerClusterGroup chunkedLoading>
                    {filtradas.map((item) => {
                      const isSelected = selected?.tecnicoId === item.tecnicoId;
                      const senal = getEstadoSenal(item.createdAt);

                      return (
                        <Marker
                          key={item.tecnicoId}
                          position={[item.latitud, item.longitud]}
                          icon={getTecnicoIcon(senal, isSelected)}
                          eventHandlers={{
                            click: () => setSelectedTecnicoId(item.tecnicoId),
                          }}
                        >
                          <Popup>
                            <p className="font-bold text-slate-900">{item.tecnicoNombre}</p>
                            <p className="text-sm text-slate-600">
                              {item.empresa ?? "Sin visita asociada"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {getSenalLabel(item.createdAt)} · {formatRelativo(item.createdAt)}
                            </p>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MarkerClusterGroup>

                  <MarkerClusterGroup chunkedLoading>
                    {destinoGrupos.map((grupo) => {
                      const isSelected = selectedDestinoKey === grupo.key;

                      return (
                        <Marker
                          key={`destino-${grupo.key}`}
                          position={[grupo.latitud, grupo.longitud]}
                          icon={getDestinoIcon(grupo.estadoPrincipal, isSelected)}
                          eventHandlers={{
                            click: () => setSelectedDestinoKey(grupo.key),
                          }}
                        >
                          <Popup>
                            <div className="min-w-[220px]">
                              <p className="font-bold text-slate-900">
                                {grupo.nombre ?? "Ubicación principal"}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {grupo.direccion ?? "Sin dirección asociada"}
                              </p>
                              {grupo.tieneMultiplesSucursales && (
                                <p className="mt-1 text-xs font-semibold text-amber-600">
                                  Esta empresa tiene varias sucursales
                                </p>
                              )}

                              <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
                                {grupo.agendas.map((agenda) => (
                                  <div key={agenda.agendaId}>
                                    <p className="text-xs font-semibold text-slate-700">
                                      {agenda.empresa?.nombre ?? agenda.empresaExternaNombre ?? "Sin empresa asociada"}
                                      {" · "}
                                      {formatEstado(agenda.estado)}
                                    </p>
                                    {agenda.tecnicos.length > 0 ? (
                                      agenda.tecnicos.map((t) => (
                                        <p key={t.id} className="text-xs text-slate-500">
                                          {t.nombre} — {agenda.horaInicio ?? "--:--"}
                                          {agenda.horaFin ? ` a ${agenda.horaFin}` : ""}
                                        </p>
                                      ))
                                    ) : (
                                      <p className="text-xs text-slate-400">Sin técnicos asignados</p>
                                    )}
                                  </div>
                                ))}
                              </div>

                              <p className="mt-2 text-[10px] text-slate-400">
                                {grupo.agendas.length} agenda{grupo.agendas.length === 1 ? "" : "s"} · IDs:{" "}
                                {grupo.agendas.map((a) => a.agendaId).join(", ")}
                              </p>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MarkerClusterGroup>
                </MapContainer>

                <div className="pointer-events-none absolute bottom-3 left-3 z-[1000] rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur-sm">
                  <p className="mb-1 font-semibold text-slate-700">Técnicos: señal</p>
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: SENAL_COLORS.ACTIVO }}
                      />
                      Activo
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: SENAL_COLORS.RECIENTE }}
                      />
                      Reciente
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: SENAL_COLORS.SIN_SEÑAL }}
                      />
                      Sin señal
                    </span>
                  </div>
                </div>

                <div className="pointer-events-none absolute bottom-3 right-3 z-[1000] rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur-sm">
                  <p className="mb-1 font-semibold text-slate-700">Destinos: estado agenda</p>
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm" style={{ background: DESTINO_COLORS.PROGRAMADA }} />
                      Programada / Notificada
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm" style={{ background: DESTINO_COLORS.EN_RUTA }} />
                      En ruta
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm" style={{ background: DESTINO_COLORS.INICIADA }} />
                      Iniciada
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm" style={{ background: DESTINO_COLORS.COMPLETADA }} />
                      Completada
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-sm" style={{ background: DESTINO_COLORS.CANCELADA }} />
                      Cancelada
                    </span>
                  </div>
                </div>
              </div>

              {selected && (
                <div className="border-t border-slate-200 p-4">
                  <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Técnico seleccionado
                        </p>
                        <h3 className="mt-1 text-2xl font-black text-slate-900">
                          {selected.tecnicoNombre}
                        </h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {selected.empresa ?? "Sin visita asociada"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getEstadoColor(selected.estadoTracking)}`}>
                          Tracking: {formatEstado(selected.estadoTracking)}
                        </span>
                        {selected.estadoAgenda && (
                          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getEstadoColor(selected.estadoAgenda)}`}>
                            Agenda: {formatEstado(selected.estadoAgenda)}
                          </span>
                        )}
                        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getSenalColor(selected.createdAt)}`}>
                          {getSenalLabel(selected.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <p className="font-semibold text-slate-500">Dirección</p>
                        <p className="text-slate-900">{selected.direccion ?? "Sin dirección asociada"}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-500">Latitud</p>
                        <p className="font-mono text-slate-900">{selected.latitud.toFixed(6)}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-500">Longitud</p>
                        <p className="font-mono text-slate-900">{selected.longitud.toFixed(6)}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-500">Precisión</p>
                        <p className="text-slate-900">{formatPrecision(selected.precision)}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-500">Velocidad</p>
                        <p className="text-slate-900">{formatVelocidad(selected.velocidad)}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-500">Estado agenda</p>
                        <p className="text-slate-900">{formatEstado(selected.estadoAgenda)}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-slate-500">Última ubicación</p>
                        <p className="text-slate-900">{formatFechaHora(selected.createdAt)}</p>
                        <p className="text-xs text-slate-500">{formatRelativo(selected.createdAt)}</p>
                      </div>
                    </div>

                    <a
                      href={`https://www.google.com/maps?q=${selected.latitud},${selected.longitud}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-white px-3 py-2 text-sm font-semibold text-cyan-700 transition hover:bg-cyan-50"
                    >
                      <Navigation size={16} />
                      Abrir en Maps
                    </a>
                  </div>
                </div>
              )}
            </section>

            <aside className="space-y-3">
              {filtradas.map((item) => {
                const isSelected = selected?.tecnicoId === item.tecnicoId;
                const senal = getEstadoSenal(item.createdAt);

                return (
                  <button
                    key={item.tecnicoId}
                    onClick={() => setSelectedTecnicoId(item.tecnicoId)}
                    className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:border-cyan-300 hover:shadow-md ${
                      isSelected ? "border-cyan-400 ring-4 ring-cyan-100" : "border-slate-200"
                    }`}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700">
                          <UserRound size={21} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-lg font-black text-slate-900">
                            {item.tecnicoNombre}
                          </p>
                          <p className="truncate text-sm text-slate-500">
                            {item.empresa ?? "Sin visita asociada"}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getEstadoColor(item.estadoTracking)}`}>
                          {formatEstado(item.estadoTracking)}
                        </span>
                        {item.estadoAgenda && (
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getEstadoColor(item.estadoAgenda)}`}>
                            {formatEstado(item.estadoAgenda)}
                          </span>
                        )}
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${getSenalColor(item.createdAt)}`}>
                          {senal.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-slate-600">
                      <p className="flex gap-2">
                        <MapPin className="mt-0.5 shrink-0 text-slate-400" size={16} />
                        <span>{item.direccion ?? "Sin dirección asociada"}</span>
                      </p>
                      <p className="flex gap-2">
                        <Clock className="mt-0.5 shrink-0 text-slate-400" size={16} />
                        <span>
                          Última ubicación: {formatRelativo(item.createdAt)}
                          <span className="block text-xs text-slate-500">
                            {formatFechaHora(item.createdAt)}
                          </span>
                        </span>
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                        <span className="rounded-lg bg-slate-50 px-2 py-1">
                          Precisión: {formatPrecision(item.precision)}
                        </span>
                        <span className="rounded-lg bg-slate-50 px-2 py-1">
                          Velocidad: {formatVelocidad(item.velocidad)}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
