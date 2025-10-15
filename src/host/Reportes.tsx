// pages/ReportesPage.tsx
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  DownloadOutlined,
  FileExcelOutlined,
  TeamOutlined,
  LaptopOutlined,
  CalendarOutlined,
  WarningOutlined,
  LoadingOutlined,
  HomeOutlined,
  BarChartOutlined,
  FilterOutlined,
  SearchOutlined,
  BuildOutlined,           // ← añade esto
} from "@ant-design/icons";

import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import * as XLSX from "xlsx-js-style";

/* ===================== Tipos ===================== */
interface ExportStatus {
  exporting: boolean;
  error: string | null;
  progress?: number;
}

interface Empresa {
  id_empresa: number;
  nombre: string;
}

/** Solicitantes mínimos que usa el reporte */
interface SolicitanteRow {
  id_solicitante: number;
  nombre: string;
  email: string | null;
  empresa?: { nombre: string } | null;
  equipos?: unknown[]; // no usamos su estructura interna
}

/** Equipos mínimos que usa el reporte */
interface EquipoRow {
  id_equipo: number;
  serial?: string | null;
  marca?: string | null;
  modelo?: string | null;
  procesador?: string | null;
  ram?: string | null;
  disco?: string | null;
  propiedad?: string | null;
  idSolicitante?: number | null;
}

/** Visitas mínimas que usa el reporte */
interface VisitaRow {
  id_visita: number;
  tecnico?: { nombre: string } | null;
  empresa?: { nombre: string } | null;
  solicitante?: string | null;
  solicitanteRef?: { nombre: string } | null;
  inicio?: string | null;
  fin?: string | null;
  status?: string | null;
  actualizaciones?: boolean | 0 | 1 | null;
  antivirus?: boolean | 0 | 1 | null;
  ccleaner?: boolean | 0 | 1 | null;
  estadoDisco?: boolean | 0 | 1 | null;
  licenciaOffice?: boolean | 0 | 1 | null;
  licenciaWindows?: boolean | 0 | 1 | null;
  mantenimientoReloj?: boolean | 0 | 1 | null;
  rendimientoEquipo?: boolean | 0 | 1 | null;
  confImpresoras?: boolean | 0 | 1 | null;
  confTelefonos?: boolean | 0 | 1 | null;
  confPiePagina?: boolean | 0 | 1 | null;
  otros?: boolean | 0 | 1 | null;
  otrosDetalle?: string | null;
}

/** Tickets según tu API /tickets */
interface TicketRow {
  ticket_id: string;
  solicitante_email: string | null;
  empresa: string | null;
  subject: string;
  type: string | null;
  fecha: string; // ISO
}

/** Paginado “clásico” (visitas, equipos, solicitantes…) */
interface ApiList<T> {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items?: T[];
  data?: T[]; // por compatibilidad si usas 'data'
}

/** Respuesta específica de /tickets */
interface TicketsResp {
  page: number;
  pageSize: number;
  total: number;
  rows: TicketRow[];
  totalPages?: number; // por si lo agregas luego
}

interface ReporteGeneralData {
  solicitantes: SolicitanteRow[];
  equipos: EquipoRow[];
  visitas: VisitaRow[];
  tickets: TicketRow[];
  empresaFiltro?: string;
}

/* ===================== Config ===================== */
const API_URL = (import.meta as ImportMeta).env.VITE_API_URL || "http://localhost:4000/api";

/* ===================== Helpers ===================== */
function boolToSiNo(v: unknown): "Sí" | "No" {
  const b =
    typeof v === "boolean"
      ? v
      : typeof v === "number"
      ? v === 1
      : typeof v === "string"
      ? ["1", "true", "sí", "si"].includes(v.trim().toLowerCase())
      : false;
  return b ? "Sí" : "No";
}

