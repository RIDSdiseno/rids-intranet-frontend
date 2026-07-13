// src/pages/EquiposPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  SearchOutlined,
  LeftOutlined,
  RightOutlined,
  CloseCircleFilled,
  ReloadOutlined,
  LaptopOutlined,
  TagOutlined,
  TeamOutlined,
  DownloadOutlined,
  LoadingOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

import CrearEquipoModal from "../components/modals-equipos/CrearEquipo";
import EquipoEditModal from "../components/modals-equipos/EquipoEdit";
import EquipoViewModal from "../components/modals-equipos/EquiposView";

import { http } from "../service/http";

import {
  BuildingOfficeIcon,
  CalendarIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

import { DatePicker } from "antd";
import dayjs from "dayjs";
import "dayjs/locale/es";

import { useAuth } from "../components/hooks/useAuth";

import type {
  EquipoHistorialItem,
  EquipoRow,
  EmpresaOpt,
  EstadoEquipo,
  TecnicoOpt,
  PropiedadEquipo
} from "../components/modals-equipos/equipos.types";

import {
  clsx,
  formatRut,
  getEstadoEquipoClass,
  getEstadoEquipoLabel,
  toUC,
  ESTADO_EQUIPO_OPTIONS,
  agenteEstadoClasses,
  PROPIEDAD_EQUIPO_OPTIONS,
  getPropiedadEquipoLabel,
  getPropiedadEquipoClass,
} from "../components/modals-equipos/equipos.helpers";

/* =================== Config =================== */

const DEFAULT_PAGE_SIZE = 10;

/* =================== Tipos =================== */

type ApiList<T> = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: T[];
};

type TecnicoApiRow = {
  id_tecnico?: number | string | null;
  id?: number | string | null;
  value?: number | string | null;
  nombre?: string | null;
  name?: string | null;
  email?: string | null;
  rol?: string | null;
};

/* =================== Helpers =================== */

function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}

function strHash(s: string) {
  let h = 0;

  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }

  return Math.abs(h);
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;

  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/* =================== Chips y temas =================== */

const COMPANY_TAG_PALETTE = [
  "border-emerald-200 bg-emerald-50 text-emerald-900",
  "border-teal-200 bg-teal-50 text-teal-900",
  "border-cyan-200 bg-cyan-50 text-cyan-900",
  "border-sky-200 bg-sky-50 text-sky-900",
  "border-blue-200 bg-blue-50 text-blue-900",
  "border-indigo-200 bg-indigo-50 text-indigo-900",
  "border-violet-200 bg-violet-50 text-violet-900",
  "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900",
  "border-rose-200 bg-rose-50 text-rose-900",
  "border-amber-200 bg-amber-50 text-amber-900",
  "border-lime-200 bg-lime-50 text-lime-900",
  "border-green-200 bg-green-50 text-green-900",
];

function companyTagClasses(empresaName?: string | null) {
  if (!empresaName) return "border-neutral-200 bg-neutral-50 text-neutral-700";

  const idx = strHash(empresaName) % COMPANY_TAG_PALETTE.length;

  return COMPANY_TAG_PALETTE[idx];
}

function brandTagClasses(brand?: string | null) {
  const b = (brand || "").trim().toLowerCase();

  if (/apple|macbook|imac|mac/.test(b)) {
    return "border-slate-300 bg-slate-50 text-slate-900";
  }

  if (/dell/.test(b)) return "border-indigo-200 bg-indigo-50 text-indigo-900";
  if (/\bhp\b|hewlett|packard/.test(b)) return "border-sky-200 bg-sky-50 text-sky-900";
  if (/lenovo/.test(b)) return "border-orange-200 bg-orange-50 text-orange-900";
  if (/acer/.test(b)) return "border-lime-200 bg-lime-50 text-lime-900";
  if (/asus/.test(b)) return "border-violet-200 bg-violet-50 text-violet-900";
  if (/samsung/.test(b)) return "border-blue-200 bg-blue-50 text-blue-900";
  if (/\bmsi\b/.test(b)) return "border-rose-200 bg-rose-50 text-rose-900";
  if (/toshiba/.test(b)) return "border-amber-200 bg-amber-50 text-amber-900";
  if (/huawei/.test(b)) return "border-red-200 bg-red-50 text-red-900";

  const fallback = [
    "border-teal-200 bg-teal-50 text-teal-900",
    "border-cyan-200 bg-cyan-50 text-cyan-900",
    "border-emerald-200 bg-emerald-50 text-emerald-900",
    "border-blue-200 bg-blue-50 text-blue-900",
    "border-indigo-200 bg-indigo-50 text-indigo-900",
    "border-violet-200 bg-violet-50 text-violet-900",
    "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900",
    "border-rose-200 bg-rose-50 text-rose-900",
    "border-amber-200 bg-amber-50 text-amber-900",
    "border-lime-200 bg-lime-50 text-lime-900",
  ];

  const idx = strHash(b || "brand") % fallback.length;

  return fallback[idx];
}

function companyRowTheme(empresa?: string | null): {
  bg: string;
  borderLeft: string;
} {
  const e = (empresa || "").toLowerCase().trim();

  if (e.includes("infinet")) {
    return { bg: "bg-blue-50/60", borderLeft: "border-blue-400" };
  }

  if (e.includes("acme")) {
    return { bg: "bg-emerald-50/60", borderLeft: "border-emerald-400" };
  }

  if (e.includes("contoso")) {
    return { bg: "bg-violet-50/60", borderLeft: "border-violet-400" };
  }

  const palette = [
    { bg: "bg-cyan-50/60", borderLeft: "border-cyan-400" },
    { bg: "bg-sky-50/60", borderLeft: "border-sky-400" },
    { bg: "bg-indigo-50/60", borderLeft: "border-indigo-400" },
    { bg: "bg-rose-50/60", borderLeft: "border-rose-400" },
    { bg: "bg-amber-50/60", borderLeft: "border-amber-400" },
    { bg: "bg-lime-50/60", borderLeft: "border-lime-400" },
    { bg: "bg-teal-50/60", borderLeft: "border-teal-400" },
    { bg: "bg-fuchsia-50/60", borderLeft: "border-fuchsia-400" },
    { bg: "bg-emerald-50/60", borderLeft: "border-emerald-400" },
    { bg: "bg-blue-50/60", borderLeft: "border-blue-400" },
  ];

  const idx = strHash(e || "empresa") % palette.length;

  return palette[idx];
}

/* =================== Page =================== */

