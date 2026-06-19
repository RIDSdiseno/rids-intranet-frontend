import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Clock,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react";
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
  estadoAgenda?: string | null;
  latitud: number;
  longitud: number;
  precision?: number | null;
  velocidad?: number | null;
  estadoTracking: string;
  createdAt: string;
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

function getEstadoColor(value?: string | null) {
  const estado = String(value ?? "").toUpperCase();

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

function getOsmUrl(ubicacion: UbicacionTecnico) {
  const lat = ubicacion.latitud;
  const lng = ubicacion.longitud;
  const delta = 0.008;
  const bbox = [
    lng - delta,
    lat - delta,
    lng + delta,
    lat + delta,
  ].join(",");

  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

function buildMarkerPositions(ubicaciones: UbicacionTecnico[]) {
  if (ubicaciones.length === 0) return [];

  const lats = ubicaciones.map((item) => item.latitud);
  const lngs = ubicaciones.map((item) => item.longitud);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latRange = Math.max(maxLat - minLat, 0.0001);
  const lngRange = Math.max(maxLng - minLng, 0.0001);

  return ubicaciones.map((item) => ({
    item,
    left: 8 + ((item.longitud - minLng) / lngRange) * 84,
    top: 92 - ((item.latitud - minLat) / latRange) * 84,
  }));
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
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const cargarUbicaciones = useCallback(async (silent = false) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);
      const { data } = await api.get<UbicacionTecnico[]>("/ubicaciones/tecnicos");
      setUbicaciones(Array.isArray(data) ? data : []);
      setLastRefresh(new Date());

      if (!selectedId && data?.[0]?.tecnicoId) {
        setSelectedId(data[0].tecnicoId);
      }
    } catch (err: any) {
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
    }
  }, [selectedId]);

  useEffect(() => {
    cargarUbicaciones(false);
  }, [cargarUbicaciones]);

  useEffect(() => {
    const id = window.setInterval(() => {
      cargarUbicaciones(true);
    }, POLLING_MS);

    return () => window.clearInterval(id);
  }, [cargarUbicaciones]);

  const estadosDisponibles = useMemo(() => {
    const estados = new Set(ubicaciones.map((item) => item.estadoTracking).filter(Boolean));
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

      const matchEstado = estado === "TODOS" || item.estadoTracking === estado;

      return matchText && matchEstado;
    });

    return ordenarPorSenalYFecha(result);
  }, [ubicaciones, search, estado]);

  const selected =
    filtradas.find((item) => item.tecnicoId === selectedId) ??
    filtradas[0] ??
    null;

  const markerPositions = useMemo(() => buildMarkerPositions(filtradas), [filtradas]);

  const totalEnRuta = ubicaciones.filter((item) =>
    String(item.estadoTracking ?? "").toUpperCase().includes("EN_RUTA")
  ).length;

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
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
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

            <button
              onClick={() => cargarUbicaciones(true)}
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
              Actualización automática cada 45 segundos
            </span>
            {lastRefresh && <span>Última actualización del panel: {formatHora(lastRefresh.toISOString())}</span>}
          </div>
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
                  {filtradas.length} marcador{filtradas.length === 1 ? "" : "es"} según filtros actuales
                </p>
              </div>

              <div className="relative h-[460px] overflow-hidden bg-slate-100">
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,0.18)_1px,transparent_1px),linear-gradient(rgba(148,163,184,0.18)_1px,transparent_1px)] bg-[size:52px_52px]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,0.18),transparent_30%),radial-gradient(circle_at_80%_70%,rgba(16,185,129,0.16),transparent_32%)]" />
                {markerPositions.map(({ item, left, top }) => {
                  const isSelected = selected?.tecnicoId === item.tecnicoId;
                  const signalClass = getEstadoSenal(item.createdAt) === "ACTIVO"
                    ? "text-emerald-600"
                    : getEstadoSenal(item.createdAt) === "RECIENTE"
                      ? "text-amber-600"
                      : "text-rose-600";

                  return (
                    <button
                      key={item.tecnicoId}
                      onClick={() => setSelectedId(item.tecnicoId)}
                      className={`absolute -translate-x-1/2 -translate-y-full rounded-full border-2 bg-white p-2 shadow-lg transition hover:scale-110 ${
                        isSelected ? "border-cyan-500 ring-4 ring-cyan-100" : "border-white"
                      }`}
                      style={{ left: `${left}%`, top: `${top}%` }}
                      type="button"
                      title={`${item.tecnicoNombre} - ${getSenalLabel(item.createdAt)} - ${formatRelativo(item.createdAt)}`}
                    >
                      <MapPin className={signalClass} size={22} fill="currentColor" />
                    </button>
                  );
                })}
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
                          {formatEstado(selected.estadoTracking)}
                        </span>
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
                  <iframe
                    title={`Mapa de ${selected.tecnicoNombre}`}
                    src={getOsmUrl(selected)}
                    className="h-72 w-full rounded-xl border border-slate-200"
                    loading="lazy"
                  />
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
                    onClick={() => setSelectedId(item.tecnicoId)}
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