/* ===================== Componente ===================== */
const ReportesPage: React.FC = () => {
  const navigate = useNavigate();

  const [exportStatus, setExportStatus] = useState<ExportStatus>({
    exporting: false,
    error: null,
  });
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaFiltro, setEmpresaFiltro] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  /* ===== Empresas para el filtro ===== */
  useEffect(() => {
    const cargarEmpresas = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const url = new URL(`${API_URL}/empresas`);
        url.searchParams.set("pageSize", "1000");
        const r = await fetch(url.toString(), {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!r.ok) throw new Error("HTTP " + r.status);
        const j = (await r.json()) as { items?: Empresa[]; data?: Empresa[] };
        setEmpresas(j.items ?? j.data ?? []);
      } catch (e) {
        console.error("Empresas error:", e);
        setGlobalError("No se pudieron cargar las empresas");
      }
    };
    void cargarEmpresas();
  }, []);

  /* ===== Estilo XLSX ===== */
  const applyBasicStyles = (worksheet: XLSX.WorkSheet): XLSX.WorkSheet => {
    const ref = worksheet["!ref"];
    if (!ref) return worksheet;

    const headerStyle: XLSX.CellStyle = {
      font: { bold: true, color: { rgb: "FFFFFFFF" } },
      fill: { fgColor: { rgb: "FF2E5BFF" } },
      alignment: { horizontal: "center", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "FF000000" } },
        bottom: { style: "thin", color: { rgb: "FF000000" } },
        left: { style: "thin", color: { rgb: "FF000000" } },
        right: { style: "thin", color: { rgb: "FF000000" } },
      },
    };

    const cellBorder: XLSX.CellStyle["border"] = {
      top: { style: "thin", color: { rgb: "FFE5E7EB" } },
      bottom: { style: "thin", color: { rgb: "FFE5E7EB" } },
      left: { style: "thin", color: { rgb: "FFE5E7EB" } },
      right: { style: "thin", color: { rgb: "FFE5E7EB" } },
    };

    const range = XLSX.utils.decode_range(ref);
    // header
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c: C });
      const cell = worksheet[addr] as XLSX.CellObject | undefined;
      if (cell) cell.s = { ...(cell.s || {}), ...headerStyle };
    }
    // resto
    for (let R = range.s.r + 1; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        const cell = worksheet[addr] as XLSX.CellObject | undefined;
        if (cell) cell.s = { ...(cell.s || {}), border: cellBorder };
      }
    }
    if (!worksheet["!cols"]) {
      const cols: XLSX.ColInfo[] = [];
      const max = range.e.c - range.s.c + 1;
      for (let i = 0; i < max; i++) cols.push({ wch: 20 });
      worksheet["!cols"] = cols;
    }
    return worksheet;
  };

  /* ===== Fetchers tipados por endpoint ===== */
  const fetchSolicitantes = async (empresaId?: string): Promise<SolicitanteRow[]> => {
    const token = localStorage.getItem("accessToken");
    const first = new URL(`${API_URL}/solicitantes`);
    first.searchParams.set("page", "1");
    first.searchParams.set("pageSize", "100");
    if (empresaId) first.searchParams.set("empresaId", empresaId);
    const r1 = await fetch(first, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    if (!r1.ok) throw new Error("HTTP " + r1.status);
    const j1 = (await r1.json()) as ApiList<SolicitanteRow>;
    const totalPages = j1.totalPages ?? 1;
    const all: SolicitanteRow[] = [...(j1.items ?? j1.data ?? [])];
    for (let p = 2; p <= totalPages; p++) {
      const u = new URL(`${API_URL}/solicitantes`);
      u.searchParams.set("page", String(p));
      u.searchParams.set("pageSize", "100");
      if (empresaId) u.searchParams.set("empresaId", empresaId);
      const r = await fetch(u, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = (await r.json()) as ApiList<SolicitanteRow>;
      all.push(...(j.items ?? j.data ?? []));
    }
    return all;
  };

  const fetchEquipos = async (empresaId?: string): Promise<EquipoRow[]> => {
    const token = localStorage.getItem("accessToken");
    const first = new URL(`${API_URL}/equipos`);
    first.searchParams.set("page", "1");
    first.searchParams.set("pageSize", "200");
    if (empresaId) first.searchParams.set("empresaId", empresaId);
    const r1 = await fetch(first, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    if (!r1.ok) throw new Error("HTTP " + r1.status);
    const j1 = (await r1.json()) as ApiList<EquipoRow>;
    const totalPages = j1.totalPages ?? 1;
    const all: EquipoRow[] = [...(j1.items ?? j1.data ?? [])];
    for (let p = 2; p <= totalPages; p++) {
      const u = new URL(`${API_URL}/equipos`);
      u.searchParams.set("page", String(p));
      u.searchParams.set("pageSize", "200");
      if (empresaId) u.searchParams.set("empresaId", empresaId);
      const r = await fetch(u, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = (await r.json()) as ApiList<EquipoRow>;
      all.push(...(j.items ?? j.data ?? []));
    }
    return all;
  };

  const fetchVisitas = async (empresaId?: string): Promise<VisitaRow[]> => {
    const token = localStorage.getItem("accessToken");
    const first = new URL(`${API_URL}/visitas`);
    first.searchParams.set("page", "1");
    first.searchParams.set("pageSize", "100");
    if (empresaId) first.searchParams.set("empresaId", empresaId);
    const r1 = await fetch(first, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    if (!r1.ok) throw new Error("HTTP " + r1.status);
    const j1 = (await r1.json()) as ApiList<VisitaRow>;
    const totalPages = j1.totalPages ?? 1;
    const all: VisitaRow[] = [...(j1.items ?? j1.data ?? [])];
    for (let p = 2; p <= totalPages; p++) {
      const u = new URL(`${API_URL}/visitas`);
      u.searchParams.set("page", String(p));
      u.searchParams.set("pageSize", "100");
      if (empresaId) u.searchParams.set("empresaId", empresaId);
      const r = await fetch(u, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = (await r.json()) as ApiList<VisitaRow>;
      all.push(...(j.items ?? j.data ?? []));
    }
    return all;
  };

  const fetchTickets = async (empresaId?: string): Promise<TicketRow[]> => {
    const token = localStorage.getItem("accessToken");
    const first = new URL(`${API_URL}/tickets`);
    first.searchParams.set("page", "1");
    first.searchParams.set("pageSize", "200");
    if (empresaId) {
      const emp = empresas.find((e) => e.id_empresa === Number(empresaId));
      if (emp) first.searchParams.set("empresa", emp.nombre);
    }
    const r1 = await fetch(first, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    if (!r1.ok) throw new Error("HTTP " + r1.status);
    const j1 = (await r1.json()) as TicketsResp;
    const pages = j1.totalPages ?? Math.max(1, Math.ceil(j1.total / j1.pageSize));
    const all: TicketRow[] = [...(j1.rows ?? [])];
    for (let p = 2; p <= pages; p++) {
      const u = new URL(`${API_URL}/tickets`);
      u.searchParams.set("page", String(p));
      u.searchParams.set("pageSize", "200");
      if (empresaId) {
        const emp = empresas.find((e) => e.id_empresa === Number(empresaId));
        if (emp) u.searchParams.set("empresa", emp.nombre);
      }
      const r = await fetch(u, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const j = (await r.json()) as TicketsResp;
      all.push(...(j.rows ?? []));
    }
    return all;
  };

  /* ===== Orquestador del reporte ===== */
  const obtenerDatosReporteGeneral = async (): Promise<ReporteGeneralData> => {
    const empId = empresaFiltro || undefined;
    const [solicitantes, equipos, visitas, tickets] = await Promise.all([
      fetchSolicitantes(empId),
      fetchEquipos(empId),
      fetchVisitas(empId),
      fetchTickets(empId),
    ]);
    return { solicitantes, equipos, visitas, tickets, empresaFiltro: empId };
  };

  /* ===== Helpers de mapeo (tipados) ===== */
  const mapSolicitante = (s: SolicitanteRow) => ({
    ID: s.id_solicitante,
    Nombre: s.nombre ?? "",
    Email: s.email ?? "No disponible en sistema",
    Empresa: s.empresa?.nombre ?? "",
    "Cantidad de Equipos": Array.isArray(s.equipos) ? s.equipos.length : 0,
    Estado: "Activo",
  });

  const mapEquipo = (e: EquipoRow) => ({
    ID: e.id_equipo,
    Serial: e.serial ?? "",
    Marca: e.marca ?? "",
    Modelo: e.modelo ?? "",
    Procesador: e.procesador ?? "",
    RAM: e.ram ?? "",
    Disco: e.disco ?? "",
    Propiedad: e.propiedad ?? "",
    "Solicitante ID": e.idSolicitante ?? "",
    Estado: "Activo",
  });

  const mapVisita = (v: VisitaRow) => ({
    ID: v.id_visita,
    "Técnico": v.tecnico?.nombre ?? "No asignado",
    Empresa: v.empresa?.nombre ?? "",
    Solicitante: v.solicitante ?? v.solicitanteRef?.nombre ?? "",
    "Fecha Inicio": v.inicio ? new Date(v.inicio).toLocaleString("es-CL") : "",
    "Fecha Fin": v.fin ? new Date(v.fin).toLocaleString("es-CL") : "",
    Estado: v.status ?? "",
    "Checklist Completado": (v.status ?? "").toUpperCase() === "COMPLETADA" ? "Sí" : "No",
    Actualizaciones: boolToSiNo(v.actualizaciones),
    Antivirus: boolToSiNo(v.antivirus),
    CCleaner: boolToSiNo(v.ccleaner),
    "Estado Disco": boolToSiNo(v.estadoDisco),
    "Licencia Office": boolToSiNo(v.licenciaOffice),
    "Licencia Windows": boolToSiNo(v.licenciaWindows),
    "Mantenimiento Reloj": boolToSiNo(v.mantenimientoReloj),
    "Rendimiento Equipo": boolToSiNo(v.rendimientoEquipo),
    "Config. Impresoras": boolToSiNo(v.confImpresoras),
    "Config. Teléfonos": boolToSiNo(v.confTelefonos),
    "Config. Pie Página": boolToSiNo(v.confPiePagina),
    Otros: boolToSiNo(v.otros),
    "Detalle Otros": v.otrosDetalle ?? "",
  });

  const mapTicket = (t: TicketRow) => ({
    "ID Ticket": t.ticket_id,
    Solicitante: t.solicitante_email ?? "",
    Empresa: t.empresa ?? "Sin empresa asignada",
    Asunto: t.subject ?? "",
    Tipo: t.type ?? "",
    Fecha: t.fecha ? new Date(t.fecha).toLocaleString("es-CL") : "",
    Estado: "Abierto",
  });

  /* ===== Crear hoja genérica tipada ===== */
  function crearHojaConDatos<T>(
    wb: XLSX.WorkBook,
    datos: T[],
    nombreHoja: string,
    mapper: (row: T) => Record<string, string | number>
  ) {
    if (datos.length === 0) {
      const ws = XLSX.utils.json_to_sheet([{ Mensaje: "No hay datos disponibles" }]);
      applyBasicStyles(ws);
      XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
      return;
    }
    const rows = datos.map(mapper);
    const ws = XLSX.utils.json_to_sheet(rows);
    applyBasicStyles(ws);
    XLSX.utils.book_append_sheet(wb, ws, nombreHoja);
  }

  /* ===== Export ===== */
  const exportReporteGeneral = async () => {
    try {
      setExportStatus({ exporting: true, error: null });
      setGlobalError(null);

      const data = await obtenerDatosReporteGeneral();
      const wb = XLSX.utils.book_new();

      // Resumen
      const empresaNombre = empresaFiltro
        ? empresas.find((e) => e.id_empresa === Number(empresaFiltro))?.nombre || "Empresa seleccionada"
        : "Todas las empresas";

      const resumenData = [
        { Métrica: "Empresa", Valor: empresaNombre },
        { Métrica: "Total Solicitantes", Valor: data.solicitantes.length },
        { Métrica: "Total Equipos", Valor: data.equipos.length },
        { Métrica: "Total Visitas", Valor: data.visitas.length },
        { Métrica: "Total Tickets", Valor: data.tickets.length },
        { Métrica: "Fecha de Reporte", Valor: new Date().toLocaleDateString("es-CL") },
        { Métrica: "Hora de Generación", Valor: new Date().toLocaleTimeString("es-CL") },
      ];
      const wsResumen = XLSX.utils.json_to_sheet(resumenData);
      applyBasicStyles(wsResumen);
      XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen Ejecutivo");

      // Hojas
      crearHojaConDatos(wb, data.solicitantes, "Solicitantes", mapSolicitante);
      crearHojaConDatos(wb, data.equipos, "Equipos", mapEquipo);
      crearHojaConDatos(wb, data.visitas, "Visitas Técnicas", mapVisita);
      crearHojaConDatos(wb, data.tickets, "Tickets", mapTicket);

      // Estadísticas
      const completadas = data.visitas.filter((v) => (v.status ?? "").toUpperCase() === "COMPLETADA").length;
      const estadisticasData = [
        { Categoría: "Total Equipos", Valor: data.equipos.length },
        { Categoría: "Total Solicitantes", Valor: data.solicitantes.length },
        { Categoría: "Visitas Completadas", Valor: completadas },
        { Categoría: "Visitas Pendientes", Valor: data.visitas.length - completadas },
        { Categoría: "Total Tickets", Valor: data.tickets.length },
        { Categoría: "Empresa del Reporte", Valor: empresaNombre },
      ];
      const wsStats = XLSX.utils.json_to_sheet(estadisticasData);
      applyBasicStyles(wsStats);
      XLSX.utils.book_append_sheet(wb, wsStats, "Estadísticas");

      // Nombre archivo
      const ts = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      let fileName = `Reporte_General_${ts}.xlsx`;
      if (empresaFiltro) {
        const emp = empresas.find((e) => e.id_empresa === Number(empresaFiltro));
        if (emp) fileName = `Reporte_${emp.nombre.replace(/\s+/g, "_").replace(/[^\w]/g, "")}_${ts}.xlsx`;
      }

      XLSX.writeFile(wb, fileName);
      setExportStatus({ exporting: false, error: null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setExportStatus({ exporting: false, error: `Error al exportar reporte general: ${msg}` });
    }
  };

  /* ===== UI ===== */
  const empresasFiltradas = empresas.filter((e) =>
    e.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const goToDashboard = () => navigate("/");
  const goToAnalytics = () => navigate("/empresas");

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-cyan-50 to-white">
      <Header />

      {/* Nav */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex gap-4">
            <button onClick={goToDashboard} className="flex items-center gap-2 text-slate-600 hover:text-blue-600">
              <HomeOutlined />
              Dashboard
            </button>
            <button onClick={goToAnalytics} className="flex items-center gap-2 text-slate-600 hover:text-blue-600">
              <BarChartOutlined />
              Analytics
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {/* Título */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-slate-800 mb-4">
            <FileExcelOutlined className="mr-4 text-green-600" />
            Reporte General del Sistema
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Genera un reporte completo unificado con todos los datos del sistema
          </p>
        </motion.div>

        {globalError && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            {globalError}
          </motion.div>
        )}

        {/* Filtros */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FilterOutlined className="text-blue-600" />
              Filtros del Reporte
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Buscar Empresa</label>
              <div className="relative">
                <SearchOutlined className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Filtrar por Empresa</label>
              <select
                value={empresaFiltro}
                onChange={(e) => setEmpresaFiltro(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas las empresas</option>
                {empresasFiltradas.map((empresa) => (
                  <option key={empresa.id_empresa} value={String(empresa.id_empresa)}>
                    {empresa.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {empresaFiltro && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Filtro activo:</strong>{" "}
                {empresas.find((e) => e.id_empresa === Number(empresaFiltro))?.nombre}
              </p>
              <p className="text-xs text-blue-600 mt-1">El reporte incluirá SOLO datos relacionados con esta empresa</p>
            </motion.div>
          )}
        </motion.div>

        {/* Export */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="text-center mb-8">
          <button
            onClick={exportReporteGeneral}
            disabled={exportStatus.exporting}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {exportStatus.exporting ? (
              <>
                <LoadingOutlined className="animate-spin mr-3" />
                Generando Reporte...
              </>
            ) : (
              <>
                <DownloadOutlined className="mr-3" />
                Generar Reporte General
              </>
            )}
          </button>

          {exportStatus.error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              {exportStatus.error}
            </motion.div>
          )}

          <div className="mt-4 text-xs text-slate-500">
            <p>Revisa la consola del navegador para ver detalles de la exportación</p>
          </div>
        </motion.div>

        {/* Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <h3 className="font-bold text-slate-800 mb-6 text-xl flex items-center justify-center">
            <BuildOutlined className="mr-3 text-slate-600" />
            Contenido del Reporte General
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <FileExcelOutlined className="text-blue-600 text-2xl mb-2" />
              <h4 className="font-semibold text-slate-700">Resumen</h4>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <TeamOutlined className="text-green-600 text-2xl mb-2" />
              <h4 className="font-semibold text-slate-700">Solicitantes</h4>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <LaptopOutlined className="text-purple-600 text-2xl mb-2" />
              <h4 className="font-semibold text-slate-700">Equipos</h4>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <CalendarOutlined className="text-orange-600 text-2xl mb-2" />
              <h4 className="font-semibold text-slate-700">Visitas</h4>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <WarningOutlined className="text-red-600 text-2xl mb-2" />
              <h4 className="font-semibold text-slate-700">Tickets</h4>
            </div>
          </div>

          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-600 text-center">
              <strong>Nota:</strong>{" "}
              {empresaFiltro
                ? `El reporte incluirá SOLO datos de "${
                    empresas.find((e) => e.id_empresa === Number(empresaFiltro))?.nombre
                  }"`
                : `El reporte incluirá datos de TODAS las empresas del sistema.`}
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default ReportesPage;
