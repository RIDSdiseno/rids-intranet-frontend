// src/host/Visitas.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Button, DatePicker, Select, Space } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import "dayjs/locale/es";
import {
  SearchOutlined,
  ReloadOutlined,
  CloseCircleFilled,
  LeftOutlined,
  RightOutlined,
  EditOutlined,
  DeleteOutlined,
  DownOutlined,
  UpOutlined,
} from "@ant-design/icons";
import VisitaDetailModal, { type VisitaDetail } from "../components/modals-visitas/VisitaDetailModal";
import CreateVisitaModal, {
  type TecnicoMini,
  type EmpresaMini,
  type VisitaForEdit,
} from "../components/modals-visitas/CreateVisitaModal";

import VisitasDashboardModal, { VisitasDashboardInline } from "../components/modals-visitas/VisitasDashboard";
import ExportVisitasExcelModal from "../components/modals-visitas/ExportVisitasExel";

import { useAuth } from "../components/hooks/useAuth";

import { http } from "../service/http";

dayjs.locale("es");

const { RangePicker } = DatePicker;

/* ========= Domain ========= */
type ApiList<T> = { page: number; pageSize: number; total: number; totalPages: number; items: T[]; };
type VisitaRow = VisitaDetail & {
  empresa?: { id_empresa: number; nombre: string } | null;
  tecnico?: { id_tecnico: number; nombre: string } | null;
  solicitanteRef?: { id_solicitante: number; nombre: string } | null;
  direccion_visita?: string | null
  sucursal?: { id_sucursal: number; nombre: string } | null
};

type AgendaDiariaItem = {
  id: number;
  fecha: string;
  tipo: string;
  estado: string;
  empresaId: number | null;
  empresaNombre: string;
  horaInicio: string | null;
  horaFin: string | null;
  notas: string | null;
  mensaje: string | null;
};

type AtencionDiariaItem = {
  id_visita: number;
  empresaId: number;
  empresaNombre: string;
  solicitanteId: number | null;
  solicitanteNombre: string;
  inicio: string;
  fin: string | null;
  status: string;
  direccion_visita: string | null;
  otrosDetalle: string | null;

  sucursal: {
    id_sucursal: number;
    nombre: string;
    direccion: string | null;
  } | null;
};

type ResumenTecnicoDia = {
  tecnico: {
    id_tecnico: number;
    nombre: string;
    email: string;
    rol: string;
    status: boolean;
  };

  tieneAgenda: boolean;

  resumen: {
    totalProgramadas: number;
    totalAtenciones: number;
    totalJornadas: number;
    completadas: number;
    pendientes: number;
    canceladas: number;
    atencionesEnEmpresasProgramadas: number;
    atencionesFueraAgenda: number;
  };

  agendas: AgendaDiariaItem[];
  atenciones: AtencionDiariaItem[];
};

type ResumenVisitasDiaResponse = {
  fechaDesde: string;
  fechaHasta: string;

  totales: {
    tecnicos: number;
    tecnicosProgramados: number;
    agendas: number;
    atenciones: number;
    completadas: number;
    pendientes: number;
    canceladas: number;
  };

  tecnicos: ResumenTecnicoDia[];
};

type RangoAgenda = [Dayjs, Dayjs];

/* ========= Config ========= */
const PAGE_SIZE = 10;

/* ========= Utils ========= */
function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// formatea la fecha/hora en formato local de Chile, o devuelve "—" si no es válida o no existe
function formatDateTime(d: string | Date | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("es-CL", {
      timeZone: "America/Santiago",
      hour12: false,              // 24h
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return String(d);
  }
}

function obtenerFechaChileFront(
  fecha: string | Date
): string {
  return new Date(fecha).toLocaleDateString(
    "en-CA",
    {
      timeZone: "America/Santiago",
    }
  );
}

function obtenerHoyChile(): Dayjs {
  const fechaChile = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Santiago",
  });

  return dayjs(fechaChile).startOf("day");
}

function obtenerInicioSemana(fecha: Dayjs): Dayjs {
  const diaSemana = fecha.day();

  /*
    dayjs:
    0 = domingo
    1 = lunes
    ...
    6 = sábado
  */
  const diasDesdeLunes =
    diaSemana === 0
      ? 6
      : diaSemana - 1;

  return fecha
    .subtract(diasDesdeLunes, "day")
    .startOf("day");
}

function obtenerFinSemana(fecha: Dayjs): Dayjs {
  return obtenerInicioSemana(fecha)
    .add(6, "day")
    .startOf("day");
}

function formatearRangoAgenda(
  rango: RangoAgenda
): string {
  const [desde, hasta] = rango;

  if (desde.isSame(hasta, "day")) {
    return desde.format(
      "dddd DD [de] MMMM [de] YYYY"
    );
  }

  return `${desde.format("DD/MM/YYYY")} al ${hasta.format(
    "DD/MM/YYYY"
  )}`;
}

// devuelve un badge con color según el estado (PENDIENTE, EN_PROGRESO, COMPLETADA, CANCELADA), o gris si no reconoce el estado
function StatusBadge({ status }: { status: string }) {
  const norm = (status || "").toUpperCase();

  const styles: Record<string, string> = {
    PENDIENTE: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    EN_PROGRESO: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    COMPLETADA: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    CANCELADA: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  };

  const labels: Record<string, string> = {
    PENDIENTE: "Pendiente",
    EN_PROGRESO: "En progreso",
    COMPLETADA: "Completada",
    CANCELADA: "Cancelada",
  };

  const klass =
    styles[norm] || "bg-slate-50 text-slate-700 ring-1 ring-slate-200";

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        klass
      )}
    >
      {labels[norm] ?? status ?? "—"}
    </span>
  );
}

const clsx = (...xs: Array<string | false | null | undefined>) =>
  xs.filter(Boolean).join(" ");

