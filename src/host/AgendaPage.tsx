// src/host/AgendaPage.tsx
//
// ─── Dark mode: usa variables CSS de index.css ───────────────────────────────
//  Todos los colores inline anteriores (#0f172a, #64748b, "white", "#f8fafc",
//  etc.) fueron reemplazados por tokens del sistema.
//
//  FullCalendar dark mode se resuelve por CSS (ya cubierto en index.css con
//  las reglas .fc-*). El <style> de esta página añade solo los ajustes que
//  FullCalendar no expone via tokens y que necesitan tema-awareness.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Alert, Button, message, Modal, Spin, Popconfirm, AutoComplete } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import "dayjs/locale/es";
import type { AgendaVisita, Tecnico, Empresa, Sucursal } from "../components/modals-agenda/tiposAgenda";
import { getAgendaEstadoEventColor } from "../components/modals-agenda/tiposAgenda";
import { CrearVisitaManual } from "../components/modals-agenda/CrearVisitaManual";
import { EditarVisita } from "../components/modals-agenda/EditarVisita";
import { DiaAgenda } from "../components/modals-agenda/DiaAgenda";
import { CrearVisitaAutomatica } from "../components/modals-agenda/CrearVisitaAutomatica";
import { DetalleVisita } from "../components/modals-agenda/DetalleVisita";
import {
  getAgendaEmpresaNombreFromVisita,
  getAgendaEmpresaOptionLabel,
} from "../components/modals-agenda/agendaEmpresaLabel";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";

dayjs.locale("es");

/* ====================== Config ====================== */
type ViteEnv = { env?: { VITE_API_URL?: string } };
const API_URL =
  ((import.meta as unknown) as ViteEnv).env?.VITE_API_URL ||
  "http://localhost:4000/api";