const EquiposPage: React.FC = () => {
  const { user, isCliente } = useAuth();
  const { RangePicker } = DatePicker;

  /* =================== Búsqueda =================== */

  const [q, setQ] = useState("");
  const qDebounced = useDebouncedValue(q, 450);

  /* =================== Filtros =================== */

  const [empresaOptions, setEmpresaOptions] = useState<EmpresaOpt[]>([]);
  const [empresaFilterId, setEmpresaFilterId] = useState<number | null>(() => {
    if (isCliente && user?.empresaId) return user.empresaId;
    return null;
  });

  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [updatedFrom, setUpdatedFrom] = useState("");
  const [updatedTo, setUpdatedTo] = useState("");

  // Filtro por mantenciones realizadas.
  // Permite mostrar equipos que tuvieron mantención dentro de un rango de fechas.
  const [mantencionDesde, setMantencionDesde] = useState("");
  const [mantencionHasta, setMantencionHasta] = useState("");

  // Filtro Mant.General RIDS.
  // Permite mostrar equipos donde el .exe fue registrado como instalado/configurado.
  const [mantGeneralFilter, setMantGeneralFilter] = useState<
    "TODOS" | "INSTALADO" | "NO_INSTALADO"
  >("TODOS");

  const [mantGeneralDesde, setMantGeneralDesde] = useState("");
  const [mantGeneralHasta, setMantGeneralHasta] = useState("");

  // Filtro Agente / Script RIDS.
  const [agenteFilter, setAgenteFilter] = useState<
    "TODOS" | "INSTALADO" | "NO_INSTALADO" | "ACTIVO" | "SIN_CONEXION"
  >("TODOS");

  const [agenteDesde, setAgenteDesde] = useState("");
  const [agenteHasta, setAgenteHasta] = useState("");

  const [tecnicoOptions, setTecnicoOptions] = useState<TecnicoOpt[]>([]);
  const [tecnicoFilterId, setTecnicoFilterId] = useState<number | null>(null);
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");
  const [auditAction, setAuditAction] = useState<"ALL" | "CREATE" | "UPDATE">("ALL");

  const [tecLoading, setTecLoading] = useState(false);
  const [tecError, setTecError] = useState<string | null>(null);

  const [empLoading, setEmpLoading] = useState(false);
  const [empError, setEmpError] = useState<string | null>(null);

  const [marcaFilter, setMarcaFilter] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<EstadoEquipo | "">("");

  const [propiedadFilter, setPropiedadFilter] = useState<PropiedadEquipo | "">("");
  const [propietarioExternoFilter, setPropietarioExternoFilter] = useState("");

  const [anioPcDesde, setAnioPcDesde] = useState("");
  const [anioPcHasta, setAnioPcHasta] = useState("");
  const [anioPcOrigenFilter, setAnioPcOrigenFilter] = useState<
    "" | "AUTO" | "MANUAL" | "NO_DETERMINADO"
  >("");

  const empresaFilterName = useMemo(
    () => empresaOptions.find((e) => e.id === empresaFilterId)?.nombre ?? "",
    [empresaFilterId, empresaOptions]
  );

  /* =================== Datos / paginación =================== */

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [data, setData] = useState<ApiList<EquipoRow> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPrev = page > 1;
  const totalPages = data?.totalPages ?? 1;
  const canNext = page < totalPages;

  const showingRange = useMemo(() => {
    const pgSize = data?.pageSize ?? pageSize;

    if (!data || data.total === 0) return null;

    const start = (data.page - 1) * pgSize + 1;
    const end = Math.min(data.page * pgSize, data.total);

    return { start, end };
  }, [data, pageSize]);

  const reqSeqRef = useRef(0);
  const empSeqRef = useRef(0);

  /* =================== Export =================== */

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const [mesExport] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  /* =================== Historial =================== */

  const [histLoading, setHistLoading] = useState(false);
  const [histError, setHistError] = useState<string | null>(null);
  const [historial, setHistorial] = useState<EquipoHistorialItem[]>([]);

  /* =================== Crear =================== */

  const [createOpen, setCreateOpen] = useState(false);

  const startCreate = () => {
    setCreateOpen(true);
  };

  /* =================== Editar =================== */

  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<EquipoRow | null>(null);

  const startEdit = (row: EquipoRow) => {
    setEditRow(row);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditRow(null);
  };

  const handleEditSaved = async () => {
    closeEdit();
    await reload();
  };

  /* =================== Vista =================== */

  const [viewOpen, setViewOpen] = useState(false);
  const [viewRow, setViewRow] = useState<EquipoRow | null>(null);

  const startView = (row: EquipoRow) => {
    setViewRow(row);
    setViewOpen(true);
    setHistorial([]);

    const c = new AbortController();
    void fetchHistorialEquipo(row.id_equipo, c.signal);
  };

  const closeView = () => {
    setViewOpen(false);
    setViewRow(null);
    setHistorial([]);
    setHistError(null);
  };

  /* =================== Fetch lista =================== */

  async function fetchList(signal?: AbortSignal) {
    const seq = ++reqSeqRef.current;

    try {
      setLoading(true);
      setError(null);

      const res = await http.get("/equipos", {
        signal,
        params: {
          page,
          pageSize,
          search: qDebounced || undefined,
          empresaId: empresaFilterId || undefined,
          marca: marcaFilter || undefined,

          propiedad: propiedadFilter || undefined,
          propietarioExterno: propietarioExternoFilter || undefined,

          createdFrom: createdFrom || undefined,
          createdTo: createdTo || undefined,
          updatedFrom: updatedFrom || undefined,
          updatedTo: updatedTo || undefined,

          // Filtro por fecha de mantención.
          mantencionDesde: mantencionDesde || undefined,
          mantencionHasta: mantencionHasta || undefined,

          // Filtro Mant.General RIDS.
          mantGeneral: mantGeneralFilter !== "TODOS" ? mantGeneralFilter : undefined,

          // Filtro Agente / Script RIDS.
          agente: agenteFilter !== "TODOS" ? agenteFilter : undefined,
          agenteDesde: agenteDesde || undefined,
          agenteHasta: agenteHasta || undefined,

          auditTecnicoId: tecnicoFilterId || undefined,
          auditFrom: auditFrom || undefined,
          auditTo: auditTo || undefined,
          auditAction: auditAction !== "ALL" ? auditAction : undefined,

          estado: estadoFilter || undefined,

          anioPcDesde: anioPcDesde || undefined,
          anioPcHasta: anioPcHasta || undefined,
          anioPcOrigen: anioPcOrigenFilter || undefined,

          _ts: Date.now(),
        },
      });

      setData(res.data);
    } catch (err) {
      const code = (err as { code?: string }).code;

      if (code === "ERR_CANCELED" || (err as Error).name === "AbortError") {
        return;
      }

      setError((err as Error)?.message || "Error al cargar equipos");
    } finally {
      if (seq === reqSeqRef.current) {
        setLoading(false);
      }
    }
  }

  async function fetchHistorialEquipo(idEquipo: number, signal?: AbortSignal) {
    setHistLoading(true);
    setHistError(null);

    try {
      const res = await http.get(`/equipos/${idEquipo}/historial`, { signal });
      setHistorial(res.data.items ?? []);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;

      setHistError((err as Error).message || "Error al cargar historial");
      setHistorial([]);
    } finally {
      setHistLoading(false);
    }
  }

  async function fetchEmpresaOptions(signal?: AbortSignal) {
    const seq = ++empSeqRef.current;

    try {
      setEmpLoading(true);
      setEmpError(null);

      const res = await http.get("/empresas", { signal });

      if (seq !== empSeqRef.current) return;

      const json = res.data as {
        data: Array<{
          id_empresa: number;
          nombre: string;
        }>;
      };

      const opts: EmpresaOpt[] = (json.data ?? [])
        .map((e) => ({
          id: e.id_empresa,
          nombre: e.nombre,
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

      setEmpresaOptions(opts);
    } catch (err) {
      const code = (err as { code?: string }).code;

      if (code === "ERR_CANCELED" || (err as Error).name === "AbortError") {
        return;
      }

      setEmpError((err as Error)?.message || "Error al cargar empresas");
      setEmpresaOptions([]);
    } finally {
      if (seq === empSeqRef.current) {
        setEmpLoading(false);
      }
    }
  }

  async function fetchTecnicoOptions(signal?: AbortSignal) {
    try {
      setTecLoading(true);
      setTecError(null);

      const res = await http.get("/tecnicos/select", { signal });
      const raw = res.data;

      const list: TecnicoApiRow[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.items)
            ? raw.items
            : [];

      const opts: TecnicoOpt[] = list
        .filter((t) => {
          const rol = String(t.rol ?? "").toUpperCase().trim();
          return ["ADMIN", "TECNICO", "ADMINISTRACION", "VENTAS"].includes(rol);
        })
        .map((t) => ({
          id_tecnico: Number(t.id_tecnico ?? t.id ?? t.value),
          nombre: String(t.nombre ?? t.name ?? t.email ?? "Sin nombre"),
          email: t.email ?? null,
        }))
        .filter((t) => Number.isFinite(t.id_tecnico))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

      setTecnicoOptions(opts);
    } catch (err) {
      const code = (err as { code?: string }).code;

      if (code === "ERR_CANCELED" || (err as Error).name === "AbortError") {
        return;
      }

      setTecError((err as Error)?.message || "Error al cargar técnicos");
      setTecnicoOptions([]);
    } finally {
      setTecLoading(false);
    }
  }

  /* =================== Export Excel =================== */

  async function exportToExcel() {
    try {
      setExportError(null);
      setExporting(true);

      if (!mesExport) {
        setExportError("Debes seleccionar un mes.");
        return;
      }

      const res = await http.get("/inventario/export", {
        params: {
          mes: mesExport,
          empresaId: empresaFilterId || undefined,
          createdFrom: createdFrom || undefined,
          createdTo: createdTo || undefined,
          updatedFrom: updatedFrom || undefined,
          updatedTo: updatedTo || undefined,
        },
        responseType: "blob",
      });

      const blob = res.data;
      const url = window.URL.createObjectURL(blob);

      const filtroFecha = updatedFrom
        ? `_editados_desde_${dayjs(updatedFrom).format("YYYY-MM-DD")}`
        : "";

      const fileName = empresaFilterName
        ? `Inventario_${empresaFilterName}_${mesExport}${filtroFecha}.xlsx`
        : `Inventario_TODAS_${mesExport}${filtroFecha}.xlsx`;

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      setExportError((err as Error).message || "Error al exportar inventario");
    } finally {
      setExporting(false);
    }
  }

  /* =================== Effects =================== */

  useEffect(() => {
    const c = new AbortController();

    void fetchList(c.signal);

    return () => c.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    page,
    pageSize,
    qDebounced,
    empresaFilterId,
    marcaFilter,
    propiedadFilter,
    propietarioExternoFilter,
    createdFrom,
    createdTo,
    updatedFrom,
    updatedTo,
    mantencionDesde,
    mantencionHasta,
    mantGeneralFilter,
    mantGeneralDesde,
    mantGeneralHasta,
    agenteFilter,
    agenteDesde,
    agenteHasta,
    tecnicoFilterId,
    auditFrom,
    auditTo,
    auditAction,
    estadoFilter,
    anioPcDesde,
    anioPcHasta,
    anioPcOrigenFilter,
  ]);

  useEffect(() => {
    const c = new AbortController();

    void fetchTecnicoOptions(c.signal);

    return () => c.abort();
  }, []);

  useEffect(() => {
    const c = new AbortController();

    void fetchEmpresaOptions(c.signal);

    return () => c.abort();
  }, []);

  /* =================== Handlers =================== */

  const clearAll = () => {
    setQ("");
    setMarcaFilter("");

    if (!isCliente) {
      setEmpresaFilterId(null);
    }

    setCreatedFrom("");
    setCreatedTo("");
    setUpdatedFrom("");
    setUpdatedTo("");

    setMantencionDesde("");
    setMantencionHasta("");

    // Limpia filtro Mant.General.
    setMantGeneralFilter("TODOS");
    setMantGeneralDesde("");
    setMantGeneralHasta("");

    // Limpia filtro Agente / Script RIDS.
    setAgenteFilter("TODOS");
    setAgenteDesde("");
    setAgenteHasta("");

    setTecnicoFilterId(null);
    setAuditFrom("");
    setAuditTo("");
    setAuditAction("ALL");

    setEstadoFilter("");

    setPropiedadFilter("");
    setPropietarioExternoFilter("");

    setAnioPcDesde("");
    setAnioPcHasta("");
    setAnioPcOrigenFilter("");

    setPage(1);
  };

  async function reload() {
    const c = new AbortController();
    await fetchList(c.signal);
  }

  const goPrev = () => {
    if (canPrev) setPage((p) => p - 1);
  };

  const goNext = () => {
    if (canNext) setPage((p) => p + 1);
  };

  const onChangePageSize = (val: number) => {
    if (val === pageSize) return;

    setPageSize(val);
    setPage(1);
  };

  const onClickBrand = (brand: string) => {
    const b = brand.trim();
    setMarcaFilter((prev) => (prev.toLowerCase() === b.toLowerCase() ? "" : b));
    setPage(1);
  };

  async function deleteEquipo(row: EquipoRow) {
    if (!confirm(`¿Eliminar equipo #${row.id_equipo} (${row.serial || ""})?`)) {
      return;
    }

    try {
      await http.delete(`/equipos/${row.id_equipo}`);
      await reload();
    } catch (err: unknown) {
      alert(getErrorMessage(err) || "No se pudo eliminar el equipo");
    }
  }

  /* =================== Rows =================== */

  const rowsSorted = useMemo(() => {
    const arr = data?.items ? [...data.items] : [];

    const norm = (v?: string | null) =>
      (v ?? "").toString().trim().toLowerCase();

    arr.sort((a, b) => {
      const ea = norm(a.empresa);
      const eb = norm(b.empresa);

      if (ea < eb) return -1;
      if (ea > eb) return 1;

      const sa = norm(a.solicitante);
      const sb = norm(b.solicitante);

      if (sa < sb) return -1;
      if (sa > sb) return 1;

      return (a.id_equipo ?? 0) - (b.id_equipo ?? 0);
    });

    return arr;
  }, [data?.items]);

  const headerCols = [
    { key: "serial", label: "Serial", className: "min-w-[120px]" },
    { key: "marca", label: "Marca", className: "min-w-[100px]" },
    { key: "modelo", label: "Modelo", className: "min-w-[120px]" },
    { key: "estado", label: "Estado", className: "min-w-[120px]" },
    { key: "solicitante", label: "Solicitante", className: "min-w-[120px]" },
    { key: "solicitanteRut", label: "RUT Solicitante", className: "min-w-[140px]" },
    { key: "empresa", label: "Empresa", className: "min-w-[100px]" },
    { key: "createdAt", label: "Fecha ingreso", className: "min-w-[110px]" },
  ] as const;

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-white via-white to-cyan-50">
      {/* Fondo */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 [background:radial-gradient(circle_at_1px_1px,rgba(14,165,233,0.08)_1px,transparent_0)_0_0/22px_22px]" />
        <div className="absolute -top-32 -left-32 w-[60vw] max-w-[520px] aspect-square rounded-full blur-3xl bg-gradient-to-br from-cyan-200 to-indigo-200 opacity-40" />
        <div className="absolute -bottom-40 -right-40 w-[65vw] max-w-[560px] aspect-square rounded-full blur-3xl bg-gradient-to-tr from-fuchsia-200 to-cyan-200 opacity-40" />
      </div>

      {/* Hero / Toolbar */}
      <div className="px-4 sm:px-6 lg:px-8 max-w-[1800px] mx-auto mt-6">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-cyan-200 bg-white/80 backdrop-blur-xl shadow-sm">
          <div className="absolute inset-0 opacity-60 pointer-events-none bg-[conic-gradient(from_180deg_at_50%_50%,rgba(14,165,233,0.06),transparent_30%,rgba(99,102,241,0.06),transparent_60%,rgba(236,72,153,0.06),transparent_90%)]" />

          <div className="relative p-4 sm:p-6 md:p-8">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                  Equipos{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-indigo-600">
                    RIDS.CL
                  </span>
                </h1>

                <p className="text-xs sm:text-sm text-slate-600">
                  Inventario, especificaciones y relación con solicitantes/empresas.
                </p>
              </div>

              <div className="text-sm text-slate-600 md:shrink-0">
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <LoadingOutlined /> Cargando…
                  </span>
                ) : (
                  `${(data?.total ?? 0).toLocaleString()} resultado(s)`
                )}
              </div>
            </div>

            {/* Toolbar / filtros */}
            <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3">
              {/* Buscar */}
              <div className="relative md:col-span-4 min-w-0">
                <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600/70" />

                <input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setPage(1);
                  }}
                  placeholder="serial, modelo, CPU, solicitante, RUT…"
                  className="w-full rounded-2xl border border-cyan-200/70 bg-white/90 pl-9 pr-10 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400"
                  aria-label="Buscar equipos"
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

              {/* Botones principales */}
              <div className="md:col-span-8">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 justify-end">
                  <button
                    onClick={startCreate}
                    disabled={isCliente}
                    className={clsx(
                      "col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium text-white",
                      "bg-gradient-to-tr from-indigo-600 to-cyan-600 shadow-[0_6px_18px_-6px_rgba(37,99,235,0.45)] hover:brightness-110",
                      isCliente && "opacity-50 cursor-not-allowed"
                    )}
                    title="Crear nuevo equipo"
                    type="button"
                  >
                    <PlusOutlined />
                    <span>Nuevo</span>
                  </button>

                  <button
                    onClick={clearAll}
                    className="col-span-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm text-cyan-800 hover:bg-cyan-50"
                    title="Limpiar filtros"
                    type="button"
                  >
                    Limpiar
                  </button>

                  <button
                    onClick={() => void reload()}
                    className="col-span-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2.5 text-sm text-cyan-800 hover:bg-cyan-50"
                    title="Recargar"
                    type="button"
                  >
                    <ReloadOutlined />
                    <span className="hidden sm:inline">Recargar</span>
                  </button>

                  <button
                    onClick={() => void exportToExcel()}
                    disabled={exporting || loading || (data?.total ?? 0) === 0}
                    className={clsx(
                      "col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-medium text-white",
                      "bg-gradient-to-tr from-emerald-600 to-cyan-600 shadow-[0_6px_18px_-6px_rgba(16,185,129,0.45)] hover:brightness-110",
                      (exporting || loading || (data?.total ?? 0) === 0) &&
                      "opacity-60 cursor-not-allowed"
                    )}
                    title="Exportar a Excel"
                    type="button"
                  >
                    <DownloadOutlined />
                    {exporting ? "Exportando…" : "Exportar"}
                  </button>
                </div>
              </div>

              {/* Empresa + Estado */}
              <div className="md:col-span-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <BuildingOfficeIcon className="w-4 h-4 text-cyan-600" />

                      <label className="block text-sm font-medium text-slate-700">
                        Filtrar por empresa
                      </label>
                    </div>

                    <div className="relative">
                      <select
                        value={empresaFilterId ?? ""}
                        onChange={(e) => {
                          if (isCliente) return;

                          const v = e.target.value;

                          setEmpresaFilterId(v === "" ? null : Number(v));
                          setPage(1);
                        }}
                        disabled={empLoading || isCliente}
                        className={clsx(
                          "w-full rounded-xl border shadow-sm px-4 py-3 pl-10 pr-8 text-sm text-slate-900 bg-white border-slate-200",
                          "hover:border-cyan-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20",
                          "transition-all duration-200 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                          empLoading && "bg-slate-50"
                        )}
                        aria-label="Filtrar por empresa"
                      >
                        {!isCliente && <option value="">Todas las empresas</option>}

                        {empresaOptions.map((opt) => (
                          <option key={opt.id ?? -1} value={opt.id ?? ""}>
                            {opt.nombre}
                          </option>
                        ))}
                      </select>

                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <BuildingOfficeIcon className="w-5 h-5" />
                      </div>

                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <ChevronDownIcon className="w-5 h-5 text-slate-400" />
                      </div>
                    </div>

                    {empError && (
                      <div className="text-xs text-rose-600">
                        {empError}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Estado del equipo
                    </label>

                    <select
                      value={estadoFilter}
                      onChange={(e) => {
                        setEstadoFilter(e.target.value as EstadoEquipo | "");
                        setPage(1);
                      }}
                      className="w-full rounded-xl border shadow-sm px-4 py-3 text-sm text-slate-900 bg-white border-slate-200 hover:border-cyan-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-200"
                    >
                      <option value="">Todos los estados</option>

                      {ESTADO_EQUIPO_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Fecha ingreso / edición */}
              <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    <CalendarIcon className="w-3.5 h-3.5 text-cyan-500" />
                    Fecha de ingreso
                  </label>

                  <RangePicker
                    value={[
                      createdFrom ? dayjs(createdFrom) : null,
                      createdTo ? dayjs(createdTo) : null,
                    ]}
                    onChange={(dates) => {
                      setCreatedFrom(dates?.[0] ? dates[0].startOf("day").toISOString() : "");
                      setCreatedTo(dates?.[1] ? dates[1].endOf("day").toISOString() : "");
                      setPage(1);
                    }}
                    format="DD/MM/YYYY"
                    className="w-full"
                    allowClear
                    placeholder={["Desde", "Hasta"]}
                    presets={[
                      {
                        label: "Hoy",
                        value: [dayjs().startOf("day"), dayjs().endOf("day")],
                      },
                      {
                        label: "Últimos 7 días",
                        value: [
                          dayjs().subtract(6, "day").startOf("day"),
                          dayjs().endOf("day"),
                        ],
                      },
                      {
                        label: "Este mes",
                        value: [dayjs().startOf("month"), dayjs().endOf("month")],
                      },
                      {
                        label: "Mes anterior",
                        value: [
                          dayjs().subtract(1, "month").startOf("month"),
                          dayjs().subtract(1, "month").endOf("month"),
                        ],
                      },
                    ]}
                  />

                  {(createdFrom || createdTo) && (
                    <p className="text-xs text-cyan-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 inline-block" />
                      Filtro activo
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 uppercase tracking-wide">
                    <CalendarIcon className="w-3.5 h-3.5 text-cyan-500" />
                    Fecha de edición
                  </label>

                  <RangePicker
                    value={[
                      updatedFrom ? dayjs(updatedFrom) : null,
                      updatedTo ? dayjs(updatedTo) : null,
                    ]}
                    onChange={(dates) => {
                      setUpdatedFrom(dates?.[0] ? dates[0].startOf("day").toISOString() : "");
                      setUpdatedTo(dates?.[1] ? dates[1].endOf("day").toISOString() : "");
                      setPage(1);
                    }}
                    format="DD/MM/YYYY"
                    className="w-full"
                    allowClear
                    placeholder={["Desde", "Hasta"]}
                    presets={[
                      {
                        label: "Hoy",
                        value: [dayjs().startOf("day"), dayjs().endOf("day")],
                      },
                      {
                        label: "Últimos 7 días",
                        value: [
                          dayjs().subtract(6, "day").startOf("day"),
                          dayjs().endOf("day"),
                        ],
                      },
                      {
                        label: "Este mes",
                        value: [dayjs().startOf("month"), dayjs().endOf("month")],
                      },
                      {
                        label: "Mes anterior",
                        value: [
                          dayjs().subtract(1, "month").startOf("month"),
                          dayjs().subtract(1, "month").endOf("month"),
                        ],
                      },
                    ]}
                  />

                  {(updatedFrom || updatedTo) && (
                    <p className="text-xs text-cyan-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 inline-block" />
                      Filtro activo
                    </p>
                  )}
                </div>
              </div>

              {/* 
  Filtros secundarios:
  - En pantallas pequeñas quedan uno debajo del otro.
  - En pantallas grandes quedan en 2 columnas.
  - Así evitamos que cada filtro use todo el ancho innecesariamente.
*/}
              <div className="md:col-span-12 grid grid-cols-1 xl:grid-cols-3 gap-4">
                {/* Actividad por técnico */}
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
                  <div className="flex flex-col gap-1 mb-3">
                    <div className="text-sm font-semibold text-slate-800">
                      Actividad por técnico
                    </div>

                    <div className="text-xs text-slate-500">
                      Filtra equipos que fueron creados o editados por un técnico.
                    </div>
                  </div>

                  {/* 
      Como solo dejaste el filtro de técnico,
      usamos una sola columna para que el select aproveche todo el ancho.
    */}
                  <div className="grid grid-cols-1 gap-4">
                    <label className="text-sm">
                      <span className="block text-slate-700 mb-1">Técnico</span>

                      <select
                        value={tecnicoFilterId ?? ""}
                        onChange={(e) => {
                          setTecnicoFilterId(e.target.value ? Number(e.target.value) : null);
                          setPage(1);
                        }}
                        disabled={tecLoading}
                        className="w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                      >
                        <option value="">
                          {tecLoading ? "Cargando técnicos..." : "Todos los técnicos"}
                        </option>

                        {tecnicoOptions.map((t) => (
                          <option key={t.id_tecnico} value={t.id_tecnico}>
                            {t.nombre}
                            {t.email ? ` — ${t.email}` : ""}
                          </option>
                        ))}
                      </select>

                      {tecError && (
                        <div className="mt-1 text-xs text-rose-600">
                          {tecError}
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Mantenciones / Mant.General */}
                <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-cyan-50/60 p-4">
                  <div className="flex flex-col gap-1 mb-3">
                    <div className="text-sm font-semibold text-slate-800">
                      Mantenciones / Mant.General
                    </div>

                    <div className="text-xs text-slate-500">
                      Filtra equipos con mantenciones registradas o con Mant.General instalado/abierto.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <label className="text-sm">
                      <span className="block text-slate-700 mb-1">
                        Rango de mantención realizada
                      </span>

                      <RangePicker
                        value={[
                          mantencionDesde ? dayjs(mantencionDesde) : null,
                          mantencionHasta ? dayjs(mantencionHasta) : null,
                        ]}
                        onChange={(dates) => {
                          setMantencionDesde(
                            dates?.[0] ? dates[0].format("YYYY-MM-DD") : ""
                          );
                          setMantencionHasta(
                            dates?.[1] ? dates[1].format("YYYY-MM-DD") : ""
                          );
                          setPage(1);
                        }}
                        format="DD/MM/YYYY"
                        className="w-full"
                        allowClear
                        placeholder={["Desde", "Hasta"]}
                        presets={[
                          {
                            label: "Hoy",
                            value: [dayjs().startOf("day"), dayjs().endOf("day")],
                          },
                          {
                            label: "Últimos 7 días",
                            value: [
                              dayjs().subtract(6, "day").startOf("day"),
                              dayjs().endOf("day"),
                            ],
                          },
                          {
                            label: "Este mes",
                            value: [dayjs().startOf("month"), dayjs().endOf("month")],
                          },
                          {
                            label: "Mes anterior",
                            value: [
                              dayjs().subtract(1, "month").startOf("month"),
                              dayjs().subtract(1, "month").endOf("month"),
                            ],
                          },
                        ]}
                      />
                    </label>

                    <div className="h-px bg-emerald-100" />

                    <label className="text-sm">
                      <span className="block text-slate-700 mb-1">
                        Estado Mant.General
                      </span>

                      <select
                        value={mantGeneralFilter}
                        onChange={(e) => {
                          setMantGeneralFilter(
                            e.target.value as "TODOS" | "INSTALADO" | "NO_INSTALADO"
                          );
                          setPage(1);
                        }}
                        className="w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 border-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                      >
                        <option value="TODOS">Todos</option>
                        <option value="INSTALADO">Con Mant.General</option>
                        <option value="NO_INSTALADO">Sin Mant.General</option>
                      </select>
                    </label>

                    <label className="text-sm">
                      <span className="block text-slate-700 mb-1">
                        Última apertura de Mant.General
                      </span>

                      <RangePicker
                        value={[
                          mantGeneralDesde ? dayjs(mantGeneralDesde) : null,
                          mantGeneralHasta ? dayjs(mantGeneralHasta) : null,
                        ]}
                        onChange={(dates) => {
                          setMantGeneralDesde(
                            dates?.[0] ? dates[0].format("YYYY-MM-DD") : ""
                          );
                          setMantGeneralHasta(
                            dates?.[1] ? dates[1].format("YYYY-MM-DD") : ""
                          );
                          setPage(1);
                        }}
                        format="DD/MM/YYYY"
                        className="w-full"
                        allowClear
                        placeholder={["Desde", "Hasta"]}
                        presets={[
                          {
                            label: "Hoy",
                            value: [dayjs().startOf("day"), dayjs().endOf("day")],
                          },
                          {
                            label: "Últimos 7 días",
                            value: [
                              dayjs().subtract(6, "day").startOf("day"),
                              dayjs().endOf("day"),
                            ],
                          },
                          {
                            label: "Este mes",
                            value: [dayjs().startOf("month"), dayjs().endOf("month")],
                          },
                          {
                            label: "Mes anterior",
                            value: [
                              dayjs().subtract(1, "month").startOf("month"),
                              dayjs().subtract(1, "month").endOf("month"),
                            ],
                          },
                        ]}
                      />
                    </label>

                    {mantencionDesde ||
                      mantencionHasta ||
                      mantGeneralFilter !== "TODOS" ||
                      mantGeneralDesde ||
                      mantGeneralHasta ? (
                      <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs text-slate-600">
                        <div className="font-semibold text-slate-700">
                          Filtros activos
                        </div>

                        <div className="mt-1 space-y-1">
                          {(mantencionDesde || mantencionHasta) && (
                            <div>
                              Mantención:{" "}
                              <strong>
                                {mantencionDesde
                                  ? dayjs(mantencionDesde).format("DD/MM/YYYY")
                                  : "Inicio"}
                              </strong>{" "}
                              -{" "}
                              <strong>
                                {mantencionHasta
                                  ? dayjs(mantencionHasta).format("DD/MM/YYYY")
                                  : "Hoy"}
                              </strong>
                            </div>
                          )}

                          {mantGeneralFilter !== "TODOS" && (
                            <div>
                              Mant.General:{" "}
                              <strong>
                                {mantGeneralFilter === "INSTALADO"
                                  ? "Con Mant.General"
                                  : "Sin Mant.General"}
                              </strong>
                            </div>
                          )}

                          {(mantGeneralDesde || mantGeneralHasta) && (
                            <div>
                              Última apertura:{" "}
                              <strong>
                                {mantGeneralDesde
                                  ? dayjs(mantGeneralDesde).format("DD/MM/YYYY")
                                  : "Inicio"}
                              </strong>{" "}
                              -{" "}
                              <strong>
                                {mantGeneralHasta
                                  ? dayjs(mantGeneralHasta).format("DD/MM/YYYY")
                                  : "Hoy"}
                              </strong>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">
                        Sin filtros de mantenciones o Mant.General aplicados.
                      </div>
                    )}
                  </div>
                </div>
                {/* Agente / Script instalado */}
                <div className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                  <div className="flex flex-col gap-1 mb-3">
                    <div className="text-sm font-semibold text-slate-800">
                      Agente / Script RIDS
                    </div>

                    <div className="text-xs text-slate-500">
                      Filtra equipos que tienen el agente de inventario instalado o activo.
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <label className="text-sm">
                      <span className="block text-slate-700 mb-1">
                        Estado del agente
                      </span>

                      <select
                        value={agenteFilter}
                        onChange={(e) => {
                          setAgenteFilter(
                            e.target.value as
                            | "TODOS"
                            | "INSTALADO"
                            | "NO_INSTALADO"
                            | "ACTIVO"
                            | "SIN_CONEXION"
                          );
                          setPage(1);
                        }}
                        className="w-full rounded-xl border bg-white px-3 py-2 text-sm text-slate-900 border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      >
                        <option value="TODOS">Todos</option>
                        <option value="INSTALADO">Con agente instalado</option>
                        <option value="NO_INSTALADO">Sin agente</option>
                        <option value="ACTIVO">Agente activo</option>
                        <option value="SIN_CONEXION">Sin conexión</option>
                      </select>
                    </label>

                    <label className="text-sm">
                      <span className="block text-slate-700 mb-1">
                        Última conexión del agente
                      </span>

                      <RangePicker
                        value={[
                          agenteDesde ? dayjs(agenteDesde) : null,
                          agenteHasta ? dayjs(agenteHasta) : null,
                        ]}
                        onChange={(dates) => {
                          setAgenteDesde(dates?.[0] ? dates[0].format("YYYY-MM-DD") : "");
                          setAgenteHasta(dates?.[1] ? dates[1].format("YYYY-MM-DD") : "");
                          setPage(1);
                        }}
                        format="DD/MM/YYYY"
                        className="w-full"
                        allowClear
                        placeholder={["Desde", "Hasta"]}
                        presets={[
                          {
                            label: "Hoy",
                            value: [dayjs().startOf("day"), dayjs().endOf("day")],
                          },
                          {
                            label: "Últimos 7 días",
                            value: [
                              dayjs().subtract(6, "day").startOf("day"),
                              dayjs().endOf("day"),
                            ],
                          },
                          {
                            label: "Este mes",
                            value: [dayjs().startOf("month"), dayjs().endOf("month")],
                          },
                          {
                            label: "Mes anterior",
                            value: [
                              dayjs().subtract(1, "month").startOf("month"),
                              dayjs().subtract(1, "month").endOf("month"),
                            ],
                          },
                        ]}
                      />
                    </label>

                    {agenteFilter !== "TODOS" || agenteDesde || agenteHasta ? (
                      <div className="inline-flex w-fit max-w-full rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs text-blue-700">
                        <span className="truncate">
                          Filtro activo:{" "}
                          <strong>
                            {agenteFilter === "INSTALADO"
                              ? "Con agente"
                              : agenteFilter === "NO_INSTALADO"
                                ? "Sin agente"
                                : agenteFilter === "ACTIVO"
                                  ? "Activo"
                                  : agenteFilter === "SIN_CONEXION"
                                    ? "Sin conexión"
                                    : "Todos"}
                          </strong>
                        </span>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">
                        Sin filtro de agente aplicado.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Chips filtros activos */}
            <div className="mt-3 flex flex-wrap items-center gap-2 min-w-0">
              {empresaFilterName && !isCliente && (
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 text-cyan-900 px-3 py-1 text-xs max-w-full">
                  <span className="shrink-0">Empresa:</span>

                  <strong className="truncate">{empresaFilterName}</strong>

                  <button
                    onClick={() => {
                      setEmpresaFilterId(null);
                      setPage(1);
                    }}
                    className="hover:text-cyan-700 shrink-0"
                    aria-label="Quitar filtro de empresa"
                    title="Quitar filtro de empresa"
                    type="button"
                  >
                    <CloseCircleFilled />
                  </button>
                </span>
              )}

              {marcaFilter && (
                <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-900 px-3 py-1 text-xs max-w-full">
                  <span className="shrink-0">Marca:</span>

                  <strong className="truncate">{toUC(marcaFilter)}</strong>

                  <button
                    onClick={() => {
                      setMarcaFilter("");
                      setPage(1);
                    }}
                    className="hover:text-indigo-700 shrink-0"
                    aria-label="Quitar filtro de marca"
                    title="Quitar filtro de marca"
                    type="button"
                  >
                    <CloseCircleFilled />
                  </button>
                </span>
              )}

              {estadoFilter && (
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 text-blue-900 px-3 py-1 text-xs max-w-full">
                  <span className="shrink-0">Estado:</span>

                  <strong className="truncate">
                    {getEstadoEquipoLabel(estadoFilter)}
                  </strong>

                  <button
                    onClick={() => {
                      setEstadoFilter("");
                      setPage(1);
                    }}
                    className="hover:text-blue-700 shrink-0"
                    aria-label="Quitar filtro de estado"
                    title="Quitar filtro de estado"
                    type="button"
                  >
                    <CloseCircleFilled />
                  </button>
                </span>
              )}

              {tecnicoFilterId && (
                <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-900 px-3 py-1 text-xs max-w-full">
                  <span className="shrink-0">Técnico:</span>

                  <strong className="truncate">
                    {tecnicoOptions.find((t) => t.id_tecnico === tecnicoFilterId)?.nombre ??
                      tecnicoFilterId}
                  </strong>

                  <button
                    onClick={() => {
                      setTecnicoFilterId(null);
                      setPage(1);
                    }}
                    className="hover:text-indigo-700 shrink-0"
                    aria-label="Quitar filtro de técnico"
                    title="Quitar filtro de técnico"
                    type="button"
                  >
                    <CloseCircleFilled />
                  </button>
                </span>
              )}

              {(auditFrom || auditTo) && (
                <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-900 px-3 py-1 text-xs max-w-full">
                  <span className="shrink-0">Actividad:</span>

                  <strong className="truncate">
                    {auditFrom ? dayjs(auditFrom).format("DD/MM/YYYY") : "Inicio"} -{" "}
                    {auditTo ? dayjs(auditTo).format("DD/MM/YYYY") : "Hoy"}
                  </strong>

                  <button
                    onClick={() => {
                      setAuditFrom("");
                      setAuditTo("");
                      setPage(1);
                    }}
                    className="hover:text-indigo-700 shrink-0"
                    aria-label="Quitar filtro de actividad"
                    title="Quitar filtro de actividad"
                    type="button"
                  >
                    <CloseCircleFilled />
                  </button>
                </span>
              )}
              {(mantencionDesde || mantencionHasta) && (
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-900 px-3 py-1 text-xs max-w-full">
                  <span className="shrink-0">Mantención:</span>

                  <strong className="truncate">
                    {mantencionDesde
                      ? dayjs(mantencionDesde).format("DD/MM/YYYY")
                      : "Inicio"}{" "}
                    -{" "}
                    {mantencionHasta
                      ? dayjs(mantencionHasta).format("DD/MM/YYYY")
                      : "Hoy"}
                  </strong>

                  <button
                    onClick={() => {
                      setMantencionDesde("");
                      setMantencionHasta("");
                      setPage(1);
                    }}
                    className="hover:text-emerald-700 shrink-0"
                    aria-label="Quitar filtro de mantención"
                    title="Quitar filtro de mantención"
                    type="button"
                  >
                    <CloseCircleFilled />
                  </button>
                </span>
              )}
              {(mantGeneralFilter !== "TODOS" || mantGeneralDesde || mantGeneralHasta) && (
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 text-cyan-900 px-3 py-1 text-xs max-w-full">
                  <span className="shrink-0">Mant.General:</span>

                  <strong className="truncate">
                    {mantGeneralFilter === "INSTALADO"
                      ? "Con Mant.General"
                      : mantGeneralFilter === "NO_INSTALADO"
                        ? "Sin Mant.General"
                        : "Todos"}

                    {(mantGeneralDesde || mantGeneralHasta) && (
                      <>
                        {" "}
                        ·{" "}
                        {mantGeneralDesde
                          ? dayjs(mantGeneralDesde).format("DD/MM/YYYY")
                          : "Inicio"}{" "}
                        -{" "}
                        {mantGeneralHasta
                          ? dayjs(mantGeneralHasta).format("DD/MM/YYYY")
                          : "Hoy"}
                      </>
                    )}
                  </strong>

                  <button
                    onClick={() => {
                      setMantGeneralFilter("TODOS");
                      setMantGeneralDesde("");
                      setMantGeneralHasta("");
                      setPage(1);
                    }}
                    className="hover:text-cyan-700 shrink-0"
                    aria-label="Quitar filtro Mant.General"
                    title="Quitar filtro Mant.General"
                    type="button"
                  >
                    <CloseCircleFilled />
                  </button>
                </span>
              )}
              {(agenteFilter !== "TODOS" || agenteDesde || agenteHasta) && (
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 text-blue-900 px-3 py-1 text-xs max-w-full">
                  <span className="shrink-0">Agente:</span>

                  <strong className="truncate">
                    {agenteFilter === "INSTALADO"
                      ? "Con agente"
                      : agenteFilter === "NO_INSTALADO"
                        ? "Sin agente"
                        : agenteFilter === "ACTIVO"
                          ? "Activo"
                          : agenteFilter === "SIN_CONEXION"
                            ? "Sin conexión"
                            : "Todos"}

                    {(agenteDesde || agenteHasta) && (
                      <>
                        {" "}
                        ·{" "}
                        {agenteDesde ? dayjs(agenteDesde).format("DD/MM/YYYY") : "Inicio"} -{" "}
                        {agenteHasta ? dayjs(agenteHasta).format("DD/MM/YYYY") : "Hoy"}
                      </>
                    )}
                  </strong>

                  <button
                    onClick={() => {
                      setAgenteFilter("TODOS");
                      setAgenteDesde("");
                      setAgenteHasta("");
                      setPage(1);
                    }}
                    className="hover:text-blue-700 shrink-0"
                    aria-label="Quitar filtro de agente"
                    title="Quitar filtro de agente"
                    type="button"
                  >
                    <CloseCircleFilled />
                  </button>
                </span>
              )}
            </div>

            <div className="mt-4 h-px bg-gradient-to-r from-transparent via-cyan-200/60 to-transparent" />
          </div>
        </div>
      </div>

      {/* Contenido */}
      <main className="px-4 sm:px-6 lg:px-8 max-w-[1800px] mx-auto mt-6">
        {/* Cards mobile */}
        <section
          className="md:hidden space-y-3 mt-4"
          aria-live="polite"
          aria-busy={loading ? "true" : "false"}
        >
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={`sk-m-${i}`}
                  className="rounded-2xl border border-cyan-200 bg-white p-4"
                >
                  <div className="h-4 w-24 bg-cyan-50 rounded mb-2 animate-pulse" />
                  <div className="h-3 w-3/4 bg-cyan-50 rounded mb-2 animate-pulse" />
                  <div className="h-3 w-1/2 bg-cyan-50 rounded animate-pulse" />
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 p-4 text-center">
              {error}
            </div>
          )}

          {!loading && !error && rowsSorted.length === 0 && (
            <div className="rounded-2xl border border-cyan-200 bg-white text-slate-600 p-4 text-center">
              Sin resultados.
            </div>
          )}

          {!loading &&
            !error &&
            rowsSorted.map((e) => (
              <article
                key={`m-${e.id_equipo}`}
                className="rounded-2xl border border-cyan-200 bg-white p-4"
              >
                <header className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-slate-500">#{e.id_equipo}</div>

                    <h3 className="text-base font-semibold text-slate-900">
                      {e.modelo || "—"}
                    </h3>

                    <p className="text-xs text-slate-600 mt-0.5">
                      {toUC(e.serial)} • Año PC: {e.anioPc ?? "N/D"} •{" "}
                      {e.procesador || "CPU —"} • {e.ram || "RAM —"} •{" "}
                      {e.disco || "Disco —"}
                    </p>

                    {e.createdAt && (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Ingreso:{" "}
                        {new Intl.DateTimeFormat("es-CL", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        }).format(new Date(e.createdAt))}
                      </p>
                    )}
                  </div>

                  {e.marca ? (
                    <button
                      onClick={() => onClickBrand(e.marca!)}
                      className={clsx(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border",
                        brandTagClasses(e.marca)
                      )}
                      title="Filtrar por esta marca"
                      type="button"
                    >
                      <TagOutlined className="opacity-80" /> {toUC(e.marca)}
                    </button>
                  ) : null}
                </header>

                <div className="mt-2 flex flex-wrap gap-2">
                  <span
                    className={clsx(
                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                      getEstadoEquipoClass(e.estado)
                    )}
                  >
                    {getEstadoEquipoLabel(e.estado)}
                  </span>

                  {e.solicitante ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border border-cyan-200 bg-cyan-50 text-cyan-900">
                      <LaptopOutlined className="opacity-80" /> {e.solicitante}
                    </span>
                  ) : null}

                  {e.solicitanteRut ? (
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border border-slate-200 bg-slate-50 text-slate-700">
                      RUT: {formatRut(e.solicitanteRut)}
                    </span>
                  ) : null}

                  {e.empresa ? (
                    <span
                      className={clsx(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border",
                        companyTagClasses(e.empresa)
                      )}
                    >
                      <TeamOutlined className="opacity-80" /> {e.empresa}
                    </span>
                  ) : null}
                </div>

                {e.lastSeenAt ? (
                  <>
                    <span
                      className={clsx(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border",
                        agenteEstadoClasses(e.estadoAgente || "ACTIVO")
                      )}
                    >
                      Agente {e.estadoAgente || "ACTIVO"}
                    </span>

                    <p className="mt-1 text-[11px] text-slate-500">
                      Agente última conexión:{" "}
                      {new Intl.DateTimeFormat("es-CL", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      }).format(new Date(e.lastSeenAt))}
                    </p>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border border-slate-200 bg-slate-50 text-slate-500">
                    Sin agente
                  </span>
                )}

                {e.mantGeneralInstalado ? (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border border-emerald-200 bg-emerald-50 text-emerald-700">
                    Mant.General instalado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border border-slate-200 bg-slate-50 text-slate-500">
                    Sin Mant.General
                  </span>
                )}

                {(e as any).hostname ? (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border border-slate-200 bg-slate-50 text-slate-700">
                    Host: {(e as any).hostname}
                  </span>
                ) : null}

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startView(e)}
                    className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs border-cyan-200 bg-cyan-50 text-cyan-900 hover:bg-cyan-100"
                  >
                    Ver
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (isCliente) return;
                      startEdit(e);
                    }}
                    disabled={isCliente}
                    className={clsx(
                      "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs",
                      "border-indigo-200 bg-indigo-50 text-indigo-900",
                      isCliente
                        ? "opacity-50 cursor-not-allowed pointer-events-none"
                        : "hover:bg-indigo-100"
                    )}
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (isCliente) return;
                      void deleteEquipo(e);
                    }}
                    disabled={isCliente}
                    className={clsx(
                      "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs",
                      "border-rose-200 bg-rose-50 text-rose-900",
                      isCliente
                        ? "opacity-50 cursor-not-allowed pointer-events-none"
                        : "hover:bg-rose-100"
                    )}
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
        </section>

        {/* Tabla desktop */}
        <section
          className="hidden md:block rounded-3xl border border-cyan-200 bg-white mt-4"
          style={{ overflowX: "auto" }}
          aria-live="polite"
          aria-busy={loading ? "true" : "false"}
        >
          <div className="overflow-x-auto">
            {(() => {
              const colsWithActions = headerCols.length + 1;

              return (
                <table
                  className="w-full text-[13px] sm:text-sm"
                  style={{ minWidth: "900px" }}
                >
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-gradient-to-r from-cyan-50 to-indigo-50 border-b border-cyan-200">
                      {headerCols.map((col, i) => (
                        <th
                          key={col.key}
                          className={clsx(
                            "text-left px-4 py-3 font-semibold text-slate-800 select-none",
                            "border-r border-cyan-100",
                            i === 0 && "border-l-2 border-l-cyan-300 rounded-tl-xl",
                            col.className
                          )}
                        >
                          <span>{col.label}</span>
                        </th>
                      ))}

                      <th className="text-center px-4 py-3 font-semibold text-slate-800 select-none rounded-tr-xl w-[120px]">
                        Acciones
                      </th>
                    </tr>
                  </thead>

                  <tbody className="text-slate-800">
                    {loading && (
                      <>
                        {Array.from({ length: 8 }).map((_, i) => (
                          <tr key={`sk-${i}`} className="border-t border-neutral-100">
                            {Array.from({ length: colsWithActions }).map((__, j) => (
                              <td key={`sk-${i}-${j}`} className="px-4 py-3">
                                <div className="h-4 w-full max-w-[240px] animate-pulse rounded bg-neutral-200/70" />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </>
                    )}

                    {!loading && error && (
                      <tr>
                        <td
                          colSpan={colsWithActions}
                          className="px-4 py-10 text-center text-rose-700"
                        >
                          {error}
                        </td>
                      </tr>
                    )}

                    {!loading && !error && rowsSorted.length === 0 && (
                      <tr>
                        <td colSpan={colsWithActions} className="px-4 py-12">
                          <div className="flex flex-col items-center gap-3 text-slate-600">
                            <span>No encontramos resultados</span>

                            <div className="flex gap-2">
                              <button
                                onClick={clearAll}
                                className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 text-cyan-800 px-3 py-2 text-sm hover:bg-cyan-50"
                                type="button"
                              >
                                <CloseCircleFilled />
                                Limpiar
                              </button>

                              <button
                                onClick={() => void reload()}
                                className="inline-flex items-center gap-2 rounded-xl border border-cyan-200 text-cyan-800 px-3 py-2 text-sm hover:bg-cyan-50"
                                type="button"
                              >
                                <ReloadOutlined />
                                Recargar
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      !error &&
                      rowsSorted.map((e) => {
                        const brand = e.marca || "";
                        const isBrandActive =
                          marcaFilter &&
                          marcaFilter.toLowerCase() === brand.toLowerCase();

                        const theme = companyRowTheme(e.empresa);

                        return (
                          <tr
                            key={e.id_equipo}
                            className={clsx(
                              "border-t border-cyan-100 transition-colors",
                              theme.bg,
                              "hover:bg-cyan-50/70"
                            )}
                          >
                            <td className="px-4 py-3 font-mono tracking-wide">
                              {toUC(e.serial)}
                            </td>

                            <td className="px-4 py-3">
                              {e.marca ? (
                                <button
                                  type="button"
                                  onClick={() => onClickBrand(brand)}
                                  className={clsx(
                                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border transition",
                                    brandTagClasses(e.marca),
                                    "hover:brightness-95",
                                    isBrandActive && "ring-2 ring-offset-1 ring-indigo-300"
                                  )}
                                  title={
                                    isBrandActive
                                      ? "Quitar filtro de esta marca"
                                      : "Filtrar por esta marca"
                                  }
                                  aria-pressed={isBrandActive ? true : undefined}
                                >
                                  <TagOutlined className="opacity-80" /> {toUC(e.marca)}
                                </button>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              {e.modelo || <span className="text-slate-400">—</span>}
                            </td>

                            <td className="px-4 py-3">
                              <span
                                className={clsx(
                                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                                  getEstadoEquipoClass(e.estado)
                                )}
                              >
                                {getEstadoEquipoLabel(e.estado)}
                              </span>
                            </td>

                            <td className="px-4 py-3">
                              {e.solicitante ? (
                                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border border-cyan-200 bg-cyan-50 text-cyan-900">
                                  <LaptopOutlined className="opacity-80" /> {e.solicitante}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              {e.solicitanteRut ? (
                                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border border-slate-200 bg-slate-50 text-slate-700">
                                  {formatRut(e.solicitanteRut)}
                                </span>
                              ) : (
                                <span className="text-slate-400">Sin RUT</span>
                              )}
                            </td>

                            <td className="px-4 py-3">
                              {e.empresa ? (
                                <span
                                  className={clsx(
                                    "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border",
                                    companyTagClasses(e.empresa)
                                  )}
                                >
                                  <TeamOutlined className="opacity-80" /> {e.empresa}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">
                              {e.createdAt && (
                                <div>
                                  <div>
                                    Ingreso:{" "}
                                    {new Intl.DateTimeFormat("es-CL", {
                                      year: "numeric",
                                      month: "2-digit",
                                      day: "2-digit",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: false,
                                    }).format(new Date(e.createdAt))}
                                  </div>

                                  {e.updatedAt &&
                                    new Date(e.updatedAt).getTime() !==
                                    new Date(e.createdAt).getTime() && (
                                      <div className="text-slate-400">
                                        Editado:{" "}
                                        {new Intl.DateTimeFormat("es-CL", {
                                          year: "numeric",
                                          month: "2-digit",
                                          day: "2-digit",
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          hour12: false,
                                        }).format(new Date(e.updatedAt))}
                                      </div>
                                    )}
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-3 rounded-r-xl whitespace-nowrap align-middle">
                              <div className="flex items-center justify-center gap-2 h-full">
                                <button
                                  type="button"
                                  onClick={() => startView(e)}
                                  title="Ver equipo"
                                  aria-label={`Ver equipo ${e.serial ?? e.id_equipo}`}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-200 bg-cyan-50 text-cyan-900 hover:bg-cyan-100 transition"
                                >
                                  <EyeOutlined />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isCliente) return;
                                    startEdit(e);
                                  }}
                                  disabled={isCliente}
                                  title={isCliente ? "Sin permisos para editar" : "Editar equipo"}
                                  aria-label={`Editar equipo ${e.serial ?? e.id_equipo}`}
                                  className={clsx(
                                    "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition",
                                    "border-indigo-200 bg-indigo-50 text-indigo-900",
                                    isCliente
                                      ? "opacity-50 cursor-not-allowed pointer-events-none"
                                      : "hover:bg-indigo-100"
                                  )}
                                >
                                  <EditOutlined />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isCliente) return;
                                    void deleteEquipo(e);
                                  }}
                                  disabled={isCliente}
                                  title={isCliente ? "Sin permisos para eliminar" : "Eliminar equipo"}
                                  aria-label={`Eliminar equipo ${e.serial ?? e.id_equipo}`}
                                  className={clsx(
                                    "inline-flex h-8 w-8 items-center justify-center rounded-lg border transition",
                                    "border-rose-200 bg-rose-50 text-rose-900",
                                    isCliente
                                      ? "opacity-50 cursor-not-allowed pointer-events-none"
                                      : "hover:bg-rose-100"
                                  )}
                                >
                                  <DeleteOutlined />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              );
            })()}
          </div>

          {exportError && (
            <div className="mt-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-3 py-2 text-xs">
              {exportError}
            </div>
          )}

          {/* Paginación */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-slate-50 border-t border-cyan-200">
            <div className="text-sm text-slate-700 text-center sm:text-left">
              {data ? (
                <span>
                  {showingRange ? (
                    <>
                      Mostrando{" "}
                      <strong className="text-slate-900">{showingRange.start}</strong>–
                      <strong className="text-slate-900">{showingRange.end}</strong> de{" "}
                      <strong className="text-slate-900">{data.total}</strong> •{" "}
                    </>
                  ) : null}
                  Página <strong className="text-slate-900">{data.page}</strong> de{" "}
                  <strong className="text-slate-900">{data.totalPages}</strong>
                </span>
              ) : (
                <span>—</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={goPrev}
                disabled={!canPrev || loading}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm",
                  "border-cyan-200 text-cyan-800 bg-white hover:bg-cyan-50",
                  (!canPrev || loading) && "opacity-50 cursor-not-allowed hover:bg-transparent"
                )}
                aria-label="Página anterior"
                type="button"
              >
                <LeftOutlined />
                <span className="hidden sm:inline">Anterior</span>
              </button>

              <div className="hidden sm:flex items-center gap-2 ml-1">
                <span className="text-sm text-slate-600">Por página</span>

                <select
                  value={data?.pageSize ?? pageSize}
                  onChange={(ev) => onChangePageSize(Number(ev.target.value))}
                  className="rounded-xl border border-cyan-200 bg-white px-2 py-1 text-sm"
                >
                  {[10, 20, 30, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={goNext}
                disabled={!canNext || loading}
                className={clsx(
                  "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm",
                  "border-cyan-200 text-cyan-800 bg-white hover:bg-cyan-50",
                  (!canNext || loading) && "opacity-50 cursor-not-allowed hover:bg-transparent"
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

      {/* Modal crear */}
      <CrearEquipoModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          void reload();
        }}
      />

      {/* Modal editar */}
      <EquipoEditModal
        open={editOpen}
        row={editRow}
        empresaOptions={empresaOptions}
        onClose={closeEdit}
        onSaved={() => {
          void handleEditSaved();
        }}
      />

      {/* Modal visualizar */}
      <EquipoViewModal
        open={viewOpen}
        row={viewRow}
        historial={historial}
        histLoading={histLoading}
        histError={histError}
        onClose={closeView}
      />
    </div>
  );
};

export default EquiposPage;