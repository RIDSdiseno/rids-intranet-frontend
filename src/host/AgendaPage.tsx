// src/host/AgendaPage.tsx
import { useEffect, useState, useCallback, useMemo } from "react";
import { Alert, Button, message, Modal, Spin, Popconfirm, AutoComplete } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import "dayjs/locale/es";
import type { AgendaVisita, Tecnico, Empresa } from "../components/modals-agenda/tiposAgenda";
import { CrearVisitaManual } from "../components/modals-agenda/CrearVisitaManual";
import { EditarVisita } from "../components/modals-agenda/EditarVisita";
import { DiaAgenda } from "../components/modals-agenda/DiaAgenda";
import { CrearVisitaAutomatica } from "../components/modals-agenda/CrearVisitaAutomatica";
import { DetalleVisita } from "../components/modals-agenda/DetalleVisita";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";

dayjs.locale("es");

/* ========= Config ========= */
type ViteEnv = { env?: { VITE_API_URL?: string } };
const API_URL =
  ((import.meta as unknown) as ViteEnv).env?.VITE_API_URL ||
  "http://localhost:4000/api";

/* ========= Auth helpers ========= */
function authHeaders(): HeadersInit {
  const token = localStorage.getItem("accessToken");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/* ========= Helpers ========= */
function norm(s?: string | null): string {
  return (s ?? "").toLowerCase().trim();
}

function isPastVisita(visita: Pick<AgendaVisita, "fecha">): boolean {
  return dayjs(visita.fecha).startOf("day").isBefore(dayjs().startOf("day"));
}

/** Devuelve la hora formateada o "" — reutilizable en futura vista semana/día */
function fmtHora(s?: string | null): string {
  return s ?? "";
}

const OFICINA_COLOR = { bg: "#f1f5f9", border: "#94a3b8", text: "#475569" };

function tecnicoColor(nombre?: string | null) {
  const key = norm(nombre);
  if (!key) {
    return {
      backgroundColor: OFICINA_COLOR.bg,
      borderColor: OFICINA_COLOR.border,
      textColor: OFICINA_COLOR.text,
    };
  }

  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const hue = (hash >>> 0) % 360;
  return {
    backgroundColor: `hsl(${hue}, 75%, 88%)`,
    borderColor: `hsl(${hue}, 70%, 45%)`,
    textColor: `hsl(${hue}, 55%, 20%)`,
  };
}


/** Extrae el detalle de error del cuerpo JSON del response, o devuelve el fallback */
async function errorMsg(res: Response, fallback: string): Promise<string> {
  try {
    const json = await res.json();
    if (typeof json?.error === "string") return json.error;
  } catch { /* ignore */ }
  return fallback;
}

/* ========= Component ========= */
export default function AgendaPage() {
  const [currentDate, setCurrentDate] = useState<Dayjs>(dayjs());
  const [visitas, setVisitas] = useState<AgendaVisita[]>([]);
  const [loading, setLoading] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [selectedEmpresaIds, setSelectedEmpresaIds] = useState<number[]>([]);
  const [includeOficina, setIncludeOficina] = useState(false);

  // Modal detalle de visita
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [detalleVisita, setDetalleVisita] = useState<AgendaVisita | null>(null);

  // Modal edición de visita
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedVisita, setSelectedVisita] = useState<AgendaVisita | null>(null);
  const [tecnicosDisponibles, setTecnicosDisponibles] = useState<Tecnico[]>([]);
  const [selectedTecnicos, setSelectedTecnicos] = useState<number[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number | null>(null);
  const [selectedHoraInicio, setSelectedHoraInicio] = useState("");
  const [selectedHoraFin, setSelectedHoraFin] = useState("");
  const [selectedNotas, setSelectedNotas] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendingNota, setSendingNota] = useState(false);
  const [deletingVisitaId, setDeletingVisitaId] = useState(false);

  // Modal detalle del día
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [dayModalDate, setDayModalDate] = useState("");
  const [dayModalDateKey, setDayModalDateKey] = useState(""); // YYYY-MM-DD para refresco
  const [dayModalVisitas, setDayModalVisitas] = useState<AgendaVisita[]>([]);

  // Modal creación manual
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createError, setCreateError] = useState("");
  const [calendarError, setCalendarError] = useState("");
  const [creating, setCreating] = useState(false);
  const [manualFecha, setManualFecha] = useState<string>("");
  const [manualEmpresaId, setManualEmpresaId] = useState<number | null>(null);
  const [manualTecnicoId, setManualTecnicoId] = useState<number | null>(null);
  const [manualHoraInicio, setManualHoraInicio] = useState("");
  const [manualHoraFin, setManualHoraFin] = useState("");
  const [manualNotas, setManualNotas] = useState("");
  const [empresasDisponibles, setEmpresasDisponibles] = useState<Empresa[]>([]);

  // ← NUEVO: estados de filtros
  const [filtroTecnico, setFiltroTecnico] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroTecnicoDebounced, setFiltroTecnicoDebounced] = useState("");
  const [filtroEmpresaDebounced, setFiltroEmpresaDebounced] = useState("");

  /* ---- fetch visitas del mes ---- */
  const fetchVisitas = useCallback(async (date: Dayjs) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        month: String(date.month() + 1),
        year: String(date.year()),
      });
      if (filtroTecnicoDebounced) params.set("tecnico", filtroTecnicoDebounced);
      if (filtroEmpresaDebounced) params.set("empresa", filtroEmpresaDebounced);
      const res = await fetch(
        `${API_URL}/agenda?${params.toString()}`,
        { headers: authHeaders(), credentials: "include" }
      );
      if (!res.ok) throw new Error("Error al cargar agenda");
      const data: AgendaVisita[] = await res.json();
      setVisitas(Array.isArray(data) ? data : []);
    } catch {
      message.error("No se pudo cargar la agenda");
    } finally {
      setLoading(false);
    }
  }, [filtroTecnicoDebounced, filtroEmpresaDebounced]);

  /* ---- fetch técnicos ---- */
  const fetchTecnicos = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/tecnicos`, {
        headers: authHeaders(),
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      setTecnicosDisponibles(Array.isArray(data) ? data : (data.items ?? []));
    } catch {
      // silencioso
    }
  }, []);

  /* ---- fetch empresas (catálogo de agenda desde /agenda/empresas) ---- */
  const fetchEmpresas = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/agenda/empresas`, {
        headers: authHeaders(),
        credentials: "include",
      });
      if (!res.ok) return;
      const data: Empresa[] = await res.json();
      setEmpresasDisponibles(Array.isArray(data) ? data : []);
    } catch {
      // silencioso
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFiltroTecnicoDebounced(filtroTecnico);
      setFiltroEmpresaDebounced(filtroEmpresa);
    }, 400);
    return () => clearTimeout(timer);
  }, [filtroTecnico, filtroEmpresa]);

  useEffect(() => { fetchVisitas(currentDate); }, [currentDate, fetchVisitas]);
  useEffect(() => { fetchTecnicos(); }, [fetchTecnicos]);
  useEffect(() => { fetchEmpresas(); }, [fetchEmpresas]);

  /* ---- agrupa visitas por fecha (alimenta calendario y modal del día) ---- */
  const visitasByDate = useMemo(() =>
    visitas.reduce<Record<string, AgendaVisita[]>>((acc, v) => {
      const key = dayjs(v.fecha).format("YYYY-MM-DD");
      (acc[key] = acc[key] || []).push(v);
      return acc;
    }, {}),
  [visitas]);

  /* ---- mapea visitas a eventos de FullCalendar ---- */
  const fcEvents = useMemo(() =>
    visitas.map((v) => {
      const isPast = isPastVisita(v);
      const empresa =
        v.empresa?.nombre?.trim()?.toUpperCase() ||
        v.empresaExternaNombre?.trim()?.toUpperCase() ||
        "OFICINA";
      const tecs = v.tecnicos.slice(0, 2).map((tr) => tr.tecnico.nombre).join(", ");
      const tecExtra = v.tecnicos.length > 2 ? ` +${v.tecnicos.length - 2}` : "";
      const tecLabel = v.tecnicos.length === 0 ? "Sin técnico" : `${tecs}${tecExtra}`;
      const hora = fmtHora(v.horaInicio);
      const title = hora ? `${hora} · ${tecLabel} · ${empresa}` : `${tecLabel} · ${empresa}`;
      const allDay = !v.horaInicio;
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
        ...tecnicoColor(v.tecnicos[0]?.tecnico?.nombre),
      };
    }),
  [visitas]);

  /* ---- refresca el modal del día cuando visitas/filtros cambian ---- */
  useEffect(() => {
    if (dayModalOpen && dayModalDateKey) {
      setDayModalVisitas(visitasByDate[dayModalDateKey] || []);
    }
  }, [visitasByDate, dayModalDateKey, dayModalOpen]);

  /* ---- generar malla ---- */
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
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
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

  /* ---- eliminar malla ---- */
  const handleEliminarMalla = async () => {
    setEliminando(true);
    try {
      const res = await fetch(`${API_URL}/agenda/malla`, {
        method: "DELETE",
        headers: authHeaders(),
        credentials: "include",
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

  /* ---- click en visita → abrir detalle ---- */
  const handleVisitaClick = (visita: AgendaVisita) => {
    setDetalleVisita(visita);
    setSelectedVisita(visita);
    setDetalleOpen(true);
  };

  /* ---- desde detalle → abrir edición ---- */
  const handleOpenEditar = (visita: AgendaVisita) => {
    setSelectedVisita(visita);
    setSelectedTecnicos(visita.tecnicos.map((t) => t.tecnico.id_tecnico));
    setSelectedEmpresaId(visita.empresa?.id_empresa ?? -1);
    setSelectedHoraInicio(visita.horaInicio ?? "");
    setSelectedHoraFin(visita.horaFin ?? "");
    setSelectedNotas(visita.notas ?? "");
    setSendingNota(false);
    setDetalleOpen(false);
    setModalOpen(true);
  };

  /* ---- guardar empresa + técnicos ---- */
  const handleSaveVisita = async () => {
    if (!selectedVisita) return;
    setSaving(true);
    try {
      const resPatch = await fetch(`${API_URL}/agenda/${selectedVisita.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({
          empresaId: selectedEmpresaId === -1 ? null : selectedEmpresaId,
          ...(selectedHoraInicio && { horaInicio: selectedHoraInicio }),
          ...(selectedHoraFin && { horaFin: selectedHoraFin }),
          notas: selectedNotas,
        }),
      });
      if (!resPatch.ok) throw new Error(await errorMsg(resPatch, "Error al guardar la visita"));

      const resTecnicos = await fetch(`${API_URL}/agenda/${selectedVisita.id}/tecnicos`, {
        method: "PUT",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({ nuevosTecnicoIds: selectedTecnicos }),
      });
      if (!resTecnicos.ok) throw new Error(await errorMsg(resTecnicos, "Error al guardar la visita"));

      const updatedEmpresa =
        selectedEmpresaId === null || selectedEmpresaId === -1
          ? null
          : empresasDisponibles.find((empresa) => empresa.id_empresa === selectedEmpresaId)
            ?? (selectedVisita.empresa?.id_empresa === selectedEmpresaId ? selectedVisita.empresa : null);

      setSelectedVisita((prev) =>
        prev
          ? {
            ...prev,
            empresa: updatedEmpresa,
            horaInicio: selectedHoraInicio || null,
            horaFin: selectedHoraFin || null,
            notas: selectedNotas,
          }
          : prev
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

  /* ---- enviar nota por correo ---- */
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
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await errorMsg(res, "Error al enviar la nota por correo"));

      const data: { ok?: boolean; enviados?: number } = await res.json();
      const enviados = typeof data?.enviados === "number" ? data.enviados : 0;
      message.success(`Nota enviada por correo a ${enviados} técnico(s)`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Error al enviar la nota por correo");
    } finally {
      setSendingNota(false);
    }
  };

  /* ---- eliminar visita individual ---- */
  const handleEliminarVisita = async () => {
    if (!selectedVisita) return;
    setDeletingVisitaId(true);
    try {
      const res = await fetch(`${API_URL}/agenda/${selectedVisita.id}`, {
        method: "DELETE",
        headers: authHeaders(),
        credentials: "include",
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

  /* ---- crear visita manual ---- */
  const handleCrearManual = async () => {
    if (!manualFecha || manualEmpresaId === null || manualTecnicoId === null) return;
    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/agenda/manual`, {
        method: "POST",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({
          fecha: manualFecha,
          empresaId: manualEmpresaId === -1 ? null : manualEmpresaId,
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
      // dayModalVisitas se actualiza via useEffect([visitasByDate, dayModalDateKey, dayModalOpen])
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Error al crear la visita");
    } finally {
      setCreating(false);
    }
  };

  /* ---- mover visita (drag & drop) ---- */
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
        method: "PATCH",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({
          fecha: newStart.format("YYYY-MM-DD"),
          ...(!allDay && { horaInicio: newStart.format("HH:mm") }),
          ...(!allDay && info.event.end && {
            horaFin: dayjs(info.event.end as Date).format("HH:mm"),
          }),
        }),
      });
      if (!res.ok) throw new Error(await errorMsg(res, "Error al mover la visita"));
      setCalendarError("");
      message.success("Visita movida");
      fetchVisitas(currentDate);
    } catch (e) {
      info.revert();
      const msg = e instanceof Error ? e.message : "Error al mover la visita";
      setCalendarError(msg);
    }
  };

  /* ---- redimensionar duración ---- */
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
        method: "PATCH",
        headers: authHeaders(),
        credentials: "include",
        body: JSON.stringify({
          horaFin: dayjs(info.event.end as Date).format("HH:mm"),
        }),
      });
      if (!res.ok) throw new Error(await errorMsg(res, "Error al actualizar duración"));
      setCalendarError("");
      message.success("Duración actualizada");
      fetchVisitas(currentDate);
    } catch (e) {
      info.revert();
      const msg = e instanceof Error ? e.message : "Error al actualizar duración";
      setCalendarError(msg);
    }
  };

  /* ---- render ---- */
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc 0%, #e0f2fe 50%, #f0fdf4 100%)",
      }}
    >
      <style>{`
        .agenda-calendar-compact .fc-event {
          font-size: 11px;
          padding: 1px 3px;
        }

        .agenda-calendar-compact .fc-daygrid-event {
          margin-top: 1px;
        }

        .agenda-calendar-compact .fc-daygrid-day-frame {
          min-height: 90px;
        }
      `}</style>

      {/* ── Cabecera ── */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: "12px 20px",
          marginBottom: 12,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f172a" }}>
            Calendario visitas
          </h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 14, textTransform: "capitalize" }}>
            {currentDate.format("MMMM YYYY")}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            type="primary"
            size="middle"
            loading={generando}
            onClick={() => {
              setSelectedEmpresaIds([]);
              setIncludeOficina(false);
              setGenerateModalOpen(true);
            }}
            style={{ borderRadius: 8 }}
          >
            Generar Malla Mensual
          </Button>

          <Button
            size="middle"
            onClick={() => {
              setCreateError("");
              setManualFecha(dayjs().format("YYYY-MM-DD"));
              setManualEmpresaId(null);
              setManualTecnicoId(null);
              setManualHoraInicio("");
              setManualHoraFin("");
              setManualNotas("");
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
            <Button
              danger
              size="middle"
              loading={eliminando}
              style={{ borderRadius: 8 }}
            >
              Eliminar Malla Mensual
            </Button>
          </Popconfirm>
        </div>
      </div>

      {/* ── NUEVO: Filtros ── */}
      <div
        style={{
          background: "white",
          borderRadius: 12,
          padding: "10px 16px",
          marginBottom: 12,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
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
          options={[...new Map(tecnicosDisponibles.map(t => [t.nombre, t])).values()]
            .map((t) => ({ value: t.nombre, label: t.nombre }))}
        />
        <AutoComplete
          placeholder="Filtrar por empresa"
          value={filtroEmpresa}
          onChange={setFiltroEmpresa}
          allowClear
          style={{ width: 220, borderRadius: 8 }}
          options={[
            { value: "OFICINA", label: "OFICINA" },
            ...empresasDisponibles.map((e) => ({ value: e.nombre.replace(/\s+/g, " ").trim(), label: e.nombre }))
          ]}
        />
        {(filtroTecnico || filtroEmpresa) && (
          <Button
            size="small"
            onClick={() => { setFiltroTecnico(""); setFiltroEmpresa(""); }}
            style={{ borderRadius: 6, color: "#64748b" }}
          >
            Limpiar filtros
          </Button>
        )}
        <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: 4 }}>
          {visitas.length} visitas
        </span>
      </div>

      {/* ── Calendario FullCalendar ── */}
      <div
        className="agenda-calendar-compact"
        style={{
          background: "white",
          borderRadius: 12,
          padding: "6px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
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
            eventClick={(info) =>
              handleVisitaClick(info.event.extendedProps.visita as AgendaVisita)
            }
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            datesSet={(dateInfo) => {
              const next = dayjs(dateInfo.view.currentStart);
              setCurrentDate((prev) =>
                prev.month() !== next.month() || prev.year() !== next.year()
                  ? next
                  : prev
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
        onCancel={() => {
          setGenerateModalOpen(false);
          setSelectedEmpresaIds([]);
          setIncludeOficina(false);
        }}
      />

      <DiaAgenda
        open={dayModalOpen}
        fecha={dayModalDate}
        visitas={dayModalVisitas}
        onAgregarVisita={() => {
          setDayModalOpen(false);
          setCreateError("");
          setManualFecha(dayModalDateKey);
          setManualEmpresaId(null);
          setManualTecnicoId(null);
          setManualHoraInicio("");
          setManualHoraFin("");
          setManualNotas("");
          setCreateModalOpen(true);
        }}
        onVisitaClick={(v) => {
          setDayModalOpen(false);
          handleVisitaClick(v);
        }}
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
        tecnicosDisponibles={tecnicosDisponibles}
        onFechaChange={setManualFecha}
        onEmpresaChange={setManualEmpresaId}
        onTecnicoChange={setManualTecnicoId}
        onHoraInicioChange={setManualHoraInicio}
        onHoraFinChange={setManualHoraFin}
        onNotasChange={setManualNotas}
        onOk={handleCrearManual}
        onCancel={() => {
          setCreateError("");
          setCreateModalOpen(false);
        }}
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
        tecnicosDisponibles={tecnicosDisponibles}
        saving={saving}
        sendingNota={sendingNota}
        deleting={deletingVisitaId}
        onEmpresaChange={setSelectedEmpresaId}
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