/* ========= Página ========= */
const VisitasPage: React.FC = () => {
  const [q, setQ] = useState("");
  const qDebounced = useDebouncedValue(q, 400);
  const [tecnicoId, setTecnicoId] = useState<number | "">("");
  const [empresaId, setEmpresaId] = useState<number | "">("");
  const [monthFilter, setMonthFilter] = useState<string>("");
  const [yearFilter, setYearFilter] = useState<string>("");

  // paginación
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApiList<VisitaRow> | null>(null);
  const totalPages = useMemo(() => Math.max(1, data?.totalPages ?? 1), [data]);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  // estado de carga y errores
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tecnicos, setTecnicos] = useState<TecnicoMini[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaMini[]>([]);
  const [openDetail, setOpenDetail] = useState(false);
  const [selected, setSelected] = useState<VisitaDetail | null>(null);

  // crear
  const [openCreate, setOpenCreate] = useState(false);

  // editar con CreateVisitaModal
  const [openEdit, setOpenEdit] = useState(false);
  const [editVisita, setEditVisita] = useState<VisitaForEdit | null>(null);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [openDashboard, setOpenDashboard] = useState(false);
  const [openExportExcel, setOpenExportExcel] = useState(false);

  const [activeTab, setActiveTab] =
    useState<"lista" | "agenda" | "dashboard">("lista");

  const [tecnicosExpandidos, setTecnicosExpandidos] =
    useState<Set<number>>(new Set());

  type SeleccionAgenda = {
    empresaId: number;
    fecha: string;
  };

  const [
    agendaSeleccionadaPorTecnico,
    setAgendaSeleccionadaPorTecnico,
  ] = useState<
    Record<number, SeleccionAgenda | undefined>
  >({});

  const [rangoAgenda, setRangoAgenda] =
    useState<RangoAgenda>(() => {
      const hoy = obtenerHoyChile();

      return [hoy, hoy];
    });

  const presetsAgenda = useMemo(() => {
    const hoy = obtenerHoyChile();
    const ayer = hoy.subtract(1, "day");

    const inicioSemanaActual =
      obtenerInicioSemana(hoy);

    const finSemanaActual =
      obtenerFinSemana(hoy);

    const inicioSemanaAnterior =
      inicioSemanaActual.subtract(7, "day");

    const finSemanaAnterior =
      inicioSemanaActual.subtract(1, "day");

    return [
      {
        label: "Hoy",
        value: [hoy, hoy] as RangoAgenda,
      },
      {
        label: "Ayer",
        value: [ayer, ayer] as RangoAgenda,
      },
      {
        label: "Últimos 3 días",
        value: [
          hoy.subtract(2, "day"),
          hoy,
        ] as RangoAgenda,
      },
      {
        label: "Esta semana",
        value: [
          inicioSemanaActual,
          finSemanaActual,
        ] as RangoAgenda,
      },
      {
        label: "Semana anterior",
        value: [
          inicioSemanaAnterior,
          finSemanaAnterior,
        ] as RangoAgenda,
      },
    ];
  }, []);

  const [resumenDia, setResumenDia] =
    useState<ResumenVisitasDiaResponse | null>(null);

  const [loadingResumenDia, setLoadingResumenDia] =
    useState(false);

  const [errorResumenDia, setErrorResumenDia] =
    useState<string | null>(null);

  const reqSeqRef = useRef(0);

  const showingRange = useMemo(() => {
    if (!data || data.total === 0) return null;
    const start = (data.page - 1) * data.pageSize + 1;
    const end = Math.min(data.page * data.pageSize, data.total);
    return { start, end };
  }, [data]);

  /* === useCallback para cumplir exhaustive-deps === */
  const fetchFilters = useCallback(async (signal?: AbortSignal) => {
    try {
      const r = await http.get("/visitas/filters", { signal });
      const json = r.data as { tecnicos: TecnicoMini[]; empresas: EmpresaMini[] };
      setTecnicos(json.tecnicos || []);
      setEmpresas(json.empresas || []);
    } catch (err: any) {
      // Ignorar cancelaciones (desmonte del componente)
      if (err?.code === "ERR_CANCELED" || err?.name === "CanceledError") return;
      console.error("Error cargando filtros:", err);
    }
  }, []);

  // Función para cargar la lista de visitas según filtros y paginación, con manejo de concurrencia y cancelación
  const fetchList = useCallback(async (signal?: AbortSignal) => {
    const seq = ++reqSeqRef.current;

    try {
      setLoading(true);
      setError(null);

      const res = await http.get("/visitas", {
        signal,
        params: {
          page,
          pageSize: PAGE_SIZE,
          q: qDebounced.trim() || undefined,
          tecnicoId: tecnicoId || undefined,
          empresaId: empresaId || undefined,
          month: monthFilter || undefined,
          year: yearFilter || undefined,
          _ts: Date.now()
        }
      });

      if (seq !== reqSeqRef.current) return;

      const json = res.data as ApiList<VisitaRow>;
      setData(json);

    } catch (err: any) {
      if (err?.code === "ERR_CANCELED") return;

      console.error("Error visitas:", err);

      setError(err?.message || "Error al cargar visitas");
    } finally {
      if (seq === reqSeqRef.current) setLoading(false);
    }
  }, [page, qDebounced, tecnicoId, empresaId, monthFilter, yearFilter]);

  const fetchResumenDia = useCallback(
    async (signal?: AbortSignal) => {
      const [fechaDesde, fechaHasta] =
        rangoAgenda;

      if (!fechaDesde || !fechaHasta) {
        setResumenDia(null);
        return;
      }

      try {
        setLoadingResumenDia(true);
        setErrorResumenDia(null);
        setResumenDia(null);

        const response =
          await http.get<ResumenVisitasDiaResponse>(
            "/visitas/resumen-diario",
            {
              signal,

              params: {
                fechaDesde:
                  fechaDesde.format("YYYY-MM-DD"),

                fechaHasta:
                  fechaHasta.format("YYYY-MM-DD"),

                tecnicoId:
                  tecnicoId || undefined,

                empresaId:
                  empresaId || undefined,

                _ts: Date.now(),
              },
            }
          );

        setResumenDia(response.data);
      } catch (err: any) {
        if (
          err?.code === "ERR_CANCELED" ||
          err?.name === "CanceledError"
        ) {
          return;
        }

        console.error(
          "Error cargando resumen de agenda:",
          err
        );

        setErrorResumenDia(
          err?.response?.data?.error ??
          err?.message ??
          "No fue posible cargar la agenda del periodo."
        );
      } finally {
        setLoadingResumenDia(false);
      }
    },
    [
      rangoAgenda,
      tecnicoId,
      empresaId,
    ]
  );

  // Función para refrescar la lista después de crear/editar/eliminar sin esperar al efecto
  const refreshNow = useCallback(() => {
    const c = new AbortController();
    void fetchList(c.signal);
  }, [fetchList]);

  const refreshVisitasData = useCallback(() => {
    const listController = new AbortController();

    void fetchList(listController.signal);

    /*
      Si la pestaña diaria está activa, también recarga
      la comparación entre agenda y atenciones.
    */
    if (activeTab === "agenda") {
      const resumenController = new AbortController();

      void fetchResumenDia(resumenController.signal);
    }
  }, [
    fetchList,
    fetchResumenDia,
    activeTab,
  ]);

  const toggleTecnicoExpandido = useCallback(
    (tecnicoId: number) => {
      setTecnicosExpandidos((actuales) => {
        const nuevos = new Set(actuales);

        if (nuevos.has(tecnicoId)) {
          nuevos.delete(tecnicoId);

          /*
            Al minimizar el técnico también se elimina
            la agenda/empresa seleccionada.
          */
          setAgendaSeleccionadaPorTecnico(
            (seleccionesActuales) => {
              const nuevasSelecciones = {
                ...seleccionesActuales,
              };

              delete nuevasSelecciones[tecnicoId];

              return nuevasSelecciones;
            }
          );
        } else {
          nuevos.add(tecnicoId);
        }

        return nuevos;
      });
    },
    []
  );

  /* === Efectos usando las funciones memorizadas === */
  useEffect(() => {
    const c = new AbortController();
    fetchFilters(c.signal);
    return () => c.abort();
  }, [fetchFilters]);

  // Al cargar la página o cambiar filtros/página, cargar la lista de visitas
  useEffect(() => {
    const c = new AbortController();
    fetchList(c.signal);
    return () => c.abort();
  }, [fetchList]);

  //  Al cambiar cualquier filtro, volver a la página 1
  const clearAll = () => {
    setQ("");
    setTecnicoId("");
    setEmpresaId("");
    setMonthFilter("");
    setYearFilter("");
    setPage(1);
  };

  useEffect(() => {
    if (activeTab !== "agenda") return;

    const controller = new AbortController();

    void fetchResumenDia(controller.signal);

    return () => controller.abort();
  }, [activeTab, fetchResumenDia]);

  useEffect(() => {
    setAgendaSeleccionadaPorTecnico({});
  }, [rangoAgenda, tecnicoId, empresaId]);

  const { user, isCliente, isAdminLike } = useAuth();

  const canCreateVisita = !isCliente;

  // Si el usuario es cliente, preseleccionar su empresa y no permitir cambiarla
  useEffect(() => {
    if (isCliente && user?.empresaId) {
      setEmpresaId(user.empresaId);
    }
  }, [isCliente, user]);

  // Al hacer click en una fila, abrir el modal de detalle
  const openRow = useCallback((row: VisitaRow) => {
    const visita: VisitaDetail = {
      id_visita: row.id_visita,
      empresaId: row.empresaId,
      tecnicoId: row.tecnicoId,

      solicitante:
        row.solicitante ??
        row.solicitanteRef?.nombre ??
        "",

      direccion_visita:
        row.direccion_visita ?? null,

      sucursal:
        row.sucursal ?? null,

      inicio: row.inicio,
      fin: row.fin ?? null,

      confImpresoras: row.confImpresoras,
      confTelefonos: row.confTelefonos,
      confPiePagina: row.confPiePagina,

      otros: row.otros,
      otrosDetalle: row.otrosDetalle ?? null,

      status: row.status,

      empresa: row.empresa
        ? {
          id_empresa: row.empresa.id_empresa,
          nombre: row.empresa.nombre,
        }
        : undefined,

      tecnico: row.tecnico
        ? {
          id_tecnico: row.tecnico.id_tecnico,
          nombre: row.tecnico.nombre,
        }
        : undefined,

      actualizaciones: row.actualizaciones,
      antivirus: row.antivirus,
      ccleaner: row.ccleaner,
      estadoDisco: row.estadoDisco,
      licenciaOffice: row.licenciaOffice,
      licenciaWindows: row.licenciaWindows,
      mantenimientoReloj: row.mantenimientoReloj,
      rendimientoEquipo: row.rendimientoEquipo,
    };

    setSelected(visita);
    setOpenDetail(true);
  }, []);

  const openVisitaById = useCallback(
    async (visitaId: number) => {
      try {
        const response = await http.get<VisitaRow>(
          `/visitas/${visitaId}`
        );

        openRow(response.data);
      } catch (error: any) {
        console.error(
          "Error cargando detalle de visita:",
          error
        );

        alert(
          error?.response?.data?.error ??
          error?.message ??
          "No fue posible abrir la visita."
        );
      }
    },
    [openRow]
  );

  async function apiDeleteVisita(id: number) {
    await http.delete(`/visitas/${id}`);
  }

  // Al hacer click en editar, abrir el modal de edición con los datos cargados
  const onClickEdit = (row: VisitaRow) => {
    const v: VisitaForEdit = {
      id_visita: row.id_visita,
      empresaId: row.empresaId,
      tecnicoId: row.tecnicoId,
      solicitante: row.solicitante ?? row.solicitanteRef?.nombre ?? "",
      solicitanteId: row.solicitanteRef?.id_solicitante ?? null,
      inicio: row.inicio,
      fin: row.fin ?? null,
      status: row.status as unknown as VisitaForEdit["status"],
      confImpresoras: !!row.confImpresoras,
      confTelefonos: !!row.confTelefonos,
      confPiePagina: !!row.confPiePagina,
      otros: !!row.otros,
      otrosDetalle: row.otros ? (row.otrosDetalle ?? null) : null,
      actualizaciones: !!row.actualizaciones,
      antivirus: !!row.antivirus,
      ccleaner: !!row.ccleaner,
      estadoDisco: !!row.estadoDisco,
      licenciaOffice: !!row.licenciaOffice,
      licenciaWindows: !!row.licenciaWindows,
      mantenimientoReloj: !!row.mantenimientoReloj,
      rendimientoEquipo: !!row.rendimientoEquipo,
    };
    setEditVisita(v);
    setOpenEdit(true);
  };

  // Al hacer click en eliminar, pedir confirmación y eliminar la visita
  const onClickDelete = async (row: VisitaRow) => {
    if (!window.confirm(`¿Eliminar la visita #${row.id_visita}? Esta acción no se puede deshacer.`)) return;
    try {
      setDeletingId(row.id_visita);
      await apiDeleteVisita(row.id_visita);
      refreshVisitasData();
    } catch (e) {
      alert((e as Error).message || "No se pudo eliminar la visita");
    } finally {
      setDeletingId(null);
    }
  };

  // Funciones para determinar elegibilidad de visitas para el resumen
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-white via-white to-cyan-50">
      {/* Fondo */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 [background:radial-gradient(circle_at_1px_1px,rgba(14,165,233,0.08)_1px,transparent_0)_0_0/22px_22px]" />
        <div className="absolute -top-32 -left-32 w-[60vw] max-w-[520px] aspect-square rounded-full blur-3xl bg-gradient-to-br from-cyan-200 to-indigo-200 opacity-40" />
        <div className="absolute -bottom-40 -right-40 w-[65vw] max-w-[560px] aspect-square rounded-full blur-3xl bg-gradient-to-tr from-fuchsia-200 to-cyan-200 opacity-40" />
      </div>

      {/* Hero / Toolbar */}
      <div className="px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6 max-w-7xl mx-auto w-full">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-cyan-200 bg-white/80 backdrop-blur-xl shadow-sm">
          <div className="absolute inset-0 opacity-60 bg-[conic-gradient(from_180deg_at_50%_50%,rgba(14,165,233,0.06),transparent_30%,rgba(99,102,241,0.06),transparent_60%,rgba(236,72,153,0.06),transparent_90%)]" />
          <div className="relative p-4 sm:p-6 md:p-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
              Visitas{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-indigo-600">
                RIDS.CL
              </span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-600">
              Filtra por técnico, empresa, mes o texto libre. Exporta y gestiona en tiempo real.
            </p>

            {/* ── Tabs ── */}
            <div className="mt-5 flex gap-1 border-b border-cyan-100">
              <button
                type="button"
                onClick={() => setActiveTab("lista")}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${activeTab === "lista"
                  ? "bg-white border border-b-white border-cyan-200 text-cyan-700 -mb-px"
                  : "text-slate-500 hover:text-cyan-600"
                  }`}
              >
                Lista de visitas
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("agenda")}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${activeTab === "agenda"
                  ? "bg-white border border-b-white border-cyan-200 text-cyan-700 -mb-px"
                  : "text-slate-500 hover:text-cyan-600"
                  }`}
              >
                Agenda y atenciones
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("dashboard")}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${activeTab === "dashboard"
                  ? "bg-white border border-b-white border-cyan-200 text-cyan-700 -mb-px"
                  : "text-slate-500 hover:text-cyan-600"
                  }`}
              >
                Dashboard
              </button>
            </div>

            {/* ── Toolbar (solo en tab lista) ── */}
            {activeTab === "lista" && (
              <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-3">
                {/* Búsqueda */}
                <div className="relative md:col-span-4">
                  <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600/70" />
                  <input
                    value={q}
                    onChange={(e) => { setQ(e.target.value); setPage(1); }}
                    placeholder="Buscar…"
                    className="w-full rounded-2xl border border-cyan-200/70 bg-white/90 pl-9 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                    aria-label="Buscar visitas"
                  />
                  {q.length > 0 && (
                    <button
                      onClick={() => setQ("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-cyan-700/80 hover:text-cyan-900"
                      aria-label="Limpiar búsqueda"
                      title="Limpiar"
                      type="button"
                    >
                      <CloseCircleFilled />
                    </button>
                  )}
                </div>

                {/* Filtro técnico */}
                <div className="md:col-span-3">
                  <select
                    value={tecnicoId}
                    onChange={(e) => { const v = e.target.value; setTecnicoId(v ? Number(v) : ""); setPage(1); }}
                    className="w-full rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                    aria-label="Filtrar por técnico"
                  >
                    <option value="">Todos los técnicos</option>
                    {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </div>

                {/* Filtro empresa */}
                {isAdminLike && (
                  <div className="md:col-span-3">
                    <select
                      value={empresaId}
                      onChange={(e) => {
                        const v = e.target.value;
                        setEmpresaId(v ? Number(v) : "");
                        setPage(1);
                      }}
                      className="w-full rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm"
                    >
                      <option value="">Todas las empresas</option>
                      {empresas.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Filtro mes */}
                <div className="md:col-span-1">
                  <select
                    value={monthFilter}
                    onChange={(e) => { setMonthFilter(e.target.value); setPage(1); }}
                    className="w-full rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                    aria-label="Filtrar por mes"
                  >
                    <option value="">Mes</option>
                    <option value="1">Ene</option>
                    <option value="2">Feb</option>
                    <option value="3">Mar</option>
                    <option value="4">Abr</option>
                    <option value="5">May</option>
                    <option value="6">Jun</option>
                    <option value="7">Jul</option>
                    <option value="8">Ago</option>
                    <option value="9">Sep</option>
                    <option value="10">Oct</option>
                    <option value="11">Nov</option>
                    <option value="12">Dic</option>
                  </select>
                </div>

                {/* Filtro año */}
                <div className="md:col-span-1">
                  <select
                    value={yearFilter}
                    onChange={(e) => { setYearFilter(e.target.value); setPage(1); }}
                    className="w-full rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                    aria-label="Filtrar por año"
                  >
                    <option value="">Año</option>
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                  </select>
                </div>

                {/* Acciones */}
                <div className="md:col-span-12 lg:col-span-12 xl:col-span-12">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Limpiar */}
                    <button
                      onClick={clearAll}
                      type="button"
                      className="
                    inline-flex items-center justify-center gap-2
                    rounded-2xl border border-cyan-200/70 bg-white/90
                    px-3 py-2.5 text-sm text-cyan-800 hover:bg-cyan-50 active:scale-[0.98]
                    transition duration-200 w-full min-w-[120px]
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white
                  "
                      title="Limpiar filtros"
                    >
                      <CloseCircleFilled className="hidden sm:inline" />
                      <span className="truncate">Limpiar</span>
                    </button>

                    <button
                      onClick={() => setOpenExportExcel(true)}
                      disabled={loading || (data?.total ?? 0) === 0}
                      className={clsx(
                        "col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium text-white",
                        "bg-gradient-to-tr from-emerald-600 to-cyan-600 shadow-[0_6px_18px_-6px_rgba(16,185,129,0.45)] hover:brightness-110",
                        (loading || (data?.total ?? 0) === 0) && "opacity-60 cursor-not-allowed"
                      )}
                      title="Exportar a Excel"
                      type="button"
                    >
                      Exportar
                    </button>

                    {/* Nueva visita */}
                    {canCreateVisita && (
                      <button
                        onClick={() => setOpenCreate(true)}
                        type="button"
                        className="
      inline-flex items-center justify-center gap-2
      rounded-2xl px-3 py-2.5 text-sm font-medium text-white
      bg-gradient-to-tr from-emerald-600 to-cyan-600
      shadow-[0_6px_18px_-6px_rgba(16,185,129,0.45)]
      hover:brightness-110 active:scale-[0.98]
      transition duration-200 w-full min-w-[120px]
      focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white
    "
                        title="Nueva visita"
                      >
                        <span className="sm:hidden">+</span>
                        <span className="hidden sm:inline">+ Nueva</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Separador */}
            <div className="mt-4 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent" />
          </div>
        </div>
      </div>

      {/* Lista responsiva: Cards (mobile) / Tabla (md+) */}
      {activeTab === "lista" && (
        <main className="px-3 sm:px-4 md:px-6 lg:px-8 pb-24 md:pb-10 max-w-7xl mx-auto w-full">
          {/* Cards (mobile) */}
          <section className="md:hidden space-y-3 mt-4" aria-live="polite" aria-busy={loading ? "true" : "false"}>
            {loading && (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={`skc-${i}`} className="rounded-2xl border border-cyan-200 bg-white p-4 animate-pulse">
                    <div className="h-4 w-24 bg-cyan-50 rounded mb-2" />
                    <div className="h-3 w-3/4 bg-cyan-50 rounded mb-2" />
                    <div className="h-3 w-1/2 bg-cyan-50 rounded" />
                  </div>
                ))}
              </div>
            )}
            {!loading && error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 p-4 text-center">{error}</div>
            )}
            {!loading && !error && data?.items?.length === 0 && (
              <div className="rounded-2xl border border-cyan-200 bg-white text-slate-600 p-4 text-center">Sin resultados.</div>
            )}
            {!loading && !error && data?.items?.map((v) => {
              const nombreSolicitante = v.solicitanteRef?.nombre ?? v.solicitante ?? "—";
              const isDeleting = deletingId === v.id_visita;
              return (
                <article key={v.id_visita} className="rounded-2xl border border-cyan-200 bg-white p-4 transition hover:shadow-md">
                  <header className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-500">#{v.id_visita}</div>
                      <h3 className="text-base font-semibold text-slate-900">
                        {v.empresa?.nombre ?? `#${v.empresaId}`}
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {v.tecnico?.nombre ?? `#${v.tecnicoId}`} • {formatDateTime(v.inicio)}
                      </p>
                    </div>
                    <StatusBadge status={v.status} />
                  </header>

                  <p className="text-sm text-slate-700 mt-2">
                    <span className="text-slate-500">Solicitante:</span> {nombreSolicitante}
                  </p>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button
                      onClick={() => openRow(v)}
                      className="col-span-1 rounded-xl border border-cyan-200 bg-white/90 text-cyan-800 px-2 py-2 text-sm hover:bg-cyan-50"
                    >
                      Detalle
                    </button>
                    {isAdminLike && (
                      <button
                        onClick={() => onClickEdit(v)}
                        className="col-span-1 inline-flex items-center justify-center gap-1 rounded-xl border border-emerald-200 text-emerald-700 px-2 py-2 text-sm hover:bg-emerald-50"
                      >
                        <EditOutlined />Editar
                      </button>
                    )}
                    {isAdminLike && (
                      <button
                        onClick={() => onClickDelete(v)}
                        disabled={isDeleting}
                        className={clsx(
                          "col-span-1 inline-flex items-center justify-center gap-1 rounded-xl border px-2 py-2 text-sm transition",
                          isDeleting
                            ? "border-rose-200 bg-rose-50 text-rose-700 cursor-wait"
                            : "border-rose-200 text-rose-700 hover:bg-rose-50"
                        )}
                      >
                        <DeleteOutlined /> {isDeleting ? "..." : "Eliminar"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </section>

          {/* Tabla (desktop) */}
          <section
            className="hidden md:block rounded-3xl border border-cyan-200 bg-white overflow-hidden mt-4"
            aria-live="polite"
            aria-busy={loading ? "true" : "false"}
          >
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gradient-to-r from-cyan-50 to-indigo-50 text-slate-800 border-b border-cyan-200 sticky top-0 z-10">
                  <tr>
                    {["ID", "Técnico", "Empresa", "Solicitante", "Inicio", "Estado", "Acciones"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-slate-800">
                  {loading && <TableSkeletonRows cols={7} rows={8} />}
                  {!loading && error && (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-rose-700">{error}</td></tr>
                  )}
                  {!loading && !error && data?.items?.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-600">Sin resultados.</td></tr>
                  )}
                  {!loading && !error && data?.items?.map((v) => {
                    const nombreSolicitante = v.solicitanteRef?.nombre ?? v.solicitante ?? "—";
                    const isDeleting = deletingId === v.id_visita;
                    return (
                      <tr
                        key={v.id_visita}
                        className="border-t border-cyan-100 transition-colors odd:bg-white even:bg-slate-50/40 hover:bg-cyan-50/60"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">{v.id_visita}</td>
                        <td className="px-4 py-3">{v.tecnico?.nombre ?? `#${v.tecnicoId}`}</td>
                        <td className="px-4 py-3">{v.empresa?.nombre ?? `#${v.empresaId}`}</td>
                        <td className="px-4 py-3">
                          <div className="max-w-[420px] truncate" title={nombreSolicitante}>{nombreSolicitante}</div>
                        </td>
                        <td className="px-4 py-3">{formatDateTime(v.inicio)}</td>
                        <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() => openRow(v)}
                              className="rounded-lg border border-cyan-200 bg-white/90 text-cyan-800 px-2 py-1 hover:bg-cyan-50 transition"
                            >
                              Detalle
                            </button>
                            {isAdminLike && (
                              <button
                                onClick={() => onClickEdit(v)}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 text-emerald-700 px-2 py-1 hover:bg-emerald-50 transition"
                              >
                                <EditOutlined /> Editar
                              </button>
                            )}
                            {isAdminLike && (
                              <button
                                onClick={() => onClickDelete(v)}
                                disabled={isDeleting}
                                className={clsx(
                                  "col-span-1 inline-flex items-center justify-center gap-1 rounded-xl border px-2 py-2 text-sm transition",
                                  isDeleting
                                    ? "border-rose-200 bg-rose-50 text-rose-700 cursor-wait"
                                    : "border-rose-200 text-rose-700 hover:bg-rose-50"
                                )}
                              >
                                <DeleteOutlined /> {isDeleting ? "…" : "Eliminar"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer paginación */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-slate-50 border-t border-cyan-200">
              <div className="text-sm text-slate-700 text-center sm:text-left">
                {data ? (
                  showingRange ? (
                    <>
                      Mostrando{" "}
                      <strong className="text-slate-900">{showingRange.start}</strong>–
                      <strong className="text-slate-900">{showingRange.end}</strong> de{" "}
                      <strong className="text-slate-900">{data.total}</strong> • Página{" "}
                      <strong className="text-slate-900">{data.page}</strong> de{" "}
                      <strong className="text-slate-900">{totalPages}</strong>
                    </>
                  ) : "—"
                ) : "—"}
              </div>

              <div className="grid grid-cols-3 sm:flex sm:items-center gap-2">
                <button
                  onClick={refreshNow}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-sm border-cyan-200 text-cyan-800 bg-white hover:bg-cyan-50 transition"
                  title="Recargar"
                  type="button"
                >
                  <ReloadOutlined /> <span className="hidden sm:inline">Recargar</span>
                </button>
                <button
                  onClick={() => canPrev && setPage(p => p - 1)}
                  disabled={!canPrev || loading}
                  className={clsx(
                    "inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-sm",
                    "border-cyan-200 text-cyan-800 bg-white hover:bg-cyan-50",
                    (!canPrev || loading) && "opacity-40 cursor-not-allowed hover:bg-white"
                  )}
                  aria-label="Página anterior"
                  type="button"
                >
                  <LeftOutlined />
                  <span className="hidden sm:inline">Anterior</span>
                </button>
                <button
                  onClick={() => canNext && setPage(p => p + 1)}
                  disabled={!canNext || loading}
                  className={clsx(
                    "inline-flex items-center justify-center gap-2 rounded-2xl border px-3 py-2 text-sm",
                    "border-cyan-200 text-cyan-800 bg-white hover:bg-cyan-50",
                    (!canNext || loading) && "opacity-40 cursor-not-allowed hover:bg-white"
                  )}
                  aria-label="Página siguiente"
                  type="button"
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <RightOutlined />
                </button>
              </div>
            </div>
          </section>
        </main>
      )}

      {activeTab === "agenda" && (
        <main className="px-3 sm:px-4 md:px-6 lg:px-8 pb-24 md:pb-10 max-w-7xl mx-auto w-full">
          <section className="mt-4 space-y-4">
            {/* Selector de fecha */}
            <div className="rounded-2xl border border-cyan-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Agenda y atenciones en terreno
                  </h2>

                  <p className="mt-1 text-sm font-medium capitalize text-cyan-700">
                    {formatearRangoAgenda(rangoAgenda)}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    Compara la planificación del calendario con las
                    atenciones registradas por cada técnico durante
                    el periodo seleccionado.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {/* Rango de fechas */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">
                      Periodo
                    </label>

                    <RangePicker
                      value={rangoAgenda}
                      presets={presetsAgenda}
                      format="DD/MM/YYYY"
                      allowClear={false}
                      className="w-full"
                      placeholder={[
                        "Fecha desde",
                        "Fecha hasta",
                      ]}
                      onChange={(values) => {
                        const desde = values?.[0];
                        const hasta = values?.[1];

                        if (!desde || !hasta) {
                          return;
                        }

                        setRangoAgenda([
                          desde.startOf("day"),
                          hasta.startOf("day"),
                        ]);
                      }}
                    />
                  </div>

                  {/* Técnico */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">
                      Técnico
                    </label>

                    <Select
                      value={tecnicoId || undefined}
                      placeholder="Todos los técnicos"
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      className="w-full"
                      options={tecnicos.map((tecnico) => ({
                        value: tecnico.id,
                        label: tecnico.nombre,
                      }))}
                      onChange={(value?: number) => {
                        setTecnicoId(value ?? "");
                      }}
                    />
                  </div>

                  {/* Empresa */}
                  {isAdminLike && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-600">
                        Empresa
                      </label>

                      <Select
                        value={empresaId || undefined}
                        placeholder="Todas las empresas"
                        allowClear
                        showSearch
                        optionFilterProp="label"
                        className="w-full"
                        options={empresas.map((empresa) => ({
                          value: empresa.id,
                          label: empresa.nombre,
                        }))}
                        onChange={(value?: number) => {
                          setEmpresaId(value ?? "");
                        }}
                      />
                    </div>
                  )}

                  {/* Actualizar */}
                  <div className="flex items-end">
                    <Button
                      type="primary"
                      icon={<ReloadOutlined />}
                      loading={loadingResumenDia}
                      onClick={() => {
                        void fetchResumenDia();
                      }}
                      className="w-full"
                    >
                      Actualizar
                    </Button>
                  </div>
                </div>

                {/* Botones rápidos */}
                <Space wrap size={[8, 8]}>
                  <Button
                    size="small"
                    onClick={() => {
                      const hoy = obtenerHoyChile();

                      setRangoAgenda([hoy, hoy]);
                    }}
                  >
                    Hoy
                  </Button>

                  <Button
                    size="small"
                    onClick={() => {
                      const ayer =
                        obtenerHoyChile().subtract(1, "day");

                      setRangoAgenda([ayer, ayer]);
                    }}
                  >
                    Ayer
                  </Button>

                  <Button
                    size="small"
                    onClick={() => {
                      const hoy = obtenerHoyChile();

                      setRangoAgenda([
                        hoy.subtract(2, "day"),
                        hoy,
                      ]);
                    }}
                  >
                    Últimos 3 días
                  </Button>

                  <Button
                    size="small"
                    onClick={() => {
                      const hoy = obtenerHoyChile();

                      setRangoAgenda([
                        obtenerInicioSemana(hoy),
                        obtenerFinSemana(hoy),
                      ]);
                    }}
                  >
                    Esta semana
                  </Button>

                  <Button
                    size="small"
                    onClick={() => {
                      const inicioSemanaActual =
                        obtenerInicioSemana(
                          obtenerHoyChile()
                        );

                      setRangoAgenda([
                        inicioSemanaActual.subtract(
                          7,
                          "day"
                        ),

                        inicioSemanaActual.subtract(
                          1,
                          "day"
                        ),
                      ]);
                    }}
                  >
                    Semana anterior
                  </Button>
                </Space>
              </div>
            </div>
            {/* Error */}
            {errorResumenDia && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {errorResumenDia}
              </div>
            )}

            {/* Cargando */}
            {loadingResumenDia && (
              <div className="grid gap-4 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={`agenda-skeleton-${index}`}
                    className="h-52 animate-pulse rounded-2xl border border-cyan-200 bg-white p-4"
                  >
                    <div className="h-5 w-40 rounded bg-slate-100" />
                    <div className="mt-4 h-4 w-full rounded bg-slate-100" />
                    <div className="mt-2 h-4 w-3/4 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            )}

            {/* Resultados */}
            {!loadingResumenDia &&
              !errorResumenDia &&
              resumenDia && (
                <>
                  {/* KPI */}
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                    <ResumenDiaKpi
                      label="Técnicos programados"
                      value={resumenDia.totales.tecnicosProgramados}
                    />

                    <ResumenDiaKpi
                      label="Bloques de agenda"
                      value={resumenDia.totales.agendas}
                    />

                    <ResumenDiaKpi
                      label="Atenciones"
                      value={resumenDia.totales.atenciones}
                    />

                    <ResumenDiaKpi
                      label="Completadas"
                      value={resumenDia.totales.completadas}
                    />

                    <ResumenDiaKpi
                      label="Pendientes"
                      value={resumenDia.totales.pendientes}
                    />

                    <ResumenDiaKpi
                      label="Canceladas"
                      value={resumenDia.totales.canceladas}
                    />
                  </div>

                  {/* Acciones del listado */}
                  {resumenDia.tecnicos.length > 0 && (
                    <div className="flex justify-end">
                      <Space wrap>
                        <Button
                          size="small"
                          onClick={() => {
                            setTecnicosExpandidos(
                              new Set(
                                resumenDia.tecnicos.map(
                                  (item) => item.tecnico.id_tecnico
                                )
                              )
                            );
                          }}
                        >
                          Expandir todos
                        </Button>

                        <Button
                          size="small"
                          onClick={() => {
                            setTecnicosExpandidos(new Set());
                          }}
                        >
                          Minimizar todos
                        </Button>
                      </Space>
                    </div>
                  )}

                  {/* Listado de técnicos */}
                  {resumenDia.tecnicos.length === 0 ? (
                    <div className="rounded-2xl border border-cyan-200 bg-white p-8 text-center text-slate-500">
                      No existen visitas programadas ni atenciones
                      registradas para el periodo seleccionado.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {resumenDia.tecnicos.map((item) => {
                        const estaExpandido =
                          tecnicosExpandidos.has(
                            item.tecnico.id_tecnico
                          );

                        const tecnicoIdActual = item.tecnico.id_tecnico;

                        const seleccionAgenda =
                          agendaSeleccionadaPorTecnico[
                          tecnicoIdActual
                          ];

                        const empresaSeleccionadaId =
                          seleccionAgenda?.empresaId;

                        const fechaSeleccionada =
                          seleccionAgenda?.fecha;

                        const agendaSeleccionada = item.agendas.find(
                          (agenda) =>
                            agenda.empresaId === empresaSeleccionadaId
                        );

                        const atencionesFiltradas =
                          !empresaSeleccionadaId ||
                            !fechaSeleccionada
                            ? []
                            : item.atenciones.filter((atencion) => {
                              const fechaAtencion =
                                obtenerFechaChileFront(
                                  atencion.inicio
                                );

                              return (
                                atencion.empresaId ===
                                empresaSeleccionadaId &&
                                fechaAtencion ===
                                fechaSeleccionada
                              );
                            });

                        const agendasOrdenadas = [...item.agendas].sort(
                          (agendaA, agendaB) => {
                            const comparacionFecha =
                              agendaA.fecha.localeCompare(agendaB.fecha);

                            if (comparacionFecha !== 0) {
                              return comparacionFecha;
                            }

                            const horaA = agendaA.horaInicio ?? "99:99";
                            const horaB = agendaB.horaInicio ?? "99:99";

                            return horaA.localeCompare(horaB);
                          }
                        );

                        const agendasAgrupadasPorFecha = Array.from(
                          agendasOrdenadas.reduce<
                            Map<string, AgendaDiariaItem[]>
                          >((grupos, agenda) => {
                            const fechaAgenda = agenda.fecha.slice(0, 10);

                            const agendasFecha =
                              grupos.get(fechaAgenda) ?? [];

                            agendasFecha.push(agenda);
                            grupos.set(fechaAgenda, agendasFecha);

                            return grupos;
                          }, new Map())
                        );

                        return (
                          <article
                            key={item.tecnico.id_tecnico}
                            className="overflow-hidden rounded-2xl border border-cyan-200 bg-white shadow-sm"
                          >
                            {/* Encabezado del técnico */}
                            <header className="flex flex-col gap-3 border-b border-cyan-100 bg-gradient-to-r from-cyan-50 to-indigo-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-base font-bold text-slate-900">
                                    {item.tecnico.nombre}
                                  </h3>

                                  {item.tieneAgenda ? (
                                    <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-700">
                                      Programado
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                                      Sin agenda previa
                                    </span>
                                  )}
                                </div>

                                <p className="mt-1 text-xs text-slate-500">
                                  {item.tecnico.email}
                                </p>
                              </div>

                              <div className="flex flex-col gap-3 sm:items-end">
                                <div className="flex flex-wrap gap-2">
                                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                    {item.resumen.totalProgramadas} programadas
                                  </span>

                                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                                    {item.resumen.totalAtenciones} atenciones
                                  </span>

                                  <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                                    {item.resumen.totalJornadas} jornadas
                                  </span>

                                  {item.resumen.atencionesFueraAgenda > 0 && (
                                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                      {item.resumen.atencionesFueraAgenda} fuera de agenda
                                    </span>
                                  )}
                                </div>

                                <Button
                                  type="text"
                                  shape="circle"
                                  size="small"
                                  icon={
                                    estaExpandido
                                      ? <UpOutlined />
                                      : <DownOutlined />
                                  }
                                  onClick={() =>
                                    toggleTecnicoExpandido(
                                      item.tecnico.id_tecnico
                                    )
                                  }
                                  aria-label={
                                    estaExpandido
                                      ? `Minimizar detalle de ${item.tecnico.nombre}`
                                      : `Ver detalle de ${item.tecnico.nombre}`
                                  }
                                  title={
                                    estaExpandido
                                      ? "Minimizar detalle"
                                      : "Ver detalle"
                                  }
                                />
                              </div>
                            </header>

                            {estaExpandido && (
                              <div className="grid gap-0 lg:grid-cols-2">
                                {/* Agenda */}
                                <div className="border-b border-cyan-100 p-4 lg:border-b-0 lg:border-r">
                                  <div className="mb-3">
                                    <h4 className="text-sm font-bold text-slate-700">
                                      Calendario del técnico
                                    </h4>

                                    <p className="mt-1 text-xs text-slate-500">
                                      Selecciona una empresa para visualizar sus
                                      atenciones.
                                    </p>
                                  </div>

                                  {item.agendas.length === 0 ? (
                                    <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                                      El técnico no tenía visitas programadas
                                      durante este periodo.
                                    </p>
                                  ) : (
                                    <div className="space-y-2">
                                      <div className="space-y-5">
                                        {agendasAgrupadasPorFecha.map(
                                          ([fecha, agendasDelDia]) => (
                                            <section
                                              key={`${tecnicoIdActual}-${fecha}`}
                                              className="space-y-2"
                                            >
                                              {/* Encabezado del día */}
                                              <div className="flex items-center gap-3">
                                                <div className="h-px flex-1 bg-cyan-100" />

                                                <span className="shrink-0 rounded-full bg-cyan-50 px-3 py-1 text-xs font-semibold capitalize text-cyan-800 ring-1 ring-cyan-200">
                                                  {dayjs(fecha).format(
                                                    "dddd DD [de] MMMM"
                                                  )}
                                                </span>

                                                <div className="h-px flex-1 bg-cyan-100" />
                                              </div>

                                              {/* Visitas programadas para ese día */}
                                              <div className="space-y-2">
                                                {agendasDelDia.map((agenda) => {
                                                  const fechaAgenda =
                                                    agenda.fecha.slice(0, 10);

                                                  const estaSeleccionada =
                                                    agenda.empresaId !== null &&
                                                    seleccionAgenda?.empresaId ===
                                                    agenda.empresaId &&
                                                    seleccionAgenda?.fecha ===
                                                    fechaAgenda;

                                                  const puedeSeleccionarse =
                                                    agenda.empresaId !== null;

                                                  const atencionesDeEstaVisita =
                                                    agenda.empresaId === null
                                                      ? []
                                                      : item.atenciones.filter((atencion) => {
                                                        const fechaAtencion = obtenerFechaChileFront(
                                                          atencion.inicio
                                                        );

                                                        return (
                                                          atencion.empresaId === agenda.empresaId &&
                                                          fechaAtencion === fechaAgenda
                                                        );
                                                      });

                                                  const cantidadAtencionesEmpresa =
                                                    atencionesDeEstaVisita.length;

                                                  return (
                                                    <button
                                                      key={`${tecnicoIdActual}-${fecha}-${agenda.id}`}
                                                      type="button"
                                                      disabled={!puedeSeleccionarse}
                                                      onClick={() => {
                                                        const empresaIdAgenda =
                                                          agenda.empresaId;

                                                        if (empresaIdAgenda === null) {
                                                          return;
                                                        }

                                                        const fechaAgenda =
                                                          agenda.fecha.slice(0, 10);

                                                        setAgendaSeleccionadaPorTecnico(
                                                          (actuales) => {
                                                            const seleccionActual =
                                                              actuales[tecnicoIdActual];

                                                            const esLaMisma =
                                                              seleccionActual?.empresaId ===
                                                              empresaIdAgenda &&
                                                              seleccionActual?.fecha ===
                                                              fechaAgenda;

                                                            return {
                                                              ...actuales,
                                                              [tecnicoIdActual]:
                                                                esLaMisma
                                                                  ? undefined
                                                                  : {
                                                                    empresaId:
                                                                      empresaIdAgenda,
                                                                    fecha:
                                                                      fechaAgenda,
                                                                  },
                                                            };
                                                          }
                                                        );
                                                      }}
                                                      className={clsx(
                                                        "w-full rounded-xl border p-3 text-left transition",
                                                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400",

                                                        estaSeleccionada
                                                          ? "border-cyan-500 bg-cyan-100 shadow-sm ring-1 ring-cyan-300"
                                                          : "border-cyan-100 bg-cyan-50/40 hover:border-cyan-300 hover:bg-cyan-50",

                                                        !puedeSeleccionarse &&
                                                        "cursor-not-allowed opacity-60"
                                                      )}
                                                    >
                                                      <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                          <div className="flex flex-wrap items-center gap-2">
                                                            <p className="font-semibold text-slate-900">
                                                              {agenda.empresaNombre}
                                                            </p>

                                                            {estaSeleccionada && (
                                                              <span className="rounded-full bg-cyan-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                                                                Seleccionada
                                                              </span>
                                                            )}
                                                          </div>

                                                          <p className="mt-1 text-xs text-slate-500">
                                                            {agenda.horaInicio ||
                                                              "Sin hora"}

                                                            {agenda.horaFin
                                                              ? ` - ${agenda.horaFin}`
                                                              : ""}
                                                          </p>

                                                          {agenda.notas && (
                                                            <p className="mt-2 text-xs text-slate-600">
                                                              {agenda.notas}
                                                            </p>
                                                          )}

                                                          {puedeSeleccionarse && (
                                                            <p
                                                              className={clsx(
                                                                "mt-2 text-xs font-medium",

                                                                estaSeleccionada
                                                                  ? "text-cyan-800"
                                                                  : "text-cyan-600"
                                                              )}
                                                            >
                                                              {
                                                                cantidadAtencionesEmpresa
                                                              }{" "}
                                                              {cantidadAtencionesEmpresa ===
                                                                1
                                                                ? "atención registrada"
                                                                : "atenciones registradas"}
                                                            </p>
                                                          )}
                                                        </div>

                                                        <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-cyan-700 ring-1 ring-cyan-200">
                                                          {agenda.estado}
                                                        </span>
                                                      </div>
                                                    </button>
                                                  );
                                                })}
                                              </div>
                                            </section>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Atenciones */}
                                <div className="p-4">
                                  <div className="mb-3 flex items-start justify-between gap-3">
                                    <div>
                                      <h4 className="text-sm font-bold text-slate-700">
                                        Atenciones a solicitantes
                                      </h4>

                                      {agendaSeleccionada && (
                                        <p className="mt-1 text-xs font-medium text-emerald-700">
                                          Empresa seleccionada:{" "}
                                          {agendaSeleccionada.empresaNombre}
                                        </p>
                                      )}
                                    </div>

                                    {empresaSeleccionadaId !== undefined && (
                                      <Button
                                        type="text"
                                        size="small"
                                        onClick={() => {
                                          setAgendaSeleccionadaPorTecnico(
                                            (seleccionesActuales) => {
                                              const nuevasSelecciones = {
                                                ...seleccionesActuales,
                                              };

                                              delete nuevasSelecciones[
                                                tecnicoIdActual
                                              ];

                                              return nuevasSelecciones;
                                            }
                                          );
                                        }}
                                      >
                                        Limpiar
                                      </Button>
                                    )}
                                  </div>

                                  {empresaSeleccionadaId === undefined ? (
                                    <div className="rounded-xl border border-dashed border-cyan-200 bg-cyan-50/40 p-6 text-center">
                                      <p className="text-sm font-semibold text-cyan-800">
                                        Selecciona una empresa
                                      </p>

                                      <p className="mt-1 text-xs text-slate-500">
                                        Presiona una empresa en el calendario del
                                        técnico para revisar sus atenciones.
                                      </p>
                                    </div>
                                  ) : atencionesFiltradas.length === 0 ? (
                                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                                      <p className="text-sm font-medium text-amber-800">
                                        Sin atenciones registradas
                                      </p>

                                      <p className="mt-1 text-xs text-amber-700">
                                        El técnico tenía programada esta empresa,
                                        pero no tiene atenciones asociadas durante
                                        el periodo seleccionado.
                                      </p>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <p className="mb-2 text-xs text-slate-500">
                                        {atencionesFiltradas.length}{" "}
                                        {atencionesFiltradas.length === 1
                                          ? "atención encontrada"
                                          : "atenciones encontradas"}
                                      </p>

                                      {atencionesFiltradas.map((atencion) => (
                                        <button
                                          key={atencion.id_visita}
                                          type="button"
                                          onClick={() => {
                                            void openVisitaById(
                                              atencion.id_visita
                                            );
                                          }}
                                          className="w-full rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 text-left transition hover:border-emerald-300 hover:bg-emerald-50"
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <div>
                                              <p className="font-semibold text-slate-900">
                                                {atencion.empresaNombre}
                                              </p>

                                              <p className="mt-1 text-sm text-slate-700">
                                                {atencion.solicitanteNombre}
                                              </p>

                                              <p className="mt-1 text-xs text-slate-500">
                                                {formatDateTime(
                                                  atencion.inicio
                                                )}

                                                {atencion.fin
                                                  ? ` — ${formatDateTime(
                                                    atencion.fin
                                                  )}`
                                                  : ""}
                                              </p>
                                            </div>

                                            <StatusBadge
                                              status={atencion.status}
                                            />
                                          </div>

                                          {atencion.sucursal && (
                                            <p className="mt-2 text-xs text-slate-500">
                                              Sucursal:{" "}
                                              {atencion.sucursal.nombre}
                                            </p>
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
          </section>
        </main>
      )}

      {activeTab === "dashboard" && (
        <div className="px-3 sm:px-4 md:px-6 lg:px-8 pb-10 max-w-7xl mx-auto w-full mt-4">
          <VisitasDashboardInline />
        </div>
      )}

      {/* Modales */}
      <VisitaDetailModal open={openDetail} onClose={() => setOpenDetail(false)} visita={selected} />

      {canCreateVisita && (
        <CreateVisitaModal
          open={openCreate}
          onClose={() => setOpenCreate(false)}
          onCreated={() => {
            setOpenCreate(false);
            refreshVisitasData();
          }}
          tecnicos={tecnicos}
          empresas={empresas}
        />
      )}

      <CreateVisitaModal
        open={openEdit}
        mode="edit"
        visita={editVisita ?? undefined}
        onClose={() => { setOpenEdit(false); setEditVisita(null); }}
        onCreated={() => { }}
        onUpdated={() => {
          setOpenEdit(false);
          setEditVisita(null);
          refreshVisitasData();
        }}
        tecnicos={tecnicos}
        empresas={empresas}
      />

      <VisitasDashboardModal
        open={openDashboard}
        onClose={() => setOpenDashboard(false)}
        items={[]}
      />

      <ExportVisitasExcelModal
        open={openExportExcel}
        onClose={() => setOpenExportExcel(false)}
        total={data?.total ?? 0}
        q={qDebounced}
        tecnicoId={tecnicoId}
        empresaId={empresaId}
        monthFilter={monthFilter}
        yearFilter={yearFilter}
        tecnicos={tecnicos}
        empresas={empresas}
      />
    </div>
  );

};
export default VisitasPage;

/* ========= Skeleton ========= */
function TableSkeletonRows({ cols, rows = 8 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={`sk-${i}`} className="border-t border-slate-200">
          {Array.from({ length: cols }).map((__, j) => (
            <td key={`sk-${i}-${j}`} className="px-4 py-3">
              <div className="h-4 w-full max-w-[260px] animate-pulse rounded bg-slate-100" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function ResumenDiaKpi({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-cyan-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-extrabold text-slate-900">
        {value}
      </p>
    </div>
  );
}
