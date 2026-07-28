import { useEffect, useMemo, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Form, InputNumber, Button, type FormInstance } from "antd";
import { Loader2, MapPin, Search } from "lucide-react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvent } from "react-leaflet";
import type { LeafletEvent, Marker as LeafletMarker } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type LatLng = { lat: number; lng: number };

const DEFAULT_CENTER: LatLng = { lat: -33.4489, lng: -70.6693 }; // Santiago
const GEOCODE_DEBOUNCE_MS = 1200;
const GEOCODE_MIN_LENGTH = 6;

function roundCoord(value: number) {
  return Math.round(value * 1e6) / 1e6;
}

// Acepta number, string numérica, null o undefined sin producir NaN ni convertir
// "" / null en 0 (Number("") === 0 es la trampa clásica que se evita aquí).
function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function esCoordenadaValida(lat: number, lng: number) {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

// Mismo servicio (Nominatim/OSM) ya usado en VisitaDetailModal.tsx para reverse-geocoding;
// aquí se usa la búsqueda directa (texto -> coordenadas aproximadas).
async function geocodeDireccion(direccion: string, signal: AbortSignal): Promise<LatLng | null> {
  try {
    const query = `${direccion}, Chile`;
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=cl&q=${encodeURIComponent(query)}`,
      { signal }
    );

    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const lat = toFiniteNumber(data[0]?.lat);
    const lng = toFiniteNumber(data[0]?.lon);
    if (lat === null || lng === null) return null;
    if (!esCoordenadaValida(lat, lng)) return null;

    return { lat, lng };
  } catch {
    // Incluye AbortError (cancelación intencional) y errores de red: en ambos casos
    // el llamador simplemente no aplica ningún resultado.
    return null;
  }
}

const PIN_ICON = L.divIcon({
  html: renderToStaticMarkup(
    <div
      style={{
        width: 32,
        height: 32,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "9999px",
        background: "#ffffff",
        border: "2px solid #0891b2",
        boxShadow: "0 2px 6px rgba(15,23,42,0.35)",
      }}
    >
      <MapPin size={18} color="#0891b2" fill="#0891b2" />
    </div>
  ),
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

function ClickToPlace({ onPlace }: { onPlace: (value: LatLng) => void }) {
  useMapEvent("click", (event) => {
    onPlace({ lat: event.latlng.lat, lng: event.latlng.lng });
  });
  return null;
}

function RecenterOnValue({ value }: { value: LatLng | null }) {
  const map = useMap();

  useEffect(() => {
    if (!value) return;
    map.setView(value, Math.max(map.getZoom(), 15));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng]);

  return null;
}

// Ant Design Modal/Drawer puede montar el mapa con el contenedor recién medido
// (transición de entrada, tabs, etc.). invalidateSize() de respaldo evita que
// quede gris o con el tile-grid mal calculado.
function InvalidateSizeOnMount() {
  const map = useMap();

  useEffect(() => {
    const raf = requestAnimationFrame(() => map.invalidateSize());
    const timeout = window.setTimeout(() => map.invalidateSize(), 350);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timeout);
    };
  }, [map]);

  return null;
}

/**
 * Selector de coordenadas embebido en un Form de Ant Design: lee/escribe los
 * campos "latitud"/"longitud"/"direccion" del form directamente, para que el
 * submit existente (que envía `values` tal cual al backend) no necesite cambios.
 *
 * Al escribir la dirección, busca una ubicación aproximada en Nominatim (con
 * debounce) y coloca el pin ahí. Apenas el usuario toma control manual (clic,
 * arrastre, o el botón "Buscar dirección"), la búsqueda automática deja de
 * mover el pin por su cuenta — solo una nueva pulsación del botón puede
 * reposicionarlo desde ese momento.
 */
export default function CoordinatesMapPicker({
  form,
  height = 220,
}: {
  form: FormInstance;
  height?: number;
}) {
  const latitudRaw = Form.useWatch("latitud", form);
  const longitudRaw = Form.useWatch("longitud", form);
  const direccionRaw = Form.useWatch("direccion", form);

  const [buscando, setBuscando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const hasManualAdjustmentRef = useRef(false);
  const debounceRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const isMountedRef = useRef(true);
  const initialSnapshotRef = useRef<{ direccion: string | null; hadCoords: boolean } | null>(null);

  const direccion = typeof direccionRaw === "string" ? direccionRaw : "";

  const value: LatLng | null = useMemo(() => {
    const lat = toFiniteNumber(latitudRaw);
    const lng = toFiniteNumber(longitudRaw);
    return lat !== null && lng !== null ? { lat, lng } : null;
  }, [latitudRaw, longitudRaw]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      abortRef.current?.abort();
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  // Foto inicial (una sola vez, apenas el form tiene datos reales cargados): permite
  // distinguir "recién abrí un registro que ya tenía coordenadas" de "el usuario
  // realmente cambió la dirección" — así no se re-geocodifica ni se pisa un dato
  // bueno solo por abrir el formulario de edición.
  useEffect(() => {
    if (initialSnapshotRef.current) return;
    if (direccionRaw === undefined && latitudRaw === undefined && longitudRaw === undefined) return;

    initialSnapshotRef.current = {
      direccion,
      hadCoords: value !== null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direccionRaw, latitudRaw, longitudRaw]);

  const aplicarPosicion = (next: LatLng) => {
    form.setFieldsValue({
      latitud: roundCoord(next.lat),
      longitud: roundCoord(next.lng),
    });
  };

  const handleManualChange = (next: LatLng) => {
    hasManualAdjustmentRef.current = true;
    setMensaje(null);
    aplicarPosicion(next);
  };

  const buscarAproximado = async (direccionTexto: string, opts: { manual?: boolean } = {}) => {
    const texto = direccionTexto.trim();
    if (!texto) return;

    // El botón manual toma el control de inmediato (incluso si la búsqueda falla o
    // no encuentra resultados) — a partir de aquí el usuario queda a cargo del pin.
    if (opts.manual) {
      hasManualAdjustmentRef.current = true;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;

    setBuscando(true);
    setMensaje(null);

    const resultado = await geocodeDireccion(texto, controller.signal);

    // Ignorar respuestas obsoletas (superadas por una búsqueda más nueva) o que
    // llegan después de desmontar el componente.
    if (!isMountedRef.current || requestId !== requestIdRef.current) return;

    setBuscando(false);

    if (!resultado) {
      setMensaje("No se encontró la dirección automáticamente. Ubica el pin manualmente.");
      return;
    }

    aplicarPosicion(resultado);
    setMensaje("Ubicación aproximada — ajusta el pin arrastrándolo si no queda exacta.");
  };

  // Búsqueda automática (con debounce) mientras el usuario no haya tomado control manual.
  useEffect(() => {
    if (hasManualAdjustmentRef.current) return;
    if (direccion.trim().length < GEOCODE_MIN_LENGTH) return;

    const snapshot = initialSnapshotRef.current;
    const siguemIgualQueAlAbrir = snapshot != null && direccion === snapshot.direccion;

    // Si el registro ya tenía coordenadas y la dirección no ha cambiado desde que
    // se abrió el formulario, no re-geocodificar solo por haber abierto a editar.
    if (snapshot?.hadCoords && siguemIgualQueAlAbrir) return;

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      buscarAproximado(direccion);
    }, GEOCODE_DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direccion]);

  return (
    <div>
      <div style={{ height }} className="overflow-hidden rounded-xl border border-slate-200">
        <MapContainer
          center={value ?? DEFAULT_CENTER}
          zoom={value ? 15 : 11}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <InvalidateSizeOnMount />
          <ClickToPlace onPlace={handleManualChange} />
          <RecenterOnValue value={value} />
          {value && (
            <Marker
              position={value}
              icon={PIN_ICON}
              draggable
              eventHandlers={{
                dragend: (event: LeafletEvent) => {
                  const marker = event.target as LeafletMarker;
                  const position = marker.getLatLng();
                  handleManualChange({ lat: position.lat, lng: position.lng });
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      <div className="mt-2 flex items-start justify-between gap-3">
        <p className="text-xs text-slate-500">
          La ubicación aproximada se busca sola al escribir la dirección. Clic en el mapa o
          arrastra el pin para ajustarla con precisión.
        </p>
        <Button
          size="small"
          icon={buscando ? <Loader2 className="animate-spin" size={14} /> : <Search size={14} />}
          onClick={() => buscarAproximado(direccion, { manual: true })}
          disabled={buscando || !direccion.trim()}
        >
          Buscar dirección
        </Button>
      </div>

      {mensaje && <p className="mt-1 text-xs text-amber-600">{mensaje}</p>}

      <div className="mt-2 grid grid-cols-2 gap-3">
        <Form.Item
          name="latitud"
          label="Latitud"
          className="mb-0"
          normalize={(val) => (val === "" ? null : val)}
        >
          <InputNumber
            className="w-full"
            step={0.000001}
            min={-90}
            max={90}
            placeholder="Ej: -33.448900"
            onChange={() => {
              hasManualAdjustmentRef.current = true;
              setMensaje(null);
            }}
          />
        </Form.Item>
        <Form.Item
          name="longitud"
          label="Longitud"
          className="mb-0"
          normalize={(val) => (val === "" ? null : val)}
        >
          <InputNumber
            className="w-full"
            step={0.000001}
            min={-180}
            max={180}
            placeholder="Ej: -70.669300"
            onChange={() => {
              hasManualAdjustmentRef.current = true;
              setMensaje(null);
            }}
          />
        </Form.Item>
      </div>
    </div>
  );
}