/* ====================== Auth helpers ====================== */
function authHeaders(): HeadersInit {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/* ====================== Helpers ====================== */
function norm(s?: string | null): string {
  return (s ?? "").toLowerCase().trim();
}

function isPastVisita(visita: Pick<AgendaVisita, "fecha">): boolean {
  return dayjs(visita.fecha).startOf("day").isBefore(dayjs().startOf("day"));
}

function fmtHora(s?: string | null): string {
  return s ?? "";
}

function tecnicoColor(nombre?: string | null) {
  const key = norm(nombre);
  if (!key) {
    return {
      backgroundColor: "rgba(148,163,184,0.25)",
      borderColor: "#94a3b8",
      textColor: "var(--color-text-secondary)",
    };
  }
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hue = (hash >>> 0) % 360;
  return {
    backgroundColor: `hsl(${hue}, 55%, 32%)`,   // oscuro suficiente en dark, claro en light
    borderColor: `hsl(${hue}, 65%, 50%)`,
    textColor: `hsl(${hue}, 90%, 90%)`,
  };
}

async function errorMsg(res: Response, fallback: string): Promise<string> {
  try {
    const json = await res.json();
    if (typeof json?.error === "string") return json.error;
  } catch { /* ignore */ }
  return fallback;
}

/* ====================== Componente ====================== */
export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  const [visitas, setVisitas] = useState<AgendaVisita[]>([]);
  const [loading, setLoading] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [selectedEmpresaIds, setSelectedEmpresaIds] = useState<number[]>([]);
  const [includeOficina, setIncludeOficina] = useState(false);

  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleVisita, setDetalleVisita] = useState<AgendaVisita | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVisita, setSelectedVisita] = useState<AgendaVisita | null>(null);
  const [tecnicosDisponibles, setTecnicosDisponibles] = useState<Tecnico[]>([]);
  const [selectedTecnicos, setSelectedTecnicos] = useState<number[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number | null>(null);
  const [selectedSucursalId, setSelectedSucursalId] = useState<number | null>(null);
  // Solo se envía sucursalId al guardar si el usuario realmente lo tocó (o cambió
  // de empresa) en esta sesión de edición. Si no, se omite del PATCH para que el
  // backend preserve el snapshot existente — evita reenviar una sucursal histórica
  // que ya no existe (lo que rechazaría CUALQUIER guardado con 400, aunque el
  // cambio real fuera solo la hora o las notas).
  const selectedSucursalTouchedRef = useRef(false);
  const [selectedSucursalesDisponibles, setSelectedSucursalesDisponibles] = useState<Sucursal[]>([]);
  const [selectedSucursalesLoading, setSelectedSucursalesLoading] = useState(false);
  const [selectedHoraInicio, setSelectedHoraInicio] = useState("");
  const [selectedHoraFin, setSelectedHoraFin] = useState("");
  const [selectedNotas, setSelectedNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendingNota, setSendingNota] = useState(false);
  const [deletingVisitaId, setDeletingVisitaId] = useState(false);

  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [dayModalDate, setDayModalDate] = useState("");
  const [dayModalDateKey, setDayModalDateKey] = useState("");
  const [dayModalVisitas, setDayModalVisitas] = useState<AgendaVisita[]>([]);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [calendarError, setCalendarError] = useState("");
  const [creating, setCreating] = useState(false);
  const [manualFecha, setManualFecha] = useState<string>("");
  const [manualEmpresaId, setManualEmpresaId] = useState<number | null>(null);
  const [manualSucursalId, setManualSucursalId] = useState<number | null>(null);
  const [manualSucursalesDisponibles, setManualSucursalesDisponibles] = useState<Sucursal[]>([]);
  const [manualSucursalesLoading, setManualSucursalesLoading] = useState(false);
  const [manualTecnicoId, setManualTecnicoId] = useState<number | null>(null);
  const [manualHoraInicio, setManualHoraInicio] = useState("");
  const [manualHoraFin, setManualHoraFin] = useState("");
  const [manualNotas, setManualNotas] = useState("");
  const [empresasDisponibles, setEmpresasDisponibles] = useState<Empresa[]>([]);

  const [filtroTecnico, setFiltroTecnico] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroTecnicoDebounced, setFiltroTecnicoDebounced] = useState("");
  const [filtroEmpresaDebounced, setFiltroEmpresaDebounced] = useState("");

  /* ---- fetch ---- */
  const fetchVisitas = useCallback(async (date: Dayjs) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        month: String(date.month() + 1),
        year: String(date.year()),
      });
      if (filtroTecnicoDebounced) params.set("tecnico", filtroTecnicoDebounced);
      if (filtroEmpresaDebounced) params.set("empresa", filtroEmpresaDebounced);
      const res = await fetch(`${API_URL}/agenda?${params.toString()}`, {
        headers: authHeaders(), credentials: "include",
      });
      if (!res.ok) throw new Error("Error al cargar agenda");
      const data: AgendaVisita[] = await res.json();
      setVisitas(Array.isArray(data) ? data : []);
    } catch {
      message.error("No se pudo cargar la agenda");
    } finally {
      setLoading(false);
    }
  }, [filtroTecnicoDebounced, filtroEmpresaDebounced]);

  const fetchTecnicos = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/tecnicos`, { headers: authHeaders(), credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setTecnicosDisponibles(Array.isArray(data) ? data : (data.items ?? []));
    } catch { /* silencioso */ }
  }, []);

  const fetchEmpresas = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/agenda/empresas`, { headers: authHeaders(), credentials: "include" });
      if (!res.ok) return;
      const data: Empresa[] = await res.json();
      setEmpresasDisponibles(Array.isArray(data) ? data : []);
    } catch { /* silencioso */ }
  }, []);

  // Reutiliza el endpoint de sucursales ya existente del módulo de Empresas
  // (no se creó uno nuevo bajo /agenda).
  const fetchSucursalesPorEmpresa = useCallback(async (empresaId: number | null): Promise<Sucursal[]> => {
    if (!empresaId) return [];
    try {
      const res = await fetch(`${API_URL}/ficha-empresa/${empresaId}/sucursales`, {
        headers: authHeaders(), credentials: "include",
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setFiltroTecnicoDebounced(filtroTecnico);
      setFiltroEmpresaDebounced(filtroEmpresa);
    }, 400);
    return () => clearTimeout(t);
  }, [filtroTecnico, filtroEmpresa]);

  useEffect(() => { fetchVisitas(currentDate); }, [currentDate, fetchVisitas]);
  useEffect(() => { fetchTecnicos(); }, [fetchTecnicos]);
  useEffect(() => { fetchEmpresas(); }, [fetchEmpresas]);

  // Solo cargan la LISTA de sucursales de la empresa elegida; el reseteo del
  // sucursalId seleccionado lo maneja el propio handler de cambio de empresa
  // (para no pisar la sucursal precargada al abrir "Editar").
  useEffect(() => {
    let activo = true;
    if (!manualEmpresaId) {
      setManualSucursalesDisponibles([]);
      return;
    }
    setManualSucursalesLoading(true);
    fetchSucursalesPorEmpresa(manualEmpresaId).then((sucursales) => {
      if (!activo) return;
      setManualSucursalesDisponibles(sucursales);
      setManualSucursalesLoading(false);
    });
    return () => { activo = false; };
  }, [manualEmpresaId, fetchSucursalesPorEmpresa]);

  useEffect(() => {
    let activo = true;
    if (!selectedEmpresaId) {
      setSelectedSucursalesDisponibles([]);
      return;
    }
    setSelectedSucursalesLoading(true);
    fetchSucursalesPorEmpresa(selectedEmpresaId).then((sucursales) => {
      if (!activo) return;
      setSelectedSucursalesDisponibles(sucursales);
      setSelectedSucursalesLoading(false);
    });
    return () => { activo = false; };
  }, [selectedEmpresaId, fetchSucursalesPorEmpresa]);

  const visitasByDate = useMemo(() =>
    visitas.reduce<Record<string, AgendaVisita[]>>((acc, v) => {
      const key = dayjs(v.fecha).format("YYYY-MM-DD");
      (acc[key] = acc[key] || []).push(v);
      return acc;
    }, {}),
    [visitas]);

  const fcEvents = useMemo(() =>
    visitas.map((v) => {
      const isPast = isPastVisita(v);
      const empresa = getAgendaEmpresaNombreFromVisita(v).toUpperCase();
      const tecs = v.tecnicos.slice(0, 2).map((tr) => tr.tecnico.nombre).join(", ");
      const tecExtra = v.tecnicos.length > 2 ? ` +${v.tecnicos.length - 2}` : "";
      const tecLabel = v.tecnicos.length === 0 ? "Sin técnico" : `${tecs}${tecExtra}`;
      const hora = fmtHora(v.horaInicio);
      const estadoLabel = v.estado === "INICIADA" ? " · INICIADA" : "";
      const title = hora
        ? `${hora} · ${tecLabel} · ${empresa}${estadoLabel}`
        : `${tecLabel} · ${empresa}${estadoLabel}`;
      const allDay = !v.horaInicio;
      const colors = tecnicoColor(v.tecnicos[0]?.tecnico?.nombre);
      return {
        id: String(v.id),
        title,
        start: allDay ? v.fecha : `${v.fecha}T${v.horaInicio}`,
        end: !allDay && v.horaFin ? `${v.fecha}T${v.horaFin}` : undefined,
        allDay,
        editable: !isPast,
        startEditable: !isPast,
        durationEditable: !isPast,
        extendedProps: { visita: v },
        ...colors,
        borderColor: getAgendaEstadoEventColor(v.estado),
      };
    }),
    [visitas]);

  useEffect(() => {
    if (dayModalOpen && dayModalDateKey) {
      setDayModalVisitas(visitasByDate[dayModalDateKey] || []);
    }
  }, [visitasByDate, dayModalDateKey, dayModalOpen]);

  /* ---- acciones ---- */
  const handleGenerar = async () => {
    setGenerando(true);
    try {
      const body: Record<string, unknown> = {
        month: currentDate.month() + 1,
        year: currentDate.year(),
        ...(selectedEmpresaIds.length > 0 && { empresaIds: selectedEmpresaIds }),
        ...(includeOficina && { includeOficina: true }),
      };
      const res = await fetch(`${API_URL}/agenda/generar`, {
        method: "POST", headers: authHeaders(), credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      message.success("Malla mensual generada exitosamente");
      setGenerateModalOpen(false);
      fetchVisitas(currentDate);
    } catch {
      message.error("Error al generar la malla mensual");
    } finally {
      setGenerando(false);
    }
  };

  const handleEliminarMalla = async () => {
    setEliminando(true);
    try {
      const res = await fetch(`${API_URL}/agenda/malla`, {
        method: "DELETE", headers: authHeaders(), credentials: "include",
        body: JSON.stringify({ year: currentDate.year(), month: currentDate.month() + 1 }),
      });
      if (!res.ok) throw new Error();
      message.success("Malla mensual eliminada");
      fetchVisitas(currentDate);
    } catch {
      message.error("Error al eliminar la malla mensual");
    } finally {
      setEliminando(false);
    }
  };

  const handleVisitaClick = (visita: AgendaVisita) => {
    setDetalleVisita(visita);
    setSelectedVisita(visita);
    setDetalleOpen(true);
  };

  const handleOpenEditar = (visita: AgendaVisita) => {
    const empresaRids = empresasDisponibles.find((e) => e.nombre.trim().toLowerCase() === "rids");
    setSelectedVisita(visita);
    setSelectedTecnicos(visita.tecnicos.map((t) => t.tecnico.id_tecnico));
    setSelectedEmpresaId(visita.empresa?.id_empresa ?? empresaRids?.id_empresa ?? null);
    setSelectedSucursalId(visita.sucursalId ?? visita.sucursal?.id_sucursal ?? null);
    selectedSucursalTouchedRef.current = false;
    setSelectedHoraInicio(visita.horaInicio ?? "");
    setSelectedHoraFin(visita.horaFin ?? "");
    setSelectedNotas(visita.notas ?? "");
    setSendingNota(false);
    setDetalleOpen(false);
    setModalOpen(true);
  };

  const handleSaveVisita = async () => {
    if (!selectedVisita) return;
    setSaving(true);
    try {
      const resPatch = await fetch(`${API_URL}/agenda/${selectedVisita.id}`, {
        method: "PATCH", headers: authHeaders(), credentials: "include",
        body: JSON.stringify({
          empresaId: selectedEmpresaId,
          ...(selectedSucursalTouchedRef.current && { sucursalId: selectedSucursalId }),
          ...(selectedHoraInicio && { horaInicio: selectedHoraInicio }),
          ...(selectedHoraFin && { horaFin: selectedHoraFin }),
          notas: selectedNotas,
        }),
      });
      if (!resPatch.ok) throw new Error(await errorMsg(resPatch, "Error al guardar la visita"));

      const resTecnicos = await fetch(`${API_URL}/agenda/${selectedVisita.id}/tecnicos`, {
        method: "PUT", headers: authHeaders(), credentials: "include",
        body: JSON.stringify({ nuevosTecnicoIds: selectedTecnicos }),
      });
      if (!resTecnicos.ok) throw new Error(await errorMsg(resTecnicos, "Error al guardar la visita"));

      const updatedEmpresa =
        selectedEmpresaId === null
          ? null
          : empresasDisponibles.find((e) => e.id_empresa === selectedEmpresaId) ??
          (selectedVisita.empresa?.id_empresa === selectedEmpresaId ? selectedVisita.empresa : null);

      setSelectedVisita((prev) =>
        prev ? { ...prev, empresa: updatedEmpresa, horaInicio: selectedHoraInicio || null, horaFin: selectedHoraFin || null, notas: selectedNotas } : prev
      );

      message.success("Visita actualizada");
      fetchVisitas(currentDate);
    } catch (e) {
      Modal.error({
        title: "Error al guardar la visita",
        content: e instanceof Error ? e.message : "Error al guardar la visita",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEnviarNota = async () => {
    if (!selectedVisita || !Number.isFinite(selectedVisita.id) || selectedVisita.id <= 0) return;
    if (sendingNota) return;
    if (selectedNotas !== (selectedVisita.notas ?? "")) {
      message.warning("Guarda los cambios de la nota antes de enviarla por correo.");
      return;
    }
    setSendingNota(true);
    try {
      const res = await fetch(`${API_URL}/agenda/${selectedVisita.id}/enviar-nota`, {
        method: "POST", headers: authHeaders(), credentials: "include",
      });
      if (!res.ok) throw new Error(await errorMsg(res, "Error al enviar la nota por correo"));
      const data: { ok?: boolean; enviados?: number } = await res.json();
      message.success(`Nota enviada por correo a ${data?.enviados ?? 0} técnico(s)`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Error al enviar la nota por correo");
    } finally {
      setSendingNota(false);
    }
  };

  const handleEliminarVisita = async () => {
    if (!selectedVisita) return;
    setDeletingVisitaId(true);
    try {
      const res = await fetch(`${API_URL}/agenda/${selectedVisita.id}`, {
        method: "DELETE", headers: authHeaders(), credentials: "include",
      });
      if (!res.ok) throw new Error();
      message.success("Visita eliminada");
      setModalOpen(false);
      setDetalleOpen(false);
      fetchVisitas(currentDate);
    } catch {
      message.error("Error al eliminar la visita");
    } finally {
      setDeletingVisitaId(false);
    }
  };

  const handleCrearManual = async () => {
    if (!manualFecha || manualEmpresaId === null || manualTecnicoId === null) return;
    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/agenda/manual`, {
        method: "POST", headers: authHeaders(), credentials: "include",
        body: JSON.stringify({
          fecha: manualFecha,
          empresaId: manualEmpresaId,
          sucursalId: manualSucursalId,
          tecnicoId: manualTecnicoId,
          ...(manualHoraInicio && { horaInicio: manualHoraInicio }),
          ...(manualHoraFin && { horaFin: manualHoraFin }),
          ...(manualNotas.trim() && { notas: manualNotas.trim() }),
        }),
      });
      if (!res.ok) throw new Error(await errorMsg(res, "Error al crear la visita"));
      message.success("Visita creada correctamente");
      setCreateError("");
      setCreateModalOpen(false);
      fetchVisitas(currentDate);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Error al crear la visita");
    } finally {
      setCreating(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEventDrop = async (info: any) => {
    const visita: AgendaVisita = info.event.extendedProps.visita;
    if (isPastVisita(visita)) {
      info.revert();
      setCalendarError("No se puede modificar una visita de una fecha pasada.");
      return;
    }
    const newStart = dayjs(info.event.start as Date);
    const allDay: boolean = info.event.allDay;
    try {
      const res = await fetch(`${API_URL}/agenda/${visita.id}`, {
        method: "PATCH", headers: authHeaders(), credentials: "include",
        body: JSON.stringify({
          fecha: newStart.format("YYYY-MM-DD"),
          ...(!allDay && { horaInicio: newStart.format("HH:mm") }),
          ...(!allDay && info.event.end && { horaFin: dayjs(info.event.end as Date).format("HH:mm") }),
        }),
      });
      if (!res.ok) throw new Error(await errorMsg(res, "Error al mover la visita"));
      setCalendarError("");
      message.success("Visita movida");
      fetchVisitas(currentDate);
    } catch (e) {
      info.revert();
      setCalendarError(e instanceof Error ? e.message : "Error al mover la visita");
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEventResize = async (info: any) => {
    const visita: AgendaVisita = info.event.extendedProps.visita;
    if (isPastVisita(visita)) {
      info.revert();
      setCalendarError("No se puede modificar una visita de una fecha pasada.");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/agenda/${visita.id}`, {
        method: "PATCH", headers: authHeaders(), credentials: "include",
        body: JSON.stringify({ horaFin: dayjs(info.event.end as Date).format("HH:mm") }),
      });
      if (!res.ok) throw new Error(await errorMsg(res, "Error al actualizar duración"));
      setCalendarError("");
      message.success("Duración actualizada");
      fetchVisitas(currentDate);
    } catch (e) {
      info.revert();
      setCalendarError(e instanceof Error ? e.message : "Error al actualizar duración");
    }
  };

  /* ====================== RENDER ====================== */
  return (
    <div
      style={{
        minHeight: "100vh",
        // Usa el token de fondo del sistema — cambia automáticamente en dark mode
        background: "var(--color-bg)",
        padding: "0 0 24px",
      }}
    >
      {/*
        ── Estilos FullCalendar para dark mode ──────────────────────────────────
        Las reglas .fc-* en index.css cubren el cuerpo del calendario.
        Estas reglas complementarias ajustan lo que FullCalendar aplica
        inline o con clases específicas que no captura el selector genérico.
      */}
      <style>{`
        /* Eventos compactos */
        .agenda-calendar-compact .fc-event {
          font-size: 11px;
          padding: 1px 3px;
          border-radius: 4px;
        }
        .agenda-calendar-compact .fc-daygrid-event {
          margin-top: 1px;
        }
        .agenda-calendar-compact .fc-daygrid-day-frame {
          min-height: 90px;
        }

        /* ── Dark mode: sobreescribe lo que FullCalendar pone inline ── */
        html.a11y-theme-dark .fc {
          color: var(--color-text-primary) !important;
        }
        html.a11y-theme-dark .fc-theme-standard td,
        html.a11y-theme-dark .fc-theme-standard th,
        html.a11y-theme-dark .fc-theme-standard .fc-scrollgrid {
          border-color: var(--color-border) !important;
        }
        html.a11y-theme-dark .fc-col-header-cell {
          background-color: var(--color-surface-2) !important;
        }
        html.a11y-theme-dark .fc-daygrid-day {
          background-color: var(--color-surface) !important;
        }
        html.a11y-theme-dark .fc-daygrid-day:hover {
          background-color: var(--color-surface-2) !important;
        }
        html.a11y-theme-dark .fc-day-other .fc-daygrid-day-top {
          opacity: 0.4;
        }
        html.a11y-theme-dark .fc-daygrid-day-number,
        html.a11y-theme-dark .fc-col-header-cell-cushion {
          color: var(--color-text-secondary) !important;
        }
        html.a11y-theme-dark .fc-day-today {
          background-color: rgba(8,145,178,0.10) !important;
        }
        html.a11y-theme-dark .fc-day-today .fc-daygrid-day-number {
          color: var(--color-accent) !important;
          font-weight: 700;
        }
        html.a11y-theme-dark .fc-more-link {
          color: var(--color-accent) !important;
          background: var(--color-surface-2) !important;
          border-radius: 4px;
          padding: 1px 4px;
        }
        /* Toolbar (prev/next/today/title/views) */
        html.a11y-theme-dark .fc-toolbar-title {
          color: var(--color-text-primary) !important;
        }
        html.a11y-theme-dark .fc-button,
        html.a11y-theme-dark .fc-button-group .fc-button {
          background-color: var(--color-surface-2) !important;
          border-color: var(--color-border) !important;
          color: var(--color-text-primary) !important;
        }
        html.a11y-theme-dark .fc-button:hover {
          background-color: var(--color-surface-3) !important;
        }
        html.a11y-theme-dark .fc-button-active,
        html.a11y-theme-dark .fc-button-primary:not(:disabled).fc-button-active {
          background-color: var(--color-accent) !important;
          border-color: var(--color-accent) !important;
          color: #fff !important;
        }
        /* Popover "ver más" */
        html.a11y-theme-dark .fc-popover {
          background-color: var(--color-surface) !important;
          border-color: var(--color-border) !important;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
        }
        html.a11y-theme-dark .fc-popover-header {
          background-color: var(--color-surface-2) !important;
          color: var(--color-text-primary) !important;
        }
        html.a11y-theme-dark .fc-popover-body {
          background-color: var(--color-surface) !important;
        }
        /* Timegrid */
        html.a11y-theme-dark .fc-timegrid-slot,
        html.a11y-theme-dark .fc-timegrid-axis {
          background-color: var(--color-surface) !important;
          border-color: var(--color-border-light) !important;
        }
        html.a11y-theme-dark .fc-timegrid-slot-label-cushion {
          color: var(--color-text-muted) !important;
        }
        html.a11y-theme-dark .fc-timegrid-now-indicator-line {
          border-color: var(--color-accent) !important;
        }
        html.a11y-theme-dark .fc-timegrid-now-indicator-arrow {
          border-top-color: var(--color-accent) !important;
          border-bottom-color: var(--color-accent) !important;
        }
      `}</style>

      {/* ── Cabecera ── */}
      <div
        style={{
          background: "var(--color-surface)",
          borderRadius: 12,
          padding: "12px 20px",
          marginBottom: 12,
          border: "0.5px solid var(--color-border)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--color-text-primary)" }}>
            Calendario visitas
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--color-text-secondary)", fontSize: 14, textTransform: "capitalize" }}>
            {currentDate.format("MMMM YYYY")}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            type="primary"
            size="middle"
            loading={generando}
            onClick={() => { setSelectedEmpresaIds([]); setIncludeOficina(false); setGenerateModalOpen(true); }}
            style={{ borderRadius: 8 }}
          >
            Generar Malla Mensual
          </Button>

          <Button
            size="middle"
            onClick={() => {
              setCreateError("");
              setManualFecha(dayjs().format("YYYY-MM-DD"));
              setManualEmpresaId(null); setManualSucursalId(null); setManualTecnicoId(null);
              setManualHoraInicio(""); setManualHoraFin(""); setManualNotas("");
              setCreateModalOpen(true);
            }}
            style={{ borderRadius: 8 }}
          >
            Agregar Visita Manual
          </Button>

          <Popconfirm
            title="¿Estás seguro de eliminar todas las visitas de este mes?"
            onConfirm={handleEliminarMalla}
            okText="Sí, eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
            placement="bottomRight"
          >
            <Button danger size="middle" loading={eliminando} style={{ borderRadius: 8 }}>
              Eliminar Malla Mensual
            </Button>
          </Popconfirm>
        </div>
      </div>

      {/* ── Filtros ── */}
      <div
        style={{
          background: "var(--color-surface)",
          borderRadius: 12,
          padding: "10px 16px",
          marginBottom: 12,
          border: "0.5px solid var(--color-border)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <AutoComplete
          placeholder="Filtrar por técnico"
          value={filtroTecnico}
          onChange={setFiltroTecnico}
          allowClear
          filterOption={false}
          style={{ width: 220, borderRadius: 8 }}
          options={[...new Map(tecnicosDisponibles.map((t) => [t.nombre, t])).values()].map((t) => ({
            value: t.nombre, label: t.nombre,
          }))}
        />
        <AutoComplete
          placeholder="Filtrar por empresa"
          value={filtroEmpresa}
          onChange={setFiltroEmpresa}
          allowClear
          style={{ width: 220, borderRadius: 8 }}
          options={empresasDisponibles.map((e) => ({
            value: getAgendaEmpresaOptionLabel(e).replace(/\s+/g, " ").trim(),
            label: getAgendaEmpresaOptionLabel(e),
          }))}
        />
        {(filtroTecnico || filtroEmpresa) && (
          <Button
            size="small"
            onClick={() => { setFiltroTecnico(""); setFiltroEmpresa(""); }}
            style={{ borderRadius: 6 }}
          >
            Limpiar filtros
          </Button>
        )}
        <span style={{ fontSize: 12, color: "var(--color-text-muted)", marginLeft: 4 }}>
          {visitas.length} visitas
        </span>
      </div>

      {/* ── Calendario ── */}
      <div
        className="agenda-calendar-compact"
        style={{
          background: "var(--color-surface)",
          borderRadius: 12,
          padding: 6,
          border: "0.5px solid var(--color-border)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
        }}
      >
        {calendarError && (
          <Alert
            type="error"
            showIcon
            message={calendarError}
            closable
            onClose={() => setCalendarError("")}
            style={{ marginBottom: 12 }}
          />
        )}
        <Spin spinning={loading}>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            locale={esLocale}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            events={fcEvents}
            dayMaxEventRows={4}
            eventDisplay="block"
            editable
            droppable
            eventClick={(info) => handleVisitaClick(info.event.extendedProps.visita as AgendaVisita)}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            datesSet={(dateInfo) => {
              const next = dayjs(dateInfo.view.currentStart);
              setCurrentDate((prev) =>
                prev.month() !== next.month() || prev.year() !== next.year() ? next : prev
              );
            }}
            dateClick={(info) => {
              if (info.view.type !== "dayGridMonth") return;
              const key = info.dateStr;
              setDayModalDate(dayjs(info.date).format("dddd DD [de] MMMM YYYY"));
              setDayModalDateKey(key);
              setDayModalVisitas(visitasByDate[key] || []);
              setDayModalOpen(true);
            }}
            slotMinTime="07:00:00"
            slotMaxTime="20:00:00"
            slotDuration="00:30:00"
            snapDuration="00:15:00"
            scrollTime="07:00:00"
            height="auto"
          />
        </Spin>
      </div>

      {/* ── Modales ── */}
      <CrearVisitaAutomatica
        open={generateModalOpen}
        generando={generando}
        currentDate={currentDate}
        selectedEmpresaIds={selectedEmpresaIds}
        includeOficina={includeOficina}
        empresasDisponibles={empresasDisponibles}
        onEmpresaIdsChange={setSelectedEmpresaIds}
        onIncludeOficinaChange={setIncludeOficina}
        onOk={handleGenerar}
        onCancel={() => { setGenerateModalOpen(false); setSelectedEmpresaIds([]); setIncludeOficina(false); }}
      />

      <DiaAgenda
        open={dayModalOpen}
        fecha={dayModalDate}
        visitas={dayModalVisitas}
        onAgregarVisita={() => {
          setDayModalOpen(false);
          setCreateError("");
          setManualFecha(dayModalDateKey);
          setManualEmpresaId(null); setManualSucursalId(null); setManualTecnicoId(null);
          setManualHoraInicio(""); setManualHoraFin(""); setManualNotas("");
          setCreateModalOpen(true);
        }}
        onVisitaClick={(v) => { setDayModalOpen(false); handleVisitaClick(v); }}
        onCancel={() => setDayModalOpen(false)}
      />

      <CrearVisitaManual
        open={createModalOpen}
        creating={creating}
        errorText={createError}
        fecha={manualFecha}
        empresaId={manualEmpresaId}
        tecnicoId={manualTecnicoId}
        horaInicio={manualHoraInicio}
        horaFin={manualHoraFin}
        notas={manualNotas}
        empresasDisponibles={empresasDisponibles}
        sucursalId={manualSucursalId}
        sucursalesDisponibles={manualSucursalesDisponibles}
        sucursalesLoading={manualSucursalesLoading}
        tecnicosDisponibles={tecnicosDisponibles}
        onFechaChange={setManualFecha}
        onEmpresaChange={(id) => { setManualEmpresaId(id); setManualSucursalId(null); }}
        onSucursalChange={setManualSucursalId}
        onTecnicoChange={setManualTecnicoId}
        onHoraInicioChange={setManualHoraInicio}
        onHoraFinChange={setManualHoraFin}
        onNotasChange={setManualNotas}
        onOk={handleCrearManual}
        onCancel={() => { setCreateError(""); setCreateModalOpen(false); }}
      />

      <DetalleVisita
        open={detalleOpen}
        visita={detalleVisita}
        deleting={deletingVisitaId}
        onEditar={handleOpenEditar}
        onEliminar={handleEliminarVisita}
        onCancel={() => setDetalleOpen(false)}
      />

      <EditarVisita
        open={modalOpen}
        visita={selectedVisita}
        empresaId={selectedEmpresaId}
        tecnicoIds={selectedTecnicos}
        horaInicio={selectedHoraInicio}
        horaFin={selectedHoraFin}
        notas={selectedNotas}
        empresasDisponibles={empresasDisponibles}
        sucursalId={selectedSucursalId}
        sucursalesDisponibles={selectedSucursalesDisponibles}
        sucursalesLoading={selectedSucursalesLoading}
        tecnicosDisponibles={tecnicosDisponibles}
        saving={saving}
        sendingNota={sendingNota}
        deleting={deletingVisitaId}
        onEmpresaChange={(id) => {
          setSelectedEmpresaId(id);
          setSelectedSucursalId(null);
          selectedSucursalTouchedRef.current = true;
        }}
        onSucursalChange={(id) => {
          setSelectedSucursalId(id);
          selectedSucursalTouchedRef.current = true;
        }}
        onTecnicosChange={setSelectedTecnicos}
        onHoraInicioChange={setSelectedHoraInicio}
        onHoraFinChange={setSelectedHoraFin}
        onNotasChange={setSelectedNotas}
        onSave={handleSaveVisita}
        onSendNota={handleEnviarNota}
        onDelete={handleEliminarVisita}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  );
}
